/**
 * Worker end of the postMessage tunnel. It owns the dispatch lanes and the queue
 * that holds requests until the host tree is serving:
 *
 * - `GET /__boot__` answers from tunnel glue, never from the host API surface,
 *   because the page needs the boot payload before its Cordis tree exists.
 * - Privileged `/api` methods take that same direct entry. The method set is not
 *   restated here: a 401 or 403 from the route lane is retried on the direct
 *   lane because the page owns the worker and needs no network authentication.
 * - Everything else is fed into the real webserver route table through the
 *   request listener the app's fake `node:http` captured, keeping the trust
 *   fences, byte limits, and status semantics intact.
 *
 * A boot failure rejects the whole queue with 503 rather than leaving the page
 * waiting.
 * @module @deepseek-ai/dsh-experimental-webworker-runtime/src/transport/tunnel
 */
import { type TunnelOutboundFrame } from './frames.ts';
import { type RequestListener } from './synthetic-http.ts';
/** Prefix owning the API methods. */
export declare const API_PREFIX = "/api";
/** Host header the synthesized requests carry; the API trust fence requires one. */
export declare const SYNTHETIC_HOST = "127.0.0.1";
/**
 * Render a failure with everything nested inside it.
 *
 * A boot failure is usually an `AggregateError` of per-entry failures, each
 * wrapping the plugin's own error as `cause`; only the outermost message names
 * "loader entries failed to apply", which says nothing about which row broke.
 *
 * The page logs the rendered text verbatim for refusals; keep it stable for
 * anyone matching boot-failure output.
 * @param reason - Thrown value.
 * @returns One line per nested failure, indented by depth.
 */
export declare function describeFailure(reason: unknown): string;
/** Message channel the tunnel posts frames on. */
export interface TunnelPort {
    postMessage(message: TunnelOutboundFrame, transfer?: Transferable[]): void;
}
/** What the tunnel gains once the host tree is up. */
export interface TunnelSeams {
    /**
     * Direct entry to the API fetch handler for privileged methods and any unary
     * call the route lane refused with 401 or 403.
     */
    readonly directFetch: (request: Request) => Promise<Response>;
    /** Boot payload for `GET /__boot__`: the structured index injection table. */
    readonly bootPayload: () => unknown;
    /** Open one decoded Gateway Remote stream without another network carrier. */
    readonly openStream: (endpoint: string, payload: unknown, signal: AbortSignal) => Promise<AsyncIterable<unknown>>;
    /** Convert a Gateway stream failure to stable Client fields. */
    readonly streamFailure: (error: unknown) => {
        readonly code: string;
        readonly message: string;
        readonly details: object;
    };
}
/** Construction inputs for {@link TunnelServer}. */
export interface TunnelServerOptions {
    /** Channel back to the page. */
    readonly port: TunnelPort;
    /**
     * The webserver's request listener, captured by the app's fake `node:http`.
     * Awaited on first use, so requests may arrive before the server binds.
     */
    readonly requestListener: () => Promise<RequestListener>;
    /**
     * Methods that skip the route lane outright. Supply the host's own privileged
     * set when it is reachable; omitting it leaves the 401/403 retry as the mechanism.
     */
    readonly privilegedMethods?: ReadonlySet<string>;
    /**
     * Escape hatch for the unary `/api` lane. `route` (default) keeps every fence
     * and byte limit with a 401/403 retry on the direct lane; `direct` sends every
     * unary `/api` call straight to the fetch handler.
     */
    readonly unaryApiLane?: 'route' | 'direct';
}
/** One tunnel per worker; wire {@link TunnelServer.handleMessage} to `onmessage` first. */
export declare class TunnelServer {
    private readonly port;
    private readonly requestListener;
    private readonly privilegedMethods;
    private readonly unaryApiLane;
    private readonly queue;
    private readonly inFlight;
    private seams;
    private failure;
    private listener;
    constructor(options: TunnelServerOptions);
    /**
     * Accept one `postMessage` payload.
     * @param data - Message data from the page.
     */
    handleMessage(data: unknown): void;
    /**
     * Start serving: drains everything queued during boot.
     * @param seams - Faces that exist only after the host tree is up.
     */
    serve(seams: TunnelSeams): void;
    /**
     * Refuse every queued and future request; the page renders this like a server
     * that failed to start.
     * @param reason - Boot failure to report.
     */
    fail(reason: unknown): void;
    private send;
    private refuse;
    private dispatchFrame;
    private serveStream;
    private sinkFor;
    /** The page sends an absolute URL; route handlers read `req.url` as a path. */
    private pathFrame;
    private serveRequest;
    /**
     * The listener is captured once and reused, so only requests that arrive
     * before the web server binds pay an await.
     * @returns The webserver request listener.
     */
    private whenListener;
    /** Feed the real route table through the captured listener. */
    private dispatch;
    /**
     * Unary `/api`: keep the route lane's fences, but fall back to the direct lane
     * when network authentication or trust rejects the worker-owning page.
     */
    private serveApi;
    private serveBoot;
    private serveDirect;
}
//# sourceMappingURL=tunnel.d.ts.map