/**
 * `node:http` for the worker: `createServer` returns a Server whose `listen`
 * succeeds immediately without a socket, and retains the captured request
 * listener so the tunnel server can feed synthesized requests into the real
 * route table. The fake Server exposes only the members those routes read.
 * The worker entry hands {@link whenRequestListener} to the host assembly, so the
 * package never reaches back into this app.
 */
import type { RequestListener } from '../../../transport/synthetic-http.ts';
type Listener = (...args: unknown[]) => void;
export type { RequestListener };
/**
 * The webserver's request listener, once `[Service.init]` has installed it.
 * @returns the listener, or undefined before the webserver row activates.
 */
export declare function requestListener(): RequestListener | undefined;
/**
 * Await the request listener.
 * @returns a promise resolved with the listener as soon as it is captured.
 */
export declare function whenRequestListener(): Promise<RequestListener>;
/** Fake Server: event registrations are stored and never emitted. */
declare class FakeServer {
    private readonly listeners;
    /**
     * Register an event listener (`upgrade`, `error`); never emitted.
     * @param event - event name.
     * @param listener - the listener.
     * @returns this server.
     */
    on(event: string, listener: Listener): this;
    /**
     * One-shot registration counterpart of {@link on}.
     * @param event - event name.
     * @param listener - the listener.
     * @returns this server.
     */
    once(event: string, listener: Listener): this;
    /**
     * Remove a listener.
     * @param event - event name.
     * @param listener - the listener.
     * @returns this server.
     */
    off(event: string, listener: Listener): this;
    /**
     * Bind: succeeds immediately. The callback must run or the webserver fiber
     * stays in LOADING forever.
     * @param args - Node's listen arguments; only a trailing callback matters.
     * @returns this server.
     */
    listen(...args: unknown[]): this;
    /**
     * Bound address.
     * @returns the loopback authority the tunnel synthesizes.
     */
    address(): {
        address: string;
        family: string;
        port: number;
    };
    /**
     * Close: no socket to release.
     * @param callback - completion callback, invoked immediately.
     * @returns this server.
     */
    close(callback?: Listener): this;
    /** No connection was ever accepted. */
    closeAllConnections(): void;
    /** No idle connection exists either. */
    closeIdleConnections(): void;
}
/**
 * Constructor marker read by middleware during feature detection. Tunnel
 * responses are synthesized objects and are never instances of this class.
 */
export declare class ServerResponse {
}
/**
 * Create the fake server and retain its request listener for the tunnel.
 * @param listener - the request listener the webserver installs.
 * @returns the fake Server.
 */
export declare function createServer(listener?: RequestListener): FakeServer;
/**
 * Outbound HTTP has one carrier in the worker: `fetch`.
 * @returns Never — it throws naming the unavailable member.
 */
export declare function request(): never;
/**
 * Same as {@link request}.
 * @returns Never — it throws naming the unavailable member.
 */
export declare function get(): never;
/** Status text table Node exposes; a few handlers write status lines by hand. */
export declare const STATUS_CODES: typeof import('node:http').STATUS_CODES;
export { FakeServer as Server };
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ./builtins.ts). */
export declare const __esModule = true;
/** CommonJS default export: the members `require()` hands a caller of this module. */
declare const _default: {
    createServer: typeof createServer;
    request: typeof request;
    get: typeof get;
    STATUS_CODES: {
        [errorCode: number]: string | undefined;
        [errorCode: string]: string | undefined;
    };
    Server: typeof FakeServer;
    ServerResponse: typeof ServerResponse;
};
export default _default;
//# sourceMappingURL=http.d.ts.map