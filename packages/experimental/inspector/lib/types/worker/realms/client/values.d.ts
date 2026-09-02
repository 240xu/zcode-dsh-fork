/** Conversion from Client wire values to realm-neutral Runtime values. */
import type { ClientRuntimeExceptionDetails, ClientRuntimePropertyDescriptor, ClientRuntimeRemoteObject, ClientRuntimeResult } from '../../../shared/bridge/messages/runtime/index.ts';
import { type ClientRemoteObjectHandle } from '../../../shared/bridge/ids.ts';
import type { RuntimeBackendObjectHandle, RuntimeScriptKey } from '../../../shared/cdp/ids.ts';
import type { RuntimeCompletion, RuntimeConsoleBackendEvent, RuntimeExceptionDetails, RuntimeInternalPropertyDescriptor, RuntimePropertyDescriptor, RuntimeRemoteObject } from '../../../shared/cdp/index.ts';
/** Maps a Client-local script key into its realm-wide Runtime identity. */
export type ClientScriptKeyMapper = (scriptKey: RuntimeScriptKey) => RuntimeScriptKey;
/**
 * Convert one Client completion and all nested objects.
 * @param result - Successful Client Runtime command result.
 * @param mapScriptKey - Realm-wide script identity mapper.
 * @returns A realm-neutral Runtime completion.
 */
export declare function clientCompletion(result: Extract<ClientRuntimeResult, {
    op: 'evaluate' | 'call-function' | 'await-promise';
}>, mapScriptKey: ClientScriptKeyMapper): RuntimeCompletion<RuntimeBackendObjectHandle>;
/**
 * Convert one Client property descriptor and all nested objects.
 * @param value - Client wire property descriptor.
 * @returns A realm-neutral property descriptor.
 */
export declare function clientProperty(value: ClientRuntimePropertyDescriptor): RuntimePropertyDescriptor<RuntimeBackendObjectHandle>;
/**
 * Convert one Client internal property descriptor.
 * @param value - Client wire internal property.
 * @returns A realm-neutral internal property.
 */
export declare function clientInternalProperty(value: RuntimeInternalPropertyDescriptor<ClientRemoteObjectHandle>): RuntimeInternalPropertyDescriptor<RuntimeBackendObjectHandle>;
/**
 * Convert Client exception details and their optional object.
 * @param value - Client wire exception details.
 * @param mapScriptKey - Realm-wide script identity mapper.
 * @returns Realm-neutral exception details.
 */
export declare function clientException(value: ClientRuntimeExceptionDetails, mapScriptKey: ClientScriptKeyMapper): RuntimeExceptionDetails<RuntimeBackendObjectHandle>;
/**
 * Convert a Client Console event recursively.
 * @param value - Client wire Console event.
 * @param mapScriptKey - Realm-wide script identity mapper.
 * @returns A realm-neutral Console event.
 */
export declare function clientConsoleEvent(value: RuntimeConsoleBackendEvent<ClientRemoteObjectHandle>, mapScriptKey: ClientScriptKeyMapper): RuntimeConsoleBackendEvent<RuntimeBackendObjectHandle>;
/**
 * Convert a Client RemoteObject into the backend-neutral handle slot.
 * @param value - Client wire RemoteObject.
 * @returns A realm-neutral Runtime value.
 */
export declare function clientRemoteObject(value: ClientRuntimeRemoteObject): RuntimeRemoteObject<RuntimeBackendObjectHandle>;
/**
 * Rebrand a common backend handle for the Client transport that owns it.
 * @param value - Backend handle from a routed Runtime request.
 * @returns The same opaque text under its Client wire role.
 */
export declare function clientHandle(value: string): ClientRemoteObjectHandle;
//# sourceMappingURL=values.d.ts.map