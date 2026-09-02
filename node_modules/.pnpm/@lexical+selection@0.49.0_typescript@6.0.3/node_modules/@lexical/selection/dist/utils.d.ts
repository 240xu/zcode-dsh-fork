/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { type ElementNode, getStyleObjectFromCSS, type LexicalEditor, type LexicalNode } from 'lexical';
/**
 * Creates a selection range for the DOM.
 * @param editor - The lexical editor.
 * @param anchorNode - The anchor node of a selection.
 * @param _anchorOffset - The amount of space offset from the anchor to the focus.
 * @param focusNode - The current focus.
 * @param _focusOffset - The amount of space offset from the focus to the anchor.
 * @returns The range of selection for the DOM that was created.
 */
export declare function createDOMRange(editor: LexicalEditor, anchorNode: LexicalNode, _anchorOffset: number, focusNode: LexicalNode, _focusOffset: number): Range | null;
/**
 * Creates DOMRects, generally used to help the editor find a specific location on the screen.
 * @param editor - The lexical editor
 * @param range - A fragment of a document that can contain nodes and parts of text nodes.
 * @returns The selectionRects as an array.
 */
export declare function createRectsFromDOMRange(editor: Pick<LexicalEditor, 'getRootElement'>, range: Range): DOMRect[];
/**
 * @deprecated Use {@link getStyleObjectFromCSS}, this is just an alias for backwards compatibility.
 */
export declare const getStyleObjectFromRawCSS: typeof getStyleObjectFromCSS;
/**
 * Serializes a style object into a CSS declaration string, the inverse of
 * {@link getStyleObjectFromCSS}.
 * @param styles - An object mapping CSS property names to their values.
 * @returns A CSS string of the form `prop: value;` for each entry, concatenated together.
 */
export declare function getCSSFromStyleObject(styles: Record<string, string>): string;
/**
 * Gets the computed DOM styles of the element.
 * @param element - The node to check the styles for.
 * @returns the computed styles of the element or null if there is no DOM element or no default view for the document.
 */
export declare function $getComputedStyleForElement(element: ElementNode): CSSStyleDeclaration | null;
/**
 * Gets the computed DOM styles of the parent of the node.
 * @param node - The node to check its parent's styles for.
 * @returns the computed styles of the node or null if there is no DOM element or no default view for the document.
 */
export declare function $getComputedStyleForParent(node: LexicalNode): CSSStyleDeclaration | null;
/**
 * Determines whether a node's parent is RTL.
 * @param node - The node to check whether it is RTL.
 * @returns whether the node is RTL.
 */
export declare function $isParentRTL(node: LexicalNode): boolean;
