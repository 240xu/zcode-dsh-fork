/** Cordis service API shared by the Host and Client plugin faces. */
import { createQueryCordisRuntimeTreeReader } from "./bridge/query-reader.js";
/**
 * Create the shared service façade without exposing the carrier implementation.
 * @param connection - Realm-local observation and query transport.
 * @returns The Cordis service value.
 */
export function createInspectorService(connection) {
    return {
        publish: (topic, payload, monotonicMs) => { connection.publish(topic, payload, monotonicMs); },
        cordis: createQueryCordisRuntimeTreeReader(connection),
    };
}
//# sourceMappingURL=service.js.map