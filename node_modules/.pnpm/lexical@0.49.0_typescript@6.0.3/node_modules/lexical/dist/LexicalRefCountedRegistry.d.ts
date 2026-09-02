/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/**
 * A registry mapping keys to a per-key activation, reference counted so the
 * activation is created on the first registration for a key and torn down
 * only when the last outstanding registration for that key is released. This
 * lets the same key be driven by more than one caller (or survive a
 * re-entrant / double registration) without double-wiring or premature
 * teardown.
 *
 * Keys are compared by identity (Map semantics), so any object works — a DOM
 * element, a `Document`, a `Window`, or an opaque handle.
 */
export interface RefCountedRegistry<Key, Options = void> {
    /**
     * Register `key` (reference counted) and return an idempotent disposer. The
     * first registration for a key runs the activation; the disposer it returns
     * runs once the last registration for that key is released.
     *
     * `options` configure the activation and are therefore only read on the
     * activating (first) registration for a key. While a key is live, further
     * registrations share that one activation and their `options` are ignored —
     * ref counting models repeat registrations as the *same* logical thing, so
     * registering one key with conflicting options is a caller error, not a
     * merge. Release the key fully before re-registering it with new options.
     */
    register: (key: Key, options?: Options) => () => void;
    /** Dispose every live registration and clear the registry. */
    dispose: () => void;
}
/**
 * Creates a {@link RefCountedRegistry}.
 *
 * @param activate - Wires `key` and returns its teardown. Called on the first
 *   registration of each key.
 */
export declare function createRefCountedRegistry<Key, Options = void>(activate: (key: Key, options: Options | undefined) => () => void): RefCountedRegistry<Key, Options>;
