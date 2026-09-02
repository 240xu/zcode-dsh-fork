/** Worker-owned request routing for Client read-only source catalogs. */
import { randomUUID } from 'node:crypto';
import { inspectorId, } from "../../shared/bridge/ids.js";
import { INSPECTOR_PROTOCOL_VERSION } from "../../shared/bridge/messages/observation.js";
import { sendClientSessionClosed } from "./session.js";
/** Deliberate error returned by the Client source catalog. */
export class ClientSourceRemoteError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
/** Correlates bounded source requests with one active Client source generation. */
export class ClientSourceRouter {
    sources;
    timeoutMs;
    maxContentBytes;
    /** Maximum decoded bytes requested in one source-content response. */
    chunkBytes;
    pending = new Map();
    unsubscribeSources;
    closed = false;
    constructor(sources, timeoutMs, maxContentBytes, maxFrameBytes) {
        this.sources = sources;
        this.timeoutMs = timeoutMs;
        this.maxContentBytes = maxContentBytes;
        this.chunkBytes = Math.max(1, Math.floor((maxFrameBytes - 4_096) * 3 / 4));
        this.unsubscribeSources = sources.subscribeEvents((event) => { this.receiveSourceEvent(event); });
    }
    /**
     * Execute one operation against an active Client source generation.
     * @param source - Client source that owns the script catalog.
     * @param sessionId - DevTools connection-local source session.
     * @param command - Validated read-only source command.
     * @returns The correlated result.
     */
    request(source, sessionId, command) {
        if (this.closed)
            return Promise.reject(new Error('Client source router is closed'));
        const requestId = inspectorId(randomUUID(), 'requestId');
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(requestId);
                reject(new Error(`Client source ${command.op} timed out after ${String(this.timeoutMs)}ms`));
            }, this.timeoutMs);
            timer.unref();
            this.pending.set(requestId, { source, sessionId, command, resolve, reject, timer });
            try {
                const sent = this.sources.send(source, {
                    v: INSPECTOR_PROTOCOL_VERSION,
                    t: 'client-sources/request',
                    sourceId: source.sourceId,
                    generation: source.generation,
                    sessionId,
                    requestId,
                    command,
                });
                if (!sent)
                    this.rejectPending(requestId, new Error('Client source disconnected before dispatch'));
            }
            catch (error) {
                this.rejectPending(requestId, renderError(error));
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
            if (pending.source.sourceId !== source.sourceId
                || pending.source.generation !== source.generation
                || pending.sessionId !== sessionId)
                continue;
            this.rejectPending(requestId, new Error('DevTools source session closed'));
        }
        sendClientSessionClosed(this.sources, source, {
            v: INSPECTOR_PROTOCOL_VERSION,
            t: 'client-sources/session-closed',
            sourceId: source.sourceId,
            generation: source.generation,
            sessionId,
        });
    }
    /** Stop routing and reject every outstanding source operation. */
    close() {
        if (this.closed)
            return;
        this.closed = true;
        this.unsubscribeSources();
        for (const requestId of [...this.pending.keys()]) {
            this.rejectPending(requestId, new Error('Client source router closed'));
        }
    }
    receiveSourceEvent(event) {
        switch (event.type) {
            case 'closed':
                for (const [requestId, pending] of this.pending) {
                    if (pending.source.sourceId === event.source.sourceId
                        && pending.source.generation === event.source.generation) {
                        this.rejectPending(requestId, new Error(`Client source closed: ${event.reason}`));
                    }
                }
                return;
            case 'client-source-response':
                this.settle(event.source, event.frame);
                return;
            case 'opened':
            case 'client-runtime-response':
            case 'client-console-event':
                return;
            default:
                assertNever(event);
        }
    }
    settle(source, frame) {
        const pending = this.pending.get(frame.requestId);
        if (pending === undefined)
            return;
        if (pending.source.sourceId !== source.sourceId
            || pending.source.generation !== source.generation
            || pending.sessionId !== frame.sessionId) {
            this.rejectPending(frame.requestId, new Error('Client source response correlation mismatch'));
            return;
        }
        if (!frame.outcome.ok) {
            this.rejectPending(frame.requestId, new ClientSourceRemoteError(frame.outcome.error.code, frame.outcome.error.message));
            return;
        }
        if (!matchesCommand(pending.command, frame.outcome.result)) {
            this.rejectPending(frame.requestId, new Error('Client source response does not match its request'));
            return;
        }
        clearTimeout(pending.timer);
        this.pending.delete(frame.requestId);
        pending.resolve(frame.outcome.result);
    }
    rejectPending(requestId, error) {
        const pending = this.pending.get(requestId);
        if (pending === undefined)
            return;
        clearTimeout(pending.timer);
        this.pending.delete(requestId);
        pending.reject(error);
    }
}
function matchesCommand(command, result) {
    if (command.op !== result.op)
        return false;
    if (command.op === 'list-scripts' || result.op === 'list-scripts')
        return true;
    return result.scriptKey === command.scriptKey
        && result.content === command.content
        && (!result.available || result.offset === command.offset);
}
function renderError(error) {
    return error instanceof Error ? error : new Error(String(error));
}
function assertNever(value) {
    throw new Error(`Unexpected source event: ${JSON.stringify(value)}`);
}
//# sourceMappingURL=source-rpc.js.map