/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { KlassConstructor } from '../LexicalEditor';
import { type DOMConversionOutput, LexicalNode, type SerializedLexicalNode } from '../LexicalNode';
export type SerializedLineBreakNode = SerializedLexicalNode;
/** @noInheritDoc */
export declare class LineBreakNode extends LexicalNode {
    /** @internal */
    ['constructor']: KlassConstructor<typeof LineBreakNode>;
    $config(): import("..").BaseStaticNodeConfig & {
        readonly linebreak?: {
            readonly importDOM: {
                readonly br: (node: Node) => {
                    conversion: typeof $convertLineBreakElement;
                    priority: 0;
                } | null;
            };
        } | undefined;
    };
    getTextContent(): '\n';
    createDOM(): HTMLElement;
    updateDOM(): false;
    isInline(): true;
}
declare function $convertLineBreakElement(node: Node): DOMConversionOutput;
export declare function $createLineBreakNode(): LineBreakNode;
export declare function $isLineBreakNode(node: LexicalNode | null | undefined): node is LineBreakNode;
/**
 * True when `node` is the sole non-whitespace child of a block DOM
 * element. Used by the LineBreak importer to drop stray `<br>` elements
 * that the legacy `$generateNodesFromDOM` also skipped (matches the
 * behavior of `LineBreakNode.importDOM`).
 *
 * @experimental
 */
export declare function isOnlyChildInBlockNode(node: Node): boolean;
/**
 * True when `node` is the trailing non-whitespace child of a block DOM
 * element (excluding the only-child case). Used by the LineBreak
 * importer to drop trailing `<br>` elements like the Apple-interchange
 * clipboard artifact (matches `LineBreakNode.importDOM`).
 *
 * @experimental
 */
export declare function isLastChildInBlockNode(node: Node): boolean;
export {};
