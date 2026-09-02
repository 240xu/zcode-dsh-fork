/** SourceBackend implementation over native Node Debugger notifications. */
import type { RuntimeScriptKey } from '../../../shared/cdp/ids.ts';
import type { RuntimeScript } from '../../../shared/cdp/index.ts';
import type { HostInspectorSession } from './bridge.ts';
import type { SourceBackend } from '../../../shared/cdp/realm.ts';
/** Maintains one connection-local catalog of scripts reported by Node's inspector. */
export declare class HostSourceBackend implements SourceBackend {
    private readonly target;
    private readonly scripts;
    private readonly listeners;
    private readonly unsubscribe;
    constructor(target: HostInspectorSession);
    listScripts(): Promise<readonly RuntimeScript[]>;
    getScriptSource(scriptKey: RuntimeScriptKey): Promise<string>;
    getSourceMap(_scriptKey: RuntimeScriptKey): Promise<string | undefined>;
    /**
     * Subscribe to scripts discovered after the initial catalog read.
     * @param listener - Consumer of newly discovered scripts.
     * @returns A disposer removing the consumer.
     */
    subscribe(listener: (script: RuntimeScript) => void): () => void;
    /** Release the native notification subscription and cached catalog. */
    close(): void;
    private receive;
}
//# sourceMappingURL=sources.d.ts.map