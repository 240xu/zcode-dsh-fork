/**
 * Uncompressed ustar archive: the VFS image format. One fetch delivers the
 * whole tree, and the reader hands out subarray views into the fetched buffer,
 * so mounting copies nothing and no inflate step runs inside the worker.
 *
 * Hand-rolled on purpose: both sides need synchronous in-memory operation and
 * the reader ships inside the worker bundle, where the streaming tar packages
 * would drag Node stream shims back in. The subset is plain ustar — regular
 * files and directories, names up to 255 bytes via the name-prefix split — and
 * anything outside it fails loud on either side.
 * @module @deepseek-ai/dsh-experimental-webworker-runtime/src/storage/tar
 */
/** One archive entry; a directory carries empty bytes and a trailing-slash name. */
export interface TarEntry {
    readonly name: string;
    readonly bytes: Uint8Array;
    readonly directory: boolean;
    /** Permission bits from the header's mode field (`0o777` mask). */
    readonly mode: number;
}
/**
 * Pack entries into one uncompressed ustar archive.
 *
 * Entries keep their given order; names ending in a slash become directory
 * entries. Contents are written verbatim — compression belongs to the HTTP
 * transport, not to the archive.
 * @param files - Entry name to content bytes.
 * @returns The archive bytes.
 */
export declare function packTar(files: Readonly<Record<string, Uint8Array>>): Uint8Array;
/**
 * Parse an uncompressed ustar archive.
 *
 * File bytes are subarray views into `archive`, not copies; callers own the
 * aliasing. Entry kinds outside the written subset (links, PAX extensions)
 * fail loud instead of being skipped.
 * @param archive - Archive bytes.
 * @returns Entries in archive order.
 */
export declare function parseTar(archive: Uint8Array): TarEntry[];
//# sourceMappingURL=tar.d.ts.map