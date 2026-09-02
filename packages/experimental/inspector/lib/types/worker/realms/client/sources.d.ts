/** Client SourceBackend over the bounded browser source-catalog transport. */
import type { ClientSourceSessionId } from '../../../shared/bridge/ids.ts';
import type { RuntimeScriptKey } from '../../../shared/cdp/ids.ts';
import type { RuntimeScript } from '../../../shared/cdp/index.ts';
import type { ClientRuntimeTarget } from '../../bridge/runtime-rpc.ts';
import type { ClientSourceRouter } from '../../bridge/source-rpc.ts';
import type { SourceBackend } from '../../../shared/cdp/realm.ts';
import type { ClientScriptIdentity } from './scripts.ts';
/** Presents one Client bundle catalog through the common read-only source model. */
export declare class ClientSourceBackend implements SourceBackend {
    private readonly target;
    private readonly sessionId;
    private readonly router;
    private readonly scriptIds;
    private readonly scripts;
    private catalog;
    private closed;
    constructor(target: ClientRuntimeTarget, sessionId: ClientSourceSessionId, router: ClientSourceRouter, scriptIds: ClientScriptIdentity);
    listScripts(): Promise<readonly RuntimeScript[]>;
    getScriptSource(scriptKey: RuntimeScriptKey): Promise<string>;
    getSourceMap(scriptKey: RuntimeScriptKey): Promise<string | undefined>;
    subscribe(_listener: (script: RuntimeScript) => void): () => void;
    /** Reject pending reads owned by this DevTools connection. */
    close(): void;
    private loadCatalog;
    private register;
    private route;
    private read;
}
//# sourceMappingURL=sources.d.ts.map