/** Reconnection lifecycle for the browser Client bridge. */
/** Owns one bounded-backoff timer and prevents reconnection after disposal. */
export declare class ClientBridgeLifecycle {
    private readonly baseDelayMs;
    private readonly maxDelayMs;
    private reconnectAttempt;
    private reconnectTimer;
    private closed;
    constructor(baseDelayMs: number, maxDelayMs: number);
    /** Reset backoff after the Worker accepts a source generation. */
    connected(): void;
    /**
     * Schedule the next reconnect attempt unless one is already pending.
     * @param connect - Operation that opens the next transport generation.
     */
    reconnect(connect: () => void): void;
    /** Stop pending and future reconnect attempts. */
    close(): void;
}
//# sourceMappingURL=lifecycle.d.ts.map