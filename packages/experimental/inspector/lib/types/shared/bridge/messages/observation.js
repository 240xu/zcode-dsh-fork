/** Versioned source lifecycle, observation, and extension frames shared by both carriers. */
import { inspectorId } from "../ids.js";
import { isJsonValue, isPlainObject } from "../../json.js";
import { exactKeys } from "../../validation.js";
import { INSPECTOR_PROTOCOL_VERSION } from "../version.js";
import { parseClientConsoleCapability, parseClientConsoleControlFrame, parseClientConsoleEventFrame, parseClientRuntimeCapability, parseClientRuntimeCancelFrame, parseClientRuntimeRequestFrame, parseClientRuntimeResponseAcknowledgedFrame, parseClientRuntimeResponseFrame, parseClientRuntimeSessionClosedFrame, } from "./runtime/index.js";
import { parseClientSourceRequestFrame, parseClientSourceResponseFrame, parseClientSourceSessionClosedFrame, parseClientSourcesCapability, } from "./sources/index.js";
export { INSPECTOR_PROTOCOL_VERSION } from "../version.js";
/**
 * Parse and rebuild one Worker control frame received by a source.
 * @param value - Untrusted decoded wire value.
 * @returns The validated Worker-to-source frame.
 */
export function parseWorkerSourceFrame(value) {
    if (!isJsonValue(value)
        || !isPlainObject(value)
        || value.v !== INSPECTOR_PROTOCOL_VERSION
        || typeof value.t !== 'string') {
        throw new Error('inspector protocol: invalid Worker source frame');
    }
    if (value.t === 'source/rejected') {
        exactKeys(value, ['v', 't', 'code', 'message'], 'source/rejected frame');
        if ((value.code !== 'invalid-frame' && value.code !== 'version-mismatch' && value.code !== 'unauthorized')
            || typeof value.message !== 'string') {
            throw new Error('inspector protocol: invalid source/rejected frame');
        }
        return { v: INSPECTOR_PROTOCOL_VERSION, t: 'source/rejected', code: value.code, message: value.message };
    }
    if (value.t === 'client-runtime/request')
        return parseClientRuntimeRequestFrame(value);
    if (value.t === 'client-runtime/cancel')
        return parseClientRuntimeCancelFrame(value);
    if (value.t === 'client-runtime/response-acknowledged') {
        return parseClientRuntimeResponseAcknowledgedFrame(value);
    }
    if (value.t === 'client-runtime/session-closed')
        return parseClientRuntimeSessionClosedFrame(value);
    if (value.t === 'client-sources/request')
        return parseClientSourceRequestFrame(value);
    if (value.t === 'client-sources/session-closed')
        return parseClientSourceSessionClosedFrame(value);
    if (value.t === 'client-console/enable' || value.t === 'client-console/disable') {
        return parseClientConsoleControlFrame(value);
    }
    const common = {
        v: INSPECTOR_PROTOCOL_VERSION,
        sourceId: sourceId(value.sourceId),
        generation: generation(value.generation),
    };
    if (value.t === 'source/accepted') {
        exactKeys(value, ['v', 't', 'sourceId', 'generation'], 'source/accepted frame');
        return { ...common, t: 'source/accepted' };
    }
    if (value.t === 'source/append-acknowledged') {
        exactKeys(value, ['v', 't', 'sourceId', 'generation', 'nextSequence'], 'source append acknowledgement');
        return {
            ...common,
            t: 'source/append-acknowledged',
            nextSequence: natural(value.nextSequence, 'nextSequence'),
        };
    }
    if (value.t === 'source/resnapshot'
        && typeof value.reason === 'string') {
        exactKeys(value, ['v', 't', 'sourceId', 'generation', 'expectedSequence', 'reason'], 'source/resnapshot frame');
        return {
            ...common,
            t: 'source/resnapshot',
            expectedSequence: natural(value.expectedSequence, 'expectedSequence'),
            reason: value.reason,
        };
    }
    throw new Error(`inspector protocol: unknown Worker source frame ${JSON.stringify(value.t)}`);
}
/**
 * Parse and rebuild one source frame received at a process or network boundary.
 * @param value - Untrusted decoded wire value.
 * @param maxRecords - Maximum records admitted in one frame.
 * @returns The validated source-to-Worker frame.
 */
