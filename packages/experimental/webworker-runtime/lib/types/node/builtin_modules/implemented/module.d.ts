/**
 * `node:module` for the worker: `createRequire` hands out the worker module
 * loader's synchronous require. Typert can resolve package exports, and package
 * inventory can discover manifests through `require.resolve.paths()` without
 * either consumer changing for the Worker.
 */
import { type WorkerRequire } from '../../../module-system/module-loader.ts';
/** Node `require` face the harness consumes. */
export type NodeRequire = WorkerRequire;
/**
 * Build a `require` bound to a base path or file URL.
 * @param base - directory, file path, or file URL the resolution starts from.
 * @returns the synchronous require face, including `resolve()` and `resolve.paths()`.
 */
export declare function createRequire(base: string | URL): NodeRequire;
/** Builtin specifiers the module proxy table answers (without the `node:` prefix). */
export declare const builtinModules: string[];
/**
 * Whether a specifier names a Node builtin.
 * @param specifier - the module specifier.
 * @returns true for builtin names, with or without the `node:` prefix.
 */
export declare function isBuiltin(specifier: string): boolean;
/**
 * TypeScript stripping is a Node 22+ loader feature with no worker counterpart.
 * @returns Never — it throws naming the unavailable member.
 */
export declare function stripTypeScriptTypes(): never;
/**
 * Loader hooks have no meaning here: the worker loader owns resolution.
 * @returns Never — it throws naming the unavailable member.
 */
export declare function register(): never;
/** ESM/CJS export syncing is a no-op: the worker loader materializes CommonJS only. */
export declare function syncBuiltinESMExports(): void;
/** Erased type peer for the vendored loader's type-only LoadHookContext import. */
export type LoadHookContext = never;
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ./builtins.ts). */
export declare const __esModule = true;
/** CommonJS default export: the members `require()` hands a caller of this module. */
declare const _default: {
    createRequire: typeof createRequire;
    builtinModules: string[];
    isBuiltin: typeof isBuiltin;
    register: typeof register;
    syncBuiltinESMExports: typeof syncBuiltinESMExports;
    stripTypeScriptTypes: typeof stripTypeScriptTypes;
};
export default _default;
//# sourceMappingURL=module.d.ts.map