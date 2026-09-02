/**
 * `node:timers/promises`: real implementations over the worker's timer globals.
 */
import type { TimerOptions } from 'node:timers';
/**
 * Resolve after a delay.
 * @param delayMs - milliseconds to wait.
 * @param value - value to resolve with; Node resolves undefined when none is handed in.
 * @param options - abort support, as Node provides.
 * @returns the value after the delay, or a rejection when the signal aborts.
 */
export declare function setTimeout<T = void>(delayMs?: number, value?: T, options?: TimerOptions): Promise<T>;
/**
 * Resolve on the next macrotask.
 * @param value - resolution value handed back after the timer.
 * @returns a promise resolved after a zero-delay timer.
 */
export declare function setImmediate<T = void>(value?: T): Promise<T>;
/** Cooperative scheduling helpers Node exposes on this module. */
export declare const scheduler: {
    wait: (delayMs?: number, options?: TimerOptions) => Promise<void>;
    yield: () => Promise<void>;
};
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ./builtins.ts). */
export declare const __esModule = true;
/** CommonJS default export: the members `require()` hands a caller of this module. */
declare const _default: {
    setTimeout: typeof setTimeout;
    setImmediate: typeof setImmediate;
    scheduler: {
        wait: (delayMs?: number, options?: TimerOptions) => Promise<void>;
        yield: () => Promise<void>;
    };
};
export default _default;
//# sourceMappingURL=promises.d.ts.map