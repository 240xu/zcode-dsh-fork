/** Versioned envelopes for Client source catalog operations. */
import { isPlainObject } from "../../../json.js";
import { exactKeys, exactObject, wireId } from "../../../validation.js";
import { INSPECTOR_PROTOCOL_VERSION } from "../../version.js";
import { parseClientSourceCommand, parseClientSourceResult } from "./codec.js";
/**
 * Parse the marker capability for a Client source catalog.
 * @param value - Untrusted capability declaration.
 * @returns The validated marker capability.
 */
export function parseClientSourcesCapability(value) {
    const record = exactObject(value, ['type'], 'Client Sources capability');
    if (record.type !== 'client-sources')
        throw new Error('inspector protocol: invalid Client Sources capability');
    return { type: 'client-sources' };
}
/**
 * Parse one Worker-to-Client source request.
 * @param value - Untrusted decoded request.
 * @returns The validated request frame.
 */
export function parseClientSourceRequestFrame(value) {
    exactKeys(value, ['v', 't', 'sourceId', 'generation', 'sessionId', 'requestId', 'command'], 'Client source request');
    if (value.v !== INSPECTOR_PROTOCOL_VERSION || value.t !== 'client-sources/request') {
        throw new Error('inspector protocol: invalid Client source request envelope');
    }
    return {
        v: INSPECTOR_PROTOCOL_VERSION,
        t: 'client-sources/request',
        sourceId: wireId(value.sourceId, 'sourceId'),
        generation: wireId(value.generation, 'generation'),
        sessionId: wireId(value.sessionId, 'sessionId'),
        requestId: wireId(value.requestId, 'requestId'),
        command: parseClientSourceCommand(value.command),
    };
}
/**
 * Parse one Client-to-Worker source response.
 * @param value - Untrusted decoded response.
 * @returns The validated response frame.
 */
export function parseClientSourceResponseFrame(value) {
    exactKeys(value, ['v', 't', 'sourceId', 'generation', 'sessionId', 'requestId', 'outcome'], 'Client source response');
    if (value.v !== INSPECTOR_PROTOCOL_VERSION || value.t !== 'client-sources/response') {
        throw new Error('inspector protocol: invalid Client source response envelope');
    }
    return {
        v: INSPECTOR_PROTOCOL_VERSION,
        t: 'client-sources/response',
        sourceId: wireId(value.sourceId, 'sourceId'),
        generation: wireId(value.generation, 'generation'),
        sessionId: wireId(value.sessionId, 'sessionId'),
        requestId: wireId(value.requestId, 'requestId'),
        outcome: parseOutcome(value.outcome),
    };
}
/**
 * Parse one Client source-session cleanup notification.
 * @param value - Untrusted decoded notification.
 * @returns The validated cleanup frame.
 */
export function parseClientSourceSessionClosedFrame(value) {
    exactKeys(value, ['v', 't', 'sourceId', 'generation', 'sessionId'], 'Client source session close');
    if (value.v !== INSPECTOR_PROTOCOL_VERSION || value.t !== 'client-sources/session-closed') {
        throw new Error('inspector protocol: invalid Client source session close envelope');
    }
    return {
        v: INSPECTOR_PROTOCOL_VERSION,
        t: 'client-sources/session-closed',
        sourceId: wireId(value.sourceId, 'sourceId'),
        generation: wireId(value.generation, 'generation'),
        sessionId: wireId(value.sessionId, 'sessionId'),
    };
}
function parseOutcome(value) {
    if (!isPlainObject(value) || typeof value.ok !== 'boolean') {
        throw new Error('inspector protocol: invalid Client source outcome');
    }
    if (value.ok) {
        exactKeys(value, ['ok', 'result'], 'successful Client source outcome');
        return { ok: true, result: parseClientSourceResult(value.result) };
    }
    exactKeys(value, ['ok', 'error'], 'failed Client source outcome');
    const error = exactObject(value.error, ['code', 'message'], 'Client source error');
    if (!ERROR_CODES.has(error.code) || typeof error.message !== 'string') {
        throw new Error('inspector protocol: invalid Client source error');
    }
    return { ok: false, error: { code: error.code, message: error.message } };
}
const ERROR_CODES = new Set([
    'invalid-request', 'script-not-found', 'load-failed', 'result-too-large', 'internal-error',
]);
//# sourceMappingURL=frames.js.map