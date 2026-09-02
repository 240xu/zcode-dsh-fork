/** Query-backed adapter for the transport-independent Cordis tree reader. */
/**
 * Create a reader that obtains the tree through the typed Inspector query protocol.
 * @param requester - Active Host or Client query connection.
 * @returns A non-CDP Cordis tree reader.
 */
export function createQueryCordisRuntimeTreeReader(requester) {
    return {
        async getTree() {
            const result = await requester.request({ op: 'cordis-tree/get' });
            return result.tree;
        },
    };
}
//# sourceMappingURL=query-reader.js.map