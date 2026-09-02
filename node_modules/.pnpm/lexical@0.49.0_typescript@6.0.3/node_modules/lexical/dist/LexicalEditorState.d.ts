/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { LexicalEditor } from './LexicalEditor';
import type { NodeMap, SerializedLexicalNode } from './LexicalNode';
import type { BaseSelection } from './LexicalSelection';
import { type SerializedRootNode } from './nodes/LexicalRootNode';
export interface SerializedEditorState<T extends SerializedLexicalNode = SerializedLexicalNode> {
    root: SerializedRootNode<T>;
}
export declare function editorStateHasDirtySelection(editorState: EditorState, editor: LexicalEditor): boolean;
export declare function cloneEditorState(current: EditorState): EditorState;
export declare function createEmptyEditorState(): EditorState;
export interface EditorStateReadOptions {
    editor?: LexicalEditor | null;
}
/**
 * Type guard that returns true if the argument is an EditorState
 */
export declare function $isEditorState(x: unknown): x is EditorState;
export declare class EditorState {
    _nodeMap: NodeMap;
    _selection: null | BaseSelection;
    _flushSync: boolean;
    _readOnly: boolean;
    /**
     * True if this EditorState was parsed without running transforms
     */
    _parsed: boolean;
    /**
     * True if this EditorState or the LexicalEditor that created it has
     * ever used slots
     */
    _slotsUsed: boolean;
    constructor(nodeMap: NodeMap, selection?: null | BaseSelection, slotsUsed?: boolean);
    isEmpty(): boolean;
    read<V>(callbackFn: () => V, options?: EditorStateReadOptions): V;
    clone(selection?: null | BaseSelection): EditorState;
    toJSON(): SerializedEditorState;
}
