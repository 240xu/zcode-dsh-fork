/** Connection-local routing from CDP ScriptId values to realm source backends. */
import { cdpStringId } from "../../ids.js";
/** Tracks active and retired scripts without exposing source transport ids. */
export class DebuggerScriptRegistry {
    routes = new Map();
    retiredUnsupported = new Set();
    /**
     * Register one realm script under its globally unique Runtime script key.
     * @param route - Script descriptor and owning realm session.
     * @returns The CDP ScriptId and whether this is its first announcement.
     */
    register(route) {
        const scriptId = cdpScriptId(route.script.scriptKey);
        const current = this.routes.get(scriptId);
        if (current !== undefined && current.realm !== route.realm) {
            throw new Error(`Inspector realms produced the same script key ${scriptId}`);
        }
        this.routes.set(scriptId, route);
        return { scriptId, fresh: current === undefined };
    }
    /**
     * Resolve an active CDP ScriptId.
     * @param scriptId - Connection-visible script id.
     * @returns The active route when the script remains connected.
     */
    resolve(scriptId) {
        return this.routes.get(cdpStringId(scriptId, 'scriptId'));
    }
    /**
     * Resolve a script by its exact URL.
     * @param url - Script URL from a CDP request.
     * @returns The active route when one script has that URL.
     */
    byUrl(url) {
        for (const route of this.routes.values()) {
            if (route.script.url === url)
                return route;
        }
        return undefined;
    }
    /**
     * Resolve a script by its exact content hash.
     * @param hash - Script hash from a breakpoint request.
     * @returns The active route when one script has that hash.
     */
    byHash(hash) {
        for (const route of this.routes.values()) {
            if (route.script.hash === hash)
                return route;
        }
        return undefined;
    }
    /**
     * Resolve the first script whose URL matches a breakpoint regular expression.
     * @param pattern - JavaScript regular-expression source accepted by CDP.
     * @returns The first matching active route.
     */
    byUrlPattern(pattern) {
        const expression = new RegExp(pattern, 'u');
        for (const route of this.routes.values()) {
            if (expression.test(route.script.url))
                return route;
        }
        return undefined;
    }
    /**
     * Test whether a disconnected script belonged to a realm without active debugging.
     * @param scriptId - Script id from a later CDP request.
     * @returns Whether the id must still fail as an unsupported Client script.
     */
    wasUnsupported(scriptId) {
        return this.retiredUnsupported.has(cdpStringId(scriptId, 'scriptId'));
    }
    /**
     * Forget scripts for one closed realm while retaining their unsupported identity.
     * @param realm - Realm session being removed.
     */
    removeRealm(realm) {
        for (const [scriptId, route] of this.routes) {
            if (route.realm !== realm)
                continue;
            this.routes.delete(scriptId);
            if (realm.debugger.state === 'unsupported')
                this.retiredUnsupported.add(scriptId);
        }
    }
    /** Forget all active and retired script routes. */
    clear() {
        this.routes.clear();
        this.retiredUnsupported.clear();
    }
}
/**
 * Preserve a branded script key as its CDP wire identifier.
 * @param scriptKey - Realm-wide Runtime script key.
 * @returns The corresponding CDP ScriptId text.
 */
export function cdpScriptId(scriptKey) {
    return cdpStringId(scriptKey, 'scriptId');
}
//# sourceMappingURL=script-registry.js.map