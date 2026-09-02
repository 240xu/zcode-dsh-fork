/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { Klass } from './LexicalEditor';
import type { GetStaticNodeOwnConfig, LexicalNode, NodeKey, SlotChildNode, SlotHostNode } from './LexicalNode';
import type { DecoratorNode } from './nodes/LexicalDecoratorNode';
import type { ElementNode } from './nodes/LexicalElementNode';
/**
 * Shared empty slot map. Reads coalesce here when a host's `__slots` is null
 * (lazy allocation), so non-slot trees don't pay a per-node allocation cost.
 *
 * @internal
 */
export declare const EMPTY_SLOTS: ReadonlyMap<string, NodeKey>;
/**
 * Shape predicate: true when `node` carries the host's `__slots` field — i.e.
 * it is an {@link ElementNode} or a {@link DecoratorNode}. Narrows to
 * {@link SlotHostNode} so the mutation helpers' compile-time host requirement
 * is satisfied. This is a type guard only; the value-level invariant on what
 * may actually be slotted is enforced by {@link $setSlot} (shadow-root
 * ElementNode or non-inline DecoratorNode).
 *
 * @experimental
 */
export declare function $isSlotHost(node: LexicalNode): node is LexicalNode & SlotHostNode;
/**
 * Shape predicate: true when `node` carries the child's `__slotHost` field —
 * i.e. it is an {@link ElementNode} or a {@link DecoratorNode}. Narrows to
 * {@link SlotChildNode}. This is a type guard only; {@link $setSlot} rejects
 * inline values at runtime. The slot link acts as a virtual shadow root, so
 * any non-inline block — shadow root or not — can occupy a slot.
 *
 * @experimental
 */
export declare function $isSlotChild(node: LexicalNode): node is LexicalNode & SlotChildNode;
/**
 * Returns the key of the host this node is slotted into, or null when the node
 * is not slotted. Accepts any node and narrows internally so generic callers
 * (removal guard, up-walk, GC, caret) don't have to. Exposes a raw key, so it
 * stays internal to the package; public callers use {@link $getSlotHost}.
 *
 * @internal
 */
export declare function $getSlotHostKey(node: LexicalNode): null | NodeKey;
/**
 * Returns the host element when this node occupies one of its named slots,
 * or null if this node is not slotted. The up-link is kept separate from
 * {@link LexicalNode.getParent} so the slot boundary behaves like a shadow
 * root.
 *
 * @experimental
 */
export declare function $getSlotHost(node: LexicalNode): ElementNode | DecoratorNode<unknown> | null;
/**
 * Returns the slot name this node occupies on its host, or null when the node
 * is not a slot value. Mirrors {@link LexicalNode#getIndexWithinParent} for
 * slot children — answers "which named slot does this node sit in?".
 *
 * @experimental
 */
export declare function $getSlotNameWithinHost(slotChild: LexicalNode): string | null;
/**
 * Returns the slot value (the "slot frame") whose isolated subtree contains
 * `node`, or `node` itself when it is a slot value, or null when the node is
 * not inside any slot. The walk follows `getParent()` and naturally stops at a
 * slot value because a slotted node's `__parent` is null. Non-slot trees have
 * `__slotHost === null` everywhere, so this always returns null there.
 *
 * Selection-driven exporters use this to find the isolated subtree a
 * RangeSelection lives in (a selection inside a slot never contains the host,
 * so a root-children walk alone would miss it).
 *
 * @experimental
 */
export declare function $getSlotFrame(node: LexicalNode): LexicalNode | null;
/**
 * Returns the latest slot map (name -> child key, insertion order). Exposes raw
 * keys, so it stays internal to the package; public callers use
 * {@link $getSlotNames} / {@link $getSlot}.
 *
 * @internal
 */
export declare function $getSlotMap(node: LexicalNode): ReadonlyMap<string, NodeKey>;
/**
 * Returns the names of this node's occupied slots, in insertion order. Empty
 * when the node hosts no slots.
 *
 * @experimental
 */
export declare function $getSlotNames(node: LexicalNode): string[];
type DeclaredSlotNames<T extends LexicalNode> = GetStaticNodeOwnConfig<T> extends {
    slots: infer S extends readonly string[];
} ? S[number] : never;
/**
 * Slot-name hint for a host node's slot accessors: the names declared in the
 * host class's `$config().slots` (for editor autocomplete) unioned with `string`
 * — every string is still accepted (slots take undeclared names at runtime), the
 * declared names just surface as suggestions. A class declaring no slots, or a
 * subclass that inherits them without redeclaring, resolves to plain `string`.
 *
 * @experimental
 */
