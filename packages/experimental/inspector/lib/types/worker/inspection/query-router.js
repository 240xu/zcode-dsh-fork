/** Worker-side admission, execution, and bounded settlement of non-CDP queries. */
import { jsonByteLength } from "../../shared/json.js";
import { isInspectorQueryRequestEnvelope, parseInspectorQueryFrameIdentity, parseInspectorQueryRequestFrame, } from "../../shared/bridge/messages/query/codec.js";
import { INSPECTOR_PROTOCOL_VERSION } from "../../shared/bridge/version.js";
import { executeInspectorQuery } from "./cordis-query.js";
/** Creates isolated query peers over one shared semantic reader. */
export class InspectorQueryRouter {
    reader;
    maxFrameBytes;
    peers = new Set();
    activeBySource = new Map();
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
            for (const [sourceId, active] of this.activeBySource) {
                if (active.peer === peer)
                    this.activeBySource.delete(sourceId);
            }
            this.activeBySource.set(accepted.sourceId, { ...accepted, peer });
        }, (accepted) => this.activeBySource.get(accepted.sourceId)?.peer === peer
            && this.activeBySource.get(accepted.sourceId)?.generation === accepted.generation, () => {
            this.peers.delete(peer);
            for (const [sourceId, active] of this.activeBySource) {
                if (active.peer === peer)
                    this.activeBySource.delete(sourceId);
            }
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
        if (active?.generation !== source.generation)
            return;
        this.activeBySource.delete(source.sourceId);
        active.peer.revoke(source.sourceId, source.generation);
    }
    /** Revoke every peer during Worker shutdown. */
    close() {
        for (const peer of [...this.peers])
            peer.close();
        this.activeBySource.clear();
    }
}
/** Query protocol state associated with exactly one source carrier. */
export class InspectorQueryPeer {
    reader;
    maxFrameBytes;
    transport;
    register;
    isRegistered;
    unregister;
    accepted;
    inFlight = new Map();
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
        if (this.closed)
            return;
        this.accepted = { sourceId, generation };
        this.inFlight.clear();
        this.register(this.accepted);
    }
    /**
     * Revoke one generation while leaving its carrier available for a later source/open.
     * @param sourceId - Stable source identity.
     * @param generation - Generation being removed by the source registry.
     */
    revoke(sourceId, generation) {
        if (this.accepted?.sourceId !== sourceId || this.accepted.generation !== generation)
            return;
        this.accepted = undefined;
        this.inFlight.clear();
    }
    /**
     * Consume a decoded carrier value when it belongs to the query protocol.
     * @param value - Untrusted source-to-Worker value.
     * @returns Whether this peer owned the value.
     */
    receive(value) {
        if (!isInspectorQueryRequestEnvelope(value))
            return false;
        let frame;
        try {
            frame = parseInspectorQueryRequestFrame(value);
            if (jsonByteLength(frame) > this.maxFrameBytes) {
                throw new Error(`inspector protocol: query request exceeds ${String(this.maxFrameBytes)} bytes`);
            }
        }
        catch (error) {
            this.rejectMalformed(value, renderError(error));
            return true;
        }
        const accepted = this.accepted;
        if (this.closed || accepted === undefined || !this.isRegistered(accepted)
            || accepted.sourceId !== frame.sourceId
            || accepted.generation !== frame.generation) {
            this.sendFailure(frame, 'stale-source', 'Inspector query does not belong to the accepted source generation');
            return true;
        }
        if (this.inFlight.has(frame.requestId)) {
            this.sendFailure(frame, 'invalid-request', 'Inspector query requestId is already in flight');
            return true;
        }
        this.inFlight.set(frame.requestId, accepted);
        void this.execute(frame, accepted);
        return true;
    }
    /** Stop this peer and suppress completion from in-flight readers. */
    close() {
        if (this.closed)
            return;
        this.closed = true;
        this.accepted = undefined;
        this.inFlight.clear();
        this.unregister();
    }
    async execute(frame, accepted) {
        try {
            const result = await executeInspectorQuery(this.reader, frame.query);
            if (!this.canReply(frame, accepted))
                return;
            const response = {
                v: INSPECTOR_PROTOCOL_VERSION,
                t: 'query/response',
                sourceId: frame.sourceId,
                generation: frame.generation,
                requestId: frame.requestId,
                outcome: { ok: true, result },
            };
            if (jsonByteLength(response) > this.maxFrameBytes) {
                this.sendFailure(frame, 'result-too-large', `Inspector query result exceeds ${String(this.maxFrameBytes)} bytes`);
                return;
            }
            this.deliver(response);
        }
        catch (error) {
            if (this.canReply(frame, accepted))
                this.sendFailure(frame, 'internal-error', renderError(error).message);
        }
        finally {
            if (this.inFlight.get(frame.requestId) === accepted)
                this.inFlight.delete(frame.requestId);
        }
    }
    rejectMalformed(value, error) {
        try {
            const identity = parseInspectorQueryFrameIdentity(value);
            this.sendFailure(identity, 'invalid-request', error.message);
        }
        catch {
            this.rejectTransport(1008, error.message);
        }
    }
    sendFailure(frame, code, message) {
        if (this.closed)
            return;
        const response = {
            v: INSPECTOR_PROTOCOL_VERSION,
            t: 'query/response',
            sourceId: frame.sourceId,
            generation: frame.generation,
            requestId: frame.requestId,
            outcome: { ok: false, error: { code, message } },
        };
        if (jsonByteLength(response) > this.maxFrameBytes) {
            this.rejectTransport(1009, 'Inspector query error exceeds the frame limit');
            return;
        }
        this.deliver(response);
    }
    canReply(frame, accepted) {
        return !this.closed
            && this.accepted === accepted
            && this.isRegistered(accepted)
            && this.inFlight.get(frame.requestId) === accepted;
    }
    deliver(frame) {
        try {
            this.transport.send(frame);
        }
        catch (error) {
            this.rejectTransport(1011, renderError(error).message);
        }
    }
    rejectTransport(code, reason) {
        this.close();
        try {
            this.transport.close(code, reason.slice(0, 123));
        }
        catch {
            // The carrier is already unusable; query state has reached quiescence.
        }
    }
}
function renderError(error) {
    return error instanceof Error ? error : new Error(String(error));
}
//# sourceMappingURL=query-router.js.map