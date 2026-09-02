/** Worker-owned routing between synthetic Client contexts and source generations. */
import type { ClientRuntimeCapability, ClientRuntimeCommand, ClientRuntimeError, ClientRuntimeResult } from '../../shared/bridge/messages/runtime/index.ts';
import { type ClientRemoteObjectHandle, type ClientRuntimeSessionId } from '../../shared/bridge/ids.ts';
import { type InspectorSourceDescriptor } from '../../shared/bridge/messages/observation.ts';
import type { InspectorSourceRegistry } from './hub.ts';
import type { RuntimeConsoleBackendEvent } from '../../shared/cdp/index.ts';
/** One connected projection of a Client realm into a synthetic CDP execution context. */
export interface ClientRuntimeTarget {
    readonly contextId: number;
    readonly uniqueContextId: string;
    readonly source: InspectorSourceDescriptor;
    readonly capability: ClientRuntimeCapability;
}
/** Runtime target admission or removal. */
export type ClientRuntimeTargetEvent = {
    readonly type: 'opened';
    readonly target: ClientRuntimeTarget;
} | {
    readonly type: 'closed';
    readonly target: ClientRuntimeTarget;
};
/** Error returned deliberately by the Client Runtime executor. */
export declare class ClientRuntimeRemoteError extends Error {
    readonly code: ClientRuntimeError['code'];
    constructor(code: ClientRuntimeError['code'], message: string);
}
/** Runtime context registry and correlated Worker-to-Client request owner. */
export declare class ClientRuntimeRouter {
    private readonly sources;
    private readonly timeoutMs;
    private readonly targetsBySource;
    private readonly pending;
    private readonly consoleSubscriptions;
    private readonly listeners;
    private readonly unsubscribeSources;
    private nextContextId;
    private closed;
    constructor(sources: InspectorSourceRegistry, timeoutMs: number);
    /**
     * Snapshot all active Client execution contexts.
     * @returns Active targets in admission order.
     */
    targets(): ClientRuntimeTarget[];
    /**
     * Resolve the Client target for one active source generation.
     * @param source - Source identity stored with a semantic node.
     * @returns Its active Runtime target, when the generation still matches.
     */
    bySource(source: InspectorSourceDescriptor): ClientRuntimeTarget | undefined;
    /**
     * Subscribe to synthetic execution-context lifecycle.
     * @param listener - Context lifecycle observer.
     * @returns A disposer that removes the observer.
     */
    subscribe(listener: (event: ClientRuntimeTargetEvent) => void): () => void;
    /**
     * Enable Console events for one Client realm and DevTools session.
     * @param target - Active Client realm.
     * @param sessionId - DevTools Runtime session retaining event arguments.
     * @param listener - Consumer of validated Client Console events.
     * @returns A disposer that disables this Console session.
     */
    subscribeConsole(target: ClientRuntimeTarget, sessionId: ClientRuntimeSessionId, listener: (event: RuntimeConsoleBackendEvent<ClientRemoteObjectHandle>) => void): () => void;
    /**
     * Execute one typed command in its currently active source generation.
     * @param target - Active Client source and context.
     * @param sessionId - Calling DevTools Runtime session.
     * @param command - Validated Client Runtime operation.
     * @returns The correlated result, or a rejection on timeout or disconnect.
     */
    request(target: ClientRuntimeTarget, sessionId: ClientRuntimeSessionId, command: ClientRuntimeCommand): Promise<ClientRuntimeResult>;
    /**
     * Close one realm-local Runtime session without notifying sibling Client realms.
     * @param target - Client realm that owns the session.
     * @param sessionId - Closing DevTools Runtime session.
     */
    closeTargetSession(target: ClientRuntimeTarget, sessionId: ClientRuntimeSessionId): void;
    /** Stop routing and reject every outstanding operation. */
    close(): void;
    private receiveSourceEvent;
    private open;
    private remove;
    private consoleEvent;
    private settle;
    private acknowledgeClientResponse;
    private cancelClientResponse;
    private rejectPending;
    private emit;
}
//# sourceMappingURL=runtime-rpc.d.ts.map