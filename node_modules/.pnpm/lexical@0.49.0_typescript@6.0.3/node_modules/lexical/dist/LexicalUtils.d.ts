/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { EditorState } from './LexicalEditorState';
import type { RootNode } from './nodes/LexicalRootNode';
import { DecoratorNode, ElementNode, type LineBreakNode, type UpdateTag } from '.';
import { type DOMSlot, ElementDOMSlot } from './LexicalDOMSlot';
import { type AnyLexicalCommand, type CommandPayloadArgs, type CommandPayloadType, type DOMSlotForNode, type EditorDOMRenderConfig, type EditorThemeClasses, type Klass, LexicalEditor, type MutatedNodes, type MutationListeners, type NodeMutation, type RegisteredNode, type RegisteredNodes } from './LexicalEditor';
import { LexicalNode, type LexicalPrivateDOM, type NodeKey, type NodeMap, type StaticNodeConfigValue } from './LexicalNode';
import { type BaseSelection, type PointType, type RangeSelection } from './LexicalSelection';
import { type TextFormatType, TextNode } from './nodes/LexicalTextNode';
export declare const emptyFunction: () => void;
export declare function setPendingNodeToClone(pendingNode: null | LexicalNode): void;
export declare function getPendingNodeToClone(): null | LexicalNode;
export declare function resetRandomKey(): void;
export declare function generateRandomKey(): string;
/**
 * @internal
 */
export declare function getRegisteredNodeOrThrow(editor: LexicalEditor, nodeType: string): RegisteredNode;
/**
 * @internal
 */
export declare function getRegisteredNode(editor: LexicalEditor, nodeType: string): undefined | RegisteredNode;
export declare const isArray: (arg: any) => arg is any[];
/** @internal */
export declare const scheduleMicroTask: (fn: () => void) => void;
export declare function $isSelectionCapturedInDecoratorInput(anchorDOM: Node, preResolvedActiveElement?: Element | null): boolean;
/** @deprecated renamed to {@link $isSelectionCapturedInDecoratorInput} by @lexical/eslint-plugin rules-of-lexical */
export declare const isSelectionCapturedInDecoratorInput: typeof $isSelectionCapturedInDecoratorInput;
export declare function isSelectionWithinEditor(editor: LexicalEditor, anchorDOM: null | Node, focusDOM: null | Node): boolean;
/**
 * @returns true if the given argument is a LexicalEditor instance from this build of Lexical
 */
export declare function isLexicalEditor(editor: unknown): editor is LexicalEditor;
export declare function getNearestEditorFromDOMNode(node: Node | null): LexicalEditor | null;
/** @internal */
export declare function getEditorPropertyFromDOMNode(node: Node | null): unknown;
export declare function getTextDirection(text: string): 'ltr' | 'rtl' | null;
/**
 * Return true if the TextNode is a TabNode or is in token mode.
 */
export declare function $isTokenOrTab(node: TextNode): boolean;
/**
 * Return true if the TextNode is a TabNode, or is in token or segmented mode.
 */
export declare function $isTokenOrSegmented(node: TextNode): boolean;
/**
 * @param node - The element being tested
 * @returns Returns true if node is an DOM Text node, false otherwise.
 */
export declare function isDOMTextNode(node: unknown): node is Text;
/**
 * @param node - The element being tested
 * @returns Returns true if node is an DOM Document node, false otherwise.
 */
export declare function isDOMDocumentNode(node: unknown): node is Document;
export declare function getDOMTextNode(element: Node | null): Text | null;
export declare function toggleTextFormatType(format: number, type: TextFormatType, alignWithFormat: null | number): number;
export declare function $isLeafNode(node: LexicalNode | null | undefined): node is TextNode | LineBreakNode | DecoratorNode<unknown>;
export declare function $setNodeKey(node: LexicalNode, existingKey: NodeKey | null | undefined): void;
/**
 * Removes a node from its parent, updating all necessary pointers and links.
 * @internal
 *
 * This function does not adjust the editor's current selection. Callers
 * that need element-anchored offsets in the old parent to track the child
 * count change must call `$updateElementSelectionOnCreateDeleteNode` (with
 * `times = -1`) after invoking this — see `$removeNode`, `replace`,
 * `insertBefore`, and `insertAfter` for the pattern.
 *
 * This function is for internal use of the library.
 * Please do not use it as it may change in the future.
 */
export declare function $removeFromParent(node: LexicalNode): void;
/** @deprecated renamed to {@link $removeFromParent} by @lexical/eslint-plugin rules-of-lexical */
export declare const removeFromParent: typeof $removeFromParent;
export declare function internalMarkNodeAsDirty(node: LexicalNode): void;
export declare function internalMarkSiblingsAsDirty(node: LexicalNode): void;
export declare function $setCompositionKey(compositionKey: null | NodeKey): void;
export declare function $getCompositionKey(): null | NodeKey;
/**
 * Returns the node with the given key from the active EditorState
 * (or the given EditorState), or null if it does not exist.
 */
export declare function $getNodeByKey(key: NodeKey, _editorState?: EditorState): LexicalNode | null;
/**
 * @deprecated The type parameter is an unchecked and unsafe cast,
 * equivalent to `$getNodeByKey(key) as T | null`, and will be removed
 * in a future release. Call this function without a type argument and
 * narrow the result with a type guard instead.
 */
