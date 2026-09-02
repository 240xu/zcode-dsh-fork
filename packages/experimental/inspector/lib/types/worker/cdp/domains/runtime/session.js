/** Per-DevTools-session Runtime routing across uniform Host and Client realms. */
import { cdpError, respondToCdpRequest } from "../../protocol.js";
import { parseAwaitPromise, parseCallFunction, parseEvaluate, parseGetProperties, parseGlobalLexicalScopeNames, parseReleaseObject, parseReleaseObjectGroup, } from "./cdp-params.js";
import { RuntimeObjectTable } from "./object-table.js";
/** Runtime router layered over the common per-connection realm sessions. */
export class RuntimeDomainSession {
    transport;
    realms;
    objects;
    announcedContexts = new Set();
    consoleDisposers = new Map();
    unsubscribeRealms;
    enabled = false;
    closed = false;
    constructor(transport, realms) {
        this.transport = transport;
        this.realms = realms;
        this.objects = new RuntimeObjectTable(realms.connectionId);
        this.unsubscribeRealms = realms.subscribe((event) => { this.receiveRealm(event); });
    }
    /**
     * Handle methods that require cross-realm Runtime coordination.
     * @param request - Parsed CDP request.
     * @returns Whether this domain owns the method or object id.
     */
    handle(request) {
        switch (request.method) {
            case 'Runtime.enable':
                this.respond(request, () => this.enable());
                return true;
            case 'Runtime.disable':
                this.respond(request, () => this.disable());
                return true;
            case 'Runtime.evaluate':
                this.respond(request, () => this.evaluate(request.params));
                return true;
            case 'Runtime.getProperties':
                return this.getProperties(request);
            case 'Runtime.callFunctionOn':
                return this.callFunction(request);
            case 'Runtime.awaitPromise':
                return this.awaitPromise(request);
            case 'Runtime.releaseObject':
                return this.releaseObject(request);
            case 'Runtime.releaseObjectGroup':
                this.respond(request, () => this.releaseObjectGroup(request.params));
                return true;
            case 'Runtime.globalLexicalScopeNames':
                this.respond(request, () => this.globalLexicalScopeNames(request.params));
                return true;
            case 'Runtime.discardConsoleEntries':
                this.respond(request, () => this.discardConsoleEntries());
                return true;
            default:
                if (request.method.startsWith('Runtime.')) {
                    const reason = this.unsupportedNativeRoute(request.params);
                    if (reason !== undefined) {
                        this.sendError(request, reason);
                        return true;
                    }
                }
                return false;
        }
    }
    /** Release this connection's object routes and realm subscription. */
    close() {
        if (this.closed)
            return;
        this.closed = true;
        this.unsubscribeRealms();
        for (const dispose of this.consoleDisposers.values())
            dispose();
        this.consoleDisposers.clear();
        this.objects.clear();
        this.announcedContexts.clear();
    }
    /**
     * Install semantic object recognition shared with the DOM adapter.
     * @param observer - Callback invoked for objects carrying semantic references.
     */
    setObjectObserver(observer) {
        this.objects.setObserver(observer);
    }
    /**
     * Resolve a connection-local CDP object id for another domain adapter.
     * @param objectId - CDP object id allocated by this Runtime session.
     * @returns Its realm and backend handle when still live.
     */
    objectRoute(objectId) {
        return this.objects.resolve(objectId);
    }
    /**
     * Project a completion produced by another domain through this connection's object table.
     * @param realm - Realm session that owns the completion.
     * @param completion - Realm-neutral result and exception fields.
     * @param group - Object group assigned to exposed handles.
     * @returns CDP Runtime result fields.
     */
    projectCompletion(realm, completion, group) {
        return this.objects.completion(realm, completion, group);
    }
    /**
     * Project one Runtime value produced by another domain.
     * @param realm - Realm session that owns the value.
     * @param value - Realm-neutral Runtime value.
     * @param group - Object group assigned to an exposed handle.
     * @returns CDP RemoteObject fields.
     */
    projectRemoteObject(realm, value, group) {
        return this.objects.remote(realm, value, group);
    }
    /**
     * Forget connection-local ids retained for another domain's object group.
     * @param group - Object group whose projected ids have expired.
     */
    releaseProjectedGroup(group) {
        this.objects.releaseGroup(group);
    }
    /**
     * Replace common object ids with native backend handles in a Host-only request.
     * @param params - Parsed CDP parameters that may contain nested object ids.
     * @returns A detached parameter record suitable for the native Host protocol.
     */
    nativeParameters(params) {
        const visit = (value, key) => {
            if ((key === 'objectId' || key?.endsWith('ObjectId') === true) && typeof value === 'string') {
                const route = this.objects.resolve(value);
                if (route === undefined)
                    return value;
                if (route.realm.nativeDomains.state === 'unsupported')
                    throw new Error(route.realm.nativeDomains.reason);
                return route.handle;
            }
            if (Array.isArray(value))
                return value.map(item => visit(item, undefined));
            if (typeof value !== 'object' || value === null)
                return value;
            return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, visit(item, name)]));
        };
        return visit(params, undefined);
    }
    /**
     * Resolve one realm-registry expression to a connection-local object id.
     * @param source - Source generation that owns the Cordis tree node.
     * @param expression - Side-effect-free realm object lookup.
     * @param objectGroup - Optional DevTools retention group.
     * @returns The CDP RemoteObject fields.
     */
    async resolveObject(source, expression, objectGroup) {
        const realm = this.realms.bySource(source);
        if (realm === undefined)
            throw new Error('Cordis realm is no longer connected');
        const runtime = runtimeBackend(realm);
        const completion = await runtime.evaluate({
            expression,
            generatePreview: true,
            ...(objectGroup === undefined ? {} : { objectGroup }),
        });
        if (completion.exceptionDetails !== undefined)
            throw new Error('Cordis object lookup failed');
        return this.objects.completion(realm, completion, objectGroup).result;
    }
    async enable() {
        this.enabled = true;
        try {
            await Promise.all(this.realms.all().map(async (realm) => { await runtimeBackend(realm).enable(); }));
            for (const realm of this.realms.all()) {
                this.attachConsole(realm);
                this.announce(realm);
            }
            return {};
        }
        catch (error) {
            this.enabled = false;
            for (const dispose of this.consoleDisposers.values())
                dispose();
            this.consoleDisposers.clear();
            this.announcedContexts.clear();
            await Promise.allSettled(this.realms.all().map(async (realm) => { await runtimeBackend(realm).disable(); }));
            throw error;
        }
    }
    async disable() {
        for (const dispose of this.consoleDisposers.values())
            dispose();
        this.consoleDisposers.clear();
        try {
            await Promise.all(this.realms.all().map(async (realm) => { await runtimeBackend(realm).disable(); }));
        }
        finally {
            this.enabled = false;
            this.objects.clear();
            this.announcedContexts.clear();
        }
        return {};
    }
    async evaluate(params) {
        const parsed = parseEvaluate(params);
        const realm = this.realmFromSelector(parsed, 'contextId');
        const completion = await runtimeBackend(realm).evaluate({
            ...parsed.request,
            ...this.backendContext(realm, parsed, 'contextId'),
        });
        return this.objects.completion(realm, completion, parsed.request.objectGroup);
    }
    getProperties(request) {
        const objectId = request.params.objectId;
        if (typeof objectId !== 'string')
            return false;
        const route = this.objects.resolve(objectId);
        if (route === undefined)
            return false;
        this.respond(request, async () => {
            const parsed = parseGetProperties(request.params);
            const properties = await runtimeBackend(route.realm).getProperties({ ...parsed.request, handle: route.handle });
            return this.objects.properties(route.realm, properties, route.group);
        });
        return true;
    }
    callFunction(request) {
        const objectId = typeof request.params.objectId === 'string' ? request.params.objectId : undefined;
        const receiver = objectId === undefined ? undefined : this.objects.resolve(objectId);
        const selected = this.realmFromOptionalSelector(request.params, 'executionContextId');
        if (receiver === undefined && selected === undefined && objectId !== undefined)
            return false;
        const realm = receiver?.realm ?? selected ?? this.realms.host();
        if (receiver !== undefined && selected !== undefined && receiver.realm !== selected) {
            this.sendError(request, 'Runtime.callFunctionOn receiver and execution context belong to different realms');
            return true;
        }
        this.respond(request, async () => {
            const parsed = parseCallFunction(request.params);
            const group = parsed.request.objectGroup ?? receiver?.group;
            const completion = await runtimeBackend(realm).callFunction({
                ...parsed.request,
                ...this.backendContext(realm, parsed, 'executionContextId'),
                ...(receiver === undefined ? {} : { receiver: receiver.handle }),
                arguments: parsed.arguments.map(argument => this.routeArgument(realm, argument)),
            });
            return this.objects.completion(realm, completion, group);
        });
        return true;
    }
    awaitPromise(request) {
        const objectId = request.params.promiseObjectId;
        if (typeof objectId !== 'string')
            return false;
        const route = this.objects.resolve(objectId);
        if (route === undefined)
            return false;
        this.respond(request, async () => {
            const parsed = parseAwaitPromise(request.params);
            const completion = await runtimeBackend(route.realm).awaitPromise({ ...parsed.request, promise: route.handle });
            return this.objects.completion(route.realm, completion, route.group);
        });
        return true;
    }
    releaseObject(request) {
        const objectId = request.params.objectId;
        if (typeof objectId !== 'string')
            return false;
        const route = this.objects.resolve(objectId);
        if (route === undefined)
            return false;
        this.respond(request, async () => {
            parseReleaseObject(request.params);
            await runtimeBackend(route.realm).releaseObject(route.handle);
            this.objects.release(objectId);
            return {};
        });
        return true;
    }
    async releaseObjectGroup(params) {
        const group = parseReleaseObjectGroup(params);
        const realms = this.objects.realmsInGroup(group);
        try {
            await Promise.all(realms.map(async (realm) => { await runtimeBackend(realm).releaseObjectGroup(group); }));
        }
        finally {
            this.objects.releaseGroup(group);
        }
        return {};
    }
    async globalLexicalScopeNames(params) {
        const parsed = parseGlobalLexicalScopeNames(params);
        const realm = this.realmFromSelector(parsed, 'executionContextId');
        const context = this.backendContext(realm, parsed, 'executionContextId').context;
        return { names: await runtimeBackend(realm).globalLexicalScopeNames(context) };
    }
    async discardConsoleEntries() {
        await Promise.all(this.realms.all().map(async (realm) => {
            if (realm.console.state === 'supported')
                await realm.console.backend.clear();
            await runtimeBackend(realm).releaseObjectGroup('console');
        }));
        this.objects.releaseGroup('console');
        return {};
    }
    realmFromSelector(params, numericKey) {
        return this.realmFromOptionalSelector(params, numericKey) ?? this.realms.host();
    }
    realmFromOptionalSelector(params, numericKey) {
        const numeric = params[numericKey];
        if (typeof numeric === 'number' && Number.isSafeInteger(numeric)) {
            const realm = this.realms.byContextId(numeric);
            if (realm !== undefined)
                return realm;
            if (numeric < 0)
                throw new Error('Client execution context is no longer available');
            return this.realms.host();
        }
        const unique = params.uniqueContextId;
        if (typeof unique === 'string') {
            const realm = this.realms.byUniqueContextId(unique);
            if (realm !== undefined)
                return realm;
            if (unique.startsWith('dsh-client:'))
                throw new Error('Client execution context is no longer available');
            return this.realms.host();
        }
        return undefined;
    }
    backendContext(realm, params, numericKey) {
        if (realm.context.kind !== 'native')
            return {};
        const numeric = params[numericKey];
        if (typeof numeric === 'number')
            return { context: { kind: 'numeric', id: numeric } };
        return params.uniqueContextId === undefined
            ? {}
            : { context: { kind: 'unique', id: params.uniqueContextId } };
    }
    routeArgument(realm, argument) {
        if (argument.kind !== 'object')
            return argument;
        const route = this.objects.resolve(argument.objectId);
        if (route === undefined || route.realm !== realm) {
            throw new Error('Runtime.callFunctionOn cannot pass an object between realms');
        }
        return { kind: 'object', handle: route.handle };
    }
    unsupportedNativeRoute(params) {
        for (const key of ['contextId', 'executionContextId']) {
            const contextId = params[key];
            if (typeof contextId !== 'number')
                continue;
            const realm = this.realms.byContextId(contextId);
            if (realm?.nativeDomains.state === 'unsupported')
                return realm.nativeDomains.reason;
            if (contextId < 0 && realm === undefined)
                return 'Client execution context is no longer available';
        }
        if (typeof params.uniqueContextId === 'string') {
            const realm = this.realms.byUniqueContextId(params.uniqueContextId);
            if (realm?.nativeDomains.state === 'unsupported')
                return realm.nativeDomains.reason;
            if (params.uniqueContextId.startsWith('dsh-client:') && realm === undefined) {
                return 'Client execution context is no longer available';
            }
        }
        for (const [key, value] of Object.entries(params)) {
            if (!key.endsWith('ObjectId') && key !== 'objectId')
                continue;
            if (typeof value !== 'string')
                continue;
            const route = this.objects.resolve(value);
            if (route?.realm.nativeDomains.state === 'unsupported')
                return route.realm.nativeDomains.reason;
        }
        return undefined;
    }
    receiveRealm(event) {
        if (event.type === 'opened') {
            if (this.enabled) {
                void runtimeBackend(event.session).enable().then(() => {
                    this.attachConsole(event.session);
                    this.announce(event.session);
                }, () => { event.session.close(); });
            }
            return;
        }
        this.consoleDisposers.get(event.session.descriptor.realmId)?.();
        this.consoleDisposers.delete(event.session.descriptor.realmId);
        this.objects.releaseRealm(event.session);
        this.destroy(event.session);
    }
    attachConsole(realm) {
        if (realm.console.state === 'unsupported' || this.consoleDisposers.has(realm.descriptor.realmId))
            return;
        this.consoleDisposers.set(realm.descriptor.realmId, realm.console.backend.subscribe((event) => {
            if (!this.enabled)
                return;
            this.transport.send(this.objects.consoleEvent(realm, event));
        }));
    }
    announce(realm) {
        if (!this.enabled || realm.context.kind !== 'synthetic' || this.announcedContexts.has(realm.context.id))
            return;
        this.announcedContexts.add(realm.context.id);
        this.transport.send({
            method: 'Runtime.executionContextCreated',
            params: {
                context: {
                    id: realm.context.id,
                    uniqueId: realm.context.uniqueId,
                    origin: realm.context.origin,
                    name: `Client — ${realm.descriptor.label}`,
                    auxData: { isDefault: false, type: 'dsh-client', sourceId: realm.descriptor.sourceId },
                },
            },
        });
    }
    destroy(realm) {
        if (realm.context.kind !== 'synthetic' || !this.announcedContexts.delete(realm.context.id))
            return;
        this.transport.send({
            method: 'Runtime.executionContextDestroyed',
            params: {
                executionContextId: realm.context.id,
                executionContextUniqueId: realm.context.uniqueId,
            },
        });
    }
    respond(request, operation) {
        respondToCdpRequest(this.transport, request, operation);
    }
    sendError(request, message) {
        this.transport.send(cdpError(request.id, -32000, message));
    }
}
function runtimeBackend(realm) {
    if (realm.runtime.state === 'unsupported')
        throw new Error(realm.runtime.reason);
    return realm.runtime.backend;
}
//# sourceMappingURL=session.js.map