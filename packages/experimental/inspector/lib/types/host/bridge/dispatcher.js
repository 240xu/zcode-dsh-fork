/** Dispatch of validated Worker frames accepted by the Host MessagePort. */
import { rejectConsoleBridgeCommand } from "../cdp/console.js";
import { rejectRuntimeBridgeCommand } from "../cdp/runtime.js";
import { rejectSourcesBridgeCommand } from "../cdp/sources.js";
/**
 * Dispatch one validated Worker frame and reject Client-only commands on the Host carrier.
 * @param frame - Decoded Worker-to-source frame.
 * @param handlers - Host source-lifecycle operations.
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
            return rejectRuntimeBridgeCommand(frame.command);
        case 'client-runtime/cancel':
        case 'client-runtime/response-acknowledged':
            return;
        case 'client-console/enable':
        case 'client-console/disable':
            return rejectConsoleBridgeCommand(frame.t);
        case 'client-sources/request':
            return rejectSourcesBridgeCommand();
        case 'client-runtime/session-closed':
        case 'client-sources/session-closed':
            return;
        default:
            return assertNever(frame);
    }
}
function assertNever(value) {
    throw new Error(`Unexpected Worker source frame: ${JSON.stringify(value)}`);
}
//# sourceMappingURL=dispatcher.js.map