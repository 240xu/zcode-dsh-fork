import type { VfsBigIntStats, VfsStatOptions, VfsStats, VfsWriteOptions } from '../../../storage/types.ts';
import { Buffer } from 'buffer';
import { Readable, Writable } from './stream.ts';
import { FSWatcher, StatWatcher, unwatchFile, watch, watchAsync, watchFile } from './fs-watch.ts';
export { FSWatcher, StatWatcher, unwatchFile, watch, watchFile };
type PathArg = string | URL | Uint8Array;
type EncodingOption = BufferEncoding | {
    encoding?: BufferEncoding | null;
} | null | undefined;
/** Node `Dirent` subset returned by `readdirSync(dir, { withFileTypes: true })`. */
export declare class Dirent {
    /** Entry name, without its directory. */
    readonly name: string;
    /** Directory this entry was listed from. */
    readonly parentPath: string;
    private readonly file;
    /**
     * Build one directory entry.
     * @param name - entry name.
     * @param parentPath - directory holding it.
     * @param file - whether the entry is a regular file.
     */
    constructor(name: string, parentPath: string, file: boolean);
    /**
     * Entry kind, as `readdirSync` observed it.
     * @returns Whether the entry is a regular file.
     */
    isFile(): boolean;
    /**
     * Entry kind, as `readdirSync` observed it.
     * @returns Whether the entry is a directory.
     */
    isDirectory(): boolean;
    /**
     * Symlink test, answered from the image's own shape.
     * @returns False — the image is materialized without symlinks.
     */
    isSymbolicLink(): boolean;
}
/** Access-mode constants; the VFS has no permission model, so all bits pass. */
export declare const constants: {
    F_OK: number;
    R_OK: number;
    W_OK: number;
    X_OK: number;
    COPYFILE_EXCL: number;
    O_RDONLY: number;
    O_WRONLY: number;
    O_RDWR: number;
    O_CREAT: number;
    O_TRUNC: number;
    O_APPEND: number;
};
/**
 * Read a file.
 * @param path - file path.
 * @param options - encoding, or an options object carrying one.
 * @returns bytes, or text when an encoding is given.
 */
export declare function readFileSync(path: PathArg, options?: EncodingOption): Buffer | string;
/**
 * Write a file.
 * @param path - file path.
 * @param data - bytes or text.
 * @param options - write flag and creation mode, forwarded to the VFS.
 */
export declare function writeFileSync(path: PathArg, data: string | Uint8Array, options?: VfsWriteOptions): void;
/**
 * Append to a file, creating it when absent.
 * @param path - file path.
 * @param data - bytes or text.
 */
export declare function appendFileSync(path: PathArg, data: string | Uint8Array): void;
/**
 * Whether a path exists.
 * @param path - the path.
 * @returns true when present.
 */
export declare function existsSync(path: PathArg): boolean;
/**
 * Stat a path.
 * @param path - the path.
 * @param options - `bigint` selects the BigInt stats the filesystem service reads.
 * @returns the stats, in the plain or BigInt shape.
 */
export declare function statSync(path: PathArg, options?: VfsStatOptions): VfsStats | VfsBigIntStats;
/**
 * Read stats through Node's callback form.
 * @param path - Path to stat.
 * @param optionsOrCallback - Stat options or the completion callback.
 * @param maybeCallback - Completion callback when options are present.
 */
export declare function stat(path: PathArg, optionsOrCallback: VfsStatOptions | ((error: NodeJS.ErrnoException | null, stats?: VfsStats | VfsBigIntStats) => void), maybeCallback?: (error: NodeJS.ErrnoException | null, stats?: VfsStats | VfsBigIntStats) => void): void;
/**
 * Change an entry's permission bits; stat reads back exactly what was set.
 * @param path - the path.
 * @param mode - new permission bits (`0o777` mask), numeric or Node's octal string form.
 */
export declare function chmodSync(path: PathArg, mode: number | string): void;
/**
 * Stat a path without following symlinks (the image has none).
 * @param path - the path.
 * @param options - `bigint` selects the BigInt stats the filesystem service reads.
 * @returns the stats, in the plain or BigInt shape.
 */
export declare function lstatSync(path: PathArg, options?: VfsStatOptions): VfsStats | VfsBigIntStats;
/**
 * Read link stats through Node's callback form; this symlink-free VFS delegates to stat.
 * @param path - Path to stat.
 * @param optionsOrCallback - Stat options or the completion callback.
 * @param maybeCallback - Completion callback when options are present.
 */
export declare function lstat(path: PathArg, optionsOrCallback: VfsStatOptions | ((error: NodeJS.ErrnoException | null, stats?: VfsStats | VfsBigIntStats) => void), maybeCallback?: (error: NodeJS.ErrnoException | null, stats?: VfsStats | VfsBigIntStats) => void): void;
/**
 * Canonical path (normalization only: the image is symlink-free).
 * @param path - the path.
 * @returns the resolved path.
 */
