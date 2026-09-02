/** Pure projection from routed Cordis snapshots to the consumer-neutral tree. */
import type { CordisTreeSnapshot } from './snapshot.ts';
import { type CordisRuntimeSourceKind, type CordisRuntimeTree } from './model.ts';
/** Whether a retained routed snapshot still has a live source generation. */
export type CordisTreeSourceConnection = {
    readonly state: 'connected';
} | {
    readonly state: 'disconnected';
    readonly reason: string;
};
/** One source generation and its latest routed Cordis snapshot. */
export interface CordisTreeSource {
    readonly sourceId: string;
    readonly kind: CordisRuntimeSourceKind;
    readonly label: string;
}
/** One source generation and its latest routed Cordis snapshot. */
export interface CordisTreeSourceSnapshot<Source extends CordisTreeSource = CordisTreeSource> {
    readonly source: Source;
    readonly snapshot: CordisTreeSnapshot;
    readonly connection: CordisTreeSourceConnection;
}
/** Routed Host and Client snapshots before consumer-neutral projection. */
export interface CordisInspectionTree<Source extends CordisTreeSource = CordisTreeSource> {
    readonly host: CordisTreeSourceSnapshot<Source> | null;
    readonly clients: readonly CordisTreeSourceSnapshot<Source>[];
}
/**
 * Strip transport and live-object routing fields from retained Cordis snapshots.
 * @param tree - Worker-owned routed snapshots.
 * @returns A detached semantic tree safe for non-CDP consumers.
 */
export declare function projectCordisRuntimeTree<Source extends CordisTreeSource>(tree: CordisInspectionTree<Source>): CordisRuntimeTree;
//# sourceMappingURL=projector.d.ts.map