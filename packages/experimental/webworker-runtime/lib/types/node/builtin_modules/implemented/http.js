/**
 * `node:http` for the worker: `createServer` returns a Server whose `listen`
 * succeeds immediately without a socket, and retains the captured request
 * listener so the tunnel server can feed synthesized requests into the real
 * route table. The fake Server exposes only the members those routes read.
 * The worker entry hands {@link whenRequestListener} to the host assembly, so the
 * package never reaches back into this app.
 */
/** Port reported by `address()`; it becomes `webServer.port`. */
const VIRTUAL_PORT = 3080;
let captured;
const waiting = new Set();
/**
 * The webserver's request listener, once `[Service.init]` has installed it.
 * @returns the listener, or undefined before the webserver row activates.
 */
export function requestListener() {
    return captured;
}
/**
 * Await the request listener.
 * @returns a promise resolved with the listener as soon as it is captured.
 */
export async function whenRequestListener() {
    if (captured !== undefined)
        return captured;
    return await new Promise(resolve => waiting.add(resolve));
}
/** Fake Server: event registrations are stored and never emitted. */
class FakeServer {
    listeners = new Map();
    /**
     * Register an event listener (`upgrade`, `error`); never emitted.
     * @param event - event name.
     * @param listener - the listener.
     * @returns this server.
     */
    on(event, listener) {
        const set = this.listeners.get(event) ?? new Set();
        set.add(listener);
        this.listeners.set(event, set);
        return this;
    }
    /**
     * One-shot registration counterpart of {@link on}.
     * @param event - event name.
     * @param listener - the listener.
     * @returns this server.
     */
    once(event, listener) {
        return this.on(event, listener);
    }
    /**
     * Remove a listener.
     * @param event - event name.
     * @param listener - the listener.
     * @returns this server.
     */
    off(event, listener) {
        this.listeners.get(event)?.delete(listener);
        return this;
    }
    /**
     * Bind: succeeds immediately. The callback must run or the webserver fiber
     * stays in LOADING forever.
     * @param args - Node's listen arguments; only a trailing callback matters.
     * @returns this server.
     */
    listen(...args) {
        const callback = args.at(-1);
        if (typeof callback === 'function')
            queueMicrotask(() => { callback(); });
        return this;
    }
    /**
     * Bound address.
     * @returns the loopback authority the tunnel synthesizes.
     */
    address() {
        return { address: '127.0.0.1', family: 'IPv4', port: VIRTUAL_PORT };
    }
    /**
     * Close: no socket to release.
     * @param callback - completion callback, invoked immediately.
     * @returns this server.
     */
    close(callback) {
        if (callback !== undefined)
            queueMicrotask(() => { callback(); });
        return this;
    }
    /** No connection was ever accepted. */
    closeAllConnections() {
        // Nothing is ever accepted through this Server.
    }
    /** No idle connection exists either. */
    closeIdleConnections() {
        // Nothing is ever accepted through this Server.
    }
}
/**
 * Constructor marker read by middleware during feature detection. Tunnel
 * responses are synthesized objects and are never instances of this class.
 */
export class ServerResponse {
}
/**
 * Create the fake server and retain its request listener for the tunnel.
 * @param listener - the request listener the webserver installs.
 * @returns the fake Server.
 */
export function createServer(listener) {
    if (listener !== undefined) {
        captured = listener;
        for (const resolve of waiting)
            resolve(listener);
        waiting.clear();
    }
    return new FakeServer();
}
/**
 * Outbound HTTP has one carrier in the worker: `fetch`.
 * @returns Never — it throws naming the unavailable member.
 */
export function request() {
    throw new Error('web-preview: node:http.request is not available in the worker host — use fetch');
}
/**
 * Same as {@link request}.
 * @returns Never — it throws naming the unavailable member.
 */
export function get() {
    throw new Error('web-preview: node:http.get is not available in the worker host — use fetch');
}
/** Status text table Node exposes; a few handlers write status lines by hand. */
export const STATUS_CODES = {
    200: 'OK',
    204: 'No Content',
    304: 'Not Modified',
    400: 'Bad Request',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    413: 'Payload Too Large',
    415: 'Unsupported Media Type',
    426: 'Upgrade Required',
    500: 'Internal Server Error',
    503: 'Service Unavailable',
};
export { FakeServer as Server };
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ./builtins.ts). */
export const __esModule = true;
/** CommonJS default export: the members `require()` hands a caller of this module. */
export default { createServer, request, get, STATUS_CODES, Server: FakeServer, ServerResponse };
//# sourceMappingURL=http.js.map