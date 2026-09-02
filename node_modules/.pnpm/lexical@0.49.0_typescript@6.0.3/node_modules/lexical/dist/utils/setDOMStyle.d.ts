/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/**
 * Parses inline CSS text into an object that is compatible with
 * `CSSStyleDeclaration.setProperty()`.
 *
 * Property names are expected to be kebab-case, such as `font-size`, and
 * values are expected to include explicit units where needed, such as `12px`.
 */
export declare function getStyleObjectFromCSS(css: string): Record<string, string>;
/**
 * Applies a style object to a DOM style declaration using
 * `CSSStyleDeclaration.setProperty()`.
 *
 * Property names are expected to be kebab-case, such as `font-size`, and
 * values are expected to include explicit units where needed, such as `12px`.
 */
export declare function setDOMStyleObject(domStyle: CSSStyleDeclaration, styleObject: Record<string, string | null | undefined>): void;
/**
 * Applies inline CSS text to a DOM style declaration using
 * `CSSStyleDeclaration.setProperty()`.
 *
 * Property names are expected to be kebab-case, such as `font-size`, and
 * values are expected to include explicit units where needed, such as `12px`.
 */
export declare function setDOMStyleFromCSS(domStyle: CSSStyleDeclaration, cssText: string, prevCSSText?: string): void;
