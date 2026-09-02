/** Buffered Host observation publication over a dedicated Worker MessagePort. */
import { InspectorSourceBuffer } from "../../shared/bridge/buffer.js";
/** Non-blocking Host publisher with microtask-coalesced MessagePort writes. */
export class HostBridgePublisher {
    port;
    source;
    records;
    flushScheduled = false;
    inFlightNextSequence;
    closed = false;
    constructor(port, source, options) {
        this.port = port;
        this.source = source;
        this.records = new InspectorSourceBuffer(options);
    }
    publish(topic, payload, monotonicMs = performance.now()) {
        if (this.closed)
            return;
        this.records.publish(topic, payload, monotonicMs);
        this.scheduleFlush();
    }
    setState(topic, payload, monotonicMs = performance.now()) {
        if (this.closed)
            throw new Error('inspector: Host source is closed');
        this.records.setState(topic, payload, monotonicMs);
        this.scheduleFlush();
    }
    /** Send the retained state as a complete source replacement. */
    replace() {
        this.inFlightNextSequence = undefined;
        this.port.postMessage(this.records.replacement(this.source.sourceId, this.source.generation));
        this.scheduleFlush();
    }
    /** Send one queued batch when no earlier MessagePort batch awaits acknowledgement. */
    flush() {
        if (this.closed || this.inFlightNextSequence !== undefined)
            return;
        const frame = this.records.takeBatch(this.source.sourceId, this.source.generation);
        if (frame === undefined)
            return;
        this.port.postMessage(frame);
        this.inFlightNextSequence = frame.firstSequence + frame.records.length;
    }
    /**
     * Release one in-flight batch and schedule the next bounded transfer.
     * @param nextSequence - First sequence expected by the Worker after the accepted batch.
     */
    acknowledge(nextSequence) {
        if (this.closed || this.inFlightNextSequence === undefined)
            return;
        if (nextSequence !== this.inFlightNextSequence) {
            throw new Error('inspector: Host source acknowledgement does not match the in-flight batch');
        }
        this.inFlightNextSequence = undefined;
        this.scheduleFlush();
    }
    /** Send at most one final batch, discard later queued observations, and reject publication. */
    close() {
        if (this.closed)
            return;
        this.flush();
        this.closed = true;
        this.records.discardPending();
    }
    scheduleFlush() {
        if (!this.records.hasPending || this.flushScheduled)
            return;
        this.flushScheduled = true;
        queueMicrotask(() => {
            this.flushScheduled = false;
            this.flush();
        });
    }
}
//# sourceMappingURL=publisher.js.map