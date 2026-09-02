/** Worker-owned registry of Host and Client realm definitions. */
import type { ClientRuntimeRouter } from '../bridge/runtime-rpc.ts';
import type { ClientSourceRouter } from '../bridge/source-rpc.ts';
import type { InspectorSourceDescriptor } from '../../shared/bridge/messages/observation.ts';
import type { InspectorRealm } from './realm.ts';
/** Realm admission and removal observed by each DevTools connection. */
export type InspectorRealmEvent = {
    readonly type: 'opened';
    readonly realm: InspectorRealm;
} | {
    readonly type: 'closed';
    readonly realm: InspectorRealm;
};
/** Authoritative collection of all currently executable realms. */
export declare class InspectorRealmRegistry {
    readonly host: InspectorRealm;
    private readonly clients;
    private readonly clientSources;
    private readonly clientsBySource;
    private readonly listeners;
    private readonly unsubscribeClients;
    constructor(host: InspectorRealm, clients: ClientRuntimeRouter, clientSources: ClientSourceRouter);
    /**
     * Return the realm admission order used by every connection-local session set.
     * @returns Host followed by active Clients.
     */
    realms(): InspectorRealm[];
    /**
     * Resolve one synthetic Client execution context.
     * @param contextId - Numeric CDP execution-context id.
     * @returns The active realm when the id belongs to a Client.
     */
    byContextId(contextId: number): InspectorRealm | undefined;
    /**
     * Resolve one globally unique Client execution context.
     * @param uniqueId - CDP unique execution-context id.
     * @returns The active realm when the id belongs to a Client.
     */
    byUniqueContextId(uniqueId: string): InspectorRealm | undefined;
    /**
     * Resolve the realm for one active source generation.
     * @param source - Source identity retained by a Cordis tree node.
     * @returns The matching active realm.
     */
    bySource(source: InspectorSourceDescriptor): InspectorRealm | undefined;
    /**
     * Subscribe to Client realm admission and removal.
     * @param listener - Registry observer.
     * @returns A disposer removing the observer.
     */
    subscribe(listener: (event: InspectorRealmEvent) => void): () => void;
    /** Stop observing Client targets and clear registry listeners. */
    close(): void;
    private receiveClient;
    private openClient;
    private emit;
}
//# sourceMappingURL=realm-store.d.ts.map