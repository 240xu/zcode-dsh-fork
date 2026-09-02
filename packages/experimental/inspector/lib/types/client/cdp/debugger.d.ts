/** Client active debugging is not exposed by the source bridge. */
import type { InspectorSourceCapability } from '../../shared/bridge/messages/observation.ts';
/**
 * Describe unavailable browser-side active debugging.
 * @returns No source capability until a pause-safe Client debugger agent exists.
 */
export declare function debuggerBridgeCapability(): InspectorSourceCapability | undefined;
//# sourceMappingURL=debugger.d.ts.map