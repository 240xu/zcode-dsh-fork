/** Browser Client bridge construction for the Cordis plugin entry. */
import { ClientInspectorSource } from "./transport.js";
import { ClientRealmSource } from "../inspection/realm.js";
/**
 * Start the browser source transport for one validated Host bootstrap.
 * @param bootstrap - Host-injected endpoint and resource limits.
 * @returns The active reconnecting Client source after its tab identity is claimed.
 */
export async function startInspectorClient(bootstrap) {
    const label = document.title || 'Client';
    const realmSource = await ClientRealmSource.claim(label);
    try {
        return new ClientInspectorSource(bootstrap, label, undefined, realmSource);
    }
    catch (error) {
        realmSource.close();
        throw error;
    }
}
//# sourceMappingURL=controller.js.map