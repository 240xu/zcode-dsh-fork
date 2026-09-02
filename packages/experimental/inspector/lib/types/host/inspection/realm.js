/** Stable descriptor for the Host observation source generation. */
import { randomUUID } from 'node:crypto';
import { inspectorId } from "../../shared/identity.js";
import { bridgeCapabilities } from "../cdp/index.js";
/**
 * Create the descriptor for one Host-to-Worker MessagePort generation.
 * @param label - Human-readable Host execution-context label.
 * @returns The complete Host source descriptor.
 */
export function createHostRealmSource(label) {
    return {
        sourceId: inspectorId(`host-${randomUUID()}`, 'sourceId'),
        generation: inspectorId(randomUUID(), 'generation'),
        kind: 'host',
        label,
        timeOriginMs: performance.timeOrigin,
        capabilities: bridgeCapabilities('', false),
    };
}
//# sourceMappingURL=realm.js.map