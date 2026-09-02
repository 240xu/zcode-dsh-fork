/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { CAN_USE_BEFORE_INPUT, CAN_USE_DOM, IS_ANDROID, IS_ANDROID_CHROME, IS_APPLE, IS_APPLE_WEBKIT, IS_CHROME, IS_FIREFOX, IS_IOS, IS_SAFARI } from 'lexical';
import { $insertNodeToNearestRootAtCaret, type CaretDirection, type CaretRange, type EditorState, type ElementNode, type Klass, type LexicalEditor, type LexicalNode, type NodeCaret, type PasteCommandType, type PointType, type RangeSelection, type SiblingCaret, type StateConfig, type ValueOrUpdater } from 'lexical';
export { default as dedupeSelectionRects } from './dedupeSelectionRects';
export { default as markSelection } from './markSelection';
export { default as positionNodeOnRange } from './positionNodeOnRange';
export { default as selectionAlwaysOnDisplay } from './selectionAlwaysOnDisplay';
export { $findMatchingParent, $getAdjacentSiblingOrParentSiblingCaret, $splitNode, addClassNamesToElement, isBlockDomNode, isHTMLAnchorElement, isHTMLElement, isInlineDomNode, mergeRegister, removeClassNamesFromElement, } from 'lexical';
export { CAN_USE_BEFORE_INPUT, CAN_USE_DOM, IS_ANDROID, IS_ANDROID_CHROME, IS_APPLE, IS_APPLE_WEBKIT, IS_CHROME, IS_FIREFOX, IS_IOS, IS_SAFARI, };
/**
 * Returns true if the file type matches the types passed within the acceptableMimeTypes array, false otherwise.
 * The types passed must be strings and are CASE-SENSITIVE.
 * eg. if file is of type 'text' and acceptableMimeTypes = ['TEXT', 'IMAGE'] the function will return false.
 * @param file - The file you want to type check.
 * @param acceptableMimeTypes - An array of strings of types which the file is checked against.
 * @returns true if the file is an acceptable mime type, false otherwise.
 */
export declare function isMimeType(file: File, acceptableMimeTypes: string[]): boolean;
/**
 * Lexical File Reader with:
 *  1. MIME type support
 *  2. batched results (HistoryPlugin compatibility)
 *  3. Order aware (respects the order when multiple Files are passed)
 *
 * const filesResult = await mediaFileReader(files, ['image/']);
 * filesResult.forEach(file => editor.dispatchCommand('INSERT_IMAGE', \\{
 *   src: file.result,
 * \\}));
 */
export declare function mediaFileReader(files: File[], acceptableMimeTypes: string[]): Promise<{
    file: File;
    result: string;
}[]>;
export interface DFSNode {
    readonly depth: number;
    readonly node: LexicalNode;
}
/**
 * "Depth-First Search" starts at the root/top node of a tree and goes as far as it can down a branch end
 * before backtracking and finding a new path. Consider solving a maze by hugging either wall, moving down a
 * branch until you hit a dead-end (leaf) and backtracking to find the nearest branching path and repeat.
 * It will then return all the nodes found in the search in an array of objects.
 * Preorder traversal is used, meaning that nodes are listed in the order of when they are FIRST encountered.
 *
 * Children-only spine: named slot subtrees are skipped. Use {@link $dfsWithSlots}
 * when you need to descend into slots (e.g. character counting, slot-aware
 * content extraction).
 *
 * @param startNode - The node to start the search (inclusive), if omitted, it will start at the root node.
 * @param endNode - The node to end the search (inclusive), if omitted, it will find all descendants of the startingNode. If endNode
 * is an ElementNode, it will stop before visiting any of its children.
 * @returns An array of objects of all the nodes found by the search, including their depth into the tree.
 * \\{depth: number, node: LexicalNode\\} It will always return at least 1 node (the start node).
 */
export declare function $dfs(startNode?: LexicalNode, endNode?: LexicalNode): DFSNode[];
/**
 * Get the adjacent caret in the same direction
 *
 * @param caret A caret or null
 * @returns `caret.getAdjacentCaret()` or `null`
 */
