/** Realm-local retention and identity for live objects referenced by Inspector snapshots. */
import { randomUUID } from '@deepseek-ai/dsh-util-crypto';
import { inspectorId } from "../identity.js";
const REGISTRIES_SYMBOL = 'dsh.inspector.realm-object-registries';
const MAX_FIBER_WRAPPER_DEPTH = 8;
/** Self-contained function sent through CDP to identify its `this` object in the inspected realm. */
export const IDENTIFY_REALM_OBJECT_FUNCTION = `function () {
  const table = globalThis[Symbol.for(${JSON.stringify(REGISTRIES_SYMBOL)})]
  if (!(table instanceof Map)) return undefined
  for (const registry of table.values()) {
    const reference = registry.identify(this)
    if (reference !== undefined) return reference
  }
  return undefined
}`;
/** One realm's bounded table of objects retained by its latest semantic snapshot. */
export class RealmObjectRegistry {
    /** Realm-unique id carried by every reference from this registry. */
    id = inspectorId(randomUUID(), 'registryId');
    known = new WeakMap();
    retained = new Map();
    nextHandle = 1;
    disposed = false;
    constructor() {
        registries().set(this.id, this);
    }
    /**
     * Start one replacement generation.
     * @returns A collector that atomically installs exactly the retained objects on commit.
     */
    begin() {
        if (this.disposed)
            throw new Error('inspector: realm object registry is disposed');
        return new RealmObjectGeneration(this);
    }
    /**
     * Resolve one current opaque handle.
     * @param handle - Handle from the latest committed snapshot.
     * @returns The live object, when it remains retained.
     */
    resolve(handle) {
        return this.retained.get(handle);
    }
    /**
     * Identify one object retained by the latest snapshot. Cordis plugin calls may return nested thenable facades;
     * only objects whose prototype path consists exclusively of those `then` wrappers resolve to the retained Fiber.
     * @param value - Candidate live value.
     * @returns Its wire reference, when present in this registry.
     */
    identify(value) {
        if ((typeof value !== 'object' || value === null) && typeof value !== 'function')
            return undefined;
        let candidate = value;
        for (let depth = 0; candidate !== null && depth <= MAX_FIBER_WRAPPER_DEPTH; depth++) {
            const handle = this.known.get(candidate);
            if (handle !== undefined && this.retained.get(handle) === candidate)
                return { registryId: this.id, handle };
            try {
                const keys = Reflect.ownKeys(candidate);
                if (keys.length !== 1 || keys[0] !== 'then')
                    return undefined;
                candidate = Object.getPrototypeOf(candidate);
            }
            catch {
                // A hostile proxy cannot prevent later registries from checking the original value.
                return undefined;
            }
        }
        return undefined;
    }
    /** Remove this registry from the realm and release all strong references. */
    close() {
        if (this.disposed)
            return;
        this.disposed = true;
        registries().delete(this.id);
        this.retained.clear();
    }
    /**
     * Assign a stable handle and retain a value in one pending generation.
     * @param value - Object represented by the pending snapshot.
     * @param next - Pending generation's strong-reference table.
     * @returns The registry id and stable object handle.
     */
    retain(value, next) {
        let handle = this.known.get(value);
        if (handle === undefined) {
            handle = inspectorId(`object-${String(this.nextHandle++)}`, 'objectHandle');
            this.known.set(value, handle);
        }
        next.set(handle, value);
        return { registryId: this.id, handle };
    }
    /**
     * Replace the current strong-reference set with one completed generation.
     * @param next - Complete object table for the committed snapshot.
     */
    commit(next) {
        this.retained = next;
    }
}
/** Mutable object set assembled before one snapshot becomes visible. */
export class RealmObjectGeneration {
    owner;
    retained = new Map();
    committed = false;
    constructor(owner) {
        this.owner = owner;
    }
    /**
     * Retain one object and obtain its stable opaque reference.
     * @param value - Context or Fiber represented in the snapshot.
     * @returns Source-local wire reference.
     */
    retain(value) {
        if (this.committed)
            throw new Error('inspector: realm object generation is already committed');
        return this.owner.retain(value, this.retained);
    }
    /**
     * Stop retaining an object omitted while bounding the pending snapshot.
     * @param handle - Opaque handle removed from this pending generation.
     */
    release(handle) {
        if (this.committed)
            throw new Error('inspector: realm object generation is already committed');
        this.retained.delete(handle);
    }
    /** Atomically replace the registry's retained set. */
    commit() {
        if (this.committed)
            return;
        this.committed = true;
        this.owner.commit(this.retained);
    }
}
/**
 * Build an expression that resolves one reference inside its owning realm.
 * @param reference - Validated source-local object reference.
 * @returns Side-effect-free JavaScript expression for Runtime evaluation.
 */
export function realmObjectExpression(reference) {
    return `globalThis[Symbol.for(${JSON.stringify(REGISTRIES_SYMBOL)})]?.get(${JSON.stringify(reference.registryId)})?.resolve(${JSON.stringify(reference.handle)})`;
}
/**
 * Identify a retained object across all Inspector collectors in this realm.
 * @param value - Runtime value returned to a debugger.
 * @returns Its source-local reference, when the value is a visible entity.
 */
export function identifyRealmObject(value) {
    for (const registry of registries().values()) {
        const reference = registry.identify(value);
        if (reference !== undefined)
            return reference;
    }
    return undefined;
}
function registries() {
    const key = Symbol.for(REGISTRIES_SYMBOL);
    const existing = Reflect.get(globalThis, key);
    if (existing instanceof Map)
        return existing;
    const value = new Map();
    Reflect.set(globalThis, key, value);
    return value;
}
//# sourceMappingURL=object-registry.js.map