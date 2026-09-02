/** Worker projection from Cordis snapshots to a connection-neutral semantic DOM. */
import type { InspectorSourceDescriptor } from '../../../../shared/bridge/messages/observation.ts';
import type { InspectorObjectReference } from '../../../../shared/cordis/object-reference.ts';
import type { InspectorRealmDescriptor } from '../../../inspection/realm.ts';
import { type CdpBackendNodeId } from '../../ids.ts';
import type { CordisTreeObjectRoute, CordisTreeStore } from '../../../inspection/cordis-store.ts';
/** One Worker-global backend node independent of any DevTools connection. */
export interface CordisDomNode {
    readonly backendNodeId: CdpBackendNodeId;
    readonly key: string;
    readonly name: string;
    readonly attributes: readonly (readonly [string, string])[];
    readonly description: string;
    readonly object?: CordisTreeObjectRoute;
    readonly children: readonly CordisDomNode[];
}
/** Immutable document revision shared by all current DevTools sessions. */
export interface CordisDomDocument {
    readonly revision: number;
    readonly root: CordisDomNode;
    readonly byBackendId: ReadonlyMap<CdpBackendNodeId, CordisDomNode>;
    readonly parentByBackendId: ReadonlyMap<CdpBackendNodeId, CdpBackendNodeId>;
}
/** One structural or attribute mutation between two projected documents. */
export type CordisDomMutation = {
    readonly type: 'document-updated';
} | {
    readonly type: 'child-inserted';
    readonly parentBackendNodeId: CdpBackendNodeId;
    readonly previousBackendNodeId: CdpBackendNodeId | 0;
    readonly node: CordisDomNode;
} | {
    readonly type: 'child-removed';
    readonly parentBackendNodeId: CdpBackendNodeId;
    readonly node: CordisDomNode;
} | {
    readonly type: 'children-replaced';
    readonly parentBackendNodeId: CdpBackendNodeId;
    readonly children: readonly CordisDomNode[];
} | {
    readonly type: 'attribute-modified';
    readonly backendNodeId: CdpBackendNodeId;
    readonly name: string;
    readonly value: string;
} | {
    readonly type: 'attribute-removed';
    readonly backendNodeId: CdpBackendNodeId;
    readonly name: string;
};
/** A visible incremental mutation or an in-place source availability change. */
export type CordisDomChange = {
    readonly type: 'tree-mutated';
    readonly mutations: readonly CordisDomMutation[];
} | {
    readonly type: 'source-disconnected';
    readonly source: InspectorSourceDescriptor;
};
/** Assigns durable backend ids and projects the latest source snapshots. */
export declare class CordisDomBackend {
    private readonly trees;
    private readonly backendIdByKey;
    private readonly listeners;
    private documentValue;
    private nextBackendNodeId;
    private nextRevision;
    private readonly unsubscribe;
    private readonly nodeByObject;
    constructor(trees: CordisTreeStore);
    /**
     * Read the latest connection-neutral semantic document.
     * @returns The current immutable document revision.
     */
    document(): CordisDomDocument;
    /**
     * Subscribe to full document replacements and in-place realm state changes.
     * @param listener - Called after a new backend revision is installed.
     * @returns A disposer removing the listener.
     */
    subscribe(listener: (event: CordisDomChange) => void): () => void;
    /** Release repository subscriptions at Worker shutdown. */
    close(): void;
    /**
     * Resolve one source-local object reference to its current projected node.
     * @param source - Connected source generation that owns the reference.
     * @param reference - Realm-local registry and object handle.
     * @returns The current projected node, when present.
     */
    nodeForObject(source: InspectorSourceDescriptor, reference: InspectorObjectReference): CordisDomNode | undefined;
    /**
     * Resolve a reference when a Runtime route identifies only Host or Client ownership.
     * @param kind - Host or Client ownership inferred by the Runtime adapter.
     * @param reference - Realm-local registry and object handle.
     * @returns The current projected node, when present.
     */
    nodeForObjectKind(kind: InspectorSourceDescriptor['kind'], reference: InspectorObjectReference): CordisDomNode | undefined;
    /**
     * Resolve one realm-neutral Runtime reference to its current projected node.
     * @param realm - Realm that exposed the Runtime object.
     * @param reference - Realm-local registry and object handle.
     * @returns The current projected node, when present.
     */
    nodeForRealm(realm: InspectorRealmDescriptor, reference: InspectorObjectReference): CordisDomNode | undefined;
    private build;
    private entity;
    private node;
    private emit;
}
//# sourceMappingURL=model.d.ts.map