export declare function realpathSync(path: PathArg): string;
/**
 * List a directory.
 * @param path - directory path.
 * @param options - `withFileTypes` selects Dirent objects.
 * @returns names, or Dirent objects.
 */
export declare function readdirSync(path: PathArg, options?: {
    withFileTypes?: boolean;
} | BufferEncoding | null): string[] | Dirent[];
/**
 * Create a directory.
 * @param path - directory path.
 * @param options - `recursive` creates parents.
 * @returns the first created path when recursive, else undefined.
 */
export declare function mkdirSync(path: PathArg, options?: {
    recursive?: boolean;
    mode?: number;
}): string | undefined;
/**
 * Create a uniquely named directory.
 * @param prefix - path prefix; six random characters are appended.
 * @returns the created directory path.
 */
export declare function mkdtempSync(prefix: string): string;
/**
 * Remove a file or directory.
 * @param path - the path.
 * @param options - `recursive`/`force`, as in Node.
 */
export declare function rmSync(path: PathArg, options?: {
    recursive?: boolean;
    force?: boolean;
}): void;
/**
 * Remove a file.
 * @param path - the path.
 */
export declare function unlinkSync(path: PathArg): void;
/**
 * Rename a path.
 * @param from - source path.
 * @param to - target path.
 */
export declare function renameSync(from: PathArg, to: PathArg): void;
/**
 * Access check: existence only.
 * @param path - the path.
 */
export declare function accessSync(path: PathArg): void;
/**
 * Open a file descriptor.
 * @param path - file path.
 * @param flags - Node flag string: 'r', 'w', 'a', with optional '+' and the
 * exclusive 'x' (create-only) modifier.
 * @param mode - creation permission bits.
 * @returns the descriptor.
 */
export declare function openSync(path: PathArg, flags?: string, mode?: number): number;
/**
 * Read from a descriptor.
 * @param fd - descriptor.
 * @param buffer - destination.
 * @param offset - destination offset.
 * @param length - byte count.
 * @param position - file position, or null to continue from the cursor.
 * @returns bytes read.
 */
export declare function readSync(fd: number, buffer: Uint8Array, offset?: number, length?: number, position?: number | null): number;
/**
 * Write through a descriptor.
 * @param fd - descriptor.
 * @param data - bytes or text.
 * @returns bytes written.
 */
export declare function writeSync(fd: number, data: string | Uint8Array): number;
/**
 * Close a descriptor.
 * @param fd - descriptor.
 */
export declare function closeSync(fd: number): void;
/**
 * Create a second name for one file identity.
 * @param from - existing path.
 * @param to - new path.
 */
export declare function linkSync(from: PathArg, to: PathArg): void;
/**
 * Open file handle (`fs.FileHandle` subset): the atomic-write and durability
 * pair the storage backends use. `sync`/`datasync` settle the active VFS's
 * optional write-behind sink.
 */
export interface FileHandle {
    readonly fd: number;
    readFile(options?: EncodingOption): Promise<Buffer | string>;
    writeFile(data: string | Uint8Array, encoding?: BufferEncoding): Promise<void>;
    write(data: string | Uint8Array): Promise<{
        bytesWritten: number;
    }>;
    read(buffer: Uint8Array, offset?: number, length?: number, position?: number | null): Promise<{
        bytesRead: number;
        buffer: Uint8Array;
    }>;
    stat(): Promise<VfsStats>;
    truncate(length?: number): Promise<void>;
    sync(): Promise<void>;
    datasync(): Promise<void>;
    close(): Promise<void>;
}
/**
 * Open a file handle. Directories open read-only, which is what the durability
 * helpers do before an fsync.
 * @param path - file or directory path.
 * @param flags - Node flag string.
 * @param mode - creation permission bits.
 * @returns the handle.
 */
