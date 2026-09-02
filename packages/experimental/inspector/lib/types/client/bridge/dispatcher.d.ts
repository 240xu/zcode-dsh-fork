/** Dispatch of validated Worker frames to browser-realm capability handlers. */
import type { ClientConsoleDisableFrame, ClientConsoleEnableFrame, ClientRuntimeCancelFrame, ClientRuntimeRequestFrame, ClientRuntimeResponseAcknowledgedFrame, ClientRuntimeSessionClosedFrame } from '../../shared/bridge/messages/runtime/index.ts';
import type { ClientSourceRequestFrame, ClientSourceSessionClosedFrame } from '../../shared/bridge/messages/sources/index.ts';
import type { SourceAcceptedFrame, SourceAppendAcknowledgedFrame, SourceRejectedFrame, SourceResnapshotFrame, WorkerToSourceFrame } from '../../shared/bridge/messages/observation.ts';
/** Operations invoked for each Worker-to-Client frame family. */
export interface ClientBridgeFrameHandlers {
    accepted(frame: SourceAcceptedFrame): void;
    acknowledged(frame: SourceAppendAcknowledgedFrame): void;
    resnapshot(frame: SourceResnapshotFrame): void;
    rejected(frame: SourceRejectedFrame): void;
    runtime(frame: ClientRuntimeRequestFrame): void;
    runtimeCanceled(frame: ClientRuntimeCancelFrame): void;
    runtimeAcknowledged(frame: ClientRuntimeResponseAcknowledgedFrame): void;
    runtimeClosed(frame: ClientRuntimeSessionClosedFrame): void;
    consoleEnabled(frame: ClientConsoleEnableFrame): void;
    consoleDisabled(frame: ClientConsoleDisableFrame): void;
    sources(frame: ClientSourceRequestFrame): void;
    sourcesClosed(frame: ClientSourceSessionClosedFrame): void;
}
/**
 * Dispatch one validated Worker frame without exposing transport details to domain adapters.
 * @param frame - Decoded Worker-to-source frame.
 * @param handlers - Browser-realm operations for each frame family.
 */
export declare function dispatchBridgeFrame(frame: WorkerToSourceFrame, handlers: ClientBridgeFrameHandlers): void;
//# sourceMappingURL=dispatcher.d.ts.map