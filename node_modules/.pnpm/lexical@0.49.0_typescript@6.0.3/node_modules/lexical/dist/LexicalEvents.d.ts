/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { LexicalEditor } from './LexicalEditor';
import type { NodeKey } from './LexicalNode';
export declare function registerDefaultCommandHandlers(editor: LexicalEditor): void;
/** @internal */
export declare function stopLexicalPropagation(event: Event): void;
export type EventHandler = (event: Event, editor: LexicalEditor) => void;
export declare function addRootElementEvents(rootElement: HTMLElement, editor: LexicalEditor): void;
export declare function removeRootElementEvents(rootElement: HTMLElement): void;
/** @internal */
export declare function markSelectionChangeFromDOMUpdate(editor: LexicalEditor): void;
/** @internal */
export declare function markCollapsedSelectionFormat(editor: LexicalEditor, format: number, style: string, offset: number, key: NodeKey, timeStamp: number): void;
