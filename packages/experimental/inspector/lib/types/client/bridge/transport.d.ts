/** Client observation and Runtime endpoint over the Inspector Worker's ingest WebSocket. */
import type { InspectorClientBootstrap } from '../../shared/bridge/messages/control.ts';
import { InspectorSourceConnection } from '../../shared/bridge/publisher.ts';
import { ClientSourceCatalog } from '../cdp/sources.ts';
import { ClientRealmSource } from '../inspection/realm.ts';
import { ClientBridgePublisher } from './publisher.ts';
import { ClientBridgeRpc } from './rpc.ts';
/** Reconnecting Client source whose bounded queue never blocks page work. */
export declare class ClientInspectorSource extends InspectorSourceConnection {
    private readonly bootstrap;
    private readonly sourceCatalog;
    private readonly realmSource;
    protected readonly publisher: ClientBridgePublisher;
    private socket;
    private generation;
    private accepted;
    private closed;
    private readonly runtime;
    private readonly runtimeRequests;
    private readonly console;
    protected readonly queries: ClientBridgeRpc;
    private readonly lifecycle;
    constructor(bootstrap: InspectorClientBootstrap, label?: string, sourceCatalog?: ClientSourceCatalog | undefined, realmSource?: ClientRealmSource);
    /** Permanently stop reconnecting and close the active source generation. */
    close(): void;
    private connect;
    private executeRuntime;
    private acknowledgeRuntime;
    private cancelRuntime;
    private cancelRuntimeSession;
    private cancelRuntimeRequests;
    private executeSourceRequest;
}
//# sourceMappingURL=transport.d.ts.map