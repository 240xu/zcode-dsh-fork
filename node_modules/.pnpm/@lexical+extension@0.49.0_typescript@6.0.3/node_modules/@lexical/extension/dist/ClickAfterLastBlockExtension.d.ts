/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { type LexicalNode } from 'lexical';
import { type Signal } from './signals';
/**
 * @experimental
 *
 * Default predicate matches {@link DecoratorNode} and shadow-root
 * `ElementNode`s (e.g. `TableNode`). Apps that want to also trigger on
 * other node types — `CodeNode`, custom non-editable blocks — should
 * compose this default in their own predicate rather than re-deriving
 * the check:
 *
 * ```ts
 * configExtension(ClickAfterLastBlockExtension, {
 *   $shouldInsertAfter: (node) =>
 *     $defaultShouldInsertAfter(node) || $isCodeNode(node),
 * });
 * ```
 */
export declare function $defaultShouldInsertAfter(node: LexicalNode): boolean;
export interface ClickAfterLastBlockConfig {
    /** Set to `true` to disable this extension. */
    disabled: boolean;
    /**
     * Called inside the editor update with the last child of the root when
     * the user clicks the empty area below it. Return `true` to insert a
     * new paragraph after that node and select it; return `false` to leave
     * the click alone. Default is {@link $defaultShouldInsertAfter} — see
     * its docs for composition patterns.
     */
    $shouldInsertAfter: (node: LexicalNode) => boolean;
}
export interface ClickAfterLastBlockOutput {
    /** Set to `true` to disable this extension. */
    disabled: Signal<boolean>;
    /** Predicate signal — see {@link ClickAfterLastBlockConfig.$shouldInsertAfter}. */
    $shouldInsertAfter: Signal<(node: LexicalNode) => boolean>;
}
/**
 * Click handling for the empty area below the last block of the document.
 *
 * Without this extension, clicking the area below the last block when that
 * block is a {@link DecoratorNode}, a shadow-root ElementNode (e.g.
 * `TableNode`), or any other block that doesn't accept the click naturally
 * leaves the selection in an awkward place — `null` for a bare decorator,
 * or at the end of a table cell. Users typically expect a new paragraph
 * to appear below the block with the caret in it, matching the behavior
 * of editors like Notion.
 *
 * This extension intercepts clicks under those conditions, inserts a new
 * empty paragraph after the last block, and selects it.
 *
 * Closes #8544.
 */
export declare const ClickAfterLastBlockExtension: import("lexical").LexicalExtension<ClickAfterLastBlockConfig, "@lexical/ClickAfterLastBlock", ClickAfterLastBlockOutput, unknown>;
