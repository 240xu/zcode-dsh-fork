/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { type Signal } from './signals';
export interface NormalizeTripleClickSelectionConfig {
    /** `true` to disable this extension */
    disabled: boolean;
    /** The maximum number of msec from the triple click to expect a selection change, default `100` */
    thresholdMsec: number;
    /** The clock function used for delay-based merging, default `Date.now` */
    dateNow: () => number;
    /** The update function to call when triple click is detected */
    $fixFocusOverselection: () => void;
}
export interface NormalizeTripleClickSelectionOutput {
    /** `true` to disable this extension */
    disabled: Signal<boolean>;
    /** The maximum number of msec from the triple click to expect a selection change, default `100` */
    thresholdMsec: Signal<number>;
    /** The clock function used for delay-based merging, default `Date.now` */
    dateNow: Signal<() => number>;
    /** The update function to call when triple click is detected */
    $fixFocusOverselection: Signal<() => void>;
}
/**
 * This extension handles triple-click events and will move the focus
 * towards the anchor in certain conditions to meet expectations.
 * Simply speaking, the focus should prefer to land at the end of a node
 * rather than the beginning of its next sibling, and it should not skip
 * over a LineBreakNode.
 *
 * In order to fix the result visually and avoid a flash of over-selection
 * it will also eagerly manipulate the DOM selection directly.
 *
 * It is conservative in that it only fires this
 * `$fixFocusOverselection` callback when it has detected a triple click,
 * but it provides the function as an output signal so that it can both
 * be called from other places and it can be replaced or wrapped with
 * different functionality.
 */
export declare const NormalizeTripleClickSelectionExtension: import("lexical").LexicalExtension<NormalizeTripleClickSelectionConfig, "@lexical/NormalizeTripleClickSelection", NormalizeTripleClickSelectionOutput, unknown>;
