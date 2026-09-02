/** Full `globalThis.fetch` capture that publishes without delaying response delivery. */
import type { InspectorPublisher } from '../../shared/bridge/publisher.ts';
/** Observation topics published by the Host network adapter. */
export declare const NETWORK_TOPICS: readonly string[];
/** Byte limits for request and response clone capture. */
export interface FetchCaptureOptions {
    readonly maxRequestBodyBytes: number;
    readonly maxResponseBodyBytes: number;
    readonly maxChunkBytes: number;
}
/** Active global fetch wrapper. */
export interface FetchObserver {
    /** Restore the prior fetch implementation, cancel clone readers, and await their settlement. */
    stop(): Promise<void>;
}
/**
 * Install full fetch capture for every later call through `globalThis.fetch`.
 * @param publisher - Host source that receives fetch lifecycle records.
 * @param options - Per-body capture limits.
 * @returns The owner that stops capture and awaits pending body readers.
 */
export declare function installFetchObserver(publisher: InspectorPublisher, options: FetchCaptureOptions): FetchObserver;
//# sourceMappingURL=network.d.ts.map