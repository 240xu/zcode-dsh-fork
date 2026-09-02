/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { ImportSession } from './types';
import { type LexicalEditor, type LexicalNode } from 'lexical';
import { type CompiledDispatch } from './compileImportRules';
/**
 * Top-level walker for a compiled dispatcher. Iterates the DOM children of
 * `dom` (using the document body if a {@link Document} is passed) and
 * applies `RootSchema` to the produced lexical nodes so runs of inlines are
 * wrapped in paragraphs — same shape as the legacy `$generateNodesFromDOM`.
 *
 * @internal
 */
export declare function $runImport(dispatch: CompiledDispatch, editor: LexicalEditor, dom: Document | ParentNode, session: ImportSession): LexicalNode[];
