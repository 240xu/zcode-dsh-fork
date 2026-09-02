/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const mod = await (process.env.NODE_ENV !== 'production' ? import('./LexicalClipboard.dev.mjs') : import('./LexicalClipboard.prod.mjs'));
export const $exportMimeTypeFromSelection = mod.$exportMimeTypeFromSelection;
export const $generateJSONFromSelectedNodes = mod.$generateJSONFromSelectedNodes;
export const $generateNodesFromSerializedNodes = mod.$generateNodesFromSerializedNodes;
export const $getClipboardDataFromSelection = mod.$getClipboardDataFromSelection;
export const $getHtmlContent = mod.$getHtmlContent;
export const $getLexicalContent = mod.$getLexicalContent;
export const $handlePlainTextDrop = mod.$handlePlainTextDrop;
export const $handleRichTextDrop = mod.$handleRichTextDrop;
export const $insertDataTransferForPlainText = mod.$insertDataTransferForPlainText;
export const $insertDataTransferForRichText = mod.$insertDataTransferForRichText;
export const $insertGeneratedNodes = mod.$insertGeneratedNodes;
export const $writeDragSourceToDataTransfer = mod.$writeDragSourceToDataTransfer;
export const ClipboardDOMImportExtension = mod.ClipboardDOMImportExtension;
export const ClipboardImportExtension = mod.ClipboardImportExtension;
export const DEFAULT_IMPORT_MIME_TYPE = mod.DEFAULT_IMPORT_MIME_TYPE;
export const DEFAULT_IMPORT_MIME_TYPE_PRIORITY = mod.DEFAULT_IMPORT_MIME_TYPE_PRIORITY;
export const GetClipboardDataExtension = mod.GetClipboardDataExtension;
export const caretFromPoint = mod.caretFromPoint;
export const copyToClipboard = mod.copyToClipboard;
export const setLexicalClipboardDataTransfer = mod.setLexicalClipboardDataTransfer;