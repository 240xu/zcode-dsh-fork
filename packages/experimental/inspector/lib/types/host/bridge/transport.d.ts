/** Host-realm observation publisher over a dedicated MessagePort. */
import type { MessagePort } from 'node:worker_threads';
import { InspectorSourceConnection } from '../../shared/bridge/publisher.ts';
import { HostBridgePublisher } from './publisher.ts';
import { HostBridgeRpc } from './rpc.ts';
/** Buffer limits for one source publisher. */
export interface HostSourceOptions {
    readonly label: string;
    readonly topics: readonly string[];
    readonly maxQueuedRecords: number;
    readonly maxQueuedBytes: number;
    readonly maxRecordsPerFrame: number;
    readonly maxFrameBytes: number;
    readonly queryTimeoutMs: number;
}
/** Non-blocking Host source; queue overflow is represented by `droppedBefore` on the next batch. */
export declare class HostInspectorSource extends InspectorSourceConnection {
    private readonly port;
    private readonly source;
    protected readonly publisher: HostBridgePublisher;
    private closed;
    protected readonly queries: HostBridgeRpc;
    constructor(port: MessagePort, options: HostSourceOptions);
    /** Flush pending observations and close the source port. */
    close(): void;
    private receive;
}
//# sourceMappingURL=transport.d.ts.map