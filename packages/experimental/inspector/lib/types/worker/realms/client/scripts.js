/** Realm-stable translation between Client catalog keys and common Runtime script keys. */
import { inspectorId } from "../../../shared/identity.js";
/** Allocates one shared script identity namespace for all backends in a Client realm. */
export class ClientScriptIdentity {
    contextId;
    publicByLocal = new Map();
    constructor(contextId) {
        this.contextId = contextId;
    }
    /**
     * Convert a Client-local key to the realm's public Runtime script key.
     * @param localKey - Script key used on the Client wire.
     * @returns Stable key shared by this realm's Runtime, Console, and Sources backends.
     */
    toRuntime(localKey) {
        let scriptKey = this.publicByLocal.get(localKey);
        if (scriptKey !== undefined)
            return scriptKey;
        scriptKey = inspectorId(`client:${String(Math.abs(this.contextId))}:${String(this.publicByLocal.size + 1)}`, 'scriptKey');
        this.publicByLocal.set(localKey, scriptKey);
        return scriptKey;
    }
}
//# sourceMappingURL=scripts.js.map