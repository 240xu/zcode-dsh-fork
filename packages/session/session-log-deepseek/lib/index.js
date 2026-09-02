import z from "@deepseek-ai/schemastery";
import { brandString } from "@deepseek-ai/dsh-brand";
import { SessionLogOffset, SessionSeq, isSurfaceEvent } from "@deepseek-ai/dsh-session";
//#region lib/types/index.js
/**
* Incremental session-log contribution for official DeepSeek LLM API requests.
* Accepted sequence watermarks live in the canonical log, so restart recovery
* can conservatively resend uncertain tails without maintaining another store.
* @module @deepseek-ai/dsh-session-log-deepseek
*/
/** Cordis plugin name. */
const name = "session-log-deepseek";
/** Services required to resolve sessions and contribute the provider request field. */
const inject = ["deepseekLlmApiExtensions", "sessions"];
/** Validated Session-log request contribution configuration. */
const Config = z.object({ enabled: z.boolean().default(false) });
const acceptanceFolds = /* @__PURE__ */ new WeakMap();
/** Translate logical Session metadata back to the stable version-0 wire header. */
function wireHeader(session) {
	const header = session.header;
	return {
		version: header.version,
		id: String(header.id),
		createdAt: header.createdAt,
		...header.cwd === void 0 ? {} : { cwd: header.cwd },
		...header.parentSession === void 0 ? {} : { parentSession: String(header.parentSession) },
		...header.isSeeded ? { seedLength: Number(session.inheritedEventCount) } : {},
		...header.origin === void 0 ? {} : { origin: header.origin },
		...header.delegationDepth === void 0 ? {} : { delegationDepth: header.delegationDepth },
		...header.agentPreset === void 0 ? {} : { agentPreset: header.agentPreset }
	};
}
/** Translate compile-time sequence brands to raw numeric request fields. */
function wireEvent(event) {
	const surfaceEvent = isSurfaceEvent(event) ? event : void 0;
	const surfaceOp = surfaceEvent?.surfaceOp;
	return {
		type: event.type,
		seq: Number(event.seq),
		time: event.time,
		data: event.data,
		...event.ignorable === void 0 ? {} : { ignorable: event.ignorable },
		...surfaceEvent?.sourceEventSeqs === void 0 ? {} : { sourceEventSeqs: surfaceEvent.sourceEventSeqs.map(Number) },
		...surfaceOp === void 0 ? {} : surfaceOp === "append" ? { surfaceOp } : { surfaceOp: {
			op: "replace",
			start: Number(surfaceOp.start),
			end: Number(surfaceOp.end)
		} }
	};
}
/**
* Highest confirmed sequence for this exact session identity.
* @param session - canonical log whose matching acceptance events are folded.
* @returns greatest accepted sequence, or `-1` before any accepted request.
*/
function acceptedThrough(session) {
	const previous = acceptanceFolds.get(session);
	let throughSeq = previous?.throughSeq ?? -1;
	const length = session.seq;
	const start = previous?.scannedEvents ?? SessionLogOffset(0);
	for (let index = start; index < length; index++) {
		const event = session.eventAt(SessionSeq(index));
		if (event === void 0) throw new Error(`session-log-deepseek: missing event ${String(index)} below captured length ${String(length)}`);
		if (event.type !== "session-log-deepseek/delivery-accepted") continue;
		let acceptedSeq;
		try {
			acceptedSeq = SessionSeq(event.data.throughSeq);
		} catch {
			throw new Error(`session-log-deepseek: malformed acceptance watermark at seq ${event.seq}`);
		}
		if (typeof event.data.sessionId !== "string" || event.data.sessionId.length === 0 || acceptedSeq >= event.seq) throw new Error(`session-log-deepseek: malformed acceptance watermark at seq ${event.seq}`);
		if (event.data.sessionId !== session.id) continue;
		if (acceptedSeq > throughSeq) throughSeq = acceptedSeq;
	}
	acceptanceFolds.set(session, {
		scannedEvents: length,
		throughSeq
	});
	return throughSeq;
}
/**
* Register the incremental `dsh_session_log` request contribution when enabled.
* @param ctx - plugin context carrying Sessions and the DeepSeek request-extension registry.
* @param config - validated opt-in configuration.
*/
function apply(ctx, config) {
	if (config.enabled !== true) return;
	ctx.deepseekLlmApiExtensions.register("dsh_session_log", { prepare: (request) => {
		if (request.sessionId === void 0) return void 0;
		const session = ctx.sessions.get(brandString(request.sessionId));
		if (session === void 0) return void 0;
		const afterSeq = acceptedThrough(session);
		const throughSeq = session.snapshotEvents().at(-1)?.seq;
		if (throughSeq === void 0) return void 0;
		const suffix = session.snapshotEvents(SessionLogOffset(afterSeq + 1));
		return {
			value: {
				version: 1,
				session: wireHeader(session),
				afterSeq: Number(afterSeq),
				throughSeq: Number(throughSeq),
				events: suffix.map(wireEvent)
			},
			accept: () => {
				session.append("session-log-deepseek/delivery-accepted", {
					sessionId: session.id,
					throughSeq
				});
			}
		};
	} });
}
//#endregion
export { Config, acceptedThrough, apply, inject, name };
