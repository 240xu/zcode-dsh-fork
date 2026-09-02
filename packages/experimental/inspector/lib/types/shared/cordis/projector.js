/** Pure projection from routed Cordis snapshots to the consumer-neutral tree. */
import { CORDIS_RUNTIME_TREE_SCHEMA_VERSION, cordisRuntimeSourceId, } from "./model.js";
/**
 * Strip transport and live-object routing fields from retained Cordis snapshots.
 * @param tree - Worker-owned routed snapshots.
 * @returns A detached semantic tree safe for non-CDP consumers.
 */
export function projectCordisRuntimeTree(tree) {
    return {
        schemaVersion: CORDIS_RUNTIME_TREE_SCHEMA_VERSION,
        host: tree.host === null ? null : projectRealm(tree.host),
        clients: tree.clients.map(projectRealm),
    };
}
function projectRealm(realm) {
    return {
        source: {
            sourceId: cordisRuntimeSourceId(realm.source.sourceId),
            kind: realm.source.kind,
            label: realm.source.label,
        },
        connection: realm.connection.state === 'connected'
            ? { state: 'connected' }
            : { state: 'disconnected', reason: realm.connection.reason },
        revision: realm.snapshot.revision,
        truncated: realm.snapshot.truncated,
        root: projectContext(realm.snapshot.root),
    };
}
function projectContext(node) {
    return { kind: 'context', children: node.children.map(projectNode) };
}
function projectNode(node) {
    if (node.kind === 'context')
        return projectContext(node);
    return {
        kind: 'fiber',
        uid: node.uid,
        children: [projectContext(node.children[0])],
    };
}
//# sourceMappingURL=projector.js.map