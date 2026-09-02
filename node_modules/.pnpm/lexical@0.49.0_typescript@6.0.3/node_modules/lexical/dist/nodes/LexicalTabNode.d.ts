/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { EditorConfig } from '../LexicalEditor';
import type { LexicalNode, NodeKey } from '../LexicalNode';
import { type SerializedTextNode, type TextDetailType, type TextModeType, TextNode } from './LexicalTextNode';
export type SerializedTabNode = SerializedTextNode;
/** @noInheritDoc */
export declare class TabNode extends TextNode {
    $config(): import("..").BaseStaticNodeConfig & {
        readonly text?: {
            readonly importDOM: {
                readonly '#text': () => {
                    conversion: (domNode: Node) => import("..").DOMConversionOutput;
                    priority: 0;
                };
                readonly b: () => {
                    conversion: (domNode: HTMLElement) => import("..").DOMConversionOutput;
                    priority: 0;
                };
                readonly code: () => {
                    conversion: (domNode: HTMLElement) => import("..").DOMConversionOutput;
                    priority: 0;
                };
                readonly em: () => {
                    conversion: (domNode: HTMLElement) => import("..").DOMConversionOutput;
                    priority: 0;
                };
                readonly i: () => {
                    conversion: (domNode: HTMLElement) => import("..").DOMConversionOutput;
                    priority: 0;
                };
                readonly mark: () => {
                    conversion: (domNode: HTMLElement) => import("..").DOMConversionOutput;
                    priority: 0;
                };
                readonly s: () => {
                    conversion: (domNode: HTMLElement) => import("..").DOMConversionOutput;
                    priority: 0;
                };
                readonly span: () => {
                    conversion: (domNode: HTMLSpanElement) => import("..").DOMConversionOutput;
                    priority: 0;
                };
                readonly strong: () => {
                    conversion: (domNode: HTMLElement) => import("..").DOMConversionOutput;
                    priority: 0;
                };
                readonly sub: () => {
                    conversion: (domNode: HTMLElement) => import("..").DOMConversionOutput;
                    priority: 0;
                };
                readonly sup: () => {
                    conversion: (domNode: HTMLElement) => import("..").DOMConversionOutput;
                    priority: 0;
                };
                readonly u: () => {
                    conversion: (domNode: HTMLElement) => import("..").DOMConversionOutput;
                    priority: 0;
                };
            };
        } | undefined;
    } & {
        readonly tab?: {
            readonly extends: typeof TextNode;
        } | undefined;
    } & import("..").StaticNodeTypeAccessor<"tab"> & import("..").StaticNodeConfigAccessor<{
        readonly extends: typeof TextNode;
    }>;
    constructor(key?: NodeKey | undefined);
    createDOM(config: EditorConfig): HTMLElement;
    /**
     * Always normalizes the stored content to `'\t'` regardless of input — see
     * comment below for the rationale.
     */
    setTextContent(_text: string): this;
    spliceText(offset: number, delCount: number, newText: string, moveSelection?: boolean): TextNode;
    setDetail(detail: TextDetailType | number): this;
    setMode(type: TextModeType): this;
    canInsertTextBefore(): boolean;
    canInsertTextAfter(): boolean;
}
export declare function $createTabNode(): TabNode;
export declare function $isTabNode(node: LexicalNode | null | undefined): node is TabNode;
