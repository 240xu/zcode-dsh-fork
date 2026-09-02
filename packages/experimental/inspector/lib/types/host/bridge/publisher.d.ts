/** Buffered Host observation publication over a dedicated Worker MessagePort. */
import type { MessagePort } from 'node:worker_threads';
import { type InspectorSourceBufferOptions } from '../../shared/bridge/buffer.ts';
import type { InspectorJsonValue } from '../../shared/json.ts';
import type { InspectorStatePublisher } from '../../shared/bridge/publisher.ts';
import type { InspectorSourceDescriptor } from '../../shared/bridge/messages/observation.ts';
/** Non-blocking Host publisher with microtask-coalesced MessagePort writes. */
export declare class HostBridgePublisher implements InspectorStatePublisher {
    private readonly port;
    private readonly source;
    private readonly records;
    private flushScheduled;
    private inFlightNextSequence;
    private closed;
    constructor(port: MessagePort, source: InspectorSourceDescriptor, options: InspectorSourceBufferOptions);
    publish(topic: string, payload: InspectorJsonValue, monotonicMs?: number): void;
    setState(topic: string, payload: InspectorJsonValue, monotonicMs?: number): void;
    /** Send the retained state as a complete source replacement. */
    replace(): void;
    /** Send one queued batch when no earlier MessagePort batch awaits acknowledgement. */
    flush(): void;
    /**
     * Release one in-flight batch and schedule the next bounded transfer.
     * @param nextSequence - First sequence expected by the Worker after the accepted batch.
     */
    acknowledge(nextSequence: number): void;
    /** Send at most one final batch, discard later queued observations, and reject publication. */
    close(): void;
    private scheduleFlush;
}
//# sourceMappingURL=publisher.d.ts.map