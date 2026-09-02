/** Lazy Client property enumeration for `Runtime.getProperties`. */
import type { ClientRuntimeGetPropertiesCommand, ClientRuntimeInternalPropertyDescriptor, ClientRuntimePropertyDescriptor } from '../../shared/bridge/messages/runtime/index.ts';
import { ClientObjectStore, type ClientObjectAllocation } from './objects.ts';
/**
 * Read property descriptors without invoking getters.
 * @param objects - Object table that owns the requested handle.
 * @param command - Validated property request.
 * @param maxProperties - Maximum descriptors returned by this operation.
 * @param allocation - Current operation's object-allocation identity.
 * @returns Own or inherited descriptors and the immediate prototype.
 */
export declare function getClientProperties(objects: ClientObjectStore, command: ClientRuntimeGetPropertiesCommand, maxProperties: number, allocation: ClientObjectAllocation): {
    readonly properties: readonly ClientRuntimePropertyDescriptor[];
    readonly internalProperties?: readonly ClientRuntimeInternalPropertyDescriptor[];
};
//# sourceMappingURL=properties.d.ts.map