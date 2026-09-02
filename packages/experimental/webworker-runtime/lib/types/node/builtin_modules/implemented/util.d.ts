/**
 * `node:util` for the worker: the members harness code actually imports. Node's
 * inspect output is only used in diagnostics, so a JSON-shaped rendering is
 * enough; `promisify` follows Node's error-first callback convention exactly
 * because zlib-style APIs are wrapped with it at module scope.
 */
/**
 * Wrap an error-first callback function as a promise-returning one.
 * @param fn - callback-style function.
 * @returns the promise-returning wrapper.
 */
export declare function promisify<A extends unknown[], R>(fn: (...args: [...A, (error: unknown, value: R) => void]) => void): (...args: A) => Promise<R>;
/**
 * Wrap a promise-returning function as an error-first callback one.
 * @param fn - promise-returning function.
 * @returns the callback-style wrapper.
 */
export declare function callbackify<A extends unknown[], R>(fn: (...args: A) => Promise<R>): (...args: [...A, (error: unknown, value?: R) => void]) => void;
/**
 * Diagnostic rendering of a value.
 * @param value - the value.
 * @returns a readable one-line rendering.
 */
export declare function inspect(value: unknown): string;
/**
 * printf-style formatting for the `%s`/`%d`/`%j`/`%o` placeholders Node supports.
 * @param template - format string, or any value when used without placeholders.
 * @param args - substitution values.
 * @returns the formatted string.
 */
export declare function format(template: unknown, ...args: unknown[]): string;
/**
 * Structural deep equality, as `isDeepStrictEqual` defines it for plain data.
 * @param left - first value.
 * @param right - second value.
 * @returns true when both sides are structurally identical.
 */
export declare function isDeepStrictEqual(left: unknown, right: unknown): boolean;
/** Runtime type predicates (`node:util/types`), checked against the Node module of that name. */
export declare const types: {
    isPromise: (value: unknown) => value is Promise<unknown>;
    isDate: (value: unknown) => value is Date;
    isRegExp: (value: unknown) => value is RegExp;
    isTypedArray: (value: unknown) => value is NodeJS.TypedArray;
};
/**
 * CLI argument parsing has no caller inside the worker host.
 * @returns Never — it throws naming the unavailable member.
 */
export declare function parseArgs(): never;
/**
 * Deprecation wrappers pass the function through unchanged.
 * @param fn - the function a caller wanted wrapped.
 * @returns The same function, unwrapped.
 */
export declare function deprecate<F>(fn: F): F;
/** Text decoder class, as `node:util` re-exports it. */
declare const TextDecoderClass: {
    new (label?: string, options?: TextDecoderOptions): TextDecoder;
    prototype: TextDecoder;
};
/** Text encoder class, as `node:util` re-exports it. */
declare const TextEncoderClass: {
    new (): TextEncoder;
    prototype: TextEncoder;
};
export { TextDecoderClass as TextDecoder, TextEncoderClass as TextEncoder };
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ./builtins.ts). */
export declare const __esModule = true;
/** CommonJS default export: the members `require()` hands a caller of this module. */
declare const _default: {
    promisify: typeof promisify;
    callbackify: typeof callbackify;
    inspect: typeof inspect;
    format: typeof format;
    isDeepStrictEqual: typeof isDeepStrictEqual;
    types: {
        isPromise: (value: unknown) => value is Promise<unknown>;
        isDate: (value: unknown) => value is Date;
        isRegExp: (value: unknown) => value is RegExp;
        isTypedArray: (value: unknown) => value is NodeJS.TypedArray;
    };
    parseArgs: typeof parseArgs;
    deprecate: typeof deprecate;
    TextDecoder: {
        new (label?: string, options?: TextDecoderOptions): TextDecoder;
        prototype: TextDecoder;
    };
    TextEncoder: {
        new (): TextEncoder;
        prototype: TextEncoder;
    };
};
export default _default;
//# sourceMappingURL=util.d.ts.map