export declare function $getNodeByKey<T extends LexicalNode>(key: NodeKey, _editorState?: EditorState): T | null;
export declare function $getNodeFromDOMNode(dom: Node, editorState?: EditorState): LexicalNode | null;
export declare function setNodeKeyOnDOMNode(dom: Node, editor: LexicalEditor, key: NodeKey): void;
export declare function clearNodeKeyOnDOMNode(dom: Node, editor: LexicalEditor): void;
export declare function getNodeKeyFromDOMNode(dom: Node, editor: LexicalEditor): NodeKey | undefined;
export declare function $getNearestNodeFromDOMNode(startingDOM: Node, editorState?: EditorState): LexicalNode | null;
export declare function cloneDecorators(editor: LexicalEditor): Record<NodeKey, unknown>;
export declare function getEditorStateTextContent(editorState: EditorState): string;
export declare function markNodesWithTypesAsDirty(editor: LexicalEditor, types: string[]): void;
export declare function $getRoot(): RootNode;
export declare function internalGetRoot(editorState: EditorState): RootNode;
export declare function $setSelection(selection: null | BaseSelection): void;
export declare function $flushMutations(): void;
export declare function $getNodeFromDOM(dom: Node): null | LexicalNode;
/**
 * Return true if `str` contains any valid surrogate pair.
 *
 * See also $updateCaretSelectionForUnicodeCharacter for
 * a discussion on when and why this is useful.
 */
export declare function doesContainSurrogatePair(str: string): boolean;
export declare function getEditorsToPropagate(editor: LexicalEditor): LexicalEditor[];
export declare function createUID(): string;
export declare function getAnchorTextFromDOM(anchorNode: Node): null | string;
export declare function $updateSelectedTextFromDOM(isCompositionEnd: boolean, editor: LexicalEditor, data?: string): void;
export declare function $updateTextNodeFromDOMContent(textNode: TextNode, textContent: string, anchorOffset: null | number, focusOffset: null | number, compositionEnd: boolean): void;
export declare function $shouldInsertTextAfterOrBeforeTextNode(selection: RangeSelection, node: TextNode): boolean;
/**
 * A KeyboardEvent or structurally similar object with a string `key` as well
 * as `altKey`, `ctrlKey`, `metaKey`, and `shiftKey` boolean properties.
 */
export type KeyboardEventModifiers = Pick<KeyboardEvent, 'key' | 'code' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>;
/**
 * A record of keyboard modifiers that must be enabled.
 * If the value is `'any'` then the modifier key's state is ignored.
 * If the value is `true` then the modifier key must be pressed.
 * If the value is `false` or the property is omitted then the modifier key must
 * not be pressed.
 */
export type KeyboardEventModifierMask = {
    [K in Exclude<keyof KeyboardEventModifiers, 'key'>]?: boolean | undefined | 'any';
};
/**
 * Match a KeyboardEvent with its expected modifier state
 *
 * @param event A KeyboardEvent, or structurally similar object
 * @param mask An object specifying the expected state of the modifiers
 * @returns true if the event matches
 */
export declare function isModifierMatch(event: KeyboardEventModifiers, mask: KeyboardEventModifierMask): boolean;
/**
 * Match a KeyboardEvent with its expected state
 *
 * @param event A KeyboardEvent, or structurally similar object
 * @param expectedKey The string to compare with event.key (case insensitive)
 * @param mask An object specifying the expected state of the modifiers
 * @returns true if the event matches
 */
export declare function isExactShortcutMatch(event: KeyboardEventModifiers, expectedKey: string, mask: KeyboardEventModifierMask): boolean;
export declare function isTab(event: KeyboardEventModifiers): boolean;
export declare function isBold(event: KeyboardEventModifiers): boolean;
export declare function isItalic(event: KeyboardEventModifiers): boolean;
export declare function isUnderline(event: KeyboardEventModifiers): boolean;
export declare function isParagraph(event: KeyboardEventModifiers): boolean;
export declare function isLineBreak(event: KeyboardEventModifiers): boolean;
export declare function isOpenLineBreak(event: KeyboardEventModifiers): boolean;
export declare function isDeleteWordBackward(event: KeyboardEventModifiers): boolean;
export declare function isDeleteWordForward(event: KeyboardEventModifiers): boolean;
export declare function isDeleteLineBackward(event: KeyboardEventModifiers): boolean;
export declare function isDeleteLineForward(event: KeyboardEventModifiers): boolean;
export declare function isDeleteBackward(event: KeyboardEventModifiers): boolean;
export declare function isDeleteForward(event: KeyboardEventModifiers): boolean;
export declare function isUndo(event: KeyboardEventModifiers): boolean;
export declare function isRedo(event: KeyboardEventModifiers): boolean;
export declare function isCopy(event: KeyboardEventModifiers): boolean;
export declare function isCut(event: KeyboardEventModifiers): boolean;
export declare function isMoveBackward(event: KeyboardEventModifiers): boolean;
export declare function isMoveToStart(event: KeyboardEventModifiers): boolean;
export declare function isMoveForward(event: KeyboardEventModifiers): boolean;
export declare function isMoveToEnd(event: KeyboardEventModifiers): boolean;
export declare function isMoveUp(event: KeyboardEventModifiers): boolean;
export declare function isMoveDown(event: KeyboardEventModifiers): boolean;
export declare function isModifier(event: KeyboardEventModifiers): boolean;
export declare function isSpace(event: KeyboardEventModifiers): boolean;
export declare function controlOrMeta(metaKey: boolean, ctrlKey: boolean): boolean;
export declare function isBackspace(event: KeyboardEventModifiers): boolean;
export declare function isEscape(event: KeyboardEventModifiers): boolean;
export declare function isDelete(event: KeyboardEventModifiers): boolean;
export declare function isSelectAll(event: KeyboardEventModifiers): boolean;
export declare function $selectAll(selection?: RangeSelection | null): RangeSelection;
export declare function getCachedClassNameArray(classNamesTheme: EditorThemeClasses, classNameThemeType: string): string[];
export declare function setMutatedNode(mutatedNodes: MutatedNodes, registeredNodes: RegisteredNodes, mutationListeners: MutationListeners, node: LexicalNode, mutation: NodeMutation): void;
/**
 * Returns all nodes of the given type in the active editor state.
 *
 * Consider {@link LexicalEditor.registerMutationListener} with
 * `skipInitialization: false` instead if you need to track these nodes over
 * time rather than read them once.
 */
