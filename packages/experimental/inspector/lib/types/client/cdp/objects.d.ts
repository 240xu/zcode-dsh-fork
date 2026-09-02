/** Client-local object handles and CDP-compatible RemoteObject serialization. */
import { type ClientRemoteObjectHandle } from '../../shared/bridge/ids.ts';
import type { ClientRuntimeRemoteObject } from '../../shared/bridge/messages/runtime/index.ts';
/** Opaque set of handles allocated by one Client Runtime operation. */
export type ClientObjectAllocation = symbol;
/** Serialization choices inherited by child RemoteObjects. */
export interface ClientRuntimeObjectOptions {
    readonly group?: string;
    readonly generatePreview?: boolean;
    readonly returnByValue?: boolean;
}
/** Per-DevTools-session owner of all live Client object references. */
export declare class ClientObjectStore {
    private readonly maxObjects;
    private readonly objects;
    private readonly groups;
    private readonly allocations;
    private nextOrdinal;
    constructor(maxObjects: number);
    /**
     * Start tracking handles allocated by one independently settling operation.
     * @returns An opaque allocation identity.
     */
    beginAllocation(): ClientObjectAllocation;
    /**
     * Keep an operation's handles and release its allocation bookkeeping.
     * @param allocation - Allocation returned by {@link beginAllocation}.
     */
    commitAllocation(allocation: ClientObjectAllocation): void;
    /**
     * Resolve one handle or fail without exposing another session's objects.
     * @param handle - Client-local object handle.
     * @returns The retained JavaScript value.
     */
    get(handle: ClientRemoteObjectHandle): unknown;
    /**
     * Read the object group inherited by values reached through one handle.
     * @param handle - Client-local object handle.
     * @returns Its object group, or `undefined` when it is ungrouped.
     */
    group(handle: ClientRemoteObjectHandle): string | undefined;
    /**
     * Convert a live value to the JSON-safe RemoteObject protocol.
     * @param value - Value owned by this Client realm.
     * @param options - Object group and serialization options.
     * @param allocation - Optional operation that owns any newly retained handle.
     * @returns A primitive value or opaque Client handle with display metadata.
     */
    serialize(value: unknown, options?: ClientRuntimeObjectOptions, allocation?: ClientObjectAllocation): ClientRuntimeRemoteObject;
    /**
     * Release exactly one handle. Releasing an unknown handle is idempotent.
     * @param handle - Client-local object handle.
     */
    release(handle: ClientRemoteObjectHandle): void;
    /**
     * Release every handle in one DevTools object group.
     * @param group - DevTools object-group name.
     */
    releaseGroup(group: string): void;
    /**
     * Discard exactly the handles allocated by one failed operation.
     * @param allocation - Allocation returned by {@link beginAllocation}.
     */
    rollback(allocation: ClientObjectAllocation): void;
    /** Release the whole DevTools session. */
    clear(): void;
    private register;
}
//# sourceMappingURL=objects.d.ts.map