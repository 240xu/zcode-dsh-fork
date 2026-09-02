/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { type BaseSelection, type LexicalEditor, type LexicalNode } from 'lexical';
export { contextUpdater, contextValue } from './ContextRecord';
export { domOverride } from './domOverride';
export { DOMRenderExtension } from './DOMRenderExtension';
export type { AnyDOMImportRule, AttrMatchOptions, CapturesOfSelector, ChildSchema, CompiledOverlayRules, CompiledSelector, DOMImportContext, DOMImportExtensionOutput, DOMImportFn, DOMImportRule, DOMImportRuleEntry, DOMPreprocessContext, DOMPreprocessFn, ElementSelectorBuilder, GenerateNodesFromDOMOptions, ImportChildrenOpts, ImportContextPairOrUpdater, ImportNodeOpts, ImportSession, ImportStateConfig, NodeOfSelector, StyleMatchOptions, } from './import';
export { $distributeInlineWrapper, $generateNodesFromDOMViaExtension, $getImportContextValue, $inlineStylesFromStyleSheets, $isBlockLevel, $propagateTextAlignToBlockChildren, $withImportContext, BlockSchema, CoreImportExtension, CoreImportRules, createImportState, defaultIsInline, defaultPreservesWhitespace, defineImportRule, defineOverlayRules, type DOMImportConfig, DOMImportExtension, HorizontalRuleImportExtension, HorizontalRuleImportRules, ImportOverlays, ImportSource, ImportSourceDataTransfer, type ImportSourceKind, ImportTextFormat, ImportTextStyle, ImportWhitespaceConfig, InlineSchema, isElementOfTag, type IsInlineForWhitespace, type IsPreserveWhitespaceDom, NestedBlockSchema, parseSelector, RootSchema, sel, type WhitespaceImportConfig, } from './import';
export { $getRenderContextValue, $getSessionDOMRenderConfig, $setRenderContextValue, $updateRenderContextValue, $withRenderContext, createRenderState, RenderContextExport, RenderContextRoot, } from './RenderContext';
export type { AnyDOMRenderMatch, AnyRenderStateConfig, AnyRenderStateConfigPairOrUpdater, ContextPairOrUpdater, DOMOverrideOptions, DOMRenderConfig, DOMRenderExtensionOutput, DOMRenderMatch, DOMRenderMatchConfig, NodeMatch, RenderContextReader, } from './types';
/**
 * How you parse your html string to get a document is left up to you. In the browser you can use the native
 * DOMParser API to generate a document (see clipboard.ts), but to use in a headless environment you can use JSDom
 * or an equivalent library and pass in the document here.
 */
export declare function $generateNodesFromDOM(editor: LexicalEditor, dom: Document | ParentNode): LexicalNode[];
/**
 * Generate DOM nodes from the editor state into the given container element,
 * using the editor's {@link EditorDOMRenderConfig}.
 * @experimental
 */
export declare function $generateDOMFromNodes<T extends HTMLElement | DocumentFragment>(container: T, selection?: null | BaseSelection, editor?: LexicalEditor): T;
/**
 * Generate DOM nodes from a root node into the given container element,
 * including the root node itself. Uses the editor's {@link EditorDOMRenderConfig}.
 * @experimental
 */
export declare function $generateDOMFromRoot<T extends HTMLElement | DocumentFragment>(container: T, root?: LexicalNode): T;
/**
 * Generate an HTML string from the editor's current state (or `selection`
 * if provided).
 *
 * Must be called inside an active editor scope — i.e. `editor.update(...)`,
 * `editor.read(...)`, or `editor.getEditorState().read(callback, {editor})`.
 * The legacy `editor.getEditorState().read(callback)` call (without the
 * `{editor}` option) does not set an active editor and is not supported;
 * `editor.read(...)` is the drop-in replacement.
 */
export declare function $generateHtmlFromNodes(editor: LexicalEditor, selection?: BaseSelection | null): string;
/**
 * Serialize a single node (and its subtree) into `parentElement`, the same way
 * the top-level HTML exporter serializes the nodes it walks. Slots are not part
 * of any node's child list and — like {@link LexicalNode.exportJSON} vs
 * `exportDOM` for NodeState — are intentionally NOT auto-serialized to HTML;
 * a host node opts in by calling this from its own `exportDOM`, e.g. to render
 * each slot value into a `data-lexical-slot` wrapper.
 *
 * @experimental
 */
export declare function $appendNodeToHTML(editor: LexicalEditor, node: LexicalNode, parentElement: HTMLElement | DocumentFragment, selection?: BaseSelection | null): boolean;
