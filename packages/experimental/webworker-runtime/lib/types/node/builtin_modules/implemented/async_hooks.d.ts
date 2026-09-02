/** Node's AsyncLocalStorage face, restricted to the members the host tree uses. */
export declare class AsyncLocalStorage<T> {
    private readonly entries;
    private overlay;
    private readonly ambients;
    private resumed;
    constructor();
    /**
     * Run a callback with the store visible for the operation's whole lifetime:
     * until it returns, or until the promise it returned settles.
     * @param store - value {@link getStore} answers inside the boundary.
     * @param callback - the operation.
     * @param args - callback arguments.
     * @returns the exact value the callback returned.
     */
    run<R>(store: T | undefined, callback: (...args: never[]) => R, ...args: never[]): R;
    /**
     * Current store, resolved through the slot order this module documents: the
     * hook-restored overlay, then the ambient context a resume installed (or a
     * boundary owns), then the folding stack's innermost entry.
     * @returns the store, or undefined outside every boundary.
     */
    getStore(): T | undefined;
    /**
     * Run a callback with no store, folding over its lifetime like {@link run}.
     * @param callback - the operation.
     * @param args - callback arguments.
     * @returns the exact value the callback returned.
     */
    exit<R>(callback: (...args: never[]) => R, ...args: never[]): R;
    /**
     * Enter a boundary that lasts until {@link disable}, as Node's `enterWith` does
     * for the remainder of the current chain.
     * @param store - value {@link getStore} answers from now on.
     */
    enterWith(store: T): void;
    /** Drop every slot; teardown calls this unconditionally. */
    disable(): void;
    /**
     * Copy every live instance's effective store, including the instances reading
     * `undefined`: a resumed frame must see exactly what its pause point saw.
     * @returns the ambient snapshot.
     */
    static snapshotAll(): AmbientSnapshot;
    /**
     * Install a snapshot as the ambient context of every instance it names.
     * @param snapshot - a copy from {@link snapshotAll}.
     * @returns a disposer that restores the previous ambients, identity-checked.
     */
    static restoreAll(snapshot: AmbientSnapshot): () => void;
    /**
     * Copy every live instance's current store. Not part of the Node face: this is
     * the shim's own mechanism, kept in the class so the overlay stays private.
     * @returns the snapshot, or undefined when no instance has a store.
     */
    static captureContext(): AsyncContextSnapshot | undefined;
    /**
     * Run a callback with a captured context restored into the overlay slots.
     * @param snapshot - context copy, or undefined to run unchanged.
     * @param callback - the callback.
     * @returns the callback's return value.
     */
    static runWithContext<R>(snapshot: AsyncContextSnapshot | undefined, callback: () => R): R;
    /**
     * Every live instance, for {@link runAtAsyncContextRoot}.
     * @returns The stores a snapshot must capture.
     */
    static liveInstances(): readonly AsyncLocalStorage<unknown>[];
    /**
     * Bind a callback to the current context.
     * @param callback - the callback to bind.
     * @returns a callback that restores this context when invoked.
     */
    static bind<F extends (...args: never[]) => unknown>(callback: F): F;
    /**
     * Snapshot helper matching Node's static: run a callback in the context
     * captured now.
     * @returns a function that runs its argument in the captured context.
     */
    static snapshot(): <R>(callback: () => R) => R;
}
/** One instance's captured store. */
interface CapturedStore {
    readonly instance: AsyncLocalStorage<unknown>;
    readonly store: unknown;
}
/** Opaque context copy produced by {@link captureAsyncContext}. */
export type AsyncContextSnapshot = readonly CapturedStore[];
/** Opaque ambient copy produced by {@link __snapshotAll}; covers every live instance. */
export type AmbientSnapshot = readonly CapturedStore[];
/**
 * Copy every live instance's current store.
 * @returns the snapshot, or undefined when no instance has a store (the hook
 * layer then wraps nothing and callbacks inherit the stack top).
 */
export declare function captureAsyncContext(): AsyncContextSnapshot | undefined;
/**
 * Run a callback with a captured context restored into the overlay slots.
 * @param snapshot - context copy, or undefined to run unchanged.
 * @param callback - the callback.
 * @returns the callback's return value.
 */
export declare function runWithAsyncContext<R>(snapshot: AsyncContextSnapshot | undefined, callback: () => R): R;
/**
 * Capture the current context now and restore it around every later invocation.
 * @param callback - the callback to bind.
 * @returns the bound callback, or the original when no context is active.
 */
export declare function bindAsyncContext<F extends (...args: never[]) => unknown>(callback: F): F;
/**
 * Run a callback at the root: every instance reads `undefined`, whatever was open
 * before. The tunnel's message entry uses this so a queued request never inherits
 * a boundary from unrelated work that happened to run first.
 * @param callback - the callback.
 * @returns the callback's return value.
 */
export declare function runAtAsyncContextRoot<R>(callback: () => R): R;
/**
 * Pause point of the loader's `await` rewriting: copy the context every live
 * instance currently reads.
 *
 * The transformed module reaches this through the module proxy table
 * (`require('node:async_hooks').__snapshotAll()`), so the rewriter needs no
 * additional plumbing.
 * @returns the ambient snapshot to hand to {@link __restoreAll} after the await.
 */
export declare function __snapshotAll(): AmbientSnapshot;
/**
 * Resume point of the loader's `await` rewriting: publish a paused context as the
 * ambient one, so reads after the await answer what the frame saw before it —
 * even while another chain interleaves.
 * @param snapshot - the copy {@link __snapshotAll} produced at the pause point.
 * @returns a disposer that restores the previous ambient context, identity-checked;
 * a rewriter that wraps a whole function body calls it in that body's `finally`.
 */
export declare function __restoreAll(snapshot: AmbientSnapshot): () => void;
/**
 * Snapshot face the module loader's `await` rewriting consumes (its `AlsCausality`):
 * the same pair as {@link __snapshotAll}/{@link __restoreAll}, with `restore`
 * narrowed to void because the rewritten code has no place to keep a disposer.
 */
export declare const alsCausality: {
    snapshot: () => AmbientSnapshot;
    restore: (snapshot: AmbientSnapshot) => void;
};
/**
 * Async ids are not tracked; a stable id keeps callers that log it working.
 * @returns Always 1.
 */
export declare function executionAsyncId(): number;
/**
 * Trigger ids are not tracked either.
 * @returns Always 0.
 */
export declare function triggerAsyncId(): number;
/**
 * Async hooks cannot be created: no async resource tracking exists in the worker.
 * @returns Never — it throws naming the unavailable member.
 */
export declare function createHook(): never;
/** Resource construction is likewise unavailable. */
export declare const AsyncResource: typeof import('node:async_hooks').AsyncResource;
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ./builtins.ts). */
export declare const __esModule = true;
/** CommonJS default export: the members `require()` hands a caller of this module. */
declare const _default: {
    AsyncLocalStorage: typeof AsyncLocalStorage;
    AsyncResource: typeof import("async_hooks").AsyncResource;
    executionAsyncId: typeof executionAsyncId;
    triggerAsyncId: typeof triggerAsyncId;
    createHook: typeof createHook;
};
export default _default;
//# sourceMappingURL=async_hooks.d.ts.map