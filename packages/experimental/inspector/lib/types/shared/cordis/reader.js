/** Environment-independent Cordis runtime tree reader. */
/**
 * Create a reader around a local committed-tree projection.
 * @param read - Synchronous or asynchronous latest-tree read.
 * @returns A reader suitable for query and CDP adapters.
 */
export function createCordisRuntimeTreeReader(read) {
    return { getTree: async () => await read() };
}
//# sourceMappingURL=reader.js.map