/**
 * The `process` global the worker needs before any VFS module runs. Cordis
 * reads `process.env` and `process.versions.node` while the Loader is
 * constructed, and `cordis.yml` keeps its `!!js process.*` expressions, so the
 * configuration bytes stay identical to the Node deployment. Third-party Node
 * packages use the presence of `process.title` to avoid browser-only globals.
 * @module @deepseek-ai/dsh-experimental-webworker-runtime/src/node/globals/process
 */
import { requireActiveModuleLoader } from "../../module-system/module-loader.js";
import { processAlive, signalProcess } from "../process-table.js";
/**
 * Publish `globalThis.process`.
 *
 * `versions.node` is `0.0.0` on purpose: it makes Cordis's
 * `ModuleLoader.fromInternal()` return undefined instead of reaching for Node
 * internals, which is what lets the worker install its own module seam.
 * @param options - Root, environment, and argument vector.
 * @returns The published object, for the module proxy table.
 */
export function installProcessGlobal(options) {
    const start = performance.now();
    const write = (target) => (chunk) => {
        console[target](chunk.replace(/\n$/, ''));
        return true;
    };
    const shim = {
        env: { ...options.env },
        argv: [...(options.argv ?? ['node', 'dsh-webworker'])],
        execArgv: [],
        title: 'dsh-webworker',
        platform: 'linux',
        arch: 'x64',
        pid: 1,
        version: 'v0.0.0',
        versions: { node: '0.0.0' },
        cwd: () => options.cwd,
        getBuiltinModule: (id) => {
            let resolution;
            try {
                resolution = requireActiveModuleLoader().resolve(id, '/');
            }
            catch {
                // No loader mounted yet, or an id that resolves nowhere: Node answers
                // undefined for non-builtins instead of throwing.
                return undefined;
            }
            return resolution.kind === 'static' ? resolution.factory() : undefined;
        },
        kill: (pid, signal = 'SIGTERM') => {
            if (signal === 0) {
                if (processAlive(pid))
                    return true;
                const error = new Error('kill ESRCH');
                error.code = 'ESRCH';
                error.syscall = 'kill';
                throw error;
            }
            return signalProcess(pid, signal);
        },
        nextTick: (callback, ...args) => { queueMicrotask(() => { callback(...args); }); },
        stdout: { write: write('log') },
        stderr: { write: write('error') },
        on: () => shim,
        off: () => shim,
        once: () => shim,
        prependListener: () => shim,
        prependOnceListener: () => shim,
        removeListener: () => shim,
        removeAllListeners: () => shim,
        listeners: () => [],
        listenerCount: () => 0,
        setMaxListeners: () => shim,
        emit: () => false,
        hrtime: { bigint: () => BigInt(Math.round((performance.now() - start) * 1e6)) },
        uptime: () => (performance.now() - start) / 1000,
        exit: (code) => { console.warn(`webworker process: exit(${String(code ?? 0)}) requested; the worker keeps running`); },
    };
    globalThis.process = shim;
    return shim;
}
//# sourceMappingURL=process.js.map