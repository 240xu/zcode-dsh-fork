/** Reconnection lifecycle for the browser Client bridge. */
/** Owns one bounded-backoff timer and prevents reconnection after disposal. */
export class ClientBridgeLifecycle {
    baseDelayMs;
    maxDelayMs;
    reconnectAttempt = 0;
    reconnectTimer;
    closed = false;
    constructor(baseDelayMs, maxDelayMs) {
        this.baseDelayMs = baseDelayMs;
        this.maxDelayMs = maxDelayMs;
    }
    /** Reset backoff after the Worker accepts a source generation. */
    connected() {
        this.reconnectAttempt = 0;
    }
    /**
     * Schedule the next reconnect attempt unless one is already pending.
     * @param connect - Operation that opens the next transport generation.
     */
    reconnect(connect) {
        if (this.reconnectTimer !== undefined || this.closed)
            return;
        const cap = Math.min(this.maxDelayMs, this.baseDelayMs * 2 ** this.reconnectAttempt);
        this.reconnectAttempt++;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = undefined;
            connect();
        }, cap / 2 + Math.random() * cap / 2);
    }
    /** Stop pending and future reconnect attempts. */
    close() {
        if (this.closed)
            return;
        this.closed = true;
        if (this.reconnectTimer !== undefined)
            clearTimeout(this.reconnectTimer);
        this.reconnectTimer = undefined;
    }
}
//# sourceMappingURL=lifecycle.js.map