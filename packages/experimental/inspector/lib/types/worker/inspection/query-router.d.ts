/** Worker-side admission, execution, and bounded settlement of non-CDP queries. */
import type { CordisRuntimeTreeReader } from '../../shared/cordis/reader.ts';
import type { InspectorSourceGeneration, InspectorSourceId } from '../../shared/bridge/ids.ts';
import type { InspectorSourceDescriptor } from '../../shared/bridge/messages/observation.ts';
import type { InspectorQueryResponseFrame } from '../../shared/bridge/messages/query/frames.ts';
/** Carrier operations owned by one Worker query peer. */
export interface InspectorQueryPeerTransport {
    /** Send one bounded Worker response. */
    send(frame: InspectorQueryResponseFrame): void;
    /** Reject a malformed peer whose request cannot be correlated safely. */
    close(code: number, reason: string): void;
}
interface AcceptedGeneration {
    readonly sourceId: InspectorSourceId;
    readonly generation: InspectorSourceGeneration;
}
/** Creates isolated query peers over one shared semantic reader. */
export declare class InspectorQueryRouter {
    private readonly reader;
    private readonly maxFrameBytes;
    private readonly peers;
    private readonly activeBySource;
    constructor(reader: CordisRuntimeTreeReader, maxFrameBytes: number);
    /**
     * Create query state for one Host MessagePort or Client WebSocket.
     * @param transport - Carrier response and rejection operations.
     * @returns The peer that receives frames from this carrier only.
    */
    open(transport: InspectorQueryPeerTransport): InspectorQueryPeer;
    /**
     * Revoke query access when the source registry closes one generation.
     * @param source - Closed source generation.
     */
    disconnect(source: InspectorSourceDescriptor): void;
    /** Revoke every peer during Worker shutdown. */
    close(): void;
}
/** Query protocol state associated with exactly one source carrier. */
export declare class InspectorQueryPeer {
    private readonly reader;
    private readonly maxFrameBytes;
    private readonly transport;
    private readonly register;
    private readonly isRegistered;
    private readonly unregister;
    private accepted;
    private readonly inFlight;
    private closed;
    constructor(reader: CordisRuntimeTreeReader, maxFrameBytes: number, transport: InspectorQueryPeerTransport, register: (accepted: AcceptedGeneration) => void, isRegistered: (accepted: AcceptedGeneration) => boolean, unregister: () => void);
    /**
     * Admit the source generation after the source registry accepts it.
     * @param sourceId - Stable source identity.
     * @param generation - Active carrier generation.
     */
    accept(sourceId: InspectorSourceId, generation: InspectorSourceGeneration): void;
    /**
     * Revoke one generation while leaving its carrier available for a later source/open.
     * @param sourceId - Stable source identity.
     * @param generation - Generation being removed by the source registry.
     */
    revoke(sourceId: InspectorSourceId, generation: InspectorSourceGeneration): void;
    /**
     * Consume a decoded carrier value when it belongs to the query protocol.
     * @param value - Untrusted source-to-Worker value.
     * @returns Whether this peer owned the value.
     */
    receive(value: unknown): boolean;
    /** Stop this peer and suppress completion from in-flight readers. */
    close(): void;
    private execute;
    private rejectMalformed;
    private sendFailure;
    private canReply;
    private deliver;
    private rejectTransport;
}
export {};
//# sourceMappingURL=query-router.d.ts.map