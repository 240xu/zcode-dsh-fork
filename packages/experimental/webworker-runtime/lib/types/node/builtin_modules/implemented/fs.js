/**
 * `node:fs` bridge over the worker's in-memory VFS. `MemoryVfs` owns paths,
 * bytes, the directory tree, and Node's error codes; this module adds only what
 * is Node-API-shaped and not VFS business: Buffer results, `Dirent` objects,
 * file descriptors, `mkdtemp`, access checks, watchers, streams, and the promise face.
 */
import { requireActiveVfs } from "../../../storage/active.js";
import { Buffer } from 'buffer';
import { Readable, Writable } from "./stream.js";
import { dirname } from "./path.js";
import { abortError } from "./abort-error.js";
import { FSWatcher, StatWatcher, unwatchFile, watch, watchAsync, watchFile, } from "./fs-watch.js";
const vfs = () => requireActiveVfs();
export { FSWatcher, StatWatcher, unwatchFile, watch, watchFile };
const asPath = (path) => {
    if (typeof path === 'string')
        return path;
    if (path instanceof URL)
        return decodeURIComponent(path.pathname);
    return new TextDecoder().decode(path);
};
const encodingOf = (options) => {
    if (options === undefined || options === null)
        return undefined;
    if (typeof options === 'string')
        return options;
    return options.encoding ?? undefined;
};
const bytesOf = (path) => vfs().readFileSync(path);
/** Share the VFS bytes rather than copying them. */
const asBuffer = (bytes) => Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
/** Node `Dirent` subset returned by `readdirSync(dir, { withFileTypes: true })`. */
export class Dirent {
    /** Entry name, without its directory. */
    name;
    /** Directory this entry was listed from. */
    parentPath;
    file;
    /**
     * Build one directory entry.
     * @param name - entry name.
     * @param parentPath - directory holding it.
     * @param file - whether the entry is a regular file.
     */
    constructor(name, parentPath, file) {
        this.name = name;
        this.parentPath = parentPath;
        this.file = file;
    }
    /**
     * Entry kind, as `readdirSync` observed it.
     * @returns Whether the entry is a regular file.
     */
    isFile() {
        return this.file;
    }
    /**
     * Entry kind, as `readdirSync` observed it.
     * @returns Whether the entry is a directory.
     */
    isDirectory() {
        return !this.file;
    }
    /**
     * Symlink test, answered from the image's own shape.
     * @returns False — the image is materialized without symlinks.
     */
    isSymbolicLink() {
        return false;
    }
}
/** Access-mode constants; the VFS has no permission model, so all bits pass. */
export const constants = {
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1,
    COPYFILE_EXCL: 1,
    O_RDONLY: 0,
    O_WRONLY: 1,
    O_RDWR: 2,
    O_CREAT: 64,
    O_TRUNC: 512,
    O_APPEND: 1024,
};
/**
 * Read a file.
 * @param path - file path.
 * @param options - encoding, or an options object carrying one.
 * @returns bytes, or text when an encoding is given.
 */
export function readFileSync(path, options) {
    const encoding = encodingOf(options);
    const bytes = bytesOf(asPath(path));
    return encoding === undefined || encoding === 'utf8' || encoding === 'utf-8'
        ? (encoding === undefined ? asBuffer(bytes) : new TextDecoder().decode(bytes))
        : asBuffer(bytes).toString(encoding);
}
/**
 * Write a file.
 * @param path - file path.
 * @param data - bytes or text.
 * @param options - write flag and creation mode, forwarded to the VFS.
 */
export function writeFileSync(path, data, options) {
    vfs().writeFileSync(asPath(path), data, options);
}
/**
 * Append to a file, creating it when absent.
 * @param path - file path.
 * @param data - bytes or text.
 */
export function appendFileSync(path, data) {
    vfs().appendFileSync(asPath(path), data);
}
/**
 * Whether a path exists.
 * @param path - the path.
 * @returns true when present.
 */
export function existsSync(path) {
    return vfs().existsSync(asPath(path));
}
/**
 * Stat a path.
 * @param path - the path.
 * @param options - `bigint` selects the BigInt stats the filesystem service reads.
 * @returns the stats, in the plain or BigInt shape.
 */
export function statSync(path, options) {
    return vfs().statSync(asPath(path), options);
}
/**
 * Read stats through Node's callback form.
 * @param path - Path to stat.
 * @param optionsOrCallback - Stat options or the completion callback.
 * @param maybeCallback - Completion callback when options are present.
 */