export declare function $getAdjacentCaret<D extends CaretDirection>(caret: null | NodeCaret<D>): null | SiblingCaret<LexicalNode, D>;
/**
 * $dfs iterator (right to left). Tree traversal is done on the fly as new values are requested with O(1) memory.
 * @param startNode - The node to start the search, if omitted, it will start at the root node.
 * @param endNode - The node to end the search, if omitted, it will find all descendants of the startingNode.
 * @returns An iterator, each yielded value is a DFSNode. It will always return at least 1 node (the start node).
 */
export declare function $reverseDfs(startNode?: LexicalNode, endNode?: LexicalNode): DFSNode[];
/**
 * $dfs iterator (left to right). Tree traversal is done on the fly as new values are requested with O(1) memory.
 * Preorder traversal is used, meaning that nodes are iterated over in the order of when they are FIRST encountered.
 *
 * Children-only spine: named slot subtrees are skipped. Use {@link $dfsWithSlotsIterator}
 * (or {@link $dfsWithSlots}) when you need to descend into slots — e.g. character
 * counting, content extraction, or any cross-tree analysis where slotted content
 * should be visited.
 *
 * @param startNode - The node to start the search (inclusive), if omitted, it will start at the root node.
 * @param endNode - The node to end the search (inclusive), if omitted, it will find all descendants of the startingNode.
 * If endNode is an ElementNode, the iterator will end as soon as it reaches the endNode (no children will be visited).
 * @returns An iterator, each yielded value is a DFSNode. It will always return at least 1 node (the start node).
 */
export declare function $dfsIterator(startNode?: LexicalNode, endNode?: LexicalNode): IterableIterator<DFSNode>;
/**
 * Like {@link $dfs}, but also descends into named slots. Slots are not on the
 * linked-list spine, so each host's slot subtrees are emitted slots-first,
 * right after the host node and before its linked-list children.
 * @experimental
 * @param startNode - The node to start the search (inclusive), defaults to the root node.
 * @param endNode - The node to end the search (inclusive), defaults to all descendants of startNode.
 * Like {@link $dfs}, reaching endNode stops the traversal before visiting any of its
 * children — including its slot subtrees. An endNode strictly inside a slot subtree
 * is never reached (slot subtrees are spliced in whole), so it does not truncate
 * the traversal.
 * @returns An array of DFSNodes. It will always return at least 1 node (the start node).
 */
export declare function $dfsWithSlots(startNode?: LexicalNode, endNode?: LexicalNode): DFSNode[];
/**
 * Slot-aware {@link $dfsIterator}: a host's slot subtrees are emitted
 * slots-first, right after the host node and before its linked-list children.
 * The caret iterator drives the linked-list spine untouched.
 * @experimental
 * @param startNode - The node to start the search (inclusive), defaults to the root node.
 * @param endNode - The node to end the search (inclusive), defaults to all descendants of startNode.
 * Like {@link $dfs}, reaching endNode stops the traversal before visiting any of its
 * children — including its slot subtrees. An endNode strictly inside a slot subtree
 * is never reached (slot subtrees are spliced in whole), so it does not truncate
 * the traversal.
 * @returns An iterator, each yielded value is a DFSNode. It will always return at least 1 node (the start node).
 */
export declare function $dfsWithSlotsIterator(startNode?: LexicalNode, endNode?: LexicalNode): IterableIterator<DFSNode>;
/**
 * Returns the Node sibling when this exists, otherwise the closest parent sibling. For example
 * R -> P -> T1, T2
 *   -> P2
 * returns T2 for node T1, P2 for node T2, and null for node P2.
 * @param node LexicalNode.
 * @returns An array (tuple) containing the found Lexical node and the depth difference, or null, if this node doesn't exist.
 */
