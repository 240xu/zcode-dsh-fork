/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const mod = await (process.env.NODE_ENV !== 'production' ? import('./LexicalExtension.dev.mjs') : import('./LexicalExtension.prod.mjs'));
export const $applyFormatToDom = mod.$applyFormatToDom;
export const $createHorizontalRuleNode = mod.$createHorizontalRuleNode;
export const $defaultShouldInsertAfter = mod.$defaultShouldInsertAfter;
export const $getExtensionDependency = mod.$getExtensionDependency;
export const $getExtensionOutput = mod.$getExtensionOutput;
export const $getPeerDependency = mod.$getPeerDependency;
export const $isDecoratorTextNode = mod.$isDecoratorTextNode;
export const $isHorizontalRuleNode = mod.$isHorizontalRuleNode;
export const AutoFocusExtension = mod.AutoFocusExtension;
export const ClearEditorExtension = mod.ClearEditorExtension;
export const ClickAfterLastBlockExtension = mod.ClickAfterLastBlockExtension;
export const DecoratorTextExtension = mod.DecoratorTextExtension;
export const DecoratorTextNode = mod.DecoratorTextNode;
export const EditorStateExtension = mod.EditorStateExtension;
export const HorizontalRuleExtension = mod.HorizontalRuleExtension;
export const HorizontalRuleNode = mod.HorizontalRuleNode;
export const IMEExtension = mod.IMEExtension;
export const INSERT_HORIZONTAL_RULE_COMMAND = mod.INSERT_HORIZONTAL_RULE_COMMAND;
export const InitialStateExtension = mod.InitialStateExtension;
export const LexicalBuilder = mod.LexicalBuilder;
export const NestedEditorExtension = mod.NestedEditorExtension;
export const NodeSelectionDataSelectedExtension = mod.NodeSelectionDataSelectedExtension;
export const NodeSelectionExtension = mod.NodeSelectionExtension;
export const NormalizeInlineElementsExtension = mod.NormalizeInlineElementsExtension;
export const NormalizeTripleClickSelectionExtension = mod.NormalizeTripleClickSelectionExtension;
export const PreventSelectAllExtension = mod.PreventSelectAllExtension;
export const RootElementExtension = mod.RootElementExtension;
export const SelectBlockExtension = mod.SelectBlockExtension;
export const SelectionAlwaysOnDisplayExtension = mod.SelectionAlwaysOnDisplayExtension;
export const TabIndentationExtension = mod.TabIndentationExtension;
export const WatchEditableExtension = mod.WatchEditableExtension;
export const applyFormatFromStyle = mod.applyFormatFromStyle;
export const applyFormatToDom = mod.applyFormatToDom;
export const batch = mod.batch;
export const buildEditorFromExtensions = mod.buildEditorFromExtensions;
export const computed = mod.computed;
export const configExtension = mod.configExtension;
export const declarePeerDependency = mod.declarePeerDependency;
export const defineExtension = mod.defineExtension;
export const effect = mod.effect;
export const getExtensionDependencyFromEditor = mod.getExtensionDependencyFromEditor;
export const getKnownTypesAndNodes = mod.getKnownTypesAndNodes;
export const getPeerDependencyFromEditor = mod.getPeerDependencyFromEditor;
export const getPeerDependencyFromEditorOrThrow = mod.getPeerDependencyFromEditorOrThrow;
export const namedSignals = mod.namedSignals;
export const registerClearEditor = mod.registerClearEditor;
export const registerTabIndentation = mod.registerTabIndentation;
export const safeCast = mod.safeCast;
export const shallowMergeConfig = mod.shallowMergeConfig;
export const signal = mod.signal;
export const untracked = mod.untracked;
export const watchedSignal = mod.watchedSignal;