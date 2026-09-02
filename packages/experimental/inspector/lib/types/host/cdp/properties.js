/** Host property enumeration never crosses the Host source bridge. */
import { rejectObjectBridgeOperation } from "./objects.js";
/**
 * Reject a property request that must use the Worker-owned native inspector session.
 * @returns This function never returns.
 */
export function rejectPropertyBridgeOperation() {
    return rejectObjectBridgeOperation('client-runtime/get-properties');
}
//# sourceMappingURL=properties.js.map