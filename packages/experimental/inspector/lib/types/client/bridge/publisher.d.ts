/** Buffered Client observation publication across reconnecting WebSockets. */
import { type InspectorSourceBufferOptions } from '../../shared/bridge/buffer.ts';
import type { InspectorJsonValue } from '../../shared/json.ts';
import type { InspectorStatePublisher } from '../../shared/bridge/publisher.ts';
import type { InspectorSourceDescriptor } from '../../shared/bridge/messages/observation.ts';
/** Non-blocking Client publisher whose bounded state survives transport reconnects. */
export declare class ClientBridgePublisher implements InspectorStatePublisher {
    private readonly maxBufferedBytes;
    private readonly records;
    private active;
    private flushTimer;
    private closed;
    constructor(options: InspectorSourceBufferOptions, maxBufferedBytes: number);
    publish(topic: string, payload: InspectorJsonValue, monotonicMs?: number): void;
    setState(topic: string, payload: InspectorJsonValue, monotonicMs?: number): void;
    /**
     * Install one unopened transport generation.
     * @param socket - WebSocket carrying the generation.
     * @param source - Source identity and generation sent by the socket.
     */
    connect(socket: WebSocket, source: InspectorSourceDescriptor): void;
    /**
     * Send retained state and queued observations after Worker acceptance.
     * @param socket - Accepted active WebSocket.
     */
    accept(socket: WebSocket): void;
    /**
     * Resend retained state for the active generation.
     * @param socket - WebSocket that received the resnapshot request.
     */
    replace(socket: WebSocket): void;
    /**
     * Forget one closed transport while retaining buffered state for reconnect.
     * @param socket - WebSocket whose close event fired.
     */
    disconnect(socket: WebSocket): void;
    /** Stop delayed writes and reject later publication. */
    close(): void;
    private flush;
    private scheduleFlush;
}
//# sourceMappingURL=publisher.d.ts.map