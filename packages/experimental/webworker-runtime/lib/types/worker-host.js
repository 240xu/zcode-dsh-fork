/**
 * Worker assembly entry: the whole harness Cordis tree inside one dedicated
 * Web Worker.
 *
 * Every platform object arrives through options — the `node:*` proxy table, the
 * request listener the app's fake `node:http` captured, the image bytes — so this
 * package never reaches back into the application that composes it. **Platform
 * readiness before the call is the caller's responsibility**: anything the
 * proxies need initialized (the zstd WebAssembly module, for one) must be ready
 * before {@link startWorkerHost} runs.
 *
 * Construction is split in two on purpose. {@link createWorkerHost} is
 * synchronous so the worker can accept messages and queue requests that arrive
 * during boot; {@link WorkerHost.start} then mounts the image, the module
 * loader, and the tree. {@link startWorkerHost} performs both and installs the
 * message handler before its first await.
 *
 * The tree itself boots through the host's own `boot()` glue loaded from the
 * image, so entry mounting, the activation audit, and its diagnostics are the
 * same code the Node deployment runs. Only the module seam and the command line
 * are supplied from here.
 * @module @deepseek-ai/dsh-experimental-webworker-runtime/src/worker-host
 */
import { setActiveModuleLoader, WorkerModuleLoader } from "./module-system/module-loader.js";
import { dirname, join } from "./module-system/posix-path.js";
import { installProcessGlobal } from "./node/globals/process.js";
import { TunnelServer } from "./transport/tunnel.js";
import { inflateImage, inflateImageStream } from "./storage/image-gzip.js";
import { loadVfsImage, loadVfsOverlay } from "./storage/memory.js";
import { setActiveVfs } from "./storage/active.js";
import { DEFAULT_ROOT, IMAGE_CONFIG_PATH, IMAGE_EMPTY_DIRECTORIES, IMAGE_HOME_DIRECTORY, IMAGE_MANIFEST_PATH, LOWERING_VERSION, } from "./image-layout.js";
export { DEFAULT_ROOT } from "./image-layout.js";
/** Port reported to the tree when the caller names none; the bind is fake either way. */
export const DEFAULT_PORT = 3080;
function requireGlobalPort(channel) {
    if (channel !== undefined)
        return channel;
    const scope = globalThis;
    const post = scope.postMessage;
    if (typeof post !== 'function') {
        throw new Error('webworker host: no channel; pass options.channel outside a dedicated worker');
    }
    return { postMessage: (message, transfer) => { post(message, transfer); } };
}
async function readImage(image) {
    if (typeof image !== 'string')
        return await inflateImage(image, 'the image bytes given to createWorkerHost');
    const response = await fetch(image);
    if (!response.ok)
        throw new Error(`webworker host: image fetch failed with ${String(response.status)} for ${image}`);
    if (response.body === null)
        throw new Error(`webworker host: image response for ${image} carried no body`);
    // Inflated off the response stream: the archive is built while the rest of the
    // image is still arriving.
    return await inflateImageStream(response.body, image);
}
/**
 * Build the worker host without touching the network or the image.
 * @param options - Assembly inputs.
 * @returns Handle whose `handleMessage` is ready immediately.
 */
