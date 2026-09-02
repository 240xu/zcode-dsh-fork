/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { AnyDOMImportRule, DOMImportFn } from './types';
import { type Predicate } from './sel';
/** @internal */
export interface CompiledRule {
    readonly name: string;
    readonly predicate: Predicate;
    readonly $import: DOMImportFn<Node, Record<string, RegExpMatchArray>>;
}
/** @internal */
export interface CompiledDispatch {
    /** All rules in registration order. Index = registration order. */
    readonly rules: readonly CompiledRule[];
    /**
     * For each (uppercased) HTML tag name, the ordered list of rule indices
     * considered when dispatching that tag. Includes interleaved wildcard
     * element rules so a single iteration handles both.
     */
    readonly byTag: ReadonlyMap<string, readonly number[]>;
    /** Indices of rules whose match has no tag restriction. */
    readonly wildcardIndices: readonly number[];
    /** Indices of rules whose match is `sel.text()`. */
    readonly textIndices: readonly number[];
    /** Indices of rules whose match is `sel.comment()`. */
    readonly commentIndices: readonly number[];
}
/**
 * Compile an ordered list of {@link DOMImportRule}s into the dispatch tables
 * used by the import runtime. The rule at index 0 is the highest-priority
 * (`mergeConfig` prepends partial.rules so later-merged extensions land
 * first).
 *
 * @internal
 */
export declare function compileImportRules(rules: readonly AnyDOMImportRule[]): CompiledDispatch;
/**
 * Look up the (already interleaved) rule indices relevant to `node`. Element
 * nodes hit `byTag` (with wildcards merged in) or fall back to the wildcard
 * bucket if no tag-specific rules exist; text and comment nodes use their
 * own buckets.
 *
 * @internal
 */
export declare function getDispatchIndices(dispatch: CompiledDispatch, node: Node): readonly number[];
