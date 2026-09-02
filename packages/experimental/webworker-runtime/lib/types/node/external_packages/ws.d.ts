/** Client socket (unavailable; the page side uses the tunnel, not WebSocket). */
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ./builtins.ts). */
export declare const __esModule = true;
/** Client socket (unavailable; the page side uses the tunnel, not WebSocket). */
export default class WebSocket {
    /** Node's `CONNECTING` ready state, read by consumers that never connect. */
    static readonly CONNECTING = 0;
    /** Node's `OPEN` ready state. */
    static readonly OPEN = 1;
    /** Node's `CLOSING` ready state. */
    static readonly CLOSING = 2;
    /** Node's `CLOSED` ready state. */
    static readonly CLOSED = 3;
    constructor();
}
/** Server whose construction must succeed and whose methods are unreachable. */
export declare class WebSocketServer {
    /** Connected clients: always empty, since no upgrade ever completes. */
    readonly clients: Set<never>;
    /** Upgrade handling (unreachable: no upgrade event is ever emitted). */
    readonly handleUpgrade: (...args: never[]) => never;
    /** Broadcast helper (unreachable). */
    readonly emit: (...args: never[]) => never;
    /**
     * Register a listener; nothing is ever emitted.
     * @returns this server.
     */
    on(): this;
    /**
     * Close the server.
     * @param callback - completion callback, invoked immediately.
     */
    close(callback?: () => void): void;
}
/** Alias Node consumers sometimes import. */
export declare const Server: typeof WebSocketServer;
export { WebSocket };
//# sourceMappingURL=ws.d.ts.map