export function createWorkerHost(options) {
    const root = options.root ?? DEFAULT_ROOT;
    const configPath = options.configPath ?? join(root, IMAGE_CONFIG_PATH);
    const port = options.port ?? DEFAULT_PORT;
    const tunnel = new TunnelServer({
        port: requireGlobalPort(options.channel),
        requestListener: options.requestListener,
        ...options.privilegedMethods === undefined ? {} : { privilegedMethods: options.privilegedMethods },
        ...options.unaryApiLane === undefined ? {} : { unaryApiLane: options.unaryApiLane },
    });
    let vfs;
    let modules;
    let context;
    const start = async () => {
        try {
            const home = join(root, IMAGE_HOME_DIRECTORY);
            installProcessGlobal({ cwd: root, env: { DSH_HOME: home, HOME: home, ...options.env } });
            const [bytes, overlays] = await Promise.all([
                readImage(options.image),
                Promise.all((options.overlays ?? []).map(readImage)),
            ]);
            const mounted = loadVfsImage(bytes, root);
            for (const overlay of overlays)
                loadVfsOverlay(overlay, root, mounted);
            // Belt and braces over the image's own empty-directory entries: a hand
            // -built image without them still boots.
            for (const directory of IMAGE_EMPTY_DIRECTORIES) {
                mounted.seedDirectory(join(root, directory.replace(/\/$/, '')));
            }
            setActiveVfs(mounted);
            vfs = mounted;
            const manifestPath = options.manifestPath ?? join(root, IMAGE_MANIFEST_PATH);
            requireLoweredImage(mounted, manifestPath);
            const staticModules = { ...options.staticModules };
            // Read at require time, not here: the table entry then answers whichever
            // global `installProcessGlobal` left in place, in this role's order.
            for (const key of ['node:process', 'process']) {
                staticModules[key] ??= () => globalThis.process;
            }
            const loader = new WorkerModuleLoader({
                vfs: mounted,
                root,
                staticModules,
                ...options.staticModulePrefixes === undefined ? {} : { staticModulePrefixes: options.staticModulePrefixes },
                ...options.alsCausality === undefined ? {} : { alsCausality: options.alsCausality },
            });
            setActiveModuleLoader(loader);
            modules = loader;
            const require = loader.requireFrom(dirname(configPath));
            const appBoot = require('@deepseek-ai/dsh-app-boot');
            const cmdline = require('@deepseek-ai/dsh-cmdline');
            const { patches, presetOverlay } = bootPatches(loader, mounted, configPath, root);
            const ctx = await appBoot.boot('dsh-webworker', configPath, patches, (hostCtx) => {
                // Before any entry mounts: the Loader would otherwise fall back to the
                // runtime's own dynamic import for every row.
                hostCtx.loader.internal = loader.internal;
                installLogSink(hostCtx, require);
                cmdline.provideCmdline(hostCtx, {
                    args: [...(options.cmdlineArgs ?? ['--host', '127.0.0.1', '--port', String(port), '--no-open'])],
                    exit: (code) => { console.warn(`webworker host: tree requested exit(${String(code)})`); },
                });
            });
            context = ctx;
            const connection = ctx.get('connection');
            if (connection === undefined)
                throw new Error('webworker host: the tree activated without a Connection service');
            const typertGateway = ctx.get('typertGateway');
            if (typertGateway === undefined) {
                throw new Error('webworker host: the tree activated without a typertGateway service');
            }
            const handler = connection.createSharedFetchHandler('/api');
            const usage = loader.usage();
            console.info(`webworker host: tree active (modules=${String(usage.modules)}, data overlays=${String(overlays.length)}, preset root overlay=${presetOverlay ? 'applied' : 'already in roster'}, direct lane=connection.createSharedFetchHandler, als causality=${options.alsCausality === undefined ? 'inert' : 'snapshot/restore'}, image lowering=${LOWERING_VERSION})`);
            tunnel.serve({
                directFetch: (request) => handler.fetch(request),
                bootPayload: () => readBootPayload(ctx),
                openStream: typertGateway.wireStream.open,
                streamFailure: typertGateway.wireStream.failure,
            });
        }
        catch (reason) {
            tunnel.fail(reason);
            throw reason;
        }
    };
    return {
        handleMessage: (data) => { tunnel.handleMessage(data); },
        start,
        stop: async () => {
            tunnel.fail(new Error('webworker host: the tree was disposed'));
            await context?.fiber.dispose();
        },
        get vfs() {
            return vfs;
        },
        get modules() {
            return modules;
        },
    };
}
/**
 * Send the tree's own warnings and errors to the worker console.
 *
 * Cordis's `LoggerService` always exists and always accepts messages, but with
 * no exporter mounted it only fills a ring buffer — and no profile in this
 * repository mounts one, so `ctx.logger.warn(...)` reaches nothing. A provider
 * that fails and is skipped (the skill registry logs exactly that) then looks
 * identical to one that found nothing, which is how an empty skill catalog hid a
 * filesystem fault twice.
 *
 * Warnings and errors only: `info`/`debug` from 131 plugin rows would bury the
 * page console, and this exists to make failures visible rather than to trace.
 * @param ctx - Host context, before any entry mounts.
 * @param require - Image resolver, for cordis's own message renderer.
 */
export function installLogSink(ctx, require) {
    const { Logger } = require('@deepseek-ai/cordis');
    const exporter = {
        colors: false,
        // cordis compares `exporter.levels ?? logger.level ?? INFO` against the
        // message level and drops anything higher, and its scale counts UP with
        // verbosity (ERROR 0, INFO 1, WARN 2, DEBUG 3). An exporter that declares no
        // level therefore admits errors and info but silently drops every warning —
        // which is what the built-in ring-buffer exporter does, so the skipped-provider
        // warning this sink exists for never even reached the buffer.
        levels: { default: 2 },
        export: (message) => {
            if (message.type !== 'warn' && message.type !== 'error')
                return;
            const line = `${message.name}: ${Logger.format(exporter, message)}`;
            if (message.type === 'error')
                console.error(line);
            else
                console.warn(line);
        },
    };
    ctx.logger.exporter(exporter);
}
/**
 * Require the mounted image to carry bodies this build can wrap.
 *
 * The manifest the packer writes is the single source of truth: the worker holds
 * no transform, so an image that was never lowered — or was lowered against
 * different wrapper semantics — cannot be recovered at load and must be rebuilt.
 * @param vfs - Mounted filesystem.
 * @param path - Manifest path inside the image.
 * @throws When the manifest is missing, unreadable, or names another contract.
 */
