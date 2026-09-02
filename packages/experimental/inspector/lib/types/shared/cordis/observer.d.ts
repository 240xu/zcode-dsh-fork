/** Lifecycle-driven Cordis tree publication shared by Host and Client plugin faces. */
import type { Context } from '@deepseek-ai/cordis';
import type { CordisTreeSnapshot } from './snapshot.ts';
import { type CordisTreeLimits } from './collector.ts';
/** Receives one complete semantic snapshot after a coalesced Cordis mutation. */
export type CordisTreeSnapshotListener = (snapshot: CordisTreeSnapshot) => void;
/**
 * Observe one Cordis realm and publish immutable tree replacements.
 * @param ctx - Plugin context whose root is inspected and whose effects own listeners.
 * @param listener - Consumer of complete snapshots in the inspected realm.
 * @param limits - Snapshot node and encoded-byte limits.
 * @returns A disposer that unregisters listeners and releases retained objects.
 */
export declare function observeCordisTree(ctx: Context, listener: CordisTreeSnapshotListener, limits: CordisTreeLimits): () => void;
//# sourceMappingURL=observer.d.ts.map