export function stat(path, optionsOrCallback, maybeCallback) {
    const options = typeof optionsOrCallback === 'function' ? undefined : optionsOrCallback;
    const callback = typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback;
    if (callback === undefined)
        throw new TypeError('The "callback" argument must be of type function');
    queueMicrotask(() => {
        let result;
        try {
            result = statSync(path, options);
        }
        catch (error) {
            callback(error);
            return;
        }
        callback(null, result);
    });
}
/**
 * Change an entry's permission bits; stat reads back exactly what was set.
 * @param path - the path.
 * @param mode - new permission bits (`0o777` mask), numeric or Node's octal string form.
 */
export function chmodSync(path, mode) {
    vfs().chmodSync(asPath(path), typeof mode === 'string' ? Number.parseInt(mode, 8) : mode);
}
/**
 * Stat a path without following symlinks (the image has none).
 * @param path - the path.
 * @param options - `bigint` selects the BigInt stats the filesystem service reads.
 * @returns the stats, in the plain or BigInt shape.
 */
export function lstatSync(path, options) {
    return statSync(path, options);
}
/**
 * Read link stats through Node's callback form; this symlink-free VFS delegates to stat.
 * @param path - Path to stat.
 * @param optionsOrCallback - Stat options or the completion callback.
 * @param maybeCallback - Completion callback when options are present.
 */
export function lstat(path, optionsOrCallback, maybeCallback) {
    stat(path, optionsOrCallback, maybeCallback);
}
/**
 * Canonical path (normalization only: the image is symlink-free).
 * @param path - the path.
 * @returns the resolved path.
 */
export function realpathSync(path) {
    return vfs().realpathSync(asPath(path));
}
/**
 * List a directory.
 * @param path - directory path.
 * @param options - `withFileTypes` selects Dirent objects.
 * @returns names, or Dirent objects.
 */
export function readdirSync(path, options) {
    const target = asPath(path);
    const names = vfs().readdirSync(target);
    if (typeof options !== 'object' || options === null || options.withFileTypes !== true)
        return names;
    return names.map(name => new Dirent(name, target, vfs().statSync(`${target}/${name}`).isFile()));
}
/**
 * Create a directory.
 * @param path - directory path.
 * @param options - `recursive` creates parents.
 * @returns the first created path when recursive, else undefined.
 */
export function mkdirSync(path, options) {
    return vfs().mkdirSync(asPath(path), options);
}
/**
 * Create a uniquely named directory.
 * @param prefix - path prefix; six random characters are appended.
 * @returns the created directory path.
 */
export function mkdtempSync(prefix) {
    // Not crypto.randomUUID: browsers expose that only in secure contexts.
    const suffix = Array.from(globalThis.crypto.getRandomValues(new Uint8Array(3)), byte => byte.toString(16).padStart(2, '0')).join('');
    const target = `${prefix}${suffix}`;
    vfs().mkdirSync(target, { recursive: true });
    return target;
}
/**
 * Remove a file or directory.
 * @param path - the path.
 * @param options - `recursive`/`force`, as in Node.
 */
export function rmSync(path, options) {
    vfs().rmSync(asPath(path), options);
}
/**
 * Remove a file.
 * @param path - the path.
 */
export function unlinkSync(path) {
    vfs().rmSync(asPath(path));
}
/**
 * Rename a path.
 * @param from - source path.
 * @param to - target path.
 */
export function renameSync(from, to) {
    vfs().renameSync(asPath(from), asPath(to));
}
/**
 * Access check: existence only.
 * @param path - the path.
 */
export function accessSync(path) {
    vfs().realpathSync(asPath(path));
}
const openFiles = new Map();
let nextFd = 3;
/**
 * Open a file descriptor.
 * @param path - file path.
 * @param flags - Node flag string: 'r', 'w', 'a', with optional '+' and the
 * exclusive 'x' (create-only) modifier.
 * @param mode - creation permission bits.
 * @returns the descriptor.
 */
export function openSync(path, flags = 'r', mode) {
    const target = asPath(path);
    const file = vfs().openFileSync(target, flags, mode);
    const fd = nextFd++;
    openFiles.set(fd, { file, position: 0 });
    return fd;
}
const badFileDescriptor = (syscall) => {
    const error = new Error(`EBADF: bad file descriptor, ${syscall}`);
    error.code = 'EBADF';
    error.syscall = syscall;
    throw error;
};
const fileOf = (fd, syscall) => {
    const file = openFiles.get(fd);
    if (file === undefined)
        return badFileDescriptor(syscall);
    return file;
};
/**
 * Read from a descriptor.
 * @param fd - descriptor.
 * @param buffer - destination.
 * @param offset - destination offset.
 * @param length - byte count.
 * @param position - file position, or null to continue from the cursor.
 * @returns bytes read.
 */
