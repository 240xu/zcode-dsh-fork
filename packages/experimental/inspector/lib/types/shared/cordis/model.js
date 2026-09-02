/** Consumer-neutral Cordis runtime tree shared by non-CDP readers. */
import { CORDIS_TREE_MAX_DEPTH } from "./snapshot.js";
import { inspectorId } from "../identity.js";
import { isPlainObject } from "../json.js";
import { exactKeys, exactObject, wireId } from "../validation.js";
/** Current consumer-neutral Cordis tree version. */
export const CORDIS_RUNTIME_TREE_SCHEMA_VERSION = 0;
/**
 * Decode a consumer-neutral tree received across an Inspector transport.
 * @param value - Untrusted query result value.
 * @returns A detached tree containing only public semantic fields.
 */
export function parseCordisRuntimeTree(value) {
    const record = exactObject(value, ['schemaVersion', 'host', 'clients'], 'Cordis runtime tree');
    if (record.schemaVersion !== CORDIS_RUNTIME_TREE_SCHEMA_VERSION || !Array.isArray(record.clients)) {
        throw new Error('inspector protocol: invalid Cordis runtime tree');
    }
    const host = record.host === null ? null : parseRealm(record.host, 'host');
    const clients = record.clients.map(client => parseRealm(client, 'client'));
    const sourceIds = new Set();
    for (const realm of host === null ? clients : [host, ...clients]) {
        if (sourceIds.has(realm.source.sourceId)) {
            throw new Error('inspector protocol: Cordis runtime tree repeats a sourceId');
        }
        sourceIds.add(realm.source.sourceId);
    }
    return {
        schemaVersion: CORDIS_RUNTIME_TREE_SCHEMA_VERSION,
        host,
        clients,
    };
}
function parseRealm(value, kind) {
    const record = exactObject(value, ['source', 'connection', 'revision', 'truncated', 'root'], 'Cordis runtime realm');
    const source = exactObject(record.source, ['sourceId', 'kind', 'label'], 'Cordis runtime source');
    if (source.kind !== kind || typeof source.label !== 'string' || source.label.length === 0 || source.label.length > 256) {
        throw new Error(`inspector protocol: invalid ${kind} Cordis runtime source`);
    }
    if (!Number.isSafeInteger(record.revision) || record.revision < 1 || typeof record.truncated !== 'boolean') {
        throw new Error('inspector protocol: invalid Cordis runtime realm header');
    }
    const root = parseNode(record.root, { fiberUids: new Set() }, 0);
    if (root.kind !== 'context')
        throw new Error('inspector protocol: Cordis runtime root must be a Context');
    return {
        source: {
            sourceId: wireId(source.sourceId, 'sourceId'),
            kind,
            label: source.label,
        },
        connection: parseConnection(record.connection),
        revision: record.revision,
        truncated: record.truncated,
        root,
    };
}
/**
 * Project an inspected source id into the consumer-visible Cordis identity namespace.
 * @param value - Stable source id carried by the current runtime observation.
 * @returns The corresponding Cordis runtime source id.
 */
export function cordisRuntimeSourceId(value) {
    return inspectorId(value, 'sourceId');
}
function parseConnection(value) {
    if (!isPlainObject(value))
        throw new Error('inspector protocol: Cordis runtime connection must be an object');
    if (value.state === 'connected') {
        exactKeys(value, ['state'], 'connected Cordis runtime connection');
        return { state: 'connected' };
    }
    if (value.state === 'disconnected' && typeof value.reason === 'string') {
        exactKeys(value, ['state', 'reason'], 'disconnected Cordis runtime connection');
        return { state: 'disconnected', reason: value.reason };
    }
    throw new Error('inspector protocol: invalid Cordis runtime connection');
}
function parseNode(value, state, depth) {
    if (depth > CORDIS_TREE_MAX_DEPTH)
        throw new Error('inspector protocol: Cordis runtime tree exceeds the depth limit');
    if (!isPlainObject(value) || (value.kind !== 'context' && value.kind !== 'fiber')) {
        throw new Error('inspector protocol: Cordis runtime node must have a known kind');
    }
    const record = exactObject(value, value.kind === 'fiber'
        ? ['kind', 'uid', 'children']
        : ['kind', 'children'], 'Cordis runtime node');
    if (!Array.isArray(record.children))
        throw new Error('inspector protocol: Cordis runtime node children must be an array');
    if (record.kind === 'context') {
        return { kind: 'context', children: record.children.map(child => parseNode(child, state, depth + 1)) };
    }
    if (!Number.isSafeInteger(record.uid)
        || record.uid < 1
        || record.children.length !== 1) {
        throw new Error('inspector protocol: invalid Cordis runtime Fiber');
    }
    const uid = record.uid;
    if (state.fiberUids.has(uid))
        throw new Error('inspector protocol: Cordis runtime tree repeats a Fiber uid');
    state.fiberUids.add(uid);
    const context = parseNode(record.children[0], state, depth + 1);
    if (context.kind !== 'context')
        throw new Error('inspector protocol: Cordis runtime Fiber child must be a Context');
    return { kind: 'fiber', uid, children: [context] };
}
//# sourceMappingURL=model.js.map