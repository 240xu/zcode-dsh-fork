/**
 * In-memory filesystem behind the worker's `node:fs` proxy. Contents come from
 * the build-time image (see {@link loadVfsImage}); this remains the synchronous
 * authority when an asynchronous durable sink mirrors selected subtrees.
 * @module @deepseek-ai/dsh-experimental-webworker-runtime/src/storage/memory
 */
import { dirname, join, normalize, resolve, SEP } from "../module-system/posix-path.js";
import { IMAGE_OVERLAY_DIRECTORIES } from "../image-layout.js";
import { parseTar } from "./tar.js";
const decoder = new TextDecoder();
const encoder = new TextEncoder();
/** Creation default for files, Node's `0o666` under the classic `022` umask. */
const DEFAULT_FILE_MODE = 0o644;
/** Creation default for directories, Node's `0o777` under the classic `022` umask. */
const DEFAULT_DIRECTORY_MODE = 0o755;
function fail(code, syscall, path, detail) {
    const error = new Error(`${code}: ${detail ?? syscall} failed, ${syscall} '${path}'`);
    error.code = code;
    error.path = path;
    error.syscall = syscall;
    throw error;
}
function encodingOf(options) {
    if (options === null || options === undefined)
        return undefined;
    if (typeof options === 'string')
        return options;
    return options.encoding ?? undefined;
}
// Permission bits are entry state: creation takes the caller's mode (or the
// umask-free default), `chmod` changes it, and both stat shapes report the
// stored value — the round-trip consumers like dsh-credentials-local's
// owner-only check rely on. The bits are never enforced: a single-owner
// filesystem reads and writes as its owner regardless, like root.
function statsOf(size, mtimeMs, directory, ino, mode) {
    return {
        size,
        ino: Number(ino),
        mtimeMs,
        ctimeMs: mtimeMs,
        atimeMs: mtimeMs,
        birthtimeMs: mtimeMs,
        mtime: new Date(mtimeMs),
        mode: (directory ? 0o040000 : 0o100000) | (mode & 0o777),
        isFile: () => !directory,
        isDirectory: () => directory,
        isSymbolicLink: () => false,
        isFIFO: () => false,
        isSocket: () => false,
        isBlockDevice: () => false,
        isCharacterDevice: () => false,
    };
}
/**
 * The same entry as {@link statsOf}, in the BigInt shape.
 *
 * Timestamps carry millisecond resolution scaled to nanoseconds, which is what
 * the underlying `mtimeMs` holds; the VFS keeps that value strictly increasing
 * per entry so two writes inside one millisecond still differ.
 * @param size - Byte length; zero for a directory.
 * @param mtimeMs - Modification time the entry carries.
 * @param directory - Whether the entry is a directory.
 * @param ino - Identity of the entry at this path.
 * @param mode - Stored permission bits of the entry.
 * @returns Stats in the shape Node returns under `{ bigint: true }`.
 */
function bigIntStatsOf(size, mtimeMs, directory, ino, mode, nlink = 1) {
    const milliseconds = BigInt(Math.trunc(mtimeMs));
    const nanoseconds = milliseconds * 1000000n;
    const time = new Date(mtimeMs);
    return {
        size: BigInt(size),
        mode: BigInt((directory ? 0o040000 : 0o100000) | (mode & 0o777)),
        dev: 1n,
        ino,
        nlink: BigInt(nlink),
        mtimeMs: milliseconds,
        mtimeNs: nanoseconds,
        ctimeMs: milliseconds,
        ctimeNs: nanoseconds,
        atimeMs: milliseconds,
        atimeNs: nanoseconds,
        birthtimeMs: milliseconds,
        birthtimeNs: nanoseconds,
        mtime: time,
        ctime: time,
        atime: time,
        birthtime: time,
        isFile: () => !directory,
        isDirectory: () => directory,
        isSymbolicLink: () => false,
        isFIFO: () => false,
        isSocket: () => false,
        isBlockDevice: () => false,
        isCharacterDevice: () => false,
    };
}
/** Parse the Node string flags supported by the compatibility filesystem. */
function openMode(flags) {
    const base = flags[0];
    const suffix = flags.slice(1).split('');
    const validSuffix = suffix.every(flag => flag === '+' || flag === 'x' || flag === 's');
    const uniqueSuffix = new Set(suffix).size === suffix.length;
    if ((base !== 'r' && base !== 'w' && base !== 'a') || !validSuffix || !uniqueSuffix
        || base === 'r' && flags.includes('x')) {
        const error = new TypeError(`The argument 'flags' is invalid. Received '${flags}'`);
        error.code = 'ERR_INVALID_ARG_VALUE';
        throw error;
    }
    return {
        readable: base === 'r' || flags.includes('+'),
        writable: base !== 'r' || flags.includes('+'),
        append: base === 'a',
        create: base === 'w' || base === 'a',
        truncate: base === 'w',
        exclusive: flags.includes('x'),
    };
}
/** Resize bytes exactly, preserving the prefix and zero-filling growth. */
function resize(bytes, length) {
    if (!Number.isSafeInteger(length) || length < 0) {
        const error = new RangeError(`The value of "len" is out of range. It must be >= 0. Received ${String(length)}`);
        error.code = 'ERR_OUT_OF_RANGE';
        throw error;
    }
    const resized = new Uint8Array(length);
    resized.set(bytes.subarray(0, length));
    return resized;
}
/**
 * Filesystem held in two maps: one for file bytes, one for directories.
 * Every path is normalized to an absolute POSIX path without a trailing
 * separator, so callers may pass either form.
 */
