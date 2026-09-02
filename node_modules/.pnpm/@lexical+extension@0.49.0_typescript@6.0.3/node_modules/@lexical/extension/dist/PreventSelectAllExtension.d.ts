/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
export interface PreventSelectAllConfig {
    disabled: boolean;
}
/**
 * By default, lexical intercepts most events and dispatches the appropriate commands.
 * This extension prevents the keydown event propagating from input/textarea elements,
 * which are typically part of a decorator node, in order to stop dispatching the SELECT_ALL_COMMAND.
 *
 * When used as a dependency of SelectBlockExtension, its disabled state is
 * kept in sync with that extension.
 */
export declare const PreventSelectAllExtension: import("lexical").LexicalExtension<PreventSelectAllConfig, "@lexical/extension/PreventSelectAll", import("./namedSignals").NamedSignalsOutput<PreventSelectAllConfig>, unknown>;
