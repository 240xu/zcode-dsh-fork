/** Inspector Worker assembly over one Host source port and one loopback endpoint. */
import type { MessagePort } from 'node:worker_threads';
import type { InspectorWorkerBoot } from '../shared/bridge/messages/control.ts';
import { type InspectorEndpointInfo } from './bridge/endpoint.ts';
/** Live Worker runtime. */
export interface InspectorWorkerRuntime {
    readonly endpoint: InspectorEndpointInfo;
    close(): Promise<void>;
}
/**
 * Assemble and start the Worker-owned source registry, Runtime router, Network domain, and endpoints.
 * @param boot - Validated Worker configuration and transferred Host source port.
 * @returns The listening endpoint and quiescent shutdown owner.
 */
export declare function startInspectorWorker(boot: InspectorWorkerBoot<MessagePort>): Promise<InspectorWorkerRuntime>;
//# sourceMappingURL=server.d.ts.map