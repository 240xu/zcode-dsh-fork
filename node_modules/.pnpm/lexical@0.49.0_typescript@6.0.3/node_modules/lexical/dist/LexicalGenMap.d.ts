/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
declare const TOMBSTONE: null;
/**
 * @internal
 *
 * Create a copy of the given Map, returning either a fresh Map or a clone
 * of a copy-on-write GenMap depending on the source type and size.
 *
 * - If the source is already a GenMap, returns `map.clone()` (O(1)).
 * - If the source is a plain Map below the threshold, returns
 *   `new Map(map)` to avoid the GenMap overhead on small docs.
 * - Otherwise wraps a fresh GenMap around the source.
 */
export declare function cloneMap<K, V>(map: Map<K, V>, minGenMapSize?: number): Map<K, V>;
/**
 * @internal
 *
 * A copy-on-write Map suitable for cloning large collections cheaply.
 *
 * Before being written to, a GenMap shares its `_old` and `_nursery` Maps
 * with the GenMap it was cloned from. On first write it either compacts
 * (folds `_nursery` into a new `_old`) or shallow-copies `_nursery`,
 * isolating subsequent writes from sibling clones.
 *
 * `_old` is the immutable snapshot from the most recent compaction;
 * `_nursery` holds writes since the last compaction (deletions stored as
 * `TOMBSTONE`). `_mutable` tracks whether `_nursery` may be written to
 * directly or must first be cloned.
 *
 * Implements the full `Map<K, V>` interface; methods not documented
 * individually behave as their native `Map` counterparts.
 */
export declare class GenMap<K, V> implements Map<K, V> {
    _mutable: boolean;
    _old: undefined | ReadonlyMap<K, V>;
    _nursery: undefined | Map<K, typeof TOMBSTONE | V>;
    _size: number;
    /**
     * Returns a new GenMap that initially shares `_old` and `_nursery`
     * with this one. Marks both as not-mutable so the next write on either
     * side triggers a copy-on-write of the nursery before mutating.
     */
    clone(): GenMap<K, V>;
    init(old: undefined | ReadonlyMap<K, V>, nursery: undefined | Map<K, typeof TOMBSTONE | V>, size: number): this;
    get size(): number;
    has(key: K): boolean;
    /**
     * Returns the raw value for `key`, including TOMBSTONE for keys deleted
     * since the last compaction. Used internally to distinguish "missing"
     * from "deleted" without doing a second lookup.
     */
    getWithTombstone(key: K): undefined | typeof TOMBSTONE | V;
    get(key: K): undefined | V;
    shouldCompact(): boolean;
    /**
     * Returns the nursery for in-place writes. If this GenMap is currently
     * sharing its nursery with an ancestor clone, this either compacts (if
     * the nursery has grown large enough) or makes a shallow copy.
     */
    getNursery(): Map<K, typeof TOMBSTONE | V>;
    /**
     * Fold the nursery into a new `_old` snapshot when it has grown large
     * enough that lookup overhead outweighs the savings from sharing.
     * Triggered automatically from `getNursery` once `_nursery.size * 2 >
     * _size`; can be forced via `compact(true)`.
     */
    compact(force?: boolean): this;
    set(key: K, value: V): this;
    delete(key: K): boolean;
    getOrInsert(key: K, defaultValue: V): V;
    getOrInsertComputed(key: K, computer: (k: K) => V): V;
    clear(): void;
    keys(): MapIterator<K>;
    values(): MapIterator<V>;
    entries(): MapIterator<[K, V]>;
    forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void;
    get [Symbol.toStringTag](): string;
    [Symbol.iterator](): MapIterator<[K, V]>;
}
export {};
