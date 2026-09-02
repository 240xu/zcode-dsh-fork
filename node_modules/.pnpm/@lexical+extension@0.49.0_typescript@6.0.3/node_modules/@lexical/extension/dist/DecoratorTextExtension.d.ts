/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { DecoratorNode, type EditorConfig, type InlineFormattableNode, type LexicalEditor, type LexicalNode, type NodeStateVersion, type SerializedLexicalNode, type Spread, type StateConfigValue, type StateValueOrUpdater, type TextFormatType } from 'lexical';
export type SerializedDecoratorTextNode = Spread<{
    format: number;
}, SerializedLexicalNode>;
declare const formatState: import("lexical").StateConfig<"format", number>;
export declare class DecoratorTextNode extends DecoratorNode<unknown> implements InlineFormattableNode {
    /** @internal */
    get __isInlineFormattable(): true;
    $config(): import("lexical").BaseStaticNodeConfig & {
        readonly "decorator-text"?: {
            readonly extends: typeof DecoratorNode;
            readonly stateConfigs: readonly [{
                readonly flat: true;
                readonly stateConfig: import("lexical").StateConfig<"format", number>;
            }];
        } | undefined;
    } & import("lexical").StaticNodeTypeAccessor<"decorator-text"> & import("lexical").StaticNodeConfigAccessor<{
        readonly extends: typeof DecoratorNode;
        readonly stateConfigs: readonly [{
            readonly flat: true;
            readonly stateConfig: import("lexical").StateConfig<"format", number>;
        }];
    }>;
    getFormat(version?: NodeStateVersion): StateConfigValue<typeof formatState>;
    getFormatFlags(type: TextFormatType, alignWithFormat: null | number): number;
    hasFormat(type: TextFormatType): boolean;
    setFormat(type: StateValueOrUpdater<typeof formatState>): this;
    toggleFormat(type: TextFormatType): this;
    isInline(): true;
    createDOM(config: EditorConfig, editor: LexicalEditor): HTMLElement;
}
export declare function $isDecoratorTextNode(node: LexicalNode | null | undefined): node is DecoratorTextNode;
/**
 * Applies formatting to the node based on the properties in the passed style object.
 * By default, properties are checked according to the values set
 * when importing content from Google Docs.
 * This algorithm is identical to the TextNode import.

 * @param lexicalNode The node to which the format will apply
 * @param style CSS style object
 * @param shouldApply format to apply if it is not in style
 * @returns lexicalNode
 */
export declare function applyFormatFromStyle(lexicalNode: DecoratorTextNode, style: CSSStyleDeclaration, shouldApply?: TextFormatType): DecoratorTextNode;
/**
 * The function wraps the passed DOM node in semantic tags depending on the node format.
 *
 * @param lexicalNode The node where the format is checked
 * @param domNode DOM that will be wrapped in tags
 * @param tagNameToFormat Tag name and format mapping
 * @returns domNode
 */
export declare function applyFormatToDom<T extends Text | HTMLElement>(lexicalNode: DecoratorTextNode, domNode: T, tagNameToFormat?: {
    [key: string]: TextFormatType;
}): T | HTMLElement;
/**
 * @deprecated Use {@link applyFormatToDom} instead. The `$` prefix was a
 * mistake in the 0.47 release: the implementation does not read any editor
 * state, so the dollar convention does not apply. This alias is kept for
 * compatibility with 0.47.
 */
export declare const $applyFormatToDom: typeof applyFormatToDom;
/**
 * An extension that registers DecoratorTextNode with the editor.
 */
export declare const DecoratorTextExtension: import("lexical").LexicalExtension<import("lexical").ExtensionConfigBase, "@lexical/extension/DecoratorText", unknown, unknown>;
export {};
