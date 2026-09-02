/** Host Runtime is served directly by the Worker-side Node inspector adapter. */
import { HostCdpBridgeUnavailableError } from "./errors.js";
import { rejectObjectBridgeOperation } from "./objects.js";
import { rejectPropertyBridgeOperation } from "./properties.js";
/**
 * Describe Host Runtime transport ownership.
 * @param _origin - Ignored because Host Runtime does not cross the source bridge.
 * @returns No Host-main-thread Runtime bridge capability.
 */
export function runtimeBridgeCapability(_origin) {
    return undefined;
}
/**
 * Reject a Client Runtime command that was routed to the Host source.
 * @param command - Misrouted Client Runtime operation.
 * @returns This function never returns.
 */
export function rejectRuntimeBridgeCommand(command) {
    switch (command.op) {
        case 'get-properties':
            return rejectPropertyBridgeOperation();
        case 'release-object':
        case 'release-object-group':
            return rejectObjectBridgeOperation(`client-runtime/${command.op}`);
        case 'evaluate':
        case 'call-function':
        case 'await-promise':
        case 'global-lexical-scope-names':
            throw new HostCdpBridgeUnavailableError(`client-runtime/${command.op}`);
        default:
            return assertNever(command);
    }
}
function assertNever(value) {
    throw new Error(`Unexpected Host Runtime bridge command: ${JSON.stringify(value)}`);
}
//# sourceMappingURL=runtime.js.map