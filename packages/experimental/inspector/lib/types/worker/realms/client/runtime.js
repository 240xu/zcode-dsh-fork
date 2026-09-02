/** RuntimeBackend over the typed Worker-to-Client transport. */
import { clientCompletion, clientException, clientHandle, clientInternalProperty, clientProperty, } from "./values.js";
/** Adapts one connection-local Client Runtime session to the common backend API. */
export class ClientRuntimeBackend {
    target;
    sessionId;
    router;
    scriptIds;
    closed = false;
    constructor(target, sessionId, router, scriptIds) {
        this.target = target;
        this.sessionId = sessionId;
        this.router = router;
        this.scriptIds = scriptIds;
    }
    enable() {
        return Promise.resolve();
    }
    disable() {
        this.router.closeTargetSession(this.target, this.sessionId);
        return Promise.resolve();
    }
    async evaluate(request) {
        assertClientEvaluationOptions(request);
        const { context: _context, throwOnSideEffect: _throwOnSideEffect, serializationOptions: _serializationOptions, ...supported } = request;
        return clientCompletion(expectResult(await this.request({ op: 'evaluate', ...supported }), 'evaluate'), scriptKey => this.scriptIds.toRuntime(scriptKey));
    }
    async getProperties(request) {
        const result = expectResult(await this.request({
            op: 'get-properties',
            ...request,
            handle: clientHandle(request.handle),
        }), 'get-properties');
        return {
            properties: result.properties.map(clientProperty),
            ...(result.internalProperties === undefined
                ? {}
                : { internalProperties: result.internalProperties.map(clientInternalProperty) }),
            ...(result.exceptionDetails === undefined
                ? {}
                : {
                    exceptionDetails: clientException(result.exceptionDetails, scriptKey => this.scriptIds.toRuntime(scriptKey)),
                }),
        };
    }
    async callFunction(request) {
        assertClientCallOptions(request);
        const { receiver, context: _context, arguments: args, throwOnSideEffect: _throwOnSideEffect, serializationOptions: _serializationOptions, ...options } = request;
        const command = {
            op: 'call-function',
            ...options,
            ...(receiver === undefined ? {} : { receiver: clientHandle(receiver) }),
            ...(args === undefined ? {} : { arguments: args.map(argumentToClient) }),
        };
        return clientCompletion(expectResult(await this.request(command), 'call-function'), scriptKey => this.scriptIds.toRuntime(scriptKey));
    }
    async awaitPromise(request) {
        return clientCompletion(expectResult(await this.request({
            op: 'await-promise',
            ...request,
            promise: clientHandle(request.promise),
        }), 'await-promise'), scriptKey => this.scriptIds.toRuntime(scriptKey));
    }
    async globalLexicalScopeNames(context) {
        if (context !== undefined)
            throw new Error('Client Runtime does not support native execution contexts');
        return expectResult(await this.request({ op: 'global-lexical-scope-names' }), 'global-lexical-scope-names').names;
    }
    async releaseObject(handle) {
        expectResult(await this.request({ op: 'release-object', handle: clientHandle(handle) }), 'release-object');
    }
    async releaseObjectGroup(group) {
        expectResult(await this.request({ op: 'release-object-group', objectGroup: group }), 'release-object-group');
    }
    /** Close this connection's session and reject further requests. */
    close() {
        if (this.closed)
            return;
        this.closed = true;
        this.router.closeTargetSession(this.target, this.sessionId);
    }
    request(command) {
        if (this.closed)
            return Promise.reject(new Error('Client realm session is closed'));
        return this.router.request(this.target, this.sessionId, command);
    }
}
function argumentToClient(value) {
    return value.kind === 'object' ? { kind: 'object', handle: clientHandle(value.handle) } : value;
}
function expectResult(result, operation) {
    if (result.op !== operation)
        throw new Error(`Client Runtime returned ${result.op} for ${operation}`);
    return result;
}
function assertClientEvaluationOptions(request) {
    if (request.context !== undefined)
        throw new Error('Client Runtime does not support native execution contexts');
    if (request.throwOnSideEffect === true)
        throw new Error('Client Runtime does not support throwOnSideEffect');
    if (request.serializationOptions !== undefined)
        throw new Error('Client Runtime does not support serializationOptions');
    if (request.disableBreaks === true)
        throw new Error('Client Runtime does not support disableBreaks');
    if (request.allowUnsafeEvalBlockedByCSP === true) {
        throw new Error('Client Runtime cannot bypass the page Content Security Policy');
    }
    if (request.timeoutMs !== undefined && request.awaitPromise !== true) {
        throw new Error('Client Runtime supports timeout only when awaitPromise is enabled');
    }
}
function assertClientCallOptions(request) {
    if (request.context !== undefined)
        throw new Error('Client Runtime does not support native execution contexts');
    if (request.throwOnSideEffect === true)
        throw new Error('Client Runtime does not support throwOnSideEffect');
    if (request.serializationOptions !== undefined)
        throw new Error('Client Runtime does not support serializationOptions');
    if (request.userGesture === true)
        throw new Error('Client Runtime does not support userGesture');
}
//# sourceMappingURL=runtime.js.map