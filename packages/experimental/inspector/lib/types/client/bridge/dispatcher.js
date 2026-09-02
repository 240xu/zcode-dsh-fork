/** Dispatch of validated Worker frames to browser-realm capability handlers. */
/**
 * Dispatch one validated Worker frame without exposing transport details to domain adapters.
 * @param frame - Decoded Worker-to-source frame.
 * @param handlers - Browser-realm operations for each frame family.
 */
export function dispatchBridgeFrame(frame, handlers) {
    switch (frame.t) {
        case 'source/accepted':
            handlers.accepted(frame);
            return;
        case 'source/append-acknowledged':
            handlers.acknowledged(frame);
            return;
        case 'source/resnapshot':
            handlers.resnapshot(frame);
            return;
        case 'source/rejected':
            handlers.rejected(frame);
            return;
        case 'client-runtime/request':
            handlers.runtime(frame);
            return;
        case 'client-runtime/cancel':
            handlers.runtimeCanceled(frame);
            return;
        case 'client-runtime/response-acknowledged':
            handlers.runtimeAcknowledged(frame);
            return;
        case 'client-runtime/session-closed':
            handlers.runtimeClosed(frame);
            return;
        case 'client-console/enable':
            handlers.consoleEnabled(frame);
            return;
        case 'client-console/disable':
            handlers.consoleDisabled(frame);
            return;
        case 'client-sources/request':
            handlers.sources(frame);
            return;
        case 'client-sources/session-closed':
            handlers.sourcesClosed(frame);
            return;
        default:
            return assertNever(frame);
    }
}
function assertNever(value) {
    throw new Error(`Unexpected Worker source frame: ${JSON.stringify(value)}`);
}
//# sourceMappingURL=dispatcher.js.map