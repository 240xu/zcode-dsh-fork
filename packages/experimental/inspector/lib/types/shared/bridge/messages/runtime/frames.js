/** Versioned envelopes for Worker-to-Client Runtime operations. */
import { isPlainObject } from "../../../json.js";
import { exactKeys, exactObject, wireId } from "../../../validation.js";
import { INSPECTOR_PROTOCOL_VERSION } from "../../version.js";
import { parseClientRuntimeCommand } from "./command-codec.js";
import { parseClientRuntimeResult } from "./value-codec.js";
/**
 * Parse and rebuild a Client Runtime capability.
 * @param value - Untrusted capability declaration.
 * @returns The validated capability.
 */
export function parseClientRuntimeCapability(value) {
    const record = exactObject(value, ['type', 'origin'], 'Client Runtime capability');
    if (record.type !== 'client-runtime' || typeof record.origin !== 'string' || record.origin.length > 2_048) {
        throw new Error('inspector protocol: invalid Client Runtime capability');
    }
    return { type: 'client-runtime', origin: record.origin };
}
/**
 * Parse and rebuild one Worker-to-Client Runtime request.
 * @param value - Untrusted request frame.
 * @returns The validated request frame.
 */
export function parseClientRuntimeRequestFrame(value) {
    exactKeys(value, ['v', 't', 'sourceId', 'generation', 'sessionId', 'requestId', 'command'], 'Client Runtime request');
    if (value.v !== INSPECTOR_PROTOCOL_VERSION || value.t !== 'client-runtime/request') {
        throw new Error('inspector protocol: invalid Client Runtime request envelope');
    }
    return {
        v: INSPECTOR_PROTOCOL_VERSION,
        t: 'client-runtime/request',
        sourceId: wireId(value.sourceId, 'sourceId'),
        generation: wireId(value.generation, 'generation'),
        sessionId: wireId(value.sessionId, 'sessionId'),
        requestId: wireId(value.requestId, 'requestId'),
        command: parseClientRuntimeCommand(value.command),
    };
}
/**
 * Parse and rebuild one Worker-to-Client Runtime cancellation.
 * @param value - Untrusted cancellation frame.
 * @returns The validated cancellation frame.
 */
export function parseClientRuntimeCancelFrame(value) {
    exactKeys(value, ['v', 't', 'sourceId', 'generation', 'sessionId', 'requestId'], 'Client Runtime cancellation');
    if (value.v !== INSPECTOR_PROTOCOL_VERSION || value.t !== 'client-runtime/cancel') {
        throw new Error('inspector protocol: invalid Client Runtime cancellation envelope');
    }
    return {
        v: INSPECTOR_PROTOCOL_VERSION,
        t: 'client-runtime/cancel',
        sourceId: wireId(value.sourceId, 'sourceId'),
        generation: wireId(value.generation, 'generation'),
        sessionId: wireId(value.sessionId, 'sessionId'),
        requestId: wireId(value.requestId, 'requestId'),
    };
}
/**
 * Parse and rebuild one Worker acknowledgement for a Client Runtime response.
 * @param value - Untrusted acknowledgement frame.
 * @returns The validated acknowledgement frame.
 */
/* jscpd:ignore-start */
// Deliberately mirrors parseClientRuntimeCancelFrame: each wire parser spells
// out its own envelope literally instead of sharing a tag-parameterized helper.
export function parseClientRuntimeResponseAcknowledgedFrame(value) {
    exactKeys(value, ['v', 't', 'sourceId', 'generation', 'sessionId', 'requestId'], 'Client Runtime response acknowledgement');
    if (value.v !== INSPECTOR_PROTOCOL_VERSION || value.t !== 'client-runtime/response-acknowledged') {
        throw new Error('inspector protocol: invalid Client Runtime response acknowledgement envelope');
    }
    return {
        v: INSPECTOR_PROTOCOL_VERSION,
        t: 'client-runtime/response-acknowledged',
        sourceId: wireId(value.sourceId, 'sourceId'),
        generation: wireId(value.generation, 'generation'),
        sessionId: wireId(value.sessionId, 'sessionId'),
        requestId: wireId(value.requestId, 'requestId'),
    };
}
/* jscpd:ignore-end */
/**
 * Parse and rebuild one Client-to-Worker Runtime response.
 * @param value - Untrusted response frame.
 * @returns The validated response frame.
 */
export function parseClientRuntimeResponseFrame(value) {
    exactKeys(value, ['v', 't', 'sourceId', 'generation', 'sessionId', 'requestId', 'outcome'], 'Client Runtime response');
    if (value.v !== INSPECTOR_PROTOCOL_VERSION || value.t !== 'client-runtime/response') {
        throw new Error('inspector protocol: invalid Client Runtime response envelope');
    }
    return {
        v: INSPECTOR_PROTOCOL_VERSION,
        t: 'client-runtime/response',
        sourceId: wireId(value.sourceId, 'sourceId'),
        generation: wireId(value.generation, 'generation'),
        sessionId: wireId(value.sessionId, 'sessionId'),
        requestId: wireId(value.requestId, 'requestId'),
        outcome: parseOutcome(value.outcome),
    };
}
/**
 * Parse and rebuild one Runtime-session cleanup notification.
 * @param value - Untrusted cleanup frame.
 * @returns The validated cleanup frame.
 */
export function parseClientRuntimeSessionClosedFrame(value) {
    exactKeys(value, ['v', 't', 'sourceId', 'generation', 'sessionId'], 'Client Runtime session close');
    if (value.v !== INSPECTOR_PROTOCOL_VERSION || value.t !== 'client-runtime/session-closed') {
        throw new Error('inspector protocol: invalid Client Runtime session close envelope');
    }
    return {
        v: INSPECTOR_PROTOCOL_VERSION,
        t: 'client-runtime/session-closed',
        sourceId: wireId(value.sourceId, 'sourceId'),
        generation: wireId(value.generation, 'generation'),
        sessionId: wireId(value.sessionId, 'sessionId'),
    };
}
function parseOutcome(value) {
    if (!isPlainObject(value) || typeof value.ok !== 'boolean') {
        throw new Error('inspector protocol: invalid Client Runtime outcome');
    }
    if (value.ok) {
        exactKeys(value, ['ok', 'result'], 'successful Client Runtime outcome');
        return { ok: true, result: parseClientRuntimeResult(value.result) };
    }
    exactKeys(value, ['ok', 'error'], 'failed Client Runtime outcome');
    const error = exactObject(value.error, ['code', 'message'], 'Client Runtime error');
    if (!ERROR_CODES.has(error.code) || typeof error.message !== 'string') {
        throw new Error('inspector protocol: invalid Client Runtime error');
    }
    return { ok: false, error: { code: error.code, message: error.message } };
}
const ERROR_CODES = new Set([
    'invalid-request', 'object-not-found', 'unsupported', 'timeout', 'result-too-large', 'internal-error',
]);
//# sourceMappingURL=frames.js.map