export declare function $getNextSiblingOrParentSibling(node: LexicalNode): null | [LexicalNode, number];
export declare function $getDepth(node: null | LexicalNode): number;
/**
 * Performs a right-to-left preorder tree traversal.
 * From the starting node it goes to the rightmost child, than backtracks to parent and finds new rightmost path.
 * It will return the next node in traversal sequence after the startingNode.
 * The traversal is similar to $dfs functions above, but the nodes are visited right-to-left, not left-to-right.
 * @param startingNode - The node to start the search.
 * @returns The next node in pre-order right to left traversal sequence or `null`, if the node does not exist
 */
export declare function $getNextRightPreorderNode(startingNode: LexicalNode): LexicalNode | null;
/**
 * $dfs iterator (right to left). Tree traversal is done on the fly as new values are requested with O(1) memory.
 * @param startNode - The node to start the search, if omitted, it will start at the root node.
 * @param endNode - The node to end the search, if omitted, it will find all descendants of the startingNode.
 * @returns An iterator, each yielded value is a DFSNode. It will always return at least 1 node (the start node).
 */
export declare function $reverseDfsIterator(startNode?: LexicalNode, endNode?: LexicalNode): IterableIterator<DFSNode>;
/**
 * Like {@link $reverseDfs}, but also descends into named slots. Mirror of
 * {@link $dfsWithSlots}.
 * @experimental
 * @param startNode - The node to start the search (inclusive), defaults to the root node.
 * @param endNode - The node to end the search (inclusive), defaults to all descendants of startNode.
 * Mirroring {@link $dfsWithSlots}, reaching endNode stops the traversal without
 * emitting its slot subtrees. An endNode strictly inside a slot subtree is never
 * reached (slot subtrees are spliced in whole), so it does not truncate the
 * traversal.
 * @returns An array of DFSNodes. It will always return at least 1 node (the start node).
 */
export declare function $reverseDfsWithSlots(startNode?: LexicalNode, endNode?: LexicalNode): DFSNode[];
/**
 * Right-to-left mirror of {@link $dfsWithSlotsIterator}. Forward visits slots
 * before children, so the mirror visits them last: a host's slot subtrees are
 * emitted (in reverse slot order) only once its linked-list subtree is fully
 * traversed. Because the caret spine streams nodes, "left the host subtree" is
 * detected when a node at the host's depth or shallower arrives, flushing the
 * host's pending slots. The caret iterator drives the spine untouched.
 * @experimental
 * @param startNode - The node to start the search (inclusive), defaults to the root node.
 * @param endNode - The node to end the search (inclusive), defaults to all descendants of startNode.
 * Mirroring {@link $dfsWithSlotsIterator}, reaching endNode stops the traversal
 * without emitting its slot subtrees. An endNode strictly inside a slot subtree is
 * never reached (slot subtrees are spliced in whole), so it does not truncate the
 * traversal.
 * @returns An iterator, each yielded value is a DFSNode. It will always return at least 1 node (the start node).
 */
export declare function $reverseDfsWithSlotsIterator(startNode?: LexicalNode, endNode?: LexicalNode): IterableIterator<DFSNode>;
/**
 * Takes a node and traverses up its ancestors (toward the root node)
 * in order to find a specific type of node.
 * @param node - the node to begin searching.
 * @param klass - an instance of the type of node to look for.
 * @returns the node of type klass that was passed, or null if none exist.
 */
export declare function $getNearestNodeOfType<T extends ElementNode>(node: LexicalNode, klass: Klass<T>): T | null;
/**
 * Returns the element node of the nearest ancestor, otherwise throws an error.
 * @param startNode - The starting node of the search
 * @returns The ancestor node found
 */
export declare function $getNearestBlockElementAncestorOrThrow(startNode: LexicalNode): ElementNode;
/**
 * Checks whether the selection covers the entire block: the selection's
 * start point is at or before the first position inside blockNode and its
 * end point is at or after the last position inside blockNode. A selection
 * that extends beyond the block's boundaries still fully selects the block,
 * and an empty block is fully selected by any selection that touches or
 * surrounds it.
 *
 * @param blockNode - The ElementNode to check, typically a top-level block or the RootNode
 * @param selectionOrRange - The RangeSelection or CaretRange to check
 * @returns true if the selection covers the entire blockNode
 */