export declare function $nodesOfType<T extends LexicalNode>(klass: Klass<T>): T[];
export declare function $getAdjacentNode(focus: PointType, isBackward: boolean): null | LexicalNode;
export declare function isFirefoxClipboardEvents(editor: LexicalEditor): boolean;
export declare function dispatchCommand<TCommand extends AnyLexicalCommand>(editor: LexicalEditor, command: TCommand, ...args: CommandPayloadArgs<CommandPayloadType<TCommand>>): boolean;
export declare function getElementByKeyOrThrow(editor: LexicalEditor, key: NodeKey): HTMLElement;
export declare function getParentElement(node: Node): HTMLElement | null;
export declare function getDOMOwnerDocument(target: EventTarget | null): Document | null;
export declare function scrollIntoViewIfNeeded(editor: LexicalEditor, selectionRect: DOMRect, rootElement: HTMLElement): void;
export declare function $hasUpdateTag(tag: UpdateTag): boolean;
export declare function $addUpdateTag(tag: UpdateTag): void;
/**
 * Add a function to run after the current update. This will run after any
 * `onUpdate` function already supplied to `editor.update()`, as well as any
 * functions added with previous calls to `$onUpdate`.
 *
 * @param updateFn The function to run after the current update.
 */
export declare function $onUpdate(updateFn: () => void): void;
export declare function $maybeMoveChildrenSelectionToParent(parentNode: LexicalNode): BaseSelection | null;
export declare function $hasAncestor(child: LexicalNode, targetNode: LexicalNode): boolean;
export declare function getDefaultView(domElem: EventTarget | null): Window | null;
export declare function getWindow(editor: LexicalEditor): Window;
declare const InlineNodeBrand: unique symbol;
export declare function $isInlineElementOrDecoratorNode<T>(node: LexicalNode): node is (ElementNode | DecoratorNode<T>) & {
    isInline(): true;
    [InlineNodeBrand]: never;
};
export declare function $getNearestRootOrShadowRoot(node: LexicalNode): RootNode | ElementNode;
declare const ShadowRootNodeBrand: unique symbol;
export interface ShadowRootNode extends ElementNode {
    [ShadowRootNodeBrand]: never;
    isShadowRoot(): true;
}
export declare function $isShadowRootNode(node: null | LexicalNode): node is ShadowRootNode;
export declare function $isRootOrShadowRoot(node: null | LexicalNode): node is RootNode | ShadowRootNode;
/**
 * Returns a shallow clone of node with a new key. All properties of the node
 * will be copied to the new node (by `clone` and then `afterCloneFrom`),
 * except those related to parent/sibling/child
 * relationships in the `EditorState`. This means that the copy must be
 * separately added to the document, and it will not have any children.
 *
 * @param node - The node to be copied.
 * @param skipReset - If true (default false) skip the call to resetOnCopyNodeFrom
 * @returns The copy of the node.
 */
export declare function $copyNode<T extends LexicalNode>(node: T, skipReset?: boolean): T;
export declare function $applyNodeReplacement<N extends LexicalNode>(node: N): N;
export declare function errorOnInsertTextNodeOnRoot(node: LexicalNode, insertNode: LexicalNode): void;
/**
 * Returns the node with the given key from the active EditorState,
 * or throws if it does not exist.
 */
export declare function $getNodeByKeyOrThrow(key: NodeKey): LexicalNode;
/**
 * @deprecated The type parameter is an unchecked and unsafe cast,
 * equivalent to `$getNodeByKeyOrThrow(key) as N`, and will be removed
 * in a future release. Call this function without a type argument and
 * narrow the result with a type guard instead.
 */
export declare function $getNodeByKeyOrThrow<N extends LexicalNode>(key: NodeKey): N;
/**
 * Returns true if the given node needs a block cursor given an adjacent selection,
 * the node must be non-inline and one of:
 * - DecoratorNode
 * - ShadowRootNode with a parent that is not also a ShadowRootNode
 * - An ElementNode that can't be empty
 */
