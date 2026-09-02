/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { type LexicalEditor } from 'lexical';
/**
 * Install the shared window listener that handles Dragon NaturallySpeaking's
 * web extension messages for every registered editor in the given window.
 *
 * Browsers invoke a window's message listeners in registration order, and
 * the extension's content script registers its own listener at document_end
 * of the initial page load. {@link registerDragonSupport} installs this
 * listener lazily, when an editor's root element is mounted, which loses
 * that race whenever editors mount after the initial load (a navigation in
 * a single page app, a dialog, any lazily rendered field). The extension
 * then edits the DOM directly before Lexical can stopImmediatePropagation,
 * and the edit is applied twice.
 *
 * Call this synchronously from every entrypoint that may render an editor
 * lazily, before document_end, so the listener is ahead of the extension's
 * and editors win the race no matter when they mount.
 *
 * Pass `targetWindow` to install the listener on a window other than the
 * global one (for example, an editor mounted inside an iframe). When
 * omitted, defaults to the current `window` when available. Returns a
 * teardown function; the listener for a window is removed once every
 * teardown for it (including the ones returned by
 * {@link registerDragonSupport}) has been called.
 */
export declare function installDragonSupport(targetWindow?: undefined | Window): () => void;
export declare function registerDragonSupport(editor: LexicalEditor): () => void;
export interface DragonConfig {
    disabled: boolean;
}
/**
 * Add Dragon speech to text input support to the editor, via the
 * \@lexical/dragon module.
 */
export declare const DragonExtension: import("lexical").LexicalExtension<DragonConfig, "@lexical/dragon", import("@lexical/extension").NamedSignalsOutput<DragonConfig>, unknown>;
