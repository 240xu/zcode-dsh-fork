/** Lifecycle-driven Cordis tree publication shared by Host and Client plugin faces. */
import { CordisTreeCollector } from "./collector.js";
/**
 * Observe one Cordis realm and publish immutable tree replacements.
 * @param ctx - Plugin context whose root is inspected and whose effects own listeners.
 * @param listener - Consumer of complete snapshots in the inspected realm.
 * @param limits - Snapshot node and encoded-byte limits.
 * @returns A disposer that unregisters listeners and releases retained objects.
 */
export function observeCordisTree(ctx, listener, limits) {
    const collector = new CordisTreeCollector(ctx.root, limits);
    let scheduled = false;
    let closed = false;
    const publish = () => {
        scheduled = false;
        if (closed)
            return;
        listener(collector.snapshot());
    };
    const schedule = () => {
        if (scheduled || closed)
            return;
        scheduled = true;
        queueMicrotask(publish);
    };
    const disposers = [
        ctx.on('internal/plugin', schedule, { global: true }),
        ctx.on('internal/status', schedule, { global: true }),
    ];
    publish();
    return () => {
        if (closed)
            return;
        closed = true;
        for (const dispose of disposers)
            dispose();
        collector.close();
    };
}
//# sourceMappingURL=observer.js.map