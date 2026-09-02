/** Worker-owned registry of Host and Client realm definitions. */
import { ClientInspectorRealm } from "../realms/client/index.js";
/** Authoritative collection of all currently executable realms. */
export class InspectorRealmRegistry {
    host;
    clients;
    clientSources;
    clientsBySource = new Map();
    listeners = new Set();
    unsubscribeClients;
    constructor(host, clients, clientSources) {
        this.host = host;
        this.clients = clients;
        this.clientSources = clientSources;
        for (const target of clients.targets())
            this.openClient(target);
        this.unsubscribeClients = clients.subscribe((event) => { this.receiveClient(event); });
    }
    /**
     * Return the realm admission order used by every connection-local session set.
     * @returns Host followed by active Clients.
     */
    realms() {
        return [this.host, ...this.clientsBySource.values()];
    }
    /**
     * Resolve one synthetic Client execution context.
     * @param contextId - Numeric CDP execution-context id.
     * @returns The active realm when the id belongs to a Client.
     */
    byContextId(contextId) {
        for (const realm of this.clientsBySource.values()) {
            if (realm.context.kind === 'synthetic' && realm.context.id === contextId)
                return realm;
        }
        return undefined;
    }
    /**
     * Resolve one globally unique Client execution context.
     * @param uniqueId - CDP unique execution-context id.
     * @returns The active realm when the id belongs to a Client.
     */
    byUniqueContextId(uniqueId) {
        for (const realm of this.clientsBySource.values()) {
            if (realm.context.kind === 'synthetic' && realm.context.uniqueId === uniqueId)
                return realm;
        }
        return undefined;
    }
    /**
     * Resolve the realm for one active source generation.
     * @param source - Source identity retained by a Cordis tree node.
     * @returns The matching active realm.
     */
    bySource(source) {
        if (source.kind === 'host')
            return this.host;
        const realm = this.clientsBySource.get(source.sourceId);
        return realm?.descriptor.generation === source.generation ? realm : undefined;
    }
    /**
     * Subscribe to Client realm admission and removal.
     * @param listener - Registry observer.
     * @returns A disposer removing the observer.
     */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }
    /** Stop observing Client targets and clear registry listeners. */
    close() {
        this.unsubscribeClients();
        this.clientsBySource.clear();
        this.listeners.clear();
    }
    receiveClient(event) {
        if (event.type === 'opened') {
            const realm = this.openClient(event.target);
            this.emit({ type: 'opened', realm });
            return;
        }
        const realm = this.clientsBySource.get(event.target.source.sourceId);
        if (realm === undefined || realm.target !== event.target)
            return;
        this.clientsBySource.delete(event.target.source.sourceId);
        this.emit({ type: 'closed', realm });
    }
    openClient(target) {
        const realm = new ClientInspectorRealm(target, this.clients, this.clientSources);
        this.clientsBySource.set(target.source.sourceId, realm);
        return realm;
    }
    emit(event) {
        for (const listener of [...this.listeners]) {
            try {
                listener(event);
            }
            catch {
                // One DevTools connection cannot disrupt realm delivery to sibling connections.
            }
        }
    }
}
//# sourceMappingURL=realm-store.js.map