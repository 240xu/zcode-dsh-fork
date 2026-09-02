/**
 * `node:fs/promises` face: the promise members of the VFS bridge, re-exported as
 * named bindings so `import { readFile } from 'node:fs/promises'` resolves. The
 * member set is checked against Node where it is built, on `promises` in
 * `../fs.ts`.
 */
import { Dirent, promises } from '../fs.ts';
/** The promise members of the VFS bridge, as `node:fs/promises` names them. */
export declare const readFile: (path: string | URL | Uint8Array<ArrayBufferLike>, options?: BufferEncoding | {
    encoding?: BufferEncoding | null;
} | null | undefined) => Promise<Buffer | string>, writeFile: (path: string | URL | Uint8Array<ArrayBufferLike>, data: string | Uint8Array, options?: {
    flag?: string;
    mode?: number;
} | BufferEncoding | null) => Promise<void>, appendFile: (path: string | URL | Uint8Array<ArrayBufferLike>, data: string | Uint8Array) => Promise<void>, mkdir: (path: string | URL | Uint8Array<ArrayBufferLike>, options?: {
    recursive?: boolean;
    mode?: number;
}) => Promise<string | undefined>, mkdtemp: (prefix: string) => Promise<string>, readdir: (path: string | URL | Uint8Array<ArrayBufferLike>, options?: {
    withFileTypes?: boolean;
} | BufferEncoding) => Promise<string[] | Dirent[]>, stat: (path: string | URL | Uint8Array<ArrayBufferLike>, options?: import("../../../../storage/types.ts").VfsStatOptions) => Promise<import("../../../../index.ts").VfsStats | import("../../../../storage/types.ts").VfsBigIntStats>, lstat: (path: string | URL | Uint8Array<ArrayBufferLike>, options?: import("../../../../storage/types.ts").VfsStatOptions) => Promise<import("../../../../index.ts").VfsStats | import("../../../../storage/types.ts").VfsBigIntStats>, realpath: (path: string | URL | Uint8Array<ArrayBufferLike>) => Promise<string>, rm: (path: string | URL | Uint8Array<ArrayBufferLike>, options?: {
    recursive?: boolean;
    force?: boolean;
}) => Promise<void>, unlink: (path: string | URL | Uint8Array<ArrayBufferLike>) => Promise<void>, rename: (from: string | URL | Uint8Array<ArrayBufferLike>, to: string | URL | Uint8Array<ArrayBufferLike>) => Promise<void>, access: (path: string | URL | Uint8Array<ArrayBufferLike>) => Promise<void>, chmod: (path: string | URL | Uint8Array<ArrayBufferLike>, mode: number | string) => Promise<void>, cp: (from: string | URL | Uint8Array<ArrayBufferLike>, to: string | URL | Uint8Array<ArrayBufferLike>) => Promise<void>, link: (from: string | URL | Uint8Array<ArrayBufferLike>, to: string | URL | Uint8Array<ArrayBufferLike>) => Promise<void>, open: (path: string | URL | Uint8Array<ArrayBufferLike>, flags?: string, mode?: number) => Promise<import("../fs.ts").FileHandle>, opendir: (path: string | URL | Uint8Array<ArrayBufferLike>) => Promise<import("../fs.ts").Dir>, truncate: (path: string | URL | Uint8Array<ArrayBufferLike>, length?: number) => Promise<void>, watch: typeof import("../fs-watch.ts").watchAsync, constants: {
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
export { Dirent };
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ./builtins.ts). */
export declare const __esModule = true;
export default promises;
//# sourceMappingURL=promises.d.ts.map