export function readSync(fd, buffer, offset = 0, length = buffer.byteLength, position = null) {
    const file = fileOf(fd, 'read');
    const from = position ?? file.position;
    const slice = file.file.read(from, length);
    buffer.set(slice, offset);
    if (position === null)
        file.position = from + slice.byteLength;
    return slice.byteLength;
}
/**
 * Write through a descriptor.
 * @param fd - descriptor.
 * @param data - bytes or text.
 * @returns bytes written.
 */
export function writeSync(fd, data) {
    const file = fileOf(fd, 'write');
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    const position = file.file.append ? file.file.stat().size : file.position;
    const bytesWritten = file.file.write(position, bytes);
    file.position = position + bytesWritten;
    return bytesWritten;
}
/**
 * Close a descriptor.
 * @param fd - descriptor.
 */
export function closeSync(fd) {
    if (!openFiles.delete(fd))
        fileOf(fd, 'close');
}
/**
 * Create a second name for one file identity.
 * @param from - existing path.
 * @param to - new path.
 */
export function linkSync(from, to) {
    vfs().linkSync(asPath(from), asPath(to));
}
/**
 * Open a file handle. Directories open read-only, which is what the durability
 * helpers do before an fsync.
 * @param path - file or directory path.
 * @param flags - Node flag string.
 * @param mode - creation permission bits.
 * @returns the handle.
 */
