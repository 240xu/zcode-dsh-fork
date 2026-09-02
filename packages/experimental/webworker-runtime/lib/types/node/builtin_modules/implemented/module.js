/**
 * `node:module` for the worker: `createRequire` hands out the worker module
 * loader's synchronous require. Typert can resolve package exports, and package
 * inventory can discover manifests through `require.resolve.paths()` without
 * either consumer changing for the Worker.
 */
import { requireActiveModuleLoader } from "../../../module-system/module-loader.js";
/**
 * Build a `require` bound to a base path or file URL.
 * @param base - directory, file path, or file URL the resolution starts from.
 * @returns the synchronous require face, including `resolve()` and `resolve.paths()`.
 */
export function createRequire(base) {
    return requireActiveModuleLoader().createRequire(base);
}
/** Builtin specifiers the module proxy table answers (without the `node:` prefix). */
export const builtinModules = [
    'assert', 'async_hooks', 'buffer', 'child_process', 'crypto', 'events', 'fs', 'http', 'module',
    'net', 'os', 'path', 'process', 'stream', 'tty', 'url', 'util', 'worker_threads',
];
/**
 * Whether a specifier names a Node builtin.
 * @param specifier - the module specifier.
 * @returns true for builtin names, with or without the `node:` prefix.
 */
export function isBuiltin(specifier) {
    return builtinModules.includes(specifier.replace(/^node:/, ''));
}
/**
 * TypeScript stripping is a Node 22+ loader feature with no worker counterpart.
 * @returns Never — it throws naming the unavailable member.
 */
export function stripTypeScriptTypes() {
    throw new Error('web-preview: node:module.stripTypeScriptTypes is not available in the worker host');
}
/**
 * Loader hooks have no meaning here: the worker loader owns resolution.
 * @returns Never — it throws naming the unavailable member.
 */
export function register() {
    throw new Error('web-preview: node:module.register is not available in the worker host');
}
/** ESM/CJS export syncing is a no-op: the worker loader materializes CommonJS only. */
export function syncBuiltinESMExports() {
    // Nothing to sync: every builtin is a plain module object from the proxy table.
}
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ./builtins.ts). */
export const __esModule = true;
/** CommonJS default export: the members `require()` hands a caller of this module. */
export default {
    createRequire, builtinModules, isBuiltin, register, syncBuiltinESMExports, stripTypeScriptTypes,
};
//# sourceMappingURL=module.js.map