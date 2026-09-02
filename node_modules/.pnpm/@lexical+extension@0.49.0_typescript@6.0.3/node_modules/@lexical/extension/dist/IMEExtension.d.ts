/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { type NodeKey, type TextNode } from 'lexical';
import { type Signal } from './signals';
/**
 * Centralizes IME composition state so extensions that react to
 * composition lifecycle don't each re-implement the
 * COMPOSITION_START_COMMAND + compositionend listener dance.
 *
 * Exposes two signals (both always-active for the editor's lifetime —
 * listeners are wired up by `register`, not lazily on subscription, so
 * consumers can read `.value` from anywhere without holding a
 * subscription themselves):
 *
 * - `compositionKey` is the raw mirror — the value Lexical's own
 *   `$handleCompositionStart` writes to its internal `_compositionKey`,
 *   i.e. the `selection.anchor.key` at the moment composition starts.
 *   This can be a non-TextNode key when composition begins on an
 *   element-anchor selection (e.g. empty paragraph). Cleared on
 *   `compositionend`.
 *
 * - `composingTextNode` is the resolved view — the actual TextNode
 *   being composed on, or `null` while there is no TextNode-level
 *   composition. For an element-anchor start it stays `null` until
 *   the `COMPOSITION_START_TAG`-tagged update fires with the
 *   post-ZWSP-heuristic selection, at which point it updates to the
 *   new TextNode.
 *
 */
export declare const IMEExtension: import("lexical").LexicalExtension<import("lexical").ExtensionConfigBase, "@lexical/extension/IME", {
    compositionKey: Signal<null | NodeKey>;
    composingTextNode: Signal<null | TextNode>;
}, unknown>;
