import { Buffer } from 'buffer';
/** Node's streaming Hash face, restricted to the update/digest pair in use. */
export interface Hash {
    update(data: string | Uint8Array | ArrayBuffer, encoding?: string): Hash;
    digest(): Buffer;
    digest(encoding: 'hex' | 'base64'): string;
}
/**
 * Create a synchronous hash object.
 * @param algorithm - digest name; only the algorithms the host tree uses exist.
 * @returns the streaming hash face.
 */
export declare function createHash(algorithm: string): Hash;
/**
 * Random bytes.
 * @param size - byte count.
 * @returns a Buffer of cryptographically strong random bytes.
 */
export declare function randomBytes(size: number): Buffer<ArrayBuffer>;
/**
 * Random v4 UUID. Delegated to the repository's own mint rather than to
 * `crypto.randomUUID`, which browsers expose only in secure contexts — a
 * preview served over plain HTTP on a LAN address has no `randomUUID`.
 * @returns the UUID string.
 */
export declare function randomUUID(): import('node:crypto').UUID;
/**
 * Fill a typed array with random bytes.
 * @param target - the array to fill.
 * @returns the same array.
 */
export declare function getRandomValues<T extends ArrayBufferView<ArrayBuffer>>(target: T): T;
/**
 * Random integer in `[0, max)`.
 * @param max - exclusive upper bound.
 * @returns the integer.
 */
export declare function randomInt(max: number): number;
/** WebCrypto instance, as Node exposes it. */
export declare const webcrypto: Crypto;
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ./builtins.ts). */
export declare const __esModule = true;
/** CommonJS default export: the members `require()` hands a caller of this module. */
declare const _default: {
    createHash: typeof createHash;
    randomBytes: typeof randomBytes;
    randomUUID: typeof randomUUID;
    getRandomValues: typeof getRandomValues;
    randomInt: typeof randomInt;
    webcrypto: Crypto;
};
export default _default;
//# sourceMappingURL=crypto.d.ts.map