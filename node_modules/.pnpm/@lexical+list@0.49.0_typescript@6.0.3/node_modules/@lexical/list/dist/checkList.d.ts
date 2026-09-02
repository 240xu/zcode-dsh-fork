/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { Signal } from '@lexical/extension';
import { type LexicalCommand, type LexicalEditor } from 'lexical';
export declare const INSERT_CHECK_LIST_COMMAND: LexicalCommand<void>;
/**
 * Registers the checklist plugin with the editor.
 * @param editor The LexicalEditor instance.
 * @param options Optional configuration.
 *   - disableTakeFocusOnClick: If true, clicking a checklist item will not focus the editor (useful for mobile).
 */
export declare function registerCheckList(editor: LexicalEditor, options?: {
    disableTakeFocusOnClick?: boolean | Signal<boolean>;
}): () => void;
