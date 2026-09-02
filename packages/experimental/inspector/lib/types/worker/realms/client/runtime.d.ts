/** RuntimeBackend over the typed Worker-to-Client transport. */
import type { ClientRuntimeSessionId } from '../../../shared/bridge/ids.ts';
import type { RuntimeBackendObjectHandle } from '../../../shared/cdp/ids.ts';
import type { ClientRuntimeRouter, ClientRuntimeTarget } from '../../bridge/runtime-rpc.ts';
import type { RuntimeBackend } from '../../../shared/cdp/realm.ts';
import type { ClientScriptIdentity } from './scripts.ts';
/** Adapts one connection-local Client Runtime session to the common backend API. */
export declare class ClientRuntimeBackend implements RuntimeBackend {
    private readonly target;
    private readonly sessionId;
    private readonly router;
    private readonly scriptIds;
    private closed;
    constructor(target: ClientRuntimeTarget, sessionId: ClientRuntimeSessionId, router: ClientRuntimeRouter, scriptIds: ClientScriptIdentity);
    enable(): Promise<void>;
    disable(): Promise<void>;
    evaluate(request: Parameters<RuntimeBackend['evaluate']>[0]): ReturnType<RuntimeBackend['evaluate']>;
    getProperties(request: Parameters<RuntimeBackend['getProperties']>[0]): ReturnType<RuntimeBackend['getProperties']>;
    callFunction(request: Parameters<RuntimeBackend['callFunction']>[0]): ReturnType<RuntimeBackend['callFunction']>;
    awaitPromise(request: Parameters<RuntimeBackend['awaitPromise']>[0]): ReturnType<RuntimeBackend['awaitPromise']>;
    globalLexicalScopeNames(context?: Parameters<RuntimeBackend['globalLexicalScopeNames']>[0]): Promise<readonly string[]>;
    releaseObject(handle: RuntimeBackendObjectHandle): Promise<void>;
    releaseObjectGroup(group: string): Promise<void>;
    /** Close this connection's session and reject further requests. */
    close(): void;
    private request;
}
//# sourceMappingURL=runtime.d.ts.map