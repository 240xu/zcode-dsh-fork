/** One DevTools connection: explicit local-domain routing plus a private Host V8 session. */
import { cdpError, parseCdpRequest } from "./protocol.js";
import { CDP_METHOD_NOT_HANDLED, handleScaffold } from "./target.js";
import { RuntimeDomainSession } from "./domains/runtime/index.js";
import { DebuggerDomainSession } from "./domains/debugger/index.js";
import { CordisDomSession } from "./domains/dom/index.js";
import { HostNativeDomainSession } from "./domains/native.js";
import { InspectorRealmSessionSet } from "./realm-sessions.js";
/** Per-connection CDP dispatcher. */
export class CdpSession {
    transport;
    target;
    sources;
    network;
    cordisTrees;
    realms;
    nativeDomains;
    runtime;
    debugger;
    dom;
    diagnosticsEnabled = false;
    unsubscribeSources;
    constructor(transport, target, sources, network, realmRegistry, domBackend, cordisTrees) {
        this.transport = transport;
        this.target = target;
        this.sources = sources;
        this.network = network;
        this.cordisTrees = cordisTrees;
        this.realms = new InspectorRealmSessionSet(realmRegistry);
        const native = this.realms.host().nativeDomains;
        if (native.state === 'unsupported')
            throw new Error(native.reason);
        this.nativeDomains = new HostNativeDomainSession(transport, native.backend);
        this.runtime = new RuntimeDomainSession(transport, this.realms);
        this.debugger = new DebuggerDomainSession(transport, this.realms, this.runtime);
        this.dom = new CordisDomSession(transport, domBackend, this.runtime);
        this.runtime.setObjectObserver((objectId, realm, reference, group) => this.dom.bindObject(objectId, realm, reference, group));
        this.unsubscribeSources = sources.subscribeStatus(() => {
            if (this.diagnosticsEnabled)
                this.sendEvent('DSHInspector.sourcesChanged', { sources: this.sources.describe() });
        });
    }
    /**
     * Parse and dispatch one raw CDP request. Invalid frames close this client only.
     * @param value - Untrusted decoded WebSocket payload.
     */
    receive(value) {
        let request;
        try {
            request = parseCdpRequest(value);
        }
        catch {
            this.transport.close();
            return;
        }
        try {
            if (request.method === 'Runtime.releaseObject')
                this.dom.releaseObject(request.params.objectId);
            if (request.method === 'Runtime.releaseObjectGroup')
                this.dom.releaseObjectGroup(request.params.objectGroup);
            if (this.dom.handle(request))
                return;
            if (this.runtime.handle(request))
                return;
            if (this.debugger.handle(request))
                return;
            if (this.nativeDomains.owns(request.method)) {
                this.nativeDomains.handle({ ...request, params: this.runtime.nativeParameters(request.params) });
                return;
            }
            let result;
            if (request.method.startsWith('Network.')) {
                result = this.network.handle(request.method, request.params, this);
            }
            else if (request.method === 'DSHInspector.enable') {
                this.diagnosticsEnabled = true;
                result = { sources: this.sources.describe() };
            }
            else if (request.method === 'DSHInspector.disable') {
                this.diagnosticsEnabled = false;
                result = {};
            }
            else if (request.method === 'DSHInspector.getSources') {
                result = { sources: this.sources.describe() };
            }
            else if (request.method === 'DSHInspector.getCordisTree') {
                void this.cordisTrees.getTree().then((tree) => { this.transport.send({ id: request.id, result: { tree } }); }, (error) => {
                    this.transport.send(cdpError(request.id, -32000, error instanceof Error ? error.message : String(error)));
                });
                return;
            }
            else {
                result = handleScaffold(request, this.target);
                if (result === CDP_METHOD_NOT_HANDLED) {
                    this.transport.send(cdpError(request.id, -32601, `Method not found: ${request.method}`));
                    return;
                }
            }
            this.transport.send({ id: request.id, result });
        }
        catch (error) {
            this.transport.send(cdpError(request.id, -32000, error instanceof Error ? error.message : String(error)));
        }
    }
    /** Push one CDP event. */
    sendEvent(method, params) {
        this.transport.send({ method, params });
    }
    /** Release every connection-owned V8 and domain resource. */
    close() {
        this.unsubscribeSources();
        this.network.detach(this);
        this.dom.close();
        this.runtime.close();
        this.debugger.close();
        this.nativeDomains.close();
        this.realms.close();
    }
}
//# sourceMappingURL=session.js.map