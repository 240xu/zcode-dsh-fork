/**
 * `node:crypto` for the worker: WebCrypto for randomness, `@noble/hashes` for the
 * synchronous digests Node's streaming Hash object provides (SubtleCrypto is
 * async, and every caller here hashes synchronously).
 */
import { sha1 } from '@noble/hashes/legacy.js';
import { sha256, sha512 } from '@noble/hashes/sha2.js';
import { randomUUID as mintUUID } from '@deepseek-ai/dsh-util-crypto';
import { Buffer } from 'buffer';
const HASHERS = {
    sha1,
    sha256,
    sha512,
};
const encoder = new TextEncoder();
const toBytes = (data) => {
    if (typeof data === 'string')
        return encoder.encode(data);
    if (data instanceof ArrayBuffer)
        return new Uint8Array(data);
    return data;
};
/**
 * Create a synchronous hash object.
 * @param algorithm - digest name; only the algorithms the host tree uses exist.
 * @returns the streaming hash face.
 */
export function createHash(algorithm) {
    const hasher = HASHERS[algorithm.toLowerCase().replace('-', '')];
    if (hasher === undefined) {
        throw new Error(`web-preview: node:crypto.createHash("${algorithm}") is not available in the worker host`);
    }
    const chunks = [];
    const hash = {
        update(data) {
            chunks.push(toBytes(data));
            return hash;
        },
        digest(encoding) {
            const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
            const joined = new Uint8Array(total);
            let at = 0;
            for (const chunk of chunks) {
                joined.set(chunk, at);
                at += chunk.byteLength;
            }
            const digest = Buffer.from(hasher(joined));
            return (encoding === undefined ? digest : digest.toString(encoding));
        },
    };
    return hash;
}
/**
 * Random bytes.
 * @param size - byte count.
 * @returns a Buffer of cryptographically strong random bytes.
 */
export function randomBytes(size) {
    const bytes = new Uint8Array(size);
    globalThis.crypto.getRandomValues(bytes);
    return Buffer.from(bytes);
}
/**
 * Random v4 UUID. Delegated to the repository's own mint rather than to
 * `crypto.randomUUID`, which browsers expose only in secure contexts — a
 * preview served over plain HTTP on a LAN address has no `randomUUID`.
 * @returns the UUID string.
 */
export function randomUUID() {
    return mintUUID();
}
/**
 * Fill a typed array with random bytes.
 * @param target - the array to fill.
 * @returns the same array.
 */
export function getRandomValues(target) {
    return globalThis.crypto.getRandomValues(target);
}
/**
 * Random integer in `[0, max)`.
 * @param max - exclusive upper bound.
 * @returns the integer.
 */
export function randomInt(max) {
    const sample = globalThis.crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
    return Math.floor((sample / 2 ** 32) * max);
}
/** WebCrypto instance, as Node exposes it. */
export const webcrypto = globalThis.crypto;
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ./builtins.ts). */
export const __esModule = true;
/** CommonJS default export: the members `require()` hands a caller of this module. */
export default {
    createHash, randomBytes, randomUUID, getRandomValues, randomInt, webcrypto,
};
//# sourceMappingURL=crypto.js.map