export declare function $isBlockFullySelected(blockNode: ElementNode, selectionOrRange: RangeSelection | CaretRange): boolean;
export type DOMNodeToLexicalConversion = (element: Node) => LexicalNode;
export type DOMNodeToLexicalConversionMap = Record<string, DOMNodeToLexicalConversion>;
/**
 * Attempts to resolve nested element nodes of the same type into a single node of that type.
 * It is generally used for marks/commenting
 * @param editor - The lexical editor
 * @param targetNode - The target for the nested element to be extracted from.
 * @param cloneNode - See {@link $createMarkNode}
 * @param handleOverlap - Handles any overlap between the node to extract and the targetNode
 * @returns The lexical editor
 */
export declare function registerNestedElementResolver<N extends ElementNode>(editor: LexicalEditor, targetNode: Klass<N>, cloneNode: (from: N) => N, handleOverlap: (from: N, to: N) => void): () => void;
/**
 * Clones the editor and marks it as dirty to be reconciled. If there was a selection,
 * it would be set back to its previous state, or null otherwise.
 * @param editor - The lexical editor
 * @param editorState - The editor's state
 */
export declare function $restoreEditorState(editor: LexicalEditor, editorState: EditorState): void;
/**
 * If the selected insertion area is the root/shadow root node (see {@link lexical!$isRootOrShadowRoot}),
 * the node will be appended there, otherwise, it will be inserted before the insertion area.
 * If there is no selection where the node is to be inserted, it will be appended after any current nodes
 * within the tree, as a child of the root node. A paragraph will then be added after the inserted node and selected.
 * @param node - The node to be inserted
 * @returns The node after its insertion
 */
export declare function $insertNodeToNearestRoot<T extends LexicalNode>(node: T): T;
export { $insertNodeToNearestRootAtCaret };
/**
 * Inserts a node into leaf — the deepest accessible node at the carriage position
 * @param node - The node to be inserted
 */
export declare function $insertNodeIntoLeaf(node: LexicalNode): void;
/**
 * Wraps the node into another node created from a createElementNode function, eg. $createParagraphNode
 * @param node - Node to be wrapped.
 * @param createElementNode - Creates a new lexical element to wrap the to-be-wrapped node and returns it.
 * @returns A new lexical element with the previous node appended within (as a child, including its children).
 */
export declare function $wrapNodeInElement<T extends ElementNode>(node: LexicalNode, createElementNode: () => T): T;
export type ObjectKlass<T> = new (...args: any[]) => T;
/**
 * @param object = The instance of the type
 * @param objectClass = The class of the type
 * @returns Whether the object is has the same Klass of the objectClass, ignoring the difference across window (e.g. different iframes)
 */
export declare function objectKlassEquals<T>(object: unknown, objectClass: ObjectKlass<T>): object is T;
export declare function eventFiles(event: DragEvent | PasteCommandType): [boolean, File[], boolean];
/**
 * @deprecated Use Array filter or flatMap
 *
 * Filter the nodes
 * @param nodes Array of nodes that needs to be filtered
 * @param filterFn A filter function that returns node if the current node satisfies the condition otherwise null
 * @returns Array of filtered nodes
 */
export declare function $filter<T>(nodes: LexicalNode[], filterFn: (node: LexicalNode) => null | T): T[];
/**
 * Applies the provided callback to each indentable block element in the Selection
 *
 * @param indentOrOutdent callback for performing the indent or outdent action
 * on a given block element.
 * @returns true if at least one block was handled, false otherwise.
 */
export declare function $handleIndentAndOutdent(indentOrOutdent: (block: ElementNode) => void): boolean;
/**
 * Appends the node before the first child of the parent node
 * @param parent A parent node
 * @param node Node that needs to be appended
 */