export declare function $needsBlockCursorBeside(node: null | LexicalNode): boolean;
export declare function removeDOMBlockCursorElement(blockCursorElement: HTMLElement, editor: LexicalEditor, rootElement: HTMLElement): void;
export declare function $updateDOMBlockCursorElement(editor: LexicalEditor, rootElement: HTMLElement, nextSelection: null | BaseSelection): void;
/**
 * Returns the selection for the given window, or the global window if null.
 * Will return null if {@link CAN_USE_DOM} is false.
 *
 * @param targetWindow The window to get the selection from
 * @returns a Selection or null
 */
export declare function getDOMSelection(targetWindow: null | Window): null | Selection;
/**
 * Returns the selection for the defaultView of the ownerDocument of given EventTarget.
 *
 * @param eventTarget The node to get the selection from
 * @returns a Selection or null
 */
export declare function getDOMSelectionFromTarget(eventTarget: null | EventTarget): null | Selection;
/**
 * @param node A value that may be a DOM ShadowRoot.
 * @returns True if node is a DOM ShadowRoot (an open or closed shadow tree
 *   root), false otherwise. A ShadowRoot is a DocumentFragment with a host.
 *
 * @experimental Shape may change as shadow DOM support stabilizes.
 */
export declare function isDOMShadowRoot(node: unknown): node is ShadowRoot;
export declare function getDOMShadowRoots(node: Node): ShadowRoot[];
/**
 * Walks `root` and every open shadow root nested inside it, yielding each
 * element that matches `selector`. `querySelectorAll` does not pierce
 * shadow boundaries on its own; this descent does.
 *
 * @internal
 */
export declare function findAllLexicalElementsDeep(initialRoot: Document | ShadowRoot): Generator<Element>;
/**
 * Resolves the document that hosts an editor's root element, falling
 * back to the global `document` when the editor isn't mounted. Use this
 * over `editor.getRootElement()?.ownerDocument ?? document` so iframe /
 * shadow-mounted editors land in the right realm.
 *
 * @internal
 */
export declare function getRootOwnerDocument(rootElement: HTMLElement | null): Document;
/**
 * Returns the {@link Document} that owns the active editor's root element.
 * Falls back to `globalThis.document` when there is no active editor (e.g.
 * a node method such as `createDOM` / `exportDOM` is invoked headlessly,
 * outside of `editor.update()` / `editor.read()`), or when the active
 * editor has no root element (e.g. headless mode with
 * {@link @lexical/headless!withDOM | withDOM}).
 *
 * Use this inside `createDOM`, `updateDOM`, and `exportDOM` instead of the
 * bare `document` global so the node works correctly when the editor lives
 * inside a Shadow DOM or a cross-origin `<iframe>`.
 *
 * Unlike most `$`-prefixed helpers, this does NOT require an ambient active
 * editor: it must remain callable from `createDOM` / `exportDOM`, which are
 * public methods that consumers may legitimately call while serializing
 * nodes headlessly. Throwing here would silently break every node whose DOM
 * methods were migrated off the bare `document` global.
 */
export declare function $getDocument(): Document;
/**
 * A subset of `Selection` covering the four boundary-point fields Lexical
 * reads plus `direction`. Designed so a `Selection` instance can be returned
 * where a `DOMSelectionBoundaryPoints` is expected (see {@link getDOMSelectionPoints}).
 *
 * `direction` is the standard
 * {@link https://developer.mozilla.org/docs/Web/API/Selection/direction | Selection.direction}
 * pass-through: `'forward'` / `'backward'` / `'none'` when the engine
 * implements it, or `undefined` when a future engine ships
 * `getComposedRanges` without `direction` (no current shipping
 * configuration matches — every engine that ships the former also ships
 * the latter). In the undefined case anchor/focus default to the composed
 * StaticRange's tree order; callers needing strict backward fidelity
 * inside a shadow root should check `direction !== undefined`.
 *
 * @experimental Shape may change as shadow DOM support stabilizes.
 */
export interface DOMSelectionBoundaryPoints {
    anchorNode: Node | null;
    anchorOffset: number;
    direction?: undefined | 'forward' | 'backward' | 'none';
    focusNode: Node | null;
    focusOffset: number;
}
/**
 * Resolves a DOM Selection's range through any DOM ShadowRoots enclosing
 * `rootElement`, using the standard
 * {@link https://developer.mozilla.org/docs/Web/API/Selection/getComposedRanges | Selection.getComposedRanges}
 * platform API.
 *
 * When a selection is inside a shadow tree the browser retargets
 * `Selection.getRangeAt`/`anchorNode`/`focusNode` to the shadow host, which
 * hides the real nodes Lexical needs to resolve. Passing the enclosing shadow
 * roots to `getComposedRanges` returns the un-retargeted boundary points as a
 * {@link https://developer.mozilla.org/docs/Web/API/StaticRange | StaticRange}
 * (in tree order, i.e. start before end).
 *
 * @returns The composed StaticRange, or `null` when `rootElement` is in the
 *   light DOM, the platform does not implement `getComposedRanges`, or there
 *   is no selection.
 *
 * @experimental Shape may change as shadow DOM support stabilizes.
 */
export declare function getComposedStaticRange(domSelection: Selection, rootElement: HTMLElement | null): StaticRange | null;
/**
 * Returns a live DOM Range for the Selection, resolved through any DOM
 * ShadowRoots enclosing `rootElement`. Inside a shadow tree
 * `Selection.getRangeAt(0)` is retargeted to the shadow host, so this builds a
 * Range from the composed boundary points instead (see
 * {@link getComposedStaticRange}); in the light DOM it returns
 * `getRangeAt(0)` unchanged. Use this instead of `getRangeAt(0)` when the
 * Range is needed for layout (e.g. `getBoundingClientRect`), which a
 * StaticRange cannot provide.
 *
 * @returns A live Range, or null when the selection has no ranges.
 *
 * @experimental Shape may change as shadow DOM support stabilizes.
 */
