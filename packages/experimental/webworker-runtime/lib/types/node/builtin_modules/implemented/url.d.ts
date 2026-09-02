/**
 * `node:url` for the worker: the two conversions the host tree uses, plus the
 * WHATWG classes the browser already provides. VFS paths are POSIX, so the
 * file-URL mapping is the simple percent-encoding pair.
 */
/**
 * Filesystem path of a `file:` URL.
 * @param url - file URL or its string form.
 * @returns the decoded POSIX path.
 */
export declare function fileURLToPath(url: string | URL): string;
/**
 * `file:` URL of a filesystem path.
 * @param path - absolute or relative POSIX path.
 * @returns the URL.
 */
export declare function pathToFileURL(path: string): URL;
/**
 * Absolute URL from a specifier and its base.
 * @param specifier - relative or absolute specifier.
 * @param base - base URL.
 * @returns the resolved URL string.
 */
export declare function resolve(specifier: string, base: string): string;
/** WHATWG URL class, as `node:url` re-exports it. */
declare const UrlClass: {
    new (url: string | URL, base?: string | URL): URL;
    prototype: URL;
    canParse(url: string | URL, base?: string | URL): boolean;
    createObjectURL(obj: Blob | MediaSource): string;
    parse(url: string | URL, base?: string | URL): URL | null;
    revokeObjectURL(url: string): void;
};
/** WHATWG URLSearchParams class, as `node:url` re-exports it. */
declare const UrlSearchParamsClass: {
    new (init?: string[][] | Record<string, string> | string | URLSearchParams): URLSearchParams;
    prototype: URLSearchParams;
};
export { UrlClass as URL, UrlSearchParamsClass as URLSearchParams };
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ./builtins.ts). */
export declare const __esModule = true;
/** CommonJS default export: the members `require()` hands a caller of this module. */
declare const _default: {
    fileURLToPath: typeof fileURLToPath;
    pathToFileURL: typeof pathToFileURL;
    resolve: typeof resolve;
    URL: {
        new (url: string | URL, base?: string | URL): URL;
        prototype: URL;
        canParse(url: string | URL, base?: string | URL): boolean;
        createObjectURL(obj: Blob | MediaSource): string;
        parse(url: string | URL, base?: string | URL): URL | null;
        revokeObjectURL(url: string): void;
    };
    URLSearchParams: {
        new (init?: string[][] | Record<string, string> | string | URLSearchParams): URLSearchParams;
        prototype: URLSearchParams;
    };
};
export default _default;
//# sourceMappingURL=url.d.ts.map