export declare function $insertFirst(parent: ElementNode, node: LexicalNode): void;
/**
 * Calculates the zoom level of an element as a result of using
 * css zoom property. For browsers that implement standardized CSS
 * zoom (Firefox, Chrome >= 128), this will always return 1.
 * @param element
 * @param useManualZoom - If true, always use zoom level will be calculated manually, otherwise it will be calculated on as needed basis.
 */
export declare function calculateZoomLevel(element: Element | null, useManualZoom?: boolean): number;
/**
 * Checks if the editor is a nested editor created by LexicalNestedComposer
 */
export declare function $isEditorIsNestedEditor(editor: LexicalEditor): boolean;
/**
 * A depth first last-to-first traversal of root that stops at each node that matches
 * $predicate and ensures that its parent is root. This is typically used to discard
 * invalid or unsupported wrapping nodes. For example, a TableNode must only have
 * TableRowNode as children, but an importer might add invalid nodes based on
 * caption, tbody, thead, etc. and this will unwrap and discard those.
 *
 * @param root The root to start the traversal
 * @param $predicate Should return true for nodes that are permitted to be children of root
 * @returns true if this unwrapped or removed any nodes
 */
export declare function $unwrapAndFilterDescendants(root: ElementNode, $predicate: (node: LexicalNode) => boolean): boolean;
/**
 * A depth first traversal of the children array that stops at and collects
 * each node that `$predicate` matches. This is typically used to discard
 * invalid or unsupported wrapping nodes on a children array in the `after`
 * of an {@link lexical!DOMConversionOutput}. For example, a TableNode must only have
 * TableRowNode as children, but an importer might add invalid nodes based on
 * caption, tbody, thead, etc. and this will unwrap and discard those.
 *
 * This function is read-only and performs no mutation operations, which makes
 * it suitable for import and export purposes but likely not for any in-place
 * mutation. You should use {@link $unwrapAndFilterDescendants} for in-place
 * mutations such as node transforms.
 *
 * @param children The children to traverse
 * @param $predicate Should return true for nodes that are permitted to be children of root
 * @returns The children or their descendants that match $predicate
 */
export declare function $descendantsMatching<T extends LexicalNode>(children: LexicalNode[], $predicate: (node: LexicalNode) => node is T): T[];
/**
 * Return an iterator that yields each child of node from first to last, taking
 * care to preserve the next sibling before yielding the value in case the caller
 * removes the yielded node.
 *
 * @param node The node whose children to iterate
 * @returns An iterator of the node's children
 */
export declare function $firstToLastIterator(node: ElementNode): Iterable<LexicalNode>;
/**
 * Return an iterator that yields each child of node from last to first, taking
 * care to preserve the previous sibling before yielding the value in case the caller
 * removes the yielded node.
 *
 * @param node The node whose children to iterate
 * @returns An iterator of the node's children
 */
export declare function $lastToFirstIterator(node: ElementNode): Iterable<LexicalNode>;
/**
 * Replace this node with its children
 *
 * @param node The ElementNode to unwrap and remove
 */
export declare function $unwrapNode(node: ElementNode): void;
/**
 * A wrapper that creates bound functions and methods for the
 * StateConfig to save some boilerplate when defining methods
 * or exporting only the accessors from your modules rather
 * than exposing the StateConfig directly.
 */
