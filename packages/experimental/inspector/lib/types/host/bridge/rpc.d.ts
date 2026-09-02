/** Host-side non-CDP query bridge over the Worker MessagePort. */
import type { MessagePort } from 'node:worker_threads';
import type { InspectorSourceDescriptor } from '../../shared/bridge/messages/observation.ts';
import { InspectorQueryConnection, type InspectorQueryConnectionOptions } from '../../shared/bridge/rpc.ts';
/** Owns query correlation for one Host source generation. */
export declare class HostBridgeRpc extends InspectorQueryConnection {
    private readonly port;
    constructor(port: MessagePort, options: InspectorQueryConnectionOptions);
    /**
     * Connect query writes after the Worker accepts the Host source.
     * @param source - Accepted Host source descriptor.
     */
    connectPort(source: InspectorSourceDescriptor): void;
}
//# sourceMappingURL=rpc.d.ts.map