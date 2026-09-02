/** Source-side CDP capability declarations for the Host realm. */
import type { InspectorSourceCapability } from '../../shared/bridge/messages/observation.ts';
/**
 * Collect Host source-bridge capabilities.
 * @param _origin - Unused Host origin supplied for parity with the Client adapter.
 * @param _hasSources - Unused source availability supplied for parity with the Client adapter.
 * @returns No capabilities because the Worker attaches to Host V8 directly.
 */
export declare function bridgeCapabilities(_origin: string, _hasSources: boolean): readonly InspectorSourceCapability[];
//# sourceMappingURL=index.d.ts.map