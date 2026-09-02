/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { DOMPreprocessFn } from './types';
/**
 * Inlines CSS rules from `<style>` tags onto matching elements as inline
 * styles.
 *
 * Used by apps like Excel that generate HTML where styles live in
 * class-based `<style>` rules (e.g. `.xl65 { background: #FFFF00; color:
 * blue; }`) rather than inline styles. Since Lexical's import converters
 * read inline styles, we resolve stylesheet rules into inline styles
 * before conversion.
 *
 * Mutates the DOM in-place. Original inline styles always take
 * precedence over stylesheet rules (matching CSS specificity behavior).
 *
 * No-op for {@link ParentNode}s that are not {@link Document}s — only a
 * full document carries `styleSheets` we can iterate.
 *
 * @experimental
 */
export declare const $inlineStylesFromStyleSheets: DOMPreprocessFn;
export declare function $inlineStylesFromStyleSheetsDOM(dom: Document | ParentNode): void;
