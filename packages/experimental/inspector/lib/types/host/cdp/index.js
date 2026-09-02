/** Source-side CDP capability declarations for the Host realm. */
import { consoleBridgeCapability } from "./console.js";
import { debuggerBridgeCapability } from "./debugger.js";
import { heapProfilerBridgeCapability } from "./heap-profiler.js";
import { profilerBridgeCapability } from "./profiler.js";
import { runtimeBridgeCapability } from "./runtime.js";
import { sourcesBridgeCapability } from "./sources.js";
const HOST_BRIDGE_CAPABILITIES = [
    runtimeBridgeCapability(''),
    consoleBridgeCapability(),
    sourcesBridgeCapability(false),
    debuggerBridgeCapability(),
    profilerBridgeCapability(),
    heapProfilerBridgeCapability(),
].filter((capability) => capability !== undefined);
/**
 * Collect Host source-bridge capabilities.
 * @param _origin - Unused Host origin supplied for parity with the Client adapter.
 * @param _hasSources - Unused source availability supplied for parity with the Client adapter.
 * @returns No capabilities because the Worker attaches to Host V8 directly.
 */
export function bridgeCapabilities(_origin, _hasSources) {
    return HOST_BRIDGE_CAPABILITIES;
}
//# sourceMappingURL=index.js.map