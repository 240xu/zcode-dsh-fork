/** Connection-local routing from CDP ScriptId values to realm source backends. */
import type { RuntimeScriptKey } from '../../../../shared/cdp/ids.ts';
import type { RuntimeScript } from '../../../../shared/cdp/index.ts';
import type { SourceBackend } from '../../../../shared/cdp/realm.ts';
import type { InspectorRealmSession } from '../../../inspection/realm.ts';
import { type CdpScriptId } from '../../ids.ts';
/** One script and the realm source backend that owns its content. */
export interface DebuggerScriptRoute {
    readonly realm: InspectorRealmSession;
    readonly source: SourceBackend;
    readonly script: RuntimeScript;
}
/** Tracks active and retired scripts without exposing source transport ids. */
export declare class DebuggerScriptRegistry {
    private readonly routes;
    private readonly retiredUnsupported;
    /**
     * Register one realm script under its globally unique Runtime script key.
     * @param route - Script descriptor and owning realm session.
     * @returns The CDP ScriptId and whether this is its first announcement.
     */
    register(route: DebuggerScriptRoute): {
        readonly scriptId: CdpScriptId;
        readonly fresh: boolean;
    };
    /**
     * Resolve an active CDP ScriptId.
     * @param scriptId - Connection-visible script id.
     * @returns The active route when the script remains connected.
     */
    resolve(scriptId: string): DebuggerScriptRoute | undefined;
    /**
     * Resolve a script by its exact URL.
     * @param url - Script URL from a CDP request.
     * @returns The active route when one script has that URL.
     */
    byUrl(url: string): DebuggerScriptRoute | undefined;
    /**
     * Resolve a script by its exact content hash.
     * @param hash - Script hash from a breakpoint request.
     * @returns The active route when one script has that hash.
     */
    byHash(hash: string): DebuggerScriptRoute | undefined;
    /**
     * Resolve the first script whose URL matches a breakpoint regular expression.
     * @param pattern - JavaScript regular-expression source accepted by CDP.
     * @returns The first matching active route.
     */
    byUrlPattern(pattern: string): DebuggerScriptRoute | undefined;
    /**
     * Test whether a disconnected script belonged to a realm without active debugging.
     * @param scriptId - Script id from a later CDP request.
     * @returns Whether the id must still fail as an unsupported Client script.
     */
    wasUnsupported(scriptId: string): boolean;
    /**
     * Forget scripts for one closed realm while retaining their unsupported identity.
     * @param realm - Realm session being removed.
     */
    removeRealm(realm: InspectorRealmSession): void;
    /** Forget all active and retired script routes. */
    clear(): void;
}
/**
 * Preserve a branded script key as its CDP wire identifier.
 * @param scriptKey - Realm-wide Runtime script key.
 * @returns The corresponding CDP ScriptId text.
 */
export declare function cdpScriptId(scriptKey: RuntimeScriptKey): CdpScriptId;
//# sourceMappingURL=script-registry.d.ts.map