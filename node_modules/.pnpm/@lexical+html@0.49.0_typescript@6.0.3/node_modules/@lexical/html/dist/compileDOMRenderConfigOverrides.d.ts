/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { AnyDOMRenderMatch, DOMRenderConfig } from './types';
import { type EditorDOMRenderConfig, type InitialEditorConfig, type LexicalNode } from 'lexical';
type TypeRender<T> = {
    [NodeType in string]?: T[];
};
type AnyRender<T> = readonly [(node: LexicalNode) => boolean, T] | readonly ['types', TypeRender<T>];
type PreEditorDOMRenderConfig = {
    [K in keyof EditorDOMRenderConfig]: AnyRender<AnyDOMRenderMatch[K]>[];
};
export declare function precompileDOMRenderConfigOverrides(editorConfig: Pick<InitialEditorConfig, 'nodes'>, overrides: DOMRenderConfig['overrides']): PreEditorDOMRenderConfig;
export declare function compileDOMRenderConfigOverrides(editorConfig: Pick<InitialEditorConfig, 'nodes' | 'dom'>, { overrides }: Pick<DOMRenderConfig, 'overrides'>): EditorDOMRenderConfig;
export {};
