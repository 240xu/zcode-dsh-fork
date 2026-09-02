/** Worker projection from Cordis snapshots to a connection-neutral semantic DOM. */
import { cdpNumericId } from "../../ids.js";
/** Assigns durable backend ids and projects the latest source snapshots. */
export class CordisDomBackend {
    trees;
    backendIdByKey = new Map();
    listeners = new Set();
    documentValue;
    nextBackendNodeId = 1;
    nextRevision = 1;
    unsubscribe;
    nodeByObject = new Map();
    constructor(trees) {
        this.trees = trees;
        this.documentValue = this.build();
        this.unsubscribe = trees.subscribe((event) => {
            const previous = this.documentValue;
            this.documentValue = this.build();
            if (event.type === 'source-disconnected')
                this.emit({ type: 'source-disconnected', source: event.source });
            const mutations = diffDocument(previous, this.documentValue);
            if (mutations.length > 0)
                this.emit({ type: 'tree-mutated', mutations });
        });
    }
    /**
     * Read the latest connection-neutral semantic document.
     * @returns The current immutable document revision.
     */
    document() {
        return this.documentValue;
    }
    /**
     * Subscribe to full document replacements and in-place realm state changes.
     * @param listener - Called after a new backend revision is installed.
     * @returns A disposer removing the listener.
     */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }
    /** Release repository subscriptions at Worker shutdown. */
    close() {
        this.unsubscribe();
        this.listeners.clear();
    }
    /**
     * Resolve one source-local object reference to its current projected node.
     * @param source - Connected source generation that owns the reference.
     * @param reference - Realm-local registry and object handle.
     * @returns The current projected node, when present.
     */
    nodeForObject(source, reference) {
        return this.nodeByObject.get(objectKey(source, reference));
    }
    /**
     * Resolve a reference when a Runtime route identifies only Host or Client ownership.
     * @param kind - Host or Client ownership inferred by the Runtime adapter.
     * @param reference - Realm-local registry and object handle.
     * @returns The current projected node, when present.
     */
    nodeForObjectKind(kind, reference) {
        const route = this.trees.resolveObjectInKind(kind, reference);
        return route === undefined ? undefined : this.nodeForObject(route.source, reference);
    }
    /**
     * Resolve one realm-neutral Runtime reference to its current projected node.
     * @param realm - Realm that exposed the Runtime object.
     * @param reference - Realm-local registry and object handle.
     * @returns The current projected node, when present.
     */
    nodeForRealm(realm, reference) {
        if (realm.kind === 'host')
            return this.nodeForObjectKind('host', reference);
        const route = this.trees.resolveObjectIdentity(realm.sourceId, realm.generation, reference);
        return route === undefined ? undefined : this.nodeForObject(route.source, reference);
    }
    build() {
        const byBackendId = new Map();
        const parentByBackendId = new Map();
        this.nodeByObject.clear();
        const tree = this.trees.tree();
        const root = this.node('document', '#document', [], '#document');
        const host = this.node('host', 'host', [], '<host>');
        if (tree.host !== null)
            host.children.push(this.entity(tree.host, tree.host.snapshot.root));
        const clients = this.node('clients', 'clients', [], '<clients>');
        for (const clientTree of tree.clients) {
            const client = this.node(`client:${clientTree.source.sourceId}`, 'client', [], '<client>');
            client.children.push(this.entity(clientTree, clientTree.snapshot.root));
            clients.children.push(client);
        }
        root.children.push(host, clients);
        const retainedKeys = new Set();
        const freeze = (node, parent) => {
            const value = { ...node, children: node.children.map(child => freeze(child, node)) };
            retainedKeys.add(value.key);
            byBackendId.set(value.backendNodeId, value);
            if (parent !== undefined)
                parentByBackendId.set(value.backendNodeId, parent.backendNodeId);
            if (value.object?.connection.state === 'connected')
                this.nodeByObject.set(objectKey(value.object.source, {
                    registryId: value.object.snapshot.objectRegistryId,
                    handle: value.object.node.objectHandle,
                }), value);
            return value;
        };
        const frozenRoot = freeze(root);
        for (const key of this.backendIdByKey.keys()) {
            if (!retainedKeys.has(key))
                this.backendIdByKey.delete(key);
        }
        return { revision: this.nextRevision++, root: frozenRoot, byBackendId, parentByBackendId };
    }
    entity(tree, node) {
        const { source, snapshot } = tree;
        const key = `entity:${objectKey(source, { registryId: snapshot.objectRegistryId, handle: node.objectHandle })}`;
        const object = { ...tree, node };
        const attributes = node.kind === 'fiber'
            ? [['uid', String(node.uid)]]
            : [];
        const projected = this.node(key, node.kind, attributes, elementDescription(node.kind, attributes), object);
        projected.children.push(...node.children.map(child => this.entity(tree, child)));
        return projected;
    }
    node(key, name, attributes, description, object) {
        let backendNodeId = this.backendIdByKey.get(key);
        if (backendNodeId === undefined) {
            backendNodeId = cdpNumericId(this.nextBackendNodeId++, 'backendNodeId');
            this.backendIdByKey.set(key, backendNodeId);
        }
        return { backendNodeId, key, name, attributes, description, ...(object === undefined ? {} : { object }), children: [] };
    }
    emit(change) {
        for (const listener of [...this.listeners]) {
            try {
                listener(change);
            }
            catch {
                // One closed CDP connection cannot prevent sibling sessions from receiving the document mutation.
            }
        }
    }
}
function elementDescription(name, attributes) {
    const rendered = attributes.map(([key, value]) => value === '' ? key : `${key}=${JSON.stringify(value)}`).join(' ');
    return `<${name}${rendered === '' ? '' : ` ${rendered}`}>`;
}
function objectKey(source, reference) {
    return `${source.sourceId}\0${source.generation}\0${reference.registryId}\0${reference.handle}`;
}
function diffDocument(previous, current) {
    const mutations = [];
    return diffNode(previous.root, current.root, mutations)
        ? mutations
        : [{ type: 'document-updated' }];
}
function diffNode(previous, current, mutations) {
    if (previous.backendNodeId !== current.backendNodeId || previous.name !== current.name) {
        return false;
    }
    const previousAttributes = new Map(previous.attributes);
    const currentAttributes = new Map(current.attributes);
    for (const [name, value] of currentAttributes) {
        if (previousAttributes.get(name) === value)
            continue;
        mutations.push({ type: 'attribute-modified', backendNodeId: current.backendNodeId, name, value });
    }
    for (const [name] of previousAttributes) {
        if (!currentAttributes.has(name)) {
            mutations.push({ type: 'attribute-removed', backendNodeId: current.backendNodeId, name });
        }
    }
    const previousIds = previous.children.map(child => child.backendNodeId);
    const currentIds = current.children.map(child => child.backendNodeId);
    const previousSet = new Set(previousIds);
    const currentSet = new Set(currentIds);
    const retainedBefore = previousIds.filter(id => currentSet.has(id));
    const retainedAfter = currentIds.filter(id => previousSet.has(id));
    if (!sameIds(retainedBefore, retainedAfter)) {
        mutations.push({
            type: 'children-replaced',
            parentBackendNodeId: current.backendNodeId,
            children: current.children,
        });
        return true;
    }
    for (const child of previous.children) {
        if (!currentSet.has(child.backendNodeId)) {
            mutations.push({ type: 'child-removed', parentBackendNodeId: current.backendNodeId, node: child });
        }
    }
    for (let index = 0; index < current.children.length; index++) {
        const child = current.children[index];
        if (previousSet.has(child.backendNodeId))
            continue;
        mutations.push({
            type: 'child-inserted',
            parentBackendNodeId: current.backendNodeId,
            previousBackendNodeId: index === 0 ? 0 : current.children[index - 1].backendNodeId,
            node: child,
        });
    }
    const previousById = new Map(previous.children.map(child => [child.backendNodeId, child]));
    for (const child of current.children) {
        const prior = previousById.get(child.backendNodeId);
        if (prior !== undefined && !diffNode(prior, child, mutations))
            return false;
    }
    return true;
}
function sameIds(left, right) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
}
//# sourceMappingURL=model.js.map