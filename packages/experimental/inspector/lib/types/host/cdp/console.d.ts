/** Host Console is served directly by the Worker-side Node inspector adapter. */
import type { InspectorSourceCapability } from '../../shared/bridge/messages/observation.ts';
/**
 * Describe Host Console transport ownership.
 * @returns No Host-main-thread Console bridge capability.
 */
export declare function consoleBridgeCapability(): InspectorSourceCapability | undefined;
/**
 * Reject a Client Console control frame that was routed to the Host source.
 * @param operation - Misrouted Console frame type.
 * @returns This function never returns.
 */
export declare function rejectConsoleBridgeCommand(operation: string): never;
//# sourceMappingURL=console.d.ts.map