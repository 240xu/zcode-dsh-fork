import { createRequire } from 'node:module';
/** Helpers for locating the current Node internal module loader. */
export var ModuleLoader;
(function (ModuleLoader) {
    let _cachedLoader;
    function requireInternal(id) {
        const require = createRequire(import.meta.url);
        if (process.execArgv.includes('--expose-internals')) {
            try {
                return require(id);
            }
            catch { }
        }
        try {
            return require('node-addon-require-builtin').requireBuiltin(id);
        }
        catch { }
    }
    /**
     * Locate and classify the running Node internal module loader.
     *
     * The shape is decided by which module-job API the loader owns, never by the
     * Node version: v2 landed in 24.12.0, so a major-version test mistags every
     * 24.0–24.11.1 loader as v2 and makes consumers call `resolveSync` with
     * reversed parameters. Arity is not usable either — `resolveSync` reports 2
     * under both shapes. A loader owning neither API is left unclassified rather
     * than guessed, so consumers take their documented no-internals path.
     * @returns the classified loader, or `undefined` when none is reachable or its shape is unknown.
     */
    function fromInternal() {
        if (_cachedLoader)
            return _cachedLoader;
        const [major] = process.versions.node.split('.').map(Number);
        if (major < 22)
            return;
        const raw = requireInternal('internal/modules/esm/loader')?.getOrInitializeCascadedLoader();
        if (!raw)
            return;
        const version = typeof raw.getOrCreateModuleJob === 'function'
            ? 'v2'
            : typeof raw.getModuleJobForImport === 'function' ? 'v1' : undefined;
        if (!version)
            return;
        return _cachedLoader = Object.assign(raw, { version });
    }
    ModuleLoader.fromInternal = fromInternal;
})(ModuleLoader || (ModuleLoader = {}));
//# sourceMappingURL=internal.js.map