export type SlotName<T extends LexicalNode> = DeclaredSlotNames<T> | (string & {});
/**
 * Returns the node occupying the named slot, or null if the slot is empty.
 * Slots are a shadow-root-isolated channel kept separate from children; see
 * {@link $getSlotHost} for the reverse up-link.
 *
 * @experimental
 */
export declare function $getSlot<T extends LexicalNode>(node: T, name: SlotName<T>): LexicalNode | null;
/**
 * Returns the canonical slot declaration for a node class: the `slots` array
 * from the nearest {@link StaticNodeConfigValue} in its prototype chain (a
 * subclass redeclaration overrides its ancestors'), or an empty array when
 * nothing is declared. The declaration is an ordering vocabulary, not a
 * schema — occupied names outside it are still valid and sort after the
 * declared names in code-unit order.
 *
 * @experimental named-slots
 */
export declare function getDeclaredSlots(klass: Klass<LexicalNode>): readonly string[];
/**
 * @internal
 *
 * Concatenated text of a node's named slots, read slots-first (in slot Map
 * order). Shared by the getTextContent implementations so ElementNode and
 * DecoratorNode hosts fold their slot text the same way; a node with no
 * slots returns the empty string. A free function (not a LexicalNode method)
 * so the framework-owned name cannot collide with a subclass's own members.
 */
export declare function $getSlotsTextContent(node: LexicalNode): string;
/**
 * @internal
 *
 * Size counterpart to {@link $getSlotsTextContent}, summing each slot's
 * getTextContentSize (which a slot subtree may override independently of its
 * text length) slots-first.
 */
export declare function $getSlotsTextContentSize(node: LexicalNode): number;
/**
 * Places `node` into the named slot of `host`, replacing any existing value
 * under that name. Move semantics, mirroring `ElementNode.append` /
 * `insertBefore`: the value is detached from wherever it currently lives —
 * a child of another element, or a slot on this or another host (a node's two
 * up-links, `__parent` and `__slotHost`, are mutually exclusive, so it holds
 * exactly one) — before linking, so re-slotting never requires an explicit
 * remove first. The replaced value, if any, is detached.
 *
 * A slot value must be a non-inline {@link ElementNode} or a non-inline
 * {@link DecoratorNode}: the slot link itself acts as a virtual shadow root
 * between the host and the value, so the value does not need to be a shadow
 * root — a plain block (e.g. a ParagraphNode subclass serving as a
 * single-line field) is a valid slot value, and selection, traversal, and
 * editing treat its slot boundary exactly like a shadow-root boundary.
 *
 * `host` is constrained to {@link SlotHostNode} so a non-host is rejected at
 * compile time.
 *
 * @experimental
 */
export declare function $setSlot<T extends LexicalNode & SlotHostNode>(host: T, name: SlotName<T>, node: LexicalNode): T;
/**
 * Removes the named slot from `host`, detaching its value (its slot up-link is
 * cleared). No-op if the slot is empty. `host` is constrained to
 * {@link SlotHostNode} so a non-host is rejected at compile time.
 *
 * @experimental
 */
export declare function $removeSlot<T extends LexicalNode & SlotHostNode>(host: T, name: SlotName<T>): T;
/**
 * @internal
 *
 * Reverse guard of {@link $setSlot}'s cycle invariant for the children
 * channel: inserting `child` under `parent` must not close a cycle through a
 * slot up-link (e.g. `slotValue.append(host)` would make `host.__parent`
 * reach `slotValue` while `slotValue.__slotHost` reaches `host`, looping
 * isAttached/GC — and hanging the commit itself). Called from the child
 * attachment points (ElementNode.splice, insertBefore/insertAfter/replace).
 * __DEV__-only and gated on the editor slot latch: the up-walk is an O(depth)
 * cost on the hot children path, and like {@link $setSlot}'s direct guard it
 * only catches direct local programmer error (collab/JSON can't alias a host
 * into its own slot value), so production matches the unguarded children
 * channel's own ancestor-append behavior.
 */
export declare function $errorOnSlotCycleChild(parent: LexicalNode, child: LexicalNode): void;
export {};
