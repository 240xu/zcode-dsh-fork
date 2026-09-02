/**
 * POSIX path helpers for the worker VFS: one absolute root, no drive letters,
 * no symlinks.
 *
 * **Not a `node:path` substitute.** {@link dirname}, {@link basename}, and
 * {@link parse} normalize first, because every caller here hands the result to
 * the VFS, which keys files by normalized absolute path — `dirname('/a/b/..')`
 * answers `/`, the directory that actually holds the entry. Node's three are
 * purely lexical and answer `/a/b`. A `node:path` proxy owes callers Node's
 * literal answers, so it needs its own port of Node's implementation rather than
 * a facade over this module; measured over ~200 cases, the normalizing and
 * lexical forms diverge in 45, all in these three functions. The Node-facing
 * port is pinned separately by `../../tests/node/path-diff.spec.ts`.
 * @module @deepseek-ai/dsh-experimental-webworker-runtime/src/module-system/posix-path
 */
/** Path separator of the virtual filesystem. */
export declare const SEP = "/";
/**
 * Collapse `.` and `..` segments.
 * @param path - Path with any number of separators.
 * @returns Normalized path; a relative input keeps leading `..` segments.
 */
export declare function normalize(path: string): string;
/**
 * Join segments and normalize the result.
 * @param segments - Path segments.
 * @returns Joined path, `.` when nothing remains.
 */
export declare function join(...segments: string[]): string;
/**
 * Resolve segments right to left against a base directory.
 * @param segments - Path segments; the first absolute one wins.
 * @returns Absolute normalized path.
 */
export declare function resolve(...segments: string[]): string;
/**
 * Directory part of a path, after normalization (see the module note).
 * @param path - Path to inspect.
 * @returns Parent path; `/` for root children and `.` for bare names.
 */
export declare function dirname(path: string): string;
/**
 * Last segment of a path, after normalization (see the module note).
 * @param path - Path to inspect.
 * @param suffix - Optional suffix to strip.
 * @returns Final segment.
 */
export declare function basename(path: string, suffix?: string): string;
/**
 * Extension of the last segment, dot included.
 * @param path - Path to inspect.
 * @returns Extension, or an empty string when there is none.
 */
export declare function extname(path: string): string;
/**
 * Report whether a path starts at the root.
 * @param path - Path to inspect.
 * @returns True for absolute paths.
 */
export declare function isAbsolute(path: string): boolean;
/**
 * Relative path from one absolute path to another.
 * @param from - Source directory.
 * @param to - Target path.
 * @returns Relative path using `..` segments.
 */
export declare function relative(from: string, to: string): string;
/**
 * Split a path into components, after normalization (see the module note).
 * @param path - Path to split.
 * @returns Root, directory, base name, extension, and stem.
 */
export declare function parse(path: string): {
    root: string;
    dir: string;
    base: string;
    ext: string;
    name: string;
};
/**
 * Node's Windows-only namespaced-path conversion.
 * @param path - the path to convert.
 * @returns The path unchanged; namespaced paths are a Windows concept.
 */
export declare function toNamespacedPath(path: string): string;
/**
 * Convert a VFS path into a `file:` URL string.
 * @param path - Absolute VFS path.
 * @returns URL text with each segment percent-encoded.
 */
export declare function pathToFileUrl(path: string): string;
/**
 * Convert a `file:` URL back into a VFS path.
 * @param url - URL text or URL instance.
 * @returns Absolute VFS path.
 */
export declare function fileUrlToPath(url: string | URL): string;
//# sourceMappingURL=posix-path.d.ts.map