/** Inspector Worker assembly over one Host source port and one loopback endpoint. */
import { createCordisRuntimeTreeReader } from "../shared/cordis/reader.js";
import { NetworkDomain } from "./cdp/domains/network/session.js";
import { NetworkStore } from "./inspection/network-store.js";
import { CordisDomBackend } from "./cdp/domains/dom/index.js";
import { ClientRuntimeRouter } from "./bridge/runtime-rpc.js";
import { ClientSourceRouter } from "./bridge/source-rpc.js";
import { CordisTreeStore } from "./inspection/cordis-store.js";
import { InspectorEndpoint } from "./bridge/endpoint.js";
import { InspectorQueryRouter } from "./inspection/query-router.js";
import { InspectorRealmRegistry } from "./inspection/realm-store.js";
import { HostInspectorRealm } from "./realms/host/index.js";
import { InspectorSourceRegistry } from "./bridge/hub.js";
/**
 * Assemble and start the Worker-owned source registry, Runtime router, Network domain, and endpoints.
 * @param boot - Validated Worker configuration and transferred Host source port.
 * @returns The listening endpoint and quiescent shutdown owner.
 */
export async function startInspectorWorker(boot) {
    const networkStore = new NetworkStore({
        maxRetainedRequests: boot.config.maxRetainedRequests,
        maxJournalBytes: boot.config.maxJournalBytes,
    });
    const network = new NetworkDomain(networkStore);
    const cordisTrees = new CordisTreeStore({
        maxNodes: boot.config.maxCordisNodes,
        maxDisconnectedTrees: boot.config.maxDisconnectedCordisTrees,
    });
    const sources = new InspectorSourceRegistry([networkStore, cordisTrees], boot.config.maxSourceFrameBytes, boot.config.maxSourceRecordsPerFrame);
    const clientRuntime = new ClientRuntimeRouter(sources, boot.config.clientRuntimeTimeoutMs);
    const clientSources = new ClientSourceRouter(sources, boot.config.clientRuntimeTimeoutMs, boot.config.maxClientSourceBytes, boot.config.maxSourceFrameBytes);
    const realms = new InspectorRealmRegistry(new HostInspectorRealm('Host'), clientRuntime, clientSources);
    const cordisDom = new CordisDomBackend(cordisTrees);
    const cordisReader = createCordisRuntimeTreeReader(() => cordisTrees.readTree());
    const queries = new InspectorQueryRouter(cordisReader, boot.config.maxSourceFrameBytes);
    const unsubscribeQueries = sources.subscribeEvents((event) => {
        if (event.type === 'closed')
            queries.disconnect(event.source);
    });
    const hostQueries = queries.open({
        send: (frame) => { boot.hostSourcePort.postMessage(frame); },
        close: () => { boot.hostSourcePort.close(); },
    });
    const hostConnection = {
        kind: 'host',
        send: (frame) => {
            boot.hostSourcePort.postMessage(frame);
            if (frame.t === 'source/accepted')
                hostQueries.accept(frame.sourceId, frame.generation);
        },
        close: () => { boot.hostSourcePort.close(); },
    };
    boot.hostSourcePort.on('message', (value) => {
        if (!hostQueries.receive(value))
            sources.receive(hostConnection, value);
    });
    boot.hostSourcePort.on('close', () => {
        hostQueries.close();
        sources.disconnect(hostConnection, 'Host source disconnected');
    });
    boot.hostSourcePort.start();
    const endpointOwner = new InspectorEndpoint(boot.config, sources, network, realms, cordisDom, cordisReader, queries);
    const endpoint = await endpointOwner.start();
    let closed;
    return {
        endpoint,
        close() {
            closed ??= (async () => {
                await endpointOwner.close();
                network.close();
                networkStore.dispose();
                cordisDom.close();
                realms.close();
                clientRuntime.close();
                clientSources.close();
                hostQueries.close();
                sources.close();
                unsubscribeQueries();
                queries.close();
                boot.hostSourcePort.close();
            })();
            return closed;
        },
    };
}
//# sourceMappingURL=server.js.map