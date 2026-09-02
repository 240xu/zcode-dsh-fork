/** Host-native script identity conversion for normalized source and debugger values. */
import type { RuntimeScriptKey } from '../../../shared/cdp/ids.ts';
/**
 * Convert a Node inspector script id into the realm backend identity namespace.
 * @param value - Native Node inspector script id.
 * @returns The corresponding normalized script key.
 */
export declare function hostScriptKey(value: string): RuntimeScriptKey;
//# sourceMappingURL=scripts.d.ts.map