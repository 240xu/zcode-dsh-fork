/** Dispatch of validated Worker frames accepted by the Host MessagePort. */
import type { SourceAcceptedFrame, SourceAppendAcknowledgedFrame, SourceRejectedFrame, SourceResnapshotFrame, WorkerToSourceFrame } from '../../shared/bridge/messages/observation.ts';
/** Operations invoked for source-lifecycle frames addressed to the Host. */
export interface HostBridgeFrameHandlers {
    accepted(frame: SourceAcceptedFrame): void;
    acknowledged(frame: SourceAppendAcknowledgedFrame): void;
    resnapshot(frame: SourceResnapshotFrame): void;
    rejected(frame: SourceRejectedFrame): void;
}
/**
 * Dispatch one validated Worker frame and reject Client-only commands on the Host carrier.
 * @param frame - Decoded Worker-to-source frame.
 * @param handlers - Host source-lifecycle operations.
 */
export declare function dispatchBridgeFrame(frame: WorkerToSourceFrame, handlers: HostBridgeFrameHandlers): void;
//# sourceMappingURL=dispatcher.d.ts.map