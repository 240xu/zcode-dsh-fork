/**
 * `node:tty` for the browser worker. The host has no terminal-backed file
 * descriptors, so terminal detection is always false.
 */
/**
 * Test whether a numeric file descriptor refers to a terminal.
 * @param _fd - File descriptor to inspect.
 * @returns Always false in the browser worker.
 */
export declare function isatty(_fd: number): boolean;
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ../../builtins.ts). */
export declare const __esModule = true;
/** CommonJS default export: the members `require()` hands a caller of this module. */
declare const _default: {
    isatty: typeof isatty;
};
export default _default;
//# sourceMappingURL=tty.d.ts.map