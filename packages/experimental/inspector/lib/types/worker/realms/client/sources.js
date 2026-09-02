/** Client SourceBackend over the bounded browser source-catalog transport. */
/** Presents one Client bundle catalog through the common read-only source model. */
export class ClientSourceBackend {
    target;
    sessionId;
    router;
    scriptIds;
    scripts = new Map();
    catalog;
    closed = false;
    constructor(target, sessionId, router, scriptIds) {
        this.target = target;
        this.sessionId = sessionId;
        this.router = router;
        this.scriptIds = scriptIds;
    }
    async listScripts() {
        if (this.closed)
            throw new Error('Client source session is closed');
        this.catalog ??= this.loadCatalog();
        return this.catalog;
    }
    async getScriptSource(scriptKey) {
        const route = await this.route(scriptKey);
        const source = await this.read(route.localKey, 'source');
        if (source === undefined)
            throw new Error('Client script source is unavailable');
        return source;
    }
    async getSourceMap(scriptKey) {
        const route = await this.route(scriptKey);
        return this.read(route.localKey, 'source-map');
    }
    subscribe(_listener) {
        return () => { };
    }
    /** Reject pending reads owned by this DevTools connection. */
    close() {
        if (this.closed)
            return;
        this.closed = true;
        this.router.closeSession(this.target.source, this.sessionId);
        this.scripts.clear();
    }
    async loadCatalog() {
        const result = expectResult(await this.router.request(this.target.source, this.sessionId, { op: 'list-scripts' }), 'list-scripts');
        return result.scripts.map(script => this.register(script));
    }
    register(script) {
        const scriptKey = this.scriptIds.toRuntime(script.scriptKey);
        const descriptor = {
            ...script,
            scriptKey,
            executionContextId: this.target.contextId,
        };
        this.scripts.set(scriptKey, { localKey: script.scriptKey });
        return descriptor;
    }
    async route(scriptKey) {
        await this.listScripts();
        const route = this.scripts.get(scriptKey);
        if (route === undefined)
            throw new Error('Client script is no longer available');
        return route;
    }
    async read(scriptKey, content) {
        const chunks = [];
        let offset = 0;
        while (true) {
            const result = expectResult(await this.router.request(this.target.source, this.sessionId, {
                op: 'get-content-chunk',
                scriptKey,
                content,
                offset,
                maxBytes: this.router.chunkBytes,
            }), 'get-content-chunk');
            if (!result.available)
                return undefined;
            const bytes = Buffer.from(result.data, 'base64');
            if (bytes.byteLength > this.router.chunkBytes
                || result.nextOffset !== offset + bytes.byteLength
                || (!result.eof && result.nextOffset === offset)
                || result.nextOffset > this.router.maxContentBytes) {
                throw new Error('Client source returned an invalid content chunk');
            }
            chunks.push(bytes);
            offset = result.nextOffset;
            if (result.eof)
                break;
        }
        return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
    }
}
function expectResult(result, operation) {
    if (result.op !== operation)
        throw new Error(`Client source returned ${result.op} for ${operation}`);
    return result;
}
//# sourceMappingURL=sources.js.map