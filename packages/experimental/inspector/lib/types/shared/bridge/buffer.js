/** Realm-neutral bounded buffering for Host and Client observation sources. */
import { isJsonValue, jsonByteLength } from "../json.js";
import { INSPECTOR_PROTOCOL_VERSION } from "./version.js";
const SOURCE_FRAME_OVERHEAD_BYTES = 4_096;
/**
 * Owns retained state, queued events, and source-local sequencing independently
 * of whether frames travel over MessagePort or WebSocket.
 */
export class InspectorSourceBuffer {
    options;
    queue = [];
    state = new Map();
    queuedBytes = 0;
    nextSequence = 1;
    expectedSequence = 1;
    constructor(options) {
        this.options = options;
    }
    /** Whether at least one observation is waiting for transport. */
    get hasPending() {
        return this.queue.length > 0;
    }
    /**
     * Validate and enqueue one observation, dropping the oldest prefix as needed.
     * A record larger than one transport frame is dropped after consuming its sequence number.
     * @param topic - Declared domain topic.
     * @param payload - Lossless JSON payload.
     * @param monotonicMs - Finite source-clock timestamp.
     */
    publish(topic, payload, monotonicMs) {
        this.enqueue(this.record(topic, payload, monotonicMs));
    }
    /**
     * Replace one retained topic and enqueue the same observation for live delivery.
     * @param topic - Declared state topic.
     * @param payload - Lossless JSON payload retained for replacement frames.
     * @param monotonicMs - Finite source-clock timestamp.
     */
    setState(topic, payload, monotonicMs) {
        const record = this.record(topic, payload, monotonicMs);
        const previous = this.state.get(topic);
        this.state.set(topic, record);
        if (!this.stateFits()) {
            if (previous === undefined)
                this.state.delete(topic);
            else
                this.state.set(topic, previous);
            throw new Error('inspector: source state exceeds the source-frame byte limit');
        }
        this.enqueue(record);
    }
    /**
     * Build a complete state replacement and absorb every preceding queue drop.
     * @param sourceId - Logical source identity.
     * @param generation - Current transport generation.
     * @returns A replacement frame whose sequence is the next append position.
     */
    replacement(sourceId, generation) {
        const nextSequence = this.queue[0]?.sequence ?? this.nextSequence;
        this.expectedSequence = nextSequence;
        return {
            v: INSPECTOR_PROTOCOL_VERSION,
            t: 'source/replace',
            sourceId,
            generation,
            nextSequence,
            records: [...this.state.values()],
        };
    }
    /**
     * Remove and sequence the next transport-sized observation batch.
     * @param sourceId - Logical source identity.
     * @param generation - Current transport generation.
     * @returns The next append frame, or `undefined` when the queue is empty.
     */
    takeBatch(sourceId, generation) {
        if (this.queue.length === 0)
            return undefined;
        const batch = [];
        let batchBytes = SOURCE_FRAME_OVERHEAD_BYTES;
        const first = this.queue[0];
        while (batch.length < this.options.maxRecordsPerFrame && this.queue.length > 0) {
            const candidate = this.queue[0];
            if (candidate.sequence !== first.sequence + batch.length)
                break;
            if (batch.length > 0 && batchBytes + candidate.bytes > this.options.maxFrameBytes)
                break;
            this.queue.shift();
            batch.push(candidate);
            batchBytes += candidate.bytes;
        }
        this.queuedBytes -= batch.reduce((sum, item) => sum + item.bytes, 0);
        const firstSequence = first.sequence;
        const frame = {
            v: INSPECTOR_PROTOCOL_VERSION,
            t: 'source/append',
            sourceId,
            generation,
            firstSequence,
            droppedBefore: firstSequence - this.expectedSequence,
            records: batch.map(item => item.record),
        };
        this.expectedSequence = firstSequence + frame.records.length;
        return frame;
    }
    /** Discard observations that have not entered a transport frame. */
    discardPending() {
        this.queue.length = 0;
        this.queuedBytes = 0;
    }
    record(topic, payload, monotonicMs) {
        if (topic.length === 0 || topic.length > 128) {
            throw new Error('inspector: topic must contain 1 to 128 characters');
        }
        if (!this.options.topics.includes('*') && !this.options.topics.includes(topic)) {
            throw new Error(`inspector: source does not declare topic ${JSON.stringify(topic)}`);
        }
        if (!isJsonValue(payload))
            throw new Error('inspector: source payload must be lossless JSON data');
        if (!Number.isFinite(monotonicMs))
            throw new Error('inspector: monotonicMs must be finite');
        return { monotonicMs, topic, payload };
    }
    enqueue(record) {
        const bytes = jsonByteLength(record);
        const sequence = this.nextSequence++;
        if (bytes + SOURCE_FRAME_OVERHEAD_BYTES > this.options.maxFrameBytes) {
            return;
        }
        this.queue.push({ sequence, bytes, record });
        this.queuedBytes += bytes;
        while (this.queue.length > this.options.maxQueuedRecords || this.queuedBytes > this.options.maxQueuedBytes) {
            const dropped = this.queue.shift();
            this.queuedBytes -= dropped.bytes;
        }
    }
    stateFits() {
        return jsonByteLength([...this.state.values()]) + SOURCE_FRAME_OVERHEAD_BYTES
            <= this.options.maxFrameBytes;
    }
}
//# sourceMappingURL=buffer.js.map