/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { LexicalEditor } from './LexicalEditor';
import type { EditorState } from './LexicalEditorState';
import type { ElementNode } from './nodes/LexicalElementNode';
import { type LineBreakNode, type TextNode } from '.';
import { type LexicalNode, type NodeKey } from './LexicalNode';
import { type TextFormatType } from './nodes/LexicalTextNode';
export type TextPointType = {
    _selection: BaseSelection;
    getNode: () => TextNode;
    is: (point: PointType) => boolean;
    isBefore: (point: PointType) => boolean;
    key: NodeKey;
    offset: number;
    set: (key: NodeKey, offset: number, type: 'text' | 'element', onlyIfChanged?: boolean) => void;
    type: 'text';
};
export type ElementPointType = {
    _selection: BaseSelection;
    getNode: () => ElementNode;
    is: (point: PointType) => boolean;
    isBefore: (point: PointType) => boolean;
    key: NodeKey;
    offset: number;
    set: (key: NodeKey, offset: number, type: 'text' | 'element', onlyIfChanged?: boolean) => void;
    type: 'element';
};
export type PointType = TextPointType | ElementPointType;
export declare class Point {
    key: NodeKey;
    offset: number;
    type: 'text' | 'element';
    _selection: BaseSelection | null;
    constructor(key: NodeKey, offset: number, type: 'text' | 'element');
    is(point: PointType): boolean;
    isBefore(b: PointType): boolean;
    getNode(): LexicalNode;
    set(key: NodeKey, offset: number, type: 'text' | 'element', onlyIfChanged?: boolean): void;
}
export declare function $createPoint(key: NodeKey, offset: number, type: 'text' | 'element'): PointType;
export declare function $moveSelectionPointToEnd(point: PointType, node: LexicalNode): void;
export interface BaseSelection {
    _cachedNodes: LexicalNode[] | null;
    dirty: boolean;
    clone(): BaseSelection;
    extract(): LexicalNode[];
    getNodes(): LexicalNode[];
    getTextContent(): string;
    insertText(text: string): void;
    insertRawText(text: string): void;
    is(selection: null | BaseSelection): boolean;
    insertNodes(nodes: LexicalNode[]): void;
    getStartEndPoints(): null | [PointType, PointType];
    isCollapsed(): boolean;
    isBackward(): boolean;
    getCachedNodes(): LexicalNode[] | null;
    setCachedNodes(nodes: LexicalNode[] | null): void;
}
export declare class NodeSelection implements BaseSelection {
    _nodes: Set<NodeKey>;
    _cachedNodes: LexicalNode[] | null;
    dirty: boolean;
    constructor(objects: Set<NodeKey>);
    getCachedNodes(): LexicalNode[] | null;
    setCachedNodes(nodes: LexicalNode[] | null): void;
    is(selection: null | BaseSelection): boolean;
    isCollapsed(): boolean;
    isBackward(): boolean;
    getStartEndPoints(): null;
    add(key: NodeKey): void;
    delete(key: NodeKey): void;
    clear(): void;
    has(key: NodeKey): boolean;
    clone(): NodeSelection;
    extract(): LexicalNode[];
    insertRawText(text: string): void;
    insertText(): void;
    insertNodes(nodes: LexicalNode[]): void;
    getNodes(): LexicalNode[];
    getTextContent(): string;
    /**
     * Remove all nodes in the NodeSelection. If there were any nodes,
     * replace the selection with a new RangeSelection at the previous
     * location of the first node.
     */
    deleteNodes(): void;
}
export declare function $isRangeSelection(x: unknown): x is RangeSelection;
export declare class RangeSelection implements BaseSelection {
    format: number;
    style: string;
    anchor: PointType;
    focus: PointType;
    _cachedNodes: LexicalNode[] | null;
    /** @internal */
    _cachedIsBackward: boolean | null;
    dirty: boolean;
    constructor(anchor: PointType, focus: PointType, format: number, style: string);
    getCachedNodes(): LexicalNode[] | null;
    setCachedNodes(nodes: LexicalNode[] | null): void;
    /**
     * Used to check if the provided selections is equal to this one by value,
     * including anchor, focus, format, and style properties.
     * @param selection - the Selection to compare this one to.
     * @returns true if the Selections are equal, false otherwise.
     */
    is(selection: null | BaseSelection): boolean;
    /**
     * Returns whether the Selection is "collapsed", meaning the anchor and focus are
     * the same node and have the same offset.
     *
     * @returns true if the Selection is collapsed, false otherwise.
     */
    isCollapsed(): boolean;
    /**
     * Gets all the nodes in the Selection. Uses caching to make it generally suitable
     * for use in hot paths.
     *
     * See also the {@link CaretRange} APIs (starting with
     * {@link $caretRangeFromSelection}), which are likely to provide a better
     * foundation for any operation where partial selection is relevant
     * (e.g. the anchor or focus are inside an ElementNode and TextNode)
     *
     * @returns an Array containing all the nodes in the Selection
     */
    getNodes(): LexicalNode[];
    /**
     * Sets this Selection to be of type "text" at the provided anchor and focus values.
     *
     * @param anchorNode - the anchor node to set on the Selection
     * @param anchorOffset - the offset to set on the Selection
     * @param focusNode - the focus node to set on the Selection
     * @param focusOffset - the focus offset to set on the Selection
     */
    setTextNodeRange(anchorNode: TextNode, anchorOffset: number, focusNode: TextNode, focusOffset: number): this;
    /**
     * Gets the (plain) text content of all the nodes in the selection.
     *
     * @returns a string representing the text content of all the nodes in the Selection
     */
    getTextContent(): string;
    /**
     * Attempts to map a DOM selection range onto this Lexical Selection,
     * setting the anchor, focus, and type accordingly
     *
     * @param range a DOM Selection range conforming to the StaticRange interface.
     */
    applyDOMRange(range: StaticRange): void;
    /**
     * Creates a new RangeSelection, copying over all the property values from this one.
     *
     * @returns a new RangeSelection with the same property values as this one.
     */
    clone(): RangeSelection;
    /**
     * Toggles the provided format on all the TextNodes in the Selection.
     *
     * @param format a string TextFormatType to toggle on the TextNodes in the selection
     */
    toggleFormat(format: TextFormatType): void;
    /**
     * Sets the value of the format property on the Selection
     *
     * @param format - the format to set at the value of the format property.
     */
    setFormat(format: number): void;
    /**
     * Sets the value of the style property on the Selection
     *
     * @param style - the style to set at the value of the style property.
     */
    setStyle(style: string): void;
    /**
     * Returns whether the provided TextFormatType is present on the Selection. This will be true if all text nodes in the Selection
     * have the specified format.
     *
     * @param type the TextFormatType to check for.
     * @returns true if the provided format is currently toggled on the Selection, false otherwise.
     */
    hasFormat(type: TextFormatType): boolean;
    /**
     * Attempts to insert the provided text into the EditorState at the current Selection.
     * converts tabs, newlines, and carriage returns into LexicalNodes.
     *
     * @param text the text to insert into the Selection
     */
    insertRawText(text: string): void;
    /**
     * Insert the provided text into the EditorState at the current Selection.
     *
     * @param text the text to insert into the Selection
     */
    insertText(text: string): void;
    /**
     * Removes the text in the Selection, adjusting the EditorState accordingly.
     */
    removeText(): void;
    /**
     * Applies the provided format to the TextNodes in the Selection, splitting or
     * merging nodes as necessary.
     *
     * @param formatType the format type to apply to the nodes in the Selection.
     * @param alignWithFormat a 32-bit integer representing formatting flags to align with.
     */
    formatText(formatType: TextFormatType, alignWithFormat?: number | null): void;
    /**
     * Attempts to "intelligently" insert an arbitrary list of Lexical nodes into the EditorState at the
     * current Selection according to a set of heuristics that determine how surrounding nodes
     * should be changed, replaced, or moved to accommodate the incoming ones.
     *
     * @param nodes - the nodes to insert
     */
    insertNodes(nodes: LexicalNode[]): void;
    /**
     * Inserts a new ParagraphNode into the EditorState at the current Selection
     *
     * @returns the newly inserted node.
     */
    insertParagraph(): ElementNode | null;
    /**
     * Inserts a logical linebreak, which may be a new LineBreakNode or a new ParagraphNode, into the EditorState at the
     * current Selection.
     */
    insertLineBreak(selectStart?: boolean): void;
    /**
     * Extracts the nodes in the Selection, splitting nodes where necessary
     * to get offset-level precision.
     *
     * @returns The nodes in the Selection
     */
    extract(): LexicalNode[];
    /**
     * Modifies the Selection according to the parameters and a set of heuristics that account for
     * various node types. Can be used to safely move or extend selection by one logical "unit" without
     * dealing explicitly with all the possible node types.
     *
     * @param alter the type of modification to perform
     * @param isBackward whether or not selection is backwards
     * @param granularity the granularity at which to apply the modification
     */
    modify(alter: 'move' | 'extend', isBackward: boolean, granularity: 'character' | 'word' | 'lineboundary'): void;
    /**
     * Helper for handling forward character and word deletion that prevents element nodes
     * like a table, columns layout being destroyed
     *
     * @param anchor the anchor
     * @param anchorNode the anchor node in the selection
     * @param isBackward whether or not selection is backwards
     */
    forwardDeletion(anchor: PointType, anchorNode: TextNode | ElementNode, isBackward: boolean): boolean;
    /**
     * Performs one logical character deletion operation on the EditorState based on the current Selection.
     * Handles different node types.
     *
     * @param isBackward whether or not the selection is backwards.
     */
    deleteCharacter(isBackward: boolean): void;
    /**
     * Performs one logical line deletion operation on the EditorState based on the current Selection.
     * Handles different node types.
     *
     * @param isBackward whether or not the selection is backwards.
     */
    deleteLine(isBackward: boolean): void;
    /**
     * Performs one logical word deletion operation on the EditorState based on the current Selection.
     * Handles different node types.
     *
     * @param isBackward whether or not the selection is backwards.
     */
    deleteWord(isBackward: boolean): void;
    /**
     * Returns whether the Selection is "backwards", meaning the focus
     * logically precedes the anchor in the EditorState.
     * @returns true if the Selection is backwards, false otherwise.
     */
    isBackward(): boolean;
    getStartEndPoints(): [PointType, PointType];
}
export declare function $isNodeSelection(x: unknown): x is NodeSelection;
/**
 * Explicitly sets or unsets text formats on the selection. Unlike $formatText
 * which toggles based on the current selection state, this function sets each
 * specified format to the exact boolean value provided. Mutually exclusive
 * formats (subscript/superscript, lowercase/uppercase/capitalize) are
 * reconciled by {@link toggleTextFormatType}, with later entries winning when
 * the requested formats conflict.
 *
 * @param selection - the selection whose nodes should be formatted.
 * @param formats - a partial record mapping TextFormatType to boolean.
 */