export class MemoryVfs {
    files = new Map();
    directories = new Set([SEP]);
    /** Directory permission bits; absence means {@link DEFAULT_DIRECTORY_MODE}. */
    directoryModes = new Map();
    /** Directory mtimes advance when their immediate entry set changes. */
    directoryMtimes = new Map();
    mutationListeners = new Set();
    sink;
    temporaries = 0;
    // Directories retain path identities. File identities live on FileNode so
    // descriptors, renames, and hard links continue to address the same file.
    identities = new Map();
    lastIdentity = 0n;
    /**
     * Build the synchronous filesystem authority.
     * @param options - Optional durable write-behind sink.
     */
    constructor(options = {}) {
        this.sink = options.sink;
    }
    /**
     * Settle the durable sink without changing in-memory success.
     * @returns A promise that resolves when all recorded mutations are stored.
     */
    async flush() {
        await this.sink?.flush();
    }
    /**
     * Observe committed runtime mutations. Image seeding is deliberately silent.
     * @param listener - Consumer called after each successful mutation.
     * @returns A disposer that prevents future calls.
     */
    subscribe(listener) {
        this.mutationListeners.add(listener);
        return () => { this.mutationListeners.delete(listener); };
    }
    /** Publish after state changes; one faulty observer cannot roll back a write. */
    publish(mutation) {
        const observers = [
            ...(this.sink === undefined ? [] : [(change) => { this.sink?.record(change); }]),
            ...this.mutationListeners,
        ];
        for (const listener of observers) {
            try {
                listener(mutation);
            }
            catch (error) {
                console.error('webworker vfs: mutation observer failed', error);
            }
        }
    }
    /** Promise face mirroring `node:fs/promises` for the methods the roster uses. */
    promises = {
        readFile: async (path, options) => this.readFileSync(path, options),
        writeFile: async (path, data, options) => {
            this.writeFileSync(path, data, options);
        },
        appendFile: async (path, data) => { this.appendFileSync(path, data); },
        mkdir: async (path, options) => this.mkdirSync(path, options),
        readdir: async (path, options) => this.readdirSync(path, options),
        stat: async (path, options) => this.statSync(path, options),
        lstat: async (path, options) => this.statSync(path, options),
        realpath: async (path) => this.realpathSync(path),
        rename: async (from, to) => { this.renameSync(from, to); },
        unlink: async (path) => { this.unlinkSync(path); },
        rm: async (path, options) => { this.rmSync(path, options); },
        mkdtemp: async (prefix) => this.mkdtempSync(prefix),
        link: async (existing, next) => { this.linkSync(existing, next); },
        truncate: async (path, length) => { this.truncateSync(path, length); },
        chmod: async (path, mode) => { this.chmodSync(path, mode); },
        opendir: async (path) => this.opendir(path),
        open: async (path, flags, mode) => this.open(path, flags, mode),
        /** Resolves for any existing path: the VFS grants read and write to everything it holds. */
        access: async (path) => {
            const target = normalize(resolve(path));
            if (!this.files.has(target) && !this.directories.has(target))
                fail('ENOENT', 'access', target);
        },
    };
    /** @returns Absolute path with no trailing separator. */
    key(path) {
        const absolute = normalize(resolve(path));
        return absolute.length > 1 && absolute.endsWith(SEP) ? absolute.slice(0, -1) : absolute;
    }
    /**
     * Read a file.
     * @param path - File path.
     * @param options - `'utf8'` or `{encoding}` for text; omitted for bytes.
     * @returns Text or a copy-free view of the stored bytes.
     */
    readFileSync(path, options) {
        const target = this.key(path);
        const node = this.files.get(target);
        if (node === undefined) {
            if (this.directories.has(target))
                fail('EISDIR', 'read', target);
            fail('ENOENT', 'open', target);
        }
        return encodingOf(options) === undefined ? node.bytes : decoder.decode(node.bytes);
    }
    /**
     * Report whether a path exists.
     * @param path - Path to test.
     * @returns True for files and directories.
     */
    existsSync(path) {
        const target = this.key(path);
        return this.files.has(target) || this.directories.has(target);
    }
    /**
     * Stat a path.
     * @param path - Path to stat.
     * @param options - `bigint` selects the BigInt stats Node returns for it.
     * @returns Stats for the file or directory.
     */
    statSync(path, options) {
        const target = this.key(path);
        const node = this.files.get(target);
        const [size, mtimeMs, directory, mode] = node !== undefined
            ? [node.bytes.length, node.mtimeMs, false, node.mode]
            : this.directories.has(target)
                ? [0, this.directoryMtimes.get(target) ?? 0, true, this.directoryModes.get(target) ?? DEFAULT_DIRECTORY_MODE]
                : fail('ENOENT', 'stat', target);
        const identity = node === undefined ? this.identityOf(target) : this.identityOfFile(node);
        return options?.bigint === true
            ? bigIntStatsOf(size, mtimeMs, directory, identity, mode, node === undefined ? 1 : this.fileLinkCount(node))
            : statsOf(size, mtimeMs, directory, identity, mode);
    }
    /** @returns Stats in the plain shape, for internal callers that read `size`/`mtimeMs`. */
    plainStats(path) {
        return this.statSync(path);
    }
    /** @returns The stable identity of an existing path, assigning one on first observation. */
    identityOf(target) {
        const existing = this.identities.get(target);
        if (existing !== undefined)
            return existing;
        this.lastIdentity += 1n;
        this.identities.set(target, this.lastIdentity);
        return this.lastIdentity;
    }
    /** @returns The inode-like identity retained by a file node across names. */
    identityOfFile(node) {
        if (node.identity !== undefined)
            return node.identity;
        this.lastIdentity += 1n;
        node.identity = this.lastIdentity;
        return node.identity;
    }
    /** @returns The number of names currently linked to one file node. */
    fileLinkCount(node) {
        return typeof node.paths === 'string' ? 1 : node.paths?.size ?? 0;
    }
    /** Add one map name, promoting the rare hard-link case to a Set. */
    addFilePath(node, path) {
        if (node.paths === undefined) {
            node.paths = path;
        }
        else if (typeof node.paths === 'string') {
            node.paths = new Set([node.paths, path]);
        }
        else {
            node.paths.add(path);
        }
    }
    /** Remove one map name, collapsing a remaining single link back to a string. */
    removeFilePath(node, path) {
        if (typeof node.paths === 'string') {
            node.paths = undefined;
            return;
        }
        if (node.paths === undefined)
            return;
        node.paths.delete(path);
        if (node.paths.size === 1) {
            const [remaining] = node.paths;
            node.paths = remaining;
        }
    }
    /** Set one file-map entry while maintaining both nodes' reverse path indexes. */
    setFile(path, node) {
        const previous = this.files.get(path);
        if (previous === node)
            return;
        if (previous !== undefined)
            this.removeFilePath(previous, path);
        this.files.set(path, node);
        this.addFilePath(node, path);
    }
    /** Delete one file-map entry while retaining an unlinked node held by a descriptor. */
    deleteFile(path) {
        const node = this.files.get(path);
        if (node === undefined)
            return undefined;
        this.files.delete(path);
        this.removeFilePath(node, path);
        return node;
    }
    /** Publish one linked name after a content or metadata write. */
    publishFilePath(node, path, appendedFrom) {
        this.publish({
            kind: 'write', path, bytes: node.bytes, mode: node.mode, entryChanged: false,
            ...appendedFrom === undefined ? {} : { appendedFrom },
        });
    }
    /** Publish a content or metadata write for every hard link to one node. */
    publishFile(node, appendedFrom) {
        if (typeof node.paths === 'string') {
            this.publishFilePath(node, node.paths, appendedFrom);
            return;
        }
        if (node.paths === undefined)
            return;
        for (const path of node.paths)
            this.publishFilePath(node, path, appendedFrom);
    }
    /** Replace bytes on one file identity and notify all linked paths. */
    replaceFile(node, bytes, appendedFrom) {
        node.bytes = bytes;
        node.mtimeMs = this.touchNode(node);
        this.publishFile(node, appendedFrom);
    }
    /** Write at one offset, zero-filling any gap. */
    writeFileNode(node, position, data) {
        const offset = Math.max(0, position);
        const previousLength = node.bytes.length;
        const bytes = new Uint8Array(Math.max(previousLength, offset + data.length));
        bytes.set(node.bytes);
        bytes.set(data, offset);
        this.replaceFile(node, bytes, offset === previousLength ? previousLength : undefined);
        return data.length;
    }
    /** Resize one file identity and notify all linked paths. */
    truncateFile(node, length) {
        this.replaceFile(node, resize(node.bytes, length));
    }
    /** @returns Plain stats for an open file, including after its last name is removed. */
    fileStats(node) {
        return statsOf(node.bytes.length, node.mtimeMs, false, this.identityOfFile(node), node.mode);
    }
    /** Forget removed directory identities, so recreated paths report new ones. */
    forgetIdentity(target) {
        this.identities.delete(target);
        const prefix = `${target}${SEP}`;
        for (const known of [...this.identities.keys()]) {
            if (known.startsWith(prefix))
                this.identities.delete(known);
        }
    }
    /**
     * Modification time for a write, strictly after the entry's previous one.
     *
     * The clock has millisecond resolution and these writes are in memory, so two
     * revisions of one file routinely land in the same millisecond. The filesystem
     * service's stale-write guard compares timestamps, so an equal one would let a
     * stale overwrite through.
     * @param target - Normalized path being written.
     * @returns Now, or one millisecond past the entry's current time.
     */
    touch(target) {
        return this.touchNode(this.files.get(target));
    }
    /** @returns A modification time strictly newer than one file node's current value. */
    touchNode(node) {
        const previous = node?.mtimeMs;
        const now = Date.now();
        return previous === undefined ? now : Math.max(now, previous + 1);
    }
    /** Advance a directory's mtime after its immediate children change. */
    touchDirectory(target) {
        const previous = this.directoryMtimes.get(target);
        const now = Date.now();
        this.directoryMtimes.set(target, previous === undefined ? now : Math.max(now, previous + 1));
    }
    /**
     * List a directory.
     * @param path - Directory path.
     * @param options - `withFileTypes` returns {@link VfsDirent} objects instead of names.
     * @returns Immediate entry names, or directory entries.
     */
    readdirSync(path, options) {
        const target = this.key(path);
        if (!this.directories.has(target)) {
            if (this.files.has(target))
                fail('ENOTDIR', 'scandir', target);
            fail('ENOENT', 'scandir', target);
        }
        const prefix = target === SEP ? SEP : `${target}${SEP}`;
        const names = new Set();
        for (const candidate of [...this.files.keys(), ...this.directories]) {
            if (!candidate.startsWith(prefix) || candidate === target)
                continue;
            const rest = candidate.slice(prefix.length);
            if (rest === '')
                continue;
            const [head = rest] = rest.split(SEP);
            names.add(head);
        }
        const sorted = [...names].sort();
        if (options?.withFileTypes !== true)
            return sorted;
        return sorted.map(name => this.direntOf(target, name));
    }
    /** @returns Directory entry for one child of `directory`. */
    direntOf(directory, name) {
        const stats = this.plainStats(join(directory, name));
        return {
            name,
            parentPath: directory,
            isFile: () => stats.isFile(),
            isDirectory: () => stats.isDirectory(),
            isSymbolicLink: () => false,
        };
    }
    /**
     * Resolve a path; the VFS has no symlinks, so this only normalizes.
     * @param path - Path to resolve.
     * @returns Absolute path.
     */
    realpathSync(path) {
        const target = this.key(path);
        if (!this.existsSync(target))
            fail('ENOENT', 'realpath', target);
        return target;
    }
    /**
     * Create a directory.
     * @param path - Directory path.
     * @param options - `recursive` creates missing parents.
     * @returns First created path when recursive, otherwise undefined.
     */
    mkdirSync(path, options) {
        const target = this.key(path);
        if (this.files.has(target))
            fail('EEXIST', 'mkdir', target);
        if (this.directories.has(target)) {
            if (options?.recursive === true)
                return undefined;
            fail('EEXIST', 'mkdir', target);
        }
        const parent = dirname(target);
        if (!this.directories.has(parent)) {
            if (options?.recursive !== true)
                fail('ENOENT', 'mkdir', target);
            this.mkdirSync(parent, options);
        }
        this.directories.add(target);
        this.touchDirectory(target);
        this.touchDirectory(parent);
        const mode = (options?.mode ?? DEFAULT_DIRECTORY_MODE) & 0o777;
        if (mode !== DEFAULT_DIRECTORY_MODE)
            this.directoryModes.set(target, mode);
        this.publish({ kind: 'mkdir', path: target, mode });
        return target;
    }
    /**
     * Write a file, replacing existing contents.
     * @param path - File path; its parent directory must exist.
     * @param data - Text or bytes.
     * @param options - `flag` `wx` refuses an existing file, `a` appends.
     */
    writeFileSync(path, data, options) {
        const target = this.key(path);
        if (this.directories.has(target))
            fail('EISDIR', 'open', target);
        if (!this.directories.has(dirname(target)))
            fail('ENOENT', 'open', target);
        const flag = options?.flag ?? 'w';
        if (flag.startsWith('wx') && this.files.has(target))
            fail('EEXIST', 'open', target);
        if (flag.startsWith('a')) {
            this.appendFileSync(target, data);
            return;
        }
        // POSIX open(O_CREAT): the mode applies at creation only; a rewrite keeps
        // the entry's bits.
        const previous = this.files.get(target);
        const mode = previous?.mode ?? (options?.mode !== undefined ? options.mode & 0o777 : DEFAULT_FILE_MODE);
        const bytes = typeof data === 'string' ? encoder.encode(data) : data;
        if (previous !== undefined) {
            this.replaceFile(previous, bytes);
            return;
        }
        const node = { bytes, mtimeMs: this.touch(target), mode, paths: undefined };
        this.setFile(target, node);
        this.touchDirectory(dirname(target));
        this.publish({ kind: 'write', path: target, bytes, mode, entryChanged: true });
    }
    /**
     * Open a directory; consumers enumerate entries or just prove it is one.
     * @param path - Directory path.
     * @returns Directory handle.
     */
    opendir(path) {
        const target = this.key(path);
        const names = this.readdirSync(target);
        let cursor = 0;
        const direntOf = (name) => this.direntOf(target, name);
        return {
            path: target,
            close: async () => { },
            read: async () => {
                const name = names[cursor];
                cursor += 1;
                return name === undefined ? null : direntOf(name);
            },
            async *[Symbol.asyncIterator]() {
                for (const name of names)
                    yield direntOf(name);
            },
        };
    }
    /**
     * Open a file handle.
     * @param path - File path.
     * @param flags - Node open flags; `r` requires the file, `wx` refuses an existing one.
     * @param mode - Permission bits applied when the open creates the file.
     * @returns File handle.
     */
    open(path, flags = 'r', mode) {
        const target = this.key(path);
        // Durable writers fsync the parent directory by opening it read-only.
        if (this.directories.has(target)) {
            if (!flags.startsWith('r'))
                fail('EISDIR', 'open', target);
            return {
                write: async () => fail('EISDIR', 'write', target),
                writeFile: async () => fail('EISDIR', 'write', target),
                readFile: async () => fail('EISDIR', 'read', target),
                truncate: async () => fail('EISDIR', 'ftruncate', target),
                ...this.handleTail(target),
            };
        }
        const file = this.openFileSync(target, flags, mode);
        let position = 0;
        let closed = false;
        const current = (syscall) => {
            if (closed)
                fail('EBADF', syscall, target);
            return file;
        };
        return {
            write: async (data) => {
                const bytes = typeof data === 'string' ? encoder.encode(data) : data;
                const descriptor = current('write');
                const offset = descriptor.append ? descriptor.stat().size : position;
                const bytesWritten = descriptor.write(offset, bytes);
                position = offset + bytesWritten;
                return { bytesWritten };
            },
            writeFile: async (data) => {
                const bytes = typeof data === 'string' ? encoder.encode(data) : data;
                const descriptor = current('write');
                const offset = descriptor.append ? descriptor.stat().size : position;
                position = offset + descriptor.write(offset, bytes);
            },
            readFile: async (options) => {
                const descriptor = current('read');
                const bytes = descriptor.read(position, Math.max(0, descriptor.stat().size - position));
                position += bytes.length;
                return encodingOf(options) === undefined ? bytes : decoder.decode(bytes);
            },
            truncate: async (length = 0) => {
                current('ftruncate').truncate(length);
            },
            stat: async () => current('fstat').stat(),
            sync: async () => { current('fsync'); await this.flush(); },
            datasync: async () => { current('fdatasync'); await this.flush(); },
            close: async () => { closed = true; },
        };
    }
    /**
     * Open one synchronous descriptor over a stable file identity.
     * @param path - File path.
     * @param flags - Node open flags.
     * @param mode - Permission bits applied only when a file is created.
     * @returns An open file that survives path rename, replacement, and unlink.
     */
    openFileSync(path, flags = 'r', mode) {
        const target = this.key(path);
        const access = openMode(flags);
        const existing = this.files.get(target);
        if (this.directories.has(target))
            fail('EISDIR', 'open', target);
        if (access.exclusive && existing !== undefined)
            fail('EEXIST', 'open', target);
        if (!access.create && existing === undefined)
            fail('ENOENT', 'open', target);
        if (access.create && existing === undefined) {
            this.writeFileSync(target, new Uint8Array(), mode === undefined ? undefined : { mode });
        }
        else if (access.truncate && existing !== undefined) {
            this.truncateFile(existing, 0);
        }
        const node = this.files.get(target);
        if (node === undefined)
            fail('ENOENT', 'open', target);
        return {
            readable: access.readable,
            writable: access.writable,
            append: access.append,
            read: (position, length) => {
                if (!access.readable)
                    fail('EBADF', 'read', target);
                return node.bytes.subarray(position, position + length);
            },
            write: (position, data) => {
                if (!access.writable)
                    fail('EBADF', 'write', target);
                return this.writeFileNode(node, access.append ? node.bytes.length : position, data);
            },
            truncate: (length) => {
                if (!access.writable)
                    fail('EINVAL', 'ftruncate', target);
                this.truncateFile(node, length);
            },
            stat: () => this.fileStats(node),
        };
    }
    /**
     * Directory-handle members for metadata, durability, and release.
     * `sync`/`datasync` settle an attached durable sink; an ephemeral filesystem
     * resolves immediately and `close` releases nothing.
     * @param target - Normalized path the handle was opened on.
     * @returns Metadata plus the no-op durability and release calls.
     */
    handleTail(target) {
        return {
            stat: async () => this.plainStats(target),
            sync: async () => { await this.flush(); },
            datasync: async () => { await this.flush(); },
            close: async () => { },
        };
    }
    /**
     * Append to a file, creating it when absent.
     * @param path - File path.
     * @param data - Text or bytes.
     */
    appendFileSync(path, data) {
        const target = this.key(path);
        const existing = this.files.get(target);
        const addition = typeof data === 'string' ? encoder.encode(data) : data;
        if (existing === undefined) {
            this.writeFileSync(target, addition);
            return;
        }
        this.writeFileNode(existing, existing.bytes.length, addition);
    }
    /**
     * Move a file or directory subtree.
     * @param from - Source path.
     * @param to - Destination path.
     */
    renameSync(from, to) {
        const source = this.key(from);
        const destination = this.key(to);
        if (source === destination)
            return;
        const node = this.files.get(source);
        if (node !== undefined) {
            if (this.directories.has(destination))
                fail('EISDIR', 'rename', destination);
            if (!this.directories.has(dirname(destination)))
                fail('ENOENT', 'rename', destination);
            if (this.files.get(destination) === node)
                return;
            this.deleteFile(source);
            this.setFile(destination, node);
            this.forgetIdentity(source);
            this.forgetIdentity(destination);
            this.touchDirectory(dirname(source));
            this.touchDirectory(dirname(destination));
            this.publish({ kind: 'remove', path: source });
            this.publish({ kind: 'write', path: destination, bytes: node.bytes, mode: node.mode, entryChanged: true });
            return;
        }
        if (!this.directories.has(source))
            fail('ENOENT', 'rename', source);
        if (this.files.has(destination))
            fail('ENOTDIR', 'rename', destination);
        if (!this.directories.has(dirname(destination)))
            fail('ENOENT', 'rename', destination);
        if (this.directories.has(destination)) {
            if (this.readdirSync(destination).length > 0)
                fail('ENOTEMPTY', 'rename', destination);
            this.directories.delete(destination);
            this.directoryModes.delete(destination);
            this.directoryMtimes.delete(destination);
        }
        const prefix = `${source}${SEP}`;
        const movedFiles = [];
        for (const [candidate, value] of [...this.files]) {
            if (!candidate.startsWith(prefix))
                continue;
            this.deleteFile(candidate);
            const target = join(destination, candidate.slice(prefix.length));
            this.setFile(target, value);
            movedFiles.push({ path: target, bytes: value.bytes, mode: value.mode });
        }
        const movedDirectories = [];
        for (const candidate of [...this.directories]) {
            if (!candidate.startsWith(prefix) && candidate !== source)
                continue;
            const moved = candidate === source ? destination : join(destination, candidate.slice(prefix.length));
            this.directories.delete(candidate);
            this.directories.add(moved);
            const bits = this.directoryModes.get(candidate);
            this.directoryModes.delete(candidate);
            if (bits !== undefined)
                this.directoryModes.set(moved, bits);
            movedDirectories.push({ path: moved, mode: bits ?? DEFAULT_DIRECTORY_MODE });
            const mtime = this.directoryMtimes.get(candidate);
            this.directoryMtimes.delete(candidate);
            if (mtime !== undefined)
                this.directoryMtimes.set(moved, mtime);
        }
        this.forgetIdentity(source);
        this.forgetIdentity(destination);
        this.touchDirectory(dirname(source));
        this.touchDirectory(dirname(destination));
        this.publish({ kind: 'remove', path: source });
        for (const directory of movedDirectories) {
            this.publish({ kind: 'mkdir', path: directory.path, mode: directory.mode });
        }
        for (const entry of movedFiles) {
            this.publish({
                kind: 'write', path: entry.path, bytes: entry.bytes, mode: entry.mode, entryChanged: true,
            });
        }
    }
    /**
     * Give existing bytes a second name.
     *
     * Both names retain one file identity, so writes and metadata changes through
     * either name remain visible through the other until that name is removed.
     * @param existing - Source file path.
     * @param next - Additional path; its parent must exist and it must be free.
     */
    linkSync(existing, next) {
        const source = this.key(existing);
        const target = this.key(next);
        const node = this.files.get(source);
        if (node === undefined)
            fail('ENOENT', 'link', source);
        if (this.files.has(target) || this.directories.has(target))
            fail('EEXIST', 'link', target);
        if (!this.directories.has(dirname(target)))
            fail('ENOENT', 'link', target);
        this.setFile(target, node);
        this.touchDirectory(dirname(target));
        this.publish({ kind: 'write', path: target, bytes: node.bytes, mode: node.mode, entryChanged: true });
    }
    /**
     * Shorten a file.
     * @param path - File path.
     * @param length - Byte length to keep; defaults to zero.
     */
    truncateSync(path, length = 0) {
        const target = this.key(path);
        const node = this.files.get(target);
        if (node === undefined)
            fail('ENOENT', 'truncate', target);
        this.truncateFile(node, length);
    }
    /**
     * Change an entry's permission bits; stat reads back exactly what was set.
     * @param path - File or directory path.
     * @param mode - New permission bits (`0o777` mask).
     */
    chmodSync(path, mode) {
        const target = this.key(path);
        const node = this.files.get(target);
        if (node !== undefined) {
            node.mode = mode & 0o777;
            if (typeof node.paths === 'string') {
                this.publish({ kind: 'chmod', path: node.paths, mode: node.mode });
            }
            else if (node.paths !== undefined) {
                for (const path of node.paths)
                    this.publish({ kind: 'chmod', path, mode: node.mode });
            }
            return;
        }
        if (this.directories.has(target)) {
            const bits = mode & 0o777;
            this.directoryModes.set(target, bits);
            this.publish({ kind: 'chmod', path: target, mode: bits });
            return;
        }
        fail('ENOENT', 'chmod', target);
    }
    /**
     * Remove a file.
     * @param path - File path.
     */
    unlinkSync(path) {
        const target = this.key(path);
        if (this.deleteFile(target) === undefined)
            fail('ENOENT', 'unlink', target);
        this.forgetIdentity(target);
        this.touchDirectory(dirname(target));
        this.publish({ kind: 'remove', path: target });
    }
    /**
     * Remove a file or directory.
     * @param path - Path to remove.
     * @param options - `recursive` removes subtrees, `force` ignores absence.
     */
    rmSync(path, options) {
        const target = this.key(path);
        if (this.deleteFile(target) !== undefined) {
            this.forgetIdentity(target);
            this.touchDirectory(dirname(target));
            this.publish({ kind: 'remove', path: target });
            return;
        }
        if (this.directories.has(target)) {
            if (options?.recursive !== true)
                fail('ERR_FS_EISDIR', 'rm', target);
            const prefix = `${target}${SEP}`;
            for (const candidate of [...this.files.keys()])
                if (candidate.startsWith(prefix))
                    this.deleteFile(candidate);
            for (const candidate of [...this.directories]) {
                if (!candidate.startsWith(prefix))
                    continue;
                this.directories.delete(candidate);
                this.directoryModes.delete(candidate);
                this.directoryMtimes.delete(candidate);
            }
            this.directories.delete(target);
            this.directoryModes.delete(target);
            this.directoryMtimes.delete(target);
            this.forgetIdentity(target);
            this.touchDirectory(dirname(target));
            this.publish({ kind: 'remove', path: target });
            return;
        }
        if (options?.force !== true)
            fail('ENOENT', 'rm', target);
    }
    /**
     * Create a uniquely named directory beside `prefix`, as `fs.mkdtempSync` does.
     * @param prefix - Path prefix; the suffix is appended without a separator.
     * @returns The created directory path.
     */
    mkdtempSync(prefix) {
        this.temporaries += 1;
        const target = `${prefix}${Date.now().toString(36)}${this.temporaries.toString(36)}`;
        this.mkdirSync(target, { recursive: true });
        return this.key(target);
    }
    /**
     * Seed a file and its parent directories, for image loading and tests.
     * @param path - File path.
     * @param data - Text or bytes.
     * @param options - Permission bits and modification time supplied by the image or durable store.
     */
    seed(path, data, options = {}) {
        const target = this.key(path);
        this.seedDirectory(dirname(target));
        this.setFile(target, {
            bytes: typeof data === 'string' ? encoder.encode(data) : data,
            mtimeMs: options.mtimeMs ?? this.touch(target),
            mode: (options.mode ?? DEFAULT_FILE_MODE) & 0o777,
            paths: undefined,
        });
        this.touchDirectory(dirname(target));
    }
    /**
     * Create a directory and its parents.
     * @param path - Directory path.
     * @param options - Permission bits and modification time supplied by the image or durable store.
     */
    seedDirectory(path, options = {}) {
        const target = this.key(path);
        if (!this.directories.has(target)) {
            const parent = dirname(target);
            if (parent !== target)
                this.seedDirectory(parent);
            if (this.files.has(target))
                fail('EEXIST', 'mkdir', target);
            this.directories.add(target);
            this.directoryMtimes.set(target, options.mtimeMs ?? Date.now());
            this.touchDirectory(parent);
        }
        if (options.mode !== undefined)
            this.directoryModes.set(target, options.mode & 0o777);
        if (options.mtimeMs !== undefined)
            this.directoryMtimes.set(target, options.mtimeMs);
    }
    /**
     * Report what this filesystem holds, for the host's boot diagnostics.
     * @returns File count, directory count, and total byte size.
     */
    usage() {
        let bytes = 0;
        for (const node of this.files.values())
            bytes += node.bytes.length;
        return { files: this.files.size, directories: this.directories.size, bytes };
    }
}
/**
 * Mount a tar image produced by the build-time collector.
 *
 * Entry names are relative to `root` (`node_modules/...`, `config/cordis.yml`);
 * an absolute entry name is a collector defect and fails loud. File contents
 * stay views into `image` — nothing is copied at mount time.
 * @param image - The ustar archive, as `inflateImage` produces it from the fetched image.
 * @param root - Virtual root the entries mount under.
 * @param vfs - Filesystem to fill; a fresh one by default.
 * @returns The filled filesystem.
 */
