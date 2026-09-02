/** Worker-owned repository of normalized fetch observations and captured bodies. */
import { Buffer } from 'node:buffer';
import { FETCH_TOPICS } from "../../shared/bridge/messages/network.js";
import { InspectorEventSourceParser } from "../../shared/network/event-source.js";
import { isPlainObject } from "../../shared/json.js";
/** Validated Network observation store independent of CDP connection state. */
export class NetworkStore {
    options;
    topics = new Set(FETCH_TOPICS);
    requests = new Map();
    journal = [];
    completed = [];
    listeners = new Set();
    journalBytes = 0;
    constructor(options) {
        this.options = options;
    }
    replace(source, records) {
        this.close(source, 'source state replaced');
        this.append(source, records);
    }
    append(source, records) {
        for (const record of records) {
            if (!this.topics.has(record.topic))
                continue;
            try {
                this.ingest(source, record);
            }
            catch {
                // A malformed domain payload loses only that observation; later records remain independently useful.
            }
        }
    }
    close(source, reason) {
        for (const request of this.requests.values()) {
            if (request.sourceId !== source.sourceId || request.completed)
                continue;
            request.completed = true;
            this.publish({
                type: 'request-failed',
                requestKey: request.key,
                requestId: request.requestId,
                timestampMs: performance.timeOrigin + performance.now(),
                errorText: reason,
                canceled: true,
            });
            this.completed.push(request.key);
        }
        this.enforceRetention();
    }
    /**
     * Read retained request lifecycle events.
     * @returns Events in observation order.
     */
    replay() {
        return this.journal;
    }
    /**
     * Subscribe to live request changes and eviction.
     * @param listener - Consumer called synchronously after each accepted change.
     * @returns A disposer removing the consumer.
     */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }
    /**
     * Read one retained request body.
     * @param requestId - Public request id assigned by this store.
     * @returns Captured bytes and truncation metadata.
     */
    requestBody(requestId) {
        const request = this.requestById(requestId);
        return body(request.requestBody, request.requestBodyTruncated, request.requestCaptureError, request.completed);
    }
    /**
     * Read one retained response body after response headers have arrived.
     * @param requestId - Public request id assigned by this store.
     * @returns Captured bytes and truncation metadata.
     */
    responseBody(requestId) {
        const request = this.requestById(requestId);
        if (!request.responseSeen)
            throw new Error('response headers have not arrived');
        return body(request.responseBody, request.responseBodyTruncated, request.responseCaptureError, request.completed);
    }
    /** Release subscribers and all retained request data. */
    dispose() {
        this.listeners.clear();
        this.requests.clear();
        this.journal.length = 0;
        this.completed.length = 0;
        this.journalBytes = 0;
    }
    ingest(source, record) {
        const payload = requirePayload(record.payload);
        const localId = stringField(payload, 'requestId');
        const key = `${source.sourceId}:${source.generation}:${localId}`;
        const timestampMs = source.timeOriginMs + record.monotonicMs;
        if (record.topic === 'fetch/start') {
            if (this.requests.has(key))
                throw new Error('fetch observation reused an active request id');
            const request = {
                key,
                requestId: key,
                sourceId: source.sourceId,
                requestBody: [],
                responseBody: [],
                requestBodyBytes: 0,
                responseBodyBytes: 0,
                requestBodyTruncated: false,
                responseBodyTruncated: false,
                responseSeen: false,
                completed: false,
                eventSourceParser: undefined,
                nextEventSourceId: 0,
            };
            this.requests.set(key, request);
            this.publish({
                type: 'request-started',
                requestKey: key,
                requestId: request.requestId,
                timestampMs,
                wallTimeMs: numberField(payload, 'wallTimeMs'),
                url: stringField(payload, 'url'),
                method: stringField(payload, 'method'),
                headers: headerField(payload, 'headers'),
                hasBody: booleanField(payload, 'hasBody'),
            });
            this.enforceRetention();
            return;
        }
        const request = this.requests.get(key);
        if (request === undefined)
            return;
        switch (record.topic) {
            case 'fetch/request-body-chunk':
                this.appendBody(request, 'request', stringField(payload, 'data'));
                return;
            case 'fetch/request-body-end': {
                request.requestBodyTruncated ||= booleanField(payload, 'truncated');
                const captureError = optionalStringField(payload, 'captureError');
                if (captureError !== undefined)
                    request.requestCaptureError = captureError;
                return;
            }
            case 'fetch/response':
                request.responseSeen = true;
                const mimeType = stringField(payload, 'mimeType').toLowerCase();
                request.eventSourceParser = mimeType === 'text/event-stream'
                    ? new InspectorEventSourceParser()
                    : undefined;
                this.publish({
                    type: 'response-received',
                    requestKey: key,
                    requestId: request.requestId,
                    timestampMs,
                    url: stringField(payload, 'url'),
                    status: numberField(payload, 'status'),
                    statusText: stringField(payload, 'statusText'),
                    headers: headerField(payload, 'headers'),
                    mimeType,
                });
                return;
            case 'fetch/response-body-chunk': {
                const data = stringField(payload, 'data');
                const bytes = this.appendBody(request, 'response', data);
                const byteLength = bytes.byteLength;
                for (const message of request.eventSourceParser?.push(bytes) ?? []) {
                    this.publish({
                        type: 'event-source-message',
                        requestKey: key,
                        requestId: request.requestId,
                        timestampMs,
                        ...message,
                        eventId: String(++request.nextEventSourceId),
                    });
                }
                this.emit({ type: 'response-data', requestKey: key, requestId: request.requestId, timestampMs, data, byteLength });
                return;
            }
            case 'fetch/end': {
                request.responseBodyTruncated ||= booleanField(payload, 'responseBodyTruncated');
                const captureError = optionalStringField(payload, 'responseCaptureError');
                if (captureError !== undefined)
                    request.responseCaptureError = captureError;
                this.complete(request, {
                    type: 'request-finished',
                    requestKey: key,
                    requestId: request.requestId,
                    timestampMs,
                    encodedDataLength: request.responseBodyBytes,
                    truncated: request.responseBodyTruncated,
                });
                return;
            }
            case 'fetch/error': {
                if (request.completed)
                    return;
                const errorText = stringField(payload, 'message');
                if (request.responseSeen) {
                    request.responseBodyTruncated = true;
                    request.responseCaptureError = errorText;
                }
                this.complete(request, {
                    type: 'request-failed',
                    requestKey: key,
                    requestId: request.requestId,
                    timestampMs,
                    errorText,
                    canceled: booleanField(payload, 'canceled'),
                });
                return;
            }
        }
    }
    appendBody(request, side, encoded) {
        const bytes = decodeBase64(encoded);
        this.evictCompletedFor(bytes.byteLength, request.key);
        const retained = bytes.subarray(0, Math.max(0, this.options.maxJournalBytes - this.journalBytes));
        if (side === 'request') {
            if (retained.byteLength > 0)
                request.requestBody.push(retained);
            request.requestBodyBytes += retained.byteLength;
            request.requestBodyTruncated ||= retained.byteLength < bytes.byteLength;
        }
        else {
            if (retained.byteLength > 0)
                request.responseBody.push(retained);
            request.responseBodyBytes += retained.byteLength;
            request.responseBodyTruncated ||= retained.byteLength < bytes.byteLength;
        }
        this.journalBytes += retained.byteLength;
        this.enforceRetention();
        return bytes;
    }
    complete(request, event) {
        if (request.completed)
            return;
        request.completed = true;
        this.publish(event);
        this.completed.push(request.key);
        this.enforceRetention();
    }
    publish(event) {
        this.journal.push(event);
        this.emit(event);
    }
    emit(event) {
        for (const listener of [...this.listeners]) {
            try {
                listener(event);
            }
            catch {
                // One presentation adapter cannot interrupt repository ingestion or sibling consumers.
            }
        }
    }
    enforceRetention() {
        while (this.requests.size > this.options.maxRetainedRequests || this.journalBytes > this.options.maxJournalBytes) {
            const key = (this.completed.shift() ?? this.requests.keys().next().value);
            const request = this.requests.get(key);
            if (!request.completed) {
                request.completed = true;
                this.publish({
                    type: 'request-failed',
                    requestKey: request.key,
                    requestId: request.requestId,
                    timestampMs: performance.timeOrigin + performance.now(),
                    errorText: 'Inspector retained-request limit exceeded',
                    canceled: true,
                });
            }
            this.evict(request);
        }
    }
    evictCompletedFor(bytes, protectedKey) {
        while (this.journalBytes + bytes > this.options.maxJournalBytes) {
            const index = this.completed.findIndex(key => key !== protectedKey);
            if (index === -1)
                return;
            const key = this.completed.splice(index, 1)[0];
            this.evict(this.requests.get(key));
        }
    }
    evict(request) {
        this.journalBytes -= request.requestBodyBytes + request.responseBodyBytes;
        this.requests.delete(request.key);
        for (let index = this.journal.length - 1; index >= 0; index--) {
            if (this.journal[index]?.requestKey === request.key)
                this.journal.splice(index, 1);
        }
        this.emit({ type: 'request-evicted', requestKey: request.key });
    }
    requestById(value) {
        if (typeof value !== 'string')
            throw new Error('Network requestId must be a string');
        const request = [...this.requests.values()].find(candidate => candidate.requestId === value);
        if (request === undefined)
            throw new Error(`No resource with given identifier: ${value}`);
        return request;
    }
}
function body(chunks, truncated, captureError, complete) {
    return {
        bytes: Buffer.concat(chunks),
        truncated,
        complete,
        ...(captureError === undefined ? {} : { captureError }),
    };
}
function decodeBase64(value) {
    if (value.length === 0 || value.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)) {
        throw new Error('fetch payload body chunk must be canonical base64');
    }
    const bytes = Buffer.from(value, 'base64');
    if (bytes.toString('base64') !== value)
        throw new Error('fetch payload body chunk must be canonical base64');
    return bytes;
}
function requirePayload(value) {
    if (!isPlainObject(value))
        throw new Error('fetch payload must be an object');
    return value;
}
function stringField(value, name) {
    const field = value[name];
    if (typeof field !== 'string')
        throw new Error(`fetch payload ${name} must be a string`);
    return field;
}
function optionalStringField(value, name) {
    const field = value[name];
    if (field !== undefined && typeof field !== 'string')
        throw new Error(`fetch payload ${name} must be a string`);
    return field;
}
function numberField(value, name) {
    const field = value[name];
    if (typeof field !== 'number' || !Number.isFinite(field))
        throw new Error(`fetch payload ${name} must be finite`);
    return field;
}
function booleanField(value, name) {
    const field = value[name];
    if (typeof field !== 'boolean')
        throw new Error(`fetch payload ${name} must be boolean`);
    return field;
}
function headerField(value, name) {
    const field = value[name];
    if (!Array.isArray(field))
        throw new Error(`fetch payload ${name} must be a header list`);
    return field.map((entry) => {
        if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== 'string' || typeof entry[1] !== 'string') {
            throw new Error(`fetch payload ${name} contains an invalid header`);
        }
        return [entry[0], entry[1]];
    });
}
//# sourceMappingURL=network-store.js.map