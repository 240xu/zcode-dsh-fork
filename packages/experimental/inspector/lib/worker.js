import { MessagePort, parentPort, workerData } from "node:worker_threads";
import { Buffer as Buffer$1 } from "node:buffer";
import "@deepseek-ai/dsh-util-crypto";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { Session } from "node:inspector";
//#region lib/types/shared/json.js
/** JSON values admitted by every Inspector cross-realm message. */
/**
* Test that a value can cross both MessagePort and JSON WebSocket carriers without coercion.
* @param value - Candidate wire value.
* @returns Whether the value is lossless JSON data.
*/
function isJsonValue(value) {
	return visitJson(value, /* @__PURE__ */ new Set());
}
/**
* Compute the UTF-8 byte length of a JSON wire value.
* @param value - Validated JSON value.
* @returns Its encoded byte length.
*/
function jsonByteLength(value) {
	return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}
/**
* Test whether a value is a plain object with string own keys.
* @param value - Candidate object.
* @returns Whether the value has `Object.prototype` or a null prototype.
*/
function isPlainObject(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	const prototype = Reflect.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}
function visitJson(value, ancestors) {
	if (value === null || typeof value === "string" || typeof value === "boolean") return true;
	if (typeof value === "number") return Number.isFinite(value) && !Object.is(value, -0);
	if (typeof value !== "object" || ancestors.has(value)) return false;
	ancestors.add(value);
	try {
		if (Array.isArray(value)) {
			if (Object.getPrototypeOf(value) !== Array.prototype || Reflect.ownKeys(value).length !== value.length + 1) return false;
			return value.every((item) => visitJson(item, ancestors));
		}
		if (!isPlainObject(value)) return false;
		for (const key of Reflect.ownKeys(value)) {
			if (typeof key !== "string") return false;
			const descriptor = Object.getOwnPropertyDescriptor(value, key);
			if (descriptor?.enumerable !== true || !("value" in descriptor) || !visitJson(descriptor.value, ancestors)) return false;
		}
		return true;
	} finally {
		ancestors.delete(value);
	}
}
//#endregion
//#region lib/types/shared/identity.js
/** Shared branded-identifier construction without assigning protocol ownership. */
/**
* Validate and brand a non-empty identifier received from or sent across a runtime boundary.
* @param value - Untrusted identifier text.
* @param label - Field name used in validation errors.
* @returns The role-branded identifier.
*/
function inspectorId(value, label) {
	if (value.length === 0 || value.length > 256) throw new Error(`inspector protocol: ${label} must contain 1 to 256 characters`);
	return value;
}
//#endregion
//#region lib/types/shared/validation.js
/** Shared exact-object readers for versioned Inspector wire protocols. */
/**
* Require a plain object containing only the listed fields.
* @param value - Candidate object.
* @param keys - Complete field allowlist.
* @param label - Object name used in validation errors.
* @returns The validated plain object.
*/
function exactObject(value, keys, label) {
	if (!isPlainObject(value)) throw new Error(`inspector protocol: ${label} must be an object`);
	exactKeys(value, keys, label);
	return value;
}
/**
* Reject fields outside one versioned object's declared field set.
* @param value - Plain object being validated.
* @param keys - Complete field allowlist.
* @param label - Object name used in validation errors.
*/
function exactKeys(value, keys, label) {
	const allowed = new Set(keys);
	for (const key of Reflect.ownKeys(value)) if (typeof key !== "string" || !allowed.has(key)) throw new Error(`inspector protocol: ${label} has unknown field ${JSON.stringify(String(key))}`);
}
/**
* Read one non-empty opaque identifier.
* @param value - Candidate identifier.
* @param label - Field name used in validation errors.
* @returns The role-branded identifier.
*/
function wireId(value, label) {
	if (typeof value !== "string") throw new Error(`inspector protocol: ${label} must be a string`);
	return inspectorId(value, label);
}
/**
* Read one optional string field.
* @param value - Object containing the field.
* @param key - Field name.
* @returns An empty object or the validated field.
*/
function optionalString$1(value, key) {
	const item = value[key];
	if (item === void 0) return {};
	if (typeof item !== "string") throw new Error(`inspector protocol: ${key} must be a string`);
	return { [key]: item };
}
/**
* Read one optional boolean field.
* @param value - Object containing the field.
* @param key - Field name.
* @returns An empty object or the validated field.
*/
function optionalBoolean(value, key) {
	const item = value[key];
	if (item === void 0) return {};
	if (typeof item !== "boolean") throw new Error(`inspector protocol: ${key} must be a boolean`);
	return { [key]: item };
}
//#endregion
//#region lib/types/shared/bridge/control-codec.js
/**
* Decode the structured-cloned Worker configuration.
* @param value - Untrusted workerData config value.
* @returns The validated Worker configuration.
*/
function parseInspectorWorkerConfig(value) {
	const record = exactObject(value, [
		"host",
		"startPort",
		"targetId",
		"clientToken",
		"clientOrigins",
		"maxSourceFrameBytes",
		"maxSourceRecordsPerFrame",
		"maxRetainedRequests",
		"maxJournalBytes",
		"clientRuntimeTimeoutMs",
		"maxCordisNodes",
		"maxDisconnectedCordisTrees",
		"maxClientSourceBytes"
	], "Worker config");
	if (record.host !== "127.0.0.1") throw new Error("inspector protocol: Worker host must be 127.0.0.1");
	if (typeof record.targetId !== "string" || record.targetId.length === 0) throw new Error("inspector protocol: Worker targetId must be a non-empty string");
	if (typeof record.clientToken !== "string" || record.clientToken.length === 0) throw new Error("inspector protocol: Worker clientToken must be a non-empty string");
	if (!Array.isArray(record.clientOrigins) || !record.clientOrigins.every((origin) => typeof origin === "string")) throw new Error("inspector protocol: Worker clientOrigins must be strings");
	const startPort = natural$2(record.startPort, "startPort", true);
	if (startPort > 65535) throw new Error("inspector protocol: Worker startPort must not exceed 65535");
	return {
		host: record.host,
		startPort,
		targetId: record.targetId,
		clientToken: record.clientToken,
		clientOrigins: record.clientOrigins,
		maxSourceFrameBytes: natural$2(record.maxSourceFrameBytes, "maxSourceFrameBytes"),
		maxSourceRecordsPerFrame: natural$2(record.maxSourceRecordsPerFrame, "maxSourceRecordsPerFrame"),
		maxRetainedRequests: natural$2(record.maxRetainedRequests, "maxRetainedRequests"),
		maxJournalBytes: natural$2(record.maxJournalBytes, "maxJournalBytes"),
		clientRuntimeTimeoutMs: natural$2(record.clientRuntimeTimeoutMs, "clientRuntimeTimeoutMs"),
		maxClientSourceBytes: natural$2(record.maxClientSourceBytes, "maxClientSourceBytes"),
		maxCordisNodes: natural$2(record.maxCordisNodes, "maxCordisNodes"),
		maxDisconnectedCordisTrees: natural$2(record.maxDisconnectedCordisTrees, "maxDisconnectedCordisTrees", true)
	};
}
/**
* Decode one Host-to-Worker lifecycle command.
* @param value - Untrusted control message.
* @returns The validated Host command.
*/
function parseInspectorHostControl(value) {
	if (exactObject(value, ["type"], "Host control message").type !== "shutdown") throw new Error("inspector protocol: unknown Host control message");
	return { type: "shutdown" };
}
function natural$2(value, label, zero = false) {
	if (!Number.isSafeInteger(value) || value < (zero ? 0 : 1)) throw new Error(`inspector protocol: ${label} must be ${zero ? "a non-negative" : "a positive"} safe integer`);
	return value;
}
//#endregion
//#region lib/types/shared/cordis/reader.js
/** Environment-independent Cordis runtime tree reader. */
/**
* Create a reader around a local committed-tree projection.
* @param read - Synchronous or asynchronous latest-tree read.
* @returns A reader suitable for query and CDP adapters.
*/
function createCordisRuntimeTreeReader(read) {
	return { getTree: async () => await read() };
}
//#endregion
//#region lib/types/worker/cdp/domains/network/session.js
/** CDP Network projection over the Worker-owned normalized network store. */
/** Projects retained and live network observations into connection-local CDP state. */
var NetworkDomain = class {
	store;
	enabled = /* @__PURE__ */ new Set();
	streamedRequests = /* @__PURE__ */ new Map();
	pendingStarts = /* @__PURE__ */ new Map();
	requestTypes = /* @__PURE__ */ new Map();
	unsubscribe;
	constructor(store) {
		this.store = store;
		this.unsubscribe = store.subscribe((event) => {
			this.receive(event);
		});
	}
	/**
	* Enable Network for one DevTools connection and replay retained lifecycle events.
	* @param session - Connection receiving replay and subsequent events.
	*/
	enable(session) {
		if (this.enabled.has(session)) return;
		this.enabled.add(session);
		this.pendingStarts.set(session, /* @__PURE__ */ new Map());
		this.requestTypes.set(session, /* @__PURE__ */ new Map());
		for (const event of this.store.replay()) this.send(session, event);
	}
	/**
	* Stop Network events for one DevTools connection.
	* @param session - Connection leaving the enabled set.
	*/
	disable(session) {
		this.enabled.delete(session);
		this.streamedRequests.delete(session);
		this.pendingStarts.delete(session);
		this.requestTypes.delete(session);
	}
	/**
	* Forget a closed DevTools connection.
	* @param session - Closed DevTools connection.
	*/
	detach(session) {
		this.disable(session);
	}
	/** Release the repository subscription and all connection-local state. */
	close() {
		this.unsubscribe();
		this.enabled.clear();
		this.streamedRequests.clear();
		this.pendingStarts.clear();
		this.requestTypes.clear();
	}
	/**
	* Handle one Worker-local Network method.
	* @param method - CDP method name.
	* @param params - Parsed request parameters.
	* @param session - Calling DevTools connection.
	* @returns The CDP result fields.
	*/
	handle(method, params, session) {
		switch (method) {
			case "Network.enable":
				this.enable(session);
				return {};
			case "Network.disable":
				this.disable(session);
				return {};
			case "Network.getResponseBody": {
				const body = this.store.responseBody(params.requestId);
				return {
					body: Buffer$1.from(body.bytes).toString("base64"),
					base64Encoded: true,
					dshInspectorTruncated: body.truncated,
					...body.captureError === void 0 ? {} : { dshInspectorCaptureError: body.captureError }
				};
			}
			case "Network.getRequestPostData": {
				const body = this.store.requestBody(params.requestId);
				return {
					postData: Buffer$1.from(body.bytes).toString("utf8"),
					dshInspectorTruncated: body.truncated,
					...body.captureError === void 0 ? {} : { dshInspectorCaptureError: body.captureError }
				};
			}
			case "Network.streamResourceContent": {
				const body = this.store.responseBody(params.requestId);
				if (typeof params.requestId !== "string") throw new Error("Network requestId must be a string");
				if (!body.complete) {
					let requests = this.streamedRequests.get(session);
					if (requests === void 0) this.streamedRequests.set(session, requests = /* @__PURE__ */ new Set());
					requests.add(params.requestId);
				}
				return { bufferedData: Buffer$1.from(body.bytes).toString("base64") };
			}
			case "Network.setCacheDisabled":
			case "Network.setBypassServiceWorker":
			case "Network.setExtraHTTPHeaders":
			case "Network.clearBrowserCache":
			case "Network.clearBrowserCookies": return {};
			default: throw new Error(`unsupported Network method ${method}`);
		}
	}
	receive(event) {
		if (event.type === "request-evicted") {
			for (const [session, requests] of this.streamedRequests) {
				requests.delete(event.requestKey);
				if (requests.size === 0) this.streamedRequests.delete(session);
			}
			for (const requests of this.pendingStarts.values()) requests.delete(event.requestKey);
			for (const requests of this.requestTypes.values()) requests.delete(event.requestKey);
			return;
		}
		for (const session of this.enabled) this.send(session, event);
	}
	send(session, event) {
		const timestamp = (event.timestampMs - performance.timeOrigin) / 1e3;
		switch (event.type) {
			case "request-started":
				this.pendingStarts.get(session)?.set(event.requestKey, event);
				return;
			case "response-received": {
				const resourceType = event.mimeType === "text/event-stream" ? "EventSource" : "Fetch";
				this.sendRequestStart(session, event.requestKey, resourceType);
				session.sendEvent("Network.responseReceived", {
					requestId: event.requestId,
					loaderId: "dsh-inspector-loader",
					frameId: "dsh-inspector-host-frame",
					timestamp,
					type: resourceType,
					response: {
						url: event.url,
						status: event.status,
						statusText: event.statusText,
						headers: cdpHeaders(event.headers),
						mimeType: event.mimeType,
						connectionReused: false,
						connectionId: 0,
						encodedDataLength: resourceType === "EventSource" ? -1 : 0,
						securityState: "neutral"
					}
				});
				return;
			}
			case "event-source-message":
				session.sendEvent("Network.eventSourceMessageReceived", {
					requestId: event.requestId,
					timestamp,
					eventName: event.eventName,
					eventId: event.eventId,
					data: event.data
				});
				return;
			case "response-data":
				session.sendEvent("Network.dataReceived", {
					requestId: event.requestId,
					timestamp,
					dataLength: event.byteLength,
					encodedDataLength: event.byteLength,
					...this.streamedRequests.get(session)?.has(event.requestKey) === true ? { data: event.data } : {}
				});
				return;
			case "request-finished":
				this.sendRequestStart(session, event.requestKey, "Fetch");
				session.sendEvent("Network.loadingFinished", {
					requestId: event.requestId,
					timestamp,
					encodedDataLength: event.encodedDataLength,
					dshInspectorTruncated: event.truncated
				});
				this.stopRequest(session, event.requestKey);
				return;
			case "request-failed": {
				this.sendRequestStart(session, event.requestKey, "Fetch");
				const resourceType = this.requestTypes.get(session)?.get(event.requestKey) ?? "Fetch";
				session.sendEvent("Network.loadingFailed", {
					requestId: event.requestId,
					timestamp,
					type: resourceType,
					errorText: event.errorText,
					canceled: event.canceled
				});
				this.stopRequest(session, event.requestKey);
				return;
			}
			default: return assertNever$5(event);
		}
	}
	sendRequestStart(session, requestKey, resourceType) {
		const pending = this.pendingStarts.get(session);
		const event = pending?.get(requestKey);
		if (event === void 0) return;
		pending?.delete(requestKey);
		this.requestTypes.get(session)?.set(requestKey, resourceType);
		session.sendEvent("Network.requestWillBeSent", {
			requestId: event.requestId,
			loaderId: "dsh-inspector-loader",
			documentURL: "dsh://host",
			request: {
				url: event.url,
				method: event.method,
				headers: cdpHeaders(event.headers),
				hasPostData: event.hasBody
			},
			timestamp: (event.timestampMs - performance.timeOrigin) / 1e3,
			wallTime: event.wallTimeMs / 1e3,
			initiator: { type: "other" },
			type: resourceType
		});
	}
	stopRequest(session, requestKey) {
		const streamed = this.streamedRequests.get(session);
		streamed?.delete(requestKey);
		if (streamed?.size === 0) this.streamedRequests.delete(session);
		this.pendingStarts.get(session)?.delete(requestKey);
		this.requestTypes.get(session)?.delete(requestKey);
	}
};
function cdpHeaders(entries) {
	const headers = Object.create(null);
	for (const [name, value] of entries) headers[name] = headers[name] === void 0 ? value : `${headers[name]}\n${value}`;
	return headers;
}
function assertNever$5(value) {
	throw new Error(`Unexpected network event: ${JSON.stringify(value)}`);
}
//#endregion
//#region lib/types/shared/bridge/messages/network.js
/** Observation topic names carried by the internal bridge for captured fetches. */
/** Complete set of fetch observation topics. */
const FETCH_TOPICS = [
	"fetch/start",
	"fetch/request-body-chunk",
	"fetch/request-body-end",
	"fetch/response",
	"fetch/response-body-chunk",
	"fetch/end",
	"fetch/error"
];
//#endregion
//#region lib/types/shared/network/event-source.js
/** Incremental UTF-8 parser for Server-Sent Events carried by captured responses. */
/** Parse response bytes into consumer-neutral Server-Sent Event messages. */
var InspectorEventSourceParser = class {
	decoder = new TextDecoder();
	line = "";
	eventName = "";
	eventId = "";
	data = "";
	afterCarriageReturn = false;
	/**
	* Consume one response-body chunk.
	* @param bytes - Next bytes in response order.
	* @returns Complete events terminated by an empty line in this chunk.
	*/
	push(bytes) {
		return this.consume(this.decoder.decode(bytes, { stream: true }));
	}
	consume(chunk) {
		const messages = [];
		let start = 0;
		for (let index = 0; index < chunk.length; index++) {
			if (this.afterCarriageReturn && chunk[index] === "\n") {
				this.afterCarriageReturn = false;
				start = index + 1;
				continue;
			}
			this.afterCarriageReturn = false;
			if (chunk[index] !== "\r" && chunk[index] !== "\n") continue;
			this.line += chunk.slice(start, index);
			const message = this.parseLine();
			if (message !== void 0) messages.push(message);
			this.line = "";
			start = index + 1;
			this.afterCarriageReturn = chunk[index] === "\r";
		}
		this.line += chunk.slice(start);
		return messages;
	}
	parseLine() {
		if (this.line.length === 0) {
			const data = this.data;
			this.data = "";
			const eventName = this.eventName;
			this.eventName = "";
			if (data.length === 0) return void 0;
			return {
				eventName: eventName || "message",
				eventId: this.eventId,
				data: data.slice(0, -1)
			};
		}
		if (this.line.startsWith(":")) return void 0;
		const colon = this.line.indexOf(":");
		const field = colon === -1 ? this.line : this.line.slice(0, colon);
		let value = colon === -1 ? "" : this.line.slice(colon + 1);
		if (value.startsWith(" ")) value = value.slice(1);
		switch (field) {
			case "event":
				this.eventName = value;
				return;
			case "data":
				this.data += `${value}\n`;
				return;
			case "id":
				if (!value.includes("\0")) this.eventId = value;
				return;
			default: return;
		}
	}
};
//#endregion
//#region lib/types/worker/inspection/network-store.js
/** Worker-owned repository of normalized fetch observations and captured bodies. */
/** Validated Network observation store independent of CDP connection state. */
var NetworkStore = class {
	options;
	topics = new Set(FETCH_TOPICS);
	requests = /* @__PURE__ */ new Map();
	journal = [];
	completed = [];
	listeners = /* @__PURE__ */ new Set();
	journalBytes = 0;
	constructor(options) {
		this.options = options;
	}
	replace(source, records) {
		this.close(source, "source state replaced");
		this.append(source, records);
	}
	append(source, records) {
		for (const record of records) {
			if (!this.topics.has(record.topic)) continue;
			try {
				this.ingest(source, record);
			} catch {}
		}
	}
	close(source, reason) {
		for (const request of this.requests.values()) {
			if (request.sourceId !== source.sourceId || request.completed) continue;
			request.completed = true;
			this.publish({
				type: "request-failed",
				requestKey: request.key,
				requestId: request.requestId,
				timestampMs: performance.timeOrigin + performance.now(),
				errorText: reason,
				canceled: true
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
		return () => {
			this.listeners.delete(listener);
		};
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
		if (!request.responseSeen) throw new Error("response headers have not arrived");
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
		const localId = stringField(payload, "requestId");
		const key = `${source.sourceId}:${source.generation}:${localId}`;
		const timestampMs = source.timeOriginMs + record.monotonicMs;
		if (record.topic === "fetch/start") {
			if (this.requests.has(key)) throw new Error("fetch observation reused an active request id");
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
				eventSourceParser: void 0,
				nextEventSourceId: 0
			};
			this.requests.set(key, request);
			this.publish({
				type: "request-started",
				requestKey: key,
				requestId: request.requestId,
				timestampMs,
				wallTimeMs: numberField(payload, "wallTimeMs"),
				url: stringField(payload, "url"),
				method: stringField(payload, "method"),
				headers: headerField(payload, "headers"),
				hasBody: booleanField(payload, "hasBody")
			});
			this.enforceRetention();
			return;
		}
		const request = this.requests.get(key);
		if (request === void 0) return;
		switch (record.topic) {
			case "fetch/request-body-chunk":
				this.appendBody(request, "request", stringField(payload, "data"));
				return;
			case "fetch/request-body-end": {
				request.requestBodyTruncated ||= booleanField(payload, "truncated");
				const captureError = optionalStringField(payload, "captureError");
				if (captureError !== void 0) request.requestCaptureError = captureError;
				return;
			}
			case "fetch/response":
				request.responseSeen = true;
				const mimeType = stringField(payload, "mimeType").toLowerCase();
				request.eventSourceParser = mimeType === "text/event-stream" ? new InspectorEventSourceParser() : void 0;
				this.publish({
					type: "response-received",
					requestKey: key,
					requestId: request.requestId,
					timestampMs,
					url: stringField(payload, "url"),
					status: numberField(payload, "status"),
					statusText: stringField(payload, "statusText"),
					headers: headerField(payload, "headers"),
					mimeType
				});
				return;
			case "fetch/response-body-chunk": {
				const data = stringField(payload, "data");
				const bytes = this.appendBody(request, "response", data);
				const byteLength = bytes.byteLength;
				for (const message of request.eventSourceParser?.push(bytes) ?? []) this.publish({
					type: "event-source-message",
					requestKey: key,
					requestId: request.requestId,
					timestampMs,
					...message,
					eventId: String(++request.nextEventSourceId)
				});
				this.emit({
					type: "response-data",
					requestKey: key,
					requestId: request.requestId,
					timestampMs,
					data,
					byteLength
				});
				return;
			}
			case "fetch/end": {
				request.responseBodyTruncated ||= booleanField(payload, "responseBodyTruncated");
				const captureError = optionalStringField(payload, "responseCaptureError");
				if (captureError !== void 0) request.responseCaptureError = captureError;
				this.complete(request, {
					type: "request-finished",
					requestKey: key,
					requestId: request.requestId,
					timestampMs,
					encodedDataLength: request.responseBodyBytes,
					truncated: request.responseBodyTruncated
				});
				return;
			}
			case "fetch/error": {
				if (request.completed) return;
				const errorText = stringField(payload, "message");
				if (request.responseSeen) {
					request.responseBodyTruncated = true;
					request.responseCaptureError = errorText;
				}
				this.complete(request, {
					type: "request-failed",
					requestKey: key,
					requestId: request.requestId,
					timestampMs,
					errorText,
					canceled: booleanField(payload, "canceled")
				});
				return;
			}
		}
	}
	appendBody(request, side, encoded) {
		const bytes = decodeBase64(encoded);
		this.evictCompletedFor(bytes.byteLength, request.key);
		const retained = bytes.subarray(0, Math.max(0, this.options.maxJournalBytes - this.journalBytes));
		if (side === "request") {
			if (retained.byteLength > 0) request.requestBody.push(retained);
			request.requestBodyBytes += retained.byteLength;
			request.requestBodyTruncated ||= retained.byteLength < bytes.byteLength;
		} else {
			if (retained.byteLength > 0) request.responseBody.push(retained);
			request.responseBodyBytes += retained.byteLength;
			request.responseBodyTruncated ||= retained.byteLength < bytes.byteLength;
		}
		this.journalBytes += retained.byteLength;
		this.enforceRetention();
		return bytes;
	}
	complete(request, event) {
		if (request.completed) return;
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
		for (const listener of [...this.listeners]) try {
			listener(event);
		} catch {}
	}
	enforceRetention() {
		while (this.requests.size > this.options.maxRetainedRequests || this.journalBytes > this.options.maxJournalBytes) {
			const key = this.completed.shift() ?? this.requests.keys().next().value;
			const request = this.requests.get(key);
			if (!request.completed) {
				request.completed = true;
				this.publish({
					type: "request-failed",
					requestKey: request.key,
					requestId: request.requestId,
					timestampMs: performance.timeOrigin + performance.now(),
					errorText: "Inspector retained-request limit exceeded",
					canceled: true
				});
			}
			this.evict(request);
		}
	}
	evictCompletedFor(bytes, protectedKey) {
		while (this.journalBytes + bytes > this.options.maxJournalBytes) {
			const index = this.completed.findIndex((key) => key !== protectedKey);
			if (index === -1) return;
			const key = this.completed.splice(index, 1)[0];
			this.evict(this.requests.get(key));
		}
	}
	evict(request) {
		this.journalBytes -= request.requestBodyBytes + request.responseBodyBytes;
		this.requests.delete(request.key);
		for (let index = this.journal.length - 1; index >= 0; index--) if (this.journal[index]?.requestKey === request.key) this.journal.splice(index, 1);
		this.emit({
			type: "request-evicted",
			requestKey: request.key
		});
	}
	requestById(value) {
		if (typeof value !== "string") throw new Error("Network requestId must be a string");
		const request = [...this.requests.values()].find((candidate) => candidate.requestId === value);
		if (request === void 0) throw new Error(`No resource with given identifier: ${value}`);
		return request;
	}
};
function body(chunks, truncated, captureError, complete) {
	return {
		bytes: Buffer$1.concat(chunks),
		truncated,
		complete,
		...captureError === void 0 ? {} : { captureError }
	};
}
function decodeBase64(value) {
	if (value.length === 0 || value.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)) throw new Error("fetch payload body chunk must be canonical base64");
	const bytes = Buffer$1.from(value, "base64");
	if (bytes.toString("base64") !== value) throw new Error("fetch payload body chunk must be canonical base64");
	return bytes;
}
function requirePayload(value) {
	if (!isPlainObject(value)) throw new Error("fetch payload must be an object");
	return value;
}
function stringField(value, name) {
	const field = value[name];
	if (typeof field !== "string") throw new Error(`fetch payload ${name} must be a string`);
	return field;
}
function optionalStringField(value, name) {
	const field = value[name];
	if (field !== void 0 && typeof field !== "string") throw new Error(`fetch payload ${name} must be a string`);
	return field;
}
function numberField(value, name) {
	const field = value[name];
	if (typeof field !== "number" || !Number.isFinite(field)) throw new Error(`fetch payload ${name} must be finite`);
	return field;
}
function booleanField(value, name) {
	const field = value[name];
	if (typeof field !== "boolean") throw new Error(`fetch payload ${name} must be boolean`);
	return field;
}
function headerField(value, name) {
	const field = value[name];
	if (!Array.isArray(field)) throw new Error(`fetch payload ${name} must be a header list`);
	return field.map((entry) => {
		if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== "string" || typeof entry[1] !== "string") throw new Error(`fetch payload ${name} contains an invalid header`);
		return [entry[0], entry[1]];
	});
}
//#endregion
//#region lib/types/worker/cdp/ids.js
/** Opaque identifiers owned by one Worker-side Chrome DevTools connection. */
/**
* Validate and brand a string id allocated or accepted by the CDP adapter.
* @param value - CDP identifier text.
* @param label - Field named in validation failures.
* @returns The branded CDP identifier.
*/
function cdpStringId(value, label) {
	if (value.length === 0 || value.length > 16384) throw new Error(`inspector CDP: ${label} must contain 1 to 16384 characters`);
	return value;
}
/**
* Validate and brand a positive numeric id allocated by the CDP adapter.
* @param value - CDP identifier number.
* @param label - Field named in validation failures.
* @returns The branded numeric identifier.
*/
function cdpNumericId(value, label) {
	if (!Number.isSafeInteger(value) || value < 1) throw new Error(`inspector CDP: ${label} must be a positive integer`);
	return value;
}
//#endregion
//#region lib/types/worker/cdp/domains/dom/model.js
/** Worker projection from Cordis snapshots to a connection-neutral semantic DOM. */
/** Assigns durable backend ids and projects the latest source snapshots. */
var CordisDomBackend = class {
	trees;
	backendIdByKey = /* @__PURE__ */ new Map();
	listeners = /* @__PURE__ */ new Set();
	documentValue;
	nextBackendNodeId = 1;
	nextRevision = 1;
	unsubscribe;
	nodeByObject = /* @__PURE__ */ new Map();
	constructor(trees) {
		this.trees = trees;
		this.documentValue = this.build();
		this.unsubscribe = trees.subscribe((event) => {
			const previous = this.documentValue;
			this.documentValue = this.build();
			if (event.type === "source-disconnected") this.emit({
				type: "source-disconnected",
				source: event.source
			});
			const mutations = diffDocument(previous, this.documentValue);
			if (mutations.length > 0) this.emit({
				type: "tree-mutated",
				mutations
			});
		});
	}
	/**
	* Read the latest connection-neutral semantic document.
	* @returns The current immutable document revision.
	*/
	document() {
		return this.documentValue;
	}
	/**
	* Subscribe to full document replacements and in-place realm state changes.
	* @param listener - Called after a new backend revision is installed.
	* @returns A disposer removing the listener.
	*/
	subscribe(listener) {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}
	/** Release repository subscriptions at Worker shutdown. */
	close() {
		this.unsubscribe();
		this.listeners.clear();
	}
	/**
	* Resolve one source-local object reference to its current projected node.
	* @param source - Connected source generation that owns the reference.
	* @param reference - Realm-local registry and object handle.
	* @returns The current projected node, when present.
	*/
	nodeForObject(source, reference) {
		return this.nodeByObject.get(objectKey$1(source, reference));
	}
	/**
	* Resolve a reference when a Runtime route identifies only Host or Client ownership.
	* @param kind - Host or Client ownership inferred by the Runtime adapter.
	* @param reference - Realm-local registry and object handle.
	* @returns The current projected node, when present.
	*/
	nodeForObjectKind(kind, reference) {
		const route = this.trees.resolveObjectInKind(kind, reference);
		return route === void 0 ? void 0 : this.nodeForObject(route.source, reference);
	}
	/**
	* Resolve one realm-neutral Runtime reference to its current projected node.
	* @param realm - Realm that exposed the Runtime object.
	* @param reference - Realm-local registry and object handle.
	* @returns The current projected node, when present.
	*/
	nodeForRealm(realm, reference) {
		if (realm.kind === "host") return this.nodeForObjectKind("host", reference);
		const route = this.trees.resolveObjectIdentity(realm.sourceId, realm.generation, reference);
		return route === void 0 ? void 0 : this.nodeForObject(route.source, reference);
	}
	build() {
		const byBackendId = /* @__PURE__ */ new Map();
		const parentByBackendId = /* @__PURE__ */ new Map();
		this.nodeByObject.clear();
		const tree = this.trees.tree();
		const root = this.node("document", "#document", [], "#document");
		const host = this.node("host", "host", [], "<host>");
		if (tree.host !== null) host.children.push(this.entity(tree.host, tree.host.snapshot.root));
		const clients = this.node("clients", "clients", [], "<clients>");
		for (const clientTree of tree.clients) {
			const client = this.node(`client:${clientTree.source.sourceId}`, "client", [], "<client>");
			client.children.push(this.entity(clientTree, clientTree.snapshot.root));
			clients.children.push(client);
		}
		root.children.push(host, clients);
		const retainedKeys = /* @__PURE__ */ new Set();
		const freeze = (node, parent) => {
			const value = {
				...node,
				children: node.children.map((child) => freeze(child, node))
			};
			retainedKeys.add(value.key);
			byBackendId.set(value.backendNodeId, value);
			if (parent !== void 0) parentByBackendId.set(value.backendNodeId, parent.backendNodeId);
			if (value.object?.connection.state === "connected") this.nodeByObject.set(objectKey$1(value.object.source, {
				registryId: value.object.snapshot.objectRegistryId,
				handle: value.object.node.objectHandle
			}), value);
			return value;
		};
		const frozenRoot = freeze(root);
		for (const key of this.backendIdByKey.keys()) if (!retainedKeys.has(key)) this.backendIdByKey.delete(key);
		return {
			revision: this.nextRevision++,
			root: frozenRoot,
			byBackendId,
			parentByBackendId
		};
	}
	entity(tree, node) {
		const { source, snapshot } = tree;
		const key = `entity:${objectKey$1(source, {
			registryId: snapshot.objectRegistryId,
			handle: node.objectHandle
		})}`;
		const object = {
			...tree,
			node
		};
		const attributes = node.kind === "fiber" ? [["uid", String(node.uid)]] : [];
		const projected = this.node(key, node.kind, attributes, elementDescription(node.kind, attributes), object);
		projected.children.push(...node.children.map((child) => this.entity(tree, child)));
		return projected;
	}
	node(key, name, attributes, description, object) {
		let backendNodeId = this.backendIdByKey.get(key);
		if (backendNodeId === void 0) {
			backendNodeId = cdpNumericId(this.nextBackendNodeId++, "backendNodeId");
			this.backendIdByKey.set(key, backendNodeId);
		}
		return {
			backendNodeId,
			key,
			name,
			attributes,
			description,
			...object === void 0 ? {} : { object },
			children: []
		};
	}
	emit(change) {
		for (const listener of [...this.listeners]) try {
			listener(change);
		} catch {}
	}
};
function elementDescription(name, attributes) {
	const rendered = attributes.map(([key, value]) => value === "" ? key : `${key}=${JSON.stringify(value)}`).join(" ");
	return `<${name}${rendered === "" ? "" : ` ${rendered}`}>`;
}
function objectKey$1(source, reference) {
	return `${source.sourceId}\0${source.generation}\0${reference.registryId}\0${reference.handle}`;
}
function diffDocument(previous, current) {
	const mutations = [];
	return diffNode(previous.root, current.root, mutations) ? mutations : [{ type: "document-updated" }];
}
function diffNode(previous, current, mutations) {
	if (previous.backendNodeId !== current.backendNodeId || previous.name !== current.name) return false;
	const previousAttributes = new Map(previous.attributes);
	const currentAttributes = new Map(current.attributes);
	for (const [name, value] of currentAttributes) {
		if (previousAttributes.get(name) === value) continue;
		mutations.push({
			type: "attribute-modified",
			backendNodeId: current.backendNodeId,
			name,
			value
		});
	}
	for (const [name] of previousAttributes) if (!currentAttributes.has(name)) mutations.push({
		type: "attribute-removed",
		backendNodeId: current.backendNodeId,
		name
	});
	const previousIds = previous.children.map((child) => child.backendNodeId);
	const currentIds = current.children.map((child) => child.backendNodeId);
	const previousSet = new Set(previousIds);
	const currentSet = new Set(currentIds);
	if (!sameIds(previousIds.filter((id) => currentSet.has(id)), currentIds.filter((id) => previousSet.has(id)))) {
		mutations.push({
			type: "children-replaced",
			parentBackendNodeId: current.backendNodeId,
			children: current.children
		});
		return true;
	}
	for (const child of previous.children) if (!currentSet.has(child.backendNodeId)) mutations.push({
		type: "child-removed",
		parentBackendNodeId: current.backendNodeId,
		node: child
	});
	for (let index = 0; index < current.children.length; index++) {
		const child = current.children[index];
		if (previousSet.has(child.backendNodeId)) continue;
		mutations.push({
			type: "child-inserted",
			parentBackendNodeId: current.backendNodeId,
			previousBackendNodeId: index === 0 ? 0 : current.children[index - 1].backendNodeId,
			node: child
		});
	}
	const previousById = new Map(previous.children.map((child) => [child.backendNodeId, child]));
	for (const child of current.children) {
		const prior = previousById.get(child.backendNodeId);
		if (prior !== void 0 && !diffNode(prior, child, mutations)) return false;
	}
	return true;
}
function sameIds(left, right) {
	return left.length === right.length && left.every((value, index) => value === right[index]);
}
//#endregion
//#region lib/types/shared/cordis/object-registry.js
const REGISTRIES_SYMBOL = "dsh.inspector.realm-object-registries";
/** Self-contained function sent through CDP to identify its `this` object in the inspected realm. */
const IDENTIFY_REALM_OBJECT_FUNCTION = `function () {
  const table = globalThis[Symbol.for(${JSON.stringify(REGISTRIES_SYMBOL)})]
  if (!(table instanceof Map)) return undefined
  for (const registry of table.values()) {
    const reference = registry.identify(this)
    if (reference !== undefined) return reference
  }
  return undefined
}`;
/**
* Build an expression that resolves one reference inside its owning realm.
* @param reference - Validated source-local object reference.
* @returns Side-effect-free JavaScript expression for Runtime evaluation.
*/
function realmObjectExpression(reference) {
	return `globalThis[Symbol.for(${JSON.stringify(REGISTRIES_SYMBOL)})]?.get(${JSON.stringify(reference.registryId)})?.resolve(${JSON.stringify(reference.handle)})`;
}
//#endregion
//#region lib/types/worker/cdp/protocol.js
/** Minimal CDP request and transport types owned by the Worker. */
/**
* Parse one DevTools request before routing it.
* @param value - Untrusted decoded WebSocket payload.
* @returns The validated request envelope.
*/
function parseCdpRequest(value) {
	if (!isPlainObject(value) || !Number.isSafeInteger(value.id) || value.id < 0 || typeof value.method !== "string" || value.method.length === 0 || value.params !== void 0 && !isPlainObject(value.params)) throw new Error("inspector CDP: invalid request");
	return {
		id: value.id,
		method: value.method,
		params: value.params ?? {}
	};
}
/**
* Build a stable CDP error response.
* @param id - Request id copied from the caller.
* @param code - JSON-RPC error code.
* @param message - Human-readable failure reason.
* @returns The CDP error envelope.
*/
function cdpError(id, code, message) {
	return {
		id,
		error: {
			code,
			message
		}
	};
}
/**
* Send one failed CDP operation using the domain error code.
* @param transport - Connection receiving the response.
* @param request - Request supplying the response id.
* @param error - Rejection or synchronous error to render.
*/
function sendCdpFailure(transport, request, error) {
	const message = error instanceof Error ? error.message : String(error);
	transport.send(cdpError(request.id, -32e3, message));
}
/**
* Settle an asynchronous CDP operation through one transport.
* @param transport - Connection receiving the response.
* @param request - Request supplying the response id.
* @param operation - Domain operation that produces the result.
*/
function respondToCdpRequest(transport, request, operation) {
	operation().then((result) => {
		transport.send({
			id: request.id,
			result
		});
	}, (error) => {
		sendCdpFailure(transport, request, error);
	});
}
//#endregion
//#region lib/types/worker/cdp/domains/dom/session.js
/** Per-DevTools-session read-only DOM projection over Cordis tree snapshots. */
const READ_ONLY_METHODS = new Set([
	"DOM.setAttributeValue",
	"DOM.setAttributesAsText",
	"DOM.setNodeName",
	"DOM.setNodeValue",
	"DOM.setOuterHTML",
	"DOM.removeNode",
	"DOM.moveTo",
	"DOM.copyTo"
]);
/**
* Children levels `DOM.getDocument` serves when the caller omits `depth`;
* deeper levels arrive through `DOM.requestChildNodes` on expand.
*/
const DEFAULT_DOCUMENT_DEPTH = 3;
/**
* Connection-local NodeId, search, and RemoteObject mapping owner. Node payloads are depth-limited;
* withheld levels are fetched through `DOM.requestChildNodes` or pushed with the ancestor chain
* when a NodeId leaves through search or object lookup.
*/
var CordisDomSession = class {
	transport;
	backend;
	runtime;
	nodeIdByBackend = /* @__PURE__ */ new Map();
	backendByNodeId = /* @__PURE__ */ new Map();
	childrenSent = /* @__PURE__ */ new Set();
	backendByObjectId = /* @__PURE__ */ new Map();
	objectIdsByGroup = /* @__PURE__ */ new Map();
	searches = /* @__PURE__ */ new Map();
	unsubscribe;
	nextNodeId = 1;
	nextSearchId = 1;
	enabled = false;
	constructor(transport, backend, runtime) {
		this.transport = transport;
		this.backend = backend;
		this.runtime = runtime;
		this.unsubscribe = backend.subscribe((event) => {
			this.updateDocument(event);
		});
	}
	/**
	* Handle one DOM command.
	* @param request - Parsed CDP request.
	* @returns Whether this adapter owns the method.
	*/
	handle(request) {
		if (!request.method.startsWith("DOM.")) return false;
		this.respond(request, async () => this.execute(request.method, request.params));
		return true;
	}
	/**
	* Forget a Runtime object mapping before its owner releases the object.
	* @param objectId - Connection-local Runtime object id.
	*/
	releaseObject(objectId) {
		if (typeof objectId !== "string") return;
		const id = cdpStringId(objectId, "objectId");
		this.backendByObjectId.delete(id);
		for (const ids of this.objectIdsByGroup.values()) ids.delete(id);
	}
	/**
	* Recognize a Runtime object from any realm as one current Cordis node.
	* @param objectId - Connection-local CDP object id.
	* @param realm - Realm that exposed the object.
	* @param reference - Realm-local semantic object identity.
	* @param group - Runtime object group retaining the id.
	* @returns Node presentation fields, when the object remains in the current tree.
	*/
	bindObject(objectId, realm, reference, group) {
		const node = this.backend.nodeForRealm(realm, reference);
		if (node === void 0) return void 0;
		this.bindObjectId(objectId, node, group);
		return presentation(node);
	}
	/**
	* Forget every DOM mapping retained under one Runtime object group.
	* @param group - Runtime object-group name.
	*/
	releaseObjectGroup(group) {
		if (typeof group !== "string") return;
		for (const objectId of this.objectIdsByGroup.get(group) ?? []) this.backendByObjectId.delete(objectId);
		this.objectIdsByGroup.delete(group);
	}
	/** Release connection-owned ids and subscriptions. */
	close() {
		this.unsubscribe();
		this.resetDocument();
		this.searches.clear();
	}
	async execute(method, params) {
		if (READ_ONLY_METHODS.has(method)) throw new Error("Cordis DOM projection is read-only");
		switch (method) {
			case "DOM.enable":
				this.enabled = true;
				return {};
			case "DOM.disable":
				this.enabled = false;
				this.resetDocument();
				return {};
			case "DOM.getDocument":
				this.enabled = true;
				return { root: this.serialize(this.backend.document().root, 0, depthParam(params.depth, DEFAULT_DOCUMENT_DEPTH), true) };
			case "DOM.requestChildNodes": {
				const node = this.fromNodeId(params.nodeId);
				const depth = depthParam(params.depth, 1);
				this.childrenSent.add(node.backendNodeId);
				this.transport.send({
					method: "DOM.setChildNodes",
					params: {
						parentId: numberParam(params.nodeId, "nodeId"),
						nodes: node.children.map((child) => this.serialize(child, this.nodeId(node), depth - 1, true))
					}
				});
				return {};
			}
			case "DOM.describeNode": {
				const node = this.selectNode(params);
				return { node: this.serialize(node, this.parentNodeId(node), depthParam(params.depth, 1), false) };
			}
			case "DOM.getAttributes": return { attributes: this.fromNodeId(params.nodeId).attributes.flat() };
			case "DOM.getOuterHTML": return { outerHTML: outerHtml(this.selectNode(params)) };
			case "DOM.pushNodesByBackendIdsToFrontend":
				if (!Array.isArray(params.backendNodeIds)) throw new Error("backendNodeIds must be an array");
				return { nodeIds: params.backendNodeIds.map((value) => {
					if (!Number.isSafeInteger(value) || value < 1) return 0;
					const node = this.backend.document().byBackendId.get(cdpBackendNodeId(value, "backendNodeId"));
					if (node === void 0) return 0;
					this.pushNodePath(node);
					return this.nodeId(node);
				}) };
			case "DOM.resolveNode": return { object: await this.resolveNode(this.selectNode(params), optionalString(params.objectGroup)) };
			case "DOM.requestNode": {
				const objectId = cdpStringId(stringParam(params.objectId, "objectId"), "objectId");
				const binding = this.backendByObjectId.get(objectId);
				if (binding === void 0) throw new Error("RemoteObject is not a current Cordis node");
				const node = this.backend.document().byBackendId.get(binding.backendNodeId);
				if (node === void 0) throw new Error("Cordis node is no longer available");
				this.pushNodePath(node);
				return { nodeId: this.nodeId(node) };
			}
			case "DOM.performSearch": {
				const query = stringParam(params.query, "query").toLowerCase();
				const nodes = [...this.backend.document().byBackendId.values()].filter((node) => node.name !== "#document" && searchable(node).includes(query)).map((node) => this.nodeId(node));
				const searchId = `cordis-search-${String(this.nextSearchId++)}`;
				this.searches.set(searchId, nodes);
				return {
					searchId,
					resultCount: nodes.length
				};
			}
			case "DOM.getSearchResults": {
				const nodeIds = (this.searches.get(stringParam(params.searchId, "searchId")) ?? []).slice(nonNegativeInteger(params.fromIndex, "fromIndex"), nonNegativeInteger(params.toIndex, "toIndex"));
				for (const nodeId of nodeIds) {
					const backendId = this.backendByNodeId.get(nodeId);
					const node = backendId === void 0 ? void 0 : this.backend.document().byBackendId.get(backendId);
					if (node !== void 0) this.pushNodePath(node);
				}
				return { nodeIds };
			}
			case "DOM.discardSearchResults":
				this.searches.delete(stringParam(params.searchId, "searchId"));
				return {};
			case "DOM.setInspectedNode":
				this.fromNodeId(params.nodeId);
				return {};
			case "DOM.getBoxModel":
			case "DOM.getNodeForLocation": throw new Error("Cordis semantic nodes do not have browser layout geometry");
			default: throw new Error(`Method not found: ${method}`);
		}
	}
	async resolveNode(node, objectGroup) {
		const route = node.object;
		if (route === void 0) throw new Error("Structural Cordis node has no live Runtime object");
		if (route.connection.state === "disconnected") throw new Error("Cordis realm is disconnected");
		const expression = realmObjectExpression({
			registryId: route.snapshot.objectRegistryId,
			handle: route.node.objectHandle
		});
		const remote = await this.runtime.resolveObject(route.source, expression, objectGroup);
		const rawObjectId = remote.objectId;
		if (typeof rawObjectId !== "string") throw new Error("Cordis object lookup returned no RemoteObjectId");
		const objectId = cdpStringId(rawObjectId, "objectId");
		this.bindObjectId(objectId, node, objectGroup);
		return {
			...remote,
			...presentation(node)
		};
	}
	bindObjectId(objectId, node, group) {
		const source = node.object?.source;
		if (source === void 0) throw new Error("Structural Cordis node cannot bind a Runtime object");
		this.backendByObjectId.set(objectId, {
			backendNodeId: node.backendNodeId,
			sourceId: source.sourceId,
			generation: source.generation
		});
		if (group === void 0) return;
		let ids = this.objectIdsByGroup.get(group);
		if (ids === void 0) this.objectIdsByGroup.set(group, ids = /* @__PURE__ */ new Set());
		ids.add(objectId);
	}
	selectNode(params) {
		if (params.nodeId !== void 0) return this.fromNodeId(params.nodeId);
		if (params.backendNodeId !== void 0) {
			const id = cdpBackendNodeId(params.backendNodeId, "backendNodeId");
			const node = this.backend.document().byBackendId.get(id);
			if (node !== void 0) return node;
		}
		if (typeof params.objectId === "string") {
			const binding = this.backendByObjectId.get(cdpStringId(params.objectId, "objectId"));
			const node = binding === void 0 ? void 0 : this.backend.document().byBackendId.get(binding.backendNodeId);
			if (node !== void 0) return node;
		}
		throw new Error("Cordis node is not available");
	}
	fromNodeId(value) {
		const backendId = this.backendByNodeId.get(cdpNodeId(value, "nodeId"));
		const node = backendId === void 0 ? void 0 : this.backend.document().byBackendId.get(backendId);
		if (node === void 0) throw new Error("Cordis NodeId is not available in this document");
		return node;
	}
	serialize(node, parentId, remaining, delivery) {
		const nodeId = this.nodeId(node);
		const document = node.name === "#document";
		const withChildren = remaining > 0;
		if (delivery && withChildren) this.childrenSent.add(node.backendNodeId);
		return {
			nodeId,
			backendNodeId: node.backendNodeId,
			nodeType: document ? 9 : 1,
			nodeName: document ? "#document" : node.name.toUpperCase(),
			localName: document ? "" : node.name,
			nodeValue: "",
			...parentId === 0 ? {} : { parentId },
			...document ? {
				documentURL: "dsh://cordis",
				baseURL: "dsh://cordis"
			} : {},
			childNodeCount: node.children.length,
			...withChildren ? { children: node.children.map((child) => this.serialize(child, nodeId, remaining - 1, delivery)) } : {},
			attributes: node.attributes.flat()
		};
	}
	/** Deliver the not-yet-sent ancestor levels of one node so its NodeId attaches to the frontend tree. */
	pushNodePath(node) {
		const document = this.backend.document();
		const chain = [];
		let backendId = document.parentByBackendId.get(node.backendNodeId);
		while (backendId !== void 0) {
			const parent = document.byBackendId.get(backendId);
			if (parent === void 0) break;
			chain.unshift(parent);
			backendId = document.parentByBackendId.get(parent.backendNodeId);
		}
		for (const ancestor of chain) {
			if (this.childrenSent.has(ancestor.backendNodeId)) continue;
			const parentId = this.nodeId(ancestor);
			this.childrenSent.add(ancestor.backendNodeId);
			this.transport.send({
				method: "DOM.setChildNodes",
				params: {
					parentId,
					nodes: ancestor.children.map((child) => this.serialize(child, parentId, 0, true))
				}
			});
		}
	}
	forgetSubtree(node) {
		this.childrenSent.delete(node.backendNodeId);
		for (const child of node.children) this.forgetSubtree(child);
	}
	nodeId(node) {
		let nodeId = this.nodeIdByBackend.get(node.backendNodeId);
		if (nodeId === void 0) {
			nodeId = cdpNumericId(this.nextNodeId++, "nodeId");
			this.nodeIdByBackend.set(node.backendNodeId, nodeId);
			this.backendByNodeId.set(nodeId, node.backendNodeId);
		}
		return nodeId;
	}
	parentNodeId(node) {
		const parent = this.backend.document().parentByBackendId.get(node.backendNodeId);
		if (parent === void 0) return 0;
		const nodeValue = this.backend.document().byBackendId.get(parent);
		return nodeValue === void 0 ? 0 : this.nodeId(nodeValue);
	}
	resetDocument() {
		this.nodeIdByBackend.clear();
		this.backendByNodeId.clear();
		this.backendByObjectId.clear();
		this.objectIdsByGroup.clear();
		this.searches.clear();
		this.childrenSent.clear();
	}
	updateDocument(event) {
		if (event.type === "source-disconnected") {
			this.releaseSourceObjects(event.source);
			return;
		}
		if (this.enabled) for (const mutation of event.mutations) this.sendMutation(mutation);
		this.pruneDocumentState();
	}
	sendMutation(mutation) {
		switch (mutation.type) {
			case "document-updated":
				this.resetDocument();
				this.transport.send({
					method: "DOM.documentUpdated",
					params: {}
				});
				return;
			case "child-inserted": {
				const parentNodeId = this.nodeIdByBackend.get(mutation.parentBackendNodeId);
				if (parentNodeId === void 0) return;
				const previousNodeId = mutation.previousBackendNodeId === 0 ? 0 : this.nodeIdByBackend.get(mutation.previousBackendNodeId);
				if (previousNodeId === void 0) return;
				this.forgetSubtree(mutation.node);
				this.transport.send({
					method: "DOM.childNodeInserted",
					params: {
						parentNodeId,
						previousNodeId,
						node: this.serialize(mutation.node, parentNodeId, 0, true)
					}
				});
				return;
			}
			case "child-removed": {
				const parentNodeId = this.nodeIdByBackend.get(mutation.parentBackendNodeId);
				const nodeId = this.nodeIdByBackend.get(mutation.node.backendNodeId);
				this.forgetSubtree(mutation.node);
				if (parentNodeId === void 0 || nodeId === void 0) return;
				this.transport.send({
					method: "DOM.childNodeRemoved",
					params: {
						parentNodeId,
						nodeId
					}
				});
				return;
			}
			case "children-replaced": {
				const parentNodeId = this.nodeIdByBackend.get(mutation.parentBackendNodeId);
				if (parentNodeId === void 0) return;
				for (const child of mutation.children) this.forgetSubtree(child);
				this.childrenSent.add(mutation.parentBackendNodeId);
				this.transport.send({
					method: "DOM.setChildNodes",
					params: {
						parentId: parentNodeId,
						nodes: mutation.children.map((child) => this.serialize(child, parentNodeId, 0, true))
					}
				});
				return;
			}
			case "attribute-modified": {
				const nodeId = this.nodeIdByBackend.get(mutation.backendNodeId);
				if (nodeId !== void 0) this.transport.send({
					method: "DOM.attributeModified",
					params: {
						nodeId,
						name: mutation.name,
						value: mutation.value
					}
				});
				return;
			}
			case "attribute-removed": {
				const nodeId = this.nodeIdByBackend.get(mutation.backendNodeId);
				if (nodeId !== void 0) this.transport.send({
					method: "DOM.attributeRemoved",
					params: {
						nodeId,
						name: mutation.name
					}
				});
				return;
			}
			default: return assertNever$4(mutation);
		}
	}
	pruneDocumentState() {
		const document = this.backend.document();
		for (const [backendNodeId, nodeId] of this.nodeIdByBackend) {
			if (document.byBackendId.has(backendNodeId)) continue;
			this.nodeIdByBackend.delete(backendNodeId);
			this.backendByNodeId.delete(nodeId);
		}
		for (const backendNodeId of this.childrenSent) if (!document.byBackendId.has(backendNodeId)) this.childrenSent.delete(backendNodeId);
		for (const [objectId, binding] of this.backendByObjectId) {
			const source = document.byBackendId.get(binding.backendNodeId)?.object?.source;
			if (source?.sourceId === binding.sourceId && source.generation === binding.generation) continue;
			this.backendByObjectId.delete(objectId);
			for (const [group, objectIds] of this.objectIdsByGroup) {
				objectIds.delete(objectId);
				if (objectIds.size === 0) this.objectIdsByGroup.delete(group);
			}
		}
		for (const [searchId, nodeIds] of this.searches) this.searches.set(searchId, nodeIds.filter((nodeId) => {
			const backendNodeId = this.backendByNodeId.get(nodeId);
			return backendNodeId !== void 0 && document.byBackendId.has(backendNodeId);
		}));
	}
	releaseSourceObjects(source) {
		for (const [objectId, binding] of this.backendByObjectId) {
			if (binding.sourceId !== source.sourceId || binding.generation !== source.generation) continue;
			this.backendByObjectId.delete(objectId);
			for (const [group, objectIds] of this.objectIdsByGroup) {
				objectIds.delete(objectId);
				if (objectIds.size === 0) this.objectIdsByGroup.delete(group);
			}
		}
	}
	respond(request, operation) {
		respondToCdpRequest(this.transport, request, operation);
	}
};
function outerHtml(node, indent = "") {
	const attributes = node.attributes.map(([name, value]) => ` ${name}=${JSON.stringify(value)}`).join("");
	if (node.children.length === 0) return `${indent}<${node.name}${attributes} />`;
	const children = node.children.map((child) => outerHtml(child, `${indent}  `)).join("\n");
	return `${indent}<${node.name}${attributes}>\n${children}\n${indent}</${node.name}>`;
}
function searchable(node) {
	return `${node.name} ${node.description} ${node.attributes.flat().join(" ")}`.toLowerCase();
}
function numberParam(value, name) {
	if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer`);
	return value;
}
function depthParam(value, fallback) {
	if (value === void 0) return fallback;
	if (value === -1) return Number.POSITIVE_INFINITY;
	if (!Number.isSafeInteger(value) || value < 1) throw new Error("depth must be -1 or a positive integer");
	return value;
}
function cdpNodeId(value, name) {
	if (!Number.isSafeInteger(value)) throw new Error(`${name} must be an integer`);
	return cdpNumericId(value, name);
}
function cdpBackendNodeId(value, name) {
	if (!Number.isSafeInteger(value)) throw new Error(`${name} must be an integer`);
	return cdpNumericId(value, name);
}
function nonNegativeInteger(value, name) {
	return numberParam(value, name);
}
function stringParam(value, name) {
	if (typeof value !== "string") throw new Error(`${name} must be a string`);
	return value;
}
function optionalString(value) {
	if (value === void 0) return void 0;
	return stringParam(value, "objectGroup");
}
function presentation(node) {
	return {
		subtype: "node",
		className: node.object?.node.kind === "fiber" ? "Fiber" : "Context",
		description: node.description
	};
}
function assertNever$4(value) {
	throw new Error(`Unexpected Cordis DOM mutation: ${JSON.stringify(value)}`);
}
//#endregion
//#region lib/types/shared/cordis/object-reference.js
/** Opaque references to live objects retained inside an observation source realm. */
/**
* Decode one source-local live-object reference.
* @param value - Untrusted wire value.
* @returns The validated opaque reference.
*/
function parseInspectorObjectReference(value) {
	const record = exactObject(value, ["registryId", "handle"], "object reference");
	return {
		registryId: wireId(record.registryId, "registryId"),
		handle: wireId(record.handle, "handle")
	};
}
//#endregion
//#region lib/types/shared/bridge/messages/runtime/value-codec.js
/** Exact wire decoder for Client Runtime results and RemoteObject data. */
/**
* Parse and rebuild one successful Client Runtime result.
* @param value - Untrusted result value.
* @returns The validated result union member.
*/
function parseClientRuntimeResult(value) {
	if (!isPlainObject(value) || typeof value.op !== "string") throw new Error("inspector protocol: Client Runtime result must have an op");
	switch (value.op) {
		case "evaluate":
		case "call-function":
		case "await-promise":
			exactKeys(value, ["op", "completion"], `${value.op} result`);
			return {
				op: value.op,
				completion: parseCompletion(value.completion)
			};
		case "get-properties": {
			exactKeys(value, [
				"op",
				"properties",
				"internalProperties",
				"exceptionDetails"
			], "get-properties result");
			if (!Array.isArray(value.properties)) throw new Error("inspector protocol: properties must be an array");
			const internal = value.internalProperties;
			if (internal !== void 0 && !Array.isArray(internal)) throw new Error("inspector protocol: internalProperties must be an array");
			return {
				op: "get-properties",
				properties: value.properties.map(parsePropertyDescriptor),
				...internal === void 0 ? {} : { internalProperties: internal.map(parseInternalPropertyDescriptor) },
				...value.exceptionDetails === void 0 ? {} : { exceptionDetails: parseClientRuntimeExceptionDetails(value.exceptionDetails) }
			};
		}
		case "release-object":
		case "release-object-group":
			exactKeys(value, ["op"], `${value.op} result`);
			return { op: value.op };
		case "global-lexical-scope-names":
			exactKeys(value, ["op", "names"], "global-lexical-scope-names result");
			if (!Array.isArray(value.names) || !value.names.every((name) => typeof name === "string")) throw new Error("inspector protocol: lexical scope names must be strings");
			return {
				op: "global-lexical-scope-names",
				names: value.names
			};
		default: throw new Error(`inspector protocol: unknown Client Runtime result ${JSON.stringify(value.op)}`);
	}
}
function parseCompletion(value) {
	const record = exactObject(value, ["result", "exceptionDetails"], "Client Runtime completion");
	return {
		result: parseClientRuntimeRemoteObject(record.result),
		...record.exceptionDetails === void 0 ? {} : { exceptionDetails: parseClientRuntimeExceptionDetails(record.exceptionDetails) }
	};
}
/**
* Decode one Client Runtime object carrying an optional session-local handle.
* @param value - Untrusted wire value.
* @returns The validated realm-neutral object value.
*/
function parseClientRuntimeRemoteObject(value) {
	const record = exactObject(value, [
		"descriptor",
		"object",
		"semanticReference"
	], "Client Runtime object");
	const descriptor = parseRemoteObjectDescriptor(record.descriptor);
	const object = record.object === void 0 ? void 0 : exactObject(record.object, ["handle"], "Client Runtime object reference");
	const remote = {
		descriptor,
		...object === void 0 ? {} : { object: { handle: wireId(object.handle, "handle") } },
		...record.semanticReference === void 0 ? {} : { semanticReference: parseInspectorObjectReference(record.semanticReference) }
	};
	validateRemoteObject(remote);
	return remote;
}
function parseRemoteObjectDescriptor(value) {
	const record = exactObject(value, [
		"type",
		"subtype",
		"className",
		"value",
		"unserializableValue",
		"description",
		"preview"
	], "Runtime object descriptor");
	if (!REMOTE_TYPES.has(record.type)) throw new Error("inspector protocol: invalid Client RemoteObject type");
	if (record.subtype !== void 0 && !REMOTE_SUBTYPES.has(record.subtype)) throw new Error("inspector protocol: invalid Client RemoteObject subtype");
	if (record.value !== void 0 && !isJsonValue(record.value)) throw new Error("inspector protocol: Client RemoteObject value must be JSON");
	return {
		type: record.type,
		...record.subtype === void 0 ? {} : { subtype: record.subtype },
		...optionalString$1(record, "className"),
		...record.value === void 0 ? {} : { value: record.value },
		...optionalString$1(record, "unserializableValue"),
		...optionalString$1(record, "description"),
		...record.preview === void 0 ? {} : { preview: parseObjectPreview(record.preview) }
	};
}
function parseObjectPreview(value) {
	const record = exactObject(value, [
		"type",
		"subtype",
		"description",
		"overflow",
		"properties"
	], "object preview");
	if (!REMOTE_TYPES.has(record.type) || record.subtype !== void 0 && !REMOTE_SUBTYPES.has(record.subtype) || typeof record.overflow !== "boolean" || !Array.isArray(record.properties)) throw new Error("inspector protocol: invalid object preview");
	return {
		type: record.type,
		...record.subtype === void 0 ? {} : { subtype: record.subtype },
		...optionalString$1(record, "description"),
		overflow: record.overflow,
		properties: record.properties.map(parsePropertyPreview)
	};
}
function parsePropertyPreview(value) {
	const record = exactObject(value, [
		"name",
		"type",
		"value",
		"valuePreview",
		"subtype"
	], "property preview");
	if (typeof record.name !== "string" || record.type !== "accessor" && !REMOTE_TYPES.has(record.type) || record.subtype !== void 0 && !REMOTE_SUBTYPES.has(record.subtype)) throw new Error("inspector protocol: invalid property preview");
	return {
		name: record.name,
		type: record.type,
		...optionalString$1(record, "value"),
		...record.valuePreview === void 0 ? {} : { valuePreview: parseObjectPreview(record.valuePreview) },
		...record.subtype === void 0 ? {} : { subtype: record.subtype }
	};
}
function parsePropertyDescriptor(value) {
	const record = exactObject(value, [
		"name",
		"value",
		"writable",
		"get",
		"set",
		"configurable",
		"enumerable",
		"wasThrown",
		"isOwn",
		"symbol"
	], "property descriptor");
	if (typeof record.name !== "string" || typeof record.configurable !== "boolean" || typeof record.enumerable !== "boolean") throw new Error("inspector protocol: invalid property descriptor");
	const dataDescriptor = record.value !== void 0 || record.writable !== void 0;
	const accessorDescriptor = record.get !== void 0 || record.set !== void 0;
	if (dataDescriptor && accessorDescriptor) throw new Error("inspector protocol: property descriptor mixes data and accessor fields");
	return {
		name: record.name,
		...record.value === void 0 ? {} : { value: parseClientRuntimeRemoteObject(record.value) },
		...optionalBoolean(record, "writable"),
		...record.get === void 0 ? {} : { get: parseClientRuntimeRemoteObject(record.get) },
		...record.set === void 0 ? {} : { set: parseClientRuntimeRemoteObject(record.set) },
		configurable: record.configurable,
		enumerable: record.enumerable,
		...optionalBoolean(record, "wasThrown"),
		...optionalBoolean(record, "isOwn"),
		...record.symbol === void 0 ? {} : { symbol: parseClientRuntimeRemoteObject(record.symbol) }
	};
}
function parseInternalPropertyDescriptor(value) {
	const record = exactObject(value, ["name", "value"], "internal property descriptor");
	if (typeof record.name !== "string") throw new Error("inspector protocol: invalid internal property descriptor");
	return {
		name: record.name,
		...record.value === void 0 ? {} : { value: parseClientRuntimeRemoteObject(record.value) }
	};
}
/**
* Decode Client exception details used by command results and events.
* @param value - Untrusted wire value.
* @returns Validated exception details.
*/
function parseClientRuntimeExceptionDetails(value) {
	const record = exactObject(value, [
		"text",
		"lineNumber",
		"columnNumber",
		"url",
		"stackTrace",
		"exception"
	], "exception details");
	if (typeof record.text !== "string" || !Number.isSafeInteger(record.lineNumber) || record.lineNumber < 0 || !Number.isSafeInteger(record.columnNumber) || record.columnNumber < 0) throw new Error("inspector protocol: invalid exception details");
	return {
		text: record.text,
		lineNumber: record.lineNumber,
		columnNumber: record.columnNumber,
		...optionalString$1(record, "url"),
		...record.stackTrace === void 0 ? {} : { stackTrace: parseClientRuntimeStackTrace(record.stackTrace) },
		...record.exception === void 0 ? {} : { exception: parseClientRuntimeRemoteObject(record.exception) }
	};
}
/**
* Decode a stack trace carried by a Client Runtime or Console frame.
* @param value - Untrusted stack-trace value.
* @returns The validated realm-neutral stack trace.
*/
function parseClientRuntimeStackTrace(value) {
	const record = exactObject(value, [
		"description",
		"callFrames",
		"parent"
	], "stack trace");
	if (!Array.isArray(record.callFrames)) throw new Error("inspector protocol: stack callFrames must be an array");
	return {
		...optionalString$1(record, "description"),
		callFrames: record.callFrames.map(parseCallFrame),
		...record.parent === void 0 ? {} : { parent: parseClientRuntimeStackTrace(record.parent) }
	};
}
function parseCallFrame(value) {
	const record = exactObject(value, [
		"functionName",
		"scriptKey",
		"url",
		"lineNumber",
		"columnNumber"
	], "stack call frame");
	if (typeof record.functionName !== "string" || typeof record.url !== "string" || !Number.isSafeInteger(record.lineNumber) || !Number.isSafeInteger(record.columnNumber)) throw new Error("inspector protocol: invalid stack call frame");
	return {
		functionName: record.functionName,
		...record.scriptKey === void 0 ? {} : { scriptKey: wireId(record.scriptKey, "scriptKey") },
		url: record.url,
		lineNumber: record.lineNumber,
		columnNumber: record.columnNumber
	};
}
const REMOTE_TYPES = new Set([
	"object",
	"function",
	"undefined",
	"string",
	"number",
	"boolean",
	"symbol",
	"bigint"
]);
const REMOTE_SUBTYPES = new Set([
	"array",
	"null",
	"node",
	"regexp",
	"date",
	"map",
	"set",
	"weakmap",
	"weakset",
	"iterator",
	"generator",
	"error",
	"proxy",
	"promise",
	"typedarray",
	"arraybuffer",
	"dataview",
	"webassemblymemory",
	"wasmvalue"
]);
function validateRemoteObject(value) {
	if (value.semanticReference !== void 0 && value.object === void 0) throw new Error("inspector protocol: semanticReference requires a retained Client object");
	const descriptor = value.descriptor;
	if (descriptor.subtype !== void 0 && descriptor.type !== "object") throw new Error("inspector protocol: only object RemoteObjects may have a subtype");
	if (descriptor.preview !== void 0 && descriptor.type !== "object") throw new Error("inspector protocol: only object RemoteObjects may have a preview");
	const hasValue = descriptor.value !== void 0;
	const hasUnserializableValue = descriptor.unserializableValue !== void 0;
	const hasObject = value.object !== void 0;
	switch (descriptor.type) {
		case "undefined":
			requireRepresentations(descriptor.type, hasValue, hasUnserializableValue, hasObject, false, false, false);
			return;
		case "string":
			requireRepresentations(descriptor.type, typeof descriptor.value === "string", hasUnserializableValue, hasObject, true, false, false);
			return;
		case "boolean":
			requireRepresentations(descriptor.type, typeof descriptor.value === "boolean", hasUnserializableValue, hasObject, true, false, false);
			return;
		case "number": {
			const finite = typeof descriptor.value === "number" && Number.isFinite(descriptor.value) && !Object.is(descriptor.value, -0);
			const special = descriptor.unserializableValue === "NaN" || descriptor.unserializableValue === "Infinity" || descriptor.unserializableValue === "-Infinity" || descriptor.unserializableValue === "-0";
			if (hasObject || finite === special) throw new Error("inspector protocol: invalid number RemoteObject representation");
			return;
		}
		case "bigint":
			if (hasValue || hasObject || !/^-?(?:0|[1-9]\d*)n$/u.test(descriptor.unserializableValue ?? "")) throw new Error("inspector protocol: invalid bigint RemoteObject representation");
			return;
		case "symbol":
		case "function":
			requireRepresentations(descriptor.type, hasValue, hasUnserializableValue, hasObject, false, false, true);
			return;
		case "object":
			if (descriptor.subtype === "null") {
				if (descriptor.value !== null || hasObject || hasUnserializableValue) throw new Error("inspector protocol: invalid null RemoteObject representation");
				return;
			}
			if (hasUnserializableValue || hasValue === hasObject) throw new Error("inspector protocol: object RemoteObject needs exactly one value or backend object");
	}
}
function requireRepresentations(type, hasValue, hasUnserializableValue, hasObject, expectedValue, expectedUnserializableValue, expectedObject) {
	if (hasValue !== expectedValue || hasUnserializableValue !== expectedUnserializableValue || hasObject !== expectedObject) throw new Error(`inspector protocol: invalid ${type} RemoteObject representation`);
}
//#endregion
//#region lib/types/shared/bridge/messages/runtime/console-frames.js
/** Typed transport for Client Console sessions and events. */
/**
* Parse the marker capability for Client Console forwarding.
* @param value - Untrusted capability declaration.
* @returns The validated marker capability.
*/
function parseClientConsoleCapability(value) {
	if (exactObject(value, ["type"], "Client Console capability").type !== "client-console") throw new Error("inspector protocol: invalid Client Console capability");
	return { type: "client-console" };
}
/**
* Parse one Client-to-Worker Console event.
* @param value - Untrusted decoded frame.
* @returns A validated Console event frame.
*/
function parseClientConsoleEventFrame(value) {
	exactKeys(value, [
		"v",
		"t",
		"sourceId",
		"generation",
		"sessionId",
		"event"
	], "Client Console event frame");
	if (value.v !== 0 || value.t !== "client-console/event") throw new Error("inspector protocol: invalid Client Console event envelope");
	return {
		v: 0,
		t: "client-console/event",
		sourceId: wireId(value.sourceId, "sourceId"),
		generation: wireId(value.generation, "generation"),
		sessionId: wireId(value.sessionId, "sessionId"),
		event: parseEvent(value.event)
	};
}
function parseEvent(value) {
	if (!isPlainObject(value) || value.type !== "console-api" && value.type !== "exception") throw new Error("inspector protocol: invalid Client Console event");
	if (value.type === "console-api") {
		exactKeys(value, ["type", "event"], "Client Console API event");
		const event = exactObject(value.event, [
			"type",
			"arguments",
			"timestamp",
			"contextId",
			"stackTrace"
		], "Console API event");
		if (!CONSOLE_TYPES$1.has(event.type) || !Array.isArray(event.arguments) || typeof event.timestamp !== "number" || !Number.isFinite(event.timestamp)) throw new Error("inspector protocol: invalid Console API event");
		return {
			type: "console-api",
			event: {
				type: event.type,
				arguments: event.arguments.map(parseClientRuntimeRemoteObject),
				timestamp: event.timestamp,
				...event.contextId === void 0 ? {} : { contextId: integer(event.contextId, "contextId") },
				...event.stackTrace === void 0 ? {} : { stackTrace: parseClientRuntimeStackTrace(event.stackTrace) }
			}
		};
	}
	exactKeys(value, ["type", "event"], "Client exception event");
	const event = exactObject(value.event, [
		"timestamp",
		"contextId",
		"details"
	], "Client exception event payload");
	if (typeof event.timestamp !== "number" || !Number.isFinite(event.timestamp)) throw new Error("inspector protocol: invalid Client exception timestamp");
	return {
		type: "exception",
		event: {
			timestamp: event.timestamp,
			...event.contextId === void 0 ? {} : { contextId: integer(event.contextId, "contextId") },
			details: parseClientRuntimeExceptionDetails(event.details)
		}
	};
}
function integer(value, label) {
	if (!Number.isSafeInteger(value)) throw new Error(`inspector protocol: ${label} must be an integer`);
	return value;
}
const CONSOLE_TYPES$1 = new Set([
	"log",
	"debug",
	"info",
	"error",
	"warning",
	"dir",
	"dirxml",
	"table",
	"trace",
	"clear",
	"startGroup",
	"startGroupCollapsed",
	"endGroup",
	"assert",
	"profile",
	"profileEnd",
	"count",
	"timeEnd"
]);
//#endregion
//#region lib/types/shared/bridge/messages/runtime/frames.js
/** Versioned envelopes for Worker-to-Client Runtime operations. */
/**
* Parse and rebuild a Client Runtime capability.
* @param value - Untrusted capability declaration.
* @returns The validated capability.
*/
function parseClientRuntimeCapability(value) {
	const record = exactObject(value, ["type", "origin"], "Client Runtime capability");
	if (record.type !== "client-runtime" || typeof record.origin !== "string" || record.origin.length > 2048) throw new Error("inspector protocol: invalid Client Runtime capability");
	return {
		type: "client-runtime",
		origin: record.origin
	};
}
/**
* Parse and rebuild one Client-to-Worker Runtime response.
* @param value - Untrusted response frame.
* @returns The validated response frame.
*/
function parseClientRuntimeResponseFrame(value) {
	exactKeys(value, [
		"v",
		"t",
		"sourceId",
		"generation",
		"sessionId",
		"requestId",
		"outcome"
	], "Client Runtime response");
	if (value.v !== 0 || value.t !== "client-runtime/response") throw new Error("inspector protocol: invalid Client Runtime response envelope");
	return {
		v: 0,
		t: "client-runtime/response",
		sourceId: wireId(value.sourceId, "sourceId"),
		generation: wireId(value.generation, "generation"),
		sessionId: wireId(value.sessionId, "sessionId"),
		requestId: wireId(value.requestId, "requestId"),
		outcome: parseOutcome$1(value.outcome)
	};
}
function parseOutcome$1(value) {
	if (!isPlainObject(value) || typeof value.ok !== "boolean") throw new Error("inspector protocol: invalid Client Runtime outcome");
	if (value.ok) {
		exactKeys(value, ["ok", "result"], "successful Client Runtime outcome");
		return {
			ok: true,
			result: parseClientRuntimeResult(value.result)
		};
	}
	exactKeys(value, ["ok", "error"], "failed Client Runtime outcome");
	const error = exactObject(value.error, ["code", "message"], "Client Runtime error");
	if (!ERROR_CODES$1.has(error.code) || typeof error.message !== "string") throw new Error("inspector protocol: invalid Client Runtime error");
	return {
		ok: false,
		error: {
			code: error.code,
			message: error.message
		}
	};
}
const ERROR_CODES$1 = new Set([
	"invalid-request",
	"object-not-found",
	"unsupported",
	"timeout",
	"result-too-large",
	"internal-error"
]);
//#endregion
//#region lib/types/shared/bridge/messages/sources/codec.js
/** Exact decoders for Client source catalog operations and values. */
/**
* Parse one successful Client source result.
* @param value - Untrusted decoded result.
* @returns The validated result.
*/
function parseClientSourceResult(value) {
	if (!isPlainObject(value) || typeof value.op !== "string") throw new Error("inspector protocol: Client source result must have an op");
	if (value.op === "list-scripts") {
		exactKeys(value, ["op", "scripts"], "Client source list result");
		if (!Array.isArray(value.scripts)) throw new Error("inspector protocol: Client source scripts must be an array");
		return {
			op: "list-scripts",
			scripts: value.scripts.map(parseScript)
		};
	}
	if (value.op !== "get-content-chunk") throw new Error(`inspector protocol: unknown Client source result ${JSON.stringify(value.op)}`);
	if (value.available === false) {
		exactKeys(value, [
			"op",
			"scriptKey",
			"content",
			"available"
		], "unavailable Client source chunk");
		return {
			op: "get-content-chunk",
			scriptKey: wireId(value.scriptKey, "scriptKey"),
			content: contentKind(value.content),
			available: false
		};
	}
	exactKeys(value, [
		"op",
		"scriptKey",
		"content",
		"available",
		"offset",
		"nextOffset",
		"data",
		"eof"
	], "Client source chunk result");
	if (value.available !== true || typeof value.data !== "string" || typeof value.eof !== "boolean") throw new Error("inspector protocol: invalid Client source chunk result");
	const offset = natural$1(value.offset, "offset", true);
	const nextOffset = natural$1(value.nextOffset, "nextOffset", true);
	if (nextOffset < offset || !BASE64.test(value.data)) throw new Error("inspector protocol: invalid Client source chunk data");
	return {
		op: "get-content-chunk",
		scriptKey: wireId(value.scriptKey, "scriptKey"),
		content: contentKind(value.content),
		available: true,
		offset,
		nextOffset,
		data: value.data,
		eof: value.eof
	};
}
function parseScript(value) {
	const record = exactObject(value, [
		"scriptKey",
		"url",
		"hash",
		"buildId",
		"sourceMapUrl",
		"startLine",
		"startColumn",
		"endLine",
		"endColumn",
		"isModule",
		"length"
	], "Client script descriptor");
	if (typeof record.url !== "string" || record.url.length > 8192 || typeof record.hash !== "string") throw new Error("inspector protocol: invalid Client script identity");
	return {
		scriptKey: wireId(record.scriptKey, "scriptKey"),
		url: record.url,
		hash: record.hash,
		...optionalString$1(record, "buildId"),
		...optionalString$1(record, "sourceMapUrl"),
		startLine: natural$1(record.startLine, "startLine", true),
		startColumn: natural$1(record.startColumn, "startColumn", true),
		endLine: natural$1(record.endLine, "endLine", true),
		endColumn: natural$1(record.endColumn, "endColumn", true),
		...optionalBoolean(record, "isModule"),
		...record.length === void 0 ? {} : { length: natural$1(record.length, "length", true) }
	};
}
function contentKind(value) {
	if (value !== "source" && value !== "source-map") throw new Error("inspector protocol: invalid Client source content kind");
	return value;
}
function natural$1(value, label, zero) {
	if (!Number.isSafeInteger(value) || value < (zero ? 0 : 1)) throw new Error(`inspector protocol: ${label} must be ${zero ? "a non-negative" : "a positive"} integer`);
	return value;
}
const BASE64 = /^(?:[A-Za-z\d+/]{4})*(?:[A-Za-z\d+/]{2}==|[A-Za-z\d+/]{3}=)?$/u;
//#endregion
//#region lib/types/shared/bridge/messages/sources/frames.js
/** Versioned envelopes for Client source catalog operations. */
/**
* Parse the marker capability for a Client source catalog.
* @param value - Untrusted capability declaration.
* @returns The validated marker capability.
*/
function parseClientSourcesCapability(value) {
	if (exactObject(value, ["type"], "Client Sources capability").type !== "client-sources") throw new Error("inspector protocol: invalid Client Sources capability");
	return { type: "client-sources" };
}
/**
* Parse one Client-to-Worker source response.
* @param value - Untrusted decoded response.
* @returns The validated response frame.
*/
function parseClientSourceResponseFrame(value) {
	exactKeys(value, [
		"v",
		"t",
		"sourceId",
		"generation",
		"sessionId",
		"requestId",
		"outcome"
	], "Client source response");
	if (value.v !== 0 || value.t !== "client-sources/response") throw new Error("inspector protocol: invalid Client source response envelope");
	return {
		v: 0,
		t: "client-sources/response",
		sourceId: wireId(value.sourceId, "sourceId"),
		generation: wireId(value.generation, "generation"),
		sessionId: wireId(value.sessionId, "sessionId"),
		requestId: wireId(value.requestId, "requestId"),
		outcome: parseOutcome(value.outcome)
	};
}
function parseOutcome(value) {
	if (!isPlainObject(value) || typeof value.ok !== "boolean") throw new Error("inspector protocol: invalid Client source outcome");
	if (value.ok) {
		exactKeys(value, ["ok", "result"], "successful Client source outcome");
		return {
			ok: true,
			result: parseClientSourceResult(value.result)
		};
	}
	exactKeys(value, ["ok", "error"], "failed Client source outcome");
	const error = exactObject(value.error, ["code", "message"], "Client source error");
	if (!ERROR_CODES.has(error.code) || typeof error.message !== "string") throw new Error("inspector protocol: invalid Client source error");
	return {
		ok: false,
		error: {
			code: error.code,
			message: error.message
		}
	};
}
const ERROR_CODES = new Set([
	"invalid-request",
	"script-not-found",
	"load-failed",
	"result-too-large",
	"internal-error"
]);
//#endregion
//#region lib/types/shared/bridge/messages/observation.js
/** Versioned source lifecycle, observation, and extension frames shared by both carriers. */
/**
* Parse and rebuild one source frame received at a process or network boundary.
* @param value - Untrusted decoded wire value.
* @param maxRecords - Maximum records admitted in one frame.
* @returns The validated source-to-Worker frame.
*/
function parseSourceFrame(value, maxRecords) {
	if (!isJsonValue(value) || !isPlainObject(value)) throw new Error("inspector protocol: source frame must be a lossless JSON object");
	if (value.v !== 0) throw new Error(`inspector protocol: unsupported version ${JSON.stringify(value.v)}`);
	switch (value.t) {
		case "source/open": return parseOpen(value);
		case "source/replace": return parseRecordsFrame(value, maxRecords, true);
		case "source/append": return parseRecordsFrame(value, maxRecords, false);
		case "source/close":
			exactKeys(value, [
				"v",
				"t",
				"sourceId",
				"generation"
			], "source/close frame");
			return {
				v: 0,
				t: "source/close",
				sourceId: sourceId(value.sourceId),
				generation: generation(value.generation)
			};
		case "client-runtime/response": return parseClientRuntimeResponseFrame(value);
		case "client-console/event": return parseClientConsoleEventFrame(value);
		case "client-sources/response": return parseClientSourceResponseFrame(value);
		default: throw new Error(`inspector protocol: unknown source frame ${JSON.stringify(value.t)}`);
	}
}
function parseOpen(value) {
	exactKeys(value, [
		"v",
		"t",
		"source",
		"topics"
	], "source/open frame");
	if (!isPlainObject(value.source) || !Array.isArray(value.topics)) throw new Error("inspector protocol: source/open needs source and topics");
	const source = value.source;
	exactKeys(source, [
		"sourceId",
		"generation",
		"kind",
		"label",
		"timeOriginMs",
		"capabilities"
	], "source descriptor");
	const kind = source.kind;
	if (kind !== "host" && kind !== "client") throw new Error("inspector protocol: invalid source kind");
	if (typeof source.label !== "string" || source.label.length === 0 || source.label.length > 256) throw new Error("inspector protocol: source label must contain 1 to 256 characters");
	if (typeof source.timeOriginMs !== "number" || !Number.isFinite(source.timeOriginMs)) throw new Error("inspector protocol: source timeOriginMs must be finite");
	if (!Array.isArray(source.capabilities)) throw new Error("inspector protocol: source capabilities must be an array");
	const capabilities = source.capabilities.map(parseSourceCapability);
	const capabilityTypes = /* @__PURE__ */ new Set();
	for (const capability of capabilities) {
		if (capabilityTypes.has(capability.type)) throw new Error(`inspector protocol: source declares ${capability.type} more than once`);
		capabilityTypes.add(capability.type);
	}
	if (kind !== "client" && capabilities.length > 0) throw new Error("inspector protocol: Host sources cannot declare Client capabilities");
	const topics = value.topics.map((topic) => {
		if (typeof topic !== "string" || topic.length === 0 || topic.length > 128) throw new Error("inspector protocol: every source topic must contain 1 to 128 characters");
		return topic;
	});
	return {
		v: 0,
		t: "source/open",
		source: {
			sourceId: sourceId(source.sourceId),
			generation: generation(source.generation),
			kind,
			label: source.label,
			timeOriginMs: source.timeOriginMs,
			capabilities
		},
		topics
	};
}
function parseSourceCapability(value) {
	if (!isPlainObject(value) || typeof value.type !== "string") throw new Error("inspector protocol: source capability must have a type");
	switch (value.type) {
		case "client-runtime": return parseClientRuntimeCapability(value);
		case "client-console": return parseClientConsoleCapability(value);
		case "client-sources": return parseClientSourcesCapability(value);
		default: throw new Error(`inspector protocol: unknown source capability ${JSON.stringify(value.type)}`);
	}
}
function parseRecordsFrame(value, maxRecords, replace) {
	exactKeys(value, replace ? [
		"v",
		"t",
		"sourceId",
		"generation",
		"nextSequence",
		"records"
	] : [
		"v",
		"t",
		"sourceId",
		"generation",
		"firstSequence",
		"droppedBefore",
		"records"
	], replace ? "source/replace frame" : "source/append frame");
	if (!Array.isArray(value.records) || value.records.length > maxRecords) throw new Error(`inspector protocol: source batch exceeds ${String(maxRecords)} records`);
	const records = value.records.map(parseRecord);
	const common = {
		v: 0,
		sourceId: sourceId(value.sourceId),
		generation: generation(value.generation),
		records
	};
	if (replace) return {
		...common,
		t: "source/replace",
		nextSequence: natural(value.nextSequence, "nextSequence")
	};
	return {
		...common,
		t: "source/append",
		firstSequence: natural(value.firstSequence, "firstSequence"),
		droppedBefore: natural(value.droppedBefore, "droppedBefore")
	};
}
function parseRecord(value) {
	if (!isPlainObject(value) || typeof value.monotonicMs !== "number" || !Number.isFinite(value.monotonicMs) || typeof value.topic !== "string" || value.topic.length === 0 || value.topic.length > 128 || !isJsonValue(value.payload)) throw new Error("inspector protocol: invalid observation record");
	exactKeys(value, [
		"monotonicMs",
		"topic",
		"payload"
	], "observation record");
	return {
		monotonicMs: value.monotonicMs,
		topic: value.topic,
		payload: value.payload
	};
}
function sourceId(value) {
	if (typeof value !== "string") throw new Error("inspector protocol: sourceId must be a string");
	return inspectorId(value, "sourceId");
}
function generation(value) {
	if (typeof value !== "string") throw new Error("inspector protocol: generation must be a string");
	return inspectorId(value, "generation");
}
function natural(value, label) {
	if (!Number.isSafeInteger(value) || value < 0) throw new Error(`inspector protocol: ${label} must be a non-negative safe integer`);
	return value;
}
//#endregion
//#region lib/types/worker/bridge/session.js
/** Shared cleanup delivery for Worker-owned Client sessions. */
/**
* Send cleanup to an active Client generation when its transport is still usable.
* @param sources - Worker source registry owning the transport.
* @param source - Generation whose session closed.
* @param frame - Typed Runtime or source-catalog cleanup frame.
*/
function sendClientSessionClosed(sources, source, frame) {
	try {
		sources.send(source, frame);
	} catch {}
}
//#endregion
//#region lib/types/worker/bridge/runtime-rpc.js
/** Worker-owned routing between synthetic Client contexts and source generations. */
/** Error returned deliberately by the Client Runtime executor. */
var ClientRuntimeRemoteError = class extends Error {
	code;
	constructor(code, message) {
		super(message);
		this.code = code;
	}
};
/** Runtime context registry and correlated Worker-to-Client request owner. */
var ClientRuntimeRouter = class {
	sources;
	timeoutMs;
	targetsBySource = /* @__PURE__ */ new Map();
	pending = /* @__PURE__ */ new Map();
	consoleSubscriptions = /* @__PURE__ */ new Set();
	listeners = /* @__PURE__ */ new Set();
	unsubscribeSources;
	nextContextId = -1;
	closed = false;
	constructor(sources, timeoutMs) {
		this.sources = sources;
		this.timeoutMs = timeoutMs;
		this.unsubscribeSources = sources.subscribeEvents((event) => {
			this.receiveSourceEvent(event);
		});
	}
	/**
	* Snapshot all active Client execution contexts.
	* @returns Active targets in admission order.
	*/
	targets() {
		return [...this.targetsBySource.values()];
	}
	/**
	* Resolve the Client target for one active source generation.
	* @param source - Source identity stored with a semantic node.
	* @returns Its active Runtime target, when the generation still matches.
	*/
	bySource(source) {
		const target = this.targetsBySource.get(source.sourceId);
		return target?.source.generation === source.generation ? target : void 0;
	}
	/**
	* Subscribe to synthetic execution-context lifecycle.
	* @param listener - Context lifecycle observer.
	* @returns A disposer that removes the observer.
	*/
	subscribe(listener) {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}
	/**
	* Enable Console events for one Client realm and DevTools session.
	* @param target - Active Client realm.
	* @param sessionId - DevTools Runtime session retaining event arguments.
	* @param listener - Consumer of validated Client Console events.
	* @returns A disposer that disables this Console session.
	*/
	subscribeConsole(target, sessionId, listener) {
		const subscription = {
			target,
			sessionId,
			listener
		};
		if (!this.sources.send(target.source, {
			v: 0,
			t: "client-console/enable",
			sourceId: target.source.sourceId,
			generation: target.source.generation,
			sessionId
		})) throw new Error("Client Console source disconnected before enable");
		this.consoleSubscriptions.add(subscription);
		return () => {
			if (!this.consoleSubscriptions.delete(subscription)) return;
			try {
				this.sources.send(target.source, {
					v: 0,
					t: "client-console/disable",
					sourceId: target.source.sourceId,
					generation: target.source.generation,
					sessionId
				});
			} catch {}
		};
	}
	/**
	* Execute one typed command in its currently active source generation.
	* @param target - Active Client source and context.
	* @param sessionId - Calling DevTools Runtime session.
	* @param command - Validated Client Runtime operation.
	* @returns The correlated result, or a rejection on timeout or disconnect.
	*/
	request(target, sessionId, command) {
		if (this.closed || this.targetsBySource.get(target.source.sourceId) !== target) return Promise.reject(/* @__PURE__ */ new Error("Client execution context is no longer available"));
		const requestId = inspectorId(randomUUID(), "requestId");
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				if (this.pending.get(requestId) === void 0) return;
				this.cancelClientResponse(target.source, sessionId, requestId);
				this.rejectPending(requestId, /* @__PURE__ */ new Error(`Client Runtime ${command.op} timed out after ${String(this.timeoutMs)}ms`));
			}, this.timeoutMs);
			timer.unref();
			this.pending.set(requestId, {
				target,
				sessionId,
				op: command.op,
				resolve,
				reject,
				timer
			});
			try {
				if (!this.sources.send(target.source, {
					v: 0,
					t: "client-runtime/request",
					sourceId: target.source.sourceId,
					generation: target.source.generation,
					sessionId,
					requestId,
					command
				})) this.rejectPending(requestId, /* @__PURE__ */ new Error("Client execution context disconnected before dispatch"));
			} catch (error) {
				this.rejectPending(requestId, renderError$3(error));
			}
		});
	}
	/**
	* Close one realm-local Runtime session without notifying sibling Client realms.
	* @param target - Client realm that owns the session.
	* @param sessionId - Closing DevTools Runtime session.
	*/
	closeTargetSession(target, sessionId) {
		for (const [requestId, pending] of this.pending) {
			if (pending.target !== target || pending.sessionId !== sessionId) continue;
			this.rejectPending(requestId, /* @__PURE__ */ new Error("DevTools Runtime session closed"));
		}
		for (const subscription of [...this.consoleSubscriptions]) if (subscription.target === target && subscription.sessionId === sessionId) this.consoleSubscriptions.delete(subscription);
		sendClientSessionClosed(this.sources, target.source, {
			v: 0,
			t: "client-runtime/session-closed",
			sourceId: target.source.sourceId,
			generation: target.source.generation,
			sessionId
		});
	}
	/** Stop routing and reject every outstanding operation. */
	close() {
		if (this.closed) return;
		this.closed = true;
		this.unsubscribeSources();
		for (const requestId of [...this.pending.keys()]) this.rejectPending(requestId, /* @__PURE__ */ new Error("Client Runtime router closed"));
		this.targetsBySource.clear();
		this.consoleSubscriptions.clear();
		this.listeners.clear();
	}
	receiveSourceEvent(event) {
		switch (event.type) {
			case "opened":
				this.open(event.source);
				return;
			case "closed":
				this.remove(event.source, event.reason);
				return;
			case "client-runtime-response":
				this.settle(event.source, event.frame);
				return;
			case "client-console-event":
				this.consoleEvent(event.source, event.frame);
				return;
			case "client-source-response": return;
			default: assertNever$3(event);
		}
	}
	open(source) {
		const capability = source.capabilities.find((candidate) => candidate.type === "client-runtime");
		if (capability === void 0) return;
		const target = {
			contextId: this.nextContextId--,
			uniqueContextId: `dsh-client:${source.sourceId}:${source.generation}`,
			source,
			capability
		};
		this.targetsBySource.set(source.sourceId, target);
		this.emit({
			type: "opened",
			target
		});
	}
	remove(source, reason) {
		const target = this.targetsBySource.get(source.sourceId);
		if (target === void 0 || target.source.generation !== source.generation) return;
		this.targetsBySource.delete(source.sourceId);
		for (const [requestId, pending] of this.pending) {
			if (pending.target !== target) continue;
			this.rejectPending(requestId, /* @__PURE__ */ new Error(`Client execution context closed: ${reason}`));
		}
		for (const subscription of [...this.consoleSubscriptions]) if (subscription.target === target) this.consoleSubscriptions.delete(subscription);
		this.emit({
			type: "closed",
			target
		});
	}
	consoleEvent(source, frame) {
		const target = this.targetsBySource.get(source.sourceId);
		if (target === void 0 || target.source.generation !== source.generation) return;
		for (const subscription of [...this.consoleSubscriptions]) {
			if (subscription.target !== target || subscription.sessionId !== frame.sessionId) continue;
			try {
				subscription.listener(frame.event);
			} catch {}
		}
	}
	settle(source, frame) {
		const pending = this.pending.get(frame.requestId);
		if (pending === void 0) {
			this.cancelClientResponse(source, frame.sessionId, frame.requestId);
			return;
		}
		if (pending.target.source.sourceId !== source.sourceId || pending.target.source.generation !== source.generation || pending.sessionId !== frame.sessionId) {
			this.cancelClientResponse(source, frame.sessionId, frame.requestId);
			this.cancelClientResponse(pending.target.source, pending.sessionId, frame.requestId);
			this.rejectPending(frame.requestId, /* @__PURE__ */ new Error("Client Runtime response correlation mismatch"));
			return;
		}
		if (!frame.outcome.ok) {
			this.acknowledgeClientResponse(source, frame.sessionId, frame.requestId);
			this.rejectPending(frame.requestId, new ClientRuntimeRemoteError(frame.outcome.error.code, frame.outcome.error.message));
			return;
		}
		if (frame.outcome.result.op !== pending.op) {
			this.cancelClientResponse(source, frame.sessionId, frame.requestId);
			this.rejectPending(frame.requestId, /* @__PURE__ */ new Error(`Client Runtime response op ${frame.outcome.result.op} does not match ${pending.op}`));
			return;
		}
		if (!this.acknowledgeClientResponse(source, frame.sessionId, frame.requestId)) {
			this.rejectPending(frame.requestId, /* @__PURE__ */ new Error("Client execution context disconnected before acknowledgement"));
			return;
		}
		clearTimeout(pending.timer);
		this.pending.delete(frame.requestId);
		pending.resolve(frame.outcome.result);
	}
	acknowledgeClientResponse(source, sessionId, requestId) {
		try {
			return this.sources.send(source, {
				v: 0,
				t: "client-runtime/response-acknowledged",
				sourceId: source.sourceId,
				generation: source.generation,
				sessionId,
				requestId
			});
		} catch {
			return false;
		}
	}
	cancelClientResponse(source, sessionId, requestId) {
		try {
			this.sources.send(source, {
				v: 0,
				t: "client-runtime/cancel",
				sourceId: source.sourceId,
				generation: source.generation,
				sessionId,
				requestId
			});
		} catch {}
	}
	rejectPending(requestId, error) {
		const pending = this.pending.get(requestId);
		if (pending === void 0) return;
		clearTimeout(pending.timer);
		this.pending.delete(requestId);
		pending.reject(error);
	}
	emit(event) {
		for (const listener of [...this.listeners]) try {
			listener(event);
		} catch {}
	}
};
function renderError$3(error) {
	return error instanceof Error ? error : new Error(String(error));
}
function assertNever$3(value) {
	throw new Error(`Unexpected source event: ${JSON.stringify(value)}`);
}
//#endregion
//#region lib/types/worker/bridge/source-rpc.js
/** Worker-owned request routing for Client read-only source catalogs. */
/** Deliberate error returned by the Client source catalog. */
var ClientSourceRemoteError = class extends Error {
	code;
	constructor(code, message) {
		super(message);
		this.code = code;
	}
};
/** Correlates bounded source requests with one active Client source generation. */
var ClientSourceRouter = class {
	sources;
	timeoutMs;
	maxContentBytes;
	/** Maximum decoded bytes requested in one source-content response. */
	chunkBytes;
	pending = /* @__PURE__ */ new Map();
	unsubscribeSources;
	closed = false;
	constructor(sources, timeoutMs, maxContentBytes, maxFrameBytes) {
		this.sources = sources;
		this.timeoutMs = timeoutMs;
		this.maxContentBytes = maxContentBytes;
		this.chunkBytes = Math.max(1, Math.floor((maxFrameBytes - 4096) * 3 / 4));
		this.unsubscribeSources = sources.subscribeEvents((event) => {
			this.receiveSourceEvent(event);
		});
	}
	/**
	* Execute one operation against an active Client source generation.
	* @param source - Client source that owns the script catalog.
	* @param sessionId - DevTools connection-local source session.
	* @param command - Validated read-only source command.
	* @returns The correlated result.
	*/
	request(source, sessionId, command) {
		if (this.closed) return Promise.reject(/* @__PURE__ */ new Error("Client source router is closed"));
		const requestId = inspectorId(randomUUID(), "requestId");
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pending.delete(requestId);
				reject(/* @__PURE__ */ new Error(`Client source ${command.op} timed out after ${String(this.timeoutMs)}ms`));
			}, this.timeoutMs);
			timer.unref();
			this.pending.set(requestId, {
				source,
				sessionId,
				command,
				resolve,
				reject,
				timer
			});
			try {
				if (!this.sources.send(source, {
					v: 0,
					t: "client-sources/request",
					sourceId: source.sourceId,
					generation: source.generation,
					sessionId,
					requestId,
					command
				})) this.rejectPending(requestId, /* @__PURE__ */ new Error("Client source disconnected before dispatch"));
			} catch (error) {
				this.rejectPending(requestId, renderError$2(error));
			}
		});
	}
	/**
	* Reject pending operations and notify one Client source session that it closed.
	* @param source - Source generation owning the session.
	* @param sessionId - Closing source session.
	*/
	closeSession(source, sessionId) {
		for (const [requestId, pending] of this.pending) {
			if (pending.source.sourceId !== source.sourceId || pending.source.generation !== source.generation || pending.sessionId !== sessionId) continue;
			this.rejectPending(requestId, /* @__PURE__ */ new Error("DevTools source session closed"));
		}
		sendClientSessionClosed(this.sources, source, {
			v: 0,
			t: "client-sources/session-closed",
			sourceId: source.sourceId,
			generation: source.generation,
			sessionId
		});
	}
	/** Stop routing and reject every outstanding source operation. */
	close() {
		if (this.closed) return;
		this.closed = true;
		this.unsubscribeSources();
		for (const requestId of [...this.pending.keys()]) this.rejectPending(requestId, /* @__PURE__ */ new Error("Client source router closed"));
	}
	receiveSourceEvent(event) {
		switch (event.type) {
			case "closed":
				for (const [requestId, pending] of this.pending) if (pending.source.sourceId === event.source.sourceId && pending.source.generation === event.source.generation) this.rejectPending(requestId, /* @__PURE__ */ new Error(`Client source closed: ${event.reason}`));
				return;
			case "client-source-response":
				this.settle(event.source, event.frame);
				return;
			case "opened":
			case "client-runtime-response":
			case "client-console-event": return;
			default: assertNever$2(event);
		}
	}
	settle(source, frame) {
		const pending = this.pending.get(frame.requestId);
		if (pending === void 0) return;
		if (pending.source.sourceId !== source.sourceId || pending.source.generation !== source.generation || pending.sessionId !== frame.sessionId) {
			this.rejectPending(frame.requestId, /* @__PURE__ */ new Error("Client source response correlation mismatch"));
			return;
		}
		if (!frame.outcome.ok) {
			this.rejectPending(frame.requestId, new ClientSourceRemoteError(frame.outcome.error.code, frame.outcome.error.message));
			return;
		}
		if (!matchesCommand(pending.command, frame.outcome.result)) {
			this.rejectPending(frame.requestId, /* @__PURE__ */ new Error("Client source response does not match its request"));
			return;
		}
		clearTimeout(pending.timer);
		this.pending.delete(frame.requestId);
		pending.resolve(frame.outcome.result);
	}
	rejectPending(requestId, error) {
		const pending = this.pending.get(requestId);
		if (pending === void 0) return;
		clearTimeout(pending.timer);
		this.pending.delete(requestId);
		pending.reject(error);
	}
};
function matchesCommand(command, result) {
	if (command.op !== result.op) return false;
	if (command.op === "list-scripts" || result.op === "list-scripts") return true;
	return result.scriptKey === command.scriptKey && result.content === command.content && (!result.available || result.offset === command.offset);
}
function renderError$2(error) {
	return error instanceof Error ? error : new Error(String(error));
}
function assertNever$2(value) {
	throw new Error(`Unexpected source event: ${JSON.stringify(value)}`);
}
/**
* Decode and validate one complete Cordis tree replacement.
* @param value - Untrusted observation payload.
* @param maxNodes - Maximum nodes admitted from one source.
* @returns A detached, validated snapshot.
*/
function parseCordisTreeSnapshot(value, maxNodes) {
	const record = exactObject(value, [
		"schemaVersion",
		"revision",
		"objectRegistryId",
		"root",
		"truncated"
	], "Cordis tree");
	if (record.schemaVersion !== 0 || !Number.isSafeInteger(record.revision) || record.revision < 1 || typeof record.truncated !== "boolean") throw new Error("inspector protocol: invalid Cordis tree header");
	const state = {
		count: 0,
		handles: /* @__PURE__ */ new Set(),
		fiberUids: /* @__PURE__ */ new Set()
	};
	const root = parseNode(record.root, state, maxNodes, 0);
	if (root.kind !== "context") throw new Error("inspector protocol: Cordis tree root must be a Context");
	return {
		schemaVersion: 0,
		revision: record.revision,
		objectRegistryId: wireId(record.objectRegistryId, "objectRegistryId"),
		root,
		truncated: record.truncated
	};
}
function parseNode(value, state, maxNodes, depth) {
	if (depth > 256) throw new Error("inspector protocol: Cordis tree exceeds the depth limit");
	if (++state.count > maxNodes) throw new Error(`inspector protocol: Cordis tree exceeds ${String(maxNodes)} nodes`);
	if (!isPlainObject(value) || value.kind !== "context" && value.kind !== "fiber") throw new Error("inspector protocol: Cordis tree node must have a known kind");
	const objectHandle = wireId(value.objectHandle, "objectHandle");
	if (state.handles.has(objectHandle)) throw new Error("inspector protocol: Cordis tree repeats an object handle");
	state.handles.add(objectHandle);
	if (!Array.isArray(value.children)) throw new Error("inspector protocol: Cordis tree node children must be an array");
	if (value.kind === "context") {
		exactKeys(value, [
			"kind",
			"objectHandle",
			"children"
		], "Context tree node");
		return {
			kind: "context",
			objectHandle,
			children: value.children.map((child) => parseNode(child, state, maxNodes, depth + 1))
		};
	}
	exactKeys(value, [
		"kind",
		"objectHandle",
		"uid",
		"children"
	], "Fiber tree node");
	if (!Number.isSafeInteger(value.uid) || value.uid < 1) throw new Error("inspector protocol: Cordis Fiber uid must be a positive safe integer");
	if (state.fiberUids.has(value.uid)) throw new Error("inspector protocol: Cordis tree repeats a Fiber uid");
	state.fiberUids.add(value.uid);
	if (value.children.length !== 1) throw new Error("inspector protocol: Cordis Fiber must own exactly one Context");
	const context = parseNode(value.children[0], state, maxNodes, depth + 1);
	if (context.kind !== "context") throw new Error("inspector protocol: Cordis Fiber child must be a Context");
	return {
		kind: "fiber",
		objectHandle,
		uid: value.uid,
		children: [context]
	};
}
//#endregion
//#region lib/types/shared/bridge/messages/cordis.js
/** Bridge message metadata for Cordis runtime-tree snapshots. */
/** Observation topic carrying the latest complete Cordis tree. */
const CORDIS_TREE_TOPIC = "cordis/tree";
//#endregion
//#region lib/types/shared/cordis/model.js
/**
* Project an inspected source id into the consumer-visible Cordis identity namespace.
* @param value - Stable source id carried by the current runtime observation.
* @returns The corresponding Cordis runtime source id.
*/
function cordisRuntimeSourceId(value) {
	return inspectorId(value, "sourceId");
}
//#endregion
//#region lib/types/shared/cordis/projector.js
/** Pure projection from routed Cordis snapshots to the consumer-neutral tree. */
/**
* Strip transport and live-object routing fields from retained Cordis snapshots.
* @param tree - Worker-owned routed snapshots.
* @returns A detached semantic tree safe for non-CDP consumers.
*/
function projectCordisRuntimeTree(tree) {
	return {
		schemaVersion: 0,
		host: tree.host === null ? null : projectRealm(tree.host),
		clients: tree.clients.map(projectRealm)
	};
}
function projectRealm(realm) {
	return {
		source: {
			sourceId: cordisRuntimeSourceId(realm.source.sourceId),
			kind: realm.source.kind,
			label: realm.source.label
		},
		connection: realm.connection.state === "connected" ? { state: "connected" } : {
			state: "disconnected",
			reason: realm.connection.reason
		},
		revision: realm.snapshot.revision,
		truncated: realm.snapshot.truncated,
		root: projectContext(realm.snapshot.root)
	};
}
function projectContext(node) {
	return {
		kind: "context",
		children: node.children.map(projectNode)
	};
}
function projectNode(node) {
	if (node.kind === "context") return projectContext(node);
	return {
		kind: "fiber",
		uid: node.uid,
		children: [projectContext(node.children[0])]
	};
}
//#endregion
//#region lib/types/worker/inspection/cordis-store.js
/** Worker-owned repository of CDP-independent Cordis tree snapshots. */
/** Validated latest-value store consumed independently by CDP and future query adapters. */
var CordisTreeStore = class {
	options;
	topics = new Set([CORDIS_TREE_TOPIC]);
	trees = /* @__PURE__ */ new Map();
	disconnected = /* @__PURE__ */ new Set();
	listeners = /* @__PURE__ */ new Set();
	constructor(options) {
		this.options = options;
	}
	/** Replace all retained state for one source generation. */
	replace(source, records) {
		const next = this.latest(source, records);
		if (next === void 0 ? this.remove(source.sourceId) : this.install(source, next)) this.emit({
			type: "snapshot-changed",
			source
		});
	}
	/** Apply later state replacements, ignoring unrelated observation topics. */
	append(source, records) {
		const next = this.latest(source, records);
		if (next !== void 0 && this.install(source, next)) this.emit({
			type: "snapshot-changed",
			source
		});
	}
	/** Freeze a closed source generation's last tree and invalidate its object routes. */
	close(source, reason) {
		const current = this.trees.get(source.sourceId);
		if (current?.source.generation !== source.generation || current.connection.state === "disconnected") return;
		this.trees.set(source.sourceId, {
			...current,
			connection: {
				state: "disconnected",
				reason
			}
		});
		this.disconnected.delete(source.sourceId);
		this.disconnected.add(source.sourceId);
		while (this.disconnected.size > this.options.maxDisconnectedTrees) {
			const oldest = this.disconnected.values().next().value;
			if (oldest === void 0) break;
			this.remove(oldest);
		}
		this.emit({
			type: "source-disconnected",
			source
		});
	}
	/**
	* Read all current realm snapshots without CDP identifiers.
	* @returns Snapshots in source admission order.
	*/
	snapshots() {
		return [...this.trees.values()].map(({ source, snapshot, connection }) => ({
			source,
			snapshot,
			connection
		}));
	}
	/**
	* Compose the common realm model into Host and Client slots.
	* @returns A detached view whose Host and Client entries share one type.
	*/
	tree() {
		const snapshots = this.snapshots();
		return {
			host: snapshots.find((tree) => tree.source.kind === "host") ?? null,
			clients: snapshots.filter((tree) => tree.source.kind === "client")
		};
	}
	/**
	* Read a detached semantic tree without object-routing or CDP identifiers.
	* @returns The latest retained Host and Client topology.
	*/
	readTree() {
		return projectCordisRuntimeTree(this.tree());
	}
	/**
	* Resolve a source-local object reference to its semantic tree node.
	* @param source - Active source generation.
	* @param reference - Realm-local registry and object handle.
	* @returns The matching node while its source remains connected.
	*/
	resolveObject(source, reference) {
		const tree = this.trees.get(source.sourceId);
		if (tree === void 0 || tree.source.generation !== source.generation || tree.connection.state === "disconnected") return void 0;
		const node = tree.nodesByObject.get(objectKey(reference));
		return node === void 0 ? void 0 : this.route(tree, node);
	}
	/**
	* Resolve a source-local object without requiring the source's presentation fields.
	* @param sourceId - Logical source identity.
	* @param generation - Active source generation.
	* @param reference - Realm-local object reference.
	* @returns The matching live tree node.
	*/
	resolveObjectIdentity(sourceId, generation, reference) {
		const tree = this.trees.get(sourceId);
		if (tree === void 0 || tree.source.generation !== generation || tree.connection.state === "disconnected") return;
		const node = tree.nodesByObject.get(objectKey(reference));
		return node === void 0 ? void 0 : this.route(tree, node);
	}
	/**
	* Resolve a live reference when only its source realm kind is known.
	* @param kind - Host or Client ownership inferred by the Runtime adapter.
	* @param reference - Realm-local registry and object handle.
	* @returns The matching connected node, when present.
	*/
	resolveObjectInKind(kind, reference) {
		for (const tree of this.trees.values()) {
			if (tree.source.kind !== kind || tree.connection.state === "disconnected") continue;
			const node = tree.nodesByObject.get(objectKey(reference));
			if (node !== void 0) return this.route(tree, node);
		}
	}
	/**
	* Subscribe to accepted tree replacements and source availability changes.
	* @param listener - Repository observer.
	* @returns A disposer removing the observer.
	*/
	subscribe(listener) {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}
	latest(source, records) {
		let snapshot;
		for (const record of records) {
			if (record.topic !== "cordis/tree") continue;
			const candidate = parseCordisTreeSnapshot(record.payload, this.options.maxNodes);
			if (snapshot === void 0 || candidate.revision > snapshot.revision) snapshot = candidate;
		}
		if (snapshot === void 0) return void 0;
		const current = this.trees.get(source.sourceId);
		if (current?.source.generation === source.generation && current.snapshot.revision >= snapshot.revision) return current.snapshot;
		return snapshot;
	}
	install(source, snapshot) {
		const current = this.trees.get(source.sourceId);
		if (current?.source.generation === source.generation && current.snapshot === snapshot && current.connection.state === "connected") return false;
		this.disconnected.delete(source.sourceId);
		this.trees.set(source.sourceId, {
			source,
			snapshot,
			connection: { state: "connected" },
			nodesByObject: new Map(treeNodes(snapshot.root).map((node) => [objectKey({
				registryId: snapshot.objectRegistryId,
				handle: node.objectHandle
			}), node]))
		});
		return true;
	}
	remove(sourceId) {
		this.disconnected.delete(sourceId);
		return this.trees.delete(sourceId);
	}
	route(tree, node) {
		return {
			source: tree.source,
			snapshot: tree.snapshot,
			connection: tree.connection,
			node
		};
	}
	emit(event) {
		for (const listener of [...this.listeners]) try {
			listener(event);
		} catch {}
	}
};
function objectKey(reference) {
	return `${reference.registryId}\0${reference.handle}`;
}
function treeNodes(root) {
	const nodes = [];
	const pending = [root];
	while (pending.length > 0) {
		const node = pending.pop();
		if (node === void 0) break;
		nodes.push(node);
		pending.push(...node.children.toReversed());
	}
	return nodes;
}
//#endregion
//#region lib/types/worker/cdp/target.js
/** Minimal page-target CDP methods required to expose Network, Console, and Sources together. */
/** Sentinel distinguishing an unowned method from an owned method returning undefined. */
const CDP_METHOD_NOT_HANDLED = Symbol("CDP_METHOD_NOT_HANDLED");
/**
* Handle one Worker-local identity or page scaffold method.
* @param request - Parsed CDP request.
* @param target - Synthetic page-target identity.
* @returns A response result or the unowned-method sentinel.
*/
function handleScaffold(request, target) {
	const frame = {
		id: "dsh-inspector-host-frame",
		loaderId: "dsh-inspector-loader",
		url: "dsh://host",
		domainAndRegistry: "",
		securityOrigin: "dsh://host",
		mimeType: "text/html",
		secureContextType: "Secure",
		crossOriginIsolatedContextType: "NotIsolated",
		gatedAPIFeatures: []
	};
	switch (request.method) {
		case "Page.enable":
		case "Page.disable":
		case "Page.setLifecycleEventsEnabled":
		case "Target.setDiscoverTargets":
		case "Target.setAutoAttach":
		case "Log.enable":
		case "Log.disable":
		case "Console.enable":
		case "Console.disable": return {};
		case "Page.getFrameTree": return { frameTree: {
			frame,
			childFrames: []
		} };
		case "Page.getResourceTree": return { frameTree: {
			frame,
			resources: []
		} };
		case "Page.getNavigationHistory": return {
			currentIndex: 0,
			entries: [{
				id: 1,
				url: frame.url,
				userTypedURL: frame.url,
				title: target.title,
				transitionType: "typed"
			}]
		};
		case "Target.getTargetInfo": return { targetInfo: {
			targetId: target.targetId,
			type: "page",
			title: target.title,
			url: frame.url,
			attached: true,
			canAccessOpener: false
		} };
		case "Browser.getVersion": return {
			protocolVersion: "1.3",
			product: "dsh-experimental-inspector/0",
			revision: "@experimental",
			userAgent: "dsh-experimental-inspector",
			jsVersion: process.versions.v8
		};
		default: return CDP_METHOD_NOT_HANDLED;
	}
}
//#endregion
//#region lib/types/worker/cdp/domains/runtime/cdp-params.js
/** Validation and normalization of CDP Runtime parameters routed to a Client realm. */
/**
* Parse realm-routed `Runtime.evaluate` parameters.
* @param params - Untrusted CDP parameters.
* @returns A context selector and normalized Runtime request.
*/
function parseEvaluate(params) {
	exactKeys(params, [
		"expression",
		"objectGroup",
		"includeCommandLineAPI",
		"silent",
		"contextId",
		"returnByValue",
		"generatePreview",
		"userGesture",
		"awaitPromise",
		"throwOnSideEffect",
		"timeout",
		"disableBreaks",
		"replMode",
		"allowUnsafeEvalBlockedByCSP",
		"uniqueContextId",
		"serializationOptions"
	], "Runtime.evaluate params");
	if (typeof params.expression !== "string") throw new Error("Runtime.evaluate expression must be a string");
	const selector = parseContextSelector(params, "contextId");
	const timeout = params.timeout;
	if (timeout !== void 0 && (typeof timeout !== "number" || !Number.isFinite(timeout) || timeout < 0)) throw new Error("Runtime.evaluate timeout must be a non-negative finite number");
	return {
		...selector,
		request: {
			expression: params.expression,
			...optionalString$1(params, "objectGroup"),
			...optionalBoolean(params, "includeCommandLineAPI"),
			...optionalBoolean(params, "silent"),
			...optionalBoolean(params, "returnByValue"),
			...optionalBoolean(params, "generatePreview"),
			...optionalBoolean(params, "userGesture"),
			...optionalBoolean(params, "awaitPromise"),
			...optionalBoolean(params, "disableBreaks"),
			...optionalBoolean(params, "replMode"),
			...optionalBoolean(params, "allowUnsafeEvalBlockedByCSP"),
			...optionalBoolean(params, "throwOnSideEffect"),
			...optionalJsonObject(params, "serializationOptions"),
			...timeout === void 0 ? {} : { timeoutMs: timeout }
		}
	};
}
/**
* Parse realm-routed `Runtime.getProperties` parameters.
* @param params - Untrusted CDP parameters.
* @returns The external object id and handle-free Runtime request.
*/
function parseGetProperties(params) {
	exactKeys(params, [
		"objectId",
		"ownProperties",
		"accessorPropertiesOnly",
		"generatePreview",
		"nonIndexedPropertiesOnly"
	], "Runtime.getProperties params");
	if (typeof params.objectId !== "string") throw new Error("Runtime.getProperties objectId must be a string");
	return {
		objectId: params.objectId,
		request: {
			...optionalBoolean(params, "ownProperties"),
			...optionalBoolean(params, "accessorPropertiesOnly"),
			...optionalBoolean(params, "generatePreview"),
			...optionalBoolean(params, "nonIndexedPropertiesOnly")
		}
	};
}
/**
* Parse Client-routed `Runtime.callFunctionOn` parameters.
* @param params - Untrusted CDP parameters.
* @returns Routing fields, arguments, and a handle-free Runtime request.
*/
function parseCallFunction(params) {
	exactKeys(params, [
		"functionDeclaration",
		"objectId",
		"arguments",
		"silent",
		"returnByValue",
		"generatePreview",
		"userGesture",
		"awaitPromise",
		"executionContextId",
		"objectGroup",
		"throwOnSideEffect",
		"uniqueContextId",
		"serializationOptions"
	], "Runtime.callFunctionOn params");
	if (typeof params.functionDeclaration !== "string") throw new Error("Runtime.callFunctionOn functionDeclaration must be a string");
	const selector = parseContextSelector(params, "executionContextId");
	const objectId = optionalObjectId(params.objectId, "Runtime.callFunctionOn objectId");
	if (objectId === void 0 && selector.executionContextId === void 0 && selector.uniqueContextId === void 0) throw new Error("Runtime.callFunctionOn requires objectId or an execution context");
	if (objectId !== void 0 && (selector.executionContextId !== void 0 || selector.uniqueContextId !== void 0)) throw new Error("Runtime.callFunctionOn objectId and execution context are mutually exclusive");
	let args = [];
	if (params.arguments !== void 0) {
		if (!Array.isArray(params.arguments)) throw new Error("Runtime.callFunctionOn arguments must be an array");
		args = params.arguments.map(parseCallArgument);
	}
	return {
		...selector,
		...objectId === void 0 ? {} : { objectId },
		arguments: args,
		request: {
			functionDeclaration: params.functionDeclaration,
			...optionalString$1(params, "objectGroup"),
			...optionalBoolean(params, "silent"),
			...optionalBoolean(params, "returnByValue"),
			...optionalBoolean(params, "generatePreview"),
			...optionalBoolean(params, "userGesture"),
			...optionalBoolean(params, "awaitPromise"),
			...optionalBoolean(params, "throwOnSideEffect"),
			...optionalJsonObject(params, "serializationOptions")
		}
	};
}
/**
* Parse Client-routed `Runtime.awaitPromise` parameters.
* @param params - Untrusted CDP parameters.
* @returns The external promise id and handle-free Runtime request.
*/
function parseAwaitPromise(params) {
	exactKeys(params, [
		"promiseObjectId",
		"returnByValue",
		"generatePreview"
	], "Runtime.awaitPromise params");
	if (typeof params.promiseObjectId !== "string") throw new Error("Runtime.awaitPromise promiseObjectId must be a string");
	return {
		promiseObjectId: params.promiseObjectId,
		request: {
			...optionalBoolean(params, "returnByValue"),
			...optionalBoolean(params, "generatePreview")
		}
	};
}
/**
* Parse one required object id.
* @param params - Untrusted CDP parameters.
* @returns The object id.
*/
function parseReleaseObject(params) {
	exactKeys(params, ["objectId"], "Runtime.releaseObject params");
	if (typeof params.objectId !== "string") throw new Error("Runtime.releaseObject objectId must be a string");
	return params.objectId;
}
/**
* Parse one required object-group name.
* @param params - Untrusted CDP parameters.
* @returns The object-group name.
*/
function parseReleaseObjectGroup(params) {
	exactKeys(params, ["objectGroup"], "Runtime.releaseObjectGroup params");
	if (typeof params.objectGroup !== "string") throw new Error("Runtime.releaseObjectGroup objectGroup must be a string");
	return params.objectGroup;
}
/**
* Parse `Runtime.globalLexicalScopeNames` context selection.
* @param params - Untrusted CDP parameters.
* @returns The validated context selector.
*/
function parseGlobalLexicalScopeNames(params) {
	exactKeys(params, ["executionContextId"], "Runtime.globalLexicalScopeNames params");
	return parseContextSelector(params, "executionContextId");
}
function parseCallArgument(value) {
	if (!isPlainObject(value)) throw new Error("Runtime.callFunctionOn argument must be an object");
	exactKeys(value, [
		"value",
		"unserializableValue",
		"objectId"
	], "Runtime.callFunctionOn argument");
	const present = [
		"value",
		"unserializableValue",
		"objectId"
	].filter((key) => Object.hasOwn(value, key));
	if (present.length > 1) throw new Error("Runtime.callFunctionOn argument has multiple value representations");
	if (present.length === 0) return { kind: "undefined" };
	if (present[0] === "value") {
		if (!isJsonValue(value.value)) throw new Error("Runtime.callFunctionOn argument value must be JSON");
		return {
			kind: "value",
			value: value.value
		};
	}
	if (present[0] === "unserializableValue") {
		if (typeof value.unserializableValue !== "string") throw new Error("Runtime.callFunctionOn unserializableValue must be a string");
		return {
			kind: "unserializable",
			value: value.unserializableValue
		};
	}
	if (typeof value.objectId !== "string") throw new Error("Runtime.callFunctionOn argument objectId must be a string");
	return {
		kind: "object",
		objectId: value.objectId
	};
}
function parseContextSelector(params, numericKey) {
	const numeric = params[numericKey];
	const unique = params.uniqueContextId;
	if (numeric !== void 0 && !Number.isSafeInteger(numeric)) throw new Error(`Runtime ${numericKey} must be an integer`);
	if (unique !== void 0 && typeof unique !== "string") throw new Error("Runtime uniqueContextId must be a string");
	if (numeric !== void 0 && unique !== void 0) throw new Error("Runtime context selectors are mutually exclusive");
	return {
		...numeric === void 0 ? {} : numericKey === "contextId" ? { contextId: numeric } : { executionContextId: numeric },
		...unique === void 0 ? {} : { uniqueContextId: unique }
	};
}
function optionalObjectId(value, label) {
	if (value === void 0) return void 0;
	if (typeof value !== "string") throw new Error(`${label} must be a string`);
	return value;
}
function optionalJsonObject(value, key) {
	const item = value[key];
	if (item === void 0) return {};
	if (!isPlainObject(item) || !isJsonValue(item)) throw new Error(`Runtime ${key} must be a JSON object`);
	return { [key]: item };
}
//#endregion
//#region lib/types/worker/cdp/domains/runtime/object-table.js
/** Per-CDP-connection routing and projection for every realm's Runtime objects. */
/** Maps every realm's backend handles to object ids scoped to one CDP connection. */
var RuntimeObjectTable = class {
	connectionId;
	routes = /* @__PURE__ */ new Map();
	nextObjectId = 1;
	nextExceptionId = 1;
	observer;
	constructor(connectionId) {
		this.connectionId = connectionId;
	}
	/**
	* Install Cordis object recognition after Runtime and DOM sessions are assembled.
	* @param observer - Callback mapping a semantic reference to node presentation.
	*/
	setObserver(observer) {
		this.observer = observer;
	}
	/**
	* Resolve one connection-local object id.
	* @param objectId - CDP object id allocated by this table.
	* @returns Its realm and backend handle when current.
	*/
	resolve(objectId) {
		return this.routes.get(cdpStringId(objectId, "objectId"));
	}
	/**
	* Convert a realm completion to CDP fields.
	* @param realm - Realm session that produced the value.
	* @param value - Engine-independent completion.
	* @param group - Object group inherited by exposed handles.
	* @returns CDP Runtime completion fields.
	*/
	completion(realm, value, group) {
		return {
			result: this.remote(realm, value.result, group),
			...value.exceptionDetails === void 0 ? {} : { exceptionDetails: this.exception(realm, value.exceptionDetails, group) }
		};
	}
	/**
	* Convert realm property descriptors to CDP fields.
	* @param realm - Realm session that owns returned object references.
	* @param value - Engine-independent property result.
	* @param group - Object group inherited from the inspected object.
	* @returns CDP Runtime property result fields.
	*/
	properties(realm, value, group) {
		return {
			result: value.properties.map((property) => this.property(realm, property, group)),
			...value.internalProperties === void 0 ? {} : { internalProperties: value.internalProperties.map((property) => this.internalProperty(realm, property, group)) },
			...value.privateProperties === void 0 ? {} : { privateProperties: value.privateProperties.map((property) => this.privateProperty(realm, property, group)) },
			...value.exceptionDetails === void 0 ? {} : { exceptionDetails: this.exception(realm, value.exceptionDetails, group) }
		};
	}
	/**
	* Project one realm Console event to a CDP Runtime notification.
	* @param realm - Realm session that emitted the event.
	* @param value - Realm-neutral Console or exception event.
	* @returns CDP method and parameters.
	*/
	consoleEvent(realm, value) {
		if (value.type === "console-api") {
			const contextId = value.event.contextId ?? (realm.context.kind === "synthetic" ? realm.context.id : void 0);
			return {
				method: "Runtime.consoleAPICalled",
				params: {
					type: value.event.type,
					args: value.event.arguments.map((argument) => this.remote(realm, argument, "console")),
					timestamp: value.event.timestamp,
					...contextId === void 0 ? {} : { executionContextId: contextId },
					...value.event.stackTrace === void 0 ? {} : { stackTrace: cdpStackTrace(value.event.stackTrace) }
				}
			};
		}
		const contextId = value.event.contextId ?? (realm.context.kind === "synthetic" ? realm.context.id : void 0);
		return {
			method: "Runtime.exceptionThrown",
			params: {
				timestamp: value.event.timestamp,
				exceptionDetails: {
					...this.exception(realm, value.event.details, "console"),
					...contextId === void 0 ? {} : { executionContextId: contextId }
				}
			}
		};
	}
	/**
	* List realm sessions retaining at least one object in a group.
	* @param group - DevTools object-group name.
	* @returns Distinct realm sessions that must receive the release.
	*/
	realmsInGroup(group) {
		const realms = /* @__PURE__ */ new Set();
		for (const route of this.routes.values()) if (route.group === group) realms.add(route.realm);
		return [...realms];
	}
	/**
	* Forget one externally visible object id.
	* @param objectId - Released CDP object id.
	*/
	release(objectId) {
		this.routes.delete(cdpStringId(objectId, "objectId"));
	}
	/**
	* Forget all ids retained under one object group.
	* @param group - Released object-group name.
	*/
	releaseGroup(group) {
		for (const [objectId, route] of this.routes) if (route.group === group) this.routes.delete(objectId);
	}
	/**
	* Forget every object owned by one closed realm session.
	* @param realm - Closed realm session.
	*/
	releaseRealm(realm) {
		for (const [objectId, route] of this.routes) if (route.realm === realm) this.routes.delete(objectId);
	}
	/** Forget every object exposed on this DevTools connection. */
	clear() {
		this.routes.clear();
	}
	/**
	* Project one common Runtime value and retain its backend handle for this connection.
	* @param realm - Realm session that owns the value.
	* @param value - Realm-neutral Runtime value.
	* @param group - Object group assigned to any exposed handle.
	* @returns CDP RemoteObject fields.
	*/
	remote(realm, value, group) {
		const objectId = value.object === void 0 ? void 0 : this.expose(realm, value.object.handle, group);
		const presentation = objectId === void 0 || value.semanticReference === void 0 ? void 0 : this.observer?.(objectId, realm.descriptor, value.semanticReference, group);
		return {
			...value.descriptor,
			...presentation?.subtype === void 0 ? {} : { subtype: presentation.subtype },
			...presentation?.className === void 0 ? {} : { className: presentation.className },
			...presentation?.description === void 0 ? {} : { description: presentation.description },
			...objectId === void 0 ? {} : { objectId }
		};
	}
	property(realm, property, group) {
		return {
			...property,
			...property.value === void 0 ? {} : { value: this.remote(realm, property.value, group) },
			...property.get === void 0 ? {} : { get: this.remote(realm, property.get, group) },
			...property.set === void 0 ? {} : { set: this.remote(realm, property.set, group) },
			...property.symbol === void 0 ? {} : { symbol: this.remote(realm, property.symbol, group) }
		};
	}
	internalProperty(realm, property, group) {
		return {
			name: property.name,
			...property.value === void 0 ? {} : { value: this.remote(realm, property.value, group) }
		};
	}
	privateProperty(realm, property, group) {
		return {
			name: property.name,
			...property.value === void 0 ? {} : { value: this.remote(realm, property.value, group) },
			...property.get === void 0 ? {} : { get: this.remote(realm, property.get, group) },
			...property.set === void 0 ? {} : { set: this.remote(realm, property.set, group) }
		};
	}
	exception(realm, details, group) {
		return {
			...details,
			exceptionId: this.nextExceptionId++,
			...realm.context.kind === "synthetic" ? { executionContextId: realm.context.id } : {},
			...details.stackTrace === void 0 ? {} : { stackTrace: cdpStackTrace(details.stackTrace) },
			...details.exception === void 0 ? {} : { exception: this.remote(realm, details.exception, group) }
		};
	}
	expose(realm, handle, group) {
		const objectId = cdpStringId(`runtime:${this.connectionId}:${String(this.nextObjectId++)}`, "objectId");
		this.routes.set(objectId, {
			realm,
			handle,
			group
		});
		return objectId;
	}
};
function cdpStackTrace(stack) {
	return {
		...stack.description === void 0 ? {} : { description: stack.description },
		callFrames: stack.callFrames.map((frame) => ({
			functionName: frame.functionName,
			scriptId: frame.scriptKey ?? "0",
			url: frame.url,
			lineNumber: frame.lineNumber,
			columnNumber: frame.columnNumber
		})),
		...stack.parent === void 0 ? {} : { parent: cdpStackTrace(stack.parent) }
	};
}
//#endregion
//#region lib/types/worker/cdp/domains/runtime/session.js
/** Per-DevTools-session Runtime routing across uniform Host and Client realms. */
/** Runtime router layered over the common per-connection realm sessions. */
var RuntimeDomainSession = class {
	transport;
	realms;
	objects;
	announcedContexts = /* @__PURE__ */ new Set();
	consoleDisposers = /* @__PURE__ */ new Map();
	unsubscribeRealms;
	enabled = false;
	closed = false;
	constructor(transport, realms) {
		this.transport = transport;
		this.realms = realms;
		this.objects = new RuntimeObjectTable(realms.connectionId);
		this.unsubscribeRealms = realms.subscribe((event) => {
			this.receiveRealm(event);
		});
	}
	/**
	* Handle methods that require cross-realm Runtime coordination.
	* @param request - Parsed CDP request.
	* @returns Whether this domain owns the method or object id.
	*/
	handle(request) {
		switch (request.method) {
			case "Runtime.enable":
				this.respond(request, () => this.enable());
				return true;
			case "Runtime.disable":
				this.respond(request, () => this.disable());
				return true;
			case "Runtime.evaluate":
				this.respond(request, () => this.evaluate(request.params));
				return true;
			case "Runtime.getProperties": return this.getProperties(request);
			case "Runtime.callFunctionOn": return this.callFunction(request);
			case "Runtime.awaitPromise": return this.awaitPromise(request);
			case "Runtime.releaseObject": return this.releaseObject(request);
			case "Runtime.releaseObjectGroup":
				this.respond(request, () => this.releaseObjectGroup(request.params));
				return true;
			case "Runtime.globalLexicalScopeNames":
				this.respond(request, () => this.globalLexicalScopeNames(request.params));
				return true;
			case "Runtime.discardConsoleEntries":
				this.respond(request, () => this.discardConsoleEntries());
				return true;
			default:
				if (request.method.startsWith("Runtime.")) {
					const reason = this.unsupportedNativeRoute(request.params);
					if (reason !== void 0) {
						this.sendError(request, reason);
						return true;
					}
				}
				return false;
		}
	}
	/** Release this connection's object routes and realm subscription. */
	close() {
		if (this.closed) return;
		this.closed = true;
		this.unsubscribeRealms();
		for (const dispose of this.consoleDisposers.values()) dispose();
		this.consoleDisposers.clear();
		this.objects.clear();
		this.announcedContexts.clear();
	}
	/**
	* Install semantic object recognition shared with the DOM adapter.
	* @param observer - Callback invoked for objects carrying semantic references.
	*/
	setObjectObserver(observer) {
		this.objects.setObserver(observer);
	}
	/**
	* Resolve a connection-local CDP object id for another domain adapter.
	* @param objectId - CDP object id allocated by this Runtime session.
	* @returns Its realm and backend handle when still live.
	*/
	objectRoute(objectId) {
		return this.objects.resolve(objectId);
	}
	/**
	* Project a completion produced by another domain through this connection's object table.
	* @param realm - Realm session that owns the completion.
	* @param completion - Realm-neutral result and exception fields.
	* @param group - Object group assigned to exposed handles.
	* @returns CDP Runtime result fields.
	*/
	projectCompletion(realm, completion, group) {
		return this.objects.completion(realm, completion, group);
	}
	/**
	* Project one Runtime value produced by another domain.
	* @param realm - Realm session that owns the value.
	* @param value - Realm-neutral Runtime value.
	* @param group - Object group assigned to an exposed handle.
	* @returns CDP RemoteObject fields.
	*/
	projectRemoteObject(realm, value, group) {
		return this.objects.remote(realm, value, group);
	}
	/**
	* Forget connection-local ids retained for another domain's object group.
	* @param group - Object group whose projected ids have expired.
	*/
	releaseProjectedGroup(group) {
		this.objects.releaseGroup(group);
	}
	/**
	* Replace common object ids with native backend handles in a Host-only request.
	* @param params - Parsed CDP parameters that may contain nested object ids.
	* @returns A detached parameter record suitable for the native Host protocol.
	*/
	nativeParameters(params) {
		const visit = (value, key) => {
			if ((key === "objectId" || key?.endsWith("ObjectId") === true) && typeof value === "string") {
				const route = this.objects.resolve(value);
				if (route === void 0) return value;
				if (route.realm.nativeDomains.state === "unsupported") throw new Error(route.realm.nativeDomains.reason);
				return route.handle;
			}
			if (Array.isArray(value)) return value.map((item) => visit(item, void 0));
			if (typeof value !== "object" || value === null) return value;
			return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, visit(item, name)]));
		};
		return visit(params, void 0);
	}
	/**
	* Resolve one realm-registry expression to a connection-local object id.
	* @param source - Source generation that owns the Cordis tree node.
	* @param expression - Side-effect-free realm object lookup.
	* @param objectGroup - Optional DevTools retention group.
	* @returns The CDP RemoteObject fields.
	*/
	async resolveObject(source, expression, objectGroup) {
		const realm = this.realms.bySource(source);
		if (realm === void 0) throw new Error("Cordis realm is no longer connected");
		const completion = await runtimeBackend(realm).evaluate({
			expression,
			generatePreview: true,
			...objectGroup === void 0 ? {} : { objectGroup }
		});
		if (completion.exceptionDetails !== void 0) throw new Error("Cordis object lookup failed");
		return this.objects.completion(realm, completion, objectGroup).result;
	}
	async enable() {
		this.enabled = true;
		try {
			await Promise.all(this.realms.all().map(async (realm) => {
				await runtimeBackend(realm).enable();
			}));
			for (const realm of this.realms.all()) {
				this.attachConsole(realm);
				this.announce(realm);
			}
			return {};
		} catch (error) {
			this.enabled = false;
			for (const dispose of this.consoleDisposers.values()) dispose();
			this.consoleDisposers.clear();
			this.announcedContexts.clear();
			await Promise.allSettled(this.realms.all().map(async (realm) => {
				await runtimeBackend(realm).disable();
			}));
			throw error;
		}
	}
	async disable() {
		for (const dispose of this.consoleDisposers.values()) dispose();
		this.consoleDisposers.clear();
		try {
			await Promise.all(this.realms.all().map(async (realm) => {
				await runtimeBackend(realm).disable();
			}));
		} finally {
			this.enabled = false;
			this.objects.clear();
			this.announcedContexts.clear();
		}
		return {};
	}
	async evaluate(params) {
		const parsed = parseEvaluate(params);
		const realm = this.realmFromSelector(parsed, "contextId");
		const completion = await runtimeBackend(realm).evaluate({
			...parsed.request,
			...this.backendContext(realm, parsed, "contextId")
		});
		return this.objects.completion(realm, completion, parsed.request.objectGroup);
	}
	getProperties(request) {
		const objectId = request.params.objectId;
		if (typeof objectId !== "string") return false;
		const route = this.objects.resolve(objectId);
		if (route === void 0) return false;
		this.respond(request, async () => {
			const parsed = parseGetProperties(request.params);
			const properties = await runtimeBackend(route.realm).getProperties({
				...parsed.request,
				handle: route.handle
			});
			return this.objects.properties(route.realm, properties, route.group);
		});
		return true;
	}
	callFunction(request) {
		const objectId = typeof request.params.objectId === "string" ? request.params.objectId : void 0;
		const receiver = objectId === void 0 ? void 0 : this.objects.resolve(objectId);
		const selected = this.realmFromOptionalSelector(request.params, "executionContextId");
		if (receiver === void 0 && selected === void 0 && objectId !== void 0) return false;
		const realm = receiver?.realm ?? selected ?? this.realms.host();
		if (receiver !== void 0 && selected !== void 0 && receiver.realm !== selected) {
			this.sendError(request, "Runtime.callFunctionOn receiver and execution context belong to different realms");
			return true;
		}
		this.respond(request, async () => {
			const parsed = parseCallFunction(request.params);
			const group = parsed.request.objectGroup ?? receiver?.group;
			const completion = await runtimeBackend(realm).callFunction({
				...parsed.request,
				...this.backendContext(realm, parsed, "executionContextId"),
				...receiver === void 0 ? {} : { receiver: receiver.handle },
				arguments: parsed.arguments.map((argument) => this.routeArgument(realm, argument))
			});
			return this.objects.completion(realm, completion, group);
		});
		return true;
	}
	awaitPromise(request) {
		const objectId = request.params.promiseObjectId;
		if (typeof objectId !== "string") return false;
		const route = this.objects.resolve(objectId);
		if (route === void 0) return false;
		this.respond(request, async () => {
			const parsed = parseAwaitPromise(request.params);
			const completion = await runtimeBackend(route.realm).awaitPromise({
				...parsed.request,
				promise: route.handle
			});
			return this.objects.completion(route.realm, completion, route.group);
		});
		return true;
	}
	releaseObject(request) {
		const objectId = request.params.objectId;
		if (typeof objectId !== "string") return false;
		const route = this.objects.resolve(objectId);
		if (route === void 0) return false;
		this.respond(request, async () => {
			parseReleaseObject(request.params);
			await runtimeBackend(route.realm).releaseObject(route.handle);
			this.objects.release(objectId);
			return {};
		});
		return true;
	}
	async releaseObjectGroup(params) {
		const group = parseReleaseObjectGroup(params);
		const realms = this.objects.realmsInGroup(group);
		try {
			await Promise.all(realms.map(async (realm) => {
				await runtimeBackend(realm).releaseObjectGroup(group);
			}));
		} finally {
			this.objects.releaseGroup(group);
		}
		return {};
	}
	async globalLexicalScopeNames(params) {
		const parsed = parseGlobalLexicalScopeNames(params);
		const realm = this.realmFromSelector(parsed, "executionContextId");
		const context = this.backendContext(realm, parsed, "executionContextId").context;
		return { names: await runtimeBackend(realm).globalLexicalScopeNames(context) };
	}
	async discardConsoleEntries() {
		await Promise.all(this.realms.all().map(async (realm) => {
			if (realm.console.state === "supported") await realm.console.backend.clear();
			await runtimeBackend(realm).releaseObjectGroup("console");
		}));
		this.objects.releaseGroup("console");
		return {};
	}
	realmFromSelector(params, numericKey) {
		return this.realmFromOptionalSelector(params, numericKey) ?? this.realms.host();
	}
	realmFromOptionalSelector(params, numericKey) {
		const numeric = params[numericKey];
		if (typeof numeric === "number" && Number.isSafeInteger(numeric)) {
			const realm = this.realms.byContextId(numeric);
			if (realm !== void 0) return realm;
			if (numeric < 0) throw new Error("Client execution context is no longer available");
			return this.realms.host();
		}
		const unique = params.uniqueContextId;
		if (typeof unique === "string") {
			const realm = this.realms.byUniqueContextId(unique);
			if (realm !== void 0) return realm;
			if (unique.startsWith("dsh-client:")) throw new Error("Client execution context is no longer available");
			return this.realms.host();
		}
	}
	backendContext(realm, params, numericKey) {
		if (realm.context.kind !== "native") return {};
		const numeric = params[numericKey];
		if (typeof numeric === "number") return { context: {
			kind: "numeric",
			id: numeric
		} };
		return params.uniqueContextId === void 0 ? {} : { context: {
			kind: "unique",
			id: params.uniqueContextId
		} };
	}
	routeArgument(realm, argument) {
		if (argument.kind !== "object") return argument;
		const route = this.objects.resolve(argument.objectId);
		if (route === void 0 || route.realm !== realm) throw new Error("Runtime.callFunctionOn cannot pass an object between realms");
		return {
			kind: "object",
			handle: route.handle
		};
	}
	unsupportedNativeRoute(params) {
		for (const key of ["contextId", "executionContextId"]) {
			const contextId = params[key];
			if (typeof contextId !== "number") continue;
			const realm = this.realms.byContextId(contextId);
			if (realm?.nativeDomains.state === "unsupported") return realm.nativeDomains.reason;
			if (contextId < 0 && realm === void 0) return "Client execution context is no longer available";
		}
		if (typeof params.uniqueContextId === "string") {
			const realm = this.realms.byUniqueContextId(params.uniqueContextId);
			if (realm?.nativeDomains.state === "unsupported") return realm.nativeDomains.reason;
			if (params.uniqueContextId.startsWith("dsh-client:") && realm === void 0) return "Client execution context is no longer available";
		}
		for (const [key, value] of Object.entries(params)) {
			if (!key.endsWith("ObjectId") && key !== "objectId") continue;
			if (typeof value !== "string") continue;
			const route = this.objects.resolve(value);
			if (route?.realm.nativeDomains.state === "unsupported") return route.realm.nativeDomains.reason;
		}
	}
	receiveRealm(event) {
		if (event.type === "opened") {
			if (this.enabled) runtimeBackend(event.session).enable().then(() => {
				this.attachConsole(event.session);
				this.announce(event.session);
			}, () => {
				event.session.close();
			});
			return;
		}
		this.consoleDisposers.get(event.session.descriptor.realmId)?.();
		this.consoleDisposers.delete(event.session.descriptor.realmId);
		this.objects.releaseRealm(event.session);
		this.destroy(event.session);
	}
	attachConsole(realm) {
		if (realm.console.state === "unsupported" || this.consoleDisposers.has(realm.descriptor.realmId)) return;
		this.consoleDisposers.set(realm.descriptor.realmId, realm.console.backend.subscribe((event) => {
			if (!this.enabled) return;
			this.transport.send(this.objects.consoleEvent(realm, event));
		}));
	}
	announce(realm) {
		if (!this.enabled || realm.context.kind !== "synthetic" || this.announcedContexts.has(realm.context.id)) return;
		this.announcedContexts.add(realm.context.id);
		this.transport.send({
			method: "Runtime.executionContextCreated",
			params: { context: {
				id: realm.context.id,
				uniqueId: realm.context.uniqueId,
				origin: realm.context.origin,
				name: `Client — ${realm.descriptor.label}`,
				auxData: {
					isDefault: false,
					type: "dsh-client",
					sourceId: realm.descriptor.sourceId
				}
			} }
		});
	}
	destroy(realm) {
		if (realm.context.kind !== "synthetic" || !this.announcedContexts.delete(realm.context.id)) return;
		this.transport.send({
			method: "Runtime.executionContextDestroyed",
			params: {
				executionContextId: realm.context.id,
				executionContextUniqueId: realm.context.uniqueId
			}
		});
	}
	respond(request, operation) {
		respondToCdpRequest(this.transport, request, operation);
	}
	sendError(request, message) {
		this.transport.send(cdpError(request.id, -32e3, message));
	}
};
function runtimeBackend(realm) {
	if (realm.runtime.state === "unsupported") throw new Error(realm.runtime.reason);
	return realm.runtime.backend;
}
//#endregion
//#region lib/types/worker/cdp/domains/debugger/cdp-params.js
/** Validation for CDP Debugger requests handled by the shared domain. */
/**
* Parse Debugger.evaluateOnCallFrame without silently accepting unsupported options.
* @param params - Untrusted CDP parameters.
* @returns The common call-frame evaluation request.
*/
function parseCallFrameEvaluation(params) {
	exactKeys(params, [
		"callFrameId",
		"expression",
		"objectGroup",
		"includeCommandLineAPI",
		"silent",
		"returnByValue",
		"generatePreview",
		"throwOnSideEffect",
		"timeout"
	], "Debugger.evaluateOnCallFrame parameters");
	if (typeof params.callFrameId !== "string" || typeof params.expression !== "string") throw new Error("Debugger.evaluateOnCallFrame requires callFrameId and expression");
	if (params.timeout !== void 0 && (typeof params.timeout !== "number" || !Number.isFinite(params.timeout) || params.timeout < 0)) throw new Error("Debugger.evaluateOnCallFrame timeout must be a non-negative number");
	return {
		callFrameId: params.callFrameId,
		expression: params.expression,
		...optionalString$1(params, "objectGroup"),
		...optionalBoolean(params, "includeCommandLineAPI"),
		...optionalBoolean(params, "silent"),
		...optionalBoolean(params, "returnByValue"),
		...optionalBoolean(params, "generatePreview"),
		...optionalBoolean(params, "throwOnSideEffect"),
		...params.timeout === void 0 ? {} : { timeoutMs: params.timeout }
	};
}
/**
* Find a ScriptId carried directly or by a Debugger location parameter.
* @param params - Parsed CDP parameter record.
* @returns The targeted script id when the request names one.
*/
function requestScriptId(params) {
	if (typeof params.scriptId === "string") return params.scriptId;
	for (const key of [
		"location",
		"start",
		"end"
	]) {
		const value = params[key];
		if (typeof value !== "object" || value === null || Array.isArray(value)) continue;
		const scriptId = value.scriptId;
		if (typeof scriptId === "string") return scriptId;
	}
}
//#endregion
//#region lib/types/worker/cdp/domains/debugger/script-registry.js
/** Connection-local routing from CDP ScriptId values to realm source backends. */
/** Tracks active and retired scripts without exposing source transport ids. */
var DebuggerScriptRegistry = class {
	routes = /* @__PURE__ */ new Map();
	retiredUnsupported = /* @__PURE__ */ new Set();
	/**
	* Register one realm script under its globally unique Runtime script key.
	* @param route - Script descriptor and owning realm session.
	* @returns The CDP ScriptId and whether this is its first announcement.
	*/
	register(route) {
		const scriptId = cdpScriptId(route.script.scriptKey);
		const current = this.routes.get(scriptId);
		if (current !== void 0 && current.realm !== route.realm) throw new Error(`Inspector realms produced the same script key ${scriptId}`);
		this.routes.set(scriptId, route);
		return {
			scriptId,
			fresh: current === void 0
		};
	}
	/**
	* Resolve an active CDP ScriptId.
	* @param scriptId - Connection-visible script id.
	* @returns The active route when the script remains connected.
	*/
	resolve(scriptId) {
		return this.routes.get(cdpStringId(scriptId, "scriptId"));
	}
	/**
	* Resolve a script by its exact URL.
	* @param url - Script URL from a CDP request.
	* @returns The active route when one script has that URL.
	*/
	byUrl(url) {
		for (const route of this.routes.values()) if (route.script.url === url) return route;
	}
	/**
	* Resolve a script by its exact content hash.
	* @param hash - Script hash from a breakpoint request.
	* @returns The active route when one script has that hash.
	*/
	byHash(hash) {
		for (const route of this.routes.values()) if (route.script.hash === hash) return route;
	}
	/**
	* Resolve the first script whose URL matches a breakpoint regular expression.
	* @param pattern - JavaScript regular-expression source accepted by CDP.
	* @returns The first matching active route.
	*/
	byUrlPattern(pattern) {
		const expression = new RegExp(pattern, "u");
		for (const route of this.routes.values()) if (expression.test(route.script.url)) return route;
	}
	/**
	* Test whether a disconnected script belonged to a realm without active debugging.
	* @param scriptId - Script id from a later CDP request.
	* @returns Whether the id must still fail as an unsupported Client script.
	*/
	wasUnsupported(scriptId) {
		return this.retiredUnsupported.has(cdpStringId(scriptId, "scriptId"));
	}
	/**
	* Forget scripts for one closed realm while retaining their unsupported identity.
	* @param realm - Realm session being removed.
	*/
	removeRealm(realm) {
		for (const [scriptId, route] of this.routes) {
			if (route.realm !== realm) continue;
			this.routes.delete(scriptId);
			if (realm.debugger.state === "unsupported") this.retiredUnsupported.add(scriptId);
		}
	}
	/** Forget all active and retired script routes. */
	clear() {
		this.routes.clear();
		this.retiredUnsupported.clear();
	}
};
/**
* Preserve a branded script key as its CDP wire identifier.
* @param scriptKey - Realm-wide Runtime script key.
* @returns The corresponding CDP ScriptId text.
*/
function cdpScriptId(scriptKey) {
	return cdpStringId(scriptKey, "scriptId");
}
//#endregion
//#region lib/types/worker/cdp/domains/debugger/projector.js
/** CDP projection for realm-neutral scripts and debugger events. */
/**
* Project one common script descriptor to Debugger.scriptParsed.
* @param realm - Realm session that owns the script.
* @param script - Realm-neutral script descriptor.
* @returns A CDP scriptParsed notification.
*/
function scriptParsedEvent(realm, script) {
	return {
		method: "Debugger.scriptParsed",
		params: {
			scriptId: cdpScriptId(script.scriptKey),
			url: script.url,
			startLine: script.startLine,
			startColumn: script.startColumn,
			endLine: script.endLine,
			endColumn: script.endColumn,
			executionContextId: script.executionContextId ?? (realm.context.kind === "synthetic" ? realm.context.id : 0),
			hash: script.hash,
			buildId: script.buildId ?? "",
			...script.sourceMapUrl === void 0 ? {} : { sourceMapURL: script.sourceMapUrl },
			...script.isModule === void 0 ? {} : { isModule: script.isModule },
			...script.length === void 0 ? {} : { length: script.length }
		}
	};
}
/**
* Project one common debugger event and all nested Runtime objects to CDP.
* @param realm - Realm session that emitted the event.
* @param event - Realm-neutral debugger event.
* @param runtime - Connection-local Runtime object projector.
* @returns The corresponding CDP notification.
*/
function debuggerEvent(realm, event, runtime) {
	switch (event.type) {
		case "paused": return {
			method: "Debugger.paused",
			params: {
				callFrames: event.callFrames.map((frame) => ({
					callFrameId: frame.callFrameId,
					functionName: frame.functionName,
					...frame.functionLocation === void 0 ? {} : { functionLocation: location$1(frame.functionLocation) },
					location: location$1(frame.location),
					url: frame.url,
					scopeChain: frame.scopeChain.map((scope) => ({
						type: scope.type,
						object: runtime.projectRemoteObject(realm, scope.object, "backtrace"),
						...scope.name === void 0 ? {} : { name: scope.name },
						...scope.startLocation === void 0 ? {} : { startLocation: location$1(scope.startLocation) },
						...scope.endLocation === void 0 ? {} : { endLocation: location$1(scope.endLocation) }
					})),
					this: runtime.projectRemoteObject(realm, frame.thisObject, "backtrace"),
					...frame.returnValue === void 0 ? {} : { returnValue: runtime.projectRemoteObject(realm, frame.returnValue, "backtrace") }
				})),
				reason: event.reason,
				...event.data === void 0 ? {} : { data: event.data },
				...event.hitBreakpoints === void 0 ? {} : { hitBreakpoints: event.hitBreakpoints },
				...event.asyncStackTrace === void 0 ? {} : { asyncStackTrace: stackTrace(event.asyncStackTrace) }
			}
		};
		case "resumed": return {
			method: "Debugger.resumed",
			params: {}
		};
		case "breakpoint-resolved": return {
			method: "Debugger.breakpointResolved",
			params: {
				breakpointId: event.breakpointId,
				location: location$1(event.location)
			}
		};
		default: return assertNever$1(event);
	}
}
function location$1(value) {
	return {
		scriptId: cdpScriptId(value.scriptKey),
		lineNumber: value.lineNumber,
		...value.columnNumber === void 0 ? {} : { columnNumber: value.columnNumber }
	};
}
function stackTrace(value) {
	return {
		...value.description === void 0 ? {} : { description: value.description },
		callFrames: value.callFrames.map((frame) => ({
			functionName: frame.functionName,
			scriptId: frame.scriptKey === void 0 ? "0" : cdpScriptId(frame.scriptKey),
			url: frame.url,
			lineNumber: frame.lineNumber,
			columnNumber: frame.columnNumber
		})),
		...value.parent === void 0 ? {} : { parent: stackTrace(value.parent) }
	};
}
function assertNever$1(value) {
	throw new Error(`Unexpected debugger event: ${JSON.stringify(value)}`);
}
//#endregion
//#region lib/types/worker/cdp/domains/debugger/session.js
/** Per-DevTools Debugger and source routing across Host and Client realms. */
/** Owns Debugger lifecycle, shared script projection, and Host-native fallback. */
var DebuggerDomainSession = class {
	transport;
	realms;
	runtime;
	scripts = new DebuggerScriptRegistry();
	sourceDisposers = /* @__PURE__ */ new Map();
	debuggerDisposers = /* @__PURE__ */ new Map();
	callFrameRealms = /* @__PURE__ */ new Map();
	unsubscribeRealms;
	native;
	debuggerEnableRequest = {};
	enabled = false;
	closed = false;
	constructor(transport, realms, runtime) {
		this.transport = transport;
		this.realms = realms;
		this.runtime = runtime;
		const native = realms.all().map((realm) => realm.nativeDomains).find((capability) => capability.state === "supported");
		if (native === void 0) throw new Error("Inspector has no native Host debugger transport");
		this.native = native.backend;
		this.unsubscribeRealms = realms.subscribe((event) => {
			this.receiveRealm(event);
		});
	}
	/**
	* Handle one Debugger request, including Client read-only source operations.
	* @param request - Parsed CDP request.
	* @returns Whether the method belongs to the Debugger domain.
	*/
	handle(request) {
		if (!request.method.startsWith("Debugger.")) return false;
		switch (request.method) {
			case "Debugger.enable":
				this.respond(request, () => this.enable(request.params));
				return true;
			case "Debugger.disable":
				exactKeys(request.params, [], "Debugger.disable parameters");
				this.respond(request, () => this.disable());
				return true;
			case "Debugger.getScriptSource":
				this.respond(request, () => this.getScriptSource(request.params));
				return true;
			case "Debugger.searchInContent":
				this.respond(request, () => this.searchInContent(request.params));
				return true;
			case "Debugger.evaluateOnCallFrame":
				this.respond(request, () => this.evaluateOnCallFrame(request.params));
				return true;
			case "Debugger.pause":
				exactKeys(request.params, [], "Debugger.pause parameters");
				this.respond(request, () => this.pause());
				return true;
			case "Debugger.resume":
				this.respond(request, () => this.resume(request.params));
				return true;
			default:
				this.forwardNative(request);
				return true;
		}
	}
	/** Release source and debugger subscriptions. */
	close() {
		if (this.closed) return;
		this.closed = true;
		this.unsubscribeRealms();
		this.detachCapabilities();
		this.callFrameRealms.clear();
		this.scripts.clear();
		this.runtime.releaseProjectedGroup("backtrace");
	}
	async enable(params) {
		exactKeys(params, ["maxScriptsCacheSize"], "Debugger.enable parameters");
		if (this.enabled) return {};
		const maxScriptsCacheSize = params.maxScriptsCacheSize;
		if (maxScriptsCacheSize !== void 0 && (typeof maxScriptsCacheSize !== "number" || !Number.isFinite(maxScriptsCacheSize) || maxScriptsCacheSize < 0)) throw new Error("Debugger.enable maxScriptsCacheSize must be a non-negative number");
		const enableRequest = maxScriptsCacheSize === void 0 ? {} : { maxScriptsCacheSize };
		this.debuggerEnableRequest = enableRequest;
		this.enabled = true;
		try {
			for (const realm of this.realms.all()) this.attachCapabilities(realm);
			const results = await Promise.all(this.realms.all().map(async (realm) => realm.debugger.state === "supported" ? realm.debugger.backend.enable(enableRequest) : {}));
			await Promise.all(this.realms.all().map(async (realm) => this.publishCatalog(realm)));
			return mergeResults(results);
		} catch (error) {
			this.enabled = false;
			this.debuggerEnableRequest = {};
			this.detachCapabilities();
			this.scripts.clear();
			await Promise.allSettled(this.realms.all().map(async (realm) => {
				if (realm.debugger.state === "supported") await realm.debugger.backend.disable();
			}));
			throw error;
		}
	}
	async disable() {
		this.enabled = false;
		this.debuggerEnableRequest = {};
		this.detachCapabilities();
		this.callFrameRealms.clear();
		this.scripts.clear();
		this.runtime.releaseProjectedGroup("backtrace");
		return mergeResults(await Promise.all(this.realms.all().map(async (realm) => realm.debugger.state === "supported" ? realm.debugger.backend.disable() : {})));
	}
	async getScriptSource(params) {
		exactKeys(params, ["scriptId"], "Debugger.getScriptSource parameters");
		if (typeof params.scriptId !== "string") throw new Error("Debugger.getScriptSource requires scriptId");
		const route = this.scripts.resolve(params.scriptId);
		if (route !== void 0) return { scriptSource: await route.source.getScriptSource(route.script.scriptKey) };
		if (this.scripts.wasUnsupported(params.scriptId) || params.scriptId.startsWith("client:")) throw new Error("Client script is no longer available");
		return this.native.request("Debugger.getScriptSource", params);
	}
	async searchInContent(params) {
		exactKeys(params, [
			"scriptId",
			"query",
			"caseSensitive",
			"isRegex"
		], "Debugger.searchInContent parameters");
		if (typeof params.scriptId !== "string" || typeof params.query !== "string") throw new Error("Debugger.searchInContent requires scriptId and query");
		if (params.caseSensitive !== void 0 && typeof params.caseSensitive !== "boolean") throw new Error("Debugger.searchInContent caseSensitive must be a boolean");
		if (params.isRegex !== void 0 && typeof params.isRegex !== "boolean") throw new Error("Debugger.searchInContent isRegex must be a boolean");
		const route = this.scripts.resolve(params.scriptId);
		if (route === void 0) {
			if (this.scripts.wasUnsupported(params.scriptId) || params.scriptId.startsWith("client:")) throw new Error("Client script is no longer available");
			return this.native.request("Debugger.searchInContent", params);
		}
		return { result: searchLines(await route.source.getScriptSource(route.script.scriptKey), params.query, params.caseSensitive === true, params.isRegex === true) };
	}
	async evaluateOnCallFrame(params) {
		const parsed = parseCallFrameEvaluation(params);
		if (parsed.callFrameId.startsWith("client:")) throw new Error("Client native debugging is unavailable");
		const realm = this.callFrameRealms.get(parsed.callFrameId) ?? this.supportedDebugger();
		const objectGroup = parsed.objectGroup ?? "backtrace";
		const completion = await debuggerBackend(realm).evaluateOnCallFrame({
			...parsed,
			objectGroup
		});
		return this.runtime.projectCompletion(realm, completion, objectGroup);
	}
	async pause() {
		const supported = this.realms.all().filter((realm) => realm.debugger.state === "supported");
		if (supported.length === 0) throw new Error("Debugger.pause is unsupported by every active realm");
		return mergeResults(await Promise.all(supported.map(async (realm) => debuggerBackend(realm).pause())));
	}
	async resume(params) {
		exactKeys(params, ["terminateOnResume"], "Debugger.resume parameters");
		const request = optionalBoolean(params, "terminateOnResume");
		const supported = this.realms.all().filter((realm) => realm.debugger.state === "supported");
		if (supported.length === 0) throw new Error("Debugger.resume is unsupported by every active realm");
		return mergeResults(await Promise.all(supported.map(async (realm) => debuggerBackend(realm).resume(request))));
	}
	forwardNative(request) {
		let params;
		try {
			const unsupported = this.unsupportedRoute(request.params);
			if (unsupported !== void 0) throw new Error(unsupported);
			params = this.runtime.nativeParameters(request.params);
		} catch (error) {
			sendCdpFailure(this.transport, request, error);
			return;
		}
		respondToCdpRequest(this.transport, request, async () => this.native.request(request.method, params));
	}
	unsupportedRoute(params) {
		const scriptId = requestScriptId(params);
		if (scriptId !== void 0) {
			const route = this.scripts.resolve(scriptId);
			if (route?.realm.debugger.state === "unsupported") return route.realm.debugger.reason;
			if (route === void 0 && this.scripts.wasUnsupported(scriptId)) return "Client script is no longer available";
		}
		if (typeof params.url === "string") {
			const route = this.scripts.byUrl(params.url);
			if (route?.realm.debugger.state === "unsupported") return route.realm.debugger.reason;
		}
		if (typeof params.urlRegex === "string") {
			const route = this.scripts.byUrlPattern(params.urlRegex);
			if (route?.realm.debugger.state === "unsupported") return route.realm.debugger.reason;
		}
		if (typeof params.scriptHash === "string") {
			const route = this.scripts.byHash(params.scriptHash);
			if (route?.realm.debugger.state === "unsupported") return route.realm.debugger.reason;
		}
		if (typeof params.objectId === "string") {
			const route = this.runtime.objectRoute(params.objectId);
			if (route?.realm.debugger.state === "unsupported") return route.realm.debugger.reason;
		}
	}
	receiveRealm(event) {
		if (event.type === "opened") {
			if (this.enabled) this.enableRealm(event.session).catch((error) => {
				console.error(`Inspector could not enable Debugger realm ${event.session.descriptor.label}:`, error);
			});
			return;
		}
		this.sourceDisposers.get(event.session.descriptor.realmId)?.();
		this.sourceDisposers.delete(event.session.descriptor.realmId);
		this.debuggerDisposers.get(event.session.descriptor.realmId)?.();
		this.debuggerDisposers.delete(event.session.descriptor.realmId);
		for (const [callFrameId, realm] of this.callFrameRealms) if (realm === event.session) this.callFrameRealms.delete(callFrameId);
		this.scripts.removeRealm(event.session);
	}
	async enableRealm(realm) {
		this.attachCapabilities(realm);
		if (realm.debugger.state === "supported") await realm.debugger.backend.enable(this.debuggerEnableRequest);
		await this.publishCatalog(realm);
	}
	attachCapabilities(realm) {
		if (realm.sources.state === "supported" && !this.sourceDisposers.has(realm.descriptor.realmId)) {
			const source = realm.sources.backend;
			this.sourceDisposers.set(realm.descriptor.realmId, source.subscribe((script) => {
				if (this.enabled) this.publishScript(realm, source, script);
			}));
		}
		if (realm.debugger.state === "supported" && !this.debuggerDisposers.has(realm.descriptor.realmId)) this.debuggerDisposers.set(realm.descriptor.realmId, realm.debugger.backend.subscribe((event) => {
			if (this.enabled) this.publishDebuggerEvent(realm, event);
		}));
	}
	async publishCatalog(realm) {
		if (!this.enabled || realm.sources.state === "unsupported") return;
		const scripts = await realm.sources.backend.listScripts();
		for (const script of scripts) this.publishScript(realm, realm.sources.backend, script);
	}
	publishScript(realm, source, script) {
		if (this.scripts.register({
			realm,
			source,
			script
		}).fresh) this.transport.send(scriptParsedEvent(realm, script));
	}
	publishDebuggerEvent(realm, event) {
		if (event.type === "paused") for (const frame of event.callFrames) this.callFrameRealms.set(frame.callFrameId, realm);
		else if (event.type === "resumed") {
			for (const [callFrameId, owner] of this.callFrameRealms) if (owner === realm) this.callFrameRealms.delete(callFrameId);
			this.runtime.releaseProjectedGroup("backtrace");
		}
		this.transport.send(debuggerEvent(realm, event, this.runtime));
	}
	supportedDebugger() {
		const realm = this.realms.all().find((candidate) => candidate.debugger.state === "supported");
		if (realm === void 0) throw new Error("No active realm supports call-frame evaluation");
		return realm;
	}
	detachCapabilities() {
		for (const dispose of this.sourceDisposers.values()) dispose();
		this.sourceDisposers.clear();
		for (const dispose of this.debuggerDisposers.values()) dispose();
		this.debuggerDisposers.clear();
	}
	respond(request, operation) {
		respondToCdpRequest(this.transport, request, operation);
	}
};
function debuggerBackend(realm) {
	if (realm.debugger.state === "unsupported") throw new Error(realm.debugger.reason);
	return realm.debugger.backend;
}
function mergeResults(results) {
	const merged = {};
	for (const result of results) Object.assign(merged, result);
	return merged;
}
function searchLines(source, query, caseSensitive, isRegex) {
	const expression = isRegex ? new RegExp(query, caseSensitive ? "u" : "iu") : void 0;
	const expected = caseSensitive ? query : query.toLowerCase();
	const result = [];
	for (const [lineNumber, lineContent] of source.split("\n").entries()) if (expression?.test(lineContent) ?? (caseSensitive ? lineContent : lineContent.toLowerCase()).includes(expected)) result.push({
		lineNumber,
		lineContent
	});
	return result;
}
//#endregion
//#region lib/types/worker/cdp/domains/native.js
/** Explicit adapter for Host-only native CDP methods during realm migration. */
/** Forwards one explicit Host-native domain through a transport-neutral Node session. */
var HostNativeDomainSession = class {
	transport;
	target;
	unsubscribe;
	constructor(transport, target) {
		this.transport = transport;
		this.target = target;
		this.unsubscribe = target.subscribe((message) => {
			if (!this.owns(message.method) || message.method === "Runtime.consoleAPICalled" || message.method === "Runtime.exceptionThrown") return;
			this.transport.send(message);
		});
	}
	/**
	* Execute one Host-native CDP request and send its correlated result.
	* @param request - Parsed request owned by a native Host domain.
	* @returns Whether this adapter owns the request's domain.
	*/
	handle(request) {
		if (!this.owns(request.method)) return false;
		respondToCdpRequest(this.transport, request, async () => this.target.request(request.method, request.params));
		return true;
	}
	/**
	* Test whether this adapter owns a CDP method.
	* @param method - CDP method name.
	* @returns Whether the method belongs to an explicit Host-native domain.
	*/
	owns(method) {
		return NATIVE_DOMAINS.has(method.slice(0, method.indexOf(".")));
	}
	/** Stop forwarding native notifications to this DevTools connection. */
	close() {
		this.unsubscribe();
	}
};
const NATIVE_DOMAINS = new Set([
	"Runtime",
	"Profiler",
	"HeapProfiler",
	"Schema"
]);
//#endregion
//#region lib/types/worker/cdp/realm-sessions.js
/** Per-DevTools-connection sessions opened from the shared realm registry. */
/** Owns exactly one backend session per active realm for one DevTools connection. */
var InspectorRealmSessionSet = class {
	realms;
	/** Opaque identity shared by every domain and object table on this DevTools connection. */
	connectionId = inspectorId(randomUUID(), "connectionId");
	sessions = /* @__PURE__ */ new Map();
	listeners = /* @__PURE__ */ new Set();
	unsubscribeRealms;
	closed = false;
	constructor(realms) {
		this.realms = realms;
		for (const realm of realms.realms()) this.open(realm);
		this.unsubscribeRealms = realms.subscribe((event) => {
			this.receiveRealm(event);
		});
	}
	/**
	* Return active sessions in the registry's deterministic order.
	* @returns Host followed by connected Clients.
	*/
	all() {
		return this.realms.realms().map((realm) => this.sessions.get(realm.descriptor.realmId)).filter((session) => session !== void 0);
	}
	/**
	* Return the required Host session.
	* @returns The connection-local Host realm session.
	*/
	host() {
		const session = this.sessions.get(this.realms.host.descriptor.realmId);
		if (session === void 0) throw new Error("Host Inspector realm session is unavailable");
		return session;
	}
	/**
	* Resolve one synthetic Client context.
	* @param contextId - Numeric CDP execution-context id.
	* @returns Its realm session when currently connected.
	*/
	byContextId(contextId) {
		const realm = this.realms.byContextId(contextId);
		return realm === void 0 ? void 0 : this.sessions.get(realm.descriptor.realmId);
	}
	/**
	* Resolve one globally unique Client context.
	* @param uniqueId - CDP unique execution-context id.
	* @returns Its realm session when currently connected.
	*/
	byUniqueContextId(uniqueId) {
		const realm = this.realms.byUniqueContextId(uniqueId);
		return realm === void 0 ? void 0 : this.sessions.get(realm.descriptor.realmId);
	}
	/**
	* Resolve one active source generation to this connection's realm session.
	* @param source - Source identity retained by a Cordis tree node.
	* @returns The matching realm session.
	*/
	bySource(source) {
		const realm = this.realms.bySource(source);
		return realm === void 0 ? void 0 : this.sessions.get(realm.descriptor.realmId);
	}
	/**
	* Subscribe to connection-local realm session lifecycle.
	* @param listener - Session observer.
	* @returns A disposer removing the observer.
	*/
	subscribe(listener) {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}
	/** Close all realm sessions and stop tracking the registry. */
	close() {
		if (this.closed) return;
		this.closed = true;
		this.unsubscribeRealms();
		for (const session of this.sessions.values()) session.close();
		this.sessions.clear();
		this.listeners.clear();
	}
	receiveRealm(event) {
		if (event.type === "opened") {
			const session = this.open(event.realm);
			this.emit({
				type: "opened",
				session
			});
			return;
		}
		const session = this.sessions.get(event.realm.descriptor.realmId);
		if (session === void 0) return;
		this.sessions.delete(event.realm.descriptor.realmId);
		session.close();
		this.emit({
			type: "closed",
			session
		});
	}
	open(realm) {
		const session = realm.openSession();
		this.sessions.set(realm.descriptor.realmId, session);
		return session;
	}
	emit(event) {
		for (const listener of [...this.listeners]) try {
			listener(event);
		} catch {}
	}
};
//#endregion
//#region lib/types/worker/cdp/session.js
/** One DevTools connection: explicit local-domain routing plus a private Host V8 session. */
/** Per-connection CDP dispatcher. */
var CdpSession = class {
	transport;
	target;
	sources;
	network;
	cordisTrees;
	realms;
	nativeDomains;
	runtime;
	debugger;
	dom;
	diagnosticsEnabled = false;
	unsubscribeSources;
	constructor(transport, target, sources, network, realmRegistry, domBackend, cordisTrees) {
		this.transport = transport;
		this.target = target;
		this.sources = sources;
		this.network = network;
		this.cordisTrees = cordisTrees;
		this.realms = new InspectorRealmSessionSet(realmRegistry);
		const native = this.realms.host().nativeDomains;
		if (native.state === "unsupported") throw new Error(native.reason);
		this.nativeDomains = new HostNativeDomainSession(transport, native.backend);
		this.runtime = new RuntimeDomainSession(transport, this.realms);
		this.debugger = new DebuggerDomainSession(transport, this.realms, this.runtime);
		this.dom = new CordisDomSession(transport, domBackend, this.runtime);
		this.runtime.setObjectObserver((objectId, realm, reference, group) => this.dom.bindObject(objectId, realm, reference, group));
		this.unsubscribeSources = sources.subscribeStatus(() => {
			if (this.diagnosticsEnabled) this.sendEvent("DSHInspector.sourcesChanged", { sources: this.sources.describe() });
		});
	}
	/**
	* Parse and dispatch one raw CDP request. Invalid frames close this client only.
	* @param value - Untrusted decoded WebSocket payload.
	*/
	receive(value) {
		let request;
		try {
			request = parseCdpRequest(value);
		} catch {
			this.transport.close();
			return;
		}
		try {
			if (request.method === "Runtime.releaseObject") this.dom.releaseObject(request.params.objectId);
			if (request.method === "Runtime.releaseObjectGroup") this.dom.releaseObjectGroup(request.params.objectGroup);
			if (this.dom.handle(request)) return;
			if (this.runtime.handle(request)) return;
			if (this.debugger.handle(request)) return;
			if (this.nativeDomains.owns(request.method)) {
				this.nativeDomains.handle({
					...request,
					params: this.runtime.nativeParameters(request.params)
				});
				return;
			}
			let result;
			if (request.method.startsWith("Network.")) result = this.network.handle(request.method, request.params, this);
			else if (request.method === "DSHInspector.enable") {
				this.diagnosticsEnabled = true;
				result = { sources: this.sources.describe() };
			} else if (request.method === "DSHInspector.disable") {
				this.diagnosticsEnabled = false;
				result = {};
			} else if (request.method === "DSHInspector.getSources") result = { sources: this.sources.describe() };
			else if (request.method === "DSHInspector.getCordisTree") {
				this.cordisTrees.getTree().then((tree) => {
					this.transport.send({
						id: request.id,
						result: { tree }
					});
				}, (error) => {
					this.transport.send(cdpError(request.id, -32e3, error instanceof Error ? error.message : String(error)));
				});
				return;
			} else {
				result = handleScaffold(request, this.target);
				if (result === CDP_METHOD_NOT_HANDLED) {
					this.transport.send(cdpError(request.id, -32601, `Method not found: ${request.method}`));
					return;
				}
			}
			this.transport.send({
				id: request.id,
				result
			});
		} catch (error) {
			this.transport.send(cdpError(request.id, -32e3, error instanceof Error ? error.message : String(error)));
		}
	}
	/** Push one CDP event. */
	sendEvent(method, params) {
		this.transport.send({
			method,
			params
		});
	}
	/** Release every connection-owned V8 and domain resource. */
	close() {
		this.unsubscribeSources();
		this.network.detach(this);
		this.dom.close();
		this.runtime.close();
		this.debugger.close();
		this.nativeDomains.close();
		this.realms.close();
	}
};
//#endregion
//#region lib/types/worker/bridge/endpoint.js
/** Worker-owned HTTP discovery, DevTools CDP, and Client-ingest endpoints. */
/** Worker-owned network endpoint. */
var InspectorEndpoint = class {
	config;
	sources;
	network;
	realms;
	cordisDom;
	cordisTrees;
	queries;
	server;
	cdpServer;
	ingestServer;
	cdpSessions = /* @__PURE__ */ new Map();
	ingestConnections = /* @__PURE__ */ new Map();
	constructor(config, sources, network, realms, cordisDom, cordisTrees, queries) {
		this.config = config;
		this.sources = sources;
		this.network = network;
		this.realms = realms;
		this.cordisDom = cordisDom;
		this.cordisTrees = cordisTrees;
		this.queries = queries;
		this.cdpServer = new WebSocketServer({
			noServer: true,
			maxPayload: config.maxSourceFrameBytes
		});
		this.ingestServer = new WebSocketServer({
			noServer: true,
			maxPayload: config.maxSourceFrameBytes
		});
	}
	/**
	* Bind the loopback endpoint.
	* @returns The actual bound address and target id.
	*/
	async start() {
		let candidate = this.config.startPort;
		while (true) {
			const server = this.createServer();
			this.server = server;
			try {
				const address = await listen(server, candidate, this.config.host);
				server.on("error", () => {});
				return {
					host: this.config.host,
					port: address.port,
					targetId: this.config.targetId
				};
			} catch (error) {
				this.server = void 0;
				if (!isAddressInUse(error) || candidate === 0) throw error;
				if (candidate === 65535) throw new Error(`inspector: no available port from ${String(this.config.startPort)} through 65535`, { cause: error });
				candidate += 1;
			}
		}
	}
	/** Stop admission, dispose CDP sessions, terminate sockets, and await server close. */
	async close() {
		const server = this.requireServer();
		for (const [socket, session] of this.cdpSessions) {
			session.close();
			socket.terminate();
		}
		this.cdpSessions.clear();
		for (const [socket, connection] of this.ingestConnections) {
			this.sources.disconnect(connection, "Client ingest endpoint stopped");
			socket.terminate();
		}
		this.ingestConnections.clear();
		await Promise.all([
			closeWebSocketServer(this.cdpServer),
			closeWebSocketServer(this.ingestServer),
			new Promise((resolve) => {
				server.close(() => {
					resolve();
				});
				server.closeAllConnections();
			})
		]);
	}
	handleHttp(request, response) {
		const pathname = new URL(request.url ?? "/", "http://inspector.invalid").pathname;
		if (pathname === "/json" || pathname === "/json/list") {
			this.json(response, [this.target()]);
			return;
		}
		if (pathname === "/json/version") {
			this.json(response, {
				Browser: "dsh-experimental-inspector/0",
				"Protocol-Version": "1.3",
				webSocketDebuggerUrl: this.cdpUrl()
			});
			return;
		}
		response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
		response.end("not found");
	}
	handleUpgrade(request, socket, head) {
		let pathname;
		try {
			pathname = new URL(request.url ?? "/", "http://inspector.invalid").pathname;
		} catch {
			socket.destroy();
			return;
		}
		if (pathname === `/devtools/page/${this.config.targetId}`) {
			this.cdpServer.handleUpgrade(request, socket, head, (ws) => {
				this.acceptCdp(ws);
			});
			return;
		}
		if (pathname === "/ingest") {
			if (!this.authorizedClient(request)) {
				socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
				return;
			}
			this.ingestServer.handleUpgrade(request, socket, head, (ws) => {
				this.acceptIngest(ws);
			});
			return;
		}
		socket.destroy();
	}
	acceptCdp(socket) {
		const session = new CdpSession({
			send: (payload) => {
				if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(payload));
			},
			close: () => {
				socket.close(1008, "invalid CDP request");
			}
		}, {
			targetId: this.config.targetId,
			title: "DeepSeek Harness Host"
		}, this.sources, this.network, this.realms, this.cordisDom, this.cordisTrees);
		this.cdpSessions.set(socket, session);
		socket.on("message", (data) => {
			try {
				session.receive(JSON.parse(rawText(data)));
			} catch {
				socket.close(1008, "CDP frame must be JSON");
			}
		});
		socket.once("close", () => {
			this.cdpSessions.delete(socket);
			session.close();
		});
		socket.on("error", () => {});
	}
	acceptIngest(socket) {
		const queryPeer = this.queries.open({
			send: (frame) => {
				if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(frame));
			},
			close: (code, reason) => {
				socket.close(code, reason);
			}
		});
		const connection = {
			kind: "client",
			send: (frame) => {
				if (socket.readyState !== socket.OPEN) return;
				socket.send(JSON.stringify(frame));
				if (frame.t === "source/accepted") queryPeer.accept(frame.sourceId, frame.generation);
			},
			close: (code, reason) => {
				socket.close(code, reason.slice(0, 123));
			}
		};
		this.ingestConnections.set(socket, connection);
		socket.on("message", (data) => {
			try {
				const value = JSON.parse(rawText(data));
				if (!queryPeer.receive(value)) this.sources.receive(connection, value);
			} catch {
				connection.close(1008, "source frame must be JSON");
			}
		});
		socket.once("close", () => {
			this.ingestConnections.delete(socket);
			queryPeer.close();
			this.sources.disconnect(connection, "Client source disconnected");
		});
		socket.on("error", () => {});
	}
	authorizedClient(request) {
		if (!(request.headers["sec-websocket-protocol"] ?? "").split(",").map((value) => value.trim()).includes(this.config.clientToken)) return false;
		const origin = request.headers.origin;
		if (origin === void 0) return true;
		if (this.config.clientOrigins.includes(origin)) return true;
		try {
			const hostname = new URL(origin).hostname;
			return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
		} catch {
			return false;
		}
	}
	target() {
		return {
			id: this.config.targetId,
			type: "page",
			title: "DeepSeek Harness Host",
			description: "Experimental cross-realm Inspector target",
			url: "dsh://host",
			webSocketDebuggerUrl: this.cdpUrl(),
			devtoolsFrontendUrl: `devtools://devtools/bundled/devtools_app.html?ws=${this.config.host}:${this.boundPort()}/devtools/page/${this.config.targetId}&panel=elements&noJavaScriptCompletion=true`
		};
	}
	cdpUrl() {
		return `ws://${this.config.host}:${String(this.boundPort())}/devtools/page/${this.config.targetId}`;
	}
	boundPort() {
		const address = this.requireServer().address();
		if (address === null || typeof address === "string") throw new Error("inspector: endpoint is not bound to a TCP port");
		return address.port;
	}
	createServer() {
		const server = createServer((request, response) => {
			this.handleHttp(request, response);
		});
		server.on("upgrade", (request, socket, head) => {
			this.handleUpgrade(request, socket, head);
		});
		return server;
	}
	requireServer() {
		if (this.server === void 0) throw new Error("inspector: endpoint is not started");
		return this.server;
	}
	json(response, value) {
		response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
		response.end(JSON.stringify(value));
	}
};
function listen(server, port, host) {
	return new Promise((resolve, reject) => {
		const finish = () => {
			server.off("error", onError);
			server.off("listening", onListening);
		};
		const onError = (error) => {
			finish();
			reject(error);
		};
		const onListening = () => {
			finish();
			const address = server.address();
			if (address === null || typeof address === "string") {
				reject(/* @__PURE__ */ new Error("inspector: endpoint did not bind a TCP port"));
				return;
			}
			resolve(address);
		};
		server.once("error", onError);
		server.once("listening", onListening);
		server.listen(port, host);
	});
}
function isAddressInUse(error) {
	return error instanceof Error && error.code === "EADDRINUSE";
}
function rawText(data) {
	return (data instanceof ArrayBuffer ? Buffer.from(new Uint8Array(data)) : Array.isArray(data) ? Buffer.concat(data) : data).toString("utf8");
}
function closeWebSocketServer(server) {
	return new Promise((resolve) => {
		server.close(() => {
			resolve();
		});
	});
}
//#endregion
//#region lib/types/shared/bridge/messages/query/codec.js
/**
* Test whether a decoded carrier value belongs to the query request protocol.
* @param value - Decoded carrier value.
* @returns Whether the query request decoder owns the value.
*/
function isInspectorQueryRequestEnvelope(value) {
	return isPlainObject(value) && value.t === "query/request";
}
/**
* Decode one source-to-Worker query request.
* @param value - Untrusted decoded carrier value.
* @returns The detached, validated request frame.
*/
function parseInspectorQueryRequestFrame(value) {
	const record = exactObject(value, [
		"v",
		"t",
		"sourceId",
		"generation",
		"requestId",
		"query"
	], "query request");
	if (record.v !== 0 || record.t !== "query/request") throw new Error("inspector protocol: invalid query request envelope");
	return {
		v: 0,
		t: "query/request",
		sourceId: wireId(record.sourceId, "sourceId"),
		generation: wireId(record.generation, "generation"),
		requestId: wireId(record.requestId, "requestId"),
		query: parseQuery(record.query)
	};
}
/**
* Decode correlation fields used to reject a malformed request without timing out its caller.
* @param value - Candidate query request frame.
* @returns Validated source and request identities.
*/
function parseInspectorQueryFrameIdentity(value) {
	if (!isPlainObject(value) || value.v !== 0 || value.t !== "query/request") throw new Error("inspector protocol: invalid query request envelope");
	return {
		sourceId: wireId(value.sourceId, "sourceId"),
		generation: wireId(value.generation, "generation"),
		requestId: wireId(value.requestId, "requestId")
	};
}
function parseQuery(value) {
	const record = exactObject(value, ["op"], "Inspector query");
	if (record.op !== "cordis-tree/get") throw new Error(`inspector protocol: unknown query operation ${JSON.stringify(record.op)}`);
	return { op: "cordis-tree/get" };
}
//#endregion
//#region lib/types/worker/inspection/cordis-query.js
/** Cordis tree query execution independent of its source carrier. */
/**
* Execute one closed Inspector query against the shared semantic reader.
* @param reader - Latest committed Cordis tree reader.
* @param query - Validated query command.
* @returns The result corresponding to the query operation.
*/
async function executeInspectorQuery(reader, query) {
	return {
		op: query.op,
		tree: await reader.getTree()
	};
}
//#endregion
//#region lib/types/worker/inspection/query-router.js
/** Worker-side admission, execution, and bounded settlement of non-CDP queries. */
/** Creates isolated query peers over one shared semantic reader. */
var InspectorQueryRouter = class {
	reader;
	maxFrameBytes;
	peers = /* @__PURE__ */ new Set();
	activeBySource = /* @__PURE__ */ new Map();
	constructor(reader, maxFrameBytes) {
		this.reader = reader;
		this.maxFrameBytes = maxFrameBytes;
	}
	/**
	* Create query state for one Host MessagePort or Client WebSocket.
	* @param transport - Carrier response and rejection operations.
	* @returns The peer that receives frames from this carrier only.
	*/
	open(transport) {
		const peer = new InspectorQueryPeer(this.reader, this.maxFrameBytes, transport, (accepted) => {
			for (const [sourceId, active] of this.activeBySource) if (active.peer === peer) this.activeBySource.delete(sourceId);
			this.activeBySource.set(accepted.sourceId, {
				...accepted,
				peer
			});
		}, (accepted) => this.activeBySource.get(accepted.sourceId)?.peer === peer && this.activeBySource.get(accepted.sourceId)?.generation === accepted.generation, () => {
			this.peers.delete(peer);
			for (const [sourceId, active] of this.activeBySource) if (active.peer === peer) this.activeBySource.delete(sourceId);
		});
		this.peers.add(peer);
		return peer;
	}
	/**
	* Revoke query access when the source registry closes one generation.
	* @param source - Closed source generation.
	*/
	disconnect(source) {
		const active = this.activeBySource.get(source.sourceId);
		if (active?.generation !== source.generation) return;
		this.activeBySource.delete(source.sourceId);
		active.peer.revoke(source.sourceId, source.generation);
	}
	/** Revoke every peer during Worker shutdown. */
	close() {
		for (const peer of [...this.peers]) peer.close();
		this.activeBySource.clear();
	}
};
/** Query protocol state associated with exactly one source carrier. */
var InspectorQueryPeer = class {
	reader;
	maxFrameBytes;
	transport;
	register;
	isRegistered;
	unregister;
	accepted;
	inFlight = /* @__PURE__ */ new Map();
	closed = false;
	constructor(reader, maxFrameBytes, transport, register, isRegistered, unregister) {
		this.reader = reader;
		this.maxFrameBytes = maxFrameBytes;
		this.transport = transport;
		this.register = register;
		this.isRegistered = isRegistered;
		this.unregister = unregister;
	}
	/**
	* Admit the source generation after the source registry accepts it.
	* @param sourceId - Stable source identity.
	* @param generation - Active carrier generation.
	*/
	accept(sourceId, generation) {
		if (this.closed) return;
		this.accepted = {
			sourceId,
			generation
		};
		this.inFlight.clear();
		this.register(this.accepted);
	}
	/**
	* Revoke one generation while leaving its carrier available for a later source/open.
	* @param sourceId - Stable source identity.
	* @param generation - Generation being removed by the source registry.
	*/
	revoke(sourceId, generation) {
		if (this.accepted?.sourceId !== sourceId || this.accepted.generation !== generation) return;
		this.accepted = void 0;
		this.inFlight.clear();
	}
	/**
	* Consume a decoded carrier value when it belongs to the query protocol.
	* @param value - Untrusted source-to-Worker value.
	* @returns Whether this peer owned the value.
	*/
	receive(value) {
		if (!isInspectorQueryRequestEnvelope(value)) return false;
		let frame;
		try {
			frame = parseInspectorQueryRequestFrame(value);
			if (jsonByteLength(frame) > this.maxFrameBytes) throw new Error(`inspector protocol: query request exceeds ${String(this.maxFrameBytes)} bytes`);
		} catch (error) {
			this.rejectMalformed(value, renderError$1(error));
			return true;
		}
		const accepted = this.accepted;
		if (this.closed || accepted === void 0 || !this.isRegistered(accepted) || accepted.sourceId !== frame.sourceId || accepted.generation !== frame.generation) {
			this.sendFailure(frame, "stale-source", "Inspector query does not belong to the accepted source generation");
			return true;
		}
		if (this.inFlight.has(frame.requestId)) {
			this.sendFailure(frame, "invalid-request", "Inspector query requestId is already in flight");
			return true;
		}
		this.inFlight.set(frame.requestId, accepted);
		this.execute(frame, accepted);
		return true;
	}
	/** Stop this peer and suppress completion from in-flight readers. */
	close() {
		if (this.closed) return;
		this.closed = true;
		this.accepted = void 0;
		this.inFlight.clear();
		this.unregister();
	}
	async execute(frame, accepted) {
		try {
			const result = await executeInspectorQuery(this.reader, frame.query);
			if (!this.canReply(frame, accepted)) return;
			const response = {
				v: 0,
				t: "query/response",
				sourceId: frame.sourceId,
				generation: frame.generation,
				requestId: frame.requestId,
				outcome: {
					ok: true,
					result
				}
			};
			if (jsonByteLength(response) > this.maxFrameBytes) {
				this.sendFailure(frame, "result-too-large", `Inspector query result exceeds ${String(this.maxFrameBytes)} bytes`);
				return;
			}
			this.deliver(response);
		} catch (error) {
			if (this.canReply(frame, accepted)) this.sendFailure(frame, "internal-error", renderError$1(error).message);
		} finally {
			if (this.inFlight.get(frame.requestId) === accepted) this.inFlight.delete(frame.requestId);
		}
	}
	rejectMalformed(value, error) {
		try {
			const identity = parseInspectorQueryFrameIdentity(value);
			this.sendFailure(identity, "invalid-request", error.message);
		} catch {
			this.rejectTransport(1008, error.message);
		}
	}
	sendFailure(frame, code, message) {
		if (this.closed) return;
		const response = {
			v: 0,
			t: "query/response",
			sourceId: frame.sourceId,
			generation: frame.generation,
			requestId: frame.requestId,
			outcome: {
				ok: false,
				error: {
					code,
					message
				}
			}
		};
		if (jsonByteLength(response) > this.maxFrameBytes) {
			this.rejectTransport(1009, "Inspector query error exceeds the frame limit");
			return;
		}
		this.deliver(response);
	}
	canReply(frame, accepted) {
		return !this.closed && this.accepted === accepted && this.isRegistered(accepted) && this.inFlight.get(frame.requestId) === accepted;
	}
	deliver(frame) {
		try {
			this.transport.send(frame);
		} catch (error) {
			this.rejectTransport(1011, renderError$1(error).message);
		}
	}
	rejectTransport(code, reason) {
		this.close();
		try {
			this.transport.close(code, reason.slice(0, 123));
		} catch {}
	}
};
function renderError$1(error) {
	return error instanceof Error ? error : new Error(String(error));
}
//#endregion
//#region lib/types/worker/realms/client/values.js
/** Conversion from Client wire values to realm-neutral Runtime values. */
/**
* Convert one Client completion and all nested objects.
* @param result - Successful Client Runtime command result.
* @param mapScriptKey - Realm-wide script identity mapper.
* @returns A realm-neutral Runtime completion.
*/
function clientCompletion(result, mapScriptKey) {
	return {
		result: clientRemoteObject(result.completion.result),
		...result.completion.exceptionDetails === void 0 ? {} : { exceptionDetails: clientException(result.completion.exceptionDetails, mapScriptKey) }
	};
}
/**
* Convert one Client property descriptor and all nested objects.
* @param value - Client wire property descriptor.
* @returns A realm-neutral property descriptor.
*/
function clientProperty(value) {
	const { value: propertyValue, get, set, symbol, ...descriptor } = value;
	return {
		...descriptor,
		...propertyValue === void 0 ? {} : { value: clientRemoteObject(propertyValue) },
		...get === void 0 ? {} : { get: clientRemoteObject(get) },
		...set === void 0 ? {} : { set: clientRemoteObject(set) },
		...symbol === void 0 ? {} : { symbol: clientRemoteObject(symbol) }
	};
}
/**
* Convert one Client internal property descriptor.
* @param value - Client wire internal property.
* @returns A realm-neutral internal property.
*/
function clientInternalProperty(value) {
	return {
		name: value.name,
		...value.value === void 0 ? {} : { value: clientRemoteObject(value.value) }
	};
}
/**
* Convert Client exception details and their optional object.
* @param value - Client wire exception details.
* @param mapScriptKey - Realm-wide script identity mapper.
* @returns Realm-neutral exception details.
*/
function clientException(value, mapScriptKey) {
	const { exception, ...details } = value;
	return {
		...details,
		...value.stackTrace === void 0 ? {} : { stackTrace: clientStackTrace(value.stackTrace, mapScriptKey) },
		...exception === void 0 ? {} : { exception: clientRemoteObject(exception) }
	};
}
/**
* Convert a Client Console event recursively.
* @param value - Client wire Console event.
* @param mapScriptKey - Realm-wide script identity mapper.
* @returns A realm-neutral Console event.
*/
function clientConsoleEvent(value, mapScriptKey) {
	if (value.type === "console-api") return {
		type: value.type,
		event: {
			...value.event,
			arguments: value.event.arguments.map(clientRemoteObject),
			...value.event.stackTrace === void 0 ? {} : { stackTrace: clientStackTrace(value.event.stackTrace, mapScriptKey) }
		}
	};
	return {
		type: value.type,
		event: {
			...value.event,
			details: clientException(value.event.details, mapScriptKey)
		}
	};
}
/**
* Convert a Client RemoteObject into the backend-neutral handle slot.
* @param value - Client wire RemoteObject.
* @returns A realm-neutral Runtime value.
*/
function clientRemoteObject(value) {
	return {
		descriptor: value.descriptor,
		...value.object === void 0 ? {} : { object: { handle: backendHandle$1(value.object.handle) } },
		...value.semanticReference === void 0 ? {} : { semanticReference: value.semanticReference }
	};
}
/**
* Rebrand a common backend handle for the Client transport that owns it.
* @param value - Backend handle from a routed Runtime request.
* @returns The same opaque text under its Client wire role.
*/
function clientHandle(value) {
	return inspectorId(value, "Client object handle");
}
function backendHandle$1(value) {
	return inspectorId(value, "Runtime backend object handle");
}
function clientStackTrace(value, mapScriptKey) {
	return {
		...value,
		callFrames: value.callFrames.map((frame) => ({
			...frame,
			...frame.scriptKey === void 0 ? {} : { scriptKey: mapScriptKey(frame.scriptKey) }
		})),
		...value.parent === void 0 ? {} : { parent: clientStackTrace(value.parent, mapScriptKey) }
	};
}
//#endregion
//#region lib/types/worker/realms/client/console.js
/** ConsoleBackend over the typed Client Console event transport. */
/** Adapts session-local Client Console events to common Runtime values. */
var ClientConsoleBackend = class {
	target;
	sessionId;
	router;
	scriptIds;
	disposers = /* @__PURE__ */ new Set();
	constructor(target, sessionId, router, scriptIds) {
		this.target = target;
		this.sessionId = sessionId;
		this.router = router;
		this.scriptIds = scriptIds;
	}
	subscribe(listener) {
		const dispose = this.router.subscribeConsole(this.target, this.sessionId, (event) => {
			listener(clientConsoleEvent(event, (scriptKey) => this.scriptIds.toRuntime(scriptKey)));
		});
		this.disposers.add(dispose);
		return () => {
			if (!this.disposers.delete(dispose)) return;
			dispose();
		};
	}
	async clear() {}
	/** Disable every active Console subscription for this connection. */
	close() {
		for (const dispose of this.disposers) dispose();
		this.disposers.clear();
	}
};
//#endregion
//#region lib/types/worker/realms/client/runtime.js
/** RuntimeBackend over the typed Worker-to-Client transport. */
/** Adapts one connection-local Client Runtime session to the common backend API. */
var ClientRuntimeBackend = class {
	target;
	sessionId;
	router;
	scriptIds;
	closed = false;
	constructor(target, sessionId, router, scriptIds) {
		this.target = target;
		this.sessionId = sessionId;
		this.router = router;
		this.scriptIds = scriptIds;
	}
	enable() {
		return Promise.resolve();
	}
	disable() {
		this.router.closeTargetSession(this.target, this.sessionId);
		return Promise.resolve();
	}
	async evaluate(request) {
		assertClientEvaluationOptions(request);
		const { context: _context, throwOnSideEffect: _throwOnSideEffect, serializationOptions: _serializationOptions, ...supported } = request;
		return clientCompletion(expectResult$1(await this.request({
			op: "evaluate",
			...supported
		}), "evaluate"), (scriptKey) => this.scriptIds.toRuntime(scriptKey));
	}
	async getProperties(request) {
		const result = expectResult$1(await this.request({
			op: "get-properties",
			...request,
			handle: clientHandle(request.handle)
		}), "get-properties");
		return {
			properties: result.properties.map(clientProperty),
			...result.internalProperties === void 0 ? {} : { internalProperties: result.internalProperties.map(clientInternalProperty) },
			...result.exceptionDetails === void 0 ? {} : { exceptionDetails: clientException(result.exceptionDetails, (scriptKey) => this.scriptIds.toRuntime(scriptKey)) }
		};
	}
	async callFunction(request) {
		assertClientCallOptions(request);
		const { receiver, context: _context, arguments: args, throwOnSideEffect: _throwOnSideEffect, serializationOptions: _serializationOptions, ...options } = request;
		const command = {
			op: "call-function",
			...options,
			...receiver === void 0 ? {} : { receiver: clientHandle(receiver) },
			...args === void 0 ? {} : { arguments: args.map(argumentToClient) }
		};
		return clientCompletion(expectResult$1(await this.request(command), "call-function"), (scriptKey) => this.scriptIds.toRuntime(scriptKey));
	}
	async awaitPromise(request) {
		return clientCompletion(expectResult$1(await this.request({
			op: "await-promise",
			...request,
			promise: clientHandle(request.promise)
		}), "await-promise"), (scriptKey) => this.scriptIds.toRuntime(scriptKey));
	}
	async globalLexicalScopeNames(context) {
		if (context !== void 0) throw new Error("Client Runtime does not support native execution contexts");
		return expectResult$1(await this.request({ op: "global-lexical-scope-names" }), "global-lexical-scope-names").names;
	}
	async releaseObject(handle) {
		expectResult$1(await this.request({
			op: "release-object",
			handle: clientHandle(handle)
		}), "release-object");
	}
	async releaseObjectGroup(group) {
		expectResult$1(await this.request({
			op: "release-object-group",
			objectGroup: group
		}), "release-object-group");
	}
	/** Close this connection's session and reject further requests. */
	close() {
		if (this.closed) return;
		this.closed = true;
		this.router.closeTargetSession(this.target, this.sessionId);
	}
	request(command) {
		if (this.closed) return Promise.reject(/* @__PURE__ */ new Error("Client realm session is closed"));
		return this.router.request(this.target, this.sessionId, command);
	}
};
function argumentToClient(value) {
	return value.kind === "object" ? {
		kind: "object",
		handle: clientHandle(value.handle)
	} : value;
}
function expectResult$1(result, operation) {
	if (result.op !== operation) throw new Error(`Client Runtime returned ${result.op} for ${operation}`);
	return result;
}
function assertClientEvaluationOptions(request) {
	if (request.context !== void 0) throw new Error("Client Runtime does not support native execution contexts");
	if (request.throwOnSideEffect === true) throw new Error("Client Runtime does not support throwOnSideEffect");
	if (request.serializationOptions !== void 0) throw new Error("Client Runtime does not support serializationOptions");
	if (request.disableBreaks === true) throw new Error("Client Runtime does not support disableBreaks");
	if (request.allowUnsafeEvalBlockedByCSP === true) throw new Error("Client Runtime cannot bypass the page Content Security Policy");
	if (request.timeoutMs !== void 0 && request.awaitPromise !== true) throw new Error("Client Runtime supports timeout only when awaitPromise is enabled");
}
function assertClientCallOptions(request) {
	if (request.context !== void 0) throw new Error("Client Runtime does not support native execution contexts");
	if (request.throwOnSideEffect === true) throw new Error("Client Runtime does not support throwOnSideEffect");
	if (request.serializationOptions !== void 0) throw new Error("Client Runtime does not support serializationOptions");
	if (request.userGesture === true) throw new Error("Client Runtime does not support userGesture");
}
//#endregion
//#region lib/types/worker/realms/client/sources.js
/** Client SourceBackend over the bounded browser source-catalog transport. */
/** Presents one Client bundle catalog through the common read-only source model. */
var ClientSourceBackend = class {
	target;
	sessionId;
	router;
	scriptIds;
	scripts = /* @__PURE__ */ new Map();
	catalog;
	closed = false;
	constructor(target, sessionId, router, scriptIds) {
		this.target = target;
		this.sessionId = sessionId;
		this.router = router;
		this.scriptIds = scriptIds;
	}
	async listScripts() {
		if (this.closed) throw new Error("Client source session is closed");
		this.catalog ??= this.loadCatalog();
		return this.catalog;
	}
	async getScriptSource(scriptKey) {
		const route = await this.route(scriptKey);
		const source = await this.read(route.localKey, "source");
		if (source === void 0) throw new Error("Client script source is unavailable");
		return source;
	}
	async getSourceMap(scriptKey) {
		const route = await this.route(scriptKey);
		return this.read(route.localKey, "source-map");
	}
	subscribe(_listener) {
		return () => {};
	}
	/** Reject pending reads owned by this DevTools connection. */
	close() {
		if (this.closed) return;
		this.closed = true;
		this.router.closeSession(this.target.source, this.sessionId);
		this.scripts.clear();
	}
	async loadCatalog() {
		return expectResult(await this.router.request(this.target.source, this.sessionId, { op: "list-scripts" }), "list-scripts").scripts.map((script) => this.register(script));
	}
	register(script) {
		const scriptKey = this.scriptIds.toRuntime(script.scriptKey);
		const descriptor = {
			...script,
			scriptKey,
			executionContextId: this.target.contextId
		};
		this.scripts.set(scriptKey, { localKey: script.scriptKey });
		return descriptor;
	}
	async route(scriptKey) {
		await this.listScripts();
		const route = this.scripts.get(scriptKey);
		if (route === void 0) throw new Error("Client script is no longer available");
		return route;
	}
	async read(scriptKey, content) {
		const chunks = [];
		let offset = 0;
		while (true) {
			const result = expectResult(await this.router.request(this.target.source, this.sessionId, {
				op: "get-content-chunk",
				scriptKey,
				content,
				offset,
				maxBytes: this.router.chunkBytes
			}), "get-content-chunk");
			if (!result.available) return void 0;
			const bytes = Buffer.from(result.data, "base64");
			if (bytes.byteLength > this.router.chunkBytes || result.nextOffset !== offset + bytes.byteLength || !result.eof && result.nextOffset === offset || result.nextOffset > this.router.maxContentBytes) throw new Error("Client source returned an invalid content chunk");
			chunks.push(bytes);
			offset = result.nextOffset;
			if (result.eof) break;
		}
		return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
	}
};
function expectResult(result, operation) {
	if (result.op !== operation) throw new Error(`Client source returned ${result.op} for ${operation}`);
	return result;
}
//#endregion
//#region lib/types/worker/realms/client/scripts.js
/** Realm-stable translation between Client catalog keys and common Runtime script keys. */
/** Allocates one shared script identity namespace for all backends in a Client realm. */
var ClientScriptIdentity = class {
	contextId;
	publicByLocal = /* @__PURE__ */ new Map();
	constructor(contextId) {
		this.contextId = contextId;
	}
	/**
	* Convert a Client-local key to the realm's public Runtime script key.
	* @param localKey - Script key used on the Client wire.
	* @returns Stable key shared by this realm's Runtime, Console, and Sources backends.
	*/
	toRuntime(localKey) {
		let scriptKey = this.publicByLocal.get(localKey);
		if (scriptKey !== void 0) return scriptKey;
		scriptKey = inspectorId(`client:${String(Math.abs(this.contextId))}:${String(this.publicByLocal.size + 1)}`, "scriptKey");
		this.publicByLocal.set(localKey, scriptKey);
		return scriptKey;
	}
};
//#endregion
//#region lib/types/worker/realms/client/bridge.js
/** Worker-side bridge dependencies for one connected Client realm. */
/**
* Bind one Client source generation to the Worker bridge services that can address it.
* @param target - Active Client source generation and execution context.
* @param runtime - Runtime and Console RPC router.
* @param sources - Source-catalog RPC router.
* @returns The immutable Client realm bridge.
*/
function createClientRealmBridge(target, runtime, sources) {
	return {
		target,
		runtime,
		sources
	};
}
//#endregion
//#region lib/types/worker/realms/client/debugger.js
/** Explicit Client debugger capability until a pause-safe page agent exists. */
/**
* Report the unavailable Client debugger backend.
* @returns The typed unsupported result used by every Client realm session.
*/
function clientDebuggerCapability() {
	return {
		state: "unsupported",
		reason: "Client native debugging is unavailable"
	};
}
//#endregion
//#region lib/types/worker/realms/client/index.js
/** Client realm definition assembled from independent Runtime, Console, and Source backends. */
const CLIENT_RUNTIME_OPERATIONS = [
	"evaluate",
	"get-properties",
	"call-function",
	"await-promise",
	"release-object",
	"release-object-group",
	"global-lexical-scope-names"
];
/** Active Client realm exposed through the common Worker realm model. */
var ClientInspectorRealm = class {
	descriptor;
	context;
	capabilities;
	scriptIds;
	bridge;
	constructor(target, runtimeRouter, sourceRouter) {
		this.bridge = createClientRealmBridge(target, runtimeRouter, sourceRouter);
		this.descriptor = {
			realmId: inspectorId(randomUUID(), "realmId"),
			sourceId: target.source.sourceId,
			generation: target.source.generation,
			kind: "client",
			label: target.source.label
		};
		this.context = {
			kind: "synthetic",
			id: target.contextId,
			uniqueId: target.uniqueContextId,
			origin: target.capability.origin
		};
		this.scriptIds = new ClientScriptIdentity(target.contextId);
		this.capabilities = {
			runtime: CLIENT_RUNTIME_OPERATIONS,
			console: supports(target, "client-console") ? [
				"events",
				"exceptions",
				"clear"
			] : [],
			sources: supports(target, "client-sources") ? [
				"catalog",
				"content",
				"source-map"
			] : [],
			debugger: []
		};
	}
	/** Active source generation represented by this realm. */
	get target() {
		return this.bridge.target;
	}
	/** Open one isolated set of Client backends for a DevTools connection. */
	openSession() {
		const runtimeSessionId = inspectorId(randomUUID(), "runtimeSessionId");
		const runtime = new ClientRuntimeBackend(this.target, runtimeSessionId, this.bridge.runtime, this.scriptIds);
		const console = supports(this.target, "client-console") ? new ClientConsoleBackend(this.target, runtimeSessionId, this.bridge.runtime, this.scriptIds) : void 0;
		const sources = supports(this.target, "client-sources") ? new ClientSourceBackend(this.target, inspectorId(randomUUID(), "sourceSessionId"), this.bridge.sources, this.scriptIds) : void 0;
		return {
			descriptor: this.descriptor,
			context: this.context,
			runtime: {
				state: "supported",
				backend: runtime
			},
			console: console === void 0 ? {
				state: "unsupported",
				reason: "Client source does not provide Console events"
			} : {
				state: "supported",
				backend: console
			},
			sources: sources === void 0 ? {
				state: "unsupported",
				reason: "Client source does not provide a script catalog"
			} : {
				state: "supported",
				backend: sources
			},
			debugger: clientDebuggerCapability(),
			nativeDomains: {
				state: "unsupported",
				reason: "Client realm has no native CDP transport"
			},
			close: () => {
				console?.close();
				sources?.close();
				runtime.close();
			}
		};
	}
};
function supports(target, capability) {
	return target.source.capabilities.some((candidate) => candidate.type === capability);
}
//#endregion
//#region lib/types/worker/inspection/realm-store.js
/** Worker-owned registry of Host and Client realm definitions. */
/** Authoritative collection of all currently executable realms. */
var InspectorRealmRegistry = class {
	host;
	clients;
	clientSources;
	clientsBySource = /* @__PURE__ */ new Map();
	listeners = /* @__PURE__ */ new Set();
	unsubscribeClients;
	constructor(host, clients, clientSources) {
		this.host = host;
		this.clients = clients;
		this.clientSources = clientSources;
		for (const target of clients.targets()) this.openClient(target);
		this.unsubscribeClients = clients.subscribe((event) => {
			this.receiveClient(event);
		});
	}
	/**
	* Return the realm admission order used by every connection-local session set.
	* @returns Host followed by active Clients.
	*/
	realms() {
		return [this.host, ...this.clientsBySource.values()];
	}
	/**
	* Resolve one synthetic Client execution context.
	* @param contextId - Numeric CDP execution-context id.
	* @returns The active realm when the id belongs to a Client.
	*/
	byContextId(contextId) {
		for (const realm of this.clientsBySource.values()) if (realm.context.kind === "synthetic" && realm.context.id === contextId) return realm;
	}
	/**
	* Resolve one globally unique Client execution context.
	* @param uniqueId - CDP unique execution-context id.
	* @returns The active realm when the id belongs to a Client.
	*/
	byUniqueContextId(uniqueId) {
		for (const realm of this.clientsBySource.values()) if (realm.context.kind === "synthetic" && realm.context.uniqueId === uniqueId) return realm;
	}
	/**
	* Resolve the realm for one active source generation.
	* @param source - Source identity retained by a Cordis tree node.
	* @returns The matching active realm.
	*/
	bySource(source) {
		if (source.kind === "host") return this.host;
		const realm = this.clientsBySource.get(source.sourceId);
		return realm?.descriptor.generation === source.generation ? realm : void 0;
	}
	/**
	* Subscribe to Client realm admission and removal.
	* @param listener - Registry observer.
	* @returns A disposer removing the observer.
	*/
	subscribe(listener) {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}
	/** Stop observing Client targets and clear registry listeners. */
	close() {
		this.unsubscribeClients();
		this.clientsBySource.clear();
		this.listeners.clear();
	}
	receiveClient(event) {
		if (event.type === "opened") {
			const realm = this.openClient(event.target);
			this.emit({
				type: "opened",
				realm
			});
			return;
		}
		const realm = this.clientsBySource.get(event.target.source.sourceId);
		if (realm === void 0 || realm.target !== event.target) return;
		this.clientsBySource.delete(event.target.source.sourceId);
		this.emit({
			type: "closed",
			realm
		});
	}
	openClient(target) {
		const realm = new ClientInspectorRealm(target, this.clients, this.clientSources);
		this.clientsBySource.set(target.source.sourceId, realm);
		return realm;
	}
	emit(event) {
		for (const listener of [...this.listeners]) try {
			listener(event);
		} catch {}
	}
};
//#endregion
//#region lib/types/worker/realms/host/values.js
/** Small validators for values returned by Node's native Inspector protocol. */
/**
* Test whether a native protocol value is a non-array object record.
* @param value - Native protocol value.
* @returns Whether the value can be read as named fields.
*/
function isNativeRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
/**
* Require a native protocol object record.
* @param value - Native protocol value.
* @param label - Subject named in the validation error.
* @returns The validated object record.
*/
function requireNativeRecord(value, label) {
	if (!isNativeRecord(value)) throw new Error(`${label} must be an object`);
	return value;
}
/**
* Include an optional field only when the native request supplied a value.
* @param key - Native protocol field name.
* @param value - Optional field value.
* @returns An empty record or the requested field.
*/
function optionalNativeField(key, value) {
	return value === void 0 ? {} : { [key]: value };
}
//#endregion
//#region lib/types/worker/realms/host/bridge.js
/** Per-DevTools-connection bridge to the Host main thread's real V8 inspector target. */
/** Connection-local carrier for requests and notifications from the Host V8 inspector. */
var HostInspectorSession = class {
	contextName;
	session = new Session();
	listeners = /* @__PURE__ */ new Set();
	connected = false;
	failure;
	constructor(contextName) {
		this.contextName = contextName;
		this.session.on("inspectorNotification", (message) => {
			const rewritten = this.rewriteContextName(message);
			for (const listener of [...this.listeners]) try {
				listener(rewritten);
			} catch {}
		});
	}
	/**
	* Subscribe to native inspector notifications.
	* @param listener - Consumer owned by one Worker domain adapter.
	* @returns A disposer removing the consumer.
	*/
	subscribe(listener) {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}
	/**
	* Execute one Host V8 request for a Worker-owned composite Runtime operation.
	* @param method - CDP method name.
	* @param params - Validated request parameters.
	* @returns The Host inspector result.
	*/
	request(method, params) {
		const failure = this.connect();
		if (failure !== void 0) return Promise.reject(new Error(failure));
		return new Promise((resolve, reject) => {
			try {
				this.session.post(method, params, (error, result) => {
					if (error !== null) reject(error);
					else resolve(result ?? {});
				});
			} catch (error) {
				reject(new Error(renderError(error)));
			}
		});
	}
	/** Disconnect this DevTools client's V8 session. */
	close() {
		this.listeners.clear();
		if (!this.connected || this.failure !== void 0) return;
		this.connected = false;
		try {
			this.session.disconnect();
		} catch {}
	}
	connect() {
		if (this.connected) return this.failure;
		this.connected = true;
		try {
			this.session.connectToMainThread();
		} catch (error) {
			this.failure = `Host V8 inspector is unavailable: ${renderError(error)}`;
		}
		return this.failure;
	}
	rewriteContextName(message) {
		if (message.method !== "Runtime.executionContextCreated") return message;
		const params = message.params;
		const context = params?.context;
		if (typeof context !== "object" || context === null) return message;
		const record = context;
		const auxData = record.auxData;
		if (typeof auxData !== "object" || auxData === null || auxData.isDefault !== true) return message;
		return {
			method: message.method,
			params: {
				...params,
				context: {
					...record,
					name: this.contextName
				}
			}
		};
	}
};
/** Serializes accepted native notifications and isolates sibling consumers. */
var HostNotificationChannel = class {
	accepts;
	project;
	listeners = /* @__PURE__ */ new Set();
	unsubscribe;
	delivery = Promise.resolve();
	constructor(target, accepts, project) {
		this.accepts = accepts;
		this.project = project;
		this.unsubscribe = target.subscribe((message) => {
			this.receive(message);
		});
	}
	/**
	* Subscribe to projected native notifications.
	* @param listener - Consumer invoked in subscription order.
	* @returns A disposer removing the consumer.
	*/
	subscribe(listener) {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}
	/** Release the native notification subscription and all consumers. */
	close() {
		this.unsubscribe();
		this.listeners.clear();
	}
	receive(message) {
		if (!this.accepts(message)) return;
		this.delivery = this.delivery.then(async () => {
			const event = await this.project(message);
			if (event === void 0) return;
			for (const listener of [...this.listeners]) try {
				listener(event);
			} catch {}
		}).catch(() => {});
	}
};
function renderError(error) {
	return error instanceof Error ? error.message : String(error);
}
//#endregion
//#region lib/types/worker/realms/host/console.js
/** ConsoleBackend implementation over native Node Runtime notifications. */
const CONSOLE_TYPES = new Set([
	"log",
	"debug",
	"info",
	"error",
	"warning",
	"dir",
	"dirxml",
	"table",
	"trace",
	"clear",
	"startGroup",
	"startGroupCollapsed",
	"endGroup",
	"assert",
	"profile",
	"profileEnd",
	"count",
	"timeEnd"
]);
/** Converts native Runtime notifications to realm-neutral Console events. */
var HostConsoleBackend = class {
	target;
	runtime;
	events;
	constructor(target, runtime) {
		this.target = target;
		this.runtime = runtime;
		this.events = new HostNotificationChannel(target, (message) => message.method === "Runtime.consoleAPICalled" || message.method === "Runtime.exceptionThrown", async (message) => message.method === "Runtime.consoleAPICalled" ? this.consoleEvent(message.params) : this.exceptionEvent(message.params));
	}
	/**
	* Subscribe to native Console and exception events.
	* @param listener - Connection-local event consumer.
	* @returns A disposer removing the consumer.
	*/
	subscribe(listener) {
		return this.events.subscribe(listener);
	}
	async clear() {
		await this.target.request("Runtime.discardConsoleEntries", {});
	}
	/** Release the native notification subscription. */
	close() {
		this.events.close();
	}
	async consoleEvent(params) {
		const type = params?.type;
		const args = params?.args;
		const timestamp = params?.timestamp;
		const stackTrace = params?.stackTrace;
		if (!CONSOLE_TYPES.has(type) || !Array.isArray(args) || typeof timestamp !== "number") return void 0;
		return {
			type: "console-api",
			event: {
				type,
				arguments: await Promise.all(args.map((value) => this.runtime.remoteObject(value))),
				timestamp,
				...typeof params?.executionContextId === "number" ? { contextId: params.executionContextId } : {},
				...isNativeRecord(stackTrace) ? { stackTrace: this.runtime.stackTrace(stackTrace) } : {}
			}
		};
	}
	async exceptionEvent(params) {
		const timestamp = params?.timestamp;
		const exceptionDetails = params?.exceptionDetails;
		const contextId = params?.executionContextId;
		if (typeof timestamp !== "number" || exceptionDetails === void 0) return void 0;
		return {
			type: "exception",
			event: {
				timestamp,
				...typeof contextId === "number" ? { contextId } : {},
				details: await this.runtime.exceptionDetails(exceptionDetails)
			}
		};
	}
};
//#endregion
//#region lib/types/worker/realms/host/scripts.js
/** Host-native script identity conversion for normalized source and debugger values. */
/**
* Convert a Node inspector script id into the realm backend identity namespace.
* @param value - Native Node inspector script id.
* @returns The corresponding normalized script key.
*/
function hostScriptKey(value) {
	return inspectorId(value, "scriptKey");
}
//#endregion
//#region lib/types/worker/realms/host/debugger.js
/** DebuggerBackend implementation over one native Node inspector session. */
/** Native Host debugger adapted to common commands, Runtime values, and events. */
var HostDebuggerBackend = class {
	target;
	runtime;
	events;
	constructor(target, runtime) {
		this.target = target;
		this.runtime = runtime;
		this.events = new HostNotificationChannel(target, (message) => message.method === "Debugger.resumed" || message.method === "Debugger.breakpointResolved" || message.method === "Debugger.paused", async (message) => message.method === "Debugger.resumed" ? { type: "resumed" } : message.method === "Debugger.breakpointResolved" ? breakpointResolved(message.params) : this.paused(message.params));
	}
	async enable(request) {
		return this.target.request("Debugger.enable", { ...optionalNativeField("maxScriptsCacheSize", request.maxScriptsCacheSize) });
	}
	async disable() {
		return this.target.request("Debugger.disable", {});
	}
	async pause() {
		return this.target.request("Debugger.pause", {});
	}
	async resume(request) {
		return this.target.request("Debugger.resume", { ...optionalNativeField("terminateOnResume", request.terminateOnResume) });
	}
	async evaluateOnCallFrame(request) {
		return this.runtime.completion(await this.target.request("Debugger.evaluateOnCallFrame", {
			callFrameId: request.callFrameId,
			expression: request.expression,
			...optionalNativeField("objectGroup", request.objectGroup),
			...optionalNativeField("includeCommandLineAPI", request.includeCommandLineAPI),
			...optionalNativeField("silent", request.silent),
			...optionalNativeField("returnByValue", request.returnByValue),
			...optionalNativeField("generatePreview", request.generatePreview),
			...optionalNativeField("throwOnSideEffect", request.throwOnSideEffect),
			...optionalNativeField("timeout", request.timeoutMs)
		}));
	}
	subscribe(listener) {
		return this.events.subscribe(listener);
	}
	/** Release the native notification subscription. */
	close() {
		this.events.close();
	}
	async paused(params) {
		if (!Array.isArray(params?.callFrames) || typeof params.reason !== "string") return void 0;
		const callFrames = await Promise.all(params.callFrames.map(async (frame) => this.callFrame(frame)));
		const data = params.data;
		const hitBreakpoints = params.hitBreakpoints;
		return {
			type: "paused",
			callFrames,
			reason: params.reason,
			...data === void 0 || !isJsonValue(data) ? {} : { data },
			...isStringArray(hitBreakpoints) ? { hitBreakpoints } : {},
			...params.asyncStackTrace === void 0 ? {} : { asyncStackTrace: this.runtime.stackTrace(params.asyncStackTrace) }
		};
	}
	async callFrame(value) {
		const record = requireNativeRecord(value, "Host Debugger call frame");
		if (typeof record.callFrameId !== "string" || typeof record.functionName !== "string" || typeof record.url !== "string" || !Array.isArray(record.scopeChain)) throw new Error("Host Debugger returned an invalid call frame");
		return {
			callFrameId: record.callFrameId,
			functionName: record.functionName,
			...record.functionLocation === void 0 ? {} : { functionLocation: location(record.functionLocation) },
			location: location(record.location),
			url: record.url,
			scopeChain: await Promise.all(record.scopeChain.map(async (scope) => this.scope(scope))),
			thisObject: await this.runtime.remoteObject(record.this),
			...record.returnValue === void 0 ? {} : { returnValue: await this.runtime.remoteObject(record.returnValue) }
		};
	}
	async scope(value) {
		const record = requireNativeRecord(value, "Host Debugger scope");
		if (typeof record.type !== "string") throw new Error("Host Debugger returned an invalid scope");
		return {
			type: record.type,
			object: await this.runtime.remoteObject(record.object),
			...typeof record.name === "string" ? { name: record.name } : {},
			...record.startLocation === void 0 ? {} : { startLocation: location(record.startLocation) },
			...record.endLocation === void 0 ? {} : { endLocation: location(record.endLocation) }
		};
	}
};
function breakpointResolved(params) {
	if (typeof params?.breakpointId !== "string" || params.location === void 0) return void 0;
	return {
		type: "breakpoint-resolved",
		breakpointId: params.breakpointId,
		location: location(params.location)
	};
}
function location(value) {
	const record = requireNativeRecord(value, "Host Debugger location");
	if (typeof record.scriptId !== "string" || !Number.isSafeInteger(record.lineNumber)) throw new Error("Host Debugger returned an invalid location");
	if (record.columnNumber !== void 0 && !Number.isSafeInteger(record.columnNumber)) throw new Error("Host Debugger returned an invalid location column");
	return {
		scriptKey: hostScriptKey(record.scriptId),
		lineNumber: record.lineNumber,
		...record.columnNumber === void 0 ? {} : { columnNumber: record.columnNumber }
	};
}
function isStringArray(value) {
	return Array.isArray(value) && value.every((item) => typeof item === "string");
}
//#endregion
//#region lib/types/worker/realms/host/runtime.js
/** RuntimeBackend implementation over one native Node inspector session. */
/** Host Runtime adapter preserving native V8 semantics behind common values. */
var HostRuntimeBackend = class {
	target;
	defaultContextId;
	unsubscribe;
	constructor(target) {
		this.target = target;
		this.unsubscribe = target.subscribe((message) => {
			this.observeContext(message);
		});
	}
	async enable() {
		await this.target.request("Runtime.enable", {});
	}
	async disable() {
		await this.target.request("Runtime.disable", {});
		this.defaultContextId = void 0;
	}
	async evaluate(request) {
		return this.completion(await this.target.request("Runtime.evaluate", {
			expression: request.expression,
			...nativeContext(request.context, "contextId"),
			...optionalNativeField("objectGroup", request.objectGroup),
			...optionalNativeField("includeCommandLineAPI", request.includeCommandLineAPI),
			...optionalNativeField("silent", request.silent),
			...optionalNativeField("returnByValue", request.returnByValue),
			...optionalNativeField("generatePreview", request.generatePreview),
			...optionalNativeField("userGesture", request.userGesture),
			...optionalNativeField("awaitPromise", request.awaitPromise),
			...optionalNativeField("disableBreaks", request.disableBreaks),
			...optionalNativeField("replMode", request.replMode),
			...optionalNativeField("allowUnsafeEvalBlockedByCSP", request.allowUnsafeEvalBlockedByCSP),
			...optionalNativeField("throwOnSideEffect", request.throwOnSideEffect),
			...optionalNativeField("serializationOptions", request.serializationOptions),
			...optionalNativeField("timeout", request.timeoutMs)
		}));
	}
	async getProperties(request) {
		const response = await this.target.request("Runtime.getProperties", {
			objectId: request.handle,
			...optionalNativeField("ownProperties", request.ownProperties),
			...optionalNativeField("accessorPropertiesOnly", request.accessorPropertiesOnly),
			...optionalNativeField("generatePreview", request.generatePreview),
			...optionalNativeField("nonIndexedPropertiesOnly", request.nonIndexedPropertiesOnly)
		});
		return this.properties(response);
	}
	async callFunction(request) {
		const receiver = request.receiver;
		const context = receiver === void 0 ? nativeContext(request.context ?? defaultContext(this.defaultContextId), "executionContextId") : void 0;
		if (receiver === void 0 && context === void 0) throw new Error("Host Runtime default execution context is unavailable");
		return this.completion(await this.target.request("Runtime.callFunctionOn", {
			functionDeclaration: request.functionDeclaration,
			...receiver === void 0 ? context : { objectId: receiver },
			...request.arguments === void 0 ? {} : { arguments: request.arguments.map(toNativeArgument) },
			...optionalNativeField("objectGroup", request.objectGroup),
			...optionalNativeField("silent", request.silent),
			...optionalNativeField("returnByValue", request.returnByValue),
			...optionalNativeField("generatePreview", request.generatePreview),
			...optionalNativeField("userGesture", request.userGesture),
			...optionalNativeField("awaitPromise", request.awaitPromise),
			...optionalNativeField("throwOnSideEffect", request.throwOnSideEffect),
			...optionalNativeField("serializationOptions", request.serializationOptions)
		}));
	}
	async awaitPromise(request) {
		return this.completion(await this.target.request("Runtime.awaitPromise", {
			promiseObjectId: request.promise,
			...optionalNativeField("returnByValue", request.returnByValue),
			...optionalNativeField("generatePreview", request.generatePreview)
		}));
	}
	async globalLexicalScopeNames(context) {
		const response = await this.target.request("Runtime.globalLexicalScopeNames", { ...nativeContext(context ?? defaultContext(this.defaultContextId), "executionContextId") });
		if (!Array.isArray(response.names) || !response.names.every((name) => typeof name === "string")) throw new Error("Host Runtime returned invalid lexical scope names");
		return response.names;
	}
	async releaseObject(handle) {
		await this.target.request("Runtime.releaseObject", { objectId: handle });
	}
	async releaseObjectGroup(group) {
		await this.target.request("Runtime.releaseObjectGroup", { objectGroup: group });
	}
	/** Release the native-context observer owned by this backend. */
	close() {
		this.unsubscribe();
	}
	/**
	* Convert a native Runtime completion returned through another Node domain.
	* @param value - Native result and optional exception details.
	* @returns The realm-neutral completion.
	*/
	async completion(value) {
		return {
			result: await this.remoteObject(value.result),
			...value.exceptionDetails === void 0 ? {} : { exceptionDetails: await this.exceptionDetails(value.exceptionDetails) }
		};
	}
	async properties(value) {
		if (!Array.isArray(value.result)) throw new Error("Host Runtime returned invalid properties");
		return {
			properties: await Promise.all(value.result.map((item) => this.property(item))),
			...value.internalProperties === void 0 ? {} : { internalProperties: await this.internalProperties(value.internalProperties) },
			...value.privateProperties === void 0 ? {} : { privateProperties: await this.privateProperties(value.privateProperties) },
			...value.exceptionDetails === void 0 ? {} : { exceptionDetails: await this.exceptionDetails(value.exceptionDetails) }
		};
	}
	async property(value) {
		const record = requireNativeRecord(value, "Host Runtime property descriptor");
		if (typeof record.name !== "string" || typeof record.configurable !== "boolean" || typeof record.enumerable !== "boolean") throw new Error("Host Runtime returned invalid property descriptor");
		return {
			...record,
			name: record.name,
			configurable: record.configurable,
			enumerable: record.enumerable,
			...record.value === void 0 ? {} : { value: await this.remoteObject(record.value) },
			...record.get === void 0 ? {} : { get: await this.remoteObject(record.get) },
			...record.set === void 0 ? {} : { set: await this.remoteObject(record.set) },
			...record.symbol === void 0 ? {} : { symbol: await this.remoteObject(record.symbol) }
		};
	}
	async internalProperties(value) {
		if (!Array.isArray(value)) throw new Error("Host Runtime returned invalid internal properties");
		return Promise.all(value.map(async (item) => {
			const record = requireNativeRecord(item, "Host Runtime internal property");
			if (typeof record.name !== "string") throw new Error("Host Runtime returned invalid internal property");
			return {
				name: record.name,
				...record.value === void 0 ? {} : { value: await this.remoteObject(record.value) }
			};
		}));
	}
	async privateProperties(value) {
		if (!Array.isArray(value)) throw new Error("Host Runtime returned invalid private properties");
		return Promise.all(value.map(async (item) => {
			const record = requireNativeRecord(item, "Host Runtime private property");
			if (typeof record.name !== "string") throw new Error("Host Runtime returned invalid private property");
			return {
				name: record.name,
				...record.value === void 0 ? {} : { value: await this.remoteObject(record.value) },
				...record.get === void 0 ? {} : { get: await this.remoteObject(record.get) },
				...record.set === void 0 ? {} : { set: await this.remoteObject(record.set) }
			};
		}));
	}
	/**
	* Convert native exception details to the common Runtime model.
	* @param value - Native `Runtime.ExceptionDetails` fields.
	* @returns Exception details with normalized object references.
	*/
	async exceptionDetails(value) {
		const record = requireNativeRecord(value, "Host Runtime exception details");
		if (typeof record.text !== "string" || !Number.isSafeInteger(record.lineNumber) || !Number.isSafeInteger(record.columnNumber)) throw new Error("Host Runtime returned invalid exception details");
		return {
			...record,
			text: record.text,
			lineNumber: record.lineNumber,
			columnNumber: record.columnNumber,
			...record.stackTrace === void 0 ? {} : { stackTrace: this.stackTrace(record.stackTrace) },
			...record.exception === void 0 ? {} : { exception: await this.remoteObject(record.exception) }
		};
	}
	/**
	* Convert one native V8 RemoteObject to the common Runtime model.
	* @param value - Native `Runtime.RemoteObject` fields.
	* @returns Descriptor, backend handle, and optional Cordis identity.
	*/
	async remoteObject(value) {
		const record = requireNativeRecord(value, "Host Runtime RemoteObject");
		if (typeof record.type !== "string") throw new Error("Host Runtime returned an invalid RemoteObject");
		const descriptor = { ...record };
		Reflect.deleteProperty(descriptor, "objectId");
		if (!isJsonValue(descriptor)) throw new Error("Host Runtime returned a non-JSON RemoteObject descriptor");
		const objectId = typeof record.objectId === "string" ? record.objectId : void 0;
		const semanticReference = objectId === void 0 ? void 0 : await this.identifyObject(objectId);
		return {
			descriptor,
			...objectId === void 0 ? {} : { object: { handle: backendHandle(objectId) } },
			...semanticReference === void 0 ? {} : { semanticReference }
		};
	}
	/**
	* Convert a native stack trace while retaining native script identities.
	* @param value - Native `Runtime.StackTrace` fields.
	* @returns Realm-neutral stack frames.
	*/
	stackTrace(value) {
		const record = requireNativeRecord(value, "Host Runtime stack trace");
		if (!Array.isArray(record.callFrames)) throw new Error("Host Runtime returned an invalid stack trace");
		return {
			...typeof record.description === "string" ? { description: record.description } : {},
			callFrames: record.callFrames.map((frame) => {
				const fields = requireNativeRecord(frame, "Host Runtime call frame");
				if (typeof fields.functionName !== "string" || typeof fields.url !== "string" || !Number.isSafeInteger(fields.lineNumber) || !Number.isSafeInteger(fields.columnNumber)) throw new Error("Host Runtime returned an invalid call frame");
				return {
					functionName: fields.functionName,
					...typeof fields.scriptId === "string" ? { scriptKey: hostScriptKey(fields.scriptId) } : {},
					url: fields.url,
					lineNumber: fields.lineNumber,
					columnNumber: fields.columnNumber
				};
			}),
			...record.parent === void 0 ? {} : { parent: this.stackTrace(record.parent) }
		};
	}
	observeContext(message) {
		if (message.method === "Runtime.executionContextCreated") {
			const context = isNativeRecord(message.params?.context) ? message.params.context : void 0;
			const auxData = isNativeRecord(context?.auxData) ? context.auxData : void 0;
			if (context !== void 0 && auxData?.isDefault === true && Number.isSafeInteger(context.id)) this.defaultContextId = context.id;
			return;
		}
		if (message.method !== "Runtime.executionContextDestroyed") return;
		if (message.params?.executionContextId === this.defaultContextId) this.defaultContextId = void 0;
	}
	async identifyObject(objectId) {
		try {
			const response = await this.target.request("Runtime.callFunctionOn", {
				objectId,
				functionDeclaration: IDENTIFY_REALM_OBJECT_FUNCTION,
				returnByValue: true,
				silent: true
			});
			if (response.exceptionDetails !== void 0 || !isNativeRecord(response.result)) return void 0;
			return response.result.value === void 0 ? void 0 : parseInspectorObjectReference(response.result.value);
		} catch {
			return;
		}
	}
};
function defaultContext(contextId) {
	return contextId === void 0 ? void 0 : {
		kind: "numeric",
		id: contextId
	};
}
function nativeContext(context, numericKey) {
	if (context === void 0) return void 0;
	return context.kind === "numeric" ? { [numericKey]: context.id } : { uniqueContextId: context.id };
}
function toNativeArgument(value) {
	switch (value.kind) {
		case "value": return { value: value.value };
		case "unserializable": return { unserializableValue: value.value };
		case "object": return { objectId: value.handle };
		case "undefined": return {};
		default: return assertNever(value);
	}
}
function backendHandle(value) {
	return inspectorId(value, "Runtime backend object handle");
}
function assertNever(value) {
	throw new Error(`Unexpected Runtime call argument: ${JSON.stringify(value)}`);
}
//#endregion
//#region lib/types/worker/realms/host/sources.js
/** SourceBackend implementation over native Node Debugger notifications. */
/** Maintains one connection-local catalog of scripts reported by Node's inspector. */
var HostSourceBackend = class {
	target;
	scripts = /* @__PURE__ */ new Map();
	listeners = /* @__PURE__ */ new Set();
	unsubscribe;
	constructor(target) {
		this.target = target;
		this.unsubscribe = target.subscribe((message) => {
			this.receive(message);
		});
	}
	listScripts() {
		return Promise.resolve([...this.scripts.values()].map((script) => script.descriptor));
	}
	async getScriptSource(scriptKey) {
		const script = this.scripts.get(scriptKey);
		if (script === void 0) throw new Error("Host script is no longer available");
		const result = await this.target.request("Debugger.getScriptSource", { scriptId: script.nativeId });
		if (typeof result.scriptSource !== "string") throw new Error("Host Debugger returned no script source");
		return result.scriptSource;
	}
	getSourceMap(_scriptKey) {
		return Promise.resolve(void 0);
	}
	/**
	* Subscribe to scripts discovered after the initial catalog read.
	* @param listener - Consumer of newly discovered scripts.
	* @returns A disposer removing the consumer.
	*/
	subscribe(listener) {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}
	/** Release the native notification subscription and cached catalog. */
	close() {
		this.unsubscribe();
		this.scripts.clear();
		this.listeners.clear();
	}
	receive(message) {
		if (message.method !== "Debugger.scriptParsed") return;
		const params = message.params;
		if (params === void 0 || typeof params.scriptId !== "string" || typeof params.url !== "string" || !isInteger(params.startLine) || !isInteger(params.startColumn) || !isInteger(params.endLine) || !isInteger(params.endColumn)) return;
		const scriptKey = hostScriptKey(params.scriptId);
		const descriptor = {
			scriptKey,
			url: params.url,
			hash: typeof params.hash === "string" ? params.hash : "",
			...typeof params.buildId === "string" ? { buildId: params.buildId } : {},
			startLine: params.startLine,
			startColumn: params.startColumn,
			endLine: params.endLine,
			endColumn: params.endColumn,
			...typeof params.sourceMapURL === "string" && params.sourceMapURL.length > 0 ? { sourceMapUrl: params.sourceMapURL } : {},
			...isInteger(params.executionContextId) ? { executionContextId: params.executionContextId } : {},
			...typeof params.isModule === "boolean" ? { isModule: params.isModule } : {},
			...isInteger(params.length) ? { length: params.length } : {}
		};
		this.scripts.set(scriptKey, {
			descriptor,
			nativeId: params.scriptId
		});
		for (const listener of [...this.listeners]) try {
			listener(descriptor);
		} catch {}
	}
};
function isInteger(value) {
	return Number.isSafeInteger(value) && value >= 0;
}
//#endregion
//#region lib/types/worker/realms/host/index.js
/** Host realm adapter backed by a connection-local Node inspector session. */
const HOST_RUNTIME_OPERATIONS = [
	"evaluate",
	"get-properties",
	"call-function",
	"await-promise",
	"release-object",
	"release-object-group",
	"global-lexical-scope-names"
];
/** Host realm definition that opens one native V8 session per DevTools connection. */
var HostInspectorRealm = class {
	label;
	descriptor;
	context = { kind: "native" };
	capabilities = {
		runtime: HOST_RUNTIME_OPERATIONS,
		console: [
			"events",
			"exceptions",
			"clear"
		],
		sources: [
			"catalog",
			"content",
			"source-map"
		],
		debugger: [
			"breakpoint",
			"pause",
			"resume",
			"step",
			"call-frame"
		]
	};
	constructor(label) {
		this.label = label;
		this.descriptor = {
			realmId: inspectorId(randomUUID(), "realmId"),
			sourceId: inspectorId("host-runtime", "sourceId"),
			generation: inspectorId(randomUUID(), "generation"),
			kind: "host",
			label
		};
	}
	/** Open a native Host inspector session for one DevTools connection. */
	openSession() {
		const target = new HostInspectorSession(this.label);
		const runtime = new HostRuntimeBackend(target);
		const console = new HostConsoleBackend(target, runtime);
		const sources = new HostSourceBackend(target);
		const debug = new HostDebuggerBackend(target, runtime);
		return {
			descriptor: this.descriptor,
			context: this.context,
			runtime: {
				state: "supported",
				backend: runtime
			},
			console: {
				state: "supported",
				backend: console
			},
			sources: {
				state: "supported",
				backend: sources
			},
			debugger: {
				state: "supported",
				backend: debug
			},
			nativeDomains: {
				state: "supported",
				backend: target
			},
			close: () => {
				sources.close();
				debug.close();
				console.close();
				runtime.close();
				target.close();
			}
		};
	}
};
//#endregion
//#region lib/types/worker/bridge/hub.js
/** Worker-owned source generations, observation dispatch, and extension transport. */
/** Serial Worker-side owner of every Host and Client source generation. */
var InspectorSourceRegistry = class {
	consumers;
	maxFrameBytes;
	maxRecordsPerFrame;
	sources = /* @__PURE__ */ new Map();
	statusListeners = /* @__PURE__ */ new Set();
	eventListeners = /* @__PURE__ */ new Set();
	constructor(consumers, maxFrameBytes, maxRecordsPerFrame) {
		this.consumers = consumers;
		this.maxFrameBytes = maxFrameBytes;
		this.maxRecordsPerFrame = maxRecordsPerFrame;
	}
	/**
	* Parse and apply one frame; malformed input closes only its source transport.
	* @param connection - Carrier that delivered the frame.
	* @param value - Untrusted decoded frame.
	*/
	receive(connection, value) {
		try {
			const frame = parseSourceFrame(value, this.maxRecordsPerFrame);
			if (jsonByteLength(frame) > this.maxFrameBytes) throw new Error(`inspector protocol: source frame exceeds ${String(this.maxFrameBytes)} bytes`);
			this.apply(connection, frame);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			connection.send({
				v: 0,
				t: "source/rejected",
				code: "invalid-frame",
				message
			});
			connection.close(1008, message);
		}
	}
	/**
	* Remove every generation carried by a closed connection.
	* @param connection - Closed source carrier.
	* @param reason - Diagnostic propagated to domain consumers.
	*/
	disconnect(connection, reason) {
		for (const [sourceId, state] of this.sources) {
			if (state.connection !== connection) continue;
			this.sources.delete(sourceId);
			for (const consumer of this.consumers) consumer.close(state.source, reason);
			this.emit({
				type: "closed",
				source: state.source,
				reason
			});
		}
		this.notifyStatus();
	}
	/**
	* Read current source status for the diagnostic CDP domain.
	* @returns A detached status row for every active source.
	*/
	describe() {
		return [...this.sources.values()].map((state) => ({
			sourceId: state.source.sourceId,
			generation: state.source.generation,
			kind: state.source.kind,
			label: state.source.label,
			capabilities: state.source.capabilities.map((capability) => capability.type),
			expectedSequence: state.expectedSequence,
			dropped: state.dropped,
			topics: Object.fromEntries(state.topicCounts)
		}));
	}
	/**
	* Subscribe to source status changes.
	* @param listener - Status observer.
	* @returns A disposer that removes the observer.
	*/
	subscribeStatus(listener) {
		this.statusListeners.add(listener);
		return () => {
			this.statusListeners.delete(listener);
		};
	}
	/**
	* Subscribe to source admission, removal, and typed extension frames.
	* @param listener - Source protocol observer.
	* @returns A disposer that removes the observer.
	*/
	subscribeEvents(listener) {
		this.eventListeners.add(listener);
		return () => {
			this.eventListeners.delete(listener);
		};
	}
	/**
	* Send a typed control frame only to its still-active source generation.
	* @param source - Expected active source generation.
	* @param frame - Validated Worker-to-source frame.
	* @returns Whether the generation was still active and accepted the send.
	*/
	send(source, frame) {
		const state = this.sources.get(source.sourceId);
		if (state === void 0 || state.source.generation !== source.generation) return false;
		if (jsonByteLength(frame) > this.maxFrameBytes) throw new Error(`inspector protocol: Worker source frame exceeds ${String(this.maxFrameBytes)} bytes`);
		state.connection.send(frame);
		return true;
	}
	/** Close every source and forget all state. */
	close() {
		for (const state of this.sources.values()) {
			for (const consumer of this.consumers) consumer.close(state.source, "inspector worker stopped");
			this.emit({
				type: "closed",
				source: state.source,
				reason: "inspector worker stopped"
			});
		}
		this.sources.clear();
		this.notifyStatus();
	}
	apply(connection, frame) {
		if (frame.t === "source/open") {
			this.open(connection, frame.source, frame.topics);
			return;
		}
		const state = this.sources.get(frame.sourceId);
		if (state === void 0 || state.connection !== connection || state.source.generation !== frame.generation) throw new Error("inspector protocol: frame does not belong to the active source generation");
		if (frame.t === "source/close") {
			this.sources.delete(frame.sourceId);
			for (const consumer of this.consumers) consumer.close(state.source, "source closed");
			this.emit({
				type: "closed",
				source: state.source,
				reason: "source closed"
			});
			this.notifyStatus();
			return;
		}
		if (frame.t === "client-runtime/response") {
			if (state.source.kind !== "client" || !state.source.capabilities.some((capability) => capability.type === "client-runtime")) throw new Error("inspector protocol: source did not declare Client Runtime");
			this.emit({
				type: "client-runtime-response",
				source: state.source,
				frame
			});
			return;
		}
		if (frame.t === "client-console/event") {
			if (state.source.kind !== "client" || !state.source.capabilities.some((capability) => capability.type === "client-console")) throw new Error("inspector protocol: source did not declare Client Console");
			this.emit({
				type: "client-console-event",
				source: state.source,
				frame
			});
			return;
		}
		if (frame.t === "client-sources/response") {
			if (state.source.kind !== "client" || !state.source.capabilities.some((capability) => capability.type === "client-sources")) throw new Error("inspector protocol: source did not declare Client Sources");
			this.emit({
				type: "client-source-response",
				source: state.source,
				frame
			});
			return;
		}
		this.assertTopics(state, frame.records);
		if (frame.t === "source/replace") {
			state.expectedSequence = frame.nextSequence;
			for (const consumer of this.consumers) consumer.replace(state.source, frame.records.map((record, index) => ({
				...record,
				sequence: frame.nextSequence + index
			})));
			this.count(state, frame.records);
			this.notifyStatus();
			return;
		}
		const gap = frame.firstSequence - state.expectedSequence;
		if (gap < 0 || gap !== frame.droppedBefore) {
			connection.send({
				v: 0,
				t: "source/resnapshot",
				sourceId: state.source.sourceId,
				generation: state.source.generation,
				expectedSequence: state.expectedSequence,
				reason: `expected sequence ${String(state.expectedSequence)}, received ${String(frame.firstSequence)}`
			});
			return;
		}
		state.dropped += frame.droppedBefore;
		const records = frame.records.map((record, index) => ({
			...record,
			sequence: frame.firstSequence + index
		}));
		state.expectedSequence = frame.firstSequence + frame.records.length;
		for (const consumer of this.consumers) consumer.append(state.source, records);
		this.count(state, frame.records);
		connection.send({
			v: 0,
			t: "source/append-acknowledged",
			sourceId: state.source.sourceId,
			generation: state.source.generation,
			nextSequence: state.expectedSequence
		});
		this.notifyStatus();
	}
	open(connection, source, topics) {
		if (source.kind !== connection.kind) throw new Error("inspector protocol: source kind does not match its carrier");
		const accepted = new Set(topics);
		const prior = this.sources.get(source.sourceId);
		if (prior !== void 0) {
			for (const consumer of this.consumers) consumer.close(prior.source, "source generation replaced");
			this.emit({
				type: "closed",
				source: prior.source,
				reason: "source generation replaced"
			});
		}
		this.sources.set(source.sourceId, {
			source,
			topics: accepted,
			connection,
			expectedSequence: 1,
			dropped: 0,
			topicCounts: /* @__PURE__ */ new Map()
		});
		connection.send({
			v: 0,
			t: "source/accepted",
			sourceId: source.sourceId,
			generation: source.generation
		});
		this.emit({
			type: "opened",
			source
		});
		this.notifyStatus();
	}
	assertTopics(state, records) {
		for (const record of records) if (!state.topics.has("*") && !state.topics.has(record.topic)) throw new Error(`inspector protocol: source did not declare topic ${JSON.stringify(record.topic)}`);
	}
	count(state, records) {
		for (const record of records) state.topicCounts.set(record.topic, (state.topicCounts.get(record.topic) ?? 0) + 1);
	}
	notifyStatus() {
		for (const listener of [...this.statusListeners]) try {
			listener();
		} catch {}
	}
	emit(event) {
		for (const listener of [...this.eventListeners]) try {
			listener(event);
		} catch {}
	}
};
//#endregion
//#region lib/types/worker/server.js
/** Inspector Worker assembly over one Host source port and one loopback endpoint. */
/**
* Assemble and start the Worker-owned source registry, Runtime router, Network domain, and endpoints.
* @param boot - Validated Worker configuration and transferred Host source port.
* @returns The listening endpoint and quiescent shutdown owner.
*/
async function startInspectorWorker(boot) {
	const networkStore = new NetworkStore({
		maxRetainedRequests: boot.config.maxRetainedRequests,
		maxJournalBytes: boot.config.maxJournalBytes
	});
	const network = new NetworkDomain(networkStore);
	const cordisTrees = new CordisTreeStore({
		maxNodes: boot.config.maxCordisNodes,
		maxDisconnectedTrees: boot.config.maxDisconnectedCordisTrees
	});
	const sources = new InspectorSourceRegistry([networkStore, cordisTrees], boot.config.maxSourceFrameBytes, boot.config.maxSourceRecordsPerFrame);
	const clientRuntime = new ClientRuntimeRouter(sources, boot.config.clientRuntimeTimeoutMs);
	const clientSources = new ClientSourceRouter(sources, boot.config.clientRuntimeTimeoutMs, boot.config.maxClientSourceBytes, boot.config.maxSourceFrameBytes);
	const realms = new InspectorRealmRegistry(new HostInspectorRealm("Host"), clientRuntime, clientSources);
	const cordisDom = new CordisDomBackend(cordisTrees);
	const cordisReader = createCordisRuntimeTreeReader(() => cordisTrees.readTree());
	const queries = new InspectorQueryRouter(cordisReader, boot.config.maxSourceFrameBytes);
	const unsubscribeQueries = sources.subscribeEvents((event) => {
		if (event.type === "closed") queries.disconnect(event.source);
	});
	const hostQueries = queries.open({
		send: (frame) => {
			boot.hostSourcePort.postMessage(frame);
		},
		close: () => {
			boot.hostSourcePort.close();
		}
	});
	const hostConnection = {
		kind: "host",
		send: (frame) => {
			boot.hostSourcePort.postMessage(frame);
			if (frame.t === "source/accepted") hostQueries.accept(frame.sourceId, frame.generation);
		},
		close: () => {
			boot.hostSourcePort.close();
		}
	};
	boot.hostSourcePort.on("message", (value) => {
		if (!hostQueries.receive(value)) sources.receive(hostConnection, value);
	});
	boot.hostSourcePort.on("close", () => {
		hostQueries.close();
		sources.disconnect(hostConnection, "Host source disconnected");
	});
	boot.hostSourcePort.start();
	const endpointOwner = new InspectorEndpoint(boot.config, sources, network, realms, cordisDom, cordisReader, queries);
	const endpoint = await endpointOwner.start();
	let closed;
	return {
		endpoint,
		close() {
			closed ??= (async () => {
				await endpointOwner.close();
				network.close();
				networkStore.dispose();
				cordisDom.close();
				realms.close();
				clientRuntime.close();
				clientSources.close();
				hostQueries.close();
				sources.close();
				unsubscribeQueries();
				queries.close();
				boot.hostSourcePort.close();
			})();
			return closed;
		}
	};
}
//#endregion
//#region lib/types/worker/entry.js
/** Node Worker bootstrap for the experimental Inspector. */
if (parentPort === null) throw new Error("experimental inspector: Worker entry loaded on the main thread");
const controlPort = parentPort;
const bootData = workerData;
if (!isPlainObject(bootData) || !(bootData.hostSourcePort instanceof MessagePort)) throw new Error("experimental inspector: invalid Worker boot data");
const boot = {
	hostSourcePort: bootData.hostSourcePort,
	config: parseInspectorWorkerConfig(bootData.config)
};
let runtime;
let stopping;
const stop = () => {
	stopping ??= (async () => {
		await runtime?.close();
		controlPort.postMessage({ type: "stopped" });
		controlPort.close();
	})();
	return stopping;
};
controlPort.on("message", (message) => {
	try {
		parseInspectorHostControl(message);
		stop();
	} catch (error) {
		controlPort.postMessage({
			type: "failure",
			message: error instanceof Error ? error.message : String(error)
		});
	}
});
try {
	runtime = await startInspectorWorker(boot);
	controlPort.postMessage({
		type: "ready",
		...runtime.endpoint
	});
} catch (error) {
	controlPort.postMessage({
		type: "failure",
		message: error instanceof Error ? error.message : String(error)
	});
	await stop();
}
//#endregion
export {};