export function loadVfsImage(image, root = '/dsh', vfs = new MemoryVfs()) {
    vfs.seedDirectory(root);
    for (const entry of parseTar(image)) {
        const relativeName = entry.name.startsWith('./') ? entry.name.slice(2) : entry.name;
        if (relativeName.startsWith(SEP)) {
            throw new Error(`webworker vfs: image entry must be relative to ${root}, received "${entry.name}"`);
        }
        const target = join(root, relativeName);
        if (entry.directory) {
            vfs.seedDirectory(target, { mode: entry.mode });
            continue;
        }
        vfs.seed(target, entry.bytes, { mode: entry.mode });
    }
    return vfs;
}
/**
 * Apply one ordered data overlay to an already mounted base image.
 *
 * Overlay entries may replace files only under the layout's data directories;
 * module code, configuration, and the lowering manifest cannot be shadowed.
 * Paths containing traversal segments are refused before normalization. Later
 * overlays win for files, while file/directory type conflicts fail loud.
 * @param image - Uncompressed ustar overlay archive.
 * @param root - Virtual root shared with the base image.
 * @param vfs - Mounted filesystem to update.
 * @returns The same filesystem after applying the overlay.
 */
export function loadVfsOverlay(image, root, vfs) {
    for (const entry of parseTar(image)) {
        const relativeName = entry.name.startsWith('./') ? entry.name.slice(2) : entry.name;
        const path = relativeName.endsWith('/') ? relativeName.slice(0, -1) : relativeName;
        const segments = path.split('/');
        if (path === '' || relativeName.startsWith(SEP)
            || segments.some(segment => segment === '' || segment === '.' || segment === '..')
            || !IMAGE_OVERLAY_DIRECTORIES.includes(segments[0] ?? '')) {
            throw new Error(`webworker vfs: overlay entry must stay under ${IMAGE_OVERLAY_DIRECTORIES.join('/ or ')}, received "${entry.name}"`);
        }
        const target = join(root, path);
        if (entry.directory) {
            vfs.seedDirectory(target, { mode: entry.mode });
            continue;
        }
        if (vfs.existsSync(target) && vfs.statSync(target).isDirectory()) {
            throw new Error(`webworker vfs: overlay file cannot replace directory "${target}"`);
        }
        vfs.seed(target, entry.bytes, { mode: entry.mode });
    }
    return vfs;
}
//# sourceMappingURL=memory.js.map