export interface StateConfigWrapper<K extends string, V> {
    /** A reference to the stateConfig */
    readonly stateConfig: StateConfig<K, V>;
    /** `(node) => $getState(node, stateConfig)` */
    readonly $get: <T extends LexicalNode>(node: T) => V;
    /** `(node, valueOrUpdater) => $setState(node, stateConfig, valueOrUpdater)` */
    readonly $set: <T extends LexicalNode>(node: T, valueOrUpdater: ValueOrUpdater<V>) => T;
    /** `[$get, $set]` */
    readonly accessors: readonly [$get: this['$get'], $set: this['$set']];
    /**
     * `() => function () { return $get(this) }`
     *
     * Should be called with an explicit `this` type parameter.
     *
     * @example
     * ```ts
     * class MyNode {
     *   // …
     *   myGetter = myWrapper.makeGetterMethod<this>();
     * }
     * ```
     */
    makeGetterMethod<T extends LexicalNode>(): (this: T) => V;
    /**
     * `() => function (valueOrUpdater) { return $set(this, valueOrUpdater) }`
     *
     * Must be called with an explicit `this` type parameter.
     *
     * @example
     * ```ts
     * class MyNode {
     *   // …
     *   mySetter = myWrapper.makeSetterMethod<this>();
     * }
     * ```
     */
    makeSetterMethod<T extends LexicalNode>(): (this: T, valueOrUpdater: ValueOrUpdater<V>) => T;
}
/**
 * EXPERIMENTAL
 *
 * A convenience interface for working with {@link $getState} and
 * {@link $setState}.
 *
 * @param stateConfig The stateConfig to wrap with convenience functionality
 * @returns a StateWrapper
 */
export declare function makeStateWrapper<K extends string, V>(stateConfig: StateConfig<K, V>): StateConfigWrapper<K, V>;
/**
 * Inserts a new paragraph before a container node when the cursor moves outside the container element
 *
 * Intended for use ArrowLeft/ArrowUp keyboard handlers to allow the user to break out
 * of a container node by creating a new paragraph before it.
 *
 * A paragraph is inserted if that the cursor is positioned at the beginning inside the container,
 * and the container itself is the first element in the document and has no preceding sibling
 *
 * When a paragraph is inserted the selection is moved to it and, if the
 * triggering keyboard event is provided, its default action is prevented so
 * the browser does not additionally move the selection. Relying on the native
 * caret movement is not portable: Chromium moves into the freshly inserted
 * paragraph while Firefox leaves the caret inside the container.
 *
 * @param $isContainerNode - Type guard identifying the container node type to escape from.
 * @param event - The keyboard event that triggered the escape, if any. Its
 *   default action is prevented when a paragraph is inserted.
 * @returns `true` if a paragraph was inserted, `false` otherwise.
 */
export declare function $onEscapeUp($isContainerNode: (node?: LexicalNode | null) => node is ElementNode, event?: KeyboardEvent | null): boolean;
/**
 * Inserts a new paragraph after a container node when the cursor moves outside the container element
 *
 * Intended for use ArrowRight/ArrowDown keyboard handlers to allow the user to break out
 * of a container node by creating a new paragraph after it.
 *
 * A paragraph is inserted if that the cursor is positioned at the ending inside the container,
 * and the container itself is the last element in the document and has no next sibling
 *
 * When a paragraph is inserted the selection is moved to it and, if the
 * triggering keyboard event is provided, its default action is prevented so
 * the browser does not additionally move the selection. Relying on the native
 * caret movement is not portable: Chromium moves into the freshly inserted
 * paragraph while Firefox leaves the caret inside the container.
 *
 * @param $isContainerNode - Type guard identifying the container node type to escape from.
 * @param event - The keyboard event that triggered the escape, if any. Its
 *   default action is prevented when a paragraph is inserted.
 * @returns `true` if a paragraph was inserted, `false` otherwise.
 */
export declare function $onEscapeDown($isContainerNode: (node?: LexicalNode | null) => node is ElementNode, event?: KeyboardEvent | null): boolean;
/**
 * Whether the collapsed `point` sits at the very start of `node`'s content —
 * on its first descendant (or on the empty node itself) at offset 0. Shared by
 * {@link $onEscapeUp} and slot-aware variants so the "at the leading edge of a
 * container" test stays in one place.
 */
export declare function $isAtStartOfNode(point: PointType, node: ElementNode): boolean;
/**
 * Whether the collapsed `point` sits at the very end of `node`'s content — on
 * its last descendant (or on the empty node itself) at that node's end. Shared
 * by {@link $onEscapeDown} and slot-aware variants so the "at the trailing edge
 * of a container" test stays in one place.
 */
export declare function $isAtEndOfNode(point: PointType, node: ElementNode): boolean;
export { getScrollParent } from './getScrollParent';