export declare function getDOMSelectionRange(domSelection: Selection, rootElement: HTMLElement | null): Range | null;
/**
 * Resolves a DOM Selection's anchor/focus boundary points through any DOM
 * ShadowRoots enclosing `rootElement`. Inside a shadow tree the boundary
 * points come from {@link getComposedStaticRange} mapped back onto
 * anchor/focus with the standard
 * {@link https://developer.mozilla.org/docs/Web/API/Selection/direction | Selection.direction};
 * in the light DOM (or when `getComposedRanges` is unavailable) the Selection's
 * own anchorNode/focusNode are already correct, so the Selection is returned
 * as-is (it satisfies {@link DOMSelectionBoundaryPoints}).
 *
 * Use this instead of reading `Selection.anchorNode`/`focusNode` directly,
 * which are retargeted to the shadow host inside a shadow tree.
 *
 * @remarks
 * The two return paths have different read semantics:
 * - light DOM: the return aliases `domSelection`, so subsequent reads
 *   reflect any post-call selection changes. The aliasing is intentional;
 *   each `Selection` property read forces a synchronous style/layout
 *   recalculation, so `$updateDOMSelection` defers these reads until they
 *   are actually needed.
 * - shadow DOM: the return is a snapshot taken at call time, including
 *   `direction`. If a future engine ships `getComposedRanges` without
 *   `Selection.direction` (no current shipping configuration matches),
 *   the snapshot's `direction` is `undefined` and anchor/focus default
 *   to the StaticRange's tree order — a backward selection will appear
 *   forward.
 *
 * Read the four points immediately after the call, or compare identity
 * via `points === domSelection` to detect when the return aliases
 * `domSelection`, rather than caching the returned reference across
 * selection mutations.
 *
 * @experimental Shape may change as shadow DOM support stabilizes.
 */
export declare function getDOMSelectionPoints(domSelection: Selection, rootElement: HTMLElement | null): DOMSelectionBoundaryPoints;
/**
 * Resolves the live DOM Range (for layout reads like `getBoundingClientRect`)
 * and the anchor/focus boundary points in one pass, sharing a single
 * {@link getComposedStaticRange} read rather than computing it twice as a
 * call to {@link getDOMSelectionRange} followed by {@link getDOMSelectionPoints}
 * would. Use this at sites that need both shapes from the same selection.
 *
 * @returns The composed Range plus the boundary points; the Range is null
 *   when the selection has no ranges.
 *
 * @experimental Shape may change as shadow DOM support stabilizes.
 */
export declare function getDOMSelectionRangeAndPoints(domSelection: Selection, rootElement: HTMLElement | null): {
    points: DOMSelectionBoundaryPoints;
    range: Range | null;
};
/**
 * Returns the focused element within the same Document or ShadowRoot as
 * `node`, using the standard `DocumentOrShadowRoot.activeElement`.
 *
 * Unlike `document.activeElement` — which is retargeted to the outermost
 * shadow host when focus is inside a shadow tree — this returns the focused
 * element within `node`'s own tree (e.g. the editor's contentEditable when it
 * lives inside a shadow root).
 *
 * @param node A node whose tree's active element is wanted.
 * @returns The active element, or null.
 *
 * @experimental Shape may change as shadow DOM support stabilizes.
 */
export declare function getActiveElement(node: Node): Element | null;
/**
 * Descends from `root.activeElement` through nested open ShadowRoots to the
 * deepest focused element. `document.activeElement` only reports the outermost
 * shadow host; this walks into the shadow trees via `ShadowRoot.activeElement`
 * to find the element that actually has focus.
 *
 * @param root The Document or ShadowRoot to start from.
 * @returns The deepest active element, or null.
 *
 * @experimental Shape may change as shadow DOM support stabilizes.
 */
export declare function getActiveElementDeep(root: Document | ShadowRoot): Element | null;
/**
 * Returns the un-retargeted event target — the real element the user
 * interacted with — for events observed by a listener above an enclosing
 * DOM shadow root. `Event.target` is retargeted to the outermost shadow
 * host in that case, hiding the actual element; `composedPath()[0]`
 * returns the original target for `composed: true` events (most
 * user-agent UI events: click, mousedown, pointerdown, focusin, etc.).
 * Falls back to `event.target` when `composedPath` is unavailable or
 * returns an empty array (e.g. the event has already finished
 * dispatching).
 *
 * Pairs with the shadow-aware helpers above
 * ({@link getDOMSelectionPoints}, {@link getActiveElement}) for the
 * event side of the shadow boundary — useful when an
 * `Element.contains(target)` check needs to test against an editor root
 * inside a shadow tree.
 *
 * @param event The dispatched event.
 * @returns The un-retargeted target, or null when the event has none.
 *
 * @experimental Shape may change as shadow DOM support stabilizes.
 */
export declare function getComposedEventTarget(event: Event): EventTarget | null;
export declare function $splitNode(node: ElementNode, offset: number): [ElementNode | null, ElementNode];
/**
 * @param x - The element being tested
 * @returns Returns true if x is an HTML anchor tag, false otherwise
 */
