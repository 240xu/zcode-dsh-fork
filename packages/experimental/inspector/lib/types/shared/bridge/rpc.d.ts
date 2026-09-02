/** Shared Host/Client owner of correlated non-CDP query requests. */
import { type InspectorSourceGeneration, type InspectorSourceId } from './ids.ts';
import type { InspectorQuery, InspectorQueryError, InspectorQueryRequester, InspectorQueryResultFor } from './messages/query/commands.ts';
import type { InspectorQueryRequestFrame } from './messages/query/frames.ts';
/** Active carrier write used by the shared query owner. */
export interface InspectorQuerySender {
    /**
     * Send one validated query request frame.
     * @param frame - Request belonging to the active source generation.
     */
    send(frame: InspectorQueryRequestFrame): void;
}
/** Bounds applied by one Host or Client query connection. */
export interface InspectorQueryConnectionOptions {
    readonly timeoutMs: number;
    readonly maxFrameBytes: number;
}
/** Failure deliberately returned by the Worker query handler. */
export declare class InspectorQueryRemoteError extends Error {
    readonly code: InspectorQueryError['code'];
    constructor(code: InspectorQueryError['code'], message: string);
}
/** Correlates requests for one reconnecting Host or Client source. */
export declare class InspectorQueryConnection implements InspectorQueryRequester {
    private readonly options;
    private readonly pending;
    private active;
    private nextRequestId;
    private closed;
    constructor(options: InspectorQueryConnectionOptions);
    /**
     * Admit the source generation acknowledged by the Worker.
     * @param sourceId - Stable source identity.
     * @param generation - Newly accepted transport generation.
     * @param sender - Carrier writer valid for that generation.
     */
    connect(sourceId: InspectorSourceId, generation: InspectorSourceGeneration, sender: InspectorQuerySender): void;
    /**
     * Execute a query against the currently accepted source generation.
     * @param query - Closed typed query command.
     * @returns The result with the same operation discriminant.
     */
    request<Query extends InspectorQuery>(query: Query): Promise<InspectorQueryResultFor<Query>>;
    /**
     * Consume a decoded carrier value when it is a query response.
     * @param value - Untrusted Worker-to-source value.
     * @returns Whether the value belonged to the query protocol.
     */
    receive(value: unknown): boolean;
    /**
     * Reject active requests while permitting a later source generation.
     * @param reason - Failure reported to every pending caller.
     */
    disconnect(reason: string): void;
    /**
     * Permanently reject requests and prevent later reconnection.
     * @param reason - Failure reported to every pending caller.
     */
    close(reason?: string): void;
    private rejectPending;
}
//# sourceMappingURL=rpc.d.ts.map