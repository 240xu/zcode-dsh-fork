/**
 * `@vscode/ripgrep` stub. The package's only export is the binary path, read at
 * module scope by search plugins; the path stays a plain string so construction
 * succeeds, and the loud failure comes from the child_process stub when something
 * tries to run it.
 */
/** Path the search plugins would spawn; nothing can execute it in a browser. */
export declare const rgPath = "/dsh/bin/rg";
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ./builtins.ts). */
export declare const __esModule = true;
/** CommonJS default export: the members `require()` hands a caller of this module. */
declare const _default: {
    rgPath: string;
};
export default _default;
//# sourceMappingURL=ripgrep.d.ts.map