export declare function isHTMLAnchorElement(x: unknown): x is HTMLAnchorElement;
/**
 * @param x - The element being tested
 * @returns Returns true if x is an HTML `<tr>` element, false otherwise
 */
export declare function isHTMLTableRowElement(x: unknown): x is HTMLTableRowElement;
/**
 * @param x - The element being tested
 * @returns Returns true if x is an HTML `<td>` or `<th>` element, false
 *   otherwise
 */
export declare function isHTMLTableCellElement(x: unknown): x is HTMLTableCellElement;
/**
 * @param x - The element being tested
 * @returns Returns true if x is an HTML element, false otherwise.
 */
export declare function isHTMLElement(x: unknown): x is HTMLElement;
/**
 * @param x - The element being tested
 * @returns Returns true if x is a DOM Node, false otherwise.
 */
export declare function isDOMNode(x: unknown): x is Node;
/**
 * @param x - The element being testing
 * @returns Returns true if x is a document fragment, false otherwise.
 */
export declare function isDocumentFragment(x: unknown): x is DocumentFragment;
/**
 *
 * @param node - the Dom Node to check
 * @returns if the Dom Node is an inline node
 */
export declare function isInlineDomNode(node: Node): node is (HTMLElement | Text) & {
    [InlineDOMBrand]: never;
};
declare const BlockDOMBrand: unique symbol;
declare const InlineDOMBrand: unique symbol;
/**
 *
 * @param node - the Dom Node to check
 * @returns if the Dom Node is a block node
 */
export declare function isBlockDomNode(node: Node): node is HTMLElement & {
    [BlockDOMBrand]: never;
};
declare const BlockNodeBrand: unique symbol;
/**
 * @internal
 *
 * This function is for internal use of the library.
 * Please do not use it as it may change in the future.
 *
 * This function returns true for a DecoratorNode that is not inline OR
 * an ElementNode that is:
 * - not a root or shadow root
 * - not inline
 * - can't be empty
 * - has no children or an inline first child
 */
export declare function INTERNAL_$isBlock(node: LexicalNode): node is (ElementNode | DecoratorNode<unknown>) & {
    [BlockNodeBrand]: never;
};
/**
 * Utility function for accessing current active editor instance.
 * @returns Current active editor
 */
export declare function $getEditor(): LexicalEditor;
/**
 * @experimental
 *
 * Read the editor's `$getDOMSlot` configuration (defaulting to the base
 * implementation when no override is registered via {@link DOMRenderExtension}).
 * Cross-package consumers (`@lexical/utils`, `@lexical/react`) use this to
 * route selection / DOM lookups through extension-configured slots.
 */
export declare function $getEditorDOMRenderConfig(editor?: LexicalEditor): EditorDOMRenderConfig;
/**
 * @experimental
 *
 * Resolve the DOM slot for a node through the configured `$getDOMSlot` hook,
 * narrowing the return type via {@link DOMSlotForNode}: for an `ElementNode`
 * the result is an {@link ElementDOMSlot} (with children-management methods),
 * for non-Element nodes the base {@link DOMSlot} pointing at the keyed DOM.
 *
 * Invariants if an extension override returns a slot that doesn't match the
 * expected narrow type for the node (extension contract violation).
 */
export declare function $getDOMSlot<N extends LexicalNode>(node: N, dom: HTMLElement, editor?: LexicalEditor): DOMSlotForNode<N>;
/**
 * @internal
 *
 * Returns the scaffolding container element that `host`'s named slot renders
 * into, or null if the slot is empty or not yet rendered. The container is the
 * parent of the slotted node's DOM, resolved by key so it is found wherever it
 * sits — the reconciler parks it as a hidden placeholder in the host DOM, and
 * an explicit mount ({@link mountSlotContainer}) may relocate it; this lookup
 * still resolves it after that relocation. Editor-time analog of the
 * reconciler's internal `$slotContainerForKey`, which resolves the same
 * container from the reconcile-time DOM map instead of
 * `editor.getElementByKey`.
 */
export declare function $getSlotContainer(host: LexicalNode, name: string, editor?: LexicalEditor): HTMLElement | null;
/**
 * @experimental
 *
 * Attach a host's named-slot container to `target` and make it visible.
 * The reconciler renders every slot subtree synchronously into a hidden
 * (`display: 'none'`) placeholder container parked slots-first in the host
 * DOM; nothing is visible until the host explicitly attaches the container
 * somewhere — mirroring how `getDOMSlot` gives an element control over where
 * its linked-list children render. This helper moves the container into
 * `target` (a no-op when it is already there, so mounting in place just
 * reveals it) and clears the inline `display` so the container renders as a
 * normal block that stylesheets may restyle. It deliberately does NOT use
 * `display: 'contents'`: Chromium cannot reliably edit inside a boxless
 * contenteditable subtree (caret hit-testing resolves clicks to a
 * neighboring box and native text insertion is dropped).
 *
 * Idempotent and framework-independent: lexical-react's `useLexicalSlotRef`
 * wraps it, and a node class or extension can call it directly (e.g. from a
 * mutation listener) to control slot placement without React.
 *
 * @returns the container, or null when the slot (or its DOM) does not exist
 * yet — e.g. before the host's first reconciliation.
 */
