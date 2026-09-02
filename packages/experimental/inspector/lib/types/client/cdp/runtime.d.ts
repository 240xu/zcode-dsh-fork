/** Client-realm executor for the typed Runtime command protocol. */
import type { ClientRuntimeCapability, ClientRuntimeRequestFrame, ClientRuntimeResponseFrame } from '../../shared/bridge/messages/runtime/index.ts';
import type { ClientRemoteObjectHandle, ClientRuntimeRequestId, ClientRuntimeSessionId } from '../../shared/bridge/ids.ts';
import type { RuntimeConsoleBackendEvent, RuntimeConsoleType, RuntimeStackTrace } from '../../shared/cdp/index.ts';
import { type ClientScriptKeyResolver } from './stack.ts';
/**
 * Describe browser-side Runtime execution.
 * @param origin - Origin assigned to the synthetic execution context.
 * @returns The Runtime capability advertised by a browser Client source.
 */
export declare function runtimeBridgeCapability(origin: string): ClientRuntimeCapability;
/** Client-side limits injected by the Host deployment. */
export interface ClientRuntimeLimits {
    readonly maxObjectsPerSession: number;
    readonly maxPropertiesPerResult: number;
    readonly maxResponseBytes: number;
}
/** Executes Runtime requests while isolating object handles by DevTools session. */
export declare class ClientRuntimeExecutor {
    private readonly limits;
    private readonly resolveScript;
    private readonly sessions;
    private readonly responseAllocations;
    constructor(limits: ClientRuntimeLimits, resolveScript?: ClientScriptKeyResolver);
    /**
     * Execute one request and preserve its source, generation, session, and request identities.
     * @param frame - Validated command envelope from the Worker.
     * @param signal - Optional cancellation for an operation awaiting user code.
     * @param deferObjectCommit - Keep new object handles provisional until {@link acknowledge}.
     * @returns A success or transport-error response for the same request.
     */
    execute(frame: ClientRuntimeRequestFrame, signal?: AbortSignal, deferObjectCommit?: boolean): Promise<ClientRuntimeResponseFrame>;
    /**
     * Commit handles after the Worker accepts one Runtime response.
     * @param sessionId - Session that owns the response.
     * @param requestId - Correlation id acknowledged by the Worker.
     */
    acknowledge(sessionId: ClientRuntimeSessionId, requestId: ClientRuntimeRequestId): void;
    /**
     * Roll back handles from a canceled or otherwise unaccepted Runtime response.
     * @param sessionId - Session that owns the response.
     * @param requestId - Correlation id rejected by the Worker.
     */
    cancel(sessionId: ClientRuntimeSessionId, requestId: ClientRuntimeRequestId): void;
    /**
     * Release all values retained for one closed DevTools connection.
     * @param sessionId - Runtime session owned by that DevTools connection.
     */
    closeSession(sessionId: ClientRuntimeSessionId): void;
    /**
     * Release one object group without closing the surrounding Runtime session.
     * @param sessionId - Session that owns the retained objects.
     * @param group - Object-group name to release.
     */
    releaseObjectGroup(sessionId: ClientRuntimeSessionId, group: string): void;
    /**
     * Serialize one Console call for a specific DevTools Runtime session.
     * @param sessionId - Session receiving the Console event.
     * @param type - Console API operation.
     * @param values - Original arguments from the page call.
     * @param timestamp - Epoch timestamp in milliseconds.
     * @param stackTrace - Browser call frames captured before deferred delivery.
     * @returns A wire-safe event whose object handles belong only to this session.
     */
    consoleEvent(sessionId: ClientRuntimeSessionId, type: RuntimeConsoleType, values: readonly unknown[], timestamp: number, stackTrace?: RuntimeStackTrace): RuntimeConsoleBackendEvent<ClientRemoteObjectHandle> | undefined;
    /**
     * Serialize one uncaught Client exception for a DevTools Runtime session.
     * @param sessionId - Session receiving the exception event.
     * @param error - Thrown or rejected value.
     * @param timestamp - Epoch timestamp in milliseconds.
     * @param stackTrace - Browser call frames attached to the failure.
     * @returns A wire-safe exception event.
     */
    exceptionEvent(sessionId: ClientRuntimeSessionId, error: unknown, timestamp: number, stackTrace?: RuntimeStackTrace): RuntimeConsoleBackendEvent<ClientRemoteObjectHandle> | undefined;
    /** Release all sessions when a source generation ends or reconnects. */
    reset(): void;
    private session;
}
//# sourceMappingURL=runtime.d.ts.map