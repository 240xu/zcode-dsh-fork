/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { type LexicalCommand, type LexicalEditor, type NodeKey } from 'lexical';
export declare const UPDATE_LIST_START_COMMAND: LexicalCommand<{
    listNodeKey: NodeKey;
    newStart: number;
}>;
export declare const INSERT_UNORDERED_LIST_COMMAND: LexicalCommand<void>;
export declare const INSERT_ORDERED_LIST_COMMAND: LexicalCommand<void>;
export declare const REMOVE_LIST_COMMAND: LexicalCommand<void>;
export interface RegisterListOptions {
    restoreNumbering?: boolean;
}
export declare function registerList(editor: LexicalEditor, options?: RegisterListOptions): () => void;
export declare function registerListStrictIndentTransform(editor: LexicalEditor): () => void;