export declare function mountSlotContainer(editor: LexicalEditor, nodeKey: NodeKey, slotName: string, target: HTMLElement): HTMLElement | null;
/**
 * @experimental
 *
 * Reverse of {@link mountSlotContainer}: hide `container` again and park it
 * back in the host's DOM as the leading hidden placeholder, where the
 * reconciler manages it. Call when the mount target goes away while the host
 * remains (e.g. chrome unmount) so the slot subtree stays in the document
 * instead of leaving with the detached target.
 */
export declare function unmountSlotContainer(editor: LexicalEditor, nodeKey: NodeKey, container: HTMLElement): void;
/**
 * @experimental
 *
 * Type guard narrowing a {@link DOMSlot} to an {@link ElementDOMSlot}, which
 * exposes children-management methods like `insertChild` and the managed
 * line-break helpers.
 */
export declare function $isElementDOMSlot(slot: DOMSlot<HTMLElement>): slot is ElementDOMSlot<HTMLElement>;
/**
 * @experimental
 *
 * Resolve the actual text DOM (`Text`) for a `TextNode` through the
 * configured `$getDOMSlot` hook. Unlike the plain {@link getDOMTextNode}
 * which descends the first child chain from a raw element, this routes
 * through the slot so an extension wrapping the text node's keyed DOM
 * (e.g. one that injects a `contentEditable=false` sibling before the
 * text) still points at the correct content element.
 */
export declare function $getDOMTextNode(node: TextNode, dom: HTMLElement, editor?: LexicalEditor): Text | null;
/** @internal */
export type TypeToNodeMap = Map<string, NodeMap>;
export declare function getCachedTypeToNodeMap(editorState: EditorState): TypeToNodeMap;
/**
 * Returns a clone of a node using `node.constructor.clone()` followed by
 * `clone.afterCloneFrom(node)`. The resulting clone must have the same key,
 * parent/next/prev pointers, and other properties that are not set by
 * `node.constructor.clone` (format, style, etc.). This is primarily used by
 * {@link LexicalNode.getWritable} to create a writable version of an
 * existing node. The clone is the same logical node as the original node,
 * do not try and use this function to duplicate or copy an existing node.
 *
 * Does not mutate the EditorState.
 * @param latestNode - The node to be cloned.
 * @returns The clone of the node.
 */
export declare function $cloneWithProperties<T extends LexicalNode>(latestNode: T): T;
/**
 * Returns a clone with {@link $cloneWithProperties} and then "detaches"
 * it from the state by overriding its getLatest and getWritable to always
 * return this. This node can not be added to an EditorState or become the
 * parent, child, or sibling of another node. It is primarily only useful
 * for making in-place temporary modifications to a TextNode when
 * serializing a partial slice.
 *
 * Does not mutate the EditorState.
 * @param latestNode - The node to be cloned.
 * @returns The clone of the node.
 */
export declare function $cloneWithPropertiesEphemeral<T extends LexicalNode>(latestNode: T): T;
export declare function setNodeIndentFromDOM(elementDom: HTMLElement, elementNode: ElementNode): void;
/**
 * Reads the `dir` attribute from a DOM element and applies it to the given
 * ElementNode via {@link ElementNode.setDirection} when it is a valid direction
 * value (`'ltr'` or `'rtl'`). Other values, including missing or empty `dir`,
 * leave the node unchanged. Useful inside `importDOM` converters to preserve
 * explicit text direction from imported HTML.
 *
 * @param node - The ElementNode to update.
 * @param domNode - The source HTMLElement whose `dir` attribute is read.
 * @returns The node, with its direction set when the source `dir` was valid.
 */
export declare function $setDirectionFromDOM<T extends ElementNode>(node: T, domNode: HTMLElement): T;
/**
 * Reads the `style` and CSS `textAlign` property from a DOM element
 * and set format to the given ElementNode via {@link ElementNode.setFormat}
 * when it is a valid alignment value {@link ElementFormatType}
 * Other values, including missing or empty, leave the node unchanged.
 * Useful inside `importDOM` converters to preserve explicit alignment from imported HTML.
 *
 * @param node - The ElementNode to update.
 * @param domNode - The source HTMLElement whose `style` property is read.
 * @returns The node, with its align format set when the source `style.textAlign` was valid.
 */
export declare function $setFormatFromDOM<T extends ElementNode>(node: T, domNode: HTMLElement): T;
/**
 * Options accepted by {@link setDOMUnmanaged}.
 *
 * @experimental
 */
export interface SetDOMUnmanagedOptions {
    /**
     * When true, the marked subtree owns its own window selection — analogous
     * to a DecoratorNode subtree. Selection resolution that would otherwise
     * mark the selection dirty for a caret position inside unmanaged DOM
     * leaves it alone, so the embedded interaction (custom input, focusable
     * widget, etc.) can keep its native caret.
     *
     * Pass `false` to clear a previously-set marker; omit the field to leave
     * `__lexicalCapturedSelection` untouched.
     */
    captureSelection?: boolean;
}
/**
 * Mark this DOM element as unmanaged by lexical's mutation observer (like
 * decorator nodes are). Extensions that inject non-lexical decoration
 * elements into a node's DOM should mark them so the mutation observer
 * doesn't evict them as "unknown DOM children" during cleanup.
 *
 * Pass `{captureSelection: true}` to additionally treat the subtree's
 * window selection as decorator-like, so resolution does not force-sync
 * the caret out of unmanaged DOM (see {@link isDOMCapturingSelection}).
 *
 * @experimental
 */
