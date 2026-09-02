/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { type BaseSelection, type DOMExportOutput, type EditorConfig, ElementNode, type LexicalEditor, type LexicalNode, type LexicalUpdateJSON, type NodeKey, type ParagraphNode, type RangeSelection, type SerializedElementNode, type Spread } from 'lexical';
import { type ListNode } from './';
export type SerializedListItemNode = Spread<{
    checked: boolean | undefined;
    value: number;
}, SerializedElementNode>;
/** @noInheritDoc */
export declare class ListItemNode extends ElementNode {
    /** @internal */
    __value: number;
    /** @internal */
    __checked?: boolean;
    /** @internal */
    $config(): import("lexical").BaseStaticNodeConfig & {
        readonly listitem?: {
            readonly $transform: (node: ListItemNode) => void;
            readonly extends: typeof ElementNode;
            readonly importDOM: import("lexical").DOMConversionMap<HTMLElement>;
        } | undefined;
    } & import("lexical").StaticNodeTypeAccessor<"listitem"> & import("lexical").StaticNodeConfigAccessor<{
        readonly $transform: (node: ListItemNode) => void;
        readonly extends: typeof ElementNode;
        readonly importDOM: import("lexical").DOMConversionMap<HTMLElement>;
    }>;
    constructor(value?: number, checked?: undefined | boolean, key?: NodeKey);
    afterCloneFrom(prevNode: this): void;
    createDOM(config: EditorConfig): HTMLElement;
    updateListItemDOM(prevNode: ListItemNode | null, dom: HTMLLIElement, config: EditorConfig): void;
    updateDOM(prevNode: ListItemNode, dom: HTMLElement, config: EditorConfig): boolean;
    updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedListItemNode>): this;
    exportDOM(editor: LexicalEditor): DOMExportOutput;
    exportJSON(): SerializedListItemNode;
    append(...nodes: LexicalNode[]): this;
    replace<N extends LexicalNode>(replaceWithNode: N, includeChildren?: boolean): N;
    insertAfter(node: LexicalNode, restoreSelection?: boolean): LexicalNode;
    remove(preserveEmptyParent?: boolean): void;
    resetOnCopyNodeFrom(original: this): void;
    insertNewAfter(_: RangeSelection, restoreSelection?: boolean): ListItemNode | ParagraphNode;
    collapseAtStart(selection: RangeSelection): boolean;
    getValue(): number;
    setValue(value: number): this;
    getChecked(): boolean | undefined;
    setChecked(checked?: boolean): this;
    toggleChecked(): this;
    getIndent(): number;
    setIndent(indent: number): this;
    /** @deprecated @internal */
    canInsertAfter(node: LexicalNode): boolean;
    /** @deprecated @internal */
    canReplaceWith(replacement: LexicalNode): boolean;
    canMergeWith(node: LexicalNode): boolean;
    extractWithChild(child: LexicalNode, selection: BaseSelection): boolean;
    isParentRequired(): true;
    createParentElementNode(): ListNode;
    canMergeWhenEmpty(): true;
}
/**
 * Creates a new List Item node, passing true/false will convert it to a checkbox input.
 * @param checked - Is the List Item a checkbox and, if so, is it checked? undefined/null: not a checkbox, true/false is a checkbox and checked/unchecked, respectively.
 * @returns The new List Item.
 */
export declare function $createListItemNode(checked?: boolean): ListItemNode;
/**
 * Checks to see if the node is a ListItemNode.
 * @param node - The node to be checked.
 * @returns true if the node is a ListItemNode, false otherwise.
 */
export declare function $isListItemNode(node: LexicalNode | null | undefined): node is ListItemNode;
