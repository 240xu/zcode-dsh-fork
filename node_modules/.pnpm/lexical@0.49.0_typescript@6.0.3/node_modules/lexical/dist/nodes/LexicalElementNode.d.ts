/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { BaseStaticNodeConfig, KlassConstructor, LexicalEditor, LexicalUpdateJSON, Spread, TextFormatType } from 'lexical';
import { type TextNode } from '../index';
import { ElementDOMSlot } from '../LexicalDOMSlot';
import { type DOMExportOutput, LexicalNode, type NodeKey, type SerializedLexicalNode, type SlotChildNode, type SlotHostNode } from '../LexicalNode';
import { type BaseSelection, type RangeSelection } from '../LexicalSelection';
export type SerializedElementNode<T extends SerializedLexicalNode = SerializedLexicalNode> = Spread<{
    children: T[];
    direction: 'ltr' | 'rtl' | null;
    format: ElementFormatType;
    indent: number;
    textFormat?: number;
    textStyle?: string;
}, SerializedLexicalNode>;
export type ElementFormatType = 'left' | 'start' | 'center' | 'right' | 'end' | 'justify' | '';
export interface ElementNode {
    getTopLevelElement(): ElementNode | null;
    getTopLevelElementOrThrow(): ElementNode;
}
/** @noInheritDoc */
export declare class ElementNode extends LexicalNode implements SlotHostNode, SlotChildNode {
    /** @internal */
    ['constructor']: KlassConstructor<typeof ElementNode>;
    /** @internal */
    __first: null | NodeKey;
    /** @internal */
    __last: null | NodeKey;
    /** @internal */
    __size: number;
    /** @internal */
    __format: number;
    /** @internal */
    __style: string;
    /** @internal */
    __indent: number;
    /** @internal */
    __dir: 'ltr' | 'rtl' | null;
    /** @internal */
    __textFormat: number;
    /** @internal */
    __textStyle: string;
    /** @internal */
    __slotHost: null | NodeKey;
    /** @internal */
    __slots: null | Map<string, NodeKey>;
    $config(): BaseStaticNodeConfig;
    constructor(key?: NodeKey);
    afterCloneFrom(prevNode: this): void;
    getFormat(): number;
    getFormatType(): ElementFormatType;
    getStyle(): string;
    getIndent(): number;
    /**
     * Returns the children of this node, in document order.
     */
    getChildren(): LexicalNode[];
    /**
     * @deprecated The type parameter is an unchecked and unsafe cast,
     * equivalent to `element.getChildren() as T[]`, and will be
     * removed in a future release. Call this method without a type argument
     * and narrow the results with a type guard instead.
     */
    getChildren<T extends LexicalNode>(): T[];
    getChildrenKeys(): NodeKey[];
    getChildrenSize(): number;
    isEmpty(): boolean;
    isDirty(): boolean;
    isLastChild(): boolean;
    getAllTextNodes(): TextNode[];
    /**
     * Returns the deepest first descendant of this node,
     * or null if it has no children.
     *
     * Descendant navigation is children-only by design: it feeds selectStart /
     * selectEnd and selection, which must not see slots (slots are isolated).
     */
    getFirstDescendant(): null | LexicalNode;
    /**
     * @deprecated The type parameter is an unchecked and unsafe cast,
     * equivalent to `element.getFirstDescendant() as T | null`, and will be
     * removed in a future release. Call this method without a type argument
     * and narrow the result with a type guard instead.
     */
    getFirstDescendant<T extends LexicalNode>(): null | T;
    /**
     * Returns the deepest last descendant of this node,
     * or null if it has no children.
     */
    getLastDescendant(): null | LexicalNode;
    /**
     * @deprecated The type parameter is an unchecked and unsafe cast,
     * equivalent to `element.getLastDescendant() as T | null`, and will be
     * removed in a future release. Call this method without a type argument
     * and narrow the result with a type guard instead.
     */
    getLastDescendant<T extends LexicalNode>(): null | T;
    /**
     * Returns the deepest descendant corresponding to the child at the given
     * index, or null if this node has no children.
     */
    getDescendantByIndex(index: number): null | LexicalNode;
    /**
     * @deprecated The type parameter is an unchecked and unsafe cast,
     * equivalent to `element.getDescendantByIndex(index) as T | null`, and
     * will be removed in a future release. Call this method without a type
     * argument and narrow the result with a type guard instead.
     */
    getDescendantByIndex<T extends LexicalNode>(index: number): null | T;
    /**
     * Returns the first child of this node, or null if it has no children.
     */
    getFirstChild(): null | LexicalNode;
    /**
     * @deprecated The type parameter is an unchecked and unsafe cast,
     * equivalent to `element.getFirstChild() as T | null`, and will be
     * removed in a future release. Call this method without a type argument
     * and narrow the result with a type guard instead.
     */
    getFirstChild<T extends LexicalNode>(): null | T;
    /**
     * Returns the first child of this node, or throws if it has no children.
     */
    getFirstChildOrThrow(): LexicalNode;
    /**
     * @deprecated The type parameter is an unchecked and unsafe cast,
     * equivalent to `element.getFirstChildOrThrow() as T`, and will be
     * removed in a future release. Call this method without a type argument
     * and narrow the result with a type guard instead.
     */
    getFirstChildOrThrow<T extends LexicalNode>(): T;
    /**
     * Returns the last child of this node, or null if it has no children.
     */
    getLastChild(): null | LexicalNode;
    /**
     * @deprecated The type parameter is an unchecked and unsafe cast,
     * equivalent to `element.getLastChild() as T | null`, and will be
     * removed in a future release. Call this method without a type argument
     * and narrow the result with a type guard instead.
     */
    getLastChild<T extends LexicalNode>(): null | T;
    /**
     * Returns the last child of this node, or throws if it has no children.
     */
    getLastChildOrThrow(): LexicalNode;
    /**
     * @deprecated The type parameter is an unchecked and unsafe cast,
     * equivalent to `element.getLastChildOrThrow() as T`, and will be
     * removed in a future release. Call this method without a type argument
     * and narrow the result with a type guard instead.
     */
    getLastChildOrThrow<T extends LexicalNode>(): T;
    /**
     * Returns the child of this node at the given index, or null if
     * the index is out of range.
     */
    getChildAtIndex(index: number): null | LexicalNode;
    /**
     * @deprecated The type parameter is an unchecked and unsafe cast,
     * equivalent to `element.getChildAtIndex(index) as T | null`, and will
     * be removed in a future release. Call this method without a type
     * argument and narrow the result with a type guard instead.
     */
    getChildAtIndex<T extends LexicalNode>(index: number): null | T;
    getTextContent(): string;
    getTextContentSize(): number;
    getDirection(): 'ltr' | 'rtl' | null;
    getTextFormat(): number;
    hasFormat(type: ElementFormatType): boolean;
    hasTextFormat(type: TextFormatType): boolean;
    /**
     * Returns the format flags applied to the node as a 32-bit integer.
     *
     * @returns a number representing the TextFormatTypes applied to the node.
     */
    getFormatFlags(type: TextFormatType, alignWithFormat: null | number): number;
    getTextStyle(): string;
    select(_anchorOffset?: number, _focusOffset?: number): RangeSelection;
    selectStart(): RangeSelection;
    selectEnd(): RangeSelection;
    clear(): this;
    append(...nodesToAppend: LexicalNode[]): this;
    setDirection(direction: 'ltr' | 'rtl' | null): this;
    setFormat(type: ElementFormatType): this;
    setStyle(style: string): this;
    setTextFormat(type: number): this;
    setTextStyle(style: string): this;
    setIndent(indentLevel: number): this;
    splice(start: number, deleteCount: number, nodesToInsert: LexicalNode[]): this;
    /**
     * @experimental
     *
     * An ElementNode subclass can override this to control where its children
     * are inserted into the DOM, e.g. to add a wrapping node or accessory nodes
     * before or after the children. The root of the node returned by createDOM
     * must still be exactly one HTMLElement.
     */
    getDOMSlot(element: HTMLElement): ElementDOMSlot<HTMLElement>;
    exportDOM(editor: LexicalEditor): DOMExportOutput;
    exportJSON(): SerializedElementNode;
    updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedElementNode>): this;
    insertNewAfter(selection: RangeSelection, restoreSelection?: boolean): null | LexicalNode;
    canIndent(): boolean;
    collapseAtStart(selection: RangeSelection): boolean;
    excludeFromCopy(destination?: 'clone' | 'html'): boolean;
    /** @deprecated @internal */
    canReplaceWith(replacement: LexicalNode): boolean;
    /** @deprecated @internal */
    canInsertAfter(node: LexicalNode): boolean;
    canBeEmpty(): boolean;
    canInsertTextBefore(): boolean;
    canInsertTextAfter(): boolean;
    /**
     * If the method is overridden and returns true, ensure that `canBeEmpty()`
     * returns false for the inline node to work correctly
     */
    isInline(): boolean;
    isShadowRoot(): boolean;
    /** @deprecated @internal */
    canMergeWith(node: ElementNode): boolean;
    extractWithChild(child: LexicalNode, selection: BaseSelection | null, destination: 'clone' | 'html'): boolean;
    /**
     * Determines whether this node, when empty, can merge with a first block
     * of nodes being inserted.
     *
     * This method is specifically called in {@link RangeSelection.insertNodes}
     * to determine merging behavior during nodes insertion.
     *
     * @example
     * // In a ListItemNode or QuoteNode implementation:
     * canMergeWhenEmpty(): true {
     *  return true;
     * }
     */
    canMergeWhenEmpty(): boolean;
    /** @internal */
    reconcileObservedMutation(dom: HTMLElement, editor: LexicalEditor): void;
}
export declare function $isElementNode(node: LexicalNode | null | undefined): node is ElementNode;
