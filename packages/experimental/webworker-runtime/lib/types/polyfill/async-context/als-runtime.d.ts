/**
 * Runtime the transformed modules call at every suspension point.
 *
 * `pause` snapshots every ambient store and hands back a token that **always
 * fulfills** (a rejection travels inside it); `resume` restores that snapshot as
 * the first thing the resumed frame does, then returns the value or rethrows the
 * error, so both completion paths are causally exact. The state itself belongs to
 * the `node:async_hooks` proxy — this module only moves it.
 *
 * The transform that inserts these calls lives in `transform.ts`.
 * @module @deepseek-ai/dsh-experimental-webworker-runtime/src/polyfill/async-context/als-runtime
 */
/** Snapshot of every ambient store, opaque to this module. */
export type AlsSnapshot = unknown;
/** Result of a suspension: a rejection travels inside it, so the token always fulfills. */
export interface AlsToken {
    readonly ok: boolean;
    readonly value?: unknown;
    readonly error?: unknown;
    readonly snapshot: AlsSnapshot;
}
/** The state face the rewrite moves snapshots through; the shim owns the state itself. */
export interface AlsCausality {
    /** Capture every instance's current store. */
    snapshot(): AlsSnapshot;
    /** Restore a captured snapshot. */
    restore(snapshot: AlsSnapshot): void;
}
/** Runtime the rewritten modules call; built by {@link createAlsRuntime}. */
export interface AlsRuntime {
    pause(value: unknown): Promise<AlsToken>;
    resume(token: AlsToken): unknown;
    snapshot(): AlsSnapshot;
    afterYield(snapshot: AlsSnapshot, sent: unknown): unknown;
    iterator(value: unknown): AsyncIterator<unknown>;
    close(iterator: AsyncIterator<unknown>): Promise<unknown>;
}
/**
 * Build the runtime the rewritten code calls.
 * @param causality - Snapshot face from the `node:async_hooks` proxy; omitted
 *   leaves the rewrite inert (it still hops a microtask, but moves no state).
 * @returns Runtime object passed to every module wrapper.
 */
export declare function createAlsRuntime(causality?: AlsCausality): AlsRuntime;
//# sourceMappingURL=als-runtime.d.ts.map