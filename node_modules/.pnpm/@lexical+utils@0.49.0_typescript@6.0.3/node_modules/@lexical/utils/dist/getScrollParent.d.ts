/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/**
 * Walks up from `element` and returns the nearest scrollable ancestor (or
 * `ownerDocument.body` if none is found), used to keep the active typeahead
 * option scrolled into view. Set `includeHidden` to also treat
 * `overflow: hidden` ancestors as scroll parents.
 *
 * The walk crosses ShadowRoot→host (via `getParentElement`) so a
 * shadow-mounted editor's scroll parent is found in the enclosing light-DOM
 * ancestor chain, and the styles / body are resolved through the element's
 * own realm so an iframe-mounted editor stays inside its document.
 */
export declare function getScrollParent(element: HTMLElement, includeHidden: boolean): HTMLElement | HTMLBodyElement;
