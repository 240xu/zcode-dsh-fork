/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { type ReadonlySignal, type Signal } from '@lexical/extension';
import { type EditorState, type LexicalEditor } from 'lexical';
export type HistoryStateEntry = {
    editor: LexicalEditor;
    editorState: EditorState;
};
/**
 * The undo/redo history maintained by the history plugin: the `current` entry
 * plus the `undoStack` and `redoStack` of previous and future
 * {@link HistoryStateEntry}s. Create an empty one with
 * {@link createEmptyHistoryState} and pass it to the history plugin to share
 * history across editors.
 */
export type HistoryState = {
    current: null | HistoryStateEntry;
    redoStack: HistoryStateEntry[];
    undoStack: HistoryStateEntry[];
};
/**
 * Registers necessary listeners to manage undo/redo history stack and related editor commands.
 * It returns `unregister` callback that cleans up all listeners and should be called on editor unmount.
 * @param editor - The lexical editor.
 * @param historyState - The history state, containing the current state and the undo/redo stack.
 * @param delay - The time (in milliseconds) the editor should delay generating a new history stack,
 * instead of merging the current changes with the current stack.
 * @param dateNow - The clock function used for delay-based merging.
 * @param onHistoryStateChange - Optional callback invoked once on registration
 * and again any time `historyState` is mutated (push, pop, clear, etc.). It is
 * NOT invoked when a candidate update is discarded without changing the
 * stacks. Useful for keeping derived values (e.g. signals) in sync with the
 * current `HistoryState`.
 * @param maxDepth - The maximum number of entries the undo stack may hold.
 * When the cap is exceeded a new history event has been pushed the oldest
 * entries are dropped from the front of the stack until the stack length is
 * `maxDepth`. Pass `null` (the default) to keep the stack unbounded — the
 * historical behavior. May be a plain number or a `ReadonlySignal<number | null>`
 * for reactive reconfiguration.
 * @returns The listeners cleanup callback function.
 */
export declare function registerHistory(editor: LexicalEditor, historyState: HistoryState, delay: number | ReadonlySignal<number>, dateNow?: () => number, onHistoryStateChange?: (state: HistoryState) => void, maxDepth?: number | null | ReadonlySignal<number | null>): () => void;
/**
 * Creates an empty history state.
 * @returns - The empty history state, as an object.
 */
export declare function createEmptyHistoryState(): HistoryState;
export interface HistoryConfig {
    /**
     * The time (in milliseconds) the editor should delay generating a new history stack,
     * instead of merging the current changes with the current stack. The default is 300ms.
     */
    delay: number;
    /**
     * The initial history state, the default is {@link createEmptyHistoryState}.
     */
    createInitialHistoryState: (editor: LexicalEditor) => HistoryState;
    /**
     * Whether history is disabled or not
     */
    disabled: boolean;
    /**
     * The now() function, defaults to Date.now.
     */
    now: () => number;
    /**
     * The maximum number of entries the undo stack may hold. When the cap is
     * exceeded the oldest entries are dropped (FIFO) so the stack stays at this
     * length. Defaults to `null`, which keeps the stack unbounded — the
     * historical behavior. Setting a finite cap is recommended for editors that
     * may receive a very large number of distinct history events (long writing
     * sessions, automated input, etc.) since each entry retains a full
     * `EditorState` snapshot.
     *
     * For reference, ProseMirror's `history()` plugin defaults to `depth: 100`.
     */
    maxDepth: number | null;
}
/** Internal writable signals created during the init phase. */
interface HistoryExtensionInit {
    canRedo: Signal<boolean>;
    canUndo: Signal<boolean>;
}
/**
 * The output signals exposed by {@link HistoryExtension}.
 *
 * Config-derived signals (`delay`, `disabled`, `historyState`, `now`) are
 * writable so that peer extensions such as {@link SharedHistoryExtension} can
 * redirect them at runtime.  The `canUndo` / `canRedo` signals are
 * **readonly** for consumers — they are derived from the current
 * {@link HistoryState} and kept in sync automatically.
 */
export interface HistoryExtensionOutput {
    /**
     * `true` when there is at least one entry in the redo stack, i.e. the
     * editor can perform a redo.
     */
    canRedo: ReadonlySignal<boolean>;
    /**
     * `true` when there is at least one entry in the undo stack, i.e. the
     * editor can perform an undo.
     */
    canUndo: ReadonlySignal<boolean>;
    /** The merge-delay in milliseconds forwarded to {@link registerHistory}. */
    delay: Signal<number>;
    /** When `true` the history listener is not registered. */
    disabled: Signal<boolean>;
    /** The active {@link HistoryState} instance. */
    historyState: Signal<HistoryState>;
    /**
     * Maximum number of entries the undo stack may hold. `null` disables the
     * cap. Changes apply to the next history event — the current undo stack is
     * not retroactively trimmed when the value is lowered.
     */
    maxDepth: Signal<number | null>;
    /** The clock function forwarded to {@link registerHistory}. */
    now: Signal<() => number>;
}
/**
 * Registers necessary listeners to manage undo/redo history stack and related
 * editor commands, via the \@lexical/history module.
 */
export declare const HistoryExtension: import("lexical").LexicalExtension<HistoryConfig, "@lexical/history/History", HistoryExtensionOutput, HistoryExtensionInit>;
export interface SharedHistoryConfig {
    /**
     * Whether shared history is disabled or not
     */
    disabled: boolean;
    /**
     * The parentEditor to use, by default it is derived from
     * `config.parentEditor` which can be provided by
     * NestedEditorExtension
     */
    parentEditor: LexicalEditor | null;
}
/**
 * Registers necessary listeners to manage undo/redo history stack and related
 * editor commands, via the \@lexical/history module, only if the parent editor
 * has a history plugin implementation.
 */
export declare const SharedHistoryExtension: import("lexical").LexicalExtension<SharedHistoryConfig, "@lexical/history/SharedHistory", import("@lexical/extension").NamedSignalsOutput<{
    disabled: boolean;
    parentEditor: LexicalEditor | null;
}>, unknown>;
export {};
