/**
 * Incremental session-log contribution for official DeepSeek LLM API requests.
 * Accepted sequence watermarks live in the canonical log, so restart recovery
 * can conservatively resend uncertain tails without maintaining another store.
 * @module @deepseek-ai/dsh-session-log-deepseek
 */
import z from '@deepseek-ai/schemastery';
import { brandString } from '@deepseek-ai/dsh-brand';
import { isSurfaceEvent, SessionLogOffset, SessionSeq } from '@deepseek-ai/dsh-session';
/** Cordis plugin name. */
export const name = 'session-log-deepseek';
/** Services required to resolve sessions and contribute the provider request field. */
export const inject = ['deepseekLlmApiExtensions', 'sessions'];
/** Validated Session-log request contribution configuration. */
export const Config = z.object({
    enabled: z.boolean().default(false),
});
const acceptanceFolds = new WeakMap();
/** Translate logical Session metadata back to the stable version-0 wire header. */
function wireHeader(session) {
    const header = session.header;
    return {
        version: header.version,
        id: String(header.id),
        createdAt: header.createdAt,
        ...header.cwd === undefined ? {} : { cwd: header.cwd },
        ...header.parentSession === undefined ? {} : { parentSession: String(header.parentSession) },
        ...header.isSeeded ? { seedLength: Number(session.inheritedEventCount) } : {},
        ...header.origin === undefined ? {} : { origin: header.origin },
        ...header.delegationDepth === undefined ? {} : { delegationDepth: header.delegationDepth },
        ...header.agentPreset === undefined ? {} : { agentPreset: header.agentPreset },
    };
}
/** Translate compile-time sequence brands to raw numeric request fields. */
function wireEvent(event) {
    const surfaceEvent = isSurfaceEvent(event) ? event : undefined;
    const surfaceOp = surfaceEvent?.surfaceOp;
    return {
        type: event.type,
        seq: Number(event.seq),
        time: event.time,
        data: event.data,
        ...event.ignorable === undefined ? {} : { ignorable: event.ignorable },
        ...surfaceEvent?.sourceEventSeqs === undefined
            ? {}
            : { sourceEventSeqs: surfaceEvent.sourceEventSeqs.map(Number) },
        ...surfaceOp === undefined
            ? {}
            : surfaceOp === 'append'
                ? { surfaceOp }
                : { surfaceOp: { op: 'replace', start: Number(surfaceOp.start), end: Number(surfaceOp.end) } },
    };
}
/**
 * Highest confirmed sequence for this exact session identity.
 * @param session - canonical log whose matching acceptance events are folded.
 * @returns greatest accepted sequence, or `-1` before any accepted request.
 */
export function acceptedThrough(session) {
    const previous = acceptanceFolds.get(session);
    let throughSeq = previous?.throughSeq ?? -1;
    const length = session.seq;
    const start = previous?.scannedEvents ?? SessionLogOffset(0);
    for (let index = start; index < length; index++) {
        const event = session.eventAt(SessionSeq(index));
        if (event === undefined) {
            throw new Error(`session-log-deepseek: missing event ${String(index)} below captured length ${String(length)}`);
        }
        if (event.type !== 'session-log-deepseek/delivery-accepted')
            continue;
        let acceptedSeq;
        try {
            acceptedSeq = SessionSeq(event.data.throughSeq);
        }
        catch {
            throw new Error(`session-log-deepseek: malformed acceptance watermark at seq ${event.seq}`);
        }
        if (typeof event.data.sessionId !== 'string' || event.data.sessionId.length === 0
            || acceptedSeq >= event.seq) {
            throw new Error(`session-log-deepseek: malformed acceptance watermark at seq ${event.seq}`);
        }
        if (event.data.sessionId !== session.id)
            continue;
        if (acceptedSeq > throughSeq)
            throughSeq = acceptedSeq;
    }
    acceptanceFolds.set(session, { scannedEvents: length, throughSeq });
    return throughSeq;
}
/**
 * Register the incremental `dsh_session_log` request contribution when enabled.
 * @param ctx - plugin context carrying Sessions and the DeepSeek request-extension registry.
 * @param config - validated opt-in configuration.
 */
export function apply(ctx, config) {
    if (config.enabled !== true)
        return;
    ctx.deepseekLlmApiExtensions.register('dsh_session_log', {
        prepare: (request) => {
            // TODO: Define an explicit wire result for direct or stale-session calls if they become a supported product path.
            if (request.sessionId === undefined)
                return undefined;
            const session = ctx.sessions.get(brandString(request.sessionId));
            if (session === undefined)
                return undefined;
            const afterSeq = acceptedThrough(session);
            const snapshot = session.snapshotEvents();
            const throughSeq = snapshot.at(-1)?.seq;
            if (throughSeq === undefined)
                return undefined;
            const suffix = session.snapshotEvents(SessionLogOffset(afterSeq + 1));
            const value = {
                version: 1,
                session: wireHeader(session),
                afterSeq: Number(afterSeq),
                throughSeq: Number(throughSeq),
                events: suffix.map(wireEvent),
            };
            return {
                value,
                accept: () => {
                    session.append('session-log-deepseek/delivery-accepted', { sessionId: session.id, throughSeq });
                    // TODO: Add an immediate lightweight checkpoint if duplicate replay after a 2xx crash window becomes unacceptable.
                },
            };
        },
    });
}
//# sourceMappingURL=index.js.map