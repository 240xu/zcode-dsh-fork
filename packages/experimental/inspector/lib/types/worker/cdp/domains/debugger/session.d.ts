/** Per-DevTools Debugger and source routing across Host and Client realms. */
import { type CdpRequest, type CdpTransport } from '../../protocol.ts';
import type { InspectorRealmSessionSet } from '../../realm-sessions.ts';
import type { RuntimeDomainSession } from '../runtime/index.ts';
/** Owns Debugger lifecycle, shared script projection, and Host-native fallback. */
export declare class DebuggerDomainSession {
    private readonly transport;
    private readonly realms;
    private readonly runtime;
    private readonly scripts;
    private readonly sourceDisposers;
    private readonly debuggerDisposers;
    private readonly callFrameRealms;
    private readonly unsubscribeRealms;
    private readonly native;
    private debuggerEnableRequest;
    private enabled;
    private closed;
    constructor(transport: CdpTransport, realms: InspectorRealmSessionSet, runtime: RuntimeDomainSession);
    /**
     * Handle one Debugger request, including Client read-only source operations.
     * @param request - Parsed CDP request.
     * @returns Whether the method belongs to the Debugger domain.
     */
    handle(request: CdpRequest): boolean;
    /** Release source and debugger subscriptions. */
    close(): void;
    private enable;
    private disable;
    private getScriptSource;
    private searchInContent;
    private evaluateOnCallFrame;
    private pause;
    private resume;
    private forwardNative;
    private unsupportedRoute;
    private receiveRealm;
    private enableRealm;
    private attachCapabilities;
    private publishCatalog;
    private publishScript;
    private publishDebuggerEvent;
    private supportedDebugger;
    private detachCapabilities;
    private respond;
}
//# sourceMappingURL=session.d.ts.map