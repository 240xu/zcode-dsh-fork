/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
export interface SelectBlockConfig {
    /** `true` to disable this extension */
    disabled: boolean;
    /** `true` to trigger selectAll if all content is selected in the nested editor */
    cascadeSelection: boolean;
}
/**
 * This extension includes block selection.
 * If you press Ctrl + A, the nearest block element, for example paragraph, is selected first.
 * Pressing Ctrl + A again selects all content in the document. A selection
 * that already spans multiple blocks expands directly to the whole document.
 */
export declare const SelectBlockExtension: import("lexical").LexicalExtension<SelectBlockConfig, "@lexical/extension/SelectBlock", import("./namedSignals").NamedSignalsOutput<SelectBlockConfig>, unknown>;
