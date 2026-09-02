/** Realm-local retention and identity for live objects referenced by Inspector snapshots. */
import { type InspectorObjectHandle } from './ids.ts';
import type { InspectorObjectReference } from './object-reference.ts';
/** Self-contained function sent through CDP to identify its `this` object in the inspected realm. */
export declare const IDENTIFY_REALM_OBJECT_FUNCTION: string;
/** One realm's bounded table of objects retained by its latest semantic snapshot. */
export declare class RealmObjectRegistry {
    /** Realm-unique id carried by every reference from this registry. */
    readonly id: import("../identity.ts").InspectorId<"InspectorObjectRegistryId">;
    private readonly known;
    private retained;
    private nextHandle;
    private disposed;
    constructor();
    /**
     * Start one replacement generation.
     * @returns A collector that atomically installs exactly the retained objects on commit.
     */
    begin(): RealmObjectGeneration;
    /**
     * Resolve one current opaque handle.
     * @param handle - Handle from the latest committed snapshot.
     * @returns The live object, when it remains retained.
     */
    resolve(handle: InspectorObjectHandle): object | undefined;
    /**
     * Identify one object retained by the latest snapshot. Cordis plugin calls may return nested thenable facades;
     * only objects whose prototype path consists exclusively of those `then` wrappers resolve to the retained Fiber.
     * @param value - Candidate live value.
     * @returns Its wire reference, when present in this registry.
     */
    identify(value: unknown): InspectorObjectReference | undefined;
    /** Remove this registry from the realm and release all strong references. */
    close(): void;
    /**
     * Assign a stable handle and retain a value in one pending generation.
     * @param value - Object represented by the pending snapshot.
     * @param next - Pending generation's strong-reference table.
     * @returns The registry id and stable object handle.
     */
    retain(value: object, next: Map<InspectorObjectHandle, object>): InspectorObjectReference;
    /**
     * Replace the current strong-reference set with one completed generation.
     * @param next - Complete object table for the committed snapshot.
     */
    commit(next: Map<InspectorObjectHandle, object>): void;
}
/** Mutable object set assembled before one snapshot becomes visible. */
export declare class RealmObjectGeneration {
    private readonly owner;
    private readonly retained;
    private committed;
    constructor(owner: RealmObjectRegistry);
    /**
     * Retain one object and obtain its stable opaque reference.
     * @param value - Context or Fiber represented in the snapshot.
     * @returns Source-local wire reference.
     */
    retain(value: object): InspectorObjectReference;
    /**
     * Stop retaining an object omitted while bounding the pending snapshot.
     * @param handle - Opaque handle removed from this pending generation.
     */
    release(handle: InspectorObjectHandle): void;
    /** Atomically replace the registry's retained set. */
    commit(): void;
}
/**
 * Build an expression that resolves one reference inside its owning realm.
 * @param reference - Validated source-local object reference.
 * @returns Side-effect-free JavaScript expression for Runtime evaluation.
 */
export declare function realmObjectExpression(reference: InspectorObjectReference): string;
/**
 * Identify a retained object across all Inspector collectors in this realm.
 * @param value - Runtime value returned to a debugger.
 * @returns Its source-local reference, when the value is a visible entity.
 */
export declare function identifyRealmObject(value: unknown): InspectorObjectReference | undefined;
//# sourceMappingURL=object-registry.d.ts.map