import { type BaseSelection, type ElementNode, type LexicalEditor, type Point, type RangeSelection, type TextNode } from 'lexical';
/**
 * Generally used to append text content to HTML and JSON. Grabs the text content and "slices"
 * it to be generated into the new TextNode.
 * @param selection - The selection containing the node whose TextNode is to be edited.
 * @param textNode - The TextNode to be edited.
 * @param mutates - 'clone' to return a clone before mutating, 'self' to update in-place
 * @returns The updated TextNode or clone.
 */
export declare function $sliceSelectedTextNodeContent<T extends TextNode>(selection: BaseSelection, textNode: T, mutates?: 'clone' | 'self'): T;
/**
 * Determines if the current selection is at the end of the node.
 * @param point - The point of the selection to test.
 * @returns true if the provided point offset is in the last possible position, false otherwise.
 */
export declare function $isAtNodeEnd(point: Point): boolean;
/**
 * Trims text from a node in order to shorten it, eg. to enforce a text's max length. If it deletes text
 * that is an ancestor of the anchor then it will leave 2 indents, otherwise, if no text content exists, it deletes
 * the TextNode. It will move the focus to either the end of any left over text or beginning of a new TextNode.
 * @param editor - The lexical editor.
 * @param anchor - The anchor of the current selection, where the selection should be pointing.
 * @param delCount - The amount of characters to delete. Useful as a dynamic variable eg. textContentSize - maxLength;
 */
export declare function $trimTextContentFromAnchor(editor: LexicalEditor, anchor: Point, delCount: number): void;
/**
 * @deprecated node styles are parsed on demand and not cached eternally
 */
export declare const $addNodeStyle: (_node: TextNode) => void;
/**
 * Applies the provided styles to the given TextNode, ElementNode, or
 * collapsed RangeSelection.
 *
 * @param target - The TextNode, ElementNode, or collapsed RangeSelection to apply the styles to
 * @param patch - The patch to apply, which can include multiple styles. \\{CSSProperty: value\\} . Can also accept a function that returns the new property value.
 */
export declare function $patchStyle(target: TextNode | RangeSelection | ElementNode, patch: Record<string, string | null | ((currentStyleValue: string | null, _target: typeof target) => string)>): void;
/**
 * Applies the provided styles to the TextNodes in the provided Selection.
 * Will update partially selected TextNodes by splitting the TextNode and applying
 * the styles to the appropriate one.
 * @param selection - The selected node(s) to update.
 * @param patch - The patch to apply, which can include multiple styles. \\{CSSProperty: value\\} . Can also accept a function that returns the new property value.
 */
export declare function $patchStyleText(selection: BaseSelection, patch: Record<string, string | null | ((currentStyleValue: string | null, target: TextNode | RangeSelection | ElementNode) => string)>): void;
export declare function $forEachSelectedTextNode(fn: (textNode: TextNode) => void): void;
/**
 * Ensure that the given RangeSelection is not backwards. If it
 * is backwards, then the anchor and focus points will be swapped
 * in-place. Ensuring that the selection is a writable RangeSelection
 * is the responsibility of the caller (e.g. in a read-only context
 * you will want to clone $getSelection() before using this).
 *
 * @param selection a writable RangeSelection
 */
export declare function $ensureForwardRangeSelection(selection: RangeSelection): void;
