/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { AnyRenderStateConfigPairOrUpdater, RenderStateConfig } from './types';
import { type EditorDOMRenderConfig, type LexicalEditor } from 'lexical';
/**
 * Create a context state to be used during render.
 *
 * Note that to support the ValueOrUpdater pattern you can not use a
 * function for V (but you may wrap it in an array or object).
 *
 * @experimental
 * @__NO_SIDE_EFFECTS__
 */
export declare function createRenderState<V>(name: string, getDefaultValue: () => V, isEqual?: (a: V, b: V) => boolean): RenderStateConfig<V>;
/**
 * Render context state that is true if the export was initiated from the root of the document.
 * @experimental
 */
export declare const RenderContextRoot: RenderStateConfig<boolean>;
/**
 * Render context state that is true if this is an export operation ($generateHtmlFromNodes).
 * @experimental
 */
export declare const RenderContextExport: RenderStateConfig<boolean>;
/**
 * Get a render context value during a DOM render or export operation.
 * @experimental
 */
export declare function $getRenderContextValue<V>(cfg: RenderStateConfig<V>, editor?: LexicalEditor): V;
/**
 * Imperatively set a value in the persistent editor render context.
 *
 * Unlike {@link $withRenderContext} (which scopes values to a callback), this
 * persists on the editor. If the change flips any override's
 * `disabledForEditor` result, the resident render config is recompiled and the
 * affected nodes are re-rendered. No-op if {@link DOMRenderExtension} is not
 * installed.
 *
 * @experimental
 */
export declare function $setRenderContextValue<V>(cfg: RenderStateConfig<V>, value: V, editor?: LexicalEditor): void;
/**
 * Imperatively update a value in the persistent editor render context with an
 * updater function. See {@link $setRenderContextValue}.
 *
 * @experimental
 */
export declare function $updateRenderContextValue<V>(cfg: RenderStateConfig<V>, updater: (prev: V) => V, editor?: LexicalEditor): void;
/**
 * Resolve the {@link EditorDOMRenderConfig} to use for the current
 * export/generate session, applying any `disabledForSession` overrides against
 * the active session context. Falls back to the editor's resident config when
 * {@link DOMRenderExtension} is not installed.
 *
 * @experimental
 */
export declare function $getSessionDOMRenderConfig(editor?: LexicalEditor): EditorDOMRenderConfig;
/**
 * Execute a callback within a render context with the given config pairs.
 * @experimental
 */
export declare const $withRenderContext: (cfg: readonly AnyRenderStateConfigPairOrUpdater[], editor?: LexicalEditor) => <T>(f: () => T) => T;
