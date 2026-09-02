/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
export interface NormalizeInlineElementsConfig {
    disabled: boolean;
}
/**
 * This extension removes empty inline nodes from the EditorState.
 * This extension is designed to facilitate a smooth migration from
 * the plugin API with the option to disable it, but it may be removed
 * in the future and integrated into the core
 */
export declare const NormalizeInlineElementsExtension: import("lexical").LexicalExtension<NormalizeInlineElementsConfig, "@lexical/NormalizeInlineElements", import("./namedSignals").NamedSignalsOutput<NormalizeInlineElementsConfig>, unknown>;
