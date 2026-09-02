/** Host-realm observation publisher over a dedicated MessagePort. */
import { INSPECTOR_PROTOCOL_VERSION, parseWorkerSourceFrame, } from "../../shared/bridge/messages/observation.js";
import { InspectorSourceConnection } from "../../shared/bridge/publisher.js";
import { createHostRealmSource } from "../inspection/realm.js";
import { HostBridgePublisher } from "./publisher.js";
import { HostBridgeRpc } from "./rpc.js";
import { dispatchBridgeFrame } from "./dispatcher.js";
/** Non-blocking Host source; queue overflow is represented by `droppedBefore` on the next batch. */
export class HostInspectorSource extends InspectorSourceConnection {
    port;
    source;
    publisher;
    closed = false;
    queries;
    constructor(port, options) {
        super();
        this.port = port;
        this.source = createHostRealmSource(options.label);
        this.publisher = new HostBridgePublisher(port, this.source, options);
        this.queries = new HostBridgeRpc(port, {
            timeoutMs: options.queryTimeoutMs,
            maxFrameBytes: options.maxFrameBytes,
        });
        port.on('message', (value) => {
            try {
                if (this.queries.receive(value))
                    return;
                this.receive(parseWorkerSourceFrame(value));
            }
            catch {
                this.close();
            }
        });
        port.on('close', () => { this.queries.disconnect('Inspector Host source disconnected'); });
        port.start();
        const open = {
            v: INSPECTOR_PROTOCOL_VERSION,
            t: 'source/open',
            source: this.source,
            topics: [...options.topics],
        };
        port.postMessage(open);
        this.publisher.replace();
    }
    /** Flush pending observations and close the source port. */
    close() {
        if (this.closed)
            return;
        this.publisher.close();
        this.closed = true;
        this.queries.close('Inspector Host source closed');
        const frame = {
            v: INSPECTOR_PROTOCOL_VERSION,
            t: 'source/close',
            sourceId: this.source.sourceId,
            generation: this.source.generation,
        };
        this.port.postMessage(frame);
        this.port.close();
    }
    receive(frame) {
        if (frame.t !== 'source/rejected'
            && (frame.sourceId !== this.source.sourceId || frame.generation !== this.source.generation))
            return;
        dispatchBridgeFrame(frame, {
            accepted: () => { this.queries.connectPort(this.source); },
            acknowledged: (acknowledged) => { this.publisher.acknowledge(acknowledged.nextSequence); },
            resnapshot: () => { this.publisher.replace(); },
            rejected: (rejected) => { this.queries.disconnect(`Inspector Host source rejected: ${rejected.message}`); },
        });
    }
}
//# sourceMappingURL=transport.js.map