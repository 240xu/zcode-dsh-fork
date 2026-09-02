/** ConsoleBackend over the typed Client Console event transport. */
import type { ClientRuntimeSessionId } from '../../../shared/bridge/ids.ts';
import type { RuntimeBackendObjectHandle } from '../../../shared/cdp/ids.ts';
import type { RuntimeConsoleBackendEvent } from '../../../shared/cdp/index.ts';
import type { ClientRuntimeRouter, ClientRuntimeTarget } from '../../bridge/runtime-rpc.ts';
import type { ConsoleBackend } from '../../../shared/cdp/realm.ts';
import type { ClientScriptIdentity } from './scripts.ts';
/** Adapts session-local Client Console events to common Runtime values. */
export declare class ClientConsoleBackend implements ConsoleBackend {
    private readonly target;
    private readonly sessionId;
    private readonly router;
    private readonly scriptIds;
    private readonly disposers;
    constructor(target: ClientRuntimeTarget, sessionId: ClientRuntimeSessionId, router: ClientRuntimeRouter, scriptIds: ClientScriptIdentity);
    subscribe(listener: (event: RuntimeConsoleBackendEvent<RuntimeBackendObjectHandle>) => void): () => void;
    clear(): Promise<void>;
    /** Disable every active Console subscription for this connection. */
    close(): void;
}
//# sourceMappingURL=console.d.ts.map