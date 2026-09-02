/** Worker-thread construction (unavailable). */
export declare const Worker: typeof import('node:worker_threads').Worker;
/** The host tree runs on the worker's main thread. */
export declare const isMainThread = true;
/** Thread id of the worker's main thread. */
export declare const threadId = 0;
/** No parent port exists, which Node reports as `null` outside a worker thread. */
export declare const parentPort: null;
/** No thread data was handed in. */
export declare const workerData: undefined;
/** Channel construction (unavailable). */
export declare const MessageChannel: typeof import('node:worker_threads').MessageChannel;
/** Port construction (unavailable). */
export declare const MessagePort: typeof import('node:worker_threads').MessagePort;
/** Object transfer marking (unavailable). */
export declare const markAsUntransferable: typeof import('node:worker_threads').markAsUntransferable;
/** Port receiving on a message channel (unavailable). */
export declare const receiveMessageOnPort: typeof import('node:worker_threads').receiveMessageOnPort;
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ./builtins.ts). */
export declare const __esModule = true;
/** CommonJS default export: the members `require()` hands a caller of this module. */
declare const _default: {
    Worker: typeof import("worker_threads").Worker;
    isMainThread: true;
    threadId: number;
    parentPort: null;
    workerData: undefined;
    MessageChannel: typeof import("worker_threads").MessageChannel;
    MessagePort: typeof import("worker_threads").MessagePort;
    markAsUntransferable: typeof import("worker_threads").markAsUntransferable;
    receiveMessageOnPort: typeof import("worker_threads").receiveMessageOnPort;
};
export default _default;
//# sourceMappingURL=worker_threads.d.ts.map