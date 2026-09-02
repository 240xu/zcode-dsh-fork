/**
 * `node:worker_threads` stub. Nested workers are unsupported, so the workflow
 * and code-runtime plugin bodies mount and fail on use. The
 * thread-identity values are real: they say "this is the main thread", which is
 * what the worker host is from the tree's point of view.
 */
import { notImplementedFail } from "../../notImplementedFail.js";
const MODULE = 'node:worker_threads';
/** Worker-thread construction (unavailable). */
export const Worker = notImplementedFail(MODULE, 'Worker');
/** The host tree runs on the worker's main thread. */
export const isMainThread = true;
/** Thread id of the worker's main thread. */
export const threadId = 0;
/** No parent port exists, which Node reports as `null` outside a worker thread. */
export const parentPort = null;
/** No thread data was handed in. */
export const workerData = undefined;
/** Channel construction (unavailable). */
export const MessageChannel = notImplementedFail(MODULE, 'MessageChannel');
/** Port construction (unavailable). */
export const MessagePort = notImplementedFail(MODULE, 'MessagePort');
/** Object transfer marking (unavailable). */
export const markAsUntransferable = notImplementedFail(MODULE, 'markAsUntransferable');
/** Port receiving on a message channel (unavailable). */
export const receiveMessageOnPort = notImplementedFail(MODULE, 'receiveMessageOnPort');
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ./builtins.ts). */
export const __esModule = true;
/** CommonJS default export: the members `require()` hands a caller of this module. */
export default {
    Worker, isMainThread, threadId, parentPort, workerData, MessageChannel, MessagePort,
    markAsUntransferable, receiveMessageOnPort,
};
//# sourceMappingURL=worker_threads.js.map