export function parseSourceFrame(value, maxRecords) {
    if (!isJsonValue(value) || !isPlainObject(value)) {
        throw new Error('inspector protocol: source frame must be a lossless JSON object');
    }
    if (value.v !== INSPECTOR_PROTOCOL_VERSION) {
        throw new Error(`inspector protocol: unsupported version ${JSON.stringify(value.v)}`);
    }
    switch (value.t) {
        case 'source/open':
            return parseOpen(value);
        case 'source/replace':
            return parseRecordsFrame(value, maxRecords, true);
        case 'source/append':
            return parseRecordsFrame(value, maxRecords, false);
        case 'source/close':
            exactKeys(value, ['v', 't', 'sourceId', 'generation'], 'source/close frame');
            return {
                v: INSPECTOR_PROTOCOL_VERSION,
                t: 'source/close',
                sourceId: sourceId(value.sourceId),
                generation: generation(value.generation),
            };
        case 'client-runtime/response':
            return parseClientRuntimeResponseFrame(value);
        case 'client-console/event':
            return parseClientConsoleEventFrame(value);
        case 'client-sources/response':
            return parseClientSourceResponseFrame(value);
        default:
            throw new Error(`inspector protocol: unknown source frame ${JSON.stringify(value.t)}`);
    }
}
function parseOpen(value) {
    exactKeys(value, ['v', 't', 'source', 'topics'], 'source/open frame');
    if (!isPlainObject(value.source) || !Array.isArray(value.topics)) {
        throw new Error('inspector protocol: source/open needs source and topics');
    }
    const source = value.source;
    exactKeys(source, ['sourceId', 'generation', 'kind', 'label', 'timeOriginMs', 'capabilities'], 'source descriptor');
    const kind = source.kind;
    if (kind !== 'host' && kind !== 'client')
        throw new Error('inspector protocol: invalid source kind');
    if (typeof source.label !== 'string' || source.label.length === 0 || source.label.length > 256) {
        throw new Error('inspector protocol: source label must contain 1 to 256 characters');
    }
    if (typeof source.timeOriginMs !== 'number' || !Number.isFinite(source.timeOriginMs)) {
        throw new Error('inspector protocol: source timeOriginMs must be finite');
    }
    if (!Array.isArray(source.capabilities)) {
        throw new Error('inspector protocol: source capabilities must be an array');
    }
    const capabilities = source.capabilities.map(parseSourceCapability);
    const capabilityTypes = new Set();
    for (const capability of capabilities) {
        if (capabilityTypes.has(capability.type)) {
            throw new Error(`inspector protocol: source declares ${capability.type} more than once`);
        }
        capabilityTypes.add(capability.type);
    }
    if (kind !== 'client' && capabilities.length > 0) {
        throw new Error('inspector protocol: Host sources cannot declare Client capabilities');
    }
    const topics = value.topics.map((topic) => {
        if (typeof topic !== 'string' || topic.length === 0 || topic.length > 128) {
            throw new Error('inspector protocol: every source topic must contain 1 to 128 characters');
        }
        return topic;
    });
    return {
        v: INSPECTOR_PROTOCOL_VERSION,
        t: 'source/open',
        source: {
            sourceId: sourceId(source.sourceId),
            generation: generation(source.generation),
            kind,
            label: source.label,
            timeOriginMs: source.timeOriginMs,
            capabilities,
        },
        topics,
    };
}
function parseSourceCapability(value) {
    if (!isPlainObject(value) || typeof value.type !== 'string') {
        throw new Error('inspector protocol: source capability must have a type');
    }
    switch (value.type) {
        case 'client-runtime': return parseClientRuntimeCapability(value);
        case 'client-console': return parseClientConsoleCapability(value);
        case 'client-sources': return parseClientSourcesCapability(value);
        default: throw new Error(`inspector protocol: unknown source capability ${JSON.stringify(value.type)}`);
    }
}
function parseRecordsFrame(value, maxRecords, replace) {
    exactKeys(value, replace
        ? ['v', 't', 'sourceId', 'generation', 'nextSequence', 'records']
        : ['v', 't', 'sourceId', 'generation', 'firstSequence', 'droppedBefore', 'records'], replace ? 'source/replace frame' : 'source/append frame');
    if (!Array.isArray(value.records) || value.records.length > maxRecords) {
        throw new Error(`inspector protocol: source batch exceeds ${String(maxRecords)} records`);
    }
    const records = value.records.map(parseRecord);
    const common = {
        v: INSPECTOR_PROTOCOL_VERSION,
        sourceId: sourceId(value.sourceId),
        generation: generation(value.generation),
        records,
    };
    if (replace) {
        return {
            ...common,
            t: 'source/replace',
            nextSequence: natural(value.nextSequence, 'nextSequence'),
        };
    }
    return {
        ...common,
        t: 'source/append',
        firstSequence: natural(value.firstSequence, 'firstSequence'),
        droppedBefore: natural(value.droppedBefore, 'droppedBefore'),
    };
}
function parseRecord(value) {
    if (!isPlainObject(value)
        || typeof value.monotonicMs !== 'number'
        || !Number.isFinite(value.monotonicMs)
        || typeof value.topic !== 'string'
        || value.topic.length === 0
        || value.topic.length > 128
        || !isJsonValue(value.payload)) {
        throw new Error('inspector protocol: invalid observation record');
    }
    exactKeys(value, ['monotonicMs', 'topic', 'payload'], 'observation record');
    return { monotonicMs: value.monotonicMs, topic: value.topic, payload: value.payload };
}
function sourceId(value) {
    if (typeof value !== 'string')
        throw new Error('inspector protocol: sourceId must be a string');
    return inspectorId(value, 'sourceId');
}
function generation(value) {
    if (typeof value !== 'string')
        throw new Error('inspector protocol: generation must be a string');
    return inspectorId(value, 'generation');
}
function natural(value, label) {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new Error(`inspector protocol: ${label} must be a non-negative safe integer`);
    }
    return value;
}
//# sourceMappingURL=observation.js.map