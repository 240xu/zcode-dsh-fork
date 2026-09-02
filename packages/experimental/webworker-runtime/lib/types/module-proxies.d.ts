/**
 * The worker bundle's module proxy table: the ONLY platform fork of the host
 * tree. Every entry replaces a Node builtin or an external npm package;
 * workspace and vendored modules are always mounted as they ship.
 *
 * The build turns these into bundler aliases, and `node/builtins.ts` turns the
 * same modules into the loader's static table — one list, two consumers.
 *
 * The replacement path states the classification. `./node/builtin_modules/implemented/<module>.ts`
 * carries the module's real semantics over a worker-side data source (VFS, the
 * tunnel, a wasm codec, a browser primitive); `./node/builtin_modules/mock/<module>.ts` is a
 * structural placeholder that mounts silently and reports the missing capability
 * when a call finally reaches it. External npm replacements live in
 * `./externals/`, named after the package they stand in for.
 * @module @deepseek-ai/dsh-experimental-webworker-runtime/src/module-proxies
 */
/**
 * Module proxy table — the ONLY platform fork of the worker host. Every entry
 * replaces a Node builtin or an external npm package; workspace and vendored
 * modules are always mounted as-is. Keys are exact module specifiers.
 */
export declare const MODULE_PROXIES: Record<string, string>;
/** pi-ai subpaths (`/providers/all`, `/api/*.lazy`) share the one structural stub. */
export declare const MODULE_PROXY_PREFIXES: Record<string, string>;
//# sourceMappingURL=module-proxies.d.ts.map