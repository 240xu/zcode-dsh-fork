/** Worker-owned request routing for Client read-only source catalogs. */
import type { ClientSourceCommand, ClientSourceError, ClientSourceResult } from '../../shared/bridge/messages/sources/index.ts';
import { type ClientSourceSessionId } from '../../shared/bridge/ids.ts';
import { type InspectorSourceDescriptor } from '../../shared/bridge/messages/observation.ts';
import type { InspectorSourceRegistry } from './hub.ts';
/** Deliberate error returned by the Client source catalog. */
export declare class ClientSourceRemoteError extends Error {
    readonly code: ClientSourceError['code'];
    constructor(code: ClientSourceError['code'], message: string);
}
/** Correlates bounded source requests with one active Client source generation. */
export declare class ClientSourceRouter {
    private readonly sources;
    private readonly timeoutMs;
    readonly maxContentBytes: number;
    /** Maximum decoded bytes requested in one source-content response. */
    readonly chunkBytes: number;
    private readonly pending;
    private readonly unsubscribeSources;
    private closed;
    constructor(sources: InspectorSourceRegistry, timeoutMs: number, maxContentBytes: number, maxFrameBytes: number);
    /**
     * Execute one operation against an active Client source generation.
     * @param source - Client source that owns the script catalog.
     * @param sessionId - DevTools connection-local source session.
     * @param command - Validated read-only source command.
     * @returns The correlated result.
     */
    request(source: InspectorSourceDescriptor, sessionId: ClientSourceSessionId, command: ClientSourceCommand): Promise<ClientSourceResult>;
    /**
     * Reject pending operations and notify one Client source session that it closed.
     * @param source - Source generation owning the session.
     * @param sessionId - Closing source session.
     */
    closeSession(source: InspectorSourceDescriptor, sessionId: ClientSourceSessionId): void;
    /** Stop routing and reject every outstanding source operation. */
    close(): void;
    private receiveSourceEvent;
    private settle;
    private rejectPending;
}
//# sourceMappingURL=source-rpc.d.ts.map