export declare function setDOMUnmanaged(elementDom: HTMLElement & LexicalPrivateDOM, options?: SetDOMUnmanagedOptions): void;
/**
 * True if this DOM node was marked with {@link setDOMUnmanaged}.
 *
 * @experimental
 */
export declare function isDOMUnmanaged(elementDom: Node & LexicalPrivateDOM): boolean;
/**
 * Mark a DOM element as a named-slot editable island: set its `contentEditable`
 * to follow the editor's editable state. A slot rendered inside a non-editable
 * host (a decorator, or a `contentEditable=false` element shell) does not track
 * the editor on its own, so its container carries an explicit `contentEditable`;
 * {@link $fullReconcile} re-applies this when {@link LexicalEditor.setEditable}
 * toggles. Call it for any other editable island an app attaches itself (e.g. a
 * `getDOMSlot` children element rendered inside a `contentEditable=false` shell).
 *
 * @experimental
 */
export declare function $markSlotEditable(element: HTMLElement & {
    __lexicalEditor?: undefined | LexicalEditor;
}, editor?: LexicalEditor): void;
/**
 * True if the DOM node sits inside a subtree marked with
 * `{captureSelection: true}` via {@link setDOMUnmanaged}. Walks ancestors
 * so any descendant of a marked subtree (e.g. an `<input>` inside a marked
 * `<div>`) reports as captured too.
 *
 * The walk aborts at the first DOM node that corresponds to a Lexical
 * node in `editor` — that boundary is the implicit owner of the subtree's
 * selection, so a captureSelection marker above it (in non-Lexical
 * scaffolding around the editor) does not leak in.
 *
 * DecoratorNode DOM is marked with `setDOMUnmanaged({captureSelection:
 * true})` by the reconciler, so decorator subtrees also report as
 * captured here.
 *
 * @experimental
 */
export declare function isDOMCapturingSelection(elementDom: Node & LexicalPrivateDOM, editor: LexicalEditor): boolean;
/**
 * @internal
 */
export declare function hasOwnStaticMethod(klass: Klass<LexicalNode>, k: keyof Klass<LexicalNode>): boolean;
export interface OwnStaticNodeConfig {
    klass: Klass<LexicalNode>;
    ownNodeType: undefined | string;
    ownNodeConfig: undefined | StaticNodeConfigValue<LexicalNode, string | symbol>;
}
/** @internal */
export declare function getStaticNodeConfig(klass: Klass<LexicalNode>): OwnStaticNodeConfig;
/**
 * Collect all configuration for this class and its superclasses
 *
 * @internal
 */
export declare function iterStaticNodeConfigChain(klass: Klass<LexicalNode>): Iterable<OwnStaticNodeConfig>;
/**
 * Build a map from each registered node type to the set of registered node
 * types that are it or extend it (including the type itself). For every node
 * class in `nodes`, its prototype chain is walked and the class's own type is
 * added to the bucket of each registered ancestor type it inherits from.
 *
 * The result lets callers expand a base node type to all of its registered
 * subclass types up front, so a subclass instance can be matched by type
 * without a runtime `instanceof`.
 *
 * @experimental
 */
export declare function getRegisteredSubtypeMap(nodes: Iterable<Klass<LexicalNode>>): Map<string, Set<string>>;
/**
 * Create an node from its class.
 *
 * Note that this will directly construct the final `withKlass` node type,
 * and will ignore the deprecated `with` functions. This allows `$create` to
 * skip any intermediate steps where the replaced node would be created and
 * then immediately discarded (once per configured replacement of that node).
 *
 * This does not support any arguments to the constructor.
 * Setters can be used to initialize your node, and they can
 * be chained. You can of course write your own mutliple-argument functions
 * to wrap that.
 *
 * @example
 * ```ts
 * function $createTokenText(text: string): TextNode {
 *   return $create(TextNode).setTextContent(text).setMode('token');
 * }
 * ```
 */
export declare function $create<T extends LexicalNode>(klass: Klass<T>): T;
/**
 * Starts with a node and moves up the tree (toward the root node) to find a matching node based on
 * the search parameters of the findFn. (Consider JavaScripts' .find() function where a testing function must be
 * passed as an argument. eg. if( (node) => node.__type === 'div') ) return true; otherwise return false
 * @param startingNode - The node where the search starts.
 * @param findFn - A testing function that returns true if the current node satisfies the testing parameters.
 * @returns `startingNode` or one of its ancestors that matches the `findFn` predicate and is not the `RootNode`, or `null` if no match was found.
 */
export declare const $findMatchingParent: {
    <T extends LexicalNode>(startingNode: LexicalNode, findFn: (node: LexicalNode) => node is T): T | null;
    (startingNode: LexicalNode, findFn: (node: LexicalNode) => boolean): LexicalNode | null;
};
export declare function $createChildrenArray(element: ElementNode, nodeMap: null | NodeMap): NodeKey[];
/**
 * Look up the superclass of this class, prefer
 * {@link iterStaticNodeConfigChain} when implementing loops.
 *
 * @internal
 */
export declare function getSuperclassOf(klass: Klass<LexicalNode>): null | Klass<LexicalNode>;
export {};
