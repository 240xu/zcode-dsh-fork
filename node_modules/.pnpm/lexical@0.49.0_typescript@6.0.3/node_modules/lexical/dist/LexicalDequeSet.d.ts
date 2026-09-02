/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
export declare class DequeSet<T> implements Iterable<T> {
    _front: Set<T>;
    _back: Set<T>;
    _cache?: T[];
    get size(): number;
    addBack(v: T): this;
    addFront(v: T): this;
    delete(v: T): boolean;
    toArray(): T[];
    toReadonlyArray(): readonly T[];
    [Symbol.iterator](): IterableIterator<T>;
}
