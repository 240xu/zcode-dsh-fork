/** Realm-neutral bounded buffering for Host and Client observation sources. */
import type { InspectorSourceGeneration, InspectorSourceId } from './ids.ts';
import { type InspectorJsonValue } from '../json.ts';
import type { SourceAppendFrame, SourceReplaceFrame } from './messages/observation.ts';
/** Limits and declared topics shared by both source transports. */
export interface InspectorSourceBufferOptions {
    readonly topics: readonly string[];
    readonly maxQueuedRecords: number;
    readonly maxQueuedBytes: number;
    readonly maxRecordsPerFrame: number;
    readonly maxFrameBytes: number;
}
/**
 * Owns retained state, queued events, and source-local sequencing independently
 * of whether frames travel over MessagePort or WebSocket.
 */
export declare class InspectorSourceBuffer {
    private readonly options;
    private readonly queue;
    private readonly state;
    private queuedBytes;
    private nextSequence;
    private expectedSequence;
    constructor(options: InspectorSourceBufferOptions);
    /** Whether at least one observation is waiting for transport. */
    get hasPending(): boolean;
    /**
     * Validate and enqueue one observation, dropping the oldest prefix as needed.
     * A record larger than one transport frame is dropped after consuming its sequence number.
     * @param topic - Declared domain topic.
     * @param payload - Lossless JSON payload.
     * @param monotonicMs - Finite source-clock timestamp.
     */
    publish(topic: string, payload: InspectorJsonValue, monotonicMs: number): void;
    /**
     * Replace one retained topic and enqueue the same observation for live delivery.
     * @param topic - Declared state topic.
     * @param payload - Lossless JSON payload retained for replacement frames.
     * @param monotonicMs - Finite source-clock timestamp.
     */
    setState(topic: string, payload: InspectorJsonValue, monotonicMs: number): void;
    /**
     * Build a complete state replacement and absorb every preceding queue drop.
     * @param sourceId - Logical source identity.
     * @param generation - Current transport generation.
     * @returns A replacement frame whose sequence is the next append position.
     */
    replacement(sourceId: InspectorSourceId, generation: InspectorSourceGeneration): SourceReplaceFrame;
    /**
     * Remove and sequence the next transport-sized observation batch.
     * @param sourceId - Logical source identity.
     * @param generation - Current transport generation.
     * @returns The next append frame, or `undefined` when the queue is empty.
     */
    takeBatch(sourceId: InspectorSourceId, generation: InspectorSourceGeneration): SourceAppendFrame | undefined;
    /** Discard observations that have not entered a transport frame. */
    discardPending(): void;
    private record;
    private enqueue;
    private stateFits;
}
//# sourceMappingURL=buffer.d.ts.map