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
import { WorkerModuleLoader, type StaticModuleFactory } from './module-system/module-loader.ts';
import type { AlsCausality } from './polyfill/async-context/als-runtime.ts';
import type { RequestListener } from './transport/synthetic-http.ts';
import { type TunnelPort } from './transport/tunnel.ts';
import { MemoryVfs } from './storage/memory.ts';
export { DEFAULT_ROOT } from './image-layout.ts';
/** Port reported to the tree when the caller names none; the bind is fake either way. */
export declare const DEFAULT_PORT = 3080;
/** One structured log record, as cordis delivers it to an exporter. */
export interface LogMessage {
    readonly name: string;
    readonly type: 'error' | 'info' | 'warn' | 'debug';
    readonly args: readonly unknown[];
}
/** The exporter face `ctx.logger.exporter()` accepts. */
export interface LogExporter {
    readonly colors: false;
    /** Verbosity gate, per logger name or `default`; cordis drops a message when its level exceeds this. */
    readonly levels: {
        readonly default: number;
    };
    export(message: LogMessage): void;
}
/** Minimal view of the Cordis context the entry itself touches. */
export interface HostContext {
    loader: {
        internal: unknown;
    };
    logger: {
        exporter(exporter: LogExporter): unknown;
    };
    get(service: string): unknown;
    provide(name: string, value: unknown): void;
    fiber: {
        dispose(): Promise<void>;
    };
}
/** Construction inputs for {@link createWorkerHost}. */
export interface WorkerHostOptions {
    /**
     * Modules served from the worker bundle rather than the image: the `node:*`
     * proxies, the not-implemented stubs for excluded npm packages, and anything else whose
     * platform behavior differs. `node:process` and `process` are added when absent,
     * as factories reading the installed global.
     */
    readonly staticModules: Readonly<Record<string, StaticModuleFactory>>;
    /** Prefix-matched proxies, for packages whose subpaths are open-ended. */
    readonly staticModulePrefixes?: Readonly<Record<string, StaticModuleFactory>>;
    /**
     * The webserver's request listener, captured by the app's fake `node:http`.
     * Awaited on first tunnel use, so it may resolve after the tree binds.
     */
    readonly requestListener: () => Promise<RequestListener>;
    /** Image bytes, or the URL the worker fetches them from. */
    readonly image: Uint8Array | string;
    /** Ordered data overlays applied after the base image and before boot. */
    readonly overlays?: readonly (Uint8Array | string)[];
    /** Virtual root; defaults to {@link DEFAULT_ROOT}. */
    readonly root?: string;
    /** Composed configuration inside the image; defaults to `<root>/config/cordis.yml`. */
    readonly configPath?: string;
    /**
     * Inner arguments the tree parses. The default binds the web server to the
     * loopback authority the tunnel synthesizes, which also keeps
     * `networkInterfaces()` out of the trust snapshot.
     */
    readonly cmdlineArgs?: readonly string[];
    /** Port named on the default command line; defaults to {@link DEFAULT_PORT}. */
    readonly port?: number;
    /** Environment for the process shim; `DSH_HOME` defaults to `<root>/home`. */
    readonly env?: Readonly<Record<string, string>>;
    /**
     * Image manifest path; defaults to `<root>/config/vfs-manifest.json`. Its
     * `lowered` field must name this build's wrapper contract.
     */
    readonly manifestPath?: string;
    /**
     * Ambient-store snapshot face exported by the app's `node:async_hooks` proxy.
     * The rewrite that carries stores across suspension points moves state through
     * it; the proxy remains the only owner of that state.
     */
    readonly alsCausality?: AlsCausality;
    /** Privileged API methods that skip the route lane; see {@link TunnelServer}. */
    readonly privilegedMethods?: ReadonlySet<string>;
    /** Escape hatch for the unary `/api` lane; see {@link TunnelServer}. */
    readonly unaryApiLane?: 'route' | 'direct';
    /** Channel back to the page; defaults to the worker global scope. */
    readonly channel?: TunnelPort;
}
/** The assembled worker host. */
export interface WorkerHost {
    /** Feed one `postMessage` payload; safe before {@link WorkerHost.start}. */
    handleMessage(data: unknown): void;
    /**
     * Mount the image and boot the tree, then start serving queued requests.
     * @returns Resolves once the tree is active and the tunnel is serving.
     */
    start(): Promise<void>;
    /** Dispose the tree; the tunnel keeps refusing afterwards. */
    stop(): Promise<void>;
    /** Filesystem the tree reads, once {@link WorkerHost.start} mounted it. */
    readonly vfs: MemoryVfs | undefined;
    /** Module loader behind the Cordis module seam. */
    readonly modules: WorkerModuleLoader | undefined;
}
/**
 * Build the worker host without touching the network or the image.
 * @param options - Assembly inputs.
 * @returns Handle whose `handleMessage` is ready immediately.
 */
export declare function createWorkerHost(options: WorkerHostOptions): WorkerHost;
/** The cordis message renderer this sink formats through. */
export interface LogRenderer {
    format(exporter: LogExporter, message: LogMessage): string;
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
export declare function installLogSink(ctx: HostContext, require: (specifier: string) => unknown): void;
/**
 * Install the message handler and boot the tree.
 *
 * The handler is attached before the first await, so requests that arrive
 * during boot queue instead of being dropped. A boot failure refuses the queue
 * with 503 and rejects.
 * @param options - Assembly inputs; `channel` also replaces the message source.
 * @returns Resolves once the tunnel is serving.
 */
export declare function startWorkerHost(options: WorkerHostOptions): Promise<void>;
//# sourceMappingURL=worker-host.d.ts.map