export function openHandleSync(path, flags = 'r', mode) {
    const target = asPath(path);
    const directory = vfs().existsSync(target) && vfs().statSync(target).isDirectory();
    const fd = directory ? -1 : openSync(target, flags, mode);
    let closed = false;
    const descriptor = (syscall) => fileOf(fd, syscall);
    return {
        fd,
        readFile: async (options) => {
            if (directory)
                return readFileSync(target, options);
            const open = descriptor('read');
            const bytes = open.file.read(open.position, Math.max(0, open.file.stat().size - open.position));
            open.position += bytes.length;
            const encoding = encodingOf(options);
            return encoding === undefined || encoding === 'utf8' || encoding === 'utf-8'
                ? (encoding === undefined ? asBuffer(bytes) : new TextDecoder().decode(bytes))
                : asBuffer(bytes).toString(encoding);
        },
        writeFile: async (data) => {
            if (directory)
                writeFileSync(target, data);
            else
                writeSync(fd, data);
        },
        write: async (data) => ({ bytesWritten: writeSync(fd, data) }),
        read: async (buffer, offset = 0, length = buffer.byteLength, position = null) => ({
            bytesRead: readSync(fd, buffer, offset, length, position),
            buffer,
        }),
        stat: async () => directory ? statSync(target) : descriptor('fstat').file.stat(),
        truncate: async (length = 0) => {
            if (directory)
                writeFileSync(target, new Uint8Array(length));
            else
                descriptor('ftruncate').file.truncate(length);
        },
        sync: async () => { await vfs().flush(); },
        datasync: async () => { await vfs().flush(); },
        close: async () => {
            if (closed)
                return;
            closed = true;
            if (fd !== -1)
                closeSync(fd);
        },
    };
}
/** Node implements file-stream `autoClose` through the stream's `autoDestroy` state. */
const streamAutoDestroy = (autoClose) => autoClose ?? true;
/** Release the descriptor and abort listener shared by both file-stream directions. */
function destroyFileStream(stream, signal, onAbort, error, callback) {
    signal?.removeEventListener('abort', onAbort);
    if (stream.fd !== null)
        closeSync(stream.fd);
    stream.fd = null;
    stream.pending = false;
    callback(error);
}
/** Register an optional completion callback and explicitly destroy a file stream. */
function closeFileStream(stream, callback) {
    if (callback !== undefined)
        stream.once('close', () => { callback(null); });
    stream.destroy();
}
/** Read stream over one VFS file. */
export class ReadStream extends Readable {
    /** Resolved path opened by this stream. */
    path;
    /** Open descriptor, or null before open and after close. */
    fd = null;
    /** Whether the descriptor is still waiting to open. */
    pending = true;
    /** Bytes delivered by this stream. */
    bytesRead = 0;
    start;
    end;
    flags;
    signal;
    onAbort;
    position;
    constructor(path, options = {}) {
        super({
            autoDestroy: streamAutoDestroy(options.autoClose),
            emitClose: options.emitClose ?? true,
            highWaterMark: options.highWaterMark ?? 64 * 1024,
        });
        this.path = asPath(path);
        this.start = options.start ?? 0;
        this.end = options.end ?? Number.POSITIVE_INFINITY;
        this.flags = options.flags ?? 'r';
        this.position = this.start;
        this.signal = options.signal;
        this.onAbort = options.signal === undefined ? undefined : () => { this.destroy(abortError(options.signal?.reason)); };
        if (options.encoding !== undefined && options.encoding !== null)
            this.setEncoding(options.encoding);
        options.signal?.addEventListener('abort', this.onAbort, { once: true });
    }
    _construct(callback) {
        if (this.start < 0 || this.end < this.start) {
            callback(new RangeError('The value of "start" is out of range'));
            return;
        }
        if (this.signal?.aborted === true) {
            callback(abortError(this.signal.reason));
            return;
        }
        let fd;
        try {
            fd = openSync(this.path, this.flags);
        }
        catch (error) {
            callback(error);
            return;
        }
        this.fd = fd;
        this.pending = false;
        callback();
        this.emit('open', fd);
        this.emit('ready');
    }
    _read(size) {
        if (this.fd === null)
            return;
        const remaining = this.end === Number.POSITIVE_INFINITY ? size : Math.min(size, this.end - this.position + 1);
        if (remaining <= 0) {
            this.push(null);
            return;
        }
        const buffer = Buffer.allocUnsafe(remaining);
        let count;
        try {
            count = readSync(this.fd, buffer, 0, remaining, this.position);
        }
        catch (error) {
            this.destroy(error);
            return;
        }
        if (count === 0) {
            this.push(null);
            return;
        }
        this.position += count;
        this.bytesRead += count;
        this.push(buffer.subarray(0, count));
    }
    _destroy(error, callback) {
        destroyFileStream(this, this.signal, this.onAbort, error, callback);
    }
    /**
     * Close the stream and release its descriptor.
     * @param callback - Optional completion callback after `close`.
     */
    close(callback) {
        closeFileStream(this, callback);
    }
}
/** Writable stream committing chunks through the VFS file-descriptor face. */
export class WriteStream extends Writable {
    /** Resolved path opened by this stream. */
    path;
    /** Open descriptor, or null before open and after close. */
    fd = null;
    /** Whether the descriptor is still waiting to open. */
    pending = true;
    /** Bytes committed by this stream. */
    bytesWritten = 0;
    flags;
    mode;
    start;
    signal;
    onAbort;
    constructor(path, options = {}) {
        super({
            autoDestroy: streamAutoDestroy(options.autoClose),
            decodeStrings: true,
            defaultEncoding: options.encoding ?? 'utf8',
            emitClose: options.emitClose ?? true,
            highWaterMark: options.highWaterMark ?? 64 * 1024,
        });
        this.path = asPath(path);
        this.flags = options.flags ?? 'w';
        this.mode = options.mode;
        this.start = options.start;
        this.signal = options.signal;
        this.onAbort = options.signal === undefined ? undefined : () => { this.destroy(abortError(options.signal?.reason)); };
        options.signal?.addEventListener('abort', this.onAbort, { once: true });
    }
    _construct(callback) {
        if (this.start !== undefined && this.start < 0) {
            callback(new RangeError('The value of "start" is out of range'));
            return;
        }
        if (this.signal?.aborted === true) {
            callback(abortError(this.signal.reason));
            return;
        }
        let fd;
        try {
            fd = openSync(this.path, this.flags, this.mode);
        }
        catch (error) {
            callback(error);
            return;
        }
        this.fd = fd;
        if (this.start !== undefined)
            fileOf(fd, 'write').position = this.start;
        this.pending = false;
        callback();
        this.emit('open', fd);
        this.emit('ready');
    }
    _write(chunk, encoding, callback) {
        try {
            const fd = this.fd;
            if (fd === null)
                return badFileDescriptor('write');
            const data = typeof chunk === 'string' ? Buffer.from(chunk, encoding) : chunk;
            this.bytesWritten += writeSync(fd, data);
            callback();
        }
        catch (error) {
            callback(error);
        }
    }
    _destroy(error, callback) {
        destroyFileStream(this, this.signal, this.onAbort, error, callback);
    }
    /**
     * Close the stream and release its descriptor.
     * @param callback - Optional completion callback after `close`.
     */
    close(callback) {
        closeFileStream(this, callback);
    }
}
/**
 * Create a Node-compatible readable file stream over the VFS.
 * @param path - File path.
 * @param options - Encoding, range, open, buffer, and abort options.
 * @returns The readable file stream.
 */
