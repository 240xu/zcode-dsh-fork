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
import { createAlsRuntime } from "../polyfill/async-context/als-runtime.js";
import { dirname, fileUrlToPath, isAbsolute, join, pathToFileUrl, resolve as resolvePath } from "./posix-path.js";
import { WRAPPER_PARAMS } from "../image-layout.js";
/** Condition keys honoured in `exports`, in order; `node` is deliberately absent. */
export const DEFAULT_CONDITIONS = ['browser', 'require', 'import', 'default'];
/** Extensions probed when a specifier has no usable one. */
const EXTENSIONS = ['.js', '.json', '.mjs', '.cjs'];
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/** Loader for one VFS mount; construct once per worker. */
export class WorkerModuleLoader {
    vfs;
    root;
    staticModules;
    staticPrefixes;
    conditions;
    als;
    modules = new Map();
    manifests = new Map();
    stack = [];
    /**
     * The Cordis module seam. `parentURL` positions relative specifiers;
     * import attributes are ignored, as the client implementation does.
     */
    internal;
    constructor(options) {
        this.vfs = options.vfs;
        this.root = options.root ?? '/dsh';
        // A Map, not the record itself: a specifier that names an Object prototype
        // member must miss the table the way any other unregistered name does.
        this.staticModules = new Map(Object.entries(options.staticModules));
        this.staticPrefixes = Object.entries(options.staticModulePrefixes ?? {})
            .sort(([left], [right]) => right.length - left.length);
        this.conditions = new Set(options.conditions ?? DEFAULT_CONDITIONS);
        this.als = createAlsRuntime(options.alsCausality);
        const resolveInternal = (specifier, parentURL) => {
            const from = parentURL === undefined ? this.root : this.baseDirectoryOf(parentURL);
            const resolution = this.resolve(specifier, from);
            if (resolution.kind === 'static')
                return { format: 'builtin', url: resolution.specifier };
            return {
                format: resolution.path.endsWith('.json') ? 'json' : 'commonjs',
                url: pathToFileUrl(resolution.path),
            };
        };
        this.internal = {
            version: 'worker',
            import: async (specifier, parentURL) => {
                const from = parentURL === undefined ? this.root : this.baseDirectoryOf(parentURL);
                return this.load(this.resolve(specifier, from));
            },
            resolve: async (specifier, parentURL) => resolveInternal(specifier, parentURL),
            resolveSync: resolveInternal,
        };
    }
    fail(detail) {
        const chain = this.stack.length === 0 ? '' : ` (importer chain: ${this.stack.join(' -> ')})`;
        throw new Error(`webworker modules: ${detail}${chain}`);
    }
    /** @returns Directory a base path or URL resolves specifiers from. */
    baseDirectoryOf(base) {
        const text = typeof base === 'string' ? base : base.href;
        const path = text.startsWith('file://') ? fileUrlToPath(text) : text;
        if (path.endsWith('/'))
            return resolvePath(path);
        return this.vfs.existsSync(path) && this.vfs.statSync(path).isDirectory() ? resolvePath(path) : dirname(path);
    }
    manifestOf(directory) {
        const cached = this.manifests.get(directory);
        if (cached !== undefined)
            return cached;
        const path = join(directory, 'package.json');
        const text = this.vfs.readFileSync(path, 'utf8');
        let parsed;
        try {
            parsed = JSON.parse(text);
        }
        catch (reason) {
            this.fail(`${path} is not valid JSON: ${reason.message}`);
        }
        if (!isRecord(parsed))
            this.fail(`${path} does not hold an object`);
        const manifest = parsed;
        this.manifests.set(directory, manifest);
        return manifest;
    }
    /** Walk one `exports` value against the condition set and requested subpath. */
    selectExport(field, subpath, packageName) {
        if (field === null)
            return undefined;
        if (typeof field === 'string')
            return subpath === '.' ? field : undefined;
        if (Array.isArray(field)) {
            for (const candidate of field) {
                const picked = this.selectExport(candidate, subpath, packageName);
                if (picked !== undefined)
                    return picked;
            }
            return undefined;
        }
        const entries = Object.entries(field);
        const isSubpathMap = entries.some(([key]) => key === '.' || key.startsWith('./'));
        if (!isSubpathMap) {
            if (subpath !== '.')
                return undefined;
            return this.selectCondition(field, packageName);
        }
        for (const [key, value] of entries) {
            if (key === subpath) {
                return typeof value === 'string' ? value : this.selectCondition(value, packageName, subpath);
            }
        }
        for (const [key, value] of entries) {
            const star = key.indexOf('*');
            if (star < 0)
                continue;
            const prefix = key.slice(0, star);
            const suffix = key.slice(star + 1);
            if (!subpath.startsWith(prefix) || !subpath.endsWith(suffix))
                continue;
            const captured = subpath.slice(prefix.length, subpath.length - suffix.length);
            const target = typeof value === 'string' ? value : this.selectCondition(value, packageName, subpath);
            if (target !== undefined)
                return target.replaceAll('*', captured);
        }
        return undefined;
    }
    /** Pick the first condition branch this runtime satisfies. */
    selectCondition(field, packageName, subpath = '.') {
        if (field === null)
            return undefined;
        if (typeof field === 'string')
            return field;
        if (Array.isArray(field)) {
            for (const candidate of field) {
                const picked = this.selectCondition(candidate, packageName, subpath);
                if (picked !== undefined)
                    return picked;
            }
            return undefined;
        }
        for (const [key, value] of Object.entries(field)) {
            if (!this.conditions.has(key))
                continue;
            const picked = this.selectCondition(value, packageName, subpath);
            if (picked !== undefined)
                return picked;
        }
        return undefined;
    }
    /** Extension and directory probing for a concrete path. */
    probe(path, specifier) {
        const candidates = [path, ...EXTENSIONS.map(extension => path + extension)];
        for (const candidate of candidates) {
            if (this.vfs.existsSync(candidate) && this.vfs.statSync(candidate).isFile())
                return candidate;
        }
        if (this.vfs.existsSync(path) && this.vfs.statSync(path).isDirectory()) {
            if (this.vfs.existsSync(join(path, 'package.json'))) {
                const main = this.manifestOf(path).main;
                if (main !== undefined)
                    return this.probe(join(path, main), specifier);
            }
            return this.probe(join(path, 'index'), specifier);
        }
        return this.fail(`cannot resolve "${specifier}": no file at ${candidates.join(', ')}`);
    }
    /** @returns The Worker-provided implementation of a static specifier. */
    staticModule(specifier) {
        const exact = this.staticModules.get(specifier);
        if (exact !== undefined)
            return exact;
        for (const [prefix, factory] of this.staticPrefixes) {
            if (specifier.startsWith(prefix))
                return factory;
        }
        return this.staticModules.get(`node:${specifier}`);
    }
    /**
     * Resolve a specifier the way the module that requested it would.
     * @param specifier - Bare name, relative path, absolute path, or file URL.
     * @param fromDirectory - Directory of the requesting module.
     * @returns Static module or the resolved VFS path.
     */
    resolve(specifier, fromDirectory) {
        const staticModule = this.staticModule(specifier);
        if (staticModule !== undefined)
            return { kind: 'static', specifier, factory: staticModule };
        if (specifier.startsWith('cordis:') || specifier.startsWith('node:')) {
            return this.fail(`no static module is registered for "${specifier}"`);
        }
        if (specifier.startsWith('file://')) {
            return { kind: 'file', path: this.probe(fileUrlToPath(specifier), specifier) };
        }
        if (specifier.startsWith('.')) {
            return { kind: 'file', path: this.probe(join(fromDirectory, specifier), specifier) };
        }
        if (isAbsolute(specifier)) {
            return { kind: 'file', path: this.probe(specifier, specifier) };
        }
        const segments = specifier.split('/');
        const packageName = specifier.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0] ?? specifier;
        const rest = specifier.slice(packageName.length).replace(/^\//, '');
        const packageDirectory = join(this.root, 'node_modules', packageName);
        if (!this.vfs.existsSync(join(packageDirectory, 'package.json'))) {
            return this.fail(`cannot resolve "${specifier}": ${packageDirectory}/package.json is not in the image`);
        }
        const manifest = this.manifestOf(packageDirectory);
        const subpath = rest === '' ? '.' : `./${rest}`;
        if (manifest.exports !== undefined) {
            const target = this.selectExport(manifest.exports, subpath, packageName);
            if (target === undefined) {
                return this.fail(`"${packageName}" does not export "${subpath}" under conditions [${[...this.conditions].join(', ')}]`);
            }
            return { kind: 'file', path: this.probe(join(packageDirectory, target), specifier) };
        }
        const legacy = subpath === '.' ? manifest.main ?? 'index.js' : rest;
        return { kind: 'file', path: this.probe(join(packageDirectory, legacy), specifier) };
    }
    /**
     * Load a resolved module, reusing the cache and tolerating cycles with
     * CommonJS partial-export semantics.
     * @param resolution - Result of {@link resolve}.
     * @returns The module's exports.
     */
    load(resolution) {
        if (resolution.kind === 'static')
            return resolution.factory();
        const path = resolution.path;
        const cached = this.modules.get(path);
        if (cached !== undefined)
            return cached.module.exports;
        if (path.endsWith('.json')) {
            const parsed = JSON.parse(this.vfs.readFileSync(path, 'utf8'));
            this.modules.set(path, { module: { exports: parsed } });
            return parsed;
        }
        const exports = {};
        const record = { module: { exports } };
        this.modules.set(path, record);
        this.stack.push(path);
        try {
            const source = this.vfs.readFileSync(path, 'utf8');
            const factory = this.compile(source, path);
            const directory = dirname(path);
            factory(record.module.exports, this.requireFrom(directory), record.module, path, directory, {
                url: pathToFileUrl(path),
                // Node parity for the lowered `import.meta` face: a path resolution
                // answers a file URL; a static (built-in or proxied) module answers
                // its own specifier, the way Node echoes `node:*` back.
                resolve: (specifier) => {
                    const resolution = this.resolve(specifier, directory);
                    return resolution.kind === 'static' ? resolution.specifier : pathToFileUrl(resolution.path);
                },
            }, this.als);
            return record.module.exports;
        }
        catch (reason) {
            this.modules.delete(path);
            throw reason;
        }
        finally {
            this.stack.pop();
        }
    }
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
    compile(code, path) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-implied-eval -- wrapping an image body is this loader's job
            return new Function(...WRAPPER_PARAMS, code);
        }
        catch (reason) {
            if (reason instanceof SyntaxError && /await/i.test(reason.message)) {
                this.fail(`${path} uses top-level await, which cannot run as CommonJS in the worker: ${reason.message}`);
            }
            if (reason instanceof SyntaxError && /import|export/i.test(reason.message)) {
                this.fail(`${path} still carries module syntax, so the image was not lowered by the packer `
                    + `(${reason.message}); rebuild the image`);
            }
            this.fail(`${path} failed to compile: ${reason.message}`);
        }
    }
    /**
     * Build a `require` bound to a directory.
     * @param fromDirectory - Directory relative specifiers resolve against.
     * @returns Callable require with `resolve`.
     */
    requireFrom(fromDirectory) {
        const require = (specifier) => this.load(this.resolve(specifier, fromDirectory));
        const resolve = ((specifier) => {
            const resolution = this.resolve(specifier, fromDirectory);
            if (resolution.kind === 'static') {
                return this.fail(`"${specifier}" is a worker-provided module and has no VFS path`);
            }
            return resolution.path;
        });
        resolve.paths = (specifier) => {
            if (this.staticModule(specifier) !== undefined || specifier.startsWith('node:'))
                return null;
            if (specifier.startsWith('.'))
                return [resolvePath(fromDirectory, '.')];
            return [join(this.root, 'node_modules')];
        };
        return Object.assign(require, { resolve });
    }
    /**
     * `node:module` `createRequire` for the VFS.
     * @param base - Module path, directory path, or `file:` URL.
     * @returns Require bound to that base.
     */
    createRequire(base) {
        return this.requireFrom(this.baseDirectoryOf(base));
    }
    /**
     * Report what this loader has done, for the host's boot diagnostics.
     * @returns How many module bodies it has run.
     */
    usage() {
        return { modules: this.modules.size };
    }
}
let active;
/**
 * Publish the loader the `node:module` proxy resolves through.
 * @param loader - Loader built by the worker entry.
 */
export function setActiveModuleLoader(loader) {
    active = loader;
}
/**
 * Read the published loader.
 * @returns The active loader.
 */
export function requireActiveModuleLoader() {
    if (active === undefined) {
        throw new Error('webworker modules: no loader is mounted; the worker entry must call setActiveModuleLoader before any createRequire use');
    }
    return active;
}
//# sourceMappingURL=module-loader.js.map