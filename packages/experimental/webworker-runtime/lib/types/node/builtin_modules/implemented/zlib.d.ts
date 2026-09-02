/** Zstandard parameter/flush constants read at module scope by the JSONL backend. */
export declare const constants: {
    ZSTD_c_compressionLevel: number;
    ZSTD_c_checksumFlag: number;
    ZSTD_e_continue: number;
    ZSTD_e_flush: number;
    ZSTD_e_end: number;
    ZSTD_CLEVEL_DEFAULT: number;
    Z_NO_FLUSH: number;
    Z_SYNC_FLUSH: number;
    Z_FINISH: number;
};
/** One-shot Zstandard compression (unavailable; the composition writes plaintext logs). */
export declare const zstdCompressSync: typeof import('node:zlib').zstdCompressSync;
/** One-shot Zstandard decompression (unavailable; the worker never reads compressed logs). */
export declare const zstdDecompressSync: typeof import('node:zlib').zstdDecompressSync;
/** Callback form of {@link zstdCompressSync} (`promisify`'d at module scope by the backend). */
export declare const zstdCompress: typeof import('node:zlib').zstdCompress;
/** Callback form of {@link zstdDecompressSync}. */
export declare const zstdDecompress: typeof import('node:zlib').zstdDecompress;
/**
 * Streaming Zstandard decoder placeholder: the returned object deliberately
 * lacks Node's private `_handle`/`_writeState` members, which is the signal the
 * backend's private-shape probe checks before choosing that path.
 * @returns the incompatible placeholder stream.
 */
export declare function createZstdDecompress(): Record<string, unknown>;
/** Streaming Zstandard encoder (unavailable; the backend only needs one-shot). */
export declare const createZstdCompress: typeof import('node:zlib').createZstdCompress;
/** gzip family (unavailable; no consumer in the reachable tree). */
export declare const gzip: typeof import('node:zlib').gzip;
/** gzip sync counterpart. */
export declare const gzipSync: typeof import('node:zlib').gzipSync;
/** gunzip counterpart. */
export declare const gunzip: typeof import('node:zlib').gunzip;
/** gunzip sync counterpart. */
export declare const gunzipSync: typeof import('node:zlib').gunzipSync;
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ./builtins.ts). */
export declare const __esModule = true;
/** CommonJS default export: the members `require()` hands a caller of this module. */
declare const _default: {
    constants: {
        ZSTD_c_compressionLevel: number;
        ZSTD_c_checksumFlag: number;
        ZSTD_e_continue: number;
        ZSTD_e_flush: number;
        ZSTD_e_end: number;
        ZSTD_CLEVEL_DEFAULT: number;
        Z_NO_FLUSH: number;
        Z_SYNC_FLUSH: number;
        Z_FINISH: number;
    };
    zstdCompress: typeof import("zlib").zstdCompress;
    zstdCompressSync: typeof import("zlib").zstdCompressSync;
    zstdDecompress: typeof import("zlib").zstdDecompress;
    zstdDecompressSync: typeof import("zlib").zstdDecompressSync;
    createZstdCompress: typeof import("zlib").createZstdCompress;
    createZstdDecompress: typeof createZstdDecompress;
    gzip: typeof import("zlib").gzip;
    gzipSync: typeof import("zlib").gzipSync;
    gunzip: typeof import("zlib").gunzip;
    gunzipSync: typeof import("zlib").gunzipSync;
};
export default _default;
//# sourceMappingURL=zlib.d.ts.map