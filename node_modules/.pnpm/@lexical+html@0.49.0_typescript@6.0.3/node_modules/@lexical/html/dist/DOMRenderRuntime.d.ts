/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { AnyDOMRenderMatch, AnyRenderStateConfigPairOrUpdater, ContextRecord, DOMRenderRuntime, RenderStateConfig } from './types';
import { type EditorDOMRenderConfig, type InitialEditorConfig, type LexicalEditor } from 'lexical';
import { DOMRenderContextSymbol } from './constants';
type RenderContextRecord = ContextRecord<typeof DOMRenderContextSymbol>;
/**
 * The mutable, writable editor-level context record. Reads of a render state
 * during reconciliation (and as the base layer of a session) fall through to
 * this record, and it is the layer the `disabledForEditor` predicates read.
 *
 * @internal
 */
export declare function createEditorContextRecord(contextDefaults: readonly AnyRenderStateConfigPairOrUpdater[]): RenderContextRecord;
/**
 * Filter the configured overrides down to those that are resident in the
 * editor's render config, removing any whose `disabledForEditor` predicate
 * returns `true` for the given editor context.
 *
 * @internal
 */
export declare function filterEditorInstalled(overrides: readonly AnyDOMRenderMatch[], record: RenderContextRecord): AnyDOMRenderMatch[];
/**
 * Per-editor runtime backing {@link DOMRenderExtension}'s conditional
 * overrides and imperative editor context. See {@link DOMRenderRuntime}.
 *
 * @internal
 */
export declare class DOMRenderRuntimeImpl implements DOMRenderRuntime {
    readonly editor: LexicalEditor;
    /**
     * The `nodes` and base `dom` captured at `init` (before `dom` was
     * overwritten with the compiled config) — the clean base for every recompile.
     */
    readonly initialEditorConfig: Pick<InitialEditorConfig, 'nodes' | 'dom'>;
    readonly overrides: readonly AnyDOMRenderMatch[];
    readonly editorContext: RenderContextRecord;
    readonly hasSessionGates: boolean;
    installed: readonly AnyDOMRenderMatch[];
    /** Memoized session configs keyed by the set of session-disabled overrides. */
    private readonly sessionCache;
    constructor(editor: LexicalEditor, initialEditorConfig: Pick<InitialEditorConfig, 'nodes' | 'dom'>, overrides: readonly AnyDOMRenderMatch[], editorContext: RenderContextRecord);
    setContextValue<V>(cfg: RenderStateConfig<V>, value: V): void;
    getSessionConfig(): EditorDOMRenderConfig;
}
export {};
