/** Host debugging is served directly by the Worker-side Node inspector adapter. */
import type { InspectorSourceCapability } from '../../shared/bridge/messages/observation.ts';
/**
 * Describe Host debugger transport ownership.
 * @returns No Host-main-thread Debugger bridge capability.
 */
export declare function debuggerBridgeCapability(): InspectorSourceCapability | undefined;
//# sourceMappingURL=debugger.d.ts.map