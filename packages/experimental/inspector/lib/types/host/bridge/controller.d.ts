/** Host controller that owns the Inspector Worker and Host observation source. */
import type { InspectorClientBootstrap } from '../../shared/bridge/messages/control.ts';
import type { InspectorConnection } from '../../shared/bridge/publisher.ts';
/** User-facing Host options; every memory and lifecycle bound is configurable. */
export interface InspectorOptions {
    /** Loopback address used by the Worker HTTP and WebSocket endpoint. */
    readonly host?: '127.0.0.1';
    /** First port to bind; occupied ports advance until one is available. */
    readonly port?: number;
    /** Additional exact browser origins admitted to the Client ingest socket. */
    readonly clientOrigins?: readonly string[];
    /** Whether to observe calls made through the current global fetch function. */
    readonly captureFetch?: boolean;
    /** Maximum request-body prefix retained for one fetch. */
    readonly maxRequestBodyBytes?: number;
    /** Maximum response-body prefix retained for one fetch. */
    readonly maxResponseBodyBytes?: number;
    /** Maximum raw bytes encoded into one body observation. */
    readonly maxBodyChunkBytes?: number;
    /** Maximum total request and response body bytes retained by the Worker. */
    readonly maxJournalBytes?: number;
    /** Maximum active and completed fetch requests retained by the Worker. */
    readonly maxRetainedRequests?: number;
    /** Maximum encoded bytes accepted in one source transport frame. */
    readonly maxSourceFrameBytes?: number;
    /** Maximum observation records accepted in one source batch. */
    readonly maxSourceRecordsPerFrame?: number;
    /** Maximum records waiting in one producer queue. */
    readonly maxQueuedRecords?: number;
    /** Maximum encoded bytes waiting in one producer queue. */
    readonly maxQueuedBytes?: number;
    /** Maximum time allowed for the Worker to become ready. */
    readonly startupTimeoutMs?: number;
    /** Grace period before a stopping Worker is terminated. */
    readonly stopTimeoutMs?: number;
    /** Initial upper bound for randomized Client reconnect delay. */
    readonly clientReconnectBaseMs?: number;
    /** Maximum upper bound for randomized Client reconnect delay. */
    readonly clientReconnectMaxMs?: number;
    /** Deadline for one Worker-to-Client Runtime or Sources request. */
    readonly clientRuntimeTimeoutMs?: number;
    /** Deadline for one non-CDP semantic query. */
    readonly queryTimeoutMs?: number;
    /** Maximum live object handles retained per Client Runtime session. */
    readonly maxClientRuntimeObjects?: number;
    /** Maximum descriptors returned by one Client property request. */
    readonly maxClientRuntimeProperties?: number;
    /** Maximum encoded bytes read for one Client script or source map. */
    readonly maxClientSourceBytes?: number;
    /** Maximum Context and Fiber nodes retained in one realm snapshot. */
    readonly maxCordisNodes?: number;
    /** Disconnected Cordis snapshots retained after their live realm closes. */
    readonly maxDisconnectedCordisTrees?: number;
}
/** Fully resolved options used by one running Inspector. */
export interface InspectorSpec {
    readonly host: '127.0.0.1';
    readonly port: number;
    readonly clientOrigins: readonly string[];
    readonly captureFetch: boolean;
    readonly maxRequestBodyBytes: number;
    readonly maxResponseBodyBytes: number;
    readonly maxBodyChunkBytes: number;
    readonly maxJournalBytes: number;
    readonly maxRetainedRequests: number;
    readonly maxSourceFrameBytes: number;
    readonly maxSourceRecordsPerFrame: number;
    readonly maxQueuedRecords: number;
    readonly maxQueuedBytes: number;
    readonly startupTimeoutMs: number;
    readonly stopTimeoutMs: number;
    readonly clientReconnectBaseMs: number;
    readonly clientReconnectMaxMs: number;
    readonly clientRuntimeTimeoutMs: number;
    readonly queryTimeoutMs: number;
    readonly maxClientRuntimeObjects: number;
    readonly maxClientRuntimeProperties: number;
    readonly maxClientSourceBytes: number;
    readonly maxCordisNodes: number;
    readonly maxDisconnectedCordisTrees: number;
}
/** Addresses and browser bootstrap of one bound Worker. */
export interface InspectorEndpoint {
    readonly httpUrl: string;
    readonly webSocketDebuggerUrl: string;
    readonly devtoolsFrontendUrl: string;
    readonly client: InspectorClientBootstrap;
}
/** Running Host-side Inspector owner. */
export interface InspectorHandle {
    readonly endpoint: InspectorEndpoint;
    readonly source: InspectorConnection;
    /** Stop capture and wait for the Worker to release every socket and V8 session. */
    close(): Promise<void>;
}
/**
 * Resolve and validate all deployment-varying Inspector choices.
 * @param options - Partial caller configuration.
 * @returns A complete immutable configuration.
 */
export declare function resolveInspectorOptions(options?: InspectorOptions): InspectorSpec;
/**
 * Start the Worker, create the Host source, and install full fetch capture by default.
 * @param options - Partial caller configuration.
 * @returns The ready endpoint and its quiescent shutdown handle.
 */
export declare function startInspector(options?: InspectorOptions): Promise<InspectorHandle>;
//# sourceMappingURL=controller.d.ts.map