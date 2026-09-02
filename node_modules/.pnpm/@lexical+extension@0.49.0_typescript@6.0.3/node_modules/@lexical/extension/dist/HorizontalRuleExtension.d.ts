/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { DecoratorNode, type DOMConversionOutput, type DOMExportOutput, type EditorConfig, type LexicalCommand, type LexicalNode, type SerializedLexicalNode } from 'lexical';
/**
 * The serialized form of a {@link HorizontalRuleNode}. It has no extra fields
 * beyond the base serialized node.
 */
export type SerializedHorizontalRuleNode = SerializedLexicalNode;
/**
 * Command that inserts a {@link HorizontalRuleNode} at the current selection.
 * Dispatch it with
 * `editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND)`.
 */
export declare const INSERT_HORIZONTAL_RULE_COMMAND: LexicalCommand<void>;
export declare class HorizontalRuleNode extends DecoratorNode<unknown> {
    $config(): import("lexical").BaseStaticNodeConfig & {
        readonly horizontalrule?: {
            readonly importDOM: {
                readonly hr: () => {
                    conversion: typeof $convertHorizontalRuleElement;
                    priority: 0;
                };
            };
        } | undefined;
    };
    exportDOM(): DOMExportOutput;
    createDOM(config: EditorConfig): HTMLElement;
    getTextContent(): string;
    isInline(): false;
    updateDOM(): boolean;
}
declare function $convertHorizontalRuleElement(): DOMConversionOutput;
export declare function $createHorizontalRuleNode(): HorizontalRuleNode;
/**
 * @returns `true` if `node` is a {@link HorizontalRuleNode}, narrowing its type.
 */
export declare function $isHorizontalRuleNode(node: LexicalNode | null | undefined): node is HorizontalRuleNode;
/**
 * An extension for HorizontalRuleNode that provides an implementation that
 * works without any React dependency.
 */
export declare const HorizontalRuleExtension: import("lexical").LexicalExtension<import("lexical").ExtensionConfigBase, "@lexical/extension/HorizontalRule", unknown, unknown>;
export {};
