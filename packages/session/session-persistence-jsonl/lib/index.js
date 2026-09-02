import { createRequire } from "node:module";
import z from "@deepseek-ai/schemastery";
import { readdirSync } from "node:fs";
import { link, mkdir, mkdtemp, open, readFile, readdir, realpath, rm, stat, truncate } from "node:fs/promises";
import { dirname, join, parse, resolve, toNamespacedPath } from "node:path";
import { performance } from "node:perf_hooks";
import { scheduler } from "node:timers/promises";
import { randomBytes } from "node:crypto";
import { SessionAlreadyExistsError, SessionAlreadyOwnedError, SessionFormatUnsupportedError, SessionHandleClosedError, SessionPersistence, SessionPersistenceCorruptionError, SessionPersistenceNotFoundError, SessionPersistenceRevision, SessionReadOnlyError, assertContiguous, assertStoredId, assertVersion, materializeAppendBatch, materializeCreateHeader, sessionFormatVersionRefusal, validateStoredEvents } from "@deepseek-ai/dsh-session-persistence";
import { Service } from "@deepseek-ai/cordis";
import { SESSION_FORMAT_VERSION, SessionLogOffset, decodeSeqRanges, decodeStorageRecord, encodeSeqRanges, packChunkRuns } from "@deepseek-ai/dsh-session";
import { constants, createZstdDecompress, zstdCompress, zstdDecompress, zstdDecompressSync } from "node:zlib";
import { promisify } from "node:util";
import { constants as constants$1 } from "node:buffer";
//#region ../../typert/protocol/src/remote-error.ts
/**
* One Remote call failure: a real Error carrying its stable code and typed
* details. Owners throw it at the failure point; the Host Gateway encodes it
* onto the wire unchanged; the Client face rebuilds an instance for the
* `RemoteResult` error branch, so `throw result.error` keeps throw semantics.
* Discrimination is always by `code`, never by instanceof.
*/
var RemoteError = class extends Error {
	code;
	details;
	/** Structural marker: cross-realm/bundle identification never uses instanceof. */
	isDSHRemoteError = true;
	/**
	* @param code - stable failure code declared in {@link RemoteErrorDetailsMap}.
	* @param message - human diagnostic carried across the wire.
	* @param details - structured payload typed by the code.
	* @param options - standard Error options (`cause` survives in-process only).
	*/
	constructor(code, message, details, options) {
		super(message, options);
		this.code = code;
		this.details = details;
		this.name = "RemoteError";
	}
};
//#endregion
//#region ../../typert/protocol/src/index.ts
/**
* Remote decorators and explicit Gateway bindings backed by versioned
* descriptors carried on decorated class prototypes. Strict reflection
* remains a Typert compiler responsibility.
* @module @deepseek-ai/dsh-typert-protocol
*/
const TYPERT_REMOTE_SEGMENT_PATTERN = /^[A-Za-z0-9_$.-]+$/;
/**
* Test one generated Remote name against the Connection endpoint grammar.
* @param value - namespace, method, lookup, or Context segment.
* @returns whether the value can cross the shared RPC carrier unchanged.
*/
function isTypertRemoteSegment(value) {
	return value !== "." && value !== ".." && TYPERT_REMOTE_SEGMENT_PATTERN.test(value);
}
const REMOTE_METHOD_DESCRIPTOR = "@deepseek-ai/dsh-typert-protocol/remote-methods";
/**
* Bind one visible Service field to a Cordis key and Remote namespace.
* @param service - owning Service instance, normally `this`.
* @param serviceKey - exact Cordis service key.
* @param options - optional distinct wire namespace.
* @returns a frozen, inspectable binding with no compiler-injected metadata.
*/
function bindTypertRemote(service, serviceKey, options = {}) {
	validateName("service key", serviceKey);
	const namespace = options.namespace ?? serviceKey;
	validateName("namespace", namespace);
	return Object.freeze({
		service,
		serviceKey,
		namespace
	});
}
/** Cordis Service base that exposes its registered name through Typert Gateway. */
var TypertRemoteService = class extends Service {
	/** Visible binding consumed by the Gateway's source-mode discovery. */
	typertRemote;
	/**
	* Register the Service and bind the same key to Typert Gateway.
	* @param ctx - owning Cordis Context.
	* @param serviceKey - exact Cordis service key and default wire namespace.
	* @param options - optional distinct wire namespace.
	*/
	constructor(ctx, serviceKey, options = {}) {
		super(ctx, serviceKey);
		this.typertRemote = bindTypertRemote(this, this.name, options);
	}
};
function Remote(methodExportOrOptions, context) {
	if (typeof methodExportOrOptions === "string") {
		validateName("Remote export name", methodExportOrOptions);
		return remoteDecorator({ kind: "direct" }, void 0, methodExportOrOptions);
	}
	if (typeof methodExportOrOptions === "object") {
		if (remoteOptionMode(methodExportOrOptions) !== "stream" || Reflect.ownKeys(methodExportOrOptions).length !== 1) throw new TypeError("typert-protocol: Remote options must contain exactly mode: \"stream\"");
		return remoteDecorator({ kind: "direct" }, "stream");
	}
	if (context === void 0) throw new TypeError("typert-protocol: Remote decorator context is missing");
	addMarkerInitializer(context, { kind: "direct" });
}
function remoteOptionMode(options) {
	return Reflect.get(options, "mode");
}
function remoteDecorator(invocation, mode, exportName) {
	return function(_method, context) {
		addMarkerInitializer(context, invocation, mode, exportName);
	};
}
function readRemoteMethodDescriptor(prototype) {
	const property = Object.getOwnPropertyDescriptor(prototype, REMOTE_METHOD_DESCRIPTOR);
	if (property === void 0) return void 0;
	const descriptor = property.value;
	if (descriptor === null || typeof descriptor !== "object") throw new TypeError("typert-protocol: Remote method descriptor must be an object");
	const version = Reflect.get(descriptor, "version");
	if (version !== 1) throw new TypeError(`typert-protocol: unsupported Remote method descriptor version ${String(version)}`);
	const methods = Reflect.get(descriptor, "methods");
	if (!Array.isArray(methods)) throw new TypeError("typert-protocol: Remote method descriptor methods must be an array");
	return descriptor;
}
function addMarkerInitializer(context, invocation, mode, exportName) {
	if (context.private || context.static || typeof context.name !== "string") throw new TypeError("typert-protocol: Remote decorators require a public instance method with a string name");
	const method = context.name;
	context.addInitializer(function() {
		const prototype = Object.getPrototypeOf(this);
		if (prototype === null) throw new TypeError(`typert-protocol: cannot mark Remote method "${method}" on an object without a prototype`);
		mark(prototype, method, invocation, mode, exportName);
	});
}
function mark(prototype, method, invocation, mode, exportName) {
	const descriptor = readRemoteMethodDescriptor(prototype);
	const marker = Object.freeze({
		method,
		...exportName === void 0 || exportName === method ? {} : { exportName },
		...mode === void 0 ? {} : { mode },
		invocation: Object.freeze(invocation)
	});
	const current = descriptor?.methods.find((candidate) => candidate.method === method);
	if (current !== void 0) {
		if (current.exportName === marker.exportName && current.mode === marker.mode && sameInvocation(current.invocation, invocation)) return;
		throw new Error(`typert-protocol: Remote method "${method}" has conflicting invocation markers`);
	}
	Object.defineProperty(prototype, REMOTE_METHOD_DESCRIPTOR, {
		configurable: true,
		value: Object.freeze({
			version: 1,
			methods: Object.freeze([...descriptor?.methods ?? [], marker])
		})
	});
}
function sameInvocation(left, right) {
	if (left.kind === "direct") return right.kind === "direct";
	if (right.kind === "direct") return false;
	return left.context === right.context;
}
function validateName(subject, value) {
	if (!isTypertRemoteSegment(value)) throw new TypeError(`typert-protocol: ${subject} must contain only RPC endpoint segment characters`);
}
//#endregion
//#region ../../util/values/src/index.ts
/**
* Deep-freeze an object graph in place while leaving live AbortSignal objects mutable.
* @param value - value to freeze.
* @returns the same value after every reachable enumerable child is frozen.
*/
function deepFreeze(value) {
	const seen = /* @__PURE__ */ new WeakSet();
	const pending = [{
		kind: "visit",
		node: value
	}];
	while (pending.length > 0) {
		const task = pending.pop();
		/* v8 ignore next -- the loop condition guarantees one pending task. */
		if (task === void 0) continue;
		if (task.kind === "property") {
			pending.push({
				kind: "visit",
				node: task.source[task.key]
			});
			continue;
		}
		const node = task.node;
		if (node === null || typeof node !== "object") continue;
		if (node instanceof AbortSignal) continue;
		if (seen.has(node)) continue;
		seen.add(node);
		Object.freeze(node);
		const keys = Object.keys(node);
		for (let index = keys.length - 1; index >= 0; index--) {
			const key = keys[index];
			/* v8 ignore next -- the loop is bounded by the captured key count. */
			if (key === void 0) continue;
			pending.push({
				kind: "property",
				source: node,
				key
			});
		}
	}
	return value;
}
//#endregion
//#region ../../llm/llm/src/message.ts
/**
* Detach and deep-freeze a message whose identity already exists.
* @param message - complete message, including its stable identity.
* @returns an immutable snapshot that preserves the identity.
*/
function freezeMessage(message) {
	return deepFreeze(structuredClone(message));
}
//#endregion
//#region ../../util/timeout/src/index.ts
/** Largest delay Node schedules without clamping it to one millisecond. */
const MAX_TIMER_DELAY_MS = 2147483647;
//#endregion
//#region ../../llm/llm/src/error.ts
/**
* Harness error base with a stable machine-routable code and chained cause.
* Package errors extend it so tool results and replay can retain failure class.
* @module @deepseek-ai/dsh-llm/error
*/
/**
* Base class for all harness errors. Carries a `code` (stable, programmatic —
* e.g. `NO_ADAPTER`, `INVALID_ARGS`, `INVARIANT`) distinct from the
* human-readable `message`, and supports `cause` chaining via the standard
* `ErrorOptions`. `name` defaults to the subclass constructor name.
*/
var HarnessError = class extends Error {
	/** Stable machine-routable failure class (e.g. `RATE_LIMIT`); route on this, never by parsing `message`. */
	code;
	constructor(message, code, options) {
		super(message, options);
		this.code = code;
		this.name = new.target.name;
	}
};
/**
* Canonical provider-neutral code for a response that completed normally but
* carried no content blocks at all. Providers occasionally emit a degenerate
* completion (a terminal stop with zero output); adapters classify it as this
* failure instead of yielding an empty assistant message, because an empty
* message silently ends the turn with nothing for the user or the loop to act
* on. The attempt produced nothing durable, so retry policy treats it as safe
* to repeat.
*/
const EMPTY_RESPONSE_CODE = "EMPTY_RESPONSE";
new RegExp(String.raw`(?:^|[^a-z0-9])context[\s_-](?:length|window)[\s_-]` + String.raw`(?:exceed(?:ed|s)?|overflow(?:ed)?|limit[\s_-]exceeded)(?:$|[^a-z0-9])`, "i");
new RegExp(String.raw`\b(?:request|prompt|input|messages?)\s+(?:is\s+|are\s+)?` + String.raw`too\s+(?:large|long)\s+for\s+(?:(?:this|the)\s+)?` + String.raw`(?:model(?:'s)?\s+)?context(?:\s+window)?\b`, "i");
new RegExp(String.raw`\b(?:input|prompt|request|messages?)\b.{0,40}` + String.raw`\b(?:exceed(?:s|ed)?|overflows?|is\s+larger\s+than)\b.{0,40}` + String.raw`\b(?:the\s+)?(?:model(?:'s)?\s+)?context(?:\s+(?:length|window))?\b`, "i");
/**
* Render a thrown value with its full `cause` chain and AggregateError
* members, so transport wrappers like undici's `TypeError: fetch failed`
* surface the underlying failure instead of masking it. Plain structured
* failures render their own data-backed `message`. Diagnostic-surface
* rendering only (messages, notices, logs) — never parse the result; route on
* {@link HarnessError.code}.
* @param value - the caught value (`unknown` in catch clauses).
* @returns the outermost message first, each cause appended with `: ` (skipped
* when it repeats the wrapper message verbatim), and AggregateError members
* bracketed and `; `-joined.
*/
function errorChain(value) {
	const path = /* @__PURE__ */ new Set();
	const render = (current) => {
		if (path.has(current)) return "<circular cause>";
		path.add(current);
		try {
			if (!(current instanceof Error)) {
				if (typeof current === "object" && current !== null) {
					const descriptor = Object.getOwnPropertyDescriptor(current, "message");
					if (descriptor !== void 0 && "value" in descriptor && typeof descriptor.value === "string") return descriptor.value;
				}
				return String(current);
			}
			const message = current.message === "" ? current.name : current.message;
			const members = current instanceof AggregateError && current.errors.length > 0 ? ` [${current.errors.map(render).join("; ")}]` : "";
			const causeText = current.cause === void 0 || current.cause === null ? "" : render(current.cause);
			return `${message}${members}${causeText === "" || causeText === message ? "" : `: ${causeText}`}`;
		} catch {
			return "<unrenderable value>";
		} finally {
			path.delete(current);
		}
	};
	return render(value);
}
//#endregion
//#region ../../llm/llm/src/retry-policy.ts
/**
* Provider-owned request-retry policy configuration and resolution.
*
* Adapters expose one resolved policy per registered provider route; the
* optional dsh-llm-retry plugin executes it on the agent's failed-step extension point.
*
* @module @deepseek-ai/dsh-llm/retry-policy
*/
const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_INITIAL_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 1e4;
const DEFAULT_JITTER_RATIO = .1;
const DEFAULT_RETRYABLE_CODES = Object.freeze([
	EMPTY_RESPONSE_CODE,
	"RATE_LIMIT",
	"SERVER",
	"TIMEOUT",
	"TRANSPORT"
]);
const backoffSchema = z.object({
	initialDelayMs: z.number().max(MAX_TIMER_DELAY_MS).default(DEFAULT_INITIAL_DELAY_MS),
	maxDelayMs: z.number().max(MAX_TIMER_DELAY_MS).default(DEFAULT_MAX_DELAY_MS),
	jitterRatio: z.number().min(0).max(1).default(DEFAULT_JITTER_RATIO)
});
const normalPolicySchema = z.object({
	mode: z.const("normal").required(),
	maxRetries: z.number().step(1).min(0).max(Number.MAX_SAFE_INTEGER).default(DEFAULT_MAX_RETRIES),
	retryableCodes: z.array(z.string()).default([...DEFAULT_RETRYABLE_CODES]),
	backoff: backoffSchema
});
const alwaysPolicySchema = z.object({
	mode: z.const("always").required(),
	backoff: backoffSchema
});
z.union([normalPolicySchema, alwaysPolicySchema]);
const NORMAL_POLICY_KEYS = new Set([
	"mode",
	"maxRetries",
	"retryableCodes",
	"backoff"
]);
const ALWAYS_POLICY_KEYS = new Set([
	"mode",
	"maxRetries",
	"retryableCodes",
	"backoff"
]);
const BACKOFF_KEYS = new Set([
	"initialDelayMs",
	"maxDelayMs",
	"jitterRatio"
]);
function validateKeys(value, allowed, path) {
	for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`${path}: unknown key "${key}"`);
}
function resolveBackoff(config, path) {
	if (config !== void 0) validateKeys(config, BACKOFF_KEYS, path);
	const initialDelayMs = config?.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
	const maxDelayMs = config?.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
	const jitterRatio = config?.jitterRatio ?? DEFAULT_JITTER_RATIO;
	if (!Number.isFinite(initialDelayMs) || initialDelayMs <= 0 || initialDelayMs > 2147483647) throw new Error(`${path}.initialDelayMs must be a positive finite number no greater than ${MAX_TIMER_DELAY_MS}`);
	if (!Number.isFinite(maxDelayMs) || maxDelayMs <= 0 || maxDelayMs > 2147483647) throw new Error(`${path}.maxDelayMs must be a positive finite number no greater than ${MAX_TIMER_DELAY_MS}`);
	if (initialDelayMs > maxDelayMs) throw new Error(`${path}.initialDelayMs must be less than or equal to maxDelayMs`);
	if (!Number.isFinite(jitterRatio) || jitterRatio < 0 || jitterRatio > 1) throw new Error(`${path}.jitterRatio must be between 0 and 1`);
	return Object.freeze({
		initialDelayMs,
		maxDelayMs,
		jitterRatio
	});
}
/**
* Validate, default, and detach one provider-owned retry policy.
* @param config - optional provider configuration; omission selects normal defaults.
* @param path - diagnostic path naming the provider config that owns the value.
* @returns an immutable policy safe to capture in provider registration state.
*/
function resolveRetryPolicy(config, path) {
	if (config === void 0) return Object.freeze({
		mode: "normal",
		maxRetries: DEFAULT_MAX_RETRIES,
		retryableCodes: DEFAULT_RETRYABLE_CODES,
		...resolveBackoff(void 0, `${path}.backoff`)
	});
	switch (config.mode) {
		case "normal": {
			validateKeys(config, NORMAL_POLICY_KEYS, path);
			const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
			const retryableCodes = config.retryableCodes ?? [...DEFAULT_RETRYABLE_CODES];
			if (!Number.isSafeInteger(maxRetries) || maxRetries < 0) throw new Error(`${path}.maxRetries must be a non-negative safe integer`);
			if (retryableCodes.length === 0) throw new Error(`${path}.retryableCodes must not be empty`);
			if (retryableCodes.some((code) => typeof code !== "string" || code.length === 0)) throw new Error(`${path}.retryableCodes must contain only non-empty strings`);
			if (new Set(retryableCodes).size !== retryableCodes.length) throw new Error(`${path}.retryableCodes must not contain duplicates`);
			return Object.freeze({
				mode: "normal",
				maxRetries,
				retryableCodes: Object.freeze([...retryableCodes]),
				...resolveBackoff(config.backoff, `${path}.backoff`)
			});
		}
		case "always":
			validateKeys(config, ALWAYS_POLICY_KEYS, path);
			return Object.freeze({
				mode: "always",
				...resolveBackoff(config.backoff, `${path}.backoff`)
			});
		default: throw new Error(`${path}.mode must be "normal" or "always"`);
	}
}
//#endregion
//#region ../../llm/llm/src/call-config.ts
/**
* Field-wise equality over {@link LlmCallConfig} — the comparison a caller
* runs to decide whether a proposed configuration is a real change (worth a
* logged header snapshot) or the held one restated.
* @param a - one configuration.
* @param b - the other.
* @returns whether every field (including the `stop` list, element-wise) matches.
*/
function callConfigEquals(a, b) {
	if (a.provider !== b.provider || a.model !== b.model || a.reasoningEffort !== b.reasoningEffort || a.temperature !== b.temperature || a.maxTokens !== b.maxTokens) return false;
	if (a.stop === void 0 || b.stop === void 0) return a.stop === b.stop;
	return a.stop.length === b.stop.length && a.stop.every((s, i) => s === b.stop?.[i]);
}
//#endregion
//#region ../../llm/llm/src/adapter-failure.ts
/**
* Normalization for values thrown by a final LLM adapter boundary.
*
* @module @deepseek-ai/dsh-llm/adapter-failure
*/
/**
* Detach serializable provider facts from a value thrown by an adapter.
* @param value - arbitrary value thrown during adapter dispatch or iteration.
* @returns immutable provider-neutral facts suitable for a terminal finish chunk.
* @internal
*/
function normalizeLlmFailure(value) {
	const error = value instanceof Error ? value : new HarnessError(thrownMessage(value), "UNKNOWN", { cause: value });
	const carried = ownFailureSnapshot(error);
	if (carried !== void 0 && carried.code === ownErrorCode(error)) return carried;
	return Object.freeze({
		message: errorMessage(error),
		code: harnessErrorCode(error)
	});
}
/** Render a non-Error throw without letting hostile coercion escape normalization. */
function thrownMessage(value) {
	try {
		const message = String(value);
		return message.length > 0 ? message : "LLM adapter failed";
	} catch (_hostileThrownValue) {
		return "LLM adapter failed";
	}
}
/** Read a foreign error's own data-backed `code` without invoking accessors. */
function ownErrorCode(error) {
	try {
		const descriptor = Object.getOwnPropertyDescriptor(error, "code");
		return descriptor !== void 0 && "value" in descriptor ? descriptor.value : void 0;
	} catch (_sdkPropertyTrap) {
		return;
	}
}
/** Snapshot an own data property without invoking an SDK-defined accessor. */
function ownFailureSnapshot(error) {
	try {
		const descriptor = Object.getOwnPropertyDescriptor(error, "failure");
		return descriptor !== void 0 && "value" in descriptor ? failureSnapshot(descriptor.value) : void 0;
	} catch (_sdkPropertyTrap) {
		return;
	}
}
/** Validate and detach an arbitrary serializable failure payload. */
function failureSnapshot(value) {
	if (typeof value !== "object" || value === null) return void 0;
	try {
		const candidate = value;
		const message = candidate.message;
		const code = candidate.code;
		const status = candidate.status;
		const providerRetryAfterMs = candidate.providerRetryAfterMs;
		const requestId = candidate.requestId;
		if (typeof message !== "string" || message.length === 0 || typeof code !== "string" || code.length === 0 || status !== void 0 && (!Number.isInteger(status) || status < 100 || status > 599) || providerRetryAfterMs !== void 0 && (!Number.isFinite(providerRetryAfterMs) || providerRetryAfterMs <= 0) || requestId !== void 0 && (typeof requestId !== "string" || requestId.length === 0)) return void 0;
		return Object.freeze({
			message,
			code,
			...status === void 0 ? {} : { status },
			...providerRetryAfterMs === void 0 ? {} : { providerRetryAfterMs },
			...requestId === void 0 ? {} : { requestId }
		});
	} catch (_sdkFailureGetter) {
		return;
	}
}
/** Read an SDK error message without letting an accessor replace the primary failure. */
function errorMessage(error) {
	try {
		const message = error.message;
		if (typeof message === "string" && message.length > 0) return message;
	} catch (_sdkMessageGetter) {}
	return "LLM adapter failed";
}
/** Trust only Harness-owned codes; third-party SDK codes are not our taxonomy. */
function harnessErrorCode(error) {
	return error instanceof HarnessError ? error.code : "UNKNOWN";
}
//#endregion
//#region ../../llm/llm/src/content.ts
/**
* Stable text shown to a model that cannot accept one durable image reference.
* @param ref - durable normalized attachment omitted from the request.
* @returns deterministic text-only placeholder.
*/
function textOnlyImageText(ref) {
	return `[image omitted because this model accepts text only; attachment sha256:${String(ref.attachmentId).slice(7, 15)}]`;
}
/**
* True when typed model content contains an image block, walking nested
* tool-result content. This is the one recursive image walk shared by every
* image policy (capability gating, text-only serialization, compaction
* survey), so a consumer cannot silently diverge on nesting depth.
* @param content - typed model content blocks.
* @returns whether any nested block is an image.
*/
function contentHasImage(content) {
	return content.some((block) => block.type === "image" || block.type === "tool-result" && contentHasImage(block.content));
}
/** Replace every image occurrence, including nested tool results, for a text-only model. */
function replaceImagesForTextModel(blocks) {
	let next;
	for (const [index, block] of blocks.entries()) {
		if (block.type === "image") {
			next ??= blocks.slice(0, index);
			next.push({
				type: "text",
				text: textOnlyImageText(block.attachment)
			});
			continue;
		}
		if (block.type === "tool-result") {
			const content = replaceImagesForTextModel(block.content);
			if (content !== block.content) {
				next ??= blocks.slice(0, index);
				next.push({
					...block,
					content
				});
				continue;
			}
		}
		next?.push(block);
	}
	return next ?? blocks;
}
/**
* Project durable image history into deterministic text for an exact text-only model.
* @param messages - complete request history.
* @returns the original list without images, otherwise shallow message copies with stable placeholders.
*/
function projectImagesForTextModel(messages) {
	if (!messages.some((message) => contentHasImage(message.content))) return messages;
	return messages.map((message) => {
		const content = replaceImagesForTextModel(message.content);
		return content === message.content ? message : {
			...message,
			content
		};
	});
}
//#endregion
//#region ../../llm/llm/src/attribution.ts
/**
* Centralize the non-secret product identity every provider request sends as `User-Agent`, keeping
* adapters from drifting. See
* `.agents/notes/implemented/architecture/2026-06-21-mandatory-app-attribution-headers.md`.
*
* App-attribution vocabulary for provider requests.
* @module @deepseek-ai/dsh-llm/attribution
*/
const { version } = createRequire(import.meta.url)("../package.json");
//#endregion
//#region ../../llm/llm/src/index.ts
/**
* LLM service: adapter registry with a waterfall-interceptable streaming call
* API. Exports the `LlmRuntime` default, the abstract `LlmAdapter` for
* provider backends, and `BlockAssembler` for chunk assembly.
*
* @module @deepseek-ai/dsh-llm
*/
var __runInitializers = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) if (kind === "field") initializers.unshift(_);
		else descriptor[key] = _;
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
/**
* Typed error for LLM-related failures. Extends {@link HarnessError}, so the
* `code` string (e.g. `AUTH`, `RATE_LIMIT`, `NO_ADAPTER`) is shared taxonomy.
*/
var LlmError = class extends HarnessError {
	/** Serializable facts retained beside this live Error. */
	failure;
	/**
	* @param message - non-empty human-readable failure summary.
	* @param code - non-empty stable provider-neutral machine code.
	* @param options - optional cause and validated serializable provider facts.
	*/
	constructor(message, code, options) {
		if (typeof message !== "string" || message.length === 0) throw new Error("LlmError message must be a non-empty string");
		if (typeof code !== "string" || code.length === 0) throw new Error("LlmError code must be a non-empty string");
		if (options?.status !== void 0 && (!Number.isInteger(options.status) || options.status < 100 || options.status > 599)) throw new Error("LlmError status must be an integer from 100 through 599");
		if (options?.providerRetryAfterMs !== void 0 && (!Number.isFinite(options.providerRetryAfterMs) || options.providerRetryAfterMs <= 0)) throw new Error("LlmError providerRetryAfterMs must be a positive finite number");
		if (options?.requestId !== void 0 && (typeof options.requestId !== "string" || options.requestId.length === 0)) throw new Error("LlmError requestId must be a non-empty string");
		super(message, code, options);
		this.name = "LlmError";
		this.failure = Object.freeze({
			message,
			code,
			...options?.status === void 0 ? {} : { status: options.status },
			...options?.providerRetryAfterMs === void 0 ? {} : { providerRetryAfterMs: options.providerRetryAfterMs },
			...options?.requestId === void 0 ? {} : { requestId: options.requestId }
		});
	}
};
(() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _listProviders_decorators;
	let _listConfigurableProviders_decorators;
	let _remoteDiscoverModels_decorators;
	return class LlmRuntime extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_listProviders_decorators = [Remote];
			_listConfigurableProviders_decorators = [Remote];
			_remoteDiscoverModels_decorators = [Remote("discoverModels")];
			__esDecorate(this, null, _listProviders_decorators, {
				kind: "method",
				name: "listProviders",
				static: false,
				private: false,
				access: {
					has: (obj) => "listProviders" in obj,
					get: (obj) => obj.listProviders
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _listConfigurableProviders_decorators, {
				kind: "method",
				name: "listConfigurableProviders",
				static: false,
				private: false,
				access: {
					has: (obj) => "listConfigurableProviders" in obj,
					get: (obj) => obj.listConfigurableProviders
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _remoteDiscoverModels_decorators, {
				kind: "method",
				name: "remoteDiscoverModels",
				static: false,
				private: false,
				access: {
					has: (obj) => "remoteDiscoverModels" in obj,
					get: (obj) => obj.remoteDiscoverModels
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			if (_metadata) Object.defineProperty(this, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
		}
		adapters = (__runInitializers(this, _instanceExtraInitializers), /* @__PURE__ */ new Map());
		directory = /* @__PURE__ */ new Map();
		discoveries = /* @__PURE__ */ new Map();
		constructor(ctx) {
			super(ctx, "llm");
		}
		/** Notify topology observers without letting one broken listener veto the commit. */
		emitAdaptersUpdated() {
			let invariantFailure;
			for (const listener of this.ctx.events.dispatch("emit", ["llm/adapters-updated"])) try {
				const returned = listener();
				if (returned != null && typeof returned.then === "function") Promise.resolve(returned).then(void 0, (error) => {
					this.warnAdaptersListenerFailure(error);
				});
			} catch (error) {
				if (error?.code === "INVARIANT") {
					invariantFailure ??= error;
					continue;
				}
				this.warnAdaptersListenerFailure(error);
			}
			if (invariantFailure !== void 0) throw invariantFailure;
		}
		/** Contained-listener diagnostic shared by the sync and async failure paths. */
		warnAdaptersListenerFailure(error) {
			this.ctx.logger.warn("llm: an llm/adapters-updated listener failed");
			this.ctx.logger.warn(error);
		}
		/**
		* Register an adapter for the given provider routes. Throws `LlmError` with code
		* `DUPLICATE_ADAPTER` if any provider already has an adapter (all-or-nothing).
		* Disposed with the fiber.
		* @param providers - every provider route this adapter should serve.
		* @param adapter - the adapter that streams calls for those providers.
		* @returns the disposer, carrying {@link AdapterRegistrationHandle.replace}.
		*/
		registerAdapter(providers, adapter) {
			const owned = /* @__PURE__ */ new Set();
			let released = false;
			const dispose = this.ctx.effect(function* () {
				if (providers.length === 0) throw new LlmError("an adapter must register at least one provider", "INVALID_ADAPTER");
				this.commitRoutes(owned, this.prepareRoutes(providers, adapter, owned));
				yield () => {
					released = true;
					for (const provider of owned) this.adapters.delete(provider);
					owned.clear();
					this.emitAdaptersUpdated();
				};
			}.bind(this), "llm.registerAdapter()");
			const handle = (() => void dispose());
			handle.replace = (next) => {
				if (released) throw new LlmError("a disposed adapter registration cannot replace its routes", "REGISTRATION_DISPOSED");
				this.commitRoutes(owned, this.prepareRoutes(next, adapter, owned));
			};
			return handle;
		}
		/**
		* Validate one candidate route set for `adapter`, treating routes this
		* registration already holds as available. Nothing is mutated: a rejected
		* candidate leaves the registry exactly as it was.
		*/
		prepareRoutes(providers, adapter, owned) {
			const unique = /* @__PURE__ */ new Set();
			const registrations = [];
			for (const provider of providers) {
				if (provider.length === 0) throw new LlmError("adapter provider names must be non-empty", "INVALID_ADAPTER");
				if (unique.has(provider) || this.adapters.has(provider) && !owned.has(provider)) throw new LlmError(`an adapter for provider "${provider}" is already registered`, "DUPLICATE_ADAPTER");
				const info = adapter.providerInfo(provider);
				if (typeof info.id !== "string" || info.id !== provider || typeof info.name !== "string" || info.name.length === 0) throw new LlmError(`adapter metadata for provider "${provider}" must preserve its id and have a non-empty name`, "INVALID_ADAPTER");
				unique.add(provider);
				const retryPolicy = adapter.providerRetryPolicy(provider) ?? resolveRetryPolicy(void 0, `llm: provider "${provider}" retryPolicy`);
				registrations.push({
					adapter,
					provider: {
						id: info.id,
						name: info.name
					},
					retryPolicy
				});
			}
			return registrations;
		}
		/**
		* Swap this registration's routes for the prepared ones in one synchronous
		* section, so no observer can see the registry between the release and the
		* re-registration. The route set's one mutation point is also where
		* `llm/adapters-updated` is published, so a `replace` announces itself
		* exactly like a first registration.
		*/
		commitRoutes(owned, registrations) {
			for (const provider of owned) this.adapters.delete(provider);
			owned.clear();
			for (const registration of registrations) {
				this.adapters.set(registration.provider.id, registration);
				owned.add(registration.provider.id);
			}
			this.emitAdaptersUpdated();
		}
		/**
		* Describe provider routes with a registered adapter.
		* @returns detached provider metadata in registration order.
		*/
		listProviders() {
			return [...this.adapters.values()].map(({ provider }) => ({ ...provider }));
		}
		/**
		* Declare provider routes an adapter plugin can activate through
		* configuration. Registration is all-or-nothing: an empty list, invalid
		* entry, or a provider already declared by any registration throws
		* `LlmError` without registering the rest. Disposed with the fiber.
		* @param entries - every configurable provider this plugin owns.
		* @returns a handle that withdraws all of them, and can atomically replace them.
		*/
		registerConfigurableProviders(entries) {
			let held = [];
			let disposed = false;
			/**
			* Validate a candidate set in full against everything this registration
			* does not already hold, then publish it. Nothing is written until the
			* whole set passes, so a refused candidate leaves the current entries in
			* place — the property that makes `replace` a swap rather than a
			* delete-then-add that can strand the directory empty.
			*/
			const commit = (candidates) => {
				const detached = [];
				const own = new Set(held.map((entry) => entry.provider));
				for (const entry of candidates) {
					if (entry.provider.length === 0 || entry.displayName.length === 0 || entry.settingsNs.length === 0) throw new LlmError("configurable providers need a non-empty provider, displayName, and settingsNs", "INVALID_DIRECTORY");
					if (entry.settingsPath.some((segment) => segment.length === 0)) throw new LlmError(`configurable provider "${entry.provider}" has an empty settingsPath segment`, "INVALID_DIRECTORY");
					if (this.directory.has(entry.provider) && !own.has(entry.provider) || detached.some((seen) => seen.provider === entry.provider)) throw new LlmError(`configurable provider "${entry.provider}" is already declared`, "DUPLICATE_DIRECTORY");
					detached.push({
						...entry,
						settingsPath: [...entry.settingsPath]
					});
				}
				for (const entry of held) this.directory.delete(entry.provider);
				for (const entry of detached) this.directory.set(entry.provider, entry);
				held = detached;
				this.emitAdaptersUpdated();
			};
			const dispose = this.ctx.effect(function* () {
				if (entries.length === 0) throw new LlmError("a configurable-provider registration must declare at least one provider", "INVALID_DIRECTORY");
				commit(entries);
				yield () => {
					disposed = true;
					for (const entry of held) this.directory.delete(entry.provider);
					held = [];
					this.emitAdaptersUpdated();
				};
			}.bind(this), "llm.registerConfigurableProviders()");
			const handle = (() => void dispose());
			handle.replace = (next) => {
				if (disposed) throw new LlmError("this configurable-provider registration was disposed", "REGISTRATION_DISPOSED");
				commit(next);
			};
			return handle;
		}
		/**
		* List every declared configurable provider, registered or dormant.
		* @returns detached directory entries in declaration order.
		*/
		listConfigurableProviders() {
			return [...this.directory.values()].map((entry) => ({
				...entry,
				settingsPath: [...entry.settingsPath]
			}));
		}
		/**
		* Offer to interrogate provider endpoints on behalf of the settings
		* namespace this plugin owns. The namespace is the key because that is what
		* a configuration surface already holds from the configurable-provider
		* directory, and because a provider being *added* has no route to name yet.
		* Disposed with the fiber.
		* @param settingsNs - the namespace whose profiles this discovery serves.
		* @param discover - interrogates one endpoint and must honor the supplied signal.
		* @returns the disposer that withdraws the offer.
		*/
		registerModelDiscovery(settingsNs, discover) {
			const dispose = this.ctx.effect(function* () {
				if (settingsNs.length === 0) throw new LlmError("model discovery needs a non-empty settings namespace", "INVALID_DISCOVERY");
				if (this.discoveries.has(settingsNs)) throw new LlmError(`model discovery for "${settingsNs}" is already registered`, "DUPLICATE_DISCOVERY");
				this.discoveries.set(settingsNs, discover);
				yield () => {
					this.discoveries.delete(settingsNs);
				};
			}.bind(this), "llm.registerModelDiscovery()");
			return () => void dispose();
		}
		/**
		* Interrogate one provider endpoint for the models it advertises. The
		* request describes a draft, not a stored route, so nothing here reads or
		* writes settings or credentials — the caller owns both, and the reply is
		* candidate metadata a surface may offer for adoption.
		* @param settingsNs - namespace whose registered discovery serves this draft.
		* @param request - the endpoint, protocol, and one-shot credential to use.
		* @param signal - caller cancellation.
		* @returns the advertised models, deduplicated in endpoint order.
		*/
		async discoverModels(settingsNs, request, signal) {
			const discover = this.discoveries.get(settingsNs);
			if (discover === void 0) throw new LlmError(`no model discovery is registered for "${settingsNs}"`, "NO_DISCOVERY");
			if ((request.provider ?? "").length === 0 && (request.baseURL ?? "").length === 0) throw new LlmError("model discovery needs a provider route or a baseURL", "INVALID_DISCOVERY");
			const discovered = signal === void 0 ? await discover(request) : await discover(request, signal);
			const seen = /* @__PURE__ */ new Set();
			const models = [];
			for (const model of discovered) {
				if (typeof model.id !== "string" || model.id.length === 0 || seen.has(model.id)) continue;
				seen.add(model.id);
				models.push({
					id: model.id,
					...model.name === void 0 ? {} : { name: model.name },
					...model.contextWindow === void 0 ? {} : { contextWindow: model.contextWindow },
					...model.maxTokens === void 0 ? {} : { maxTokens: model.maxTokens }
				});
			}
			return models;
		}
		/**
		* Remote adapter for one draft provider interrogation.
		* @param settingsNs - namespace whose registered discovery serves this draft.
		* @param request - endpoint, protocol, and one-shot credential to use.
		* @param signal - caller cancellation supplied by the Remote carrier.
		* @returns advertised models in endpoint order.
		* @throws RemoteError with `llm/model-discovery-rejected` when discovery refuses or fails.
		*/
		async remoteDiscoverModels(settingsNs, request, signal) {
			try {
				return await this.discoverModels(settingsNs, request, signal);
			} catch (error) {
				throw new RemoteError("llm/model-discovery-rejected", error instanceof Error ? error.message : String(error), {
					settingsNs,
					...request.baseURL === void 0 ? {} : { baseURL: request.baseURL }
				}, { cause: error });
			}
		}
		/**
		* Resolve the retry policy captured when one provider route was registered.
		* @param provider - registered provider route to inspect.
		* @returns the provider-owned policy, with normal defaults already resolved.
		*/
		providerRetryPolicy(provider) {
			return this.registration(provider).retryPolicy;
		}
		/**
		* Resolve provider-side request-image pricing for one exact route, or
		* `undefined` when the provider is unregistered or declares none. Unknown
		* providers degrade to `undefined` rather than throwing because callers
		* price durable history whose route may no longer be mounted.
		* @param provider - provider route named by a request header.
		* @param model - exact model id named by the same header.
		* @returns the owning adapter's image pricing for the route, when declared.
		*/
		imageRequestPricing(provider, model) {
			return this.adapters.get(provider)?.adapter.imageRequestPricing(provider, model);
		}
		/** Detach typed adapter-owned modality metadata. */
		detachedModalities(modalities) {
			return modalities === void 0 ? void 0 : [...modalities];
		}
		/**
		* Discover models advertised by one registered provider. Catalog membership
		* is advisory and never changes routing or request validation.
		* @param provider - registered provider route to inspect.
		* @returns detached model metadata in adapter-preferred order.
		*/
		async listModels(provider) {
			const models = await this.registration(provider).adapter.listModels(provider);
			const seen = /* @__PURE__ */ new Set();
			return models.map((model) => {
				if (typeof model.provider !== "string" || model.provider !== provider || typeof model.id !== "string" || model.id.length === 0 || typeof model.name !== "string" || model.name.length === 0 || model.description !== void 0 && typeof model.description !== "string" || seen.has(model.id)) throw new LlmError(`adapter returned invalid or duplicate model metadata for provider "${provider}"`, "INVALID_CATALOG");
				seen.add(model.id);
				const inputModalities = this.detachedModalities(model.inputModalities);
				return {
					provider: model.provider,
					id: model.id,
					name: model.name,
					...model.description === void 0 ? {} : { description: model.description },
					...inputModalities === void 0 ? {} : { inputModalities }
				};
			});
		}
		/**
		* Resolve and validate all metadata from the adapter that owns one exact
		* route. The result is detached from adapter-owned objects; catalog
		* membership remains advisory and does not control request routing.
		* @param provider - registered provider route to inspect.
		* @param model - exact model id passed to the adapter.
		* @param signal - optional cancellation for adapter-owned asynchronous lookup.
		* @returns exact model identity plus available context and reasoning metadata.
		*/
		async resolveModelInfo(provider, model, signal) {
			return this.resolveModelInfoFor(this.registration(provider), model, signal);
		}
		async resolveModelInfoFor(registration, model, signal) {
			const resolved = await registration.adapter.resolveModel(registration.provider.id, model, signal);
			return this.normalizeModelInfo(registration, model, resolved);
		}
		/** Validate and detach one adapter-returned exact model result. */
		normalizeModelInfo(registration, model, resolved) {
			const provider = registration.provider.id;
			if (typeof resolved.provider !== "string" || resolved.provider !== provider || typeof resolved.id !== "string" || resolved.id !== model || typeof resolved.name !== "string" || resolved.name.length === 0 || resolved.description !== void 0 && typeof resolved.description !== "string") throw new LlmError(`adapter returned invalid exact model metadata for provider "${provider}" model "${model}"`, "INVALID_MODEL_INFO");
			const context = resolved.context;
			if (context !== void 0 && (!Number.isInteger(context.contextWindow) || context.contextWindow <= 0)) throw new LlmError(`adapter returned invalid context metadata for provider "${provider}" model "${model}"`, "INVALID_MODEL_CONTEXT");
			const inputModalities = this.detachedModalities(resolved.inputModalities);
			const defaultMaxTokens = resolved.defaultMaxTokens;
			if (defaultMaxTokens !== void 0 && (!Number.isSafeInteger(defaultMaxTokens) || defaultMaxTokens <= 0)) throw new LlmError(`adapter returned invalid default maxTokens for provider "${provider}" model "${model}"`, "INVALID_MODEL_MAX_TOKENS");
			const info = {
				provider,
				id: model,
				name: resolved.name,
				...resolved.description === void 0 ? {} : { description: resolved.description },
				...inputModalities === void 0 ? {} : { inputModalities },
				...context === void 0 ? {} : { context: { contextWindow: context.contextWindow } },
				...defaultMaxTokens === void 0 ? {} : { defaultMaxTokens }
			};
			const reasoning = resolved.reasoning;
			if (reasoning === void 0) return info;
			if (reasoning.efforts.length === 0) throw new LlmError(`adapter returned invalid reasoning metadata for provider "${provider}" model "${model}"`, "INVALID_MODEL_REASONING");
			const seen = /* @__PURE__ */ new Set();
			const efforts = reasoning.efforts.map((effort) => {
				if (typeof effort.id !== "string" || effort.id.length === 0 || typeof effort.name !== "string" || effort.name.length === 0 || effort.description !== void 0 && typeof effort.description !== "string" || seen.has(effort.id)) throw new LlmError(`adapter returned invalid or duplicate reasoning effort metadata for provider "${provider}" model "${model}"`, "INVALID_MODEL_REASONING");
				seen.add(effort.id);
				return {
					id: effort.id,
					name: effort.name,
					...effort.description === void 0 ? {} : { description: effort.description }
				};
			});
			if (reasoning.defaultEffort !== void 0 && !seen.has(reasoning.defaultEffort)) throw new LlmError(`adapter returned an unknown default reasoning effort for provider "${provider}" model "${model}"`, "INVALID_MODEL_REASONING");
			return {
				...info,
				reasoning: {
					efforts,
					...reasoning.defaultEffort === void 0 ? {} : { defaultEffort: reasoning.defaultEffort }
				}
			};
		}
		/**
		* Validate a conversation call config against its exact model capability and
		* materialize adapter-configured defaults. Unsupported explicit efforts
		* reject before provider I/O; no clamping or aliasing is performed. This
		* standalone query does not bind a later dispatch; use {@link prepareCall}
		* when logging and streaming must share one adapter registration.
		* @param config - provider/model route and optional request controls.
		* @param signal - optional cancellation for adapter-owned capability lookup.
		* @returns a detached config only when a default must be materialized.
		*/
		async resolveCallConfig(config, signal) {
			return (await this.resolveCallFor(this.registration(config.provider), config, signal)).config;
		}
		async resolveCallFor(registration, config, signal) {
			const info = await this.resolveModelInfoFor(registration, config.model, signal);
			return this.resolveCallWithInfo(config, info);
		}
		/** Validate request controls against one already-bound exact model result. */
		resolveCallWithInfo(config, info) {
			const defaulted = config.maxTokens === void 0 && info.defaultMaxTokens !== void 0 ? {
				...config,
				maxTokens: info.defaultMaxTokens
			} : config;
			const reasoning = info.reasoning;
			const requested = defaulted.reasoningEffort;
			let resolvedConfig = defaulted;
			if (reasoning === void 0) {
				if (requested !== void 0) throw new LlmError(`provider "${config.provider}" model "${config.model}" does not support reasoning effort "${requested}"`, "UNSUPPORTED_REASONING_EFFORT");
			} else {
				const effective = requested ?? reasoning.defaultEffort;
				if (effective !== void 0) {
					if (!reasoning.efforts.some((effort) => effort.id === effective)) throw new LlmError(`provider "${config.provider}" model "${config.model}" does not support reasoning effort "${effective}"`, "UNSUPPORTED_REASONING_EFFORT");
					if (requested !== effective) resolvedConfig = {
						...defaulted,
						reasoningEffort: effective
					};
				}
			}
			return {
				config: resolvedConfig,
				...info.context === void 0 ? {} : { context: info.context },
				modelInfo: info
			};
		}
		/**
		* Resolve one call under its current adapter registration. The returned
		* one-shot handle keeps that registration across header logging and dispatch,
		* so HMR cannot combine one adapter's capability result with another adapter.
		* @param config - provider/model route and optional request controls.
		* @param signal - optional cancellation for adapter-owned capability lookup.
		* @returns a prepared config and its registration-bound stream entry point.
		*/
		async prepareCall(config, signal) {
			const registration = this.registration(config.provider);
			const adapterCall = await registration.adapter.prepareCall(config.provider, config.model, signal);
			const modelInfo = this.normalizeModelInfo(registration, config.model, adapterCall.model);
			const resolved = this.resolveCallWithInfo(config, modelInfo);
			const resolvedConfig = deepFreeze(structuredClone(resolved.config));
			const context = resolved.context === void 0 ? void 0 : deepFreeze(structuredClone(resolved.context));
			const adapterDefaults = deepFreeze({
				...config.reasoningEffort === void 0 && resolvedConfig.reasoningEffort !== void 0 ? { reasoningEffort: true } : {},
				...config.maxTokens === void 0 && resolvedConfig.maxTokens !== void 0 ? { maxTokens: true } : {}
			});
			let dispatched = false;
			return Object.freeze({
				config: resolvedConfig,
				retryPolicy: registration.retryPolicy,
				adapterDefaults,
				...context === void 0 ? {} : { context },
				...modelInfo.inputModalities === void 0 ? {} : { inputModalities: Object.freeze([...modelInfo.inputModalities]) },
				stream: (options) => {
					if (dispatched) throw new LlmError("a prepared LLM call can only be dispatched once", "INVALID_PREPARED_CALL");
					if (!callConfigEquals(options, resolvedConfig)) throw new LlmError("prepared LLM call config changed before adapter dispatch", "INVALID_PREPARED_CALL");
					dispatched = true;
					return this.streamWithRegistration(options, {
						registration,
						config: resolvedConfig,
						modelInfo,
						dispatch: (options) => adapterCall.stream(options)
					});
				}
			});
		}
		registration(provider) {
			const registration = this.adapters.get(provider);
			if (!registration) throw new LlmError(`no adapter registered for provider "${provider}"`, "NO_ADAPTER");
			return registration;
		}
		/** Remove replay state whose historical route is owned by another adapter. */
		forAdapter(options, adapter) {
			const messages = options.messages.map((message) => {
				const source = message.source;
				if (message.role !== "assistant" || source.kind !== "model" || source.replayState === void 0) return message;
				if (this.adapters.get(source.provider)?.adapter === adapter) return message;
				return freezeMessage({
					...message,
					source: {
						kind: "model",
						provider: source.provider,
						model: source.model
					}
				});
			});
			if (messages.every((message, index) => message === options.messages[index])) return options;
			const filtered = {
				...options,
				messages
			};
			return Object.isFrozen(options) ? deepFreeze(filtered) : filtered;
		}
		/**
		* Final adapter boundary. Adapter selection, dispatch, iterator construction,
		* and iteration failures become one terminal failure chunk. Middleware and
		* downstream consumer failures remain thrown plugin or consumer errors.
		*/
		async *adapterStream(options, prepared) {
			let iterator;
			try {
				const registration = prepared?.registration ?? this.registration(options.provider);
				const adapter = registration.adapter;
				let modelInfo;
				let resolvedConfig;
				let dispatch;
				if (prepared === void 0) {
					const adapterCall = await adapter.prepareCall(options.provider, options.model, options.signal);
					modelInfo = this.normalizeModelInfo(registration, options.model, adapterCall.model);
					resolvedConfig = this.resolveCallWithInfo(options, modelInfo).config;
					dispatch = (options) => adapterCall.stream(options);
				} else {
					modelInfo = prepared.modelInfo;
					resolvedConfig = prepared.config;
					dispatch = prepared.dispatch;
				}
				if (prepared !== void 0 && !callConfigEquals(options, resolvedConfig)) throw new LlmError("prepared LLM call config changed before adapter dispatch", "INVALID_PREPARED_CALL");
				const resolvedOptions = callConfigEquals(options, resolvedConfig) ? options : Object.isFrozen(options) ? deepFreeze({
					...options,
					...resolvedConfig
				}) : {
					...options,
					...resolvedConfig
				};
				const projectedOptions = modelInfo.inputModalities !== void 0 && !modelInfo.inputModalities.includes("image") && resolvedOptions.messages.some((message) => contentHasImage(message.content)) ? Object.isFrozen(resolvedOptions) ? deepFreeze({
					...resolvedOptions,
					messages: projectImagesForTextModel(resolvedOptions.messages)
				}) : {
					...resolvedOptions,
					messages: projectImagesForTextModel(resolvedOptions.messages)
				} : resolvedOptions;
				iterator = dispatch(this.forAdapter(projectedOptions, adapter))[Symbol.asyncIterator]();
			} catch (error) {
				yield adapterFailureChunk(error, options.signal);
				return;
			}
			let completed = false;
			try {
				while (true) {
					let item;
					try {
						const next = await iterator.next();
						item = next.done ? { done: true } : {
							done: false,
							value: next.value
						};
					} catch (error) {
						completed = true;
						yield adapterFailureChunk(error, options.signal);
						return;
					}
					if (item.done) {
						completed = true;
						return;
					}
					yield item.value;
				}
			} finally {
				if (!completed) {
					const close = iterator.return?.bind(iterator);
					if (close) await close();
				}
			}
		}
		/**
		* Stream one model call as raw chunks (token-level deltas). Replay state is
		* retained only when the same adapter instance owns its historical provider
		* and the target provider. Final adapter selection remains fixed through
		* asynchronous exact-model resolution and dispatch. Adapter selection,
		* dispatch, and iteration failures become terminal `error` or `aborted`
		* finish chunks; middleware, nested-call, cleanup, and consumer failures
		* remain thrown.
		* @param options - the full request; `options.provider` selects the adapter.
		* @returns the chunk stream, possibly wrapped by `llm/stream` listeners.
		*/
		stream(options) {
			return this.streamWithRegistration(options);
		}
		streamWithRegistration(options, prepared) {
			return this.ctx.waterfall(this, "llm/stream", options, () => this.adapterStream(options, prepared));
		}
	};
})();
/** Convert one adapter throw into the stream protocol's terminal outcome. */
function adapterFailureChunk(error, signal) {
	const failure = normalizeLlmFailure(error);
	return {
		type: "finish",
		reason: signal?.aborted || failure.code === "ABORTED" ? {
			kind: "aborted",
			failure
		} : {
			kind: "error",
			failure
		}
	};
}
/**
* The JSONL session handle. Mutations serialize on a per-handle promise
* chain; reads re-scan the artifact on demand and never observe a shorter log
* than a prior read on this handle. Routed live events buffer in a bounded
* window and drain through the same chain as explicit appends.
*/
var JsonlSessionHandle = class {
	storage;
	id;
	header;
	access;
	state;
	chain = Promise.resolve();
	closing;
	observedLength = 0;
	/** Routed live events awaiting their batching deadline (persistence-owned copies). */
	buffered = [];
	batchTimer;
	/** Set when a drain failed; the automatic timer stays quiet until the next drain. */
	drainPaused = false;
	draining;
	constructor(storage, id, header, access, state) {
		this.storage = storage;
		this.id = id;
		this.header = header;
		this.access = access;
		this.state = state;
	}
	/** Exact fork-inherited prefix length stored with this session's log. */
	get inheritedEventCount() {
		return this.state.inheritedEventCount;
	}
	/**
	* Read a slice of the valid contiguous logical log; see the seam contract.
	* @param offset - first logical seq to include (default 0).
	* @param length - maximum events returned (default: the rest).
	* @param options - optional cancellation.
	* @returns the requested slice.
	*/
	async read(offset = 0, length = Number.MAX_SAFE_INTEGER, options) {
		this.assertOpen("read");
		if (!Number.isSafeInteger(offset) || offset < 0) throw new TypeError(`read offset must be a non-negative safe integer, got ${String(offset)}`);
		if (!Number.isSafeInteger(length) || length < 0) throw new TypeError(`read length must be a non-negative safe integer, got ${String(length)}`);
		options?.signal?.throwIfAborted();
		if (this.state.primed !== void 0) {
			this.observedLength = Math.max(this.observedLength, this.state.primed.length);
			return this.state.primed.slice(offset, offset + length);
		}
		if (this.access === "write" && !this.state.materialized) return [];
		const path = await this.storage.resolveLog(this.id, options?.signal);
		if (path === void 0) {
			if (this.storage.hasPendingSession(this.id)) return [];
			throw new SessionPersistenceNotFoundError(this.id);
		}
		const { events } = await this.storage.readStoredLog(path, this.id, options?.signal);
		if (events.length < this.observedLength) throw new Error(`session "${this.id}": stored log shrank below a previously observed prefix (${events.length} < ${this.observedLength})`);
		this.observedLength = events.length;
		return events.slice(offset, offset + length);
	}
	/**
	* Durably append a contiguous batch; see the seam contract.
	* @param events - the contiguous batch in seq order.
	* @param options - optional cancellation observed before the write starts.
	*/
	async append(events, options) {
		this.assertOpen("append");
		const batch = materializeAppendBatch(events);
		return this.run("append", async () => {
			options?.signal?.throwIfAborted();
			await this.persistContiguous(batch);
		});
	}
	/**
	* Durability barrier; materializes the artifact when nothing has been
	* appended yet, so an explicitly flushed empty session survives this process.
	* @param options - optional cancellation observed before the barrier starts.
	*/
	flush(options) {
		return this.run("flush", async () => {
			options?.signal?.throwIfAborted();
			if (this.access !== "write") throw new SessionReadOnlyError(this.id, "flush");
			if (this.state.materialized) return;
			await this.storage.persistHeader(this.header, this.state.inheritedEventCount);
			this.state.materialized = true;
		});
	}
	/**
	* Release the handle; see the seam contract. Idempotent and uncancellable.
	* A write handle first drains its routed live buffer through the still-open
	* storage, so backend teardown loses nothing regardless of which fiber
	* unwinds first; a drain failure still releases ownership, then rejects.
	* @returns settlement of the release.
	*/
	close() {
		return this.closing ??= (async () => {
			let drainFailure;
			for (;;) {
				try {
					await this.drainLive();
				} catch (error) {
					drainFailure = error;
					break;
				}
				await this.chain;
				if (this.buffered.length === 0) break;
			}
			await this.chain;
			this.storage.releaseHandle(this, this.state.materialized);
			if (drainFailure !== void 0) throw drainFailure instanceof Error ? drainFailure : new Error(errorChain(drainFailure));
		})();
	}
	/** `await using` support: delegates to {@link close}. */
	[Symbol.asyncDispose]() {
		return this.close();
	}
	/**
	* Buffer one published live session event and arm the bounded batching
	* window when it is idle. The routing installer is the only caller.
	* @param event - the live event, retained as a persistence-owned copy.
	* @param reportBackgroundFailure - observes a deadline-driven drain failure
	*   (the events stay buffered; the next {@link drainLive} retries loudly).
	*/
	enqueueLive(event, reportBackgroundFailure) {
		this.buffered.push(structuredClone(event));
		if (this.batchTimer !== void 0 || this.drainPaused) return;
		this.batchTimer = setTimeout(() => {
			this.batchTimer = void 0;
			this.drainLive().catch(reportBackgroundFailure);
		}, 200);
	}
	/**
	* Durably drain the routed live buffer through the mutation chain;
	* concurrent callers join one drain, and a failure retains the batch in
	* order so `session/flush` can retry and reject loudly.
	*/
	drainLive() {
		return this.draining ??= this.drainBuffered().finally(() => {
			this.draining = void 0;
		});
	}
	async drainBuffered() {
		if (this.batchTimer !== void 0) {
			clearTimeout(this.batchTimer);
			this.batchTimer = void 0;
		}
		this.drainPaused = false;
		while (this.buffered.length > 0) await this.enqueueChain(async () => {
			const batch = this.buffered.splice(0);
			try {
				await this.persistContiguous(materializeAppendBatch(batch));
			} catch (error) {
				this.buffered = batch.concat(this.buffered);
				this.drainPaused = true;
				throw error;
			}
		});
	}
	/** The shared durable-append body: contiguity, torn-tail repair, storage write, state advance. */
	async persistContiguous(batch) {
		if (this.access !== "write") throw new SessionReadOnlyError(this.id, "append");
		if (batch.length === 0) return;
		assertContiguous(this.id, batch, this.state.cursor);
		if (this.state.tornTruncateTo !== void 0) {
			await this.storage.truncateTornTail(this.header, this.state.tornTruncateTo);
			this.state.tornTruncateTo = void 0;
		}
		if (this.state.recoveredTail !== void 0) {
			if (this.state.recoveredTail.length > 0) await this.storage.persistBatch(this.header, this.state.recoveredTail, this.state.materialized, this.state.inheritedEventCount);
			this.state.recoveredTail = void 0;
		}
		await this.storage.persistBatch(this.header, batch, this.state.materialized, this.state.inheritedEventCount);
		this.state.materialized = true;
		this.state.cursor += batch.length;
		this.state.primed = void 0;
		this.observedLength = this.state.cursor;
	}
	/** Serialize one operation onto the chain without the closed-handle refusal (drain-from-close). */
	enqueueChain(op) {
		const next = this.chain.then(op);
		this.chain = next.catch(() => {});
		return next;
	}
	/** Serialize one public mutating operation onto this handle's chain. */
	async run(operation, op) {
		this.assertOpen(operation);
		return this.enqueueChain(async () => {
			this.assertOpen(operation);
			return op();
		});
	}
	assertOpen(operation) {
		if (this.closing !== void 0) throw new SessionHandleClosedError(this.id, operation);
	}
};
/**
* The JSONL backend's in-process bookkeeping: the single active writer per
* session id (doubling as the live event router), the open-handle set the
* teardown sweep closes, and the created-but-unmaterialized sessions this
* process can already observe.
*/
var JsonlBackendTracker = class {
	name;
	/** Every open handle; teardown closes what remains. */
	openHandles = /* @__PURE__ */ new Set();
	/** `null` marks a claim whose handle is still being constructed. */
	writers = /* @__PURE__ */ new Map();
	pending = /* @__PURE__ */ new Map();
	counter = 0;
	/** @param name - backend label used in in-memory revision tokens and teardown errors. */
	constructor(name) {
		this.name = name;
	}
	/**
	* Claim write ownership and record the created session as pending, making
	* it observable to this process before it materializes.
	* @param header - the validated detached header.
	* @param inheritedEventCount - the exact fork-inherited prefix length.
	* @throws {SessionAlreadyExistsError} when a concurrent create or an open
	*   write handle holds the id — for create, the duplicate is the fact.
	*/
	registerCreated(header, inheritedEventCount) {
		if (this.writers.has(header.id)) throw new SessionAlreadyExistsError(header.id);
		this.writers.set(header.id, null);
		this.pending.set(header.id, {
			header,
			revision: SessionPersistenceRevision(`memory:${this.name}:${++this.counter}`),
			inheritedEventCount
		});
	}
	/**
	* Claim write ownership for an existing session.
	* @param id - the session to claim.
	* @throws {SessionAlreadyOwnedError} when an active write handle exists.
	*/
	claimWrite(id) {
		if (this.writers.has(id)) throw new SessionAlreadyOwnedError(id);
		this.writers.set(id, null);
	}
	/**
	* Roll a failed write open back.
	* @param id - the session whose claim is dropped.
	*/
	releaseClaim(id) {
		this.writers.delete(id);
	}
	/**
	* The pending entry for a created-but-unmaterialized session, if any.
	* @param id - the session to look up.
	* @returns the pending header and in-memory revision.
	*/
	pendingOf(id) {
		return this.pending.get(id);
	}
	/**
	* Whether this process still tracks a created-but-unmaterialized session.
	* @param id - the session to test.
	* @returns true while the pending entry exists.
	*/
	hasPending(id) {
		return this.pending.has(id);
	}
	/**
	* Iterate the pending sessions for listing.
	* @returns the pending entries, keyed by session id.
	*/
	pendingEntries() {
		return this.pending.entries();
	}
	/**
	* Drop a pending entry once the session materialized durably.
	* @param id - the session that reached durable storage.
	*/
	materialized(id) {
		this.pending.delete(id);
	}
	/**
	* Track one open handle for teardown and, for a write handle, bind it as
	* the session's live event route.
	* @param handle - the just-constructed handle.
	* @returns the same handle, for construction-site chaining.
	*/
	adopt(handle) {
		this.openHandles.add(handle);
		if (handle.access === "write") this.writers.set(handle.id, handle);
		return handle;
	}
	/**
	* Release one handle's bookkeeping on close. A write handle drops its
	* ownership claim; a creator that never materialized leaves nothing behind —
	* the session never existed.
	* @param handle - the closing handle.
	* @param materialized - whether the session reached durable storage.
	*/
	release(handle, materialized) {
		this.openHandles.delete(handle);
		if (handle.access !== "write") return;
		this.writers.delete(handle.id);
		if (!materialized) this.pending.delete(handle.id);
	}
	/**
	* Drain and flush every active write handle — the service-wide durability
	* barrier behind `SessionPersistence.flush`.
	* @throws {AggregateError} naming each session whose flush failed; the
	*   remaining handles still flush.
	*/
	async flushAll() {
		const errors = [];
		for (const writer of [...this.writers.values()]) {
			if (writer === null) continue;
			try {
				await writer.drainLive();
				await writer.flush();
			} catch (error) {
				if (error instanceof SessionHandleClosedError) continue;
				errors.push(error);
			}
		}
		if (errors.length > 0) throw new AggregateError(errors, `${this.name} flush failed`);
	}
	/**
	* Install the backend's live session routing and teardown. Persistence
	* enforces one active write handle per id, so the listeners route published
	* sessions' events by id; the teardown effect closes every open handle —
	* close drains the routed buffer — and aggregates failures. This provider
	* owns no separate storage connection, so closing handles is the complete
	* teardown. Registrations are effects of the current fiber.
	* @param ctx - the backend's context.
	*/
	install(ctx) {
		ctx.on("session/event", (session, event) => {
			this.writers.get(session.id)?.enqueueLive(event, (error) => {
				ctx.logger.warn(`session-persistence: background write for session "${session.id}" failed (buffered events retained): ${String(error)}`);
			});
		});
		ctx.on("session/flush", (session) => {
			const writer = this.writers.get(session.id);
			if (writer === null || writer === void 0) return void 0;
			return (async () => {
				await writer.drainLive();
				await writer.flush();
			})();
		});
		ctx.on("session/disposed", (session) => {
			const writer = this.writers.get(session.id);
			if (writer === null || writer === void 0) return;
			writer.close().catch((error) => {
				ctx.logger.warn(`session-persistence: final drain for session "${session.id}" failed: ${String(error)}`);
			});
		});
		ctx.effect(() => async () => {
			const errors = [];
			for (const handle of [...this.openHandles]) try {
				await handle.close();
			} catch (error) {
				errors.push(error);
			}
			if (errors.length > 0) throw new AggregateError(errors, `${this.name} dispose failed`);
		}, `${this.name} open handles`);
	}
};
//#endregion
//#region lib/types/format.js
/**
* On-disk format helpers for the JSONL session-persistence backend: path
* sanitization (a {@link SessionId} is an unvalidated branded string, so it
* MUST be encoded before use in a path — no traversal, no collision), the
* per-project/session directory layout, header-line (de)serialization, and the
* truncation-repair offset computation.
*
* @module dsh-session-persistence-jsonl/format
*/
/**
* Return the artifact suffix for one physical encoding.
* @param compression - configured JSONL artifact encoding.
* @returns `.jsonl.zstd` for Zstandard or `.jsonl` for plaintext.
*/
function logSuffix(compression) {
	return compression === "zstd" ? ".jsonl.zstd" : ".jsonl";
}
/**
* Build the header line object from a {@link SessionHeader}.
* @param header - the immutable session metadata to serialize.
* @param inheritedEventCount - exact inherited prefix length; required for a
* seeded header and omitted only for an unseeded header.
* @returns the `type: 'session'`-tagged line object, absent optional fields omitted (never null).
*/
function toHeaderLine(header, inheritedEventCount) {
	if (header.isSeeded && inheritedEventCount === void 0) throw new Error("seeded session header requires an inherited event count");
	const cut = SessionLogOffset(inheritedEventCount ?? 0);
	if (!header.isSeeded && cut !== 0) throw new Error("unseeded session header inherited event count must be 0");
	return {
		type: "session",
		version: header.version,
		id: header.id,
		createdAt: header.createdAt,
		...header.cwd !== void 0 ? { cwd: header.cwd } : {},
		...header.parentSession !== void 0 ? { parentSession: header.parentSession } : {},
		...header.isSeeded ? { seedLength: cut } : {},
		...header.origin !== void 0 ? { origin: header.origin } : {},
		delegationDepth: header.delegationDepth ?? 0,
		...header.agentPreset !== void 0 ? { agentPreset: header.agentPreset } : {}
	};
}
/**
* Translate one version-0 physical header into logical metadata and its cut.
* @param line - the shape-checked first line of a log (see the `isHeaderLine` guard).
* @returns logical Session metadata paired with the exact inherited prefix length.
*/
function fromHeaderLine(line) {
	if (Object.hasOwn(line, "sandboxMode") || Object.hasOwn(line, "approvalPolicy")) throw new Error("session header uses retired policy baseline fields");
	return {
		meta: {
			version: line.version,
			id: line.id,
			createdAt: line.createdAt,
			...line.cwd !== void 0 ? { cwd: line.cwd } : {},
			...line.parentSession !== void 0 ? { parentSession: line.parentSession } : {},
			isSeeded: line.seedLength !== void 0,
			...line.origin !== void 0 ? { origin: line.origin } : {},
			delegationDepth: line.delegationDepth,
			...line.agentPreset !== void 0 ? { agentPreset: line.agentPreset } : {}
		},
		inheritedEventCount: SessionLogOffset(line.seedLength ?? 0)
	};
}
/** Type guard: a parsed first line is a well-formed session header. */
function isHeaderLine(value) {
	return typeof value === "object" && value !== null && value.type === "session" && typeof value.version === "number" && typeof value.id === "string" && typeof value.createdAt === "number" && Number.isSafeInteger(value.createdAt) && value.createdAt >= 0 && !Object.is(value.createdAt, -0) && typeof value.delegationDepth === "number" && Number.isSafeInteger(value.delegationDepth) && value.delegationDepth >= 0 && !Object.is(value.delegationDepth, -0) && (value.seedLength === void 0 || typeof value.seedLength === "number" && Number.isSafeInteger(value.seedLength) && value.seedLength >= 0 && !Object.is(value.seedLength, -0)) && (value.origin === void 0 || value.origin === "subagent") && (value.agentPreset === void 0 || typeof value.agentPreset === "string");
}
/**
* Encode an arbitrary string as a single safe path segment, injectively over ALL JS (UTF-16)
* strings — including lone surrogates. A {@link SessionId} is an unvalidated branded string,
* so this neutralizes `../`, absolute paths, NUL, and separators before any filesystem use.
* Safe code units remain literal; every other unit, including `~`, becomes
* `~XXXX`. Operating on code units preserves lone surrogates, while special-
* casing `.` and `..` prevents traversal by an otherwise safe whole segment.
*
* @param raw - the string to encode; must be non-empty (throws on `''`).
* @returns the escaped single path segment, decodable back to `raw`.
*/
function encodeSegment(raw) {
	if (raw.length === 0) throw new Error("cannot encode an empty path segment");
	if (raw === ".") return "~002E";
	if (raw === "..") return "~002E~002E";
	let out = "";
	for (let i = 0; i < raw.length; i++) {
		const code = raw.charCodeAt(i);
		const ch = String.fromCharCode(code);
		if (ch !== "~" && /^[A-Za-z0-9._-]$/.test(ch)) out += ch;
		else out += "~" + code.toString(16).toUpperCase().padStart(4, "0");
	}
	return out;
}
/**
* Build the readable directory key for a project path.
* Filesystem separators and drive separators become `-`; unsafe code units use
* the same `~XXXX` escape as session ids. The key is bounded for filesystem
* component limits. Separator replacement and truncation are intentionally
* lossy, following the common human-navigable project-directory convention.
* @param cwd - the session's project directory.
* @returns a single filesystem-safe project directory name.
*/
function projectKey(cwd) {
	if (cwd.length === 0) throw new Error("cannot encode an empty project path");
	let readable = "";
	let separatorRun = false;
	for (let i = 0; i < cwd.length; i++) {
		const code = cwd.charCodeAt(i);
		const ch = String.fromCharCode(code);
		if (ch === "/" || ch === "\\" || ch === ":") {
			if (!separatorRun) readable += "-";
			separatorRun = true;
		} else if (ch !== "~" && /^[A-Za-z0-9._-]$/.test(ch)) {
			readable += ch;
			separatorRun = false;
		} else {
			readable += "~" + code.toString(16).toUpperCase().padStart(4, "0");
			separatorRun = false;
		}
	}
	return `--${(readable.replace(/^-+/, "") || "root").slice(0, 251)}--`;
}
/**
* The configured root's human-navigable project directory. A configured root
* may be local or shared; this grouping does not prescribe its deployment.
* @param root - the backend's session root directory.
* @param cwd - the session's project directory; `undefined` selects `_no-cwd`.
* @returns the project directory path under `root`.
*/
function projectDir(root, cwd) {
	if (cwd === void 0) return join(root, "_no-cwd");
	return join(root, projectKey(cwd));
}
/**
* The directory owned by one session and available for future session-local
* artifacts.
* @param root - the backend's session root directory.
* @param cwd - the session's project directory.
* @param id - the session id, encoded to one safe path segment.
* @returns the session directory beneath its project directory.
*/
function sessionDir(root, cwd, id) {
	return join(projectDir(root, cwd), encodeSegment(id));
}
/**
* The append-only event-log file path for a session.
* @param root - the backend's session root directory.
* @param cwd - the session's project directory (`undefined` → `_no-cwd`).
* @param id - the session id, path-encoded via {@link encodeSegment} before filesystem use.
* @param compression - physical artifact encoding and filename suffix.
* @returns the session's configured JSONL artifact path.
*/
function logPath(root, cwd, id, compression) {
	return join(sessionDir(root, cwd, id), `session${logSuffix(compression)}`);
}
/**
* Serialize an event batch as JSONL lines (no trailing newline). With
* `packChunks` on, delta-chunk runs pack into `text-chunks` /
* `reasoning-chunks` / `tool-call-chunks` storage rows; off writes one event
* per line. Both modes range-encode provenance at the storage boundary.
* Reading is layout-blind either way ({@link scanLog} always decodes rows),
* so the switch changes only newly written bytes.
* @param events - the batch to serialize, in log order.
* @param packChunks - whether to pack delta runs into storage rows.
* @returns the batch's JSONL text; the writer adds the final newline.
*/
function eventLines(events, packChunks) {
	return (packChunks ? packChunkRuns(events) : events).map((record) => JSON.stringify(encodeProvenanceForStorage(record))).join("\n");
}
/**
* Losslessly shrink a record's `sourceEventSeqs` for the log: consecutive
* runs of at least three seqs become `[start, end]` pairs, and any other list
* stays verbatim.
* @param record - one stored record (event or packed row).
* @returns the record with its provenance in storage form (widened from the
*   in-memory `SessionSeq[]`; {@link expandProvenanceFromStorage} restores it).
*/
function encodeProvenanceForStorage(record) {
	if (!("sourceEventSeqs" in record)) return record;
	return {
		...record,
		sourceEventSeqs: encodeSeqRanges(record.sourceEventSeqs)
	};
}
/**
* Expand a parsed line's storage-form provenance back to `SessionSeq[]`.
* @param parsed - the JSON-parsed value of one stored line.
* @returns the value with provenance expanded.
* @throws when the record or its storage-form provenance is malformed.
*/
function expandProvenanceFromStorage(parsed) {
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new TypeError("stored session records must be objects");
	const record = parsed;
	if (record.sourceEventSeqs === void 0) return parsed;
	if (!Number.isSafeInteger(record.seq) || record.seq < 0) throw new TypeError("stored session event seq must be a non-negative safe integer");
	return {
		...record,
		sourceEventSeqs: decodeSeqRanges(record.sourceEventSeqs, record.seq)
	};
}
/** Parse one complete header record supplied independently from event rows. */
/**
* Refuse a header carrying a format version this build does not read BEFORE
* validating the current header shape or decoding any event row: a future
* format need not satisfy this build's structural checks at all, and its user
* must see "upgrade the harness", never "corrupt session log".
* @param parsed - the JSON-parsed first line of a session artifact.
*/
function refuseForeignFormatVersion(parsed) {
	if (typeof parsed !== "object" || parsed === null) return;
	const { version, id } = parsed;
	if (typeof version !== "number" || version === SESSION_FORMAT_VERSION) return;
	throw new SessionFormatUnsupportedError(sessionFormatVersionRefusal(typeof id === "string" ? id : String(id), version));
}
function parseHeaderRecord(record) {
	if (record.length === 0 || record.at(-1) !== 10 || record.indexOf(10) !== record.length - 1) throw new Error("empty or header-less session log");
	let parsed;
	try {
		parsed = JSON.parse(record.subarray(0, -1).toString("utf8"));
	} catch {
		throw new Error("corrupt session log: header line is not valid JSON");
	}
	refuseForeignFormatVersion(parsed);
	if (!isHeaderLine(parsed)) throw new Error("corrupt session log: first line is not a session header");
	return fromHeaderLine(parsed);
}
/**
* Incrementally scan complete JSONL event records after an independently
* supplied header record. Newline search and byte offsets stay on raw buffers;
* only complete records are decoded to UTF-8. A fragment crossing writes is
* copied because a decoder may reuse its output buffer after `write()` returns.
*/
var SessionLogScanner = class {
	meta;
	inheritedEventCount;
	events = [];
	fragments = [];
	fragmentBytes = 0;
	inputBytes;
	committedBytes;
	eventLine = 0;
	issue;
	finished = false;
	/**
	* Create an event scanner from exactly one newline-terminated header record.
	* @param headerRecord - the complete first JSONL record, including its newline.
	*/
	constructor(headerRecord) {
		const parsed = parseHeaderRecord(headerRecord);
		this.meta = parsed.meta;
		this.inheritedEventCount = parsed.inheritedEventCount;
		this.inputBytes = headerRecord.length;
		this.committedBytes = headerRecord.length;
	}
	/**
	* Consume the next raw plaintext chunk, retaining only an incomplete final record.
	* @param chunk - bytes immediately following all previously supplied bytes.
	*/
	write(chunk) {
		if (this.finished) throw new Error("cannot write to a finished session log scanner");
		const chunkStart = this.inputBytes;
		this.inputBytes += chunk.length;
		let lineStart = 0;
		for (let newline = chunk.indexOf(10); newline !== -1; newline = chunk.indexOf(10, lineStart)) {
			const fragment = chunk.subarray(lineStart, newline);
			let line = fragment;
			if (this.fragments.length > 0) {
				if (fragment.length > 0) this.fragments.push(fragment);
				line = Buffer.concat(this.fragments, this.fragmentBytes + fragment.length);
				this.fragments = [];
				this.fragmentBytes = 0;
			}
			this.consumeEventLine(line, chunkStart + newline + 1);
			lineStart = newline + 1;
		}
		if (lineStart < chunk.length) {
			const fragment = Buffer.from(chunk.subarray(lineStart));
			this.fragments.push(fragment);
			this.fragmentBytes += fragment.length;
		}
	}
	/**
	* Snapshot progress before appending a recoverable torn-frame prefix.
	* @returns byte, committed-prefix, and expanded-event cursors.
	*/
	checkpoint() {
		return {
			inputBytes: this.inputBytes,
			committedBytes: this.committedBytes,
			eventCount: SessionLogOffset(this.events.length)
		};
	}
	/**
	* Finish scanning, ignoring a final record without a newline as a torn tail.
	* @returns the header, contiguous event prefix, and safe truncation offset.
	*/
	finish() {
		this.finished = true;
		return {
			meta: this.meta,
			inheritedEventCount: this.inheritedEventCount,
			events: this.events,
			committedBytes: this.committedBytes
		};
	}
	/** Decode one complete event row and update the contiguous prefix. */
	consumeEventLine(line, endByte) {
		this.eventLine += 1;
		let decoded;
		try {
			decoded = decodeStorageRecord(expandProvenanceFromStorage(JSON.parse(line.toString("utf8"))));
		} catch {
			this.issue ??= /* @__PURE__ */ new Error(`corrupt session log: unparsable committed event at line ${this.eventLine}`);
			return;
		}
		if (this.issue !== void 0) {
			if (decoded.some((event) => event.type === "turn/end")) throw this.issue;
			return;
		}
		const rowStart = this.events.length;
		for (const event of decoded) {
			if (event.seq !== this.events.length) {
				const expected = this.events.length;
				this.events.length = rowStart;
				this.issue = /* @__PURE__ */ new Error(`corrupt session log: seq gap in committed region at line ${this.eventLine} (expected ${expected}, got ${event.seq})`);
				if (decoded.some((candidate) => candidate.type === "turn/end")) throw this.issue;
				return;
			}
			this.events.push(event);
		}
		this.committedBytes = endByte;
	}
};
/**
* Parse a complete or torn JSONL buffer into its preserved event prefix. This
* compatibility wrapper supplies the first record separately, then delegates
* event rows to {@link SessionLogScanner}.
*
* @param buffer - the raw bytes of the log file (header line first).
* @returns the header, preserved event prefix, and byte offset safe to append at.
*/
function scanLog(buffer) {
	const headerEnd = buffer.indexOf(10);
	if (headerEnd === -1) throw new Error("empty or header-less session log");
	const scanner = new SessionLogScanner(buffer.subarray(0, headerEnd + 1));
	scanner.write(buffer.subarray(headerEnd + 1));
	return scanner.finish();
}
/**
* Parse just the header line of a log into logical metadata plus its exact
* inherited cut, or `undefined` if it is missing/not a header.
* @param firstLine - the first line of a log file (without its trailing newline).
* @returns parsed storage metadata, or `undefined` for a malformed header.
*/
function parseHeader(firstLine) {
	let parsed;
	try {
		parsed = JSON.parse(firstLine);
	} catch {
		return;
	}
	refuseForeignFormatVersion(parsed);
	if (!isHeaderLine(parsed)) return void 0;
	return fromHeaderLine(parsed);
}
/**
* Parse only the logical header fields needed by lightweight listing.
* @param firstLine - first JSONL line without its trailing newline.
* @returns the logical Session header, or `undefined` for a malformed line.
*/
function parseHeaderMeta(firstLine) {
	return parseHeader(firstLine)?.meta;
}
//#endregion
//#region lib/types/zstd-private-decoder.js
/**
* Node-private synchronous Zstandard frame decoder optimization.
* @module dsh-session-persistence-jsonl/zstd-private-decoder
*/
const DECODE_CHUNK_SIZE = 1024 * 1024;
/** Return the stream with its observed private Node contract, or reject that optimization. */
function privateZstdStream(stream) {
	const candidate = stream;
	const handle = candidate._handle;
	const errorKey = Reflect.ownKeys(stream).find((key) => typeof key === "symbol" && key.description === "kError");
	/* v8 ignore next -- one test runtime exposes one Node-private shape; the Node 22/24/26 matrix checks compatibility. */
	if (typeof handle !== "object" || handle === null || typeof handle.writeSync !== "function" || !(candidate._writeState instanceof Uint32Array) || candidate._writeState.length < 2 || typeof candidate._defaultFlushFlag !== "number" || errorKey === void 0 || candidate[errorKey] !== null) return void 0;
	return {
		stream,
		errorKey
	};
}
/**
* Synchronous multi-frame decoder backed by one Node Zstd stream handle. Node
* exposes synchronous decoding only as a one-shot API, so this adapter uses
* the stream's private handle contract to reuse its native context and output
* chunks across frames.
*/
var NodePrivateZstdFrameDecoder = class NodePrivateZstdFrameDecoder {
	stream;
	errorKey;
	output = Buffer.allocUnsafe(DECODE_CHUNK_SIZE);
	decoderError;
	started = false;
	closed = false;
	constructor(stream, errorKey) {
		this.stream = stream;
		this.errorKey = errorKey;
		this.stream.on("error", (error) => {
			this.decoderError ??= error;
		});
	}
	/**
	* Create the optimized decoder when this Node release exposes the expected
	* private stream shape.
	* @returns a shared decoder, or `undefined` when callers must use the public fallback.
	*/
	static create() {
		const stream = createZstdDecompress({ chunkSize: DECODE_CHUNK_SIZE });
		const privateAccess = privateZstdStream(stream);
		/* v8 ignore next -- reached only when a supported Node release changes its private stream shape. */
		if (privateAccess !== void 0) return new NodePrivateZstdFrameDecoder(privateAccess.stream, privateAccess.errorKey);
		/* v8 ignore next -- the active Node runtime passed the private-shape probe above. */
		stream.close();
	}
	/** @inheritdoc */
	*decode(source, frames) {
		if (this.started) throw new Error("Zstandard frame decoder was already started");
		if (this.closed) throw new Error("cannot start a closed Zstandard frame decoder");
		this.started = true;
		try {
			for (const frame of frames) try {
				yield this.decodeFrame(source.subarray(frame.start, frame.end));
			} catch (error) {
				throw new Error(`corrupt Zstandard session log: frame at byte ${frame.start} failed validation`, { cause: error });
			}
		} finally {
			this.close();
		}
	}
	/** Decode one frame; its returned scratch view remains valid until the next call. */
	decodeFrame(input) {
		const handle = this.stream._handle;
		/* v8 ignore next -- decode() rejects closed instances before entering this private frame operation. */
		if (this.closed || handle === null) throw new Error("cannot decode with a closed Zstandard frame decoder");
		let inputOffset = 0;
		let inputRemaining = input.length;
		let outputBytes = 0;
		const fullChunks = [];
		for (;;) {
			handle.writeSync(this.stream._defaultFlushFlag, input, inputOffset, inputRemaining, this.output, 0, this.output.length);
			if (this.decoderError !== void 0) throw this.decoderError;
			const internalError = this.stream[this.errorKey];
			if (internalError !== null) {
				if (internalError instanceof Error) throw internalError;
				throw new Error("Zstandard decoder exposed a non-Error internal failure");
			}
			const outputAfter = this.stream._writeState[0];
			const inputAfter = this.stream._writeState[1];
			const consumed = inputRemaining - inputAfter;
			const produced = this.output.length - outputAfter;
			if (produced > 0) {
				outputBytes += produced;
				/* v8 ignore next -- Buffer cannot materialize a frame beyond its own process-wide maximum length. */
				if (outputBytes > constants$1.MAX_LENGTH) throw new Error(`Zstandard frame output exceeds ${constants$1.MAX_LENGTH} bytes`);
			}
			if (outputAfter !== 0) {
				/* v8 ignore next -- structurally scanned ranges contain exactly one complete frame and no trailing bytes. */
				if (inputAfter !== 0) throw new Error("Zstandard frame decoder left trailing input");
				const finalChunk = this.output.subarray(0, produced);
				if (fullChunks.length === 0) return finalChunk;
				if (produced > 0) fullChunks.push(Buffer.from(finalChunk));
				const onlyChunk = fullChunks[0];
				return fullChunks.length === 1 ? onlyChunk : Buffer.concat(fullChunks, outputBytes);
			}
			fullChunks.push(Buffer.from(this.output));
			inputOffset += consumed;
			inputRemaining = inputAfter;
		}
	}
	/** @inheritdoc */
	close() {
		if (this.closed) return;
		this.closed = true;
		this.stream.close();
	}
};
//#endregion
//#region lib/types/zstd-public-decoder.js
/**
* Public-API synchronous Zstandard frame decoder fallback.
* @module dsh-session-persistence-jsonl/zstd-public-decoder
*/
/** Multi-frame adapter built exclusively from Node's supported one-shot API. */
var PublicZstdFrameDecoder = class {
	started = false;
	closed = false;
	/** @inheritdoc */
	*decode(source, frames) {
		if (this.started) throw new Error("Zstandard frame decoder was already started");
		if (this.closed) throw new Error("cannot start a closed Zstandard frame decoder");
		this.started = true;
		try {
			for (const { start, end } of frames) {
				let decoded;
				try {
					decoded = zstdDecompressSync(source.subarray(start, end));
				} catch (error) {
					throw new Error(`corrupt Zstandard session log: frame at byte ${start} failed validation`, { cause: error });
				}
				yield decoded;
			}
		} finally {
			this.close();
		}
	}
	/** @inheritdoc */
	close() {
		this.closed = true;
	}
};
//#endregion
//#region lib/types/zstd.js
/**
* Zstandard frame primitives for the JSONL persistence backend. The backend
* owns a concatenated-frame container so it can append and recover batches
* without exposing compression mechanics through the persistence seam.
* @module dsh-session-persistence-jsonl/zstd
*/
const ZSTD_MAGIC = 4247762216;
const zstdCompressAsync = promisify(zstdCompress);
const zstdDecompressAsync = promisify(zstdDecompress);
const CHECKSUM_OPTIONS = { params: { [constants.ZSTD_c_checksumFlag]: 1 } };
const INCOMPLETE_FRAME_OPTIONS = { finishFlush: constants.ZSTD_e_flush };
/**
* Locate complete frames without decompressing their blocks. Invalid complete
* structure rejects; EOF inside the final frame returns its start for repair.
* @param buffer - complete bytes currently present in the session artifact.
* @param maxFrames - optional complete-frame limit for metadata-only readers.
* @returns complete frame ranges and an optional incomplete-final-frame start.
*/
function scanZstdFrames(buffer, maxFrames = Number.POSITIVE_INFINITY) {
	const frames = [];
	let offset = 0;
	while (offset < buffer.length) {
		const start = offset;
		if (buffer.length - offset < 4) return {
			frames,
			tornStart: start
		};
		if (buffer.readUInt32LE(offset) !== ZSTD_MAGIC) throw new Error(`corrupt Zstandard session log: invalid frame magic at byte ${offset}`);
		offset += 4;
		if (offset === buffer.length) return {
			frames,
			tornStart: start
		};
		const descriptor = buffer.readUInt8(offset);
		offset += 1;
		if ((descriptor & 24) !== 0) throw new Error(`corrupt Zstandard session log: reserved frame-header bit at byte ${offset - 1}`);
		const contentSizeFlag = descriptor >>> 6;
		const singleSegment = (descriptor & 32) !== 0;
		const checksum = (descriptor & 4) !== 0;
		const dictionaryFlag = descriptor & 3;
		const dictionaryBytes = dictionaryFlag === 3 ? 4 : dictionaryFlag;
		const contentSizeBytes = contentSizeFlag === 0 ? singleSegment ? 1 : 0 : 1 << contentSizeFlag;
		const remainingHeaderBytes = (singleSegment ? 0 : 1) + dictionaryBytes + contentSizeBytes;
		if (buffer.length - offset < remainingHeaderBytes) return {
			frames,
			tornStart: start
		};
		offset += remainingHeaderBytes;
		for (;;) {
			if (buffer.length - offset < 3) return {
				frames,
				tornStart: start
			};
			const blockHeader = buffer.readUIntLE(offset, 3);
			offset += 3;
			const lastBlock = (blockHeader & 1) !== 0;
			const blockType = blockHeader >>> 1 & 3;
			const blockSize = blockHeader >>> 3;
			if (blockType === 3) throw new Error(`corrupt Zstandard session log: reserved block type at byte ${offset - 3}`);
			const payloadBytes = blockType === 1 ? 1 : blockSize;
			if (buffer.length - offset < payloadBytes) return {
				frames,
				tornStart: start
			};
			offset += payloadBytes;
			if (lastBlock) break;
		}
		if (checksum) {
			if (buffer.length - offset < 4) return {
				frames,
				tornStart: start
			};
			offset += 4;
		}
		frames.push({
			start,
			end: offset
		});
		if (frames.length === maxFrames) return { frames };
	}
	return { frames };
}
/**
* Compress one independently decodable, checksummed Zstandard frame.
* @param input - JSONL bytes for a header or durable event batch.
* @returns the complete encoded frame.
*/
async function compressZstdFrame(input) {
	return zstdCompressAsync(input, CHECKSUM_OPTIONS);
}
/**
* Decompress one complete frame and validate its checksum.
* @param input - one structurally complete Zstandard frame.
* @returns the frame plaintext.
*/
async function decompressZstdFrame(input) {
	return zstdDecompressAsync(input);
}
/**
* Select the shared private decoder when the running Node 22/24/26 shape is
* compatible, otherwise preserve correctness with the public one-shot API.
* @returns a synchronous decoder with an implementation-independent lifecycle.
*/
function createZstdFrameDecoder() {
	return NodePrivateZstdFrameDecoder.create() ?? new PublicZstdFrameDecoder();
}
/**
* Recover available plaintext from a structurally incomplete final frame.
* `ZSTD_e_flush` deliberately suppresses final-frame and checksum completion;
* callers must establish the torn frame boundary before using this helper.
* @param input - available bytes from a known incomplete Zstandard frame.
* @returns plaintext produced from the available input.
*/
async function decompressZstdPrefix(input) {
	return zstdDecompressAsync(input, INCOMPLETE_FRAME_OPTIONS);
}
//#endregion
//#region lib/types/win32.js
/**
* Windows durable namespace helpers for the JSONL backend.
*
* POSIX publishes a newly-created log by creating a directory entry and then
* fsyncing the parent directory. Windows does not expose that parent-directory
* fsync contract through Node, so the Windows path uses the native durable
* namespace primitive instead: create a staging object in the target directory
* and publish it with `MoveFileExW(..., MOVEFILE_WRITE_THROUGH)` without
* replacement or cross-volume copy fallback.
*
* @module dsh-session-persistence-jsonl/win32
*/
const MOVEFILE_WRITE_THROUGH = 8;
const ERROR_FILE_NOT_FOUND = 2;
const ERROR_PATH_NOT_FOUND = 3;
const ERROR_ACCESS_DENIED = 5;
const ERROR_NOT_SAME_DEVICE = 17;
const ERROR_FILE_EXISTS = 80;
const ERROR_INVALID_NAME = 123;
const ERROR_ALREADY_EXISTS = 183;
let bindings;
/** Load the small Win32 API lazily so non-Windows processes never load Koffi. */
async function win32() {
	if (bindings !== void 0) return bindings;
	const kernel32 = (await import("koffi")).default.load("kernel32.dll");
	bindings = {
		moveFileExW: kernel32.func("__stdcall", "MoveFileExW", "int", [
			"str16",
			"str16",
			"uint"
		]),
		getLastError: kernel32.func("__stdcall", "GetLastError", "uint", [])
	};
	return bindings;
}
function errnoCode(win32Code) {
	switch (win32Code) {
		case ERROR_FILE_NOT_FOUND:
		case ERROR_PATH_NOT_FOUND: return "ENOENT";
		case ERROR_ACCESS_DENIED: return "EACCES";
		case ERROR_NOT_SAME_DEVICE: return "EXDEV";
		case ERROR_FILE_EXISTS:
		case ERROR_ALREADY_EXISTS: return "EEXIST";
		case ERROR_INVALID_NAME: return "EINVAL";
		default: return "EIO";
	}
}
function win32Error(syscall, win32Code, path, dest) {
	const code = errnoCode(win32Code);
	const error = /* @__PURE__ */ new Error(`${syscall} ${code} (Win32 ${win32Code}): ${path} -> ${dest}`);
	error.code = code;
	error.errno = win32Code;
	error.syscall = syscall;
	error.path = path;
	error.dest = dest;
	error.win32Code = win32Code;
	return error;
}
function isENOENT$1(error) {
	return error?.code === "ENOENT";
}
function isEEXIST(error) {
	return error?.code === "EEXIST";
}
async function assertDirectory(path) {
	try {
		if ((await stat(path === parse(path).root ? path : toNamespacedPath(path))).isDirectory()) return true;
		const error = /* @__PURE__ */ new Error(`path exists but is not a directory: ${path}`);
		error.code = "ENOTDIR";
		error.path = path;
		throw error;
	} catch (error) {
		if (isENOENT$1(error)) return false;
		throw error;
	}
}
/**
* Publish `existing` at `replacement` with Windows write-through rename
* semantics. The destination must not already exist; the move must stay within
* the volume (no copy fallback flag is set).
* @param existing - the synced staging path to move.
* @param replacement - the final path, which must not already exist.
*/
async function publishNewFileWin32(existing, replacement) {
	const api = await win32();
	if (api.moveFileExW(toNamespacedPath(existing), toNamespacedPath(replacement), MOVEFILE_WRITE_THROUGH) === 0) throw win32Error("MoveFileExW", api.getLastError(), existing, replacement);
}
/**
* Create `target` and its missing ancestors with durable Windows namespace
* publication. Each missing directory is first created as a random staging
* sibling, then moved to its final name with `MOVEFILE_WRITE_THROUGH`; races
* with another creator are accepted only after verifying the winner is a
* directory.
* @param target - the absolute directory path to create durably when absent.
*/
async function ensureDurableDirectoryWin32(target) {
	const absolute = resolve(target);
	const root = parse(absolute).root;
	await assertDirectory(root);
	const segments = absolute.slice(root.length).split(/[\\/]+/).filter((part) => part.length > 0);
	let current = root;
	for (const segment of segments) {
		const next = join(current, segment);
		if (!await assertDirectory(next)) await createLeafDirectoryWin32(current, next);
		current = next;
	}
}
async function createLeafDirectoryWin32(parent, target) {
	const staging = await mkdtemp(toNamespacedPath(join(parent, ".dsh-mkdir-")));
	try {
		await publishNewFileWin32(staging, target);
	} catch (error) {
		await rm(staging, {
			recursive: true,
			force: true
		});
		if (isEEXIST(error) && await assertDirectory(target)) return;
		throw error;
	}
}
//#endregion
//#region lib/types/index.js
/**
* JSONL durable session-persistence backend. It stores a header and contiguous
* events in one append-only file per session and serves the handle-based
* `SessionPersistence` API: `create`/`open` return per-session handles, and
* every read validates the same fail-closed storage contract.
* @module @deepseek-ai/dsh-session-persistence-jsonl
*/
/**
* Internal handoff-reuse policy, not deployment configuration: a cold
* observation and the resume that immediately follows it reuse one parsed
* log, so the memo only needs the sessions in flight between those steps.
*/
const COLD_LOG_MEMO_MAX_ENTRIES = 2;
const DEFAULT_PACK_CHUNKS = true;
const DEFAULT_COMPRESSION = "zstd";
/**
* Internal scheduling constant, not deployment configuration: balance
* frame-boundary event-loop yields against `setImmediate` overhead. One frame
* remains an indivisible synchronous decode.
*/
const ZSTD_DECODE_YIELD_INTERVAL_MS = 500;
/** Assert that the independently decodable first frame contains only the header record. */
function assertZstdHeaderFrame(plaintext) {
	if (plaintext.length === 0 || plaintext.indexOf(10) !== plaintext.length - 1) throw new Error("corrupt Zstandard session log: first frame is not exactly one header line");
}
/** Loader schema for the JSONL artifact's physical encoding. */
const JsonlCompressionSchema = z.union([z.const("zstd"), z.const("none")]).default(DEFAULT_COMPRESSION);
/** Build the stat-derived best-effort change token shared by full and lightweight reads. */
function fileRevision(identity) {
	return SessionPersistenceRevision([
		identity.dev,
		identity.ino,
		identity.size,
		identity.mtimeNs,
		identity.ctimeNs
	].join(":"));
}
/** Whether a filesystem error means absence; every non-ENOENT failure must surface. */
function isENOENT(error) {
	return error?.code === "ENOENT";
}
/**
* The JSONL persistence backend. Load as a plugin; it registers as
* `ctx.sessionPersistence`. Sessions materialize lazily: a created session is
* visible to this process immediately, reaches disk on its first append or
* flush, and never existed if the process crashes before that.
*/
var JsonlSessionPersistence = class extends SessionPersistence {
	config;
	static Config = z.object({
		root: z.string().required(),
		packChunks: z.boolean().default(DEFAULT_PACK_CHUNKS),
		compression: JsonlCompressionSchema
	});
	/** Backend label for diagnostics and effects; shadows `Service.name` without changing the service key. */
	name = "session-persistence-jsonl";
	root;
	packChunks;
	compression;
	rootEncodingCheck;
	tracker = new JsonlBackendTracker(this.name);
	/**
	* Bounded LRU of parsed, validated stored logs keyed by session id and
	* guarded by the stat-derived revision, so an immediate cold-read handoff
	* (observation then resume) parses the artifact once. Every local mutation
	* for an id invalidates its entry; a foreign write misses through the
	* revision guard.
	*/
	coldLogMemo = /* @__PURE__ */ new Map();
	constructor(ctx, config) {
		super(ctx);
		this.config = config;
		this.root = resolve(config.root);
		this.packChunks = config.packChunks ?? DEFAULT_PACK_CHUNKS;
		this.compression = config.compression ?? DEFAULT_COMPRESSION;
		this.assertUsableRoot();
		this.tracker.install(ctx);
	}
	/**
	* Refusal-diagnostics hook: the absolute target path, without touching the filesystem.
	* @param meta - the stored header naming the session and its cwd.
	* @returns the artifact kind and absolute path.
	*/
	locate(meta) {
		return {
			kind: "jsonl",
			path: logPath(this.root, meta.cwd, meta.id, this.compression)
		};
	}
	/**
	* Create a new stored session and take its write ownership. The session is
	* visible to this process immediately; the physical artifact appears on the
	* first append or flush.
	* @param header - the immutable header to store; must be losslessly
	*   JSON-serializable with a non-negative safe-integer `createdAt`.
	* @param options - optional cancellation.
	* @returns the owned write handle.
	*/
	async create(header, options) {
		options?.signal?.throwIfAborted();
		const snapshot = materializeCreateHeader(header);
		toHeaderLine(snapshot, options?.inheritedEventCount);
		const inheritedEventCount = SessionLogOffset(options?.inheritedEventCount ?? 0);
		await this.ensureRootEncoding();
		options?.signal?.throwIfAborted();
		if (this.tracker.hasPending(snapshot.id) || await this.findLog(snapshot.id, options?.signal) !== void 0) throw new SessionAlreadyExistsError(snapshot.id);
		options?.signal?.throwIfAborted();
		this.tracker.registerCreated(snapshot, inheritedEventCount);
		return this.tracker.adopt(new JsonlSessionHandle(this, snapshot.id, snapshot, "write", {
			cursor: 0,
			materialized: false,
			inheritedEventCount
		}));
	}
	/**
	* Open an existing stored session for `read` or single-writer `write`.
	* @param id - the stored session to open.
	* @param access - `read` (no ownership) or `write` (atomic in-process claim).
	* @param options - optional cancellation.
	* @returns the open handle.
	*/
	async open(id, access, options) {
		options?.signal?.throwIfAborted();
		await this.ensureRootEncoding();
		options?.signal?.throwIfAborted();
		const pending = this.tracker.pendingOf(id);
		if (access === "read") {
			if (pending !== void 0) return this.tracker.adopt(new JsonlSessionHandle(this, id, pending.header, "read", {
				cursor: 0,
				materialized: false,
				inheritedEventCount: pending.inheritedEventCount
			}));
			const snapshot = await this.stat(id, options);
			if (snapshot === void 0) {
				const stored = await this.requireStoredLog(id, options?.signal);
				return this.tracker.adopt(new JsonlSessionHandle(this, id, stored.meta, "read", {
					cursor: 0,
					materialized: true,
					inheritedEventCount: stored.inheritedEventCount
				}));
			}
			assertVersion(snapshot.header, this.locate(snapshot.header));
			return this.tracker.adopt(new JsonlSessionHandle(this, id, snapshot.header, "read", {
				cursor: 0,
				materialized: true,
				inheritedEventCount: snapshot.inheritedEventCount
			}));
		}
		this.tracker.claimWrite(id);
		try {
			const stored = await this.requireStoredLog(id, options?.signal);
			return this.tracker.adopt(new JsonlSessionHandle(this, id, stored.meta, "write", {
				cursor: stored.events.length,
				materialized: true,
				tornTruncateTo: stored.tornTruncateTo,
				recoveredTail: stored.recoveredTail,
				inheritedEventCount: stored.inheritedEventCount,
				primed: stored.events
			}));
		} catch (error) {
			this.tracker.releaseClaim(id);
			throw error;
		}
	}
	/**
	* Flush every active write handle in one durability barrier; see the seam
	* contract.
	* @returns resolution once every write handle active at the call has flushed.
	*/
	flush() {
		return this.tracker.flushAll();
	}
	/**
	* Observe one stored session without reading its event log.
	* @param id - the stored session to observe.
	* @param options - optional cancellation.
	* @returns the snapshot (`sizeBytes` carries the physical artifact size), or
	*   `undefined` when the session does not exist.
	*/
	async stat(id, options) {
		options?.signal?.throwIfAborted();
		await this.ensureRootEncoding();
		options?.signal?.throwIfAborted();
		const pending = this.tracker.pendingOf(id);
		if (pending !== void 0) return {
			header: pending.header,
			revision: pending.revision,
			inheritedEventCount: pending.inheritedEventCount
		};
		const path = await this.findLog(id, options?.signal);
		if (path === void 0) return void 0;
		let first;
		try {
			first = this.compression === "zstd" ? await this.readFirstZstdLine(path, options?.signal) : await this.readFirstLine(path, options?.signal);
		} catch (error) {
			options?.signal?.throwIfAborted();
			if (isENOENT(error)) return void 0;
			throw error;
		}
		options?.signal?.throwIfAborted();
		if (first === void 0) return void 0;
		let stored;
		try {
			stored = parseHeader(first);
		} catch (error) {
			if (error instanceof SessionFormatUnsupportedError) throw new SessionFormatUnsupportedError(`${error.message} (raw log: ${path})`, {
				kind: "jsonl",
				path
			});
			throw error;
		}
		if (stored === void 0) return void 0;
		const meta = stored.meta;
		await this.assertStoredIdentity(path, meta, id, options?.signal);
		try {
			const identity = await stat(path, { bigint: true });
			options?.signal?.throwIfAborted();
			return {
				header: meta,
				revision: fileRevision(identity),
				sizeBytes: Number(identity.size),
				inheritedEventCount: stored.inheritedEventCount
			};
		} catch (error) {
			options?.signal?.throwIfAborted();
			if (isENOENT(error)) return void 0;
			throw error;
		}
	}
	/**
	* List every stored session visible to this process: materialized artifacts
	* plus this process's created-but-unmaterialized sessions.
	* @param options - optional cancellation.
	* @returns one snapshot per session, in no promised order.
	*/
	async list(options) {
		const signal = options?.signal;
		const snapshots = [];
		const listed = /* @__PURE__ */ new Set();
		const pending = [...this.tracker.pendingEntries()];
		for (const artifact of await this.listArtifacts(signal)) {
			signal?.throwIfAborted();
			try {
				const identity = await stat(artifact.path, { bigint: true });
				signal?.throwIfAborted();
				listed.add(artifact.header.id);
				snapshots.push({
					header: artifact.header,
					revision: fileRevision(identity),
					sizeBytes: Number(identity.size)
				});
			} catch (error) {
				signal?.throwIfAborted();
				if (!isENOENT(error)) throw error;
			}
		}
		for (const [id, entry] of pending) if (!listed.has(id)) snapshots.push({
			header: entry.header,
			revision: entry.revision
		});
		signal?.throwIfAborted();
		return snapshots;
	}
	/** Resolve and read one stored log, refusing loudly when the artifact is absent. */
	async requireStoredLog(id, signal) {
		const path = await this.findLog(id, signal);
		if (path === void 0) throw new SessionPersistenceNotFoundError(id);
		return this.readStoredLog(path, id, signal);
	}
	/**
	* Read, parse, and validate one stored log as the current logical prefix.
	* @param path - the artifact file to read.
	* @param expectedId - the session identity the artifact must carry.
	* @param signal - optional cancellation for the stat/read/decode work.
	* @returns the validated stored log with any torn-tail truncation point.
	*/
	async readStoredLog(path, expectedId, signal) {
		signal?.throwIfAborted();
		const probe = fileRevision(await stat(path, { bigint: true }));
		const memoized = this.coldLogMemo.get(expectedId);
		if (memoized !== void 0 && memoized.revision === probe) {
			this.coldLogMemo.delete(expectedId);
			this.coldLogMemo.set(expectedId, memoized);
			return memoized;
		}
		const { buffer, revision } = await this.readStableFile(path, signal);
		let parsed;
		try {
			if (this.compression === "zstd") parsed = await this.readZstdPrefix(buffer, signal);
			else {
				signal?.throwIfAborted();
				const { meta, inheritedEventCount, events, committedBytes } = scanLog(buffer);
				signal?.throwIfAborted();
				parsed = {
					meta,
					inheritedEventCount,
					events,
					tornTruncateTo: committedBytes < buffer.byteLength ? committedBytes : void 0,
					recoveredTail: []
				};
			}
		} catch (error) {
			signal?.throwIfAborted();
			if (error instanceof SessionFormatUnsupportedError) throw new SessionFormatUnsupportedError(`${error.message} (raw log: ${path})`, {
				kind: "jsonl",
				path
			});
			throw new SessionPersistenceCorruptionError(`session "${expectedId}": stored log is corrupt: ${String(error)} (raw log: ${path})`, { cause: error });
		}
		signal?.throwIfAborted();
		await this.assertStoredIdentity(path, parsed.meta, expectedId, signal);
		signal?.throwIfAborted();
		assertStoredId(expectedId, parsed.meta);
		const location = this.locate(parsed.meta);
		assertVersion(parsed.meta, location);
		validateStoredEvents(parsed.meta, parsed.events, location);
		const stored = {
			...parsed,
			revision
		};
		this.coldLogMemo.delete(expectedId);
		this.coldLogMemo.set(expectedId, stored);
		for (const oldest of this.coldLogMemo.keys()) {
			if (this.coldLogMemo.size <= COLD_LOG_MEMO_MAX_ENTRIES) break;
			this.coldLogMemo.delete(oldest);
		}
		return stored;
	}
	/**
	* Resolve a session's unique log path.
	* @param id - the stored session to locate.
	* @param signal - optional cancellation for the directory scans.
	* @returns the artifact path, or `undefined` when absent.
	*/
	async resolveLog(id, signal) {
		await this.ensureRootEncoding();
		signal?.throwIfAborted();
		return this.findLog(id, signal);
	}
	/**
	* Durably append one validated batch; lazily materializes on the first write.
	* @param header - the session's stored header.
	* @param events - the validated contiguous batch, in seq order.
	* @param isMaterialized - whether the session already has a durable artifact.
	* @param inheritedEventCount - the exact fork-inherited prefix length written into a materializing header line.
	*/
	async persistBatch(header, events, isMaterialized, inheritedEventCount) {
		this.coldLogMemo.delete(header.id);
		await this.ensureRootEncoding();
		if (isMaterialized) await this.appendLines(header, events);
		else {
			await this.materialize(header, inheritedEventCount, events);
			this.tracker.materialized(header.id);
		}
	}
	/**
	* Materialize a header-only artifact for an explicitly durable empty session.
	* @param header - the session's stored header.
	* @param inheritedEventCount - the exact fork-inherited prefix length written into the header line.
	*/
	async persistHeader(header, inheritedEventCount) {
		this.coldLogMemo.delete(header.id);
		await this.ensureRootEncoding();
		await this.materialize(header, inheritedEventCount, []);
		this.tracker.materialized(header.id);
	}
	/**
	* Truncate a torn physical tail durably before this session's first new append.
	* @param header - the session's stored header.
	* @param truncateTo - the byte offset the artifact is truncated to.
	*/
	async truncateTornTail(header, truncateTo) {
		this.coldLogMemo.delete(header.id);
		await this.repair(header, truncateTo);
		this.ctx.logger.warn(`${this.name}: session "${header.id}" recovered from a torn tail; incomplete tail bytes were discarded`);
	}
	/**
	* Whether this process still tracks a created-but-unmaterialized session.
	* @param id - the session to test.
	* @returns true while the pending entry exists.
	*/
	hasPendingSession(id) {
		return this.tracker.hasPending(id);
	}
	/**
	* Release one handle's backend bookkeeping on close.
	* @param handle - the closing handle.
	* @param materialized - whether the session reached durable storage.
	*/
	releaseHandle(handle, materialized) {
		this.tracker.release(handle, materialized);
	}
	/**
	* Read a file's bytes with one bounded stability retry: a writer appending
	* between stat and readFile yields a torn read, so a changed revision
	* triggers exactly one re-read. A second change does not loop — the log is
	* append-only, so the bytes at the retry's own pre-read stat size are a
	* committed prefix, and the decoders treat anything past a torn cut as
	* unwritten. A continuous writer therefore delays a read by at most one
	* extra whole-file read instead of starving it.
	* @param path - the artifact file to read.
	* @param signal - optional cancellation for the stat/read work.
	* @returns the stable bytes (or the committed prefix) and their revision.
	*/
	async readStableFile(path, signal) {
		signal?.throwIfAborted();
		let identity = await stat(path, { bigint: true });
		for (let attempt = 0;; attempt += 1) {
			const before = fileRevision(identity);
			const buffer = await readFile(path, { signal });
			signal?.throwIfAborted();
			const after = await stat(path, { bigint: true });
			if (before === fileRevision(after)) return {
				buffer,
				revision: before
			};
			if (attempt === 1) return {
				buffer: buffer.subarray(0, Number(identity.size)),
				revision: before
			};
			identity = after;
		}
	}
	/** Decode complete frames and retain complete JSONL records from a torn final frame. */
	async readZstdPrefix(buffer, signal) {
		signal?.throwIfAborted();
		const { frames, tornStart } = scanZstdFrames(buffer);
		signal?.throwIfAborted();
		if (frames.length === 0) throw new Error("empty or header-less Zstandard session log");
		const decoder = createZstdFrameDecoder();
		let yieldDeadline = performance.now() + ZSTD_DECODE_YIELD_INTERVAL_MS;
		try {
			const decodedFrames = decoder.decode(buffer, frames);
			signal?.throwIfAborted();
			const headerFrame = decodedFrames.next();
			signal?.throwIfAborted();
			/* v8 ignore next -- a non-empty structural frame list makes the decoder yield its first frame or throw. */
			if (headerFrame.done) throw new Error("empty or header-less Zstandard session log");
			assertZstdHeaderFrame(headerFrame.value);
			const scanner = new SessionLogScanner(headerFrame.value);
			let remainingFrames = frames.length - 1;
			for (const plaintext of decodedFrames) {
				signal?.throwIfAborted();
				scanner.write(plaintext);
				remainingFrames -= 1;
				if (remainingFrames > 0 && performance.now() >= yieldDeadline) {
					await scheduler.yield();
					signal?.throwIfAborted();
					yieldDeadline = performance.now() + ZSTD_DECODE_YIELD_INTERVAL_MS;
				}
			}
			signal?.throwIfAborted();
			const complete = scanner.checkpoint();
			if (complete.committedBytes !== complete.inputBytes) throw new Error("corrupt Zstandard session log: complete frame contains a torn JSONL record");
			if (tornStart === void 0) {
				const prefix = scanner.finish();
				return {
					meta: prefix.meta,
					inheritedEventCount: prefix.inheritedEventCount,
					events: prefix.events,
					tornTruncateTo: void 0,
					recoveredTail: []
				};
			}
			let recoveredPlaintext = Buffer.alloc(0);
			try {
				signal?.throwIfAborted();
				recoveredPlaintext = await decompressZstdPrefix(buffer.subarray(tornStart));
			} catch {
				/* v8 ignore next -- decoder failure plus concurrent abort is timing-dependent */
				if (signal?.aborted) signal.throwIfAborted();
			}
			signal?.throwIfAborted();
			scanner.write(recoveredPlaintext);
			const prefix = scanner.finish();
			return {
				meta: prefix.meta,
				inheritedEventCount: prefix.inheritedEventCount,
				events: prefix.events,
				tornTruncateTo: tornStart,
				recoveredTail: prefix.events.slice(complete.eventCount)
			};
		} catch (error) {
			/* v8 ignore next -- decoder failure plus concurrent abort is timing-dependent */
			if (signal?.aborted) signal.throwIfAborted();
			throw error;
		} finally {
			decoder.close();
		}
	}
	async listArtifacts(signal) {
		signal?.throwIfAborted();
		await this.ensureRootEncoding();
		signal?.throwIfAborted();
		const artifacts = [];
		const ids = /* @__PURE__ */ new Set();
		for (const project of await this.listProjectDirs(signal)) {
			signal?.throwIfAborted();
			for (const dir of await this.listSessionDirs(project, signal)) {
				signal?.throwIfAborted();
				const opposite = join(dir, `session${logSuffix(this.oppositeCompression())}`);
				const oppositeExists = await this.exists(opposite);
				signal?.throwIfAborted();
				if (oppositeExists) throw this.encodingMismatch(opposite);
				const path = join(dir, `session${logSuffix(this.compression)}`);
				const pathExists = await this.exists(path);
				signal?.throwIfAborted();
				if (!pathExists) continue;
				const first = this.compression === "zstd" ? await this.readFirstZstdLine(path, signal) : await this.readFirstLine(path, signal);
				signal?.throwIfAborted();
				if (first === void 0) continue;
				let meta;
				try {
					meta = parseHeaderMeta(first);
				} catch (error) {
					if (error instanceof SessionFormatUnsupportedError) continue;
					throw error;
				}
				if (meta === void 0) continue;
				await this.assertStoredIdentity(path, meta, void 0, signal);
				signal?.throwIfAborted();
				if (ids.has(meta.id)) throw new Error(`duplicate JSONL session id "${meta.id}" appears in multiple project directories`);
				ids.add(meta.id);
				artifacts.push({
					header: meta,
					path
				});
			}
		}
		signal?.throwIfAborted();
		return artifacts;
	}
	/** Atomically write the header line + first batch (temp-write, fsync, publish). */
	async materialize(meta, inheritedEventCount, events) {
		const project = projectDir(this.root, meta.cwd);
		const dir = sessionDir(this.root, meta.cwd, meta.id);
		const finalPath = logPath(this.root, meta.cwd, meta.id, this.compression);
		await this.rejectOppositeArtifact(meta.cwd, meta.id);
		const content = await this.encodeMaterialization(meta, inheritedEventCount, events);
		/* v8 ignore next -- native Windows coverage exercises this platform dispatch; Linux covers the POSIX peer */
		if (process.platform === "win32") await this.materializeWin32(project, dir, finalPath, meta.id, content);
		else await this.materializePosix(project, dir, finalPath, meta.id, content);
	}
	/* v8 ignore start -- Windows uses the Win32 durable-publish path; POSIX coverage exercises this peer. */
	async materializePosix(project, dir, finalPath, id, content) {
		await mkdir(this.root, {
			recursive: true,
			mode: 448
		});
		await this.syncDirPosix(dirname(this.root));
		await mkdir(project, {
			recursive: true,
			mode: 448
		});
		await this.syncDirPosix(this.root);
		await mkdir(dir, {
			recursive: true,
			mode: 448
		});
		await this.syncDirPosix(project);
		await this.rejectExistingLog(finalPath, id);
		const tmp = await this.writeSyncedTempFile(finalPath, content);
		let linked = false;
		try {
			await link(tmp, finalPath);
			linked = true;
		} finally {
			/* v8 ignore next -- link failure is the TOCTOU/IO race guarded above; not reachable in test */
			if (!linked) await rm(tmp, { force: true });
		}
		await this.syncDirPosix(dir);
		try {
			await rm(tmp, { force: true });
		} catch {}
	}
	/* v8 ignore stop */
	/* v8 ignore start -- native Windows coverage exercises this integration path */
	async materializeWin32(project, dir, finalPath, id, content) {
		await ensureDurableDirectoryWin32(this.root);
		await ensureDurableDirectoryWin32(project);
		await ensureDurableDirectoryWin32(dir);
		await this.rejectExistingLog(finalPath, id);
		const tmp = await this.writeSyncedTempFile(finalPath, content);
		try {
			await publishNewFileWin32(tmp, finalPath);
		} catch (error) {
			await rm(tmp, { force: true });
			throw error;
		}
	}
	/* v8 ignore stop */
	async rejectExistingLog(finalPath, id) {
		/* v8 ignore next 3 -- create guards collisions before materialize; this is a TOCTOU backstop */
		if (await this.exists(finalPath)) throw new Error(`refusing to materialize "${id}": a log already exists on disk (open it instead)`);
	}
	async writeSyncedTempFile(finalPath, content) {
		const tmp = `${finalPath}.${randomBytes(6).toString("hex")}.tmp`;
		const handle = await open(tmp, "wx", 384);
		try {
			await handle.writeFile(content);
			await handle.sync();
		} finally {
			await handle.close();
		}
		return tmp;
	}
	/** Encode the header and first batch without combining their frame boundaries. */
	async encodeMaterialization(meta, inheritedEventCount, events) {
		const header = JSON.stringify(toHeaderLine(meta, meta.isSeeded ? inheritedEventCount : void 0)) + "\n";
		if (events.length === 0) return this.compression === "none" ? header : compressZstdFrame(header);
		const body = eventLines(events, this.packChunks) + "\n";
		if (this.compression === "none") return header + body;
		const headerFrame = await compressZstdFrame(header);
		const eventFrame = await compressZstdFrame(body);
		return Buffer.concat([headerFrame, eventFrame]);
	}
	/** Encode one durable append batch in the configured physical representation. */
	async encodeEventBatch(events) {
		const body = eventLines(events, this.packChunks) + "\n";
		return this.compression === "zstd" ? compressZstdFrame(body) : body;
	}
	/** fsync a POSIX directory so a just-created/renamed entry is crash-durable. */
	/* v8 ignore start -- Windows uses write-through namespace operations; POSIX coverage exercises directory fsync. */
	async syncDirPosix(dir) {
		const handle = await open(dir, "r");
		try {
			await handle.sync();
		} finally {
			await handle.close();
		}
	}
	/* v8 ignore stop */
	/**
	* Append and fsync event lines. On a partial write or sync failure, restore the
	* previous size before rethrowing because the unchanged cursor will retry the
	* batch; leaving partial bytes would create duplicate sequence numbers.
	*/
	async appendLines(meta, events) {
		const content = await this.encodeEventBatch(events);
		const path = logPath(this.root, meta.cwd, meta.id, this.compression);
		const handle = await open(path, "a");
		let closed = false;
		const closeAppendHandle = async () => {
			if (closed) return;
			closed = true;
			await handle.close();
		};
		try {
			const { size: before } = await handle.stat();
			try {
				await handle.writeFile(content);
				await handle.sync();
			} catch (error) {
				try {
					await closeAppendHandle();
					await this.rollbackAppend(path, before);
				} catch (rollbackError) {
					throw new AggregateError([error, rollbackError], `failed to roll back append to "${path}"`);
				}
				throw error;
			}
		} finally {
			await closeAppendHandle();
		}
	}
	async rollbackAppend(path, size) {
		const handle = await open(path, "r+");
		try {
			await handle.truncate(size);
			await handle.sync();
		} finally {
			await handle.close();
		}
	}
	/** Truncate the log file to `offset` bytes and fsync (discard the crash tail). */
	async repair(meta, offset) {
		const path = logPath(this.root, meta.cwd, meta.id, this.compression);
		await truncate(path, offset);
		const handle = await open(path, "r+");
		try {
			await handle.sync();
		} finally {
			await handle.close();
		}
	}
	/**
	* Read the first newline-terminated line of a file without loading the whole
	* file. Returns undefined if the file is empty or has no complete first line.
	* Reads in bounded chunks so a huge log costs only the header read.
	*/
	async readFirstLine(path, signal) {
		signal?.throwIfAborted();
		const handle = await open(path, "r");
		try {
			signal?.throwIfAborted();
			const chunks = [];
			const buf = Buffer.alloc(8192);
			for (;;) {
				signal?.throwIfAborted();
				const { bytesRead } = await handle.read(buf, 0, buf.length, null);
				signal?.throwIfAborted();
				if (bytesRead === 0) return void 0;
				const slice = buf.subarray(0, bytesRead);
				const nl = slice.indexOf(10);
				if (nl !== -1) {
					chunks.push(slice.subarray(0, nl));
					signal?.throwIfAborted();
					return Buffer.concat(chunks).toString("utf8");
				}
				chunks.push(Buffer.from(slice));
			}
		} finally {
			await handle.close();
		}
	}
	/** Read and validate only the independently compressed header frame. */
	async readFirstZstdLine(path, signal) {
		signal?.throwIfAborted();
		const handle = await open(path, "r");
		try {
			signal?.throwIfAborted();
			let content = Buffer.alloc(0);
			const chunk = Buffer.alloc(8192);
			for (;;) {
				signal?.throwIfAborted();
				const { bytesRead } = await handle.read(chunk, 0, chunk.length, null);
				signal?.throwIfAborted();
				if (bytesRead === 0) return void 0;
				signal?.throwIfAborted();
				content = Buffer.concat([content, chunk.subarray(0, bytesRead)]);
				signal?.throwIfAborted();
				const first = scanZstdFrames(content, 1).frames[0];
				signal?.throwIfAborted();
				if (first === void 0) continue;
				let plaintext;
				try {
					signal?.throwIfAborted();
					plaintext = await decompressZstdFrame(content.subarray(first.start, first.end));
				} catch (error) {
					/* v8 ignore next -- decoder failure plus concurrent abort is timing-dependent */
					if (signal?.aborted) signal.throwIfAborted();
					throw new Error("corrupt Zstandard session log: header frame failed validation", { cause: error });
				}
				signal?.throwIfAborted();
				assertZstdHeaderFrame(plaintext);
				return plaintext.subarray(0, -1).toString("utf8");
			}
		} finally {
			await handle.close();
		}
	}
	/** Find the unique physical log for an id across every project directory. */
	async findLog(id, signal) {
		const matches = [];
		for (const project of await this.listProjectDirs(signal)) {
			signal?.throwIfAborted();
			await this.rejectLegacyFlatArtifact(project, id, signal);
			signal?.throwIfAborted();
			const dir = join(project, encodeSegment(id));
			const path = join(dir, `session${logSuffix(this.compression)}`);
			const opposite = join(dir, `session${logSuffix(this.oppositeCompression())}`);
			const oppositeExists = await this.exists(opposite);
			signal?.throwIfAborted();
			if (oppositeExists) throw this.encodingMismatch(opposite);
			const pathExists = await this.exists(path);
			signal?.throwIfAborted();
			if (pathExists) matches.push(path);
		}
		if (matches.length > 1) throw new Error(`duplicate JSONL session id "${id}" appears in multiple project directories`);
		signal?.throwIfAborted();
		return matches[0];
	}
	/** Require an existing configured root to be a readable directory. */
	assertUsableRoot() {
		try {
			readdirSync(this.root);
		} catch (error) {
			if (isENOENT(error)) return;
			throw error;
		}
	}
	/** Reject metadata that does not identify the selected physical log. */
	async assertStoredIdentity(path, meta, expectedId, signal) {
		signal?.throwIfAborted();
		if (expectedId !== void 0 && meta.id !== expectedId) throw new Error(`corrupt session log "${path}": requested id "${expectedId}" does not match header id "${meta.id}"`);
		let expectedPath;
		try {
			expectedPath = logPath(this.root, meta.cwd, meta.id, this.compression);
		} catch (error) {
			throw new Error(`corrupt session log "${path}": header id cannot name a storage path`, { cause: error });
		}
		if (path !== expectedPath && !await this.sameFile(path, expectedPath, signal)) throw new Error(`corrupt session log "${path}": header id "${meta.id}" and cwd identify "${expectedPath}"`);
		signal?.throwIfAborted();
	}
	/**
	* Whether two path spellings resolve to the same physical file. This admits
	* case aliases on case-insensitive filesystems without weakening identity
	* checks on case-sensitive stores.
	*/
	async sameFile(path, expectedPath, signal) {
		signal?.throwIfAborted();
		try {
			const [actual, expected] = await Promise.all([realpath(path), realpath(expectedPath)]);
			signal?.throwIfAborted();
			return actual === expected;
		} catch (error) {
			signal?.throwIfAborted();
			/* v8 ignore else -- non-ENOENT realpath failures require an external permission or I/O fault */
			if (isENOENT(error)) return false;
			/* v8 ignore next -- non-ENOENT realpath failures are external I/O faults, propagated unchanged */
			throw error;
		}
	}
	/** The human-readable project directories under the configured root. */
	async listProjectDirs(signal) {
		try {
			signal?.throwIfAborted();
			const entries = await readdir(this.root, { withFileTypes: true });
			signal?.throwIfAborted();
			return entries.filter((e) => e.isDirectory()).map((e) => join(this.root, e.name));
		} catch (error) {
			if (isENOENT(error)) return [];
			throw error;
		}
	}
	/** List session-owned directories and reject the obsolete flat-file layout. */
	async listSessionDirs(project, signal) {
		signal?.throwIfAborted();
		const entries = await readdir(project, { withFileTypes: true });
		signal?.throwIfAborted();
		const legacy = entries.find((entry) => entry.isFile() && (entry.name.endsWith(".jsonl") || entry.name.endsWith(".jsonl.zstd")));
		if (legacy !== void 0) throw this.legacyLayout(join(project, legacy.name));
		return entries.filter((entry) => entry.isDirectory()).map((entry) => join(project, entry.name));
	}
	/** Reject a root that already belongs to the other physical encoding. */
	ensureRootEncoding() {
		this.rootEncodingCheck ??= this.checkRootEncoding();
		return this.rootEncodingCheck;
	}
	async checkRootEncoding() {
		for (const project of await this.listProjectDirs()) for (const dir of await this.listSessionDirs(project)) {
			const incompatible = join(dir, `session${logSuffix(this.oppositeCompression())}`);
			if (await this.exists(incompatible)) throw this.encodingMismatch(incompatible);
		}
	}
	async rejectLegacyFlatArtifact(project, id, signal) {
		signal?.throwIfAborted();
		const encoded = encodeSegment(id);
		for (const compression of ["zstd", "none"]) {
			const path = join(project, encoded + logSuffix(compression));
			const artifactExists = await this.exists(path);
			signal?.throwIfAborted();
			if (artifactExists) throw this.legacyLayout(path);
		}
	}
	async rejectOppositeArtifact(cwd, id) {
		const path = logPath(this.root, cwd, id, this.oppositeCompression());
		if (await this.exists(path)) throw this.encodingMismatch(path);
	}
	oppositeCompression() {
		return this.compression === "zstd" ? "none" : "zstd";
	}
	encodingMismatch(path) {
		return /* @__PURE__ */ new Error(`session artifact ${JSON.stringify(path)} uses ${logSuffix(this.oppositeCompression())}, but this backend is configured for compression ${JSON.stringify(this.compression)}; use a separate root or select the matching compression mode`);
	}
	legacyLayout(path) {
		return /* @__PURE__ */ new Error(`session artifact ${JSON.stringify(path)} uses the unsupported flat-file layout; use a separate root or move it into a project/session directory before loading`);
	}
	async exists(path) {
		try {
			await (await open(path, "r")).close();
			return true;
		} catch (error) {
			/* v8 ignore else -- Windows reports file-valued parents as ENOENT; POSIX covers direct ENOTDIR. */
			if (isENOENT(error)) {
				/* v8 ignore next -- native Windows coverage exercises this platform dispatch; POSIX reports ENOTDIR from open */
				if (process.platform === "win32") await this.assertLogParentAllowsAbsence(path);
				return false;
			}
			/* v8 ignore next -- Windows repairs ENOTDIR from ENOENT above; POSIX covers direct ENOTDIR. */
			throw error;
		}
	}
	/* v8 ignore start -- native Windows coverage exercises this repair; POSIX open reports ENOTDIR before this point. */
	async assertLogParentAllowsAbsence(path) {
		try {
			const parent = dirname(path);
			if ((await stat(parent)).isDirectory()) return;
			const error = /* @__PURE__ */ new Error(`ENOTDIR: parent path exists but is not a directory: ${parent}`);
			error.code = "ENOTDIR";
			error.path = parent;
			throw error;
		} catch (error) {
			if (isENOENT(error)) return;
			throw error;
		}
	}
};
//#endregion
export { JsonlCompressionSchema, JsonlSessionPersistence as default };
