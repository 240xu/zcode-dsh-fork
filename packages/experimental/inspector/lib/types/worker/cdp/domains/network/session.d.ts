/** CDP Network projection over the Worker-owned normalized network store. */
import type { NetworkStore } from '../../../inspection/network-store.ts';
/** CDP session slice used by the Network domain. */
export interface NetworkSink {
    sendEvent(method: string, params: Readonly<Record<string, unknown>>): void;
}
/** Projects retained and live network observations into connection-local CDP state. */
export declare class NetworkDomain {
    private readonly store;
    private readonly enabled;
    private readonly streamedRequests;
    private readonly pendingStarts;
    private readonly requestTypes;
    private readonly unsubscribe;
    constructor(store: NetworkStore);
    /**
     * Enable Network for one DevTools connection and replay retained lifecycle events.
     * @param session - Connection receiving replay and subsequent events.
     */
    enable(session: NetworkSink): void;
    /**
     * Stop Network events for one DevTools connection.
     * @param session - Connection leaving the enabled set.
     */
    disable(session: NetworkSink): void;
    /**
     * Forget a closed DevTools connection.
     * @param session - Closed DevTools connection.
     */
    detach(session: NetworkSink): void;
    /** Release the repository subscription and all connection-local state. */
    close(): void;
    /**
     * Handle one Worker-local Network method.
     * @param method - CDP method name.
     * @param params - Parsed request parameters.
     * @param session - Calling DevTools connection.
     * @returns The CDP result fields.
     */
    handle(method: string, params: Readonly<Record<string, unknown>>, session: NetworkSink): unknown;
    private receive;
    private send;
    private sendRequestStart;
    private stopRequest;
}
//# sourceMappingURL=session.d.ts.map