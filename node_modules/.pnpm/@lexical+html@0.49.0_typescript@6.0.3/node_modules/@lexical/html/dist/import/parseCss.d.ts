/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { ElementSelectorBuilder } from './types';
/**
 * Parse a reduced CSS-selector subset and return a {@link CompiledSelector}.
 * Supported:
 * - Tag (`p`), wildcard (`*`).
 * - Tag list (`h1, h2, h3`).
 * - Class (`.foo`, `.foo.bar`).
 * - ID (`#foo`).
 * - Attribute presence (`[name]`).
 * - Attribute equality (`[name="value"]`, `[name=value]`).
 *
 * Anything outside the subset (regex attribute, inline-style match,
 * combinators, pseudo-classes) is intentionally rejected — chain combinator
 * methods off the returned builder instead.
 *
 * @experimental
 */
export declare function parseSelector(source: string): ElementSelectorBuilder<HTMLElement>;
