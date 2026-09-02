/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { LexicalNode, SerializedLexicalNode } from './LexicalNode';
import { type AnyLexicalCommand, type CommandPayloadType, type EditorUpdateOptions, LexicalEditor, type MapListeners, type Transform } from './LexicalEditor';
import { type EditorState, type SerializedEditorState } from './LexicalEditorState';
export declare function isCurrentlyReadOnlyMode(): boolean;
export declare function errorOnReadOnly(): void;
export declare function errorOnInfiniteTransforms(): void;
export declare function getActiveEditorState(): EditorState;
/** @internal */
export declare function $assumeActiveEditor(editor: LexicalEditor): void;
export declare function getActiveEditor(): LexicalEditor;
/**
 * Schedule a full reconcile of the active editor, so that every node is
 * re-rendered through the current {@link EditorDOMRenderConfig} on the next
 * commit. Unlike {@link LexicalNode.markDirty}, this does not clone or
 * otherwise mutate the node map, so no mutation/collaboration listeners
 * observe a change. Must be called within an `editor.update`.
 *
 * @internal
 */
export declare function $fullReconcile(): void;
export declare function internalGetActiveEditor(): LexicalEditor | null;
export declare function internalGetActiveEditorState(): EditorState | null;
export declare function $applyTransforms(editor: LexicalEditor, node: LexicalNode, transformsCache: Map<string, Transform<LexicalNode>[]>): void;
export declare function $parseSerializedNode(serializedNode: SerializedLexicalNode): LexicalNode;
export declare function parseEditorState(serializedEditorState: SerializedEditorState, editor: LexicalEditor, updateFn: void | (() => void)): EditorState;
export declare function readEditorState<V>(editor: LexicalEditor | null, editorState: EditorState, callbackFn: () => V): V;
export declare function $commitPendingUpdates(editor: LexicalEditor, recoveryEditorState?: EditorState): void;
export declare function triggerListeners<T extends keyof MapListeners>(type: T, editor: LexicalEditor, isCurrentlyEnqueuingUpdates: boolean, ...payload: MapListeners[T]): void;
export declare function triggerCommandListeners<TCommand extends AnyLexicalCommand>(editor: LexicalEditor, type: TCommand, payload: CommandPayloadType<TCommand>, fromEditor: LexicalEditor): boolean;
/**
 * A variant of updateEditor that will not defer if it is nested in an update
 * to the same editor, much like if it was an editor.dispatchCommand issued
 * within an update
 */
export declare function updateEditorSync(editor: LexicalEditor, updateFn: () => void, options?: EditorUpdateOptions): void;
export declare function updateEditor(editor: LexicalEditor, updateFn: () => void, options?: EditorUpdateOptions): void;
