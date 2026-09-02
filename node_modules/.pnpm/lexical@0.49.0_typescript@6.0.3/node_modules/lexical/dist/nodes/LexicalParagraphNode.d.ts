/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { EditorConfig, KlassConstructor, LexicalEditor, Spread } from '../LexicalEditor';
import type { DOMConversionOutput, DOMExportOutput, LexicalNode } from '../LexicalNode';
import type { RangeSelection } from '../LexicalSelection';
import { ElementNode, type SerializedElementNode } from './LexicalElementNode';
export type SerializedParagraphNode = Spread<{
    textFormat: number;
    textStyle: string;
}, SerializedElementNode>;
/** @noInheritDoc */
export declare class ParagraphNode extends ElementNode {
    /** @internal */
    ['constructor']: KlassConstructor<typeof ParagraphNode>;
    $config(): import("..").BaseStaticNodeConfig & {
        readonly paragraph?: {
            readonly extends: typeof ElementNode;
            readonly importDOM: {
                readonly p: () => {
                    conversion: typeof $convertParagraphElement;
                    priority: 0;
                };
            };
        } | undefined;
    } & import("..").StaticNodeTypeAccessor<"paragraph"> & import("..").StaticNodeConfigAccessor<{
        readonly extends: typeof ElementNode;
        readonly importDOM: {
            readonly p: () => {
                conversion: typeof $convertParagraphElement;
                priority: 0;
            };
        };
    }>;
    createDOM(config: EditorConfig): HTMLElement;
    updateDOM(prevNode: ParagraphNode, dom: HTMLElement, config: EditorConfig): boolean;
    exportDOM(editor: LexicalEditor): DOMExportOutput;
    exportJSON(): SerializedParagraphNode;
    insertNewAfter(rangeSelection: RangeSelection, restoreSelection: boolean): ParagraphNode;
    collapseAtStart(): boolean;
}
declare function $convertParagraphElement(element: HTMLElement): DOMConversionOutput;
export declare function $createParagraphNode(): ParagraphNode;
export declare function $isParagraphNode(node: LexicalNode | null | undefined): node is ParagraphNode;
export {};
