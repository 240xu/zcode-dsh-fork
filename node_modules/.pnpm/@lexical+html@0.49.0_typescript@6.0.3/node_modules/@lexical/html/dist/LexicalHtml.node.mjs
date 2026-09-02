/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const mod = await (process.env.NODE_ENV !== 'production' ? import('./LexicalHtml.dev.mjs') : import('./LexicalHtml.prod.mjs'));
export const $appendNodeToHTML = mod.$appendNodeToHTML;
export const $distributeInlineWrapper = mod.$distributeInlineWrapper;
export const $generateDOMFromNodes = mod.$generateDOMFromNodes;
export const $generateDOMFromRoot = mod.$generateDOMFromRoot;
export const $generateHtmlFromNodes = mod.$generateHtmlFromNodes;
export const $generateNodesFromDOM = mod.$generateNodesFromDOM;
export const $generateNodesFromDOMViaExtension = mod.$generateNodesFromDOMViaExtension;
export const $getImportContextValue = mod.$getImportContextValue;
export const $getRenderContextValue = mod.$getRenderContextValue;
export const $getSessionDOMRenderConfig = mod.$getSessionDOMRenderConfig;
export const $inlineStylesFromStyleSheets = mod.$inlineStylesFromStyleSheets;
export const $isBlockLevel = mod.$isBlockLevel;
export const $propagateTextAlignToBlockChildren = mod.$propagateTextAlignToBlockChildren;
export const $setRenderContextValue = mod.$setRenderContextValue;
export const $updateRenderContextValue = mod.$updateRenderContextValue;
export const $withImportContext = mod.$withImportContext;
export const $withRenderContext = mod.$withRenderContext;
export const BlockSchema = mod.BlockSchema;
export const CoreImportExtension = mod.CoreImportExtension;
export const CoreImportRules = mod.CoreImportRules;
export const DOMImportExtension = mod.DOMImportExtension;
export const DOMRenderExtension = mod.DOMRenderExtension;
export const HorizontalRuleImportExtension = mod.HorizontalRuleImportExtension;
export const HorizontalRuleImportRules = mod.HorizontalRuleImportRules;
export const ImportOverlays = mod.ImportOverlays;
export const ImportSource = mod.ImportSource;
export const ImportSourceDataTransfer = mod.ImportSourceDataTransfer;
export const ImportTextFormat = mod.ImportTextFormat;
export const ImportTextStyle = mod.ImportTextStyle;
export const ImportWhitespaceConfig = mod.ImportWhitespaceConfig;
export const InlineSchema = mod.InlineSchema;
export const NestedBlockSchema = mod.NestedBlockSchema;
export const RenderContextExport = mod.RenderContextExport;
export const RenderContextRoot = mod.RenderContextRoot;
export const RootSchema = mod.RootSchema;
export const contextUpdater = mod.contextUpdater;
export const contextValue = mod.contextValue;
export const createImportState = mod.createImportState;
export const createRenderState = mod.createRenderState;
export const defaultIsInline = mod.defaultIsInline;
export const defaultPreservesWhitespace = mod.defaultPreservesWhitespace;
export const defineImportRule = mod.defineImportRule;
export const defineOverlayRules = mod.defineOverlayRules;
export const domOverride = mod.domOverride;
export const isElementOfTag = mod.isElementOfTag;
export const parseSelector = mod.parseSelector;
export const sel = mod.sel;