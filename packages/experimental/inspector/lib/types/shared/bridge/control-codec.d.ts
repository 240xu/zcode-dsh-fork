/** Exact decoders for Host, Worker, and injected Client lifecycle values. */
import type { InspectorClientBootstrap, InspectorHostControl, InspectorWorkerConfig, InspectorWorkerControl } from './messages/control.ts';
/**
 * Decode the structured-cloned Worker configuration.
 * @param value - Untrusted workerData config value.
 * @returns The validated Worker configuration.
 */
export declare function parseInspectorWorkerConfig(value: unknown): InspectorWorkerConfig;
/**
 * Decode one Host-to-Worker lifecycle command.
 * @param value - Untrusted control message.
 * @returns The validated Host command.
 */
export declare function parseInspectorHostControl(value: unknown): InspectorHostControl;
/**
 * Decode one Worker-to-Host lifecycle event.
 * @param value - Untrusted control message.
 * @returns The validated Worker event.
 */
export declare function parseInspectorWorkerControl(value: unknown): InspectorWorkerControl;
/**
 * Decode bootstrap data injected into the browser global.
 * @param value - Untrusted injected value.
 * @returns The validated Client bootstrap.
 */
export declare function parseInspectorClientBootstrap(value: unknown): InspectorClientBootstrap;
//# sourceMappingURL=control-codec.d.ts.map