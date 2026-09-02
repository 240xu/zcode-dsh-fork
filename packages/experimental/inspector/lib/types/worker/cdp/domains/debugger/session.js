/** Per-DevTools Debugger and source routing across Host and Client realms. */
import { respondToCdpRequest, sendCdpFailure } from "../../protocol.js";
import { exactKeys, optionalBoolean } from "../../../../shared/validation.js";
import { parseCallFrameEvaluation, requestScriptId } from "./cdp-params.js";
import { debuggerEvent, scriptParsedEvent } from "./projector.js";
import { DebuggerScriptRegistry } from "./script-registry.js";
/** Owns Debugger lifecycle, shared script projection, and Host-native fallback. */
export class DebuggerDomainSession {
    transport;
    realms;
    runtime;
    scripts = new DebuggerScriptRegistry();
    sourceDisposers = new Map();
    debuggerDisposers = new Map();
    callFrameRealms = new Map();
    unsubscribeRealms;
    native;
    debuggerEnableRequest = {};
    enabled = false;
    closed = false;
    constructor(transport, realms, runtime) {
        this.transport = transport;
        this.realms = realms;
        this.runtime = runtime;
        const native = realms.all()
            .map(realm => realm.nativeDomains)
            .find(capability => capability.state === 'supported');
        if (native === undefined)
            throw new Error('Inspector has no native Host debugger transport');
        this.native = native.backend;
        this.unsubscribeRealms = realms.subscribe((event) => { this.receiveRealm(event); });
    }
    /**
     * Handle one Debugger request, including Client read-only source operations.
     * @param request - Parsed CDP request.
     * @returns Whether the method belongs to the Debugger domain.
     */
    handle(request) {
        if (!request.method.startsWith('Debugger.'))
            return false;
        switch (request.method) {
            case 'Debugger.enable':
                this.respond(request, () => this.enable(request.params));
                return true;
            case 'Debugger.disable':
                exactKeys(request.params, [], 'Debugger.disable parameters');
                this.respond(request, () => this.disable());
                return true;
            case 'Debugger.getScriptSource':
                this.respond(request, () => this.getScriptSource(request.params));
                return true;
            case 'Debugger.searchInContent':
                this.respond(request, () => this.searchInContent(request.params));
                return true;
            case 'Debugger.evaluateOnCallFrame':
                this.respond(request, () => this.evaluateOnCallFrame(request.params));
                return true;
            case 'Debugger.pause':
                exactKeys(request.params, [], 'Debugger.pause parameters');
                this.respond(request, () => this.pause());
                return true;
            case 'Debugger.resume':
                this.respond(request, () => this.resume(request.params));
                return true;
            default:
                this.forwardNative(request);
                return true;
        }
    }
    /** Release source and debugger subscriptions. */
    close() {
        if (this.closed)
            return;
        this.closed = true;
        this.unsubscribeRealms();
        this.detachCapabilities();
        this.callFrameRealms.clear();
        this.scripts.clear();
        this.runtime.releaseProjectedGroup('backtrace');
    }
    async enable(params) {
        exactKeys(params, ['maxScriptsCacheSize'], 'Debugger.enable parameters');
        if (this.enabled)
            return {};
        const maxScriptsCacheSize = params.maxScriptsCacheSize;
        if (maxScriptsCacheSize !== undefined
            && (typeof maxScriptsCacheSize !== 'number' || !Number.isFinite(maxScriptsCacheSize) || maxScriptsCacheSize < 0)) {
            throw new Error('Debugger.enable maxScriptsCacheSize must be a non-negative number');
        }
        const enableRequest = maxScriptsCacheSize === undefined ? {} : { maxScriptsCacheSize };
        this.debuggerEnableRequest = enableRequest;
        this.enabled = true;
        try {
            for (const realm of this.realms.all())
                this.attachCapabilities(realm);
            const results = await Promise.all(this.realms.all().map(async (realm) => realm.debugger.state === 'supported' ? realm.debugger.backend.enable(enableRequest) : {}));
            await Promise.all(this.realms.all().map(async (realm) => this.publishCatalog(realm)));
            return mergeResults(results);
        }
        catch (error) {
            this.enabled = false;
            this.debuggerEnableRequest = {};
            this.detachCapabilities();
            this.scripts.clear();
            await Promise.allSettled(this.realms.all().map(async (realm) => {
                if (realm.debugger.state === 'supported')
                    await realm.debugger.backend.disable();
            }));
            throw error;
        }
    }
    async disable() {
        this.enabled = false;
        this.debuggerEnableRequest = {};
        this.detachCapabilities();
        this.callFrameRealms.clear();
        this.scripts.clear();
        this.runtime.releaseProjectedGroup('backtrace');
        const results = await Promise.all(this.realms.all().map(async (realm) => realm.debugger.state === 'supported' ? realm.debugger.backend.disable() : {}));
        return mergeResults(results);
    }
    async getScriptSource(params) {
        exactKeys(params, ['scriptId'], 'Debugger.getScriptSource parameters');
        if (typeof params.scriptId !== 'string')
            throw new Error('Debugger.getScriptSource requires scriptId');
        const route = this.scripts.resolve(params.scriptId);
        if (route !== undefined)
            return { scriptSource: await route.source.getScriptSource(route.script.scriptKey) };
        if (this.scripts.wasUnsupported(params.scriptId) || params.scriptId.startsWith('client:')) {
            throw new Error('Client script is no longer available');
        }
        return this.native.request('Debugger.getScriptSource', params);
    }
    async searchInContent(params) {
        exactKeys(params, ['scriptId', 'query', 'caseSensitive', 'isRegex'], 'Debugger.searchInContent parameters');
        if (typeof params.scriptId !== 'string' || typeof params.query !== 'string') {
            throw new Error('Debugger.searchInContent requires scriptId and query');
        }
        if (params.caseSensitive !== undefined && typeof params.caseSensitive !== 'boolean') {
            throw new Error('Debugger.searchInContent caseSensitive must be a boolean');
        }
        if (params.isRegex !== undefined && typeof params.isRegex !== 'boolean') {
            throw new Error('Debugger.searchInContent isRegex must be a boolean');
        }
        const route = this.scripts.resolve(params.scriptId);
        if (route === undefined) {
            if (this.scripts.wasUnsupported(params.scriptId) || params.scriptId.startsWith('client:')) {
                throw new Error('Client script is no longer available');
            }
            return this.native.request('Debugger.searchInContent', params);
        }
        const source = await route.source.getScriptSource(route.script.scriptKey);
        return {
            result: searchLines(source, params.query, params.caseSensitive === true, params.isRegex === true),
        };
    }
    async evaluateOnCallFrame(params) {
        const parsed = parseCallFrameEvaluation(params);
        if (parsed.callFrameId.startsWith('client:'))
            throw new Error('Client native debugging is unavailable');
        const realm = this.callFrameRealms.get(parsed.callFrameId) ?? this.supportedDebugger();
        const objectGroup = parsed.objectGroup ?? 'backtrace';
        const completion = await debuggerBackend(realm).evaluateOnCallFrame({ ...parsed, objectGroup });
        return this.runtime.projectCompletion(realm, completion, objectGroup);
    }
    async pause() {
        const supported = this.realms.all().filter(realm => realm.debugger.state === 'supported');
        if (supported.length === 0)
            throw new Error('Debugger.pause is unsupported by every active realm');
        const results = await Promise.all(supported.map(async (realm) => debuggerBackend(realm).pause()));
        return mergeResults(results);
    }
    async resume(params) {
        exactKeys(params, ['terminateOnResume'], 'Debugger.resume parameters');
        const request = optionalBoolean(params, 'terminateOnResume');
        const supported = this.realms.all().filter(realm => realm.debugger.state === 'supported');
        if (supported.length === 0)
            throw new Error('Debugger.resume is unsupported by every active realm');
        const results = await Promise.all(supported.map(async (realm) => debuggerBackend(realm).resume(request)));
        return mergeResults(results);
    }
    forwardNative(request) {
        let params;
        try {
            const unsupported = this.unsupportedRoute(request.params);
            if (unsupported !== undefined)
                throw new Error(unsupported);
            params = this.runtime.nativeParameters(request.params);
        }
        catch (error) {
            sendCdpFailure(this.transport, request, error);
            return;
        }
        respondToCdpRequest(this.transport, request, async () => this.native.request(request.method, params));
    }
    unsupportedRoute(params) {
        const scriptId = requestScriptId(params);
        if (scriptId !== undefined) {
            const route = this.scripts.resolve(scriptId);
            if (route?.realm.debugger.state === 'unsupported')
                return route.realm.debugger.reason;
            if (route === undefined && this.scripts.wasUnsupported(scriptId))
                return 'Client script is no longer available';
        }
        if (typeof params.url === 'string') {
            const route = this.scripts.byUrl(params.url);
            if (route?.realm.debugger.state === 'unsupported')
                return route.realm.debugger.reason;
        }
        if (typeof params.urlRegex === 'string') {
            const route = this.scripts.byUrlPattern(params.urlRegex);
            if (route?.realm.debugger.state === 'unsupported')
                return route.realm.debugger.reason;
        }
        if (typeof params.scriptHash === 'string') {
            const route = this.scripts.byHash(params.scriptHash);
            if (route?.realm.debugger.state === 'unsupported')
                return route.realm.debugger.reason;
        }
        if (typeof params.objectId === 'string') {
            const route = this.runtime.objectRoute(params.objectId);
            if (route?.realm.debugger.state === 'unsupported')
                return route.realm.debugger.reason;
        }
        return undefined;
    }
    receiveRealm(event) {
        if (event.type === 'opened') {
            if (this.enabled)
                void this.enableRealm(event.session).catch((error) => {
                    console.error(`Inspector could not enable Debugger realm ${event.session.descriptor.label}:`, error);
                });
            return;
        }
        this.sourceDisposers.get(event.session.descriptor.realmId)?.();
        this.sourceDisposers.delete(event.session.descriptor.realmId);
        this.debuggerDisposers.get(event.session.descriptor.realmId)?.();
        this.debuggerDisposers.delete(event.session.descriptor.realmId);
        for (const [callFrameId, realm] of this.callFrameRealms) {
            if (realm === event.session)
                this.callFrameRealms.delete(callFrameId);
        }
        this.scripts.removeRealm(event.session);
    }
    async enableRealm(realm) {
        this.attachCapabilities(realm);
        if (realm.debugger.state === 'supported')
            await realm.debugger.backend.enable(this.debuggerEnableRequest);
        await this.publishCatalog(realm);
    }
    attachCapabilities(realm) {
        if (realm.sources.state === 'supported' && !this.sourceDisposers.has(realm.descriptor.realmId)) {
            const source = realm.sources.backend;
            this.sourceDisposers.set(realm.descriptor.realmId, source.subscribe((script) => {
                if (this.enabled)
                    this.publishScript(realm, source, script);
            }));
        }
        if (realm.debugger.state === 'supported' && !this.debuggerDisposers.has(realm.descriptor.realmId)) {
            this.debuggerDisposers.set(realm.descriptor.realmId, realm.debugger.backend.subscribe((event) => {
                if (this.enabled)
                    this.publishDebuggerEvent(realm, event);
            }));
        }
    }
    async publishCatalog(realm) {
        if (!this.enabled || realm.sources.state === 'unsupported')
            return;
        const scripts = await realm.sources.backend.listScripts();
        for (const script of scripts)
            this.publishScript(realm, realm.sources.backend, script);
    }
    publishScript(realm, source, script) {
        const registered = this.scripts.register({ realm, source, script });
        if (registered.fresh)
            this.transport.send(scriptParsedEvent(realm, script));
    }
    publishDebuggerEvent(realm, event) {
        if (event.type === 'paused') {
            for (const frame of event.callFrames)
                this.callFrameRealms.set(frame.callFrameId, realm);
        }
        else if (event.type === 'resumed') {
            for (const [callFrameId, owner] of this.callFrameRealms) {
                if (owner === realm)
                    this.callFrameRealms.delete(callFrameId);
            }
            this.runtime.releaseProjectedGroup('backtrace');
        }
        this.transport.send(debuggerEvent(realm, event, this.runtime));
    }
    supportedDebugger() {
        const realm = this.realms.all().find(candidate => candidate.debugger.state === 'supported');
        if (realm === undefined)
            throw new Error('No active realm supports call-frame evaluation');
        return realm;
    }
    detachCapabilities() {
        for (const dispose of this.sourceDisposers.values())
            dispose();
        this.sourceDisposers.clear();
        for (const dispose of this.debuggerDisposers.values())
            dispose();
        this.debuggerDisposers.clear();
    }
    respond(request, operation) {
        respondToCdpRequest(this.transport, request, operation);
    }
}
function debuggerBackend(realm) {
    if (realm.debugger.state === 'unsupported')
        throw new Error(realm.debugger.reason);
    return realm.debugger.backend;
}
function mergeResults(results) {
    const merged = {};
    for (const result of results)
        Object.assign(merged, result);
    return merged;
}
function searchLines(source, query, caseSensitive, isRegex) {
    const expression = isRegex
        ? new RegExp(query, caseSensitive ? 'u' : 'iu')
        : undefined;
    const expected = caseSensitive ? query : query.toLowerCase();
    const result = [];
    for (const [lineNumber, lineContent] of source.split('\n').entries()) {
        const matches = expression?.test(lineContent)
            ?? (caseSensitive ? lineContent : lineContent.toLowerCase()).includes(expected);
        if (matches)
            result.push({ lineNumber, lineContent });
    }
    return result;
}
//# sourceMappingURL=session.js.map