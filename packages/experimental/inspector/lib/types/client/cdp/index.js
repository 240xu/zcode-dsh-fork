/** Source-side CDP capability declarations for the browser Client realm. */
import { consoleBridgeCapability } from "./console.js";
import { debuggerBridgeCapability } from "./debugger.js";
import { heapProfilerBridgeCapability } from "./heap-profiler.js";
import { profilerBridgeCapability } from "./profiler.js";
import { runtimeBridgeCapability } from "./runtime.js";
import { sourcesBridgeCapability } from "./sources.js";
/**
 * Describe Client operations that require Worker-to-page bridge messages.
 * @param origin - Origin assigned to the synthetic execution context.
 * @param hasSources - Whether the Client bundle source was discovered.
 * @returns Capabilities included in the Client source handshake.
 */
export function bridgeCapabilities(origin, hasSources) {
    return [
        runtimeBridgeCapability(origin),
        consoleBridgeCapability(),
        sourcesBridgeCapability(hasSources),
        debuggerBridgeCapability(),
        profilerBridgeCapability(),
        heapProfilerBridgeCapability(),
    ].filter((capability) => capability !== undefined);
}
//# sourceMappingURL=index.js.map