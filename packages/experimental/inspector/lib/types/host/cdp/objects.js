/** Host RemoteObject handles never cross the Host source bridge. */
import { HostCdpBridgeUnavailableError } from "./errors.js";
/**
 * Reject an object operation that must use the Worker-owned native inspector session.
 * @param operation - Misrouted object operation.
 * @returns This function never returns.
 */
export function rejectObjectBridgeOperation(operation) {
    throw new HostCdpBridgeUnavailableError(operation);
}
//# sourceMappingURL=objects.js.map