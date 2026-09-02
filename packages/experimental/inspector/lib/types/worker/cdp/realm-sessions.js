/** Per-DevTools-connection sessions opened from the shared realm registry. */
import { randomUUID } from 'node:crypto';
import { inspectorId } from "../../shared/identity.js";
/** Owns exactly one backend session per active realm for one DevTools connection. */
export class InspectorRealmSessionSet {
    realms;
    /** Opaque identity shared by every domain and object table on this DevTools connection. */
    connectionId = inspectorId(randomUUID(), 'connectionId');
    sessions = new Map();
    listeners = new Set();
    unsubscribeRealms;
    closed = false;
    constructor(realms) {
        this.realms = realms;
        for (const realm of realms.realms())
            this.open(realm);
        this.unsubscribeRealms = realms.subscribe((event) => { this.receiveRealm(event); });
    }
    /**
     * Return active sessions in the registry's deterministic order.
     * @returns Host followed by connected Clients.
     */
    all() {
        return this.realms.realms()
            .map(realm => this.sessions.get(realm.descriptor.realmId))
            .filter((session) => session !== undefined);
    }
    /**
     * Return the required Host session.
     * @returns The connection-local Host realm session.
     */
    host() {
        const session = this.sessions.get(this.realms.host.descriptor.realmId);
        if (session === undefined)
            throw new Error('Host Inspector realm session is unavailable');
        return session;
    }
    /**
     * Resolve one synthetic Client context.
     * @param contextId - Numeric CDP execution-context id.
     * @returns Its realm session when currently connected.
     */
    byContextId(contextId) {
        const realm = this.realms.byContextId(contextId);
        return realm === undefined ? undefined : this.sessions.get(realm.descriptor.realmId);
    }
    /**
     * Resolve one globally unique Client context.
     * @param uniqueId - CDP unique execution-context id.
     * @returns Its realm session when currently connected.
     */
    byUniqueContextId(uniqueId) {
        const realm = this.realms.byUniqueContextId(uniqueId);
        return realm === undefined ? undefined : this.sessions.get(realm.descriptor.realmId);
    }
    /**
     * Resolve one active source generation to this connection's realm session.
     * @param source - Source identity retained by a Cordis tree node.
     * @returns The matching realm session.
     */
    bySource(source) {
        const realm = this.realms.bySource(source);
        return realm === undefined ? undefined : this.sessions.get(realm.descriptor.realmId);
    }
    /**
     * Subscribe to connection-local realm session lifecycle.
     * @param listener - Session observer.
     * @returns A disposer removing the observer.
     */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }
    /** Close all realm sessions and stop tracking the registry. */
    close() {
        if (this.closed)
            return;
        this.closed = true;
        this.unsubscribeRealms();
        for (const session of this.sessions.values())
            session.close();
        this.sessions.clear();
        this.listeners.clear();
    }
    receiveRealm(event) {
        if (event.type === 'opened') {
            const session = this.open(event.realm);
            this.emit({ type: 'opened', session });
            return;
        }
        const session = this.sessions.get(event.realm.descriptor.realmId);
        if (session === undefined)
            return;
        this.sessions.delete(event.realm.descriptor.realmId);
        session.close();
        this.emit({ type: 'closed', session });
    }
    open(realm) {
        const session = realm.openSession();
        this.sessions.set(realm.descriptor.realmId, session);
        return session;
    }
    emit(event) {
        for (const listener of [...this.listeners]) {
            try {
                listener(event);
            }
            catch {
                // One CDP domain cannot prevent sibling domains from observing realm lifecycle.
            }
        }
    }
}
//# sourceMappingURL=realm-sessions.js.map