/** Worker-owned HTTP discovery, DevTools CDP, and Client-ingest endpoints. */
import type { InspectorWorkerConfig } from '../../shared/bridge/messages/control.ts';
import type { NetworkDomain } from '../cdp/domains/network/session.ts';
import type { CordisDomBackend } from '../cdp/domains/dom/index.ts';
import type { CordisRuntimeTreeReader } from '../../shared/cordis/reader.ts';
import type { InspectorQueryRouter } from '../inspection/query-router.ts';
import type { InspectorRealmRegistry } from '../inspection/realm-store.ts';
import type { InspectorSourceRegistry } from './hub.ts';
/** Bound endpoint information returned to the Host controller. */
export interface InspectorEndpointInfo {
    readonly host: string;
    readonly port: number;
    readonly targetId: string;
}
/** Worker-owned network endpoint. */
export declare class InspectorEndpoint {
    private readonly config;
    private readonly sources;
    private readonly network;
    private readonly realms;
    private readonly cordisDom;
    private readonly cordisTrees;
    private readonly queries;
    private server;
    private readonly cdpServer;
    private readonly ingestServer;
    private readonly cdpSessions;
    private readonly ingestConnections;
    constructor(config: InspectorWorkerConfig, sources: InspectorSourceRegistry, network: NetworkDomain, realms: InspectorRealmRegistry, cordisDom: CordisDomBackend, cordisTrees: CordisRuntimeTreeReader, queries: InspectorQueryRouter);
    /**
     * Bind the loopback endpoint.
     * @returns The actual bound address and target id.
     */
    start(): Promise<InspectorEndpointInfo>;
    /** Stop admission, dispose CDP sessions, terminate sockets, and await server close. */
    close(): Promise<void>;
    private handleHttp;
    private handleUpgrade;
    private acceptCdp;
    private acceptIngest;
    private authorizedClient;
    private target;
    private cdpUrl;
    private boundPort;
    private createServer;
    private requireServer;
    private json;
}
//# sourceMappingURL=endpoint.d.ts.map