export declare function openHandleSync(path: PathArg, flags?: string, mode?: number): FileHandle;
/** Options supported by the VFS-backed read stream. */
export interface ReadStreamOptions {
    flags?: string;
    encoding?: BufferEncoding | null;
    autoClose?: boolean;
    emitClose?: boolean;
    start?: number;
    end?: number;
    highWaterMark?: number;
    signal?: AbortSignal;
}
/** Options supported by the VFS-backed write stream. */
export interface WriteStreamOptions {
    flags?: string;
    encoding?: BufferEncoding | null;
    mode?: number;
    autoClose?: boolean;
    emitClose?: boolean;
    start?: number;
    highWaterMark?: number;
    signal?: AbortSignal;
}
/** Read stream over one VFS file. */
export declare class ReadStream extends Readable {
    /** Resolved path opened by this stream. */
    readonly path: string;
    /** Open descriptor, or null before open and after close. */
    fd: number | null;
    /** Whether the descriptor is still waiting to open. */
    pending: boolean;
    /** Bytes delivered by this stream. */
    bytesRead: number;
    private readonly start;
    private readonly end;
    private readonly flags;
    private readonly signal;
    private readonly onAbort;
    private position;
    constructor(path: PathArg, options?: ReadStreamOptions);
    _construct(callback: (error?: Error | null) => void): void;
    _read(size: number): void;
    _destroy(error: Error | null, callback: (error?: Error | null) => void): void;
    /**
     * Close the stream and release its descriptor.
     * @param callback - Optional completion callback after `close`.
     */
    close(callback?: (error?: NodeJS.ErrnoException | null) => void): void;
}
/** Writable stream committing chunks through the VFS file-descriptor face. */
export declare class WriteStream extends Writable {
    /** Resolved path opened by this stream. */
    readonly path: string;
    /** Open descriptor, or null before open and after close. */
    fd: number | null;
    /** Whether the descriptor is still waiting to open. */
    pending: boolean;
    /** Bytes committed by this stream. */
    bytesWritten: number;
    private readonly flags;
    private readonly mode;
    private readonly start;
    private readonly signal;
    private readonly onAbort;
    constructor(path: PathArg, options?: WriteStreamOptions);
    _construct(callback: (error?: Error | null) => void): void;
    _write(chunk: string | Uint8Array, encoding: BufferEncoding, callback: (error?: Error | null) => void): void;
    _destroy(error: Error | null, callback: (error: Error | null) => void): void;
    /**
     * Close the stream and release its descriptor.
     * @param callback - Optional completion callback after `close`.
     */
    close(callback?: (error?: NodeJS.ErrnoException | null) => void): void;
}
/**
 * Create a Node-compatible readable file stream over the VFS.
 * @param path - File path.
 * @param options - Encoding, range, open, buffer, and abort options.
 * @returns The readable file stream.
 */
export declare function createReadStream(path: PathArg, options?: ReadStreamOptions | BufferEncoding): ReadStream;
/**
 * Create a Node-compatible writable file stream over the VFS.
 * @param path - File path.
 * @param options - Encoding, open, buffer, and abort options.
 * @returns The writable file stream.
 */
export declare function createWriteStream(path: PathArg, options?: WriteStreamOptions | BufferEncoding): WriteStream;
/** Open directory handle (`fs.Dir` subset): iteration plus the close pair. */
export interface Dir {
    readonly path: string;
    read(): Promise<Dirent | null>;
    close(): Promise<void>;
    closeSync(): void;
    [Symbol.asyncIterator](): AsyncIterableIterator<Dirent>;
}
/**
 * Open a directory handle. Callers use it to assert "this path is a directory"
 * and to walk entries; the listing is taken once, since the VFS has no external
 * writer to race with.
 * @param path - directory path.
 * @returns the handle.
 */
export declare function opendirSync(path: PathArg): Dir;
/**
 * Promise face (`node:fs/promises`) over the same VFS. Each member answers the
 * union the VFS produces rather than Node's encoding-dependent overloads, so the
 * check here is that every name is a real `node:fs/promises` export.
 */
