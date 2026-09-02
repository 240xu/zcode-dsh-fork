/** Buffered Client observation publication across reconnecting WebSockets. */
import { InspectorSourceBuffer } from "../../shared/bridge/buffer.js";
/** Non-blocking Client publisher whose bounded state survives transport reconnects. */
export class ClientBridgePublisher {
    maxBufferedBytes;
    records;
    active;
    flushTimer;
    closed = false;
    constructor(options, maxBufferedBytes) {
        this.maxBufferedBytes = maxBufferedBytes;
        this.records = new InspectorSourceBuffer(options);
    }
    publish(topic, payload, monotonicMs = performance.now()) {
        if (this.closed)
            return;
        this.records.publish(topic, payload, monotonicMs);
        this.flush();
    }
    setState(topic, payload, monotonicMs = performance.now()) {
        if (this.closed)
            throw new Error('inspector: Client source is closed');
        this.records.setState(topic, payload, monotonicMs);
        this.flush();
    }
    /**
     * Install one unopened transport generation.
     * @param socket - WebSocket carrying the generation.
     * @param source - Source identity and generation sent by the socket.
     */
    connect(socket, source) {
        this.active = { socket, source, accepted: false };
    }
    /**
     * Send retained state and queued observations after Worker acceptance.
     * @param socket - Accepted active WebSocket.
     */
    accept(socket) {
        const active = this.active;
        if (active?.socket !== socket)
            return;
        active.accepted = true;
        this.replace(socket);
        this.flush();
    }
    /**
     * Resend retained state for the active generation.
     * @param socket - WebSocket that received the resnapshot request.
     */
    replace(socket) {
        const active = this.active;
        if (active?.socket !== socket || socket.readyState !== WebSocket.OPEN)
            return;
        socket.send(JSON.stringify(this.records.replacement(active.source.sourceId, active.source.generation)));
    }
    /**
     * Forget one closed transport while retaining buffered state for reconnect.
     * @param socket - WebSocket whose close event fired.
     */
    disconnect(socket) {
        if (this.active?.socket === socket)
            this.active = undefined;
    }
    /** Stop delayed writes and reject later publication. */
    close() {
        if (this.closed)
            return;
        this.closed = true;
        this.active = undefined;
        if (this.flushTimer !== undefined)
            clearTimeout(this.flushTimer);
        this.flushTimer = undefined;
    }
    flush() {
        const active = this.active;
        if (!active?.accepted || active.socket.readyState !== WebSocket.OPEN)
            return;
        if (active.socket.bufferedAmount > this.maxBufferedBytes) {
            this.scheduleFlush();
            return;
        }
        while (this.records.hasPending && active.socket.bufferedAmount <= this.maxBufferedBytes) {
            const frame = this.records.takeBatch(active.source.sourceId, active.source.generation);
            if (frame === undefined)
                break;
            active.socket.send(JSON.stringify(frame));
        }
        if (this.records.hasPending)
            this.scheduleFlush();
    }
    scheduleFlush() {
        if (this.flushTimer !== undefined || this.closed)
            return;
        this.flushTimer = setTimeout(() => {
            this.flushTimer = undefined;
            this.flush();
        }, 25);
    }
}
//# sourceMappingURL=publisher.js.map