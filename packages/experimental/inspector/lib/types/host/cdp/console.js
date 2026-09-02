/** Host Console is served directly by the Worker-side Node inspector adapter. */
/**
 * Describe Host Console transport ownership.
 * @returns No Host-main-thread Console bridge capability.
 */
export function consoleBridgeCapability() {
    return undefined;
}
/**
 * Reject a Client Console control frame that was routed to the Host source.
 * @param operation - Misrouted Console frame type.
 * @returns This function never returns.
 */
export function rejectConsoleBridgeCommand(operation) {
    throw new Error(`inspector protocol: ${operation} cannot use the Host source bridge`);
}
//# sourceMappingURL=console.js.map