export declare function $setTextFormat(selection: RangeSelection | NodeSelection, formats: Partial<Record<TextFormatType, boolean>>): void;
/**
 * Applies the provided format to TextNodes and inline formattable nodes
 * (e.g. DecoratorTextNode) in the selection, splitting or merging TextNodes
 * as necessary and aligning all formattable nodes to the same target format.
 *
 * For RangeSelection the toggle direction is determined by the selection's
 * computed format (intersection of all text nodes) when no explicit alignment
 * is given. For NodeSelection each node is toggled independently when no
 * explicit alignment is given, since there is no TextNode to use as an
 * alignment reference.
 *
 * @param selection - the selection whose nodes should be formatted.
 * @param formatType - the format type to apply.
 * @param alignWithFormat - optional 32-bit bitmask to align with.
 */
export declare function $formatText(selection: RangeSelection | NodeSelection, formatType: TextFormatType, alignWithFormat?: number | null): void;
export declare function $getCharacterOffsets(selection: BaseSelection): [number, number];
/**
 * Programmatic counterpart of the DOM-read clamp: applied when a
 * RangeSelection is committed via $setSelection so an API-built selection
 * cannot straddle a slot boundary either. Direction comes from the model
 * comparator (slots-first content order), not the caret system — a
 * straddling pair has no common ancestor through __parent, so the caret
 * comparison would throw (that integration is the deferred caret-slot work),
 * and not from the DOM either, since $setSelection also runs in headless
 * mode where there is no DOM. Marks the selection dirty when it mutates a
 * point. No-op for non-slot trees (both frames null), evaluated before any
 * direction work, so non-slot and headless callers are unaffected.
 *
 * @experimental named-slots
 * @internal
 */
