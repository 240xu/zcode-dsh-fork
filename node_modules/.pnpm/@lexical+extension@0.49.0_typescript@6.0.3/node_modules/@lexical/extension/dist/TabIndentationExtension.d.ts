/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { type ElementNode, type LexicalEditor } from 'lexical';
import { type ReadonlySignal } from './signals';
export type CanIndentPredicate = (node: ElementNode) => boolean;
/**
 * Registers a `KEY_TAB_COMMAND` handler that makes Tab and Shift+Tab indent and
 * outdent block elements (and otherwise insert a tab). Pass `maxIndent` to cap
 * the indent depth and `$canIndent` to control which elements may be indented.
 *
 * @returns A cleanup function that unregisters the handler.
 */
export declare function registerTabIndentation(editor: LexicalEditor, maxIndent?: number | ReadonlySignal<null | number>, $canIndent?: CanIndentPredicate | ReadonlySignal<CanIndentPredicate>): () => void;
export interface TabIndentationConfig {
    disabled: boolean;
    maxIndent: null | number;
    /**
     * By default, indents are set on all elements for which the {@link ElementNode.canIndent} returns true.
     * This option allows you to set indents for specific nodes without overriding the method for others.
     */
    $canIndent: CanIndentPredicate;
}
/**
 * This extension adds the ability to indent content using the tab key. Generally, we don't
 * recommend using this plugin as it could negatively affect accessibility for keyboard
 * users, causing focus to become trapped within the editor.
 */
export declare const TabIndentationExtension: import("lexical").LexicalExtension<TabIndentationConfig, "@lexical/extension/TabIndentation", import("./namedSignals").NamedSignalsOutput<TabIndentationConfig>, unknown>;
