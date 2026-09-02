/** Shared Host/Client publication of browser-safe Cordis snapshots. */
import { CORDIS_TREE_TOPIC } from "../bridge/messages/cordis.js";
import { observeCordisTree } from "./observer.js";
/**
 * Observe one Cordis runtime and retain its latest source snapshot.
 * @param ctx - Plugin context whose root is inspected.
 * @param publisher - Active Host or Client source publisher.
 * @param limits - Snapshot node and encoded-byte limits.
 * @returns A disposer that stops observation and releases retained objects.
 */
export function publishCordisTree(ctx, publisher, limits) {
    return observeCordisTree(ctx, (snapshot) => {
        publisher.setState(CORDIS_TREE_TOPIC, snapshot);
    }, limits);
}
//# sourceMappingURL=publisher.js.map