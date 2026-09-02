/** Conversion from Client wire values to realm-neutral Runtime values. */
import { inspectorId } from "../../../shared/identity.js";
/**
 * Convert one Client completion and all nested objects.
 * @param result - Successful Client Runtime command result.
 * @param mapScriptKey - Realm-wide script identity mapper.
 * @returns A realm-neutral Runtime completion.
 */
export function clientCompletion(result, mapScriptKey) {
    return {
        result: clientRemoteObject(result.completion.result),
        ...(result.completion.exceptionDetails === undefined
            ? {}
            : { exceptionDetails: clientException(result.completion.exceptionDetails, mapScriptKey) }),
    };
}
/**
 * Convert one Client property descriptor and all nested objects.
 * @param value - Client wire property descriptor.
 * @returns A realm-neutral property descriptor.
 */
export function clientProperty(value) {
    const { value: propertyValue, get, set, symbol, ...descriptor } = value;
    return {
        ...descriptor,
        ...(propertyValue === undefined ? {} : { value: clientRemoteObject(propertyValue) }),
        ...(get === undefined ? {} : { get: clientRemoteObject(get) }),
        ...(set === undefined ? {} : { set: clientRemoteObject(set) }),
        ...(symbol === undefined ? {} : { symbol: clientRemoteObject(symbol) }),
    };
}
/**
 * Convert one Client internal property descriptor.
 * @param value - Client wire internal property.
 * @returns A realm-neutral internal property.
 */
export function clientInternalProperty(value) {
    return {
        name: value.name,
        ...(value.value === undefined ? {} : { value: clientRemoteObject(value.value) }),
    };
}
/**
 * Convert Client exception details and their optional object.
 * @param value - Client wire exception details.
 * @param mapScriptKey - Realm-wide script identity mapper.
 * @returns Realm-neutral exception details.
 */
export function clientException(value, mapScriptKey) {
    const { exception, ...details } = value;
    return {
        ...details,
        ...(value.stackTrace === undefined ? {} : { stackTrace: clientStackTrace(value.stackTrace, mapScriptKey) }),
        ...(exception === undefined ? {} : { exception: clientRemoteObject(exception) }),
    };
}
/**
 * Convert a Client Console event recursively.
 * @param value - Client wire Console event.
 * @param mapScriptKey - Realm-wide script identity mapper.
 * @returns A realm-neutral Console event.
 */
export function clientConsoleEvent(value, mapScriptKey) {
    if (value.type === 'console-api') {
        return {
            type: value.type,
            event: {
                ...value.event,
                arguments: value.event.arguments.map(clientRemoteObject),
                ...(value.event.stackTrace === undefined
                    ? {}
                    : { stackTrace: clientStackTrace(value.event.stackTrace, mapScriptKey) }),
            },
        };
    }
    return {
        type: value.type,
        event: { ...value.event, details: clientException(value.event.details, mapScriptKey) },
    };
}
/**
 * Convert a Client RemoteObject into the backend-neutral handle slot.
 * @param value - Client wire RemoteObject.
 * @returns A realm-neutral Runtime value.
 */
export function clientRemoteObject(value) {
    return {
        descriptor: value.descriptor,
        ...(value.object === undefined
            ? {}
            : { object: { handle: backendHandle(value.object.handle) } }),
        ...(value.semanticReference === undefined ? {} : { semanticReference: value.semanticReference }),
    };
}
/**
 * Rebrand a common backend handle for the Client transport that owns it.
 * @param value - Backend handle from a routed Runtime request.
 * @returns The same opaque text under its Client wire role.
 */
export function clientHandle(value) {
    return inspectorId(value, 'Client object handle');
}
function backendHandle(value) {
    return inspectorId(value, 'Runtime backend object handle');
}
function clientStackTrace(value, mapScriptKey) {
    return {
        ...value,
        callFrames: value.callFrames.map(frame => ({
            ...frame,
            ...(frame.scriptKey === undefined ? {} : { scriptKey: mapScriptKey(frame.scriptKey) }),
        })),
        ...(value.parent === undefined ? {} : { parent: clientStackTrace(value.parent, mapScriptKey) }),
    };
}
//# sourceMappingURL=values.js.map