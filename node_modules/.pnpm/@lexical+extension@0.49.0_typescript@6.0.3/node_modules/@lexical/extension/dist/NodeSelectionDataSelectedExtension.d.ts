/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { type Klass, type LexicalNode } from 'lexical';
export interface NodeSelectionDataSelectedConfig {
    /**
     * The node types whose host DOM should reflect their {@link NodeSelection}
     * membership. Pass the node classes (e.g. `[CardNode, FigureNode]`).
     * Registered subclasses of these classes are matched too, resolved to their
     * own {@link LexicalNode.getType} during init (before the editor is created)
     * so the update listener never needs a runtime `instanceof`.
     */
    nodes: Klass<LexicalNode>[];
    /**
     * The attribute toggled on the matched node's host DOM while it is part of
     * a `NodeSelection`. Defaults to `'data-selected'`. The value is always
     * `'true'`; the attribute is removed when the node is no longer selected.
     */
    attribute: string;
}
/**
 * @experimental
 *
 * Mirrors {@link NodeSelection} membership onto the host DOM as an attribute
 * so CSS can render a selection outline for `ElementNode` hosts, which have
 * no `decorate()` render path of their own. Configure it per node type:
 *
 * ```ts
 * configExtension(NodeSelectionDataSelectedExtension, {nodes: [CardNode]})
 * ```
 *
 * The matched host needs a corresponding CSS rule, e.g.
 * `.lexical-card-node[data-selected='true'] { outline: ... }`.
 */
export declare const NodeSelectionDataSelectedExtension: import("lexical").LexicalExtension<NodeSelectionDataSelectedConfig, "@lexical/extension/NodeSelectionDataSelected", unknown, {
    matchTypes: Set<string>;
}>;