export declare function $clampRangeSelectionToSlotFrame(selection: RangeSelection): boolean;
export declare function $isBlockElementNode(node: LexicalNode | null | undefined): node is ElementNode;
export declare function $internalMakeRangeSelection(anchorKey: NodeKey, anchorOffset: number, focusKey: NodeKey, focusOffset: number, anchorType: 'text' | 'element', focusType: 'text' | 'element'): RangeSelection;
export declare function $createRangeSelection(): RangeSelection;
export declare function $createNodeSelection(): NodeSelection;
export declare function $internalCreateSelection(editor: LexicalEditor, event: UIEvent | Event | null): null | BaseSelection;
export declare function $createRangeSelectionFromDom(domSelection: Selection | null, editor: LexicalEditor): null | RangeSelection;
export declare function $internalCreateRangeSelection(lastSelection: null | BaseSelection, domSelection: Selection | null, editor: LexicalEditor, event: UIEvent | Event | null): null | RangeSelection;
export declare function $getSelection(): null | BaseSelection;
export declare function $getPreviousSelection(): null | BaseSelection;
export declare function $updateElementSelectionOnCreateDeleteNode(selection: RangeSelection, parentNode: LexicalNode, nodeOffset: number, times?: number): void;
export declare function applySelectionTransforms(nextEditorState: EditorState, editor: LexicalEditor): void;
export declare function moveSelectionPointToSibling(point: PointType, node: LexicalNode, parent: ElementNode, prevSibling: LexicalNode | null, nextSibling: LexicalNode | null): void;
export declare function adjustPointOffsetForMergedSibling(point: PointType, isBefore: boolean, key: NodeKey, target: TextNode, textLength: number): void;
/** @internal */
export declare function $updateDOMSelection(prevSelection: BaseSelection | null, nextSelection: BaseSelection | null, editor: LexicalEditor, domSelection: Selection, tags: Set<string>, rootElement: HTMLElement): void;
export declare function $insertNodes(nodes: LexicalNode[]): void;
/**
 * Push-lexer visitor passed to {@link tokenizeRawText}. The tokenizer
 * invokes one callback per token it emits; empty text runs are
 * suppressed, so `text` is only invoked with a non-empty string.
 */
