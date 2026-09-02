/** CDP-independent snapshot model for a Cordis Context and Fiber tree. */
import { isPlainObject } from "../json.js";
import { exactKeys, exactObject, wireId } from "../validation.js";
/** Current serialized Cordis tree model version. */
export const CORDIS_TREE_SCHEMA_VERSION = 0;
/** Maximum nesting accepted from one realm snapshot. */
export const CORDIS_TREE_MAX_DEPTH = 256;
/**
 * Decode and validate one complete Cordis tree replacement.
 * @param value - Untrusted observation payload.
 * @param maxNodes - Maximum nodes admitted from one source.
 * @returns A detached, validated snapshot.
 */
export function parseCordisTreeSnapshot(value, maxNodes) {
    const record = exactObject(value, [
        'schemaVersion', 'revision', 'objectRegistryId', 'root', 'truncated',
    ], 'Cordis tree');
    if (record.schemaVersion !== CORDIS_TREE_SCHEMA_VERSION
        || !Number.isSafeInteger(record.revision) || record.revision < 1
        || typeof record.truncated !== 'boolean') {
        throw new Error('inspector protocol: invalid Cordis tree header');
    }
    const state = { count: 0, handles: new Set(), fiberUids: new Set() };
    const root = parseNode(record.root, state, maxNodes, 0);
    if (root.kind !== 'context')
        throw new Error('inspector protocol: Cordis tree root must be a Context');
    return {
        schemaVersion: CORDIS_TREE_SCHEMA_VERSION,
        revision: record.revision,
        objectRegistryId: wireId(record.objectRegistryId, 'objectRegistryId'),
        root,
        truncated: record.truncated,
    };
}
function parseNode(value, state, maxNodes, depth) {
    if (depth > CORDIS_TREE_MAX_DEPTH)
        throw new Error('inspector protocol: Cordis tree exceeds the depth limit');
    if (++state.count > maxNodes)
        throw new Error(`inspector protocol: Cordis tree exceeds ${String(maxNodes)} nodes`);
    if (!isPlainObject(value) || (value.kind !== 'context' && value.kind !== 'fiber')) {
        throw new Error('inspector protocol: Cordis tree node must have a known kind');
    }
    const objectHandle = wireId(value.objectHandle, 'objectHandle');
    if (state.handles.has(objectHandle))
        throw new Error('inspector protocol: Cordis tree repeats an object handle');
    state.handles.add(objectHandle);
    if (!Array.isArray(value.children))
        throw new Error('inspector protocol: Cordis tree node children must be an array');
    if (value.kind === 'context') {
        exactKeys(value, ['kind', 'objectHandle', 'children'], 'Context tree node');
        return {
            kind: 'context',
            objectHandle,
            children: value.children.map(child => parseNode(child, state, maxNodes, depth + 1)),
        };
    }
    exactKeys(value, ['kind', 'objectHandle', 'uid', 'children'], 'Fiber tree node');
    if (!Number.isSafeInteger(value.uid) || value.uid < 1) {
        throw new Error('inspector protocol: Cordis Fiber uid must be a positive safe integer');
    }
    if (state.fiberUids.has(value.uid))
        throw new Error('inspector protocol: Cordis tree repeats a Fiber uid');
    state.fiberUids.add(value.uid);
    if (value.children.length !== 1)
        throw new Error('inspector protocol: Cordis Fiber must own exactly one Context');
    const context = parseNode(value.children[0], state, maxNodes, depth + 1);
    if (context.kind !== 'context')
        throw new Error('inspector protocol: Cordis Fiber child must be a Context');
    return {
        kind: 'fiber',
        objectHandle,
        uid: value.uid,
        children: [context],
    };
}
//# sourceMappingURL=snapshot.js.map