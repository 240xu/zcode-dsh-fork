/** One DevTools connection: explicit local-domain routing plus a private Host V8 session. */
import { type CdpTransport } from './protocol.ts';
import { NetworkDomain, type NetworkSink } from './domains/network/session.ts';
import { type CdpTargetDescriptor } from './target.ts';
import { type CordisDomBackend } from './domains/dom/index.ts';
import type { InspectorSourceRegistry } from '../bridge/hub.ts';
import type { InspectorRealmRegistry } from '../inspection/realm-store.ts';
import type { CordisRuntimeTreeReader } from '../../shared/cordis/reader.ts';
/** Per-connection CDP dispatcher. */
export declare class CdpSession implements NetworkSink {
    private readonly transport;
    private readonly target;
    private readonly sources;
    private readonly network;
    private readonly cordisTrees;
    private readonly realms;
    private readonly nativeDomains;
    private readonly runtime;
    private readonly debugger;
    private readonly dom;
    private diagnosticsEnabled;
    private readonly unsubscribeSources;
    constructor(transport: CdpTransport, target: CdpTargetDescriptor, sources: InspectorSourceRegistry, network: NetworkDomain, realmRegistry: InspectorRealmRegistry, domBackend: CordisDomBackend, cordisTrees: CordisRuntimeTreeReader);
    /**
     * Parse and dispatch one raw CDP request. Invalid frames close this client only.
     * @param value - Untrusted decoded WebSocket payload.
     */
    receive(value: unknown): void;
    /** Push one CDP event. */
    sendEvent(method: string, params: Readonly<Record<string, unknown>>): void;
    /** Release every connection-owned V8 and domain resource. */
    close(): void;
}
//# sourceMappingURL=session.d.ts.map