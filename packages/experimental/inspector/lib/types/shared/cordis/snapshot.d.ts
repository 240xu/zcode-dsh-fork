/** CDP-independent snapshot model for a Cordis Context and Fiber tree. */
import { type InspectorObjectHandle, type InspectorObjectRegistryId } from './ids.ts';
/** Current serialized Cordis tree model version. */
export declare const CORDIS_TREE_SCHEMA_VERSION: 0;
/** Maximum nesting accepted from one realm snapshot. */
export declare const CORDIS_TREE_MAX_DEPTH = 256;
interface CordisTreeNodeBase {
    readonly objectHandle: InspectorObjectHandle;
}
/** One Context entity in a Cordis tree snapshot. */
export interface CordisContextTreeNode extends CordisTreeNodeBase {
    readonly kind: 'context';
    readonly children: readonly CordisTreeNode[];
}
/** One Fiber entity in a Cordis tree snapshot. */
export interface CordisFiberTreeNode extends CordisTreeNodeBase {
    readonly kind: 'fiber';
    readonly uid: number;
    readonly children: readonly [CordisContextTreeNode];
}
/** One semantic entity node in preorder. */
export type CordisTreeNode = CordisContextTreeNode | CordisFiberTreeNode;
/** Immutable, serializable state of one realm's reachable Cordis tree. */
export interface CordisTreeSnapshot {
    readonly schemaVersion: typeof CORDIS_TREE_SCHEMA_VERSION;
    readonly revision: number;
    readonly objectRegistryId: InspectorObjectRegistryId;
    readonly root: CordisContextTreeNode;
    readonly truncated: boolean;
}
/**
 * Decode and validate one complete Cordis tree replacement.
 * @param value - Untrusted observation payload.
 * @param maxNodes - Maximum nodes admitted from one source.
 * @returns A detached, validated snapshot.
 */
export declare function parseCordisTreeSnapshot(value: unknown, maxNodes: number): CordisTreeSnapshot;
export {};
//# sourceMappingURL=snapshot.d.ts.map