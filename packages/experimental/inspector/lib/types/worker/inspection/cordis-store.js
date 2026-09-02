/** Worker-owned repository of CDP-independent Cordis tree snapshots. */
import { parseCordisTreeSnapshot, } from "../../shared/cordis/snapshot.js";
import { CORDIS_TREE_TOPIC } from "../../shared/bridge/messages/cordis.js";
import { projectCordisRuntimeTree, } from "../../shared/cordis/projector.js";
/** Validated latest-value store consumed independently by CDP and future query adapters. */
export class CordisTreeStore {
    options;
    topics = new Set([CORDIS_TREE_TOPIC]);
    trees = new Map();
    disconnected = new Set();
    listeners = new Set();
    constructor(options) {
        this.options = options;
    }
    /** Replace all retained state for one source generation. */
    replace(source, records) {
        const next = this.latest(source, records);
        const changed = next === undefined
            ? this.remove(source.sourceId)
            : this.install(source, next);
        if (changed)
            this.emit({ type: 'snapshot-changed', source });
    }
    /** Apply later state replacements, ignoring unrelated observation topics. */
    append(source, records) {
        const next = this.latest(source, records);
        if (next !== undefined && this.install(source, next))
            this.emit({ type: 'snapshot-changed', source });
    }
    /** Freeze a closed source generation's last tree and invalidate its object routes. */
    close(source, reason) {
        const current = this.trees.get(source.sourceId);
        if (current?.source.generation !== source.generation || current.connection.state === 'disconnected')
            return;
        this.trees.set(source.sourceId, {
            ...current,
            connection: { state: 'disconnected', reason },
        });
        this.disconnected.delete(source.sourceId);
        this.disconnected.add(source.sourceId);
        while (this.disconnected.size > this.options.maxDisconnectedTrees) {
            const oldest = this.disconnected.values().next().value;
            if (oldest === undefined)
                break;
            this.remove(oldest);
        }
        this.emit({ type: 'source-disconnected', source });
    }
    /**
     * Read all current realm snapshots without CDP identifiers.
     * @returns Snapshots in source admission order.
     */
    snapshots() {
        return [...this.trees.values()].map(({ source, snapshot, connection }) => ({ source, snapshot, connection }));
    }
    /**
     * Compose the common realm model into Host and Client slots.
     * @returns A detached view whose Host and Client entries share one type.
     */
    tree() {
        const snapshots = this.snapshots();
        return {
            host: snapshots.find(tree => tree.source.kind === 'host') ?? null,
            clients: snapshots.filter(tree => tree.source.kind === 'client'),
        };
    }
    /**
     * Read a detached semantic tree without object-routing or CDP identifiers.
     * @returns The latest retained Host and Client topology.
     */
    readTree() {
        return projectCordisRuntimeTree(this.tree());
    }
    /**
     * Resolve a source-local object reference to its semantic tree node.
     * @param source - Active source generation.
     * @param reference - Realm-local registry and object handle.
     * @returns The matching node while its source remains connected.
     */
    resolveObject(source, reference) {
        const tree = this.trees.get(source.sourceId);
        if (tree === undefined
            || tree.source.generation !== source.generation
            || tree.connection.state === 'disconnected')
            return undefined;
        const node = tree.nodesByObject.get(objectKey(reference));
        return node === undefined ? undefined : this.route(tree, node);
    }
    /**
     * Resolve a source-local object without requiring the source's presentation fields.
     * @param sourceId - Logical source identity.
     * @param generation - Active source generation.
     * @param reference - Realm-local object reference.
     * @returns The matching live tree node.
     */
    resolveObjectIdentity(sourceId, generation, reference) {
        const tree = this.trees.get(sourceId);
        if (tree === undefined || tree.source.generation !== generation || tree.connection.state === 'disconnected') {
            return undefined;
        }
        const node = tree.nodesByObject.get(objectKey(reference));
        return node === undefined ? undefined : this.route(tree, node);
    }
    /**
     * Resolve a live reference when only its source realm kind is known.
     * @param kind - Host or Client ownership inferred by the Runtime adapter.
     * @param reference - Realm-local registry and object handle.
     * @returns The matching connected node, when present.
     */
    resolveObjectInKind(kind, reference) {
        for (const tree of this.trees.values()) {
            if (tree.source.kind !== kind || tree.connection.state === 'disconnected')
                continue;
            const node = tree.nodesByObject.get(objectKey(reference));
            if (node !== undefined)
                return this.route(tree, node);
        }
        return undefined;
    }
    /**
     * Subscribe to accepted tree replacements and source availability changes.
     * @param listener - Repository observer.
     * @returns A disposer removing the observer.
     */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }
    latest(source, records) {
        let snapshot;
        for (const record of records) {
            if (record.topic !== CORDIS_TREE_TOPIC)
                continue;
            const candidate = parseCordisTreeSnapshot(record.payload, this.options.maxNodes);
            if (snapshot === undefined || candidate.revision > snapshot.revision)
                snapshot = candidate;
        }
        if (snapshot === undefined)
            return undefined;
        const current = this.trees.get(source.sourceId);
        if (current?.source.generation === source.generation && current.snapshot.revision >= snapshot.revision) {
            return current.snapshot;
        }
        return snapshot;
    }
    install(source, snapshot) {
        const current = this.trees.get(source.sourceId);
        if (current?.source.generation === source.generation
            && current.snapshot === snapshot
            && current.connection.state === 'connected')
            return false;
        this.disconnected.delete(source.sourceId);
        this.trees.set(source.sourceId, {
            source,
            snapshot,
            connection: { state: 'connected' },
            nodesByObject: new Map(treeNodes(snapshot.root).map(node => [objectKey({
                    registryId: snapshot.objectRegistryId,
                    handle: node.objectHandle,
                }), node])),
        });
        return true;
    }
    remove(sourceId) {
        this.disconnected.delete(sourceId);
        return this.trees.delete(sourceId);
    }
    route(tree, node) {
        return { source: tree.source, snapshot: tree.snapshot, connection: tree.connection, node };
    }
    emit(event) {
        for (const listener of [...this.listeners]) {
            try {
                listener(event);
            }
            catch {
                // One query adapter cannot prevent later repository observers from updating.
            }
        }
    }
}
function objectKey(reference) {
    return `${reference.registryId}\0${reference.handle}`;
}
function treeNodes(root) {
    const nodes = [];
    const pending = [root];
    while (pending.length > 0) {
        const node = pending.pop();
        if (node === undefined)
            break;
        nodes.push(node);
        pending.push(...node.children.toReversed());
    }
    return nodes;
}
//# sourceMappingURL=cordis-store.js.map