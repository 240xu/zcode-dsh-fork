/** Shared Host/Client publication of browser-safe Cordis snapshots. */
import type { Context } from '@deepseek-ai/cordis';
import type { InspectorStatePublisher } from '../bridge/publisher.ts';
import type { CordisTreeLimits } from './collector.ts';
/**
 * Observe one Cordis runtime and retain its latest source snapshot.
 * @param ctx - Plugin context whose root is inspected.
 * @param publisher - Active Host or Client source publisher.
 * @param limits - Snapshot node and encoded-byte limits.
 * @returns A disposer that stops observation and releases retained objects.
 */
export declare function publishCordisTree(ctx: Context, publisher: InspectorStatePublisher, limits: CordisTreeLimits): () => void;
//# sourceMappingURL=publisher.d.ts.map