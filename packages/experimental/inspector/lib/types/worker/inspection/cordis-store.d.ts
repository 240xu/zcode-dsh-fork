/** Worker-owned repository of CDP-independent Cordis tree snapshots. */
import { type CordisTreeNode } from '../../shared/cordis/snapshot.ts';
import type { InspectorSourceDescriptor } from '../../shared/bridge/messages/observation.ts';
import type { InspectorSourceGeneration, InspectorSourceId } from '../../shared/bridge/ids.ts';
import type { InspectorObjectReference } from '../../shared/cordis/object-reference.ts';
import { type CordisInspectionTree as SharedCordisInspectionTree, type CordisTreeSourceSnapshot as SharedCordisTreeSourceSnapshot } from '../../shared/cordis/projector.ts';
import type { CordisRuntimeTree } from '../../shared/cordis/model.ts';
import type { IngestedInspectorRecord, InspectorRecordConsumer } from '../bridge/hub.ts';
/** Routed Worker snapshot retaining its complete source-generation descriptor. */
export type CordisTreeSourceSnapshot = SharedCordisTreeSourceSnapshot<InspectorSourceDescriptor>;
/** Routed Host and Client snapshots retained by the Worker. */
export type CordisInspectionTree = SharedCordisInspectionTree<InspectorSourceDescriptor>;
export type { CordisTreeSourceConnection } from '../../shared/cordis/projector.ts';
/** One object-backed tree node with its owning source generation. */
export interface CordisTreeObjectRoute extends CordisTreeSourceSnapshot {
    readonly node: CordisTreeNode;
}
/** Store mutation consumed by presentation adapters. */
export type CordisTreeStoreEvent = {
    readonly type: 'snapshot-changed';
    readonly source: InspectorSourceDescriptor;
} | {
    readonly type: 'source-disconnected';
    readonly source: InspectorSourceDescriptor;
};
/** Independent bounds for live tree size and retained disconnected snapshots. */
export interface CordisTreeStoreOptions {
    readonly maxNodes: number;
    readonly maxDisconnectedTrees: number;
}
/** Validated latest-value store consumed independently by CDP and future query adapters. */
export declare class CordisTreeStore implements InspectorRecordConsumer {
    private readonly options;
    readonly topics: Set<string>;
    private readonly trees;
    private readonly disconnected;
    private readonly listeners;
    constructor(options: CordisTreeStoreOptions);
    /** Replace all retained state for one source generation. */
    replace(source: InspectorSourceDescriptor, records: readonly IngestedInspectorRecord[]): void;
    /** Apply later state replacements, ignoring unrelated observation topics. */
    append(source: InspectorSourceDescriptor, records: readonly IngestedInspectorRecord[]): void;
    /** Freeze a closed source generation's last tree and invalidate its object routes. */
    close(source: InspectorSourceDescriptor, reason: string): void;
    /**
     * Read all current realm snapshots without CDP identifiers.
     * @returns Snapshots in source admission order.
     */
    snapshots(): CordisTreeSourceSnapshot[];
    /**
     * Compose the common realm model into Host and Client slots.
     * @returns A detached view whose Host and Client entries share one type.
     */
    tree(): CordisInspectionTree;
    /**
     * Read a detached semantic tree without object-routing or CDP identifiers.
     * @returns The latest retained Host and Client topology.
     */
    readTree(): CordisRuntimeTree;
    /**
     * Resolve a source-local object reference to its semantic tree node.
     * @param source - Active source generation.
     * @param reference - Realm-local registry and object handle.
     * @returns The matching node while its source remains connected.
     */
    resolveObject(source: InspectorSourceDescriptor, reference: InspectorObjectReference): CordisTreeObjectRoute | undefined;
    /**
     * Resolve a source-local object without requiring the source's presentation fields.
     * @param sourceId - Logical source identity.
     * @param generation - Active source generation.
     * @param reference - Realm-local object reference.
     * @returns The matching live tree node.
     */
    resolveObjectIdentity(sourceId: InspectorSourceId, generation: InspectorSourceGeneration, reference: InspectorObjectReference): CordisTreeObjectRoute | undefined;
    /**
     * Resolve a live reference when only its source realm kind is known.
     * @param kind - Host or Client ownership inferred by the Runtime adapter.
     * @param reference - Realm-local registry and object handle.
     * @returns The matching connected node, when present.
     */
    resolveObjectInKind(kind: InspectorSourceDescriptor['kind'], reference: InspectorObjectReference): CordisTreeObjectRoute | undefined;
    /**
     * Subscribe to accepted tree replacements and source availability changes.
     * @param listener - Repository observer.
     * @returns A disposer removing the observer.
     */
    subscribe(listener: (event: CordisTreeStoreEvent) => void): () => void;
    private latest;
    private install;
    private remove;
    private route;
    private emit;
}
//# sourceMappingURL=cordis-store.d.ts.map