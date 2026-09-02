/** Cordis tree query execution independent of its source carrier. */
/**
 * Execute one closed Inspector query against the shared semantic reader.
 * @param reader - Latest committed Cordis tree reader.
 * @param query - Validated query command.
 * @returns The result corresponding to the query operation.
 */
export async function executeInspectorQuery(reader, query) {
    return { op: query.op, tree: await reader.getTree() };
}
//# sourceMappingURL=cordis-query.js.map