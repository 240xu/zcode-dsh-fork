/** Worker-owned source generations, observation dispatch, and extension transport. */
import { type InspectorRecordInput, type InspectorSourceDescriptor, type InspectorSourceKind, type WorkerToSourceFrame } from '../../shared/bridge/messages/observation.ts';
import type { ClientConsoleEventFrame, ClientRuntimeResponseFrame } from '../../shared/bridge/messages/runtime/index.ts';
import type { ClientSourceResponseFrame } from '../../shared/bridge/messages/sources/index.ts';
/** One validated record with its source-local sequence. */
export interface IngestedInspectorRecord extends InspectorRecordInput {
    readonly sequence: number;
}
/** One connected source's reply and close operations. */
export interface SourceConnection {
    readonly kind: InspectorSourceKind;
    send(frame: WorkerToSourceFrame): void;
    close(code: number, reason: string): void;
}
/** Consumer of source lifecycle and records. */
export interface InspectorRecordConsumer {
    readonly topics: ReadonlySet<string>;
    replace(source: InspectorSourceDescriptor, records: readonly IngestedInspectorRecord[]): void;
    append(source: InspectorSourceDescriptor, records: readonly IngestedInspectorRecord[]): void;
    close(source: InspectorSourceDescriptor, reason: string): void;
}
/** Source lifecycle and typed extension frames observed inside the Worker. */
export type InspectorSourceEvent = {
    readonly type: 'opened';
    readonly source: InspectorSourceDescriptor;
} | {
    readonly type: 'closed';
    readonly source: InspectorSourceDescriptor;
    readonly reason: string;
} | {
    readonly type: 'client-runtime-response';
    readonly source: InspectorSourceDescriptor;
    readonly frame: ClientRuntimeResponseFrame;
} | {
    readonly type: 'client-console-event';
    readonly source: InspectorSourceDescriptor;
    readonly frame: ClientConsoleEventFrame;
} | {
    readonly type: 'client-source-response';
    readonly source: InspectorSourceDescriptor;
    readonly frame: ClientSourceResponseFrame;
};
/** Read-only diagnostic for `DSHInspector.getSources`. */
export interface InspectorSourceView {
    readonly sourceId: string;
    readonly generation: string;
    readonly kind: InspectorSourceKind;
    readonly label: string;
    readonly capabilities: readonly string[];
    readonly expectedSequence: number;
    readonly dropped: number;
    readonly topics: Readonly<Record<string, number>>;
}
/** Serial Worker-side owner of every Host and Client source generation. */
export declare class InspectorSourceRegistry {
    private readonly consumers;
    private readonly maxFrameBytes;
    private readonly maxRecordsPerFrame;
    private readonly sources;
    private readonly statusListeners;
    private readonly eventListeners;
    constructor(consumers: readonly InspectorRecordConsumer[], maxFrameBytes: number, maxRecordsPerFrame: number);
    /**
     * Parse and apply one frame; malformed input closes only its source transport.
     * @param connection - Carrier that delivered the frame.
     * @param value - Untrusted decoded frame.
     */
    receive(connection: SourceConnection, value: unknown): void;
    /**
     * Remove every generation carried by a closed connection.
     * @param connection - Closed source carrier.
     * @param reason - Diagnostic propagated to domain consumers.
     */
    disconnect(connection: SourceConnection, reason: string): void;
    /**
     * Read current source status for the diagnostic CDP domain.
     * @returns A detached status row for every active source.
     */
    describe(): InspectorSourceView[];
    /**
     * Subscribe to source status changes.
     * @param listener - Status observer.
     * @returns A disposer that removes the observer.
     */
    subscribeStatus(listener: () => void): () => void;
    /**
     * Subscribe to source admission, removal, and typed extension frames.
     * @param listener - Source protocol observer.
     * @returns A disposer that removes the observer.
     */
    subscribeEvents(listener: (event: InspectorSourceEvent) => void): () => void;
    /**
     * Send a typed control frame only to its still-active source generation.
     * @param source - Expected active source generation.
     * @param frame - Validated Worker-to-source frame.
     * @returns Whether the generation was still active and accepted the send.
     */
    send(source: InspectorSourceDescriptor, frame: WorkerToSourceFrame): boolean;
    /** Close every source and forget all state. */
    close(): void;
    private apply;
    private open;
    private assertTopics;
    private count;
    private notifyStatus;
    private emit;
}
//# sourceMappingURL=hub.d.ts.map