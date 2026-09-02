/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { AttrMatchOptions, CompiledSelector, ElementSelectorBuilder } from './types';
/**
 * @internal
 *
 * A predicate that may write into the per-invocation `captures` map. Returns
 * `true` if the rule matches; `false` otherwise.
 */
export type Predicate = (node: Node, captures: Record<string, RegExpMatchArray>) => boolean;
/** @internal */
export type SelectorKind = 'element' | 'text' | 'comment';
/** @internal The runtime shape of a {@link CompiledSelector}. */
export interface SelectorImpl {
    readonly kind: SelectorKind;
    /**
     * Uppercased tag names this selector is restricted to. Empty for wildcard
     * element selectors and for text / comment selectors (dispatched by
     * `kind`).
     */
    readonly tags: ReadonlySet<string>;
    /** Composed predicate run against a candidate node. */
    readonly predicate: Predicate;
}
/** @internal */
export declare function getSelectorImpl(sel: CompiledSelector): SelectorImpl;
/**
 * @internal
 *
 * Build a selector value from a tag set and a predicate list. Used by the
 * combinator API and the CSS parser.
 */
export declare function buildSelector(tags: ReadonlySet<string>, predicates: readonly Predicate[]): ElementSelectorBuilder<HTMLElement>;
/** @internal */
export declare function buildClassAllPredicate(classes: readonly string[]): Predicate;
/** @internal */
export declare function buildClassAnyPredicate(classes: readonly string[]): Predicate;
/** @internal */
export declare function buildAttrPredicate(name: string, value: unknown, options?: AttrMatchOptions): Predicate;
/**
 * Combinator API for building {@link CompiledSelector}s. The public
 * `sel` is augmented from this in `./index.ts` (where the CSS parser is
 * available without a circular import); consumers outside `@lexical/html`
 * should always import the public `sel` from the package root.
 *
 * @internal
 */
export declare const selBase: {
    /** Match any {@link HTMLElement}. */
    readonly any: () => ElementSelectorBuilder<HTMLElement>;
    /** Match DOM {@link Comment} nodes. */
    readonly comment: () => CompiledSelector<Comment>;
    /**
     * Match by tag name(s). With one literal tag the element type is narrowed
     * (e.g. `'a' → HTMLAnchorElement`); with multiple, it is the union of
     * their `HTMLElementTagNameMap` entries.
     */
    readonly tag: <const Tags extends readonly string[]>(...tags: Tags) => ElementSelectorBuilder<Tags[number] extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[Tags[number]] : HTMLElement>;
    /** Match DOM {@link Text} nodes. */
    readonly text: () => CompiledSelector<Text>;
};
/**
 * Cross-frame-safe replacement for `node instanceof HTMLXxxElement`. Returns
 * true when `node` is an HTMLElement whose `nodeName` equals `tag` (compared
 * case-insensitively).
 *
 * @experimental
 */
export declare function isElementOfTag<T extends keyof HTMLElementTagNameMap>(node: Node, tag: T): node is HTMLElementTagNameMap[T];
