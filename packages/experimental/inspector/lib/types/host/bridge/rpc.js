/** Host-side non-CDP query bridge over the Worker MessagePort. */
import { InspectorQueryConnection } from "../../shared/bridge/rpc.js";
/** Owns query correlation for one Host source generation. */
export class HostBridgeRpc extends InspectorQueryConnection {
    port;
    constructor(port, options) {
        super(options);
        this.port = port;
    }
    /**
     * Connect query writes after the Worker accepts the Host source.
     * @param source - Accepted Host source descriptor.
     */
    connectPort(source) {
        this.connect(source.sourceId, source.generation, {
            send: (frame) => { this.port.postMessage(frame); },
        });
    }
}
//# sourceMappingURL=rpc.js.map