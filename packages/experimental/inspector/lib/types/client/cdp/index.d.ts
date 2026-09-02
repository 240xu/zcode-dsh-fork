/** Source-side CDP capability declarations for the browser Client realm. */
import type { InspectorSourceCapability } from '../../shared/bridge/messages/observation.ts';
/**
 * Describe Client operations that require Worker-to-page bridge messages.
 * @param origin - Origin assigned to the synthetic execution context.
 * @param hasSources - Whether the Client bundle source was discovered.
 * @returns Capabilities included in the Client source handshake.
 */
export declare function bridgeCapabilities(origin: string, hasSources: boolean): readonly InspectorSourceCapability[];
//# sourceMappingURL=index.d.ts.map