export declare const promises: {
    readFile: (path: PathArg, options?: EncodingOption) => Promise<Buffer | string>;
    writeFile: (path: PathArg, data: string | Uint8Array, options?: {
        flag?: string;
        mode?: number;
    } | BufferEncoding | null) => Promise<void>;
    appendFile: (path: PathArg, data: string | Uint8Array) => Promise<void>;
    mkdir: (path: PathArg, options?: {
        recursive?: boolean;
        mode?: number;
    }) => Promise<string | undefined>;
    mkdtemp: (prefix: string) => Promise<string>;
    readdir: (path: PathArg, options?: {
        withFileTypes?: boolean;
    } | BufferEncoding) => Promise<string[] | Dirent[]>;
    stat: (path: PathArg, options?: VfsStatOptions) => Promise<VfsStats | VfsBigIntStats>;
    lstat: (path: PathArg, options?: VfsStatOptions) => Promise<VfsStats | VfsBigIntStats>;
    realpath: (path: PathArg) => Promise<string>;
    rm: (path: PathArg, options?: {
        recursive?: boolean;
        force?: boolean;
    }) => Promise<void>;
    unlink: (path: PathArg) => Promise<void>;
    rename: (from: PathArg, to: PathArg) => Promise<void>;
    access: (path: PathArg) => Promise<void>;
    chmod: (path: PathArg, mode: number | string) => Promise<void>;
    cp: (from: PathArg, to: PathArg) => Promise<void>;
    link: (from: PathArg, to: PathArg) => Promise<void>;
    open: (path: PathArg, flags?: string, mode?: number) => Promise<FileHandle>;
    opendir: (path: PathArg) => Promise<Dir>;
    truncate: (path: PathArg, length?: number) => Promise<void>;
    watch: typeof watchAsync;
    constants: {
        F_OK: number;
        R_OK: number;
        W_OK: number;
        X_OK: number;
        COPYFILE_EXCL: number;
        O_RDONLY: number;
        O_WRONLY: number;
        O_RDWR: number;
        O_CREAT: number;
        O_TRUNC: number;
        O_APPEND: number;
    };
};
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ./builtins.ts). */
export declare const __esModule = true;
/** CommonJS default export: the members `require()` hands a caller of this module. */
declare const _default: {
    constants: {
        F_OK: number;
        R_OK: number;
        W_OK: number;
        X_OK: number;
        COPYFILE_EXCL: number;
        O_RDONLY: number;
        O_WRONLY: number;
        O_RDWR: number;
        O_CREAT: number;
        O_TRUNC: number;
        O_APPEND: number;
    };
    promises: {
        readFile: (path: PathArg, options?: EncodingOption) => Promise<Buffer | string>;
        writeFile: (path: PathArg, data: string | Uint8Array, options?: {
            flag?: string;
            mode?: number;
        } | BufferEncoding | null) => Promise<void>;
        appendFile: (path: PathArg, data: string | Uint8Array) => Promise<void>;
        mkdir: (path: PathArg, options?: {
            recursive?: boolean;
            mode?: number;
        }) => Promise<string | undefined>;
        mkdtemp: (prefix: string) => Promise<string>;
        readdir: (path: PathArg, options?: {
            withFileTypes?: boolean;
        } | BufferEncoding) => Promise<string[] | Dirent[]>;
        stat: (path: PathArg, options?: VfsStatOptions) => Promise<VfsStats | VfsBigIntStats>;
        lstat: (path: PathArg, options?: VfsStatOptions) => Promise<VfsStats | VfsBigIntStats>;
        realpath: (path: PathArg) => Promise<string>;
        rm: (path: PathArg, options?: {
            recursive?: boolean;
            force?: boolean;
        }) => Promise<void>;
        unlink: (path: PathArg) => Promise<void>;
        rename: (from: PathArg, to: PathArg) => Promise<void>;
        access: (path: PathArg) => Promise<void>;
        chmod: (path: PathArg, mode: number | string) => Promise<void>;
        cp: (from: PathArg, to: PathArg) => Promise<void>;
        link: (from: PathArg, to: PathArg) => Promise<void>;
        open: (path: PathArg, flags?: string, mode?: number) => Promise<FileHandle>;
        opendir: (path: PathArg) => Promise<Dir>;
        truncate: (path: PathArg, length?: number) => Promise<void>;
        watch: typeof watchAsync;
        constants: {
            F_OK: number;
            R_OK: number;
            W_OK: number;
            X_OK: number;
            COPYFILE_EXCL: number;
            O_RDONLY: number;
            O_WRONLY: number;
            O_RDWR: number;
            O_CREAT: number;
            O_TRUNC: number;
            O_APPEND: number;
        };
    };
    Dirent: typeof Dirent;
    FSWatcher: typeof FSWatcher;
    StatWatcher: typeof StatWatcher;
    ReadStream: typeof ReadStream;
    WriteStream: typeof WriteStream;
    readFileSync: typeof readFileSync;
    writeFileSync: typeof writeFileSync;
    appendFileSync: typeof appendFileSync;
    existsSync: typeof existsSync;
    statSync: typeof statSync;
    stat: typeof stat;
    lstatSync: typeof lstatSync;
    lstat: typeof lstat;
    realpathSync: typeof realpathSync;
    chmodSync: typeof chmodSync;
    readdirSync: typeof readdirSync;
    mkdirSync: typeof mkdirSync;
    mkdtempSync: typeof mkdtempSync;
    rmSync: typeof rmSync;
    unlinkSync: typeof unlinkSync;
    renameSync: typeof renameSync;
    accessSync: typeof accessSync;
    opendirSync: typeof opendirSync;
    openHandleSync: typeof openHandleSync;
    linkSync: typeof linkSync;
    openSync: typeof openSync;
    readSync: typeof readSync;
    writeSync: typeof writeSync;
    closeSync: typeof closeSync;
    watch: typeof watch;
    watchFile: typeof watchFile;
    unwatchFile: typeof unwatchFile;
    createReadStream: typeof createReadStream;
    createWriteStream: typeof createWriteStream;
};
export default _default;
//# sourceMappingURL=fs.d.ts.map