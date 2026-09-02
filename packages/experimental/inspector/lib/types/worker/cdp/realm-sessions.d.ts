/** Per-DevTools-connection sessions opened from the shared realm registry. */
import type { InspectorSourceDescriptor } from '../../shared/bridge/messages/observation.ts';
import type { InspectorRealmRegistry } from '../inspection/realm-store.ts';
import type { InspectorRealmSession } from '../inspection/realm.ts';
import type { InspectorConnectionId } from './ids.ts';
/** Realm-session lifecycle observed by connection-local CDP domains. */
export type InspectorRealmSessionEvent = {
    readonly type: 'opened';
    readonly session: InspectorRealmSession;
} | {
    readonly type: 'closed';
    readonly session: InspectorRealmSession;
};
/** Owns exactly one backend session per active realm for one DevTools connection. */
export declare class InspectorRealmSessionSet {
    private readonly realms;
    /** Opaque identity shared by every domain and object table on this DevTools connection. */
    readonly connectionId: InspectorConnectionId;
    private readonly sessions;
    private readonly listeners;
    private readonly unsubscribeRealms;
    private closed;
    constructor(realms: InspectorRealmRegistry);
    /**
     * Return active sessions in the registry's deterministic order.
     * @returns Host followed by connected Clients.
     */
    all(): InspectorRealmSession[];
    /**
     * Return the required Host session.
     * @returns The connection-local Host realm session.
     */
    host(): InspectorRealmSession;
    /**
     * Resolve one synthetic Client context.
     * @param contextId - Numeric CDP execution-context id.
     * @returns Its realm session when currently connected.
     */
    byContextId(contextId: number): InspectorRealmSession | undefined;
    /**
     * Resolve one globally unique Client context.
     * @param uniqueId - CDP unique execution-context id.
     * @returns Its realm session when currently connected.
     */
    byUniqueContextId(uniqueId: string): InspectorRealmSession | undefined;
    /**
     * Resolve one active source generation to this connection's realm session.
     * @param source - Source identity retained by a Cordis tree node.
     * @returns The matching realm session.
     */
    bySource(source: InspectorSourceDescriptor): InspectorRealmSession | undefined;
    /**
     * Subscribe to connection-local realm session lifecycle.
     * @param listener - Session observer.
     * @returns A disposer removing the observer.
     */
    subscribe(listener: (event: InspectorRealmSessionEvent) => void): () => void;
    /** Close all realm sessions and stop tracking the registry. */
    close(): void;
    private receiveRealm;
    private open;
    private emit;
}
//# sourceMappingURL=realm-sessions.d.ts.map