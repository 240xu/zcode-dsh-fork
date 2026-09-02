/**
 * Build the runtime the rewritten code calls.
 * @param causality - Snapshot face from the `node:async_hooks` proxy; omitted
 *   leaves the rewrite inert (it still hops a microtask, but moves no state).
 * @returns Runtime object passed to every module wrapper.
 */
export function createAlsRuntime(causality) {
    const snapshot = () => causality?.snapshot();
    const restore = (value) => { causality?.restore(value); };
    return {
        snapshot,
        pause: (value) => {
            const captured = snapshot();
            return Promise.resolve(value).then(settled => ({ ok: true, value: settled, snapshot: captured }), (error) => ({ ok: false, error, snapshot: captured }));
        },
        resume: (token) => {
            restore(token.snapshot);
            if (token.ok)
                return token.value;
            throw token.error;
        },
        afterYield: (captured, sent) => {
            restore(captured);
            return sent;
        },
        iterator: (value) => {
            const source = value;
            const asyncFactory = source[Symbol.asyncIterator];
            if (typeof asyncFactory === 'function')
                return asyncFactory.call(source);
            const syncFactory = source[Symbol.iterator];
            if (typeof syncFactory !== 'function') {
                throw new TypeError('webworker als: for-await source is neither async nor sync iterable');
            }
            const inner = syncFactory.call(source);
            // Async-from-sync: a sync iterator's values may be promises the loop awaits.
            return {
                next: async (...args) => {
                    const step = inner.next(...args);
                    return { done: step.done ?? false, value: await step.value };
                },
                return: async (sent) => {
                    const step = inner.return?.(sent) ?? { done: true, value: undefined };
                    return { done: step.done ?? true, value: await step.value };
                },
            };
        },
        close: async (iterator) => {
            try {
                return await iterator.return?.(undefined);
            }
            catch {
                // Closing an iterator that already failed has nothing left to release.
                return undefined;
            }
        },
    };
}
//# sourceMappingURL=als-runtime.js.map