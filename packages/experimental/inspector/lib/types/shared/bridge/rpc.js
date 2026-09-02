/** Shared Host/Client owner of correlated non-CDP query requests. */
import { inspectorId } from "./ids.js";
import { jsonByteLength } from "../json.js";
import { INSPECTOR_PROTOCOL_VERSION } from "./version.js";
import { isInspectorQueryResponseEnvelope, parseInspectorQueryResponseFrame } from "./messages/query/codec.js";
/** Failure deliberately returned by the Worker query handler. */
export class InspectorQueryRemoteError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
/** Correlates requests for one reconnecting Host or Client source. */
export class InspectorQueryConnection {
    options;
    pending = new Map();
    active;
    nextRequestId = 0;
    closed = false;
    constructor(options) {
        this.options = options;
    }
    /**
     * Admit the source generation acknowledged by the Worker.
     * @param sourceId - Stable source identity.
     * @param generation - Newly accepted transport generation.
     * @param sender - Carrier writer valid for that generation.
     */
    connect(sourceId, generation, sender) {
        if (this.closed)
            throw new Error('inspector query connection is closed');
        this.disconnect('Inspector source generation replaced');
        this.active = { sourceId, generation, sender };
    }
    /**
     * Execute a query against the currently accepted source generation.
     * @param query - Closed typed query command.
     * @returns The result with the same operation discriminant.
     */
    request(query) {
        const active = this.active;
        if (this.closed || active === undefined) {
            return Promise.reject(new Error('Inspector query transport is not connected'));
        }
        const requestId = inspectorId(`query-${String(++this.nextRequestId)}`, 'requestId');
        const frame = {
            v: INSPECTOR_PROTOCOL_VERSION,
            t: 'query/request',
            sourceId: active.sourceId,
            generation: active.generation,
            requestId,
            query,
        };
        if (jsonByteLength(frame) > this.options.maxFrameBytes) {
            return Promise.reject(new Error(`Inspector query request exceeds ${String(this.options.maxFrameBytes)} bytes`));
        }
        const result = new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(requestId);
                reject(new Error(`Inspector query ${query.op} timed out after ${String(this.options.timeoutMs)}ms`));
            }, this.options.timeoutMs);
            this.pending.set(requestId, { op: query.op, resolve, reject, timer });
            try {
                active.sender.send(frame);
            }
            catch (error) {
                this.rejectPending(requestId, renderError(error));
            }
        });
        return result;
    }
    /**
     * Consume a decoded carrier value when it is a query response.
     * @param value - Untrusted Worker-to-source value.
     * @returns Whether the value belonged to the query protocol.
     */
    receive(value) {
        if (!isInspectorQueryResponseEnvelope(value))
            return false;
        let frame;
        try {
            frame = parseInspectorQueryResponseFrame(value);
            if (jsonByteLength(frame) > this.options.maxFrameBytes) {
                throw new Error(`inspector protocol: query response exceeds ${String(this.options.maxFrameBytes)} bytes`);
            }
        }
        catch (error) {
            this.disconnect(`Invalid Inspector query response: ${renderError(error).message}`);
            throw error;
        }
        const pending = this.pending.get(frame.requestId);
        if (pending === undefined)
            return true;
        const active = this.active;
        if (active === undefined || frame.sourceId !== active.sourceId || frame.generation !== active.generation) {
            this.rejectPending(frame.requestId, new Error('Inspector query response source generation does not match'));
            return true;
        }
        if (!frame.outcome.ok) {
            this.rejectPending(frame.requestId, new InspectorQueryRemoteError(frame.outcome.error.code, frame.outcome.error.message));
            return true;
        }
        if (frame.outcome.result.op !== pending.op) {
            this.rejectPending(frame.requestId, new Error(`Inspector query response op ${frame.outcome.result.op} does not match ${pending.op}`));
            return true;
        }
        clearTimeout(pending.timer);
        this.pending.delete(frame.requestId);
        pending.resolve(frame.outcome.result);
        return true;
    }
    /**
     * Reject active requests while permitting a later source generation.
     * @param reason - Failure reported to every pending caller.
     */
    disconnect(reason) {
        this.active = undefined;
        for (const requestId of [...this.pending.keys()])
            this.rejectPending(requestId, new Error(reason));
    }
    /**
     * Permanently reject requests and prevent later reconnection.
     * @param reason - Failure reported to every pending caller.
     */
    close(reason = 'Inspector query connection closed') {
        if (this.closed)
            return;
        this.closed = true;
        this.disconnect(reason);
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
function renderError(error) {
    return error instanceof Error ? error : new Error(String(error));
}
//# sourceMappingURL=rpc.js.map