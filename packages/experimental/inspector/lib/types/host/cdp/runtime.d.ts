/** Host Runtime is served directly by the Worker-side Node inspector adapter. */
import type { ClientRuntimeCommand } from '../../shared/bridge/messages/runtime/index.ts';
import type { InspectorSourceCapability } from '../../shared/bridge/messages/observation.ts';
/**
 * Describe Host Runtime transport ownership.
 * @param _origin - Ignored because Host Runtime does not cross the source bridge.
 * @returns No Host-main-thread Runtime bridge capability.
 */
export declare function runtimeBridgeCapability(_origin: string): InspectorSourceCapability | undefined;
/**
 * Reject a Client Runtime command that was routed to the Host source.
 * @param command - Misrouted Client Runtime operation.
 * @returns This function never returns.
 */
export declare function rejectRuntimeBridgeCommand(command: ClientRuntimeCommand): never;
//# sourceMappingURL=runtime.d.ts.map