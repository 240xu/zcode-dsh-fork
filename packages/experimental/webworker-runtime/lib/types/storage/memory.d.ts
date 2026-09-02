import type { Vfs, VfsBigIntStats, VfsDir, VfsDirent, VfsFileHandle, VfsOpenFile, VfsMutationListener, VfsMutationSink, VfsReadOptions, VfsSeedOptions, VfsStatOptions, VfsStats, VfsWriteOptions } from './types.ts';
/** Construction inputs for {@link MemoryVfs}. */
export interface MemoryVfsOptions {
    /** Durable write-behind observer; absent leaves the filesystem ephemeral. */
    readonly sink?: VfsMutationSink;
}
/**
 * Filesystem held in two maps: one for file bytes, one for directories.
 * Every path is normalized to an absolute POSIX path without a trailing
 * separator, so callers may pass either form.
 */
export declare class MemoryVfs implements Vfs {
    private readonly files;
    private readonly directories;
    /** Directory permission bits; absence means {@link DEFAULT_DIRECTORY_MODE}. */
    private readonly directoryModes;
    /** Directory mtimes advance when their immediate entry set changes. */
    private readonly directoryMtimes;
    private readonly mutationListeners;
    private readonly sink;
    private temporaries;
    private readonly identities;
    private lastIdentity;
    /**
     * Build the synchronous filesystem authority.
     * @param options - Optional durable write-behind sink.
     */
    constructor(options?: MemoryVfsOptions);
    /**
     * Settle the durable sink without changing in-memory success.
     * @returns A promise that resolves when all recorded mutations are stored.
     */
    flush(): Promise<void>;
    /**
     * Observe committed runtime mutations. Image seeding is deliberately silent.
     * @param listener - Consumer called after each successful mutation.
     * @returns A disposer that prevents future calls.
     */
    subscribe(listener: VfsMutationListener): () => void;
    /** Publish after state changes; one faulty observer cannot roll back a write. */
    private publish;
    /** Promise face mirroring `node:fs/promises` for the methods the roster uses. */
    readonly promises: {
        readFile: (path: string, options?: VfsReadOptions) => Promise<string | Uint8Array>;
        writeFile: (path: string, data: string | Uint8Array, options?: VfsWriteOptions) => Promise<void>;
        appendFile: (path: string, data: string | Uint8Array) => Promise<void>;
        mkdir: (path: string, options?: {
            recursive?: boolean;
            mode?: number;
        }) => Promise<string | undefined>;
        readdir: (path: string, options?: {
            withFileTypes?: boolean;
        }) => Promise<string[] & VfsDirent[]>;
        stat: (path: string, options?: VfsStatOptions) => Promise<VfsStats | VfsBigIntStats>;
        lstat: (path: string, options?: VfsStatOptions) => Promise<VfsStats | VfsBigIntStats>;
        realpath: (path: string) => Promise<string>;
        rename: (from: string, to: string) => Promise<void>;
        unlink: (path: string) => Promise<void>;
        rm: (path: string, options?: {
            recursive?: boolean;
            force?: boolean;
        }) => Promise<void>;
        mkdtemp: (prefix: string) => Promise<string>;
        link: (existing: string, next: string) => Promise<void>;
        truncate: (path: string, length?: number) => Promise<void>;
        chmod: (path: string, mode: number) => Promise<void>;
        opendir: (path: string) => Promise<VfsDir>;
        open: (path: string, flags?: string, mode?: number) => Promise<VfsFileHandle>;
        /** Resolves for any existing path: the VFS grants read and write to everything it holds. */
        access: (path: string) => Promise<void>;
    };
    /** @returns Absolute path with no trailing separator. */
    private key;
    /**
     * Read a file.
     * @param path - File path.
     * @param options - `'utf8'` or `{encoding}` for text; omitted for bytes.
     * @returns Text or a copy-free view of the stored bytes.
     */
    readFileSync(path: string, options?: VfsReadOptions): string | Uint8Array;
    /**
     * Report whether a path exists.
     * @param path - Path to test.
     * @returns True for files and directories.
     */
    existsSync(path: string): boolean;
    /**
     * Stat a path.
     * @param path - Path to stat.
     * @param options - `bigint` selects the BigInt stats Node returns for it.
     * @returns Stats for the file or directory.
     */
    statSync(path: string, options?: VfsStatOptions): VfsStats | VfsBigIntStats;
    /** @returns Stats in the plain shape, for internal callers that read `size`/`mtimeMs`. */
    private plainStats;
    /** @returns The stable identity of an existing path, assigning one on first observation. */
    private identityOf;
    /** @returns The inode-like identity retained by a file node across names. */
    private identityOfFile;
    /** @returns The number of names currently linked to one file node. */
    private fileLinkCount;
    /** Add one map name, promoting the rare hard-link case to a Set. */
    private addFilePath;
    /** Remove one map name, collapsing a remaining single link back to a string. */
    private removeFilePath;
    /** Set one file-map entry while maintaining both nodes' reverse path indexes. */
    private setFile;
    /** Delete one file-map entry while retaining an unlinked node held by a descriptor. */
    private deleteFile;
    /** Publish one linked name after a content or metadata write. */
    private publishFilePath;
    /** Publish a content or metadata write for every hard link to one node. */
    private publishFile;
    /** Replace bytes on one file identity and notify all linked paths. */
    private replaceFile;
    /** Write at one offset, zero-filling any gap. */
    private writeFileNode;
    /** Resize one file identity and notify all linked paths. */
    private truncateFile;
    /** @returns Plain stats for an open file, including after its last name is removed. */
    private fileStats;
    /** Forget removed directory identities, so recreated paths report new ones. */
    private forgetIdentity;
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
    private touch;
    /** @returns A modification time strictly newer than one file node's current value. */
    private touchNode;
    /** Advance a directory's mtime after its immediate children change. */
    private touchDirectory;
    /**
     * List a directory.
     * @param path - Directory path.
     * @param options - `withFileTypes` returns {@link VfsDirent} objects instead of names.
     * @returns Immediate entry names, or directory entries.
     */
    readdirSync(path: string, options?: {
        withFileTypes?: boolean;
    }): string[] & VfsDirent[];
    /** @returns Directory entry for one child of `directory`. */
    private direntOf;
    /**
     * Resolve a path; the VFS has no symlinks, so this only normalizes.
     * @param path - Path to resolve.
     * @returns Absolute path.
     */
    realpathSync(path: string): string;
    /**
     * Create a directory.
     * @param path - Directory path.
     * @param options - `recursive` creates missing parents.
     * @returns First created path when recursive, otherwise undefined.
     */
    mkdirSync(path: string, options?: {
        recursive?: boolean;
        mode?: number;
    }): string | undefined;
    /**
     * Write a file, replacing existing contents.
     * @param path - File path; its parent directory must exist.
     * @param data - Text or bytes.
     * @param options - `flag` `wx` refuses an existing file, `a` appends.
     */
    writeFileSync(path: string, data: string | Uint8Array, options?: VfsWriteOptions): void;
    /**
     * Open a directory; consumers enumerate entries or just prove it is one.
     * @param path - Directory path.
     * @returns Directory handle.
     */
    opendir(path: string): VfsDir;
    /**
     * Open a file handle.
     * @param path - File path.
     * @param flags - Node open flags; `r` requires the file, `wx` refuses an existing one.
     * @param mode - Permission bits applied when the open creates the file.
     * @returns File handle.
     */
    open(path: string, flags?: string, mode?: number): VfsFileHandle;
    /**
     * Open one synchronous descriptor over a stable file identity.
     * @param path - File path.
     * @param flags - Node open flags.
     * @param mode - Permission bits applied only when a file is created.
     * @returns An open file that survives path rename, replacement, and unlink.
     */
    openFileSync(path: string, flags?: string, mode?: number): VfsOpenFile;
    /**
     * Directory-handle members for metadata, durability, and release.
     * `sync`/`datasync` settle an attached durable sink; an ephemeral filesystem
     * resolves immediately and `close` releases nothing.
     * @param target - Normalized path the handle was opened on.
     * @returns Metadata plus the no-op durability and release calls.
     */
    private handleTail;
    /**
     * Append to a file, creating it when absent.
     * @param path - File path.
     * @param data - Text or bytes.
     */
    appendFileSync(path: string, data: string | Uint8Array): void;
    /**
     * Move a file or directory subtree.
     * @param from - Source path.
     * @param to - Destination path.
     */
    renameSync(from: string, to: string): void;
    /**
     * Give existing bytes a second name.
     *
     * Both names retain one file identity, so writes and metadata changes through
     * either name remain visible through the other until that name is removed.
     * @param existing - Source file path.
     * @param next - Additional path; its parent must exist and it must be free.
     */
    linkSync(existing: string, next: string): void;
    /**
     * Shorten a file.
     * @param path - File path.
     * @param length - Byte length to keep; defaults to zero.
     */
    truncateSync(path: string, length?: number): void;
    /**
     * Change an entry's permission bits; stat reads back exactly what was set.
     * @param path - File or directory path.
     * @param mode - New permission bits (`0o777` mask).
     */
    chmodSync(path: string, mode: number): void;
    /**
     * Remove a file.
     * @param path - File path.
     */
    unlinkSync(path: string): void;
    /**
     * Remove a file or directory.
     * @param path - Path to remove.
     * @param options - `recursive` removes subtrees, `force` ignores absence.
     */
    rmSync(path: string, options?: {
        recursive?: boolean;
        force?: boolean;
    }): void;
    /**
     * Create a uniquely named directory beside `prefix`, as `fs.mkdtempSync` does.
     * @param prefix - Path prefix; the suffix is appended without a separator.
     * @returns The created directory path.
     */
    mkdtempSync(prefix: string): string;
    /**
     * Seed a file and its parent directories, for image loading and tests.
     * @param path - File path.
     * @param data - Text or bytes.
     * @param options - Permission bits and modification time supplied by the image or durable store.
     */
    seed(path: string, data: string | Uint8Array, options?: VfsSeedOptions): void;
    /**
     * Create a directory and its parents.
     * @param path - Directory path.
     * @param options - Permission bits and modification time supplied by the image or durable store.
     */
    seedDirectory(path: string, options?: VfsSeedOptions): void;
    /**
     * Report what this filesystem holds, for the host's boot diagnostics.
     * @returns File count, directory count, and total byte size.
     */
    usage(): {
        files: number;
        directories: number;
        bytes: number;
    };
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
export declare function loadVfsImage(image: Uint8Array, root?: string, vfs?: MemoryVfs): MemoryVfs;
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
export declare function loadVfsOverlay(image: Uint8Array, root: string, vfs: MemoryVfs): MemoryVfs;
//# sourceMappingURL=memory.d.ts.map