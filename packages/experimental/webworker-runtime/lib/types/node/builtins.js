/**
 * The Node-compatibility table, in one place. Two consumers share it, and they
 * must resolve to the same module instances:
 *   - the worker vite build aliases these specifiers for code bundled statically
 *     into the worker (vendored loader, Connection, …);
 *   - the worker module loader answers `require('node:fs')` from VFS-loaded
 *     modules out of this table, before bare-name resolution.
 * Anything absent here fails loudly at resolution instead of resolving to an
 * empty module. `process` is deliberately absent: the worker host installs that
 * global itself and fills it into this table at assembly time.
 *
 * Import paths carry the classification: `./implemented/<module>.ts` backs the
 * module's real semantics over a worker data source, while `./mock/<module>.ts`
 * is a structural placeholder whose calls report the missing capability. File
 * names match their Node module specifiers exactly, nesting included.
 *
 * Every value is a {@link StaticModuleFactory}, so the loader reads a table
 * entry only when a `require` names that specifier. What a factory defers is the
 * table read, not module evaluation: each one answers a namespace object of the
 * static ESM graph below, which the worker bundle evaluates at load like any
 * other import. Deferring a shim's own start-up cost therefore belongs inside
 * that shim, on the path that first needs it.
 */
import * as nodeAsyncHooks from "./builtin_modules/implemented/async_hooks.js";
import * as nodeBuffer from "./builtin_modules/implemented/buffer.js";
import * as nodeCrypto from "./builtin_modules/implemented/crypto.js";
import * as nodeDnsPromises from "./builtin_modules/mock/dns/promises.js";
import * as nodeEvents from "./builtin_modules/implemented/events.js";
import * as nodeFs from "./builtin_modules/implemented/fs.js";
import * as nodeFsPromises from "./builtin_modules/implemented/fs/promises.js";
import * as nodeHttp from "./builtin_modules/implemented/http.js";
import * as nodeModule from "./builtin_modules/implemented/module.js";
import * as nodeOs from "./builtin_modules/implemented/os.js";
import * as nodePath from "./builtin_modules/implemented/path.js";
import * as nodePerfHooks from "./builtin_modules/implemented/perf_hooks.js";
import * as nodeStream from "./builtin_modules/implemented/stream.js";
import * as nodeTimersPromises from "./builtin_modules/implemented/timers/promises.js";
import * as nodeTty from "./builtin_modules/implemented/tty.js";
import * as nodeUrl from "./builtin_modules/implemented/url.js";
import * as nodeUtil from "./builtin_modules/implemented/util.js";
import * as nodeUtilTypes from "./builtin_modules/implemented/util/types.js";
import * as nodeZlib from "./builtin_modules/implemented/zlib.js";
import * as nodeChildProcess from "./builtin_modules/implemented/child_process.js";
import * as nodeNet from "./builtin_modules/mock/net.js";
import * as nodeSqlite from "./builtin_modules/mock/sqlite.js";
import * as nodeVm from "./builtin_modules/mock/vm.js";
import * as nodeWorkerThreads from "./builtin_modules/mock/worker_threads.js";
import * as koffi from "./external_packages/koffi.js";
import * as nodePty from "./external_packages/node-pty.js";
import * as piAi from "./external_packages/pi-ai.js";
import * as ripgrep from "./external_packages/ripgrep.js";
import * as sharp from "./external_packages/sharp.js";
import * as ws from "./external_packages/ws.js";
import { REPLACED_EXTERNAL_PACKAGES } from "./external_packages/replaced-externals.js";
/** Builtin modules, keyed with and without the `node:` prefix. */
const BUILTINS = {
    async_hooks: () => nodeAsyncHooks,
    buffer: () => nodeBuffer,
    child_process: () => nodeChildProcess,
    crypto: () => nodeCrypto,
    'dns/promises': () => nodeDnsPromises,
    events: () => nodeEvents,
    fs: () => nodeFs,
    'fs/promises': () => nodeFsPromises,
    http: () => nodeHttp,
    module: () => nodeModule,
    net: () => nodeNet,
    os: () => nodeOs,
    path: () => nodePath,
    'path/posix': () => nodePath,
    perf_hooks: () => nodePerfHooks,
    sqlite: () => nodeSqlite,
    stream: () => nodeStream,
    'timers/promises': () => nodeTimersPromises,
    tty: () => nodeTty,
    url: () => nodeUrl,
    util: () => nodeUtil,
    'util/types': () => nodeUtilTypes,
    vm: () => nodeVm,
    worker_threads: () => nodeWorkerThreads,
    zlib: () => nodeZlib,
};
/** External npm packages replaced wholesale (structural not-implemented stubs and fakes). */
const EXTERNALS = {
    'koffi': () => koffi,
    'sharp': () => sharp,
    'node-pty': () => nodePty,
    'ws': () => ws,
    '@vscode/ripgrep': () => ripgrep,
    '@earendil-works/pi-ai': () => piAi,
};
/**
 * Prefixes whose every subpath resolves to one replacement module. The loader
 * matches the longest prefix after its exact table misses, so pi-ai's
 * `/providers/*` and `/api/*.lazy` entries need no enumeration.
 */
export const REPLACED_PREFIXES = {
    '@earendil-works/pi-ai/': () => piAi,
};
// One list, two consumers: a package replaced here must also be kept out of the
// VFS image, so any divergence fails at worker start rather than at first require.
const declared = [...REPLACED_EXTERNAL_PACKAGES].sort().join(',');
const wired = Object.keys(EXTERNALS).sort().join(',');
if (declared !== wired) {
    throw new Error(`web-preview: replaced-external lists diverge — declared [${declared}] vs wired [${wired}]`);
}
/**
 * Build the specifier → factory table the worker module loader consults first.
 * @returns every replaced specifier, including its `node:`-prefixed alias.
 */
export function createNodeBuiltins() {
    const table = { ...EXTERNALS };
    for (const [name, factory] of Object.entries(BUILTINS)) {
        table[name] = factory;
        table[`node:${name}`] = factory;
    }
    return table;
}
//# sourceMappingURL=builtins.js.map