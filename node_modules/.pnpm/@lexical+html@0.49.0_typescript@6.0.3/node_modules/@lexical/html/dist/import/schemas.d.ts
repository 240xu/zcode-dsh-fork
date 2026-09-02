/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { ChildSchema } from './types';
import { type ElementNode, type LexicalNode } from 'lexical';
/**
 * True if the node fills a block slot at the root or inside another
 * block — covers both ElementNode-style blocks (paragraph, heading,
 * quote) and block-level DecoratorNodes (HorizontalRuleNode,
 * ImageNode-as-block, etc.). Used by {@link BlockSchema},
 * {@link RootSchema}, and {@link NestedBlockSchema}.
 *
 * @experimental
 */
export declare function $isBlockLevel(node: LexicalNode): boolean;
/**
 * Distribute an inline wrapper (`LinkNode`, `MarkNode`, …) across a
 * heterogeneous run of children produced by `$importChildren`, lifting
 * any block children to the top level while keeping the wrapper around
 * the leaf inline content.
 *
 * Use from a rule whose DOM source is an inline element that the
 * browser permitted to enclose block elements — the canonical case is
 * `<a href="…"><h1>title</h1><div>body</div></a>`, which a link rule
 * wants to surface as two block siblings (heading + paragraph), each
 * with its own link wrapping the original inline content. Schemas
 * can't express this because they reason about a parent's children
 * only — they cannot lift the parent out of itself.
 *
 * For each top-level child:
 * - **Inline children** are collected into runs; each run is wrapped
 *   in a single fresh wrapper (from `$makeWrapper()`).
 * - **Block children** are descended into: their own children are
 *   recursively distributed with `$makeWrapper`, then re-attached so
 *   the block keeps its position at the top level.
 *
 * The returned list will contain a mix of blocks and wrapped inline
 * runs. The enclosing schema (typically {@link BlockSchema}) will
 * then package those inline wrappers into paragraphs as usual.
 *
 * @experimental
 */
export declare function $distributeInlineWrapper(children: readonly LexicalNode[], $makeWrapper: () => ElementNode): LexicalNode[];
/**
 * Apply a {@link ChildSchema} to a flat list of children produced by
 * `$importChildren`. Walks the list once, partitions into accepted vs.
 * rejected runs, packages or drops rejected runs, then runs `$finalize`.
 *
 * @internal
 */
export declare function $applySchema(schema: ChildSchema, children: LexicalNode[], parent: LexicalNode | null, domParent: Node | null): LexicalNode[];
/**
 * Apply a parent DOM element's `text-align` (when set to one of the
 * supported {@link ElementFormatType} values) to each block-level child
 * Lexical node that does not yet have its own format.
 *
 * Mirrors the part of the legacy `wrapContinuousInlines` that wrote
 * `node.setFormat(textAlign)` onto pre-existing block children when the
 * DOM parent carried `style.textAlign`. Pair with
 * {@link $paragraphPackageRun} (which carries the same propagation onto
 * paragraphs synthesized around inline runs) to fully replicate the
 * legacy behavior on a run of mixed children.
 *
 * @experimental
 */
export declare function $propagateTextAlignToBlockChildren(children: LexicalNode[], domParent: Node | null): LexicalNode[];
/**
 * Default schema for block-level positions (root of the document, the body
 * of a block element node). Accepts block lexical nodes; packages runs of
 * inline children into fresh paragraph nodes.
 *
 * @experimental
 */
export declare const BlockSchema: ChildSchema;
/**
 * Schema for inline-only positions (the body of an inline lexical node such
 * as a link). Accepts non-block lexical nodes; runs of block children are
 * dropped (`onReject: 'drop'` is the default).
 *
 * @experimental
 */
export declare const InlineSchema: ChildSchema;
/**
 * Schema for nested block positions — the equivalent of the legacy
 * `ArtificialNode__DO_NOT_USE` flow used when a block DOM element appears
 * inside another block lexical ancestor. Accepts block nodes; runs of inline
 * children are emitted with a line break between consecutive runs (instead
 * of being wrapped in a paragraph, which would introduce an extra level of
 * nesting).
 *
 * @experimental
 */
export declare const NestedBlockSchema: ChildSchema;
/**
 * Schema for the topmost level of `$generateNodesFromDOM`. Identical to
 * {@link BlockSchema}; aliased for clarity at the entry point and so it can
 * be overridden separately in the future (e.g. to synthesize a `ListNode`
 * around runs of orphan `ListItemNode`s).
 *
 * @experimental
 */
export declare const RootSchema: ChildSchema;
