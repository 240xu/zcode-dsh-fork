/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { LexicalPrivateDOM } from './LexicalNode';
import type { ElementNode } from './nodes/LexicalElementNode';
/**
 * Base class for DOM slots — a pointer to the content-bearing element of a
 * node's DOM, plus optional `before` / `after` boundaries marking where the
 * lexical-managed content sits inside that element.
 *
 * For ElementNode children management see {@link ElementDOMSlot}. For
 * non-Element nodes (TextNode, LineBreakNode, DecoratorNode) the slot still
 * supports an internal `before` / `after` so subclasses can prepend or
 * append non-lexical siblings around the content node and the reconciler /
 * `setTextContent` route the actual content through the slot.
 *
 * @experimental
 */
export declare class DOMSlot<T extends HTMLElement = HTMLElement> {
    /** The content-bearing element of the node's DOM. */
    readonly element: T;
    /** Upper boundary: the lexical-managed range ends before this node. */
    readonly before: Node | null;
    /** Lower boundary: the lexical-managed range starts after this node. */
    readonly after: Node | null;
    constructor(element: T, before?: Node | undefined | null, after?: Node | undefined | null);
    /** Return a new slot with `before` updated. */
    withBefore(before: Node | undefined | null): DOMSlot<T>;
    /** Return a new slot with `after` updated. */
    withAfter(after: Node | undefined | null): DOMSlot<T>;
    /** Return a new slot with `element` updated. */
    withElement<ElementType extends HTMLElement>(element: ElementType): DOMSlot<ElementType>;
    /**
     * Insert the given node before `this.before` (if defined) or append it to
     * `this.element` otherwise. Subclasses may override to respect additional
     * boundaries (e.g. `ElementDOMSlot` also keeps the managed line break at
     * the end).
     */
    insertChild(dom: Node): this;
    /**
     * Remove the given child from `this.element`. Throws if it was not a child.
     */
    removeChild(dom: Node): this;
    /**
     * Replace `prevDom` with `dom`. Throws if `prevDom` is not a child.
     */
    replaceChild(dom: Node, prevDom: Node): this;
    /**
     * Returns the first managed child (the first node in
     * `this.element` that is not a non-lexical prelude / decoration), or
     * `null` if there is none. Subclasses may override to also skip
     * reconciler-managed scaffolding such as the managed line break.
     */
    getFirstChild(): ChildNode | null;
    /**
     * @internal
     *
     * The leading-boundary counterpart to {@link getInsertionAnchor}: the node
     * the lexical-managed range starts immediately after (its `nextSibling` is
     * the first managed child), or `null` when managed children begin at
     * `this.element.firstChild`. The base slot uses `this.after`; subclasses
     * extend it to skip leading non-lexical scaffolding (e.g. the block cursor).
     */
    getFirstChildAnchor(): Node | null;
    /**
     * Map a DOM selection point landing at or inside `leafDOM` (the node's
     * keyed DOM) to whether the caret is positioned BEFORE or AFTER the
     * node in document order. The default implementation derives the
     * boundary from `this.element`'s index inside `leafDOM`:
     *
     * - When `this.element === leafDOM` (no wrap exposed an inner content
     *   element via `withElement`): only a DOM caret directly on
     *   `leafDOM` at offset 0 counts as "before". Matches the historical
     *   decorator rule.
     * - When `this.element !== leafDOM` (wrap pattern that exposed the
     *   inner content element via `withElement`, e.g. a `<br>` inside a
     *   decoration `<span>`): caret positions at or before the content
     *   element are "before", later positions are "after". Handles
     *   nested wraps by walking each side up to its top-level child of
     *   `leafDOM`.
     *
     * Symmetric with {@link ElementDOMSlot.resolveChildIndex}, which
     * performs the analogous mapping for ElementNode children. Together
     * they let the slot abstraction own all DOM-offset to lexical-offset
     * translation.
     *
     * @internal
     */
    resolveLeafPosition(leafDOM: HTMLElement, initialDOM: Node, initialOffset: number): 'before' | 'after';
    /**
     * @internal
     *
     * The node managed children are inserted before, or `null` to append.
     * Subclasses widen this to reserve trailing scaffolding (e.g.
     * {@link ElementDOMSlot} keeps the managed line break last).
     */
    getInsertionAnchor(): Node | null;
}
/**
 * A utility class for managing the DOM children of an ElementNode.
 *
 * Extends {@link DOMSlot} with ElementNode-specific scaffolding — the
 * reconciler-managed line break that keeps empty elements selectable, and
 * the offset / index resolution helpers needed when mapping DOM selections
 * onto lexical positions. The base `before` / `after` boundaries and the
 * children mutation helpers (`insertChild`, `removeChild`, …) live on
 * {@link DOMSlot}.
 */
export declare class ElementDOMSlot<T extends HTMLElement = HTMLElement> extends DOMSlot<T> {
    /** Return a new slot with `before` updated, preserving subclass type. */
    withBefore(before: Node | undefined | null): ElementDOMSlot<T>;
    /** Return a new slot with `after` updated, preserving subclass type. */
    withAfter(after: Node | undefined | null): ElementDOMSlot<T>;
    /** Return a new slot with `element` updated, preserving subclass type. */
    withElement<ElementType extends HTMLElement>(element: ElementType): ElementDOMSlot<ElementType>;
    /**
     * @internal
     */
    getInsertionAnchor(): Node | null;
    /**
     * @internal
     *
     * Extends the leading boundary to skip the editor's transient block cursor
     * when it sits at the head of the managed range (a collapsed element
     * selection at offset 0), mirroring how {@link getInsertionAnchor} extends
     * the trailing boundary past the managed line break. Only ElementNodes host
     * a block cursor among their children, so the base slot stays editor-free.
     */
    getFirstChildAnchor(): Node | null;
    /**
     * @internal
     */
    getManagedLineBreak(): Exclude<LexicalPrivateDOM['__lexicalLineBreak'], undefined>;
    /** @internal */
    setManagedLineBreak(lineBreakType: null | 'empty' | 'line-break' | 'decorator'): void;
    /** @internal */
    removeManagedLineBreak(): void;
    /** @internal */
    insertManagedLineBreak(webkitHack: boolean): void;
    /**
     * @internal
     *
     * The DOM child index at which the first managed child appears — i.e. the
     * count of leading non-lexical nodes (the `this.after` region, plus the
     * block cursor when it sits at the head). Walks forward from the start,
     * stopping at the first managed child, or at the trailing boundary
     * (`this.before` / the managed line break via {@link getInsertionAnchor})
     * when there are no managed children.
     */
    getFirstChildOffset(): number;
    /**
     * @internal
     */
    resolveChildIndex(element: ElementNode, elementDOM: HTMLElement, initialDOM: Node, initialOffset: number): [node: ElementNode, idx: number];
}
export declare function indexPath(root: HTMLElement, child: Node): number[];