export interface RawTextVisitor {
    readonly linebreak: () => void;
    readonly tab: () => void;
    readonly text: (text: string) => void;
}
/**
 * Push-lex a raw text string into `linebreak` (`\n` / `\r\n`), `tab`
 * (`\t`), and `text` (everything else) tokens, dispatching each to the
 * matching callback on `visitor` in source order.
 *
 * Shared by {@link $generateNodesFromRawText} (which builds
 * `LineBreakNode` / `TabNode` / `TextNode` siblings) and by
 * `@lexical/clipboard`'s default `text/plain` clipboard importer
 * (which maps `linebreak` to a real paragraph break via
 * `insertParagraph` so multi-line plain text becomes multi-paragraph
 * rich text). Empty text runs are dropped so callers don't need to
 * special-case them.
 */
export declare function tokenizeRawText(text: string, visitor: RawTextVisitor): void;
/**
 * Convert a raw text string into a flat array of `TextNode`,
 * `LineBreakNode`, and `TabNode` siblings, splitting on `\n`, `\r\n`,
 * and `\t`. Use this when you need the same `\n` / `\t` → real-node
 * conversion that {@link RangeSelection.insertRawText} performs but
 * without a selection — e.g. when building a `CodeNode`'s children
 * inside a DOM-import rule.
 */
export declare function $generateNodesFromRawText(text: string): (TextNode | LineBreakNode)[];
export declare function $getTextContent(): string;
