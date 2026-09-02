/**
 * CommonJS module loader over the worker VFS. It fills the `loader.internal`
 * seam Cordis uses for every entry import, and backs the `node:module`
 * `createRequire` proxy that `typert-loader`, `client-modules`, and the plugin
 * package inventory resolve package metadata through.
 *
 * Resolution is a narrowed Node `require` algorithm: `exports` walk with a
 * fixed condition order, extension probing, and one cache keyed by resolved
 * absolute path. Module bodies are wrapped as the image holds them: lowering is
 * the packer's job, so nothing here parses JavaScript.
 * @module @deepseek-ai/dsh-experimental-webworker-runtime/src/module-system/module-loader
 */
import { type AlsCausality } from '../polyfill/async-context/als-runtime.ts';
import type { MemoryVfs } from '../storage/memory.ts';
/** Condition keys honoured in `exports`, in order; `node` is deliberately absent. */
export declare const DEFAULT_CONDITIONS: readonly ["browser", "require", "import", "default"];
/**
 * One entry of the static-module table. The loader calls it when a `require`
 * names that specifier and never before, so resolution alone — `require.resolve`
 * or `import.meta.resolve` — evaluates nothing. Repeated requires of one
 * specifier must answer the same module instance: callers depend on class
 * identity across requires (`instanceof EventEmitter`, `Buffer.isBuffer`), so a
 * factory that builds its value has to memoize it.
 * @returns The module object served for that specifier.
 */
export type StaticModuleFactory = () => unknown;
/** Where a specifier resolved to. */
export type Resolution = {
    readonly kind: 'static';
    readonly specifier: string;
    readonly factory: StaticModuleFactory;
} | {
    readonly kind: 'file';
    readonly path: string;
};
/** Node-loader-compatible resolution returned through the Cordis internal seam. */
export interface WorkerInternalResolution {
    readonly format: 'builtin' | 'commonjs' | 'json';
    /** File URL for VFS modules; the original bare specifier for builtins. */
    readonly url: string;
}
/** Resolution helpers carried by a Worker-backed CommonJS require. */
export interface WorkerRequireResolve {
    /**
     * Resolve one specifier without evaluating its module.
     * @param specifier - Module request relative to the require base.
     * @returns Static or VFS-backed module identity.
     */
    (specifier: string): string;
    /**
     * Return the directories this loader's Node-style package discovery searches.
     * @param specifier - Module request whose lookup roots are requested.
     * @returns Search roots, or null for a Worker-provided module.
     */
    paths(specifier: string): string[] | null;
}
/** The `require` function shape the roster consumes through `createRequire`. */
export interface WorkerRequire {
    (specifier: string): unknown;
    readonly resolve: WorkerRequireResolve;
}
/** Construction inputs for {@link WorkerModuleLoader}. */
export interface WorkerModuleLoaderOptions {
    /** Filesystem holding package metadata and module sources. */
    readonly vfs: MemoryVfs;
    /** Virtual root whose `node_modules` bare specifiers resolve against. */
    readonly root?: string;
    /**
     * Modules served from the worker bundle instead of the VFS: `node:*` proxies
     * and the loud stubs for excluded npm packages, each behind a
     * {@link StaticModuleFactory}.
     */
    readonly staticModules: Readonly<Record<string, StaticModuleFactory>>;
    /**
     * Prefix-matched proxies for packages whose subpaths are open-ended: a
     * specifier starting with the key resolves to its module. Exact keys win, and
     * the longest matching prefix wins among prefixes.
     */
    readonly staticModulePrefixes?: Readonly<Record<string, StaticModuleFactory>>;
    /** Overrides {@link DEFAULT_CONDITIONS}. */
    readonly conditions?: readonly string[];
    /**
     * Ambient-store snapshot face for the suspended `rewrite-await` route; it is
     * read only when that route is the configured {@link lowering}.
     */
    readonly alsCausality?: AlsCausality;
}
/** Loader for one VFS mount; construct once per worker. */
export declare class WorkerModuleLoader {
    private readonly vfs;
    private readonly root;
    private readonly staticModules;
    private readonly staticPrefixes;
    private readonly conditions;
    private readonly als;
    private readonly modules;
    private readonly manifests;
    private readonly stack;
    /**
     * The Cordis module seam. `parentURL` positions relative specifiers;
     * import attributes are ignored, as the client implementation does.
     */
    readonly internal: {
        readonly version: 'worker';
        import(specifier: string, parentURL?: string, attributes?: unknown): Promise<unknown>;
        resolve(specifier: string, parentURL?: string, attributes?: unknown): Promise<WorkerInternalResolution>;
        resolveSync(specifier: string, parentURL?: string, attributes?: unknown): WorkerInternalResolution;
    };
    constructor(options: WorkerModuleLoaderOptions);
    private fail;
    /** @returns Directory a base path or URL resolves specifiers from. */
    private baseDirectoryOf;
    private manifestOf;
    /** Walk one `exports` value against the condition set and requested subpath. */
    private selectExport;
    /** Pick the first condition branch this runtime satisfies. */
    private selectCondition;
    /** Extension and directory probing for a concrete path. */
    private probe;
    /** @returns The Worker-provided implementation of a static specifier. */
    private staticModule;
    /**
     * Resolve a specifier the way the module that requested it would.
     * @param specifier - Bare name, relative path, absolute path, or file URL.
     * @param fromDirectory - Directory of the requesting module.
     * @returns Static module or the resolved VFS path.
     */
    resolve(specifier: string, fromDirectory: string): Resolution;
    /**
     * Load a resolved module, reusing the cache and tolerating cycles with
     * CommonJS partial-export semantics.
     * @param resolution - Result of {@link resolve}.
     * @returns The module's exports.
     */
    load(resolution: Resolution): unknown;
    /**
     * Compile a body the image already lowered.
     *
     * Module syntax reaching here means the image was packed by something other
     * than the packer, or its collector missed the entry. The worker carries no
     * transform to recover with, so it names the image as the thing to rebuild.
     * @param code - Module body as the image holds it.
     * @param path - Resolved VFS path.
     * @returns The wrapper factory.
     */
    private compile;
    /**
     * Build a `require` bound to a directory.
     * @param fromDirectory - Directory relative specifiers resolve against.
     * @returns Callable require with `resolve`.
     */
    requireFrom(fromDirectory: string): WorkerRequire;
    /**
     * `node:module` `createRequire` for the VFS.
     * @param base - Module path, directory path, or `file:` URL.
     * @returns Require bound to that base.
     */
    createRequire(base: string | URL): WorkerRequire;
    /**
     * Report what this loader has done, for the host's boot diagnostics.
     * @returns How many module bodies it has run.
     */
    usage(): {
        modules: number;
    };
}
/**
 * Publish the loader the `node:module` proxy resolves through.
 * @param loader - Loader built by the worker entry.
 */
export declare function setActiveModuleLoader(loader: WorkerModuleLoader): void;
/**
 * Read the published loader.
 * @returns The active loader.
 */
export declare function requireActiveModuleLoader(): WorkerModuleLoader;
//# sourceMappingURL=module-loader.d.ts.map