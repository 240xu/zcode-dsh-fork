/** Opaque references to live objects retained inside an observation source realm. */
import { exactObject, wireId } from "../validation.js";
/**
 * Decode one source-local live-object reference.
 * @param value - Untrusted wire value.
 * @returns The validated opaque reference.
 */
export function parseInspectorObjectReference(value) {
    const record = exactObject(value, ['registryId', 'handle'], 'object reference');
    return {
        registryId: wireId(record.registryId, 'registryId'),
        handle: wireId(record.handle, 'handle'),
    };
}
//# sourceMappingURL=object-reference.js.map