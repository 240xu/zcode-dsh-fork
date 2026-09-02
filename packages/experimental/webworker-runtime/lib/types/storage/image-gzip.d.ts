/**
 * The image byte envelope. The packer writes one gzip member holding the ustar
 * archive, and the worker inflates it with the platform's own decompressor before
 * the tar reader sees a byte — `storage/tar.ts` stays a pure ustar reader with no
 * codec in it.
 *
 * Inflation runs on the fetch stream rather than on downloaded bytes: the
 * decompressor consumes each chunk as it lands, so unpacking overlaps the
 * download instead of following it, and the compressed copy never has to be held
 * whole in memory beside the archive it produces.
 *
 * One format, no negotiation: a body that does not start a gzip member is refused
 * by name, in the stream, before the decompressor sees it. Without that check a
 * plain tar, a truncated download, or a proxy's HTML error page would reach
 * `parseTar` and fail as a corrupt header field, which says nothing about what
 * the deployment actually served.
 * @module @deepseek-ai/dsh-experimental-webworker-runtime/src/storage/image-gzip
 */
/**
 * Inflate a packed VFS image as it arrives.
 * @param body - the image body, straight from `fetch` or wrapped around bytes.
 * @param source - the image URL, or how the bytes arrived; named in a refusal.
 * @returns the ustar archive the image carries.
 * @throws When the body does not start a gzip member, or the member is corrupt.
 */
export declare function inflateImageStream(body: ReadableStream<Uint8Array>, source: string): Promise<Uint8Array>;
/**
 * Inflate a packed VFS image held in memory.
 *
 * The bytes become a body so both entries run the same stream: one decompression
 * path, one refusal, whether the image came off the network or out of a caller's
 * buffer.
 * @param bytes - the image bytes.
 * @param source - how the bytes arrived; named in a refusal.
 * @returns the ustar archive the image carries.
 * @throws When the bytes do not start a gzip member, or the member is corrupt.
 */
export declare function inflateImage(bytes: Uint8Array, source: string): Promise<Uint8Array>;
//# sourceMappingURL=image-gzip.d.ts.map