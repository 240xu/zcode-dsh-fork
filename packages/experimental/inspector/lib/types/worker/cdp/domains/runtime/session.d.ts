/** Per-DevTools-session Runtime routing across uniform Host and Client realms. */
import type { InspectorSourceDescriptor } from '../../../../shared/bridge/messages/observation.ts';
import type { RuntimeBackendObjectHandle } from '../../../../shared/cdp/ids.ts';
import type { RuntimeCompletion, RuntimeRemoteObject } from '../../../../shared/cdp/index.ts';
import { type CdpRequest, type CdpTransport } from '../../protocol.ts';
import type { InspectorRealmSession } from '../../../inspection/realm.ts';
import type { InspectorRealmSessionSet } from '../../realm-sessions.ts';
import { type RuntimeObjectObserver } from './object-table.ts';
import type { RuntimeObjectRoute } from './object-table.ts';
/** Runtime router layered over the common per-connection realm sessions. */
export declare class RuntimeDomainSession {
    private readonly transport;
    private readonly realms;
    private readonly objects;
    private readonly announcedContexts;
    private readonly consoleDisposers;
    private readonly unsubscribeRealms;
    private enabled;
    private closed;
    constructor(transport: CdpTransport, realms: InspectorRealmSessionSet);
    /**
     * Handle methods that require cross-realm Runtime coordination.
     * @param request - Parsed CDP request.
     * @returns Whether this domain owns the method or object id.
     */
    handle(request: CdpRequest): boolean;
    /** Release this connection's object routes and realm subscription. */
    close(): void;
    /**
     * Install semantic object recognition shared with the DOM adapter.
     * @param observer - Callback invoked for objects carrying semantic references.
     */
    setObjectObserver(observer: RuntimeObjectObserver): void;
    /**
     * Resolve a connection-local CDP object id for another domain adapter.
     * @param objectId - CDP object id allocated by this Runtime session.
     * @returns Its realm and backend handle when still live.
     */
    objectRoute(objectId: string): RuntimeObjectRoute | undefined;
    /**
     * Project a completion produced by another domain through this connection's object table.
     * @param realm - Realm session that owns the completion.
     * @param completion - Realm-neutral result and exception fields.
     * @param group - Object group assigned to exposed handles.
     * @returns CDP Runtime result fields.
     */
    projectCompletion(realm: InspectorRealmSession, completion: RuntimeCompletion<RuntimeBackendObjectHandle>, group: string | undefined): object;
    /**
     * Project one Runtime value produced by another domain.
     * @param realm - Realm session that owns the value.
     * @param value - Realm-neutral Runtime value.
     * @param group - Object group assigned to an exposed handle.
     * @returns CDP RemoteObject fields.
     */
    projectRemoteObject(realm: InspectorRealmSession, value: RuntimeRemoteObject<RuntimeBackendObjectHandle>, group: string | undefined): Readonly<Record<string, unknown>>;
    /**
     * Forget connection-local ids retained for another domain's object group.
     * @param group - Object group whose projected ids have expired.
     */
    releaseProjectedGroup(group: string): void;
    /**
     * Replace common object ids with native backend handles in a Host-only request.
     * @param params - Parsed CDP parameters that may contain nested object ids.
     * @returns A detached parameter record suitable for the native Host protocol.
     */
    nativeParameters(params: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>>;
    /**
     * Resolve one realm-registry expression to a connection-local object id.
     * @param source - Source generation that owns the Cordis tree node.
     * @param expression - Side-effect-free realm object lookup.
     * @param objectGroup - Optional DevTools retention group.
     * @returns The CDP RemoteObject fields.
     */
    resolveObject(source: InspectorSourceDescriptor, expression: string, objectGroup: string | undefined): Promise<Readonly<Record<string, unknown>>>;
    private enable;
    private disable;
    private evaluate;
    private getProperties;
    private callFunction;
    private awaitPromise;
    private releaseObject;
    private releaseObjectGroup;
    private globalLexicalScopeNames;
    private discardConsoleEntries;
    private realmFromSelector;
    private realmFromOptionalSelector;
    private backendContext;
    private routeArgument;
    private unsupportedNativeRoute;
    private receiveRealm;
    private attachConsole;
    private announce;
    private destroy;
    private respond;
    private sendError;
}
//# sourceMappingURL=session.d.ts.map