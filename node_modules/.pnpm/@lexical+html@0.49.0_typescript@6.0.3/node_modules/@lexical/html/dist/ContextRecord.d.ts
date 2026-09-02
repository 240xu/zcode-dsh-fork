/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { AnyContextConfigPairOrUpdater, AnyContextSymbol, ContextConfig, ContextConfigPair, ContextConfigUpdater, ContextRecord } from './types';
import { type LexicalEditor } from 'lexical';
type WithContext<Ctx extends AnyContextSymbol> = {
    [K in Ctx]?: undefined | ContextRecord<Ctx>;
};
/**
 * @experimental
 *
 * The LexicalEditor with context
 */
export type EditorContext = {
    editor: LexicalEditor;
} & WithContext<AnyContextSymbol>;
/**
 * @experimental
 *
 * @param contextRecord The ContextRecord
 * @param cfg The configuration
 * @returns The value or defaultValue of cfg
 */
export declare function getContextValue<Ctx extends AnyContextSymbol, V>(contextRecord: undefined | ContextRecord<Ctx>, cfg: ContextConfig<Ctx, V>): V;
/**
 * @experimental
 *
 * Read and delete cfg from this layer of context
 *
 * @param contextRecord The ContextRecord
 * @param cfg The configuration
 * @returns The value of the configuration that was removed
 */
export declare function popOwnContextValue<Ctx extends AnyContextSymbol, V>(contextRecord: ContextRecord<Ctx>, cfg: ContextConfig<Ctx, V>): undefined | V;
/**
 * @experimental
 *
 * Get the value without a default
 *
 * @param contextRecord The ContextRecord
 * @param cfg The configuration
 * @returns The current value in this context or `undefined` if not set
 */
export declare function getOwnContextValue<Ctx extends AnyContextSymbol, V>(contextRecord: ContextRecord<Ctx>, cfg: ContextConfig<Ctx, V>): undefined | V;
/**
 * @experimental
 *
 * @param sym The symbol for this ContextRecord (e.g. DOMRenderContextSymbol)
 * @param editor The editor
 * @returns The current context or undefined
 */
export declare function getContextRecord<Ctx extends AnyContextSymbol>(sym: Ctx, editor: LexicalEditor): undefined | ContextRecord<Ctx>;
/**
 * Construct a new context from a parent context and pairs
 *
 * @param pairs The pairs and updaters to build the context from
 * @param parent The parent context
 * @returns The new context
 */
export declare function contextFromPairs<Ctx extends AnyContextSymbol>(pairs: readonly AnyContextConfigPairOrUpdater<Ctx>[], parent: undefined | ContextRecord<Ctx>): undefined | ContextRecord<Ctx>;
/**
 * Create a context config pair that sets a value in the render context.
 * @experimental
 */
export declare function contextValue<Ctx extends AnyContextSymbol, V>(cfg: ContextConfig<Ctx, V>, value: V): ContextConfigPair<Ctx, V>;
/**
 * Create a context config updater that transforms a value in the render context.
 * @experimental
 */
export declare function contextUpdater<Ctx extends AnyContextSymbol, V>(cfg: ContextConfig<Ctx, V>, updater: (prev: V) => V): ContextConfigUpdater<Ctx, V>;
/**
 * @internal
 * @experimental
 * @__NO_SIDE_EFFECTS__
 */
export declare function $withFullContext<Ctx extends AnyContextSymbol, T>(sym: Ctx, contextRecord: ContextRecord<Ctx>, f: () => T, editor?: LexicalEditor): T;
/**
 * @internal
 * @experimental
 * @__NO_SIDE_EFFECTS__
 */
export declare function $withContext<Ctx extends AnyContextSymbol>(sym: Ctx, $defaults?: (editor: LexicalEditor) => undefined | ContextRecord<Ctx>): (cfg: readonly AnyContextConfigPairOrUpdater<Ctx>[], editor?: LexicalEditor) => (<T>(f: () => T) => T);
/**
 * @experimental
 * @internal
 * @__NO_SIDE_EFFECTS__
 */
export declare function createContextState<Tag extends symbol, V>(tag: Tag, name: string, getDefaultValue: () => V, isEqual?: (a: V, b: V) => boolean): ContextConfig<Tag, V>;
export {};
