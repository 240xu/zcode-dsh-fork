/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
export interface SelectionAlwaysOnDisplayConfig {
    disabled: boolean;
    onReposition: undefined | ((node: readonly HTMLElement[]) => void);
}
/**
 * An extension that highlights selected content in the Lexical editor
 * even when the editor is not currently focused.
 */
export declare const SelectionAlwaysOnDisplayExtension: import("lexical").LexicalExtension<SelectionAlwaysOnDisplayConfig, "@lexical/utils/SelectionAlwaysOnDisplay", import("./namedSignals").NamedSignalsOutput<SelectionAlwaysOnDisplayConfig>, unknown>;
