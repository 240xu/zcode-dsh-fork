/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { type LexicalEditor } from 'lexical';
export interface NestedEditorConfig {
    $getParentEditor: () => LexicalEditor;
    inheritEditableFromParent: boolean;
}
export declare const NestedEditorExtension: import("lexical").LexicalExtension<NestedEditorConfig, "@lexical/extension/NestedEditor", import("./namedSignals").NamedSignalsOutput<{
    inheritEditableFromParent: boolean;
}>, void>;
