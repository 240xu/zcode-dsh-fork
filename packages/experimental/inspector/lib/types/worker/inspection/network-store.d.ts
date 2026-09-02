/** Worker-owned repository of normalized fetch observations and captured bodies. */
import type { InspectorHeader } from '../../shared/network/observation.ts';
import type { InspectorSourceDescriptor } from '../../shared/bridge/messages/observation.ts';
import type { IngestedInspectorRecord, InspectorRecordConsumer } from '../bridge/hub.ts';
/** Bounded retention policy for observed network requests. */
export interface NetworkStoreOptions {
    readonly maxRetainedRequests: number;
    readonly maxJournalBytes: number;
}
/** Captured body data returned without a CDP representation. */
export interface CapturedNetworkBody {
    readonly bytes: Uint8Array;
    readonly truncated: boolean;
    readonly captureError?: string;
    readonly complete: boolean;
}
interface NetworkEventBase {
    readonly requestKey: string;
    readonly requestId: string;
    readonly timestampMs: number;
}
/** Transport-independent changes emitted by the network repository. */
export type NetworkStoreEvent = NetworkEventBase & {
    readonly type: 'request-started';
    readonly wallTimeMs: number;
    readonly url: string;
    readonly method: string;
    readonly headers: readonly InspectorHeader[];
    readonly hasBody: boolean;
} | NetworkEventBase & {
    readonly type: 'response-received';
    readonly url: string;
    readonly status: number;
    readonly statusText: string;
    readonly headers: readonly InspectorHeader[];
    readonly mimeType: string;
} | NetworkEventBase & {
    readonly type: 'response-data';
    readonly data: string;
    readonly byteLength: number;
} | NetworkEventBase & {
    readonly type: 'event-source-message';
    readonly eventName: string;
    readonly eventId: string;
    readonly data: string;
} | NetworkEventBase & {
    readonly type: 'request-finished';
    readonly encodedDataLength: number;
    readonly truncated: boolean;
} | NetworkEventBase & {
    readonly type: 'request-failed';
    readonly errorText: string;
    readonly canceled: boolean;
} | {
    readonly type: 'request-evicted';
    readonly requestKey: string;
};
type JournalNetworkEvent = Exclude<NetworkStoreEvent, {
    readonly type: 'response-data' | 'request-evicted';
}>;
/** Validated Network observation store independent of CDP connection state. */
export declare class NetworkStore implements InspectorRecordConsumer {
    private readonly options;
    readonly topics: Set<string>;
    private readonly requests;
    private readonly journal;
    private readonly completed;
    private readonly listeners;
    private journalBytes;
    constructor(options: NetworkStoreOptions);
    replace(source: InspectorSourceDescriptor, records: readonly IngestedInspectorRecord[]): void;
    append(source: InspectorSourceDescriptor, records: readonly IngestedInspectorRecord[]): void;
    close(source: InspectorSourceDescriptor, reason: string): void;
    /**
     * Read retained request lifecycle events.
     * @returns Events in observation order.
     */
    replay(): readonly JournalNetworkEvent[];
    /**
     * Subscribe to live request changes and eviction.
     * @param listener - Consumer called synchronously after each accepted change.
     * @returns A disposer removing the consumer.
     */
    subscribe(listener: (event: NetworkStoreEvent) => void): () => void;
    /**
     * Read one retained request body.
     * @param requestId - Public request id assigned by this store.
     * @returns Captured bytes and truncation metadata.
     */
    requestBody(requestId: unknown): CapturedNetworkBody;
    /**
     * Read one retained response body after response headers have arrived.
     * @param requestId - Public request id assigned by this store.
     * @returns Captured bytes and truncation metadata.
     */
    responseBody(requestId: unknown): CapturedNetworkBody;
    /** Release subscribers and all retained request data. */
    dispose(): void;
    private ingest;
    private appendBody;
    private complete;
    private publish;
    private emit;
    private enforceRetention;
    private evictCompletedFor;
    private evict;
    private requestById;
}
export {};
//# sourceMappingURL=network-store.d.ts.map