function requireLoweredImage(vfs, path) {
    if (!vfs.existsSync(path)) {
        throw new Error(`webworker host: ${path} is missing, so the image records no lowering; rebuild the image`);
    }
    const parsed = JSON.parse(vfs.readFileSync(path, 'utf8'));
    if (typeof parsed !== 'object' || parsed === null) {
        throw new Error(`webworker host: ${path} does not hold an object`);
    }
    const lowered = parsed.lowered;
    if (lowered !== LOWERING_VERSION) {
        throw new Error(`webworker host: image was lowered by ${String(lowered)}, this build runs ${LOWERING_VERSION}; rebuild the image`);
    }
}
/**
 * The shipped preset root, as the application layer that owns the composition
 * supplies it.
 *
 * A launcher appends this root itself rather than writing it into the roster —
 * `apps/cli` does it in `composeProfile` (`profile-boot.ts:159-166`) because only
 * the application knows where its own presets sit. The worker's presets travel
 * in the image, so the same overlay names their virtual path. Patching replaces
 * a row's whole `config`, so the current one is read and spread, and a roster
 * that already names roots keeps them.
 * @param loader - Module loader, for the image's YAML reader.
 * @param vfs - Filesystem holding the composed configuration.
 * @param configPath - Composed configuration path.
 * @param root - Virtual root.
 * @returns Boot patches (preset root overlay, frontend serving off) and
 * whether the preset overlay was applied.
 */
function bootPatches(loader, vfs, configPath, root) {
    const text = vfs.readFileSync(configPath, 'utf8');
    let rows;
    if (configPath.endsWith('.json')) {
        rows = JSON.parse(text);
    }
    else {
        // The roster's `!!js` scalars need Include's own YAML dialect.
        const include = loader.load(loader.resolve('@deepseek-ai/cordis-plugin-include', root));
        const yaml = loader.load(loader.resolve('js-yaml', root));
        rows = yaml.load(text, { schema: include.entryListSchema });
    }
    const find = (entries, id) => {
        if (!Array.isArray(entries))
            return undefined;
        for (const entry of entries) {
            if (entry.id === id)
                return entry;
            const nested = find(entry.config, id);
            if (nested !== undefined)
                return nested;
        }
        return undefined;
    };
    const configOf = (row) => (typeof row.config === 'object' && row.config !== null && !Array.isArray(row.config)
        ? row.config
        : {});
    const patches = [];
    let presetOverlay = false;
    const presets = find(rows, 'agent-presets');
    if (presets !== undefined && configOf(presets).roots === undefined) {
        presetOverlay = true;
        patches.push({
            id: 'agent-presets',
            config: { ...configOf(presets), roots: [{ path: join(root, 'config/agent-presets'), trust: 'system' }] },
        });
    }
    // The worker carries no compression codec, and the VFS is in-memory anyway:
    // the JSONL backend's plaintext path is the composition's one legal encoding.
    const jsonl = find(rows, 'session-persistence-jsonl');
    if (jsonl !== undefined) {
        patches.push({ id: 'session-persistence-jsonl', config: { ...configOf(jsonl), compression: 'none' } });
    }
    return { patches, presetOverlay };
}
/**
 * Assemble the payload the page's pre-Cordis bootstrap needs: the structured
 * index injection table the served form renders into index.html. Collected
 * from the in-process webserver service, never from the API surface, because
 * the page has no Cordis tree yet.
 * @param ctx - Booted host context.
 * @returns Boot payload for `GET /__boot__`.
 */
function readBootPayload(ctx) {
    const webServer = ctx.get('webServer');
    if (webServer === undefined) {
        throw new Error('webworker host: no webServer service, so the page cannot receive its boot injections');
    }
    return { injections: webServer.collectIndexInjections() };
}
/**
 * Install the message handler and boot the tree.
 *
 * The handler is attached before the first await, so requests that arrive
 * during boot queue instead of being dropped. A boot failure refuses the queue
 * with 503 and rejects.
 * @param options - Assembly inputs; `channel` also replaces the message source.
 * @returns Resolves once the tunnel is serving.
 */
export async function startWorkerHost(options) {
    const host = createWorkerHost(options);
    if (options.channel === undefined) {
        const scope = globalThis;
        if (typeof scope.addEventListener !== 'function') {
            throw new Error('webworker host: no message source; pass options.channel outside a dedicated worker');
        }
        scope.addEventListener('message', (event) => { host.handleMessage(event.data); });
    }
    await host.start();
}
//# sourceMappingURL=worker-host.js.map