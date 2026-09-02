/** Opaque references to live objects retained inside an observation source realm. */
import type { InspectorObjectHandle, InspectorObjectRegistryId } from './ids.ts';
/** Wire-safe identity of one live object; the source generation supplies the realm identity. */
export interface InspectorObjectReference {
    readonly registryId: InspectorObjectRegistryId;
    readonly handle: InspectorObjectHandle;
}
/**
 * Decode one source-local live-object reference.
 * @param value - Untrusted wire value.
 * @returns The validated opaque reference.
 */
export declare function parseInspectorObjectReference(value: unknown): InspectorObjectReference;
//# sourceMappingURL=object-reference.d.ts.map