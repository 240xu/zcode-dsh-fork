/** The rejection an aborted wait reports, as Node and the DOM both spell it. */
const abortError = () => new DOMException('The operation was aborted.', 'AbortError');
/**
 * Resolve after a delay.
 * @param delayMs - milliseconds to wait.
 * @param value - value to resolve with; Node resolves undefined when none is handed in.
 * @param options - abort support, as Node provides.
 * @returns the value after the delay, or a rejection when the signal aborts.
 */
export function setTimeout(delayMs, value, options) {
    return new Promise((resolve, reject) => {
        // A signal that has already aborted emits no further `abort` event, so the
        // timer must not be armed at all; Node rejects such a call straight away.
        if (options?.signal?.aborted === true) {
            reject(abortError());
            return;
        }
        const timer = globalThis.setTimeout(() => { resolve(value); }, delayMs);
        options?.signal?.addEventListener('abort', () => {
            globalThis.clearTimeout(timer);
            reject(abortError());
        }, { once: true });
    });
}
/**
 * Resolve on the next macrotask.
 * @param value - resolution value handed back after the timer.
 * @returns a promise resolved after a zero-delay timer.
 */
export function setImmediate(value) {
    return setTimeout(0, value);
}
/** Cooperative scheduling helpers Node exposes on this module. */
export const scheduler = {
    wait: async (delayMs, options) => {
        await setTimeout(delayMs, undefined, options);
    },
    yield: async () => { await setTimeout(0); },
};
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ./builtins.ts). */
export const __esModule = true;
/** CommonJS default export: the members `require()` hands a caller of this module. */
export default { setTimeout, setImmediate, scheduler };
//# sourceMappingURL=promises.js.map