export function createReadStream(path, options) {
    return new ReadStream(path, typeof options === 'string' ? { encoding: options } : options);
}
/**
 * Create a Node-compatible writable file stream over the VFS.
 * @param path - File path.
 * @param options - Encoding, open, buffer, and abort options.
 * @returns The writable file stream.
 */
export function createWriteStream(path, options) {
    return new WriteStream(path, typeof options === 'string' ? { encoding: options } : options);
}
/**
 * Open a directory handle. Callers use it to assert "this path is a directory"
 * and to walk entries; the listing is taken once, since the VFS has no external
 * writer to race with.
 * @param path - directory path.
 * @returns the handle.
 */
export function opendirSync(path) {
    const target = asPath(path);
    const entries = readdirSync(target, { withFileTypes: true });
    let index = 0;
    const next = () => entries[index++] ?? null;
    return {
        path: target,
        read: async () => next(),
        close: async () => { index = entries.length; },
        closeSync: () => { index = entries.length; },
        async *[Symbol.asyncIterator]() {
            for (let entry = next(); entry !== null; entry = next())
                yield entry;
        },
    };
}
/**
 * Promise face (`node:fs/promises`) over the same VFS. Each member answers the
 * union the VFS produces rather than Node's encoding-dependent overloads, so the
 * check here is that every name is a real `node:fs/promises` export.
 */
export const promises = {
    readFile: async (path, options) => readFileSync(path, options),
    writeFile: async (path, data, options) => {
        const flag = typeof options === 'object' && options !== null ? options.flag : undefined;
        const mode = typeof options === 'object' && options !== null ? options.mode : undefined;
        if (flag !== undefined && flag.includes('x') && existsSync(path)) {
            const error = new Error(`EEXIST: file already exists, open '${asPath(path)}'`);
            error.code = 'EEXIST';
            throw error;
        }
        if (flag !== undefined && flag.startsWith('a'))
            appendFileSync(path, data);
        else
            writeFileSync(path, data, { ...flag === undefined ? {} : { flag }, ...mode === undefined ? {} : { mode } });
    },
    appendFile: async (path, data) => { appendFileSync(path, data); },
    mkdir: async (path, options) => mkdirSync(path, options),
    mkdtemp: async (prefix) => mkdtempSync(prefix),
    readdir: async (path, options) => readdirSync(path, options),
    stat: async (path, options) => statSync(path, options),
    lstat: async (path, options) => lstatSync(path, options),
    realpath: async (path) => realpathSync(path),
    rm: async (path, options) => { rmSync(path, options); },
    unlink: async (path) => { unlinkSync(path); },
    rename: async (from, to) => { renameSync(from, to); },
    access: async (path) => { accessSync(path); },
    chmod: async (path, mode) => { chmodSync(path, mode); },
    cp: async (from, to) => {
        const source = asPath(from);
        const target = asPath(to);
        if (statSync(source).isDirectory()) {
            mkdirSync(target, { recursive: true });
            for (const name of vfs().readdirSync(source))
                await promises.cp(`${source}/${name}`, `${target}/${name}`);
            return;
        }
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, bytesOf(source));
    },
    // The VFS keeps both names attached to one file identity until either name is removed.
    link: async (from, to) => { linkSync(from, to); },
    open: async (path, flags, mode) => openHandleSync(path, flags, mode),
    opendir: async (path) => opendirSync(path),
    truncate: async (path, length = 0) => {
        vfs().truncateSync(asPath(path), length);
    },
    watch: watchAsync,
    constants,
};
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ./builtins.ts). */
export const __esModule = true;
/** CommonJS default export: the members `require()` hands a caller of this module. */
export default {
    constants, promises, Dirent, FSWatcher, StatWatcher, ReadStream, WriteStream,
    readFileSync, writeFileSync, appendFileSync, existsSync, statSync, stat, lstatSync, lstat, realpathSync, chmodSync,
    readdirSync, mkdirSync, mkdtempSync, rmSync, unlinkSync, renameSync, accessSync, opendirSync,
    openHandleSync, linkSync,
    openSync, readSync, writeSync, closeSync, watch, watchFile, unwatchFile,
    createReadStream, createWriteStream,
};
//# sourceMappingURL=fs.js.map