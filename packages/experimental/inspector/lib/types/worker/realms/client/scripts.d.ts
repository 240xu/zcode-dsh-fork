/** Realm-stable translation between Client catalog keys and common Runtime script keys. */
import type { RuntimeScriptKey } from '../../../shared/cdp/ids.ts';
/** Allocates one shared script identity namespace for all backends in a Client realm. */
export declare class ClientScriptIdentity {
    private readonly contextId;
    private readonly publicByLocal;
    constructor(contextId: number);
    /**
     * Convert a Client-local key to the realm's public Runtime script key.
     * @param localKey - Script key used on the Client wire.
     * @returns Stable key shared by this realm's Runtime, Console, and Sources backends.
     */
    toRuntime(localKey: RuntimeScriptKey): RuntimeScriptKey;
}
//# sourceMappingURL=scripts.d.ts.map