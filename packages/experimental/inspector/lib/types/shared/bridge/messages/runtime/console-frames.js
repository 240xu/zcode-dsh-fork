/** Typed transport for Client Console sessions and events. */
import { isPlainObject } from "../../../json.js";
import { exactKeys, exactObject, wireId } from "../../../validation.js";
import { INSPECTOR_PROTOCOL_VERSION } from "../../version.js";
import { parseClientRuntimeExceptionDetails, parseClientRuntimeRemoteObject, parseClientRuntimeStackTrace, } from "./value-codec.js";
/**
 * Parse the marker capability for Client Console forwarding.
 * @param value - Untrusted capability declaration.
 * @returns The validated marker capability.
 */
export function parseClientConsoleCapability(value) {
    const record = exactObject(value, ['type'], 'Client Console capability');
    if (record.type !== 'client-console')
        throw new Error('inspector protocol: invalid Client Console capability');
    return { type: 'client-console' };
}
/**
 * Parse a Worker-to-Client Console lifecycle frame.
 * @param value - Untrusted decoded frame.
 * @returns A validated enable or disable frame.
 */
export function parseClientConsoleControlFrame(value) {
    exactKeys(value, ['v', 't', 'sourceId', 'generation', 'sessionId'], 'Client Console control frame');
    if (value.v !== INSPECTOR_PROTOCOL_VERSION
        || (value.t !== 'client-console/enable' && value.t !== 'client-console/disable')) {
        throw new Error('inspector protocol: invalid Client Console control frame');
    }
    return {
        v: INSPECTOR_PROTOCOL_VERSION,
        t: value.t,
        sourceId: wireId(value.sourceId, 'sourceId'),
        generation: wireId(value.generation, 'generation'),
        sessionId: wireId(value.sessionId, 'sessionId'),
    };
}
/**
 * Parse one Client-to-Worker Console event.
 * @param value - Untrusted decoded frame.
 * @returns A validated Console event frame.
 */
export function parseClientConsoleEventFrame(value) {
    exactKeys(value, ['v', 't', 'sourceId', 'generation', 'sessionId', 'event'], 'Client Console event frame');
    if (value.v !== INSPECTOR_PROTOCOL_VERSION || value.t !== 'client-console/event') {
        throw new Error('inspector protocol: invalid Client Console event envelope');
    }
    return {
        v: INSPECTOR_PROTOCOL_VERSION,
        t: 'client-console/event',
        sourceId: wireId(value.sourceId, 'sourceId'),
        generation: wireId(value.generation, 'generation'),
        sessionId: wireId(value.sessionId, 'sessionId'),
        event: parseEvent(value.event),
    };
}
function parseEvent(value) {
    if (!isPlainObject(value) || (value.type !== 'console-api' && value.type !== 'exception')) {
        throw new Error('inspector protocol: invalid Client Console event');
    }
    if (value.type === 'console-api') {
        exactKeys(value, ['type', 'event'], 'Client Console API event');
        const event = exactObject(value.event, ['type', 'arguments', 'timestamp', 'contextId', 'stackTrace'], 'Console API event');
        if (!CONSOLE_TYPES.has(event.type)
            || !Array.isArray(event.arguments)
            || typeof event.timestamp !== 'number'
            || !Number.isFinite(event.timestamp)) {
            throw new Error('inspector protocol: invalid Console API event');
        }
        return {
            type: 'console-api',
            event: {
                type: event.type,
                arguments: event.arguments.map(parseClientRuntimeRemoteObject),
                timestamp: event.timestamp,
                ...(event.contextId === undefined ? {} : { contextId: integer(event.contextId, 'contextId') }),
                ...(event.stackTrace === undefined ? {} : { stackTrace: parseClientRuntimeStackTrace(event.stackTrace) }),
            },
        };
    }
    exactKeys(value, ['type', 'event'], 'Client exception event');
    const event = exactObject(value.event, ['timestamp', 'contextId', 'details'], 'Client exception event payload');
    if (typeof event.timestamp !== 'number' || !Number.isFinite(event.timestamp)) {
        throw new Error('inspector protocol: invalid Client exception timestamp');
    }
    return {
        type: 'exception',
        event: {
            timestamp: event.timestamp,
            ...(event.contextId === undefined ? {} : { contextId: integer(event.contextId, 'contextId') }),
            details: parseClientRuntimeExceptionDetails(event.details),
        },
    };
}
function integer(value, label) {
    if (!Number.isSafeInteger(value))
        throw new Error(`inspector protocol: ${label} must be an integer`);
    return value;
}
const CONSOLE_TYPES = new Set([
    'log', 'debug', 'info', 'error', 'warning', 'dir', 'dirxml', 'table', 'trace', 'clear',
    'startGroup', 'startGroupCollapsed', 'endGroup', 'assert', 'profile', 'profileEnd', 'count', 'timeEnd',
]);
//# sourceMappingURL=console-frames.js.map