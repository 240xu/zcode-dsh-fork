/** RuntimeBackend implementation over one native Node inspector session. */
import type { RuntimeBackendObjectHandle } from '../../../shared/cdp/ids.ts';
import type { RuntimeCompletion, RuntimeExceptionDetails, RuntimeRemoteObject, RuntimeExecutionContext, RuntimeStackTrace } from '../../../shared/cdp/index.ts';
import type { HostInspectorSession } from './bridge.ts';
import type { RuntimeBackend } from '../../../shared/cdp/realm.ts';
/** Host Runtime adapter preserving native V8 semantics behind common values. */
export declare class HostRuntimeBackend implements RuntimeBackend {
    private readonly target;
    private defaultContextId;
    private readonly unsubscribe;
    constructor(target: HostInspectorSession);
    enable(): Promise<void>;
    disable(): Promise<void>;
    evaluate(request: Parameters<RuntimeBackend['evaluate']>[0]): ReturnType<RuntimeBackend['evaluate']>;
    getProperties(request: Parameters<RuntimeBackend['getProperties']>[0]): ReturnType<RuntimeBackend['getProperties']>;
    callFunction(request: Parameters<RuntimeBackend['callFunction']>[0]): ReturnType<RuntimeBackend['callFunction']>;
    awaitPromise(request: Parameters<RuntimeBackend['awaitPromise']>[0]): ReturnType<RuntimeBackend['awaitPromise']>;
    globalLexicalScopeNames(context?: RuntimeExecutionContext): Promise<readonly string[]>;
    releaseObject(handle: RuntimeBackendObjectHandle): Promise<void>;
    releaseObjectGroup(group: string): Promise<void>;
    /** Release the native-context observer owned by this backend. */
    close(): void;
    /**
     * Convert a native Runtime completion returned through another Node domain.
     * @param value - Native result and optional exception details.
     * @returns The realm-neutral completion.
     */
    completion(value: Readonly<Record<string, unknown>>): Promise<RuntimeCompletion<RuntimeBackendObjectHandle>>;
    private properties;
    private property;
    private internalProperties;
    private privateProperties;
    /**
     * Convert native exception details to the common Runtime model.
     * @param value - Native `Runtime.ExceptionDetails` fields.
     * @returns Exception details with normalized object references.
     */
    exceptionDetails(value: unknown): Promise<RuntimeExceptionDetails<RuntimeBackendObjectHandle>>;
    /**
     * Convert one native V8 RemoteObject to the common Runtime model.
     * @param value - Native `Runtime.RemoteObject` fields.
     * @returns Descriptor, backend handle, and optional Cordis identity.
     */
    remoteObject(value: unknown): Promise<RuntimeRemoteObject<RuntimeBackendObjectHandle>>;
    /**
     * Convert a native stack trace while retaining native script identities.
     * @param value - Native `Runtime.StackTrace` fields.
     * @returns Realm-neutral stack frames.
     */
    stackTrace(value: unknown): RuntimeStackTrace;
    private observeContext;
    private identifyObject;
}
//# sourceMappingURL=runtime.d.ts.map