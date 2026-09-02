/**
 * Node-shaped timer handles. The browser's `setTimeout`/`setInterval` return
 * numeric ids, while harness and vendored code calls `.unref()` on the handle
 * (`client-hmr`'s poll interval, cordis's timer plugin). The wrappers return a
 * handle object with Node's `ref`/`unref`/`hasRef`, and `clear*` accepts either
 * form — the object also converts to its numeric id, so any code that stores it
 * as a number keeps working.
 *
 * Handlers are also bound to the async context where the timer was registered
 * (`./async-context-hooks.ts`), so a callback scheduled inside an initiator
 * boundary is attributed to that boundary when it fires.
 */
import { bindAsyncContext } from "../builtin_modules/implemented/async_hooks.js";
const handleOf = (id) => {
    const handle = {
        ref: () => handle,
        unref: () => handle,
        hasRef: () => true,
        [Symbol.toPrimitive]: () => id,
    };
    return handle;
};
const idOf = (handle) => {
    if (typeof handle === 'number')
        return handle;
    if (typeof handle === 'object' && handle !== null && Symbol.toPrimitive in handle) {
        return Number(handle);
    }
    return undefined;
};
const wrapScheduler = (schedule) => (handler, timeout, ...args) => handleOf(schedule(bindHandler(handler), timeout, ...args));
/** Bind a timer handler to its registration context; string handlers have none to bind. */
const bindHandler = (handler) => typeof handler === 'function' ? bindAsyncContext(handler) : handler;
const wrapClear = (clear) => (handle) => { clear(idOf(handle)); };
/** Replace the worker's timer globals with the Node-shaped wrappers. */
export function installTimerGlobals() {
    const scope = globalThis;
    const setTimeoutRaw = globalThis.setTimeout.bind(globalThis);
    const setIntervalRaw = globalThis.setInterval.bind(globalThis);
    const clearTimeoutRaw = globalThis.clearTimeout.bind(globalThis);
    const clearIntervalRaw = globalThis.clearInterval.bind(globalThis);
    scope.setTimeout = wrapScheduler(setTimeoutRaw);
    scope.setInterval = wrapScheduler(setIntervalRaw);
    scope.clearTimeout = wrapClear(clearTimeoutRaw);
    scope.clearInterval = wrapClear(clearIntervalRaw);
    scope.setImmediate = (handler, ...args) => handleOf(setTimeoutRaw(bindHandler(handler), 0, ...args));
    scope.clearImmediate = wrapClear(clearTimeoutRaw);
}
//# sourceMappingURL=timers.js.map