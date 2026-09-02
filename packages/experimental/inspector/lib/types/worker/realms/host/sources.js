/** SourceBackend implementation over native Node Debugger notifications. */
import { hostScriptKey } from "./scripts.js";
/** Maintains one connection-local catalog of scripts reported by Node's inspector. */
export class HostSourceBackend {
    target;
    scripts = new Map();
    listeners = new Set();
    unsubscribe;
    constructor(target) {
        this.target = target;
        this.unsubscribe = target.subscribe((message) => { this.receive(message); });
    }
    listScripts() {
        return Promise.resolve([...this.scripts.values()].map(script => script.descriptor));
    }
    async getScriptSource(scriptKey) {
        const script = this.scripts.get(scriptKey);
        if (script === undefined)
            throw new Error('Host script is no longer available');
        const result = await this.target.request('Debugger.getScriptSource', { scriptId: script.nativeId });
        if (typeof result.scriptSource !== 'string')
            throw new Error('Host Debugger returned no script source');
        return result.scriptSource;
    }
    getSourceMap(_scriptKey) {
        return Promise.resolve(undefined);
    }
    /**
     * Subscribe to scripts discovered after the initial catalog read.
     * @param listener - Consumer of newly discovered scripts.
     * @returns A disposer removing the consumer.
     */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }
    /** Release the native notification subscription and cached catalog. */
    close() {
        this.unsubscribe();
        this.scripts.clear();
        this.listeners.clear();
    }
    receive(message) {
        if (message.method !== 'Debugger.scriptParsed')
            return;
        const params = message.params;
        if (params === undefined
            || typeof params.scriptId !== 'string'
            || typeof params.url !== 'string'
            || !isInteger(params.startLine)
            || !isInteger(params.startColumn)
            || !isInteger(params.endLine)
            || !isInteger(params.endColumn))
            return;
        const scriptKey = hostScriptKey(params.scriptId);
        const descriptor = {
            scriptKey,
            url: params.url,
            hash: typeof params.hash === 'string' ? params.hash : '',
            ...(typeof params.buildId === 'string' ? { buildId: params.buildId } : {}),
            startLine: params.startLine,
            startColumn: params.startColumn,
            endLine: params.endLine,
            endColumn: params.endColumn,
            ...(typeof params.sourceMapURL === 'string' && params.sourceMapURL.length > 0
                ? { sourceMapUrl: params.sourceMapURL }
                : {}),
            ...(isInteger(params.executionContextId) ? { executionContextId: params.executionContextId } : {}),
            ...(typeof params.isModule === 'boolean' ? { isModule: params.isModule } : {}),
            ...(isInteger(params.length) ? { length: params.length } : {}),
        };
        this.scripts.set(scriptKey, { descriptor, nativeId: params.scriptId });
        for (const listener of [...this.listeners]) {
            try {
                listener(descriptor);
            }
            catch {
                // One source consumer cannot prevent delivery to sibling consumers.
            }
        }
    }
}
function isInteger(value) {
    return Number.isSafeInteger(value) && value >= 0;
}
//# sourceMappingURL=sources.js.map