/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { DOMRenderConfig, DOMRenderExtensionOutput } from './types';
import { type InitialEditorConfig } from 'lexical';
/** @internal The result returned from {@link DOMRenderExtension}'s `init`. */
interface DOMRenderInitResult {
    /**
     * The `nodes` and base `dom` captured from the editor config before `dom`
     * is overwritten with the compiled config — the only fields the runtime
     * needs to recompile.
     */
    initialEditorConfig: Pick<InitialEditorConfig, 'nodes' | 'dom'>;
}
/**
 * @experimental
 *
 * An extension that allows overriding the render and export behavior for an
 * editor. This is highly experimental and subject to change from one version
 * to the next.
 **/
export declare const DOMRenderExtension: import("lexical").LexicalExtension<DOMRenderConfig, "@lexical/html/DOM", DOMRenderExtensionOutput, DOMRenderInitResult>;
export {};
