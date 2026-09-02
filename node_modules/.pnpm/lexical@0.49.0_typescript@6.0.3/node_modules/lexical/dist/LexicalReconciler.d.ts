/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { LexicalEditor, MutatedNodes } from './LexicalEditor';
import type { EditorState } from './LexicalEditorState';
import type { NodeKey } from './LexicalNode';
import type { ElementNode } from './nodes/LexicalElementNode';
type IntentionallyMarkedAsDirtyElement = boolean;
/**
 * @internal
 *
 * A reconcile-managed cache of `getTextContentSize()` for leaf nodes.
 *
 * Stored as a Symbol-keyed property on the node instance itself so that
 * read/write are direct slot access. The slot is pre-allocated to
 * `undefined` as a non-enumerable property in the LexicalNode constructor
 * so all instances share the same V8 hidden-class shape and the setter is
 * a stable inline cache hit instead of a per-instance shape transition.
 *
 * ElementNodes are NOT stored here: an element can be dirty without being
 * cloned (a descendant edit marks ancestors dirty via
 * `internalMarkParentElementsAsDirty` but does not `getWritable()` them), so
 * the same — DEV-frozen — instance would need its size rewritten when its
 * text changes, which the skip-if-set guard cannot do. Element sizes come
 * from `dom.__lexicalTextContent` instead (see `$prevSuffixTextSize`).
 *
 * Leaf writes are skipped when the slot is already not `undefined`. The
 * setter is only re-entered for the same instance via cross-parent moves
 * (where the leaf is reused in a new parent without going through
 * `getWritable` — text is unchanged, so the prior cycle's value is still
 * correct). A leaf whose text actually changed went through
 * `getWritable()` and produced a fresh clone via `static clone(node)` ->
 * ctor -> fresh `undefined` slot, so the setter writes through normally.
 *
 * The reconciler sets this on every reconciled leaf at the end of
 * `$reconcileNode` (and on every newly-created leaf in `$createNode`), so
 * the previous editor state's leaves always carry a valid cached size from
 * the cycle that just committed.
 *
 * Suffix-incremental fast path reads this off the previous-state instance
 * to get the pre-reconcile size of dirty children in O(1), avoiding both
 * the `getLatest()` -> next-state trap and a recursive prev-tree walk.
 */
export declare const CACHED_TEXT_SIZE_KEY: unique symbol;
/**
 * @internal
 *
 * Bench-only escape hatch. When `skipChildrenFastPath` is true the children
 * fast paths in `$reconcileChildren` are skipped and the general path
 * (`$reconcileNodeChildren`) runs instead — used by `editorCycle.bench.ts`
 * to produce a head-to-head A/B against the legacy walk in a single
 * `vitest bench` run. Has no effect when false (default).
 */
export declare const __benchOnly: {
    skipChildrenFastPath: boolean;
};
export declare function $getReconciledDirection(node: ElementNode): 'ltr' | 'rtl' | 'auto' | null;
export declare function $reconcileRoot(prevEditorState: EditorState, nextEditorState: EditorState, editor: LexicalEditor, dirtyType: 0 | 1 | 2, dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>, dirtyLeaves: Set<NodeKey>): MutatedNodes;
export declare function storeDOMWithKey(key: NodeKey, dom: HTMLElement, editor: LexicalEditor): void;
export {};
