/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { type CreateEditorArgs, type InitialEditorConfig, type KlassConstructor, type LexicalNode } from 'lexical';
export interface KnownTypesAndNodes {
    types: Set<string>;
    nodes: Set<KlassConstructor<typeof LexicalNode>>;
}
/**
 * Get the sets of nodes and types registered in the
 * {@link InitialEditorConfig}. This is to be used when an extension
 * needs to register optional behavior if some node or type is present.
 *
 * @param config The InitialEditorConfig (accessible from an extension's init)
 * @returns The known types and nodes as Sets
 */
export declare function getKnownTypesAndNodes(config: Pick<InitialEditorConfig, 'nodes'>): KnownTypesAndNodes;
export declare function getNodeConfig(config: Pick<InitialEditorConfig, 'nodes'>): NonNullable<CreateEditorArgs['nodes']>;
