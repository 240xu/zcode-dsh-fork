/** Parsed path object returned by {@link parse}. */
export interface ParsedPath {
    root: string;
    dir: string;
    base: string;
    ext: string;
    name: string;
}
/**
 * Resolve a sequence of paths into an absolute path.
 * @param paths - path segments, right to left until an absolute one is found.
 * @returns the absolute, normalized path.
 */
export declare function resolve(...paths: string[]): string;
/**
 * Normalize a path, resolving `.`, `..`, and duplicate separators.
 * @param path - the path.
 * @returns the normalized path.
 */
export declare function normalize(path: string): string;
/**
 * Whether the path is absolute.
 * @param path - the path.
 * @returns true when it starts at the root.
 */
export declare function isAbsolute(path: string): boolean;
/**
 * Join path segments with the separator, then normalize.
 * @param paths - the segments.
 * @returns the joined path.
 */
export declare function join(...paths: string[]): string;
/**
 * Relative path from one location to another.
 * @param from - source path.
 * @param to - target path.
 * @returns the relative path, or '' when both resolve identically.
 */
export declare function relative(from: string, to: string): string;
/**
 * Directory portion of a path (lexical, as Node defines it: no normalization).
 * @param path - the path.
 * @returns the parent directory.
 */
export declare function dirname(path: string): string;
/**
 * Last portion of a path, optionally without a suffix (lexical, as in Node).
 * @param path - the path.
 * @param suffix - extension to strip when the base ends with it.
 * @returns the base name.
 */
export declare function basename(path: string, suffix?: string): string;
/**
 * Extension of the last path segment, including the leading dot.
 * @param path - the path.
 * @returns the extension, or '' when there is none.
 */
export declare function extname(path: string): string;
/**
 * Build a path from its parsed parts.
 * @param pathObject - dir/root/base/name/ext parts.
 * @returns the assembled path.
 */
export declare function format(pathObject: Partial<ParsedPath>): string;
/**
 * Split a path into root/dir/base/ext/name (lexical, as in Node).
 * @param path - the path.
 * @returns the parsed parts.
 */
export declare function parse(path: string): ParsedPath;
/** POSIX path separator. */
export declare const sep: "/";
/** POSIX path-list delimiter. */
export declare const delimiter: ":";
/**
 * Windows namespace prefixes do not exist here.
 * @param path - the path.
 * @returns the path unchanged.
 */
export declare function toNamespacedPath(path: string): string;
declare const posixFace: {
    resolve: typeof resolve;
    normalize: typeof normalize;
    isAbsolute: typeof isAbsolute;
    join: typeof join;
    relative: typeof relative;
    dirname: typeof dirname;
    basename: typeof basename;
    extname: typeof extname;
    format: typeof format;
    parse: typeof parse;
    sep: "/";
    delimiter: ":";
    toNamespacedPath: typeof toNamespacedPath;
};
/** POSIX member set: the module face, plus Node's self-referential namespaces. */
export declare const posix: typeof posixFace & {
    readonly posix: unknown;
    readonly win32: unknown;
};
/** Windows member set: reaching it means a platform branch went the wrong way. */
export declare const win32: {
    resolve: () => never;
    normalize: () => never;
    isAbsolute: () => never;
    join: () => never;
    relative: () => never;
    dirname: () => never;
    basename: () => never;
    extname: () => never;
    format: () => never;
    parse: () => never;
    toNamespacedPath: () => never;
    sep: string;
    delimiter: string;
};
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ./builtins.ts). */
export declare const __esModule = true;
declare const _default: {
    resolve: typeof resolve;
    normalize: typeof normalize;
    isAbsolute: typeof isAbsolute;
    join: typeof join;
    relative: typeof relative;
    dirname: typeof dirname;
    basename: typeof basename;
    extname: typeof extname;
    format: typeof format;
    parse: typeof parse;
    sep: "/";
    delimiter: ":";
    toNamespacedPath: typeof toNamespacedPath;
} & {
    readonly posix: unknown;
    readonly win32: unknown;
};
export default _default;
//# sourceMappingURL=path.d.ts.map