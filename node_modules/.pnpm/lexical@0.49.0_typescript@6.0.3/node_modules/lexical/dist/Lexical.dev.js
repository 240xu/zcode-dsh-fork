/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Do not require this module directly! Use normal `invariant` calls.

function formatDevErrorMessage(message) {
  throw new Error(message);
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const CAN_USE_DOM = typeof window !== 'undefined' &&
// eslint-disable-next-line no-restricted-syntax
typeof window.document !== 'undefined' &&
// eslint-disable-next-line no-restricted-syntax
typeof window.document.createElement !== 'undefined';
const documentMode =
// eslint-disable-next-line no-restricted-syntax
CAN_USE_DOM && 'documentMode' in document ? document.documentMode : null;
const IS_APPLE = CAN_USE_DOM && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const IS_FIREFOX = CAN_USE_DOM && /^(?!.*Seamonkey)(?=.*Firefox).*/i.test(navigator.userAgent);
const CAN_USE_BEFORE_INPUT = CAN_USE_DOM && 'InputEvent' in window && !documentMode ?
// eslint-disable-next-line no-restricted-syntax
'getTargetRanges' in new window.InputEvent('input') : false;
const IS_IOS = CAN_USE_DOM && /iPad|iPhone|iPod/.test(navigator.userAgent) &&
// eslint-disable-next-line no-restricted-syntax
!window.MSStream;
const IS_ANDROID = CAN_USE_DOM && /Android/.test(navigator.userAgent);

// Exclude Android — Android WebView's UA contains "Version/X.X ... Safari/537.36"
// which falsely matches the Safari regex, activating wrong composition code paths.
const IS_SAFARI = CAN_USE_DOM && /Version\/[\d.]+.*Safari/.test(navigator.userAgent) && !IS_ANDROID;

// Keep these in case we need to use them in the future.
// export const IS_WINDOWS: boolean = CAN_USE_DOM && /Win/.test(navigator.platform);
const IS_CHROME = CAN_USE_DOM && /^(?=.*Chrome).*/i.test(navigator.userAgent);
// export const canUseTextInputEvent: boolean = CAN_USE_DOM && 'TextEvent' in window && !documentMode;

const IS_ANDROID_CHROME = CAN_USE_DOM && IS_ANDROID && IS_CHROME;
const IS_APPLE_WEBKIT = CAN_USE_DOM && /AppleWebKit\/[\d.]+/.test(navigator.userAgent) && IS_APPLE && !IS_CHROME;

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */


// DOM
const DOM_ELEMENT_TYPE = 1;
const DOM_TEXT_TYPE = 3;
const DOM_DOCUMENT_TYPE = 9;
const DOM_DOCUMENT_FRAGMENT_TYPE = 11;

// Reconciling
const NO_DIRTY_NODES = 0;
const HAS_DIRTY_NODES = 1;
const FULL_RECONCILE = 2;

// Text node modes
const IS_NORMAL = 0;
const IS_TOKEN = 1;
const IS_SEGMENTED = 2;
// IS_INERT = 3

// Text node formatting
const IS_BOLD = 1;
const IS_ITALIC = 1 << 1;
const IS_STRIKETHROUGH = 1 << 2;
const IS_UNDERLINE = 1 << 3;
const IS_CODE = 1 << 4;
const IS_SUBSCRIPT = 1 << 5;
const IS_SUPERSCRIPT = 1 << 6;
const IS_HIGHLIGHT = 1 << 7;
const IS_LOWERCASE = 1 << 8;
const IS_UPPERCASE = 1 << 9;
const IS_CAPITALIZE = 1 << 10;
const IS_ALL_FORMATTING = IS_BOLD | IS_ITALIC | IS_STRIKETHROUGH | IS_UNDERLINE | IS_CODE | IS_SUBSCRIPT | IS_SUPERSCRIPT | IS_HIGHLIGHT | IS_LOWERCASE | IS_UPPERCASE | IS_CAPITALIZE;

// Text node details
const IS_DIRECTIONLESS = 1;
const IS_UNMERGEABLE = 1 << 1;

// Element node formatting
const IS_ALIGN_LEFT = 1;
const IS_ALIGN_CENTER = 2;
const IS_ALIGN_RIGHT = 3;
const IS_ALIGN_JUSTIFY = 4;
const IS_ALIGN_START = 5;
const IS_ALIGN_END = 6;

// Reconciliation
const NON_BREAKING_SPACE = '\u00A0';
const ZERO_WIDTH_SPACE = '\u200b';

// For iOS/Safari we use a non breaking space, otherwise the cursor appears
// overlapping the composed text.
const COMPOSITION_SUFFIX = IS_SAFARI || IS_IOS || IS_APPLE_WEBKIT ? NON_BREAKING_SPACE : ZERO_WIDTH_SPACE;
const DOUBLE_LINE_BREAK = '\n\n';

// For FF, we need to use a non-breaking space, or it gets composition
// in a stuck state.
const COMPOSITION_START_CHAR = IS_FIREFOX ? NON_BREAKING_SPACE : COMPOSITION_SUFFIX;
const RTL = '\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC';
const LTR = 'A-Za-z\u00C0-\u00D6\u00D8-\u00F6' + '\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF\u200E\u2C00-\uFB1C' + '\uFE00-\uFE6F\uFEFD-\uFFFF';

// eslint-disable-next-line no-misleading-character-class
const RTL_REGEX = new RegExp('^[^' + LTR + ']*[' + RTL + ']');
// eslint-disable-next-line no-misleading-character-class
const LTR_REGEX = new RegExp('^[^' + RTL + ']*[' + LTR + ']');
const TEXT_TYPE_TO_FORMAT = {
  bold: IS_BOLD,
  capitalize: IS_CAPITALIZE,
  code: IS_CODE,
  highlight: IS_HIGHLIGHT,
  italic: IS_ITALIC,
  lowercase: IS_LOWERCASE,
  strikethrough: IS_STRIKETHROUGH,
  subscript: IS_SUBSCRIPT,
  superscript: IS_SUPERSCRIPT,
  underline: IS_UNDERLINE,
  uppercase: IS_UPPERCASE
};
const DETAIL_TYPE_TO_DETAIL = {
  directionless: IS_DIRECTIONLESS,
  unmergeable: IS_UNMERGEABLE
};
const ELEMENT_TYPE_TO_FORMAT = {
  center: IS_ALIGN_CENTER,
  end: IS_ALIGN_END,
  justify: IS_ALIGN_JUSTIFY,
  left: IS_ALIGN_LEFT,
  right: IS_ALIGN_RIGHT,
  start: IS_ALIGN_START
};
const ELEMENT_FORMAT_TO_TYPE = {
  [IS_ALIGN_CENTER]: 'center',
  [IS_ALIGN_END]: 'end',
  [IS_ALIGN_JUSTIFY]: 'justify',
  [IS_ALIGN_LEFT]: 'left',
  [IS_ALIGN_RIGHT]: 'right',
  [IS_ALIGN_START]: 'start'
};
const TEXT_MODE_TO_TYPE = {
  normal: IS_NORMAL,
  segmented: IS_SEGMENTED,
  token: IS_TOKEN
};
const TEXT_TYPE_TO_MODE = {
  [IS_NORMAL]: 'normal',
  [IS_SEGMENTED]: 'segmented',
  [IS_TOKEN]: 'token'
};
const NODE_STATE_KEY = '$';
const PROTOTYPE_CONFIG_METHOD = '$config';

/**
 * The editor has at most one block cursor element
 * ({@link LexicalEditor._blockCursorElement}) — a transient, non-lexical
 * element the selection layer inserts among an ElementNode's children when a
 * collapsed element selection is adjacent to a node that can't host the caret
 * (a block decorator, or a non-empty-capable block). Slots must skip it so it
 * is never mistaken for managed content. There is only ever one, read from the
 * active editor.
 */
function $getActiveBlockCursorElement() {
  return $getEditor()._blockCursorElement;
}

/**
 * A slot value renders slots-first into its own `[data-lexical-slot]`
 * container, prepended ahead of the host's linked-list children. The leading
 * boundary skips these so they are never counted as managed children.
 */

function isSlotContainerDOM(node) {
  return node !== null && node.nodeType === 1 && node.hasAttribute('data-lexical-slot');
}

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
class DOMSlot {
  /** The content-bearing element of the node's DOM. */
  element;
  /** Upper boundary: the lexical-managed range ends before this node. */
  before;
  /** Lower boundary: the lexical-managed range starts after this node. */
  after;
  constructor(element, before, after) {
    this.element = element;
    this.before = before || null;
    this.after = after || null;
  }
  /** Return a new slot with `before` updated. */
  withBefore(before) {
    return new DOMSlot(this.element, before, this.after);
  }
  /** Return a new slot with `after` updated. */
  withAfter(after) {
    return new DOMSlot(this.element, this.before, after);
  }
  /** Return a new slot with `element` updated. */
  withElement(element) {
    if (this.element === element) {
      return this;
    }
    return new DOMSlot(element, this.before, this.after);
  }
  /**
   * Insert the given node before `this.before` (if defined) or append it to
   * `this.element` otherwise. Subclasses may override to respect additional
   * boundaries (e.g. `ElementDOMSlot` also keeps the managed line break at
   * the end).
   */
  insertChild(dom) {
    const before = this.getInsertionAnchor();
    if (!(before === null || before.parentElement === this.element)) {
      formatDevErrorMessage(`DOMSlot.insertChild: before is not in element`);
    }
    this.element.insertBefore(dom, before);
    return this;
  }
  /**
   * Remove the given child from `this.element`. Throws if it was not a child.
   */
  removeChild(dom) {
    if (!(dom.parentElement === this.element)) {
      formatDevErrorMessage(`DOMSlot.removeChild: dom is not in element`);
    }
    this.element.removeChild(dom);
    return this;
  }
  /**
   * Replace `prevDom` with `dom`. Throws if `prevDom` is not a child.
   */
  replaceChild(dom, prevDom) {
    if (!(prevDom.parentElement === this.element)) {
      formatDevErrorMessage(`DOMSlot.replaceChild: prevDom is not in element`);
    }
    this.element.replaceChild(dom, prevDom);
    return this;
  }
  /**
   * Returns the first managed child (the first node in
   * `this.element` that is not a non-lexical prelude / decoration), or
   * `null` if there is none. Subclasses may override to also skip
   * reconciler-managed scaffolding such as the managed line break.
   */
  getFirstChild() {
    const anchor = this.getFirstChildAnchor();
    const firstChild = anchor ? anchor.nextSibling : this.element.firstChild;
    return firstChild === this.getInsertionAnchor() ? null : firstChild;
  }
  /**
   * @internal
   *
   * The leading-boundary counterpart to {@link getInsertionAnchor}: the node
   * the lexical-managed range starts immediately after (its `nextSibling` is
   * the first managed child), or `null` when managed children begin at
   * `this.element.firstChild`. The base slot uses `this.after`; subclasses
   * extend it to skip leading non-lexical scaffolding (e.g. the block cursor).
   */
  getFirstChildAnchor() {
    return this.after;
  }
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
  resolveLeafPosition(leafDOM, initialDOM, initialOffset) {
    if (this.element === leafDOM) {
      return initialDOM === leafDOM && initialOffset === 0 ? 'before' : 'after';
    }
    const innerChild = $topLevelChildOf(leafDOM, this.element);
    if (innerChild === null) {
      return 'after';
    }
    const innerIndex = Array.prototype.indexOf.call(leafDOM.childNodes, innerChild);
    if (innerIndex < 0) {
      return 'after';
    }
    if (initialDOM === leafDOM) {
      return initialOffset <= innerIndex ? 'before' : 'after';
    }
    const initialChild = $topLevelChildOf(leafDOM, initialDOM);
    if (initialChild === null) {
      return 'after';
    }
    const childIndex = Array.prototype.indexOf.call(leafDOM.childNodes, initialChild);
    return childIndex >= 0 && childIndex <= innerIndex ? 'before' : 'after';
  }

  /**
   * @internal
   *
   * The node managed children are inserted before, or `null` to append.
   * Subclasses widen this to reserve trailing scaffolding (e.g.
   * {@link ElementDOMSlot} keeps the managed line break last).
   */
  getInsertionAnchor() {
    return this.before;
  }
}
function $topLevelChildOf(parent, descendant) {
  let node = descendant;
  while (node !== null && node.parentNode !== parent) {
    node = node.parentNode;
  }
  return node;
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
class ElementDOMSlot extends DOMSlot {
  /** Return a new slot with `before` updated, preserving subclass type. */
  withBefore(before) {
    return new ElementDOMSlot(this.element, before, this.after);
  }
  /** Return a new slot with `after` updated, preserving subclass type. */
  withAfter(after) {
    return new ElementDOMSlot(this.element, this.before, after);
  }
  /** Return a new slot with `element` updated, preserving subclass type. */
  withElement(element) {
    if (this.element === element) {
      return this;
    }
    return new ElementDOMSlot(element, this.before, this.after);
  }
  /**
   * @internal
   */
  getInsertionAnchor() {
    return super.getInsertionAnchor() || this.getManagedLineBreak();
  }
  /**
   * @internal
   *
   * Extends the leading boundary to skip the editor's transient block cursor
   * when it sits at the head of the managed range (a collapsed element
   * selection at offset 0), mirroring how {@link getInsertionAnchor} extends
   * the trailing boundary past the managed line break. Only ElementNodes host
   * a block cursor among their children, so the base slot stays editor-free.
   */
  getFirstChildAnchor() {
    let anchor = super.getFirstChildAnchor();
    // Advance past the prepended slot containers (a separate channel, not
    // managed children) so the first slot is never mistaken for the first
    // child — which would shift every child DOM index by the slot count.
    let node = anchor ? anchor.nextSibling : this.element.firstChild;
    while (isSlotContainerDOM(node)) {
      anchor = node;
      node = node.nextSibling;
    }
    const firstChild = anchor ? anchor.nextSibling : this.element.firstChild;
    return firstChild !== null && firstChild === $getActiveBlockCursorElement() ? firstChild : anchor;
  }
  /**
   * @internal
   */
  getManagedLineBreak() {
    const element = this.element;
    return element.__lexicalLineBreak || null;
  }
  /** @internal */
  setManagedLineBreak(lineBreakType) {
    const element = this.element;
    element.__lexicalLastChildKind = lineBreakType;
    if (lineBreakType === null) {
      this.removeManagedLineBreak();
    } else {
      const webkitHack = lineBreakType === 'decorator' && (IS_APPLE_WEBKIT || IS_IOS || IS_SAFARI);
      this.insertManagedLineBreak(webkitHack);
    }
  }

  /** @internal */
  removeManagedLineBreak() {
    const br = this.getManagedLineBreak();
    if (br) {
      const element = this.element;
      const sibling = br.nodeName === 'IMG' ? br.nextSibling : null;
      if (sibling) {
        element.removeChild(sibling);
      }
      element.removeChild(br);
      element.__lexicalLineBreak = undefined;
    }
  }
  /** @internal */
  insertManagedLineBreak(webkitHack) {
    const prevBreak = this.getManagedLineBreak();
    if (prevBreak) {
      if (webkitHack === (prevBreak.nodeName === 'IMG')) {
        return;
      }
      this.removeManagedLineBreak();
    }
    const element = this.element;
    const before = this.before;
    const br = $getDocument().createElement('br');
    br.setAttribute('data-lexical-managed-linebreak', 'true');
    element.insertBefore(br, before);
    if (webkitHack) {
      const img = $getDocument().createElement('img');
      img.setAttribute('data-lexical-managed-linebreak', 'true');
      img.style.setProperty('display', 'inline', 'important');
      img.style.setProperty('border', '0px', 'important');
      img.style.setProperty('margin', '0px', 'important');
      img.alt = '';
      element.insertBefore(img, br);
      element.__lexicalLineBreak = img;
    } else {
      element.__lexicalLineBreak = br;
    }
  }

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
  getFirstChildOffset() {
    const firstChild = this.getFirstChild();
    const insertionAnchor = this.getInsertionAnchor();
    let i = 0;
    for (let node = this.element.firstChild; node !== null && node !== firstChild && node !== insertionAnchor; node = node.nextSibling) {
      i++;
    }
    return i;
  }

  /**
   * @internal
   */
  resolveChildIndex(element, elementDOM, initialDOM, initialOffset) {
    if (initialDOM === this.element) {
      // Map a raw DOM child index (`initialOffset`) to a lexical child index by
      // counting the managed children in DOM positions
      // `[firstChildOffset, initialOffset)`, skipping the editor's block cursor
      // when it is interleaved between two block children (it occupies a DOM
      // slot but is not a lexical child). `firstChildOffset` already accounts
      // for leading scaffolding (the `this.after` region and a head cursor);
      // the clamp keeps the result within the element's lexical range.
      const firstChildOffset = this.getFirstChildOffset();
      const blockCursor = $getActiveBlockCursorElement();
      const childNodes = this.element.childNodes;
      const limit = Math.min(initialOffset, childNodes.length);
      let idx = 0;
      for (let i = firstChildOffset; i < limit; i++) {
        if (childNodes[i] !== blockCursor) {
          idx++;
        }
      }
      return [element, Math.min(idx, element.getChildrenSize())];
    }
    // The resolved offset must be before or after the children
    const initialPath = indexPath(elementDOM, initialDOM);
    initialPath.push(initialOffset);
    const elementPath = indexPath(elementDOM, this.element);
    let offset = element.getIndexWithinParent();
    for (let i = 0; i < elementPath.length; i++) {
      const target = initialPath[i];
      const source = elementPath[i];
      if (target === undefined || target < source) {
        break;
      } else if (target > source) {
        offset += 1;
        break;
      }
    }
    return [element.getParentOrThrow(), offset];
  }
}
function indexPath(root, child) {
  const path = [];
  let node = child;
  for (; node !== root && node !== null; node = node.parentNode) {
    let i = 0;
    for (let sibling = node.previousSibling; sibling !== null; sibling = sibling.previousSibling) {
      i++;
    }
    path.push(i);
  }
  if (!(node === root)) {
    formatDevErrorMessage(`indexPath: root is not a parent of child`);
  }
  return path.reverse();
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// `"0.49.0+dev.cjs"` is statically replaced with the build-specific
// version string in a Rollup build, and a consumer's bundler `define` can
// inject it the same way — so the exact `"0.49.0+dev.cjs"` member
// expression must be preserved for that substitution to match. Reading it
// inside a try/catch lets the source be consumed directly (via the `source`
// export condition) in a browser bundle, where `process` is undefined and
// nothing replaced the reference, without throwing a ReferenceError; it falls
// back to the literal below instead. The literal is regenerated by
// `pnpm run update-version`.
let envLexicalVersion;
try {
  envLexicalVersion = "0.49.0+dev.cjs";
} catch (_unused) {
  // `process` is not defined in some browser bundles; use the fallback.
}
const LEXICAL_VERSION = envLexicalVersion ?? '"<unknown>+source"';

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
class DequeSet {
  _front = new Set();
  _back = new Set();
  _cache;
  get size() {
    return this._front.size + this._back.size;
  }
  addBack(v) {
    delete this._cache;
    if (!this._front.has(v)) {
      this._back.add(v);
    }
    return this;
  }
  addFront(v) {
    delete this._cache;
    if (!this._back.has(v)) {
      this._front.add(v);
    }
    return this;
  }
  delete(v) {
    delete this._cache;
    return this._front.delete(v) || this._back.delete(v);
  }
  toArray() {
    const arr = Array.from(this._front).reverse();
    for (const v of this._back) {
      arr.push(v);
    }
    return arr;
  }
  toReadonlyArray() {
    this._cache = this._cache || this.toArray();
    return this._cache;
  }
  [Symbol.iterator]() {
    return this.toReadonlyArray()[Symbol.iterator]();
  }
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const TOMBSTONE = null;
const GEN_MAP_SIZE_THRESHOLD = 1000;

/**
 * @internal
 *
 * Create a copy of the given Map, returning either a fresh Map or a clone
 * of a copy-on-write GenMap depending on the source type and size.
 *
 * - If the source is already a GenMap, returns `map.clone()` (O(1)).
 * - If the source is a plain Map below the threshold, returns
 *   `new Map(map)` to avoid the GenMap overhead on small docs.
 * - Otherwise wraps a fresh GenMap around the source.
 */
function cloneMap(map, minGenMapSize = GEN_MAP_SIZE_THRESHOLD) {
  if (map instanceof GenMap) {
    return map.clone();
  }
  if (map.size < minGenMapSize) {
    return new Map(map);
  }
  return new GenMap().init(new Map(map), undefined, map.size);
}

/**
 * @internal
 *
 * A copy-on-write Map suitable for cloning large collections cheaply.
 *
 * Before being written to, a GenMap shares its `_old` and `_nursery` Maps
 * with the GenMap it was cloned from. On first write it either compacts
 * (folds `_nursery` into a new `_old`) or shallow-copies `_nursery`,
 * isolating subsequent writes from sibling clones.
 *
 * `_old` is the immutable snapshot from the most recent compaction;
 * `_nursery` holds writes since the last compaction (deletions stored as
 * `TOMBSTONE`). `_mutable` tracks whether `_nursery` may be written to
 * directly or must first be cloned.
 *
 * Implements the full `Map<K, V>` interface; methods not documented
 * individually behave as their native `Map` counterparts.
 */
class GenMap {
  _mutable = false;
  _old = undefined;
  _nursery = undefined;
  _size = 0;

  /**
   * Returns a new GenMap that initially shares `_old` and `_nursery`
   * with this one. Marks both as not-mutable so the next write on either
   * side triggers a copy-on-write of the nursery before mutating.
   */
  clone() {
    this._mutable = false;
    return new GenMap().init(this._old, this._nursery, this._size);
  }
  init(old, nursery, size) {
    this._old = old;
    this._nursery = nursery;
    this._size = size;
    return this;
  }
  get size() {
    return this._size;
  }
  has(key) {
    return this.get(key) !== undefined;
  }

  /**
   * Returns the raw value for `key`, including TOMBSTONE for keys deleted
   * since the last compaction. Used internally to distinguish "missing"
   * from "deleted" without doing a second lookup.
   */
  getWithTombstone(key) {
    const v = this._nursery && this._nursery.get(key);
    if (v !== undefined) {
      return v;
    }
    return this._old && this._old.get(key);
  }
  get(key) {
    const v = this.getWithTombstone(key);
    return v === TOMBSTONE ? undefined : v;
  }
  shouldCompact() {
    return this._nursery !== undefined && this._nursery.size * 2 > this._size;
  }

  /**
   * Returns the nursery for in-place writes. If this GenMap is currently
   * sharing its nursery with an ancestor clone, this either compacts (if
   * the nursery has grown large enough) or makes a shallow copy.
   */
  getNursery() {
    if (!this._mutable || !this._nursery) {
      this.compact();
      this._nursery = new Map(this._nursery);
      this._mutable = true;
    }
    return this._nursery;
  }

  /**
   * Fold the nursery into a new `_old` snapshot when it has grown large
   * enough that lookup overhead outweighs the savings from sharing.
   * Triggered automatically from `getNursery` once `_nursery.size * 2 >
   * _size`; can be forced via `compact(true)`.
   */
  compact(force = false) {
    if (this._nursery && this._nursery.size > 0 && (force || this.shouldCompact())) {
      const compact = new Map(this._old);
      for (const [k, v] of this._nursery) {
        if (v !== TOMBSTONE) {
          compact.set(k, v);
        } else {
          compact.delete(k);
        }
      }
      this._old = compact;
      this._nursery = undefined;
    }
    this._mutable = false;
    return this;
  }
  set(key, value) {
    const v = this.getWithTombstone(key);
    if (v === value) {
      return this;
    }
    const nursery = this.getNursery();
    if (v === TOMBSTONE || v === undefined) {
      this._size++;
      if (v === TOMBSTONE) {
        // Match native Map semantics where `delete(k); set(k, v)`
        // re-inserts the key at the end of iteration order.
        nursery.delete(key);
      }
    }
    nursery.set(key, value);
    return this;
  }
  delete(key) {
    const deleted = this.has(key);
    if (deleted) {
      this.getNursery().set(key, TOMBSTONE);
      this._size--;
    }
    return deleted;
  }
  getOrInsert(key, defaultValue) {
    const existing = this.get(key);
    if (existing !== undefined) {
      return existing;
    }
    this.set(key, defaultValue);
    return defaultValue;
  }
  getOrInsertComputed(key, computer) {
    const existing = this.get(key);
    if (existing !== undefined) {
      return existing;
    }
    const value = computer(key);
    this.set(key, value);
    return value;
  }
  clear() {
    this._mutable = false;
    this._old = undefined;
    this._nursery = undefined;
    this._size = 0;
  }
  *keys() {
    for (const pair of this.entries()) {
      yield pair[0];
    }
  }
  *values() {
    for (const pair of this.entries()) {
      yield pair[1];
    }
  }
  *entries() {
    const nursery = this._nursery;
    const old = this._old;
    if (old) {
      for (const pair of old) {
        const k = pair[0];
        const v = nursery ? nursery.get(k) : undefined;
        if (v === TOMBSTONE) {
          continue;
        } else if (v !== undefined) {
          pair[1] = v;
        }
        yield pair;
      }
    }
    if (nursery) {
      for (const pair of nursery) {
        if (pair[1] !== TOMBSTONE && !(old && old.has(pair[0]))) {
          yield pair;
        }
      }
    }
  }
  forEach(callbackfn,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  thisArg) {
    if (thisArg !== undefined) {
      callbackfn = callbackfn.bind(thisArg);
    }
    for (const [k, v] of this.entries()) {
      callbackfn(v, k, this);
    }
  }
  get [Symbol.toStringTag]() {
    return 'GenMap';
  }
  [Symbol.iterator]() {
    return this.entries();
  }
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

function $garbageCollectDetachedDecorators(editor, pendingEditorState) {
  const currentDecorators = editor._decorators;
  const pendingDecorators = editor._pendingDecorators;
  let decorators = pendingDecorators || currentDecorators;
  const nodeMap = pendingEditorState._nodeMap;
  let key;
  for (key in decorators) {
    if (!nodeMap.has(key)) {
      if (decorators === currentDecorators) {
        decorators = cloneDecorators(editor);
      }
      delete decorators[key];
    }
  }
}
function $garbageCollectDetachedDeepChildNodes(node, parentKey, prevNodeMap, nodeMap, nodeMapDelete, dirtyNodes) {
  if ($isElementNode(node)) {
    let child = node.getFirstChild();
    while (child !== null) {
      const childKey = child.__key;
      // TODO Revise condition below, redundant? LexicalNode already cleans up children when moving Nodes
      if (child.__parent === parentKey) {
        if ($isElementNode(child) || $isSlotHost(child) && child.__slots !== null) {
          $garbageCollectDetachedDeepChildNodes(child, childKey, prevNodeMap, nodeMap, nodeMapDelete, dirtyNodes);
        }

        // If we have created a node and it was dereferenced, then also
        // remove it from out dirty nodes Set.
        if (!prevNodeMap.has(childKey)) {
          dirtyNodes.delete(childKey);
        }
        nodeMapDelete.push(childKey);
      }
      child = child.getNextSibling();
    }
  }

  // Slot nodes are not in the linked-list child channel; reach them through
  // the slot map, gating on the slot host the mirror of the __parent check.
  // Slots hang off any host (element or decorator), so this runs regardless
  // of the host node type.
  for (const slotKey of $isSlotHost(node) && node.__slots !== null ? node.__slots.values() : []) {
    const slotNode = nodeMap.get(slotKey);
    if (slotNode !== undefined && $isSlotChild(slotNode) && slotNode.__slotHost === parentKey) {
      if ($isElementNode(slotNode) || $isSlotHost(slotNode) && slotNode.__slots !== null) {
        $garbageCollectDetachedDeepChildNodes(slotNode, slotKey, prevNodeMap, nodeMap, nodeMapDelete, dirtyNodes);
      }
      if (!prevNodeMap.has(slotKey)) {
        dirtyNodes.delete(slotKey);
      }
      nodeMapDelete.push(slotKey);
    }
  }
}
function $garbageCollectDetachedNodes(prevEditorState, editorState, dirtyLeaves, dirtyElements) {
  const prevNodeMap = prevEditorState._nodeMap;
  const nodeMap = editorState._nodeMap;
  // Store dirtyElements in a queue for later deletion; deleting dirty subtrees too early will
  // hinder accessing .__next on child nodes
  const nodeMapDelete = [];
  for (const [nodeKey] of dirtyElements) {
    const node = nodeMap.get(nodeKey);
    if (node !== undefined) {
      // Garbage collect node and its children if they exist
      if (!node.isAttached()) {
        if ($isElementNode(node)) {
          $garbageCollectDetachedDeepChildNodes(node, nodeKey, prevNodeMap, nodeMap, nodeMapDelete, dirtyElements);
        }
        // If we have created a node and it was dereferenced, then also
        // remove it from out dirty nodes Set.
        if (!prevNodeMap.has(nodeKey)) {
          dirtyElements.delete(nodeKey);
        }
        nodeMapDelete.push(nodeKey);
      }
    }
  }
  for (const nodeKey of dirtyLeaves) {
    const node = nodeMap.get(nodeKey);
    if (node !== undefined && !node.isAttached()) {
      // A decorator host is a leaf, so the element deep-walk above never
      // reaches its slots; collect them here to avoid orphaning the slot
      // subtree. Deletion is deferred to the shared queue so the walk can
      // still read the slot nodes. When a host is in dirtyElements and one of
      // its slot values is also dirty, the two loops can both push the same
      // slot subtree key into nodeMapDelete — that redundancy is harmless
      // because nodeMap.delete is idempotent and the dirtyNodes.delete calls
      // are too.
      if ($isSlotHost(node) && node.__slots !== null) {
        $garbageCollectDetachedDeepChildNodes(node, nodeKey, prevNodeMap, nodeMap, nodeMapDelete, dirtyLeaves);
      }
      if (!prevNodeMap.has(nodeKey)) {
        dirtyLeaves.delete(nodeKey);
      }
      nodeMapDelete.push(nodeKey);
    }
  }
  for (const nodeKey of nodeMapDelete) {
    nodeMap.delete(nodeKey);
  }

  // Clear the composition key if it points at a node that just got collected.
  // Without this, isComposing() keeps reporting true after a remote yjs
  // update (or any host removal) drops the composing TextNode — most often
  // observable when the composing node sits inside a slot subtree that gets
  // collected wholesale via the dual-channel slot GC above.
  const editor = getActiveEditor();
  const compositionKey = editor._compositionKey;
  if (compositionKey !== null && !nodeMap.has(compositionKey)) {
    editor._compositionKey = null;
  }
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// The time between a text entry event and the mutation observer firing.
const TEXT_MUTATION_VARIANCE = 100;
let isProcessingMutations = false;
let lastTextEntryTimeStamp = 0;
function getIsProcessingMutations() {
  return isProcessingMutations;
}
function updateTimeStamp(event) {
  lastTextEntryTimeStamp = event.timeStamp;
}
function initTextEntryListener(editor) {
  if (lastTextEntryTimeStamp === 0) {
    getWindow(editor).addEventListener('textInput', updateTimeStamp, true);
  }
}
function isManagedLineBreak(dom, target, editor) {
  const isBR = dom.nodeName === 'BR';
  const lexicalLineBreak = target.__lexicalLineBreak;
  return lexicalLineBreak && (dom === lexicalLineBreak || isBR && dom.previousSibling === lexicalLineBreak) || isBR && getNodeKeyFromDOMNode(dom, editor) !== undefined;
}
function getLastSelection(editor) {
  return editor.read('latest', () => {
    const selection = $getSelection();
    return selection !== null ? selection.clone() : null;
  });
}
function $handleTextMutation(target, node, editor) {
  const domSelection = getDOMSelection(getWindow(editor));
  const domSelectionPoints = domSelection && getDOMSelectionPoints(domSelection, editor._rootElement);
  let anchorOffset = null;
  let focusOffset = null;
  if (domSelectionPoints !== null && domSelectionPoints.anchorNode === target) {
    anchorOffset = domSelectionPoints.anchorOffset;
    focusOffset = domSelectionPoints.focusOffset;
  }
  const text = target.nodeValue;
  if (text !== null) {
    $updateTextNodeFromDOMContent(node, text, anchorOffset, focusOffset, false);
  }
}
function shouldUpdateTextNodeFromMutation(selection, targetDOM, targetNode) {
  if ($isRangeSelection(selection)) {
    const anchorNode = selection.anchor.getNode();
    if (anchorNode.is(targetNode) && selection.format !== anchorNode.getFormat()) {
      return false;
    }
  }
  return isDOMTextNode(targetDOM) && targetNode.isAttached();
}
function $getNearestManagedNodePairFromDOMNode(startingDOM, editor, editorState) {
  for (let dom = startingDOM; dom && !isDOMUnmanaged(dom); dom = getParentElement(dom)) {
    const key = getNodeKeyFromDOMNode(dom, editor);
    if (key !== undefined) {
      const node = $getNodeByKey(key, editorState);
      if (node) {
        // All decorator nodes are unmanaged
        return $isDecoratorNode(node) || !isHTMLElement(dom) ? undefined : [dom, node];
      }
    }
  }
}
function flushMutations(editor, mutations, observer) {
  isProcessingMutations = true;
  const shouldFlushTextMutations = performance.now() - lastTextEntryTimeStamp > TEXT_MUTATION_VARIANCE;
  try {
    updateEditorSync(editor, () => {
      const selection = $getSelection() || getLastSelection(editor);
      const badDOMTargets = new Map();
      // We use the current editor state, as that reflects what is
      // actually "on screen".
      const currentEditorState = editor._editorState;
      const blockCursorElement = editor._blockCursorElement;
      let shouldRevertSelection = false;
      let possibleTextForFirefoxPaste = '';
      for (let i = 0; i < mutations.length; i++) {
        const mutation = mutations[i];
        const type = mutation.type;
        const targetDOM = mutation.target;
        const pair = $getNearestManagedNodePairFromDOMNode(targetDOM, editor, currentEditorState);
        if (!pair) {
          continue;
        }
        const [nodeDOM, targetNode] = pair;
        if (type === 'characterData') {
          // Text mutations are deferred and passed to mutation listeners to be
          // processed outside of the Lexical engine.
          if (
          // TODO there is an edge case here if a mutation happens too quickly
          //      after text input, it may never be handled since we do not
          //      track the ignored mutations in any way
          shouldFlushTextMutations && $isTextNode(targetNode) && isDOMTextNode(targetDOM) && shouldUpdateTextNodeFromMutation(selection, targetDOM, targetNode)) {
            $handleTextMutation(targetDOM, targetNode, editor);
          }
        } else if (type === 'childList') {
          shouldRevertSelection = true;
          // We attempt to "undo" any changes that have occurred outside
          // of Lexical. We want Lexical's editor state to be source of truth.
          // To the user, these will look like no-ops.
          const addedDOMs = mutation.addedNodes;
          for (let s = 0; s < addedDOMs.length; s++) {
            const addedDOM = addedDOMs[s];
            const node = $getNodeFromDOMNode(addedDOM);
            const parentDOM = addedDOM.parentNode;
            if (parentDOM != null && addedDOM !== blockCursorElement && node === null && !isManagedLineBreak(addedDOM, parentDOM, editor) &&
            // @experimental named-slots. Slot containers are keyless
            // reconciler scaffolding: a flush that observes one being
            // parked in its host or relocated by an explicit mount must
            // not evict it as foreign DOM. Gated on the editor slot latch so
            // a non-slot editor still evicts foreign DOM that happens to
            // carry a `data-lexical-slot` attribute.
            !(editor._slotsUsed && isHTMLElement(addedDOM) && addedDOM.hasAttribute('data-lexical-slot')) &&
            // Skip externally-added DOM that's explicitly opted out of
            // mutation tracking (e.g. an extension-rendered decoration
            // inside a TextNode's span, like the autocomplete ghost).
            !isDOMUnmanaged(addedDOM)) {
              if (IS_FIREFOX) {
                const possibleText = (isHTMLElement(addedDOM) ? addedDOM.innerText : null) || addedDOM.nodeValue;
                if (possibleText) {
                  possibleTextForFirefoxPaste += possibleText;
                }
              }
              parentDOM.removeChild(addedDOM);
            }
          }
          const removedDOMs = mutation.removedNodes;
          const removedDOMsLength = removedDOMs.length;
          if (removedDOMsLength > 0) {
            let unremovedBRs = 0;
            for (let s = 0; s < removedDOMsLength; s++) {
              const removedDOM = removedDOMs[s];
              if (isManagedLineBreak(removedDOM, targetDOM, editor) || blockCursorElement === removedDOM) {
                targetDOM.appendChild(removedDOM);
                unremovedBRs++;
              }
            }
            if (removedDOMsLength !== unremovedBRs) {
              badDOMTargets.set(nodeDOM, targetNode);
            }
          }
        }
      }

      // Now we process each of the unique target nodes, attempting
      // to restore their contents back to the source of truth, which
      // is Lexical's "current" editor state. This is basically like
      // an internal revert on the DOM.
      if (badDOMTargets.size > 0) {
        for (const [nodeDOM, targetNode] of badDOMTargets) {
          targetNode.reconcileObservedMutation(nodeDOM, editor);
        }
      }

      // Capture all the mutations made during this function. This
      // also prevents us having to process them on the next cycle
      // of onMutation, as these mutations were made by us.
      const records = observer.takeRecords();

      // Check for any random auto-added <br> elements, and remove them.
      // These get added by the browser when we undo the above mutations
      // and this can lead to a broken UI.
      if (records.length > 0) {
        for (let i = 0; i < records.length; i++) {
          const record = records[i];
          const addedNodes = record.addedNodes;
          const target = record.target;
          for (let s = 0; s < addedNodes.length; s++) {
            const addedDOM = addedNodes[s];
            const parentDOM = addedDOM.parentNode;
            if (parentDOM != null && addedDOM.nodeName === 'BR' && !isManagedLineBreak(addedDOM, target, editor)) {
              parentDOM.removeChild(addedDOM);
            }
          }
        }

        // Clear any of those removal mutations
        observer.takeRecords();
      }
      if (selection !== null) {
        if (shouldRevertSelection) {
          $setSelection(selection);
        }
        if (IS_FIREFOX && isFirefoxClipboardEvents(editor)) {
          selection.insertRawText(possibleTextForFirefoxPaste);
        }
      }
    });
  } finally {
    isProcessingMutations = false;
  }
}
function flushRootMutations(editor) {
  const observer = editor._observer;
  if (observer !== null) {
    const mutations = observer.takeRecords();
    flushMutations(editor, mutations, observer);
  }
}
function initMutationObserver(editor) {
  initTextEntryListener(editor);
  editor._observer = new MutationObserver((mutations, observer) => {
    flushMutations(editor, mutations, observer);
  });
}

/**
 * Read the state directly from the given object without `node.getLatest()`.
 * Safe to use outside of editor state context or to read a previous version,
 * equivalent to reading the property directly.
 */
const NODE_STATE_DIRECT = 'direct';
/**
 * Use `node.getLatest()` before reading the state, per the lexical convention
 * of only working with the latest version of a node.
 */
const NODE_STATE_LATEST = 'latest';

/**
 * Get the value type (V) from a StateConfig
 */

/**
 * Get the key type (K) from a StateConfig
 */

/**
 * A value type, or an updater for that value type. For use with
 * {@link $setState} or any user-defined wrappers around it.
 */

/**
 * A type alias to make it easier to define setter methods on your node class
 *
 * @example
 * ```ts
 * const fooState = createState("foo", { parse: ... });
 * class MyClass extends TextNode {
 *   // ...
 *   setFoo(valueOrUpdater: StateValueOrUpdater<typeof fooState>): this {
 *     return $setState(this, fooState, valueOrUpdater);
 *   }
 * }
 * ```
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-enable @typescript-eslint/no-explicit-any */

// Read a node's own config out of its $config() record. Preferentially read it
// from the STATIC_NODE_CONFIG accessor (see {@link GetStaticNodeOwnConfig}),
// which resolves the most-derived own config directly — including for an
// abstract base class keyed by a symbol, which has no string `type` to index by.
// A record produced by the {@link BaseStaticNodeConfig} fallback (a node that
// declares no `extends`, or a legacy node) sets no accessor; for those we fall
// back to resolving the own `type` (see {@link GetStaticNodeType}) and indexing
// by it. The own type is read through a mapped type (`{[P in Type]: ...}[Type]`)
// so that the indexed access resolves against the concrete key literal rather
// than the record's broad string index signature when `T` is still generic.

/**
 * The NodeState JSON produced by this LexicalNode
 */

/**
 * Configure a value to be used with StateConfig.
 *
 * The value type should be inferred from the definition of parse.
 *
 * If the value type is not JSON serializable, then unparse must also be provided.
 *
 * Values should be treated as immutable, much like React.useState. Mutating
 * stored values directly will cause unpredictable behavior, is not supported,
 * and may trigger errors in the future.
 *
 * @example
 * ```ts
 * const numberOrNullState = createState('numberOrNull', {parse: (v) => typeof v === 'number' ? v : null});
 * //    ^? State<'numberOrNull', StateValueConfig<number | null>>
 * const numberState = createState('number', {parse: (v) => typeof v === 'number' ? v : 0});
 * //    ^? State<'number', StateValueConfig<number>>
 * ```
 *
 * Only the parse option is required, it is generally not useful to
 * override `unparse` or `isEqual`. However, if you are using
 * non-primitive types such as Array, Object, Date, or something
 * more exotic then you would want to override this. In these
 * cases you might want to reach for third party libraries.
 *
 * @example
 * ```ts
 * const isoDateState = createState('isoDate', {
 *   parse: (v): null | Date => {
 *     const date = typeof v === 'string' ? new Date(v) : null;
 *     return date && !isNaN(date.valueOf()) ? date : null;
 *   }
 *   isEqual: (a, b) => a === b || (a && b && a.valueOf() === b.valueOf()),
 *   unparse: (v) => v && v.toString()
 * });
 * ```
 *
 * You may find it easier to write a parse function using libraries like
 * zod, valibot, ajv, Effect, TypeBox, etc. perhaps with a wrapper function.
 */

/**
 * The return value of {@link createState}, for use with
 * {@link $getState} and {@link $setState}.
 */
class StateConfig {
  /** The string key used when serializing this state to JSON */
  key;
  /** The parse function from the StateValueConfig passed to createState */
  parse;
  /**
   * The unparse function from the StateValueConfig passed to createState,
   * with a default that is simply a pass-through that assumes the value is
   * JSON serializable.
   */
  unparse;
  /**
   * An equality function from the StateValueConfig, with a default of
   * Object.is.
   */
  isEqual;
  /**
   * The result of `stateValueConfig.parse(undefined)`, which is computed only
   * once and used as the default value. When the current value `isEqual` to
   * the `defaultValue`, it will not be serialized to JSON.
   */
  defaultValue;
  resetOnCopyNode;
  constructor(key, stateValueConfig) {
    this.key = key;
    this.parse = stateValueConfig.parse.bind(stateValueConfig);
    this.unparse = (stateValueConfig.unparse || coerceToJSON).bind(stateValueConfig);
    this.isEqual = (stateValueConfig.isEqual || Object.is).bind(stateValueConfig);
    this.defaultValue = this.parse(undefined);
    this.resetOnCopyNode = stateValueConfig.resetOnCopyNode || false;
  }
}

/**
 * For advanced use cases, using this type is not recommended unless
 * it is required (due to TypeScript's lack of features like
 * higher-kinded types).
 *
 * A {@link StateConfig} type with any key and any value that can be
 * used in situations where the key and value type can not be known,
 * such as in a generic constraint when working with a collection of
 * StateConfig.
 *
 * {@link StateConfigKey} and {@link StateConfigValue} will be
 * useful when this is used as a generic constraint.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any

/**
 * Create a StateConfig for the given string key and StateValueConfig.
 *
 * The key must be locally unique. In dev you will get a key collision error
 * when you use two separate StateConfig on the same node with the same key.
 *
 * The returned StateConfig value should be used with {@link $getState} and
 * {@link $setState}.
 *
 * @param key The key to use
 * @param valueConfig Configuration for the value type
 * @returns a StateConfig
 *
 * @__NO_SIDE_EFFECTS__
 */
function createState(key, valueConfig) {
  return new StateConfig(key, valueConfig);
}

/**
 * The accessor for working with node state. This will read the value for the
 * state on the given node, and will return `stateConfig.defaultValue` if the
 * state has never been set on this node.
 *
 * The `version` parameter is optional and should generally be {@link NODE_STATE_LATEST},
 * consistent with the behavior of other node methods and functions,
 * but for certain use cases such as `updateDOM` you may have a need to
 * use {@link NODE_STATE_DIRECT} to read the state from a previous version of the node.
 *
 * For very advanced use cases, you can expect that {@link NODE_STATE_DIRECT} does not
 * require an editor state, just like directly accessing other properties
 * of a node without an accessor (e.g. `textNode.__text`).
 *
 * @param node Any LexicalNode
 * @param stateConfig The configuration of the state to read
 * @param version The default value {@link NODE_STATE_LATEST} will read the latest version of the node state, {@link NODE_STATE_DIRECT} will read the version that is stored on this LexicalNode which not reflect the version used in the current editor state
 * @returns The current value from the state, or the default value provided by the configuration.
 */
function $getState(node, stateConfig, version = NODE_STATE_LATEST) {
  const latestOrDirectNode = version === NODE_STATE_LATEST ? node.getLatest() : node;
  const state = latestOrDirectNode.__state;
  if (state) {
    $checkCollision(node, stateConfig, state);
    return state.getValue(stateConfig);
  }
  return stateConfig.defaultValue;
}

/**
 * Given two versions of a node and a stateConfig, compare their state values
 * using `$getState(nodeVersion, stateConfig, NODE_STATE_DIRECT)`.
 * If the values are equal according to `stateConfig.isEqual`, return `null`,
 * otherwise return `[value, prevValue]`.
 *
 * This is useful for implementing updateDOM. Note that the `NODE_STATE_DIRECT`
 * version argument is used for both nodes.
 *
 * @param node Any LexicalNode
 * @param prevNode A previous version of node
 * @param stateConfig The configuration of the state to read
 * @returns `[value, prevValue]` if changed, otherwise `null`
 */
function $getStateChange(node, prevNode, stateConfig) {
  const value = $getState(node, stateConfig, NODE_STATE_DIRECT);
  const prevValue = $getState(prevNode, stateConfig, NODE_STATE_DIRECT);
  return stateConfig.isEqual(value, prevValue) ? null : [value, prevValue];
}

/**
 * Set the state defined by stateConfig on node. Like with `React.useState`
 * you may directly specify the value or use an updater function that will
 * be called with the previous value of the state on that node (which will
 * be the `stateConfig.defaultValue` if not set).
 *
 * When an updater function is used, the node will only be marked dirty if
 * `stateConfig.isEqual(prevValue, value)` is false.
 *
 * @example
 * ```ts
 * const toggle = createState('toggle', {parse: Boolean});
 * // set it direction
 * $setState(node, counterState, true);
 * // use an updater
 * $setState(node, counterState, (prev) => !prev);
 * ```
 *
 * @param node The LexicalNode to set the state on
 * @param stateConfig The configuration for this state
 * @param valueOrUpdater The value or updater function
 * @returns node
 */
function $setState(node, stateConfig, valueOrUpdater) {
  errorOnReadOnly();
  let value;
  if (typeof valueOrUpdater === 'function') {
    const latest = node.getLatest();
    const prevValue = $getState(latest, stateConfig);
    value = valueOrUpdater(prevValue);
    if (stateConfig.isEqual(prevValue, value)) {
      return latest;
    }
  } else {
    value = valueOrUpdater;
  }
  const writable = node.getWritable();
  const state = $getWritableNodeState(writable);
  $checkCollision(node, stateConfig, state);
  state.updateFromKnown(stateConfig, value);
  return writable;
}

/**
 * @internal
 *
 * Register the config to this node's sharedConfigMap and throw an exception in
 * `__DEV__` when a collision is detected.
 */
function $checkCollision(node, stateConfig, state) {
  {
    const collision = state.sharedNodeState.sharedConfigMap.get(stateConfig.key);
    if (collision !== undefined && collision !== stateConfig) {
      {
        formatDevErrorMessage(`$setState: State key collision ${JSON.stringify(stateConfig.key)} detected in ${node.constructor.name} node with type ${node.getType()} and key ${node.getKey()}. Only one StateConfig with a given key should be used on a node.`);
      }
    }
  }
}

/**
 * @internal
 *
 * Opaque state to be stored on the editor's RegisterNode for use by NodeState
 */

/**
 * @internal
 *
 * Create the state to store on RegisteredNode
 */
function createSharedNodeState(nodeConfig) {
  const sharedConfigMap = new Map();
  const flatKeys = new Set();
  for (const {
    ownNodeConfig
  } of iterStaticNodeConfigChain(typeof nodeConfig === 'function' ? nodeConfig : nodeConfig.replace)) {
    if (ownNodeConfig && ownNodeConfig.stateConfigs) {
      for (const requiredStateConfig of ownNodeConfig.stateConfigs) {
        let stateConfig;
        if ('stateConfig' in requiredStateConfig) {
          stateConfig = requiredStateConfig.stateConfig;
          if (requiredStateConfig.flat) {
            flatKeys.add(stateConfig.key);
          }
        } else {
          stateConfig = requiredStateConfig;
        }
        sharedConfigMap.set(stateConfig.key, stateConfig);
      }
    }
  }
  return {
    flatKeys,
    sharedConfigMap
  };
}
/**
 * Keys that must never be written into an {@link UnknownStateRecord} from
 * serialized (potentially untrusted) input. Writing a `__proto__` entry would
 * re-parent the record's prototype, and because {@link NodeState.getValue}
 * resolves keys with the `in` operator (which walks the prototype chain) an
 * attacker could otherwise inject arbitrary state values via a crafted
 * `__proto__`. These are never produced by {@link createState}.
 */
const UNSAFE_STATE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
/**
 * @internal
 *
 * A Map of string keys to state configurations to be shared across nodes
 * and/or node versions.
 */

/**
 * @internal
 */
class NodeState {
  /**
   * @internal
   *
   * Track the (versioned) node that this NodeState was created for, to
   * facilitate copy-on-write for NodeState. When a LexicalNode is cloned,
   * it will *reference* the NodeState from its prevNode. From the nextNode
   * you can continue to read state without copying, but the first $setState
   * will trigger a copy of the prevNode's NodeState with the node property
   * updated.
   */
  node;

  /**
   * @internal
   *
   * State that has already been parsed in a get state, so it is safe. (can be returned with
   * just a cast since the proof was given before).
   *
   * Note that it uses StateConfig, so in addition to (1) the CURRENT VALUE, it has access to
   * (2) the State key (3) the DEFAULT VALUE and (4) the PARSE FUNCTION
   */
  knownState;

  /**
   * @internal
   *
   * A copy of serializedNode[NODE_STATE_KEY] that is made when JSON is
   * imported but has not been parsed yet.
   *
   * It stays here until a get state requires us to parse it, and since we
   * then know the value is safe we move it to knownState.
   *
   * Note that since only string keys are used here, we can only allow this
   * state to pass-through on export or on the next version since there is
   * no known value configuration. This pass-through is to support scenarios
   * where multiple versions of the editor code are working in parallel so
   * an old version of your code doesnt erase metadata that was
   * set by a newer version of your code.
   */
  unknownState;

  /**
   * @internal
   *
   * This sharedNodeState is preserved across all instances of a given
   * node type in an editor and remains writable. It is how keys are resolved
   * to configuration.
   */
  sharedNodeState;
  /**
   * @internal
   *
   * The count of known or unknown keys in this state, ignoring the
   * intersection between the two sets.
   */
  size;

  /**
   * @internal
   */
  constructor(node, sharedNodeState, unknownState = undefined, knownState = new Map(), size = undefined) {
    this.node = node;
    this.sharedNodeState = sharedNodeState;
    this.unknownState = unknownState;
    this.knownState = knownState;
    const {
      sharedConfigMap
    } = this.sharedNodeState;
    const computedSize = size !== undefined ? size : computeSize(sharedConfigMap, unknownState, knownState);
    {
      if (!(size === undefined || computedSize === size)) {
        formatDevErrorMessage(`NodeState: size != computedSize (${String(size)} != ${String(computedSize)})`);
      }
      for (const stateConfig of knownState.keys()) {
        if (!sharedConfigMap.has(stateConfig.key)) {
          formatDevErrorMessage(`NodeState: sharedConfigMap missing knownState key ${stateConfig.key}`);
        }
      }
    }
    this.size = computedSize;
  }

  /**
   * @internal
   *
   * Get the value from knownState, or parse it from unknownState
   * if it contains the given key.
   *
   * Updates the sharedConfigMap when no known state is found.
   * Updates unknownState and knownState when an unknownState is parsed.
   */
  getValue(stateConfig) {
    const known = this.knownState.get(stateConfig);
    if (known !== undefined) {
      return known;
    }
    this.sharedNodeState.sharedConfigMap.set(stateConfig.key, stateConfig);
    let parsed = stateConfig.defaultValue;
    if (this.unknownState && stateConfig.key in this.unknownState) {
      const jsonValue = this.unknownState[stateConfig.key];
      if (jsonValue !== undefined) {
        parsed = stateConfig.parse(jsonValue);
      }
      // Only update if the key was unknown
      this.updateFromKnown(stateConfig, parsed);
    }
    return parsed;
  }

  /**
   * @internal
   *
   * Used only for advanced use cases, such as collab. The intent here is to
   * allow you to diff states with a more stable interface than the properties
   * of this class.
   */
  getInternalState() {
    return [this.unknownState, this.knownState];
  }

  /**
   * Encode this NodeState to JSON in the format that its node expects.
   * This returns `{[NODE_STATE_KEY]?: UnknownStateRecord}` rather than
   * `UnknownStateRecord | undefined` so that we can support flattening
   * specific entries in the future when nodes can declare what
   * their required StateConfigs are.
   */
  toJSON() {
    const state = {
      ...this.unknownState
    };
    const flatState = {};
    for (const [stateConfig, v] of this.knownState) {
      if (stateConfig.isEqual(v, stateConfig.defaultValue)) {
        delete state[stateConfig.key];
      } else {
        state[stateConfig.key] = stateConfig.unparse(v);
      }
    }
    for (const key of this.sharedNodeState.flatKeys) {
      if (key in state) {
        flatState[key] = state[key];
        delete state[key];
      }
    }
    if (undefinedIfEmpty(state)) {
      flatState[NODE_STATE_KEY] = state;
    }
    return flatState;
  }

  /**
   * @internal
   *
   * A NodeState is writable when the node to update matches
   * the node associated with the NodeState. This basically
   * mirrors how the EditorState NodeMap works, but in a
   * bottom-up organization rather than a top-down organization.
   *
   * This allows us to implement the same "copy on write"
   * pattern for state, without having the state version
   * update every time the node version changes (e.g. when
   * its parent or siblings change).
   *
   * @param node The node to associate with the state
   * @returns The next writable state
   */
  getWritable(node) {
    if (this.node === node) {
      return this;
    }
    const {
      sharedNodeState,
      unknownState
    } = this;
    const nextKnownState = new Map(this.knownState);
    return new NodeState(node, sharedNodeState, parseAndPruneNextUnknownState(sharedNodeState.sharedConfigMap, nextKnownState, unknownState), nextKnownState, this.size);
  }

  /** @internal */
  resetOnCopyNode() {
    for (const stateConfig of this.knownState.keys()) {
      if (stateConfig.resetOnCopyNode) {
        this.knownState.set(stateConfig, stateConfig.defaultValue);
      }
    }
    return this;
  }

  /** @internal */
  updateFromKnown(stateConfig, value) {
    const key = stateConfig.key;
    this.sharedNodeState.sharedConfigMap.set(key, stateConfig);
    const {
      knownState,
      unknownState
    } = this;
    if (!(knownState.has(stateConfig) || unknownState && key in unknownState)) {
      if (unknownState) {
        delete unknownState[key];
        this.unknownState = undefinedIfEmpty(unknownState);
      }
      this.size++;
    }
    knownState.set(stateConfig, value);
  }

  /**
   * @internal
   *
   * This is intended for advanced use cases only, such
   * as collab or dev tools.
   *
   * Update a single key value pair from unknown state,
   * parsing it if the key is known to this node. This is
   * basically like updateFromJSON, but the effect is
   * isolated to a single entry.
   *
   * @param k The string key from an UnknownStateRecord
   * @param v The unknown value from an UnknownStateRecord
   */
  updateFromUnknown(k, v) {
    if (UNSAFE_STATE_KEYS.has(k)) {
      return;
    }
    const stateConfig = this.sharedNodeState.sharedConfigMap.get(k);
    if (stateConfig) {
      this.updateFromKnown(stateConfig, stateConfig.parse(v));
    } else {
      this.unknownState = this.unknownState || {};
      if (!(k in this.unknownState)) {
        this.size++;
      }
      this.unknownState[k] = v;
    }
  }

  /**
   * @internal
   *
   * Reset all existing state to default or empty values,
   * and perform any updates from the given unknownState.
   *
   * This is used when initializing a node's state from JSON,
   * or when resetting a node's state from JSON.
   *
   * @param unknownState The new state in serialized form
   */
  updateFromJSON(unknownState) {
    const {
      knownState
    } = this;
    // Reset all known state to defaults
    for (const stateConfig of knownState.keys()) {
      knownState.set(stateConfig, stateConfig.defaultValue);
    }
    // Since we are resetting all state to this new record,
    // the size starts at the number of known keys
    // and will be updated as we traverse the new state
    this.size = knownState.size;
    this.unknownState = undefined;
    if (unknownState) {
      for (const [k, v] of Object.entries(unknownState)) {
        this.updateFromUnknown(k, v);
      }
    }
  }
}

/**
 * @internal
 *
 * Only for direct use in very advanced integrations, such as lexical-yjs.
 * Typically you would only use {@link createState}, {@link $getState}, and
 * {@link $setState}. This is effectively the preamble for {@link $setState}.
 */
function $getWritableNodeState(node) {
  const writable = node.getWritable();
  const state = writable.__state ? writable.__state.getWritable(writable) : new NodeState(writable, $getSharedNodeState(writable));
  writable.__state = state;
  return state;
}

/**
 * @internal
 *
 * Get the SharedNodeState for a node on this editor
 */
function $getSharedNodeState(node) {
  return node.__state ? node.__state.sharedNodeState : getRegisteredNodeOrThrow($getEditor(), node.getType()).sharedNodeState;
}

/**
 * @internal
 *
 * This is used to implement LexicalNode.updateFromJSON and is
 * not intended to be exported from the package.
 *
 * @param node any LexicalNode
 * @param unknownState undefined or a serialized State
 * @returns A writable version of node, with the state set.
 */
function $updateStateFromJSON(node, serialized) {
  const writable = node.getWritable();
  const unknownState = serialized[NODE_STATE_KEY];
  let parseState = unknownState;
  for (const k of $getSharedNodeState(writable).flatKeys) {
    if (k in serialized) {
      if (parseState === undefined || parseState === unknownState) {
        parseState = {
          ...unknownState
        };
      }
      parseState[k] = serialized[k];
    }
  }
  if (writable.__state || parseState) {
    $getWritableNodeState(node).updateFromJSON(parseState);
  }
  return writable;
}

/**
 * @internal
 *
 * Return true if the two nodes have equivalent NodeState, to be used
 * to determine when TextNode are being merged, not a lot of use cases
 * otherwise.
 */
function nodeStatesAreEquivalent(a, b) {
  if (a === b) {
    return true;
  }
  const keys = new Set();
  return !(a && hasUnequalMapEntry(keys, a, b) || b && hasUnequalMapEntry(keys, b, a) || a && hasUnequalRecordEntry(keys, a, b) || b && hasUnequalRecordEntry(keys, b, a));
}

/**
 * Compute the number of distinct keys that will be in a NodeState
 */
function computeSize(sharedConfigMap, unknownState, knownState) {
  let size = knownState.size;
  if (unknownState) {
    for (const k in unknownState) {
      const sharedConfig = sharedConfigMap.get(k);
      if (!sharedConfig || !knownState.has(sharedConfig)) {
        size++;
      }
    }
  }
  return size;
}

/**
 * @internal
 *
 * Return obj if it is an object with at least one property, otherwise
 * return undefined.
 */
function undefinedIfEmpty(obj) {
  if (obj) {
    for (const key in obj) {
      return obj;
    }
  }
  return undefined;
}

/**
 * @internal
 *
 * Cast the given v to unknown
 */
function coerceToJSON(v) {
  return v;
}

/**
 * @internal
 *
 * Parse all knowable values in an UnknownStateRecord into nextKnownState
 * and return the unparsed values in a new UnknownStateRecord. Returns
 * undefined if no unknown values remain.
 */
function parseAndPruneNextUnknownState(sharedConfigMap, nextKnownState, unknownState) {
  let nextUnknownState = undefined;
  if (unknownState) {
    for (const [k, v] of Object.entries(unknownState)) {
      if (UNSAFE_STATE_KEYS.has(k)) {
        continue;
      }
      const stateConfig = sharedConfigMap.get(k);
      if (stateConfig) {
        if (!nextKnownState.has(stateConfig)) {
          nextKnownState.set(stateConfig, stateConfig.parse(v));
        }
      } else {
        nextUnknownState = nextUnknownState || {};
        nextUnknownState[k] = v;
      }
    }
  }
  return nextUnknownState;
}

/**
 * @internal
 *
 * Compare each entry of sourceState.knownState that is not in keys to
 * otherState (or the default value if otherState is undefined.
 * Note that otherState will return the defaultValue as well if it
 * has never been set. Any checked entry's key will be added to keys.
 *
 * @returns true if any difference is found, false otherwise
 */
function hasUnequalMapEntry(keys, sourceState, otherState) {
  for (const [stateConfig, value] of sourceState.knownState) {
    if (keys.has(stateConfig.key)) {
      continue;
    }
    keys.add(stateConfig.key);
    const otherValue = otherState ? otherState.getValue(stateConfig) : stateConfig.defaultValue;
    if (otherValue !== value && !stateConfig.isEqual(otherValue, value)) {
      return true;
    }
  }
  return false;
}

/**
 * @internal
 *
 * Compare each entry of sourceState.unknownState that is not in keys to
 * otherState.unknownState (or undefined if otherState is undefined).
 * Any checked entry's key will be added to keys.
 *
 * Notably since we have already checked hasUnequalMapEntry on both sides,
 * we do not do any parsing or checking of knownState.
 *
 * @returns true if any difference is found, false otherwise
 */
function hasUnequalRecordEntry(keys, sourceState, otherState) {
  const {
    unknownState
  } = sourceState;
  const otherUnknownState = otherState ? otherState.unknownState : undefined;
  if (unknownState) {
    for (const [key, value] of Object.entries(unknownState)) {
      if (keys.has(key)) {
        continue;
      }
      keys.add(key);
      const otherValue = otherUnknownState ? otherUnknownState[key] : undefined;
      if (value !== otherValue) {
        return true;
      }
    }
  }
  return false;
}

/**
 * @internal
 *
 * Clones the NodeState for a given node. Handles aliasing if the state references the from node.
 */
function $cloneNodeState(from, to) {
  const state = from.__state;
  return state && state.node === from ? state.getWritable(to) : state;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

function $canSimpleTextNodesBeMerged(node1, node2) {
  const node1Mode = node1.__mode;
  const node1Format = node1.__format;
  const node1Style = node1.__style;
  const node2Mode = node2.__mode;
  const node2Format = node2.__format;
  const node2Style = node2.__style;
  const node1State = node1.__state;
  const node2State = node2.__state;
  return (node1Mode === null || node1Mode === node2Mode) && (node1Format === null || node1Format === node2Format) && (node1Style === null || node1Style === node2Style) && (node1.__state === null || node1State === node2State || nodeStatesAreEquivalent(node1State, node2State));
}
function $mergeTextNodes(node1, node2) {
  const writableNode1 = node1.mergeWithSibling(node2);
  const normalizedNodes = getActiveEditor()._normalizedNodes;
  normalizedNodes.add(node1.__key);
  normalizedNodes.add(node2.__key);
  return writableNode1;
}
function $normalizeTextNode(textNode) {
  let node = textNode;
  if (node.__text === '' && node.isSimpleText() && !node.isUnmergeable()) {
    node.remove();
    return;
  }

  // Backward
  let previousNode;
  while ((previousNode = node.getPreviousSibling()) !== null && $isTextNode(previousNode) && previousNode.isSimpleText() && !previousNode.isUnmergeable()) {
    if (previousNode.__text === '') {
      previousNode.remove();
    } else if ($canSimpleTextNodesBeMerged(previousNode, node)) {
      node = $mergeTextNodes(previousNode, node);
      break;
    } else {
      break;
    }
  }

  // Forward
  let nextNode;
  while ((nextNode = node.getNextSibling()) !== null && $isTextNode(nextNode) && nextNode.isSimpleText() && !nextNode.isUnmergeable()) {
    if (nextNode.__text === '') {
      nextNode.remove();
    } else if ($canSimpleTextNodesBeMerged(node, nextNode)) {
      node = $mergeTextNodes(node, nextNode);
      break;
    } else {
      break;
    }
  }
}
function $normalizeSelection(selection) {
  $normalizePoint(selection.anchor);
  $normalizePoint(selection.focus);
  return selection;
}
function $normalizePoint(point) {
  while (point.type === 'element') {
    const node = point.getNode();
    const offset = point.offset;
    let nextNode;
    let nextOffsetAtEnd;
    if (offset === node.getChildrenSize()) {
      nextNode = node.getChildAtIndex(offset - 1);
      nextOffsetAtEnd = true;
    } else {
      nextNode = node.getChildAtIndex(offset);
      nextOffsetAtEnd = false;
    }
    if ($isTextNode(nextNode)) {
      point.set(nextNode.__key, nextOffsetAtEnd ? nextNode.getTextContentSize() : 0, 'text', true);
      break;
    } else if (!$isElementNode(nextNode)) {
      break;
    }
    point.set(nextNode.__key, nextOffsetAtEnd ? nextNode.getChildrenSize() : 0, 'element', true);
  }
}

/**
 * @internal
 *
 * A reconcile-managed cache of `getTextContentSize()` for leaf nodes.
 *
 * Stored as a Symbol-keyed property on the node instance itself so that
 * read/write are direct slot access. The slot is pre-allocated to
 * `undefined` as a non-enumerable property in the LexicalNode constructor
 * so all instances share the same V8 hidden-class shape and the setter is
 * a stable inline cache hit instead of a per-instance shape transition.
 *
 * ElementNodes are NOT stored here: an element can be dirty without being
 * cloned (a descendant edit marks ancestors dirty via
 * `internalMarkParentElementsAsDirty` but does not `getWritable()` them), so
 * the same — DEV-frozen — instance would need its size rewritten when its
 * text changes, which the skip-if-set guard cannot do. Element sizes come
 * from `dom.__lexicalTextContent` instead (see `$prevSuffixTextSize`).
 *
 * Leaf writes are skipped when the slot is already not `undefined`. The
 * setter is only re-entered for the same instance via cross-parent moves
 * (where the leaf is reused in a new parent without going through
 * `getWritable` — text is unchanged, so the prior cycle's value is still
 * correct). A leaf whose text actually changed went through
 * `getWritable()` and produced a fresh clone via `static clone(node)` ->
 * ctor -> fresh `undefined` slot, so the setter writes through normally.
 *
 * The reconciler sets this on every reconciled leaf at the end of
 * `$reconcileNode` (and on every newly-created leaf in `$createNode`), so
 * the previous editor state's leaves always carry a valid cached size from
 * the cycle that just committed.
 *
 * Suffix-incremental fast path reads this off the previous-state instance
 * to get the pre-reconcile size of dirty children in O(1), avoiding both
 * the `getLatest()` -> next-state trap and a recursive prev-tree walk.
 */
const CACHED_TEXT_SIZE_KEY = Symbol.for('@lexical/CachedTextSize');

// Total previous-render text length of the `count` suffix children starting at
// `startKey` (in next-map order, which equals prev order across the size-0 and
// size-±1 fast paths). This is the slice length removed from the parent's
// cached text before the freshly reconciled suffix is appended.
//
// The whole walk runs inside `activePrevEditorState.read(...)` so that every
// node method resolves against the PREVIOUS node map: a moved element recomputes
// its size via `getTextContentSize()` (its shared keyed-DOM cache may already
// hold the NEW size, cf. https://github.com/facebook/lexical/pull/8564), and the
// inter-sibling `isInline()` returns the node's previous-render value (a moved
// or re-typed node could answer differently in the next state, and a node
// removed this cycle would throw). The per-child size logic is inlined here
// rather than shared so it cannot be called outside this read. Non-moved
// elements and leaves still read their O(1) caches, so a large untouched suffix
// child is not re-walked.
function $prevSuffixTextSize(startKey, count) {
  return activePrevEditorState.read(() => {
    let size = 0;
    let cur = startKey;
    for (let i = 0; i < count && cur !== null; i++) {
      const prevNode = activePrevNodeMap.get(cur);
      // Callers validate every suffix key is present in the prev map, so a
      // miss means a broken upstream invariant. Fail loudly (the reconciler
      // catch recovers via a full reconcile) rather than slice a partial sum.
      if (!(prevNode !== undefined)) {
        formatDevErrorMessage(`prevSuffixTextSize: missing prev node for key ${cur}`);
      }
      if ($isElementNode(prevNode)) {
        const nextNode = activeNextNodeMap.get(cur);
        if (nextNode !== undefined && $isElementNode(nextNode) && nextNode.__parent !== prevNode.__parent) {
          // Moved to a different parent this cycle: the shared keyed-DOM text
          // cache may already hold its NEW size, so recompute from the prev
          // tree. (`__parent === null` means detached/removed, not moved — its
          // DOM cache is still its prev text.)
          size += prevNode.getTextContentSize();
        } else {
          const keyedDom = activePrevKeyToDOMMap.get(cur);
          const cached = keyedDom && keyedDom.__lexicalTextContent;
          if (!(typeof cached === 'string')) {
            formatDevErrorMessage(`prevSuffixTextSize: missing __lexicalTextContent for ElementNode of type ${prevNode.getType()}`);
          }
          size += cached.length;
        }
        if (i < count - 1 && !prevNode.isInline()) {
          size += DOUBLE_LINE_BREAK.length;
        }
      } else {
        // $reconcileNode / $createNode set the size on every leaf they touch,
        // so a missing entry means the invariant was broken upstream.
        const cached = prevNode[CACHED_TEXT_SIZE_KEY];
        if (!(cached !== undefined)) {
          formatDevErrorMessage(`prevSuffixTextSize: missing cached size for leaf ${prevNode.getType()} key ${cur}`);
        }
        size += cached;
      }
      cur = prevNode.__next;
    }
    return size;
  }, {
    editor: activeEditor$1
  });
}
function $setCachedTextSize(node) {
  if ($isElementNode(node)) {
    return;
  }
  // Skip if a value is already cached on this instance. The setter is only
  // re-entered for the same instance via cross-parent moves (where the leaf
  // is reused in a new parent without going through `getWritable` — text is
  // unchanged so the prior cycle's value is still correct), and that's
  // exactly the case where the instance is also frozen in DEV.
  if (node[CACHED_TEXT_SIZE_KEY] !== undefined) {
    return;
  }
  node[CACHED_TEXT_SIZE_KEY] = $isTextNode(node) ? node.__text.length : node.getTextContentSize();
}

/**
 * Minimum children count for the suffix-incremental fast path to engage.
 * The fast path adds bookkeeping (cache lookups, suffix walks, splice) that
 * a few-children parent's general walk would beat — gate by a threshold so
 * the overhead only kicks in where the prefix preservation pays for it.
 * Tuned via `editorCycle.bench`.
 */
const MIN_FAST_PATH_CHILDREN = 4;
let subTreeTextContent = '';
let subTreeTextFormat = null;
let subTreeTextStyle = null;
let subTreeFirstTextKey = null;

// Save/restore guard for the leftmost-wins `subTreeFirstTextKey`
// invariant. Any walk that recursively reconciles or creates element
// children must wrap each iteration with `$beginCaptureGuard()` ...
// `$endCaptureGuard(saved)` so the recursive scope's
// `$reconcileChildrenWithDirection` reset doesn't clobber an
// earlier sibling's captured first-text descriptor.
//
// Per-iteration object alloc relies on V8 escape analysis to keep
// `CaptureGuard` off the heap — the shape is monomorphic and the
// lifetime is deterministic, so stack alloc is the expected outcome.

function $beginCaptureGuard() {
  return {
    firstTextKey: subTreeFirstTextKey,
    format: subTreeTextFormat,
    style: subTreeTextStyle
  };
}
function $endCaptureGuard(saved) {
  if (saved.firstTextKey !== null) {
    subTreeTextFormat = saved.format;
    subTreeTextStyle = saved.style;
    subTreeFirstTextKey = saved.firstTextKey;
  }
}

// Bubble a non-dirty element child's cached first-text descriptor up to
// the caller's scope so a non-dirty prefix carrying the canonical first
// text still wins over a later dirty sibling. Only fires when the
// caller hasn't already captured one.
//
// `__lexicalFirstTextKey` is a reconciler-maintained cache that
// `$createNode` / `$reconcileNode` set on every element's outer keyed
// DOM. `null` means "this element has no text descendant" (legitimate —
// empty element, decorator); `undefined` means the cache is missing,
// which is an invariant violation worth surfacing loudly rather than
// silently falling through and losing the leftmost-wins capture.
function $bubbleChildFirstText(childKeyedDom) {
  if (subTreeFirstTextKey !== null) {
    return;
  }
  const childFirstKey = childKeyedDom.__lexicalFirstTextKey;
  if (!(childFirstKey !== undefined)) {
    formatDevErrorMessage(`$bubbleChildFirstText: missing __lexicalFirstTextKey on element keyed DOM`);
  }
  if (childFirstKey === null) {
    return;
  }
  const textNode = activeNextNodeMap.get(childFirstKey);
  if ($isTextNode(textNode)) {
    subTreeTextFormat = textNode.getFormat();
    subTreeTextStyle = textNode.getStyle();
    subTreeFirstTextKey = childFirstKey;
  }
}
let activeEditorConfig;
let activeEditor$1;
let activeEditorNodes;
let treatAllNodesAsDirty = false;
let activeEditorStateReadOnly = false;
let activeMutationListeners;
let activeDirtyElements;
let activeDirtyLeaves;
let activePrevNodeMap;
let activePrevEditorState;
let activeNextNodeMap;
let activePrevKeyToDOMMap;
let activeDirtyChildrenByParent;
let mutatedNodes;
let activeEditorDOMRenderConfig;
function $destroyNode(key, parentDOM) {
  const node = activePrevNodeMap.get(key);
  // A node "moved" across parents in the same transaction still exists in
  // the next node map. We only detach its DOM from the old parent here;
  // the new parent's $createNode call will reuse it. Skip child destruction
  // and mutation marking — $reconcileNode will mark it 'updated' instead.
  const isMoved = activeNextNodeMap.has(key);
  if (parentDOM !== null) {
    const dom = getPrevElementByKeyOrThrow(key);
    if (dom.parentNode === parentDOM) {
      parentDOM.removeChild(dom);
    }
  }
  if (isMoved) {
    return;
  }

  // This logic is really important, otherwise we will leak DOM nodes
  // when their corresponding LexicalNodes are removed from the editor state.
  activeEditor$1._keyToDOMMap.delete(key);
  if ($isElementNode(node)) {
    const children = $createChildrenArray(node, activePrevNodeMap);
    $destroyChildren(children, 0, children.length - 1, null);
  }

  // Slots are a separate channel from the linked-list children, so the
  // recursion above never reaches them. Destroy each slot subtree too —
  // otherwise its _keyToDOMMap entries leak and no 'destroyed' mutation fires
  // for slot nodes. Resolve the container before destroying the subtree (the
  // key is gone from the DOM map after). A decorator host's container is
  // detached (relocated into the decorate() chrome) so remove it explicitly;
  // an element host's container sits inside the host DOM already being removed,
  // where remove() is a harmless no-op on a detached parent.
  if (node !== undefined) {
    for (const slotKey of $readSlots(node).values()) {
      const container = $slotContainerForKey(slotKey);
      $destroyNode(slotKey, null);
      if (container !== null) {
        container.remove();
      }
    }
    setMutatedNode(mutatedNodes, activeEditorNodes, activeMutationListeners, node, 'destroyed');
  }
}
function $destroyChildren(children, _startIndex, endIndex, dom) {
  for (let startIndex = _startIndex; startIndex <= endIndex; ++startIndex) {
    const child = children[startIndex];
    if (child !== undefined) {
      $destroyNode(child, dom);
    }
  }
}
function setTextAlign(domStyle, value) {
  domStyle.setProperty('text-align', value);
}
const DEFAULT_INDENT_VALUE = '40px';
function setElementIndent(dom, indent) {
  const indentClassName = activeEditorConfig.theme.indent;
  if (typeof indentClassName === 'string') {
    const elementHasClassName = dom.classList.contains(indentClassName);
    if (indent > 0 && !elementHasClassName) {
      dom.classList.add(indentClassName);
    } else if (indent < 1 && elementHasClassName) {
      dom.classList.remove(indentClassName);
    }
  }
  dom.style.setProperty('padding-inline-start', indent === 0 ? '' : `calc(${indent} * var(--lexical-indent-base-value, ${DEFAULT_INDENT_VALUE}))`);
}
function setElementFormat(dom, format) {
  const domStyle = dom.style;
  if (format === 0) {
    setTextAlign(domStyle, '');
  } else if (format === IS_ALIGN_LEFT) {
    setTextAlign(domStyle, 'left');
  } else if (format === IS_ALIGN_CENTER) {
    setTextAlign(domStyle, 'center');
  } else if (format === IS_ALIGN_RIGHT) {
    setTextAlign(domStyle, 'right');
  } else if (format === IS_ALIGN_JUSTIFY) {
    setTextAlign(domStyle, 'justify');
  } else if (format === IS_ALIGN_START) {
    setTextAlign(domStyle, 'start');
  } else if (format === IS_ALIGN_END) {
    setTextAlign(domStyle, 'end');
  }
}
function $getReconciledDirection(node) {
  const direction = node.__dir;
  if (direction !== null) {
    return direction;
  }
  if ($isRootNode(node)) {
    return null;
  }
  const parent = node.getParent();
  if (parent === null) {
    // A slotted node has no parent (its up-pointer is __slotHost); it is
    // the root of an isolated slot subtree, so it behaves like a
    // top-level block and bidi-auto-detects, matching the root-child
    // case below. In non-slot trees every non-root element has a parent,
    // so this branch is unreachable and behavior is unchanged.
    return 'auto';
  }
  if (!$isRootOrShadowRoot(parent) || parent.__dir !== null) {
    return null;
  }
  return 'auto';
}
function $setElementDirection(dom, node) {
  const direction = $getReconciledDirection(node);
  if (direction !== null) {
    dom.dir = direction;
  } else {
    dom.removeAttribute('dir');
  }
}

// @experimental named-slots. Slots are a separate channel from the
// linked-list children: each slot subtree renders into its own
// non-keyed container, and its text is concatenated with no separator to
// match `ElementNode.getTextContent`. Containers are synchronous hidden
// placeholders: they mount slots-first in the host DOM with
// `display: 'none'` so every slot subtree is always rendered and part of
// the document, but nothing is visible until the host explicitly attaches
// the container somewhere with `mountSlotContainer` (directly or through
// lexical-react's `useLexicalSlotRef`), which reveals it — mirroring how
// `getDOMSlot` gives an element control over where its linked-list children
// render. Only the wrapper is
// scaffolding; the slot subtree inside carries its own NodeKey and
// reconciles normally.
// Leaves `subTreeTextContent` unchanged (restored on exit); the caller folds
// the returned text in slots-first.
// @experimental named-slots. Build a hidden slot placeholder element (DOM only,
// no Lexical state), shared by the mount and reconcile paths so the two never
// drift. The container is left unattached — the caller inserts it (appended on a
// fresh mount, slots-first on reconcile) — and starts `display: none`, revealed
// only by an explicit mount / $getSlotTargetElement. Editability is applied
// separately by $applySlotEditable.
function $createSlotDOM(name) {
  const container = $getDocument().createElement('div');
  container.setAttribute('data-lexical-slot', name);
  container.style.display = 'none';
  return container;
}

// Apply a slot container's editability. Re-run on every (re)mount — including
// the reconcile-reuse path — so a reused container can never keep a stale value.
// Inside a non-editable host (a decorator, or an element shell that wraps
// editable islands in chrome) the container is an island that would not track
// the editor on its own, so it carries an explicit `contentEditable` following
// the editor via `$markSlotEditable`; re-applying on every reconcile is what
// carries an editable toggle (a `$fullReconcile`) into the DOM. Otherwise the
// host is editable and the container inherits, so any stale `contentEditable`
// from a previous host state is cleared.
function $applySlotEditable(hostDom, decoratorHost, container) {
  if (decoratorHost || hostDom.contentEditable === 'false') {
    $markSlotEditable(container, activeEditor$1);
  } else {
    container.removeAttribute('contenteditable');
  }
}
function $mountSlotChildren(node, hostDom, slots) {
  const previousSubTreeTextContent = subTreeTextContent;
  const outerSaved = $beginCaptureGuard();
  subTreeTextContent = '';
  let totalText = '';
  const decoratorHost = $isDecoratorNode(node);
  for (const [name, slotKey] of slots) {
    const container = $createSlotDOM(name);
    $applySlotEditable(hostDom, decoratorHost, container);
    hostDom.appendChild(container);
    subTreeTextContent = '';
    const saved = $beginCaptureGuard();
    $createNode(slotKey, $getDOMSlot(node, container, activeEditor$1));
    $endCaptureGuard(saved);
    $applySlotTarget(node, name, hostDom, container);
    totalText += subTreeTextContent;
  }
  $endCaptureGuard(outerSaved);
  subTreeTextContent = previousSubTreeTextContent;
  return totalText;
}
function $readSlots(node) {
  return $isSlotHost(node) && node.__slots !== null ? node.__slots : EMPTY_SLOTS;
}

// @experimental named-slots. Synchronous in-lexical slot attachment: a host
// with a `$getSlotTargetElement` render-config override has the reconciler
// attach and reveal the container in the same commit that (re)mounts it —
// no listener or framework hop. A null target (the default) leaves placement
// to explicit imperative mounting (mountSlotContainer / useLexicalSlotRef).
function $applySlotTarget(node, name, hostDom, container) {
  const target = activeEditorDOMRenderConfig.$getSlotTargetElement(node, name, hostDom, activeEditor$1);
  if (target !== null) {
    if (container.parentElement !== target) {
      target.appendChild(container);
    }
    container.style.display = '';
  }
}

// @experimental named-slots. A slot value's DOM is mounted directly inside its
// own `[data-lexical-slot]` container, so the container is that DOM's parent.
// Resolving by the slotted key (rather than scanning the host's direct children
// by name) survives the container being relocated out of the host — e.g. a
// decorator host that moves its slot containers into its decorate() chrome — and
// can't match a slot subtree's own nested slot container.
function $slotContainerForKey(slotKey) {
  const slotDom = activePrevKeyToDOMMap.get(slotKey);
  return slotDom !== undefined ? slotDom.parentElement : null;
}

// @experimental named-slots. Reconcile mirror of `$mountSlotChildren`.
// Slot containers already sit slots-first in the host DOM from the create
// path, so reconciling each in place keeps DOM order. Same name + key →
// reconcile in place; same name + new key → destroy old subtree, mount the
// new one into the existing container; removed name → destroy + drop its
// container; new name → mount a fresh container before the first non-slot
// child so a slot added after the host's initial render stays slots-first.
// Containers are resolved via `$slotContainerForKey` (the slotted node's DOM
// parent). Like the mount helper this leaves `subTreeTextContent` unchanged and
// returns the concatenated slot text for the caller to fold in slots-first.
function $reconcileSlotChildren(prevNode, nextNode, hostDom) {
  const prevSlots = $readSlots(prevNode);
  const nextSlots = $readSlots(nextNode);
  for (const [name, prevSlotKey] of prevSlots) {
    if (!nextSlots.has(name)) {
      const staleContainer = $slotContainerForKey(prevSlotKey);
      $destroyNode(prevSlotKey, null);
      if (staleContainer !== null) {
        staleContainer.remove();
      }
    }
  }
  const previousSubTreeTextContent = subTreeTextContent;
  const outerSaved = $beginCaptureGuard();
  let totalText = '';
  let prevContainer = null;
  const decoratorHost = $isDecoratorNode(nextNode);
  for (const [name, nextSlotKey] of nextSlots) {
    const prevSlotKey = prevSlots.get(name);
    let container = prevSlotKey !== undefined ? $slotContainerForKey(prevSlotKey) : null;
    subTreeTextContent = '';
    const saved = $beginCaptureGuard();
    if (container === null) {
      container = $createSlotDOM(name);
      // Keep the hidden placeholder slots-first: it must land ahead of the
      // linked-list children (and the terminating <br>) so the leading
      // DOMSlot boundary can skip it; it must not be appended after them.
      // Insert before the first non-slot child; earlier slot containers are
      // skipped, so several slots added in one update preserve their Map
      // order at the front.
      let firstNonSlot = null;
      for (const child of hostDom.children) {
        if (!child.hasAttribute('data-lexical-slot')) {
          firstNonSlot = child;
          break;
        }
      }
      hostDom.insertBefore(container, firstNonSlot);
      $createNode(nextSlotKey, $getDOMSlot(nextNode, container, activeEditor$1));
    } else if (prevSlotKey === nextSlotKey) {
      $reconcileNode(nextSlotKey, container);
    } else {
      // Reusing the container, so the old subtree's DOM must be detached
      // from it (pass the container as parentDOM) before mounting the new
      // one; otherwise both render side by side.
      if (prevSlotKey !== undefined) {
        $destroyNode(prevSlotKey, container);
      }
      $createNode(nextSlotKey, $getDOMSlot(nextNode, container, activeEditor$1));
    }
    $endCaptureGuard(saved);
    $applySlotEditable(hostDom, decoratorHost, container);
    $applySlotTarget(nextNode, name, hostDom, container);
    totalText += subTreeTextContent;
    // Keep placeholder DOM order in sync with the slot Map order. A reused
    // container stays where it was first mounted, so a remove + re-add of an
    // existing name (which moves it to the Map's tail) would otherwise leave
    // its container stranded at its old DOM position, diverging from the model
    // order that getSlotNames / the text fold / the exporters all read. Anchor
    // each container right after the previous slot's (the first at the very
    // front), staying slots-first ahead of the linked-list children. Only
    // placeholders still parked in the host DOM are anchored: a container the
    // host explicitly attached elsewhere (mountSlotContainer / useLexicalSlotRef)
    // is owned by that mount and re-parenting it here would yank it back.
    if (container.parentElement === hostDom) {
      const anchor = prevContainer === null ? hostDom.firstChild : prevContainer.nextSibling;
      if (anchor !== container) {
        hostDom.insertBefore(container, anchor);
      }
      prevContainer = container;
    }
  }
  $endCaptureGuard(outerSaved);
  subTreeTextContent = previousSubTreeTextContent;
  return totalText;
}
function $createNode(key, slot) {
  const node = activeNextNodeMap.get(key);
  if (node === undefined) {
    {
      formatDevErrorMessage(`createNode: node does not exist in nodeMap`);
    }
  }

  // Cross-parent move: the same key existed in the previous tree under a
  // different parent. Reuse the existing DOM so React decorator portals,
  // contentEditable focus, etc. survive the reparenting. Without this the
  // DecoratorNode's wrapper is recreated and React unmounts/remounts the
  // child component (visible as a 1-frame flicker in Safari).
  // Requires a slot so $reconcileNode has a valid parentDOM in case the
  // moved node also reports updateDOM=true and needs an in-place replace.
  // Two move shapes route here:
  //   - model move: cross-parent (linked-list children) or cross-slot-host
  //     (a slot value moved between hosts in one update; both nodes have
  //     __parent === null, so cross-host is detected via __slotHost).
  //   - DOM move (slot children only): a host's wrapper was recreated
  //     (updateDOM=true) and its slot children's existing DOM is no longer
  //     under the new slot container. Limited to slot children because a
  //     regular child whose wrapper parent was recreated should re-render
  //     through its type-derived createDOM (list item attributes, etc.),
  //     not reuse a stale wrapper.
  if (slot !== null) {
    const prevNode = activePrevNodeMap.get(key);
    if (prevNode !== undefined) {
      const existingDOM = activePrevKeyToDOMMap.get(key);
      if (existingDOM !== undefined) {
        const prevSlotHost = $isSlotChild(prevNode) ? prevNode.__slotHost : null;
        const nextSlotHost = $isSlotChild(node) ? node.__slotHost : null;
        const modelMoved = prevNode.__parent !== node.__parent || prevSlotHost !== nextSlotHost;
        const slotChildDomDetached = nextSlotHost !== null && existingDOM.parentElement !== slot.element;
        if (modelMoved || slotChildDomDetached) {
          slot.insertChild(existingDOM);
          return $reconcileNode(key, slot.element);
        }
      }
    }
  }
  const dom = activeEditorDOMRenderConfig.$createDOM(node, activeEditor$1);
  storeDOMWithKey(key, dom, activeEditor$1);

  // This helps preserve the text, and stops spell check tools from
  // merging or break the spans (which happens if they are missing
  // this attribute).
  if ($isTextNode(node)) {
    dom.setAttribute('data-lexical-text', 'true');
  } else if ($isDecoratorNode(node)) {
    dom.setAttribute('data-lexical-decorator', 'true');
    // DecoratorNode DOM is selection-captured: window selection inside
    // a decorator subtree (e.g. an embedded input) is owned by the
    // decorator, not by Lexical's caret management. Marking it via
    // setDOMUnmanaged unifies the decorator case with extension-owned
    // unmanaged subtrees so callers only need isDOMCapturingSelection /
    // isDOMUnmanaged.
    setDOMUnmanaged(dom, {
      captureSelection: true
    });
  }
  if ($isElementNode(node)) {
    const indent = node.__indent;
    const childrenSize = node.__size;
    $setElementDirection(dom, node);
    if (indent !== 0) {
      setElementIndent(dom, indent);
    }
    // @experimental named-slots. Slots render slots-first, ahead of the
    // linked-list children, each into its own container nested in the
    // host DOM. Their text folds into the host's cache ahead of the
    // child text to match `ElementNode.getTextContent`. The slots'
    // first-text key is deliberately kept out of __lexicalFirstTextKey,
    // which feeds children-only navigation / selection.
    const slots = $readSlots(node);
    const slotTextContent = slots.size > 0 ? $mountSlotChildren(node, dom, slots) : '';
    if (childrenSize === 0) {
      // Empty element: $createChildren's cache write is skipped, so set
      // the cache explicitly on the keyed DOM. Symmetric with the
      // (keyed-DOM) writes in $createChildren / $reconcileChildren.
      dom.__lexicalTextContent = slotTextContent;
      dom.__lexicalFirstTextKey = null;
      subTreeTextContent += slotTextContent;
      if (slots.size > 0) {
        dom.__lexicalSlotTextLength = slotTextContent.length;
      }
    } else {
      const outerBefore = subTreeTextContent;
      const endIndex = childrenSize - 1;
      const children = $createChildrenArray(node, activeNextNodeMap);
      $createChildren(children, node, 0, endIndex, $getDOMSlot(node, dom, activeEditor$1));
      // $createChildren set dom.__lexicalTextContent to the child-only
      // text and subTreeTextContent to outerBefore + childText. Rebuild
      // both slots-first (slot text precedes child text) so the host's
      // contribution to the parent accumulator stays in document order.
      // __lexicalFirstTextKey is left as the children's — slots stay out
      // of navigation / selection.
      if (slotTextContent !== '') {
        const childText = dom.__lexicalTextContent || '';
        dom.__lexicalTextContent = slotTextContent + childText;
        subTreeTextContent = outerBefore + slotTextContent + childText;
      }
      if (slots.size > 0) {
        dom.__lexicalSlotTextLength = slotTextContent.length;
      }
    }
    const format = node.__format;
    if (format !== 0) {
      setElementFormat(dom, format);
    }
    if (!node.isInline()) {
      $reconcileElementTerminatingLineBreak(null, node, dom);
    }
  } else {
    const text = node.getTextContent();
    if ($isDecoratorNode(node)) {
      const decorator = node.decorate(activeEditor$1, activeEditorConfig);
      if (decorator !== null) {
        reconcileDecorator(key, decorator);
      }
      // Decorators are always non editable
      dom.contentEditable = 'false';
      // @experimental named-slots. A decorator can host editable slots; each
      // mounts into its own detached contentEditable container that the
      // lexical-react component relocates into the decorate() chrome. The slot
      // text is already folded into `text` by getTextContent
      // ($getSlotsTextContent), so this mount is render-only —
      // $mountSlotChildren preserves subTreeTextContent.
      const slots = $readSlots(node);
      if (slots.size > 0) {
        $mountSlotChildren(node, dom, slots);
      }
    }
    subTreeTextContent += text;
  }
  if (slot !== null) {
    slot.insertChild(dom);
  }
  activeEditorDOMRenderConfig.$decorateDOM(node, null, dom, activeEditor$1);

  // Same cached-text-size invariant as $reconcileNode — every node leaving
  // a reconciler entry point in the next state carries a current label.
  $setCachedTextSize(node);
  {
    // Freeze the node in DEV to prevent accidental mutations
    Object.freeze(node);
  }
  setMutatedNode(mutatedNodes, activeEditorNodes, activeMutationListeners, node, 'created');
  return dom;
}
function $createChildren(children, element, _startIndex, endIndex, slot) {
  // Save outer scope and reset module state so this walk's
  // `dom.__lexicalFirstTextKey` write only reflects descendants captured
  // here, not a leaked first-text key from an earlier sibling's outer
  // walk. Mirrors what `$reconcileChildrenWithDirection` does at entry.
  const previousSubTreeTextContent = subTreeTextContent;
  const outerSaved = $beginCaptureGuard();
  subTreeTextContent = '';
  subTreeTextFormat = null;
  subTreeTextStyle = null;
  subTreeFirstTextKey = null;
  let startIndex = _startIndex;
  for (; startIndex <= endIndex; ++startIndex) {
    const saved = $beginCaptureGuard();
    $createNode(children[startIndex], slot);
    const node = activeNextNodeMap.get(children[startIndex]);
    if (node !== null && $isTextNode(node)) {
      if (subTreeTextFormat === null) {
        subTreeTextFormat = node.getFormat();
        subTreeTextStyle = node.getStyle();
        subTreeFirstTextKey = node.__key;
      }
    } else if (
    // inline $textContentRequiresDoubleLinebreakAtEnd
    $isElementNode(node) && startIndex < endIndex && !node.isInline()) {
      subTreeTextContent += DOUBLE_LINE_BREAK;
    }
    $endCaptureGuard(saved);
  }
  // Cache lives on the keyed DOM (outer wrapper) for wrapping elements;
  // identical to `slot.element` otherwise. Look up rather than thread a
  // parameter — the element's DOM is already in the map via
  // `storeDOMWithKey` by the time we get here.
  const cacheDom = activeEditor$1._keyToDOMMap.get(element.__key);
  if (!(cacheDom !== undefined)) {
    formatDevErrorMessage(`$createChildren: Element with key ${element.__key} missing from keyToDOMMap`);
  }
  cacheDom.__lexicalTextContent = subTreeTextContent;
  cacheDom.__lexicalFirstTextKey = subTreeFirstTextKey;
  subTreeTextContent = previousSubTreeTextContent + subTreeTextContent;
  // Outer-scope leftmost-wins: if the caller already had a first text
  // captured, restore it. Otherwise leave this walk's first-text in the
  // module state so the caller's outer walk picks it up.
  $endCaptureGuard(outerSaved);
}
function $isLastChildLineBreakOrDecorator(element, nodeMap) {
  if (element) {
    const lastKey = element.__last;
    if (lastKey) {
      const node = nodeMap.get(lastKey);
      if (node) {
        return $isLineBreakNode(node) ? 'line-break' : $isDecoratorNode(node) && node.isInline() ? 'decorator' : null;
      }
    }
    // A host with slots but no linked-list children is not empty (the slots
    // carry its content). The 'empty' line break exists to give a truly empty
    // block a caret target; on a slots-only host that <br> would instead be a
    // stray caret target in the host's own child area, after the slot
    // containers — text typed there leaks out of the slot. Skip it.
    return $readSlots(element).size > 0 ? null : 'empty';
  }
  return null;
}

// If we end an element with a LineBreakNode, then we need to add an additional <br>
function $reconcileElementTerminatingLineBreak(prevElement, nextElement, dom) {
  // Read previous render's last-child kind from the slot element's cache
  // so the prev-state DecoratorNode reference's isInline() (which routes
  // through getLatest() and would throw once the key is detached from the
  // active node map) is never called.
  const slot = $getDOMSlot(nextElement, dom, activeEditor$1);
  const slotElement = slot.element;
  const prevLineBreak = slotElement.__lexicalLastChildKind ?? null;
  const nextLineBreak = $isLastChildLineBreakOrDecorator(nextElement, activeNextNodeMap);
  if (prevLineBreak !== nextLineBreak) {
    slot.setManagedLineBreak(nextLineBreak);
  }
}
function reconcileTextFormat(element) {
  if (subTreeTextFormat != null && subTreeTextFormat !== element.__textFormat && !activeEditorStateReadOnly) {
    element.setTextFormat(subTreeTextFormat);
  }
}
function reconcileTextStyle(element) {
  if (subTreeTextStyle != null && subTreeTextStyle !== element.__textStyle && !activeEditorStateReadOnly) {
    element.setTextStyle(subTreeTextStyle);
  }
}
function $reconcileChildrenWithDirection(prevElement, nextElement, dom) {
  subTreeTextFormat = null;
  subTreeTextStyle = null;
  subTreeFirstTextKey = null;
  $reconcileChildren(prevElement, nextElement, $getDOMSlot(nextElement, dom, activeEditor$1));
  if (!$isRootOrShadowRoot(nextElement)) {
    // RootNode / ShadowRootNode never expose `__textFormat` / `__textStyle`
    // to user code: `LexicalElementNode.exportJSON` excludes them (#7968)
    // and selection inheritance only reads element format/style for
    // empty-element anchors gated on `!isRootTextContentEmpty`. Skipping
    // reconcile here keeps the invariant aligned and sidesteps the
    // suffix-fast-path's stale-format edge case at the root level.
    reconcileTextFormat(nextElement);
    reconcileTextStyle(nextElement);
  }
}
function $buildDirtyChildrenByParent() {
  const map = new Map();
  const addKeysToMap = keys => {
    for (const key of keys) {
      const node = activeNextNodeMap.get(key);
      if (node === undefined) {
        continue;
      }
      const parentKey = node.__parent;
      if (parentKey === null) {
        continue;
      }
      let set = map.get(parentKey);
      if (set === undefined) {
        set = new Set();
        map.set(parentKey, set);
      }
      set.add(key);
    }
  };
  addKeysToMap(activeDirtyElements.keys());
  addKeysToMap(activeDirtyLeaves);
  return map;
}

// Returns the key of the first child in the K-element suffix if all dirty
// children form a contiguous suffix of `parent` (and 0 < K < total children).
// Returns null otherwise — caller falls back to the full-walk fast path.
function $suffixStartIfContiguous(parent, dirty) {
  const k = dirty.size;
  if (k === 0 || k >= parent.__size) {
    return null;
  }
  let cur = parent.__last;
  let suffixStart = null;
  let i = 0;
  while (cur !== null && i < k) {
    if (!dirty.has(cur)) {
      return null;
    }
    suffixStart = cur;
    const node = activeNextNodeMap.get(cur);
    if (node === undefined) {
      return null;
    }
    cur = node.__prev;
    i++;
  }
  if (i !== k) {
    return null;
  }
  // The element immediately before the suffix must be non-dirty
  // (cur === null is excluded by the k < parent.__size check above).
  if (cur !== null && dirty.has(cur)) {
    return null;
  }
  return suffixStart;
}

// Suffix-incremental fast path for ±1 children-size mutations.
// Two structural patterns are supported (others bail to the general path):
//   - sizeDelta=+1, K=2: append at end, or end-split where one node
//     becomes two. Last 2 children of `nextElement` are dirty; one prev
//     child corresponds.
//   - sizeDelta=-1, K=1: boundary-collapse (e.g. backspace at the start
//     of a block merging into the previous). Last 1 child of `nextElement`
//     is dirty; two prev children correspond.
// (The same-size sizeDelta=0 case is inlined in `$reconcileChildren` and
// uses the same splice math with a simpler suffix walk.)
//
// Returns true if the cache was spliced and DOM mutated; false on bail
// (K mismatch, boundary mismatch, or out-of-order suffix overlap), in
// which case the caller falls through to `$reconcileNodeChildren`.
function $tryReconcileSuffixWithSizeDelta(prevElement, nextElement, slot, cacheDom, cachedParentText, suffixStartKey, k, sizeDelta) {
  // `slot.element` is the inner DOM where children live and where DOM
  // operations (replaceChild / removeChild / insertBefore) must target;
  // `cacheDom` is the outer keyed DOM that holds the parent's text-content
  // cache. For non-wrapping ElementNodes they're the same element; for
  // wrapping nodes (e.g. TableNode with a scrollable wrapper) they differ
  // and routing each role to the right element matters for correctness.
  // Caller invariant: this helper only handles ±1 children-size mutations.
  // Bailing on anything else preserves defense-in-depth in case the
  // upstream gate ever loosens.
  if (sizeDelta !== 1 && sizeDelta !== -1) {
    return false;
  }
  // Only the two patterns above are supported; e.g. K=3 dirty after a
  // split-into-three, or K=1 with sizeDelta=+1 (pure append with no
  // sibling cloned for `__next` link), all bail.
  const expectedK = sizeDelta === 1 ? 2 : 1;
  if (k !== expectedK) {
    return false;
  }
  // K' = K − sizeDelta: delta=+1, K=2 → K'=1; delta=-1, K=1 → K'=2.
  const kPrime = k - sizeDelta;
  let prevSuffixStartKey = prevElement.__last;
  for (let i = 0; i < kPrime - 1; i++) {
    if (prevSuffixStartKey === null) {
      return false;
    }
    const node = activePrevNodeMap.get(prevSuffixStartKey);
    if (node === undefined) {
      return false;
    }
    prevSuffixStartKey = node.__prev;
  }
  if (prevSuffixStartKey === null) {
    return false;
  }
  const nextStartNode = activeNextNodeMap.get(suffixStartKey);
  const prevStartNode = activePrevNodeMap.get(prevSuffixStartKey);
  if (nextStartNode === undefined || prevStartNode === undefined) {
    return false;
  }
  // Boundary identity: the node immediately before the suffix in next must
  // match the corresponding node in prev. Both null (suffix starts at first
  // child) is a match too.
  if (nextStartNode.__prev !== prevStartNode.__prev) {
    return false;
  }
  const nextSuffixKeys = [];
  let cur = suffixStartKey;
  for (let i = 0; i < k; i++) {
    if (cur === null) {
      return false;
    }
    nextSuffixKeys.push(cur);
    const node = activeNextNodeMap.get(cur);
    cur = node ? node.__next : null;
  }
  const prevSuffixKeys = [];
  cur = prevSuffixStartKey;
  for (let i = 0; i < kPrime; i++) {
    if (cur === null) {
      return false;
    }
    prevSuffixKeys.push(cur);
    const node = activePrevNodeMap.get(cur);
    cur = node ? node.__next : null;
  }
  // Two-pointer walk to validate ordering and plan ops in next-order.
  // Bail if a key is in both suffixes but at different positions (reorder).
  const prevSet = new Set(prevSuffixKeys);
  const nextSet = new Set(nextSuffixKeys);
  const ops = [];
  let pi = 0;
  let ni = 0;
  while (pi < kPrime && ni < k) {
    if (nextSuffixKeys[ni] === prevSuffixKeys[pi]) {
      ops.push({
        key: nextSuffixKeys[ni],
        kind: 'reconcile'
      });
      pi++;
      ni++;
    } else if (!nextSet.has(prevSuffixKeys[pi])) {
      ops.push({
        key: prevSuffixKeys[pi],
        kind: 'destroy'
      });
      pi++;
    } else if (!prevSet.has(nextSuffixKeys[ni])) {
      ops.push({
        key: nextSuffixKeys[ni],
        kind: 'create',
        nextIndex: ni
      });
      ni++;
    } else {
      return false;
    }
  }
  while (pi < kPrime) {
    ops.push({
      key: prevSuffixKeys[pi++],
      kind: 'destroy'
    });
  }
  while (ni < k) {
    ops.push({
      key: nextSuffixKeys[ni],
      kind: 'create',
      nextIndex: ni
    });
    ni++;
  }
  // `prevSuffixKeys` was built above by walking the prev map from
  // `prevSuffixStartKey`, so every key is present there and the helper
  // reproduces the same `kPrime`-length traversal.
  const oldSuffixLength = $prevSuffixTextSize(prevSuffixStartKey, kPrime);
  for (const op of ops) {
    const saved = $beginCaptureGuard();
    if (op.kind === 'reconcile') {
      $reconcileNode(op.key, slot.element);
    } else if (op.kind === 'destroy') {
      $destroyNode(op.key, slot.element);
    } else {
      let beforeDOM = null;
      for (let j = op.nextIndex + 1; j < k; j++) {
        const siblingDOM = activeEditor$1._keyToDOMMap.get(nextSuffixKeys[j]);
        if (siblingDOM !== undefined) {
          beforeDOM = siblingDOM;
          break;
        }
      }
      // No lexical sibling found: insertion goes at the end of the lexical
      // range, which is still bounded by `slot.before` for slots carrying a
      // trailing non-lexical decoration (e.g. a drag handle pinned as the
      // last DOM child of the parent). Falling back to `slot.before` keeps
      // those decorations behind the new child.
      $createNode(op.key, slot.withBefore(beforeDOM ?? slot.before));
    }
    if (op.kind !== 'destroy') {
      const opNode = activeNextNodeMap.get(op.key);
      if (opNode && $isTextNode(opNode) && subTreeTextFormat === null) {
        subTreeTextFormat = opNode.getFormat();
        subTreeTextStyle = opNode.getStyle();
        subTreeFirstTextKey = opNode.__key;
      }
    }
    $endCaptureGuard(saved);
  }
  let newSuffix = '';
  for (let i = 0; i < k; i++) {
    const node = activeNextNodeMap.get(nextSuffixKeys[i]);
    if (node === undefined) {
      return false;
    }
    let text;
    if ($isElementNode(node)) {
      const childKeyedDom = activeEditor$1._keyToDOMMap.get(nextSuffixKeys[i]);
      const cached = childKeyedDom && childKeyedDom.__lexicalTextContent;
      if (!(typeof cached === 'string')) {
        formatDevErrorMessage(`tryReconcileSuffixWithSizeDelta: missing __lexicalTextContent on child of type ${node.getType()} after suffix reconcile`);
      }
      text = cached;
    } else {
      text = node.getTextContent();
    }
    newSuffix += text;
    if (i < k - 1 && $isElementNode(node) && !node.isInline()) {
      newSuffix += DOUBLE_LINE_BREAK;
    }
  }
  // @experimental named-slots. `cachedParentText` holds the host's combined
  // cache (slot text folded slots-first ahead of the child text). The suffix
  // we just rebuilt is child-only, so strip the slot prefix to recover the
  // child-only cache before splicing, and write child-only here — the slot
  // fold in `$reconcileNode` re-prepends the slot text. `slotLen` is `0` for
  // non-slot hosts, so the slice is a no-op and they splice unchanged.
  const slotLen = cacheDom.__lexicalSlotTextLength || 0;
  const prevChildText = slotLen > 0 ? cachedParentText.slice(slotLen) : cachedParentText;
  cacheDom.__lexicalTextContent = prevChildText.slice(0, prevChildText.length - oldSuffixLength) + newSuffix;
  return true;
}

/**
 * Decide whether the post-suffix-walk values of `subTreeTextFormat` /
 * `subTreeTextStyle` should be kept (the prefix has no text descendant
 * and the suffix carries the canonical first text) or replaced with the
 * prev-cycle's canonical values (the prefix is still authoritative).
 *
 * The cached `__lexicalFirstTextKey` on `dom` is the deep TextNode key
 * recorded when this element's children were last walked. We climb its
 * ancestor chain in next-state until we reach a direct child of
 * `nextElement`, then probe `dirtyChildren`: if that direct child is
 * dirty (or the cached key is missing from the next map), the cached
 * key has been moved into the suffix's subtree or destroyed, so the
 * suffix-derived values are authoritative. Otherwise the prefix is
 * canonical and we recover format/style from the live text node, which
 * lets `reconcileTextFormat` / `reconcileTextStyle` no-op via their
 * existing equality check against the parent's `__textFormat` /
 * `__textStyle`.
 *
 * Walk depth is bounded by tree depth from the text node to the
 * reconciled element (typically 1 — text directly under a paragraph).
 * Always refreshes the cache for the next cycle.
 */
function $resolveSuffixPathFormat(nextElement, dom, dirtyChildren) {
  const cachedFirstTextKey = dom.__lexicalFirstTextKey;
  if (cachedFirstTextKey != null) {
    const parentKey = nextElement.__key;
    let ancestor = cachedFirstTextKey;
    while (ancestor !== null) {
      const node = activeNextNodeMap.get(ancestor);
      if (node === undefined) {
        ancestor = null;
        break;
      }
      if (node.__parent === parentKey) {
        break;
      }
      ancestor = node.__parent;
    }
    if (ancestor !== null && !dirtyChildren.has(ancestor)) {
      const textNode = activeNextNodeMap.get(cachedFirstTextKey);
      if ($isTextNode(textNode)) {
        // Prefix carries the canonical first text descendant. Recover
        // format/style from the live next-state node — `reconcileTextFormat`
        // will compare against `nextElement.__textFormat` and no-op when
        // the prev cycle's value is still correct.
        subTreeTextFormat = textNode.getFormat();
        subTreeTextStyle = textNode.getStyle();
        // Cache key is unchanged this cycle.
        return;
      }
    }
  }
  // Either no prev text descendant, ancestor not found, or ancestor is
  // dirty. Keep the suffix-derived `subTreeTextFormat` / `subTreeTextStyle`
  // so reconcileTextFormat updates the parent (or no-ops on root /
  // shadow root via the gate). Refresh the cache to reflect this cycle's
  // first text descendant, recorded by the recursive suffix-child walks
  // into `subTreeFirstTextKey`.
  dom.__lexicalFirstTextKey = subTreeFirstTextKey;
}
function $reconcileChildren(prevElement, nextElement, slot) {
  const previousSubTreeTextContent = subTreeTextContent;
  const prevChildrenSize = prevElement.__size;
  const nextChildrenSize = nextElement.__size;
  subTreeTextContent = '';
  // `dom` is `slot.element` (the inner DOM where children live and where
  // DOM operations target). `cacheDom` is the keyed DOM (outer wrapper
  // for nodes that wrap, identical to `dom` otherwise) and holds the
  // `__lexicalTextContent` / `__lexicalFirstTextKey` caches for this
  // element. Keeping them split lets wrapping nodes (TableNode etc.)
  // route cache R/W to the outer DOM while DOM ops stay on the slot.
  const dom = slot.element;
  const cacheDom = activeEditor$1._keyToDOMMap.get(nextElement.__key);
  if (!(cacheDom !== undefined)) {
    formatDevErrorMessage(`$reconcileChildren: Element with key ${nextElement.__key} missing from keyToDOMMap`);
  }
  const sizeDelta = nextChildrenSize - prevChildrenSize;
  if (// A FULL_RECONCILE (e.g. `setEditorState`, which backs history
  // undo/redo) swaps the whole node map wholesale without routing
  // structural changes through `getWritable()`, so `_cloneNotNeeded`
  // is empty even when prev and next children differ by key. That
  // breaks the `sizeDelta === 0` walk below, which starts at
  // `prevElement.__first` but advances via the next map's `__next`
  // pointers — assuming both lists hold the same keys in the same
  // order. With a same-size key swap (undo replacing a CodeNode with
  // the paragraphs it came from) the walk reaches a next-only key and
  // `$reconcileNode` throws on the missing prev node (#8563). Dirty
  // tracking is meaningless in this mode anyway, so fall through to the
  // general key-diffing path.
  !treatAllNodesAsDirty && Math.abs(sizeDelta) <= 1 && prevChildrenSize >= MIN_FAST_PATH_CHILDREN && prevElement.__first === nextElement.__first && (
  // For sizeDelta=0 the parent must not have been cloned this cycle —
  // any structural mutation routed through Lexical's mutation API
  // (insertBefore/insertAfter/replace/remove/append etc.) keeps the
  // parent in `_cloneNotNeeded` via `getWritable()`, so this single
  // check already covers a stale `__last` for those cases. Direct
  // pointer mutation that bypasses `getWritable()` is outside the
  // contract and not guarded against here. For sizeDelta=±1 the
  // parent is always cloned (its `__size` mutation goes through
  // `getWritable`), so the same check would dead-code that branch.
  sizeDelta !== 0 || !activeEditor$1._cloneNotNeeded.has(prevElement.__key))) {
    // Suffix-incremental fast path: when the dirty children form a
    // contiguous suffix and the parent already has a valid cached text,
    // splice the new suffix into the cache instead of walking every child.
    // The non-dirty prefix (and its DLB into the suffix) stays untouched,
    // so format/style propagation — which captures the first text descendant
    // — is unaffected.
    const cachedParentText = cacheDom.__lexicalTextContent;
    const dirtyChildren = activeDirtyChildrenByParent.get(prevElement.__key);
    if (!treatAllNodesAsDirty && typeof cachedParentText === 'string' && dirtyChildren !== undefined) {
      const suffixStartKey = $suffixStartIfContiguous(nextElement, dirtyChildren);
      if (suffixStartKey !== null) {
        const k = dirtyChildren.size;
        if (sizeDelta === 0) {
          // Same keys in the same order across prev and next (gated by
          // `prevElement.__first === nextElement.__first`, no clone), so the
          // prev-map walk visits exactly this suffix.
          const oldSuffixLength = $prevSuffixTextSize(suffixStartKey, k);
          let cur = suffixStartKey;
          let i = 0;
          while (cur !== null && i < k) {
            const node = activeNextNodeMap.get(cur);
            if (node === undefined) {
              break;
            }
            const saved = $beginCaptureGuard();
            $reconcileNode(cur, dom);
            if ($isTextNode(node) && subTreeTextFormat === null) {
              subTreeTextFormat = node.getFormat();
              subTreeTextStyle = node.getStyle();
              subTreeFirstTextKey = node.__key;
            }
            $endCaptureGuard(saved);
            cur = node.__next;
            i++;
          }
          let newSuffix = '';
          cur = suffixStartKey;
          i = 0;
          while (cur !== null && i < k) {
            const node = activeNextNodeMap.get(cur);
            if (node === undefined) {
              break;
            }
            let text;
            if ($isElementNode(node)) {
              // Read from the current keyed DOM map, not the prev snapshot.
              // The just-completed reconcile loop above can fire
              // `$reconcileNode`'s `parentDOM.replaceChild` branch when a
              // dirty child's `$updateDOM` returns true (e.g. `ListNode`
              // toggling `__tag` / `__listType`); the snapshot would still
              // point at the detached old DOM whose `__lexicalTextContent`
              // is from the previous cycle. Mirrors the size-delta helper
              // at L856.
              const childKeyedDom = activeEditor$1._keyToDOMMap.get(cur);
              const cached = childKeyedDom && childKeyedDom.__lexicalTextContent;
              if (!(typeof cached === 'string')) {
                formatDevErrorMessage(`reconcileChildren same-size suffix: missing __lexicalTextContent on child of type ${node.getType()} after reconcile`);
              }
              text = cached;
            } else {
              text = node.getTextContent();
            }
            newSuffix += text;
            if (i < k - 1 && $isElementNode(node) && !node.isInline()) {
              newSuffix += DOUBLE_LINE_BREAK;
            }
            cur = node.__next;
            i++;
          }

          // @experimental named-slots. Strip the slot prefix to recover the
          // child-only cache, splice the child suffix, and write child-only —
          // the slot fold in `$reconcileNode` re-prepends the slot text.
          // `slotLen` is `0` for non-slot hosts (slice is a no-op), so their
          // cache stays bit-identical and the fold leaves it untouched.
          const slotLen = cacheDom.__lexicalSlotTextLength || 0;
          const prevChildText = slotLen > 0 ? cachedParentText.slice(slotLen) : cachedParentText;
          const newChildText = prevChildText.slice(0, prevChildText.length - oldSuffixLength) + newSuffix;
          cacheDom.__lexicalTextContent = newChildText;
          subTreeTextContent = previousSubTreeTextContent + newChildText;
          // Recover the canonical first-text format/style for this parent.
          // If the prefix carries it, `reconcileTextFormat` no-ops via
          // equality. If the prefix has no text descendant, the
          // suffix-derived values stay and propagate correctly.
          $resolveSuffixPathFormat(nextElement, cacheDom, dirtyChildren);
          return;
        }
        if ($tryReconcileSuffixWithSizeDelta(prevElement, nextElement, slot, cacheDom, cachedParentText, suffixStartKey, k, sizeDelta)) {
          // Helper returns true only after writing cacheDom.__lexicalTextContent
          // (helper body's final line). Match the PR-wide strict-on-miss
          // policy rather than masking a future regression with `?? ''`.
          const newCachedText = cacheDom.__lexicalTextContent;
          if (!(typeof newCachedText === 'string')) {
            formatDevErrorMessage(`reconcileChildren: $tryReconcileSuffixWithSizeDelta returned true without writing __lexicalTextContent`);
          }
          subTreeTextContent = previousSubTreeTextContent + newCachedText;
          $resolveSuffixPathFormat(nextElement, cacheDom, dirtyChildren);
          return;
        }
        // Bail: helper rejected the size-delta candidate (K mismatch,
        // boundary mismatch, or out-of-order suffix overlap). Fall through
        // to the outer general path.
      }
    }
    if (sizeDelta === 0) {
      let nodeKey = prevElement.__first;
      let i = 0;
      while (nodeKey !== null) {
        const node = activeNextNodeMap.get(nodeKey);
        if (node === undefined) {
          break;
        }
        const isDirty = treatAllNodesAsDirty || activeDirtyLeaves.has(nodeKey) || activeDirtyElements.has(nodeKey);
        const saved = $beginCaptureGuard();
        if (isDirty) {
          $reconcileNode(nodeKey, dom);
        } else {
          // Subtree is structurally and content-clean — accumulate the
          // cached text from the existing DOM rather than walking back
          // through `$reconcileNode`.
          let text;
          let childKeyedDom;
          if ($isElementNode(node)) {
            childKeyedDom = activePrevKeyToDOMMap.get(nodeKey);
            const cached = childKeyedDom && childKeyedDom.__lexicalTextContent;
            if (!(typeof cached === 'string')) {
              formatDevErrorMessage(`reconcileChildren structurally-clean walk: missing __lexicalTextContent on non-dirty child of type ${node.getType()}`);
            }
            text = cached;
          } else {
            text = node.getTextContent();
          }
          subTreeTextContent += text;
          if (childKeyedDom !== undefined) {
            $bubbleChildFirstText(childKeyedDom);
          }
        }
        if ($isTextNode(node)) {
          if (subTreeTextFormat === null) {
            subTreeTextFormat = node.getFormat();
            subTreeTextStyle = node.getStyle();
            subTreeFirstTextKey = node.__key;
          }
        } else if ($isElementNode(node) && i < nextChildrenSize - 1 && !node.isInline()) {
          subTreeTextContent += DOUBLE_LINE_BREAK;
        }
        $endCaptureGuard(saved);
        nodeKey = node.__next;
        i++;
      }
      cacheDom.__lexicalTextContent = subTreeTextContent;
      cacheDom.__lexicalFirstTextKey = subTreeFirstTextKey;
      subTreeTextContent = previousSubTreeTextContent + subTreeTextContent;
      return;
    }
    // sizeDelta !== 0 with no successful suffix-incremental path: fall
    // through to the outer general walk (`$reconcileNodeChildren`), which
    // handles arbitrary size changes.
  }
  if (prevChildrenSize === 1 && nextChildrenSize === 1) {
    const prevFirstChildKey = prevElement.__first;
    const nextFirstChildKey = nextElement.__first;
    if (prevFirstChildKey === nextFirstChildKey) {
      $reconcileNode(prevFirstChildKey, dom);
    } else {
      const lastDOM = getPrevElementByKeyOrThrow(prevFirstChildKey);
      const replacementDOM = $createNode(nextFirstChildKey, null);
      try {
        if (lastDOM.parentNode === dom) {
          dom.replaceChild(replacementDOM, lastDOM);
        } else {
          // lastDOM was reused as a descendant of replacementDOM (cross-parent
          // move, e.g. wrapping an image in a link). It's already detached
          // from `dom`, so just insert the replacement.
          slot.insertChild(replacementDOM);
        }
      } catch (error) {
        if (typeof error === 'object' && error != null) {
          const msg = `${error.toString()} Parent: ${dom.tagName}, new child: {tag: ${replacementDOM.tagName} key: ${nextFirstChildKey}}, old child: {tag: ${lastDOM.tagName}, key: ${prevFirstChildKey}}.`;
          throw new Error(msg);
        } else {
          throw error;
        }
      }
      $destroyNode(prevFirstChildKey, null);
    }
    const nextChildNode = activeNextNodeMap.get(nextFirstChildKey);
    if ($isTextNode(nextChildNode)) {
      if (subTreeTextFormat === null) {
        subTreeTextFormat = nextChildNode.getFormat();
        subTreeTextStyle = nextChildNode.getStyle();
        subTreeFirstTextKey = nextChildNode.__key;
      }
    }
  } else {
    const prevChildren = $createChildrenArray(prevElement, activePrevNodeMap);
    const nextChildren = $createChildrenArray(nextElement, activeNextNodeMap);
    if (!(prevChildren.length === prevChildrenSize)) {
      formatDevErrorMessage(`$reconcileChildren: prevChildren.length !== prevChildrenSize`);
    }
    if (!(nextChildren.length === nextChildrenSize)) {
      formatDevErrorMessage(`$reconcileChildren: nextChildren.length !== nextChildrenSize`);
    }
    if (prevChildrenSize === 0) {
      if (nextChildrenSize !== 0) {
        $createChildren(nextChildren, nextElement, 0, nextChildrenSize - 1, slot);
      }
    } else if (nextChildrenSize === 0) {
      if (prevChildrenSize !== 0) {
        const canUseFastPath = slot.after == null && slot.before == null &&
        // Slot containers are prepended into this same DOM (slots-first), so
        // clearing it with `textContent = ''` would wipe them along with the
        // children. Fall back to the keyed slow path, which removes only the
        // child DOM nodes and leaves the slot containers intact.
        $readSlots(nextElement).size === 0 && slot.element.__lexicalLineBreak == null;
        $destroyChildren(prevChildren, 0, prevChildrenSize - 1, canUseFastPath ? null : dom);
        if (canUseFastPath) {
          // Fast path for removing DOM nodes
          dom.textContent = '';
        }
      }
    } else {
      $reconcileNodeChildren(nextElement, prevChildren, nextChildren, prevChildrenSize, nextChildrenSize, slot);
    }
  }
  cacheDom.__lexicalTextContent = subTreeTextContent;
  cacheDom.__lexicalFirstTextKey = subTreeFirstTextKey;
  subTreeTextContent = previousSubTreeTextContent + subTreeTextContent;
}
function $reconcileNode(key, parentDOM) {
  const prevNode = activePrevNodeMap.get(key);
  let nextNode = activeNextNodeMap.get(key);
  if (prevNode === undefined || nextNode === undefined) {
    {
      formatDevErrorMessage(`reconcileNode: prevNode or nextNode does not exist in nodeMap`);
    }
  }
  const isDirty = treatAllNodesAsDirty || activeDirtyLeaves.has(key) || activeDirtyElements.has(key);
  const dom = getElementByKeyOrThrow(activeEditor$1, key);

  // If the node key points to the same instance in both states
  // and isn't dirty, we just update the text content cache
  // and return the existing DOM Node.
  if (prevNode === nextNode && !isDirty) {
    let text;
    if ($isElementNode(prevNode)) {
      const previousSubTreeTextContent = dom.__lexicalTextContent;
      // Strict invariant — every element reconciled in a previous cycle has
      // both `__lexicalTextContent` and `__lexicalFirstTextKey` set on its
      // keyed DOM by `$createNode` / `$reconcileChildren`. A missing cache
      // here would silently desync the parent text accumulation and pair
      // with `$bubbleChildFirstText`'s own strict invariant a line below,
      // so fail loudly here instead.
      if (!(typeof previousSubTreeTextContent === 'string')) {
        formatDevErrorMessage(`reconcileNode: missing __lexicalTextContent on non-dirty element of type ${prevNode.getType()}`);
      }
      text = previousSubTreeTextContent;
      // Bubble this clean element's cached first-text descendant up to the
      // caller's scope so a non-dirty prefix carrying the canonical first
      // text still wins over a later dirty sibling whose recursion would
      // otherwise clobber the module state.
      $bubbleChildFirstText(dom);
    } else {
      text = prevNode.getTextContent();
    }
    subTreeTextContent += text;
    return dom;
  }
  // If the node key doesn't point to the same instance in both maps,
  // it was cloned. If it's also dirty, we mark it as mutated.
  if (prevNode !== nextNode && isDirty) {
    setMutatedNode(mutatedNodes, activeEditorNodes, activeMutationListeners, nextNode, 'updated');
  }

  // Update node. If it returns true, we need to unmount and re-create the node
  if (activeEditorDOMRenderConfig.$updateDOM(nextNode, prevNode, dom, activeEditor$1)) {
    const replacementDOM = $createNode(key, null);
    if (parentDOM === null) {
      {
        formatDevErrorMessage(`reconcileNode: parentDOM is null`);
      }
    }
    parentDOM.replaceChild(replacementDOM, dom);
    $destroyNode(key, null);
    return replacementDOM;
  }
  if ($isElementNode(prevNode)) {
    if (!$isElementNode(nextNode)) {
      formatDevErrorMessage(`Node with key ${key} changed from ElementNode to !ElementNode`);
    }
    const nextIndent = nextNode.__indent;
    if (treatAllNodesAsDirty || nextIndent !== prevNode.__indent) {
      setElementIndent(dom, nextIndent);
    }
    const nextFormat = nextNode.__format;
    if (treatAllNodesAsDirty || nextFormat !== prevNode.__format) {
      setElementFormat(dom, nextFormat);
    }
    // @experimental named-slots reconcile. Slot edits dirty the host
    // through __slotHost propagation, so a clean host means its slots are
    // unchanged and the cache already holds their text — only diff when
    // dirty and the node has (or had) slots. Returns the slot text to fold
    // slots-first ahead of the child text in each dirty branch below.
    const slotTextContent = isDirty && ($readSlots(nextNode).size > 0 || $readSlots(prevNode).size > 0) ? $reconcileSlotChildren(prevNode, nextNode, dom) : '';
    if (isDirty) {
      const outerBefore = subTreeTextContent;
      $reconcileChildrenWithDirection(prevNode, nextNode, dom);
      if (!$isRootNode(nextNode) && !nextNode.isInline()) {
        $reconcileElementTerminatingLineBreak(prevNode, nextNode, dom);
      }
      // Fold slot text slots-first, ahead of the child text the children
      // reconcile just wrote, matching `ElementNode.getTextContent` and the
      // create path's else branch.
      if (slotTextContent !== '') {
        const childText = dom.__lexicalTextContent || '';
        dom.__lexicalTextContent = slotTextContent + childText;
        subTreeTextContent = outerBefore + slotTextContent + childText;
        dom.__lexicalSlotTextLength = slotTextContent.length;
      } else if ($readSlots(nextNode).size > 0 || $readSlots(prevNode).size > 0) {
        // Slot existed but produced no text this cycle (removed or emptied):
        // clear the stale prefix length so the next suffix fast path strips
        // nothing from the now child-only cache.
        dom.__lexicalSlotTextLength = 0;
      }
    } else {
      // Currently unreachable under normal flow — `getWritable()` always
      // calls `internalMarkNodeAsDirty` (LexicalNode.ts: getWritable),
      // so a non-identity (`prevNode !== nextNode`) reconcile implies
      // `isDirty` is true. Kept as defense-in-depth in case the dirty
      // propagation contract changes.
      const previousSubTreeTextContent = dom.__lexicalTextContent;
      // Same strict invariant as the prevNode === nextNode branch above —
      // the cache is set on every reconciled element and surviving until
      // here without one means an upstream invariant was broken.
      if (!(typeof previousSubTreeTextContent === 'string')) {
        formatDevErrorMessage(`reconcileNode: missing __lexicalTextContent on cloned non-dirty element of type ${prevNode.getType()}`);
      }
      subTreeTextContent += previousSubTreeTextContent;
      // Mirror the prevNode === nextNode branch: bubble this clean element's
      // cached first-text descendant up to the caller's scope.
      $bubbleChildFirstText(dom);
    }
    if (treatAllNodesAsDirty || nextNode.__dir !== prevNode.__dir || nextNode.__parent !== prevNode.__parent) {
      $setElementDirection(dom, nextNode);
      if (
      // Root node direction changing from set to unset (or vice versa)
      // changes how children's direction is calculated.
      $isRootNode(nextNode) &&
      // Can skip if all children already reconciled.
      !treatAllNodesAsDirty) {
        for (const child of nextNode.getChildren()) {
          if ($isElementNode(child)) {
            const childDom = getElementByKeyOrThrow(activeEditor$1, child.getKey());
            $setElementDirection(childDom, child);
          }
        }
      }
    }
  } else {
    const text = nextNode.getTextContent();
    if ($isDecoratorNode(nextNode)) {
      const decorator = nextNode.decorate(activeEditor$1, activeEditorConfig);
      if (decorator !== null) {
        reconcileDecorator(key, decorator);
      }
      // @experimental named-slots. Mirror the element-host slot reconcile for
      // decorator hosts (including its isDirty gate: a clean host means its
      // slots are unchanged). Slot text is already folded into `text` by
      // getTextContent, so this is render-only ($reconcileSlotChildren
      // preserves subTreeTextContent).
      if (isDirty && ($readSlots(nextNode).size > 0 || $readSlots(prevNode).size > 0)) {
        $reconcileSlotChildren(prevNode, nextNode, dom);
      }
    }
    subTreeTextContent += text;
  }
  if (!activeEditorStateReadOnly && $isRootNode(nextNode)) {
    // Re-fetch the latest root: a child reconcile (e.g. `reconcileTextFormat`
    // calling `setTextFormat` on the parent) can clone the root mid-cycle,
    // leaving the local `nextNode` pointing at a stale instance whose
    // `__cachedText` would no-op the comparison below while the actual root
    // in the map carries `null` (RootNode constructor's default).
    const latestRoot = nextNode.getLatest();
    if (latestRoot.__cachedText !== subTreeTextContent) {
      // Cache the latest text content.
      const nextRootNode = latestRoot.getWritable();
      nextRootNode.__cachedText = subTreeTextContent;
      // This invariant from #8099 is left commented out for performance reasons
      // if (__DEV__) {
      //   const computedTextContent =
      //     ElementNode.prototype.getTextContent.call(nextRootNode);
      //   devInvariant(
      //     computedTextContent === subTreeTextContent,
      //     'LexicalReconciler: Computed nextRootNode.getTextContent() does not match nextRootNode.__cachedText %s !== %s (dom.__lexicalTextContent %s)',
      //     JSON.stringify(computedTextContent),
      //     JSON.stringify(subTreeTextContent),
      //     JSON.stringify(dom.__lexicalTextContent),
      //   );
      // }
      nextNode = nextRootNode;
    }
  }
  activeEditorDOMRenderConfig.$decorateDOM(nextNode, prevNode, dom, activeEditor$1);
  // Maintain the cached-text-size invariant: every reconciled node carries
  // a current label so the next cycle's reads of the previous-state
  // instance are O(1) and never need to fall through to a recursive walk
  // that would resolve via `getLatest()` -> next state.
  $setCachedTextSize(nextNode);
  {
    // Freeze the node in DEV to prevent accidental mutations
    Object.freeze(nextNode);
  }
  return dom;
}
function reconcileDecorator(key, decorator) {
  let pendingDecorators = activeEditor$1._pendingDecorators;
  const currentDecorators = activeEditor$1._decorators;
  if (pendingDecorators === null) {
    if (currentDecorators[key] === decorator) {
      return;
    }
    pendingDecorators = cloneDecorators(activeEditor$1);
  }
  pendingDecorators[key] = decorator;
}
function getNextSibling(element) {
  let nextSibling = element.nextSibling;
  if (nextSibling !== null && nextSibling === activeEditor$1._blockCursorElement) {
    nextSibling = nextSibling.nextSibling;
  }
  return nextSibling;
}
function childrenSet(children, start) {
  const s = new Set();
  for (let i = start; i < children.length; i++) {
    s.add(children[i]);
  }
  return s;
}
function $reconcileNodeChildren(nextElement, prevChildren, nextChildren, prevChildrenLength, nextChildrenLength, slot) {
  const prevEndIndex = prevChildrenLength - 1;
  const nextEndIndex = nextChildrenLength - 1;
  let prevChildrenSet;
  let nextChildrenSet;
  let siblingDOM = slot.getFirstChild();
  let prevIndex = 0;
  let nextIndex = 0;
  while (prevIndex <= prevEndIndex && nextIndex <= nextEndIndex) {
    const prevKey = prevChildren[prevIndex];
    const nextKey = nextChildren[nextIndex];
    const saved = $beginCaptureGuard();
    if (prevKey === nextKey) {
      siblingDOM = getNextSibling($reconcileNode(nextKey, slot.element));
      prevIndex++;
      nextIndex++;
    } else {
      if (nextChildrenSet === undefined) {
        nextChildrenSet = childrenSet(nextChildren, nextIndex);
      }
      if (prevChildrenSet === undefined) {
        prevChildrenSet = childrenSet(prevChildren, prevIndex);
      } else if (!prevChildrenSet.has(prevKey)) {
        // continue if prevKey has already been moved
        prevIndex++;
        $endCaptureGuard(saved);
        continue;
      }
      if (!nextChildrenSet.has(prevKey)) {
        // Remove prev and continue
        siblingDOM = getNextSibling(getPrevElementByKeyOrThrow(prevKey));
        $destroyNode(prevKey, slot.element);
        prevIndex++;
        prevChildrenSet.delete(prevKey);
        $endCaptureGuard(saved);
        continue;
      }
      if (!prevChildrenSet.has(nextKey)) {
        // Create next. When siblingDOM is null we're appending at the end
        // of the lexical range; fall back to `slot.before` so slots with a
        // trailing non-lexical decoration (e.g. block drag handle) keep
        // that decoration after the new child.
        $createNode(nextKey, slot.withBefore(siblingDOM ?? slot.before));
        nextIndex++;
      } else {
        // Move next
        const childDOM = getElementByKeyOrThrow(activeEditor$1, nextKey);
        if (childDOM !== siblingDOM) {
          slot.withBefore(siblingDOM ?? slot.before).insertChild(childDOM);
        }
        siblingDOM = getNextSibling($reconcileNode(nextKey, slot.element));
        prevIndex++;
        nextIndex++;
      }
    }
    const node = activeNextNodeMap.get(nextKey);
    if (node !== null && $isTextNode(node)) {
      if (subTreeTextFormat === null) {
        subTreeTextFormat = node.getFormat();
        subTreeTextStyle = node.getStyle();
        subTreeFirstTextKey = node.__key;
      }
    } else if (
    // inline $textContentRequiresDoubleLinebreakAtEnd
    $isElementNode(node) && nextIndex <= nextEndIndex && !node.isInline()) {
      subTreeTextContent += DOUBLE_LINE_BREAK;
    }
    $endCaptureGuard(saved);
  }
  const appendNewChildren = prevIndex > prevEndIndex;
  const removeOldChildren = nextIndex > nextEndIndex;
  if (appendNewChildren && !removeOldChildren) {
    const previousNode = nextChildren[nextEndIndex + 1];
    const insertDOM = previousNode === undefined ? null : activeEditor$1.getElementByKey(previousNode);
    $createChildren(nextChildren, nextElement, nextIndex, nextEndIndex,
    // Preserve the slot's trailing decoration anchor when appending at
    // the end (insertDOM === null).
    slot.withBefore(insertDOM ?? slot.before));
  } else if (removeOldChildren && !appendNewChildren) {
    $destroyChildren(prevChildren, prevIndex, prevEndIndex, slot.element);
  }
}
function $reconcileRoot(prevEditorState, nextEditorState, editor, dirtyType, dirtyElements, dirtyLeaves) {
  // We cache text content to make retrieval more efficient.
  // The cache must be rebuilt during reconciliation to account for any changes.
  // Reset all four sub-tree accumulators at cycle start so the
  // first-text/format/style invariant doesn't carry state across cycles.
  subTreeTextContent = '';
  subTreeTextFormat = null;
  subTreeTextStyle = null;
  subTreeFirstTextKey = null;
  // Rather than pass around a load of arguments through the stack recursively
  // we instead set them as bindings within the scope of the module.
  treatAllNodesAsDirty = dirtyType === FULL_RECONCILE;
  activeEditor$1 = editor;
  activeEditorConfig = editor._config;
  activeEditorDOMRenderConfig = editor._config.dom || DEFAULT_EDITOR_DOM_CONFIG;
  activeEditorNodes = editor._nodes;
  activeMutationListeners = activeEditor$1._listeners.mutation;
  activeDirtyElements = dirtyElements;
  activeDirtyLeaves = dirtyLeaves;
  activePrevNodeMap = prevEditorState._nodeMap;
  activePrevEditorState = prevEditorState;
  activeNextNodeMap = nextEditorState._nodeMap;
  activeEditorStateReadOnly = nextEditorState._readOnly;
  activePrevKeyToDOMMap = cloneMap(editor._keyToDOMMap);
  activeDirtyChildrenByParent = $buildDirtyChildrenByParent();
  // We keep track of mutated nodes so we can trigger mutation
  // listeners later in the update cycle.
  const currentMutatedNodes = new Map();
  mutatedNodes = currentMutatedNodes;
  $reconcileNode('root', null);
  // We don't want a bunch of void checks throughout the scope
  // so instead we make it seem that these values are always set.
  // We also want to make sure we clear them down, otherwise we
  // can leak memory.
  // @ts-ignore
  activeEditor$1 = undefined;
  // @ts-ignore
  activeEditorNodes = undefined;
  // @ts-ignore
  activeDirtyElements = undefined;
  // @ts-ignore
  activeDirtyLeaves = undefined;
  // @ts-ignore
  activePrevNodeMap = undefined;
  // @ts-ignore
  activePrevEditorState = undefined;
  // @ts-ignore
  activeNextNodeMap = undefined;
  // @ts-ignore
  activeEditorConfig = undefined;
  // @ts-ignore
  activePrevKeyToDOMMap = undefined;
  // @ts-ignore
  activeDirtyChildrenByParent = undefined;
  // @ts-ignore
  mutatedNodes = undefined;
  activeEditorDOMRenderConfig = DEFAULT_EDITOR_DOM_CONFIG;
  return currentMutatedNodes;
}
function storeDOMWithKey(key, dom, editor) {
  const keyToDOMMap = editor._keyToDOMMap;
  setNodeKeyOnDOMNode(dom, editor, key);
  keyToDOMMap.set(key, dom);
}
function getPrevElementByKeyOrThrow(key) {
  const element = activePrevKeyToDOMMap.get(key);
  if (element === undefined) {
    {
      formatDevErrorMessage(`Reconciliation: could not find DOM element for node key ${key}`);
    }
  }
  return element;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */


/*@__INLINE__*/
function warnOnlyOnce(message) {
  {
    let run = false;
    return () => {
      if (!run) {
        console.warn(message);
      }
      run = true;
    };
  }
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Crete a command that can be used with `editor.dispatchCommand` and
 * `editor.registerCommand`. Commands are used by unique reference, not by
 * name.
 *
 * @param type A string to identify the command, very helpful for debugging
 * @returns A new LexicalCommand
 *
 * @__NO_SIDE_EFFECTS__
 */
function createCommand(type) {
  return {
    type
  };
}
const SELECTION_CHANGE_COMMAND = /* @__PURE__ */createCommand('SELECTION_CHANGE_COMMAND');
const SELECTION_INSERT_CLIPBOARD_NODES_COMMAND = /* @__PURE__ */createCommand('SELECTION_INSERT_CLIPBOARD_NODES_COMMAND');
const CLICK_COMMAND = /* @__PURE__ */createCommand('CLICK_COMMAND');
const BEFORE_INPUT_COMMAND = /* @__PURE__ */createCommand('BEFORE_INPUT_COMMAND');
const INPUT_COMMAND = /* @__PURE__ */createCommand('INPUT_COMMAND');
const COMPOSITION_START_COMMAND = /* @__PURE__ */createCommand('COMPOSITION_START_COMMAND');
const COMPOSITION_END_COMMAND = /* @__PURE__ */createCommand('COMPOSITION_END_COMMAND');
/**
 * Dispatched to delete a character, the payload will be `true` if the deletion
 * is backwards (backspace or delete on macOS) and `false` if forwards
 * (delete or Fn+Delete on macOS).
 */
const DELETE_CHARACTER_COMMAND = /* @__PURE__ */createCommand('DELETE_CHARACTER_COMMAND');
/**
 * Dispatched to insert a line break. With a false payload the
 * cursor moves to the new line (Shift+Enter), with a true payload the cursor
 * does not move (Ctrl+O on macOS).
 */
const INSERT_LINE_BREAK_COMMAND = /* @__PURE__ */createCommand('INSERT_LINE_BREAK_COMMAND');
const INSERT_PARAGRAPH_COMMAND = /* @__PURE__ */createCommand('INSERT_PARAGRAPH_COMMAND');
const CONTROLLED_TEXT_INSERTION_COMMAND = /* @__PURE__ */createCommand('CONTROLLED_TEXT_INSERTION_COMMAND');
const PASTE_COMMAND = /* @__PURE__ */createCommand('PASTE_COMMAND');
const REMOVE_TEXT_COMMAND = /* @__PURE__ */createCommand('REMOVE_TEXT_COMMAND');
/**
 * Dispatched to delete a word, the payload will be `true` if the deletion is
 * backwards (Ctrl+Backspace or Opt+Delete on macOS), and `false` if
 * forwards (Ctrl+Delete or Fn+Opt+Delete on macOS).
 */
const DELETE_WORD_COMMAND = /* @__PURE__ */createCommand('DELETE_WORD_COMMAND');
/**
 * Dispatched to delete a line, the payload will be `true` if the deletion is
 * backwards (Cmd+Delete on macOS), and `false` if forwards
 * (Fn+Cmd+Delete on macOS).
 */
const DELETE_LINE_COMMAND = /* @__PURE__ */createCommand('DELETE_LINE_COMMAND');
/**
 * Dispatched to format the selected text.
 */
const FORMAT_TEXT_COMMAND = /* @__PURE__ */createCommand('FORMAT_TEXT_COMMAND');
/**
 * Dispatched to explicitly set or unset text formats on the selection.
 * Unlike FORMAT_TEXT_COMMAND which toggles, this command sets each specified
 * format to the exact boolean value provided.
 */
const SET_TEXT_FORMAT_COMMAND = /* @__PURE__ */createCommand('SET_TEXT_FORMAT_COMMAND');
/**
 * Dispatched on undo (Cmd+Z on macOS, Ctrl+Z elsewhere).
 */
const UNDO_COMMAND = /* @__PURE__ */createCommand('UNDO_COMMAND');
/**
 * Dispatched on redo (Shift+Cmd+Z on macOS, Shift+Ctrl+Z or Ctrl+Y elsewhere).
 */
const REDO_COMMAND = /* @__PURE__ */createCommand('REDO_COMMAND');
/**
 * Dispatched when any key is pressed.
 */
const KEY_DOWN_COMMAND = /* @__PURE__ */createCommand('KEYDOWN_COMMAND');
/**
 * Dispatched when the `'ArrowRight'` key is pressed.
 * The shift modifier key may also be down.
 */
const KEY_ARROW_RIGHT_COMMAND = /* @__PURE__ */createCommand('KEY_ARROW_RIGHT_COMMAND');
/**
 * Dispatched when the move to end keyboard shortcut is pressed,
 * (Cmd+Right on macOS; Ctrl+Right elsewhere).
 */
const MOVE_TO_END = /* @__PURE__ */createCommand('MOVE_TO_END');
/**
 * Dispatched when the `'ArrowLeft'` key is pressed.
 * The shift modifier key may also be down.
 */
const KEY_ARROW_LEFT_COMMAND = /* @__PURE__ */createCommand('KEY_ARROW_LEFT_COMMAND');
/**
 * Dispatched when the move to start keyboard shortcut is pressed,
 * (Cmd+Left on macOS; Ctrl+Left elsewhere).
 */
const MOVE_TO_START = /* @__PURE__ */createCommand('MOVE_TO_START');
/**
 * Dispatched when the `'ArrowUp'` key is pressed.
 * The shift and/or alt (option) modifier keys may also be down.
 */
const KEY_ARROW_UP_COMMAND = /* @__PURE__ */createCommand('KEY_ARROW_UP_COMMAND');
/**
 * Dispatched when the `'ArrowDown'` key is pressed.
 * The shift and/or alt (option) modifier keys may also be down.
 */
const KEY_ARROW_DOWN_COMMAND = /* @__PURE__ */createCommand('KEY_ARROW_DOWN_COMMAND');
/**
 * Dispatched when the enter key is pressed, may also be called with a null
 * payload when the intent is to insert a newline. The shift modifier key
 * must be down, any other modifier keys may also be down.
 */
const KEY_ENTER_COMMAND = /* @__PURE__ */createCommand('KEY_ENTER_COMMAND');
/**
 * Dispatched whenever the space (`' '`) key is pressed, any modifier
 * keys may be down.
 */
const KEY_SPACE_COMMAND = /* @__PURE__ */createCommand('KEY_SPACE_COMMAND');
/**
 * Dispatched whenever the `'Backspace'` key is pressed, the shift
 * modifier key may be down.
 */
const KEY_BACKSPACE_COMMAND = /* @__PURE__ */createCommand('KEY_BACKSPACE_COMMAND');
/**
 * Dispatched whenever the `'Escape'` key is pressed, any modifier
 * keys may be down.
 */
const KEY_ESCAPE_COMMAND = /* @__PURE__ */createCommand('KEY_ESCAPE_COMMAND');
/**
 * Dispatched whenever the `'Delete'` key is pressed (Fn+Delete on macOS).
 */
const KEY_DELETE_COMMAND = /* @__PURE__ */createCommand('KEY_DELETE_COMMAND');
/**
 * Dispatched whenever the `'Tab'` key is pressed. The shift modifier key
 * may be down.
 */
const KEY_TAB_COMMAND = /* @__PURE__ */createCommand('KEY_TAB_COMMAND');
const INSERT_TAB_COMMAND = /* @__PURE__ */createCommand('INSERT_TAB_COMMAND');
const INDENT_CONTENT_COMMAND = /* @__PURE__ */createCommand('INDENT_CONTENT_COMMAND');
const OUTDENT_CONTENT_COMMAND = /* @__PURE__ */createCommand('OUTDENT_CONTENT_COMMAND');
const DROP_COMMAND = /* @__PURE__ */createCommand('DROP_COMMAND');
const FORMAT_ELEMENT_COMMAND = /* @__PURE__ */createCommand('FORMAT_ELEMENT_COMMAND');
const DRAGSTART_COMMAND = /* @__PURE__ */createCommand('DRAGSTART_COMMAND');
const DRAGOVER_COMMAND = /* @__PURE__ */createCommand('DRAGOVER_COMMAND');
const DRAGEND_COMMAND = /* @__PURE__ */createCommand('DRAGEND_COMMAND');
/**
 * Dispatched on a copy event, either via the clipboard or a KeyboardEvent
 * (Cmd+C on macOS, Ctrl+C elsewhere).
 */
const COPY_COMMAND = /* @__PURE__ */createCommand('COPY_COMMAND');
/**
 * Dispatched on a cut event, either via the clipboard or a KeyboardEvent
 * (Cmd+X on macOS, Ctrl+X elsewhere).
 */
const CUT_COMMAND = /* @__PURE__ */createCommand('CUT_COMMAND');
/**
 * Dispatched on the select all keyboard shortcut
 * (Cmd+A on macOS, Ctrl+A elsehwere).
 */
const SELECT_ALL_COMMAND = /* @__PURE__ */createCommand('SELECT_ALL_COMMAND');
const CLEAR_EDITOR_COMMAND = /* @__PURE__ */createCommand('CLEAR_EDITOR_COMMAND');
const CLEAR_HISTORY_COMMAND = /* @__PURE__ */createCommand('CLEAR_HISTORY_COMMAND');
const CAN_REDO_COMMAND = /* @__PURE__ */createCommand('CAN_REDO_COMMAND');
const CAN_UNDO_COMMAND = /* @__PURE__ */createCommand('CAN_UNDO_COMMAND');
const FOCUS_COMMAND = /* @__PURE__ */createCommand('FOCUS_COMMAND');
const BLUR_COMMAND = /* @__PURE__ */createCommand('BLUR_COMMAND');
/**
 * @deprecated in v0.31.0, use KEY_DOWN_COMMAND and check for modifiers
 * directly.
 *
 * Dispatched after any KeyboardEvent when modifiers are pressed
 */
const KEY_MODIFIER_COMMAND = /* @__PURE__ */createCommand('KEY_MODIFIER_COMMAND');

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * A registry mapping keys to a per-key activation, reference counted so the
 * activation is created on the first registration for a key and torn down
 * only when the last outstanding registration for that key is released. This
 * lets the same key be driven by more than one caller (or survive a
 * re-entrant / double registration) without double-wiring or premature
 * teardown.
 *
 * Keys are compared by identity (Map semantics), so any object works — a DOM
 * element, a `Document`, a `Window`, or an opaque handle.
 */

/**
 * Creates a {@link RefCountedRegistry}.
 *
 * @param activate - Wires `key` and returns its teardown. Called on the first
 *   registration of each key.
 */
function createRefCountedRegistry(activate) {
  const entries = new Map();
  return {
    dispose() {
      for (const entry of entries.values()) {
        entry.dispose();
      }
      entries.clear();
    },
    register(key, options) {
      let entry = entries.get(key);
      if (entry === undefined) {
        entry = {
          dispose: activate(key, options),
          holders: new Set()
        };
        entries.set(key, entry);
      }
      // The disposer is its own holder token. It re-resolves the entry by key
      // so it never pins a disposed entry (and its activation cleanup) alive,
      // and so any stale release — a double call, or one after teardown or
      // re-registration — is a no-op: the live entry (if any) does not contain
      // this token, so `Set.delete` returns false. The activation is disposed
      // once the last holder releases.
      const release = () => {
        const current = entries.get(key);
        if (current && current.holders.delete(release) && current.holders.size === 0) {
          entries.delete(key);
          current.dispose();
        }
      };
      entry.holders.add(release);
      return release;
    }
  };
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * The typed event map for a given {@link EventTarget}. Falls back to the global
 * handlers map (rather than a permissive `Record<string, Event>`) so unknown
 * event names are rejected as typos. Shared by {@link registerEventListener}
 * and `registerEventListeners`; the former additionally has a `string` overload
 * as an escape hatch for non-standard names (e.g. the legacy `textInput`),
 * which the object form intentionally does not.
 */

/**
 * Add an event listener to `target` and return a function that removes it.
 *
 * This is a thin, strongly typed wrapper around
 * {@link EventTarget.addEventListener} that mirrors its overloads but returns a
 * dispose function instead of `void`. It removes the
 * `addEventListener`/`removeEventListener` boilerplate that every DOM
 * subscription would otherwise duplicate, and composes cleanly with
 * {@link mergeRegister} or as the return value of an effect.
 *
 * The same `options` value is forwarded to both `addEventListener` and
 * `removeEventListener` so that the `capture` flag always matches, which is
 * required for the listener to be removed correctly.
 *
 * @example
 * ```ts
 * // Returned directly from a React effect
 * useEffect(
 *   () => registerEventListener(container, 'keydown', handler),
 *   [container],
 * );
 * ```
 * @example
 * ```ts
 * // Composed with other teardown via mergeRegister
 * return mergeRegister(
 *   registerEventListener(window, 'resize', onResize),
 *   registerEventListener(document, 'selectionchange', onSelectionChange),
 * );
 * ```
 *
 * @param target - The {@link EventTarget} to subscribe to
 * @param type - The event type to listen for (e.g. `'keydown'`)
 * @param listener - The listener invoked when a matching event is dispatched
 * @param options - Options forwarded to `add`/`removeEventListener`
 * @returns A function that removes the listener when called
 */

// Fallback for non-standard event names (e.g. the legacy `textInput`) and
// targets without a typed event map.

function registerEventListener(target, type, listener, options) {
  target.addEventListener(type, listener, options);
  // Return a bound `removeEventListener` rather than an arrow so the dispose
  // function doesn't allocate an extra closure over the arguments.
  return target.removeEventListener.bind(target, type, listener, options);
}

const PASS_THROUGH_COMMAND = Object.freeze({});
const ANDROID_COMPOSITION_LATENCY = 30;
const rootElementEvents = [['keydown', onKeyDown], ['pointerdown', onPointerDown], ['compositionstart', onCompositionStart], ['compositionend', onCompositionEnd], ['input', onInput], ['click', onClick], ['cut', PASS_THROUGH_COMMAND], ['copy', PASS_THROUGH_COMMAND], ['dragstart', PASS_THROUGH_COMMAND], ['dragover', PASS_THROUGH_COMMAND], ['dragend', PASS_THROUGH_COMMAND], ['paste', PASS_THROUGH_COMMAND], ['focus', PASS_THROUGH_COMMAND], ['blur', PASS_THROUGH_COMMAND], ['drop', PASS_THROUGH_COMMAND]];
if (CAN_USE_BEFORE_INPUT) {
  rootElementEvents.push(['beforeinput', (event, editor) => onBeforeInput(event, editor)]);
}

// Node can be moved between documents (for example using createPortal), so we
// need to track the document each root element was originally registered on.
const rootElementToDocument = new WeakMap();
// Per-document state read by the shared `selectionchange` handler, keyed by the
// document each root element was registered against:
// - `editors` is the candidate set `onDocumentSelectionChange` attributes the
//   event to, using each editor's shadow-aware anchor rather than guessing from
//   `Selection.anchorNode` (retargeted to a light-DOM ancestor inside a shadow
//   tree).
// - `hasShadowEditor` caches whether any editor here is shadow-mounted
//   (`undefined` = needs recompute), so the handler avoids an O(editors)
//   `getRootNode()` scan per selectionchange. Invalidated whenever the editor
//   set changes — which, via setRootElement, is where an editor's root (and
//   thus its shadow-mounted status) is rebound.

const documentRegistrations = new WeakMap();
// The single shared `selectionchange` listener per document, reference counted
// across all editors registered against that document: attached when the first
// root element is registered and removed when the last one is unregistered.
const documentSelectionChange = createRefCountedRegistry(doc => {
  doc.addEventListener('selectionchange', onDocumentSelectionChange);
  return () => doc.removeEventListener('selectionchange', onDocumentSelectionChange);
});

// This function is used to determine if Lexical should attempt to override
// the default browser behavior for insertion of text and use its own internal
// heuristics. This is an extremely important function, and makes much of Lexical
// work as intended between different browsers and across word, line and character
// boundary/formats. It also is important for text replacement, node schemas and
// composition mechanics.
function $shouldPreventDefaultAndInsertText(selection, domTargetRange, text, timeStamp, isBeforeInput, cachedDOMSelectionPoints) {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = anchor.getNode();
  const editor = getActiveEditor();
  let domSelectionPoints;
  if (cachedDOMSelectionPoints !== undefined) {
    domSelectionPoints = cachedDOMSelectionPoints;
  } else {
    const domSelection = getDOMSelection(getWindow(editor));
    domSelectionPoints = domSelection !== null ? getDOMSelectionPoints(domSelection, editor._rootElement) : null;
  }
  const domAnchorNode = domSelectionPoints !== null ? domSelectionPoints.anchorNode : null;
  const anchorKey = anchor.key;
  const backingAnchorElement = editor.getElementByKey(anchorKey);
  const textLength = text.length;
  return anchorKey !== focus.key ||
  // If we're working with a non-text node.
  !$isTextNode(anchorNode) ||
  // If we are replacing a range with a single character or grapheme, and not composing.
  (!isBeforeInput && (!CAN_USE_BEFORE_INPUT ||
  // We check to see if there has been
  // a recent beforeinput event for "textInput". If there has been one in the last
  // 50ms then we proceed as normal. However, if there is not, then this is likely
  // a dangling `input` event caused by execCommand('insertText').
  editor._inputState.lastBeforeInputInsertTextTimeStamp < timeStamp + 50) || anchorNode.isDirty() && textLength < 2 ||
  // TODO consider if there are other scenarios when multiple code units
  //      should be addressed here
  doesContainSurrogatePair(text)) && anchor.offset !== focus.offset && !anchorNode.isComposing() ||
  // Any non standard text node.
  $isTokenOrSegmented(anchorNode) ||
  // If the text length is more than a single character and we're either
  // dealing with this in "beforeinput" or where the node has already recently
  // been changed (thus is dirty).
  anchorNode.isDirty() && textLength > 1 ||
  // If the DOM selection element is not the same as the backing node during beforeinput.
  (isBeforeInput || !CAN_USE_BEFORE_INPUT) && backingAnchorElement !== null && !anchorNode.isComposing() && domAnchorNode !== $getDOMTextNode(anchorNode, backingAnchorElement, editor) ||
  // If TargetRange is not the same as the DOM selection; browser trying to edit random parts
  // of the editor.
  domSelectionPoints !== null && domTargetRange !== null && (!domTargetRange.collapsed || domTargetRange.startContainer !== domSelectionPoints.anchorNode || domTargetRange.startOffset !== domSelectionPoints.anchorOffset) ||
  // Check if we're changing from bold to italics, or some other format.
  !anchorNode.isComposing() && (anchorNode.getFormat() !== selection.format || anchorNode.getStyle() !== selection.style) ||
  // One last set of heuristics to check against.
  $shouldInsertTextAfterOrBeforeTextNode(selection, anchorNode);
}
function shouldSkipSelectionChange(domNode, offset) {
  return isDOMTextNode(domNode) && domNode.nodeValue !== null && offset !== 0 && offset !== domNode.nodeValue.length;
}
function onSelectionChange(domSelection, editor, isActive) {
  // Shadow-aware boundary points so isSelectionWithinEditor below isn't
  // fooled by the retargeted shadow host into dropping the selection.
  const {
    anchorNode: anchorDOM,
    anchorOffset,
    focusNode: focusDOM,
    focusOffset
  } = getDOMSelectionPoints(domSelection, editor._rootElement);
  const inputState = editor._inputState;
  if (inputState.isSelectionChangeFromDOMUpdate) {
    inputState.isSelectionChangeFromDOMUpdate = false;

    // If native DOM selection is on a DOM element, then
    // we should continue as usual, as Lexical's selection
    // may have normalized to a better child. If the DOM
    // element is a text node, we can safely apply this
    // optimization and skip the selection change entirely.
    // We also need to check if the offset is at the boundary,
    // because in this case, we might need to normalize to a
    // sibling instead.
    if (shouldSkipSelectionChange(anchorDOM, anchorOffset) && shouldSkipSelectionChange(focusDOM, focusOffset) && !inputState.postDeleteSelectionToRestore) {
      return;
    }
  }
  updateEditorSync(editor, () => {
    // Non-active editor don't need any extra logic for selection, it only needs update
    // to reconcile selection (set it to null) to ensure that only one editor has non-null selection.
    if (!isActive) {
      $setSelection(null);
      return;
    }
    if (!isSelectionWithinEditor(editor, anchorDOM, focusDOM)) {
      return;
    }
    let selection = $getSelection();

    // Restore selection in the event of incorrect rightward shift after deletion
    if (inputState.postDeleteSelectionToRestore && $isRangeSelection(selection) && selection.isCollapsed()) {
      const curAnchor = selection.anchor;
      const prevAnchor = inputState.postDeleteSelectionToRestore.anchor;
      if (
      // Rightward shift in same node
      curAnchor.key === prevAnchor.key && curAnchor.offset === prevAnchor.offset + 1 ||
      // Or rightward shift into sibling node
      curAnchor.offset === 1 && prevAnchor.getNode().is(curAnchor.getNode().getPreviousSibling())) {
        // Restore selection
        selection = inputState.postDeleteSelectionToRestore.clone();
        $setSelection(selection);
      }
    }
    inputState.postDeleteSelectionToRestore = null;

    // Update the selection format
    if ($isRangeSelection(selection)) {
      const anchor = selection.anchor;
      const anchorNode = anchor.getNode();
      if (selection.isCollapsed()) {
        // Badly interpreted range selection when collapsed - #1482
        if (domSelection.type === 'Range' && anchorDOM === focusDOM) {
          selection.dirty = true;
        }

        // If we have marked a collapsed selection format, and we're
        // within the given time range – then attempt to use that format
        // instead of getting the format from the anchor node.
        const windowEvent = getWindow(editor).event;
        const currentTimeStamp = windowEvent ? windowEvent.timeStamp : performance.now();
        const {
          format: lastFormat,
          style: lastStyle,
          offset: lastOffset,
          key: lastKey,
          timeStamp
        } = inputState.collapsedSelectionFormat;
        const root = $getRoot();
        const isRootTextContentEmpty = editor.isComposing() === false && root.getTextContent() === '';
        if (currentTimeStamp < timeStamp + 200 && anchor.offset === lastOffset && anchor.key === lastKey) {
          $updateSelectionFormatStyle(selection, lastFormat, lastStyle);
        } else {
          if (anchor.type === 'text') {
            if (!$isTextNode(anchorNode)) {
              formatDevErrorMessage(`Point.getNode() must return TextNode when type is text`);
            }
            $updateSelectionFormatStyleFromTextNode(selection, anchorNode);
          } else if (anchor.type === 'element' && !isRootTextContentEmpty) {
            if (!$isElementNode(anchorNode)) {
              formatDevErrorMessage(`Point.getNode() must return ElementNode when type is element`);
            }
            const lastNode = anchor.getNode();
            if (
            // This previously applied to all ParagraphNode
            lastNode.isEmpty()) {
              $updateSelectionFormatStyleFromElementNode(selection, lastNode);
            } else {
              $updateSelectionFormatStyle(selection, selection.format, '');
            }
          }
        }
      } else {
        const anchorKey = anchor.key;
        const focus = selection.focus;
        const focusKey = focus.key;
        const nodes = selection.getNodes();
        const nodesLength = nodes.length;
        const isBackward = selection.isBackward();
        const startOffset = isBackward ? focusOffset : anchorOffset;
        const endOffset = isBackward ? anchorOffset : focusOffset;
        const startKey = isBackward ? focusKey : anchorKey;
        const endKey = isBackward ? anchorKey : focusKey;
        let combinedFormat = IS_ALL_FORMATTING;
        let hasTextNodes = false;
        for (let i = 0; i < nodesLength; i++) {
          const node = nodes[i];
          const textContentSize = node.getTextContentSize();
          if ($isTextNode(node) && textContentSize !== 0 &&
          // Exclude empty text nodes at boundaries resulting from user's selection
          !(i === 0 && node.__key === startKey && startOffset === textContentSize || i === nodesLength - 1 && node.__key === endKey && endOffset === 0)) {
            // TODO: what about style?
            hasTextNodes = true;
            combinedFormat &= node.getFormat();
            if (combinedFormat === 0) {
              break;
            }
          }
        }
        selection.format = hasTextNodes ? combinedFormat : 0;
      }
    }
    dispatchCommand(editor, SELECTION_CHANGE_COMMAND);
  });
}
function $updateSelectionFormatStyle(selection, format, style) {
  if (selection.format !== format || selection.style !== style) {
    selection.format = format;
    selection.style = style;
    selection.dirty = true;
  }
}
function $updateSelectionFormatStyleFromTextNode(selection, node) {
  const format = node.getFormat();
  const style = node.getStyle();
  $updateSelectionFormatStyle(selection, format, style);
}
function $updateSelectionFormatStyleFromElementNode(selection, node) {
  const format = node.getTextFormat();
  const style = node.getTextStyle();
  $updateSelectionFormatStyle(selection, format, style);
}

// This is a work-around is mainly Chrome specific bug where if you select
// the contents of an empty block, you cannot easily unselect anything.
// This results in a tiny selection box that looks buggy/broken. This can
// also help other browsers when selection might "appear" lost, when it
// really isn't.
function onClick(event, editor) {
  updateEditorSync(editor, () => {
    const selection = $getSelection();
    const domSelection = getDOMSelection(getWindow(editor));
    const lastSelection = $getPreviousSelection();
    if (domSelection) {
      if ($isRangeSelection(selection)) {
        const anchor = selection.anchor;
        const anchorNode = anchor.getNode();
        if (anchor.type === 'element' && anchor.offset === 0 && selection.isCollapsed() && !$isRootNode(anchorNode) && $getRoot().getChildrenSize() === 1 && anchorNode.getTopLevelElementOrThrow().isEmpty() && lastSelection !== null && selection.is(lastSelection)) {
          domSelection.removeAllRanges();
          selection.dirty = true;
        }
      } else if (event.pointerType === 'touch' || event.pointerType === 'pen') {
        // This is used to update the selection on touch devices (including Apple Pencil) when the user clicks on text after a
        // node selection. See isSelectionChangeFromMouseDown for the inverse
        const domSelectionPoints = getDOMSelectionPoints(domSelection, editor._rootElement);
        const domAnchorNode = domSelectionPoints.anchorNode;
        // If the user is attempting to click selection back onto text, then
        // we should attempt create a range selection.
        // When we click on an empty paragraph node or the end of a paragraph that ends
        // with an image/poll, the nodeType will be ELEMENT_NODE
        if (isHTMLElement(domAnchorNode) || isDOMTextNode(domAnchorNode)) {
          const newSelection = $internalCreateRangeSelection(lastSelection, domSelection, editor, event);
          $setSelection(newSelection);
        }
      }
    }

    // Firefox produces no DOM range when clicking between block-level
    // decorators (rangeCount === 0). Use click coordinates to compute
    // the correct child offset. Only act when the click landed directly
    // on the root element (not inside a child like a table cell).
    if (IS_FIREFOX && domSelection !== null && domSelection.rangeCount === 0) {
      const rootElement = editor._rootElement;
      if (rootElement !== null && event.target === rootElement) {
        const clientY = event.clientY;
        let offset = rootElement.childNodes.length;
        for (let i = 0; i < rootElement.childNodes.length; i++) {
          const child = rootElement.childNodes[i];
          if (isHTMLElement(child)) {
            const rect = child.getBoundingClientRect();
            if (clientY <= (rect.top + rect.bottom) / 2) {
              offset = i;
              break;
            }
          }
        }
        domSelection.setBaseAndExtent(rootElement, offset, rootElement, offset);
        const newSelection = $internalCreateRangeSelection(lastSelection, domSelection, editor, event);
        if (newSelection !== null) {
          $setSelection(newSelection);
        } else {
          domSelection.removeAllRanges();
        }
      }
    }
    dispatchCommand(editor, CLICK_COMMAND, event);
  });
}
function onPointerDown(event, editor) {
  // TODO implement text drag & drop
  // Resolve to the composed target so a pointerdown inside a decorator's
  // open shadow root reports the real internal element rather than the
  // outer shadow host the engine retargets to.
  const target = getComposedEventTarget(event);
  const pointerType = event.pointerType;
  if (isDOMNode(target) && pointerType !== 'touch' && pointerType !== 'pen' && event.button === 0) {
    updateEditorSync(editor, () => {
      // Drag & drop should not recompute selection until mouse up; otherwise the initially
      // selected content is lost.
      if (!isDOMCapturingSelection(target, editor)) {
        editor._inputState.isSelectionChangeFromMouseDown = true;
      }
    });
  }
}
function getTargetRange(event) {
  if (!event.getTargetRanges) {
    return null;
  }
  const targetRanges = event.getTargetRanges();
  if (targetRanges.length === 0) {
    return null;
  }
  return targetRanges[0];
}

// When a macOS text replacement is accepted, Chrome and Firefox fire input events for the key press that
// triggered the acceptance *before* the one for the replacement text. This causes the caret to be placed
// before the acceptance boundary. This function moves the caret past the acceptance boundary.
function $maybeMoveSelectionPastTrailingAcceptanceBoundary(insertedText) {
  const {
    lastKeyCode
  } = getActiveEditor()._inputState;
  if (insertedText == null || insertedText.length <= 1 || lastKeyCode == null) {
    return;
  }
  const characterToSearchFor = lastKeyCode.length === 1 ? lastKeyCode : lastKeyCode === 'Enter' ? '\n' : lastKeyCode === 'Tab' ? '\t' : null;
  if (!characterToSearchFor) {
    return;
  }
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return;
  }
  const anchorNode = selection.anchor.getNode();
  if (!$isTextNode(anchorNode)) {
    return;
  }
  const {
    offset
  } = selection.anchor;
  if (anchorNode.getTextContentSize() === offset) {
    const nextSibling = anchorNode.getNextSibling();
    if (characterToSearchFor === '\n') {
      if ($isLineBreakNode(nextSibling)) {
        nextSibling.selectEnd();
      } else if (!nextSibling) {
        const block = $findMatchingParent(anchorNode, $isBlockElementNode);
        const nextBlock = block && block.getNextSibling();
        if ($isElementNode(nextBlock)) {
          nextBlock.selectStart();
        }
      }
    } else if (characterToSearchFor === '\t') {
      if ($isTabNode(nextSibling)) {
        nextSibling.selectEnd();
      }
    } else if ($isTextNode(nextSibling) && nextSibling.getTextContent()[0] === characterToSearchFor) {
      nextSibling.select(1, 1);
    }
  } else if (anchorNode.getTextContent()[offset] === characterToSearchFor) {
    anchorNode.select(offset + 1, offset + 1);
  }
}
function $canRemoveText(anchorNode, focusNode) {
  return anchorNode !== focusNode || $isElementNode(anchorNode) || $isElementNode(focusNode) || !$isTokenOrTab(anchorNode) || !$isTokenOrTab(focusNode);
}
function isPossiblyAndroidKeyPress(inputState, timeStamp) {
  return inputState.lastKeyCode === 'MediaLast' && timeStamp < inputState.lastKeyDownTimeStamp + ANDROID_COMPOSITION_LATENCY;
}
function clearHandledSelectionCommandInsertText(inputState) {
  inputState.isInsertTextAfterHandledSelectionCommand = false;
  if (inputState.handledSelectionCommandTimeoutId !== null) {
    clearTimeout(inputState.handledSelectionCommandTimeoutId);
    inputState.handledSelectionCommandTimeoutId = null;
  }
}
function markHandledSelectionCommandInsertText(inputState) {
  clearHandledSelectionCommandInsertText(inputState);
  inputState.isInsertTextAfterHandledSelectionCommand = true;
  inputState.handledSelectionCommandTimeoutId = setTimeout(() => clearHandledSelectionCommandInsertText(inputState), 0);
}
function registerDefaultCommandHandlers(editor) {
  editor.registerCommand(BEFORE_INPUT_COMMAND, $handleBeforeInput, COMMAND_PRIORITY_EDITOR);
  editor.registerCommand(INPUT_COMMAND, $handleInput, COMMAND_PRIORITY_EDITOR);
  editor.registerCommand(COMPOSITION_START_COMMAND, $handleCompositionStart, COMMAND_PRIORITY_EDITOR);
  editor.registerCommand(COMPOSITION_END_COMMAND, $handleCompositionEnd, COMMAND_PRIORITY_EDITOR);
  editor.registerCommand(KEY_DOWN_COMMAND, $handleKeyDown, COMMAND_PRIORITY_EDITOR);
}

/**
 * Returns true when a `beforeinput` / `input` event belongs to a native
 * control (e.g. an `<input>` or `<textarea>`, or any other subtree marked with
 * `setDOMUnmanaged({captureSelection: true})`) inside a decorator whose
 * selection is owned by the browser rather than managed by Lexical. Turning
 * such an event into a Lexical command would insert text into the editor
 * instead of the focused control.
 *
 * Two signals are checked because Firefox 152 changed how it dispatches
 * `beforeinput` for these controls (#8738): the event is retargeted off of the
 * focused control, so its composed target no longer points at it. The deep
 * active element still does, and is used as a fallback.
 */
function isInputEventTargetingCapturedSelection(event, editor) {
  // Use the composed target so an event coming from inside a decorator's
  // nested shadow root resolves to the real internal element.
  const composedTarget = getComposedEventTarget(event);
  if (isHTMLElement(composedTarget) && isDOMCapturingSelection(composedTarget, editor)) {
    return true;
  }
  // Firefox 152 retargets the event off of the focused control, so fall back
  // to the deep active element (getActiveElementDeep crosses shadow roots) to
  // detect that a captured decorator control still owns the selection.
  const rootElement = editor.getRootElement();
  if (rootElement === null) {
    return false;
  }
  const activeElement = getActiveElementDeep(rootElement.ownerDocument);
  return activeElement !== null && rootElement.contains(activeElement) && isDOMCapturingSelection(activeElement, editor);
}
function onBeforeInput(event, editor) {
  const inputType = event.inputType;

  // We let the browser do its own thing for composition.
  if (inputType === 'deleteCompositionText' ||
  // If we're pasting in FF, we shouldn't get this event
  // as the `paste` event should have triggered, unless the
  // user has dom.event.clipboardevents.enabled disabled in
  // about:config. In that case, we need to process the
  // pasted content in the DOM mutation phase.
  IS_FIREFOX && isFirefoxClipboardEvents(editor)) {
    return;
  } else if (inputType === 'insertCompositionText') {
    return;
  }

  // Always run the update so the editor selection stays in sync with the DOM
  // (the {event} option recomputes it). Only skip dispatching the command when
  // a native control inside a decorator owns this event: processing it would
  // insert text into the editor rather than the control. Firefox 152 started
  // dispatching these to the editor root (#8738).
  updateEditorSync(editor, () => {
    if (!isInputEventTargetingCapturedSelection(event, editor)) {
      dispatchCommand(editor, BEFORE_INPUT_COMMAND, event);
    }
  }, {
    event
  });
}
function $handleBeforeInput(event) {
  const inputType = event.inputType;
  const targetRange = getTargetRange(event);
  const editor = getActiveEditor();
  const inputState = editor._inputState;
  const selection = $getSelection();

  // On Chrome on macOS, some handled selection commands may accept a pending text replacement. This behavior
  // is not desirable, so we check for this case and prevent bogus text replacements from happening.
  if (inputType === 'insertText' && event.data && inputState.isInsertTextAfterHandledSelectionCommand) {
    clearHandledSelectionCommandInsertText(inputState);
    event.preventDefault();
    if ($isRangeSelection(selection) && !selection.isCollapsed()) {
      const point = selection.isBackward() ? selection.anchor : selection.focus;
      selection.anchor.set(point.key, point.offset, point.type);
      selection.focus.set(point.key, point.offset, point.type);
    }
    return true;
  }
  if (inputType === 'deleteContentBackward') {
    if (selection === null) {
      // Use previous selection
      const prevSelection = $getPreviousSelection();
      if (!$isRangeSelection(prevSelection)) {
        return true;
      }
      $setSelection(prevSelection.clone());
    }
    if ($isRangeSelection(selection)) {
      const isSelectionAnchorSameAsFocus = selection.anchor.key === selection.focus.key;
      if (isPossiblyAndroidKeyPress(inputState, event.timeStamp) && editor.isComposing() && isSelectionAnchorSameAsFocus) {
        $setCompositionKey(null);
        inputState.lastKeyDownTimeStamp = 0;
        // Fixes an Android bug where selection flickers when backspacing
        setTimeout(() => {
          updateEditorSync(editor, () => {
            $setCompositionKey(null);
          });
        }, ANDROID_COMPOSITION_LATENCY);
        if ($isRangeSelection(selection)) {
          const anchorNode = selection.anchor.getNode();
          anchorNode.markDirty();
          if (!$isTextNode(anchorNode)) {
            formatDevErrorMessage(`Anchor node must be a TextNode`);
          }
          $updateSelectionFormatStyleFromTextNode(selection, anchorNode);
        }
      } else {
        $setCompositionKey(null);

        // iOS 10-key Korean IME (천지인/Chunjiin) does not fire compositionstart /
        // compositionend events. Instead it sends a deleteContentBackward with a
        // non-collapsed targetRange to delete the current composing jamo, immediately
        // followed by insertText with the updated syllable.
        //
        // Because editor.isComposing() is always false for this keyboard type, Lexical
        // would otherwise dispatch DELETE_CHARACTER_COMMAND, which ignores the
        // targetRange entirely and deletes only one character before the cursor. This
        // leaves orphaned jamo in the editor state that accumulate and corrupt output
        // (e.g. typing "안녕하세요" produces "안녕하ᄉ세ᄋᄋ요").
        //
        // Fix: when on iOS with a non-collapsed targetRange, apply the range directly
        // to the Lexical selection and delete the matched text. If applyDOMRange cannot
        // resolve the range (returns a collapsed selection), fall through to the default
        // Lexical deletion path.
        if (IS_IOS && targetRange !== null && !targetRange.collapsed) {
          selection.applyDOMRange(targetRange);
          if (!selection.isCollapsed()) {
            event.preventDefault();
            selection.removeText();
            return true;
          }
        }
        event.preventDefault();
        // Chromium Android at the moment seems to ignore the preventDefault
        // on 'deleteContentBackward' and still deletes the content. Which leads
        // to multiple deletions. So we let the browser handle the deletion in this case.
        const selectedNode = selection.anchor.getNode();
        const selectedNodeText = selectedNode.getTextContent();
        // When the target node has `canInsertTextAfter` set to false, the first deletion
        // doesn't have an effect, so we need to handle it with Lexical.
        const selectedNodeCanInsertTextAfter = selectedNode.canInsertTextAfter();
        const hasSelectedAllTextInNode = selection.anchor.offset === 0 && selection.focus.offset === selectedNodeText.length;
        let shouldLetBrowserHandleDelete = IS_ANDROID_CHROME && isSelectionAnchorSameAsFocus && !hasSelectedAllTextInNode && selectedNodeCanInsertTextAfter;
        // Check if selection is collapsed and if the previous node is a decorator node
        // If so, the browser will not be able to handle the deletion
        if (shouldLetBrowserHandleDelete && selection.isCollapsed()) {
          shouldLetBrowserHandleDelete = !$isDecoratorNode($getAdjacentNode(selection.anchor, true));
        }
        if (!shouldLetBrowserHandleDelete) {
          dispatchCommand(editor, DELETE_CHARACTER_COMMAND, true);
          // When deleting across paragraphs, Chrome on Android incorrectly shifts the selection rightwards
          // We save the correct selection to restore later during handling of selectionchange event
          const selectionAfterDelete = $getSelection();
          if (IS_ANDROID_CHROME && $isRangeSelection(selectionAfterDelete) && selectionAfterDelete.isCollapsed()) {
            inputState.postDeleteSelectionToRestore = selectionAfterDelete;
            // Cleanup in case selectionchange does not fire
            setTimeout(() => inputState.postDeleteSelectionToRestore = null);
          }
        }
      }
      return true;
    }
  }
  if (!$isRangeSelection(selection)) {
    return true;
  }
  const data = event.data;

  // This represents the case when two beforeinput events are triggered at the same time (without a
  // full event loop ending at input). This happens with MacOS with the default keyboard settings,
  // a combination of autocorrection + autocapitalization.
  // Having Lexical run everything in controlled mode would fix the issue without additional code
  // but this would kill the massive performance win from the most common typing event.
  // Alternatively, when this happens we can prematurely update our EditorState based on the DOM
  // content, a job that would usually be the input event's responsibility.
  if (inputState.unprocessedBeforeInputData !== null) {
    $updateSelectedTextFromDOM(false, editor, inputState.unprocessedBeforeInputData);
  }
  if ((!selection.dirty || inputState.unprocessedBeforeInputData !== null) && selection.isCollapsed() && !$isRootNode(selection.anchor.getNode()) && targetRange !== null) {
    selection.applyDOMRange(targetRange);
  }
  inputState.unprocessedBeforeInputData = null;
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();
  if (inputType === 'insertText' || inputType === 'insertTranspose') {
    if (data === '\n') {
      event.preventDefault();
      dispatchCommand(editor, INSERT_LINE_BREAK_COMMAND, false);
    } else if (data === DOUBLE_LINE_BREAK) {
      event.preventDefault();
      dispatchCommand(editor, INSERT_PARAGRAPH_COMMAND);
    } else if (data == null && event.dataTransfer) {
      // Gets around a Safari text replacement bug.
      const text = event.dataTransfer.getData('text/plain');
      event.preventDefault();
      selection.insertRawText(text);
    } else if (data != null && $shouldPreventDefaultAndInsertText(selection, targetRange, data, event.timeStamp, true)) {
      event.preventDefault();
      dispatchCommand(editor, CONTROLLED_TEXT_INSERTION_COMMAND, data);
      $maybeMoveSelectionPastTrailingAcceptanceBoundary(data);
    } else {
      inputState.unprocessedBeforeInputData = data;
    }
    inputState.lastBeforeInputInsertTextTimeStamp = event.timeStamp;
    return true;
  }

  // Prevent the browser from carrying out
  // the input event, so we can control the
  // output.
  event.preventDefault();
  switch (inputType) {
    case 'insertFromYank':
    case 'insertFromDrop':
    case 'insertReplacementText':
      {
        dispatchCommand(editor, CONTROLLED_TEXT_INSERTION_COMMAND, event);
        const textFromDataTransfer = event.dataTransfer ? event.dataTransfer.getData('text/plain') : null;
        $maybeMoveSelectionPastTrailingAcceptanceBoundary(textFromDataTransfer ?? event.data);
        break;
      }
    case 'insertFromComposition':
      {
        const skipRedundantInsert = inputState.hadOrphanedCompositionEvents;
        inputState.hadOrphanedCompositionEvents = false;
        const prevCompositionKey = editor._compositionKey;
        $setCompositionKey(null);
        if (!skipRedundantInsert) {
          dispatchCommand(editor, CONTROLLED_TEXT_INSERTION_COMMAND, event);
        }
        $cleanupComposedSubclass(prevCompositionKey);
        break;
      }
    case 'insertLineBreak':
      {
        // Used for Android
        $setCompositionKey(null);
        dispatchCommand(editor, INSERT_LINE_BREAK_COMMAND, false);
        break;
      }
    case 'insertParagraph':
      {
        // Used for Android
        $setCompositionKey(null);

        // Safari does not provide the type "insertLineBreak".
        // So instead, we need to infer it from the keyboard event.
        // We do not apply this logic to iOS to allow newline auto-capitalization
        // work without creating linebreaks when pressing Enter
        if (inputState.isInsertLineBreak && !IS_IOS) {
          inputState.isInsertLineBreak = false;
          dispatchCommand(editor, INSERT_LINE_BREAK_COMMAND, false);
        } else {
          dispatchCommand(editor, INSERT_PARAGRAPH_COMMAND);
        }
        break;
      }
    case 'insertFromPaste':
    case 'insertFromPasteAsQuotation':
      {
        dispatchCommand(editor, PASTE_COMMAND, event);
        break;
      }
    case 'deleteByComposition':
      {
        if ($canRemoveText(anchorNode, focusNode)) {
          dispatchCommand(editor, REMOVE_TEXT_COMMAND, event);
        }
        break;
      }
    case 'deleteByDrag':
      {
        // The drop target is taking over focus and the document selection;
        // suppress this editor's own attempt to focus its root or move the DOM
        // selection back to the post-removal point during reconciliation.
        $addUpdateTag(SKIP_SELECTION_FOCUS_TAG);
        dispatchCommand(editor, REMOVE_TEXT_COMMAND, event);
        break;
      }
    case 'deleteByCut':
      {
        dispatchCommand(editor, REMOVE_TEXT_COMMAND, event);
        break;
      }
    case 'deleteContent':
      {
        dispatchCommand(editor, DELETE_CHARACTER_COMMAND, false);
        break;
      }
    case 'deleteWordBackward':
      {
        dispatchCommand(editor, DELETE_WORD_COMMAND, true);
        break;
      }
    case 'deleteWordForward':
      {
        dispatchCommand(editor, DELETE_WORD_COMMAND, false);
        break;
      }
    case 'deleteHardLineBackward':
    case 'deleteSoftLineBackward':
      {
        dispatchCommand(editor, DELETE_LINE_COMMAND, true);
        break;
      }
    case 'deleteContentForward':
    case 'deleteHardLineForward':
    case 'deleteSoftLineForward':
      {
        dispatchCommand(editor, DELETE_LINE_COMMAND, false);
        break;
      }
    case 'formatStrikeThrough':
      {
        dispatchCommand(editor, FORMAT_TEXT_COMMAND, 'strikethrough');
        break;
      }
    case 'formatBold':
      {
        dispatchCommand(editor, FORMAT_TEXT_COMMAND, 'bold');
        break;
      }
    case 'formatItalic':
      {
        dispatchCommand(editor, FORMAT_TEXT_COMMAND, 'italic');
        break;
      }
    case 'formatUnderline':
      {
        dispatchCommand(editor, FORMAT_TEXT_COMMAND, 'underline');
        break;
      }
    case 'historyUndo':
      {
        dispatchCommand(editor, UNDO_COMMAND);
        break;
      }
    case 'historyRedo':
      {
        dispatchCommand(editor, REDO_COMMAND);
        break;
      }
    // NO-OP
  }
  return true;
}
function onInput(event, editor) {
  // Note that the MutationObserver may or may not have already fired,
  // but the DOM and selection may have already changed.
  // See also:
  // - https://github.com/facebook/lexical/issues/7028
  // - https://github.com/facebook/lexical/pull/794

  // We don't want the onInput to bubble, in the case of nested editors.
  event.stopPropagation();
  const inputState = editor._inputState;
  clearHandledSelectionCommandInsertText(inputState);
  // Always run the update so the editor selection stays in sync with the DOM
  // (the {event} option recomputes it). Only skip dispatching the command when
  // a native control inside a decorator owns this event: processing it would
  // insert text into the editor rather than the control. Firefox 152 started
  // dispatching these to the editor root (#8738). This mirrors onBeforeInput.
  updateEditorSync(editor, () => {
    if (!isInputEventTargetingCapturedSelection(event, editor)) {
      editor.dispatchCommand(INPUT_COMMAND, event);
    }
  }, {
    event
  });
  inputState.unprocessedBeforeInputData = null;
}
function $handleInput(event) {
  const editor = getActiveEditor();
  const inputState = editor._inputState;
  const selection = $getSelection();
  const data = event.data;
  const targetRange = getTargetRange(event);
  let handled = false;
  if (data != null && $isRangeSelection(selection)) {
    const domSelection = getDOMSelection(getWindow(editor));
    const domSelectionPoints = domSelection !== null ? getDOMSelectionPoints(domSelection, editor._rootElement) : null;

    // formatText() (e.g. Bold during composition) clears compositionKey,
    // but the browser still sends insertCompositionText with the
    // committed text. The browser has already updated the DOM, so we
    // must not re-insert via CONTROLLED_TEXT_INSERTION_COMMAND — let
    // $updateSelectedTextFromDOM sync from the DOM instead. Not gated
    // on IS_IOS because the formatText → $setCompositionKey(null) path
    // is platform-independent.
    const isOrphanedCompositionEnd = event.inputType === 'insertCompositionText' && inputState.compositionPhase !== 'ending-firefox' && !editor.isComposing();
    if (isOrphanedCompositionEnd) {
      inputState.hadOrphanedCompositionEvents = true;
    }
    const inputAnchorNode = selection.anchor.getNode();
    const isCompositionOnToken = event.inputType === 'insertCompositionText' && inputState.compositionPhase !== 'ending-firefox' && editor.isComposing() && $isTextNode(inputAnchorNode) && $isTokenOrSegmented(inputAnchorNode);
    if (!isOrphanedCompositionEnd && !isCompositionOnToken && $shouldPreventDefaultAndInsertText(selection, targetRange, data, event.timeStamp, false, domSelectionPoints)) {
      handled = true;
      // Given we're over-riding the default behavior, we will need
      // to ensure to disable composition before dispatching the
      // insertText command for when changing the sequence for FF.
      if (inputState.compositionPhase === 'ending-firefox') {
        const tokenRedirected = $onCompositionEndImpl(editor, data);
        inputState.compositionPhase = 'idle';
        if (tokenRedirected) {
          $addUpdateTag(COMPOSITION_END_TAG);
          $flushMutations();
          return true;
        }
      }
      const anchor = selection.anchor;
      const anchorNode = anchor.getNode();
      if (domSelection === null || domSelectionPoints === null) {
        return true;
      }
      const isBackward = selection.isBackward();
      const startOffset = isBackward ? selection.anchor.offset : selection.focus.offset;
      const endOffset = isBackward ? selection.focus.offset : selection.anchor.offset;
      // If the content is the same as inserted, then don't dispatch an insertion.
      // Given onInput doesn't take the current selection (it uses the previous)
      // we can compare that against what the DOM currently says.
      if (!CAN_USE_BEFORE_INPUT || selection.isCollapsed() || !$isTextNode(anchorNode) || domSelectionPoints.anchorNode === null || anchorNode.getTextContent().slice(0, startOffset) + data + anchorNode.getTextContent().slice(startOffset + endOffset) !== getAnchorTextFromDOM(domSelectionPoints.anchorNode)) {
        dispatchCommand(editor, CONTROLLED_TEXT_INSERTION_COMMAND, data);
      }
      const textLength = data.length;

      // Another hack for FF, as it's possible that the IME is still
      // open, even though compositionend has already fired (sigh).
      if (IS_FIREFOX && textLength > 1 && event.inputType === 'insertCompositionText' && !editor.isComposing()) {
        selection.anchor.offset -= textLength;
        selection._cachedNodes = null;
        selection._cachedIsBackward = null;
      }

      // This ensures consistency on Android.
      if (IS_ANDROID_CHROME && editor.isComposing()) {
        inputState.lastKeyDownTimeStamp = 0;
        $setCompositionKey(null);
      }
    }
  }
  if (!handled) {
    const characterData = data !== null ? data : undefined;
    $updateSelectedTextFromDOM(false, editor, characterData);

    // onInput always fires after onCompositionEnd for FF, so the composition
    // end runs here. Mirror the COMPOSITION_END_TAG that $handleCompositionEnd
    // adds on Chrome/Webkit so listeners gated on this tag (markdown shortcut
    // trigger, history merge, autocomplete post-commit) see the same signal on
    // Firefox.
    if (inputState.compositionPhase === 'ending-firefox') {
      $onCompositionEndImpl(editor, data || undefined);
      $addUpdateTag(COMPOSITION_END_TAG);
      inputState.compositionPhase = 'idle';
    }
  }

  // Also flush any other mutations that might have occurred
  // since the change.
  $flushMutations();
  return true;
}
function onCompositionStart(event, editor) {
  dispatchCommand(editor, COMPOSITION_START_COMMAND, event);
}
function $handleCompositionStart(event) {
  const editor = getActiveEditor();
  const inputState = editor._inputState;
  const selection = $getSelection();
  if ($isRangeSelection(selection) && !editor.isComposing()) {
    inputState.compositionPhase = 'composing';
    inputState.hadOrphanedCompositionEvents = false;
    const anchor = selection.anchor;
    const node = selection.anchor.getNode();
    $setCompositionKey(anchor.key);
    $addUpdateTag(COMPOSITION_START_TAG);
    if (
    // If it has been 30ms since the last keydown, then we should
    // apply the empty space heuristic. We can't do this for Safari,
    // as the keydown fires after composition start.
    event.timeStamp < inputState.lastKeyDownTimeStamp + ANDROID_COMPOSITION_LATENCY ||
    // FF has issues around composing multibyte characters, so we also
    // need to invoke the empty space heuristic below.
    anchor.type === 'element' || !selection.isCollapsed() || !IS_ANDROID_CHROME && (node.getFormat() !== selection.format || $isTextNode(node) && node.getStyle() !== selection.style) || $isTextNode(node) && ($isTokenOrSegmented(node) || anchor.offset === 0 && !node.canInsertTextBefore() || anchor.offset === node.getTextContentSize() && !node.canInsertTextAfter())) {
      // We insert a zero width character, ready for the composition
      // to get inserted into the new node we create. If
      // we don't do this, Safari will fail on us because
      // there is no text node matching the selection.
      dispatchCommand(editor, CONTROLLED_TEXT_INSERTION_COMMAND, COMPOSITION_START_CHAR);
      const updatedSelection = $getSelection();
      if ($isRangeSelection(updatedSelection)) {
        $setCompositionKey(updatedSelection.anchor.key);
      }
    }
  }
  return true;
}
function $handleCompositionEnd(event) {
  const editor = getActiveEditor();
  editor._inputState.compositionPhase = 'idle';
  $onCompositionEndImpl(editor, event.data);
  $addUpdateTag(COMPOSITION_END_TAG);
  return true;
}
function $cleanupComposedSubclass(compositionKey) {
  if (compositionKey === null) {
    return;
  }
  const composedNode = $getNodeByKey(compositionKey);
  if (!$isTextNode(composedNode) || composedNode.getType() === 'text' || $isTokenOrSegmented(composedNode) || !composedNode.isAttached()) {
    return;
  }
  const sel = $getSelection();
  const offset = $isRangeSelection(sel) && sel.anchor.key === compositionKey ? sel.anchor.offset : null;
  const replacement = $createTextNode(composedNode.getTextContent());
  replacement.setFormat(composedNode.getFormat());
  replacement.setStyle(composedNode.getStyle());
  composedNode.replace(replacement);
  if (offset !== null) {
    const safeOffset = Math.min(offset, replacement.getTextContentSize());
    replacement.select(safeOffset, safeOffset);
  }
}
function $onCompositionEndImpl(editor, data) {
  const compositionKey = editor._compositionKey;
  $setCompositionKey(null);

  // Handle termination of composition.
  if (compositionKey !== null && data != null) {
    // Composition can sometimes move to an adjacent DOM node when backspacing.
    // So check for the empty case.
    if (data === '') {
      const node = $getNodeByKey(compositionKey);
      const domElement = editor.getElementByKey(compositionKey);
      const textNode = domElement !== null && $isTextNode(node) ? $getDOMTextNode(node, domElement, editor) : null;
      if (textNode !== null && textNode.nodeValue !== null && $isTextNode(node)) {
        const domSelection = getDOMSelection(getWindow(editor));
        const domSelectionPoints = domSelection && getDOMSelectionPoints(domSelection, editor._rootElement);
        let anchorOffset = null;
        let focusOffset = null;
        if (domSelectionPoints !== null && domSelectionPoints.anchorNode === textNode) {
          anchorOffset = domSelectionPoints.anchorOffset;
          focusOffset = domSelectionPoints.focusOffset;
        }
        $updateTextNodeFromDOMContent(node, textNode.nodeValue, anchorOffset, focusOffset, true);
      }
      $cleanupComposedSubclass(compositionKey);
      return false;
    } else if (data[data.length - 1] === '\n') {
      const selection = $getSelection();
      if ($isRangeSelection(selection) || $isNodeSelection(selection)) {
        // If the last character is a line break, we also need to insert
        // a line break.
        if ($isRangeSelection(selection)) {
          const focus = selection.focus;
          selection.anchor.set(focus.key, focus.offset, focus.type);
        }
        dispatchCommand(editor, KEY_ENTER_COMMAND, null);
        $cleanupComposedSubclass(compositionKey);
        return false;
      }
    }

    // When composition ends on a token node, markDirty reverts its DOM
    // but the composed text is lost. Redirect it to the adjacent TextNode
    // via the existing token-redirect logic in selection.insertText.
    const node = $getNodeByKey(compositionKey);
    if (node !== null && $isTextNode(node) && $isTokenOrSegmented(node)) {
      node.markDirty();
      const selection = $getSelection();
      const textLen = node.getTextContentSize();
      const offset = $isRangeSelection(selection) && selection.anchor.key === compositionKey ? selection.anchor.offset : textLen;
      node.select(offset, offset).insertText(data);
      return true;
    }
  }
  $updateSelectedTextFromDOM(true, editor, data);
  $cleanupComposedSubclass(compositionKey);
  return false;
}
function onCompositionEnd(event, editor) {
  // Firefox fires compositionEnd before input; Safari fires it before
  // keydown. The 'ending-*' phases defer handling for those browsers.
  // Chrome/Webkit fires input first, so it dispatches immediately.
  const inputState = editor._inputState;
  if (IS_FIREFOX) {
    inputState.compositionPhase = 'ending-firefox';
  } else if (!IS_IOS && (IS_SAFARI || IS_APPLE_WEBKIT)) {
    // https://github.com/facebook/lexical/pull/7061
    inputState.compositionPhase = 'ending-safari';
    inputState.compositionEndData = event.data;
  } else {
    dispatchCommand(editor, COMPOSITION_END_COMMAND, event);
  }
}
function onKeyDown(event, editor) {
  const inputState = editor._inputState;
  inputState.lastKeyDownTimeStamp = event.timeStamp;
  inputState.lastKeyCode = event.key;
  if (event.key !== 'Backspace') {
    clearHandledSelectionCommandInsertText(inputState);
  }
  if (editor.isComposing()) {
    return;
  }
  dispatchCommand(editor, KEY_DOWN_COMMAND, event);
}
function $handleKeyDown(event) {
  const editor = getActiveEditor();
  const inputState = editor._inputState;
  if (event.key == null) {
    return true;
  }
  if (inputState.compositionPhase === 'ending-safari') {
    const isBack = isBackspace(event);
    if (isBack) {
      updateEditorSync(editor, () => {
        $onCompositionEndImpl(editor, inputState.compositionEndData);
      });
    }
    inputState.compositionPhase = 'idle';
    inputState.compositionEndData = '';
    if (isBack) {
      return true;
    }
  }
  if (isMoveForward(event)) {
    dispatchCommand(editor, KEY_ARROW_RIGHT_COMMAND, event);
  } else if (isMoveToEnd(event)) {
    dispatchCommand(editor, MOVE_TO_END, event);
  } else if (isMoveBackward(event)) {
    dispatchCommand(editor, KEY_ARROW_LEFT_COMMAND, event);
  } else if (isMoveToStart(event)) {
    dispatchCommand(editor, MOVE_TO_START, event);
  } else if (isMoveUp(event)) {
    dispatchCommand(editor, KEY_ARROW_UP_COMMAND, event);
  } else if (isMoveDown(event)) {
    dispatchCommand(editor, KEY_ARROW_DOWN_COMMAND, event);
  } else if (isLineBreak(event)) {
    inputState.isInsertLineBreak = true;
    dispatchCommand(editor, KEY_ENTER_COMMAND, event);
  } else if (isSpace(event)) {
    dispatchCommand(editor, KEY_SPACE_COMMAND, event);
  } else if (isOpenLineBreak(event)) {
    event.preventDefault();
    inputState.isInsertLineBreak = true;
    dispatchCommand(editor, INSERT_LINE_BREAK_COMMAND, true);
  } else if (isParagraph(event)) {
    inputState.isInsertLineBreak = false;
    dispatchCommand(editor, KEY_ENTER_COMMAND, event);
  } else if (isDeleteBackward(event)) {
    if (isBackspace(event)) {
      if (dispatchCommand(editor, KEY_BACKSPACE_COMMAND, event)) {
        markHandledSelectionCommandInsertText(inputState);
      }
    } else {
      event.preventDefault();
      dispatchCommand(editor, DELETE_CHARACTER_COMMAND, true);
    }
  } else if (isEscape(event)) {
    dispatchCommand(editor, KEY_ESCAPE_COMMAND, event);
  } else if (isDeleteForward(event)) {
    if (isDelete(event)) {
      dispatchCommand(editor, KEY_DELETE_COMMAND, event);
    } else {
      event.preventDefault();
      dispatchCommand(editor, DELETE_CHARACTER_COMMAND, false);
    }
  } else if (isDeleteWordBackward(event)) {
    event.preventDefault();
    dispatchCommand(editor, DELETE_WORD_COMMAND, true);
  } else if (isDeleteWordForward(event)) {
    event.preventDefault();
    dispatchCommand(editor, DELETE_WORD_COMMAND, false);
  } else if (isDeleteLineBackward(event)) {
    event.preventDefault();
    dispatchCommand(editor, DELETE_LINE_COMMAND, true);
  } else if (isDeleteLineForward(event)) {
    event.preventDefault();
    dispatchCommand(editor, DELETE_LINE_COMMAND, false);
  } else if (isBold(event)) {
    event.preventDefault();
    dispatchCommand(editor, FORMAT_TEXT_COMMAND, 'bold');
  } else if (isUnderline(event)) {
    event.preventDefault();
    dispatchCommand(editor, FORMAT_TEXT_COMMAND, 'underline');
  } else if (isItalic(event)) {
    event.preventDefault();
    dispatchCommand(editor, FORMAT_TEXT_COMMAND, 'italic');
  } else if (isTab(event)) {
    dispatchCommand(editor, KEY_TAB_COMMAND, event);
  } else if (isUndo(event)) {
    event.preventDefault();
    dispatchCommand(editor, UNDO_COMMAND);
  } else if (isRedo(event)) {
    event.preventDefault();
    dispatchCommand(editor, REDO_COMMAND);
  } else {
    const prevSelection = editor._editorState._selection;
    if (isSelectAll(event)) {
      event.preventDefault();
      if (dispatchCommand(editor, SELECT_ALL_COMMAND, event)) {
        markHandledSelectionCommandInsertText(inputState);
      }
    } else if (prevSelection !== null && !$isRangeSelection(prevSelection)) {
      // Only RangeSelection can use the native cut/copy/select all
      if (isCopy(event)) {
        event.preventDefault();
        dispatchCommand(editor, COPY_COMMAND, event);
      } else if (isCut(event)) {
        event.preventDefault();
        dispatchCommand(editor, CUT_COMMAND, event);
      }
    }
  }
  if (isModifier(event)) {
    editor.dispatchCommand(KEY_MODIFIER_COMMAND, event);
  }
  return true;
}
function getRootElementRemoveHandles(rootElement) {
  // @ts-expect-error: internal field
  let eventHandles = rootElement.__lexicalEventHandles;
  if (eventHandles === undefined) {
    eventHandles = [];
    // @ts-expect-error: internal field
    rootElement.__lexicalEventHandles = eventHandles;
  }
  return eventHandles;
}

// Mapping root editors to their active nested editors, contains nested editors
// mapping only, so if root editor is selected map will have no reference to free up memory
const activeNestedEditorsMap = new Map();
function onDocumentSelectionChange(event) {
  const domSelection = getDOMSelectionFromTarget(event.target);
  if (domSelection === null) {
    return;
  }
  // Ask each editor registered against this document for its shadow-aware
  // anchor and pick the one whose root actually contains the answer.
  // Selection.anchorNode is retargeted to a light-DOM ancestor for any
  // selection inside a shadow tree, so trusting it directly attributes a
  // shadow editor's change to whichever enclosing editor the engine
  // walked up to (or drops the event when the host sits outside every
  // editor). Reading getComposedRanges through each editor's own shadow
  // roots gets the un-retargeted anchor regardless of which editor owns
  // it.
  //
  // Nested case (inner shadow editor inside a light-DOM outer editor):
  // visit shadow-mounted candidates first. The inner editor's anchor read
  // resolves through its own shadow root and matches its candidate; the
  // outer editor's degraded read (empty composed range → retargeted host
  // landing inside outer's tree) never wins because we have already broken
  // out of the loop.

  const ownerDocument = getDOMOwnerDocument(event.target);
  let nextActiveEditor = null;
  let resolvedAnchorNode = null;
  const registration = ownerDocument !== null ? documentRegistrations.get(ownerDocument) : undefined;
  if (ownerDocument !== null) {
    if (registration !== undefined) {
      const editorsForDoc = registration.editors;
      let hasShadow = registration.hasShadowEditor;
      if (hasShadow === undefined) {
        hasShadow = false;
        for (const ed of editorsForDoc) {
          if (ed._rootElement !== null && isDOMShadowRoot(ed._rootElement.getRootNode())) {
            hasShadow = true;
            break;
          }
        }
        registration.hasShadowEditor = hasShadow;
      }
      if (!hasShadow) {
        const anchorNode = domSelection.anchorNode;
        if (anchorNode !== null && !(isHTMLElement(anchorNode) && anchorNode.shadowRoot !== null)) {
          nextActiveEditor = getNearestEditorFromDOMNode(anchorNode);
          if (nextActiveEditor !== null) {
            resolvedAnchorNode = anchorNode;
          }
        }
      } else {
        // Try shadow-mounted candidates first: their getDOMSelectionPoints
        // call resolves the un-retargeted anchor through their own shadow
        // root, so an inner shadow editor inside a light-DOM outer editor
        // wins attribution before the outer candidate sees the host-retargeted
        // anchor that lands inside outer's tree.
        //
        // Single pass with deferred light-DOM fallback avoids Array.from +
        // sort and the redundant getRootNode calls the comparator needed.
        let deferredLightEditor = null;
        let deferredLightAnchor = null;
        for (const candidate of editorsForDoc) {
          const candidateRoot = candidate._rootElement;
          if (candidateRoot === null) {
            continue;
          }
          const anchorNode = getDOMSelectionPoints(domSelection, candidateRoot).anchorNode;
          if (anchorNode === null) {
            continue;
          }
          if (getNearestEditorFromDOMNode(anchorNode) !== candidate) {
            continue;
          }
          if (isDOMShadowRoot(candidateRoot.getRootNode())) {
            nextActiveEditor = candidate;
            resolvedAnchorNode = anchorNode;
            break;
          }
          if (deferredLightEditor === null) {
            deferredLightEditor = candidate;
            deferredLightAnchor = anchorNode;
          }
        }
        if (nextActiveEditor === null && deferredLightEditor !== null) {
          nextActiveEditor = deferredLightEditor;
          resolvedAnchorNode = deferredLightAnchor;
        }
      }
    }
    // Fallback: the shadow-aware anchor sits outside every registered
    // editor (a programmatic selection change that landed on a non-editor
    // element, or a host the engine retargeted to). Use the deep-focused
    // element so a user typing into an editor still gets an attribution.
    if (nextActiveEditor === null) {
      const activeElement = getActiveElementDeep(ownerDocument);
      nextActiveEditor = activeElement !== null ? getNearestEditorFromDOMNode(activeElement) : null;
    }
  }
  if (nextActiveEditor === null) {
    return;
  }
  if (nextActiveEditor._inputState.isSelectionChangeFromMouseDown) {
    // Clear the flag on all editors registered on this document — a
    // pointerdown inside a nested editor bubbles to the parent, setting
    // the flag on both. Only one selectionchange fires, so stale flags
    // on sibling/parent editors must be cleared to match the previous
    // single-global semantics.
    if (registration !== undefined) {
      for (const ed of registration.editors) {
        ed._inputState.isSelectionChangeFromMouseDown = false;
      }
    }
    updateEditorSync(nextActiveEditor, () => {
      const lastSelection = $getPreviousSelection();
      const domAnchorNode = resolvedAnchorNode ?? getDOMSelectionPoints(domSelection, nextActiveEditor._rootElement).anchorNode;
      if (isHTMLElement(domAnchorNode) || isDOMTextNode(domAnchorNode)) {
        // If the user is attempting to click selection back onto text, then
        // we should attempt create a range selection.
        // When we click on an empty paragraph node or the end of a paragraph that ends
        // with an image/poll, the nodeType will be ELEMENT_NODE
        const newSelection = $internalCreateRangeSelection(lastSelection, domSelection, nextActiveEditor, event);
        $setSelection(newSelection);
      }
    });
  }

  // When editor receives selection change event, we're checking if
  // it has any sibling editors (within same parent editor) that were active
  // before, and trigger selection change on it to nullify selection.
  const editors = getEditorsToPropagate(nextActiveEditor);
  const rootEditor = editors[editors.length - 1];
  const rootEditorKey = rootEditor._key;
  const activeNestedEditor = activeNestedEditorsMap.get(rootEditorKey);
  const prevActiveEditor = activeNestedEditor || rootEditor;
  if (prevActiveEditor !== nextActiveEditor) {
    onSelectionChange(domSelection, prevActiveEditor, false);
  }
  onSelectionChange(domSelection, nextActiveEditor, true);

  // If newly selected editor is nested, then add it to the map, clean map otherwise
  if (nextActiveEditor !== rootEditor) {
    activeNestedEditorsMap.set(rootEditorKey, nextActiveEditor);
  } else if (activeNestedEditor) {
    activeNestedEditorsMap.delete(rootEditorKey);
  }
}

/** @internal */
function stopLexicalPropagation(event) {
  // We attach a special property to ensure the same event doesn't re-fire
  // for parent editors.
  // @ts-ignore
  event._lexicalHandled = true;
}
function hasStoppedLexicalPropagation(event) {
  // @ts-ignore
  const stopped = event._lexicalHandled === true;
  return stopped;
}
function addRootElementEvents(rootElement, editor) {
  // We only want to have a single global selectionchange event handler, shared
  // between all editor instances.
  const doc = rootElement.ownerDocument;
  rootElementToDocument.set(rootElement, doc);
  let registration = documentRegistrations.get(doc);
  if (registration === undefined) {
    registration = {
      editors: new Set(),
      hasShadowEditor: undefined
    };
    documentRegistrations.set(doc, registration);
  }
  registration.editors.add(editor);
  registration.hasShadowEditor = undefined;

  // @ts-expect-error: internal field
  rootElement.__lexicalEditor = editor;
  const removeHandles = getRootElementRemoveHandles(rootElement);
  // Reference-counted shared `selectionchange` listener; the disposer is run
  // with this root element's other listeners in removeRootElementEvents.
  removeHandles.push(documentSelectionChange.register(doc));
  for (let i = 0; i < rootElementEvents.length; i++) {
    const [eventName, onEvent] = rootElementEvents[i];
    const eventHandler = typeof onEvent === 'function' ? event => {
      if (hasStoppedLexicalPropagation(event)) {
        return;
      }
      stopLexicalPropagation(event);
      if (editor.isEditable() || eventName === 'click') {
        onEvent(event, editor);
      }
    } : event => {
      if (hasStoppedLexicalPropagation(event)) {
        return;
      }
      stopLexicalPropagation(event);
      const isEditable = editor.isEditable();
      switch (eventName) {
        case 'cut':
          return isEditable && dispatchCommand(editor, CUT_COMMAND, event);
        case 'copy':
          return dispatchCommand(editor, COPY_COMMAND, event);
        case 'paste':
          return isEditable && dispatchCommand(editor, PASTE_COMMAND, event);
        case 'dragstart':
          return isEditable && dispatchCommand(editor, DRAGSTART_COMMAND, event);
        case 'dragover':
          return isEditable && dispatchCommand(editor, DRAGOVER_COMMAND, event);
        case 'dragend':
          return isEditable && dispatchCommand(editor, DRAGEND_COMMAND, event);
        case 'focus':
          return isEditable && dispatchCommand(editor, FOCUS_COMMAND, event);
        case 'blur':
          {
            return isEditable && dispatchCommand(editor, BLUR_COMMAND, event);
          }
        case 'drop':
          return isEditable && dispatchCommand(editor, DROP_COMMAND, event);
      }
    };
    removeHandles.push(registerEventListener(rootElement, eventName, eventHandler));
  }
}
const rootElementNotRegisteredWarning = warnOnlyOnce('Root element not registered');
function removeRootElementEvents(rootElement) {
  const doc = rootElementToDocument.get(rootElement);
  if (doc === undefined) {
    rootElementNotRegisteredWarning();
    return;
  }
  const registration = documentRegistrations.get(doc);
  if (registration === undefined) {
    // This can happen if setRootElement() failed
    rootElementNotRegisteredWarning();
    return;
  }

  // The shared `selectionchange` listener is reference counted by
  // `documentSelectionChange`; its disposer runs below with `removeHandles`.
  rootElementToDocument.delete(rootElement);
  const editor = getEditorPropertyFromDOMNode(rootElement);
  if (isLexicalEditor(editor)) {
    cleanActiveNestedEditorsMap(editor);
    registration.editors.delete(editor);
    registration.hasShadowEditor = undefined;
    // @ts-expect-error: internal field
    rootElement.__lexicalEditor = null;
  } else if (editor) {
    {
      formatDevErrorMessage(`Attempted to remove event handlers from a node that does not belong to this build of Lexical`);
    }
  }
  const removeHandles = getRootElementRemoveHandles(rootElement);
  for (let i = 0; i < removeHandles.length; i++) {
    removeHandles[i]();
  }

  // @ts-expect-error: internal field
  rootElement.__lexicalEventHandles = [];
}
function cleanActiveNestedEditorsMap(editor) {
  if (editor._parentEditor !== null) {
    // For nested editor cleanup map if this editor was marked as active
    const editors = getEditorsToPropagate(editor);
    const rootEditor = editors[editors.length - 1];
    const rootEditorKey = rootEditor._key;
    if (activeNestedEditorsMap.get(rootEditorKey) === editor) {
      activeNestedEditorsMap.delete(rootEditorKey);
    }
  } else {
    // For top-level editors cleanup map
    activeNestedEditorsMap.delete(editor._key);
  }
}

/** @internal */
function markSelectionChangeFromDOMUpdate(editor) {
  editor._inputState.isSelectionChangeFromDOMUpdate = true;
}

/** @internal */
function markCollapsedSelectionFormat(editor, format, style, offset, key, timeStamp) {
  editor._inputState.collapsedSelectionFormat = {
    format,
    key,
    offset,
    style,
    timeStamp
  };
}

/**
 * The base type for all serialized nodes
 */

/**
 * EXPERIMENTAL
 * The configuration of a node returned by LexicalNode.$config()
 *
 * @example
 * ```ts
 * class CustomText extends TextNode {
 *   $config() {
 *     return this.config('custom-text', {extends: TextNode}};
 *   }
 * }
 * ```
 */

/**
 * This is the type of LexicalNode.$config() that can be
 * overridden by subclasses.
 *
 * Concrete nodes are keyed by their string `type`. An abstract base class
 * (such as ElementNode or DecoratorNode) has no concrete node `type`, so when
 * it needs to declare configuration that is shared with its concrete
 * subclasses (for example required {@link RequiredNodeStateConfig} state or a
 * `$transform`) it is keyed instead by a well-known symbol, by convention
 * `Symbol.for(<NodeClassName>)` (e.g. `Symbol.for('ElementNode')`). The
 * descriptive, globally-registered symbol keeps the config easy to find in a
 * debugger and can never collide with a real node `type`.
 */

/**
 * Used to extract the node and type from a StaticNodeConfigRecord
 */

/**
 * Any StaticNodeConfigValue (for generics and collections)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any

/**
 * @internal
 *
 * Type-only key under which a {@link StaticNodeConfigRecord} carries the node's
 * own (most-derived) `type` as a nullary accessor `() => Type`.
 *
 * TypeScript's type system is structural, so a node subclass that adds no
 * type-distinguishable members over its base (e.g. {@link TabNode} over
 * {@link TextNode}, which only overrides methods with identical signatures) is
 * structurally identical to that base despite being a distinct class — the
 * negative branch of an `instanceof`-style guard like `$isTabNode()` would
 * otherwise collapse to `never` because TypeScript concludes the base is also
 * assignable to the subclass.
 *
 * Encoding the type as a *function* (rather than a bare `Type`) lets the
 * accessor accumulate down the `extends` chain by intersection: a subclass'
 * record is `ParentRecord & {[STATIC_NODE_TYPE]: () => OwnType}`, so the key
 * holds `(() => ParentType) & (() => OwnType)`. TypeScript resolves an
 * intersection of call signatures as an overload set, which has two effects:
 *
 * - {@link GetStaticNodeType} reads `ReturnType<...>`, which selects the *last*
 *   overload — the most-derived own `type` — rather than a union of the chain.
 * - A node stays assignable to each of its ancestors (the intersection
 *   satisfies every `() => AncestorType`) while an ancestor is not assignable
 *   to it (it lacks the `() => OwnType` signature), so guards narrow correctly
 *   at every level of the hierarchy — not just one.
 *
 * This keeps the node classes themselves nominally distinguishable along their
 * real hierarchy; it is not a cross-cutting trait marker. The accessor is never
 * read at runtime — `config()` does not set this key — so it is `declare`-only
 * and carries no runtime cost. It is `@internal` (surfaced via the
 * {@link StaticNodeTypeAccessor} interface so that inferred `$config()` return
 * types remain nameable in generated declaration files) and a node never
 * references it. Distinction is automatic for any node that declares its
 * `extends`; a subclass adds nothing by hand.
 */

/**
 * @internal
 *
 * Carries a node's own `type` under the {@link STATIC_NODE_TYPE} accessor. This
 * is an `interface` (rather than an inline object type) on purpose: it is never
 * inlined in generated declaration files, so a subclass' `$config()` return type
 * references it by name (`StaticNodeTypeAccessor<'tab'>`) and the symbol key
 * stays encapsulated here rather than leaking — unnamed — into every node's
 * `.d.ts`.
 */

/**
 * @internal
 *
 * Type-only key under which a {@link StaticNodeConfigRecord} carries the node's
 * own configuration (the value passed to {@link LexicalNode.config}) as a
 * nullary accessor `() => Config`.
 *
 * This mirrors {@link STATIC_NODE_TYPE}: encoding the config as a *function*
 * lets it accumulate down the `extends` chain by call-signature intersection so
 * that `ReturnType<...>` resolves the most-derived own config. It exists so that
 * an abstract base class keyed by a symbol — which has no string `type` to index
 * the record by — can still expose its own config to the state-config
 * collectors, and so that such a base's symbol-keyed `$config()` return remains
 * a valid override of an accessor-bearing superclass `$config()` (it inherits
 * the superclass record, hence that record's {@link STATIC_NODE_TYPE} accessor).
 * Never read at runtime — `config()` does not set this key — so it is
 * `declare`-only and carries no runtime cost.
 */

/**
 * @internal
 *
 * Carries a node's own config under the {@link STATIC_NODE_CONFIG} accessor.
 * Like {@link StaticNodeTypeAccessor} this is a named `interface` so the symbol
 * key stays encapsulated and inferred `$config()` return types remain nameable
 * in generated declaration files.
 */

/**
 * @internal
 *
 * This is the more specific type than BaseStaticNodeConfig that a subclass
 * should return from $config().
 *
 * A node that declares its `extends` accumulates the configuration of its
 * superclass and records its own `type` under {@link STATIC_NODE_TYPE} and its
 * own config under {@link STATIC_NODE_CONFIG}, so that it is nominally distinct
 * from — yet still assignable to — that superclass, and so the state-config
 * collectors can read its own config without indexing by `type`.
 */

/**
 * @internal
 *
 * The record returned by {@link LexicalNode.config} for an abstract base class
 * keyed by a symbol. Unlike {@link StaticNodeConfigRecord} it records no string
 * `type` and adds no {@link STATIC_NODE_TYPE} accessor (an abstract base has no
 * concrete node type), but it does inherit its superclass record and expose its
 * own config under {@link STATIC_NODE_CONFIG}. Inheriting the superclass record
 * is what keeps the override valid when the superclass is a concrete node whose
 * `$config()` return already carries a {@link STATIC_NODE_TYPE} accessor.
 */

/**
 * Extract the type from a node based on its $config
 *
 * @example
 * ```ts
 * type TextNodeType = GetStaticNodeType<TextNode>;
 *      // ? 'text'
 * ```
 */

/**
 * @internal
 *
 * A node's own config (the value it passed to {@link LexicalNode.config}), read
 * from the {@link STATIC_NODE_CONFIG} accessor, or `never` for a node whose
 * `$config()` does not set that accessor (a legacy node, or one whose record
 * uses the {@link BaseStaticNodeConfig} fallback). Unlike indexing the record by
 * a resolved string `type`, this also resolves the own config of an abstract
 * base class keyed by a symbol.
 */

/**
 * The most precise type we can infer for the JSON that will
 * be produced by T.exportJSON().
 *
 * Do not use this for the return type of T.exportJSON()! It must be
 * a more generic type to be compatible with subclassing.
 */

/**
 * Omit the children, type, and version properties from the given SerializedLexicalNode definition.
 */

/** @internal */

function $removeNode(nodeToRemove, restoreSelection, preserveEmptyParent) {
  errorOnReadOnly();
  const key = nodeToRemove.__key;
  const parent = nodeToRemove.getParent();
  if (parent === null) {
    if (!($getSlotHostKey(nodeToRemove) === null)) {
      formatDevErrorMessage(`$removeNode: node ${key} is slotted into host ${String($getSlotHostKey(nodeToRemove))}; use removeSlot on the host instead of remove().`);
    }
    return;
  }
  const selection = $maybeMoveChildrenSelectionToParent(nodeToRemove);
  let selectionMoved = false;
  if ($isRangeSelection(selection) && restoreSelection) {
    const anchor = selection.anchor;
    const focus = selection.focus;
    if (anchor.key === key) {
      moveSelectionPointToSibling(anchor, nodeToRemove, parent, nodeToRemove.getPreviousSibling(), nodeToRemove.getNextSibling());
      selectionMoved = true;
    }
    if (focus.key === key) {
      moveSelectionPointToSibling(focus, nodeToRemove, parent, nodeToRemove.getPreviousSibling(), nodeToRemove.getNextSibling());
      selectionMoved = true;
    }
  } else if ($isNodeSelection(selection) && restoreSelection && nodeToRemove.isSelected()) {
    nodeToRemove.selectPrevious();
  }
  if ($isRangeSelection(selection) && restoreSelection && !selectionMoved) {
    // Doing this is O(n) so lets avoid it unless we need to do it
    const index = nodeToRemove.getIndexWithinParent();
    $removeFromParent(nodeToRemove);
    $updateElementSelectionOnCreateDeleteNode(selection, parent, index, -1);
  } else {
    $removeFromParent(nodeToRemove);
  }
  if (!preserveEmptyParent && !$isRootOrShadowRoot(parent) && !parent.canBeEmpty() && parent.isEmpty()) {
    $removeNode(parent, restoreSelection);
  }
  if (restoreSelection && selection && $isRootNode(parent) && parent.isEmpty()) {
    parent.selectEnd();
  }
}
/**
 * An identity function that will infer the type of DOM nodes
 * based on tag names to make it easier to construct a
 * DOMConversionMap.
 */
function buildImportMap(importMap) {
  return importMap;
}
const EPHEMERAL = Symbol.for('ephemeral');

/**
 * @internal
 * @param node any LexicalNode
 * @returns true if the node was created with {@link $cloneWithPropertiesEphemeral}
 */
function $isEphemeral(node) {
  return node[EPHEMERAL] || false;
}
/**
 * @internal
 * Mark this node as ephemeral, its instance always returns this
 * for getLatest and getWritable. It must not be added to an EditorState.
 */
function $markEphemeral(node) {
  node[EPHEMERAL] = true;
  return node;
}

/** @internal */
const NON_ENUMERABLE_PROP_DESC = {
  configurable: true,
  enumerable: false,
  value: undefined,
  writable: true
};

/**
 * A node that can host named slots, implemented by {@link ElementNode} and
 * {@link DecoratorNode}. The map is allocated lazily (null until the first
 * {@link $setSlot}) since most nodes have none. Declaring this off the base
 * {@link LexicalNode} is what lets {@link $setSlot} / {@link $removeSlot}
 * reject a non-host at compile time.
 *
 * @experimental
 */

/**
 * A node that can occupy a named slot, implemented by {@link ElementNode} and
 * {@link DecoratorNode}. Its up-pointer is `__slotHost` rather than `__parent`
 * (the two are mutually exclusive), so the slot boundary behaves like a shadow
 * root.
 *
 * @experimental
 */

class LexicalNode {
  /** @internal Allow us to look up the type including static props */

  /** @internal */
  // `__type` is assigned once, in the constructor, and is never valid to
  // mutate afterward.
  __type;
  /** @internal */
  //@ts-ignore We set the key in the constructor.
  __key;
  /** @internal */
  __parent;
  /** @internal */
  __prev;
  /** @internal */
  __next;
  /** @internal */
  __state;
  /** @internal */
  [CACHED_TEXT_SIZE_KEY];

  // Flow doesn't support abstract classes unfortunately, so we can't _force_
  // subclasses of Node to implement statics. All subclasses of Node should have
  // a static getType and clone method though. We define getType and clone here so we can call it
  // on any  Node, and we throw this error by default since the subclass should provide
  // their own implementation.
  /**
   * Returns the string type of this node. Every node must
   * implement this and it MUST BE UNIQUE amongst nodes registered
   * on the editor.
   *
   */
  static getType() {
    const {
      ownNodeType
    } = getStaticNodeConfig(this);
    if (!(ownNodeType !== undefined)) {
      formatDevErrorMessage(`LexicalNode: Node ${this.name} does not implement .getType().`);
    }
    return ownNodeType;
  }

  /**
   * Clones this node, creating a new node with a different key
   * and adding it to the EditorState (but not attaching it anywhere!). All nodes must
   * implement this method.
   *
   */
  static clone(_data) {
    {
      formatDevErrorMessage(`LexicalNode: Node ${this.name} does not implement .clone().`);
    }
  }

  /**
   * Override this to implement the new static node configuration protocol,
   * this method is called directly on the prototype and must not depend
   * on anything initialized in the constructor. Generally it should be
   * a trivial implementation.
   *
   * @example
   * ```ts
   * class MyNode extends TextNode {
   *   $config() {
   *     return this.config('my-node', {extends: TextNode});
   *   }
   * }
   * ```
   */
  $config() {
    return {};
  }

  /**
   * This is a convenience method for $config that
   * aids in type inference. See {@link LexicalNode.$config}
   * for example usage.
   *
   * An abstract base class that has no concrete node `type` may pass a
   * well-known symbol (by convention `Symbol.for(<NodeClassName>)`) instead of
   * a string `type` to declare configuration shared with its subclasses.
   */

  config(type, config) {
    const parentKlass = config.extends || getSuperclassOf(this.constructor);
    Object.assign(config, {
      extends: parentKlass
    });
    // A concrete node records its string `type`; an abstract base class is
    // keyed by a well-known symbol (e.g. Symbol.for('ElementNode')) and has no
    // concrete node `type`.
    if (typeof type === 'string') {
      Object.assign(config, {
        type
      });
    }
    return {
      [type]: config
    };
  }

  /**
   * Perform any state updates on the clone of prevNode that are not already
   * handled by the constructor call in the static clone method. If you have
   * state to update in your clone that is not handled directly by the
   * constructor, it is advisable to override this method but it is required
   * to include a call to `super.afterCloneFrom(prevNode)` in your
   * implementation. This is only intended to be called by
   * {@link $cloneWithProperties} function or via a super call.
   *
   * @example
   * ```ts
   * class ClassesTextNode extends TextNode {
   *   // Not shown: static getType, static importJSON, exportJSON, createDOM, updateDOM
   *   __classes = new Set<string>();
   *   static clone(node: ClassesTextNode): ClassesTextNode {
   *     // The inherited TextNode constructor is used here, so
   *     // classes is not set by this method.
   *     return new ClassesTextNode(node.__text, node.__key);
   *   }
   *   afterCloneFrom(node: this): void {
   *     // This calls TextNode.afterCloneFrom and LexicalNode.afterCloneFrom
   *     // for necessary state updates
   *     super.afterCloneFrom(node);
   *     this.__addClasses(node.__classes);
   *   }
   *   // This method is a private implementation detail, it is not
   *   // suitable for the public API because it does not call getWritable
   *   __addClasses(classNames: Iterable<string>): this {
   *     for (const className of classNames) {
   *       this.__classes.add(className);
   *     }
   *     return this;
   *   }
   *   addClass(...classNames: string[]): this {
   *     return this.getWritable().__addClasses(classNames);
   *   }
   *   removeClass(...classNames: string[]): this {
   *     const node = this.getWritable();
   *     for (const className of classNames) {
   *       this.__classes.delete(className);
   *     }
   *     return this;
   *   }
   *   getClasses(): Set<string> {
   *     return this.getLatest().__classes;
   *   }
   * }
   * ```
   *
   */
  afterCloneFrom(prevNode) {
    if (this.__key === prevNode.__key) {
      this.__parent = prevNode.__parent;
      this.__next = prevNode.__next;
      this.__prev = prevNode.__prev;
      this.__state = prevNode.__state;
    } else if (prevNode.__state) {
      this.__state = prevNode.__state.getWritable(this);
    }
  }

  /**
   * Reset state in this copy of originalNode, if necessary
   *
   * @param originalNode
   */
  resetOnCopyNodeFrom(originalNode) {
    if (this.__state) {
      this.__state = this.__state.getWritable(this).resetOnCopyNode();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static importDOM;
  constructor(key) {
    this.__type = this.constructor.getType();
    this.__parent = null;
    this.__prev = null;
    this.__next = null;
    Object.defineProperty(this, '__state', NON_ENUMERABLE_PROP_DESC);
    // Pre-initialize the reconciler's cached-text-size slot so subsequent
    // assignments on the V8 hot path slot into a stable hidden class
    // instead of triggering per-instance shape transitions.
    Object.defineProperty(this, CACHED_TEXT_SIZE_KEY, NON_ENUMERABLE_PROP_DESC);
    $setNodeKey(this, key);
    {
      if (this.__type !== 'root') {
        errorOnTypeKlassMismatch(this.__type, this.constructor);
      }
    }
  }
  // Getters and Traversers

  /**
   * Returns the string type of this node.
   */
  getType() {
    return this.__type;
  }
  isInline() {
    {
      formatDevErrorMessage(`LexicalNode: Node ${this.constructor.name} does not implement .isInline().`);
    }
  }

  /**
   * Returns true if there is a path between this node and the RootNode, false otherwise.
   * This is a way of determining if the node is "attached" EditorState. Unattached nodes
   * won't be reconciled and will ultimately be cleaned up by the Lexical GC.
   */
  isAttached() {
    let nodeKey = this.__key;
    while (nodeKey !== null) {
      if (nodeKey === 'root') {
        return true;
      }

      // Annotation breaks a circular inference through the loop (TS7022),
      // remove when the deprecated generic signatures from #8661 are removed
      const node = $getNodeByKey(nodeKey);
      if (node === null) {
        break;
      }
      // A slotted node has no __parent; follow its slot host up toward root.
      nodeKey = node.__parent !== null ? node.__parent : $getSlotHostKey(node);
    }
    return false;
  }

  /**
   * Returns true if this node is contained within the provided Selection., false otherwise.
   * Relies on the algorithms implemented in {@link BaseSelection.getNodes} to determine
   * what's included.
   *
   * @param selection - The selection that we want to determine if the node is in.
   */
  isSelected(selection) {
    const targetSelection = selection || $getSelection();
    if (targetSelection == null) {
      return false;
    }
    const isSelected = targetSelection.getNodes().some(n => n.__key === this.__key);
    if ($isTextNode(this)) {
      return isSelected;
    }
    // For inline images inside of element nodes.
    // Without this change the image will be selected if the cursor is before or after it.
    const isElementRangeSelection = $isRangeSelection(targetSelection) && targetSelection.anchor.type === 'element' && targetSelection.focus.type === 'element';
    if (isElementRangeSelection) {
      if (targetSelection.isCollapsed()) {
        return false;
      }
      const parentNode = this.getParent();
      if ($isDecoratorNode(this) && this.isInline() && parentNode) {
        const firstPoint = targetSelection.isBackward() ? targetSelection.focus : targetSelection.anchor;
        if (parentNode.is(firstPoint.getNode()) && firstPoint.offset === parentNode.getChildrenSize() && this.is(parentNode.getLastChild())) {
          return false;
        }
      }
    }
    return isSelected;
  }

  /**
   * Returns this nodes key.
   */
  getKey() {
    // Key is stable between copies
    return this.__key;
  }

  /**
   * Returns the zero-based index of this node within the parent.
   */
  getIndexWithinParent() {
    const parent = this.getParent();
    if (parent === null) {
      return -1;
    }
    let node = parent.getFirstChild();
    let index = 0;
    while (node !== null) {
      if (this.is(node)) {
        return index;
      }
      index++;
      node = node.getNextSibling();
    }
    return -1;
  }

  /**
   * Returns the parent of this node, or null if none is found.
   */

  /**
   * @deprecated The type parameter is an unchecked and unsafe cast,
   * equivalent to `node.getParent() as T | null`, and will be removed
   * in a future release. Call this method without a type argument and
   * narrow the result with a type guard instead.
   */

  getParent() {
    const parent = this.getLatest().__parent;
    if (parent === null) {
      return null;
    }
    // Cast: a parent key always refers to an ElementNode
    return $getNodeByKey(parent);
  }

  /**
   * Returns the parent of this node, or throws if none is found.
   */

  /**
   * @deprecated The type parameter is an unchecked and unsafe cast,
   * equivalent to `node.getParentOrThrow() as T`, and will be removed
   * in a future release. Call this method without a type argument and
   * narrow the result with a type guard instead.
   */

  getParentOrThrow() {
    const parent = this.getParent();
    if (parent === null) {
      {
        formatDevErrorMessage(`Expected node ${this.__key} to have a parent.`);
      }
    }
    return parent;
  }

  /**
   * Returns the highest (in the EditorState tree)
   * non-root ancestor of this node, or null if none is found. See {@link lexical!$isRootOrShadowRoot}
   * for more information on which Elements comprise "roots".
   */
  getTopLevelElement() {
    let node = this;
    while (node !== null) {
      // Annotation breaks a circular inference through the loop (TS7022),
      // remove when the deprecated generic signatures from #8661 are removed
      const parent = node.getParent();
      // A slot value's host acts as a shadow root, so the slot boundary is
      // the top of the isolated scope and this node is its top-level element.
      if ($isRootOrShadowRoot(parent) || $getSlotHostKey(node) !== null) {
        if (!($isElementNode(node) || node === this && $isDecoratorNode(node))) {
          formatDevErrorMessage(`Children of root nodes must be elements or decorators`);
        }
        return node;
      }
      node = parent;
    }
    return null;
  }

  /**
   * Returns the highest (in the EditorState tree)
   * non-root ancestor of this node, or throws if none is found. See {@link lexical!$isRootOrShadowRoot}
   * for more information on which Elements comprise "roots".
   */
  getTopLevelElementOrThrow() {
    const parent = this.getTopLevelElement();
    if (parent === null) {
      {
        formatDevErrorMessage(`Expected node ${this.__key} to have a top parent element.`);
      }
    }
    return parent;
  }

  /**
   * Returns a list of the every ancestor of this node,
   * all the way up to the RootNode.
   *
   */
  getParents() {
    const parents = [];
    let node = this.getParent();
    while (node !== null) {
      parents.push(node);
      node = node.getParent();
    }
    return parents;
  }

  /**
   * Returns a list of the keys of every ancestor of this node,
   * all the way up to the RootNode.
   *
   */
  getParentKeys() {
    const parents = [];
    let node = this.getParent();
    while (node !== null) {
      parents.push(node.__key);
      node = node.getParent();
    }
    return parents;
  }

  /**
   * Returns the node before this one in the same parent, or null
   * if there is no such node.
   */

  /**
   * @deprecated The type parameter is an unchecked and unsafe cast,
   * equivalent to `node.getPreviousSibling() as T | null`, and will be
   * removed in a future release. Call this method without a type argument
   * and narrow the result with a type guard instead.
   */

  getPreviousSibling() {
    const self = this.getLatest();
    const prevKey = self.__prev;
    return prevKey === null ? null : $getNodeByKey(prevKey);
  }

  /**
   * Returns all nodes before this one in the same parent,
   * in document order.
   */

  /**
   * @deprecated The type parameter is an unchecked and unsafe cast,
   * equivalent to `node.getPreviousSiblings() as T[]`, and will be
   * removed in a future release. Call this method without a type argument
   * and narrow the results with a type guard instead.
   */

  getPreviousSiblings() {
    const siblings = [];
    const parent = this.getParent();
    if (parent === null) {
      return siblings;
    }
    let node = parent.getFirstChild();
    while (node !== null) {
      if (node.is(this)) {
        break;
      }
      siblings.push(node);
      node = node.getNextSibling();
    }
    return siblings;
  }

  /**
   * Returns the node after this one in the same parent, or null
   * if there is no such node.
   */

  /**
   * @deprecated The type parameter is an unchecked and unsafe cast,
   * equivalent to `node.getNextSibling() as T | null`, and will be
   * removed in a future release. Call this method without a type argument
   * and narrow the result with a type guard instead.
   */

  getNextSibling() {
    const self = this.getLatest();
    const nextKey = self.__next;
    return nextKey === null ? null : $getNodeByKey(nextKey);
  }

  /**
   * Returns all nodes after this one in the same parent,
   * in document order.
   */

  /**
   * @deprecated The type parameter is an unchecked and unsafe cast,
   * equivalent to `node.getNextSiblings() as T[]`, and will be
   * removed in a future release. Call this method without a type argument
   * and narrow the results with a type guard instead.
   */

  getNextSiblings() {
    const siblings = [];
    let node = this.getNextSibling();
    while (node !== null) {
      siblings.push(node);
      node = node.getNextSibling();
    }
    return siblings;
  }

  /**
   * @deprecated use {@link $getCommonAncestor}
   *
   * Returns the closest common ancestor of this node and the provided one or null
   * if one cannot be found.
   *
   * @param node - the other node to find the common ancestor of.
   */
  getCommonAncestor(node) {
    const a = $isElementNode(this) ? this : this.getParent();
    const b = $isElementNode(node) ? node : node.getParent();
    const result = a && b ? $getCommonAncestor(a, b) : null;
    return result ? result.commonAncestor /* TODO this type cast is a lie, but fixing it would break backwards compatibility */ : null;
  }

  /**
   * Returns true if the provided node is the exact same one as this node, from Lexical's perspective.
   * Always use this instead of referential equality.
   *
   * @param object - the node to perform the equality comparison on.
   */
  is(object) {
    if (object == null) {
      return false;
    }
    return this.__key === object.__key;
  }

  /**
   * Returns true if this node logically precedes the target node in the
   * editor state, false otherwise (including if there is no common ancestor).
   *
   * Note that this notion of isBefore is based on post-order; a descendant
   * node is always before its ancestors. See also
   * {@link $getCommonAncestor} and {@link $comparePointCaretNext} for
   * more flexible ways to determine the relative positions of nodes.
   *
   * @param targetNode - the node we're testing to see if it's after this one.
   */
  isBefore(targetNode) {
    const compare = $getCommonAncestor(this, targetNode);
    if (compare === null) {
      return false;
    }
    if (compare.type === 'descendant') {
      return true;
    }
    if (compare.type === 'branch') {
      return $getCommonAncestorResultBranchOrder(compare) === -1;
    }
    if (!(compare.type === 'same' || compare.type === 'ancestor')) {
      formatDevErrorMessage(`LexicalNode.isBefore: exhaustiveness check`);
    }
    return false;
  }

  /**
   * Returns true if this node is an ancestor of and distinct from the target node, false otherwise.
   *
   * @param targetNode - the would-be child node.
   */
  isParentOf(targetNode) {
    return $hasAncestor(targetNode, this);
  }

  // TO-DO: this function can be simplified a lot
  /**
   * Returns a list of nodes that are between this node and
   * the target node in the EditorState.
   *
   * @param targetNode - the node that marks the other end of the range of nodes to be returned.
   */
  getNodesBetween(targetNode) {
    const isBefore = this.isBefore(targetNode);
    const nodes = [];
    const visited = new Set();
    let node = this;
    while (true) {
      if (node === null) {
        break;
      }
      const key = node.__key;
      if (!visited.has(key)) {
        visited.add(key);
        nodes.push(node);
      }
      if (node === targetNode) {
        break;
      }
      const child = $isElementNode(node) ? isBefore ? node.getFirstChild() : node.getLastChild() : null;
      if (child !== null) {
        node = child;
        continue;
      }
      const nextSibling = isBefore ? node.getNextSibling() : node.getPreviousSibling();
      if (nextSibling !== null) {
        node = nextSibling;
        continue;
      }
      const parent = node.getParentOrThrow();
      if (!visited.has(parent.__key)) {
        nodes.push(parent);
      }
      if (parent === targetNode) {
        break;
      }
      let parentSibling = null;
      let ancestor = parent;
      do {
        if (ancestor === null) {
          {
            formatDevErrorMessage(`getNodesBetween: ancestor is null`);
          }
        }
        parentSibling = isBefore ? ancestor.getNextSibling() : ancestor.getPreviousSibling();
        ancestor = ancestor.getParent();
        if (ancestor !== null) {
          if (parentSibling === null && !visited.has(ancestor.__key)) {
            nodes.push(ancestor);
          }
        } else {
          break;
        }
      } while (parentSibling === null);
      node = parentSibling;
    }
    if (!isBefore) {
      nodes.reverse();
    }
    return nodes;
  }

  /**
   * Returns true if this node has been marked dirty during this update cycle.
   *
   */
  isDirty() {
    const editor = getActiveEditor();
    const dirtyLeaves = editor._dirtyLeaves;
    return dirtyLeaves !== null && dirtyLeaves.has(this.__key);
  }

  /**
   * Returns the latest version of the node from the active EditorState.
   * This is used to avoid getting values from stale node references.
   *
   */
  getLatest() {
    if ($isEphemeral(this)) {
      return this;
    }
    // Cast: the nodeMap entry for this key is always the same node class
    const latest = $getNodeByKey(this.__key);
    if (latest === null) {
      {
        formatDevErrorMessage(`Lexical node does not exist in active editor state. Avoid using the same node references between nested closures from editorState.read/editor.update.`);
      }
    }
    return latest;
  }

  /**
   * Returns a mutable version of the node using {@link $cloneWithProperties}
   * if necessary. Will throw an error if called outside of a Lexical Editor
   * {@link LexicalEditor.update} callback.
   *
   */
  getWritable() {
    if ($isEphemeral(this)) {
      return this;
    }
    errorOnReadOnly();
    const editorState = getActiveEditorState();
    const editor = getActiveEditor();
    const nodeMap = editorState._nodeMap;
    const key = this.__key;
    // Ensure we get the latest node from pending state
    const latestNode = this.getLatest();
    const cloneNotNeeded = editor._cloneNotNeeded;
    const selection = $getSelection();
    if (selection !== null) {
      selection.setCachedNodes(null);
    }
    if (cloneNotNeeded.has(key)) {
      // Transforms clear the dirty node set on each iteration to keep track on newly dirty nodes
      internalMarkNodeAsDirty(latestNode);
      return latestNode;
    }
    const mutableNode = $cloneWithProperties(latestNode);
    cloneNotNeeded.add(key);
    internalMarkNodeAsDirty(mutableNode);
    // Update reference in node map
    nodeMap.set(key, mutableNode);
    return mutableNode;
  }

  /**
   * Returns the text content of the node. Override this for
   * custom nodes that should have a representation in plain text
   * format (for copy + paste, for example)
   *
   */
  getTextContent() {
    return $getSlotsTextContent(this);
  }

  /**
   * Returns the length of the string produced by calling getTextContent on this node.
   *
   */
  getTextContentSize() {
    // Decorator slot hosts use this base impl: slot text is folded into
    // getTextContent, so .length is the size — counted by length, not by each
    // slot's own getTextContentSize (the ElementNode override sums those).
    return this.getTextContent().length;
  }

  // View

  /**
   * Called during the reconciliation process to determine which nodes
   * to insert into the DOM for this Lexical Node.
   *
   * This method must return exactly one HTMLElement. Nested elements are not supported.
   *
   * Do not attempt to update the Lexical EditorState during this phase of the update lifecycle.
   *
   * @param _config - allows access to things like the EditorTheme (to apply classes) during reconciliation.
   * @param _editor - allows access to the editor for context during reconciliation.
   *
   * */
  createDOM(_config, _editor) {
    {
      formatDevErrorMessage(`createDOM: base method not extended`);
    }
  }

  /**
   * Called when a node changes and should update the DOM
   * in whatever way is necessary to make it align with any changes that might
   * have happened during the update.
   *
   * Returning "true" here will cause lexical to unmount and recreate the DOM node
   * (by calling createDOM). You would need to do this if the element tag changes,
   * for instance.
   *
   * */
  updateDOM(_prevNode, _dom, _config) {
    {
      formatDevErrorMessage(`updateDOM: base method not extended`);
    }
  }

  /**
   * Returns a {@link DOMSlot} pointing at the content-bearing element of this
   * node's DOM. The default returns a slot wrapping the keyed DOM as-is.
   *
   * Override this when {@link createDOM} returns a wrapper around the
   * content-bearing element (e.g. `<span><br/></span>` for a styled line
   * break), so selection / reconciliation logic can target the inner element.
   *
   * {@link ElementNode} overrides this to return an {@link ElementDOMSlot}
   * with children-management semantics (used by the reconciler to place
   * managed children).
   *
   * @experimental
   */
  getDOMSlot(element) {
    return new DOMSlot(element);
  }

  /**
   * Controls how the this node is serialized to HTML. This is important for
   * copy and paste between Lexical and non-Lexical editors, or Lexical editors with different namespaces,
   * in which case the primary transfer format is HTML. It's also important if you're serializing
   * to HTML for any other reason via {@link @lexical/html!$generateHtmlFromNodes}. You could
   * also use this method to build your own HTML renderer.
   *
   * */
  exportDOM(editor) {
    const element = this.createDOM(editor._config, editor);
    return {
      element
    };
  }

  /**
   * Controls how the this node is serialized to JSON. This is important for
   * copy and paste between Lexical editors sharing the same namespace. It's also important
   * if you're serializing to JSON for persistent storage somewhere.
   * See [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html).
   *
   * */
  exportJSON() {
    const state = this.__state ? this.__state.toJSON() : undefined;
    return {
      type: this.__type,
      version: 1,
      ...state
    };
  }

  /**
   * Controls how the this node is deserialized from JSON. This is usually boilerplate,
   * but provides an abstraction between the node implementation and serialized interface that can
   * be important if you ever make breaking changes to a node schema (by adding or removing properties).
   * See [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html).
   *
   * */
  static importJSON(_serializedNode) {
    {
      formatDevErrorMessage(`LexicalNode: Node ${this.name} does not implement .importJSON().`);
    }
  }

  /**
   * Update this LexicalNode instance from serialized JSON. It's recommended
   * to implement as much logic as possible in this method instead of the
   * static importJSON method, so that the functionality can be inherited in subclasses.
   *
   * The LexicalUpdateJSON utility type should be used to ignore any type, version,
   * or children properties in the JSON so that the extended JSON from subclasses
   * are acceptable parameters for the super call.
   *
   * If overridden, this method must call super.
   *
   * @example
   * ```ts
   * class MyTextNode extends TextNode {
   *   // ...
   *   static importJSON(serializedNode: SerializedMyTextNode): MyTextNode {
   *     return $createMyTextNode()
   *       .updateFromJSON(serializedNode);
   *   }
   *   updateFromJSON(
   *     serializedNode: LexicalUpdateJSON<SerializedMyTextNode>,
   *   ): this {
   *     return super.updateFromJSON(serializedNode)
   *       .setMyProperty(serializedNode.myProperty);
   *   }
   * }
   * ```
   **/
  updateFromJSON(serializedNode) {
    return $updateStateFromJSON(this, serializedNode);
  }

  /**
   * @experimental
   *
   * Registers the returned function as a transform on the node during
   * Editor initialization. Most such use cases should be addressed via
   * the {@link LexicalEditor.registerNodeTransform} API.
   *
   * Experimental - use at your own risk.
   */
  static transform() {
    return null;
  }

  // Setters and mutators

  /**
   * Removes this LexicalNode from the EditorState. If the node isn't re-inserted
   * somewhere, the Lexical garbage collector will eventually clean it up.
   *
   * @param preserveEmptyParent - If falsy, the node's parent will be removed if
   * it's empty after the removal operation. This is the default behavior, subject to
   * other node heuristics such as {@link ElementNode#canBeEmpty}
   * */
  remove(preserveEmptyParent) {
    $removeNode(this, true, preserveEmptyParent);
  }

  /**
   * Replaces this LexicalNode with the provided node, optionally transferring the children
   * of the replaced node to the replacing node.
   *
   * @param replaceWith - The node to replace this one with.
   * @param includeChildren - Whether or not to transfer the children of this node to the replacing node.
   * */
  replace(replaceWith, includeChildren) {
    errorOnReadOnly();
    let selection = $getSelection();
    if (selection !== null) {
      selection = selection.clone();
    }
    errorOnInsertTextNodeOnRoot(this, replaceWith);
    const self = this.getLatest();
    const toReplaceKey = this.__key;
    const key = replaceWith.__key;
    const writableReplaceWith = replaceWith.getWritable();
    const writableParent = this.getParentOrThrow().getWritable();
    // Before any mutation: becoming a child of this node's parent must not
    // close a cycle through a slot up-link (reverse of $setSlot's guard).
    $errorOnSlotCycleChild(writableParent, writableReplaceWith);
    const size = writableParent.__size;
    // Capture replaceWith's old parent / index before removeFromParent so the
    // cloned selection's element offsets in that old parent can be adjusted
    // afterwards. See #6031.
    const replaceWithOldParent = writableReplaceWith.getParent();
    const replaceWithOldIndex = replaceWithOldParent !== null ? writableReplaceWith.getIndexWithinParent() : -1;
    $removeFromParent(writableReplaceWith);
    if (replaceWithOldParent !== null && $isRangeSelection(selection)) {
      $updateElementSelectionOnCreateDeleteNode(selection, replaceWithOldParent, replaceWithOldIndex, -1);
    }
    const prevSibling = self.getPreviousSibling();
    const nextSibling = self.getNextSibling();
    const prevKey = self.__prev;
    const nextKey = self.__next;
    const parentKey = self.__parent;
    $removeNode(self, false, true);
    if (prevSibling === null) {
      writableParent.__first = key;
    } else {
      const writablePrevSibling = prevSibling.getWritable();
      writablePrevSibling.__next = key;
    }
    writableReplaceWith.__prev = prevKey;
    if (nextSibling === null) {
      writableParent.__last = key;
    } else {
      const writableNextSibling = nextSibling.getWritable();
      writableNextSibling.__prev = key;
    }
    writableReplaceWith.__next = nextKey;
    writableReplaceWith.__parent = parentKey;
    writableParent.__size = size;
    // Snapshot replaceWith's children count before children transfer so
    // element-anchored selections on `this` can map to the equivalent offset
    // in writableReplaceWith.
    let prevSizeBeforeChildrenTransfer = 0;
    if (includeChildren) {
      if (!($isElementNode(this) && $isElementNode(writableReplaceWith))) {
        formatDevErrorMessage(`includeChildren should only be true for ElementNodes`);
      }
      prevSizeBeforeChildrenTransfer = writableReplaceWith.getChildrenSize();
      writableReplaceWith.splice(prevSizeBeforeChildrenTransfer, 0, this.getChildren());
    }
    // Slots live in a separate Map keyed off __slotHost, not the child list,
    // so the splice above (when includeChildren) never moves them — and
    // decorator hosts skip that branch entirely. Re-home each slot onto the
    // replacement regardless of includeChildren ($setSlot has move semantics;
    // the explicit $removeSlot keeps the doomed host's map consistent before
    // it is destroyed); otherwise they orphan and GC. Slot-less nodes have no
    // names, so this is a no-op.
    const slotNames = $getSlotNames(this);
    if (slotNames.length > 0) {
      if (!$isSlotHost(this) || !$isSlotHost(writableReplaceWith)) {
        {
          formatDevErrorMessage(`replace: node ${this.__key} has slots but ${writableReplaceWith.__key} cannot host them; only ElementNodes and DecoratorNodes can host slots.`);
        }
      }
      for (const slotName of slotNames) {
        const slot = $getSlot(this, slotName);
        if (slot !== null) {
          $removeSlot(this, slotName);
          $setSlot(writableReplaceWith, slotName, slot);
        }
      }
    }
    if ($isRangeSelection(selection)) {
      $setSelection(selection);
      const anchor = selection.anchor;
      const focus = selection.focus;
      // For an element-anchored point on `this` with includeChildren, the
      // transferred children land at offsets [prevSize ... prevSize + N) in
      // writableReplaceWith, so the equivalent point is at
      // `prevSize + originalOffset`. Without this remap the caller (e.g.
      // `$setBlocksType`) has to re-anchor afterwards from a stale clone.
      // For non-element points or !includeChildren the children are gone, so
      // fall back to the previous "move to end" behavior.
      if (anchor.key === toReplaceKey) {
        if (includeChildren && anchor.type === 'element') {
          anchor.set(writableReplaceWith.__key, prevSizeBeforeChildrenTransfer + anchor.offset, 'element');
        } else {
          $moveSelectionPointToEnd(anchor, writableReplaceWith);
        }
      }
      if (focus.key === toReplaceKey) {
        if (includeChildren && focus.type === 'element') {
          focus.set(writableReplaceWith.__key, prevSizeBeforeChildrenTransfer + focus.offset, 'element');
        } else {
          $moveSelectionPointToEnd(focus, writableReplaceWith);
        }
      }
    }
    if ($getCompositionKey() === toReplaceKey) {
      $setCompositionKey(key);
    }
    return writableReplaceWith;
  }

  /**
   * Inserts a node after this LexicalNode (as the next sibling).
   *
   * @param nodeToInsert - The node to insert after this one.
   * @param restoreSelection - Whether or not to attempt to resolve the
   * selection to the appropriate place after the operation is complete.
   * */
  insertAfter(nodeToInsert, restoreSelection = true) {
    errorOnReadOnly();
    errorOnInsertTextNodeOnRoot(this, nodeToInsert);
    const writableSelf = this.getWritable();
    const writableNodeToInsert = nodeToInsert.getWritable();
    // Before any mutation: becoming a sibling of this node must not close a
    // cycle through a slot up-link (reverse of $setSlot's guard).
    $errorOnSlotCycleChild(this.getParentOrThrow(), writableNodeToInsert);
    const oldParent = writableNodeToInsert.getParent();
    const selection = $getSelection();
    let elementAnchorSelectionOnNode = false;
    let elementFocusSelectionOnNode = false;
    if (oldParent !== null) {
      // TODO: this is O(n), can we improve?
      const oldIndex = nodeToInsert.getIndexWithinParent();
      if ($isRangeSelection(selection)) {
        const oldParentKey = oldParent.__key;
        const anchor = selection.anchor;
        const focus = selection.focus;
        elementAnchorSelectionOnNode = anchor.type === 'element' && anchor.key === oldParentKey && anchor.offset === oldIndex + 1;
        elementFocusSelectionOnNode = focus.type === 'element' && focus.key === oldParentKey && focus.offset === oldIndex + 1;
      }
      $removeFromParent(writableNodeToInsert);
      // Adjust element-anchored offsets in oldParent to track its reduced
      // child count. The boolean flags captured above
      // (elementAnchorSelectionOnNode / elementFocusSelectionOnNode) recorded
      // whether anchor/focus sat at oldIndex+1 before this removal; the
      // post-insertion block below uses them to re-anchor onto the moved
      // node in its new parent. See #6031.
      if (restoreSelection && $isRangeSelection(selection)) {
        $updateElementSelectionOnCreateDeleteNode(selection, oldParent, oldIndex, -1);
      }
    } else {
      $removeFromParent(writableNodeToInsert);
    }
    const nextSibling = this.getNextSibling();
    const writableParent = this.getParentOrThrow().getWritable();
    const insertKey = writableNodeToInsert.__key;
    const nextKey = writableSelf.__next;
    if (nextSibling === null) {
      writableParent.__last = insertKey;
    } else {
      const writableNextSibling = nextSibling.getWritable();
      writableNextSibling.__prev = insertKey;
    }
    writableParent.__size++;
    writableSelf.__next = insertKey;
    writableNodeToInsert.__next = nextKey;
    writableNodeToInsert.__prev = writableSelf.__key;
    writableNodeToInsert.__parent = writableSelf.__parent;
    if (restoreSelection && $isRangeSelection(selection)) {
      const index = this.getIndexWithinParent();
      $updateElementSelectionOnCreateDeleteNode(selection, writableParent, index + 1);
      const writableParentKey = writableParent.__key;
      if (elementAnchorSelectionOnNode) {
        selection.anchor.set(writableParentKey, index + 2, 'element');
      }
      if (elementFocusSelectionOnNode) {
        selection.focus.set(writableParentKey, index + 2, 'element');
      }
    }
    return nodeToInsert;
  }

  /**
   * Inserts a node before this LexicalNode (as the previous sibling).
   *
   * @param nodeToInsert - The node to insert before this one.
   * @param restoreSelection - Whether or not to attempt to resolve the
   * selection to the appropriate place after the operation is complete.
   * */
  insertBefore(nodeToInsert, restoreSelection = true) {
    errorOnReadOnly();
    errorOnInsertTextNodeOnRoot(this, nodeToInsert);
    const writableSelf = this.getWritable();
    const writableNodeToInsert = nodeToInsert.getWritable();
    // Before any mutation: becoming a sibling of this node must not close a
    // cycle through a slot up-link (reverse of $setSlot's guard).
    $errorOnSlotCycleChild(this.getParentOrThrow(), writableNodeToInsert);
    const insertKey = writableNodeToInsert.__key;
    const selection = $getSelection();
    // Capture nodeToInsert's old parent / index before detaching so the
    // selection's element offsets in that old parent can be adjusted
    // afterwards. See #6031.
    const insertOldParent = writableNodeToInsert.getParent();
    const insertOldIndex = insertOldParent !== null ? writableNodeToInsert.getIndexWithinParent() : -1;
    $removeFromParent(writableNodeToInsert);
    if (insertOldParent !== null && restoreSelection && $isRangeSelection(selection)) {
      $updateElementSelectionOnCreateDeleteNode(selection, insertOldParent, insertOldIndex, -1);
    }
    const prevSibling = this.getPreviousSibling();
    const writableParent = this.getParentOrThrow().getWritable();
    const prevKey = writableSelf.__prev;
    // TODO: this is O(n), can we improve?
    const index = this.getIndexWithinParent();
    if (prevSibling === null) {
      writableParent.__first = insertKey;
    } else {
      const writablePrevSibling = prevSibling.getWritable();
      writablePrevSibling.__next = insertKey;
    }
    writableParent.__size++;
    writableSelf.__prev = insertKey;
    writableNodeToInsert.__prev = prevKey;
    writableNodeToInsert.__next = writableSelf.__key;
    writableNodeToInsert.__parent = writableSelf.__parent;
    if (restoreSelection && $isRangeSelection(selection)) {
      const parent = this.getParentOrThrow();
      $updateElementSelectionOnCreateDeleteNode(selection, parent, index);
    }
    return nodeToInsert;
  }

  /**
   * Whether or not this node has a required parent. Used during copy + paste operations
   * to normalize nodes that would otherwise be orphaned. For example, ListItemNodes without
   * a ListNode parent or TextNodes with a ParagraphNode parent.
   *
   * */
  isParentRequired() {
    return false;
  }

  /**
   * The creation logic for any required parent. Should be implemented if {@link isParentRequired} returns true.
   *
   * */
  createParentElementNode() {
    return $createParagraphNode();
  }
  selectStart() {
    return this.selectPrevious();
  }
  selectEnd() {
    return this.selectNext(0, 0);
  }

  /**
   * Moves selection to the previous sibling of this node, at the specified offsets.
   *
   * @param anchorOffset - The anchor offset for selection.
   * @param focusOffset -  The focus offset for selection
   * */
  selectPrevious(anchorOffset, focusOffset) {
    errorOnReadOnly();
    // Slot value root has __parent === null, so the regular sibling walk
    // would throw via getParentOrThrow. Defer to the host so the cursor
    // moves past the slot-bearing host's previous sibling.
    const slotHost = $getSlotHost(this);
    if (slotHost !== null) {
      return slotHost.selectPrevious(anchorOffset, focusOffset);
    }
    const prevSibling = this.getPreviousSibling();
    const parent = this.getParentOrThrow();
    if (prevSibling === null) {
      return parent.select(0, 0);
    }
    if ($isElementNode(prevSibling)) {
      return prevSibling.select();
    } else if (!$isTextNode(prevSibling)) {
      const index = prevSibling.getIndexWithinParent() + 1;
      return parent.select(index, index);
    }
    return prevSibling.select(anchorOffset, focusOffset);
  }

  /**
   * Moves selection to the next sibling of this node, at the specified offsets.
   *
   * @param anchorOffset - The anchor offset for selection.
   * @param focusOffset -  The focus offset for selection
   * */
  selectNext(anchorOffset, focusOffset) {
    errorOnReadOnly();
    // Slot value root has __parent === null, so the regular sibling walk
    // would throw via getParentOrThrow. Defer to the host so the cursor
    // moves past the slot-bearing host's next sibling.
    const slotHost = $getSlotHost(this);
    if (slotHost !== null) {
      return slotHost.selectNext(anchorOffset, focusOffset);
    }
    const nextSibling = this.getNextSibling();
    const parent = this.getParentOrThrow();
    if (nextSibling === null) {
      return parent.select();
    }
    if ($isElementNode(nextSibling)) {
      return nextSibling.select(0, 0);
    } else if (!$isTextNode(nextSibling)) {
      const index = nextSibling.getIndexWithinParent();
      return parent.select(index, index);
    }
    return nextSibling.select(anchorOffset, focusOffset);
  }

  /**
   * Marks a node dirty, triggering transforms and
   * forcing it to be reconciled during the update cycle.
   *
   * */
  markDirty() {
    this.getWritable();
  }

  /**
   * @internal
   *
   * When the reconciler detects that a node was mutated, this method
   * may be called to restore the node to a known good state.
   */
  reconcileObservedMutation(dom, editor) {
    this.markDirty();
  }
}
function errorOnTypeKlassMismatch(type, klass) {
  const registeredNode = getRegisteredNode(getActiveEditor(), type);
  // Common error - split in its own invariant
  if (registeredNode === undefined) {
    {
      formatDevErrorMessage(`Create node: Attempted to create node ${klass.name} that was not configured to be used on the editor.`);
    }
  }
  const editorKlass = registeredNode.klass;
  if (editorKlass !== klass) {
    {
      formatDevErrorMessage(`Create node: Type ${type} in node ${klass.name} does not match registered node ${editorKlass.name} with the same type`);
    }
  }
}

/**
 * Insert a series of nodes after this LexicalNode (as next siblings)
 *
 * @param firstToInsert - The first node to insert after this one.
 * @param lastToInsert - The last node to insert after this one. Must be a
 * later sibling of FirstNode. If not provided, it will be its last sibling.
 */
function insertRangeAfter(node, firstToInsert, lastToInsert) {
  const lastToInsert2 = firstToInsert.getParentOrThrow().getLastChild();
  let current = firstToInsert;
  const nodesToInsert = [firstToInsert];
  while (current !== lastToInsert2) {
    if (!current.getNextSibling()) {
      {
        formatDevErrorMessage(`insertRangeAfter: lastToInsert must be a later sibling of firstToInsert`);
      }
    }
    current = current.getNextSibling();
    nodesToInsert.push(current);
  }
  let currentNode = node;
  for (const nodeToInsert of nodesToInsert) {
    currentNode = currentNode.insertAfter(nodeToInsert);
  }
}

/**
 * Returns true if the given value is a {@link LexicalNode} instance.
 */
function $isLexicalNode(node) {
  return node instanceof LexicalNode;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Common update tags used in Lexical. These tags can be used with editor.update() or $addUpdateTag()
 * to indicate the type/purpose of an update. Multiple tags can be used in a single update.
 */

/**
 * Indicates that the update is related to history operations (undo/redo)
 */
const HISTORIC_TAG = 'historic';

/**
 * Indicates that a new history entry should be pushed to the history stack
 */
const HISTORY_PUSH_TAG = 'history-push';

/**
 * Indicates that the current update should be merged with the previous history entry
 */
const HISTORY_MERGE_TAG = 'history-merge';

/**
 * Indicates that the update is related to a paste operation
 */
const PASTE_TAG = 'paste';

/**
 * Indicates that the update is related to a cut operation
 */
const CUT_TAG = 'cut';

/**
 * Indicates that the update is related to collaborative editing
 */
const COLLABORATION_TAG = 'collaboration';

/**
 * Indicates that the update should skip collaborative sync
 */
const SKIP_COLLAB_TAG = 'skip-collab';

/**
 * Indicates that the update should skip scrolling the selection into view
 */
const SKIP_SCROLL_INTO_VIEW_TAG = 'skip-scroll-into-view';

/**
 * Indicates that the update should skip updating the DOM selection
 * This is useful when you want to make updates without changing the selection or focus
 */
const SKIP_DOM_SELECTION_TAG = 'skip-dom-selection';

/**
 * Indicates that after changing the selection, the editor should not focus itself
 * This tag is ignored if {@link SKIP_DOM_SELECTION_TAG} is used
 */
const SKIP_SELECTION_FOCUS_TAG = 'skip-selection-focus';

/**
 * The update was triggered by editor.focus()
 */
const FOCUS_TAG = 'focus';

/**
 * The update was triggered by composition-start
 */
const COMPOSITION_START_TAG = 'composition-start';

/**
 * The update was triggered by composition-end
 */
const COMPOSITION_END_TAG = 'composition-end';

/**
 * The set of known update tags to help with TypeScript suggestions.
 */

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const IMPORTANT_FLAG = '!important';

/**
 * Parses inline CSS text into an object that is compatible with
 * `CSSStyleDeclaration.setProperty()`.
 *
 * Property names are expected to be kebab-case, such as `font-size`, and
 * values are expected to include explicit units where needed, such as `12px`.
 */
function getStyleObjectFromCSS(css) {
  const styles = {};
  if (!css) {
    return styles;
  }
  let currentProperty = '';
  let currentValue = '';
  let currentQuote = null;
  let inComment = false;
  let isEscaped = false;
  let isParsingValue = false;
  let parenthesisDepth = 0;
  const length = css.length;
  // Characters that belong to the current property/value (normal text, quotes,
  // escapes and parentheses) are accumulated as contiguous slices rather than
  // appended one-by-one, which avoids O(n) per-character string concatenation.
  // `chunkStart` marks the start of the pending run, or -1 when nothing is
  // pending. The run is flushed whenever a character is dropped (a comment) or
  // acts as a delimiter (`:` or `;`).
  let chunkStart = -1;
  for (let i = 0; i < length; i++) {
    const char = css[i];
    if (inComment) {
      if (char === '*' && css[i + 1] === '/') {
        inComment = false;
        i++;
      }
      continue;
    }
    if (isEscaped) {
      if (chunkStart === -1) {
        chunkStart = i;
      }
      isEscaped = false;
      continue;
    }
    if (currentQuote !== null) {
      if (chunkStart === -1) {
        chunkStart = i;
      }
      if (char === '\\') {
        isEscaped = true;
      } else if (char === currentQuote) {
        currentQuote = null;
      }
      continue;
    }
    if (char === '/' && css[i + 1] === '*') {
      // The comment is dropped, so flush everything accumulated before it.
      if (chunkStart !== -1) {
        if (isParsingValue) {
          currentValue += css.slice(chunkStart, i);
        } else {
          currentProperty += css.slice(chunkStart, i);
        }
        chunkStart = -1;
      }
      inComment = true;
      i++;
      continue;
    }
    if (char === '"' || char === "'") {
      if (chunkStart === -1) {
        chunkStart = i;
      }
      currentQuote = char;
      continue;
    }
    if (char === '(') {
      if (chunkStart === -1) {
        chunkStart = i;
      }
      parenthesisDepth++;
      continue;
    }
    if (char === ')') {
      if (chunkStart === -1) {
        chunkStart = i;
      }
      parenthesisDepth = Math.max(0, parenthesisDepth - 1);
      continue;
    }
    if (!isParsingValue && char === ':' && parenthesisDepth === 0) {
      // The separator is dropped; flush the accumulated property name.
      if (chunkStart !== -1) {
        currentProperty += css.slice(chunkStart, i);
        chunkStart = -1;
      }
      isParsingValue = true;
      continue;
    }
    if (char === ';' && parenthesisDepth === 0) {
      if (chunkStart !== -1) {
        if (isParsingValue) {
          currentValue += css.slice(chunkStart, i);
        } else {
          currentProperty += css.slice(chunkStart, i);
        }
        chunkStart = -1;
      }
      const property = currentProperty.trim();
      const value = currentValue.trim();
      if (property !== '' && value !== '') {
        styles[property] = value;
      }
      currentProperty = '';
      currentValue = '';
      isParsingValue = false;
      continue;
    }
    if (chunkStart === -1) {
      chunkStart = i;
    }
  }
  if (chunkStart !== -1) {
    if (isParsingValue) {
      currentValue += css.slice(chunkStart, length);
    } else {
      currentProperty += css.slice(chunkStart, length);
    }
  }
  const property = currentProperty.trim();
  const value = currentValue.trim();
  if (property !== '' && value !== '') {
    styles[property] = value;
  }
  return styles;
}
function setDOMStyleProperty(domStyle, property, value) {
  // Detect (and strip) a trailing `!important` flag using plain string
  // operations. A regexp such as `/\s*!important\s*$/i` runs in O(n^2) time on
  // whitespace-heavy values (the leading `\s*` backtracks from every starting
  // offset), whereas `trimEnd` + `slice` is linear.
  const trimmedValue = value.trimEnd();
  const flagStart = trimmedValue.length - IMPORTANT_FLAG.length;
  const hasImportant = flagStart >= 0 && trimmedValue.slice(flagStart).toLowerCase() === IMPORTANT_FLAG;
  if (hasImportant) {
    domStyle.setProperty(property, trimmedValue.slice(0, flagStart).trim(), 'important');
  } else {
    domStyle.setProperty(property, value, '');
  }
}

/**
 * Applies a style object to a DOM style declaration using
 * `CSSStyleDeclaration.setProperty()`.
 *
 * Property names are expected to be kebab-case, such as `font-size`, and
 * values are expected to include explicit units where needed, such as `12px`.
 */
function setDOMStyleObject(domStyle, styleObject) {
  for (const property in styleObject) {
    const value = styleObject[property];
    if (value == null) {
      domStyle.removeProperty(property);
    } else {
      setDOMStyleProperty(domStyle, property, value);
    }
  }
}

/**
 * Applies inline CSS text to a DOM style declaration using
 * `CSSStyleDeclaration.setProperty()`.
 *
 * Property names are expected to be kebab-case, such as `font-size`, and
 * values are expected to include explicit units where needed, such as `12px`.
 */
function setDOMStyleFromCSS(domStyle, cssText, prevCSSText = '') {
  if (cssText === prevCSSText) {
    return;
  }
  const prevCSS = getStyleObjectFromCSS(prevCSSText);
  const nextCSS = getStyleObjectFromCSS(cssText);
  for (const property in nextCSS) {
    delete prevCSS[property];
    setDOMStyleProperty(domStyle, property, nextCSS[property]);
  }
  for (const property in prevCSS) {
    domStyle.removeProperty(property);
  }
}

function getElementOuterTag(node, format) {
  if (format & IS_CODE) {
    return 'code';
  }
  if (format & IS_HIGHLIGHT) {
    return 'mark';
  }
  if (format & IS_SUBSCRIPT) {
    return 'sub';
  }
  if (format & IS_SUPERSCRIPT) {
    return 'sup';
  }
  return null;
}
function getElementInnerTag(node, format) {
  if (format & IS_BOLD) {
    return 'strong';
  }
  if (format & IS_ITALIC) {
    return 'em';
  }
  return 'span';
}
function setTextThemeClassNames(tag, prevFormat, nextFormat, dom, textClassNames) {
  const domClassList = dom.classList;
  // Firstly we handle the base theme.
  let classNames = getCachedClassNameArray(textClassNames, 'base');
  if (classNames !== undefined) {
    domClassList.add(...classNames);
  }
  // Secondly we handle the special case: underline + strikethrough.
  // We have to do this as we need a way to compose the fact that
  // the same CSS property will need to be used: text-decoration.
  // In an ideal world we shouldn't have to do this, but there's no
  // easy workaround for many atomic CSS systems today.
  classNames = getCachedClassNameArray(textClassNames, 'underlineStrikethrough');
  let hasUnderlineStrikethrough = false;
  const prevUnderlineStrikethrough = prevFormat & IS_UNDERLINE && prevFormat & IS_STRIKETHROUGH;
  const nextUnderlineStrikethrough = nextFormat & IS_UNDERLINE && nextFormat & IS_STRIKETHROUGH;
  if (classNames !== undefined) {
    if (nextUnderlineStrikethrough) {
      hasUnderlineStrikethrough = true;
      if (!prevUnderlineStrikethrough) {
        domClassList.add(...classNames);
      }
    } else if (prevUnderlineStrikethrough) {
      domClassList.remove(...classNames);
    }
  }
  for (const key in TEXT_TYPE_TO_FORMAT) {
    const format = key;
    const flag = TEXT_TYPE_TO_FORMAT[format];
    classNames = getCachedClassNameArray(textClassNames, key);
    if (classNames !== undefined) {
      if (nextFormat & flag) {
        if (hasUnderlineStrikethrough && (key === 'underline' || key === 'strikethrough')) {
          if (prevFormat & flag) {
            domClassList.remove(...classNames);
          }
          continue;
        }
        if ((prevFormat & flag) === 0 || prevUnderlineStrikethrough && key === 'underline' || key === 'strikethrough') {
          domClassList.add(...classNames);
        }
      } else if (prevFormat & flag) {
        domClassList.remove(...classNames);
      }
    }
  }
}
function diffComposedText(a, b) {
  const aLength = a.length;
  const bLength = b.length;
  let left = 0;
  let right = 0;
  while (left < aLength && left < bLength && a[left] === b[left]) {
    left++;
  }
  while (right + left < aLength && right + left < bLength && a[aLength - right - 1] === b[bLength - right - 1]) {
    right++;
  }
  return [left, aLength - left - right, b.slice(left, bLength - right)];
}
function $setTextContent(nextText, dom, node) {
  const isComposing = node.isComposing();
  // Always add a suffix if we're composing a node
  const suffix = isComposing ? COMPOSITION_SUFFIX : '';
  const text = nextText + suffix;

  // Route through the editor-level `$getDOMSlot` hook so that
  // `DOMRenderExtension` overrides targeting TextNode (e.g. extensions
  // injecting `contentEditable=false` siblings around the text) can
  // intercept. The default impl delegates to `node.getDOMSlot(dom)`.
  //
  // Practical contract for extensions that append non-lexical siblings to a
  // vanilla TextNode's DOM (e.g. an autocomplete ghost rendered into the
  // same `<span>`): append-only is safe because the default
  // `DOMSlot.getFirstChild()` returns the first DOM child (the text node)
  // and `insertChild` puts new content before `slot.before` (defaulting to
  // append). Prepending a sibling, or wrapping the text node, requires
  // either a TextNode subclass with its own `getDOMSlot` override, an
  // extension that returns a slot with a managed `slot.before` / `slot.after`
  // boundary, or both.
  const editor = $getEditor();
  const slot = $getEditorDOMRenderConfig(editor).$getDOMSlot(node, dom, editor);
  const firstChild = slot.getFirstChild();
  if (firstChild === null || firstChild.nodeType !== Node.TEXT_NODE) {
    slot.insertChild($getDocument().createTextNode(text));
    return;
  }
  const textChild = firstChild;
  const nodeValue = textChild.nodeValue;
  if (nodeValue === text) {
    return;
  }
  if (isComposing || IS_FIREFOX) {
    // We also use the diff composed text for general text in FF to avoid
    // the spellcheck red line from flickering.
    const [index, remove, insert] = diffComposedText(nodeValue, text);
    if (remove !== 0) {
      textChild.deleteData(index, remove);
    }
    textChild.insertData(index, insert);
  } else {
    textChild.nodeValue = text;
  }
}
function $createTextInnerDOM(innerDOM, node, innerTag, format, text, config) {
  $setTextContent(text, innerDOM, node);
  const theme = config.theme;
  // Apply theme class names
  const textClassNames = theme.text;
  if (textClassNames !== undefined) {
    setTextThemeClassNames(innerTag, 0, format, innerDOM, textClassNames);
  }
}
function $wrapElementWith(element, tag) {
  const el = $getDocument().createElement(tag);
  el.appendChild(element);
  return el;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging

function $isInlineFormattable(node) {
  return node != null && node.__isInlineFormattable === true;
}

/** @noInheritDoc */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class TextNode extends LexicalNode {
  /** @internal */

  __text;
  /** @internal */
  __format;
  /** @internal */
  __style;
  /** @internal */
  __mode;
  /** @internal */
  __detail;

  /** @internal */
  get __isInlineFormattable() {
    return true;
  }
  $config() {
    return this.config('text', {
      importDOM: {
        '#text': () => ({
          conversion: $convertTextDOMNode,
          priority: 0
        }),
        b: () => ({
          conversion: convertBringAttentionToElement,
          priority: 0
        }),
        code: () => ({
          conversion: convertTextFormatElement,
          priority: 0
        }),
        em: () => ({
          conversion: convertTextFormatElement,
          priority: 0
        }),
        i: () => ({
          conversion: convertTextFormatElement,
          priority: 0
        }),
        mark: () => ({
          conversion: convertTextFormatElement,
          priority: 0
        }),
        s: () => ({
          conversion: convertTextFormatElement,
          priority: 0
        }),
        span: () => ({
          conversion: convertSpanElement,
          priority: 0
        }),
        strong: () => ({
          conversion: convertTextFormatElement,
          priority: 0
        }),
        sub: () => ({
          conversion: convertTextFormatElement,
          priority: 0
        }),
        sup: () => ({
          conversion: convertTextFormatElement,
          priority: 0
        }),
        u: () => ({
          conversion: convertTextFormatElement,
          priority: 0
        })
      }
    });
  }
  afterCloneFrom(prevNode) {
    super.afterCloneFrom(prevNode);
    this.__text = prevNode.__text;
    this.__format = prevNode.__format;
    this.__style = prevNode.__style;
    this.__mode = prevNode.__mode;
    this.__detail = prevNode.__detail;
  }
  constructor(text = '', key) {
    super(key);
    this.__text = text;
    this.__format = 0;
    this.__style = '';
    this.__mode = 0;
    this.__detail = 0;
  }

  /**
   * Returns a 32-bit integer that represents the TextFormatTypes currently applied to the
   * TextNode. You probably don't want to use this method directly - consider using TextNode.hasFormat instead.
   *
   * @returns a number representing the format of the text node.
   */
  getFormat() {
    const self = this.getLatest();
    return self.__format;
  }

  /**
   * Returns a 32-bit integer that represents the TextDetailTypes currently applied to the
   * TextNode. You probably don't want to use this method directly - consider using TextNode.isDirectionless
   * or TextNode.isUnmergeable instead.
   *
   * @returns a number representing the detail of the text node.
   */
  getDetail() {
    const self = this.getLatest();
    return self.__detail;
  }

  /**
   * Returns the mode (TextModeType) of the TextNode, which may be "normal", "token", or "segmented"
   *
   * @returns TextModeType.
   */
  getMode() {
    const self = this.getLatest();
    return TEXT_TYPE_TO_MODE[self.__mode];
  }

  /**
   * Returns the styles currently applied to the node. This is analogous to CSSText in the DOM.
   *
   * @returns CSSText-like string of styles applied to the underlying DOM node.
   */
  getStyle() {
    const self = this.getLatest();
    return self.__style;
  }

  /**
   * Returns whether or not the node is in "token" mode. TextNodes in token mode can be navigated through character-by-character
   * with a RangeSelection, but are deleted as a single entity (not individually by character).
   *
   * @returns true if the node is in token mode, false otherwise.
   */
  isToken() {
    const self = this.getLatest();
    return self.__mode === IS_TOKEN;
  }

  /**
   *
   * @returns true if Lexical detects that an IME or other 3rd-party script is attempting to
   * mutate the TextNode, false otherwise.
   */
  isComposing() {
    return this.__key === $getCompositionKey();
  }

  /**
   * Returns whether or not the node is in "segmented" mode. TextNodes in segmented mode can be navigated through character-by-character
   * with a RangeSelection, but are deleted in space-delimited "segments".
   *
   * @returns true if the node is in segmented mode, false otherwise.
   */
  isSegmented() {
    const self = this.getLatest();
    return self.__mode === IS_SEGMENTED;
  }
  /**
   * Returns whether or not the node is "directionless". Directionless nodes don't respect changes between RTL and LTR modes.
   *
   * @returns true if the node is directionless, false otherwise.
   */
  isDirectionless() {
    const self = this.getLatest();
    return (self.__detail & IS_DIRECTIONLESS) !== 0;
  }
  /**
   * Returns whether or not the node is unmergeable. In some scenarios, Lexical tries to merge
   * adjacent TextNodes into a single TextNode. If a TextNode is unmergeable, this won't happen.
   *
   * @returns true if the node is unmergeable, false otherwise.
   */
  isUnmergeable() {
    const self = this.getLatest();
    return (self.__detail & IS_UNMERGEABLE) !== 0;
  }

  /**
   * Returns whether or not the node has the provided format applied. Use this with the human-readable TextFormatType
   * string values to get the format of a TextNode.
   *
   * @param type - the TextFormatType to check for.
   *
   * @returns true if the node has the provided format, false otherwise.
   */
  hasFormat(type) {
    const formatFlag = TEXT_TYPE_TO_FORMAT[type];
    return (this.getFormat() & formatFlag) !== 0;
  }

  /**
   * Returns whether or not the node is simple text. Simple text is defined as a TextNode that has the string type "text"
   * (i.e., not a subclass) and has no mode applied to it (i.e., not segmented or token).
   *
   * @returns true if the node is simple text, false otherwise.
   */
  isSimpleText() {
    return this.__type === 'text' && this.__mode === 0;
  }

  /**
   * Returns the text content of the node as a string.
   *
   * @returns a string representing the text content of the node.
   */
  getTextContent() {
    const self = this.getLatest();
    return self.__text;
  }

  /**
   * Returns the format flags applied to the node as a 32-bit integer.
   *
   * @returns a number representing the TextFormatTypes applied to the node.
   */
  getFormatFlags(type, alignWithFormat) {
    const self = this.getLatest();
    const format = self.__format;
    return toggleTextFormatType(format, type, alignWithFormat);
  }

  /**
   *
   * @returns true if the text node supports font styling, false otherwise.
   */
  canHaveFormat() {
    return true;
  }

  /**
   * @returns true if the text node is inline, false otherwise.
   */
  isInline() {
    return true;
  }

  // View

  createDOM(config, editor) {
    const format = this.__format;
    const outerTag = getElementOuterTag(this, format);
    const innerTag = getElementInnerTag(this, format);
    const tag = outerTag === null ? innerTag : outerTag;
    const dom = $getDocument().createElement(tag);
    let innerDOM = dom;
    if (this.hasFormat('code')) {
      dom.setAttribute('spellcheck', 'false');
    }
    if (outerTag !== null) {
      innerDOM = $getDocument().createElement(innerTag);
      dom.appendChild(innerDOM);
    }
    const text = this.__text;
    $createTextInnerDOM(innerDOM, this, innerTag, format, text, config);
    const style = this.__style;
    if (style !== '') {
      setDOMStyleFromCSS(dom.style, style);
    }
    return dom;
  }
  updateDOM(prevNode, dom, config) {
    const nextText = this.__text;
    const prevFormat = prevNode.__format;
    const nextFormat = this.__format;
    const prevOuterTag = getElementOuterTag(this, prevFormat);
    const nextOuterTag = getElementOuterTag(this, nextFormat);
    const prevInnerTag = getElementInnerTag(this, prevFormat);
    const nextInnerTag = getElementInnerTag(this, nextFormat);
    const prevTag = prevOuterTag === null ? prevInnerTag : prevOuterTag;
    const nextTag = nextOuterTag === null ? nextInnerTag : nextOuterTag;
    if (prevTag !== nextTag) {
      return true;
    }
    if (prevOuterTag === nextOuterTag && prevInnerTag !== nextInnerTag) {
      // should always be an element
      const prevInnerDOM = dom.firstChild;
      if (prevInnerDOM == null) {
        {
          formatDevErrorMessage(`updateDOM: prevInnerDOM is null or undefined`);
        }
      }
      const nextInnerDOM = $getDocument().createElement(nextInnerTag);
      $createTextInnerDOM(nextInnerDOM, this, nextInnerTag, nextFormat, nextText, config);
      dom.replaceChild(nextInnerDOM, prevInnerDOM);
      return false;
    }
    let innerDOM = dom;
    if (nextOuterTag !== null) {
      if (prevOuterTag !== null) {
        innerDOM = dom.firstChild;
        if (innerDOM == null) {
          {
            formatDevErrorMessage(`updateDOM: innerDOM is null or undefined`);
          }
        }
      }
    }
    $setTextContent(nextText, innerDOM, this);
    const theme = config.theme;
    // Apply theme class names
    const textClassNames = theme.text;
    if (textClassNames !== undefined && prevFormat !== nextFormat) {
      setTextThemeClassNames(nextInnerTag, prevFormat, nextFormat, innerDOM, textClassNames);
    }
    const prevStyle = prevNode.__style;
    const nextStyle = this.__style;
    if (prevStyle !== nextStyle) {
      setDOMStyleFromCSS(dom.style, nextStyle, prevStyle);
    }
    return false;
  }
  updateFromJSON(serializedNode) {
    return super.updateFromJSON(serializedNode).setTextContent(serializedNode.text).setFormat(serializedNode.format).setDetail(serializedNode.detail).setMode(serializedNode.mode).setStyle(serializedNode.style);
  }

  // This improves Lexical's basic text output in copy+paste plus
  // for headless mode where people might use Lexical to generate
  // HTML content and not have the ability to use CSS classes.
  exportDOM(editor) {
    let {
      element
    } = super.exportDOM(editor);
    if (!isHTMLElement(element)) {
      formatDevErrorMessage(`Expected TextNode createDOM to always return a HTMLElement`);
    }
    element.style.whiteSpace = 'pre-wrap';

    // Add text-transform styles for capitalization formats
    if (this.hasFormat('lowercase')) {
      element.style.textTransform = 'lowercase';
    } else if (this.hasFormat('uppercase')) {
      element.style.textTransform = 'uppercase';
    } else if (this.hasFormat('capitalize')) {
      element.style.textTransform = 'capitalize';
    }

    // This is the only way to properly add support for most clients,
    // even if it's semantically incorrect to have to resort to using
    // <b>, <u>, <s>, <i> elements.
    if (this.hasFormat('bold')) {
      element = $wrapElementWith(element, 'b');
    }
    if (this.hasFormat('italic')) {
      element = $wrapElementWith(element, 'i');
    }
    if (this.hasFormat('strikethrough')) {
      element = $wrapElementWith(element, 's');
    }
    if (this.hasFormat('underline')) {
      element = $wrapElementWith(element, 'u');
    }
    return {
      element
    };
  }
  exportJSON() {
    return {
      detail: this.getDetail(),
      format: this.getFormat(),
      mode: this.getMode(),
      style: this.getStyle(),
      text: this.getTextContent(),
      // As an exception here we invoke super at the end for historical reasons.
      // Namely, to preserve the order of the properties and not to break the tests
      // that use the serialized string representation.
      ...super.exportJSON()
    };
  }

  // Mutators
  selectionTransform(prevSelection, nextSelection) {
    return;
  }

  /**
   * Sets the node format to the provided TextFormatType or 32-bit integer. Note that the TextFormatType
   * version of the argument can only specify one format and doing so will remove all other formats that
   * may be applied to the node. For toggling behavior, consider using {@link TextNode.toggleFormat}
   *
   * @param format - TextFormatType or 32-bit integer representing the node format.
   *
   * @returns this TextNode.
   * // TODO 0.12 This should just be a `string`.
   */
  setFormat(format) {
    const self = this.getWritable();
    self.__format = typeof format === 'string' ? TEXT_TYPE_TO_FORMAT[format] : format;
    return self;
  }

  /**
   * Sets the node detail to the provided TextDetailType or 32-bit integer. Note that the TextDetailType
   * version of the argument can only specify one detail value and doing so will remove all other detail values that
   * may be applied to the node. For toggling behavior, consider using {@link TextNode.toggleDirectionless}
   * or {@link TextNode.toggleUnmergeable}
   *
   * @param detail - TextDetailType or 32-bit integer representing the node detail.
   *
   * @returns this TextNode.
   * // TODO 0.12 This should just be a `string`.
   */
  setDetail(detail) {
    const self = this.getWritable();
    self.__detail = typeof detail === 'string' ? DETAIL_TYPE_TO_DETAIL[detail] : detail;
    return self;
  }

  /**
   * Sets the node style to the provided CSSText-like string. Set this property as you
   * would an HTMLElement style attribute to apply inline styles to the underlying DOM Element.
   *
   * @param style - CSSText to be applied to the underlying HTMLElement.
   *
   * @returns this TextNode.
   */
  setStyle(style) {
    const self = this.getWritable();
    self.__style = style;
    return self;
  }

  /**
   * Applies the provided format to this TextNode if it's not present. Removes it if it's present.
   * The subscript and superscript formats are mutually exclusive.
   * Prefer using this method to turn specific formats on and off.
   *
   * @param type - TextFormatType to toggle.
   *
   * @returns this TextNode.
   */
  toggleFormat(type) {
    const format = this.getFormat();
    const newFormat = toggleTextFormatType(format, type, null);
    return this.setFormat(newFormat);
  }

  /**
   * Toggles the directionless detail value of the node. Prefer using this method over setDetail.
   *
   * @returns this TextNode.
   */
  toggleDirectionless() {
    const self = this.getWritable();
    self.__detail ^= IS_DIRECTIONLESS;
    return self;
  }

  /**
   * Toggles the unmergeable detail value of the node. Prefer using this method over setDetail.
   *
   * @returns this TextNode.
   */
  toggleUnmergeable() {
    const self = this.getWritable();
    self.__detail ^= IS_UNMERGEABLE;
    return self;
  }

  /**
   * Sets the mode of the node.
   *
   * Note: during IME composition, a segmented TextNode may be temporarily
   * switched to normal mode to preserve the DOM element that the browser's
   * composition tracker is bound to. Subclass transforms or method overrides
   * that assume the node is always in segmented mode should account for this
   * transient state.
   *
   * @returns this TextNode.
   */
  setMode(type) {
    const mode = TEXT_MODE_TO_TYPE[type];
    if (this.__mode === mode) {
      return this;
    }
    const self = this.getWritable();
    self.__mode = mode;
    return self;
  }

  /**
   * Sets the text content of the node.
   *
   * @param text - the string to set as the text value of the node.
   *
   * @returns this TextNode.
   */
  setTextContent(text) {
    if (this.__text === text) {
      return this;
    }
    const self = this.getWritable();
    self.__text = text;
    return self;
  }

  /**
   * Sets the current Lexical selection to be a RangeSelection with anchor and focus on this TextNode at the provided offsets.
   *
   * @param _anchorOffset - the offset at which the Selection anchor will be placed.
   * @param _focusOffset - the offset at which the Selection focus will be placed.
   *
   * @returns the new RangeSelection.
   */
  select(_anchorOffset, _focusOffset) {
    errorOnReadOnly();
    let anchorOffset = _anchorOffset;
    let focusOffset = _focusOffset;
    const selection = $getSelection();
    const text = this.getTextContent();
    const key = this.__key;
    if (typeof text === 'string') {
      const lastOffset = text.length;
      if (anchorOffset === undefined) {
        anchorOffset = lastOffset;
      }
      if (focusOffset === undefined) {
        focusOffset = lastOffset;
      }
    } else {
      anchorOffset = 0;
      focusOffset = 0;
    }
    if (!$isRangeSelection(selection)) {
      return $internalMakeRangeSelection(key, anchorOffset, key, focusOffset, 'text', 'text');
    } else {
      const compositionKey = $getCompositionKey();
      if (compositionKey === selection.anchor.key || compositionKey === selection.focus.key) {
        $setCompositionKey(key);
      }
      selection.setTextNodeRange(this, anchorOffset, this, focusOffset);
    }
    return selection;
  }
  selectStart() {
    return this.select(0, 0);
  }
  selectEnd() {
    const size = this.getTextContentSize();
    return this.select(size, size);
  }

  /**
   * Inserts the provided text into this TextNode at the provided offset, deleting the number of characters
   * specified. Can optionally calculate a new selection after the operation is complete.
   *
   * @param offset - the offset at which the splice operation should begin.
   * @param delCount - the number of characters to delete, starting from the offset.
   * @param newText - the text to insert into the TextNode at the offset.
   * @param moveSelection - optional, whether or not to move selection to the end of the inserted substring.
   *
   * @returns this TextNode.
   */
  spliceText(offset, delCount, newText, moveSelection) {
    const writableSelf = this.getWritable();
    const text = writableSelf.__text;
    const handledTextLength = newText.length;
    let index = offset;
    if (index < 0) {
      index = handledTextLength + index;
      if (index < 0) {
        index = 0;
      }
    }
    const selection = $getSelection();
    if (moveSelection && $isRangeSelection(selection)) {
      const newOffset = offset + handledTextLength;
      selection.setTextNodeRange(writableSelf, newOffset, writableSelf, newOffset);
    }
    const updatedText = text.slice(0, index) + newText + text.slice(index + delCount);
    writableSelf.__text = updatedText;
    return writableSelf;
  }

  /**
   * This method is meant to be overridden by TextNode subclasses to control the behavior of those nodes
   * when a user event would cause text to be inserted before them in the editor. If true, Lexical will attempt
   * to insert text into this node. If false, it will insert the text in a new sibling node.
   *
   * @returns true if text can be inserted before the node, false otherwise.
   */
  canInsertTextBefore() {
    return true;
  }

  /**
   * This method is meant to be overridden by TextNode subclasses to control the behavior of those nodes
   * when a user event would cause text to be inserted after them in the editor. If true, Lexical will attempt
   * to insert text into this node. If false, it will insert the text in a new sibling node.
   *
   * @returns true if text can be inserted after the node, false otherwise.
   */
  canInsertTextAfter() {
    return true;
  }

  /**
   * Splits this TextNode at the provided character offsets, forming new TextNodes from the substrings
   * formed by the split, and inserting those new TextNodes into the editor, replacing the one that was split.
   *
   * @param splitOffsets - rest param of the text content character offsets at which this node should be split.
   *
   * @returns an Array containing the newly-created TextNodes.
   */
  splitText(...splitOffsets) {
    errorOnReadOnly();
    const self = this.getLatest();
    const textContent = self.getTextContent();
    if (textContent === '') {
      return [];
    }
    const key = self.__key;
    const compositionKey = $getCompositionKey();
    const textLength = textContent.length;
    splitOffsets.sort((a, b) => a - b);
    splitOffsets.push(textLength);
    const parts = [];
    const splitOffsetsLength = splitOffsets.length;
    for (let start = 0, offsetIndex = 0; start < textLength && offsetIndex <= splitOffsetsLength; offsetIndex++) {
      const end = splitOffsets[offsetIndex];
      if (end > start) {
        parts.push(textContent.slice(start, end));
        start = end;
      }
    }
    const partsLength = parts.length;
    if (partsLength === 1) {
      return [self];
    }
    const firstPart = parts[0];
    const parent = self.getParent();
    let writableNode;
    const format = self.getFormat();
    const style = self.getStyle();
    const detail = self.__detail;
    let hasReplacedSelf = false;

    // Prepare to handle selection
    let startTextPoint = null;
    let endTextPoint = null;
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const [startPoint, endPoint] = selection.isBackward() ? [selection.focus, selection.anchor] : [selection.anchor, selection.focus];
      if (startPoint.type === 'text' && startPoint.key === key) {
        startTextPoint = startPoint;
      }
      if (endPoint.type === 'text' && endPoint.key === key) {
        endTextPoint = endPoint;
      }
    }
    if (self.isSegmented()) {
      // Create a new TextNode
      writableNode = $createTextNode(firstPart);
      writableNode.__format = format;
      writableNode.__style = style;
      writableNode.__detail = detail;
      writableNode.__state = $cloneNodeState(self, writableNode);
      hasReplacedSelf = true;
    } else {
      // For the first part, update the existing node
      writableNode = self.setTextContent(firstPart);
    }

    // Then handle all other parts
    const splitNodes = [writableNode];
    for (let i = 1; i < partsLength; i++) {
      const part = parts[i];
      const sibling = $createTextNode(part);
      sibling.__format = format;
      sibling.__style = style;
      sibling.__detail = detail;
      sibling.__state = $cloneNodeState(self, sibling);
      const siblingKey = sibling.__key;
      if (compositionKey === key) {
        $setCompositionKey(siblingKey);
      }
      splitNodes.push(sibling);
    }

    // Move the selection to the best location in the split string.
    // The end point is always left-biased, and the start point is
    // generally left biased unless the end point would land on a
    // later node in the split in which case it will prefer the start
    // of that node so they will tend to be on the same node.
    const originalStartOffset = startTextPoint ? startTextPoint.offset : null;
    const originalEndOffset = endTextPoint ? endTextPoint.offset : null;
    let startOffset = 0;
    for (const node of splitNodes) {
      if (!(startTextPoint || endTextPoint)) {
        break;
      }
      const endOffset = startOffset + node.getTextContentSize();
      if (startTextPoint !== null && originalStartOffset !== null && originalStartOffset <= endOffset && originalStartOffset >= startOffset) {
        // Set the start point to the first valid node
        startTextPoint.set(node.getKey(), originalStartOffset - startOffset, 'text');
        if (originalStartOffset < endOffset) {
          // The start isn't on a border so we can stop checking
          startTextPoint = null;
        }
      }
      if (endTextPoint !== null && originalEndOffset !== null && originalEndOffset <= endOffset && originalEndOffset >= startOffset) {
        endTextPoint.set(node.getKey(), originalEndOffset - startOffset, 'text');
        break;
      }
      startOffset = endOffset;
    }

    // Insert the nodes into the parent's children
    if (parent !== null) {
      internalMarkSiblingsAsDirty(this);
      const writableParent = parent.getWritable();
      const insertionIndex = this.getIndexWithinParent();
      if (hasReplacedSelf) {
        writableParent.splice(insertionIndex, 0, splitNodes);
        this.remove();
      } else {
        writableParent.splice(insertionIndex, 1, splitNodes);
      }
      if ($isRangeSelection(selection)) {
        $updateElementSelectionOnCreateDeleteNode(selection, parent, insertionIndex, partsLength - 1);
      }
    }
    return splitNodes;
  }

  /**
   * Merges the target TextNode into this TextNode, removing the target node.
   *
   * @param target - the TextNode to merge into this one.
   *
   * @returns this TextNode.
   */
  mergeWithSibling(target) {
    const isBefore = target === this.getPreviousSibling();
    if (!isBefore && target !== this.getNextSibling()) {
      {
        formatDevErrorMessage(`mergeWithSibling: sibling must be a previous or next sibling`);
      }
    }
    const key = this.__key;
    const targetKey = target.__key;
    const text = this.__text;
    const textLength = text.length;
    const compositionKey = $getCompositionKey();
    if (compositionKey === targetKey) {
      $setCompositionKey(key);
    }
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const anchor = selection.anchor;
      const focus = selection.focus;
      if (anchor !== null && anchor.key === targetKey) {
        adjustPointOffsetForMergedSibling(anchor, isBefore, key, target, textLength);
      }
      if (focus !== null && focus.key === targetKey) {
        adjustPointOffsetForMergedSibling(focus, isBefore, key, target, textLength);
      }
    }
    const targetText = target.__text;
    const newText = isBefore ? targetText + text : text + targetText;
    this.setTextContent(newText);
    const writableSelf = this.getWritable();
    target.remove();
    return writableSelf;
  }

  /**
   * This method is meant to be overridden by TextNode subclasses to control the behavior of those nodes
   * when used with the registerLexicalTextEntity function. If you're using registerLexicalTextEntity, the
   * node class that you create and replace matched text with should return true from this method.
   *
   * @returns true if the node is to be treated as a "text entity", false otherwise.
   */
  isTextEntity() {
    return false;
  }
}
function convertSpanElement(domNode) {
  // domNode is a <span> since we matched it by nodeName
  const span = domNode;
  const style = span.style;
  return {
    forChild: applyTextFormatFromStyle(style),
    node: null
  };
}
function convertBringAttentionToElement(domNode) {
  // domNode is a <b> since we matched it by nodeName
  const b = domNode;
  // Google Docs wraps all copied HTML in a <b> with font-weight normal
  const hasNormalFontWeight = b.style.fontWeight === 'normal';
  return {
    forChild: applyTextFormatFromStyle(b.style, hasNormalFontWeight ? undefined : 'bold'),
    node: null
  };
}
const preParentCache = new WeakMap();
function isNodePre(node) {
  if (!isHTMLElement(node)) {
    return false;
  } else if (node.nodeName === 'PRE') {
    return true;
  }
  const whiteSpace = node.style.whiteSpace;
  return typeof whiteSpace === 'string' && whiteSpace.startsWith('pre');
}
function findParentPreDOMNode(node) {
  let cached;
  let parent = node.parentNode;
  const visited = [node];
  while (parent !== null && (cached = preParentCache.get(parent)) === undefined && !isNodePre(parent)) {
    visited.push(parent);
    parent = parent.parentNode;
  }
  const resultNode = cached === undefined ? parent : cached;
  for (let i = 0; i < visited.length; i++) {
    preParentCache.set(visited[i], resultNode);
  }
  return resultNode;
}
function $convertTextDOMNode(domNode) {
  const domNode_ = domNode;
  const parentDom = domNode.parentElement;
  if (!(parentDom !== null)) {
    formatDevErrorMessage(`Expected parentElement of Text not to be null`);
  }
  let textContent = domNode_.textContent || '';
  // No collapse and preserve segment break for pre, pre-wrap and pre-line
  if (findParentPreDOMNode(domNode_) !== null) {
    return {
      node: $generateNodesFromRawText(textContent)
    };
  }
  textContent = textContent.replace(/\r/g, '').replace(/[ \t\n]+/g, ' ');
  if (textContent === '') {
    return {
      node: null
    };
  }
  if (textContent[0] === ' ') {
    // Traverse backward while in the same line. If content contains new line or tab -> potential
    // delete, other elements can borrow from this one. Deletion depends on whether it's also the
    // last space (see next condition: textContent[textContent.length - 1] === ' '))
    let previousText = domNode_;
    let isStartOfLine = true;
    while (previousText !== null && (previousText = findTextInLine(previousText, false)) !== null) {
      const previousTextContent = previousText.textContent || '';
      if (previousTextContent.length > 0) {
        if (/[ \t\n]$/.test(previousTextContent)) {
          textContent = textContent.slice(1);
        }
        isStartOfLine = false;
        break;
      }
    }
    if (isStartOfLine) {
      textContent = textContent.slice(1);
    }
  }
  if (textContent[textContent.length - 1] === ' ') {
    // Traverse forward while in the same line, preserve if next inline will require a space
    let nextText = domNode_;
    let isEndOfLine = true;
    while (nextText !== null && (nextText = findTextInLine(nextText, true)) !== null) {
      const nextTextContent = (nextText.textContent || '').replace(/^( |\t|\r?\n)+/, '');
      if (nextTextContent.length > 0) {
        isEndOfLine = false;
        break;
      }
    }
    if (isEndOfLine) {
      textContent = textContent.slice(0, textContent.length - 1);
    }
  }
  if (textContent === '') {
    return {
      node: null
    };
  }
  return {
    node: $createTextNode(textContent)
  };
}
function findTextInLine(text, forward) {
  let node = text;
  while (true) {
    let sibling;
    while ((sibling = forward ? node.nextSibling : node.previousSibling) === null) {
      const parentElement = node.parentElement;
      if (parentElement === null) {
        return null;
      }
      node = parentElement;
    }
    node = sibling;
    if (isHTMLElement(node)) {
      const display = node.style.display;
      if (display === '' && !isInlineDomNode(node) || display !== '' && !display.startsWith('inline')) {
        return null;
      }
    }
    let descendant = node;
    while ((descendant = forward ? node.firstChild : node.lastChild) !== null) {
      node = descendant;
    }
    if (isDOMTextNode(node)) {
      return node;
    } else if (node.nodeName === 'BR') {
      return null;
    }
  }
}
const nodeNameToTextFormat = {
  code: 'code',
  em: 'italic',
  i: 'italic',
  mark: 'highlight',
  s: 'strikethrough',
  strong: 'bold',
  sub: 'subscript',
  sup: 'superscript',
  u: 'underline'
};
function convertTextFormatElement(domNode) {
  const format = nodeNameToTextFormat[domNode.nodeName.toLowerCase()];
  if (format === undefined) {
    return {
      node: null
    };
  }
  return {
    forChild: applyTextFormatFromStyle(domNode.style, format),
    node: null
  };
}
function $createTextNode(text = '') {
  return $applyNodeReplacement(new TextNode(text));
}
function $isTextNode(node) {
  return node instanceof TextNode;
}
function applyTextFormatFromStyle(style, shouldApply) {
  const fontWeight = style.fontWeight;
  const textDecoration = style.textDecoration.split(' ');
  // Google Docs uses span tags + font-weight for bold text
  const hasBoldFontWeight = fontWeight === '700' || fontWeight === 'bold';
  // Google Docs uses span tags + text-decoration: line-through for strikethrough text
  const hasLinethroughTextDecoration = textDecoration.includes('line-through');
  // Google Docs uses span tags + font-style for italic text
  const hasItalicFontStyle = style.fontStyle === 'italic';
  // Google Docs uses span tags + text-decoration: underline for underline text
  const hasUnderlineTextDecoration = textDecoration.includes('underline');
  // Google Docs uses span tags + vertical-align to specify subscript and superscript
  const verticalAlign = style.verticalAlign;
  return lexicalNode => {
    if (!$isTextNode(lexicalNode) && !$isInlineFormattable(lexicalNode)) {
      return lexicalNode;
    }
    if (hasBoldFontWeight && !lexicalNode.hasFormat('bold')) {
      lexicalNode.toggleFormat('bold');
    }
    if (hasLinethroughTextDecoration && !lexicalNode.hasFormat('strikethrough')) {
      lexicalNode.toggleFormat('strikethrough');
    }
    if (hasItalicFontStyle && !lexicalNode.hasFormat('italic')) {
      lexicalNode.toggleFormat('italic');
    }
    if (hasUnderlineTextDecoration && !lexicalNode.hasFormat('underline')) {
      lexicalNode.toggleFormat('underline');
    }
    if (verticalAlign === 'sub' && !lexicalNode.hasFormat('subscript')) {
      lexicalNode.toggleFormat('subscript');
    }
    if (verticalAlign === 'super' && !lexicalNode.hasFormat('superscript')) {
      lexicalNode.toggleFormat('superscript');
    }
    if (shouldApply && !lexicalNode.hasFormat(shouldApply)) {
      lexicalNode.toggleFormat(shouldApply);
    }
    return lexicalNode;
  };
}

/** @noInheritDoc */
class TabNode extends TextNode {
  $config() {
    return this.config('tab', {
      extends: TextNode
    });
  }

  // `key` carries an explicit `undefined` default (rather than the usual `?`)
  // so the constructor reports zero required arguments, which lets `$config`
  // synthesize the static `clone` by invoking the no-argument constructor.
  constructor(key = undefined) {
    super('\t', key);
    this.__detail = IS_UNMERGEABLE;
  }
  createDOM(config) {
    const dom = super.createDOM(config);
    const classNames = getCachedClassNameArray(config.theme, 'tab');
    if (classNames !== undefined) {
      const domClassList = dom.classList;
      domClassList.add(...classNames);
    }
    return dom;
  }

  /**
   * Always normalizes the stored content to `'\t'` regardless of input — see
   * comment below for the rationale.
   */
  setTextContent(_text) {
    // The stored content is canonical regardless of input. Safari's
    // MutationObserver can deliver mid-IME-composition writes onto the
    // TabNode's `\t` text node (verified with Korean), and `flushMutations`
    // then calls this with the in-flight composition payload; throwing here
    // cascaded through `onError` and froze the editor (#8596). The dropped
    // check was guarding caller assumptions, not stored state — the
    // reconciler renders the canonical content on the next update.
    return super.setTextContent('\t');
  }
  spliceText(offset, delCount, newText, moveSelection) {
    if (!(newText === '' && delCount === 0 || newText === '\t' && delCount === 1)) {
      formatDevErrorMessage(`TabNode does not support spliceText`);
    }
    return this;
  }
  setDetail(detail) {
    if (!(detail === IS_UNMERGEABLE)) {
      formatDevErrorMessage(`TabNode does not support setDetail`);
    }
    return this;
  }
  setMode(type) {
    if (!(type === 'normal')) {
      formatDevErrorMessage(`TabNode does not support setMode`);
    }
    return this;
  }
  canInsertTextBefore() {
    return false;
  }
  canInsertTextAfter() {
    return false;
  }
}
function $createTabNode() {
  return $applyNodeReplacement(new TabNode());
}
function $isTabNode(node) {
  return node instanceof TabNode;
}

class Point {
  key;
  offset;
  type;
  _selection;
  constructor(key, offset, type) {
    {
      // This prevents a circular reference error when serialized as JSON,
      // which happens on unit test failures
      Object.defineProperty(this, '_selection', {
        enumerable: false,
        writable: true
      });
    }
    this._selection = null;
    this.key = key;
    this.offset = offset;
    this.type = type;
  }
  is(point) {
    return this.key === point.key && this.offset === point.offset && this.type === point.type;
  }
  isBefore(b) {
    if (this.key === b.key) {
      return this.offset < b.offset;
    }
    const aCaret = $normalizeCaret($caretFromPoint(this, 'next'));
    const bCaret = $normalizeCaret($caretFromPoint(b, 'next'));
    return $comparePointCaretNext(aCaret, bCaret) < 0;
  }
  getNode() {
    const key = this.key;
    const node = $getNodeByKey(key);
    if (node === null) {
      {
        formatDevErrorMessage(`Point.getNode: node not found`);
      }
    }
    return node;
  }
  set(key, offset, type, onlyIfChanged) {
    const selection = this._selection;
    const oldKey = this.key;
    if (onlyIfChanged && this.key === key && this.offset === offset && this.type === type) {
      return;
    }
    this.key = key;
    this.offset = offset;
    this.type = type;
    {
      const node = $getNodeByKey(key);
      if (!(type === 'text' ? $isTextNode(node) : $isElementNode(node))) {
        formatDevErrorMessage(`PointType.set: node with key ${key} is ${node ? node.__type : '[not found]'} and can not be used for a ${type} point`);
      }
    }
    if (!isCurrentlyReadOnlyMode()) {
      if ($getCompositionKey() === oldKey) {
        $setCompositionKey(key);
      }
      if (selection !== null) {
        selection.setCachedNodes(null);
        if ($isRangeSelection(selection)) {
          selection._cachedIsBackward = null;
        }
        selection.dirty = true;
      }
    }
  }
}
function $createPoint(key, offset, type) {
  // @ts-expect-error: intentionally cast as we use a class for perf reasons
  return new Point(key, offset, type);
}
function selectPointOnNode(point, node) {
  let key = node.__key;
  let offset = point.offset;
  let type = 'element';
  if ($isTextNode(node)) {
    type = 'text';
    const textContentLength = node.getTextContentSize();
    if (offset > textContentLength) {
      offset = textContentLength;
    }
  } else if (!$isElementNode(node)) {
    const nextSibling = node.getNextSibling();
    if ($isTextNode(nextSibling)) {
      key = nextSibling.__key;
      offset = 0;
      type = 'text';
    } else {
      const parentNode = node.getParent();
      if (parentNode) {
        key = parentNode.__key;
        offset = node.getIndexWithinParent() + 1;
      }
    }
  }
  point.set(key, offset, type);
}
function $moveSelectionPointToEnd(point, node) {
  if ($isElementNode(node)) {
    const lastNode = node.getLastDescendant();
    if ($isElementNode(lastNode) || $isTextNode(lastNode)) {
      selectPointOnNode(point, lastNode);
    } else {
      selectPointOnNode(point, node);
    }
  } else {
    selectPointOnNode(point, node);
  }
}
function $transferStartingElementPointToTextPoint(start, end, format, style) {
  const element = start.getNode();
  const placementNode = element.getChildAtIndex(start.offset);
  const textNode = $createTextNode();
  textNode.setFormat(format);
  textNode.setStyle(style);
  if ($isParagraphNode(placementNode)) {
    placementNode.splice(0, 0, [textNode]);
  } else if (placementNode !== null) {
    // root or shadow-root + element-mode anchor before a non-paragraph
    // child (typically a sibling block decorator): wrap the new text in
    // a paragraph so it stays a valid block-level child of the root or
    // slot frame. The last-offset branch below already covers shadow
    // roots; the in-the-middle case used to drop a raw text node next
    // to the decorator, which leaves the text without a block ancestor
    // and breaks every downstream getTopLevelElement / $findMatchingParent
    // walk (Cmd+A, Enter, etc.).
    const target = $isRootOrShadowRoot(element) ? $createParagraphNode().append(textNode) : textNode;
    placementNode.insertBefore(target);
  } else if ($isRootOrShadowRoot(element)) {
    // root or shadow-root + last-offset typing: reuse the empty trailing
    // block when one exists (typical state after a sibling block decorator
    // was deleted) instead of appending a fresh paragraph. The old behavior
    // left a phantom empty paragraph above the user's input.
    const lastChild = element.getLastChild();
    if ($isElementNode(lastChild) && !lastChild.isInline() && lastChild.isEmpty()) {
      lastChild.append(textNode);
    } else {
      element.append($createParagraphNode().append(textNode));
    }
  } else {
    element.append(textNode);
  }
  // Transfer the element point to a text point.
  if (start.is(end)) {
    end.set(textNode.__key, 0, 'text');
  }
  start.set(textNode.__key, 0, 'text');
}
function $insertTextAtPoint(selection, text, format, style) {
  const anchorNode = selection.anchor.getNode();
  if (!$isTextNode(anchorNode)) {
    formatDevErrorMessage(`insertText: anchor is not a text node`);
  }
  const offset = selection.anchor.offset;
  const textNode = $createTextNode(text);
  textNode.setFormat(format);
  textNode.setStyle(style);
  const parent = anchorNode.getParentOrThrow();
  if (offset === 0) {
    if (parent.isInline() && !anchorNode.__prev) {
      parent.insertBefore(textNode);
    } else {
      anchorNode.insertBefore(textNode, false);
    }
  } else if (offset === anchorNode.getTextContentSize()) {
    if (parent.isInline() && !anchorNode.__next) {
      parent.insertAfter(textNode);
    } else {
      anchorNode.insertAfter(textNode, false);
    }
  } else {
    const [before] = anchorNode.splitText(offset);
    before.insertAfter(textNode, false);
  }
  if (anchorNode.getTextContent() === '' && anchorNode.isAttached()) {
    anchorNode.remove();
  }
  textNode.selectEnd();
  if (textNode.isComposing() && selection.anchor.type === 'text') {
    selection.anchor.set(selection.anchor.key, selection.anchor.offset - text.length, selection.anchor.type);
  }
}
class NodeSelection {
  _nodes;
  _cachedNodes;
  dirty;
  constructor(objects) {
    this._cachedNodes = null;
    this._nodes = objects;
    this.dirty = false;
  }
  getCachedNodes() {
    return this._cachedNodes;
  }
  setCachedNodes(nodes) {
    this._cachedNodes = nodes;
  }
  is(selection) {
    if (!$isNodeSelection(selection)) {
      return false;
    }
    const a = this._nodes;
    const b = selection._nodes;
    return a.size === b.size && Array.from(a).every(key => b.has(key));
  }
  isCollapsed() {
    return false;
  }
  isBackward() {
    return false;
  }
  getStartEndPoints() {
    return null;
  }
  add(key) {
    this.dirty = true;
    this._nodes.add(key);
    this._cachedNodes = null;
  }
  delete(key) {
    this.dirty = true;
    this._nodes.delete(key);
    this._cachedNodes = null;
  }
  clear() {
    this.dirty = true;
    this._nodes.clear();
    this._cachedNodes = null;
  }
  has(key) {
    return this._nodes.has(key);
  }
  clone() {
    return new NodeSelection(new Set(this._nodes));
  }
  extract() {
    return this.getNodes();
  }
  insertRawText(text) {
    // Do nothing?
  }
  insertText() {
    // Do nothing?
  }
  insertNodes(nodes) {
    // Slotted nodes are fixed parts of their host with no parent, so they
    // can't be inserted around or removed (see $removeNode's slot guard).
    // Skip them; if nothing tree-resident is selected there's nowhere to
    // anchor the insertion.
    const selectedNodes = this.getNodes().filter(node => $getSlotHostKey(node) === null);
    const selectedNodesLength = selectedNodes.length;
    if (selectedNodesLength === 0) {
      return;
    }
    const lastSelectedNode = selectedNodes[selectedNodesLength - 1];
    let selectionAtEnd;
    // Insert nodes
    if ($isTextNode(lastSelectedNode)) {
      selectionAtEnd = lastSelectedNode.select();
    } else {
      const index = lastSelectedNode.getIndexWithinParent() + 1;
      selectionAtEnd = lastSelectedNode.getParentOrThrow().select(index, index);
    }
    selectionAtEnd.insertNodes(nodes);
    // Remove selected nodes
    for (let i = 0; i < selectedNodesLength; i++) {
      selectedNodes[i].remove();
    }
  }
  getNodes() {
    const cachedNodes = this._cachedNodes;
    if (cachedNodes !== null) {
      return cachedNodes;
    }
    const objects = this._nodes;
    const nodes = [];
    for (const object of objects) {
      const node = $getNodeByKey(object);
      if (node !== null) {
        nodes.push(node);
      }
    }
    if (!isCurrentlyReadOnlyMode()) {
      this._cachedNodes = nodes;
    }
    return nodes;
  }
  getTextContent() {
    const nodes = this.getNodes();
    let textContent = '';
    for (let i = 0; i < nodes.length; i++) {
      textContent += nodes[i].getTextContent();
    }
    return textContent;
  }

  /**
   * Remove all nodes in the NodeSelection. If there were any nodes,
   * replace the selection with a new RangeSelection at the previous
   * location of the first node.
   */
  deleteNodes() {
    // Slotted nodes are fixed parts of their host; skip them so we neither
    // build a caret from a parentless node nor hit $removeNode's slot guard.
    const nodes = this.getNodes().filter(node => $getSlotHostKey(node) === null);
    if (($getSelection() || $getPreviousSelection()) === this && nodes[0]) {
      const firstCaret = $getSiblingCaret(nodes[0], 'next');
      $setSelectionFromCaretRange($getCaretRange(firstCaret, firstCaret));
    }
    for (const node of nodes) {
      node.remove();
    }
    $ensureRootHasParagraph();
  }
}
function $ensureRootHasParagraph() {
  const root = $getRoot();
  if (root.isEmpty()) {
    const paragraph = $createParagraphNode();
    root.append(paragraph);
    paragraph.select();
  }
}
function $isRangeSelection(x) {
  return x instanceof RangeSelection;
}
class RangeSelection {
  format;
  style;
  anchor;
  focus;
  _cachedNodes;
  /** @internal */
  _cachedIsBackward;
  dirty;
  constructor(anchor, focus, format, style) {
    this.anchor = anchor;
    this.focus = focus;
    anchor._selection = this;
    focus._selection = this;
    this._cachedNodes = null;
    this._cachedIsBackward = null;
    this.format = format;
    this.style = style;
    this.dirty = false;
  }
  getCachedNodes() {
    return this._cachedNodes;
  }
  setCachedNodes(nodes) {
    this._cachedNodes = nodes;
  }

  /**
   * Used to check if the provided selections is equal to this one by value,
   * including anchor, focus, format, and style properties.
   * @param selection - the Selection to compare this one to.
   * @returns true if the Selections are equal, false otherwise.
   */
  is(selection) {
    if (!$isRangeSelection(selection)) {
      return false;
    }
    return this.anchor.is(selection.anchor) && this.focus.is(selection.focus) && this.format === selection.format && this.style === selection.style;
  }

  /**
   * Returns whether the Selection is "collapsed", meaning the anchor and focus are
   * the same node and have the same offset.
   *
   * @returns true if the Selection is collapsed, false otherwise.
   */
  isCollapsed() {
    return this.anchor.is(this.focus);
  }

  /**
   * Gets all the nodes in the Selection. Uses caching to make it generally suitable
   * for use in hot paths.
   *
   * See also the {@link CaretRange} APIs (starting with
   * {@link $caretRangeFromSelection}), which are likely to provide a better
   * foundation for any operation where partial selection is relevant
   * (e.g. the anchor or focus are inside an ElementNode and TextNode)
   *
   * @returns an Array containing all the nodes in the Selection
   */
  getNodes() {
    const cachedNodes = this._cachedNodes;
    if (cachedNodes !== null) {
      return cachedNodes;
    }
    const range = $getCaretRangeInDirection($caretRangeFromSelection(this), 'next');
    const nodes = $getNodesFromCaretRangeCompat(range);
    {
      if (this.isCollapsed() && nodes.length > 1) {
        {
          formatDevErrorMessage(`RangeSelection.getNodes() returned ${String(nodes.length)} > 1 nodes in a collapsed selection`);
        }
      }
    }
    if (!isCurrentlyReadOnlyMode()) {
      this._cachedNodes = nodes;
    }
    return nodes;
  }

  /**
   * Sets this Selection to be of type "text" at the provided anchor and focus values.
   *
   * @param anchorNode - the anchor node to set on the Selection
   * @param anchorOffset - the offset to set on the Selection
   * @param focusNode - the focus node to set on the Selection
   * @param focusOffset - the focus offset to set on the Selection
   */
  setTextNodeRange(anchorNode, anchorOffset, focusNode, focusOffset) {
    this.anchor.set(anchorNode.__key, anchorOffset, 'text');
    this.focus.set(focusNode.__key, focusOffset, 'text');
    return this;
  }

  /**
   * Gets the (plain) text content of all the nodes in the selection.
   *
   * @returns a string representing the text content of all the nodes in the Selection
   */
  getTextContent() {
    const nodes = this.getNodes();
    if (nodes.length === 0) {
      return '';
    }
    const firstNode = nodes[0];
    const lastNode = nodes[nodes.length - 1];
    const anchor = this.anchor;
    const focus = this.focus;
    const isBefore = anchor.isBefore(focus);
    const [anchorOffset, focusOffset] = $getCharacterOffsets(this);
    let textContent = '';
    let prevWasElement = true;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if ($isElementNode(node) && !node.isInline()) {
        if (!prevWasElement) {
          textContent += '\n';
        }
        // Slots are isolated shadow roots, so getNodes() never descends into
        // them; append their text here (slots-first, mirroring
        // ElementNode.getTextContent) so a selection enclosing the host
        // carries its slot content.
        let slotText = '';
        for (const slotName of $getSlotNames(node)) {
          const slot = $getSlot(node, slotName);
          if (slot !== null) {
            slotText += slot.getTextContent();
          }
        }
        if (slotText !== '') {
          textContent += slotText;
          prevWasElement = false;
        } else if (node.isEmpty()) {
          prevWasElement = false;
        } else {
          prevWasElement = true;
        }
      } else {
        prevWasElement = false;
        if ($isTextNode(node)) {
          let text = node.getTextContent();
          if (node === firstNode) {
            if (node === lastNode) {
              if (anchor.type !== 'element' || focus.type !== 'element' || focus.offset === anchor.offset) {
                text = anchorOffset < focusOffset ? text.slice(anchorOffset, focusOffset) : text.slice(focusOffset, anchorOffset);
              }
            } else {
              text = isBefore ? text.slice(anchorOffset) : text.slice(focusOffset);
            }
          } else if (node === lastNode) {
            text = isBefore ? text.slice(0, focusOffset) : text.slice(0, anchorOffset);
          }
          textContent += text;
        } else if (($isDecoratorNode(node) || $isLineBreakNode(node)) && (node !== lastNode || !this.isCollapsed())) {
          textContent += node.getTextContent();
        }
      }
    }
    return textContent;
  }

  /**
   * Attempts to map a DOM selection range onto this Lexical Selection,
   * setting the anchor, focus, and type accordingly
   *
   * @param range a DOM Selection range conforming to the StaticRange interface.
   */
  applyDOMRange(range) {
    const editor = getActiveEditor();
    const currentEditorState = editor.getEditorState();
    const lastSelection = currentEditorState._selection;
    const resolvedSelectionPoints = $internalResolveSelectionPoints(range.startContainer, range.startOffset, range.endContainer, range.endOffset, editor, lastSelection);
    if (resolvedSelectionPoints === null) {
      return;
    }
    const [anchorPoint, focusPoint, dirty] = resolvedSelectionPoints;
    this.anchor.set(anchorPoint.key, anchorPoint.offset, anchorPoint.type, true);
    this.focus.set(focusPoint.key, focusPoint.offset, focusPoint.type, true);
    if (dirty) {
      this.dirty = true;
    }
    // Firefox will use an element point rather than a text point in some cases,
    // so we normalize for that
    $normalizeSelection(this);
  }

  /**
   * Creates a new RangeSelection, copying over all the property values from this one.
   *
   * @returns a new RangeSelection with the same property values as this one.
   */
  clone() {
    const anchor = this.anchor;
    const focus = this.focus;
    const selection = new RangeSelection($createPoint(anchor.key, anchor.offset, anchor.type), $createPoint(focus.key, focus.offset, focus.type), this.format, this.style);
    return selection;
  }

  /**
   * Toggles the provided format on all the TextNodes in the Selection.
   *
   * @param format a string TextFormatType to toggle on the TextNodes in the selection
   */
  toggleFormat(format) {
    this.format = toggleTextFormatType(this.format, format, null);
    this.dirty = true;
  }

  /**
   * Sets the value of the format property on the Selection
   *
   * @param format - the format to set at the value of the format property.
   */
  setFormat(format) {
    this.format = format;
    this.dirty = true;
  }

  /**
   * Sets the value of the style property on the Selection
   *
   * @param style - the style to set at the value of the style property.
   */
  setStyle(style) {
    this.style = style;
    this.dirty = true;
  }

  /**
   * Returns whether the provided TextFormatType is present on the Selection. This will be true if all text nodes in the Selection
   * have the specified format.
   *
   * @param type the TextFormatType to check for.
   * @returns true if the provided format is currently toggled on the Selection, false otherwise.
   */
  hasFormat(type) {
    const formatFlag = TEXT_TYPE_TO_FORMAT[type];
    return (this.format & formatFlag) !== 0;
  }

  /**
   * Attempts to insert the provided text into the EditorState at the current Selection.
   * converts tabs, newlines, and carriage returns into LexicalNodes.
   *
   * @param text the text to insert into the Selection
   */
  insertRawText(text) {
    this.insertNodes($generateNodesFromRawText(text));
  }

  /**
   * Insert the provided text into the EditorState at the current Selection.
   *
   * @param text the text to insert into the Selection
   */
  insertText(text) {
    // For non-collapsed selections, inherit format/style from the first
    // selected text node so the replacement preserves the original styling.
    let format = this.format;
    let style = this.style;
    if (!this.isCollapsed()) {
      const firstPoint = this.focus.isBefore(this.anchor) ? this.focus : this.anchor;
      const firstNode = firstPoint.getNode();
      if ($isTextNode(firstNode)) {
        format = firstNode.getFormat();
        style = firstNode.getStyle();
      }
      this.removeText();
      this.format = format;
      this.style = style;
      if (text === '') {
        return;
      }
      if ($getCompositionKey() === null) {
        if (this.anchor.type === 'element') {
          $transferStartingElementPointToTextPoint(this.anchor, this.focus, format, style);
        }
        $insertTextAtPoint(this, text, format, style);
        return;
      }
      // Composing: fall through to the collapsed code below.
      // spliceText preserves DOM node identity so the browser's
      // IME tracker stays attached.
    }
    if (this.anchor.type === 'element') {
      $transferStartingElementPointToTextPoint(this.anchor, this.focus, format, style);
    }
    const anchorNode = this.anchor.getNode();
    if (!$isTextNode(anchorNode)) {
      formatDevErrorMessage(`insertText: anchor is not a text node`);
    }
    const offset = this.anchor.offset;
    const anchorParent = anchorNode.getParentOrThrow();
    const anchorSize = anchorNode.getTextContentSize();
    const needsRedirect = $isTokenOrSegmented(anchorNode) || offset === 0 && (!anchorNode.canInsertTextBefore() || !anchorParent.canInsertTextBefore() && !anchorNode.__prev) || offset === anchorSize && (!anchorNode.canInsertTextAfter() || !anchorParent.canInsertTextAfter() && !anchorNode.__next);
    if (needsRedirect) {
      // Token/segmented nodes and nodes whose parent forbids text insertion
      // at the boundary: reposition the cursor to an adjacent insertable
      // node, then recurse.

      // Segmented node with cursor in the middle: convert to normal
      // text node so that the recursive insertText can proceed.
      if (anchorNode.isSegmented() && offset !== 0 && offset !== anchorSize) {
        if ($getCompositionKey() !== null) {
          anchorNode.setMode('normal').setFormat(format).setStyle(style);
        } else {
          const replacement = $createTextNode(anchorNode.getTextContent());
          replacement.setFormat(format);
          replacement.setStyle(style);
          anchorNode.replace(replacement);
          replacement.select(offset, offset);
        }
        if (text !== '') {
          this.insertText(text);
        }
        return;
      }
      if (text === '') {
        return;
      }
      if (offset === 0) {
        const prev = anchorNode.getPreviousSibling();
        if ($isTextNode(prev) && prev.canInsertTextAfter() && !$isTokenOrSegmented(prev)) {
          prev.select();
        } else {
          const newNode = $createTextNode();
          newNode.setFormat(format);
          newNode.setStyle(style);
          if (!anchorParent.canInsertTextBefore()) {
            anchorParent.insertBefore(newNode);
          } else {
            anchorNode.insertBefore(newNode);
          }
          newNode.select();
        }
        this.insertText(text);
        return;
      } else if (offset === anchorSize) {
        const next = anchorNode.getNextSibling();
        if ($isTextNode(next) && next.canInsertTextBefore() && !$isTokenOrSegmented(next)) {
          next.select(0, 0);
        } else {
          const newNode = $createTextNode();
          newNode.setFormat(format);
          newNode.setStyle(style);
          if (!anchorParent.canInsertTextAfter()) {
            anchorParent.insertAfter(newNode);
          } else {
            anchorNode.insertAfter(newNode);
          }
          newNode.select(0, 0);
        }
        this.insertText(text);
        return;
      }
      const newNode = $createTextNode(text);
      newNode.setFormat(format);
      newNode.setStyle(style);
      anchorNode.replace(newNode);
      newNode.select();
      return;
    }
    if (text === '') {
      return;
    }
    const atStartOfInline = anchorParent.isInline() && offset === 0 && !anchorNode.__prev;
    const atEndOfInline = anchorParent.isInline() && offset === anchorSize && !anchorNode.__next;
    const formatDiffers = anchorNode.getFormat() !== format || anchorNode.getStyle() !== style;
    if (atStartOfInline || atEndOfInline || formatDiffers) {
      if (anchorNode.getTextContent() === '' && !atStartOfInline && !atEndOfInline) {
        anchorNode.setFormat(format);
        anchorNode.setStyle(style);
      } else {
        $insertTextAtPoint(this, text, format, style);
        return;
      }
    }
    anchorNode.spliceText(offset, 0, text, true);
    if (anchorNode.isComposing() && this.anchor.type === 'text') {
      this.anchor.set(this.anchor.key, this.anchor.offset - text.length, this.anchor.type);
    }
  }

  /**
   * Removes the text in the Selection, adjusting the EditorState accordingly.
   */
  removeText() {
    const isCurrentSelection = $getSelection() === this;
    const newRange = $removeTextFromCaretRange($caretRangeFromSelection(this));
    $updateRangeSelectionFromCaretRange(this, newRange);
    if (isCurrentSelection && $getSelection() !== this) {
      $setSelection(this);
    }
  }

  // TO-DO: Migrate this method to the new utility function $forEachSelectedTextNode (share similar logic)
  /**
   * Applies the provided format to the TextNodes in the Selection, splitting or
   * merging nodes as necessary.
   *
   * @param formatType the format type to apply to the nodes in the Selection.
   * @param alignWithFormat a 32-bit integer representing formatting flags to align with.
   */
  formatText(formatType, alignWithFormat = null) {
    $formatText(this, formatType, alignWithFormat);
  }

  /**
   * Attempts to "intelligently" insert an arbitrary list of Lexical nodes into the EditorState at the
   * current Selection according to a set of heuristics that determine how surrounding nodes
   * should be changed, replaced, or moved to accommodate the incoming ones.
   *
   * @param nodes - the nodes to insert
   */
  insertNodes(nodes) {
    if (nodes.length === 0) {
      return;
    }
    if (!this.isCollapsed()) {
      this.removeText();
    }
    // @experimental named-slots. Anchor on a slot value root (e.g. after a
    // slot-scoped Cmd+A leaves the selection on the slot's element point)
    // has __parent === null, so the block-finding walk below would throw.
    // Redirect into the slot subtree by collapsing the selection at the
    // slot's first child and re-running insertNodes.
    const anchorNode = this.anchor.getNode();
    if (this.anchor.type === 'element' && $isElementNode(anchorNode) && $getSlotHostKey(anchorNode) !== null) {
      // A container (shadow-root) value redirects into its first child; an
      // empty one has no child to redirect into (its caret target is the
      // reconciler's terminating <br>), so seed a paragraph first —
      // insertNodes removes the seed again when block content replaces it. A
      // block-shaped value (virtual shadow root around a single block) needs
      // no seeding: it IS the block, so the block-finding walk below lands
      // on it directly.
      let firstChild = anchorNode.isShadowRoot() ? anchorNode.getFirstChild() ?? anchorNode.append($createParagraphNode()).getFirstChild() : anchorNode.getFirstChild();
      // A shadow-root slot whose first child is a non-element (typically a
      // decorator like HorizontalRuleNode) would re-enter this same branch
      // forever: `firstChild.selectStart()` resolves back to the slot value's
      // own element-mode caret (no sibling, parent = the slot value root),
      // which matches the entry condition above. Seed a paragraph before the
      // non-element first child so the redirected selection lands in a block
      // and the recursion terminates.
      //
      // The seed paragraph is the redirect target only — if `nodes` carries
      // inline content the recursion fills the paragraph in place, and if it
      // carries block content the recursion's root/shadow-root branch
      // (`splice` after `$wrapInlineNodes`) inserts the new blocks before the
      // existing non-element first child while the seed sits at offset 0 as
      // the new shadow-root first child. In either case the seed ends up
      // hosting either the inserted content or an empty leading line, never
      // a stranded paragraph next to the original non-element child.
      if (anchorNode.isShadowRoot() && firstChild !== null && !$isElementNode(firstChild)) {
        const seed = $createParagraphNode();
        firstChild.insertBefore(seed);
        firstChild = seed;
      }
      if (firstChild !== null) {
        firstChild.selectStart();
        const redirected = $getSelection();
        if (!$isRangeSelection(redirected)) {
          formatDevErrorMessage(`Expected RangeSelection after redirecting into slot subtree`);
        }
        return redirected.insertNodes(nodes);
      }
    }

    // The anchor is an element point directly on a root or shadow root that is
    // not a named-slot host (handled above). This includes the document root
    // (e.g. an empty editor) and shadow roots that hold block-level children
    // directly — for instance the block cursor between or after the children of
    // a decorator-only container or the playground CollapsibleContentNode.
    // Roots and shadow roots hold blocks (and shadow roots) directly, so splice
    // the nodes in at the anchor offset: a block node (such as a pasted
    // DecoratorNode) goes in as-is, while inline runs are wrapped in a block
    // first since a root/shadow root cannot contain inline children.
    if (this.anchor.type === 'element' && $isRootOrShadowRoot(anchorNode)) {
      const blocksParent = $wrapInlineNodes(nodes);
      const nodeToSelect = blocksParent.getLastDescendant();
      anchorNode.splice(this.anchor.offset, 0, blocksParent.getChildren());
      if (nodeToSelect !== null) {
        nodeToSelect.selectEnd();
      }
      return;
    }
    const firstPoint = this.isBackward() ? this.focus : this.anchor;
    let firstNode = firstPoint.getNode();
    let firstBlock = $findMatchingParent(firstNode, INTERNAL_$isBlock);
    const last = nodes[nodes.length - 1];

    // CASE 1: insert inside a code block
    if ($isElementNode(firstBlock) && '__language' in firstBlock) {
      if ('__language' in nodes[0]) {
        this.insertText(nodes[0].getTextContent());
      } else {
        const index = $removeTextAndSplitBlock(this);
        firstBlock.splice(index, 0, nodes);
        last.selectEnd();
      }
      return;
    }

    // CASE 2: All elements of the array are inline
    const notInline = node => ($isElementNode(node) || $isDecoratorNode(node)) && !node.isInline();
    if (!nodes.some(notInline)) {
      if (!$isElementNode(firstBlock)) {
        formatDevErrorMessage(`Expected node ${firstNode.constructor.name} of type ${firstNode.getType()} to have a block ElementNode ancestor`);
      }
      const index = $removeTextAndSplitBlock(this);
      firstBlock.splice(index, 0, nodes);
      last.selectEnd();
      return;
    }

    // CASE 3a: the target block IS a slot value. Its virtual shadow root
    // holds exactly one block, so block-level content cannot become its
    // sibling; mirror pasting into an <input> instead — block structure
    // flattens to its inline content on the single line (line breaks are
    // stripped like the input value sanitization strips newlines, and
    // block-only decorators are dropped, having no single-line form).
    if ($isElementNode(firstBlock) && $getSlotHostKey(firstBlock) !== null) {
      const index = $removeTextAndSplitBlock(this);
      const inlineNodes = $extractInlineFromBlocks(nodes);
      firstBlock.splice(index, 0, inlineNodes);
      const lastInserted = inlineNodes[inlineNodes.length - 1];
      if (lastInserted !== undefined) {
        lastInserted.selectEnd();
      } else {
        firstBlock.select(index, index);
      }
      return;
    }

    // CASE 3b: there is non-inline content but no block ancestor to insert it
    // relative to. The element point on a root/shadow root is handled above, so
    // this is a malformed document where an inline-only element directly holds
    // a block child (e.g. a HorizontalRuleNode inside a CollapsibleTitleNode,
    // see #8713) or a non-inline element that reports canBeEmpty() === false.
    // A non-inline node must never become the child of an inline-only element,
    // so enforce the document structure rules with
    // $insertNodeToNearestRootAtCaret, which splits the ancestor chain up to
    // the nearest node that may contain non-inline children (a root or shadow
    // root) and inserts the blocks there. Lists are unaffected: a list item is
    // always a block ancestor, so they fall through to CASE 3 and keep their
    // existing (ListItemNode-aware) paste behavior.
    if (firstBlock === null) {
      const blocksParent = $wrapInlineNodes(nodes);
      const nodeToSelect = blocksParent.getLastDescendant();
      // Split the ancestor chain up to the nearest root or shadow root and
      // insert each block there.
      let caret = $caretFromPoint(this.anchor, 'next');
      for (const block of blocksParent.getChildren()) {
        caret = $insertNodeToNearestRootAtCaret(block, caret);
      }
      if (nodeToSelect !== null) {
        nodeToSelect.selectEnd();
      }
      return;
    }

    // CASE 3c: the target block exists but its parent is not a root or shadow
    // root — the only elements that may contain non-inline children — and the
    // block does not relocate itself to a valid parent (it is not
    // parent-required, unlike a ListItemNode, whose insertAfter escapes the
    // list). Inserting the blocks as siblings here would nest them in an
    // inline-only element, e.g. a HorizontalRuleNode pasted into the
    // ParagraphNode of a CollapsibleTitleNode (see #8724). Mirror CASE 3a and
    // flatten the incoming nodes to their inline content, dropping the
    // block-level parts that have no inline form.
    if ($isElementNode(firstBlock) && !firstBlock.isParentRequired() && !$isRootOrShadowRoot(firstBlock.getParentOrThrow())) {
      const index = $removeTextAndSplitBlock(this);
      const inlineNodes = $extractInlineFromBlocks(nodes);
      firstBlock.splice(index, 0, inlineNodes);
      const lastInserted = inlineNodes[inlineNodes.length - 1];
      if (lastInserted !== undefined) {
        lastInserted.selectEnd();
      } else {
        firstBlock.select(index, index);
      }
      return;
    }

    // CASE 3: At least 1 element of the array is not inline
    const blocksParent = $wrapInlineNodes(nodes);
    const nodeToSelect = blocksParent.getLastDescendant();
    const blocks = blocksParent.getChildren();
    const isMergeable = node => $isElementNode(node) && INTERNAL_$isBlock(node) && !node.isEmpty() && $isElementNode(firstBlock) && (!firstBlock.isEmpty() || firstBlock.canMergeWhenEmpty());
    const shouldInsert = !$isElementNode(firstBlock) || !firstBlock.isEmpty();
    const insertedParagraph = shouldInsert ? this.insertParagraph() : null;
    if (insertedParagraph && !firstBlock.isAttached()) {
      firstNode = this.anchor.getNode();
      firstBlock = $findMatchingParent(firstNode, INTERNAL_$isBlock);
    }
    const lastToInsert = blocks[blocks.length - 1];
    let firstToInsert = blocks[0];
    if (isMergeable(firstToInsert)) {
      if (!$isElementNode(firstBlock)) {
        formatDevErrorMessage(`Expected node ${firstNode.constructor.name} of type ${firstNode.getType()} to have a block ElementNode ancestor`);
      }
      firstBlock.append(...firstToInsert.getChildren());
      firstToInsert = blocks[1];
    }
    if (firstToInsert) {
      if (!(firstBlock !== null)) {
        formatDevErrorMessage(`Expected node ${firstNode.constructor.name} of type ${firstNode.getType()} to have a block ancestor`);
      }
      insertRangeAfter(firstBlock, firstToInsert);
    }
    const lastInsertedBlock = $findMatchingParent(nodeToSelect, INTERNAL_$isBlock);
    if (insertedParagraph && $isElementNode(lastInsertedBlock) && (insertedParagraph.canMergeWhenEmpty() || INTERNAL_$isBlock(lastToInsert))) {
      lastInsertedBlock.append(...insertedParagraph.getChildren());
      insertedParagraph.remove();
    }
    if ($isElementNode(firstBlock) && firstBlock.isEmpty()) {
      firstBlock.remove();
    }
    nodeToSelect.selectEnd();

    // To understand this take a look at the test "can wrap post-linebreak nodes into new element"
    const lastChild = $isElementNode(firstBlock) ? firstBlock.getLastChild() : null;
    if ($isLineBreakNode(lastChild) && lastInsertedBlock !== firstBlock) {
      lastChild.remove();
    }
  }

  /**
   * Inserts a new ParagraphNode into the EditorState at the current Selection
   *
   * @returns the newly inserted node.
   */
  insertParagraph() {
    const anchorNode = this.anchor.getNode();
    if (this.anchor.type === 'element' && $isRootOrShadowRoot(anchorNode)) {
      const paragraph = $createParagraphNode();
      anchorNode.splice(this.anchor.offset, 0, [paragraph]);
      paragraph.select();
      return paragraph;
    }
    const index = $removeTextAndSplitBlock(this);
    const block = $findMatchingParent(this.anchor.getNode(), INTERNAL_$isBlock);
    if (block !== null && $getSlotHostKey(block) !== null) {
      // The block IS the slot value: its virtual shadow root holds exactly
      // one block, so there is no position for a sibling paragraph. Mirrors
      // Enter in a single-line input — a no-op (hosts may map it to focus
      // movement).
      return null;
    }
    if (!$isElementNode(block)) {
      formatDevErrorMessage(`Expected ancestor to be a block ElementNode`);
    }
    const firstToAppend = block.getChildAtIndex(index);
    const nodesToInsert = firstToAppend ? [firstToAppend, ...firstToAppend.getNextSiblings()] : [];
    const newBlock = block.insertNewAfter(this, false);
    if (newBlock) {
      newBlock.append(...nodesToInsert);
      newBlock.selectStart();
      return newBlock;
    }
    // if newBlock is null, it means that block is of type CodeNode.
    return null;
  }

  /**
   * Inserts a logical linebreak, which may be a new LineBreakNode or a new ParagraphNode, into the EditorState at the
   * current Selection.
   */
  insertLineBreak(selectStart) {
    const lineBreak = $createLineBreakNode();
    this.insertNodes([lineBreak]);
    // this is used in MacOS with the command 'ctrl-O' (openLineBreak)
    if (selectStart) {
      const parent = lineBreak.getParentOrThrow();
      const index = lineBreak.getIndexWithinParent();
      parent.select(index, index);
    }
  }

  /**
   * Extracts the nodes in the Selection, splitting nodes where necessary
   * to get offset-level precision.
   *
   * @returns The nodes in the Selection
   */
  extract() {
    const selectedNodes = [...this.getNodes()];
    const selectedNodesLength = selectedNodes.length;
    let firstNode = selectedNodes[0];
    let lastNode = selectedNodes[selectedNodesLength - 1];
    const [anchorOffset, focusOffset] = $getCharacterOffsets(this);
    const isBackward = this.isBackward();
    const [startPoint, endPoint] = isBackward ? [this.focus, this.anchor] : [this.anchor, this.focus];
    const [startOffset, endOffset] = isBackward ? [focusOffset, anchorOffset] : [anchorOffset, focusOffset];
    if (selectedNodesLength === 0) {
      return [];
    } else if (selectedNodesLength === 1) {
      if ($isTextNode(firstNode) && !this.isCollapsed()) {
        const splitNodes = firstNode.splitText(startOffset, endOffset);
        const node = startOffset === 0 ? splitNodes[0] : splitNodes[1];
        if (node) {
          startPoint.set(node.getKey(), 0, 'text');
          endPoint.set(node.getKey(), node.getTextContentSize(), 'text');
          return [node];
        }
        return [];
      }
      return [firstNode];
    }
    if ($isTextNode(firstNode)) {
      if (startOffset === firstNode.getTextContentSize()) {
        selectedNodes.shift();
      } else if (startOffset !== 0) {
        [, firstNode] = firstNode.splitText(startOffset);
        selectedNodes[0] = firstNode;
        startPoint.set(firstNode.getKey(), 0, 'text');
      }
    }
    if ($isTextNode(lastNode)) {
      const lastNodeText = lastNode.getTextContent();
      const lastNodeTextLength = lastNodeText.length;
      if (endOffset === 0) {
        selectedNodes.pop();
      } else if (endOffset !== lastNodeTextLength) {
        [lastNode] = lastNode.splitText(endOffset);
        selectedNodes[selectedNodes.length - 1] = lastNode;
        endPoint.set(lastNode.getKey(), lastNode.getTextContentSize(), 'text');
      }
    }
    return selectedNodes;
  }

  /**
   * Modifies the Selection according to the parameters and a set of heuristics that account for
   * various node types. Can be used to safely move or extend selection by one logical "unit" without
   * dealing explicitly with all the possible node types.
   *
   * @param alter the type of modification to perform
   * @param isBackward whether or not selection is backwards
   * @param granularity the granularity at which to apply the modification
   */
  modify(alter, isBackward, granularity) {
    if ($modifySelectionAroundDecoratorsAndBlocks(this, alter, isBackward, granularity)) {
      return;
    }
    const collapse = alter === 'move';
    const editor = getActiveEditor();
    const domSelection = getDOMSelection(getWindow(editor));
    if (!domSelection) {
      return;
    }
    const blockCursorElement = editor._blockCursorElement;
    const rootElement = editor._rootElement;
    const focusNode = this.focus.getNode();
    // Remove the block cursor element if it exists. This will ensure selection
    // works as intended. If we leave it in the DOM all sorts of strange bugs
    // occur. :/
    if (rootElement !== null && blockCursorElement !== null && $isElementNode(focusNode) && !focusNode.isInline() && !focusNode.canBeEmpty()) {
      removeDOMBlockCursorElement(blockCursorElement, editor, rootElement);
    }
    const focusKeyedDOM = getElementByKeyOrThrow(editor, this.focus.key);
    let nextFocusDOM = focusKeyedDOM;
    if (this.focus.type === 'text') {
      nextFocusDOM = $isTextNode(focusNode) ? $getDOMTextNode(focusNode, focusKeyedDOM, editor) : null;
    }
    if (this.dirty) {
      const anchorKeyedDOM = getElementByKeyOrThrow(editor, this.anchor.key);
      let nextAnchorDOM = anchorKeyedDOM;
      if (this.anchor.type === 'text') {
        const node = this.anchor.getNode();
        nextAnchorDOM = $isTextNode(node) ? $getDOMTextNode(node, anchorKeyedDOM, editor) : null;
      }
      if (nextAnchorDOM && nextFocusDOM) {
        setDOMSelectionBaseAndExtent(domSelection, nextAnchorDOM, this.anchor.offset, nextFocusDOM, this.focus.offset);
      }
    }
    // When focus sits at a TextNode boundary, pre-normalize the DOM
    // selection into the adjacent sibling's Text node so that the
    // native Selection.modify can cross inline-grid/flex spans (#7301).
    if (granularity === 'character' && $isTextNode(focusNode) && focusNode.isUnmergeable()) {
      const atBoundary = isBackward ? this.focus.offset === 0 : this.focus.offset === focusNode.getTextContentSize();
      if (atBoundary) {
        const sibling = $getSiblingCaret(focusNode, isBackward ? 'previous' : 'next').getNodeAtCaret();
        if ($isTextNode(sibling)) {
          if (collapse) {
            const sibKeyedDOM = editor.getElementByKey(sibling.getKey());
            const sibDOM = sibKeyedDOM ? $getDOMTextNode(sibling, sibKeyedDOM, editor) : null;
            if (sibDOM) {
              const sibOffset = isBackward ? sibDOM.length : 0;
              setDOMSelectionBaseAndExtent(domSelection, sibDOM, sibOffset, sibDOM, sibOffset);
            }
          } else {
            // For extend (used by deleteCharacter), native Selection.modify
            // cannot cross inline-grid span boundaries even after
            // pre-normalization. Set the Lexical selection directly and
            // return early to skip the native moveNativeSelection call.
            const sibLen = sibling.getTextContentSize();
            if (isBackward) {
              this.focus.set(sibling.__key, sibLen - 1, 'text');
            } else {
              this.focus.set(sibling.__key, 1, 'text');
            }
            this.dirty = true;
            return;
          }
        }
      }
    }
    // We use the DOM selection.modify API here to "tell" us what the selection
    // will be. We then use it to update the Lexical selection accordingly. This
    // is much more reliable than waiting for a beforeinput and using the ranges
    // from getTargetRanges(), and is also better than trying to do it ourselves
    // using Intl.Segmenter or other workarounds that struggle with word segments
    // and line segments (especially with word wrapping and non-Roman languages).
    moveNativeSelection(domSelection, alter, isBackward ? 'backward' : 'forward', granularity);
    // Guard against no ranges
    if (domSelection.rangeCount > 0) {
      // Inside a DOM shadow root getRangeAt(0) is retargeted to the host;
      // read the composed StaticRange (real nodes) where available.
      const composedRange = getComposedStaticRange(domSelection, editor._rootElement);
      const range = composedRange || domSelection.getRangeAt(0);
      // Apply the DOM selection to our Lexical selection.
      const anchorNode = this.anchor.getNode();
      const root = $isRootNode(anchorNode) ? anchorNode : $getNearestRootOrShadowRoot(anchorNode);
      this.applyDOMRange(range);
      this.dirty = true;
      if (!collapse) {
        $shrinkSelectionToRoot(this, isBackward, root);

        // Because a range works on start and end, we might need to flip
        // the anchor and focus points to match what the DOM has, not what
        // the range has specifically. Inside a shadow root anchorNode is
        // retargeted to the host, so use the standard Selection.direction.
        // If a future engine ships getComposedRanges without direction
        // this falls through to forward; backward fidelity is the known
        // limitation documented on getDOMSelectionPoints.
        const anchorIsAtRangeStart = composedRange ? domSelection.direction !== 'backward' : domSelection.anchorNode === range.startContainer && domSelection.anchorOffset === range.startOffset;
        if (!anchorIsAtRangeStart) {
          $swapPoints(this);
        }
      }
    }
    if (granularity === 'lineboundary') {
      $modifySelectionAroundDecoratorsAndBlocks(this, alter, isBackward, granularity, 'decorators');
    }
  }
  /**
   * Helper for handling forward character and word deletion that prevents element nodes
   * like a table, columns layout being destroyed
   *
   * @param anchor the anchor
   * @param anchorNode the anchor node in the selection
   * @param isBackward whether or not selection is backwards
   */
  forwardDeletion(anchor, anchorNode, isBackward) {
    if (!isBackward && (
    // Delete forward handle case
    anchor.type === 'element' && $isElementNode(anchorNode) && anchor.offset === anchorNode.getChildrenSize() || anchor.type === 'text' && anchor.offset === anchorNode.getTextContentSize())) {
      const parent = anchorNode.getParent();
      const nextSibling = anchorNode.getNextSibling() || (parent === null ? null : parent.getNextSibling());
      if ($isElementNode(nextSibling) && nextSibling.isShadowRoot()) {
        return true;
      }
    }
    return false;
  }

  /**
   * Performs one logical character deletion operation on the EditorState based on the current Selection.
   * Handles different node types.
   *
   * @param isBackward whether or not the selection is backwards.
   */
  deleteCharacter(isBackward) {
    const wasCollapsed = this.isCollapsed();
    if (this.isCollapsed()) {
      const anchor = this.anchor;
      let anchorNode = anchor.getNode();
      if (this.forwardDeletion(anchor, anchorNode, isBackward)) {
        return;
      }
      const direction = isBackward ? 'previous' : 'next';
      const initialCaret = $caretFromPoint(anchor, direction);
      const initialRange = $extendCaretToRange(initialCaret);
      if (initialRange.getTextSlices().every(slice => slice === null || slice.distance === 0)) {
        // There's no text in the direction of the deletion so we can explore our options
        let state = {
          type: 'initial'
        };
        for (const caret of initialRange.iterNodeCarets('shadowRoot')) {
          if ($isChildCaret(caret)) {
            if (caret.origin.isInline()) ; else if (caret.origin.isShadowRoot()) {
              if (state.type === 'merge-block') {
                break;
              }
              // Don't merge with a shadow root block
              if ($isElementNode(initialRange.anchor.origin) && initialRange.anchor.origin.isEmpty()) {
                // delete an empty paragraph like the DecoratorNode case
                const normCaret = $normalizeCaret(caret);
                $updateRangeSelectionFromCaretRange(this, $getCaretRange(normCaret, normCaret));
                initialRange.anchor.origin.remove();
              }
              return;
            } else if (state.type === 'merge-next-block' || state.type === 'merge-block') {
              // Keep descending ChildCaret to find which block to merge with
              state = {
                block: state.block,
                caret,
                type: 'merge-block'
              };
            }
          } else if (state.type === 'merge-block') {
            break;
          } else if ($isSiblingCaret(caret)) {
            if ($isElementNode(caret.origin)) {
              if (!caret.origin.isInline()) {
                state = {
                  block: caret.origin,
                  type: 'merge-next-block'
                };
              } else if (!caret.origin.isParentOf(initialRange.anchor.origin)) {
                break;
              }
              continue;
            } else if ($isDecoratorNode(caret.origin)) {
              if (caret.origin.isIsolated()) ; else if ($getSlotNames(caret.origin).length > 0) {
                // A slot-bearing decorator is removed only as a unit by an
                // explicit host deletion, never silently via backspace —
                // same policy as the merge-block branch below for
                // ElementNode-as-host. When the anchor is an empty
                // paragraph next to the host, drop the paragraph and
                // select the host (matches the shadow-root ElementNode
                // path at line 1951–1962 above); otherwise leave both in
                // place.
                if ($isElementNode(initialRange.anchor.origin) && initialRange.anchor.origin.isEmpty()) {
                  initialRange.anchor.origin.remove();
                  const nodeSelection = $createNodeSelection();
                  nodeSelection.add(caret.origin.getKey());
                  $setSelection(nodeSelection);
                }
              } else if (state.type === 'merge-next-block' && (caret.origin.isKeyboardSelectable() || !caret.origin.isInline()) && $isElementNode(initialRange.anchor.origin) && initialRange.anchor.origin.isEmpty()) {
                // If the anchor is an empty element that is adjacent to a
                // decorator then we remove the paragraph and select the
                // decorator
                initialRange.anchor.origin.remove();
                const nodeSelection = $createNodeSelection();
                nodeSelection.add(caret.origin.getKey());
                $setSelection(nodeSelection);
              } else {
                // When the anchor is not an empty element then the
                // adjacent decorator is removed
                caret.origin.remove();
              }
              // always stop when a decorator is encountered
              return;
            }
            break;
          }
        }
        if (state.type === 'merge-block') {
          // `block` is the anchor-side block; `caret.origin` is the
          // adjacent (previous-direction) block we descended into.
          const {
            caret,
            block
          } = state;
          // The cross-block merge below removes `block` (it merges into the
          // adjacent block). If `block` owns slots, that removal would discard
          // them, since slots are not children and are not carried over. Leave
          // the caret in place instead: a slot-bearing host is removed only as
          // a unit by an explicit host deletion, never silently via backspace.
          if ($getSlotNames(block).length > 0) {
            return;
          }
          // Empty adjacent block at the same nesting level: remove it
          // instead of merging, so the current block's type (e.g.
          // heading) survives. Limiting to a shared parent leaves
          // structural wrappers like a ListNode containing an empty
          // ListItemNode to the default cross-block merge — the
          // ListNode is not considered empty just because its only
          // child is.
          if (caret.origin.isEmpty() && !block.isEmpty() && caret.origin.getParent() === block.getParent()) {
            caret.origin.remove(true);
            return;
          }
          $updateRangeSelectionFromCaretRange(this, $getCaretRange(!caret.origin.isEmpty() && block.isEmpty() ? $rewindSiblingCaret($getSiblingCaret(block, caret.direction)) : initialRange.anchor, caret));
          return this.removeText();
        }
        // No text lies in the deletion direction and nothing in scope was
        // found to delete, so the caret sits at a slot edge. A slot value is
        // nested within its host's DOM, so the boundary lives only in the
        // model: the native caret measurement below would cross it and
        // select into the host. Stop when that edge is a slot value — the
        // slot link is a virtual shadow root, so this applies whether or not
        // the value is itself a shadow root; an ordinary (non-slotted)
        // shadow root keeps the native behavior.
        for (let node = anchor.getNode(); node !== null;) {
          if ($getSlotHostKey(node) !== null) {
            return;
          }
          if ($isElementNode(node) && node.isShadowRoot()) {
            break;
          }
          node = node.getParent();
        }
      }

      // Handle the deletion around decorators.
      const focus = this.focus;
      // Extend the selection in the model rather than with the native
      // modify('extend'), which would clobber the X11 PRIMARY selection.
      // See https://github.com/facebook/lexical/issues/8766
      $extendSelectionForDeletion(this, isBackward, 'character');
      if (!this.isCollapsed()) {
        const focusNode = focus.type === 'text' ? focus.getNode() : null;
        anchorNode = anchor.type === 'text' ? anchor.getNode() : null;
        if (focusNode !== null && focusNode.isSegmented()) {
          const offset = focus.offset;
          const textContentSize = focusNode.getTextContentSize();
          if (focusNode.is(anchorNode) || isBackward && offset !== textContentSize || !isBackward && offset !== 0) {
            $removeSegment(focusNode, isBackward, offset);
            return;
          }
        } else if (anchorNode !== null && anchorNode.isSegmented()) {
          const offset = anchor.offset;
          const textContentSize = anchorNode.getTextContentSize();
          if (anchorNode.is(focusNode) || isBackward && offset !== 0 || !isBackward && offset !== textContentSize) {
            $removeSegment(anchorNode, isBackward, offset);
            return;
          }
        }
        $updateCaretSelectionForUnicodeCharacter(this, isBackward);
      } else if (isBackward && anchor.offset === 0) {
        // Special handling around rich text nodes
        if ($collapseAtStart(this, anchor.getNode())) {
          return;
        }
      }
    }
    this.removeText();
    if (isBackward && !wasCollapsed && this.isCollapsed() && this.anchor.type === 'element' && this.anchor.offset === 0) {
      const anchorNode = this.anchor.getNode();
      if (anchorNode.isEmpty() && $isRootNode(anchorNode.getParent()) && anchorNode.getPreviousSibling() === null) {
        $collapseAtStart(this, anchorNode);
      }
      $ensureRootHasParagraph();
    }
  }

  /**
   * Performs one logical line deletion operation on the EditorState based on the current Selection.
   * Handles different node types.
   *
   * @param isBackward whether or not the selection is backwards.
   */
  deleteLine(isBackward) {
    // A decorator-host slot's DOM is relocated out of document order (the
    // host's React decorate() mounts the slot container wherever it wants),
    // so a deletion that starts inside one cannot be expressed by the
    // native range the browser hands us: forward delete at a slot edge
    // extends backward over the whole line, and the lineboundary extend
    // below resolves in the wrong direction too. Element-host slots
    // (e.g. a Card title) keep document order so the native path is
    // fine there. Narrow to the decorator-host case and defer to
    // deleteCharacter, which clamps at the slot boundary while still
    // handling in-slot character and paragraph deletion.
    const anchorSlotFrame = $getPointSlotFrame(this.anchor);
    if (anchorSlotFrame !== null && $isDecoratorNode($getSlotHost(anchorSlotFrame))) {
      if (!this.isCollapsed()) {
        this.focus.set(this.anchor.key, this.anchor.offset, this.anchor.type);
      }
      this.deleteCharacter(isBackward);
      return;
    }
    if (this.isCollapsed()) {
      $extendSelectionForDeletion(this, isBackward, 'lineboundary');
    }
    if (this.isCollapsed()) {
      // If the selection was already collapsed at the lineboundary,
      // use the deleteCharacter operation to handle all of the logic associated
      // with navigating through the parent element
      this.deleteCharacter(isBackward);
    } else {
      const anchorBlock = $findMatchingParent(this.anchor.getNode(), INTERNAL_$isBlock);
      const focusBlock = $findMatchingParent(this.focus.getNode(), INTERNAL_$isBlock);
      if (anchorBlock !== focusBlock) {
        this.focus.set(this.anchor.key, this.anchor.offset, this.anchor.type);
        this.deleteCharacter(isBackward);
      } else {
        this.removeText();
      }
    }
  }

  /**
   * Performs one logical word deletion operation on the EditorState based on the current Selection.
   * Handles different node types.
   *
   * @param isBackward whether or not the selection is backwards.
   */
  deleteWord(isBackward) {
    if (this.isCollapsed()) {
      const anchor = this.anchor;
      const anchorNode = anchor.getNode();
      if (this.forwardDeletion(anchor, anchorNode, isBackward)) {
        return;
      }
      $extendSelectionForDeletion(this, isBackward, 'word');
    }
    if (this.isCollapsed()) {
      // If the selection was already collapsed at the lineboundary,
      // use the deleteCharacter operation to handle all of the logic associated
      // with navigating through the parent element
      this.deleteCharacter(isBackward);
    } else {
      this.removeText();
    }
  }

  /**
   * Returns whether the Selection is "backwards", meaning the focus
   * logically precedes the anchor in the EditorState.
   * @returns true if the Selection is backwards, false otherwise.
   */
  isBackward() {
    const cached = this._cachedIsBackward;
    if (cached !== null) {
      return cached;
    }
    const isBackward = this.focus.isBefore(this.anchor);
    if (!isCurrentlyReadOnlyMode()) {
      this._cachedIsBackward = isBackward;
    }
    return isBackward;
  }
  getStartEndPoints() {
    return [this.anchor, this.focus];
  }
}
function $isNodeSelection(x) {
  return x instanceof NodeSelection;
}

/**
 * Applies a pure bitmask transform to every formattable node in the selection
 * in a single traversal, splitting the first and last TextNodes as necessary
 * so that only the selected text is affected. Each node receives exactly one
 * `setFormat(applyFormat(getFormat()))` (ElementNodes use their textFormat).
 *
 * @param selection - the selection whose nodes should be formatted.
 * @param applyFormat - maps a node's current 32-bit format to its new format.
 */
function $updateTextFormat(selection, applyFormat) {
  if ($isNodeSelection(selection)) {
    for (const node of selection.getNodes()) {
      if ($isInlineFormattable(node)) {
        node.setFormat(applyFormat(node.getFormat()));
      }
    }
    return;
  }
  if (selection.isCollapsed()) {
    selection.setFormat(applyFormat(selection.format));
    // When changing format, we should stop composition
    $setCompositionKey(null);
    return;
  }
  const selectedTextNodes = [];
  for (const node of selection.getNodes()) {
    if ($isTextNode(node)) {
      selectedTextNodes.push(node);
    } else if ($isElementNode(node)) {
      node.setTextFormat(applyFormat(node.getTextFormat()));
    } else if ($isInlineFormattable(node)) {
      node.setFormat(applyFormat(node.getFormat()));
    }
  }
  const selectedTextNodesLength = selectedTextNodes.length;
  if (selectedTextNodesLength === 0) {
    selection.setFormat(applyFormat(selection.format));
    // When changing format, we should stop composition
    $setCompositionKey(null);
    return;
  }
  const anchor = selection.anchor;
  const focus = selection.focus;
  const isBackward = selection.isBackward();
  const startPoint = isBackward ? focus : anchor;
  const endPoint = isBackward ? anchor : focus;
  let firstIndex = 0;
  let firstNode = selectedTextNodes[0];
  let startOffset = startPoint.type === 'element' ? 0 : startPoint.offset;

  // In case selection started at the end of text node use next text node
  if (startPoint.type === 'text' && startOffset === firstNode.getTextContentSize()) {
    firstIndex = 1;
    firstNode = selectedTextNodes[1];
    startOffset = 0;
  }
  if (firstNode == null) {
    return;
  }
  const lastIndex = selectedTextNodesLength - 1;
  let lastNode = selectedTextNodes[lastIndex];
  const endOffset = endPoint.type === 'text' ? endPoint.offset : lastNode.getTextContentSize();

  // Single node selected
  if (firstNode.is(lastNode)) {
    // No actual text is selected, so do nothing.
    if (startOffset === endOffset) {
      return;
    }
    const newFormat = applyFormat(firstNode.getFormat());
    // The entire node is selected or it is token, so just format it
    if ($isTokenOrSegmented(firstNode) || startOffset === 0 && endOffset === firstNode.getTextContentSize()) {
      firstNode.setFormat(newFormat);
    } else {
      // Node is partially selected, so split it into two nodes
      // and style the selected one.
      const splitNodes = firstNode.splitText(startOffset, endOffset);
      const replacement = startOffset === 0 ? splitNodes[0] : splitNodes[1];
      replacement.setFormat(newFormat);

      // Update selection only if starts/ends on text node
      if (startPoint.type === 'text') {
        startPoint.set(replacement.__key, 0, 'text');
      }
      if (endPoint.type === 'text') {
        endPoint.set(replacement.__key, endOffset - startOffset, 'text');
      }
    }
    selection.format = newFormat;
    return;
  }

  // Multiple nodes selected
  // The entire first node isn't selected, so split it
  if (startOffset !== 0 && !$isTokenOrSegmented(firstNode)) {
    [, firstNode] = firstNode.splitText(startOffset);
    startOffset = 0;
  }
  const firstNextFormat = applyFormat(firstNode.getFormat());
  firstNode.setFormat(firstNextFormat);
  const lastNextFormat = applyFormat(lastNode.getFormat());
  // If the offset is 0, it means no actual characters are selected,
  // so we skip formatting the last node altogether.
  if (endOffset > 0) {
    if (endOffset !== lastNode.getTextContentSize() && !$isTokenOrSegmented(lastNode)) {
      [lastNode] = lastNode.splitText(endOffset);
    }
    lastNode.setFormat(lastNextFormat);
  }

  // Process all text nodes in between
  for (let i = firstIndex + 1; i < lastIndex; i++) {
    const textNode = selectedTextNodes[i];
    textNode.setFormat(applyFormat(textNode.getFormat()));
  }

  // Update selection only if starts/ends on text node
  if (startPoint.type === 'text') {
    startPoint.set(firstNode.__key, startOffset, 'text');
  }
  if (endPoint.type === 'text') {
    endPoint.set(lastNode.__key, endOffset, 'text');
  }
  selection.format = firstNextFormat | lastNextFormat;
}

/**
 * Explicitly sets or unsets text formats on the selection. Unlike $formatText
 * which toggles based on the current selection state, this function sets each
 * specified format to the exact boolean value provided. Mutually exclusive
 * formats (subscript/superscript, lowercase/uppercase/capitalize) are
 * reconciled by {@link toggleTextFormatType}, with later entries winning when
 * the requested formats conflict.
 *
 * @param selection - the selection whose nodes should be formatted.
 * @param formats - a partial record mapping TextFormatType to boolean.
 */
function $setTextFormat(selection, formats) {
  const entries = [];
  for (const [type, value] of Object.entries(formats)) {
    if (typeof value === 'boolean') {
      entries.push([type, value]);
    }
  }
  if (entries.length === 0) {
    return;
  }
  $updateTextFormat(selection, format => {
    for (const [type, value] of entries) {
      format = toggleTextFormatType(format, type, value ? TEXT_TYPE_TO_FORMAT[type] : 0);
    }
    return format;
  });
}

/**
 * Applies the provided format to TextNodes and inline formattable nodes
 * (e.g. DecoratorTextNode) in the selection, splitting or merging TextNodes
 * as necessary and aligning all formattable nodes to the same target format.
 *
 * For RangeSelection the toggle direction is determined by the selection's
 * computed format (intersection of all text nodes) when no explicit alignment
 * is given. For NodeSelection each node is toggled independently when no
 * explicit alignment is given, since there is no TextNode to use as an
 * alignment reference.
 *
 * @param selection - the selection whose nodes should be formatted.
 * @param formatType - the format type to apply.
 * @param alignWithFormat - optional 32-bit bitmask to align with.
 */
function $formatText(selection, formatType, alignWithFormat = null) {
  const effectiveAlign = alignWithFormat === null && $isRangeSelection(selection) ? toggleTextFormatType(selection.format, formatType, null) : alignWithFormat;
  $updateTextFormat(selection, format => toggleTextFormatType(format, formatType, effectiveAlign));
}
function getCharacterOffset(point) {
  const offset = point.offset;
  if (point.type === 'text') {
    return offset;
  }
  const parent = point.getNode();
  return offset === parent.getChildrenSize() ? parent.getTextContent().length : 0;
}
function $getCharacterOffsets(selection) {
  const anchorAndFocus = selection.getStartEndPoints();
  if (anchorAndFocus === null) {
    return [0, 0];
  }
  const [anchor, focus] = anchorAndFocus;
  if (anchor.type === 'element' && focus.type === 'element' && anchor.key === focus.key && anchor.offset === focus.offset) {
    return [0, 0];
  }
  return [getCharacterOffset(anchor), getCharacterOffset(focus)];
}
function $collapseAtStart(selection, startNode) {
  for (let node = startNode; node; node = node.getParent()) {
    if ($isElementNode(node)) {
      if (node.collapseAtStart(selection)) {
        return true;
      }
      if ($isRootOrShadowRoot(node)) {
        break;
      }
    }
    if (node.getPreviousSibling()) {
      break;
    }
  }
  return false;
}
function $swapPoints(selection) {
  const focus = selection.focus;
  const anchor = selection.anchor;
  const anchorKey = anchor.key;
  const anchorOffset = anchor.offset;
  const anchorType = anchor.type;
  anchor.set(focus.key, focus.offset, focus.type, true);
  focus.set(anchorKey, anchorOffset, anchorType, true);
}
function moveNativeSelection(domSelection, alter, direction, granularity) {
  // Selection.modify() method applies a change to the current selection or cursor position,
  // but is still non-standard in some browsers.
  domSelection.modify(alter, direction, granularity);
}

/**
 * Validate that the selection respects `root` (the nearest root or shadow
 * root): if any selected node lies outside of it, shrink the selection to the
 * valid edge in the given direction. The valid node check is a safeguard
 * against an invalid selection, for which getNodes() returns an empty array.
 *
 * @returns true if the selection was shrunk
 */
function $shrinkSelectionToRoot(selection, isBackward, root) {
  const nodes = selection.getNodes();
  const validNodes = nodes.filter(node => $hasAncestor(node, root));
  if (validNodes.length === 0 || validNodes.length === nodes.length) {
    return false;
  }
  const edgeNode = isBackward ? validNodes[0] : validNodes[validNodes.length - 1];
  const edgeElement = $isElementNode(edgeNode) ? edgeNode : edgeNode.getParentOrThrow();
  if (isBackward) {
    edgeElement.selectStart();
  } else {
    edgeElement.selectEnd();
  }
  return true;
}

/**
 * Extend a collapsed selection by one unit (`character`, `word` or
 * `lineboundary`) in the deletion direction without ever creating a
 * non-collapsed DOM selection.
 *
 * On Linux/X11, browsers propagate any non-collapsed DOM selection made
 * during a user gesture to the PRIMARY selection (the middle-click paste
 * buffer), so a deletion must never pass through a transient non-collapsed
 * DOM selection or every Backspace/Delete overwrites the user's paste
 * buffer (https://github.com/facebook/lexical/issues/8766). A collapsed
 * caret never takes PRIMARY ownership, so the DOM caret is moved with the
 * native `modify('move')` to measure where the engine places the unit
 * boundary, and the `[original .. landed]` range is constructed in the
 * model only. `applyDOMRange` reads just the range's boundary points (it
 * never touches the DOM selection), giving the same point resolution,
 * decorator pre/post handling, shadow-root shrink validation and
 * anchor/focus orientation as a native selection extension would, while
 * the DOM selection is only ever collapsed.
 *
 * When the measurement is not possible — no DOM selection or no
 * `Selection.modify` (headless environments can polyfill it), or an
 * unresolvable anchor — the selection is left collapsed, so the deletion
 * becomes a no-op for that keystroke.
 */
function $extendSelectionForDeletion(selection, isBackward, granularity) {
  // Decorator/block handling, resolved in the model exactly as modify() does.
  if ($modifySelectionAroundDecoratorsAndBlocks(selection, 'extend', isBackward, granularity)) {
    return;
  }
  const editor = getActiveEditor();
  const domSelection = getDOMSelection(getWindow(editor));
  if (!domSelection || typeof domSelection.modify !== 'function') {
    return;
  }
  const blockCursorElement = editor._blockCursorElement;
  const rootElement = editor._rootElement;
  const anchor = selection.anchor;
  const focusNode = selection.focus.getNode();
  // A block cursor element left in the DOM would corrupt element offsets.
  if (rootElement !== null && blockCursorElement !== null && $isElementNode(focusNode) && !focusNode.isInline() && !focusNode.canBeEmpty()) {
    removeDOMBlockCursorElement(blockCursorElement, editor, rootElement);
  }
  const $resolvePointDOM = point => {
    const pointNode = point.getNode();
    const keyedDOM = editor.getElementByKey(point.key);
    return keyedDOM !== null && point.type === 'text' && $isTextNode(pointNode) ? $getDOMTextNode(pointNode, keyedDOM, editor) : keyedDOM;
  };
  // Resolve the model anchor to a DOM position (one end of the final range).
  const anchorNode = anchor.getNode();
  const anchorDOM = $resolvePointDOM(anchor);
  if (anchorDOM === null) {
    return;
  }
  const anchorOffset = anchor.offset;
  // Measure from the FOCUS: the decorator/block pre-pass above may have
  // hopped the model focus past an inline decorator and returned false — the
  // shape where native caret movement is unreliable (it can refuse to move a
  // caret adjacent to contenteditable=false content). modify() runs the
  // native extend from the extent (the hopped focus); do the same here. For
  // an untouched collapsed selection the focus is the anchor.
  const wasCollapsed = selection.isCollapsed();
  const focus = selection.focus;
  const focusDOM = wasCollapsed ? anchorDOM : $resolvePointDOM(focus);
  if (focusDOM === null) {
    return;
  }
  const focusOffset = focus.offset;
  // Sync a COLLAPSED DOM caret at the measurement origin (base === extent),
  // then move it by one unit to measure the engine's boundary. Neither
  // operation touches PRIMARY.
  setDOMSelectionBaseAndExtent(domSelection, focusDOM, focusOffset, focusDOM, focusOffset);
  moveNativeSelection(domSelection, 'move', isBackward ? 'backward' : 'forward', granularity);
  if (domSelection.rangeCount === 0) {
    return;
  }
  // Inside a DOM shadow root getRangeAt(0) is retargeted to the host; read the
  // composed StaticRange (real nodes) where available. After a 'move' the DOM
  // selection is collapsed, so start === end === the landed caret.
  const landedRange = getComposedStaticRange(domSelection, rootElement) || domSelection.getRangeAt(0);
  const landedContainer = landedRange.startContainer;
  const landedOffset = landedRange.startOffset;
  // Native 'move' cannot cross inline-grid/flex span boundaries (#7301).
  // When at the deletion-side edge of an unmergeable TextNode, extend into
  // the adjacent sibling directly instead of relying on the native result.
  if (wasCollapsed && granularity === 'character' && anchor.type === 'text' && $isTextNode(anchorNode) && anchorNode.isUnmergeable()) {
    const boundaryOffset = isBackward ? 0 : anchorNode.getTextContentSize();
    if (anchorOffset === boundaryOffset) {
      const sibling = $getSiblingCaret(anchorNode, isBackward ? 'previous' : 'next').getNodeAtCaret();
      if ($isTextNode(sibling)) {
        const sibOffset = isBackward ? sibling.getTextContentSize() - 1 : 1;
        selection.focus.set(sibling.__key, sibOffset, 'text');
        selection.dirty = true;
        return;
      }
    }
  }
  // In-node character deletion (the common case): keep the focus in the
  // anchor's own text node. A native 'move' reports a caret that lands on a
  // text-node boundary as a position in the *adjacent* node, and that
  // representation changes how a later insertion (e.g. at a format or
  // keyword boundary) resolves. When the move lands inside the anchor node
  // its offset is used directly; landing on the node's edge is clamped to
  // that edge. Word/line deletions legitimately span nodes, so they use the
  // general path below.
  if (wasCollapsed && granularity === 'character' && anchor.type === 'text') {
    // The deletion-side edge of the anchor's text.
    const edgeOffset = isBackward ? 0 : anchorNode.getTextContentSize();
    const clampedOffset = landedContainer === anchorDOM ? landedOffset : anchorOffset !== edgeOffset ? edgeOffset : -1;
    if (clampedOffset >= 0) {
      if (clampedOffset !== anchorOffset) {
        selection.focus.set(anchor.key, clampedOffset, 'text');
        selection.dirty = true;
      }
      return;
    }
  }
  // General path: reconstruct, in document order, the [original .. landed]
  // range a native extend would have produced. applyDOMRange only reads these
  // four boundary properties into the model, so a plain StaticRange-shaped
  // object is sufficient (and avoids a StaticRange constructor dependency).
  const [startContainer, startOffset, endContainer, endOffset] = isBackward ? [landedContainer, landedOffset, anchorDOM, anchorOffset] : [anchorDOM, anchorOffset, landedContainer, landedOffset];
  const root = $isRootNode(anchorNode) ? anchorNode : $getNearestRootOrShadowRoot(anchorNode);
  selection.applyDOMRange({
    collapsed: false,
    endContainer,
    endOffset,
    startContainer,
    startOffset
  });
  selection.dirty = true;
  if (!$shrinkSelectionToRoot(selection, isBackward, root) && isBackward) {
    // applyDOMRange set anchor = range start (the landed point); the deletion
    // anchor must stay at the original caret, so restore that orientation.
    $swapPoints(selection);
  }
  if (granularity === 'lineboundary') {
    $modifySelectionAroundDecoratorsAndBlocks(selection, 'extend', isBackward, granularity, 'decorators');
  }
}

/**
 * Called by `RangeSelection.deleteCharacter` to determine if
 * `$extendSelectionForDeletion` extended the selection further
 * than a user would expect for that operation.
 *
 * A short(?) JavaScript string vs. Unicode primer:
 *
 * Strings in JavaScript use an UTF-16 encoding, and the offsets into a
 * string are based on those UTF-16 *code units*. This is basically a
 * historical mistake (though logical at that time, decades ago), but
 * can never really be fixed for compatibility reasons.
 *
 * In Unicode, a *code point* is the combination of one or more *code units*.
 * and the range of a *code point* can fit into 21 bits.
 *
 * Every valid *code point* can be represented with one or two
 * *UTF-16 code units*. One unit is used when the code point is in the
 * Basic Multilingual Plane (BMP) and is `< 0xFFFF`. Anything outside
 * of that plane is encoded with a *surrogate pair* of *code units* and
 * `/[\uD800-\uDBFF][\uDC00-\uDFFF]/` is a regex that you could use to
 * find any valid *surrogate pair*. As far as Unicode is concerned, these
 * pairs represent a single *code point*, but in JavaScript, these pairs
 * have a length of 2 (`pair.charCodeAt(n)` is really returning a
 * UTF-16 *code unit*, not a unicode *code point*). It is possible to request
 * a *code point* with `pair.codePointAt(0)` and enumerate code points
 * in a string with `[...string]` but the offsets we work with, and
 * the string length, are based in *code units* so that functionality
 * is unfortunately not very useful here.
 *
 * This only gets us as far as *code points*. We now know that we must
 * consider that each *code point* can have a length of 1 or 2 in JavaScript
 * string distance. It gets even trickier because the visual representation
 * of a character is a *grapheme* (approximately what the user thinks of
 * as a character). A *grapheme* is one or more *code points*, and can
 * essentially be arbitrarily long, as there are many ways to combine
 * them.
 *
 * The native caret measurement has already extended our selection by one
 * *grapheme* in the direction we want to delete. Sounds great, it's done
 * a lot of awfully tricky work for us because this functionality has only
 * recently become available in JavaScript via `Intl.Segmenter`. The
 * problem is that in many cases the expected behavior of backspace or
 * delete is *not always to delete a whole grapheme*. In some languages
 * it's always expected that backspace ought to delete one code point, not the
 * whole grapheme. In other situations such as emoji that use variation
 * selectors you *do* want to delete the whole *grapheme*.
 *
 * In a few situations the behavior is even application dependent, such as
 * with latin languages where you have multiple ways to represent the same
 * character visually (e.g. a letter with an accent in one code point, or a
 * letter followed by a combining mark in a second code point); some apps will
 * delete the whole grapheme and others will delete only the combining mark,
 * probably based on whether they perform some sort of *normalization* on their
 * input to ensure that only one form is used when two sequences of code points
 * can represent the same visual character. Lexical currently chooses not
 * to perform any normalization so this type of combining marks will be
 * deleted as a *code point* without deleting the whole *grapheme*.
 *
 * See also:
 * https://www.unicode.org/versions/Unicode16.0.0/core-spec/chapter-2/#G25564
 * https://www.unicode.org/versions/Unicode16.0.0/core-spec/chapter-3/#G30602
 * https://www.unicode.org/versions/Unicode16.0.0/core-spec/chapter-3/#G49537
 * https://mathiasbynens.be/notes/javascript-unicode
 */
function $updateCaretSelectionForUnicodeCharacter(selection, isBackward) {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();
  if (anchorNode === focusNode && anchor.type === 'text' && focus.type === 'text') {
    // Handling of multibyte characters
    const anchorOffset = anchor.offset;
    const focusOffset = focus.offset;
    const isBefore = anchorOffset < focusOffset;
    const startOffset = isBefore ? anchorOffset : focusOffset;
    const endOffset = isBefore ? focusOffset : anchorOffset;
    const characterOffset = endOffset - 1;
    if (startOffset !== characterOffset) {
      const text = anchorNode.getTextContent().slice(startOffset, endOffset);
      if (shouldDeleteExactlyOneCodeUnit(text)) {
        if (isBackward) {
          focus.set(focus.key, characterOffset, focus.type);
        } else {
          anchor.set(anchor.key, characterOffset, anchor.type);
        }
      }
    }
  }
}
function shouldDeleteExactlyOneCodeUnit(text) {
  {
    if (!(text.length > 1)) {
      formatDevErrorMessage(`shouldDeleteExactlyOneCodeUnit: expecting to be called only with sequences of two or more code units`);
    }
  }
  return !(doesContainSurrogatePair(text) || doesContainEmoji(text));
}

/**
 * Given the wall of text in $updateCaretSelectionForUnicodeCharacter, you'd
 * think that the solution might be complex, but the only currently known
 * cases given the above constraints where we want to delete a whole grapheme
 * are when emoji is involved. Since ES6 we can use unicode character classes
 * in regexp which makes this simple.
 *
 * It may make sense to add to this heuristic in the future if other
 * edge cases are discovered, which is why detailed notes remain.
 *
 * This is implemented with runtime feature detection and will always
 * return false on pre-2020 platforms that do not have unicode character
 * class support.
 */
const doesContainEmoji = (() => {
  try {
    const re = new RegExp('\\p{Emoji}', 'u');
    const test = re.test.bind(re);
    // Sanity check a few emoji to make sure the regexp was parsed
    // and works correctly. Any one of these should be sufficient,
    // but they're cheap and it only runs once.
    if (
    // Emoji in the BMP (heart) with variation selector
    test('\u2764\ufe0f') &&
    // Emoji in the BMP (#) with variation selector
    test('#\ufe0f\u20e3') &&
    // Emoji outside the BMP (thumbs up) that is encoded with a surrogate pair
    test('\ud83d\udc4d')) {
      return test;
    }
  } catch (_e) {
    // SyntaxError
  }
  // fallback, surrogate pair already checked
  return () => false;
})();
function $removeSegment(node, isBackward, offset) {
  const textNode = node;
  const textContent = textNode.getTextContent();
  const split = textContent.split(/(?=\s)/g);
  const splitLength = split.length;
  let segmentOffset = 0;
  let restoreOffset = 0;
  for (let i = 0; i < splitLength; i++) {
    const text = split[i];
    const isLast = i === splitLength - 1;
    restoreOffset = segmentOffset;
    segmentOffset += text.length;
    if (isBackward && segmentOffset === offset || segmentOffset > offset || isLast) {
      split.splice(i, 1);
      if (isLast) {
        restoreOffset = undefined;
      }
      break;
    }
  }
  const nextTextContent = split.join('').trim();
  if (nextTextContent === '') {
    textNode.remove();
  } else {
    textNode.setTextContent(nextTextContent);
    textNode.select(restoreOffset, restoreOffset);
  }
}
function shouldResolveAncestor(resolvedElement, resolvedOffset, lastPoint) {
  const parent = resolvedElement.getParent();
  return lastPoint === null || parent === null || !parent.canBeEmpty() || parent !== lastPoint.getNode();
}
function $internalResolveSelectionPoint(dom, offset, lastPoint, editor) {
  let resolvedOffset = offset;
  let resolvedNode;
  // True when the DOM position is not directly representable in the
  // Lexical tree (e.g. the caret landed inside a void/empty element
  // such as <col> or in another unmanaged subtree) and the resolution
  // had to walk up to a Lexical ancestor. The caller marks the
  // resulting selection dirty so the reconciler writes a valid DOM
  // caret back instead of leaving the user's cursor "stuck" inside
  // unmanaged DOM.
  let dirty = false;
  // If we have selection on an element, we will
  // need to figure out (using the offset) what text
  // node should be selected.

  if (isHTMLElement(dom)) {
    // Resolve element to a ElementNode, or TextNode, or null
    let moveSelectionToEnd = false;
    // Given we're moving selection to another node, selection is
    // definitely dirty.
    // We use the anchor to find which child node to select
    const childNodes = dom.childNodes;
    const childNodesLength = childNodes.length;
    const blockCursorElement = editor._blockCursorElement;
    // If the anchor is the same as length, then this means we
    // need to select the very last text node.
    if (resolvedOffset === childNodesLength && childNodesLength > 0) {
      moveSelectionToEnd = true;
      resolvedOffset = childNodesLength - 1;
    }
    if (getNodeKeyFromDOMNode(dom, editor) === undefined && !isDOMCapturingSelection(dom, editor)) {
      // The DOM caret is sitting on a node that has no Lexical key
      // (e.g. <col> inside an unmanaged <colgroup>, or any unmanaged
      // scaffolding around a DOMSlot — wrap elements, contenteditable=false
      // labels, badges, etc.). Resolution will walk up to find a Lexical
      // ancestor below, so the resulting Lexical position will not
      // correspond to where the DOM caret currently is. Mark the
      // selection dirty so the reconciler writes a valid DOM caret back
      // at the resolved Lexical position.
      //
      // Exclusions split across the two guard clauses:
      //  - The first clause (`key !== undefined`) covers any DOM node
      //    with a `__lexicalKey_*` attribute — Lexical-managed elements
      //    and the editor root (stashed in `resetEditor`).
      //  - `isDOMCapturingSelection` covers DecoratorNode subtrees (which
      //    own their own DOM) and subtrees marked via
      //    `setDOMUnmanaged(dom, {captureSelection: true})` —
      //    extension-owned widgets that keep a native caret.
      //
      // Void elements that ARE Lexical nodes (LineBreakNode <br>,
      // empty decorator containers, etc.) have keys, so this check
      // leaves their existing resolution-to-parent behavior alone.
      dirty = true;
    }
    let childDOM = childNodes[resolvedOffset];
    let hasBlockCursor = false;
    if (childDOM === blockCursorElement) {
      childDOM = childNodes[resolvedOffset + 1];
      hasBlockCursor = true;
    } else if (blockCursorElement !== null) {
      const blockCursorElementParent = blockCursorElement.parentNode;
      if (dom === blockCursorElementParent) {
        const blockCursorOffset = Array.prototype.indexOf.call(blockCursorElementParent.children, blockCursorElement);
        if (offset > blockCursorOffset) {
          resolvedOffset--;
        }
      }
    }
    resolvedNode = $getNodeFromDOM(childDOM);
    if ($isTextNode(resolvedNode)) {
      resolvedOffset = $getTextNodeOffset(resolvedNode, moveSelectionToEnd ? 'next' : 'previous');
    } else {
      let resolvedElement = $getNodeFromDOM(dom);
      // Ensure resolvedElement is actually a element.
      if (resolvedElement === null) {
        return null;
      }
      if ($isElementNode(resolvedElement)) {
        const elementDOM = editor.getElementByKey(resolvedElement.getKey());
        if (!(elementDOM !== null)) {
          formatDevErrorMessage(`$internalResolveSelectionPoint: node in DOM but not keyToDOMMap`);
        }
        const slot = $getDOMSlot(resolvedElement, elementDOM, editor);
        [resolvedElement, resolvedOffset] = slot.resolveChildIndex(resolvedElement, elementDOM, dom, offset);
        // This is just a typescript workaround, it is true but lost due to mutability
        if (!$isElementNode(resolvedElement)) {
          formatDevErrorMessage(`$internalResolveSelectionPoint: resolvedElement is not an ElementNode`);
        }
        if (moveSelectionToEnd && resolvedOffset >= resolvedElement.getChildrenSize()) {
          resolvedOffset = Math.max(0, resolvedElement.getChildrenSize() - 1);
        }
        let child = resolvedElement.getChildAtIndex(resolvedOffset);
        if ($isElementNode(child) && shouldResolveAncestor(child, resolvedOffset, lastPoint)) {
          const descendant = moveSelectionToEnd ? child.getLastDescendant() : child.getFirstDescendant();
          if (descendant === null) {
            resolvedElement = child;
          } else {
            child = descendant;
            resolvedElement = $isElementNode(child) ? child : child.getParentOrThrow();
          }
          resolvedOffset = 0;
        }
        if ($isTextNode(child)) {
          resolvedNode = child;
          resolvedElement = null;
          resolvedOffset = $getTextNodeOffset(child, moveSelectionToEnd ? 'next' : 'previous');
        } else if (child !== resolvedElement && moveSelectionToEnd && !hasBlockCursor) {
          if (!$isElementNode(resolvedElement)) {
            formatDevErrorMessage(`invariant`);
          }
          resolvedOffset = Math.min(resolvedElement.getChildrenSize(), resolvedOffset + 1);
        }
      } else {
        // A slot value is parentless — it links up to its host via
        // `__slotHost` and behaves like a shadow root. Anchor the caret
        // adjacent to the host (a normal child of its parent), since the slot
        // value itself has no parent to anchor in. Non-slotted leaves anchor
        // in their own parent as before.
        const slotHost = $getSlotHost(resolvedElement);
        const anchorNode = slotHost !== null ? slotHost : resolvedElement;
        const index = anchorNode.getIndexWithinParent();
        // For wrap patterns (slot exposes an inner content element via
        // `withElement`) defer to `slot.resolveLeafPosition` so the
        // wrap's structure determines "before vs after". For bare leaf
        // DOM we preserve the historical rule: only a DecoratorNode at
        // DOM offset 0 resolves to "before"; everything else (including
        // bare LineBreakNode) resolves to "after".
        const elementDOM = editor.getElementByKey(resolvedElement.getKey());
        let position = 'after';
        if (elementDOM !== null && $getNodeFromDOM(dom) === resolvedElement) {
          const slot = $getDOMSlot(resolvedElement, elementDOM, editor);
          if (slot.element !== elementDOM) {
            position = slot.resolveLeafPosition(elementDOM, dom, offset);
          } else if (offset === 0 && $isDecoratorNode(resolvedElement)) {
            position = 'before';
          }
        }
        resolvedOffset = position === 'before' ? index : index + 1;
        resolvedElement = anchorNode.getParentOrThrow();
      }
      if ($isElementNode(resolvedElement)) {
        return [$createPoint(resolvedElement.__key, resolvedOffset, 'element'), dirty];
      }
    }
  } else {
    // TextNode or null
    resolvedNode = $getNodeFromDOM(dom);
  }
  if (!$isTextNode(resolvedNode)) {
    return null;
  }
  return [$createPoint(resolvedNode.__key, $getTextNodeOffset(resolvedNode, resolvedOffset, 'clamp'), 'text'), dirty];
}
function resolveSelectionPointOnBoundary(point, isBackward, isCollapsed) {
  const offset = point.offset;
  const node = point.getNode();
  if (offset === 0) {
    const prevSibling = node.getPreviousSibling();
    const parent = node.getParent();
    if (!isBackward) {
      if ($isElementNode(prevSibling) && !isCollapsed && prevSibling.isInline()) {
        point.set(prevSibling.__key, prevSibling.getChildrenSize(), 'element');
      } else if ($isTextNode(prevSibling) && !node.isUnmergeable()) {
        point.set(prevSibling.__key, prevSibling.getTextContent().length, 'text');
      }
    } else if ((isCollapsed || !isBackward) && prevSibling === null && $isElementNode(parent) && parent.isInline()) {
      const parentSibling = parent.getPreviousSibling();
      if ($isTextNode(parentSibling)) {
        point.set(parentSibling.__key, parentSibling.getTextContent().length, 'text');
      }
    }
  } else if (offset === node.getTextContent().length) {
    const nextSibling = node.getNextSibling();
    const parent = node.getParent();
    if (isBackward && $isElementNode(nextSibling) && nextSibling.isInline()) {
      point.set(nextSibling.__key, 0, 'element');
    } else if ((isCollapsed || isBackward) && nextSibling === null && $isElementNode(parent) && parent.isInline() && !parent.canInsertTextAfter() && parent.getTextContentSize() > 1) {
      const parentSibling = parent.getNextSibling();
      if ($isTextNode(parentSibling)) {
        point.set(parentSibling.__key, 0, 'text');
      }
    }
  }
}
function $normalizeSelectionPointsForBoundaries(anchor, focus, lastSelection) {
  if (anchor.type === 'text' && focus.type === 'text') {
    const isBackward = anchor.isBefore(focus);
    const isCollapsed = anchor.is(focus);

    // Attempt to normalize the offset to the previous sibling if we're at the
    // start of a text node and the sibling is a text node or inline element.
    resolveSelectionPointOnBoundary(anchor, isBackward, isCollapsed);
    resolveSelectionPointOnBoundary(focus, !isBackward, isCollapsed);
    if (isCollapsed) {
      focus.set(anchor.key, anchor.offset, anchor.type);
    }
  }
}

// @experimental named-slots. The innermost slot-root ancestor of a point
// (a node whose up-pointer is __slotHost, not __parent), or null when the
// point is not inside any slot. Walking via getParent() naturally stops at a
// slot root because a slotted node's __parent is null. Non-slot trees have
// __slotHost === null everywhere, so this always returns null there.
function $getPointSlotFrame(point) {
  const node = $getNodeByKey(point.key);
  return node === null ? null : $getSlotFrame(node);
}

// @experimental named-slots. Content order (slots-first) of a slot-straddling
// pair, computed from the model alone. The caret comparison ($comparePoint…)
// throws across a slot boundary (a slotted node has no common ancestor through
// __parent), so each side that sits in a slot is reduced to its host — a
// main-tree node — and the hosts are compared with the linked-list isBefore.
// A slotted point sorts at its host's leading edge (slots-first). Only called
// for a confirmed straddle (the frames differ).
function $slotStraddleFocusAfterAnchor(anchorPoint, focusPoint, anchorFrame, focusFrame) {
  if (anchorFrame !== null && focusFrame !== null) {
    const anchorHost = $getSlotHost(anchorFrame);
    const focusHost = $getSlotHost(focusFrame);
    if (anchorHost !== null && anchorHost.is(focusHost)) {
      // Two slots of the same host: slot-map iteration is insertion order,
      // which is the order the reconciler renders them (content order).
      for (const slotKey of $getSlotMap(anchorHost).values()) {
        if (slotKey === anchorFrame.getKey()) {
          return true;
        }
        if (slotKey === focusFrame.getKey()) {
          return false;
        }
      }
      return true;
    }
    return anchorHost !== null && focusHost !== null ? anchorHost.isBefore(focusHost) : true;
  }
  if (anchorFrame !== null) {
    const anchorHost = $getSlotHost(anchorFrame);
    const focusNode = $getNodeByKey(focusPoint.key);
    if (anchorHost === null || focusNode === null) {
      return true;
    }
    // Focus within the host's regular children sits after the slot content.
    if (anchorHost.is(focusNode) || anchorHost.isParentOf(focusNode)) {
      return true;
    }
    return anchorHost.isBefore(focusNode);
  }
  const focusHost = $getSlotHost(focusFrame);
  const anchorNode = $getNodeByKey(anchorPoint.key);
  if (focusHost === null || anchorNode === null) {
    return false;
  }
  // Anchor within the host's regular children sits after the slot (focus).
  if (focusHost.is(anchorNode) || focusHost.isParentOf(anchorNode)) {
    return false;
  }
  return anchorNode.isBefore(focusHost);
}

// @experimental named-slots. Slots are shadow-root-isolated: a RangeSelection
// must not straddle a slot boundary. When the anchor and focus are in
// different frames, clamp the focus into the anchor's frame (anchor-frame
// rule), keeping keyboard/mouse/programmatic results consistent. The direction
// is resolved lazily (resolveFocusAfterAnchor) only on an actual straddle,
// because the DOM-read and programmatic callers determine it differently (DOM
// order vs the model comparator) and the model comparator is invalid until a
// straddle is confirmed. Returns true when it mutated the focus point. No-op
// (returns false) when both points share a frame — including the all-null case
// in non-slot trees, so behavior there is unchanged.
function $clampSelectionPointsToSlotFrame(anchorPoint, focusPoint, resolveFocusAfterAnchor) {
  const anchorFrame = $getPointSlotFrame(anchorPoint);
  const focusFrame = $getPointSlotFrame(focusPoint);
  if (anchorFrame === focusFrame || anchorFrame !== null && focusFrame !== null && anchorFrame.is(focusFrame)) {
    return false;
  }
  const focusAfterAnchor = resolveFocusAfterAnchor(anchorFrame, focusFrame);
  if (anchorFrame !== null) {
    // Anchor sits inside a slot: pull the focus to that slot's edge (the far
    // edge in the drag direction), leaving a contained partial selection.
    // Slot→slot drags hit this same branch — no host escalation.
    if ($isElementNode(anchorFrame)) {
      focusPoint.set(anchorFrame.getKey(), focusAfterAnchor ? anchorFrame.getChildrenSize() : 0, 'element');
    } else {
      focusPoint.set(anchorFrame.getKey(), focusAfterAnchor ? anchorFrame.getTextContentSize() : 0, 'text');
    }
    return true;
  }
  // Anchor sits outside, focus inside a slot: push the focus past the host
  // that owns the slot so the host is wholly contained.
  const host = $getSlotHost(focusFrame);
  if (host === null) {
    return false;
  }
  const hostParent = host.getParent();
  if (hostParent === null) {
    return false;
  }
  const hostIndex = host.getIndexWithinParent();
  focusPoint.set(hostParent.getKey(), focusAfterAnchor ? hostIndex + 1 : hostIndex, 'element');
  return true;
}

/**
 * Programmatic counterpart of the DOM-read clamp: applied when a
 * RangeSelection is committed via $setSelection so an API-built selection
 * cannot straddle a slot boundary either. Direction comes from the model
 * comparator (slots-first content order), not the caret system — a
 * straddling pair has no common ancestor through __parent, so the caret
 * comparison would throw (that integration is the deferred caret-slot work),
 * and not from the DOM either, since $setSelection also runs in headless
 * mode where there is no DOM. Marks the selection dirty when it mutates a
 * point. No-op for non-slot trees (both frames null), evaluated before any
 * direction work, so non-slot and headless callers are unaffected.
 *
 * @experimental named-slots
 * @internal
 */
function $clampRangeSelectionToSlotFrame(selection) {
  const clamped = $clampSelectionPointsToSlotFrame(selection.anchor, selection.focus, (anchorFrame, focusFrame) => $slotStraddleFocusAfterAnchor(selection.anchor, selection.focus, anchorFrame, focusFrame));
  if (clamped) {
    selection.dirty = true;
  }
  return clamped;
}
function $internalResolveSelectionPoints(anchorDOM, anchorOffset, focusDOM, focusOffset, editor, lastSelection) {
  if (anchorDOM === null || focusDOM === null || !isSelectionWithinEditor(editor, anchorDOM, focusDOM)) {
    return null;
  }
  const resolvedAnchor = $internalResolveSelectionPoint(anchorDOM, anchorOffset, $isRangeSelection(lastSelection) ? lastSelection.anchor : null, editor);
  if (resolvedAnchor === null) {
    return null;
  }
  const resolvedFocus = $internalResolveSelectionPoint(focusDOM, focusOffset, $isRangeSelection(lastSelection) ? lastSelection.focus : null, editor);
  if (resolvedFocus === null) {
    return null;
  }
  const [resolvedAnchorPoint, anchorDirty] = resolvedAnchor;
  const [resolvedFocusPoint, focusDirty] = resolvedFocus;
  {
    $validatePoint('anchor', resolvedAnchorPoint);
    $validatePoint('focus', resolvedFocusPoint);
  }
  if (resolvedAnchorPoint.type === 'element' && resolvedFocusPoint.type === 'element') {
    const anchorNode = $getNodeFromDOM(anchorDOM);
    const focusNode = $getNodeFromDOM(focusDOM);
    // Ensure if we're selecting the content of a decorator that we
    // return null for this point, as it's not in the controlled scope
    // of Lexical.
    if ($isDecoratorNode(anchorNode) && $isDecoratorNode(focusNode)) {
      return null;
    }
  }

  // @experimental named-slots. Clamp a slot-straddling drag into the
  // anchor's frame before normalization cleans up the resulting edge points.
  // The DOM order of the resolved nodes gives the drag direction (slot DOM is
  // slots-first, so DOM order matches content order). Gated on `_slotsUsed`
  // so editors that never slot anything skip the walk, mirroring the
  // commit-time and `$setSelection` clamps.
  const slotClamped = editor._slotsUsed && $clampSelectionPointsToSlotFrame(resolvedAnchorPoint, resolvedFocusPoint, () => (anchorDOM.compareDocumentPosition(focusDOM) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0);

  // Handle normalization of selection when it is at the boundaries.
  $normalizeSelectionPointsForBoundaries(resolvedAnchorPoint, resolvedFocusPoint);
  return [resolvedAnchorPoint, resolvedFocusPoint, anchorDirty || focusDirty || slotClamped];
}
function $isBlockElementNode(node) {
  return $isElementNode(node) && !node.isInline();
}

// This is used to make a selection when the existing
// selection is null, i.e. forcing selection on the editor
// when it current exists outside the editor.

function $internalMakeRangeSelection(anchorKey, anchorOffset, focusKey, focusOffset, anchorType, focusType) {
  const editorState = getActiveEditorState();
  const selection = new RangeSelection($createPoint(anchorKey, anchorOffset, anchorType), $createPoint(focusKey, focusOffset, focusType), 0, '');
  selection.dirty = true;
  editorState._selection = selection;
  return selection;
}
function $createRangeSelection() {
  const anchor = $createPoint('root', 0, 'element');
  const focus = $createPoint('root', 0, 'element');
  return new RangeSelection(anchor, focus, 0, '');
}
function $createNodeSelection() {
  return new NodeSelection(new Set());
}
function $internalCreateSelection(editor, event) {
  const currentEditorState = editor.getEditorState();
  const lastSelection = currentEditorState._selection;
  const domSelection = getDOMSelection(getWindow(editor));
  if ($isRangeSelection(lastSelection) || lastSelection == null) {
    return $internalCreateRangeSelection(lastSelection, domSelection, editor, event);
  }
  return lastSelection.clone();
}
function $createRangeSelectionFromDom(domSelection, editor) {
  return $internalCreateRangeSelection(null, domSelection, editor, null);
}
function $internalCreateRangeSelection(lastSelection, domSelection, editor, event) {
  const windowObj = editor._window;
  if (windowObj === null) {
    return null;
  }
  // When we create a selection, we try to use the previous
  // selection where possible, unless an actual user selection
  // change has occurred. When we do need to create a new selection
  // we validate we can have text nodes for both anchor and focus
  // nodes. If that holds true, we then return that selection
  // as a mutable object that we use for the editor state for this
  // update cycle. If a selection gets changed, and requires a
  // update to native DOM selection, it gets marked as "dirty".
  // If the selection changes, but matches with the existing
  // DOM selection, then we only need to sync it. Otherwise,
  // we generally bail out of doing an update to selection during
  // reconciliation unless there are dirty nodes that need
  // reconciling.

  const windowEvent = event || windowObj.event;
  const eventType = windowEvent ? windowEvent.type : undefined;
  const isSelectionChange = eventType === 'selectionchange';
  const useDOMSelection = !getIsProcessingMutations() && (isSelectionChange || eventType === 'beforeinput' || eventType === 'compositionstart' || eventType === 'compositionend' || eventType === 'click' && windowEvent && windowEvent.detail === 3 || eventType === 'drop' || eventType === undefined);
  let anchorDOM, focusDOM, anchorOffset, focusOffset;
  if (!$isRangeSelection(lastSelection) || useDOMSelection) {
    if (domSelection === null) {
      return null;
    }
    const points = getDOMSelectionPoints(domSelection, editor._rootElement);
    anchorDOM = points.anchorNode;
    focusDOM = points.focusNode;
    anchorOffset = points.anchorOffset;
    focusOffset = points.focusOffset;
    if ((isSelectionChange || eventType === undefined) && $isRangeSelection(lastSelection) && !isSelectionWithinEditor(editor, anchorDOM, focusDOM)) {
      return lastSelection.clone();
    }
  } else {
    return lastSelection.clone();
  }
  // Let's resolve the text nodes from the offsets and DOM nodes we have from
  // native selection.
  const resolvedSelectionPoints = $internalResolveSelectionPoints(anchorDOM, anchorOffset, focusDOM, focusOffset, editor, lastSelection);
  if (resolvedSelectionPoints === null) {
    return null;
  }
  const [resolvedAnchorPoint, resolvedFocusPoint, dirty] = resolvedSelectionPoints;
  let format = 0;
  let style = '';
  if ($isRangeSelection(lastSelection)) {
    const lastAnchor = lastSelection.anchor;
    if (resolvedAnchorPoint.key === lastAnchor.key) {
      format = lastSelection.format;
      style = lastSelection.style;
    } else {
      const anchorNode = resolvedAnchorPoint.getNode();
      if ($isTextNode(anchorNode)) {
        format = anchorNode.getFormat();
        style = anchorNode.getStyle();
      } else if ($isElementNode(anchorNode)) {
        format = anchorNode.getTextFormat();
        style = anchorNode.getTextStyle();
      }
    }
  }
  const newSelection = new RangeSelection(resolvedAnchorPoint, resolvedFocusPoint, format, style);
  if (dirty) {
    newSelection.dirty = true;
  }
  return newSelection;
}
function $validatePoint(name, point) {
  const node = $getNodeByKey(point.key);
  if (!(node !== undefined)) {
    formatDevErrorMessage(`$validatePoint: ${name} key ${point.key} not found in current editorState`);
  }
  if (point.type === 'text') {
    if (!$isTextNode(node)) {
      formatDevErrorMessage(`$validatePoint: ${name} key ${point.key} is not a TextNode`);
    }
    const size = node.getTextContentSize();
    if (!(point.offset <= size)) {
      formatDevErrorMessage(`$validatePoint: ${name} point.offset > node.getTextContentSize() (${String(point.offset)} > ${String(size)})`);
    }
  } else {
    if (!$isElementNode(node)) {
      formatDevErrorMessage(`$validatePoint: ${name} key ${point.key} is not an ElementNode`);
    }
    const size = node.getChildrenSize();
    if (!(point.offset <= size)) {
      formatDevErrorMessage(`$validatePoint: ${name} point.offset > node.getChildrenSize() (${String(point.offset)} > ${String(size)})`);
    }
  }
}
function $getSelection() {
  const editorState = getActiveEditorState();
  return editorState._selection;
}
function $getPreviousSelection() {
  const editor = getActiveEditor();
  return editor._editorState._selection;
}
function $updateElementSelectionOnCreateDeleteNode(selection, parentNode, nodeOffset, times = 1) {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();
  if (!parentNode.is(anchorNode) && !parentNode.is(focusNode)) {
    return;
  }
  const parentKey = parentNode.__key;
  // Single node. We shift selection but never redimension it
  if (selection.isCollapsed()) {
    const selectionOffset = anchor.offset;
    if (nodeOffset <= selectionOffset && times > 0 || nodeOffset < selectionOffset && times < 0) {
      const newSelectionOffset = Math.max(0, selectionOffset + times);
      anchor.set(parentKey, newSelectionOffset, 'element');
      focus.set(parentKey, newSelectionOffset, 'element');
      // The new selection might point to text nodes, try to resolve them
      $updateSelectionResolveTextNodes(selection);
    }
  } else {
    // Multiple nodes selected. We shift or redimension selection
    const isBackward = selection.isBackward();
    const firstPoint = isBackward ? focus : anchor;
    const firstPointNode = firstPoint.getNode();
    const lastPoint = isBackward ? anchor : focus;
    const lastPointNode = lastPoint.getNode();
    if (parentNode.is(firstPointNode)) {
      const firstPointOffset = firstPoint.offset;
      if (nodeOffset <= firstPointOffset && times > 0 || nodeOffset < firstPointOffset && times < 0) {
        firstPoint.set(parentKey, Math.max(0, firstPointOffset + times), 'element');
      }
    }
    if (parentNode.is(lastPointNode)) {
      const lastPointOffset = lastPoint.offset;
      if (nodeOffset <= lastPointOffset && times > 0 || nodeOffset < lastPointOffset && times < 0) {
        lastPoint.set(parentKey, Math.max(0, lastPointOffset + times), 'element');
      }
    }
  }
  // The new selection might point to text nodes, try to resolve them
  $updateSelectionResolveTextNodes(selection);
}
function $updateSelectionResolveTextNodes(selection) {
  const anchor = selection.anchor;
  const anchorOffset = anchor.offset;
  const focus = selection.focus;
  const focusOffset = focus.offset;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();
  if (selection.isCollapsed()) {
    if (!$isElementNode(anchorNode)) {
      return;
    }
    const childSize = anchorNode.getChildrenSize();
    const anchorOffsetAtEnd = anchorOffset >= childSize;
    const child = anchorOffsetAtEnd ? anchorNode.getChildAtIndex(childSize - 1) : anchorNode.getChildAtIndex(anchorOffset);
    if ($isTextNode(child)) {
      let newOffset = 0;
      if (anchorOffsetAtEnd) {
        newOffset = child.getTextContentSize();
      }
      anchor.set(child.__key, newOffset, 'text');
      focus.set(child.__key, newOffset, 'text');
    }
    return;
  }
  if ($isElementNode(anchorNode)) {
    const childSize = anchorNode.getChildrenSize();
    const anchorOffsetAtEnd = anchorOffset >= childSize;
    const child = anchorOffsetAtEnd ? anchorNode.getChildAtIndex(childSize - 1) : anchorNode.getChildAtIndex(anchorOffset);
    if ($isTextNode(child)) {
      let newOffset = 0;
      if (anchorOffsetAtEnd) {
        newOffset = child.getTextContentSize();
      }
      anchor.set(child.__key, newOffset, 'text');
    }
  }
  if ($isElementNode(focusNode)) {
    const childSize = focusNode.getChildrenSize();
    const focusOffsetAtEnd = focusOffset >= childSize;
    const child = focusOffsetAtEnd ? focusNode.getChildAtIndex(childSize - 1) : focusNode.getChildAtIndex(focusOffset);
    if ($isTextNode(child)) {
      let newOffset = 0;
      if (focusOffsetAtEnd) {
        newOffset = child.getTextContentSize();
      }
      focus.set(child.__key, newOffset, 'text');
    }
  }
}
function applySelectionTransforms(nextEditorState, editor) {
  const prevEditorState = editor.getEditorState();
  const prevSelection = prevEditorState._selection;
  const nextSelection = nextEditorState._selection;
  if ($isRangeSelection(nextSelection)) {
    const anchor = nextSelection.anchor;
    const focus = nextSelection.focus;
    let anchorNode;
    if (anchor.type === 'text') {
      anchorNode = anchor.getNode();
      anchorNode.selectionTransform(prevSelection, nextSelection);
    }
    if (focus.type === 'text') {
      const focusNode = focus.getNode();
      if (anchorNode !== focusNode) {
        focusNode.selectionTransform(prevSelection, nextSelection);
      }
    }
  }
}
function moveSelectionPointToSibling(point, node, parent, prevSibling, nextSibling) {
  let siblingKey = null;
  let offset = 0;
  let type = null;
  if (prevSibling !== null) {
    siblingKey = prevSibling.__key;
    if ($isTextNode(prevSibling)) {
      offset = prevSibling.getTextContentSize();
      type = 'text';
    } else if ($isElementNode(prevSibling)) {
      offset = prevSibling.getChildrenSize();
      type = 'element';
    }
  } else {
    if (nextSibling !== null) {
      siblingKey = nextSibling.__key;
      if ($isTextNode(nextSibling)) {
        type = 'text';
      } else if ($isElementNode(nextSibling)) {
        type = 'element';
      }
    }
  }
  if (siblingKey !== null && type !== null) {
    point.set(siblingKey, offset, type);
  } else {
    offset = node.getIndexWithinParent();
    if (offset === -1) {
      // Move selection to end of parent
      offset = parent.getChildrenSize();
    }
    point.set(parent.__key, offset, 'element');
  }
}
function adjustPointOffsetForMergedSibling(point, isBefore, key, target, textLength) {
  if (point.type === 'text') {
    point.set(key, point.offset + (isBefore ? 0 : textLength), 'text');
  } else if (point.offset > target.getIndexWithinParent()) {
    point.set(point.key, point.offset - 1, 'element');
  }
}
function setDOMSelectionBaseAndExtent(domSelection, nextAnchorDOM, nextAnchorOffset, nextFocusDOM, nextFocusOffset) {
  // Apply the updated selection to the DOM. Note: this will trigger
  // a "selectionchange" event, although it will be asynchronous.
  try {
    domSelection.setBaseAndExtent(nextAnchorDOM, nextAnchorOffset, nextFocusDOM, nextFocusOffset);
  } catch (error) {
    // If we encounter an error, continue. This can sometimes
    // occur with FF and there's no good reason as to why it
    // should happen.
    {
      console.warn(error);
    }
  }
}
function $getElementAndOffsetForPoint(editor, node, offset) {
  const element = getElementByKeyOrThrow(editor, node.getKey());
  if ($isElementNode(node)) {
    const slot = $getDOMSlot(node, element, editor);
    return [slot.element, offset + slot.getFirstChildOffset()];
  }
  return [element, offset];
}

/** @internal */
function $updateDOMSelection(prevSelection, nextSelection, editor, domSelection, tags, rootElement) {
  const rootForActive = rootElement.getRootNode();
  const activeElement = isDOMDocumentNode(rootForActive) || isDOMShadowRoot(rootForActive) ? getActiveElementDeep(rootForActive) : null;

  // TODO: make this not hard-coded, and add another config option
  // that makes this configurable.
  if (tags.has(COLLABORATION_TAG) && activeElement !== rootElement || activeElement !== null && $isSelectionCapturedInDecoratorInput(activeElement, activeElement)) {
    return;
  }

  // Resolve the live DOM selection's boundary points through any enclosing
  // DOM shadow roots; Selection.anchorNode/focusNode are retargeted to the
  // shadow host, so the comparisons below read composed points instead. In
  // the light DOM getDOMSelectionPoints returns `domSelection` itself (no
  // Selection property reads happen here), so `currentPoints` aliases it
  // and preserves the deferred reads described below. The matching live
  // Range is computed lazily in `getCurrentRange()` so the scroll-into-view
  // fallback below is the only path that pays `getRangeAt(0)`'s layout
  // flush — `getDOMSelectionRangeAndPoints()` (the public helper) still
  // returns both eagerly for external callers.
  const currentPoints = getDOMSelectionPoints(domSelection, rootElement);
  let currentRangeCache;
  const getCurrentRange = () => {
    if (currentRangeCache === undefined) {
      // Resolve through any enclosing shadow roots: getRangeAt(0) alone is
      // retargeted to the shadow host inside a shadow tree, so the
      // scroll-into-view rect below would measure the host instead of the
      // caret. getDOMSelectionRange falls back to getRangeAt(0) in the light
      // DOM.
      currentRangeCache = getDOMSelectionRange(domSelection, rootElement);
    }
    return currentRangeCache;
  };
  if (!$isRangeSelection(nextSelection)) {
    // We don't remove selection if the prevSelection is null because
    // of editor.setRootElement(). If this occurs on init when the
    // editor is already focused, then this can cause the editor to
    // lose focus.
    if (prevSelection !== null && isSelectionWithinEditor(editor, currentPoints.anchorNode, currentPoints.focusNode)) {
      domSelection.removeAllRanges();
    }
    return;
  }

  // DOM Selection property reads (anchorNode, focusNode, anchorOffset,
  // focusOffset) are deferred to their single point of use in the diff
  // check below, and guarded by a cheap domSelection.type check first.
  // These reads force the browser to resolve the selection against the
  // current layout, triggering synchronous style/layout recalculation.

  const anchor = nextSelection.anchor;
  const focus = nextSelection.focus;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();
  const [anchorDOM, nextAnchorOffset] = $getElementAndOffsetForPoint(editor, anchorNode, anchor.offset);
  const [focusDOM, nextFocusOffset] = $getElementAndOffsetForPoint(editor, focusNode, focus.offset);
  const nextFormat = nextSelection.format;
  const nextStyle = nextSelection.style;
  const isCollapsed = nextSelection.isCollapsed();
  let nextAnchorNode = anchorDOM;
  let nextFocusNode = focusDOM;
  let anchorFormatOrStyleChanged = false;
  if (anchor.type === 'text') {
    nextAnchorNode = $isTextNode(anchorNode) ? $getDOMTextNode(anchorNode, anchorDOM, editor) : null;
    anchorFormatOrStyleChanged = anchorNode.getFormat() !== nextFormat || anchorNode.getStyle() !== nextStyle;
  } else if ($isRangeSelection(prevSelection) && prevSelection.anchor.type === 'text') {
    anchorFormatOrStyleChanged = true;
  }
  if (focus.type === 'text') {
    nextFocusNode = $isTextNode(focusNode) ? $getDOMTextNode(focusNode, focusDOM, editor) : null;
  }

  // If we can't get an underlying text node for selection, then
  // we should avoid setting selection to something incorrect.
  if (nextAnchorNode === null || nextFocusNode === null) {
    return;
  }
  if (isCollapsed && (prevSelection === null || anchorFormatOrStyleChanged || $isRangeSelection(prevSelection) && (prevSelection.format !== nextFormat || prevSelection.style !== nextStyle))) {
    markCollapsedSelectionFormat(editor, nextFormat, nextStyle, nextAnchorOffset, anchor.key, performance.now());
  }

  // Diff against the native DOM selection to ensure we don't do
  // an unnecessary selection update. We also skip this check if
  // we're moving selection to within an element, as this can
  // sometimes be problematic around scrolling.
  if (!(domSelection.type === 'Range' && isCollapsed) &&
  // Badly interpreted range selection when collapsed - #1482
  currentPoints.anchorOffset === nextAnchorOffset && currentPoints.focusOffset === nextFocusOffset && currentPoints.anchorNode === nextAnchorNode && currentPoints.focusNode === nextFocusNode) {
    // If the root element does not have focus, ensure it has focus — but
    // not when the deep-focused element belongs to a different editor
    // (e.g. the inner editor of a coexisting outer-editor / shadow-editor
    // pair). Stealing focus there breaks the user's typing flow.
    if (activeElement === null || !rootElement.contains(activeElement)) {
      const focusEditor = activeElement !== null ? getNearestEditorFromDOMNode(activeElement) : null;
      if ((focusEditor === null || focusEditor === editor) && !tags.has(SKIP_SELECTION_FOCUS_TAG)) {
        rootElement.focus({
          preventScroll: true
        });
      }
    }
    if (anchor.type !== 'element') {
      return;
    }
  }

  // Apply the updated selection to the DOM. Note: this will trigger
  // a "selectionchange" event, although it will be asynchronous.
  setDOMSelectionBaseAndExtent(domSelection, nextAnchorNode, nextAnchorOffset, nextFocusNode, nextFocusOffset);

  // Firefox-specific fix: After setting DOM selection, ensure root element has focus
  // to maintain cursor visibility. Firefox requires focus to be on the root element
  // for the cursor to be visible, especially after operations like drag that may
  // cause focus loss. This is critical for collapsed selections (cursor).
  if (IS_FIREFOX && nextSelection.isCollapsed() && rootElement !== null && !tags.has(SKIP_SELECTION_FOCUS_TAG)) {
    // Shallow active element for the containment check: rootElement.contains()
    // does not cross shadow boundaries, so a host-retargeted result gives the
    // correct containment outcome (and avoids a false "outside" when focus is
    // in a nested decorator shadow inside this editor).
    const focusedElement = getActiveElement(rootElement);
    if (focusedElement === null || !rootElement.contains(focusedElement)) {
      // Don't steal focus when the active element belongs to a *different*
      // editor (e.g. the inner editor of a coexisting outer-editor /
      // shadow-editor pair). Resolve the *deep* focused element for this
      // attribution: a shallow read returns the other editor's shadow host,
      // which getNearestEditorFromDOMNode can't map back to that editor, so
      // the guard would otherwise wrongly steal focus from a shadow-mounted
      // sibling.
      const deepFocusedElement = getActiveElementDeep(rootElement.ownerDocument);
      const focusEditor = deepFocusedElement !== null ? getNearestEditorFromDOMNode(deepFocusedElement) : null;
      if (focusEditor === null || focusEditor === editor) {
        // Restore focus immediately to ensure cursor visibility.
        // Note: We rely on the normal selection update mechanism to ensure the
        // cursor is visible. Using requestAnimationFrame here could cause race
        // conditions where another update changes the selection before the rAF
        // callback executes.
        rootElement.focus({
          preventScroll: true
        });
      }
    }
  }
  if (!tags.has(SKIP_SCROLL_INTO_VIEW_TAG) && nextSelection.isCollapsed() && rootElement !== null &&
  // Re-read the active element rather than a value cached before the focus
  // restore / selection mutation above, which can become stale (e.g. when
  // setting the DOM selection focuses the contentEditable as a side effect).
  // Shallow is sufficient here for the same reason as the Firefox branch
  // above: the equality check doesn't cross the shadow boundary.
  rootElement === getActiveElement(rootElement)) {
    const selectionTarget = $isRangeSelection(nextSelection) && nextSelection.anchor.type === 'element' ? nextAnchorNode.childNodes[nextAnchorOffset] || null : getCurrentRange();
    if (selectionTarget !== null) {
      let selectionRect;
      if (isDOMTextNode(selectionTarget)) {
        const range = selectionTarget.ownerDocument.createRange();
        range.selectNode(selectionTarget);
        selectionRect = range.getBoundingClientRect();
      } else {
        selectionRect = selectionTarget.getBoundingClientRect();
      }
      scrollIntoViewIfNeeded(editor, selectionRect, rootElement);
    }
  }
  markSelectionChangeFromDOMUpdate(editor);
}
function $insertNodes(nodes) {
  let selection = $getSelection() || $getPreviousSelection();
  if (selection === null) {
    selection = $getRoot().selectEnd();
  }
  selection.insertNodes(nodes);
}

/**
 * Push-lexer visitor passed to {@link tokenizeRawText}. The tokenizer
 * invokes one callback per token it emits; empty text runs are
 * suppressed, so `text` is only invoked with a non-empty string.
 */

/**
 * Push-lex a raw text string into `linebreak` (`\n` / `\r\n`), `tab`
 * (`\t`), and `text` (everything else) tokens, dispatching each to the
 * matching callback on `visitor` in source order.
 *
 * Shared by {@link $generateNodesFromRawText} (which builds
 * `LineBreakNode` / `TabNode` / `TextNode` siblings) and by
 * `@lexical/clipboard`'s default `text/plain` clipboard importer
 * (which maps `linebreak` to a real paragraph break via
 * `insertParagraph` so multi-line plain text becomes multi-paragraph
 * rich text). Empty text runs are dropped so callers don't need to
 * special-case them.
 */
function tokenizeRawText(text, visitor) {
  for (const part of text.split(/(\r?\n|\t)/)) {
    if (part === '\n' || part === '\r\n') {
      visitor.linebreak();
    } else if (part === '\t') {
      visitor.tab();
    } else if (part !== '') {
      visitor.text(part);
    }
  }
}

/**
 * Convert a raw text string into a flat array of `TextNode`,
 * `LineBreakNode`, and `TabNode` siblings, splitting on `\n`, `\r\n`,
 * and `\t`. Use this when you need the same `\n` / `\t` → real-node
 * conversion that {@link RangeSelection.insertRawText} performs but
 * without a selection — e.g. when building a `CodeNode`'s children
 * inside a DOM-import rule.
 */
function $generateNodesFromRawText(text) {
  const nodes = [];
  tokenizeRawText(text, {
    linebreak: () => nodes.push($createLineBreakNode()),
    tab: () => nodes.push($createTabNode()),
    text: part => nodes.push($createTextNode(part))
  });
  return nodes;
}
function $getTextContent() {
  const selection = $getSelection();
  if (selection === null) {
    return '';
  }
  return selection.getTextContent();
}

// @experimental named-slots. Inline projection of a pasted node list for a
// block-shaped slot value (insertNodes CASE 3a): inline nodes pass through,
// non-inline elements contribute their inline content recursively, line
// breaks are stripped (the <input> value-sanitization analogy for newlines),
// and non-inline decorators are dropped.
function $extractInlineFromBlocks(nodes) {
  const inlineNodes = [];
  for (const node of nodes) {
    if ($isLineBreakNode(node)) {
      continue;
    }
    if (($isElementNode(node) || $isDecoratorNode(node)) && !node.isInline()) {
      if ($isElementNode(node)) {
        inlineNodes.push(...$extractInlineFromBlocks(node.getChildren()));
      }
      continue;
    }
    inlineNodes.push(node);
  }
  return inlineNodes;
}
function $removeTextAndSplitBlock(selection) {
  let selection_ = selection;
  if (!selection.isCollapsed()) {
    selection_.removeText();
  }
  // A new selection can originate as a result of node replacement, in which case is registered via
  // $setSelection
  const newSelection = $getSelection();
  if ($isRangeSelection(newSelection)) {
    selection_ = newSelection;
  }
  if (!$isRangeSelection(selection_)) {
    formatDevErrorMessage(`Unexpected dirty selection to be null`);
  }
  const anchor = selection_.anchor;
  let node = anchor.getNode();
  let offset = anchor.offset;

  // A slotted node is the virtual scope root (its parent is null), so the
  // split walk must stop there even when it is not INTERNAL_$isBlock itself
  // (e.g. a container-shaped slot value with element children) — otherwise
  // $splitNodeAtPoint's parentless fallback would append a stray paragraph
  // to the document root.
  while (!INTERNAL_$isBlock(node) && $getSlotHostKey(node) === null) {
    const prevNode = node;
    [node, offset] = $splitNodeAtPoint(node, offset);
    if (prevNode.is(node)) {
      break;
    }
  }
  return offset;
}
function $splitNodeAtPoint(node, offset) {
  const parent = node.getParent();
  if (!parent) {
    const paragraph = $createParagraphNode();
    $getRoot().append(paragraph);
    paragraph.select();
    return [$getRoot(), 0];
  }
  if ($isTextNode(node)) {
    const split = node.splitText(offset);
    if (split.length === 0) {
      return [parent, node.getIndexWithinParent()];
    }
    const x = offset === 0 ? 0 : 1;
    const index = split[0].getIndexWithinParent() + x;
    return [parent, index];
  }
  if (!$isElementNode(node) || offset === 0) {
    return [parent, node.getIndexWithinParent()];
  }
  const firstToAppend = node.getChildAtIndex(offset);
  if (firstToAppend) {
    const insertPoint = new RangeSelection($createPoint(node.__key, offset, 'element'), $createPoint(node.__key, offset, 'element'), 0, '');
    const newElement = node.insertNewAfter(insertPoint);
    if (newElement) {
      newElement.append(firstToAppend, ...firstToAppend.getNextSiblings());
    }
  }
  return [parent, node.getIndexWithinParent() + 1];
}
function $isInlineRunNode(node) {
  return $isLineBreakNode(node) || $isInlineElementOrDecoratorNode(node) || $isTextNode(node) || node.isParentRequired();
}
function $wrapInlineNodes(nodes) {
  // We temporarily insert the topLevelNodes into an arbitrary ElementNode,
  // since insertAfter does not work on nodes that have no parent (TO-DO: fix that).
  const virtualRoot = $createParagraphNode();
  let currentBlock = null;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if ($isInlineRunNode(node)) {
      if (currentBlock === null) {
        currentBlock = node.createParentElementNode();
        virtualRoot.append(currentBlock);
        // A LineBreakNode that is an entire run by itself collapses to an
        // empty paragraph, since the block boundary already provides the
        // visual newline (the form that clipboard pastes ending in a
        // trailing <br> rely on, and the same policy as
        // $paragraphPackageRun in @lexical/html). A linebreak followed by
        // more inline content in the same run is preserved.
        const nextNode = nodes[i + 1];
        if ($isLineBreakNode(node) && (nextNode === undefined || !$isInlineRunNode(nextNode))) {
          continue;
        }
      }
      currentBlock.append(node);
    } else {
      virtualRoot.append(node);
      currentBlock = null;
    }
  }
  return virtualRoot;
}

/**
 * Get all nodes in a CaretRange in a way that complies with all of the
 * quirks of the original RangeSelection.getNodes().
 *
 * @param range The CaretRange
 */
function $getNodesFromCaretRangeCompat(
// getNodes returned nodes in document order
range) {
  const nodes = [];
  const [beforeSlice, afterSlice] = range.getTextSlices();
  if (beforeSlice) {
    nodes.push(beforeSlice.caret.origin);
  }
  const seenAncestors = new Set();
  const seenElements = new Set();
  for (const caret of range) {
    if ($isChildCaret(caret)) {
      // Emulate the leading under-selection behavior of getNodes by
      // ignoring the 'enter' of any ElementNode until we've seen a
      // SiblingCaret
      const {
        origin
      } = caret;
      if (nodes.length === 0) {
        seenAncestors.add(origin);
      } else {
        seenElements.add(origin);
        nodes.push(origin);
      }
    } else {
      const {
        origin
      } = caret;
      if (!$isElementNode(origin) || !seenElements.has(origin)) {
        nodes.push(origin);
      }
    }
  }
  if (afterSlice) {
    nodes.push(afterSlice.caret.origin);
  }
  // Emulate the trailing underselection behavior when the last offset of
  // an element is selected
  if ($isSiblingCaret(range.focus) && $isElementNode(range.focus.origin) && range.focus.getNodeAtCaret() === null) {
    for (let reverseCaret = $getChildCaret(range.focus.origin, 'previous'); $isChildCaret(reverseCaret) && seenAncestors.has(reverseCaret.origin) && !reverseCaret.origin.isEmpty() && reverseCaret.origin.is(nodes[nodes.length - 1]); reverseCaret = $getAdjacentChildCaret(reverseCaret)) {
      seenAncestors.delete(reverseCaret.origin);
      nodes.pop();
    }
  }
  while (nodes.length > 1) {
    const lastIncludedNode = nodes[nodes.length - 1];
    if ($isElementNode(lastIncludedNode)) {
      if (seenElements.has(lastIncludedNode) || lastIncludedNode.isEmpty() || seenAncestors.has(lastIncludedNode)) ; else {
        nodes.pop();
        continue;
      }
    }
    break;
  }
  if (nodes.length === 0 && range.isCollapsed()) {
    // Emulate the collapsed behavior of getNodes by returning the descendant
    const normCaret = $normalizeCaret(range.anchor);
    const flippedNormCaret = $normalizeCaret(range.anchor.getFlipped());
    const $getCandidate = caret => $isTextPointCaret(caret) ? caret.origin : caret.getNodeAtCaret();
    const node = $getCandidate(normCaret) || $getCandidate(flippedNormCaret) || (range.anchor.getNodeAtCaret() ? normCaret.origin : flippedNormCaret.origin);
    nodes.push(node);
  }
  return nodes;
}

/**
 * @internal
 *
 * Modify the focus of the focus around possible decorators and blocks and return true
 * if the movement is done.
 */
function $modifySelectionAroundDecoratorsAndBlocks(selection, alter, isBackward, granularity, mode = 'decorators-and-blocks') {
  if (alter === 'move' && granularity === 'character' && !selection.isCollapsed()) {
    // moving left or right when the selection isn't collapsed will
    // just set the anchor to the focus or vice versa depending on
    // direction
    const [src, dst] = isBackward === selection.isBackward() ? [selection.focus, selection.anchor] : [selection.anchor, selection.focus];
    dst.set(src.key, src.offset, src.type);
    return true;
  }
  const initialFocus = $caretFromPoint(selection.focus, isBackward ? 'previous' : 'next');
  const isLineBoundary = granularity === 'lineboundary';
  const collapse = alter === 'move';
  let focus = initialFocus;
  let checkForBlock = mode === 'decorators-and-blocks';
  if (!$isExtendableTextPointCaret(focus)) {
    for (const siblingCaret of focus) {
      checkForBlock = false;
      const {
        origin
      } = siblingCaret;
      if ($isDecoratorNode(origin) && !origin.isIsolated()) {
        focus = siblingCaret;
        if (isLineBoundary && origin.isInline()) {
          continue;
        }
      }
      break;
    }
    if (checkForBlock) {
      for (const nextCaret of $extendCaretToRange(initialFocus).iterNodeCarets(alter === 'extend' ? 'shadowRoot' : 'root')) {
        if ($isChildCaret(nextCaret)) {
          if (!nextCaret.origin.isInline()) {
            focus = nextCaret;
          }
        } else if ($isElementNode(nextCaret.origin)) {
          continue;
        } else if ($isDecoratorNode(nextCaret.origin) && !nextCaret.origin.isInline()) {
          focus = nextCaret;
        }
        break;
      }
    }
  }
  if (focus === initialFocus) {
    return false;
  }
  // After this point checkForBlock is true if and only if we moved to a
  // different block, so we should stop regardless of the granularity
  if (collapse && !isLineBoundary && $isDecoratorNode(focus.origin) && focus.origin.isKeyboardSelectable()) {
    // Make it possible to move selection from range selection to
    // node selection on the node.
    const nodeSelection = $createNodeSelection();
    nodeSelection.add(focus.origin.getKey());
    $setSelection(nodeSelection);
    return true;
  }
  focus = $normalizeCaret(focus);
  if (collapse) {
    $setPointFromCaret(selection.anchor, focus);
  }
  $setPointFromCaret(selection.focus, focus);
  return checkForBlock || !isLineBoundary;
}

let activeEditorState = null;
let activeEditor = null;
let isReadOnlyMode = false;
let isAttemptingToRecoverFromReconcilerError = false;
// True for the duration of $commitPendingUpdates (including its listener
// phases and the enqueued update pump at its tail). Commands dispatched while
// this is set — the internal SELECTION_CHANGE_COMMAND dispatch, or user code
// dispatching from a mutation listener, both of which run with
// editor._updating === false — are part of the in-flight update machinery
// rather than a fresh external action, so they must not reset the
// infinite-update-loop budget in triggerCommandListeners.
let isCommittingPendingUpdates = false;
// Tracks editors that have a pending macrotask scheduled to reset their cascade
// budget. See `scheduleCascadeReset`.
const editorsWithPendingCascadeReset = new Set();
let infiniteTransformCount = 0;
const observerOptions = {
  characterData: true,
  childList: true,
  subtree: true
};
function isCurrentlyReadOnlyMode() {
  return isReadOnlyMode || activeEditorState !== null && activeEditorState._readOnly;
}
function errorOnReadOnly() {
  if (isReadOnlyMode) {
    {
      formatDevErrorMessage(`Cannot use method in read-only mode.`);
    }
  }
}
function errorOnInfiniteTransforms() {
  if (infiniteTransformCount > 99) {
    {
      formatDevErrorMessage(`One or more transforms are endlessly triggering additional transforms. May have encountered infinite recursion caused by transforms that have their preconditions too lose and/or conflict with each other.`);
    }
  }
}
function getActiveEditorState() {
  if (activeEditorState === null) {
    {
      formatDevErrorMessage(`Unable to find an active editor state. State helpers or node methods can only be used synchronously during the callback of editor.update(), editor.read(), or editorState.read().${collectBuildInformation()}`);
    }
  }
  return activeEditorState;
}

/** @internal */
function $assumeActiveEditor(editor) {
  // Throw if called outside of an update
  if (getActiveEditorState() !== null && activeEditor === null) {
    activeEditor = editor;
  }
  if (!(activeEditor === editor)) {
    formatDevErrorMessage(`The given editor argument does not match $getEditor() in this context. Use editor.getEditorState().read(..., {editor}) if this cross-editor call is intentional.`);
  }
}
function getActiveEditor() {
  if (activeEditor === null) {
    {
      formatDevErrorMessage(`Unable to find an active editor. This method can only be used synchronously during the callback of editor.update(), editor.read(), or editor.getEditorState().read(..., {editor}).${collectBuildInformation()}`);
    }
  }
  return activeEditor;
}

/**
 * Schedule a full reconcile of the active editor, so that every node is
 * re-rendered through the current {@link EditorDOMRenderConfig} on the next
 * commit. Unlike {@link LexicalNode.markDirty}, this does not clone or
 * otherwise mutate the node map, so no mutation/collaboration listeners
 * observe a change. Must be called within an `editor.update`.
 *
 * @internal
 */
function $fullReconcile() {
  getActiveEditor()._dirtyType = FULL_RECONCILE;
}
function collectBuildInformation() {
  let compatibleEditors = 0;
  const incompatibleEditors = new Set();
  const thisVersion = LexicalEditor.version;
  if (typeof window !== 'undefined') {
    for (const node of findAllLexicalElementsDeep(document)) {
      const editor = getEditorPropertyFromDOMNode(node);
      if (isLexicalEditor(editor)) {
        compatibleEditors++;
      } else if (editor) {
        let version = String(editor.constructor.version || '<0.17.1');
        if (version === thisVersion) {
          version += ' (separately built, likely a bundler configuration issue)';
        }
        incompatibleEditors.add(version);
      }
    }
  }
  let output = ` Detected on the page: ${compatibleEditors} compatible editor(s) with version ${thisVersion}`;
  if (incompatibleEditors.size) {
    output += ` and incompatible editors with versions ${Array.from(incompatibleEditors).join(', ')}`;
  }
  return output;
}
function internalGetActiveEditor() {
  return activeEditor;
}
function internalGetActiveEditorState() {
  return activeEditorState;
}
function $applyTransforms(editor, node, transformsCache) {
  const type = node.__type;
  const registeredNode = getRegisteredNodeOrThrow(editor, type);
  let transformsArr = transformsCache.get(type);
  if (transformsArr === undefined) {
    transformsArr = Array.from(registeredNode.transforms);
    transformsCache.set(type, transformsArr);
  }
  const transformsArrLength = transformsArr.length;
  for (let i = 0; i < transformsArrLength; i++) {
    transformsArr[i](node);
    if (!node.isAttached()) {
      break;
    }
  }
}
function $isNodeValidForTransform(node, compositionKey) {
  return node !== undefined &&
  // We don't want to transform nodes being composed
  node.__key !== compositionKey && node.isAttached();
}
function $normalizeAllDirtyTextNodes(editorState, editor) {
  const dirtyLeaves = editor._dirtyLeaves;
  const nodeMap = editorState._nodeMap;
  for (const nodeKey of dirtyLeaves) {
    const node = nodeMap.get(nodeKey);
    if ($isTextNode(node) && node.isAttached() && node.isSimpleText() && !node.isUnmergeable()) {
      $normalizeTextNode(node);
    }
  }
}
function addTags(editor, tags) {
  if (!tags) {
    return;
  }
  const updateTags = editor._updateTags;
  let tags_ = tags;
  if (!Array.isArray(tags)) {
    tags_ = [tags];
  }
  for (const tag of tags_) {
    updateTags.add(tag);
  }
}

/**
 * Transform heuristic:
 * 1. We transform leaves first. If transforms generate additional dirty nodes we repeat step 1.
 * The reasoning behind this is that marking a leaf as dirty marks all its parent elements as dirty too.
 * 2. We transform elements. If element transforms generate additional dirty nodes we repeat step 1.
 * If element transforms only generate additional dirty elements we only repeat step 2.
 *
 * Note that to keep track of newly dirty nodes and subtrees we leverage the editor._dirtyNodes and
 * editor._subtrees which we reset in every loop.
 */
function $applyAllTransforms(editorState, editor) {
  const dirtyLeaves = editor._dirtyLeaves;
  const dirtyElements = editor._dirtyElements;
  const nodeMap = editorState._nodeMap;
  const compositionKey = $getCompositionKey();
  const transformsCache = new Map();
  let untransformedDirtyLeaves = dirtyLeaves;
  let untransformedDirtyLeavesLength = untransformedDirtyLeaves.size;
  let untransformedDirtyElements = dirtyElements;
  let untransformedDirtyElementsLength = untransformedDirtyElements.size;
  while (untransformedDirtyLeavesLength > 0 || untransformedDirtyElementsLength > 0) {
    if (untransformedDirtyLeavesLength > 0) {
      // We leverage editor._dirtyLeaves to track the new dirty leaves after the transforms
      editor._dirtyLeaves = new Set();
      for (const nodeKey of untransformedDirtyLeaves) {
        const node = nodeMap.get(nodeKey);
        if ($isTextNode(node) && node.isAttached() && node.isSimpleText() && !node.isUnmergeable()) {
          $normalizeTextNode(node);
        }
        if (node !== undefined && $isNodeValidForTransform(node, compositionKey)) {
          $applyTransforms(editor, node, transformsCache);
        }
        dirtyLeaves.add(nodeKey);
      }
      untransformedDirtyLeaves = editor._dirtyLeaves;
      untransformedDirtyLeavesLength = untransformedDirtyLeaves.size;

      // We want to prioritize node transforms over element transforms
      if (untransformedDirtyLeavesLength > 0) {
        infiniteTransformCount++;
        continue;
      }
    }

    // All dirty leaves have been processed. Let's do elements!
    // We have previously processed dirty leaves, so let's restart the editor leaves Set to track
    // new ones caused by element transforms
    editor._dirtyLeaves = new Set();
    editor._dirtyElements = new Map();

    // The root is always considered intentionally dirty if any attached node
    // is dirty and by deleting and re-inserting we will apply its transforms
    // last (e.g. its transform can be used as a sort of "update finalizer")
    const rootDirty = untransformedDirtyElements.delete('root');
    if (rootDirty) {
      untransformedDirtyElements.set('root', true);
    }
    for (const currentUntransformedDirtyElement of untransformedDirtyElements) {
      const nodeKey = currentUntransformedDirtyElement[0];
      const intentionallyMarkedAsDirty = currentUntransformedDirtyElement[1];
      dirtyElements.set(nodeKey, intentionallyMarkedAsDirty);
      if (!intentionallyMarkedAsDirty) {
        continue;
      }
      const node = nodeMap.get(nodeKey);
      if (node !== undefined && $isNodeValidForTransform(node, compositionKey)) {
        $applyTransforms(editor, node, transformsCache);
      }
    }
    untransformedDirtyLeaves = editor._dirtyLeaves;
    untransformedDirtyLeavesLength = untransformedDirtyLeaves.size;
    untransformedDirtyElements = editor._dirtyElements;
    untransformedDirtyElementsLength = untransformedDirtyElements.size;
    infiniteTransformCount++;
  }
  editor._dirtyLeaves = dirtyLeaves;
  editor._dirtyElements = dirtyElements;
}
function $parseSerializedNode(serializedNode) {
  const internalSerializedNode = serializedNode;
  return $parseSerializedNodeImpl(internalSerializedNode, getActiveEditor()._nodes);
}
function $parseSerializedNodeImpl(serializedNode, registeredNodes) {
  const type = serializedNode.type;
  const registeredNode = registeredNodes.get(type);
  if (registeredNode === undefined) {
    {
      formatDevErrorMessage(`parseEditorState: type "${type}" + not found`);
    }
  }
  const nodeClass = registeredNode.klass;
  if (serializedNode.type !== nodeClass.getType()) {
    {
      formatDevErrorMessage(`LexicalNode: Node ${nodeClass.name} does not implement .importJSON().`);
    }
  }
  const node = nodeClass.importJSON(serializedNode);
  const children = serializedNode.children;
  if ($isElementNode(node) && Array.isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const serializedJSONChildNode = children[i];
      const childNode = $parseSerializedNodeImpl(serializedJSONChildNode, registeredNodes);
      node.append(childNode);
    }
  }

  // Slots live in a separate Map on every LexicalNode (an ElementNode or a
  // DecoratorNode host), so re-attach them outside the element branch.
  const slots = serializedNode.$slots;
  if (slots) {
    if (!$isSlotHost(node)) {
      formatDevErrorMessage(`$parseSerializedNode: node ${nodeClass.name} has slots but is not a valid slot host; only ElementNodes and DecoratorNodes can host slots.`);
    }
    for (const name in slots) {
      const slotNode = $parseSerializedNodeImpl(slots[name], registeredNodes);
      $setSlot(node, name, slotNode);
    }
  }
  return node;
}
function parseEditorState(serializedEditorState, editor, updateFn) {
  const editorState = createEmptyEditorState();
  const previousActiveEditorState = activeEditorState;
  const previousReadOnlyMode = isReadOnlyMode;
  const previousActiveEditor = activeEditor;
  const previousDirtyElements = editor._dirtyElements;
  const previousDirtyLeaves = editor._dirtyLeaves;
  const previousCloneNotNeeded = editor._cloneNotNeeded;
  const previousDirtyType = editor._dirtyType;
  editor._dirtyElements = new Map();
  editor._dirtyLeaves = new Set();
  editor._cloneNotNeeded = new Set();
  editor._dirtyType = NO_DIRTY_NODES;
  activeEditorState = editorState;
  isReadOnlyMode = false;
  activeEditor = editor;
  setPendingNodeToClone(null);
  try {
    const registeredNodes = editor._nodes;
    const serializedNode = serializedEditorState.root;
    $parseSerializedNodeImpl(serializedNode, registeredNodes);
    if (updateFn) {
      updateFn();
    }

    // Make the editorState immutable
    editorState._readOnly = true;
    editorState._parsed = true;
    {
      handleDEVOnlyPendingUpdateGuarantees(editorState);
    }
  } catch (error) {
    if (error instanceof Error) {
      editor._onError(error);
    }
  } finally {
    editor._dirtyElements = previousDirtyElements;
    editor._dirtyLeaves = previousDirtyLeaves;
    editor._cloneNotNeeded = previousCloneNotNeeded;
    editor._dirtyType = previousDirtyType;
    activeEditorState = previousActiveEditorState;
    isReadOnlyMode = previousReadOnlyMode;
    activeEditor = previousActiveEditor;
  }
  return editorState;
}

// This technically isn't an update but given we need
// exposure to the module's active bindings, we have this
// function here

function readEditorState(editor, editorState, callbackFn) {
  const previousActiveEditorState = activeEditorState;
  const previousReadOnlyMode = isReadOnlyMode;
  const previousActiveEditor = activeEditor;
  activeEditorState = editorState;
  isReadOnlyMode = true;
  activeEditor = editor;
  try {
    return callbackFn();
  } finally {
    activeEditorState = previousActiveEditorState;
    isReadOnlyMode = previousReadOnlyMode;
    activeEditor = previousActiveEditor;
  }
}
function handleDEVOnlyPendingUpdateGuarantees(pendingEditorState) {
  // Given we can't Object.freeze the nodeMap as it's a Map,
  // we instead replace its set, clear and delete methods.
  const nodeMap = pendingEditorState._nodeMap;
  nodeMap.set = () => {
    throw new Error('Cannot call set() on a frozen Lexical node map');
  };
  nodeMap.clear = () => {
    throw new Error('Cannot call clear() on a frozen Lexical node map');
  };
  nodeMap.delete = () => {
    throw new Error('Cannot call delete() on a frozen Lexical node map');
  };
}
function $commitPendingUpdates(editor, recoveryEditorState) {
  // Save and restore rather than set and clear because the reconciler error
  // recovery path re-enters $commitPendingUpdates, and the enqueued update
  // pump at the tail of a commit can commit discrete updates synchronously.
  const previouslyCommitting = isCommittingPendingUpdates;
  isCommittingPendingUpdates = true;
  try {
    $commitPendingUpdatesImpl(editor, recoveryEditorState);
  } finally {
    isCommittingPendingUpdates = previouslyCommitting;
  }
}
function $commitPendingUpdatesImpl(editor, recoveryEditorState) {
  const pendingEditorState = editor._pendingEditorState;
  const rootElement = editor._rootElement;
  const shouldSkipDOM = editor._headless || rootElement === null;
  if (pendingEditorState === null) {
    // Even without a pending state, flush any deferred callbacks that
    // may have been added by a prior update (e.g. via $onUpdate inside
    // editor.focus()). This can happen when another commit consumed
    // the pending editor state before this scheduled commit ran.
    if (!editor._updating && editor._deferred.length > 0) {
      triggerDeferredUpdateCallbacks(editor, editor._deferred);
    }
    return;
  }

  // ======
  // Reconciliation has started.
  // ======

  const currentEditorState = editor._editorState;
  const currentSelection = currentEditorState._selection;
  const pendingSelection = pendingEditorState._selection;
  const needsUpdate = editor._dirtyType !== NO_DIRTY_NODES;
  const previousActiveEditorState = activeEditorState;
  const previousReadOnlyMode = isReadOnlyMode;
  const previousActiveEditor = activeEditor;
  const previouslyUpdating = editor._updating;
  const observer = editor._observer;
  let mutatedNodes = null;
  editor._pendingEditorState = null;
  editor._editorState = pendingEditorState;
  if (!shouldSkipDOM && needsUpdate && observer !== null) {
    activeEditor = editor;
    activeEditorState = pendingEditorState;
    isReadOnlyMode = false;
    // We don't want updates to sync block the reconciliation.
    editor._updating = true;
    try {
      const dirtyType = editor._dirtyType;
      const dirtyElements = editor._dirtyElements;
      const dirtyLeaves = editor._dirtyLeaves;
      observer.disconnect();
      mutatedNodes = $reconcileRoot(currentEditorState, pendingEditorState, editor, dirtyType, dirtyElements, dirtyLeaves);
    } catch (error) {
      // Report errors
      if (error instanceof Error) {
        editor._onError(error);
      }

      // Reset editor and restore incoming editor state to the DOM
      if (!isAttemptingToRecoverFromReconcilerError) {
        resetEditor(editor, null, rootElement, pendingEditorState);
        initMutationObserver(editor);
        editor._dirtyType = FULL_RECONCILE;
        isAttemptingToRecoverFromReconcilerError = true;
        $commitPendingUpdates(editor, currentEditorState);
        isAttemptingToRecoverFromReconcilerError = false;
      } else {
        // To avoid a possible situation of infinite loops, lets throw
        throw error;
      }
      return;
    } finally {
      observer.observe(rootElement, observerOptions);
      editor._updating = previouslyUpdating;
      activeEditorState = previousActiveEditorState;
      isReadOnlyMode = previousReadOnlyMode;
      activeEditor = previousActiveEditor;
    }
  }
  if (!pendingEditorState._readOnly) {
    pendingEditorState._readOnly = true;
    {
      handleDEVOnlyPendingUpdateGuarantees(pendingEditorState);
      if ($isRangeSelection(pendingSelection)) {
        Object.freeze(pendingSelection.anchor);
        Object.freeze(pendingSelection.focus);
      }
      Object.freeze(pendingSelection);
    }
  }
  const dirtyLeaves = editor._dirtyLeaves;
  const dirtyElements = editor._dirtyElements;
  const normalizedNodes = editor._normalizedNodes;
  const tags = editor._updateTags;
  if (needsUpdate) {
    editor._dirtyType = NO_DIRTY_NODES;
    editor._cloneNotNeeded.clear();
    editor._dirtyLeaves = new Set();
    editor._dirtyElements = new Map();
    editor._normalizedNodes = new Set();
  }
  // Always reset the accumulated update tags, even when this commit produced no
  // dirty nodes (needsUpdate === false). Tags are added from the `tag` update
  // option independently of whether any node is dirtied, and the 'update'
  // listener below fires for every commit (including no-op ones) with these
  // tags. If we only cleared them when needsUpdate is true, the tags of a no-op
  // update would leak into the *next* update. For collaboration this is a
  // correctness bug: a local edit that immediately follows a remote sync which
  // happened to be a no-op (e.g. a concurrently-deleted node, so nothing
  // reconciles) would inherit the COLLABORATION tag and be skipped by
  // syncLexicalUpdateToYjs, desyncing the peers.
  editor._updateTags = new Set();
  $garbageCollectDetachedDecorators(editor, pendingEditorState);

  // ======
  // Reconciliation has finished. Now update selection and trigger listeners.
  // ======

  const domSelection = shouldSkipDOM ? null : getDOMSelection(getWindow(editor));

  // Attempt to update the DOM selection, including focusing of the root element,
  // and scroll into view if needed.
  if (editor._editable &&
  // domSelection will be null in headless
  domSelection !== null && (needsUpdate || pendingSelection === null || pendingSelection.dirty || !pendingSelection.is(currentSelection)) && rootElement !== null && !tags.has(SKIP_DOM_SELECTION_TAG)) {
    activeEditor = editor;
    activeEditorState = pendingEditorState;
    try {
      if (observer !== null) {
        observer.disconnect();
      }
      if (needsUpdate || pendingSelection === null || pendingSelection.dirty) {
        const blockCursorElement = editor._blockCursorElement;
        if (blockCursorElement !== null) {
          removeDOMBlockCursorElement(blockCursorElement, editor, rootElement);
        }
        $updateDOMSelection(currentSelection, pendingSelection, editor, domSelection, tags, rootElement);
      }
      $updateDOMBlockCursorElement(editor, rootElement, pendingSelection);
    } finally {
      if (observer !== null) {
        observer.observe(rootElement, observerOptions);
      }
      activeEditor = previousActiveEditor;
      activeEditorState = previousActiveEditorState;
    }
  }
  if (mutatedNodes !== null) {
    triggerMutationListeners(editor, mutatedNodes, tags, dirtyLeaves, currentEditorState);
  }
  if (!$isRangeSelection(pendingSelection) && pendingSelection !== null && (currentSelection === null || !currentSelection.is(pendingSelection))) {
    editor.dispatchCommand(SELECTION_CHANGE_COMMAND);
  }
  /**
   * Capture pendingDecorators after garbage collecting detached decorators
   */
  const pendingDecorators = editor._pendingDecorators;
  if (pendingDecorators !== null) {
    editor._decorators = pendingDecorators;
    editor._pendingDecorators = null;
    triggerListeners('decorator', editor, true, pendingDecorators);
  }

  // If reconciler fails, we reset whole editor (so current editor state becomes empty)
  // and attempt to re-render pendingEditorState. If that goes through we trigger
  // listeners, but instead use recoverEditorState which is current editor state before reset
  // This specifically important for collab that relies on prevEditorState from update
  // listener to calculate delta of changed nodes/properties
  triggerTextContentListeners(editor, recoveryEditorState || currentEditorState, pendingEditorState);
  triggerListeners('update', editor, true, {
    dirtyElements,
    dirtyLeaves,
    editorState: pendingEditorState,
    mutatedNodes,
    normalizedNodes,
    prevEditorState: recoveryEditorState || currentEditorState,
    tags
  });
  // A commit can be forced while an outer update is still running (for
  // example, setEditorState() inside editor.update()). Keep $onUpdate
  // callbacks queued so the outer update drains them after updateFn returns.
  if (!previouslyUpdating) {
    const deferred = editor._deferred;
    triggerDeferredUpdateCallbacks(editor, deferred);
  }
  $triggerEnqueuedUpdates(editor);
}
function triggerTextContentListeners(editor, currentEditorState, pendingEditorState) {
  const currentTextContent = getEditorStateTextContent(currentEditorState);
  const latestTextContent = getEditorStateTextContent(pendingEditorState);
  if (currentTextContent !== latestTextContent) {
    triggerListeners('textcontent', editor, true, latestTextContent);
  }
}
function triggerMutationListeners(editor, mutatedNodes, updateTags, dirtyLeaves, prevEditorState) {
  const listeners = Array.from(editor._listeners.mutation);
  const listenersLength = listeners.length;
  for (let i = 0; i < listenersLength; i++) {
    const [listener, klassSet] = listeners[i];
    for (const klass of klassSet) {
      const mutatedNodesByType = mutatedNodes.get(klass);
      if (mutatedNodesByType !== undefined) {
        listener(mutatedNodesByType, {
          dirtyLeaves,
          prevEditorState,
          updateTags
        });
      }
    }
  }
}
function triggerListeners(type, editor, isCurrentlyEnqueuingUpdates, ...payload) {
  const previouslyUpdating = editor._updating;
  editor._updating = isCurrentlyEnqueuingUpdates;
  try {
    const listenerMap = editor._listeners[type];
    const listeners = Array.from(listenerMap);
    for (const [listener, unregister] of listeners) {
      if (unregister) {
        unregister();
      }
      const nextUnregister = listener(...payload);
      if (listenerMap.has(listener)) {
        listenerMap.set(listener, nextUnregister);
      } else if (nextUnregister) {
        nextUnregister();
      }
    }
  } finally {
    editor._updating = previouslyUpdating;
  }
}
function triggerCommandListeners(editor, type, payload, fromEditor) {
  const editors = getEditorsToPropagate(editor);
  let updatingParentEditor;

  // A dispatched command is a fresh, externally-triggered action (a keystroke,
  // paste, selection change, etc.), not part of an in-flight update-listener
  // cascade. Reset the cascade budget for the editors it touches so the
  // infinite-update-loop detector measures recursion depth *within a single
  // action* rather than accumulating across many independent actions. This
  // makes the guard robust to fast/synchronous input bursts (rapid typing, key
  // repeat) that don't yield to the event loop between keystrokes.
  //
  // Two guards keep cascade-internal dispatches from resetting the budget,
  // which would otherwise let a runaway loop that dispatches a command each
  // cycle defeat the detector entirely:
  // - editor._updating is true while update/textcontent/decorator listeners
  //   and deferred callbacks run (see triggerListeners), covering commands
  //   dispatched from those contexts.
  // - isCommittingPendingUpdates is true for the whole of
  //   $commitPendingUpdates, covering the internal SELECTION_CHANGE_COMMAND
  //   dispatch and commands dispatched from mutation listeners, both of which
  //   run with editor._updating === false.
  // Genuine external input can never arrive in the middle of a commit because
  // the commit is synchronous, so neither guard weakens the per-action reset.
  if (!isCommittingPendingUpdates) {
    for (let e = 0; e < editors.length; e++) {
      if (!editors[e]._updating) {
        editors[e]._cascadeCount = 0;
      }
    }
  }
  for (let i = 4; i >= 0; i--) {
    for (let e = 0; e < editors.length; e++) {
      const currentEditor = editors[e];
      if (e > 0 && currentEditor._updating) {
        // We can't synchronously update an already updating editor without
        // creating an early commit that will potentially corrupt the
        // nodeMap by doing GC too early.
        updatingParentEditor = currentEditor;
        break;
      }
      const commandListeners = currentEditor._commands;
      const listenerInPriorityOrder = commandListeners.get(type);
      if (listenerInPriorityOrder !== undefined) {
        const listenersSet = listenerInPriorityOrder[i];
        if (listenersSet.size > 0) {
          let returnVal = false;
          updateEditorSync(currentEditor, () => {
            for (const listener of listenersSet) {
              if (listener(payload, fromEditor)) {
                returnVal = true;
                return;
              }
            }
          });
          if (returnVal) {
            return returnVal;
          }
        }
      }
    }
  }
  if (updatingParentEditor) {
    // Preserve the fairly broken legacy semantics of command delegation to fix
    // https://github.com/facebook/lexical/issues/8306
    updatingParentEditor.update(() => {
      // This will be async so we can't know the result
      triggerCommandListeners(updatingParentEditor, type, payload, fromEditor);
    });
  }
  return false;
}
function scheduleCascadeReset(editor) {
  // The cascade budget (`_cascadeCount`) is meant to catch *non-terminating*
  // recursion — an update listener that synchronously re-enqueues more work
  // without a stop condition. Such a runaway is a microtask storm: it never
  // yields control back to the event loop, so a macrotask scheduled here is
  // starved and never runs before the budget is exhausted and the guard trips.
  //
  // By contrast, heavy-but-bounded activity (e.g. fast typing while an
  // autocomplete listener re-enqueues one ghost-sync update per commit) is
  // driven by separate user input events. The queue stays bounded and control
  // returns to the event loop between actions, which lets this macrotask run
  // and reset the budget — so legitimate sustained activity never accumulates
  // toward the limit. This is what distinguishes throughput from recursion.
  if (editorsWithPendingCascadeReset.has(editor)) {
    return;
  }
  editorsWithPendingCascadeReset.add(editor);
  setTimeout(() => {
    editorsWithPendingCascadeReset.delete(editor);
    editor._cascadeCount = 0;
  }, 0);
}
function $triggerEnqueuedUpdates(editor) {
  const queuedUpdates = editor._updates;
  if (queuedUpdates.length === 0) {
    editor._cascadeCount = 0;
    return;
  }
  // Arrange for the cascade budget to be reset once control returns to the
  // event loop. Genuine non-terminating recursion is a synchronous microtask
  // storm that starves this macrotask and still trips below; bounded activity
  // spread across user input events lets it run and prevents false positives.
  scheduleCascadeReset(editor);
  if (editor._cascadeCount++ > 99) {
    // The budget resets (the macrotask reset above and the command-dispatch
    // reset in triggerCommandListeners) rule out bounded bursts of legitimate
    // activity, so exhausting the budget means update listeners are
    // re-enqueueing work in a loop that never yields to the event loop. Clear
    // the whole queue: by now it is dominated by cascade-generated updates,
    // and dropping only the head would strand the remainder with no scheduled
    // drain — re-igniting the loop on the next external update, and growing
    // the queue without bound when a cycle enqueues more than one update per
    // commit.
    editor._updates = [];
    editor._cascadeCount = 0;
    // The cascade has already been broken above by clearing the update queue,
    // so this is a recoverable internal guard rather than a fatal error. Route
    // it directly through the editor's warn-level hook (`_onWarn`, default:
    // throw in dev / `console.warn` in prod) so embedders can capture how often
    // the guard trips as warn-severity telemetry.
    //
    // This must be a direct `editor._onWarn(...)` call rather than an
    // `invariant`/`$devInvariant` helper: `transform-error-messages` rewrites
    // those call sites to a bare `formatProd*Message(code, ...)` in the
    // compiled bundle, dropping the editor reference, so the warning would
    // never actually reach `_onWarn` in a built artifact (only when the
    // untransformed `source` is consumed). Calling the hook directly keeps the
    // routing intact in every build, at the cost of shipping this message
    // string in the bundle.
    editor._onWarn(new Error('One or more update listeners are endlessly enqueueing more updates. ' + 'May have encountered infinite recursion caused by update listeners ' + 'that trigger additional updates without a stop condition. ' + `Editor namespace: ${editor._config.namespace}`));
    return;
  }
  const queuedUpdate = queuedUpdates.shift();
  if (queuedUpdate) {
    const [updateFn, options] = queuedUpdate;
    $beginUpdate(editor, updateFn, options);
  }
}
function triggerDeferredUpdateCallbacks(editor, deferred) {
  editor._deferred = [];
  if (deferred.length !== 0) {
    const previouslyUpdating = editor._updating;
    editor._updating = true;
    try {
      for (let i = 0; i < deferred.length; i++) {
        deferred[i]();
      }
    } finally {
      editor._updating = previouslyUpdating;
    }
  }
}
function $processNestedUpdates(editor, initialSkipTransforms) {
  const queuedUpdates = editor._updates;
  let skipTransforms = initialSkipTransforms || false;

  // Updates might grow as we process them, we so we'll need
  // to handle each update as we go until the updates array is
  // empty.
  while (queuedUpdates.length !== 0) {
    const queuedUpdate = queuedUpdates.shift();
    if (queuedUpdate) {
      const [nextUpdateFn, options] = queuedUpdate;
      const pendingEditorState = editor._pendingEditorState;
      let onUpdate;
      if (options !== undefined) {
        onUpdate = options.onUpdate;
        if (options.skipTransforms) {
          skipTransforms = true;
        }
        if (options.discrete) {
          if (!(pendingEditorState !== null)) {
            formatDevErrorMessage(`Unexpected empty pending editor state on discrete nested update`);
          }
          pendingEditorState._flushSync = true;
        }
        if (onUpdate) {
          editor._deferred.push(onUpdate);
        }
        addTags(editor, options.tag);
      }
      if (pendingEditorState == null) {
        $beginUpdate(editor, nextUpdateFn, options);
      } else {
        nextUpdateFn();
      }
    }
  }
  return skipTransforms;
}
function $beginUpdate(editor, updateFn, options) {
  const updateTags = editor._updateTags;
  let onUpdate;
  let skipTransforms = false;
  let discrete = false;
  if (options !== undefined) {
    onUpdate = options.onUpdate;
    addTags(editor, options.tag);
    skipTransforms = options.skipTransforms || false;
    discrete = options.discrete || false;
  }
  if (onUpdate) {
    editor._deferred.push(onUpdate);
  }
  const currentEditorState = editor._editorState;
  let pendingEditorState = editor._pendingEditorState;
  let editorStateWasCloned = false;
  if (pendingEditorState === null || pendingEditorState._readOnly) {
    pendingEditorState = editor._pendingEditorState = cloneEditorState(pendingEditorState || currentEditorState);
    editorStateWasCloned = true;
  }
  pendingEditorState._flushSync = discrete;
  const previousActiveEditorState = activeEditorState;
  const previousReadOnlyMode = isReadOnlyMode;
  const previousActiveEditor = activeEditor;
  const previouslyUpdating = editor._updating;
  activeEditorState = pendingEditorState;
  isReadOnlyMode = false;
  editor._updating = true;
  activeEditor = editor;
  const headless = editor._headless || editor.getRootElement() === null;
  setPendingNodeToClone(null);
  try {
    if (editorStateWasCloned) {
      if (headless) {
        if (currentEditorState._selection !== null) {
          pendingEditorState._selection = currentEditorState._selection.clone();
        }
      } else {
        pendingEditorState._selection = $internalCreateSelection(editor, options && options.event || null);
      }
    }
    const startingCompositionKey = editor._compositionKey;
    updateFn();
    skipTransforms = $processNestedUpdates(editor, skipTransforms);
    applySelectionTransforms(pendingEditorState, editor);
    if (editor._dirtyType !== NO_DIRTY_NODES) {
      if (skipTransforms) {
        $normalizeAllDirtyTextNodes(pendingEditorState, editor);
      } else {
        $applyAllTransforms(pendingEditorState, editor);
      }
      $processNestedUpdates(editor);
      $garbageCollectDetachedNodes(currentEditorState, pendingEditorState, editor._dirtyLeaves, editor._dirtyElements);
    }
    const endingCompositionKey = editor._compositionKey;
    if (startingCompositionKey !== endingCompositionKey) {
      pendingEditorState._flushSync = true;
    }
    const pendingSelection = pendingEditorState._selection;
    if ($isRangeSelection(pendingSelection)) {
      // Slot containment: a RangeSelection must not straddle a slot boundary.
      // Every committed selection passes here, including ones produced by an
      // in-place point mutation that bypassed `$setSelection`. Gated on
      // `_slotsUsed` so editors that never slot anything skip the frame walk.
      if (editor._slotsUsed) {
        $clampRangeSelectionToSlotFrame(pendingSelection);
      }
      const pendingNodeMap = pendingEditorState._nodeMap;
      const anchorKey = pendingSelection.anchor.key;
      const focusKey = pendingSelection.focus.key;
      if (pendingNodeMap.get(anchorKey) === undefined || pendingNodeMap.get(focusKey) === undefined) {
        {
          formatDevErrorMessage(`updateEditor: selection has been lost because the previously selected nodes have been removed and selection wasn't moved to another node. Ensure selection changes after removing/replacing a selected node.`);
        }
      }
    } else if ($isNodeSelection(pendingSelection)) {
      // TODO: we should also validate node selection?
      if (pendingSelection._nodes.size === 0) {
        pendingEditorState._selection = null;
      }
    }
  } catch (error) {
    // Report errors
    if (error instanceof Error) {
      editor._onError(error);
    }

    // Restore existing editor state to the DOM
    editor._pendingEditorState = currentEditorState;
    editor._dirtyType = FULL_RECONCILE;
    editor._cloneNotNeeded.clear();
    editor._dirtyLeaves = new Set();
    editor._dirtyElements.clear();
    $commitPendingUpdates(editor);
    return;
  } finally {
    activeEditorState = previousActiveEditorState;
    isReadOnlyMode = previousReadOnlyMode;
    activeEditor = previousActiveEditor;
    editor._updating = previouslyUpdating;
    infiniteTransformCount = 0;
  }
  const shouldUpdate = editor._dirtyType !== NO_DIRTY_NODES || editor._deferred.length > 0 || editorStateHasDirtySelection(pendingEditorState, editor);
  if (shouldUpdate) {
    if (pendingEditorState._flushSync) {
      pendingEditorState._flushSync = false;
      $commitPendingUpdates(editor);
    } else if (editorStateWasCloned) {
      scheduleMicroTask(() => {
        $commitPendingUpdates(editor);
      });
    }
  } else {
    pendingEditorState._flushSync = false;
    if (editorStateWasCloned) {
      updateTags.clear();
      editor._deferred = [];
      editor._pendingEditorState = null;
    }
  }
}

/**
 * A variant of updateEditor that will not defer if it is nested in an update
 * to the same editor, much like if it was an editor.dispatchCommand issued
 * within an update
 */
function updateEditorSync(editor, updateFn, options) {
  if (activeEditor === editor && options === undefined) {
    if (isCurrentlyReadOnlyMode()) {
      // We are nominally "inside an update" for this editor, but the active
      // context is read-only (e.g. a command dispatched from inside
      // editor.read(), or a force-commit read on the stack). Running updateFn
      // inline here would mutate the frozen active editor state and throw
      // "Cannot call set() on a frozen Lexical node map" — an error that gets
      // routed to editor._onError rather than rethrown, so the mutation is
      // silently dropped. Route through $beginUpdate instead, which starts a
      // fresh writable update, so the work actually applies.
      {
        console.warn(`updateEditorSync: an editor update (e.g. a command listener that ` + `mutates the editor) ran while a read-only context was on the ` + `stack. This most commonly happens when a command is dispatched ` + `from inside editor.read(). The update has been deferred to a ` + `fresh writable update so it still applies, but dispatching ` + `mutations from a read-only context is an anti-pattern — dispatch ` + `after editor.read() returns, or via queueMicrotask.`);
      }
      $beginUpdate(editor, updateFn, options);
    } else {
      updateFn();
    }
  } else {
    $beginUpdate(editor, updateFn, options);
  }
}
function updateEditor(editor, updateFn, options) {
  if (editor._updating) {
    editor._updates.push([updateFn, options]);
  } else {
    $beginUpdate(editor, updateFn, options);
  }
}

/**
 * Wrap any shadow-root child of `node` that is neither an ElementNode nor a
 * DecoratorNode in a paragraph, so the slot-frame invariant set by
 * `getTopLevelElement` continues to hold for external inputs (URL doc
 * payloads, imported JSON, paste round-trips) that may carry shapes the
 * in-editor mutation paths can no longer produce.
 *
 * Single-node helper: runs as the `$config` `$transform` on ElementNode so
 * the existing dirty-node transform cycle drives the normalization. The
 * in-editor mutation paths (insertText, insertNodes, append/splice via the
 * public API) still fail-fast on the invariant.
 *
 * @internal
 */
function $normalizeShadowRootChildren(node) {
  if ($isRootOrShadowRoot(node)) {
    let block = null;
    for (const child of node.getChildren()) {
      block = child.isInline() ? (block || child.replace(child.createParentElementNode())).append(child) : null;
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging

/** @noInheritDoc */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class ElementNode extends LexicalNode {
  /** @internal */

  /** @internal */
  __first;
  /** @internal */
  __last;
  /** @internal */
  __size;
  /** @internal */
  __format;
  /** @internal */
  __style;
  /** @internal */
  __indent;
  /** @internal */
  __dir;
  /** @internal */
  __textFormat;
  /** @internal */
  __textStyle;
  /** @internal */
  __slotHost;
  /** @internal */
  __slots;

  // Specific type information is discarded for backwards compatibility,
  // there is nothing meaninful to gain from requiring `{extends: ElementNode}`
  // with the current shape here (just a `$transform`)
  $config() {
    return this.config(Symbol.for('ElementNode'), {
      /*
       * Built-in normalize for shadow-root ElementNodes: wraps any direct child
       * that is neither an ElementNode nor a DecoratorNode in a paragraph, so
       * the slot-frame invariant set by `getTopLevelElement` continues to hold
       * for external inputs (URL doc payloads, imported JSON, paste round-trips)
       * that may carry shapes the in-editor mutation paths can no longer
       * produce. In-editor mutation paths still fail-fast on the invariant.
       *
       * Runs as a static transform so the existing dirty-node transform cycle
       * drives it — typing paths cover their own dirty bookkeeping, hydrate
       * paths (`setEditorState`) dirty-mark slot hosts so the cycle picks them
       * up.
       */
      $transform: $normalizeShadowRootChildren,
      extends: LexicalNode
    });
  }
  constructor(key) {
    super(key);
    this.__first = null;
    this.__last = null;
    this.__size = 0;
    this.__format = 0;
    this.__style = '';
    this.__indent = 0;
    this.__dir = null;
    this.__textFormat = 0;
    this.__textStyle = '';
    this.__slotHost = null;
    this.__slots = null;
  }
  afterCloneFrom(prevNode) {
    super.afterCloneFrom(prevNode);
    if (this.__key === prevNode.__key) {
      this.__first = prevNode.__first;
      this.__last = prevNode.__last;
      this.__size = prevNode.__size;
      this.__slotHost = prevNode.__slotHost;
      if (!(this.__slotHost === null || this.__parent === null)) {
        formatDevErrorMessage(`ElementNode: node ${this.__key} is both slotted into host ${String(this.__slotHost)} and a child of parent ${String(this.__parent)}; __slotHost and __parent are mutually exclusive`);
      } // Copy-on-write: share the map across versions; the LexicalSlot
      // mutators clone it on a version's first write (owner ledger), so a
      // host cloned for any non-slot change pays no per-version Map copy.
      this.__slots = prevNode.__slots;
    }
    this.__indent = prevNode.__indent;
    this.__format = prevNode.__format;
    this.__style = prevNode.__style;
    this.__dir = prevNode.__dir;
    this.__textFormat = prevNode.__textFormat;
    this.__textStyle = prevNode.__textStyle;
  }
  getFormat() {
    const self = this.getLatest();
    return self.__format;
  }
  getFormatType() {
    const format = this.getFormat();
    return ELEMENT_FORMAT_TO_TYPE[format] || '';
  }
  getStyle() {
    const self = this.getLatest();
    return self.__style;
  }
  getIndent() {
    const self = this.getLatest();
    return self.__indent;
  }
  /**
   * Returns the children of this node, in document order.
   */

  /**
   * @deprecated The type parameter is an unchecked and unsafe cast,
   * equivalent to `element.getChildren() as T[]`, and will be
   * removed in a future release. Call this method without a type argument
   * and narrow the results with a type guard instead.
   */

  getChildren() {
    const children = [];
    let child = this.getFirstChild();
    while (child !== null) {
      children.push(child);
      child = child.getNextSibling();
    }
    return children;
  }
  getChildrenKeys() {
    const children = [];
    let child = this.getFirstChild();
    while (child !== null) {
      children.push(child.__key);
      child = child.getNextSibling();
    }
    return children;
  }
  getChildrenSize() {
    const self = this.getLatest();
    return self.__size;
  }
  isEmpty() {
    // A host that holds content only in its slots is not empty: otherwise
    // $removeNode would cascade-prune it once its last child is gone and orphan
    // the slot subtrees.
    return this.getChildrenSize() === 0 && $getSlotNames(this).length === 0;
  }
  isDirty() {
    const editor = getActiveEditor();
    const dirtyElements = editor._dirtyElements;
    return dirtyElements !== null && dirtyElements.has(this.__key);
  }
  isLastChild() {
    const self = this.getLatest();
    const parentLastChild = this.getParentOrThrow().getLastChild();
    return parentLastChild !== null && parentLastChild.is(self);
  }
  getAllTextNodes() {
    const textNodes = [];
    // Slots are read slots-first, ahead of the linked-list children, to match
    // getTextContent. This is a content read; descendant navigation
    // (getFirstDescendant / getLastDescendant) stays children-only so slots
    // never leak into selection placement. A slot value is always a non-inline
    // element or decorator (setSlot enforces this), so only element slots
    // contribute text nodes.
    for (const name of $getSlotNames(this)) {
      const slot = $getSlot(this, name);
      if ($isElementNode(slot)) {
        textNodes.push(...slot.getAllTextNodes());
      }
    }
    let child = this.getFirstChild();
    while (child !== null) {
      if ($isTextNode(child)) {
        textNodes.push(child);
      }
      if ($isElementNode(child)) {
        const subChildrenNodes = child.getAllTextNodes();
        textNodes.push(...subChildrenNodes);
      }
      child = child.getNextSibling();
    }
    return textNodes;
  }
  /**
   * Returns the deepest first descendant of this node,
   * or null if it has no children.
   *
   * Descendant navigation is children-only by design: it feeds selectStart /
   * selectEnd and selection, which must not see slots (slots are isolated).
   */

  /**
   * @deprecated The type parameter is an unchecked and unsafe cast,
   * equivalent to `element.getFirstDescendant() as T | null`, and will be
   * removed in a future release. Call this method without a type argument
   * and narrow the result with a type guard instead.
   */

  getFirstDescendant() {
    let node = this.getFirstChild();
    while ($isElementNode(node)) {
      const child = node.getFirstChild();
      if (child === null) {
        break;
      }
      node = child;
    }
    return node;
  }
  /**
   * Returns the deepest last descendant of this node,
   * or null if it has no children.
   */

  /**
   * @deprecated The type parameter is an unchecked and unsafe cast,
   * equivalent to `element.getLastDescendant() as T | null`, and will be
   * removed in a future release. Call this method without a type argument
   * and narrow the result with a type guard instead.
   */

  getLastDescendant() {
    let node = this.getLastChild();
    while ($isElementNode(node)) {
      const child = node.getLastChild();
      if (child === null) {
        break;
      }
      node = child;
    }
    return node;
  }
  /**
   * Returns the deepest descendant corresponding to the child at the given
   * index, or null if this node has no children.
   */

  /**
   * @deprecated The type parameter is an unchecked and unsafe cast,
   * equivalent to `element.getDescendantByIndex(index) as T | null`, and
   * will be removed in a future release. Call this method without a type
   * argument and narrow the result with a type guard instead.
   */

  getDescendantByIndex(index) {
    const children = this.getChildren();
    const childrenLength = children.length;
    // For non-empty element nodes, we resolve its descendant
    // (either a leaf node or the bottom-most element)
    if (index >= childrenLength) {
      const resolvedNode = children[childrenLength - 1];
      return $isElementNode(resolvedNode) && resolvedNode.getLastDescendant() || resolvedNode || null;
    }
    const resolvedNode = children[index];
    return $isElementNode(resolvedNode) && resolvedNode.getFirstDescendant() || resolvedNode || null;
  }
  /**
   * Returns the first child of this node, or null if it has no children.
   */

  /**
   * @deprecated The type parameter is an unchecked and unsafe cast,
   * equivalent to `element.getFirstChild() as T | null`, and will be
   * removed in a future release. Call this method without a type argument
   * and narrow the result with a type guard instead.
   */

  getFirstChild() {
    const self = this.getLatest();
    const firstKey = self.__first;
    return firstKey === null ? null : $getNodeByKey(firstKey);
  }
  /**
   * Returns the first child of this node, or throws if it has no children.
   */

  /**
   * @deprecated The type parameter is an unchecked and unsafe cast,
   * equivalent to `element.getFirstChildOrThrow() as T`, and will be
   * removed in a future release. Call this method without a type argument
   * and narrow the result with a type guard instead.
   */

  getFirstChildOrThrow() {
    const firstChild = this.getFirstChild();
    if (firstChild === null) {
      {
        formatDevErrorMessage(`Expected node ${this.__key} to have a first child.`);
      }
    }
    return firstChild;
  }
  /**
   * Returns the last child of this node, or null if it has no children.
   */

  /**
   * @deprecated The type parameter is an unchecked and unsafe cast,
   * equivalent to `element.getLastChild() as T | null`, and will be
   * removed in a future release. Call this method without a type argument
   * and narrow the result with a type guard instead.
   */

  getLastChild() {
    const self = this.getLatest();
    const lastKey = self.__last;
    return lastKey === null ? null : $getNodeByKey(lastKey);
  }
  /**
   * Returns the last child of this node, or throws if it has no children.
   */

  /**
   * @deprecated The type parameter is an unchecked and unsafe cast,
   * equivalent to `element.getLastChildOrThrow() as T`, and will be
   * removed in a future release. Call this method without a type argument
   * and narrow the result with a type guard instead.
   */

  getLastChildOrThrow() {
    const lastChild = this.getLastChild();
    if (lastChild === null) {
      {
        formatDevErrorMessage(`Expected node ${this.__key} to have a last child.`);
      }
    }
    return lastChild;
  }
  /**
   * Returns the child of this node at the given index, or null if
   * the index is out of range.
   */

  /**
   * @deprecated The type parameter is an unchecked and unsafe cast,
   * equivalent to `element.getChildAtIndex(index) as T | null`, and will
   * be removed in a future release. Call this method without a type
   * argument and narrow the result with a type guard instead.
   */

  getChildAtIndex(index) {
    const size = this.getChildrenSize();
    let node;
    let i;
    if (index < size / 2) {
      node = this.getFirstChild();
      i = 0;
      while (node !== null && i <= index) {
        if (i === index) {
          return node;
        }
        node = node.getNextSibling();
        i++;
      }
      return null;
    }
    node = this.getLastChild();
    i = size - 1;
    while (node !== null && i >= index) {
      if (i === index) {
        return node;
      }
      node = node.getPreviousSibling();
      i--;
    }
    return null;
  }
  getTextContent() {
    // Slots are read slots-first, ahead of the linked-list children.
    let textContent = $getSlotsTextContent(this);
    const children = this.getChildren();
    const childrenLength = children.length;
    for (let i = 0; i < childrenLength; i++) {
      const child = children[i];
      textContent += child.getTextContent();
      if (
      // this is an inline $textContentRequiresDoubleLinebreakAtEnd(child)
      $isElementNode(child) && i !== childrenLength - 1 && !child.isInline()) {
        textContent += DOUBLE_LINE_BREAK;
      }
    }
    return textContent;
  }
  getTextContentSize() {
    // Slots are counted slots-first, ahead of the linked-list children.
    let textContentSize = $getSlotsTextContentSize(this);
    const children = this.getChildren();
    const childrenLength = children.length;
    for (let i = 0; i < childrenLength; i++) {
      const child = children[i];
      textContentSize += child.getTextContentSize();
      if (
      // This is an inline $textContentRequiresDoubleLinebreakAtEnd(child)
      $isElementNode(child) && i !== childrenLength - 1 && !child.isInline()) {
        textContentSize += DOUBLE_LINE_BREAK.length;
      }
    }
    return textContentSize;
  }
  getDirection() {
    const self = this.getLatest();
    return self.__dir;
  }
  getTextFormat() {
    const self = this.getLatest();
    return self.__textFormat;
  }
  hasFormat(type) {
    if (type !== '') {
      const formatFlag = ELEMENT_TYPE_TO_FORMAT[type];
      return (this.getFormat() & formatFlag) !== 0;
    }
    return false;
  }
  hasTextFormat(type) {
    const formatFlag = TEXT_TYPE_TO_FORMAT[type];
    return (this.getTextFormat() & formatFlag) !== 0;
  }
  /**
   * Returns the format flags applied to the node as a 32-bit integer.
   *
   * @returns a number representing the TextFormatTypes applied to the node.
   */
  getFormatFlags(type, alignWithFormat) {
    const self = this.getLatest();
    const format = self.__textFormat;
    return toggleTextFormatType(format, type, alignWithFormat);
  }
  getTextStyle() {
    const self = this.getLatest();
    return self.__textStyle;
  }

  // Mutators

  select(_anchorOffset, _focusOffset) {
    errorOnReadOnly();
    const selection = $getSelection();
    let anchorOffset = _anchorOffset;
    let focusOffset = _focusOffset;
    const childrenCount = this.getChildrenSize();
    if (!this.canBeEmpty()) {
      if (_anchorOffset === 0 && _focusOffset === 0) {
        const firstChild = this.getFirstChild();
        if ($isTextNode(firstChild) || $isElementNode(firstChild)) {
          return firstChild.select(0, 0);
        }
      } else if ((_anchorOffset === undefined || _anchorOffset === childrenCount) && (_focusOffset === undefined || _focusOffset === childrenCount)) {
        const lastChild = this.getLastChild();
        if ($isTextNode(lastChild) || $isElementNode(lastChild)) {
          return lastChild.select();
        }
      }
    }
    if (anchorOffset === undefined) {
      anchorOffset = childrenCount;
    }
    if (focusOffset === undefined) {
      focusOffset = childrenCount;
    }
    const key = this.__key;
    if (!$isRangeSelection(selection)) {
      return $internalMakeRangeSelection(key, anchorOffset, key, focusOffset, 'element', 'element');
    } else {
      selection.anchor.set(key, anchorOffset, 'element');
      selection.focus.set(key, focusOffset, 'element');
      selection.dirty = true;
    }
    return selection;
  }
  selectStart() {
    const firstNode = this.getFirstDescendant();
    return firstNode ? firstNode.selectStart() : this.select();
  }
  selectEnd() {
    const lastNode = this.getLastDescendant();
    return lastNode ? lastNode.selectEnd() : this.select();
  }
  clear() {
    const writableSelf = this.getWritable();
    const children = this.getChildren();
    children.forEach(child => child.remove());
    return writableSelf;
  }
  append(...nodesToAppend) {
    return this.splice(this.getChildrenSize(), 0, nodesToAppend);
  }
  setDirection(direction) {
    const self = this.getWritable();
    self.__dir = direction;
    return self;
  }
  setFormat(type) {
    const self = this.getWritable();
    self.__format = type !== '' ? ELEMENT_TYPE_TO_FORMAT[type] || 0 : 0;
    return this;
  }
  setStyle(style) {
    const self = this.getWritable();
    self.__style = style || '';
    return this;
  }
  setTextFormat(type) {
    const self = this.getWritable();
    self.__textFormat = type;
    return self;
  }
  setTextStyle(style) {
    const self = this.getWritable();
    self.__textStyle = style;
    return self;
  }
  setIndent(indentLevel) {
    const self = this.getWritable();
    self.__indent = indentLevel;
    return this;
  }
  splice(start, deleteCount, nodesToInsert) {
    if (!!$isEphemeral(this)) {
      formatDevErrorMessage(`ElementNode.splice: Ephemeral nodes can not mutate their children (key ${this.__key} type ${this.__type})`);
    }
    const oldSize = this.getChildrenSize();
    const writableSelf = this.getWritable();
    if (!(start + deleteCount <= oldSize)) {
      formatDevErrorMessage(`ElementNode.splice: start + deleteCount > oldSize (${String(start)} + ${String(deleteCount)} > ${String(oldSize)})`);
    } // Before any mutation: a child insertion must not close a cycle through a
    // slot up-link (the reverse direction of $setSlot's cycle invariant).
    for (const nodeToInsert of nodesToInsert) {
      $errorOnSlotCycleChild(writableSelf, nodeToInsert);
    }
    const writableSelfKey = writableSelf.__key;
    const nodesToInsertKeys = [];
    const nodesToRemoveKeys = [];
    const nodeAfterRange = this.getChildAtIndex(start + deleteCount);
    let nodeBeforeRange = null;
    let newSize = oldSize - deleteCount + nodesToInsert.length;
    if (start !== 0) {
      if (start === oldSize) {
        nodeBeforeRange = this.getLastChild();
      } else {
        const node = this.getChildAtIndex(start);
        if (node !== null) {
          nodeBeforeRange = node.getPreviousSibling();
        }
      }
    }
    if (deleteCount > 0) {
      let nodeToDelete = nodeBeforeRange === null ? this.getFirstChild() : nodeBeforeRange.getNextSibling();
      for (let i = 0; i < deleteCount; i++) {
        if (nodeToDelete === null) {
          {
            formatDevErrorMessage(`splice: sibling not found`);
          }
        }
        const nextSibling = nodeToDelete.getNextSibling();
        const nodeKeyToDelete = nodeToDelete.__key;
        const writableNodeToDelete = nodeToDelete.getWritable();
        $removeFromParent(writableNodeToDelete);
        nodesToRemoveKeys.push(nodeKeyToDelete);
        nodeToDelete = nextSibling;
      }
    }
    let prevNode = nodeBeforeRange;
    for (const nodeToInsert of nodesToInsert) {
      if (prevNode !== null && nodeToInsert.is(prevNode)) {
        nodeBeforeRange = prevNode = prevNode.getPreviousSibling();
      }
      const writableNodeToInsert = nodeToInsert.getWritable();
      if (writableNodeToInsert.__parent === writableSelfKey) {
        newSize--;
      }
      $removeFromParent(writableNodeToInsert);
      const nodeKeyToInsert = nodeToInsert.__key;
      if (prevNode === null) {
        writableSelf.__first = nodeKeyToInsert;
        writableNodeToInsert.__prev = null;
      } else {
        const writablePrevNode = prevNode.getWritable();
        writablePrevNode.__next = nodeKeyToInsert;
        writableNodeToInsert.__prev = writablePrevNode.__key;
      }
      if (nodeToInsert.__key === writableSelfKey) {
        {
          formatDevErrorMessage(`append: attempting to append self`);
        }
      }
      // Set child parent to self
      writableNodeToInsert.__parent = writableSelfKey;
      nodesToInsertKeys.push(nodeKeyToInsert);
      prevNode = nodeToInsert;
    }
    if (start + deleteCount === oldSize) {
      if (prevNode !== null) {
        const writablePrevNode = prevNode.getWritable();
        writablePrevNode.__next = null;
        writableSelf.__last = prevNode.__key;
      }
    } else if (nodeAfterRange !== null) {
      const writableNodeAfterRange = nodeAfterRange.getWritable();
      if (prevNode !== null) {
        const writablePrevNode = prevNode.getWritable();
        writableNodeAfterRange.__prev = prevNode.__key;
        writablePrevNode.__next = nodeAfterRange.__key;
      } else {
        writableNodeAfterRange.__prev = null;
      }
    }
    writableSelf.__size = newSize;

    // In case of deletion we need to adjust selection, unlink removed nodes
    // and clean up node itself if it becomes empty. None of these needed
    // for insertion-only cases
    if (nodesToRemoveKeys.length) {
      // Adjusting selection, in case node that was anchor/focus will be deleted
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const nodesToRemoveKeySet = new Set(nodesToRemoveKeys);
        const nodesToInsertKeySet = new Set(nodesToInsertKeys);
        const {
          anchor,
          focus
        } = selection;
        if (isPointRemoved(anchor, nodesToRemoveKeySet, nodesToInsertKeySet)) {
          moveSelectionPointToSibling(anchor, anchor.getNode(), this, nodeBeforeRange, nodeAfterRange);
        }
        if (isPointRemoved(focus, nodesToRemoveKeySet, nodesToInsertKeySet)) {
          moveSelectionPointToSibling(focus, focus.getNode(), this, nodeBeforeRange, nodeAfterRange);
        }
        // Cleanup if node can't be empty
        if (newSize === 0 && !this.canBeEmpty() && !$isRootOrShadowRoot(this)) {
          this.remove();
        }
      }
    }
    return writableSelf;
  }
  /**
   * @experimental
   *
   * An ElementNode subclass can override this to control where its children
   * are inserted into the DOM, e.g. to add a wrapping node or accessory nodes
   * before or after the children. The root of the node returned by createDOM
   * must still be exactly one HTMLElement.
   */
  getDOMSlot(element) {
    return new ElementDOMSlot(element);
  }
  exportDOM(editor) {
    const {
      element
    } = super.exportDOM(editor);
    if (isHTMLElement(element)) {
      const indent = this.getIndent();
      if (indent > 0) {
        // padding-inline-start is not widely supported in email HTML
        // (see https://www.caniemail.com/features/css-padding-inline-start-end/),
        // If you want to use HTML output for email, consider overriding the serialization
        // to use `padding-right` in RTL languages, `padding-left` in `LTR` languages, or
        // `text-indent` if you are ok with first-line indents.
        // We recommend keeping multiples of 40px to maintain consistency with list-items
        // (see https://github.com/facebook/lexical/pull/4025)
        element.style.paddingInlineStart = `${indent * 40}px`;
        // Authoritative round-trip signal. padding-inline-start can be a
        // non-40px multiple (custom `--lexical-indent-base-value`) or a
        // `calc(...)` expression on the live DOM, neither of which the
        // padding-based heuristic in setNodeIndentFromDOM can recover.
        element.setAttribute('data-lexical-indent', String(indent));
      }
      const direction = this.getDirection();
      if (direction) {
        element.dir = direction;
      }
    }
    return {
      element
    };
  }
  // JSON serialization
  exportJSON() {
    const json = {
      children: [],
      direction: this.getDirection(),
      format: this.getFormatType(),
      indent: this.getIndent(),
      // As an exception here we invoke super at the end for historical reasons.
      // Namely, to preserve the order of the properties and not to break the tests
      // that use the serialized string representation.
      ...super.exportJSON()
    };
    const textFormat = this.getTextFormat();
    const textStyle = this.getTextStyle();
    // Only persist for cases when there are no TextNode children from which
    // these would be set on reconcile (#7968)
    if ((textFormat !== 0 || textStyle !== '') && !$isRootOrShadowRoot(this) && !this.getChildren().some($isTextNode)) {
      if (textFormat !== 0) {
        json.textFormat = textFormat;
      }
      if (textStyle !== '') {
        json.textStyle = textStyle;
      }
    }
    return json;
  }
  updateFromJSON(serializedNode) {
    return super.updateFromJSON(serializedNode).setFormat(serializedNode.format).setIndent(serializedNode.indent).setDirection(serializedNode.direction).setTextFormat(serializedNode.textFormat || 0).setTextStyle(serializedNode.textStyle || '');
  }
  // These are intended to be extends for specific element heuristics.
  insertNewAfter(selection, restoreSelection) {
    return null;
  }
  canIndent() {
    return true;
  }
  /*
   * This method controls the behavior of the node during backwards
   * deletion (i.e., backspace) when selection is at the beginning of
   * the node (offset 0). You may use this to have the node replace
   * itself, change its state, or do nothing. When you do make such
   * a change, you should return true.
   *
   * When true is returned, the collapse phase will stop.
   * When false is returned, and isInline() is true, and getPreviousSibling() is null,
   * then this function will be called on its parent.
   */
  collapseAtStart(selection) {
    return false;
  }
  excludeFromCopy(destination) {
    return false;
  }
  /** @deprecated @internal */
  canReplaceWith(replacement) {
    return true;
  }
  /** @deprecated @internal */
  canInsertAfter(node) {
    return true;
  }
  canBeEmpty() {
    return true;
  }
  canInsertTextBefore() {
    return true;
  }
  canInsertTextAfter() {
    return true;
  }

  /**
   * If the method is overridden and returns true, ensure that `canBeEmpty()`
   * returns false for the inline node to work correctly
   */
  isInline() {
    return false;
  }
  // A shadow root is a Node that behaves like RootNode. The shadow root (and RootNode) mark the
  // end of the hierarchy, most implementations should treat it as there's nothing (upwards)
  // beyond this point. For example, node.getTopLevelElement(), when performed inside a TableCellNode
  // will return the immediate first child underneath TableCellNode instead of RootNode.
  isShadowRoot() {
    return false;
  }
  /** @deprecated @internal */
  canMergeWith(node) {
    return false;
  }
  extractWithChild(child, selection, destination) {
    return false;
  }

  /**
   * Determines whether this node, when empty, can merge with a first block
   * of nodes being inserted.
   *
   * This method is specifically called in {@link RangeSelection.insertNodes}
   * to determine merging behavior during nodes insertion.
   *
   * @example
   * // In a ListItemNode or QuoteNode implementation:
   * canMergeWhenEmpty(): true {
   *  return true;
   * }
   */
  canMergeWhenEmpty() {
    return false;
  }

  /** @internal */
  reconcileObservedMutation(dom, editor) {
    const slot = $getDOMSlot(this, dom, editor);
    let currentDOM = slot.getFirstChild();
    for (let currentNode = this.getFirstChild(); currentNode; currentNode = currentNode.getNextSibling()) {
      const correctDOM = editor.getElementByKey(currentNode.getKey());
      if (correctDOM === null) {
        continue;
      }
      if (currentDOM == null) {
        slot.insertChild(correctDOM);
        currentDOM = correctDOM;
      } else if (currentDOM !== correctDOM) {
        slot.replaceChild(correctDOM, currentDOM);
      }
      currentDOM = currentDOM.nextSibling;
    }
  }
}
function $isElementNode(node) {
  return node instanceof ElementNode;
}
function isPointRemoved(point, nodesToRemoveKeySet, nodesToInsertKeySet) {
  let node = point.getNode();
  while (node) {
    const nodeKey = node.__key;
    if (nodesToRemoveKeySet.has(nodeKey) && !nodesToInsertKeySet.has(nodeKey)) {
      return true;
    }
    node = node.getParent();
  }
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars

/** @noInheritDoc */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class DecoratorNode extends LexicalNode {
  /** @internal */

  /** @internal */
  __slotHost;
  /** @internal */
  __slots;
  constructor(key) {
    super(key);
    this.__slotHost = null;
    this.__slots = null;
  }
  afterCloneFrom(prevNode) {
    super.afterCloneFrom(prevNode);
    if (this.__key === prevNode.__key) {
      this.__slotHost = prevNode.__slotHost;
      if (!(this.__slotHost === null || this.__parent === null)) {
        formatDevErrorMessage(`DecoratorNode: node ${this.__key} is both slotted into host ${String(this.__slotHost)} and a child of parent ${String(this.__parent)}; __slotHost and __parent are mutually exclusive`);
      } // Copy-on-write: share the map across versions; the LexicalSlot
      // mutators clone it on a version's first write (owner ledger), so a
      // host cloned for any non-slot change pays no per-version Map copy.
      this.__slots = prevNode.__slots;
    }
  }

  /**
   * The returned value is added to the LexicalEditor._decorators
   */
  decorate(editor, config) {
    return null;
  }
  isIsolated() {
    return false;
  }
  isInline() {
    return true;
  }
  isKeyboardSelectable() {
    return true;
  }
}
function $isDecoratorNode(node) {
  return node instanceof DecoratorNode;
}

/** @noInheritDoc */
class RootNode extends ElementNode {
  /** @internal */
  __cachedText;
  $config() {
    return this.config('root', {
      extends: ElementNode
    });
  }
  constructor() {
    super('root');
    this.__cachedText = null;
  }
  getTopLevelElementOrThrow() {
    {
      formatDevErrorMessage(`getTopLevelElementOrThrow: root nodes are not top level elements`);
    }
  }
  getTextContent() {
    const cachedText = this.__cachedText;
    return cachedText !== null && (isCurrentlyReadOnlyMode() || getActiveEditor()._dirtyType === NO_DIRTY_NODES) ? cachedText : super.getTextContent();
  }
  remove() {
    {
      formatDevErrorMessage(`remove: cannot be called on root nodes`);
    }
  }
  replace(node) {
    {
      formatDevErrorMessage(`replace: cannot be called on root nodes`);
    }
  }
  insertBefore(nodeToInsert) {
    {
      formatDevErrorMessage(`insertBefore: cannot be called on root nodes`);
    }
  }
  insertAfter(nodeToInsert) {
    {
      formatDevErrorMessage(`insertAfter: cannot be called on root nodes`);
    }
  }

  // View

  updateDOM(prevNode, dom) {
    return false;
  }

  // Mutate
  splice(start, deleteCount, nodesToInsert) {
    for (const node of nodesToInsert) {
      if (!($isElementNode(node) || $isDecoratorNode(node))) {
        formatDevErrorMessage(`rootNode.splice: Only element or decorator nodes can be inserted to the root node`);
      }
    }
    return super.splice(start, deleteCount, nodesToInsert);
  }
  static importJSON(serializedNode) {
    // We don't create a root, and instead use the existing root.
    return $getRoot().updateFromJSON(serializedNode);
  }
  collapseAtStart() {
    return true;
  }
}
function $createRootNode() {
  return new RootNode();
}
function $isRootNode(node) {
  return node instanceof RootNode;
}

function editorStateHasDirtySelection(editorState, editor) {
  const currentSelection = editor.getEditorState()._selection;
  const pendingSelection = editorState._selection;

  // Check if we need to update because of changes in selection
  if (pendingSelection !== null) {
    if (pendingSelection.dirty || !pendingSelection.is(currentSelection)) {
      return true;
    }
  } else if (currentSelection !== null) {
    return true;
  }
  return false;
}
function cloneEditorState(current) {
  return new EditorState(cloneMap(current._nodeMap), null, current._slotsUsed);
}
function createEmptyEditorState() {
  return new EditorState(new Map([['root', $createRootNode()]]), null, false);
}
function $exportNodeToJSON(node) {
  const serializedNode = node.exportJSON();
  const nodeClass = node.constructor;
  if (serializedNode.type !== nodeClass.getType()) {
    {
      formatDevErrorMessage(`LexicalNode: Node ${nodeClass.name} does not match the serialized type. Check if .exportJSON() is implemented and it is returning the correct type.`);
    }
  }
  if ($isElementNode(node)) {
    const serializedChildren = serializedNode.children;
    if (!Array.isArray(serializedChildren)) {
      {
        formatDevErrorMessage(`LexicalNode: Node ${nodeClass.name} is an element but .exportJSON() does not have a children array.`);
      }
    }
    const children = node.getChildren();
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const serializedChildNode = $exportNodeToJSON(child);
      serializedChildren.push(serializedChildNode);
    }
  }

  // Slots ride in a separate Map on every LexicalNode (an ElementNode or a
  // DecoratorNode host), so serialize them outside the element branch.
  const slotNames = $getSlotNames(node);
  if (slotNames.length > 0) {
    const serializedSlots = {};
    for (const name of slotNames) {
      const slotNode = $getSlot(node, name);
      if (!(slotNode !== null)) {
        formatDevErrorMessage(`LexicalNode: Node ${nodeClass.name} has slot "${name}" but it resolved to no node during export.`);
      }
      serializedSlots[name] = $exportNodeToJSON(slotNode);
    }
    serializedNode.$slots = serializedSlots;
  }

  // @ts-expect-error
  return serializedNode;
}
/**
 * Type guard that returns true if the argument is an EditorState
 */
function $isEditorState(x) {
  return x instanceof EditorState;
}
class EditorState {
  _nodeMap;
  _selection;
  _flushSync;
  _readOnly;
  /**
   * True if this EditorState was parsed without running transforms
   */
  _parsed;
  /**
   * True if this EditorState or the LexicalEditor that created it has
   * ever used slots
   */
  _slotsUsed;
  constructor(nodeMap, selection = null, slotsUsed = false) {
    this._nodeMap = nodeMap;
    this._selection = selection || null;
    this._flushSync = false;
    this._readOnly = false;
    this._parsed = false;
    this._slotsUsed = slotsUsed;
  }
  isEmpty() {
    return this._nodeMap.size === 1 && this._selection === null;
  }
  read(callbackFn, options) {
    return readEditorState(options && options.editor || null, this, callbackFn);
  }
  clone(selection) {
    const editorState = new EditorState(this._nodeMap, selection === undefined ? this._selection : selection, this._slotsUsed);
    editorState._readOnly = true;
    return editorState;
  }
  toJSON() {
    return readEditorState(null, this, () => ({
      root: $exportNodeToJSON($getRoot())
    }));
  }
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */


// TODO: Cleanup ArtificialNode__DO_NOT_USE #5966
/** @internal */
class ArtificialNode__DO_NOT_USE extends ElementNode {
  $config() {
    return this.config('artificial', {
      extends: ElementNode
    });
  }
  createDOM(config) {
    // this isnt supposed to be used and is not used anywhere but defining it to appease the API
    const dom = $getDocument().createElement('div');
    return dom;
  }
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/** @noInheritDoc */
class LineBreakNode extends LexicalNode {
  /** @internal */

  $config() {
    return this.config('linebreak', {
      importDOM: {
        br: node => {
          if (isOnlyChildInBlockNode(node) || isLastChildInBlockNode(node)) {
            return null;
          }
          return {
            conversion: $convertLineBreakElement,
            priority: 0
          };
        }
      }
    });
  }
  getTextContent() {
    return '\n';
  }
  createDOM() {
    return $getDocument().createElement('br');
  }
  updateDOM() {
    return false;
  }
  isInline() {
    return true;
  }
}
function $convertLineBreakElement(node) {
  return {
    node: $createLineBreakNode()
  };
}
function $createLineBreakNode() {
  return $applyNodeReplacement(new LineBreakNode());
}
function $isLineBreakNode(node) {
  return node instanceof LineBreakNode;
}

/**
 * True when `node` is the sole non-whitespace child of a block DOM
 * element. Used by the LineBreak importer to drop stray `<br>` elements
 * that the legacy `$generateNodesFromDOM` also skipped (matches the
 * behavior of `LineBreakNode.importDOM`).
 *
 * @experimental
 */
function isOnlyChildInBlockNode(node) {
  const parentElement = node.parentElement;
  if (parentElement !== null && isBlockDomNode(parentElement)) {
    const firstChild = parentElement.firstChild;
    if (firstChild === node || firstChild.nextSibling === node && isWhitespaceDomTextNode(firstChild)) {
      const lastChild = parentElement.lastChild;
      if (lastChild === node || lastChild.previousSibling === node && isWhitespaceDomTextNode(lastChild)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * True when `node` is the trailing non-whitespace child of a block DOM
 * element (excluding the only-child case). Used by the LineBreak
 * importer to drop trailing `<br>` elements like the Apple-interchange
 * clipboard artifact (matches `LineBreakNode.importDOM`).
 *
 * @experimental
 */
function isLastChildInBlockNode(node) {
  const parentElement = node.parentElement;
  if (parentElement !== null && isBlockDomNode(parentElement)) {
    // check if node is first child, because only child dont count
    const firstChild = parentElement.firstChild;
    if (firstChild === node || firstChild.nextSibling === node && isWhitespaceDomTextNode(firstChild)) {
      return false;
    }

    // check if its last child
    const lastChild = parentElement.lastChild;
    if (lastChild === node || lastChild.previousSibling === node && isWhitespaceDomTextNode(lastChild)) {
      return true;
    }
  }
  return false;
}
function isWhitespaceDomTextNode(node) {
  return isDOMTextNode(node) && /^( |\t|\r?\n)+$/.test(node.textContent || '');
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/** @noInheritDoc */
class ParagraphNode extends ElementNode {
  /** @internal */

  $config() {
    return this.config('paragraph', {
      extends: ElementNode,
      importDOM: {
        p: () => ({
          conversion: $convertParagraphElement,
          priority: 0
        })
      }
    });
  }

  // View

  createDOM(config) {
    const dom = $getDocument().createElement('p');
    const classNames = getCachedClassNameArray(config.theme, 'paragraph');
    if (classNames !== undefined) {
      const domClassList = dom.classList;
      domClassList.add(...classNames);
    }
    return dom;
  }
  updateDOM(prevNode, dom, config) {
    return false;
  }
  exportDOM(editor) {
    const {
      element
    } = super.exportDOM(editor);
    if (isHTMLElement(element)) {
      if (this.isEmpty()) {
        element.append($getDocument().createElement('br'));
      }
      const formatType = this.getFormatType();
      if (formatType) {
        element.style.textAlign = formatType;
      }
    }
    return {
      element
    };
  }
  exportJSON() {
    const json = super.exportJSON();
    // Provide backwards compatible values, see #7971
    if (json.textFormat === undefined || json.textStyle === undefined) {
      // Compute the same value that the reconciler would
      const firstTextNode = this.getChildren().find($isTextNode);
      if (firstTextNode) {
        json.textFormat = firstTextNode.getFormat();
        json.textStyle = firstTextNode.getStyle();
      } else {
        json.textFormat = this.getTextFormat();
        json.textStyle = this.getTextStyle();
      }
    }
    return json;
  }

  // Mutation

  insertNewAfter(rangeSelection, restoreSelection) {
    const newElement = $createParagraphNode();
    newElement.setTextFormat(rangeSelection.format);
    newElement.setTextStyle(rangeSelection.style);
    const direction = this.getDirection();
    newElement.setDirection(direction);
    newElement.setFormat(this.getFormatType());
    newElement.setStyle(this.getStyle());
    this.insertAfter(newElement, restoreSelection);
    return newElement;
  }
  collapseAtStart() {
    const children = this.getChildren();
    // If we have an empty (trimmed) first paragraph and try and remove it,
    // delete the paragraph as long as we have another sibling to go to
    if (children.length === 0 || $isTextNode(children[0]) && children[0].getTextContent().trim() === '') {
      const nextSibling = this.getNextSibling();
      if (nextSibling !== null) {
        this.selectNext();
        this.remove();
        return true;
      }
      const prevSibling = this.getPreviousSibling();
      if (prevSibling !== null) {
        this.selectPrevious();
        this.remove();
        return true;
      }
    }
    return false;
  }
}
function $convertParagraphElement(element) {
  const node = $createParagraphNode();
  $setFormatFromDOM(node, element);
  setNodeIndentFromDOM(element, node);

  // Check legacy 'align' attribute
  // Only use this if no format was set by CSS
  if (node.getFormatType() === '') {
    const align = element.getAttribute('align');
    if (align) {
      if (align && align in ELEMENT_TYPE_TO_FORMAT) {
        node.setFormat(align);
      }
    }
  }
  $setDirectionFromDOM(node, element);
  return {
    node
  };
}
function $createParagraphNode() {
  return $applyNodeReplacement(new ParagraphNode());
}
function $isParagraphNode(node) {
  return node instanceof ParagraphNode;
}

// https://github.com/microsoft/TypeScript/issues/3841
// eslint-disable-next-line @typescript-eslint/no-explicit-any

// eslint-disable-next-line @typescript-eslint/no-explicit-any

/**
 * Controls which editor state {@link LexicalEditor.read} observes and whether
 * pending updates are flushed before the read.
 *
 * - `'force-commit'` (the default) flushes any pending updates immediately
 *   before the read, so it always observes a fully committed and reconciled
 *   state.
 * - `'pending'` reads the pending state if it exists, otherwise the committed
 *   state, without flushing. This is safe to call when an update may already
 *   be in progress at the cost of possibly observing an uncommitted state
 *   before node transforms, DOM reconciliation, etc. have run.
 * - `'latest'` reads the latest committed state without flushing pending
 *   updates, equivalent to `editor.getEditorState().read(callbackFn, {editor})`.
 */

/** @internal */

/** @internal */

/** @internal */
function createInputState() {
  return {
    collapsedSelectionFormat: {
      format: 0,
      key: 'root',
      offset: 0,
      style: '',
      timeStamp: 0
    },
    compositionEndData: '',
    compositionPhase: 'idle',
    hadOrphanedCompositionEvents: false,
    handledSelectionCommandTimeoutId: null,
    isInsertLineBreak: false,
    isInsertTextAfterHandledSelectionCommand: false,
    isSelectionChangeFromDOMUpdate: false,
    isSelectionChangeFromMouseDown: false,
    lastBeforeInputInsertTextTimeStamp: 0,
    lastKeyCode: null,
    lastKeyDownTimeStamp: 0,
    postDeleteSelectionToRestore: null,
    unprocessedBeforeInputData: null
  };
}

/**
 * Configuration entry passed in {@link CreateEditorArgs.nodes} to substitute
 * a core node class with a custom subclass. The replacement class itself
 * must also appear in `nodes`.
 *
 * See [Node Replacement](https://lexical.dev/docs/concepts/node-replacement).
 */

/**
 * A LexicalNode class or LexicalNodeReplacement configuration
 */

/**
 * @experimental
 *
 * The slot type produced by `$getDOMSlot` for a given node, narrowed via
 * the node's static class: `ElementNode` resolves to {@link ElementDOMSlot}
 * (with children-management methods), other nodes to the base
 * {@link DOMSlot}. Callers passing a known node type get the narrowed slot
 * without manual `instanceof` checks.
 */

/** @internal @experimental */

/**
 * Default {@link CreateEditorArgs.onWarn} handler. Used for recoverable,
 * warn-level conditions (e.g. the update-recursion guard tripping) that the
 * editor has already recovered from. Throws in development so the condition is
 * impossible to miss, and only `console.warn`s in production so it is not
 * reported as a fatal error. Embedders can override this via `onWarn` to route
 * the condition to their own telemetry at warn severity.
 */
function defaultOnWarn(error) {
  {
    throw error;
  }
}
const DEFAULT_SKIP_INITIALIZATION = false;

/**
 * The payload passed to an UpdateListener
 */

/**
 * A listener that gets called after the editor is updated
 */

/**
 * A listener that is called when {@link LexicalEditor.setRootElement} changes the
 * element that the editor is attached to. If this callback returns a function,
 * that function will be called before the next value update or unregister.
 */

/**
 * A listener that is called when {@link LexicalEditor.setEditable} changes the
 * editable state of the editor. If this callback returns a function,
 * that function will be called before the next value update or unregister.
 */

/**
 * {@link LexicalEditor.registerCommand} listener added to the end of the editor priority queue (after critical, high, normal, low)
 */
const COMMAND_PRIORITY_EDITOR = 0;
/**
 * {@link LexicalEditor.registerCommand} listener added to the end of the low priority queue (after critical, high, normal; before editor)
 */
const COMMAND_PRIORITY_LOW = 1;
/**
 * {@link LexicalEditor.registerCommand} listener added to the end of the normal priority queue (after critical, high; before low, editor)
 */
const COMMAND_PRIORITY_NORMAL = 2;
/**
 * {@link LexicalEditor.registerCommand} listener added to the end of the high priority queue (after critical; before normal, low, editor)
 */
const COMMAND_PRIORITY_HIGH = 3;
/**
 * {@link LexicalEditor.registerCommand} listener added to the end of the critical priority queue (before high, normal, low, editor)
 */
const COMMAND_PRIORITY_CRITICAL = 4;
/**
 * {@link LexicalEditor.registerCommand} listener added to the beginning of the editor priority queue (after critical, high, normal, low)
 */
const COMMAND_PRIORITY_BEFORE_EDITOR = -8;
/**
 * {@link LexicalEditor.registerCommand} listener added to the beginning of the low priority queue (after critical, high, normal; before editor)
 */
const COMMAND_PRIORITY_BEFORE_LOW = -7;
/**
 * {@link LexicalEditor.registerCommand} listener added to the beginning of the normal priority queue (after critical, high; before low, editor)
 */
const COMMAND_PRIORITY_BEFORE_NORMAL = -6;
/**
 * {@link LexicalEditor.registerCommand} listener added to the beginning of the high priority queue (after critical; before normal, low, editor)
 */
const COMMAND_PRIORITY_BEFORE_HIGH = -5;
/**
 * {@link LexicalEditor.registerCommand} listener added to the beginning of the critical priority queue (before high, normal, low, editor)
 */
const COMMAND_PRIORITY_BEFORE_CRITICAL = -4;
function normalizePriority(priority) {
  return priority & 7;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any

/**
 * Type helper for extracting the payload type from a command.
 *
 * @example
 * ```ts
 * const MY_COMMAND = createCommand<SomeType>();
 *
 * // ...
 *
 * editor.registerCommand(MY_COMMAND, payload => {
 *   // Type of `payload` is inferred here. But lets say we want to extract a function to delegate to
 *   $handleMyCommand(editor, payload);
 *   return true;
 * });
 *
 * function $handleMyCommand(editor: LexicalEditor, payload: CommandPayloadType<typeof MY_COMMAND>) {
 *   // `payload` is of type `SomeType`, extracted from the command.
 * }
 * ```
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any

/** @internal */

/**
 * @internal
 *
 * Resets the editor's transient state — DOM mappings, dirty tracking,
 * composition, and (by default) the queued updates and tags — while
 * applying the given pendingEditorState. Used during root element
 * transitions and reconciler error recovery.
 */
function resetEditor(editor, prevRootElement, nextRootElement, pendingEditorState, options) {
  const keyNodeMap = editor._keyToDOMMap;
  keyNodeMap.clear();
  editor._editorState = createEmptyEditorState();
  editor._pendingEditorState = pendingEditorState;
  editor._compositionKey = null;
  editor._dirtyType = NO_DIRTY_NODES;
  editor._cloneNotNeeded.clear();
  editor._dirtyLeaves = new Set();
  editor._dirtyElements.clear();
  editor._normalizedNodes = new Set();
  if (!options || !options.preserveUpdateQueue) {
    editor._updateTags = new Set();
    editor._updates = [];
    editor._cascadeCount = 0;
  }
  editor._blockCursorElement = null;
  if (editor._inputState.handledSelectionCommandTimeoutId !== null) {
    clearTimeout(editor._inputState.handledSelectionCommandTimeoutId);
  }
  editor._inputState = createInputState();
  const observer = editor._observer;
  if (observer !== null) {
    observer.disconnect();
    editor._observer = null;
  }

  // Remove all the DOM nodes from the root element
  if (prevRootElement !== null) {
    prevRootElement.textContent = '';
    clearNodeKeyOnDOMNode(prevRootElement, editor);
  }
  if (nextRootElement !== null) {
    nextRootElement.textContent = '';
    keyNodeMap.set('root', nextRootElement);
    // Stash __lexicalKey_${editor._key} = 'root' on the root element so it
    // participates in the unified key lookup (selection resolution in
    // $internalResolveSelectionPoint, mutation handling in
    // $getNearestManagedNodePairFromDOMNode, $getNodeFromDOM, and
    // $getNearestNodeFromDOMNode) instead of requiring a dedicated
    // editor.getRootElement() carveout at each call site.
    setNodeKeyOnDOMNode(nextRootElement, editor, 'root');
  }
}
function initializeConversionCache(nodes, additionalConversions) {
  const conversionCache = new Map();
  const handledConversions = new Set();
  const addConversionsToCache = map => {
    Object.keys(map).forEach(key => {
      let currentCache = conversionCache.get(key);
      if (currentCache === undefined) {
        currentCache = [];
        conversionCache.set(key, currentCache);
      }
      currentCache.push(map[key]);
    });
  };
  nodes.forEach(node => {
    const importDOM = node.klass.importDOM;
    if (importDOM == null || handledConversions.has(importDOM)) {
      return;
    }
    handledConversions.add(importDOM);
    const map = importDOM.call(node.klass);
    if (map !== null) {
      addConversionsToCache(map);
    }
  });
  if (additionalConversions) {
    addConversionsToCache(additionalConversions);
  }
  return conversionCache;
}

/** @internal */
function getTransformSetFromKlass(klass) {
  const transforms = new Set();
  const staticTransforms = new Set();
  for (const {
    klass: currentKlass,
    ownNodeConfig
  } of iterStaticNodeConfigChain(klass)) {
    const staticTransform = currentKlass.transform;
    if (!staticTransforms.has(staticTransform)) {
      staticTransforms.add(staticTransform);
      const transform = currentKlass.transform();
      if (transform) {
        transforms.add(transform);
      }
    }
    if (ownNodeConfig) {
      const $transform = ownNodeConfig.$transform;
      if ($transform) {
        transforms.add($transform);
      }
    }
  }
  return transforms;
}

/** @internal @experimental */
const DEFAULT_EDITOR_DOM_CONFIG = {
  $createDOM: (node, editor) => node.createDOM(editor._config, editor),
  $decorateDOM: (_node, _prevNode, _dom, _editor) => {},
  $exportDOM: (node, editor) => {
    const registeredNode = getRegisteredNode(editor, node.getType());
    // Use HTMLConfig overrides, if available.
    return registeredNode && registeredNode.exportDOM !== undefined ? registeredNode.exportDOM(editor, node) : node.exportDOM(editor);
  },
  $extractWithChild: (node, childNode, selection, destination, _editor) => $isElementNode(node) && node.extractWithChild(childNode, selection, destination),
  $getDOMSlot: (node, dom, _editor) => node.getDOMSlot(dom),
  $getSlotTargetElement: (_node, _slotName, _hostDom, _editor) => null,
  $shouldExclude: (node, _selection, _editor) => $isElementNode(node) && node.excludeFromCopy('html'),
  $shouldInclude: (node, selection, _editor) => selection ? node.isSelected(selection) : true,
  $updateDOM: (nextNode, prevNode, dom, editor) => nextNode.updateDOM(prevNode, dom, editor._config)
};

/**
 * Creates a new LexicalEditor attached to a single contentEditable (provided in the config). This is
 * the lowest-level initialization API for a LexicalEditor. If you're using React or another framework,
 * consider using the appropriate abstractions, such as LexicalComposer
 * @param editorConfig - the editor configuration.
 * @returns a LexicalEditor instance
 */
function createEditor(editorConfig) {
  const config = editorConfig || {};
  const activeEditor = internalGetActiveEditor();
  const theme = config.theme || {};
  const parentEditor = editorConfig === undefined ? activeEditor : config.parentEditor || null;
  const disableEvents = config.disableEvents || false;
  const editorState = createEmptyEditorState();
  const namespace = config.namespace || (parentEditor !== null ? parentEditor._config.namespace : createUID());
  const initialEditorState = config.editorState;
  const nodes = [RootNode, TextNode, LineBreakNode, TabNode, ParagraphNode, ArtificialNode__DO_NOT_USE, ...(config.nodes || [])];
  const {
    onError,
    onWarn,
    html
  } = config;
  const isEditable = config.editable !== undefined ? config.editable : true;
  let registeredNodes;
  if (editorConfig === undefined && activeEditor !== null) {
    registeredNodes = activeEditor._nodes;
  } else {
    registeredNodes = new Map();
    for (let i = 0; i < nodes.length; i++) {
      let klass = nodes[i];
      let replace = null;
      let replaceWithKlass = null;
      if (klass && typeof klass === 'object') {
        const options = klass;
        klass = options.replace;
        replace = options.with;
        replaceWithKlass = options.withKlass || null;
      }
      if (typeof klass !== 'function' || !klass.prototype || !(klass === LexicalNode || klass.prototype instanceof LexicalNode)) {
        let version = '<unknown>';
        try {
          version = JSON.parse(LEXICAL_VERSION);
        } catch (_unused) {
          //
        }
        {
          formatDevErrorMessage(`createEditor: nodes[${String(i - nodes.length + (config.nodes ? config.nodes.length : 0))}] ${typeof klass === 'function' ? `${klass.name}${typeof klass.getType === 'function' ? ` (type ${String(klass.getType())})` : ''}` : String(klass)} is not a constructor that subclasses LexicalNode from the lexical package used by this editor (${String(version)})`);
        }
      }
      // For the side-effect of filling in the static methods
      void getStaticNodeConfig(klass);

      // Ensure custom nodes implement required methods and replaceWithKlass is instance of base klass.
      {
        // ArtificialNode__DO_NOT_USE can get renamed, so we use the type
        const name = klass.name;
        const nodeType = hasOwnStaticMethod(klass, 'getType') && klass.getType();
        if (replaceWithKlass) {
          if (!(replaceWithKlass.prototype instanceof klass)) {
            formatDevErrorMessage(`${replaceWithKlass.name} doesn't extend the ${name}`);
          }
        } else if (replace) {
          console.warn(`Override for ${name} specifies 'replace' without 'withKlass'. 'withKlass' will be required in a future version.`);
        }
        if (name !== 'RootNode' && nodeType !== 'root' && nodeType !== 'artificial' &&
        // This is mostly for the unit test suite which
        // uses LexicalNode in an otherwise incorrect way
        // by mocking its static getType
        klass !== LexicalNode) {
          ['getType', 'clone'].forEach(method => {
            if (!hasOwnStaticMethod(klass, method)) {
              console.warn(`${name} must implement static "${method}" method`);
            }
          });
          if (!hasOwnStaticMethod(klass, 'importJSON')) {
            console.warn(`${name} should implement "importJSON" method to ensure JSON and default HTML serialization works as expected`);
          }
        }
      }
      const type = klass.getType();
      const transforms = getTransformSetFromKlass(klass);
      registeredNodes.set(type, {
        exportDOM: html && html.export ? html.export.get(klass) : undefined,
        klass,
        replace,
        replaceWithKlass,
        sharedNodeState: createSharedNodeState(nodes[i]),
        transforms
      });
    }
  }
  const editor = new LexicalEditor(editorState, parentEditor, registeredNodes, {
    disableEvents,
    dom: {
      ...DEFAULT_EDITOR_DOM_CONFIG,
      ...(editorConfig && editorConfig.dom)
    },
    namespace,
    theme
  }, onError ? onError : console.error, onWarn ? onWarn : defaultOnWarn, initializeConversionCache(registeredNodes, html ? html.import : undefined), isEditable, editorConfig);
  if (initialEditorState !== undefined) {
    editor._pendingEditorState = initialEditorState;
    editor._dirtyType = FULL_RECONCILE;
  }
  registerDefaultCommandHandlers(editor);
  return editor;
}
function triggerListener(listenerMap, listener, args) {
  const unregister = listenerMap.get(listener);
  if (unregister) {
    unregister();
  }
  listenerMap.set(listener, listener(...args) || undefined);
}
function unregisterListener(listenerMap, listener) {
  const unregister = listenerMap.get(listener);
  listenerMap.delete(listener);
  if (unregister) {
    unregister();
  }
}
function registerListener(listenerMap, listener, unregister) {
  listenerMap.set(listener, unregister);
  return unregisterListener.bind(null, listenerMap, listener);
}
class LexicalEditor {
  /** @internal */

  /** The version with build identifiers for this editor (since 0.17.1) */
  static version;

  /** @internal */
  _headless;
  /** @internal */
  _parentEditor;
  /** @internal */
  _rootElement;
  /** @internal */
  _editorState;
  /** @internal */
  _pendingEditorState;
  /** @internal */
  _compositionKey;
  /** @internal */
  _deferred;
  /** @internal */
  _keyToDOMMap;
  /** @internal */
  _updates;
  /** @internal */
  _updating;
  /** @internal */
  _cascadeCount;
  /** @internal */
  _listeners;
  /** @internal */
  _commands;
  /** @internal */
  _nodes;
  /** @internal */
  _decorators;
  /** @internal */
  _pendingDecorators;
  /** @internal */
  _config;
  /** @internal */
  _dirtyType;
  /** @internal */
  _cloneNotNeeded;
  /** @internal */
  _dirtyLeaves;
  /** @internal */
  _dirtyElements;
  /** @internal */
  _normalizedNodes;
  /** @internal */
  _updateTags;
  /** @internal */
  _observer;
  /** @internal */
  _key;
  /** @internal */
  _onError;
  /** @internal */
  _onWarn;
  /** @internal */
  _htmlConversions;
  /** @internal */
  _window;
  /** @internal */
  _editable;
  /** @internal */
  _blockCursorElement;
  /**
   * @internal @experimental
   *
   * Latches to `true` the first time {@link $setSlot} runs in this
   * editor. Gates the commit-time slot-containment clamp so editors that never
   * use slots skip the per-update frame walk entirely. The latch persists for
   * the lifetime of the editor instance — `resetEditor` and `setEditorState`
   * do not clear it, so an editor that once used slots keeps paying the clamp
   * cost even after switching to a slot-free state.
   */
  _slotsUsed;
  /** @internal */
  _inputState;
  /** @internal */
  _createEditorArgs;

  /** @internal */
  constructor(editorState, parentEditor, nodes, config, onError, onWarn, htmlConversions, editable, createEditorArgs) {
    this._createEditorArgs = createEditorArgs;
    this._parentEditor = parentEditor;
    // The root element associated with this editor
    this._rootElement = null;
    // The current editor state
    this._editorState = editorState;
    // Handling of drafts and updates
    this._pendingEditorState = null;
    // Used to help co-ordinate selection and events
    this._compositionKey = null;
    this._deferred = [];
    // Used during reconciliation
    this._keyToDOMMap = new GenMap();
    this._updates = [];
    this._updating = false;
    this._cascadeCount = 0;
    // Listeners
    this._listeners = {
      decorator: new Map(),
      editable: new Map(),
      mutation: new Map(),
      root: new Map(),
      textcontent: new Map(),
      update: new Map()
    };
    // Commands
    this._commands = new Map();
    // Editor configuration for theme/context.
    this._config = config;
    // Mapping of types to their nodes
    this._nodes = nodes;
    // React node decorators for portals
    this._decorators = {};
    this._pendingDecorators = null;
    // Used to optimize reconciliation
    this._dirtyType = NO_DIRTY_NODES;
    this._cloneNotNeeded = new Set();
    this._dirtyLeaves = new Set();
    this._dirtyElements = new Map();
    this._normalizedNodes = new Set();
    this._updateTags = new Set();
    // Handling of DOM mutations
    this._observer = null;
    // Used for identifying owning editors
    this._key = createUID();
    this._onError = onError;
    this._onWarn = onWarn;
    this._htmlConversions = htmlConversions;
    this._editable = editable;
    this._headless = parentEditor !== null && parentEditor._headless;
    this._window = null;
    this._blockCursorElement = null;
    this._slotsUsed = false;
    this._inputState = createInputState();
  }

  /**
   *
   * @returns true if the editor is currently in "composition" mode due to receiving input
   * through an IME, or 3P extension, for example. Returns false otherwise.
   */
  isComposing() {
    return this._compositionKey != null;
  }
  /**
   * Registers a listener for Editor update event. Will trigger the provided callback
   * each time the editor goes through an update (via {@link LexicalEditor.update}) until the
   * teardown function is called.
   *
   * @returns a teardown function that can be used to cleanup the listener.
   */
  registerUpdateListener(listener) {
    return registerListener(this._listeners.update, listener);
  }
  /**
   * Registers a listener for when the editor changes between editable and non-editable states.
   * Will trigger the provided callback each time the editor transitions between these states until the
   * teardown function is called.
   *
   * If the listener returns a function, that function will be called before the next transition or
   * teardown.
   *
   * @returns a teardown function that can be used to cleanup the listener.
   */
  registerEditableListener(listener) {
    return registerListener(this._listeners.editable, listener);
  }
  /**
   * Registers a listener for when the editor's decorator object changes. The decorator object contains
   * all DecoratorNode keys -> their decorated value. This is primarily used with external UI frameworks.
   *
   * Will trigger the provided callback each time the editor transitions between these states until the
   * teardown function is called.
   *
   * @returns a teardown function that can be used to cleanup the listener.
   */
  registerDecoratorListener(listener) {
    return registerListener(this._listeners.decorator, listener);
  }
  /**
   * Registers a listener for when Lexical commits an update to the DOM and the text content of
   * the editor changes from the previous state of the editor. If the text content is the
   * same between updates, no notifications to the listeners will happen.
   *
   * Will trigger the provided callback each time the editor transitions between these states until the
   * teardown function is called.
   *
   * @returns a teardown function that can be used to cleanup the listener.
   */
  registerTextContentListener(listener) {
    return registerListener(this._listeners.textcontent, listener);
  }
  /**
   * Registers a listener for when the editor's root DOM element (the content editable
   * Lexical attaches to) changes. This is primarily used to attach event listeners to the root
   *  element. The root listener function is executed directly upon registration and then on
   * any subsequent update.
   *
   * Will trigger the provided callback each time the editor transitions between these states until the
   * teardown function is called.
   *
   * If the listener returns a function, that function will be called before the next transition or
   * teardown.
   *
   * @returns a teardown function that can be used to cleanup the listener.
   */
  registerRootListener(listener) {
    const listenerMap = this._listeners.root;
    return mergeRegister(registerListener(listenerMap, listener, listener(this._rootElement, null) || undefined), () => triggerListener(listenerMap, listener, [null, this._rootElement]));
  }
  /**
   * Registers a listener that will trigger anytime the provided command
   * is dispatched with {@link LexicalEditor.dispatch}, subject to priority.
   * Listeners that run at a higher priority can "intercept" commands and
   * prevent them from propagating to other handlers by returning true.
   *
   * Listeners are always invoked in an {@link LexicalEditor.update} and can
   * call dollar functions.
   *
   * Listeners registered at the same priority level will run
   * deterministically in the order of registration.
   *
   * @param command - the command that will trigger the callback.
   * @param listener - the function that will execute when the command is dispatched.
   * @param priority - the relative priority of the listener. 0 | 1 | 2 | 3 | 4
   *   (or {@link COMMAND_PRIORITY_EDITOR} |
   *     {@link COMMAND_PRIORITY_LOW} |
   *     {@link COMMAND_PRIORITY_NORMAL} |
   *     {@link COMMAND_PRIORITY_HIGH} |
   *     {@link COMMAND_PRIORITY_CRITICAL})
   * @returns a teardown function that can be used to cleanup the listener.
   */
  registerCommand(command, listener, priority) {
    if (priority === undefined) {
      {
        formatDevErrorMessage(`Listener for type "command" requires a "priority".`);
      }
    }
    const commandsMap = this._commands;
    if (!commandsMap.has(command)) {
      commandsMap.set(command, [new DequeSet(), new DequeSet(), new DequeSet(), new DequeSet(), new DequeSet()]);
    }
    const listenersInPriorityOrder = commandsMap.get(command);
    if (listenersInPriorityOrder === undefined) {
      {
        formatDevErrorMessage(`registerCommand: Command ${String(command)} not found in command map`);
      }
    }
    const normalizedPriority = normalizePriority(priority);
    const listeners = listenersInPriorityOrder[normalizedPriority];
    if (normalizedPriority !== priority) {
      listeners.addFront(listener);
    } else {
      listeners.addBack(listener);
    }
    return () => {
      listeners.delete(listener);
      if (listenersInPriorityOrder.every(listenersSet => listenersSet.size === 0)) {
        commandsMap.delete(command);
      }
    };
  }

  /**
   * Registers a listener that will run when a Lexical node of the provided class is
   * mutated. The listener will receive a list of nodes along with the type of mutation
   * that was performed on each: created, destroyed, or updated.
   *
   * One common use case for this is to attach DOM event listeners to the underlying DOM nodes as Lexical nodes are created.
   * {@link LexicalEditor.getElementByKey} can be used for this.
   *
   * If any existing nodes are in the DOM, and skipInitialization is not true, the listener
   * will be called immediately with an updateTag of 'registerMutationListener' where all
   * nodes have the 'created' NodeMutation. This can be controlled with the skipInitialization option
   * (whose default was previously true for backwards compatibility with &lt;=0.16.1 but has been changed to false as of 0.21.0).
   *
   * @param klass - The class of the node that you want to listen to mutations on.
   * @param listener - The logic you want to run when the node is mutated.
   * @param options - see {@link MutationListenerOptions}
   * @returns a teardown function that can be used to cleanup the listener.
   */
  registerMutationListener(klass, listener, options) {
    const klassToMutate = this.resolveRegisteredNodeAfterReplacements(this.getRegisteredNode(klass)).klass;
    const mutations = this._listeners.mutation;
    let klassSet = mutations.get(listener);
    if (klassSet === undefined) {
      klassSet = new Set();
      mutations.set(listener, klassSet);
    }
    klassSet.add(klassToMutate);
    const skipInitialization = options && options.skipInitialization;
    if (!(skipInitialization === undefined ? DEFAULT_SKIP_INITIALIZATION : skipInitialization)) {
      this.initializeMutationListener(listener, klassToMutate);
    }
    return () => {
      klassSet.delete(klassToMutate);
      if (klassSet.size === 0) {
        mutations.delete(listener);
      }
    };
  }

  /** @internal */
  getRegisteredNode(klass) {
    const registeredNode = this._nodes.get(klass.getType());
    if (registeredNode === undefined) {
      {
        formatDevErrorMessage(`Node ${klass.name} has not been registered. Ensure node has been passed to createEditor.`);
      }
    }
    return registeredNode;
  }

  /** @internal */
  resolveRegisteredNodeAfterReplacements(registeredNode) {
    while (registeredNode.replaceWithKlass) {
      registeredNode = this.getRegisteredNode(registeredNode.replaceWithKlass);
    }
    return registeredNode;
  }

  /** @internal */
  initializeMutationListener(listener, klass) {
    const prevEditorState = this._editorState;
    const nodeMap = getCachedTypeToNodeMap(prevEditorState).get(klass.getType());
    if (!nodeMap) {
      return;
    }
    const nodeMutationMap = new Map();
    for (const k of nodeMap.keys()) {
      nodeMutationMap.set(k, 'created');
    }
    if (nodeMutationMap.size > 0) {
      listener(nodeMutationMap, {
        dirtyLeaves: new Set(),
        prevEditorState,
        updateTags: new Set(['registerMutationListener'])
      });
    }
  }

  /** @internal */
  registerNodeTransformToKlass(klass, listener) {
    const registeredNode = this.getRegisteredNode(klass);
    registeredNode.transforms.add(listener);
    return registeredNode;
  }

  /**
   * Registers a listener that will run when a Lexical node of the provided class is
   * marked dirty during an update. The listener will continue to run as long as the node
   * is marked dirty. There are no guarantees around the order of transform execution!
   *
   * Watch out for infinite loops. See [Node Transforms](https://lexical.dev/docs/concepts/transforms)
   * @param klass - The class of the node that you want to run transforms on.
   * @param listener - The logic you want to run when the node is updated.
   * @returns a teardown function that can be used to cleanup the listener.
   */
  registerNodeTransform(klass, listener) {
    const registeredNode = this.registerNodeTransformToKlass(klass, listener);
    const registeredNodes = [registeredNode];
    const replaceWithKlass = registeredNode.replaceWithKlass;
    if (replaceWithKlass != null) {
      const registeredReplaceWithNode = this.registerNodeTransformToKlass(replaceWithKlass, listener);
      registeredNodes.push(registeredReplaceWithNode);
    }
    markNodesWithTypesAsDirty(this, registeredNodes.map(node => node.klass.getType()));
    return () => {
      registeredNodes.forEach(node => node.transforms.delete(listener));
    };
  }

  /**
   * Used to assert that a certain node is registered, usually by plugins to ensure nodes that they
   * depend on have been registered.
   * @returns True if the editor has registered the provided node type, false otherwise.
   */
  hasNode(node) {
    return this._nodes.has(node.getType());
  }

  /**
   * Used to assert that certain nodes are registered, usually by plugins to ensure nodes that they
   * depend on have been registered.
   * @returns True if the editor has registered all of the provided node types, false otherwise.
   */
  hasNodes(nodes) {
    return nodes.every(this.hasNode.bind(this));
  }

  /**
   * Dispatches a command of the specified type with the specified payload.
   * This triggers all command listeners (set by {@link LexicalEditor.registerCommand})
   * for this type, passing them the provided payload. The command listeners
   * will be triggered in an implicit {@link LexicalEditor.update}, unless
   * this was invoked from inside an update in which case that update context
   * will be re-used (as if this was a dollar function itself).
   * @param type - the type of command listeners to trigger.
   * @param payload - the data to pass as an argument to the command listeners.
   */
  dispatchCommand(type, ...args) {
    return dispatchCommand(this, type, ...args);
  }

  /**
   * Gets a map of all decorators in the editor.
   * @returns A mapping of call decorator keys to their decorated content
   */
  getDecorators() {
    return this._decorators;
  }

  /**
   *
   * @returns the current root element of the editor. If you want to register
   * an event listener, do it via {@link LexicalEditor.registerRootListener}, since
   * this reference may not be stable.
   */
  getRootElement() {
    return this._rootElement;
  }

  /**
   * Gets the key of the editor
   * @returns The editor key
   */
  getKey() {
    return this._key;
  }

  /**
   * Imperatively set the root contenteditable element that Lexical listens
   * for events on.
   */
  setRootElement(nextRootElement) {
    const prevRootElement = this._rootElement;
    if (nextRootElement !== prevRootElement) {
      const classNames = getCachedClassNameArray(this._config.theme, 'root');
      const pendingEditorState = this._pendingEditorState || this._editorState;
      this._rootElement = nextRootElement;
      resetEditor(this, prevRootElement, nextRootElement, pendingEditorState, {
        preserveUpdateQueue: true
      });
      if (prevRootElement !== null) {
        // TODO: remove this flag once we no longer use UEv2 internally
        if (!this._config.disableEvents) {
          removeRootElementEvents(prevRootElement);
        }
        if (classNames != null) {
          prevRootElement.classList.remove(...classNames);
        }
      }
      if (nextRootElement !== null) {
        const windowObj = getDefaultView(nextRootElement);
        const style = nextRootElement.style;
        style.userSelect = 'text';
        style.whiteSpace = 'pre-wrap';
        style.wordBreak = 'break-word';
        nextRootElement.setAttribute('data-lexical-editor', 'true');
        this._window = windowObj;
        this._dirtyType = FULL_RECONCILE;
        initMutationObserver(this);
        this._updateTags.add(HISTORY_MERGE_TAG);
        $commitPendingUpdates(this);

        // TODO: remove this flag once we no longer use UEv2 internally
        if (!this._config.disableEvents) {
          addRootElementEvents(nextRootElement, this);
        }
        if (classNames != null) {
          nextRootElement.classList.add(...classNames);
        }
        {
          const nextRootElementParent = getParentElement(nextRootElement);
          if (nextRootElementParent != null && ['flex', 'inline-flex'].includes(getComputedStyle(nextRootElementParent).display)) {
            console.warn(`When using "display: flex" or "display: inline-flex" on an element containing content editable, Chrome may have unwanted focusing behavior when clicking outside of it. Consider wrapping the content editable within a non-flex element.`);
          }
        }
      } else {
        // When the content editable is unmounted we will still trigger a
        // reconciliation so that any pending updates are flushed,
        // to match the previous state change when
        // `_editorState = pendingEditorState` was used, but by
        // using a commit we preserve the readOnly invariant
        // for editor.getEditorState().
        this._window = null;
        this._updateTags.add(HISTORY_MERGE_TAG);
        $commitPendingUpdates(this);
      }
      triggerListeners('root', this, false, nextRootElement, prevRootElement);
    }
  }

  /**
   * Gets the underlying HTMLElement associated with the LexicalNode for the given key.
   * @returns the HTMLElement rendered by the LexicalNode associated with the key.
   * @param key - the key of the LexicalNode.
   */
  getElementByKey(key) {
    return this._keyToDOMMap.get(key) || null;
  }

  /**
   * Gets the active editor state.
   * @returns The editor state
   */
  getEditorState() {
    return this._editorState;
  }

  /**
   * Imperatively set the EditorState. Triggers reconciliation like an update.
   * @param editorState - the state to set the editor
   * @param options - options for the update.
   */
  setEditorState(editorState, options) {
    if (editorState.isEmpty()) {
      {
        formatDevErrorMessage(`setEditorState: the editor state is empty. Ensure the editor state's root node never becomes empty.`);
      }
    }

    // Ensure that we have a writable EditorState so that transforms can run
    // during a historic operation
    let writableEditorState = editorState;
    if (writableEditorState._readOnly) {
      writableEditorState = cloneEditorState(editorState);
      writableEditorState._selection = editorState._selection ? editorState._selection.clone() : null;
    }
    flushRootMutations(this);
    const pendingEditorState = this._pendingEditorState;
    const tag = options !== undefined ? options.tag : null;
    if (pendingEditorState !== null && !pendingEditorState.isEmpty()) {
      if (tag != null) {
        this._updateTags.add(tag);
      }
      // This may commit a no-op update (e.g. when called via dispatchCommand
      // mid-update), which resets this._updateTags to a fresh Set. Always read
      // this._updateTags fresh below rather than caching the reference, so the
      // tag for the editor state we are about to apply is added to the live Set
      // that the subsequent commit will observe.
      $commitPendingUpdates(this);
    }
    this._pendingEditorState = writableEditorState;
    this._dirtyType = FULL_RECONCILE;
    this._dirtyElements.set('root', false);
    this._compositionKey = null;
    this._slotsUsed = this._slotsUsed || editorState._slotsUsed;

    // Only commit pending updates if not already in an editor.update
    // (e.g. dispatchCommand) otherwise this will cause a second commit
    // with an already read-only state and selection
    updateEditorSync(this, () => {
      if (tag) {
        this._updateTags.add(tag);
      }
      if (editorState._parsed) {
        for (const [key, node] of writableEditorState._nodeMap.entries()) {
          // Mark all nodes as dirty with a freshly parsed EditorState
          // hydrate-time normalize: external inputs (URL doc payloads, imported
          // JSON, paste round-trips) may carry shadow-root slot frames whose
          // children violate the `Children of root nodes must be elements or
          // decorators` invariant set by `getTopLevelElement`. In-editor mutation
          // paths still fail-fast on the invariant — this only catches shapes
          // that were parsed in from outside.
          //
          // Drives the existing dirty-node transform cycle: dirty-mark the slot
          // hosts so `ElementNode`'s `$config` `$transform` (which calls
          // `$normalizeShadowRootChildren`) picks them up.
          if ($isElementNode(node)) {
            this._dirtyElements.set(key, true);
          } else {
            this._dirtyLeaves.add(key);
          }
        }
      }
    }, {
      discrete: this._updating ? undefined : true
    });
  }

  /**
   * Parses a SerializedEditorState (usually produced by {@link EditorState.toJSON}) and returns
   * and EditorState object that can be, for example, passed to {@link LexicalEditor.setEditorState}. Typically,
   * deserialization from JSON stored in a database uses this method.
   * @param maybeStringifiedEditorState
   * @param updateFn
   * @returns
   */
  parseEditorState(maybeStringifiedEditorState, updateFn) {
    const serializedEditorState = typeof maybeStringifiedEditorState === 'string' ? JSON.parse(maybeStringifiedEditorState) : maybeStringifiedEditorState;
    return parseEditorState(serializedEditorState, this, updateFn);
  }

  /**
   * Executes a read of the editor's state, with the
   * editor context available (useful for exporting and read-only DOM
   * operations). Much like update, but prevents any mutation of the
   * editor's state.
   *
   * When called with a single argument the `mode` defaults to
   * `'force-commit'`, which flushes any pending updates immediately before the
   * read so it always observes a fully committed and reconciled state. See
   * {@link EditorReadMode} for the behavior of the other modes (`'pending'`
   * and `'latest'`).
   * @param callbackFn - A function that has access to read-only editor state.
   */

  /**
   * Executes a read of the editor's state in the given `mode`, with the editor
   * context available. See {@link EditorReadMode} for the available modes.
   * @param mode - Which editor state to read and whether to flush first.
   * @param callbackFn - A function that has access to read-only editor state.
   */

  read(...args) {
    const [mode, callbackFn] = args.length === 1 ? ['force-commit', args[0]] : args;
    if (mode === 'force-commit') {
      $commitPendingUpdates(this);
    }
    // 'pending' observes an in-progress or queued update without flushing it;
    // 'force-commit' and 'latest' read the committed (reconciled) state.
    const editorState = mode === 'pending' ? this._pendingEditorState || this._editorState : this.getEditorState();
    return editorState.read(callbackFn, {
      editor: this
    });
  }

  /**
   * Executes an update to the editor state. The updateFn callback is the ONLY place
   * where Lexical editor state can be safely mutated.
   * @param updateFn - A function that has access to writable editor state.
   * @param options - A bag of options to control the behavior of the update.
   */
  update(updateFn, options) {
    updateEditor(this, updateFn, options);
  }

  /**
   * Focuses the editor by marking the existing selection as dirty, or by
   * creating a new selection at `defaultSelection` if one does not already
   * exist. If you want to force a specific selection, you should call
   * `root.selectStart()` or `root.selectEnd()` in an update.
   *
   * @param callbackFn - A function to run after the editor is focused.
   * @param options - A bag of options
   */
  focus(callbackFn, options = {}) {
    const rootElement = this._rootElement;
    if (rootElement !== null) {
      // This ensures that iOS does not trigger caps lock upon focus
      rootElement.setAttribute('autocapitalize', 'off');
      updateEditorSync(this, () => {
        const selection = $getSelection();
        const root = $getRoot();
        if (selection !== null) {
          // Marking the selection dirty will force the selection back to it
          if (!selection.dirty) {
            $setSelection(selection.clone());
          }
        } else if (root.getChildrenSize() !== 0) {
          if (options.defaultSelection === 'rootStart') {
            root.selectStart();
          } else {
            root.selectEnd();
          }
        }
        $addUpdateTag(FOCUS_TAG);
        $onUpdate(() => {
          rootElement.removeAttribute('autocapitalize');
          if (callbackFn) {
            callbackFn();
          }
        });
      });
      // In the case where onUpdate doesn't fire (due to the focus update not
      // occurring).
      if (this._pendingEditorState === null) {
        rootElement.removeAttribute('autocapitalize');
      }
    }
  }

  /**
   * Removes focus from the editor.
   */
  blur() {
    const rootElement = this._rootElement;
    if (rootElement !== null) {
      rootElement.blur();
    }
    const domSelection = getDOMSelection(this._window);
    if (domSelection !== null) {
      domSelection.removeAllRanges();
    }
  }
  /**
   * Returns true if the editor is editable, false otherwise.
   * @returns True if the editor is editable, false otherwise.
   */
  isEditable() {
    return this._editable;
  }
  /**
   * Sets the editable property of the editor. When false, the
   * editor will not listen for user events on the underling contenteditable.
   * @param editable - the value to set the editable mode to.
   */
  setEditable(editable) {
    if (this._editable !== editable) {
      this._editable = editable;
      triggerListeners('editable', this, true, editable);
      // A named-slot island rendered inside a non-editable host carries an
      // explicit `contentEditable` resolved from this editable state, so it
      // does not follow the root's editability on its own. Re-render to push
      // the toggle into those islands. A normal (non-discrete) update is safe
      // whether `setEditable` is called standalone (it commits on a microtask)
      // or from inside an update (it queues into that update's commit). Gated
      // on `_slotsUsed` so an editor that never slots anything keeps the
      // original no-reconcile behavior.
      if (this._slotsUsed) {
        this.update(() => $fullReconcile());
      }
    }
  }
  /**
   * Returns a JSON-serializable javascript object NOT a JSON string.
   * You still must call JSON.stringify (or something else) to turn the
   * state into a string you can transfer over the wire and store in a database.
   *
   * See {@link LexicalNode.exportJSON}
   *
   * @returns A JSON-serializable javascript object
   */
  toJSON() {
    return {
      editorState: this._editorState.toJSON()
    };
  }
}
LexicalEditor.version = LEXICAL_VERSION;

let pendingNodeToClone = null;
function setPendingNodeToClone(pendingNode) {
  pendingNodeToClone = pendingNode;
}
function getPendingNodeToClone() {
  const node = pendingNodeToClone;
  pendingNodeToClone = null;
  return node;
}

// Internal, module-private sentinel passed as the second argument to an
// auto-synthesized clone (see getStaticNodeConfig) by the internal clone
// wrappers ($cloneWithProperties / $copyNode). Those wrappers are contractually
// responsible for calling `afterCloneFrom(node)` on the result exactly once, so
// they pass this sentinel to tell the synthesized clone NOT to call it too.
//
// An auto-synthesized clone has no explicit body, so when it is called *without*
// this sentinel — i.e. directly as `NodeClass.clone(node)`, a documented and
// idiomatic pattern before the $config() port — it must copy the source node's
// properties itself, otherwise callers silently get a default-constructed node
// with lost state (e.g. HeadingNode's tag reverting to 'h1').
//
// The signal is per-call rather than a module global, so it is unaffected by
// reentrancy: a clone (or afterCloneFrom) that happens to clone another node,
// even in another editor, does not accidentally suppress that node's own
// afterCloneFrom. It is also un-spoofable by external callers because the
// sentinel is not exported. afterCloneFrom is not guaranteed idempotent (some
// nodes accumulate state there, e.g. a version counter), so it is critical that
// it runs exactly once per clone regardless of call path.
const INTERNAL_SKIP_AFTER_CLONE_FROM = Symbol('INTERNAL_SKIP_AFTER_CLONE_FROM');
let keyCounter = 1;
function resetRandomKey() {
  keyCounter = 1;
}
function generateRandomKey() {
  return '' + keyCounter++;
}

/**
 * @internal
 */
function getRegisteredNodeOrThrow(editor, nodeType) {
  const registeredNode = getRegisteredNode(editor, nodeType);
  if (registeredNode === undefined) {
    {
      formatDevErrorMessage(`registeredNode: Type ${nodeType} not found`);
    }
  }
  return registeredNode;
}

/**
 * @internal
 */
function getRegisteredNode(editor, nodeType) {
  return editor._nodes.get(nodeType);
}

/** @internal */
const scheduleMicroTask = typeof queueMicrotask === 'function' ? queueMicrotask : fn => {
  // No window prefix intended (#1400)
  Promise.resolve().then(fn);
};
function $isSelectionCapturedInDecoratorInput(anchorDOM, preResolvedActiveElement) {
  const activeElement = preResolvedActiveElement !== undefined ? preResolvedActiveElement : (() => {
    const root = anchorDOM.getRootNode();
    return isDOMDocumentNode(root) || isDOMShadowRoot(root) ? getActiveElementDeep(root) : null;
  })();
  if (!isHTMLElement(activeElement)) {
    return false;
  }
  // @experimental named-slots. A slot container is contentEditable inside an
  // otherwise non-editable decorator host, but its content is Lexical-managed —
  // not a foreign editor input — so it must stay under Lexical's DOM-selection
  // control instead of being treated as captured.
  if (activeElement.hasAttribute('data-lexical-slot')) {
    return false;
  }
  const nearestNode = $getNearestNodeFromDOMNode(activeElement);
  const nodeName = activeElement.nodeName;
  return $isLexicalNode(nearestNode) && (nodeName === 'INPUT' || nodeName === 'TEXTAREA' || activeElement.contentEditable === 'true' && getEditorPropertyFromDOMNode(activeElement) == null);
}
/** @deprecated renamed to {@link $isSelectionCapturedInDecoratorInput} by @lexical/eslint-plugin rules-of-lexical */
const isSelectionCapturedInDecoratorInput = $isSelectionCapturedInDecoratorInput;
function isSelectionWithinEditor(editor, anchorDOM, focusDOM) {
  const rootElement = editor.getRootElement();
  if (!rootElement) {
    return false;
  }
  try {
    if (!anchorDOM || !rootElement.contains(anchorDOM) || !rootElement.contains(focusDOM)) {
      return false;
    }
  } catch (_error) {
    return false;
  }
  return getNearestEditorFromDOMNode(anchorDOM) === editor && editor.read('latest', () => !$isSelectionCapturedInDecoratorInput(anchorDOM));
}

/**
 * @returns true if the given argument is a LexicalEditor instance from this build of Lexical
 */
function isLexicalEditor(editor) {
  // Check instanceof to prevent issues with multiple embedded Lexical installations
  return editor instanceof LexicalEditor;
}
function getNearestEditorFromDOMNode(node) {
  let currentNode = node;
  while (currentNode != null) {
    const editor = getEditorPropertyFromDOMNode(currentNode);
    if (isLexicalEditor(editor)) {
      return editor;
    }
    currentNode = getParentElement(currentNode);
  }
  return null;
}

/** @internal */
function getEditorPropertyFromDOMNode(node) {
  // @ts-expect-error: internal field
  return node ? node.__lexicalEditor : null;
}
function getTextDirection(text) {
  if (RTL_REGEX.test(text)) {
    return 'rtl';
  }
  if (LTR_REGEX.test(text)) {
    return 'ltr';
  }
  return null;
}

/**
 * Return true if the TextNode is a TabNode or is in token mode.
 */
function $isTokenOrTab(node) {
  return $isTabNode(node) || node.isToken();
}

/**
 * Return true if the TextNode is a TabNode, or is in token or segmented mode.
 */
function $isTokenOrSegmented(node) {
  return $isTokenOrTab(node) || node.isSegmented();
}

/**
 * @param node - The element being tested
 * @returns Returns true if node is an DOM Text node, false otherwise.
 */
function isDOMTextNode(node) {
  return isDOMNode(node) && node.nodeType === DOM_TEXT_TYPE;
}

/**
 * @param node - The element being tested
 * @returns Returns true if node is an DOM Document node, false otherwise.
 */
function isDOMDocumentNode(node) {
  return isDOMNode(node) && node.nodeType === DOM_DOCUMENT_TYPE;
}
function getDOMTextNode(element) {
  let node = element;
  while (node != null) {
    if (isDOMTextNode(node)) {
      return node;
    }
    node = node.firstChild;
  }
  return null;
}
function toggleTextFormatType(format, type, alignWithFormat) {
  const activeFormat = TEXT_TYPE_TO_FORMAT[type];
  if (alignWithFormat !== null && (format & activeFormat) === (alignWithFormat & activeFormat)) {
    return format;
  }
  let newFormat = format ^ activeFormat;
  if (type === 'subscript') {
    newFormat &= ~TEXT_TYPE_TO_FORMAT.superscript;
  } else if (type === 'superscript') {
    newFormat &= ~TEXT_TYPE_TO_FORMAT.subscript;
  } else if (type === 'lowercase') {
    newFormat &= ~TEXT_TYPE_TO_FORMAT.uppercase;
    newFormat &= ~TEXT_TYPE_TO_FORMAT.capitalize;
  } else if (type === 'uppercase') {
    newFormat &= ~TEXT_TYPE_TO_FORMAT.lowercase;
    newFormat &= ~TEXT_TYPE_TO_FORMAT.capitalize;
  } else if (type === 'capitalize') {
    newFormat &= ~TEXT_TYPE_TO_FORMAT.lowercase;
    newFormat &= ~TEXT_TYPE_TO_FORMAT.uppercase;
  }
  return newFormat;
}
function $isLeafNode(node) {
  return $isTextNode(node) || $isLineBreakNode(node) || $isDecoratorNode(node);
}
function $setNodeKey(node, existingKey) {
  const pendingNode = getPendingNodeToClone();
  existingKey = existingKey || pendingNode && pendingNode.__key;
  if (existingKey != null) {
    {
      errorOnNodeKeyConstructorMismatch(node, existingKey, pendingNode);
    }
    node.__key = existingKey;
    return;
  }
  errorOnReadOnly();
  errorOnInfiniteTransforms();
  const editor = getActiveEditor();
  const editorState = getActiveEditorState();
  const key = generateRandomKey();
  editorState._nodeMap.set(key, node);
  // TODO Split this function into leaf/element
  if ($isElementNode(node)) {
    editor._dirtyElements.set(key, true);
  } else {
    editor._dirtyLeaves.add(key);
  }
  editor._cloneNotNeeded.add(key);
  // Don't downgrade FULL_RECONCILE; upgrade only when nothing has been marked yet.
  if (editor._dirtyType === NO_DIRTY_NODES) {
    editor._dirtyType = HAS_DIRTY_NODES;
  }
  node.__key = key;
}
function errorOnNodeKeyConstructorMismatch(node, existingKey, pendingNode) {
  const editorState = internalGetActiveEditorState();
  if (!editorState) {
    // tests expect to be able to do this kind of clone without an active editor state
    return;
  }
  const existingNode = editorState._nodeMap.get(existingKey);
  if (pendingNode) {
    if (!(existingKey === pendingNode.__key)) {
      formatDevErrorMessage(`Lexical node with constructor ${node.constructor.name} (type ${node.getType()}) has an incorrect clone implementation, got ${String(existingKey)} for nodeKey when expecting ${pendingNode.__key}`);
    }
  }
  if (existingNode && existingNode.constructor !== node.constructor) {
    // Lifted condition to if statement because the inverted logic is a bit confusing
    if (node.constructor.name !== existingNode.constructor.name) {
      {
        formatDevErrorMessage(`Lexical node with constructor ${node.constructor.name} attempted to re-use key from node in active editor state with constructor ${existingNode.constructor.name}. Keys must not be re-used when the type is changed.`);
      }
    } else {
      {
        formatDevErrorMessage(`Lexical node with constructor ${node.constructor.name} attempted to re-use key from node in active editor state with different constructor with the same name (possibly due to invalid Hot Module Replacement). Keys must not be re-used when the type is changed.`);
      }
    }
  }
}
function internalMarkParentElementsAsDirty(parentKey, nodeMap, dirtyElements) {
  let nextParentKey = parentKey;
  while (nextParentKey !== null) {
    if (dirtyElements.has(nextParentKey)) {
      return;
    }
    const node = nodeMap.get(nextParentKey);
    if (node === undefined) {
      break;
    }
    dirtyElements.set(nextParentKey, false);
    // @experimental named-slots. A slotted node has no __parent; its
    // up-pointer is __slotHost. Crossing that boundary here lets a slot
    // content edit dirty the host so it re-reconciles. Non-slot trees keep
    // __slotHost === null, so this is the plain __parent walk there.
    nextParentKey = node.__parent !== null ? node.__parent : $isSlotChild(node) ? node.__slotHost : null;
  }
}

/**
 * Removes a node from its parent, updating all necessary pointers and links.
 * @internal
 *
 * This function does not adjust the editor's current selection. Callers
 * that need element-anchored offsets in the old parent to track the child
 * count change must call `$updateElementSelectionOnCreateDeleteNode` (with
 * `times = -1`) after invoking this — see `$removeNode`, `replace`,
 * `insertBefore`, and `insertAfter` for the pattern.
 *
 * This function is for internal use of the library.
 * Please do not use it as it may change in the future.
 */
function $removeFromParent(node) {
  if (!($getSlotHostKey(node) === null)) {
    formatDevErrorMessage(`$removeFromParent: node ${node.__key} is slotted into host ${String($getSlotHostKey(node))}; a slotted node and a child are mutually exclusive. Remove it from its slot first.`);
  }
  const oldParent = node.getParent();
  if (oldParent !== null) {
    const writableNode = node.getWritable();
    const writableParent = oldParent.getWritable();
    const prevSibling = node.getPreviousSibling();
    const nextSibling = node.getNextSibling();

    // Store sibling keys
    const nextSiblingKey = nextSibling !== null ? nextSibling.__key : null;
    const prevSiblingKey = prevSibling !== null ? prevSibling.__key : null;

    // Get writable siblings once
    const writablePrevSibling = prevSibling !== null ? prevSibling.getWritable() : null;
    const writableNextSibling = nextSibling !== null ? nextSibling.getWritable() : null;

    // Update parent's first/last pointers
    if (prevSibling === null) {
      writableParent.__first = nextSiblingKey;
    }
    if (nextSibling === null) {
      writableParent.__last = prevSiblingKey;
    }

    // Update sibling links
    if (writablePrevSibling !== null) {
      writablePrevSibling.__next = nextSiblingKey;
    }
    if (writableNextSibling !== null) {
      writableNextSibling.__prev = prevSiblingKey;
    }

    // Clear node's links
    writableNode.__prev = null;
    writableNode.__next = null;
    writableNode.__parent = null;

    // Update parent size
    writableParent.__size--;
  }
}
/** @deprecated renamed to {@link $removeFromParent} by @lexical/eslint-plugin rules-of-lexical */
const removeFromParent = $removeFromParent;

// Never use this function directly! It will break
// the cloning heuristic. Instead use node.getWritable().
function internalMarkNodeAsDirty(node) {
  errorOnInfiniteTransforms();
  if (!!$isEphemeral(node)) {
    formatDevErrorMessage(`internalMarkNodeAsDirty: Ephemeral nodes must not be marked as dirty (key ${node.__key} type ${node.__type})`);
  }
  const latest = node.getLatest();
  // @experimental named-slots. A slotted node's up-pointer is __slotHost,
  // not __parent; start the dirty walk from whichever is set so a slot
  // content edit propagates into the host. Non-slot trees keep
  // __slotHost === null, so this is the plain __parent start there.
  const parent = latest.__parent !== null ? latest.__parent : $isSlotChild(latest) ? latest.__slotHost : null;
  const editorState = getActiveEditorState();
  const editor = getActiveEditor();
  const nodeMap = editorState._nodeMap;
  const dirtyElements = editor._dirtyElements;
  if (parent !== null) {
    internalMarkParentElementsAsDirty(parent, nodeMap, dirtyElements);
  }
  const key = latest.__key;
  // Don't downgrade FULL_RECONCILE; upgrade only when nothing has been marked yet.
  if (editor._dirtyType === NO_DIRTY_NODES) {
    editor._dirtyType = HAS_DIRTY_NODES;
  }
  if ($isElementNode(node)) {
    dirtyElements.set(key, true);
  } else {
    editor._dirtyLeaves.add(key);
  }
}
function internalMarkSiblingsAsDirty(node) {
  const previousNode = node.getPreviousSibling();
  const nextNode = node.getNextSibling();
  if (previousNode !== null) {
    internalMarkNodeAsDirty(previousNode);
  }
  if (nextNode !== null) {
    internalMarkNodeAsDirty(nextNode);
  }
}
function $setCompositionKey(compositionKey) {
  errorOnReadOnly();
  const editor = getActiveEditor();
  const previousCompositionKey = editor._compositionKey;
  if (compositionKey !== previousCompositionKey) {
    editor._compositionKey = compositionKey;
    if (previousCompositionKey !== null) {
      const node = $getNodeByKey(previousCompositionKey);
      if (node !== null) {
        node.getWritable();
      }
    }
    if (compositionKey !== null) {
      const node = $getNodeByKey(compositionKey);
      if (node !== null) {
        node.getWritable();
      }
    }
  }
}
function $getCompositionKey() {
  if (isCurrentlyReadOnlyMode()) {
    return null;
  }
  const editor = getActiveEditor();
  return editor._compositionKey;
}

/**
 * Returns the node with the given key from the active EditorState
 * (or the given EditorState), or null if it does not exist.
 */

/**
 * @deprecated The type parameter is an unchecked and unsafe cast,
 * equivalent to `$getNodeByKey(key) as T | null`, and will be removed
 * in a future release. Call this function without a type argument and
 * narrow the result with a type guard instead.
 */

function $getNodeByKey(key, _editorState) {
  const editorState = _editorState || getActiveEditorState();
  const node = editorState._nodeMap.get(key);
  if (node === undefined) {
    return null;
  }
  return node;
}
function $getNodeFromDOMNode(dom, editorState) {
  const editor = getActiveEditor();
  const key = getNodeKeyFromDOMNode(dom, editor);
  if (key !== undefined) {
    return $getNodeByKey(key, editorState);
  }
  return null;
}
function setNodeKeyOnDOMNode(dom, editor, key) {
  const prop = `__lexicalKey_${editor._key}`;
  dom[prop] = key;
}
function clearNodeKeyOnDOMNode(dom, editor) {
  const prop = `__lexicalKey_${editor._key}`;
  delete dom[prop];
}
function getNodeKeyFromDOMNode(dom, editor) {
  const prop = `__lexicalKey_${editor._key}`;
  return dom[prop];
}
function $getNearestNodeFromDOMNode(startingDOM, editorState) {
  let dom = startingDOM;
  while (dom != null) {
    const node = $getNodeFromDOMNode(dom, editorState);
    if (node !== null) {
      return node;
    }
    dom = getParentElement(dom);
  }
  return null;
}
function cloneDecorators(editor) {
  const currentDecorators = editor._decorators;
  const pendingDecorators = Object.assign({}, currentDecorators);
  editor._pendingDecorators = pendingDecorators;
  return pendingDecorators;
}
function getEditorStateTextContent(editorState) {
  return editorState.read(() => $getRoot().getTextContent());
}
function markNodesWithTypesAsDirty(editor, types) {
  // We only need to mark nodes dirty if they were in the previous state.
  // If they aren't, then they are by definition dirty already.
  const cachedMap = getCachedTypeToNodeMap(editor.getEditorState());
  const dirtyNodeMaps = [];
  for (const type of types) {
    const nodeMap = cachedMap.get(type);
    if (nodeMap) {
      // By construction these are non-empty
      dirtyNodeMaps.push(nodeMap);
    }
  }
  // Nothing to mark dirty, no update necessary
  if (dirtyNodeMaps.length === 0) {
    return;
  }
  editor.update(() => {
    for (const nodeMap of dirtyNodeMaps) {
      for (const nodeKey of nodeMap.keys()) {
        // We are only concerned with nodes that are still in the latest NodeMap,
        // if they no longer exist then markDirty would raise an exception
        const latest = $getNodeByKey(nodeKey);
        if (latest) {
          latest.markDirty();
        }
      }
    }
  }, editor._pendingEditorState === null ? {
    tag: HISTORY_MERGE_TAG
  } : undefined);
}
function $getRoot() {
  return internalGetRoot(getActiveEditorState());
}
function internalGetRoot(editorState) {
  return editorState._nodeMap.get('root');
}
function $setSelection(selection) {
  errorOnReadOnly();
  const editorState = getActiveEditorState();
  if (selection !== null) {
    {
      if (Object.isFrozen(selection)) {
        {
          formatDevErrorMessage(`$setSelection called on frozen selection object. Ensure selection is cloned before passing in.`);
        }
      }
    }
    selection.dirty = true;
    selection.setCachedNodes(null);
    // @experimental named-slots. A RangeSelection committed through the API
    // must not straddle a slot boundary (slots are shadow-root-isolated), the
    // programmatic counterpart of the DOM-read clamp in selection resolution.
    // Gated on `_slotsUsed` so editors that never slot anything skip the walk,
    // mirroring the commit-time clamp.
    if ($isRangeSelection(selection) && getActiveEditor()._slotsUsed) {
      $clampRangeSelectionToSlotFrame(selection);
    }
  }
  editorState._selection = selection;
}
function $flushMutations() {
  errorOnReadOnly();
  const editor = getActiveEditor();
  flushRootMutations(editor);
}
function $getNodeFromDOM(dom) {
  const editor = getActiveEditor();
  const nodeKey = getNodeKeyFromDOMTree(dom, editor);
  if (nodeKey === null) {
    return null;
  }
  return $getNodeByKey(nodeKey);
}
function getNodeKeyFromDOMTree(
// Note that node here refers to a DOM Node, not an Lexical Node
dom, editor) {
  let node = dom;
  while (node != null) {
    const key = getNodeKeyFromDOMNode(node, editor);
    if (key !== undefined) {
      return key;
    }
    node = getParentElement(node);
  }
  return null;
}

/**
 * Return true if `str` contains any valid surrogate pair.
 *
 * See also $updateCaretSelectionForUnicodeCharacter for
 * a discussion on when and why this is useful.
 */
function doesContainSurrogatePair(str) {
  return /[\uD800-\uDBFF][\uDC00-\uDFFF]/g.test(str);
}
function getEditorsToPropagate(editor) {
  const editorsToPropagate = [];
  for (let currentEditor = editor; currentEditor !== null; currentEditor = currentEditor._parentEditor) {
    editorsToPropagate.push(currentEditor);
  }
  return editorsToPropagate;
}
function createUID() {
  return Math.random().toString(36).replace(/[^a-z]+/g, '').substring(0, 5);
}
function getAnchorTextFromDOM(anchorNode) {
  return isDOMTextNode(anchorNode) ? anchorNode.nodeValue : null;
}
function $updateSelectedTextFromDOM(isCompositionEnd, editor, data) {
  // Update the text content with the latest composition text
  const domSelection = getDOMSelection(getWindow(editor));
  if (domSelection === null) {
    return;
  }
  const points = getDOMSelectionPoints(domSelection, editor._rootElement);
  const anchorNode = points.anchorNode;
  let {
    anchorOffset,
    focusOffset
  } = points;
  if (anchorNode !== null) {
    let textContent = getAnchorTextFromDOM(anchorNode);
    const node = $getNearestNodeFromDOMNode(anchorNode);
    if (textContent !== null && $isTextNode(node)) {
      // Data is intentionally truthy, as we check for boolean, null and empty string.
      if ((textContent === COMPOSITION_SUFFIX || textContent === COMPOSITION_START_CHAR) && data) {
        const offset = data.length;
        textContent = data;
        anchorOffset = offset;
        focusOffset = offset;
      }
      if (textContent !== null) {
        $updateTextNodeFromDOMContent(node, textContent, anchorOffset, focusOffset, isCompositionEnd);
      }
    }
  }
}
function $updateTextNodeFromDOMContent(textNode, textContent, anchorOffset, focusOffset, compositionEnd) {
  let node = textNode;
  if (node.isAttached() && (compositionEnd || !node.isDirty())) {
    const isComposing = node.isComposing();
    if (node.isToken() && isComposing) {
      return;
    }
    let normalizedTextContent = textContent;
    if (isComposing || compositionEnd) {
      if (textContent.endsWith(COMPOSITION_SUFFIX)) {
        normalizedTextContent = textContent.slice(0, -COMPOSITION_SUFFIX.length);
      }
      if (compositionEnd) {
        const char = COMPOSITION_START_CHAR;
        let index;
        while ((index = normalizedTextContent.indexOf(char)) !== -1) {
          normalizedTextContent = normalizedTextContent.slice(0, index) + normalizedTextContent.slice(index + char.length);
          if (anchorOffset !== null && anchorOffset > index) {
            anchorOffset = Math.max(index, anchorOffset - char.length);
          }
          if (focusOffset !== null && focusOffset > index) {
            focusOffset = Math.max(index, focusOffset - char.length);
          }
        }
      }
    }
    const prevTextContent = node.getTextContent();
    if (compositionEnd || normalizedTextContent !== prevTextContent) {
      const selection = $getSelection();
      if (normalizedTextContent === '') {
        $setCompositionKey(null);
        if (!IS_SAFARI && !IS_IOS && !IS_APPLE_WEBKIT) {
          // For composition (mainly Android), we have to remove the node on a later update
          const editor = getActiveEditor();
          $setTextContentWithSelection(node, '', selection);
          setTimeout(() => {
            editor.update(() => {
              if (node.isAttached() && node.getTextContent() === '') {
                node.remove();
              }
            });
          }, 20);
        } else {
          node.remove();
        }
        return;
      }
      const parent = node.getParent();
      const prevSelection = $getPreviousSelection();
      const prevTextContentSize = node.getTextContentSize();
      const compositionKey = $getCompositionKey();
      const nodeKey = node.getKey();
      if (node.isToken() && !isComposing || compositionKey !== null && nodeKey === compositionKey && !isComposing ||
      // Check if character was added at the start or boundaries when not insertable, and we need
      // to clear this input from occurring as that action wasn't permitted.
      $isRangeSelection(prevSelection) && (parent !== null && !parent.canInsertTextBefore() && prevSelection.anchor.offset === 0 || prevSelection.anchor.key === textNode.__key && prevSelection.anchor.offset === 0 && !node.canInsertTextBefore() && !isComposing || prevSelection.focus.key === textNode.__key && prevSelection.focus.offset === prevTextContentSize && !node.canInsertTextAfter() && !isComposing)) {
        node.markDirty();
        return;
      }
      if (!$isRangeSelection(selection) || anchorOffset === null || focusOffset === null) {
        $setTextContentWithSelection(node, normalizedTextContent, selection);
        return;
      }
      selection.setTextNodeRange(node, anchorOffset, node, focusOffset);
      if (node.isSegmented()) {
        const originalTextContent = node.getTextContent();
        const replacement = $createTextNode(originalTextContent);
        node.replace(replacement);
        node = replacement;
      }
      $setTextContentWithSelection(node, normalizedTextContent, selection);
    }
  }
}
function $setTextContentWithSelection(node, textContent, selection) {
  node.setTextContent(textContent);
  if ($isRangeSelection(selection)) {
    const key = node.getKey();
    let pointMutated = false;
    for (const k of ['anchor', 'focus']) {
      const pt = selection[k];
      if (pt.type === 'text' && pt.key === key) {
        pt.offset = $getTextNodeOffset(node, pt.offset, 'clamp');
        pointMutated = true;
      }
    }
    if (pointMutated) {
      selection._cachedNodes = null;
      selection._cachedIsBackward = null;
    }
  }
}
function $previousSiblingDoesNotAcceptText(node) {
  const previousSibling = node.getPreviousSibling();
  return ($isTextNode(previousSibling) || $isElementNode(previousSibling) && previousSibling.isInline()) && !previousSibling.canInsertTextAfter();
}

// This function is connected to $shouldPreventDefaultAndInsertText and determines whether the
// TextNode boundaries are writable or we should use the previous/next sibling instead. For example,
// in the case of a LinkNode, boundaries are not writable.
function $shouldInsertTextAfterOrBeforeTextNode(selection, node) {
  if (node.isSegmented()) {
    return true;
  }
  if (!selection.isCollapsed()) {
    return false;
  }
  const offset = selection.anchor.offset;
  const parent = node.getParentOrThrow();
  const isToken = $isTokenOrTab(node);
  if (offset === 0) {
    return !node.canInsertTextBefore() || !parent.canInsertTextBefore() && !node.isComposing() || isToken || $previousSiblingDoesNotAcceptText(node);
  } else if (offset === node.getTextContentSize()) {
    return !node.canInsertTextAfter() || !parent.canInsertTextAfter() && !node.isComposing() || isToken;
  } else {
    return false;
  }
}

/**
 * A KeyboardEvent or structurally similar object with a string `key` as well
 * as `altKey`, `ctrlKey`, `metaKey`, and `shiftKey` boolean properties.
 */

/**
 * A record of keyboard modifiers that must be enabled.
 * If the value is `'any'` then the modifier key's state is ignored.
 * If the value is `true` then the modifier key must be pressed.
 * If the value is `false` or the property is omitted then the modifier key must
 * not be pressed.
 */

function matchModifier(event, mask, prop) {
  const expected = mask[prop] || false;
  return expected === 'any' || expected === event[prop];
}

/**
 * Match a KeyboardEvent with its expected modifier state
 *
 * @param event A KeyboardEvent, or structurally similar object
 * @param mask An object specifying the expected state of the modifiers
 * @returns true if the event matches
 */
function isModifierMatch(event, mask) {
  return matchModifier(event, mask, 'altKey') && matchModifier(event, mask, 'ctrlKey') && matchModifier(event, mask, 'shiftKey') && matchModifier(event, mask, 'metaKey');
}

/**
 * Match a KeyboardEvent with its expected state
 *
 * @param event A KeyboardEvent, or structurally similar object
 * @param expectedKey The string to compare with event.key (case insensitive)
 * @param mask An object specifying the expected state of the modifiers
 * @returns true if the event matches
 */
function isExactShortcutMatch(event, expectedKey, mask) {
  if (!isModifierMatch(event, mask)) {
    return false;
  }
  if (event.key.toLowerCase() === expectedKey.toLowerCase()) {
    // For special keys like Enter, Tab, ArrowUp, etc.
    // For default keys with English-based keyboard layout.
    return true;
  }
  if (expectedKey.length > 1) {
    // For non English-based keyboard layout but the key is a special key, we must not match it by `event.code`.
    return false;
  }
  if (event.key.length === 1 && event.key.charCodeAt(0) <= 127) {
    // For ASCII keys we must not match it by `event.code` because it would break remapped layouts (English (US) Dvorak, etc.).
    return false;
  }

  // Fallback for number keys
  if (event.code.startsWith('Digit') && /^\d$/.test(expectedKey)) {
    return event.code === `Digit${expectedKey}`;
  }
  const expectedCode = 'Key' + expectedKey.toUpperCase();

  // For default keys with not English-based keyboard layouts where `event.key` is non-ASCII, match by `event.code`.
  return event.code === expectedCode;
}
const CONTROL_OR_META = {
  ctrlKey: !IS_APPLE,
  metaKey: IS_APPLE
};
const CONTROL_OR_ALT = {
  altKey: IS_APPLE,
  ctrlKey: !IS_APPLE
};
function isTab(event) {
  return isExactShortcutMatch(event, 'Tab', {
    shiftKey: 'any'
  });
}
function isBold(event) {
  return isExactShortcutMatch(event, 'b', CONTROL_OR_META);
}
function isItalic(event) {
  return isExactShortcutMatch(event, 'i', CONTROL_OR_META);
}
function isUnderline(event) {
  return isExactShortcutMatch(event, 'u', CONTROL_OR_META);
}
function isParagraph(event) {
  return isExactShortcutMatch(event, 'Enter', {
    altKey: 'any',
    ctrlKey: 'any',
    metaKey: 'any'
  });
}
function isLineBreak(event) {
  return isExactShortcutMatch(event, 'Enter', {
    altKey: 'any',
    ctrlKey: 'any',
    metaKey: 'any',
    shiftKey: true
  });
}

// Inserts a new line after the selection

function isOpenLineBreak(event) {
  // 79 = KeyO
  return IS_APPLE && isExactShortcutMatch(event, 'o', {
    ctrlKey: true
  });
}
function isDeleteWordBackward(event) {
  return isExactShortcutMatch(event, 'Backspace', CONTROL_OR_ALT);
}
function isDeleteWordForward(event) {
  return isExactShortcutMatch(event, 'Delete', CONTROL_OR_ALT);
}
function isDeleteLineBackward(event) {
  return IS_APPLE && isExactShortcutMatch(event, 'Backspace', {
    metaKey: true
  });
}
function isDeleteLineForward(event) {
  return IS_APPLE && (isExactShortcutMatch(event, 'Delete', {
    metaKey: true
  }) || isExactShortcutMatch(event, 'k', {
    ctrlKey: true
  }));
}
function isDeleteBackward(event) {
  return isExactShortcutMatch(event, 'Backspace', {
    shiftKey: 'any'
  }) || IS_APPLE && isExactShortcutMatch(event, 'h', {
    ctrlKey: true
  });
}
function isDeleteForward(event) {
  return isExactShortcutMatch(event, 'Delete', {}) || IS_APPLE && isExactShortcutMatch(event, 'd', {
    ctrlKey: true
  });
}
function isUndo(event) {
  return isExactShortcutMatch(event, 'z', CONTROL_OR_META);
}
function isRedo(event) {
  if (IS_APPLE) {
    return isExactShortcutMatch(event, 'z', {
      metaKey: true,
      shiftKey: true
    });
  }
  return isExactShortcutMatch(event, 'y', {
    ctrlKey: true
  }) || isExactShortcutMatch(event, 'z', {
    ctrlKey: true,
    shiftKey: true
  });
}
function isCopy(event) {
  return isExactShortcutMatch(event, 'c', CONTROL_OR_META);
}
function isCut(event) {
  return isExactShortcutMatch(event, 'x', CONTROL_OR_META);
}
function isMoveBackward(event) {
  return isExactShortcutMatch(event, 'ArrowLeft', {
    shiftKey: 'any'
  });
}
function isMoveToStart(event) {
  return isExactShortcutMatch(event, 'ArrowLeft', {
    ...CONTROL_OR_META,
    shiftKey: 'any'
  });
}
function isMoveForward(event) {
  return isExactShortcutMatch(event, 'ArrowRight', {
    shiftKey: 'any'
  });
}
function isMoveToEnd(event) {
  return isExactShortcutMatch(event, 'ArrowRight', {
    ...CONTROL_OR_META,
    shiftKey: 'any'
  });
}
function isMoveUp(event) {
  return isExactShortcutMatch(event, 'ArrowUp', {
    altKey: 'any',
    shiftKey: 'any'
  });
}
function isMoveDown(event) {
  return isExactShortcutMatch(event, 'ArrowDown', {
    altKey: 'any',
    shiftKey: 'any'
  });
}
function isModifier(event) {
  return event.ctrlKey || event.shiftKey || event.altKey || event.metaKey;
}
function isSpace(event) {
  return event.key === ' ';
}
function isBackspace(event) {
  return event.key === 'Backspace';
}
function isEscape(event) {
  return event.key === 'Escape';
}
function isDelete(event) {
  return event.key === 'Delete';
}
function isSelectAll(event) {
  return isExactShortcutMatch(event, 'a', CONTROL_OR_META);
}
function $selectAll(selection) {
  const root = $getRoot();
  if ($isRangeSelection(selection)) {
    const anchor = selection.anchor;
    const focus = selection.focus;
    const anchorNode = anchor.getNode();
    // `RootNode.getTopLevelElementOrThrow` always throws by design, so when
    // the caret is at the root's element-level (typically after deleting
    // every top-level child) fall through to the regular "select all root
    // children" path before the throw fires.
    if ($isRootNode(anchorNode)) {
      anchor.set(anchorNode.getKey(), 0, 'element');
      focus.set(anchorNode.getKey(), anchorNode.getChildrenSize(), 'element');
      $normalizeSelection(selection);
      return selection;
    }
    const topParent = anchorNode.getTopLevelElementOrThrow();
    // A slot value's getTopLevelElement stops at itself (slot boundary) and
    // its __parent is null (its up-link is __slotHost), so getParentOrThrow
    // would throw. Scope SELECT_ALL to the slot value's contents instead —
    // anchor at its first child, focus at its last — which matches the
    // shadow-root semantics the slot boundary advertises. The
    // `$isElementNode` narrow guards `getChildrenSize` (a non-inline
    // DecoratorNode is also a valid slot-value shape but has no children
    // channel).
    const parent = topParent.getParent();
    if (parent === null) {
      // ElementNode-shaped slot value: scope selection to its contents.
      // A non-inline DecoratorNode is also a valid slot value but carries no
      // children channel; the explicit narrow surfaces a future protocol
      // drift instead of throwing at `getChildrenSize`. The Decorator
      // branch is currently unreachable from any RangeSelection anchor
      // because a non-inline decorator slot value has no editable text.
      if ($isElementNode(topParent)) {
        anchor.set(topParent.getKey(), 0, 'element');
        focus.set(topParent.getKey(), topParent.getChildrenSize(), 'element');
        $normalizeSelection(selection);
      }
      return selection;
    }
    const rootNode = parent;
    anchor.set(rootNode.getKey(), 0, 'element');
    focus.set(rootNode.getKey(), rootNode.getChildrenSize(), 'element');
    $normalizeSelection(selection);
    return selection;
  } else {
    // Create a new RangeSelection
    const newSelection = root.select(0, root.getChildrenSize());
    $setSelection($normalizeSelection(newSelection));
    return newSelection;
  }
}
function getCachedClassNameArray(classNamesTheme, classNameThemeType) {
  if (classNamesTheme.__lexicalClassNameCache === undefined) {
    classNamesTheme.__lexicalClassNameCache = {};
  }
  const classNamesCache = classNamesTheme.__lexicalClassNameCache;
  const cachedClassNames = classNamesCache[classNameThemeType];
  if (cachedClassNames !== undefined) {
    return cachedClassNames;
  }
  const classNames = classNamesTheme[classNameThemeType];
  // As we're using classList, we need
  // to handle className tokens that have spaces.
  // The easiest way to do this to convert the
  // className tokens to an array that can be
  // applied to classList.add()/remove().
  if (typeof classNames === 'string') {
    const classNamesArr = normalizeClassNames(classNames);
    classNamesCache[classNameThemeType] = classNamesArr;
    return classNamesArr;
  }
  return classNames;
}
function setMutatedNode(mutatedNodes, registeredNodes, mutationListeners, node, mutation) {
  if (mutationListeners.size === 0) {
    return;
  }
  const nodeType = node.__type;
  const nodeKey = node.__key;
  const registeredNode = registeredNodes.get(nodeType);
  if (registeredNode === undefined) {
    {
      formatDevErrorMessage(`Type ${nodeType} not in registeredNodes`);
    }
  }
  const klass = registeredNode.klass;
  let mutatedNodesByType = mutatedNodes.get(klass);
  if (mutatedNodesByType === undefined) {
    mutatedNodesByType = new Map();
    mutatedNodes.set(klass, mutatedNodesByType);
  }
  const prevMutation = mutatedNodesByType.get(nodeKey);
  // If the node has already been "destroyed", yet we are
  // re-making it, then this means a move likely happened.
  // We should change the mutation to be that of "updated"
  // instead.
  const isMove = prevMutation === 'destroyed' && mutation === 'created';
  if (prevMutation === undefined || isMove) {
    mutatedNodesByType.set(nodeKey, isMove ? 'updated' : mutation);
  }
}
/**
 * Returns all nodes of the given type in the active editor state.
 *
 * Consider {@link LexicalEditor.registerMutationListener} with
 * `skipInitialization: false` instead if you need to track these nodes over
 * time rather than read them once.
 */
function $nodesOfType(klass) {
  const klassType = klass.getType();
  const editorState = getActiveEditorState();
  if (editorState._readOnly) {
    const nodes = getCachedTypeToNodeMap(editorState).get(klassType);
    return nodes ? Array.from(nodes.values()) : [];
  }
  const nodes = editorState._nodeMap;
  const nodesOfType = [];
  for (const [, node] of nodes) {
    if (node instanceof klass && node.__type === klassType && node.isAttached()) {
      nodesOfType.push(node);
    }
  }
  return nodesOfType;
}
function resolveElement(element, isBackward, focusOffset) {
  const parent = element.getParent();
  let offset = focusOffset;
  let block = element;
  if (parent !== null) {
    if (isBackward && focusOffset === 0) {
      offset = block.getIndexWithinParent();
      block = parent;
    } else if (!isBackward && focusOffset === block.getChildrenSize()) {
      offset = block.getIndexWithinParent() + 1;
      block = parent;
    }
  }
  return block.getChildAtIndex(isBackward ? offset - 1 : offset);
}
function $getAdjacentNode(focus, isBackward) {
  const focusOffset = focus.offset;
  if (focus.type === 'element') {
    const block = focus.getNode();
    return resolveElement(block, isBackward, focusOffset);
  } else {
    const focusNode = focus.getNode();
    if (isBackward && focusOffset === 0 || !isBackward && focusOffset === focusNode.getTextContentSize()) {
      const possibleNode = isBackward ? focusNode.getPreviousSibling() : focusNode.getNextSibling();
      if (possibleNode === null) {
        return resolveElement(focusNode.getParentOrThrow(), isBackward, focusNode.getIndexWithinParent() + (isBackward ? 0 : 1));
      }
      return possibleNode;
    }
  }
  return null;
}
function isFirefoxClipboardEvents(editor) {
  const event = getWindow(editor).event;
  const inputType = event && event.inputType;
  return inputType === 'insertFromPaste' || inputType === 'insertFromPasteAsQuotation';
}
function dispatchCommand(editor, command, ...args) {
  return triggerCommandListeners(editor, command, args[0], editor);
}
function getElementByKeyOrThrow(editor, key) {
  const element = editor._keyToDOMMap.get(key);
  if (element === undefined) {
    {
      formatDevErrorMessage(`Reconciliation: could not find DOM element for node key ${key}`);
    }
  }
  return element;
}
function getParentElement(node) {
  const parentElement = node.assignedSlot || node.parentElement;
  if (parentElement !== null) {
    return parentElement;
  }
  // node.parentElement is null when the parent is a ShadowRoot (a
  // DocumentFragment, not an Element). Cross the shadow boundary to the host so
  // ancestor walks (getScrollParent, calculateZoomLevel) continue into the
  // enclosing light-DOM tree instead of stopping at the boundary.
  const parentNode = node.parentNode;
  return isDOMShadowRoot(parentNode) ? parentNode.host : null;
}
function getDOMOwnerDocument(target) {
  return isDOMDocumentNode(target) ? target : isHTMLElement(target) ? target.ownerDocument : null;
}
function scrollIntoViewIfNeeded(editor, selectionRect, rootElement) {
  const doc = getDOMOwnerDocument(rootElement);
  const defaultView = getDefaultView(doc);
  if (doc === null || defaultView === null) {
    return;
  }
  // A caret inside the editor can never sit entirely above the editor's own top
  // edge. Safari violates this for a collapsed caret in RTL text: it returns a
  // degenerate, out-of-bounds selection rect and reports the caret as
  // `selection.type === 'Range'`, which routes execution here (the `#1482` case
  // in `$updateDOMSelection`). Feeding that rect to the scroller jumps the
  // viewport up on every keystroke. Guard only this above-the-editor case — a
  // rect below the editor is the normal "scroll the caret into view" path and is
  // deliberately left untouched. See #2495.
  const rootRect = rootElement.getBoundingClientRect();
  if (selectionRect.bottom < rootRect.top) {
    return;
  }
  let {
    top: currentTop,
    bottom: currentBottom
  } = selectionRect;
  let targetTop = 0;
  let targetBottom = 0;
  let element = rootElement;
  while (element !== null) {
    const isBodyElement = element === doc.body;
    if (isBodyElement) {
      // On mobile, the on-screen keyboard shrinks the visual viewport but
      // not the layout viewport (innerHeight).
      // selectionRect comes from getBoundingClientRect in layout-viewport coords,
      // so we must compare against visualViewport bounds,
      // or the caret stays behind the keyboard.
      const visualViewport = defaultView.visualViewport;
      if (visualViewport) {
        const offsetTop = visualViewport.offsetTop;
        targetTop = offsetTop;
        targetBottom = offsetTop + visualViewport.height;
      } else {
        targetTop = 0;
        targetBottom = getWindow(editor).innerHeight;
      }
      // Account for CSS scroll-padding on the document element
      const computedStyle = defaultView.getComputedStyle(doc.documentElement);
      const scrollPaddingTop = parseFloat(computedStyle.scrollPaddingTop);
      const scrollPaddingBottom = parseFloat(computedStyle.scrollPaddingBottom);
      if (isFinite(scrollPaddingTop)) {
        targetTop += scrollPaddingTop;
      }
      if (isFinite(scrollPaddingBottom)) {
        targetBottom -= scrollPaddingBottom;
      }
    } else {
      // Reuse the rect already measured for the guard above on the first
      // iteration (element === rootElement) to avoid a second layout flush.
      const targetRect = element === rootElement ? rootRect : element.getBoundingClientRect();
      targetTop = targetRect.top;
      targetBottom = targetRect.bottom;
    }
    let diff = 0;
    if (currentTop < targetTop) {
      diff = -(targetTop - currentTop);
    } else if (currentBottom > targetBottom) {
      diff = currentBottom - targetBottom;
    }
    if (diff !== 0) {
      if (isBodyElement) {
        // Only handles scrolling of Y axis
        defaultView.scrollBy(0, diff);
      } else {
        const scrollTop = element.scrollTop;
        element.scrollTop += diff;
        const yOffset = element.scrollTop - scrollTop;
        currentTop -= yOffset;
        currentBottom -= yOffset;
      }
    }
    if (isBodyElement) {
      break;
    }
    element = getParentElement(element);
  }
}
function $hasUpdateTag(tag) {
  const editor = getActiveEditor();
  return editor._updateTags.has(tag);
}
function $addUpdateTag(tag) {
  errorOnReadOnly();
  const editor = getActiveEditor();
  editor._updateTags.add(tag);
}

/**
 * Add a function to run after the current update. This will run after any
 * `onUpdate` function already supplied to `editor.update()`, as well as any
 * functions added with previous calls to `$onUpdate`.
 *
 * @param updateFn The function to run after the current update.
 */
function $onUpdate(updateFn) {
  errorOnReadOnly();
  const editor = getActiveEditor();
  editor._deferred.push(updateFn);
}
function $maybeMoveChildrenSelectionToParent(parentNode) {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !$isElementNode(parentNode)) {
    return selection;
  }
  const {
    anchor,
    focus
  } = selection;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();
  if ($hasAncestor(anchorNode, parentNode)) {
    anchor.set(parentNode.__key, 0, 'element');
  }
  if ($hasAncestor(focusNode, parentNode)) {
    focus.set(parentNode.__key, 0, 'element');
  }
  return selection;
}
function $hasAncestor(child, targetNode) {
  let parent = child.getParent();
  while (parent !== null) {
    if (parent.is(targetNode)) {
      return true;
    }
    parent = parent.getParent();
  }
  return false;
}
function getDefaultView(domElem) {
  const ownerDoc = getDOMOwnerDocument(domElem);
  return ownerDoc ? ownerDoc.defaultView : null;
}
function getWindow(editor) {
  const windowObj = editor._window;
  if (windowObj === null) {
    {
      formatDevErrorMessage(`window object not found`);
    }
  }
  return windowObj;
}
function $isInlineElementOrDecoratorNode(node) {
  return $isElementNode(node) && node.isInline() || $isDecoratorNode(node) && node.isInline();
}
function $getNearestRootOrShadowRoot(node) {
  let current = node.getLatest();
  while (current !== null) {
    // The slot link is a virtual shadow root: a slotted node is the root of
    // its own isolated scope (its parent is null), so it is the nearest
    // scope root for everything inside it — including itself.
    if ($getSlotHostKey(current) !== null && $isElementNode(current)) {
      return current;
    }
    const parent = current.getParentOrThrow();
    if ($isRootOrShadowRoot(parent)) {
      return parent;
    }
    current = parent;
  }
  return current;
}
function $isShadowRootNode(node) {
  return $isElementNode(node) && node.isShadowRoot();
}
function $isRootOrShadowRoot(node) {
  return $isRootNode(node) || $isShadowRootNode(node);
}

/**
 * Returns a shallow clone of node with a new key. All properties of the node
 * will be copied to the new node (by `clone` and then `afterCloneFrom`),
 * except those related to parent/sibling/child
 * relationships in the `EditorState`. This means that the copy must be
 * separately added to the document, and it will not have any children.
 *
 * @param node - The node to be copied.
 * @param skipReset - If true (default false) skip the call to resetOnCopyNodeFrom
 * @returns The copy of the node.
 */
function $copyNode(node, skipReset = false) {
  const copy = node.constructor.clone(node, INTERNAL_SKIP_AFTER_CLONE_FROM);
  $setNodeKey(copy, null);
  copy.afterCloneFrom(node);
  if (!skipReset) {
    copy.resetOnCopyNodeFrom(node);
  }
  return copy;
}
function $applyNodeReplacement(node) {
  const editor = getActiveEditor();
  const nodeType = node.getType();
  const registeredNode = getRegisteredNode(editor, nodeType);
  if (!(registeredNode !== undefined)) {
    formatDevErrorMessage(`$applyNodeReplacement node ${node.constructor.name} with type ${nodeType} must be registered to the editor. You can do this by passing the node class via the "nodes" array in the editor config.`);
  }
  const {
    replace,
    replaceWithKlass
  } = registeredNode;
  if (replace !== null) {
    const replacementNode = replace(node);
    const replacementNodeKlass = replacementNode.constructor;
    if (replaceWithKlass !== null) {
      if (!(replacementNode instanceof replaceWithKlass)) {
        formatDevErrorMessage(`$applyNodeReplacement failed. Expected replacement node to be an instance of ${replaceWithKlass.name} with type ${replaceWithKlass.getType()} but returned ${replacementNodeKlass.name} with type ${replacementNodeKlass.getType()} from original node ${node.constructor.name} with type ${nodeType}`);
      }
    } else {
      if (!(replacementNode instanceof node.constructor && replacementNodeKlass !== node.constructor)) {
        formatDevErrorMessage(`$applyNodeReplacement failed. Ensure replacement node ${replacementNodeKlass.name} with type ${replacementNodeKlass.getType()} is a subclass of the original node ${node.constructor.name} with type ${nodeType}.`);
      }
    }
    if (!(replacementNode.__key !== node.__key)) {
      formatDevErrorMessage(`$applyNodeReplacement failed. Ensure that the key argument is *not* used in your replace function (from node ${node.constructor.name} with type ${nodeType} to node ${replacementNodeKlass.name} with type ${replacementNodeKlass.getType()}), Node keys must never be re-used except by the static clone method.`);
    }
    return replacementNode;
  }
  return node;
}
function errorOnInsertTextNodeOnRoot(node, insertNode) {
  const parentNode = node.getParent();
  if ($isRootNode(parentNode) && !$isElementNode(insertNode) && !$isDecoratorNode(insertNode)) {
    {
      formatDevErrorMessage(`Only element or decorator nodes can be inserted in to the root node`);
    }
  }
}

/**
 * Returns the node with the given key from the active EditorState,
 * or throws if it does not exist.
 */

/**
 * @deprecated The type parameter is an unchecked and unsafe cast,
 * equivalent to `$getNodeByKeyOrThrow(key) as N`, and will be removed
 * in a future release. Call this function without a type argument and
 * narrow the result with a type guard instead.
 */

function $getNodeByKeyOrThrow(key) {
  const node = $getNodeByKey(key);
  if (node === null) {
    {
      formatDevErrorMessage(`Expected node with key ${key} to exist but it's not in the nodeMap.`);
    }
  }
  return node;
}
function $createBlockCursorElement(editorConfig) {
  const theme = editorConfig.theme;
  const element = $getDocument().createElement('div');
  element.contentEditable = 'false';
  element.setAttribute('data-lexical-cursor', 'true');
  let blockCursorTheme = theme.blockCursor;
  if (blockCursorTheme !== undefined) {
    if (typeof blockCursorTheme === 'string') {
      const classNamesArr = normalizeClassNames(blockCursorTheme);
      // @ts-expect-error: intentional
      blockCursorTheme = theme.blockCursor = classNamesArr;
    }
    if (blockCursorTheme !== undefined) {
      element.classList.add(...blockCursorTheme);
    }
  }
  return element;
}

/**
 * Returns true if the given node needs a block cursor given an adjacent selection,
 * the node must be non-inline and one of:
 * - DecoratorNode
 * - ShadowRootNode with a parent that is not also a ShadowRootNode
 * - An ElementNode that can't be empty
 */
function $needsBlockCursorBeside(node) {
  if (!node || node.isInline()) {
    return false;
  }
  if ($isDecoratorNode(node)) {
    return true;
  }
  if ($isElementNode(node)) {
    if (node.isShadowRoot()) {
      const parent = node.getParent();
      return !($isElementNode(parent) && parent.isShadowRoot());
    }
    return !node.canBeEmpty();
  }
  return false;
}
function removeDOMBlockCursorElement(blockCursorElement, editor, rootElement) {
  rootElement.style.removeProperty('caret-color');
  editor._blockCursorElement = null;
  const parentElement = blockCursorElement.parentElement;
  if (parentElement !== null) {
    parentElement.removeChild(blockCursorElement);
  }
}
function $updateDOMBlockCursorElement(editor, rootElement, nextSelection) {
  let blockCursorElement = editor._blockCursorElement;
  if ($isRangeSelection(nextSelection) && nextSelection.isCollapsed() && nextSelection.anchor.type === 'element' &&
  // getActiveElement rather than document.activeElement, which reports the
  // shadow host (outside rootElement) when the editor is in a shadow root
  rootElement.contains(getActiveElement(rootElement))) {
    const anchor = nextSelection.anchor;
    const elementNode = anchor.getNode();
    const offset = anchor.offset;
    const elementNodeSize = elementNode.getChildrenSize();
    let isBlockCursor = false;
    let insertBeforeElement = null;
    if (offset === elementNodeSize) {
      const child = elementNode.getChildAtIndex(offset - 1);
      if ($needsBlockCursorBeside(child)) {
        isBlockCursor = true;
      }
    } else {
      const child = elementNode.getChildAtIndex(offset);
      if (child !== null && $needsBlockCursorBeside(child)) {
        const sibling = child.getPreviousSibling();
        if (sibling === null || $needsBlockCursorBeside(sibling)) {
          isBlockCursor = true;
          insertBeforeElement = editor.getElementByKey(child.__key);
        }
      }
    }
    if (isBlockCursor) {
      // Route through the slot so the cursor lands in the content-bearing
      // element. For a node whose `getDOMSlot` wraps its content, the keyed
      // DOM is the wrapper but the managed children (and `insertBeforeElement`)
      // live in `slot.element`; inserting into the keyed wrapper would throw
      // because the reference node is not its child.
      const elementDOM = $getDOMSlot(elementNode, editor.getElementByKey(elementNode.__key), editor).element;
      if (blockCursorElement === null) {
        editor._blockCursorElement = blockCursorElement = $createBlockCursorElement(editor._config);
      }
      rootElement.style.caretColor = 'transparent';
      if (insertBeforeElement === null) {
        elementDOM.appendChild(blockCursorElement);
      } else {
        elementDOM.insertBefore(blockCursorElement, insertBeforeElement);
      }
      return;
    }
  }
  // Remove cursor
  if (blockCursorElement !== null) {
    removeDOMBlockCursorElement(blockCursorElement, editor, rootElement);
  }
}

/**
 * Returns the selection for the given window, or the global window if null.
 * Will return null if {@link CAN_USE_DOM} is false.
 *
 * @param targetWindow The window to get the selection from
 * @returns a Selection or null
 */
function getDOMSelection(targetWindow) {
  return !CAN_USE_DOM ? null : (targetWindow || window).getSelection();
}

/**
 * Returns the selection for the defaultView of the ownerDocument of given EventTarget.
 *
 * @param eventTarget The node to get the selection from
 * @returns a Selection or null
 */
function getDOMSelectionFromTarget(eventTarget) {
  const defaultView = getDefaultView(eventTarget);
  return defaultView ? defaultView.getSelection() : null;
}

/**
 * @param node A value that may be a DOM ShadowRoot.
 * @returns True if node is a DOM ShadowRoot (an open or closed shadow tree
 *   root), false otherwise. A ShadowRoot is a DocumentFragment with a host.
 *
 * @experimental Shape may change as shadow DOM support stabilizes.
 */
function isDOMShadowRoot(node) {
  return isDocumentFragment(node) && 'host' in node;
}

/**
 * Collects the DOM ShadowRoots between `node` and its document, innermost
 * first. Returns an empty array when `node` is in the light DOM (its root is
 * the Document) or is detached.
 *
 * Uses the standard {@link https://developer.mozilla.org/docs/Web/API/Node/getRootNode | Node.getRootNode}
 * and `ShadowRoot.host` platform APIs to walk out of any nested shadow trees.
 *
 * @param node The DOM node to start from (typically the editor root element).
 * @returns The enclosing ShadowRoots, innermost first.
 *
 * @experimental Shape may change as shadow DOM support stabilizes.
 */
const EMPTY_SHADOW_ROOTS = [];
function getDOMShadowRoots(node) {
  const root = node.getRootNode();
  if (root === node || !isDOMShadowRoot(root)) {
    return EMPTY_SHADOW_ROOTS;
  }
  const shadowRoots = [root];
  let current = root.host;
  for (;;) {
    const nextRoot = current.getRootNode();
    if (nextRoot === current || !isDOMShadowRoot(nextRoot)) {
      break;
    }
    shadowRoots.push(nextRoot);
    current = nextRoot.host;
  }
  return shadowRoots;
}

/**
 * Walks `root` and every open shadow root nested inside it, yielding each
 * element that matches `selector`. `querySelectorAll` does not pierce
 * shadow boundaries on its own; this descent does.
 *
 * @internal
 */
function* findAllLexicalElementsDeep(initialRoot) {
  const roots = [initialRoot];
  let root;
  while (root = roots.pop()) {
    yield* root.querySelectorAll('[data-lexical-editor="true"]');
    // Resolve the owning document by nodeType, not `instanceof Document`:
    // a Document from another realm (e.g. an iframe) is not an instance of
    // this realm's Document constructor, so `instanceof` would misclassify it
    // and fall back to the global `document`. A ShadowRoot's ownerDocument is
    // always its (realm-correct) Document.
    const doc = isDOMDocumentNode(root) ? root : root.ownerDocument;
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let el;
    while (el = walker.nextNode()) {
      if (el.shadowRoot) {
        roots.push(el.shadowRoot);
      }
    }
  }
}

/**
 * Resolves the document that hosts an editor's root element, falling
 * back to the global `document` when the editor isn't mounted. Use this
 * over `editor.getRootElement()?.ownerDocument ?? document` so iframe /
 * shadow-mounted editors land in the right realm.
 *
 * @internal
 */
function getRootOwnerDocument(rootElement) {
  return rootElement !== null ? rootElement.ownerDocument : document;
}

/**
 * Returns the {@link Document} that owns the active editor's root element.
 * Falls back to `globalThis.document` when there is no active editor (e.g.
 * a node method such as `createDOM` / `exportDOM` is invoked headlessly,
 * outside of `editor.update()` / `editor.read()`), or when the active
 * editor has no root element (e.g. headless mode with
 * {@link @lexical/headless!withDOM | withDOM}).
 *
 * Use this inside `createDOM`, `updateDOM`, and `exportDOM` instead of the
 * bare `document` global so the node works correctly when the editor lives
 * inside a Shadow DOM or a cross-origin `<iframe>`.
 *
 * Unlike most `$`-prefixed helpers, this does NOT require an ambient active
 * editor: it must remain callable from `createDOM` / `exportDOM`, which are
 * public methods that consumers may legitimately call while serializing
 * nodes headlessly. Throwing here would silently break every node whose DOM
 * methods were migrated off the bare `document` global.
 */
function $getDocument() {
  const editor = internalGetActiveEditor();
  return getRootOwnerDocument(editor !== null ? editor._rootElement : null);
}

/**
 * A subset of `Selection` covering the four boundary-point fields Lexical
 * reads plus `direction`. Designed so a `Selection` instance can be returned
 * where a `DOMSelectionBoundaryPoints` is expected (see {@link getDOMSelectionPoints}).
 *
 * `direction` is the standard
 * {@link https://developer.mozilla.org/docs/Web/API/Selection/direction | Selection.direction}
 * pass-through: `'forward'` / `'backward'` / `'none'` when the engine
 * implements it, or `undefined` when a future engine ships
 * `getComposedRanges` without `direction` (no current shipping
 * configuration matches — every engine that ships the former also ships
 * the latter). In the undefined case anchor/focus default to the composed
 * StaticRange's tree order; callers needing strict backward fidelity
 * inside a shadow root should check `direction !== undefined`.
 *
 * @experimental Shape may change as shadow DOM support stabilizes.
 */

/**
 * Resolves a DOM Selection's range through any DOM ShadowRoots enclosing
 * `rootElement`, using the standard
 * {@link https://developer.mozilla.org/docs/Web/API/Selection/getComposedRanges | Selection.getComposedRanges}
 * platform API.
 *
 * When a selection is inside a shadow tree the browser retargets
 * `Selection.getRangeAt`/`anchorNode`/`focusNode` to the shadow host, which
 * hides the real nodes Lexical needs to resolve. Passing the enclosing shadow
 * roots to `getComposedRanges` returns the un-retargeted boundary points as a
 * {@link https://developer.mozilla.org/docs/Web/API/StaticRange | StaticRange}
 * (in tree order, i.e. start before end).
 *
 * @returns The composed StaticRange, or `null` when `rootElement` is in the
 *   light DOM, the platform does not implement `getComposedRanges`, or there
 *   is no selection.
 *
 * @experimental Shape may change as shadow DOM support stabilizes.
 */
function getComposedStaticRange(domSelection, rootElement) {
  if (rootElement === null || typeof domSelection.getComposedRanges !== 'function') {
    return null;
  }
  const shadowRoots = getDOMShadowRoots(rootElement);
  if (shadowRoots.length === 0) {
    return null;
  }
  // Prefer the standard dictionary form (Chrome, modern WebKit, Firefox);
  // fall back to the legacy variadic form shipped by Safari 17–18.1. A
  // browser that doesn't understand the dictionary may return an empty array
  // rather than throwing, so check the result on each attempt before
  // degrading.
  const getComposedRanges = domSelection.getComposedRanges;
  try {
    const dictRange = getComposedRanges.call(domSelection, {
      shadowRoots
    })[0];
    if (dictRange !== undefined) {
      return dictRange;
    }
  } catch (_error) {
    // Try the legacy variadic form.
  }
  try {
    const variadicRange = getComposedRanges.apply(domSelection, shadowRoots)[0];
    if (variadicRange !== undefined) {
      return variadicRange;
    }
  } catch (_error) {
    // Both forms failed — degrade.
  }
  return null;
}

/**
 * Returns a live DOM Range for the Selection, resolved through any DOM
 * ShadowRoots enclosing `rootElement`. Inside a shadow tree
 * `Selection.getRangeAt(0)` is retargeted to the shadow host, so this builds a
 * Range from the composed boundary points instead (see
 * {@link getComposedStaticRange}); in the light DOM it returns
 * `getRangeAt(0)` unchanged. Use this instead of `getRangeAt(0)` when the
 * Range is needed for layout (e.g. `getBoundingClientRect`), which a
 * StaticRange cannot provide.
 *
 * @returns A live Range, or null when the selection has no ranges.
 *
 * @experimental Shape may change as shadow DOM support stabilizes.
 */
function getDOMSelectionRange(domSelection, rootElement) {
  const staticRange = getComposedStaticRange(domSelection, rootElement);
  if (staticRange !== null) {
    const range = staticRangeToLiveRange(staticRange);
    if (range !== null) {
      return range;
    }
  }
  return domSelection.rangeCount > 0 ? domSelection.getRangeAt(0) : null;
}

/**
 * Resolves a DOM Selection's anchor/focus boundary points through any DOM
 * ShadowRoots enclosing `rootElement`. Inside a shadow tree the boundary
 * points come from {@link getComposedStaticRange} mapped back onto
 * anchor/focus with the standard
 * {@link https://developer.mozilla.org/docs/Web/API/Selection/direction | Selection.direction};
 * in the light DOM (or when `getComposedRanges` is unavailable) the Selection's
 * own anchorNode/focusNode are already correct, so the Selection is returned
 * as-is (it satisfies {@link DOMSelectionBoundaryPoints}).
 *
 * Use this instead of reading `Selection.anchorNode`/`focusNode` directly,
 * which are retargeted to the shadow host inside a shadow tree.
 *
 * @remarks
 * The two return paths have different read semantics:
 * - light DOM: the return aliases `domSelection`, so subsequent reads
 *   reflect any post-call selection changes. The aliasing is intentional;
 *   each `Selection` property read forces a synchronous style/layout
 *   recalculation, so `$updateDOMSelection` defers these reads until they
 *   are actually needed.
 * - shadow DOM: the return is a snapshot taken at call time, including
 *   `direction`. If a future engine ships `getComposedRanges` without
 *   `Selection.direction` (no current shipping configuration matches),
 *   the snapshot's `direction` is `undefined` and anchor/focus default
 *   to the StaticRange's tree order — a backward selection will appear
 *   forward.
 *
 * Read the four points immediately after the call, or compare identity
 * via `points === domSelection` to detect when the return aliases
 * `domSelection`, rather than caching the returned reference across
 * selection mutations.
 *
 * @experimental Shape may change as shadow DOM support stabilizes.
 */
function getDOMSelectionPoints(domSelection, rootElement) {
  const staticRange = getComposedStaticRange(domSelection, rootElement);
  if (staticRange === null) {
    return domSelection;
  }
  return staticRangeToPoints(staticRange, readDirection(domSelection));
}

/**
 * Resolves the live DOM Range (for layout reads like `getBoundingClientRect`)
 * and the anchor/focus boundary points in one pass, sharing a single
 * {@link getComposedStaticRange} read rather than computing it twice as a
 * call to {@link getDOMSelectionRange} followed by {@link getDOMSelectionPoints}
 * would. Use this at sites that need both shapes from the same selection.
 *
 * @returns The composed Range plus the boundary points; the Range is null
 *   when the selection has no ranges.
 *
 * @experimental Shape may change as shadow DOM support stabilizes.
 */
function getDOMSelectionRangeAndPoints(domSelection, rootElement) {
  const staticRange = getComposedStaticRange(domSelection, rootElement);
  if (staticRange === null) {
    return {
      points: domSelection,
      range: domSelection.rangeCount > 0 ? domSelection.getRangeAt(0) : null
    };
  }
  const range = staticRangeToLiveRange(staticRange) ?? (domSelection.rangeCount > 0 ? domSelection.getRangeAt(0) : null);
  return {
    points: staticRangeToPoints(staticRange, readDirection(domSelection)),
    range
  };
}

// Build a live DOM Range from a StaticRange's endpoints, in the container's
// own document so iframe / shadow trees resolve to the right Range constructor.
// Returns null when the container is detached or the endpoints reject (the
// caller can fall back to `domSelection.getRangeAt(0)` in that case).
function staticRangeToLiveRange(staticRange) {
  const doc = staticRange.startContainer.ownerDocument;
  if (doc === null) {
    return null;
  }
  const range = doc.createRange();
  try {
    range.setStart(staticRange.startContainer, staticRange.startOffset);
    range.setEnd(staticRange.endContainer, staticRange.endOffset);
    return range;
  } catch (_error) {
    return null;
  }
}

// Map a StaticRange + Selection.direction to anchor/focus pairs. Selection
// returns boundaries in tree order, so a backward direction reverses the
// pair before mapping (matching what Selection.anchorNode/focusNode would
// have reported in the light DOM). 'none' and undefined map to forward
// (anchor=start): a 'none' selection is directionless (e.g. created via
// Selection.addRange), which the spec pins to anchor=start/focus=end, so the
// forward mapping is correct — only directional APIs ever report 'backward'.
function staticRangeToPoints(staticRange, direction) {
  const {
    startContainer,
    startOffset,
    endContainer,
    endOffset
  } = staticRange;
  return direction === 'backward' ? {
    anchorNode: endContainer,
    anchorOffset: endOffset,
    direction,
    focusNode: startContainer,
    focusOffset: startOffset
  } : {
    anchorNode: startContainer,
    anchorOffset: startOffset,
    direction,
    focusNode: endContainer,
    focusOffset: endOffset
  };
}
function readDirection(domSelection) {
  return domSelection.direction;
}

/**
 * Returns the focused element within the same Document or ShadowRoot as
 * `node`, using the standard `DocumentOrShadowRoot.activeElement`.
 *
 * Unlike `document.activeElement` — which is retargeted to the outermost
 * shadow host when focus is inside a shadow tree — this returns the focused
 * element within `node`'s own tree (e.g. the editor's contentEditable when it
 * lives inside a shadow root).
 *
 * @param node A node whose tree's active element is wanted.
 * @returns The active element, or null.
 *
 * @experimental Shape may change as shadow DOM support stabilizes.
 */
function getActiveElement(node) {
  const root = node.getRootNode();
  return isDOMDocumentNode(root) || isDOMShadowRoot(root) ? root.activeElement : null;
}

/**
 * Descends from `root.activeElement` through nested open ShadowRoots to the
 * deepest focused element. `document.activeElement` only reports the outermost
 * shadow host; this walks into the shadow trees via `ShadowRoot.activeElement`
 * to find the element that actually has focus.
 *
 * @param root The Document or ShadowRoot to start from.
 * @returns The deepest active element, or null.
 *
 * @experimental Shape may change as shadow DOM support stabilizes.
 */
function getActiveElementDeep(root) {
  let active = root.activeElement;
  while (active !== null && active.shadowRoot !== null) {
    const inner = active.shadowRoot.activeElement;
    if (inner === null) {
      break;
    }
    active = inner;
  }
  return active;
}

/**
 * Returns the un-retargeted event target — the real element the user
 * interacted with — for events observed by a listener above an enclosing
 * DOM shadow root. `Event.target` is retargeted to the outermost shadow
 * host in that case, hiding the actual element; `composedPath()[0]`
 * returns the original target for `composed: true` events (most
 * user-agent UI events: click, mousedown, pointerdown, focusin, etc.).
 * Falls back to `event.target` when `composedPath` is unavailable or
 * returns an empty array (e.g. the event has already finished
 * dispatching).
 *
 * Pairs with the shadow-aware helpers above
 * ({@link getDOMSelectionPoints}, {@link getActiveElement}) for the
 * event side of the shadow boundary — useful when an
 * `Element.contains(target)` check needs to test against an editor root
 * inside a shadow tree.
 *
 * @param event The dispatched event.
 * @returns The un-retargeted target, or null when the event has none.
 *
 * @experimental Shape may change as shadow DOM support stabilizes.
 */
function getComposedEventTarget(event) {
  const target = event.target;
  if (target !== null && isHTMLElement(target) && target.shadowRoot !== null && typeof event.composedPath === 'function') {
    const path = event.composedPath();
    if (path.length > 0) {
      return path[0];
    }
  }
  return target;
}
function $splitNode(node, offset) {
  let startNode = node.getChildAtIndex(offset);
  if (startNode == null) {
    startNode = node;
  }
  if (!!$isRootOrShadowRoot(node)) {
    formatDevErrorMessage(`Can not call $splitNode() on root element`);
  }
  const recurse = currentNode => {
    const parent = currentNode.getParentOrThrow();
    const isParentRoot = $isRootOrShadowRoot(parent);
    // The node we start split from (leaf) is moved, but its recursive
    // parents are copied to create separate tree
    const nodeToMove = currentNode === startNode && !isParentRoot ? currentNode : $copyNode(currentNode);
    if (isParentRoot) {
      if (!($isElementNode(currentNode) && $isElementNode(nodeToMove))) {
        formatDevErrorMessage(`Children of a root must be ElementNode`);
      }
      currentNode.insertAfter(nodeToMove);
      return [currentNode, nodeToMove, nodeToMove];
    } else {
      const [leftTree, rightTree, newParent] = recurse(parent);
      const nextSiblings = currentNode.getNextSiblings();
      newParent.append(nodeToMove, ...nextSiblings);
      return [leftTree, rightTree, nodeToMove];
    }
  };
  const [leftTree, rightTree] = recurse(startNode);
  return [leftTree, rightTree];
}

/**
 * @param x - The element being tested
 * @returns Returns true if x is an HTML anchor tag, false otherwise
 */
function isHTMLAnchorElement(x) {
  return isHTMLElement(x) && x.tagName === 'A';
}

/**
 * @param x - The element being tested
 * @returns Returns true if x is an HTML `<tr>` element, false otherwise
 */
function isHTMLTableRowElement(x) {
  return isHTMLElement(x) && x.tagName === 'TR';
}

/**
 * @param x - The element being tested
 * @returns Returns true if x is an HTML `<td>` or `<th>` element, false
 *   otherwise
 */
function isHTMLTableCellElement(x) {
  return isHTMLElement(x) && (x.tagName === 'TD' || x.tagName === 'TH');
}

/**
 * @param x - The element being tested
 * @returns Returns true if x is an HTML element, false otherwise.
 */
function isHTMLElement(x) {
  return isDOMNode(x) && x.nodeType === DOM_ELEMENT_TYPE;
}

/**
 * @param x - The element being tested
 * @returns Returns true if x is a DOM Node, false otherwise.
 */
function isDOMNode(x) {
  return typeof x === 'object' && x !== null && 'nodeType' in x && typeof x.nodeType === 'number';
}

/**
 * @param x - The element being testing
 * @returns Returns true if x is a document fragment, false otherwise.
 */
function isDocumentFragment(x) {
  return isDOMNode(x) && x.nodeType === DOM_DOCUMENT_FRAGMENT_TYPE;
}
const INLINE_TAG_RE = /^(a|abbr|acronym|b|cite|code|del|em|i|ins|kbd|label|mark|output|q|ruby|s|samp|span|strong|sub|sup|time|u|tt|var|#text)$/i;

/**
 *
 * @param node - the Dom Node to check
 * @returns if the Dom Node is an inline node
 */
function isInlineDomNode(node) {
  return isHTMLElement(node) && node.style.display.startsWith('inline') ? true : INLINE_TAG_RE.test(node.nodeName);
}
const BLOCK_TAG_RE = /^(address|article|aside|blockquote|canvas|dd|div|dl|dt|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|header|hr|li|main|nav|noscript|ol|p|pre|section|table|td|tfoot|ul|video)$/i;

/**
 *
 * @param node - the Dom Node to check
 * @returns if the Dom Node is a block node
 */
function isBlockDomNode(node) {
  return isHTMLElement(node) && node.style.display.startsWith('inline') ? false : BLOCK_TAG_RE.test(node.nodeName);
}

/**
 * @internal
 *
 * This function is for internal use of the library.
 * Please do not use it as it may change in the future.
 *
 * This function returns true for a DecoratorNode that is not inline OR
 * an ElementNode that is:
 * - not a root or shadow root
 * - not inline
 * - can't be empty
 * - has no children or an inline first child
 */
function INTERNAL_$isBlock(node) {
  if ($isDecoratorNode(node) && !node.isInline()) {
    return true;
  }
  if (!$isElementNode(node) || $isRootOrShadowRoot(node)) {
    return false;
  }
  const firstChild = node.getFirstChild();
  const isLeafElement = firstChild === null || $isLineBreakNode(firstChild) || $isTextNode(firstChild) || firstChild.isInline();
  return !node.isInline() && node.canBeEmpty() !== false && isLeafElement;
}

/**
 * Utility function for accessing current active editor instance.
 * @returns Current active editor
 */
function $getEditor() {
  return getActiveEditor();
}

/**
 * @experimental
 *
 * Read the editor's `$getDOMSlot` configuration (defaulting to the base
 * implementation when no override is registered via {@link DOMRenderExtension}).
 * Cross-package consumers (`@lexical/utils`, `@lexical/react`) use this to
 * route selection / DOM lookups through extension-configured slots.
 */
function $getEditorDOMRenderConfig(editor = $getEditor()) {
  return editor._config.dom || DEFAULT_EDITOR_DOM_CONFIG;
}

/**
 * @experimental
 *
 * Resolve the DOM slot for a node through the configured `$getDOMSlot` hook,
 * narrowing the return type via {@link DOMSlotForNode}: for an `ElementNode`
 * the result is an {@link ElementDOMSlot} (with children-management methods),
 * for non-Element nodes the base {@link DOMSlot} pointing at the keyed DOM.
 *
 * Invariants if an extension override returns a slot that doesn't match the
 * expected narrow type for the node (extension contract violation).
 */
function $getDOMSlot(node, dom, editor = $getEditor()) {
  const slot = $getEditorDOMRenderConfig(editor).$getDOMSlot(node, dom, editor);
  if ($isElementNode(node)) {
    if (!$isElementDOMSlot(slot)) {
      formatDevErrorMessage(`$getDOMSlot: expected ElementDOMSlot for ElementNode (key ${node.getKey()} type ${node.getType()})`);
    }
  }
  return slot;
}

/**
 * @internal
 *
 * Returns the scaffolding container element that `host`'s named slot renders
 * into, or null if the slot is empty or not yet rendered. The container is the
 * parent of the slotted node's DOM, resolved by key so it is found wherever it
 * sits — the reconciler parks it as a hidden placeholder in the host DOM, and
 * an explicit mount ({@link mountSlotContainer}) may relocate it; this lookup
 * still resolves it after that relocation. Editor-time analog of the
 * reconciler's internal `$slotContainerForKey`, which resolves the same
 * container from the reconcile-time DOM map instead of
 * `editor.getElementByKey`.
 */
function $getSlotContainer(host, name, editor = $getEditor()) {
  const slot = $getSlot(host, name);
  if (slot === null) {
    return null;
  }
  const slotDom = editor.getElementByKey(slot.getKey());
  return slotDom !== null ? slotDom.parentElement : null;
}

/**
 * @experimental
 *
 * Attach a host's named-slot container to `target` and make it visible.
 * The reconciler renders every slot subtree synchronously into a hidden
 * (`display: 'none'`) placeholder container parked slots-first in the host
 * DOM; nothing is visible until the host explicitly attaches the container
 * somewhere — mirroring how `getDOMSlot` gives an element control over where
 * its linked-list children render. This helper moves the container into
 * `target` (a no-op when it is already there, so mounting in place just
 * reveals it) and clears the inline `display` so the container renders as a
 * normal block that stylesheets may restyle. It deliberately does NOT use
 * `display: 'contents'`: Chromium cannot reliably edit inside a boxless
 * contenteditable subtree (caret hit-testing resolves clicks to a
 * neighboring box and native text insertion is dropped).
 *
 * Idempotent and framework-independent: lexical-react's `useLexicalSlotRef`
 * wraps it, and a node class or extension can call it directly (e.g. from a
 * mutation listener) to control slot placement without React.
 *
 * @returns the container, or null when the slot (or its DOM) does not exist
 * yet — e.g. before the host's first reconciliation.
 */
function mountSlotContainer(editor, nodeKey, slotName, target) {
  const container = editor.read('latest', () => {
    const host = $getNodeByKey(nodeKey);
    return host !== null ? $getSlotContainer(host, slotName, editor) : null;
  });
  if (container !== null) {
    if (container.parentElement !== target) {
      target.appendChild(container);
    }
    container.style.display = '';
  }
  return container;
}

/**
 * @experimental
 *
 * Reverse of {@link mountSlotContainer}: hide `container` again and park it
 * back in the host's DOM as the leading hidden placeholder, where the
 * reconciler manages it. Call when the mount target goes away while the host
 * remains (e.g. chrome unmount) so the slot subtree stays in the document
 * instead of leaving with the detached target.
 */
function unmountSlotContainer(editor, nodeKey, container) {
  container.style.display = 'none';
  const hostDom = editor.getElementByKey(nodeKey);
  if (hostDom !== null && container.parentElement !== hostDom) {
    hostDom.insertBefore(container, hostDom.firstChild);
  }
}

/**
 * @experimental
 *
 * Type guard narrowing a {@link DOMSlot} to an {@link ElementDOMSlot}, which
 * exposes children-management methods like `insertChild` and the managed
 * line-break helpers.
 */
function $isElementDOMSlot(slot) {
  return slot instanceof ElementDOMSlot;
}

/**
 * @experimental
 *
 * Resolve the actual text DOM (`Text`) for a `TextNode` through the
 * configured `$getDOMSlot` hook. Unlike the plain {@link getDOMTextNode}
 * which descends the first child chain from a raw element, this routes
 * through the slot so an extension wrapping the text node's keyed DOM
 * (e.g. one that injects a `contentEditable=false` sibling before the
 * text) still points at the correct content element.
 */
function $getDOMTextNode(node, dom, editor = $getEditor()) {
  const slot = $getDOMSlot(node, dom, editor);
  return getDOMTextNode(slot.element);
}

/** @internal */

/**
 * @internal
 * Compute a cached Map of node type to nodes for a frozen EditorState
 */
const cachedNodeMaps = new WeakMap();
const EMPTY_TYPE_TO_NODE_MAP = new Map();
function getCachedTypeToNodeMap(editorState) {
  // If this is a new Editor it may have a writable this._editorState
  // with only a 'root' entry.
  if (!editorState._readOnly && editorState.isEmpty()) {
    return EMPTY_TYPE_TO_NODE_MAP;
  }
  if (!editorState._readOnly) {
    formatDevErrorMessage(`getCachedTypeToNodeMap called with a writable EditorState`);
  }
  let typeToNodeMap = cachedNodeMaps.get(editorState);
  if (!typeToNodeMap) {
    typeToNodeMap = computeTypeToNodeMap(editorState);
    cachedNodeMaps.set(editorState, typeToNodeMap);
  }
  return typeToNodeMap;
}

/**
 * @internal
 * Compute a Map of node type to nodes for an EditorState
 */
function computeTypeToNodeMap(editorState) {
  const typeToNodeMap = new Map();
  for (const [nodeKey, node] of editorState._nodeMap) {
    const nodeType = node.__type;
    let nodeMap = typeToNodeMap.get(nodeType);
    if (!nodeMap) {
      nodeMap = new Map();
      typeToNodeMap.set(nodeType, nodeMap);
    }
    nodeMap.set(nodeKey, node);
  }
  return typeToNodeMap;
}

/**
 * Returns a clone of a node using `node.constructor.clone()` followed by
 * `clone.afterCloneFrom(node)`. The resulting clone must have the same key,
 * parent/next/prev pointers, and other properties that are not set by
 * `node.constructor.clone` (format, style, etc.). This is primarily used by
 * {@link LexicalNode.getWritable} to create a writable version of an
 * existing node. The clone is the same logical node as the original node,
 * do not try and use this function to duplicate or copy an existing node.
 *
 * Does not mutate the EditorState.
 * @param latestNode - The node to be cloned.
 * @returns The clone of the node.
 */
function $cloneWithProperties(latestNode) {
  const constructor = latestNode.constructor;
  const mutableNode = constructor.clone(latestNode, INTERNAL_SKIP_AFTER_CLONE_FROM);
  mutableNode.afterCloneFrom(latestNode);
  {
    if (!(mutableNode.__key === latestNode.__key)) {
      formatDevErrorMessage(`$cloneWithProperties: ${constructor.name}.clone(node) (with type '${constructor.getType()}') did not return a node with the same key, make sure to specify node.__key as the last argument to the constructor`);
    }
    if (!(mutableNode.__parent === latestNode.__parent && mutableNode.__next === latestNode.__next && mutableNode.__prev === latestNode.__prev)) {
      formatDevErrorMessage(`$cloneWithProperties: ${constructor.name}.clone(node) (with type '${constructor.getType()}') overrode afterCloneFrom but did not call super.afterCloneFrom(prevNode)`);
    }
    if ($isSlotChild(mutableNode) && $isSlotChild(latestNode)) {
      if (!(mutableNode.__slotHost === latestNode.__slotHost)) {
        formatDevErrorMessage(`$cloneWithProperties: ${constructor.name}.clone(node) (with type '${constructor.getType()}') overrode afterCloneFrom but did not preserve __slotHost`);
      }
    }
    if ($isSlotHost(mutableNode) && $isSlotHost(latestNode)) {
      const mutSlots = mutableNode.__slots;
      const latSlots = latestNode.__slots;
      const slotsMatch = mutSlots === latSlots || mutSlots !== null && latSlots !== null && mutSlots.size === latSlots.size && Array.from(mutSlots).every(([k, v]) => latSlots.get(k) === v);
      if (!slotsMatch) {
        formatDevErrorMessage(`$cloneWithProperties: ${constructor.name}.clone(node) (with type '${constructor.getType()}') overrode afterCloneFrom but did not preserve __slots`);
      }
    }
  }
  return mutableNode;
}

/**
 * Returns a clone with {@link $cloneWithProperties} and then "detaches"
 * it from the state by overriding its getLatest and getWritable to always
 * return this. This node can not be added to an EditorState or become the
 * parent, child, or sibling of another node. It is primarily only useful
 * for making in-place temporary modifications to a TextNode when
 * serializing a partial slice.
 *
 * Does not mutate the EditorState.
 * @param latestNode - The node to be cloned.
 * @returns The clone of the node.
 */
function $cloneWithPropertiesEphemeral(latestNode) {
  return $markEphemeral($cloneWithProperties(latestNode));
}
function setNodeIndentFromDOM(elementDom, elementNode) {
  // Prefer the authoritative attribute Lexical writes in exportDOM, since the
  // padding-inline-start fallback can't recover a custom
  // `--lexical-indent-base-value` or the reconciler's `calc(...)` form.
  const indentAttr = elementDom.getAttribute('data-lexical-indent');
  if (indentAttr !== null) {
    const parsed = parseInt(indentAttr, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      elementNode.setIndent(parsed);
      return;
    }
  }
  const indentSize = parseInt(elementDom.style.paddingInlineStart, 10) || 0;
  const indent = Math.round(indentSize / 40);
  elementNode.setIndent(indent);
}

/**
 * Reads the `dir` attribute from a DOM element and applies it to the given
 * ElementNode via {@link ElementNode.setDirection} when it is a valid direction
 * value (`'ltr'` or `'rtl'`). Other values, including missing or empty `dir`,
 * leave the node unchanged. Useful inside `importDOM` converters to preserve
 * explicit text direction from imported HTML.
 *
 * @param node - The ElementNode to update.
 * @param domNode - The source HTMLElement whose `dir` attribute is read.
 * @returns The node, with its direction set when the source `dir` was valid.
 */
function $setDirectionFromDOM(node, domNode) {
  const dir = domNode.getAttribute('dir');
  return dir === 'ltr' || dir === 'rtl' ? node.setDirection(dir) : node;
}

/**
 * Reads the `style` and CSS `textAlign` property from a DOM element
 * and set format to the given ElementNode via {@link ElementNode.setFormat}
 * when it is a valid alignment value {@link ElementFormatType}
 * Other values, including missing or empty, leave the node unchanged.
 * Useful inside `importDOM` converters to preserve explicit alignment from imported HTML.
 *
 * @param node - The ElementNode to update.
 * @param domNode - The source HTMLElement whose `style` property is read.
 * @returns The node, with its align format set when the source `style.textAlign` was valid.
 */
function $setFormatFromDOM(node, domNode) {
  const alignment = domNode.style.textAlign;
  return alignment && alignment in ELEMENT_TYPE_TO_FORMAT ? node.setFormat(alignment) : node;
}

/**
 * Options accepted by {@link setDOMUnmanaged}.
 *
 * @experimental
 */

/**
 * Mark this DOM element as unmanaged by lexical's mutation observer (like
 * decorator nodes are). Extensions that inject non-lexical decoration
 * elements into a node's DOM should mark them so the mutation observer
 * doesn't evict them as "unknown DOM children" during cleanup.
 *
 * Pass `{captureSelection: true}` to additionally treat the subtree's
 * window selection as decorator-like, so resolution does not force-sync
 * the caret out of unmanaged DOM (see {@link isDOMCapturingSelection}).
 *
 * @experimental
 */
function setDOMUnmanaged(elementDom, options) {
  elementDom.__lexicalUnmanaged = true;
  if (options && options.captureSelection !== undefined) {
    elementDom.__lexicalCapturedSelection = options.captureSelection;
  }
}

/**
 * True if this DOM node was marked with {@link setDOMUnmanaged}.
 *
 * @experimental
 */
function isDOMUnmanaged(elementDom) {
  return elementDom.__lexicalUnmanaged === true;
}

/**
 * Mark a DOM element as a named-slot editable island: set its `contentEditable`
 * to follow the editor's editable state. A slot rendered inside a non-editable
 * host (a decorator, or a `contentEditable=false` element shell) does not track
 * the editor on its own, so its container carries an explicit `contentEditable`;
 * {@link $fullReconcile} re-applies this when {@link LexicalEditor.setEditable}
 * toggles. Call it for any other editable island an app attaches itself (e.g. a
 * `getDOMSlot` children element rendered inside a `contentEditable=false` shell).
 *
 * @experimental
 */
function $markSlotEditable(element, editor = $getEditor()) {
  const editable = editor.isEditable();
  element.contentEditable = editable ? 'true' : 'false';
  if (editable) {
    element.__lexicalEditor = editor;
  } else {
    delete element.__lexicalEditor;
  }
}

/**
 * True if the DOM node sits inside a subtree marked with
 * `{captureSelection: true}` via {@link setDOMUnmanaged}. Walks ancestors
 * so any descendant of a marked subtree (e.g. an `<input>` inside a marked
 * `<div>`) reports as captured too.
 *
 * The walk aborts at the first DOM node that corresponds to a Lexical
 * node in `editor` — that boundary is the implicit owner of the subtree's
 * selection, so a captureSelection marker above it (in non-Lexical
 * scaffolding around the editor) does not leak in.
 *
 * DecoratorNode DOM is marked with `setDOMUnmanaged({captureSelection:
 * true})` by the reconciler, so decorator subtrees also report as
 * captured here.
 *
 * @experimental
 */
function isDOMCapturingSelection(elementDom, editor) {
  let dom = elementDom;
  while (dom != null) {
    if (dom.__lexicalCapturedSelection === true) {
      return true;
    }
    // @experimental named-slots. A decorator host's slot container is a
    // key-less scaffolding wrapper made contentEditable so its Lexical-managed
    // content stays editable. Walking up from inside a slot would otherwise
    // reach the decorator host's captured-selection flag and misread the slot
    // as foreign-captured DOM, suppressing Lexical's input / selection
    // handling. The container is a capturing boundary: stop here.
    if (isHTMLElement(dom) && dom.hasAttribute('data-lexical-slot')) {
      return false;
    }
    if (getNodeKeyFromDOMNode(dom, editor) !== undefined) {
      return false;
    }
    dom = getParentElement(dom);
  }
  return false;
}

/**
 * @internal
 *
 * Object.hasOwn ponyfill
 */
function hasOwn(o, k) {
  return Object.prototype.hasOwnProperty.call(o, k);
}

/**
 * @internal
 */
function hasOwnStaticMethod(klass, k) {
  return hasOwn(klass, k) && klass[k] !== LexicalNode[k];
}

/** @internal */
function isAbstractNodeClass(klass) {
  if (!(klass === LexicalNode || klass.prototype instanceof LexicalNode)) {
    let ownNodeType = '<unknown>';
    let version = '<unknown>';
    try {
      ownNodeType = klass.getType();
    } catch (_err) {
      // ignore
    }
    try {
      if (LexicalEditor.version) {
        version = JSON.parse(LexicalEditor.version);
      }
    } catch (_err) {
      // ignore
    }
    {
      formatDevErrorMessage(`${klass.name} (type ${ownNodeType}) does not subclass LexicalNode from the lexical package used by this editor (version ${version}). All lexical and @lexical/* packages used by an editor must have identical versions. If you suspect the version does match, then the problem may be caused by multiple copies of the same lexical module (e.g. both esm and cjs, or included directly in multiple entrypoints).`);
    }
  }
  return klass === DecoratorNode || klass === ElementNode || klass === LexicalNode;
}
const STATIC_NODE_CONFIG_CACHE = new WeakMap();
// Brands a getType() closure that Lexical synthesized (as opposed to a
// user-defined static getType()). getStaticNodeConfig uses this to avoid
// re-entering a synthesized closure while deriving a node's type, which would
// otherwise recurse infinitely for subclasses under compiled class output.
const SYNTHESIZED_GET_TYPE = Symbol('lexical.synthesizedGetType');

// TextNode.length > 0 will only be true if the compiler output
// is not ES6 compliant, in which case we can not provide this
// warning. We also can't reliably provide this warning if the output
// has been optimized because `arg=undefined` parameter defaults can
// be stripped.
const IS_UNOPTIMIZED_DEV_BUILD = // constructor(key=undefined)
TabNode.length === 0 &&
// constructor(text='', key?: NodeKey)
TextNode.length === 0 &&
// Class name mangling is another signal that this may be unreliable
TextNode.name === 'TextNode';

/** @internal */
function getStaticNodeConfig(klass) {
  const cache = STATIC_NODE_CONFIG_CACHE.get(klass);
  if (cache) {
    return cache;
  }
  const nodeConfigRecord = klass.prototype != null && PROTOTYPE_CONFIG_METHOD in klass.prototype ? klass.prototype[PROTOTYPE_CONFIG_METHOD]() : undefined;
  const isAbstract = isAbstractNodeClass(klass);
  // Only trust a *user-defined* own static getType() to derive the node type.
  // A getType() that we synthesized (branded with SYNTHESIZED_GET_TYPE) must
  // not be called here: the synthesized closure defers to
  // LexicalNode.getType.call(this) for a foreign `this`, which re-enters
  // getStaticNodeConfig and — when the closure is inherited/own-copied onto a
  // subclass by the compiled class output — causes infinite recursion
  // (RangeError: Maximum call stack size exceeded). For such a class the type
  // is derived from the $config record below instead. (#8867 follow-up.)
  const ownGetType = !isAbstract && hasOwnStaticMethod(klass, 'getType') ? klass.getType : undefined;
  const nodeType = ownGetType && !(SYNTHESIZED_GET_TYPE in ownGetType) ? ownGetType.call(klass) : undefined;
  let ownNodeConfig;
  let ownNodeType = nodeType;
  if (nodeConfigRecord) {
    if (nodeType) {
      ownNodeConfig = nodeConfigRecord[nodeType];
    } else {
      // No static getType(): derive the type and config from the $config
      // record. The common case is a concrete node keyed by its string `type`.
      for (const [k, v] of Object.entries(nodeConfigRecord)) {
        ownNodeType = k;
        ownNodeConfig = v;
      }
      // Fall back to a well-known symbol key (e.g. Symbol.for('ElementNode'))
      // for an abstract base class that has no concrete node type, using the
      // first symbol whose value is a config record.
      if (!ownNodeConfig) {
        for (const symbolKey of Object.getOwnPropertySymbols(nodeConfigRecord)) {
          const symbolConfig = nodeConfigRecord[symbolKey];
          if (symbolConfig) {
            ownNodeConfig = symbolConfig;
            break;
          }
        }
      }
    }
  }
  if (!isAbstract && ownNodeType) {
    if (!hasOwnStaticMethod(klass, 'getType')) {
      // Guard against subclass inheritance: a subclass that does not define its
      // own static getType() (nor its own $config()-derived type yet) would
      // otherwise *inherit* this synthesized closure via the prototype chain and
      // return the superclass's hardcoded `ownNodeType`. When that happens the
      // subclass registers under the superclass's type, colliding with it
      // (e.g. `CodeHighlightNode`/`HashtagNode` resolving to type 'text' and
      // clashing with `TextNode`). Only return the captured type when invoked on
      // the exact class it was synthesized for; otherwise defer to the base
      // LexicalNode.getType(), which resolves the correct type for `this`.
      const synthesizedForKlass = klass;
      const synthesizedGetType = function () {
        if (this !== synthesizedForKlass) {
          return LexicalNode.getType.call(this);
        }
        return ownNodeType;
      };
      // Brand the closure so getStaticNodeConfig can recognize it and avoid
      // calling it to derive the node type (which would recurse). See the note
      // at the `ownGetType` computation above.
      synthesizedGetType[SYNTHESIZED_GET_TYPE] = true;
      klass.getType = synthesizedGetType;
    }
    if (!hasOwnStaticMethod(klass, 'clone')) {
      // TextNode.length > 0 will only be true if the compiler output
      // is not ES6 compliant, in which case we can not provide this
      // warning. We also can't reliably provide this warning if the output
      // has been optimized.
      if (IS_UNOPTIMIZED_DEV_BUILD) {
        if (!(klass.length === 0)) {
          formatDevErrorMessage(`${klass.name} (type ${ownNodeType}) must implement a static clone method since its constructor has ${String(klass.length)} required arguments (expecting 0). Use an explicit default in the first argument of your constructor(prop: T=X, nodeKey?: NodeKey).`);
        }
      }
      klass.clone = (prevNode, internalSkipAfterCloneFrom) => {
        setPendingNodeToClone(prevNode);
        const node = new klass();
        // The internal clone wrappers ($cloneWithProperties / $copyNode) pass
        // the module-private INTERNAL_SKIP_AFTER_CLONE_FROM sentinel because
        // they call afterCloneFrom themselves. When this synthesized clone is
        // instead called directly — e.g. `NodeClass.clone(node)`, an idiomatic
        // pre-$config() pattern — the sentinel is absent, so we call
        // afterCloneFrom here to preserve the documented clone() contract and
        // avoid silent property loss. afterCloneFrom is not guaranteed
        // idempotent, so this must run exactly once (see the sentinel
        // definition for the full rationale).
        if (internalSkipAfterCloneFrom !== INTERNAL_SKIP_AFTER_CLONE_FROM) {
          node.afterCloneFrom(prevNode);
        }
        return node;
      };
    }
    if (!hasOwnStaticMethod(klass, 'importJSON')) {
      if (IS_UNOPTIMIZED_DEV_BUILD) {
        if (!(klass.length === 0)) {
          formatDevErrorMessage(`${klass.name} (type ${ownNodeType}) must implement a static importJSON method since its constructor has ${String(klass.length)} required arguments (expecting 0). Use an explicit default in the first argument of your constructor(prop: T=X, nodeKey?: NodeKey).`);
        }
      }
      klass.importJSON = ownNodeConfig && ownNodeConfig.$importJSON || (serializedNode => new klass().updateFromJSON(serializedNode));
    }
    if (!hasOwnStaticMethod(klass, 'importDOM') && ownNodeConfig) {
      const {
        importDOM
      } = ownNodeConfig;
      if (importDOM) {
        klass.importDOM = () => importDOM;
      }
    }
  }
  const result = {
    klass,
    ownNodeConfig,
    ownNodeType
  };
  STATIC_NODE_CONFIG_CACHE.set(klass, result);
  return result;
}

/**
 * Collect all configuration for this class and its superclasses
 *
 * @internal
 */
function* iterStaticNodeConfigChain(klass) {
  for (let current = klass; current && (current === LexicalNode || $isLexicalNode(current.prototype));) {
    const config = getStaticNodeConfig(current);
    yield config;
    current = config.ownNodeConfig && config.ownNodeConfig.extends || getSuperclassOf(current);
  }
}

/**
 * Build a map from each registered node type to the set of registered node
 * types that are it or extend it (including the type itself). For every node
 * class in `nodes`, its prototype chain is walked and the class's own type is
 * added to the bucket of each registered ancestor type it inherits from.
 *
 * The result lets callers expand a base node type to all of its registered
 * subclass types up front, so a subclass instance can be matched by type
 * without a runtime `instanceof`.
 *
 * @experimental
 */
function getRegisteredSubtypeMap(nodes) {
  const subtypes = new Map();
  const klassByType = new Map();
  for (const klass of nodes) {
    const {
      ownNodeType
    } = getStaticNodeConfig(klass);
    if (ownNodeType) {
      klassByType.set(ownNodeType, klass);
      subtypes.set(ownNodeType, new Set());
    }
  }
  for (const [type, klass] of klassByType) {
    for (const {
      ownNodeType
    } of iterStaticNodeConfigChain(klass)) {
      const bucket = ownNodeType && subtypes.get(ownNodeType);
      if (bucket) {
        bucket.add(type);
      }
    }
  }
  return subtypes;
}

/**
 * Create an node from its class.
 *
 * Note that this will directly construct the final `withKlass` node type,
 * and will ignore the deprecated `with` functions. This allows `$create` to
 * skip any intermediate steps where the replaced node would be created and
 * then immediately discarded (once per configured replacement of that node).
 *
 * This does not support any arguments to the constructor.
 * Setters can be used to initialize your node, and they can
 * be chained. You can of course write your own mutliple-argument functions
 * to wrap that.
 *
 * @example
 * ```ts
 * function $createTokenText(text: string): TextNode {
 *   return $create(TextNode).setTextContent(text).setMode('token');
 * }
 * ```
 */
function $create(klass) {
  const editor = $getEditor();
  errorOnReadOnly();
  const registeredNode = editor.resolveRegisteredNodeAfterReplacements(editor.getRegisteredNode(klass));
  return new registeredNode.klass();
}

/**
 * Starts with a node and moves up the tree (toward the root node) to find a matching node based on
 * the search parameters of the findFn. (Consider JavaScripts' .find() function where a testing function must be
 * passed as an argument. eg. if( (node) => node.__type === 'div') ) return true; otherwise return false
 * @param startingNode - The node where the search starts.
 * @param findFn - A testing function that returns true if the current node satisfies the testing parameters.
 * @returns `startingNode` or one of its ancestors that matches the `findFn` predicate and is not the `RootNode`, or `null` if no match was found.
 */
const $findMatchingParent = (startingNode, findFn) => {
  let curr = startingNode;
  while (curr != null && !$isRootNode(curr)) {
    if (findFn(curr)) {
      return curr;
    }
    curr = curr.getParent();
  }
  return null;
};
function $createChildrenArray(element, nodeMap) {
  const children = [];
  let nodeKey = element.__first;
  while (nodeKey !== null) {
    const node = nodeMap === null ? $getNodeByKey(nodeKey) : nodeMap.get(nodeKey);
    if (node === null || node === undefined) {
      {
        formatDevErrorMessage(`$createChildrenArray: node does not exist in nodeMap`);
      }
    }
    children.push(nodeKey);
    nodeKey = node.__next;
  }
  return children;
}

/**
 * Look up the superclass of this class, prefer
 * {@link iterStaticNodeConfigChain} when implementing loops.
 *
 * @internal
 */
function getSuperclassOf(klass) {
  const viaStatic = Object.getPrototypeOf(klass);
  if (typeof viaStatic === 'function' && viaStatic !== Function.prototype) {
    return viaStatic; // healthy static chain
  }
  // static link severed by the loose transform — use the instance chain
  const parentProto = klass.prototype && Object.getPrototypeOf(klass.prototype);
  return parentProto ? parentProto.constructor : null;
}

/**
 * Shared empty slot map. Reads coalesce here when a host's `__slots` is null
 * (lazy allocation), so non-slot trees don't pay a per-node allocation cost.
 *
 * @internal
 */
const EMPTY_SLOTS = new Map();

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
function $isSlotHost(node) {
  return $isElementNode(node) || $isDecoratorNode(node);
}

/**
 * Shape predicate: true when `node` carries the child's `__slotHost` field —
 * i.e. it is an {@link ElementNode} or a {@link DecoratorNode}. Narrows to
 * {@link SlotChildNode}. This is a type guard only; {@link $setSlot} rejects
 * inline values at runtime. The slot link acts as a virtual shadow root, so
 * any non-inline block — shadow root or not — can occupy a slot.
 *
 * @experimental
 */
function $isSlotChild(node) {
  return $isElementNode(node) || $isDecoratorNode(node);
}

/**
 * Returns the key of the host this node is slotted into, or null when the node
 * is not slotted. Accepts any node and narrows internally so generic callers
 * (removal guard, up-walk, GC, caret) don't have to. Exposes a raw key, so it
 * stays internal to the package; public callers use {@link $getSlotHost}.
 *
 * @internal
 */
function $getSlotHostKey(node) {
  const latest = node.getLatest();
  return $isSlotChild(latest) ? latest.__slotHost : null;
}

/**
 * Returns the host element when this node occupies one of its named slots,
 * or null if this node is not slotted. The up-link is kept separate from
 * {@link LexicalNode.getParent} so the slot boundary behaves like a shadow
 * root.
 *
 * @experimental
 */
function $getSlotHost(node) {
  const slotHostKey = $getSlotHostKey(node);
  if (slotHostKey === null) {
    return null;
  }
  const host = $getNodeByKey(slotHostKey);
  if (!($isElementNode(host) || $isDecoratorNode(host))) {
    formatDevErrorMessage(`slotHost must be an ElementNode or a DecoratorNode`);
  }
  return host;
}

/**
 * Returns the slot name this node occupies on its host, or null when the node
 * is not a slot value. Mirrors {@link LexicalNode#getIndexWithinParent} for
 * slot children — answers "which named slot does this node sit in?".
 *
 * @experimental
 */
function $getSlotNameWithinHost(slotChild) {
  const host = $getSlotHost(slotChild);
  if (host === null) {
    return null;
  }
  const childKey = slotChild.getLatest().__key;
  for (const [name, key] of $getSlotMap(host)) {
    if (key === childKey) {
      return name;
    }
  }
  return null;
}

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
function $getSlotFrame(node) {
  let current = node.getLatest();
  while (current !== null) {
    if ($getSlotHostKey(current) !== null) {
      return current;
    }
    current = current.getParent();
  }
  return null;
}

/**
 * Returns the latest slot map (name -> child key, insertion order). Exposes raw
 * keys, so it stays internal to the package; public callers use
 * {@link $getSlotNames} / {@link $getSlot}.
 *
 * @internal
 */
function $getSlotMap(node) {
  const latest = node.getLatest();
  return $isSlotHost(latest) && latest.__slots !== null ? latest.__slots : EMPTY_SLOTS;
}

/**
 * Returns the names of this node's occupied slots, in insertion order. Empty
 * when the node hosts no slots.
 *
 * @experimental
 */
function $getSlotNames(node) {
  return Array.from($getSlotMap(node).keys());
}

// The slot names a host's class declares in `$config().slots`, as a literal
// union (only the node's own declaration is read, so a subclass that inherits
// slots without redeclaring resolves to `never`). Relies on the `const` type
// parameter on `LexicalNode.config` to preserve the declared array as a tuple.

/**
 * Slot-name hint for a host node's slot accessors: the names declared in the
 * host class's `$config().slots` (for editor autocomplete) unioned with `string`
 * — every string is still accepted (slots take undeclared names at runtime), the
 * declared names just surface as suggestions. A class declaring no slots, or a
 * subclass that inherits them without redeclaring, resolves to plain `string`.
 *
 * @experimental
 */

/**
 * Returns the node occupying the named slot, or null if the slot is empty.
 * Slots are a shadow-root-isolated channel kept separate from children; see
 * {@link $getSlotHost} for the reverse up-link.
 *
 * @experimental
 */
function $getSlot(node, name) {
  const key = $getSlotMap(node).get(name);
  return key === undefined ? null : $getNodeByKey(key);
}
const RESERVED_SLOT_NAMES = ['__proto__', 'constructor', 'prototype'];

// Copy-on-write owner mark for slot maps, mirroring NodeState's scheme (its
// state object carries a backpointer to the owning node version; getWritable
// returns itself only for that version). afterCloneFrom shares the map
// reference across versions, so a host that is cloned without a slot change
// pays no per-version Map copy; the mutators below clone exactly once per
// writable version, the first time that version writes. The owner rides on a
// symbol property rather than a side table: it is stamped exactly once, on a
// freshly constructed map (copy-on-write means a shared or committed map is
// never written to, only replaced), and a plain `new Map(slots)` clone is
// born unowned because expandos don't copy.
const SLOT_MAP_OWNER = Symbol('slotMapOwner');
// @experimental named-slots. Returns a slot map that `writableHost` (the
// current writable version, from getWritable()) is allowed to mutate,
// cloning the shared map on the version's first write.
function $getWritableSlots(writableHost) {
  let slots = writableHost.__slots;
  if (slots === null || slots[SLOT_MAP_OWNER] !== writableHost) {
    // new Map(null) is the empty map, so first allocation and clone share it
    slots = new Map(slots);
    slots[SLOT_MAP_OWNER] = writableHost;
    writableHost.__slots = slots;
  }
  return slots;
}
const slotRankCache = new WeakMap();
const EMPTY_DECLARED_SLOTS = [];

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
function getDeclaredSlots(klass) {
  // Walk the class hierarchy without a runtime LexicalNode import (a
  // module-initialization cycle): past the base class the chain reaches
  // Function.prototype, whose own `prototype` is undefined, ending the loop.
  for (const {
    ownNodeConfig
  } of iterStaticNodeConfigChain(klass)) {
    const declared = ownNodeConfig && ownNodeConfig.slots;
    if (declared) {
      return declared;
    }
  }
  return EMPTY_DECLARED_SLOTS;
}

/**
 * @internal
 *
 * Concatenated text of a node's named slots, read slots-first (in slot Map
 * order). Shared by the getTextContent implementations so ElementNode and
 * DecoratorNode hosts fold their slot text the same way; a node with no
 * slots returns the empty string. A free function (not a LexicalNode method)
 * so the framework-owned name cannot collide with a subclass's own members.
 */
function $getSlotsTextContent(node) {
  let textContent = '';
  for (const name of $getSlotNames(node)) {
    const slot = $getSlot(node, name);
    if (slot !== null) {
      textContent += slot.getTextContent();
    }
  }
  return textContent;
}

/**
 * @internal
 *
 * Size counterpart to {@link $getSlotsTextContent}, summing each slot's
 * getTextContentSize (which a slot subtree may override independently of its
 * text length) slots-first.
 */
function $getSlotsTextContentSize(node) {
  let textContentSize = 0;
  for (const name of $getSlotNames(node)) {
    const slot = $getSlot(node, name);
    if (slot !== null) {
      textContentSize += slot.getTextContentSize();
    }
  }
  return textContentSize;
}

// @experimental named-slots. Declared name -> declaration index, cached per
// class. Validates the declaration once: duplicates would make the order
// ambiguous and reserved names can never be set.
function getDeclaredSlotRank(klass) {
  let rank = slotRankCache.get(klass);
  if (rank === undefined) {
    const declared = getDeclaredSlots(klass);
    const built = new Map();
    for (const name of declared) {
      if (!!RESERVED_SLOT_NAMES.includes(name)) {
        formatDevErrorMessage(`getDeclaredSlotRank: ${klass.name} declares reserved slot name "${name}"; __proto__, constructor, and prototype break the plain-object serialization of slots`);
      }
      if (!!built.has(name)) {
        formatDevErrorMessage(`getDeclaredSlotRank: ${klass.name} declares slot name "${name}" more than once; the canonical order would be ambiguous`);
      }
      built.set(name, built.size);
    }
    rank = built;
    slotRankCache.set(klass, rank);
  }
  return rank;
}

// @experimental named-slots. Canonical comparison: declared names first (in
// declaration order), then undeclared names in code-unit order — a pure
// function of (class, name) so every client orders identically.
function compareSlotNames(a, b, rank) {
  const rankA = rank.get(a);
  const rankB = rank.get(b);
  if (rankA !== undefined) {
    return rankB !== undefined ? rankA - rankB : -1;
  }
  if (rankB !== undefined) {
    return 1;
  }
  return a < b ? -1 : a > b ? 1 : 0;
}

// @experimental named-slots. Restores canonical order on a writable host's
// slot map after an insertion. Order is derived, never stored: every
// ingestion path (local $setSlot, JSON import, clipboard, collab sync)
// funnels through $setSlot, so documents re-canonicalize on load and
// concurrent collaborative additions converge without any order metadata in
// the document. The already-sorted check keeps the common case allocation
// free; slot maps are tiny, so the rebuild is O(n log n) over a handful of
// names.
function $canonicalizeSlotOrder(host) {
  const slots = host.__slots;
  if (slots === null || slots.size < 2) {
    return;
  }
  const rank = getDeclaredSlotRank(host.constructor);
  let previous = null;
  let sorted = true;
  for (const name of slots.keys()) {
    if (previous !== null && compareSlotNames(previous, name, rank) > 0) {
      sorted = false;
      break;
    }
    previous = name;
  }
  if (sorted) {
    return;
  }
  const entries = Array.from(slots).sort(([a], [b]) => compareSlotNames(a, b, rank));
  slots.clear();
  for (const [name, key] of entries) {
    slots.set(name, key);
  }
}

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
function $setSlot(host, name, node) {
  if (!(name !== '__proto__' && name !== 'constructor' && name !== 'prototype')) {
    formatDevErrorMessage(`$setSlot: "${name}" is a reserved slot name; __proto__, constructor, and prototype break the plain-object serialization of slots`);
  } // Re-setting the value a name already holds is a no-op rather than a trip
  // over the "already slotted" invariant below, so idempotent callers (sync
  // layers, import rules) don't have to special-case it.
  const latestHost = host.getLatest();
  if (latestHost.__slots !== null && latestHost.__slots.get(name) === node.getLatest().__key) {
    return latestHost;
  }
  if (!(($isElementNode(node) || $isDecoratorNode(node)) && !node.isInline())) {
    formatDevErrorMessage(`$setSlot: node ${node.__key} is not a valid slot value; a slot value must be a non-inline ElementNode or DecoratorNode (the slot link itself is the shadow boundary).`);
  } // The ancestor/self check is the slot analog of appending a node into its
  // own descendant through the children channel: a programmer error that
  // forms an up-chain cycle and hangs isAttached/GC at commit. The children
  // channel has no production guard for its equivalent (collab/JSON can't
  // express the cycle — slot values are always freshly materialized, never
  // aliased to an existing ancestor — so only a direct local call can reach
  // it), so this guard matches: the O(depth) up-walk runs in __DEV__ only,
  // and production behaves like the unguarded children channel.
  {
    if (!!$isSlotAncestorOrSelf(node, host)) {
      formatDevErrorMessage(`$setSlot: node ${node.__key} cannot be slotted into ${host.__key}; a node may not host itself or an ancestor reached through children or slot up-links — the slot up-link would form a cycle that loops isAttached/GC.`);
    }
  }
  const writableSelf = host.getWritable();
  const slots = $getWritableSlots(writableSelf);
  const previousKey = slots.get(name);
  if (previousKey !== undefined) {
    $detachSlottedNode(previousKey);
  }
  const writableNode = node.getWritable();
  // Move semantics: a value slotted elsewhere (or under another name on this
  // same host) is unlinked from its current host's map without destroying the
  // moving subtree — the up-link is rewritten below. The cycle guard above
  // already rejected any placement that would loop the up-chain.
  const previousHost = $getSlotHost(writableNode);
  if (previousHost !== null) {
    const previousName = $getSlotNameWithinHost(writableNode);
    if (previousName !== null) {
      $getWritableSlots(previousHost.getWritable()).delete(previousName);
    }
    writableNode.__slotHost = null;
  }
  // $removeFromParent (not node.remove()) so the host survives even when it
  // would otherwise cascade on becoming empty (e.g. a third-party host with
  // canBeEmpty()=false whose single shadow-root child is being slotted in).
  // Mirrors the patterns in ElementNode.append / replace / insertBefore.
  $removeFromParent(writableNode);
  writableNode.__slotHost = writableSelf.__key;
  slots.set(name, writableNode.__key);
  $canonicalizeSlotOrder(writableSelf);
  $setSlotsUsed();
  return writableSelf;
}
function $setSlotsUsed() {
  const editor = $getEditor();
  editor._slotsUsed = true;
  if (editor._pendingEditorState) {
    editor._pendingEditorState._slotsUsed = true;
  }
}

/**
 * Removes the named slot from `host`, detaching its value (its slot up-link is
 * cleared). No-op if the slot is empty. `host` is constrained to
 * {@link SlotHostNode} so a non-host is rejected at compile time.
 *
 * @experimental
 */
function $removeSlot(host, name) {
  const writableSelf = host.getWritable();
  if (writableSelf.__slots === null) {
    return writableSelf;
  }
  const previousKey = writableSelf.__slots.get(name);
  if (previousKey !== undefined) {
    $detachSlottedNode(previousKey);
    $getWritableSlots(writableSelf).delete(name);
  }
  return writableSelf;
}

// @experimental named-slots. True when `node` is `host` itself or any ancestor
// of `host` reachable by walking up the combined parent/slot up-link chain (the
// same traversal isAttached uses). isParentOf only follows __parent, so it can't
// see a host that sits above `node` through slot up-links; slotting `node` there
// would close a cycle that loops isAttached/GC.
function $isSlotAncestorOrSelf(node, host) {
  let key = host.__key;
  while (key !== null) {
    if (key === node.__key) {
      return true;
    }
    const current = $getNodeByKey(key);
    if (current === null) {
      break;
    }
    key = current.__parent !== null ? current.__parent : $getSlotHostKey(current);
  }
  return false;
}

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
function $errorOnSlotCycleChild(parent, child) {
  if (!$getEditor()._slotsUsed) {
    return;
  }
  if (!!$isSlotAncestorOrSelf(child, parent)) {
    formatDevErrorMessage(`insert: node ${child.__key} cannot become a child of ${parent.__key}; the parent is reachable from the node through slot up-links, so the insertion would form a cycle that loops isAttached/GC.`);
  }
}

// @experimental named-slots. Detaches the node currently slotted under a key,
// clearing its slot up-link before remove() so it isn't reprocessed as a
// still-slotted node. Shared by $setSlot (replacing an occupant) and
// $removeSlot.
function $detachSlottedNode(slotKey) {
  const previous = $getNodeByKey(slotKey);
  if (previous === null) {
    return;
  }
  const writablePrevious = previous.getWritable();
  if (!$isSlotChild(writablePrevious)) {
    formatDevErrorMessage(`detach: slotted node ${slotKey} must be an ElementNode or a DecoratorNode`);
  }
  writablePrevious.__slotHost = null;
  writablePrevious.remove();
}

/**
 * The direction of a caret, 'next' points towards the end of the document
 * and 'previous' points towards the beginning
 */

/**
 * A type utility to flip next and previous
 */

/**
 * A sibling caret type points from a LexicalNode origin to its next or previous sibling,
 * and a child caret type points from an ElementNode origin to its first or last child.
 */

/**
 * The RootMode is specified in all caret traversals where the traversal can go up
 * towards the root. 'root' means that it will stop at the document root,
 * and 'shadowRoot' will stop at the document root or any shadow root
 * (per {@link $isRootOrShadowRoot}).
 */

const FLIP_DIRECTION = {
  next: 'previous',
  previous: 'next'
};

/** @noInheritDoc */

/**
 * A RangeSelection expressed as a pair of Carets
 */

/**
 * A NodeCaret is the combination of an origin node and a direction
 * that points towards where a connected node will be fetched, inserted,
 * or replaced. A SiblingCaret points from a node to its next or previous
 * sibling, and a ChildCaret points to its first or last child
 * (using next or previous as direction, for symmetry with SiblingCaret).
 *
 * The differences between NodeCaret and PointType are:
 * - NodeCaret can only be used to refer to an entire node (PointCaret is used when a full analog is needed). A PointType of text type can be used to refer to a specific location inside of a TextNode.
 * - NodeCaret stores an origin node, type (sibling or child), and direction (next or previous). A PointType stores a type (text or element), the key of a node, and a text or child offset within that node.
 * - NodeCaret is directional and always refers to a very specific node, eliminating all ambiguity. PointType can refer to the location before or at a node depending on context.
 * - NodeCaret is more robust to nearby mutations, as it relies only on a node's direct connections. An element Any change to the count of previous siblings in an element PointType will invalidate it.
 * - NodeCaret is designed to work more directly with the internal representation of the document tree, making it suitable for use in traversals without performing any redundant work.
 *
 * The caret does *not* update in response to any mutations, you should
 * not persist it across editor updates, and using a caret after its origin
 * node has been removed or replaced may result in runtime errors.
 */

/**
 * A PointCaret is a NodeCaret that also includes a
 * TextPointCaret type which refers to a specific offset of a TextNode.
 * This type is separate because it is not relevant to general node traversal
 * so it doesn't make sense to have it show up except when defining
 * a CaretRange and in those cases there will be at most two of them only
 * at the boundaries.
 *
 * The addition of TextPointCaret allows this type to represent any location
 * that is representable by PointType, as the TextPointCaret refers to a
 * specific offset within a TextNode.
 */

/**
 * A SiblingCaret points from an origin LexicalNode towards its next or previous sibling.
 */

/**
 * A ChildCaret points from an origin ElementNode towards its first or last child.
 */

/**
 * A TextPointCaret is a special case of a SiblingCaret that also carries
 * an offset used for representing partially selected TextNode at the edges
 * of a CaretRange.
 *
 * The direction determines which part of the text is adjacent to the caret,
 * if next it's all of the text after offset. If previous, it's all of the
 * text before offset.
 *
 * While this can be used in place of any SiblingCaret of a TextNode,
 * the offset into the text will be ignored except in contexts that
 * specifically use the TextPointCaret or PointCaret types.
 */

/**
 * A TextPointCaretSlice is a wrapper for a TextPointCaret that carries a signed
 * distance representing the direction and amount of text selected from the given
 * caret. A negative distance means that text before offset is selected, a
 * positive distance means that text after offset is selected. The offset+distance
 * pair is not affected in any way by the direction of the caret.
 */

/**
 * A utility type to specify that a CaretRange may have zero,
 * one, or two associated TextPointCaretSlice. If the anchor
 * and focus are on the same node, the anchorSlice will contain
 * the slice and focusSlie will be null.
 */

class AbstractCaret {
  origin;
  constructor(origin) {
    this.origin = origin;
  }
  [Symbol.iterator]() {
    return makeStepwiseIterator({
      hasNext: $isSiblingCaret,
      initial: this.getAdjacentCaret(),
      map: caret => caret,
      step: caret => caret.getAdjacentCaret()
    });
  }
  getAdjacentCaret() {
    return $getSiblingCaret(this.getNodeAtCaret(), this.direction);
  }
  getSiblingCaret() {
    return $getSiblingCaret(this.origin, this.direction);
  }
  remove() {
    const node = this.getNodeAtCaret();
    if (node) {
      node.remove();
    }
    return this;
  }
  replaceOrInsert(node, includeChildren) {
    const target = this.getNodeAtCaret();
    if (node.is(this.origin) || node.is(target)) ; else if (target === null) {
      this.insert(node);
    } else {
      target.replace(node, includeChildren);
    }
    return this;
  }
  splice(deleteCount, nodes, nodesDirection = 'next') {
    const nodeIter = nodesDirection === this.direction ? nodes : Array.from(nodes).reverse();
    let caret = this;
    const parent = this.getParentAtCaret();
    const nodesToRemove = new Map();
    // Find all of the nodes we expect to remove first, so
    // we don't have to worry about the cases where there is
    // overlap between the nodes to insert and the nodes to
    // remove
    for (let removeCaret = caret.getAdjacentCaret(); removeCaret !== null && nodesToRemove.size < deleteCount; removeCaret = removeCaret.getAdjacentCaret()) {
      const writableNode = removeCaret.origin.getWritable();
      nodesToRemove.set(writableNode.getKey(), writableNode);
    }
    // TODO: Optimize this to work directly with node internals
    for (const node of nodeIter) {
      if (nodesToRemove.size > 0) {
        // For some reason `pnpm run tsc-extension` needs this annotation?
        const target = caret.getNodeAtCaret();
        if (target) {
          nodesToRemove.delete(target.getKey());
          nodesToRemove.delete(node.getKey());
          if (target.is(node) || caret.origin.is(node)) ; else {
            const nodeParent = node.getParent();
            if (nodeParent && nodeParent.is(parent)) {
              // It's a sibling somewhere else in this node, so unparent it first
              node.remove();
            }
            target.replace(node);
          }
        } else {
          if (!(target !== null)) {
            formatDevErrorMessage(`NodeCaret.splice: Underflow of expected nodesToRemove during splice (keys: ${Array.from(nodesToRemove).join(' ')})`);
          }
        }
      } else {
        caret.insert(node);
      }
      caret = $getSiblingCaret(node, this.direction);
    }
    for (const node of nodesToRemove.values()) {
      node.remove();
    }
    return this;
  }
}
class AbstractChildCaret extends AbstractCaret {
  type = 'child';
  getLatest() {
    const origin = this.origin.getLatest();
    return origin === this.origin ? this : $getChildCaret(origin, this.direction);
  }
  /**
   * Get the SiblingCaret from this origin in the same direction.
   *
   * @param mode 'root' to return null at the root, 'shadowRoot' to return null at the root or any shadow root
   * @returns A SiblingCaret with this origin, or null if origin is a root according to mode.
   */
  getParentCaret(mode = 'root') {
    return $getSiblingCaret($filterByMode(this.getParentAtCaret(), mode), this.direction);
  }
  getFlipped() {
    const dir = flipDirection(this.direction);
    return $getSiblingCaret(this.getNodeAtCaret(), dir) || $getChildCaret(this.origin, dir);
  }
  getParentAtCaret() {
    return this.origin;
  }
  getChildCaret() {
    return this;
  }
  isSameNodeCaret(other) {
    return other instanceof AbstractChildCaret && this.direction === other.direction && this.origin.is(other.origin);
  }
  isSamePointCaret(other) {
    return this.isSameNodeCaret(other);
  }
}
class ChildCaretFirst extends AbstractChildCaret {
  direction = 'next';
  getNodeAtCaret() {
    return this.origin.getFirstChild();
  }
  insert(node) {
    this.origin.splice(0, 0, [node]);
    return this;
  }
}
class ChildCaretLast extends AbstractChildCaret {
  direction = 'previous';
  getNodeAtCaret() {
    return this.origin.getLastChild();
  }
  insert(node) {
    this.origin.splice(this.origin.getChildrenSize(), 0, [node]);
    return this;
  }
}
const MODE_PREDICATE = {
  root: $isRootNode,
  shadowRoot: $isRootOrShadowRoot
};

/**
 * Flip a direction ('next' -> 'previous'; 'previous' -> 'next').
 *
 * Note that TypeScript can't prove that FlipDirection is its own
 * inverse (but if you have a concrete 'next' or 'previous' it will
 * simplify accordingly).
 *
 * @param direction A direction
 * @returns The opposite direction
 */
function flipDirection(direction) {
  return FLIP_DIRECTION[direction];
}
function $filterByMode(node, mode = 'root') {
  if (node === null || MODE_PREDICATE[mode](node)) {
    return null;
  }
  // A slotted node's up-link is __slotHost, not __parent, so getParent() (and
  // thus getParentOrThrow()) returns null on it. It is a hard upward boundary
  // in every mode — like the root — so caret walks must stop at it instead of
  // trying to rewind past a parentless node.
  return $getSlotHostKey(node) === null ? node : null;
}
class AbstractSiblingCaret extends AbstractCaret {
  type = 'sibling';
  getLatest() {
    const origin = this.origin.getLatest();
    return origin === this.origin ? this : $getSiblingCaret(origin, this.direction);
  }
  getSiblingCaret() {
    return this;
  }
  getParentAtCaret() {
    return this.origin.getParent();
  }
  getChildCaret() {
    return $isElementNode(this.origin) ? $getChildCaret(this.origin, this.direction) : null;
  }
  getParentCaret(mode = 'root') {
    return $getSiblingCaret($filterByMode(this.getParentAtCaret(), mode), this.direction);
  }
  getFlipped() {
    const dir = flipDirection(this.direction);
    return $getSiblingCaret(this.getNodeAtCaret(), dir) || $getChildCaret(this.origin.getParentOrThrow(), dir);
  }
  isSamePointCaret(other) {
    return other instanceof AbstractSiblingCaret && this.direction === other.direction && this.origin.is(other.origin);
  }
  isSameNodeCaret(other) {
    return (other instanceof AbstractSiblingCaret || other instanceof AbstractTextPointCaret) && this.direction === other.direction && this.origin.is(other.origin);
  }
}
class AbstractTextPointCaret extends AbstractCaret {
  type = 'text';
  offset;
  constructor(origin, offset) {
    super(origin);
    this.offset = offset;
  }
  getLatest() {
    const origin = this.origin.getLatest();
    return origin === this.origin ? this : $getTextPointCaret(origin, this.direction, this.offset);
  }
  getParentAtCaret() {
    return this.origin.getParent();
  }
  getChildCaret() {
    return null;
  }
  getParentCaret(mode = 'root') {
    return $getSiblingCaret($filterByMode(this.getParentAtCaret(), mode), this.direction);
  }
  getFlipped() {
    return $getTextPointCaret(this.origin, flipDirection(this.direction), this.offset);
  }
  isSamePointCaret(other) {
    return other instanceof AbstractTextPointCaret && this.direction === other.direction && this.origin.is(other.origin) && this.offset === other.offset;
  }
  isSameNodeCaret(other) {
    return (other instanceof AbstractSiblingCaret || other instanceof AbstractTextPointCaret) && this.direction === other.direction && this.origin.is(other.origin);
  }
  getSiblingCaret() {
    return $getSiblingCaret(this.origin, this.direction);
  }
}
/**
 * Guard to check if the given caret is specifically a TextPointCaret
 *
 * @param caret Any caret
 * @returns true if it is a TextPointCaret
 */
function $isTextPointCaret(caret) {
  return caret instanceof AbstractTextPointCaret;
}

/**
 * Guard to check if the given argument is any type of caret
 *
 * @param caret
 * @returns true if caret is any type of caret
 */
function $isNodeCaret(caret) {
  return caret instanceof AbstractCaret;
}

/**
 * Guard to check if the given argument is specifically a SiblingCaret (or TextPointCaret)
 *
 * @param caret
 * @returns true if caret is a SiblingCaret
 */
function $isSiblingCaret(caret) {
  return caret instanceof AbstractSiblingCaret;
}

/**
 * Guard to check if the given argument is specifically a ChildCaret

 * @param caret 
 * @returns true if caret is a ChildCaret
 */
function $isChildCaret(caret) {
  return caret instanceof AbstractChildCaret;
}
class SiblingCaretNext extends AbstractSiblingCaret {
  direction = 'next';
  getNodeAtCaret() {
    return this.origin.getNextSibling();
  }
  insert(node) {
    this.origin.insertAfter(node);
    return this;
  }
}
class SiblingCaretPrevious extends AbstractSiblingCaret {
  direction = 'previous';
  getNodeAtCaret() {
    return this.origin.getPreviousSibling();
  }
  insert(node) {
    this.origin.insertBefore(node);
    return this;
  }
}
class TextPointCaretNext extends AbstractTextPointCaret {
  direction = 'next';
  getNodeAtCaret() {
    return this.origin.getNextSibling();
  }
  insert(node) {
    this.origin.insertAfter(node);
    return this;
  }
}
class TextPointCaretPrevious extends AbstractTextPointCaret {
  direction = 'previous';
  getNodeAtCaret() {
    return this.origin.getPreviousSibling();
  }
  insert(node) {
    this.origin.insertBefore(node);
    return this;
  }
}
const TEXT_CTOR = {
  next: TextPointCaretNext,
  previous: TextPointCaretPrevious
};
const SIBLING_CTOR = {
  next: SiblingCaretNext,
  previous: SiblingCaretPrevious
};
const CHILD_CTOR = {
  next: ChildCaretFirst,
  previous: ChildCaretLast
};

/**
 * Get a caret that points at the next or previous sibling of the given origin node.
 *
 * @param origin The origin node
 * @param direction 'next' or 'previous'
 * @returns null if origin is null, otherwise a SiblingCaret for this origin and direction
 */

function $getSiblingCaret(origin, direction) {
  return origin ? new SIBLING_CTOR[direction](origin) : null;
}

/**
 * Construct a TextPointCaret
 *
 * @param origin The TextNode
 * @param direction The direction (next points to the end of the text, previous points to the beginning)
 * @param offset The offset into the text in absolute positive string coordinates (0 is the start)
 * @returns a TextPointCaret
 */

function $getTextPointCaret(origin, direction, offset) {
  return origin ? new TEXT_CTOR[direction](origin, $getTextNodeOffset(origin, offset)) : null;
}

/**
 * Get a normalized offset into a TextNode given a numeric offset or a
 * direction for which end of the string to use. Throws in dev if the offset
 * is not in the bounds of the text content size.
 *
 * @param origin a TextNode
 * @param offset An absolute offset into the TextNode string, or a direction for which end to use as the offset
 * @param mode If 'error' (the default) out of bounds offsets will be an error in dev. Otherwise it will clamp to a valid offset.
 * @returns An absolute offset into the TextNode string
 */
function $getTextNodeOffset(origin, offset, mode = 'error') {
  const size = origin.getTextContentSize();
  let numericOffset = offset === 'next' ? size : offset === 'previous' ? 0 : offset;
  if (numericOffset < 0 || numericOffset > size) {
    if (!(mode === 'clamp')) {
      formatDevErrorMessage(`$getTextNodeOffset: invalid offset ${String(offset)} for size ${String(size)} at key ${origin.getKey()}`);
    } // Clamp invalid offsets in prod
    numericOffset = numericOffset < 0 ? 0 : size;
  }
  return numericOffset;
}

/**
 * Construct a TextPointCaretSlice given a TextPointCaret and a signed distance. The
 * distance should be negative to slice text before the caret's offset, and positive
 * to slice text after the offset. The direction of the caret itself is not
 * relevant to the string coordinates when working with a TextPointCaretSlice
 * but mutation operations will preserve the direction.
 *
 * @param caret
 * @param distance
 * @returns TextPointCaretSlice
 */
function $getTextPointCaretSlice(caret, distance) {
  return new TextPointCaretSliceImpl(caret, distance);
}

/**
 * Get a caret that points at the first or last child of the given origin node,
 * which must be an ElementNode.
 *
 * @param origin The origin ElementNode
 * @param direction 'next' for first child or 'previous' for last child
 * @returns null if origin is null or not an ElementNode, otherwise a ChildCaret for this origin and direction
 */

function $getChildCaret(origin, direction) {
  return $isElementNode(origin) ? new CHILD_CTOR[direction](origin) : null;
}

/**
 * Gets the ChildCaret if one is possible at this caret origin, otherwise return the caret
 */
function $getChildCaretOrSelf(caret) {
  return caret && caret.getChildCaret() || caret;
}

/**
 * Gets the adjacent caret, if not-null and if the origin of the adjacent caret is an ElementNode, then return
 * the ChildCaret. This can be used along with the getParentAdjacentCaret method to perform a full DFS
 * style traversal of the tree.
 *
 * @param caret The caret to start at
 */
function $getAdjacentChildCaret(caret) {
  return caret && $getChildCaretOrSelf(caret.getAdjacentCaret());
}
class CaretRangeImpl {
  type = 'node-caret-range';
  direction;
  anchor;
  focus;
  constructor(anchor, focus, direction) {
    this.anchor = anchor;
    this.focus = focus;
    this.direction = direction;
  }
  getLatest() {
    const anchor = this.anchor.getLatest();
    const focus = this.focus.getLatest();
    return anchor === this.anchor && focus === this.focus ? this : new CaretRangeImpl(anchor, focus, this.direction);
  }
  isCollapsed() {
    return this.anchor.isSamePointCaret(this.focus);
  }
  getTextSlices() {
    const getSlice = k => {
      const caret = this[k].getLatest();
      return $isTextPointCaret(caret) ? $getSliceFromTextPointCaret(caret, k) : null;
    };
    const anchorSlice = getSlice('anchor');
    const focusSlice = getSlice('focus');
    if (anchorSlice && focusSlice) {
      const {
        caret: anchorCaret
      } = anchorSlice;
      const {
        caret: focusCaret
      } = focusSlice;
      if (anchorCaret.isSameNodeCaret(focusCaret)) {
        return [$getTextPointCaretSlice(anchorCaret, focusCaret.offset - anchorCaret.offset), null];
      }
    }
    return [anchorSlice, focusSlice];
  }
  iterNodeCarets(rootMode = 'root') {
    const anchor = $isTextPointCaret(this.anchor) ? this.anchor.getSiblingCaret() : this.anchor.getLatest();
    const focus = this.focus.getLatest();
    const isTextFocus = $isTextPointCaret(focus);
    const step = state => state.isSameNodeCaret(focus) ? null : $getAdjacentChildCaret(state) || state.getParentCaret(rootMode);
    return makeStepwiseIterator({
      hasNext: state => state !== null && !(isTextFocus && focus.isSameNodeCaret(state)),
      initial: anchor.isSameNodeCaret(focus) ? null : step(anchor),
      map: state => state,
      step
    });
  }
  [Symbol.iterator]() {
    return this.iterNodeCarets('root');
  }
}
class TextPointCaretSliceImpl {
  type = 'slice';
  caret;
  distance;
  constructor(caret, distance) {
    this.caret = caret;
    this.distance = distance;
  }
  getSliceIndices() {
    const {
      distance,
      caret: {
        offset
      }
    } = this;
    const offsetB = offset + distance;
    return offsetB < offset ? [offsetB, offset] : [offset, offsetB];
  }
  getTextContent() {
    const [startIndex, endIndex] = this.getSliceIndices();
    return this.caret.origin.getTextContent().slice(startIndex, endIndex);
  }
  getTextContentSize() {
    return Math.abs(this.distance);
  }
  removeTextSlice() {
    const {
      caret: {
        origin,
        direction
      }
    } = this;
    const [indexStart, indexEnd] = this.getSliceIndices();
    const text = origin.getTextContent();
    return $getTextPointCaret(origin.setTextContent(text.slice(0, indexStart) + text.slice(indexEnd)), direction, indexStart);
  }
}
function $getSliceFromTextPointCaret(caret, anchorOrFocus) {
  const {
    direction,
    origin
  } = caret;
  const offsetB = $getTextNodeOffset(origin, anchorOrFocus === 'focus' ? flipDirection(direction) : direction);
  return $getTextPointCaretSlice(caret, offsetB - caret.offset);
}

/**
 * Guard to check for a TextPointCaretSlice
 *
 * @param caretOrSlice A caret or slice
 * @returns true if caretOrSlice is a TextPointCaretSlice
 */
function $isTextPointCaretSlice(caretOrSlice) {
  return caretOrSlice instanceof TextPointCaretSliceImpl;
}

/**
 * Construct a CaretRange that starts at anchor and goes to the end of the
 * document in the anchor caret's direction.
 */
function $extendCaretToRange(anchor) {
  return $getCaretRange(anchor, $getSiblingCaret($getRoot(), anchor.direction));
}

/**
 * Construct a collapsed CaretRange that starts and ends at anchor.
 */
function $getCollapsedCaretRange(anchor) {
  return $getCaretRange(anchor, anchor);
}

/**
 * Construct a CaretRange from anchor and focus carets pointing in the
 * same direction. In order to get the expected behavior,
 * the anchor must point towards the focus or be the same point.
 *
 * In the 'next' direction the anchor should be at or before the
 * focus in the document. In the 'previous' direction the anchor
 * should be at or after the focus in the document
 * (similar to a backwards RangeSelection).
 *
 * @param anchor
 * @param focus
 * @returns a CaretRange
 */
function $getCaretRange(anchor, focus) {
  if (!(anchor.direction === focus.direction)) {
    formatDevErrorMessage(`$getCaretRange: anchor and focus must be in the same direction`);
  }
  return new CaretRangeImpl(anchor, focus, anchor.direction);
}

/**
 * A generalized utility for creating a stepwise iterator
 * based on:
 *
 * - an initial state
 * - a stop guard that returns true if the iteration is over, this
 *   is typically used to detect a sentinel value such as null or
 *   undefined from the state but may return true for other conditions
 *   as well
 * - a step function that advances the state (this will be called
 *   after map each time next() is called to prepare the next state)
 * - a map function that will be called that may transform the state
 *   before returning it. It will only be called once for each next()
 *   call when stop(state) === false
 *
 * @param config
 * @returns An IterableIterator
 */
function makeStepwiseIterator(config) {
  const {
    initial,
    hasNext,
    step,
    map
  } = config;
  let state = initial;
  return {
    [Symbol.iterator]() {
      return this;
    },
    next() {
      if (!hasNext(state)) {
        return {
          done: true,
          value: undefined
        };
      }
      const rval = {
        done: false,
        value: map(state)
      };
      state = step(state);
      return rval;
    }
  };
}
function compareNumber(a, b) {
  return Math.sign(a - b);
}

/**
 * A total ordering for `PointCaret<'next'>`, based on
 * the same order that a {@link CaretRange} would iterate
 * them.
 *
 * For a given origin node:
 * - ChildCaret comes before SiblingCaret
 * - TextPointCaret comes before SiblingCaret
 *
 * An exception is thrown when a and b do not have any
 * common ancestor.
 *
 * This ordering is a sort of mix of pre-order and post-order
 * because each ElementNode will show up as a ChildCaret
 * on 'enter' (pre-order) and a SiblingCaret on 'leave' (post-order).
 *
 * @param a
 * @param b
 * @returns -1 if a comes before b, 0 if a and b are the same, or 1 if a comes after b
 */
function $comparePointCaretNext(a, b) {
  const compare = $getCommonAncestor(a.origin, b.origin);
  if (!(compare !== null)) {
    formatDevErrorMessage(`$comparePointCaretNext: a (key ${a.origin.getKey()}) and b (key ${b.origin.getKey()}) do not have a common ancestor`);
  }
  switch (compare.type) {
    case 'same':
      {
        const aIsText = a.type === 'text';
        const bIsText = b.type === 'text';
        return aIsText && bIsText ? compareNumber(a.offset, b.offset) : a.type === b.type ? 0 : aIsText ? -1 : bIsText ? 1 : a.type === 'child' ? -1 : 1;
      }
    case 'ancestor':
      {
        return a.type === 'child' ? -1 : 1;
      }
    case 'descendant':
      {
        return b.type === 'child' ? 1 : -1;
      }
    case 'branch':
      {
        return $getCommonAncestorResultBranchOrder(compare);
      }
  }
}

/**
 * Return the ordering of siblings in a {@link CommonAncestorResultBranch}
 * @param compare Returns -1 if a precedes b, 1 otherwise
 */
function $getCommonAncestorResultBranchOrder(compare) {
  const {
    a,
    b
  } = compare;
  const aKey = a.__key;
  const bKey = b.__key;
  let na = a;
  let nb = b;
  for (; na && nb; na = na.getNextSibling(), nb = nb.getNextSibling()) {
    if (na.__key === bKey) {
      return -1;
    } else if (nb.__key === aKey) {
      return 1;
    }
  }
  return na === null ? 1 : -1;
}

/**
 * The two compared nodes are the same
 */

/**
 * Node a was a descendant of node b, and not the same node
 */

/**
 * Node a is an ancestor of node b, and not the same node
 */

/**
 * Node a and node b have a common ancestor but are on different branches,
 * the `a` and `b` properties of this result are the ancestors of a and b
 * that are children of the commonAncestor. Since they are siblings, their
 * positions are comparable to determine order in the document.
 */

/**
 * The result of comparing two nodes that share some common ancestor
 */

function $isSameNode(reference, other) {
  return other.is(reference);
}
function $initialElementTuple(node) {
  return $isElementNode(node) ? [node.getLatest(), null] : [node.getParent(), node.getLatest()];
}

/**
 * Find a common ancestor of a and b and return a detailed result object,
 * or null if there is no common ancestor between the two nodes.
 *
 * The result object will have a commonAncestor property, and the other
 * properties can be used to quickly compare these positions in the tree.
 *
 * @param a A LexicalNode
 * @param b A LexicalNode
 * @returns A comparison result between the two nodes or null if they have no common ancestor
 */
function $getCommonAncestor(a, b) {
  if (a.is(b)) {
    return {
      commonAncestor: a,
      type: 'same'
    };
  }
  // Map of parent -> child entries based on a and its ancestors
  const aMap = new Map();
  for (let [parent, child] = $initialElementTuple(a); parent; child = parent, parent = parent.getParent()) {
    aMap.set(parent, child);
  }
  for (let [parent, child] = $initialElementTuple(b); parent; child = parent, parent = parent.getParent()) {
    const aChild = aMap.get(parent);
    if (aChild === undefined) ; else if (aChild === null) {
      // a is the ancestor
      if (!$isSameNode(a, parent)) {
        formatDevErrorMessage(`$originComparison: ancestor logic error`);
      }
      return {
        commonAncestor: parent,
        type: 'ancestor'
      };
    } else if (child === null) {
      // b is the ancestor
      if (!$isSameNode(b, parent)) {
        formatDevErrorMessage(`$originComparison: descendant logic error`);
      }
      return {
        commonAncestor: parent,
        type: 'descendant'
      };
    } else {
      if (!(($isElementNode(aChild) || $isSameNode(a, aChild)) && ($isElementNode(child) || $isSameNode(b, child)) && parent.is(aChild.getParent()) && parent.is(child.getParent()))) {
        formatDevErrorMessage(`$originComparison: branch logic error`);
      }
      return {
        a: aChild,
        b: child,
        commonAncestor: parent,
        type: 'branch'
      };
    }
  }
  return null;
}

/**
 * @param point
 * @returns a PointCaret for the point
 */
function $caretFromPoint(point, direction) {
  const {
    type,
    key,
    offset
  } = point;
  const node = $getNodeByKeyOrThrow(point.key);
  if (type === 'text') {
    if (!$isTextNode(node)) {
      formatDevErrorMessage(`$caretFromPoint: Node with type ${node.getType()} and key ${key} that does not inherit from TextNode encountered for text point`);
    }
    return $getTextPointCaret(node, direction, offset);
  }
  if (!$isElementNode(node)) {
    formatDevErrorMessage(`$caretFromPoint: Node with type ${node.getType()} and key ${key} that does not inherit from ElementNode encountered for element point`);
  }
  return $getChildCaretAtIndex(node, point.offset, direction);
}

/**
 * Update the given point in-place from the PointCaret
 *
 * @param point the point to set
 * @param caret the caret to set the point from
 */
function $setPointFromCaret(point, caret) {
  const {
    origin,
    direction
  } = caret;
  const isNext = direction === 'next';
  if ($isTextPointCaret(caret)) {
    point.set(origin.getKey(), caret.offset, 'text');
  } else if ($isSiblingCaret(caret)) {
    if ($isTextNode(origin)) {
      point.set(origin.getKey(), $getTextNodeOffset(origin, direction), 'text');
    } else {
      point.set(origin.getParentOrThrow().getKey(), origin.getIndexWithinParent() + (isNext ? 1 : 0), 'element');
    }
  } else {
    if (!($isChildCaret(caret) && $isElementNode(origin))) {
      formatDevErrorMessage(`$setPointFromCaret: exhaustiveness check`);
    }
    point.set(origin.getKey(), isNext ? 0 : origin.getChildrenSize(), 'element');
  }
}

/**
 * Set a RangeSelection on the editor from the given CaretRange
 *
 * @returns The new RangeSelection
 */
function $setSelectionFromCaretRange(caretRange) {
  const currentSelection = $getSelection();
  const selection = $isRangeSelection(currentSelection) ? currentSelection : $createRangeSelection();
  $updateRangeSelectionFromCaretRange(selection, caretRange);
  $setSelection(selection);
  return selection;
}

/**
 * Update the points of a RangeSelection based on the given PointCaret.
 */
function $updateRangeSelectionFromCaretRange(selection, caretRange) {
  $setPointFromCaret(selection.anchor, caretRange.anchor);
  $setPointFromCaret(selection.focus, caretRange.focus);
}

/**
 * Get a pair of carets for a RangeSelection.
 *
 * If the focus is before the anchor, then the direction will be
 * 'previous', otherwise the direction will be 'next'.
 */
function $caretRangeFromSelection(selection) {
  const {
    anchor,
    focus
  } = selection;
  const anchorCaret = $caretFromPoint(anchor, 'next');
  const focusCaret = $caretFromPoint(focus, 'next');
  const direction = $comparePointCaretNext(anchorCaret, focusCaret) <= 0 ? 'next' : 'previous';
  return $getCaretRange($getCaretInDirection(anchorCaret, direction), $getCaretInDirection(focusCaret, direction));
}

/**
 * Given a SiblingCaret we can always compute a caret that points to the
 * origin of that caret in the same direction. The adjacent caret of the
 * returned caret will be equivalent to the given caret.
 *
 * @example
 * ```ts
 * siblingCaret.is($rewindSiblingCaret(siblingCaret).getAdjacentCaret())
 * ```
 *
 * @param caret The caret to "rewind"
 * @returns A new caret (ChildCaret or SiblingCaret) with the same direction
 */
function $rewindSiblingCaret(caret) {
  const {
    direction,
    origin
  } = caret;
  // Rotate the direction around the origin and get the adjacent node
  const rewindOrigin = $getSiblingCaret(origin, flipDirection(direction)).getNodeAtCaret();
  return rewindOrigin ? $getSiblingCaret(rewindOrigin, direction) : $getChildCaret(origin.getParentOrThrow(), direction);
}
function $getAnchorCandidates(anchor, rootMode = 'root') {
  // These candidates will be the anchor itself, the pointer to the anchor (if different), and then any parents of that
  const carets = [anchor];
  for (let parent = $isChildCaret(anchor) ? anchor.getParentCaret(rootMode) : anchor.getSiblingCaret(); parent !== null; parent = parent.getParentCaret(rootMode)) {
    carets.push($rewindSiblingCaret(parent));
  }
  return carets;
}
function $isCaretAttached(caret) {
  return !!caret && caret.origin.isAttached();
}

/**
 * Remove all text and nodes in the given range. If the range spans multiple
 * blocks then the remaining contents of the later block will be merged with
 * the earlier block.
 *
 * @param initialRange The range to remove text and nodes from
 * @param sliceMode If 'preserveEmptyTextPointCaret' it will leave an empty TextPointCaret at the anchor for insert if one exists, otherwise empty slices will be removed
 * @returns The new collapsed range (biased towards the earlier node)
 */
function $removeTextFromCaretRange(initialRange, sliceMode = 'removeEmptySlices') {
  if (initialRange.isCollapsed()) {
    return initialRange;
  }
  // Always process removals in document order
  const rootMode = 'root';
  const nextDirection = 'next';
  let sliceState = sliceMode;
  const range = $getCaretRangeInDirection(initialRange, nextDirection);
  const anchorCandidates = $getAnchorCandidates(range.anchor, rootMode);
  const focusCandidates = $getAnchorCandidates(range.focus.getFlipped(), rootMode);

  // Mark the start of each ElementNode
  const seenStart = new Set();
  // Queue removals to avoid mutating the tree during iteration
  const removedNodes = [];
  for (const caret of range.iterNodeCarets(rootMode)) {
    if ($isChildCaret(caret)) {
      seenStart.add(caret.origin.getKey());
    } else if ($isSiblingCaret(caret)) {
      const {
        origin
      } = caret;
      if (!$isElementNode(origin) || seenStart.has(origin.getKey())) {
        removedNodes.push(origin);
      }
    }
  }
  // Use $removeFromParent instead of node.remove() to skip redundant
  // per-node selection restoration — selection is rebuilt from
  // anchor/focus candidates below.
  const removedParents = new Set();
  for (const node of removedNodes) {
    const parent = node.getParent();
    // Track parents not in seenStart — those in seenStart are traversal
    // boundaries handled by block-merge logic below.
    if (parent !== null && !seenStart.has(parent.getKey())) {
      removedParents.add(parent);
    }
    $removeFromParent(node);
  }
  // Remove inline wrappers (canBeEmpty=false) that became empty
  for (const parent of removedParents) {
    if (!parent.canBeEmpty() && !$isRootOrShadowRoot(parent) && parent.isEmpty() && parent.isAttached()) {
      parent.remove();
    }
  }

  // Splice text at the anchor and/or origin.
  // If the text is entirely selected then it is removed (unless it is the first slice and sliceMode is preserveEmptyTextSliceCaret).
  // If it's a token with a non-empty selection then it is removed.
  // Segmented nodes will be copied to a plain text node with the same format
  // and style and set to normal mode.
  for (const slice of range.getTextSlices()) {
    if (!slice) {
      continue;
    }
    const {
      origin
    } = slice.caret;
    const contentSize = origin.getTextContentSize();
    const caretBefore = $rewindSiblingCaret($getSiblingCaret(origin, nextDirection));
    const mode = origin.getMode();
    if (Math.abs(slice.distance) === contentSize && sliceState === 'removeEmptySlices' || mode === 'token' && slice.distance !== 0) {
      // anchorCandidates[1] should still be valid, it is caretBefore
      caretBefore.remove();
    } else if (slice.distance !== 0) {
      sliceState = 'removeEmptySlices';
      let nextCaret = slice.removeTextSlice();
      const sliceOrigin = slice.caret.origin;
      if (mode === 'segmented') {
        const src = nextCaret.origin;
        const plainTextNode = $createTextNode(src.getTextContent()).setStyle(src.getStyle()).setFormat(src.getFormat());
        caretBefore.replaceOrInsert(plainTextNode);
        nextCaret = $getTextPointCaret(plainTextNode, nextDirection, nextCaret.offset);
      }
      if (sliceOrigin.is(anchorCandidates[0].origin)) {
        anchorCandidates[0] = nextCaret;
      }
      if (sliceOrigin.is(focusCandidates[0].origin)) {
        focusCandidates[0] = nextCaret.getFlipped();
      }
    }
  }

  // Find the deepest anchor and focus candidates that are
  // still attached
  let anchorCandidate;
  let focusCandidate;
  for (const candidate of anchorCandidates) {
    if ($isCaretAttached(candidate)) {
      anchorCandidate = $normalizeCaret(candidate);
      break;
    }
  }
  for (const candidate of focusCandidates) {
    if ($isCaretAttached(candidate)) {
      focusCandidate = $normalizeCaret(candidate);
      break;
    }
  }

  // Merge blocks if necessary
  const mergeTargets = $getBlockMergeTargets(anchorCandidate, focusCandidate, seenStart);
  if (mergeTargets) {
    const [anchorBlock, focusBlock] = mergeTargets;
    // always merge blocks later in the document with
    // blocks earlier in the document
    $getChildCaret(anchorBlock, 'previous').splice(0, focusBlock.getChildren());
    // remove empty parent node even if parent node is canBeEmpty
    let parent = focusBlock.getParent();
    focusBlock.remove(true);
    while (parent && parent.isEmpty()) {
      const element = parent;
      parent = parent.getParent();
      element.remove(true);
    }
  } else if (focusCandidate) {
    const focusBlock = $getBlockFromCaret(focusCandidate);
    const focusBlockParent = focusBlock && focusBlock.getParent();
    const topmostShadowRoot = focusBlock && focusBlock.getParents().findLast($isShadowRootNode);
    if (focusBlock && focusBlockParent && !$isRootNode(focusBlockParent) && focusBlock.isEmpty() && seenStart.has(focusBlock.getKey()) && $getSlotNames(focusBlock).length === 0 && (!topmostShadowRoot || seenStart.has(topmostShadowRoot.getKey()))) {
      focusBlock.remove(true);
      let parent = focusBlockParent;
      while (parent && !$isRootNode(parent) && parent.isEmpty()) {
        const grandparent = parent.getParent();
        if (grandparent && $isRootNode(grandparent) && grandparent.getChildrenSize() <= 1) {
          break;
        }
        const element = parent;
        parent = grandparent;
        element.remove(true);
      }
    }
  }

  // note this caret can be in either direction
  const bestCandidate = [anchorCandidate, focusCandidate, ...anchorCandidates, ...focusCandidates].find($isCaretAttached);
  if (bestCandidate) {
    const anchor = $getCaretInDirection($normalizeCaret(bestCandidate), initialRange.direction);
    return $getCollapsedCaretRange(anchor);
  }
  {
    formatDevErrorMessage(`$removeTextFromCaretRange: selection was lost, could not find a new anchor given candidates with keys: ${JSON.stringify(anchorCandidates.map(n => n.origin.__key))}`);
  }
}
function $getBlockFromCaret(caret) {
  if ($isChildCaret(caret)) {
    const origin = caret.origin;
    if (INTERNAL_$isBlock(origin)) {
      return origin;
    }
  } else {
    const parent = caret.getParentAtCaret();
    if (parent && INTERNAL_$isBlock(parent)) {
      return parent;
    }
  }
  return null;
}

/**
 * Determine if the two caret origins are in distinct blocks that
 * should be merged.
 *
 * The returned block pair will be the closest blocks to their
 * common ancestor, and must be no shadow roots between
 * the blocks and their respective carets. If two distinct
 * blocks matching this criteria are not found, this will return
 * null.
 */
function $getBlockMergeTargets(anchor, focus, seenStart) {
  if (!anchor || !focus) {
    return null;
  }
  const anchorParent = anchor.getParentAtCaret();
  const focusParent = focus.getParentAtCaret();
  if (!anchorParent || !focusParent) {
    return null;
  }
  // TODO refactor when we have a better primitive for common ancestor
  const anchorElements = anchorParent.getParents().reverse();
  anchorElements.push(anchorParent);
  const focusElements = focusParent.getParents().reverse();
  focusElements.push(focusParent);
  const maxLen = Math.min(anchorElements.length, focusElements.length);
  let commonAncestorCount;
  for (commonAncestorCount = 0; commonAncestorCount < maxLen && anchorElements[commonAncestorCount] === focusElements[commonAncestorCount]; commonAncestorCount++) {
    // just traverse the ancestors
  }
  const $getBlock = (arr, predicate) => {
    let block;
    for (let i = commonAncestorCount; i < arr.length; i++) {
      const ancestor = arr[i];
      if ($isRootOrShadowRoot(ancestor)) {
        return;
      } else if (!block && predicate(ancestor)) {
        block = ancestor;
      }
    }
    return block;
  };
  const anchorBlock = $getBlock(anchorElements, INTERNAL_$isBlock);
  const focusBlock = anchorBlock && $getBlock(focusElements, node => seenStart.has(node.getKey()) && INTERNAL_$isBlock(node));
  // A merge removes focusBlock with remove(true), which discards any slots it
  // owns (slots are not children, so they are not spliced onto anchorBlock).
  // Refuse to merge away a slot-bearing host so its slots can only be removed
  // as a unit by an explicit host deletion, never silently via backspace.
  if (focusBlock && $getSlotNames(focusBlock).length > 0) {
    return null;
  }
  return anchorBlock && focusBlock ? [anchorBlock, focusBlock] : null;
}

/**
 * Return the deepest ChildCaret that has initialCaret's origin
 * as an ancestor, or initialCaret if the origin is not an ElementNode
 * or is already the deepest ChildCaret.
 *
 * This is generally used when normalizing because there is
 * "zero distance" between these locations.
 *
 * @param initialCaret
 * @returns Either a deeper ChildCaret or the given initialCaret
 */
function $getDeepestChildOrSelf(initialCaret) {
  let caret = initialCaret;
  while ($isChildCaret(caret)) {
    const adjacent = $getAdjacentChildCaret(caret);
    if (!$isChildCaret(adjacent)) {
      break;
    }
    caret = adjacent;
  }
  return caret;
}

/**
 * Normalize a caret to the deepest equivalent PointCaret.
 * This will return a TextPointCaret with the offset set according
 * to the direction if given a caret with a TextNode origin
 * or a caret with an ElementNode origin with the deepest ChildCaret
 * having an adjacent TextNode.
 *
 * If given a TextPointCaret, it will be returned, as no normalization
 * is required when an offset is already present.
 *
 * @param initialCaret
 * @returns The normalized PointCaret
 */
function $normalizeCaret(initialCaret) {
  const caret = $getDeepestChildOrSelf(initialCaret.getLatest());
  const {
    direction
  } = caret;
  if ($isTextNode(caret.origin)) {
    return $isTextPointCaret(caret) ? caret : $getTextPointCaret(caret.origin, direction, direction);
  }
  const adj = caret.getAdjacentCaret();
  return $isSiblingCaret(adj) && $isTextNode(adj.origin) ? $getTextPointCaret(adj.origin, direction, flipDirection(direction)) : caret;
}
/**
 * Determine whether the TextPointCaret's offset can be extended further without leaving the TextNode.
 * Returns false if the given caret is not a TextPointCaret or the offset can not be moved further in
 * direction.
 *
 * @param caret A PointCaret
 * @returns true if caret is a TextPointCaret with an offset that is not at the end of the text given the direction.
 */
function $isExtendableTextPointCaret(caret) {
  return $isTextPointCaret(caret) && caret.offset !== $getTextNodeOffset(caret.origin, caret.direction);
}

/**
 * Return the caret if it's in the given direction, otherwise return
 * caret.getFlipped().
 *
 * @param caret Any PointCaret
 * @param direction The desired direction
 * @returns A PointCaret in direction
 */
function $getCaretInDirection(caret, direction) {
  return caret.direction === direction ? caret : caret.getFlipped();
}

/**
 * Return the range if it's in the given direction, otherwise
 * construct a new range using a flipped focus as the anchor
 * and a flipped anchor as the focus. This transformation
 * preserves the section of the document that it's working
 * with, but reverses the order of iteration.
 *
 * @param range Any CaretRange
 * @param direction The desired direction
 * @returns A CaretRange in direction
 */
function $getCaretRangeInDirection(range, direction) {
  if (range.direction === direction) {
    return range;
  }
  return $getCaretRange(
  // focus and anchor get flipped here
  $getCaretInDirection(range.focus, direction), $getCaretInDirection(range.anchor, direction));
}

/**
 * Get a caret pointing at the child at the given index, or the last
 * caret in that node if out of bounds.
 *
 * @param parent An ElementNode
 * @param index The index of the origin for the caret
 * @returns A caret pointing towards the node at that index
 */
function $getChildCaretAtIndex(parent, index, direction) {
  let caret = $getChildCaret(parent, 'next');
  for (let i = 0; i < index; i++) {
    const nextCaret = caret.getAdjacentCaret();
    if (nextCaret === null) {
      break;
    }
    caret = nextCaret;
  }
  return $getCaretInDirection(caret, direction);
}

/**
 * Returns the Node sibling when this exists, otherwise the closest parent sibling. For example
 * R -> P -> T1, T2
 *   -> P2
 * returns T2 for node T1, P2 for node T2, and null for node P2.
 * @param startCaret The initial caret
 * @param rootMode The root mode, 'root' (default) or 'shadowRoot'
 * @returns An array (tuple) containing the found caret and the depth difference, or null, if this node doesn't exist.
 */
function $getAdjacentSiblingOrParentSiblingCaret(startCaret, rootMode = 'root') {
  let depthDiff = 0;
  let caret = startCaret;
  let nextCaret = $getAdjacentChildCaret(caret);
  while (nextCaret === null) {
    depthDiff--;
    nextCaret = caret.getParentCaret(rootMode);
    if (!nextCaret) {
      return null;
    }
    caret = nextCaret;
    nextCaret = $getAdjacentChildCaret(caret);
  }
  return nextCaret && [nextCaret, depthDiff];
}

/**
 * Get the adjacent nodes to initialCaret in the given direction.
 *
 * @example
 * ```ts
 * expect($getAdjacentNodes($getChildCaret(parent, 'next'))).toEqual(parent.getChildren());
 * expect($getAdjacentNodes($getChildCaret(parent, 'previous'))).toEqual(parent.getChildren().reverse());
 * expect($getAdjacentNodes($getSiblingCaret(node, 'next'))).toEqual(node.getNextSiblings());
 * expect($getAdjacentNodes($getSiblingCaret(node, 'previous'))).toEqual(node.getPreviousSiblings().reverse());
 * ```
 *
 * @param initialCaret The caret to start at (the origin will not be included)
 * @returns An array of siblings.
 */
function $getAdjacentNodes(initialCaret) {
  const siblings = [];
  for (let caret = initialCaret.getAdjacentCaret(); caret; caret = caret.getAdjacentCaret()) {
    siblings.push(caret.origin);
  }
  return siblings;
}
function $splitTextPointCaret(textPointCaret) {
  const {
    origin,
    offset,
    direction
  } = textPointCaret;
  if (offset === $getTextNodeOffset(origin, direction)) {
    return textPointCaret.getSiblingCaret();
  } else if (offset === $getTextNodeOffset(origin, flipDirection(direction))) {
    return $rewindSiblingCaret(textPointCaret.getSiblingCaret());
  }
  const [textNode] = origin.splitText(offset);
  if (!$isTextNode(textNode)) {
    formatDevErrorMessage(`$splitTextPointCaret: splitText must return at least one TextNode`);
  }
  return $getCaretInDirection($getSiblingCaret(textNode, 'next'), direction);
}
function $alwaysSplit(_node, _edge) {
  return true;
}

/**
 * Split a node at a PointCaret and return a NodeCaret at that point, or null if the
 * node can't be split. This is non-recursive and will only perform at most one split.
 *
 * @returns The NodeCaret pointing to the location of the split (or null if a split is not possible)
 */
function $splitAtPointCaretNext(pointCaret, {
  $copyElementNode = $copyNode,
  $splitTextPointCaretNext = $splitTextPointCaret,
  rootMode = 'shadowRoot',
  $shouldSplit = $alwaysSplit,
  removeEmptyDestination = false
} = {}) {
  if ($isTextPointCaret(pointCaret)) {
    return $splitTextPointCaretNext(pointCaret);
  }
  const parentCaret = pointCaret.getParentCaret(rootMode);
  if (parentCaret) {
    const {
      origin
    } = parentCaret;
    if ($isChildCaret(pointCaret)) {
      const beforeParentCaret = $rewindSiblingCaret(parentCaret);
      if (removeEmptyDestination && origin.isEmpty()) {
        origin.remove();
        return beforeParentCaret;
      }
      if (!(origin.canBeEmpty() && $shouldSplit(origin, 'first'))) {
        return beforeParentCaret;
      }
    }
    const siblings = $getAdjacentNodes(pointCaret);
    if (siblings.length > 0 || !removeEmptyDestination && origin.canBeEmpty() && $shouldSplit(origin, 'last')) {
      // Split and insert the siblings into the new tree
      parentCaret.insert($copyElementNode(origin).splice(0, 0, siblings));
    }
  }
  return parentCaret;
}

/**
 * If the insertion caret is the root/shadow root node (see {@link $isRootOrShadowRoot}),
 * the node will be inserted there, otherwise the parent nodes will be split according to the
 * given options.
 * @param node - The node to be inserted
 * @param caret - The location to insert or split from
 * @returns The node after its insertion
 */
function $insertNodeToNearestRootAtCaret(node, caret, options) {
  let insertCaret = $getCaretInDirection(caret, 'next');
  // Normalize boundary cases for TextPointCaret
  if ($isTextPointCaret(insertCaret)) {
    if (insertCaret.offset === 0) {
      insertCaret = $getSiblingCaret(insertCaret.origin, 'previous').getFlipped();
    } else if (insertCaret.offset === insertCaret.origin.getTextContentSize()) {
      insertCaret = $getSiblingCaret(insertCaret.origin, 'next');
    }
  }
  // Make sure we have a distinct node as the origin
  if (insertCaret.origin.is(node)) {
    if (!$isSiblingCaret(insertCaret)) {
      formatDevErrorMessage(`$insertNodeToNearestRootAtCaret node ${node.getKey()} of type ${node.getType()} can not be inserted into itself`);
    }
    insertCaret = $rewindSiblingCaret(insertCaret);
  }
  // Handle split boundary conditions where node is being inserted adjacent to itself
  if (node.is(insertCaret.getNodeAtCaret()) || node.is(insertCaret.getFlipped().getNodeAtCaret())) {
    node.remove(true);
  }
  for (let nextCaret = insertCaret; nextCaret; nextCaret = $splitAtPointCaretNext(nextCaret, options)) {
    insertCaret = nextCaret;
  }
  if (!!$isTextPointCaret(insertCaret)) {
    formatDevErrorMessage(`$insertNodeToNearestRootAtCaret: An unattached TextNode can not be split`);
  }
  insertCaret.insert(node.isInline() ? $createParagraphNode().append(node) : node);
  return $getCaretInDirection($getSiblingCaret(node.getLatest(), 'next'), caret.direction);
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Define a LexicalExtension from the given object literal. TypeScript will
 * infer Config and Name in most cases, but you may want to use
 * {@link safeCast} for config if there are default fields or varying types.
 *
 * @param extension - The LexicalExtension
 * @returns The unmodified extension argument (this is only an inference helper)
 *
 * @example
 * Basic example
 * ```ts
 * export const MyExtension = defineExtension({
 *   // Extension names must be unique in an editor
 *   name: "my",
 *   nodes: [MyNode],
 * });
 * ```
 *
 * @example
 * Extension with optional configuration
 * ```ts
 * export interface ConfigurableConfig {
 *   optional?: string;
 *   required: number;
 * }
 * export const ConfigurableExtension = defineExtension({
 *   name: "configurable",
 *   // The Extension's config must satisfy the full config type,
 *   // but using the Extension as a dependency never requires
 *   // configuration and any partial of the config can be specified
 *   config: safeCast<ConfigurableConfig>({ required: 1 }),
 * });
 * ```
 *
 * @__NO_SIDE_EFFECTS__
 */
function defineExtension(extension) {
  return extension;
}

/**
 * Override a partial of the configuration of an Extension, to be used
 * in the dependencies array of another extension, or as
 * an argument to {@link buildEditorFromExtensions}.
 *
 * Before building the editor, configurations will be merged using
 * `extension.mergeConfig(extension, config)` or {@link shallowMergeConfig} if
 * this is not directly implemented by the Extension.
 *
 * @param args - An extension followed by one or more config partials for that extension
 * @returns `[extension, config, ...configs]`
 *
 * @example
 * ```ts
 * export const ReactDecoratorExtension = defineExtension({
 *   name: "react-decorator",
 *   dependencies: [
 *     configExtension(ReactExtension, {
 *       decorators: [<ReactDecorator />]
 *     }),
 *   ],
 * });
 * ```
 *
 * @__NO_SIDE_EFFECTS__
 */
function configExtension(...args) {
  return args;
}

/**
 * Used to declare a peer dependency of an extension in a type-safe way,
 * requires the type parameter. The most common use case for peer dependencies
 * is to avoid a direct import dependency, so you would want to use a
 * type import or the import type (shown in below examples).
 *
 * @param name - The extension's name
 * @param config - An optional config override
 * @returns NormalizedPeerDependency
 *
 * @example
 * ```ts
 * import type {FooExtension} from "foo";
 *
 * export const PeerExtension = defineExtension({
 *   name: 'PeerExtension',
 *   peerDependencies: [
 *     declarePeerDependency<FooExtension>("foo"),
 *     declarePeerDependency<typeof import("bar").BarExtension>("bar", {config: "bar"}),
 *   ],
 * });
 * ```
 *
 * @__NO_SIDE_EFFECTS__
 */
function declarePeerDependency(name, config) {
  return [name, config];
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Explicitly and safely cast a value to a specific type when inference or
 * satisfies isn't going to work as expected (often useful for the config
 * property with {@link defineExtension})
 *
 * @__NO_SIDE_EFFECTS__
 */
function safeCast(value) {
  return value;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * The default merge strategy for extension configuration is a shallow merge.
 *
 * @param config - A full config
 * @param overrides - A partial config of overrides
 * @returns config if there are no overrides, otherwise `{...config, ...overrides}`
 */
function shallowMergeConfig(config, overrides) {
  if (!overrides || config === overrides) {
    return config;
  }
  for (const k in overrides) {
    if (config[k] !== overrides[k]) {
      return {
        ...config,
        ...overrides
      };
    }
  }
  return config;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/** @internal */
function normalizeClassNames(...classNames) {
  const rval = [];
  for (const className of classNames) {
    if (className && typeof className === 'string') {
      for (const [s] of className.matchAll(/\S+/g)) {
        rval.push(s);
      }
    }
  }
  return rval;
}

/**
 * Takes an HTML element and adds the classNames passed within an array,
 * ignoring any non-string types. A space can be used to add multiple classes
 * eg. addClassNamesToElement(element, ['element-inner active', true, null])
 * will add both 'element-inner' and 'active' as classes to that element.
 * @param element - The element in which the classes are added
 * @param classNames - An array defining the class names to add to the element
 */
function addClassNamesToElement(element, ...classNames) {
  const classesToAdd = normalizeClassNames(...classNames);
  if (classesToAdd.length > 0) {
    element.classList.add(...classesToAdd);
  }
}

/**
 * Takes an HTML element and removes the classNames passed within an array,
 * ignoring any non-string types. A space can be used to remove multiple classes
 * eg. removeClassNamesFromElement(element, ['active small', true, null])
 * will remove both the 'active' and 'small' classes from that element.
 * @param element - The element in which the classes are removed
 * @param classNames - An array defining the class names to remove from the element
 */
function removeClassNamesFromElement(element, ...classNames) {
  const classesToRemove = normalizeClassNames(...classNames);
  if (classesToRemove.length > 0) {
    element.classList.remove(...classesToRemove);
  }
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Returns a function that will execute all functions passed when called. It is generally used
 * to register multiple lexical listeners and then tear them down with a single function call, such
 * as React's useEffect hook.
 * @example
 * ```ts
 * useEffect(() => {
 *   return mergeRegister(
 *     editor.registerCommand(...registerCommand1 logic),
 *     editor.registerCommand(...registerCommand2 logic),
 *     editor.registerCommand(...registerCommand3 logic)
 *   )
 * }, [editor])
 * ```
 * In this case, useEffect is returning the function returned by mergeRegister as a cleanup
 * function to be executed after either the useEffect runs again (due to one of its dependencies
 * updating) or the component it resides in unmounts.
 * Note the functions don't necessarily need to be in an array as all arguments
 * are considered to be the func argument and spread from there.
 * The order of cleanup is the reverse of the argument order. Generally it is
 * expected that the first "acquire" will be "released" last (LIFO order),
 * because a later step may have some dependency on an earlier one.
 * @param func - An array of cleanup functions meant to be executed by the returned function.
 * @returns the function which executes all the passed cleanup functions.
 */
function mergeRegister(...func) {
  return () => {
    for (let i = func.length - 1; i >= 0; i--) {
      func[i]();
    }
    // Clean up the references and make future calls a no-op
    func.length = 0;
  };
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */


/**
 * A map of event type to listener for a given {@link EventTarget}. Each
 * listener's event argument is inferred from the event type, e.g. for an
 * `HTMLElement` the `'keydown'` listener receives a `KeyboardEvent`.
 */

/**
 * Add several event listeners to a single `target` and return one function
 * that removes all of them.
 *
 * This is the batch form of {@link registerEventListener}: it takes a
 * `{type: listener}` object (strongly typed per event type) and shares one
 * `options` value across every listener. The returned dispose function removes
 * the listeners in reverse registration order (via {@link mergeRegister}).
 *
 * Because `options` is shared, register listeners that need a different
 * `options` value (e.g. a different `capture` flag) with a separate call and
 * combine the results with `mergeRegister`.
 *
 * @example
 * ```ts
 * // All five listeners share {capture: true}
 * return registerEventListeners(
 *   window,
 *   {
 *     beforeinput: report,
 *     cut: report,
 *     keydown: report,
 *     paste: report,
 *     selectionchange: report,
 *   },
 *   {capture: true},
 * );
 * ```
 *
 * @param target - The {@link EventTarget} to subscribe to
 * @param listeners - A map of event type to listener
 * @param options - Options forwarded to `add`/`removeEventListener` for every
 *   listener
 * @returns A function that removes every listener when called
 */
function registerEventListeners(target, listeners, options) {
  // Erase the per-event-type listener signatures to the loose
  // `addEventListener` form at the single boundary where the typed map is
  // turned into untyped registrations.
  const entries = Object.entries(listeners);
  return mergeRegister(...entries.map(([type, listener]) => registerEventListener(target, type, listener, options)));
}

exports.$addUpdateTag = $addUpdateTag;
exports.$applyNodeReplacement = $applyNodeReplacement;
exports.$assumeActiveEditor = $assumeActiveEditor;
exports.$caretFromPoint = $caretFromPoint;
exports.$caretRangeFromSelection = $caretRangeFromSelection;
exports.$cloneWithProperties = $cloneWithProperties;
exports.$cloneWithPropertiesEphemeral = $cloneWithPropertiesEphemeral;
exports.$comparePointCaretNext = $comparePointCaretNext;
exports.$copyNode = $copyNode;
exports.$create = $create;
exports.$createChildrenArray = $createChildrenArray;
exports.$createLineBreakNode = $createLineBreakNode;
exports.$createNodeSelection = $createNodeSelection;
exports.$createParagraphNode = $createParagraphNode;
exports.$createPoint = $createPoint;
exports.$createRangeSelection = $createRangeSelection;
exports.$createRangeSelectionFromDom = $createRangeSelectionFromDom;
exports.$createTabNode = $createTabNode;
exports.$createTextNode = $createTextNode;
exports.$extendCaretToRange = $extendCaretToRange;
exports.$findMatchingParent = $findMatchingParent;
exports.$formatText = $formatText;
exports.$fullReconcile = $fullReconcile;
exports.$generateNodesFromRawText = $generateNodesFromRawText;
exports.$getAdjacentChildCaret = $getAdjacentChildCaret;
exports.$getAdjacentNode = $getAdjacentNode;
exports.$getAdjacentSiblingOrParentSiblingCaret = $getAdjacentSiblingOrParentSiblingCaret;
exports.$getCaretInDirection = $getCaretInDirection;
exports.$getCaretRange = $getCaretRange;
exports.$getCaretRangeInDirection = $getCaretRangeInDirection;
exports.$getCharacterOffsets = $getCharacterOffsets;
exports.$getChildCaret = $getChildCaret;
exports.$getChildCaretAtIndex = $getChildCaretAtIndex;
exports.$getChildCaretOrSelf = $getChildCaretOrSelf;
exports.$getCollapsedCaretRange = $getCollapsedCaretRange;
exports.$getCommonAncestor = $getCommonAncestor;
exports.$getCommonAncestorResultBranchOrder = $getCommonAncestorResultBranchOrder;
exports.$getDOMSlot = $getDOMSlot;
exports.$getDOMTextNode = $getDOMTextNode;
exports.$getDocument = $getDocument;
exports.$getEditor = $getEditor;
exports.$getEditorDOMRenderConfig = $getEditorDOMRenderConfig;
exports.$getNearestNodeFromDOMNode = $getNearestNodeFromDOMNode;
exports.$getNearestRootOrShadowRoot = $getNearestRootOrShadowRoot;
exports.$getNodeByKey = $getNodeByKey;
exports.$getNodeByKeyOrThrow = $getNodeByKeyOrThrow;
exports.$getNodeFromDOMNode = $getNodeFromDOMNode;
exports.$getPreviousSelection = $getPreviousSelection;
exports.$getRoot = $getRoot;
exports.$getSelection = $getSelection;
exports.$getSiblingCaret = $getSiblingCaret;
exports.$getSlot = $getSlot;
exports.$getSlotFrame = $getSlotFrame;
exports.$getSlotHost = $getSlotHost;
exports.$getSlotNameWithinHost = $getSlotNameWithinHost;
exports.$getSlotNames = $getSlotNames;
exports.$getState = $getState;
exports.$getStateChange = $getStateChange;
exports.$getTextContent = $getTextContent;
exports.$getTextNodeOffset = $getTextNodeOffset;
exports.$getTextPointCaret = $getTextPointCaret;
exports.$getTextPointCaretSlice = $getTextPointCaretSlice;
exports.$getWritableNodeState = $getWritableNodeState;
exports.$hasAncestor = $hasAncestor;
exports.$hasUpdateTag = $hasUpdateTag;
exports.$insertNodeToNearestRootAtCaret = $insertNodeToNearestRootAtCaret;
exports.$insertNodes = $insertNodes;
exports.$isBlockElementNode = $isBlockElementNode;
exports.$isChildCaret = $isChildCaret;
exports.$isDecoratorNode = $isDecoratorNode;
exports.$isEditorState = $isEditorState;
exports.$isElementDOMSlot = $isElementDOMSlot;
exports.$isElementNode = $isElementNode;
exports.$isExtendableTextPointCaret = $isExtendableTextPointCaret;
exports.$isInlineElementOrDecoratorNode = $isInlineElementOrDecoratorNode;
exports.$isInlineFormattable = $isInlineFormattable;
exports.$isLeafNode = $isLeafNode;
exports.$isLexicalNode = $isLexicalNode;
exports.$isLineBreakNode = $isLineBreakNode;
exports.$isNodeCaret = $isNodeCaret;
exports.$isNodeSelection = $isNodeSelection;
exports.$isParagraphNode = $isParagraphNode;
exports.$isRangeSelection = $isRangeSelection;
exports.$isRootNode = $isRootNode;
exports.$isRootOrShadowRoot = $isRootOrShadowRoot;
exports.$isSelectionCapturedInDecoratorInput = $isSelectionCapturedInDecoratorInput;
exports.$isShadowRootNode = $isShadowRootNode;
exports.$isSiblingCaret = $isSiblingCaret;
exports.$isSlotChild = $isSlotChild;
exports.$isSlotHost = $isSlotHost;
exports.$isTabNode = $isTabNode;
exports.$isTextNode = $isTextNode;
exports.$isTextPointCaret = $isTextPointCaret;
exports.$isTextPointCaretSlice = $isTextPointCaretSlice;
exports.$isTokenOrSegmented = $isTokenOrSegmented;
exports.$isTokenOrTab = $isTokenOrTab;
exports.$markSlotEditable = $markSlotEditable;
exports.$needsBlockCursorBeside = $needsBlockCursorBeside;
exports.$nodesOfType = $nodesOfType;
exports.$normalizeCaret = $normalizeCaret;
exports.$normalizeSelection__EXPERIMENTAL = $normalizeSelection;
exports.$onUpdate = $onUpdate;
exports.$parseSerializedNode = $parseSerializedNode;
exports.$removeFromParent = $removeFromParent;
exports.$removeSlot = $removeSlot;
exports.$removeTextFromCaretRange = $removeTextFromCaretRange;
exports.$rewindSiblingCaret = $rewindSiblingCaret;
exports.$selectAll = $selectAll;
exports.$setCompositionKey = $setCompositionKey;
exports.$setDirectionFromDOM = $setDirectionFromDOM;
exports.$setFormatFromDOM = $setFormatFromDOM;
exports.$setPointFromCaret = $setPointFromCaret;
exports.$setSelection = $setSelection;
exports.$setSelectionFromCaretRange = $setSelectionFromCaretRange;
exports.$setSlot = $setSlot;
exports.$setState = $setState;
exports.$setTextFormat = $setTextFormat;
exports.$splitAtPointCaretNext = $splitAtPointCaretNext;
exports.$splitNode = $splitNode;
exports.$updateDOMSelection = $updateDOMSelection;
exports.$updateRangeSelectionFromCaretRange = $updateRangeSelectionFromCaretRange;
exports.ArtificialNode__DO_NOT_USE = ArtificialNode__DO_NOT_USE;
exports.BEFORE_INPUT_COMMAND = BEFORE_INPUT_COMMAND;
exports.BLUR_COMMAND = BLUR_COMMAND;
exports.CAN_REDO_COMMAND = CAN_REDO_COMMAND;
exports.CAN_UNDO_COMMAND = CAN_UNDO_COMMAND;
exports.CAN_USE_BEFORE_INPUT = CAN_USE_BEFORE_INPUT;
exports.CAN_USE_DOM = CAN_USE_DOM;
exports.CLEAR_EDITOR_COMMAND = CLEAR_EDITOR_COMMAND;
exports.CLEAR_HISTORY_COMMAND = CLEAR_HISTORY_COMMAND;
exports.CLICK_COMMAND = CLICK_COMMAND;
exports.COLLABORATION_TAG = COLLABORATION_TAG;
exports.COMMAND_PRIORITY_BEFORE_CRITICAL = COMMAND_PRIORITY_BEFORE_CRITICAL;
exports.COMMAND_PRIORITY_BEFORE_EDITOR = COMMAND_PRIORITY_BEFORE_EDITOR;
exports.COMMAND_PRIORITY_BEFORE_HIGH = COMMAND_PRIORITY_BEFORE_HIGH;
exports.COMMAND_PRIORITY_BEFORE_LOW = COMMAND_PRIORITY_BEFORE_LOW;
exports.COMMAND_PRIORITY_BEFORE_NORMAL = COMMAND_PRIORITY_BEFORE_NORMAL;
exports.COMMAND_PRIORITY_CRITICAL = COMMAND_PRIORITY_CRITICAL;
exports.COMMAND_PRIORITY_EDITOR = COMMAND_PRIORITY_EDITOR;
exports.COMMAND_PRIORITY_HIGH = COMMAND_PRIORITY_HIGH;
exports.COMMAND_PRIORITY_LOW = COMMAND_PRIORITY_LOW;
exports.COMMAND_PRIORITY_NORMAL = COMMAND_PRIORITY_NORMAL;
exports.COMPOSITION_END_COMMAND = COMPOSITION_END_COMMAND;
exports.COMPOSITION_END_TAG = COMPOSITION_END_TAG;
exports.COMPOSITION_START_COMMAND = COMPOSITION_START_COMMAND;
exports.COMPOSITION_START_TAG = COMPOSITION_START_TAG;
exports.CONTROLLED_TEXT_INSERTION_COMMAND = CONTROLLED_TEXT_INSERTION_COMMAND;
exports.COPY_COMMAND = COPY_COMMAND;
exports.CUT_COMMAND = CUT_COMMAND;
exports.CUT_TAG = CUT_TAG;
exports.DEFAULT_EDITOR_DOM_CONFIG = DEFAULT_EDITOR_DOM_CONFIG;
exports.DELETE_CHARACTER_COMMAND = DELETE_CHARACTER_COMMAND;
exports.DELETE_LINE_COMMAND = DELETE_LINE_COMMAND;
exports.DELETE_WORD_COMMAND = DELETE_WORD_COMMAND;
exports.DRAGEND_COMMAND = DRAGEND_COMMAND;
exports.DRAGOVER_COMMAND = DRAGOVER_COMMAND;
exports.DRAGSTART_COMMAND = DRAGSTART_COMMAND;
exports.DROP_COMMAND = DROP_COMMAND;
exports.DecoratorNode = DecoratorNode;
exports.ElementNode = ElementNode;
exports.FOCUS_COMMAND = FOCUS_COMMAND;
exports.FORMAT_ELEMENT_COMMAND = FORMAT_ELEMENT_COMMAND;
exports.FORMAT_TEXT_COMMAND = FORMAT_TEXT_COMMAND;
exports.HISTORIC_TAG = HISTORIC_TAG;
exports.HISTORY_MERGE_TAG = HISTORY_MERGE_TAG;
exports.HISTORY_PUSH_TAG = HISTORY_PUSH_TAG;
exports.INDENT_CONTENT_COMMAND = INDENT_CONTENT_COMMAND;
exports.INPUT_COMMAND = INPUT_COMMAND;
exports.INSERT_LINE_BREAK_COMMAND = INSERT_LINE_BREAK_COMMAND;
exports.INSERT_PARAGRAPH_COMMAND = INSERT_PARAGRAPH_COMMAND;
exports.INSERT_TAB_COMMAND = INSERT_TAB_COMMAND;
exports.INTERNAL_$isBlock = INTERNAL_$isBlock;
exports.IS_ALL_FORMATTING = IS_ALL_FORMATTING;
exports.IS_ANDROID = IS_ANDROID;
exports.IS_ANDROID_CHROME = IS_ANDROID_CHROME;
exports.IS_APPLE = IS_APPLE;
exports.IS_APPLE_WEBKIT = IS_APPLE_WEBKIT;
exports.IS_BOLD = IS_BOLD;
exports.IS_CHROME = IS_CHROME;
exports.IS_CODE = IS_CODE;
exports.IS_FIREFOX = IS_FIREFOX;
exports.IS_HIGHLIGHT = IS_HIGHLIGHT;
exports.IS_IOS = IS_IOS;
exports.IS_ITALIC = IS_ITALIC;
exports.IS_SAFARI = IS_SAFARI;
exports.IS_STRIKETHROUGH = IS_STRIKETHROUGH;
exports.IS_SUBSCRIPT = IS_SUBSCRIPT;
exports.IS_SUPERSCRIPT = IS_SUPERSCRIPT;
exports.IS_UNDERLINE = IS_UNDERLINE;
exports.KEY_ARROW_DOWN_COMMAND = KEY_ARROW_DOWN_COMMAND;
exports.KEY_ARROW_LEFT_COMMAND = KEY_ARROW_LEFT_COMMAND;
exports.KEY_ARROW_RIGHT_COMMAND = KEY_ARROW_RIGHT_COMMAND;
exports.KEY_ARROW_UP_COMMAND = KEY_ARROW_UP_COMMAND;
exports.KEY_BACKSPACE_COMMAND = KEY_BACKSPACE_COMMAND;
exports.KEY_DELETE_COMMAND = KEY_DELETE_COMMAND;
exports.KEY_DOWN_COMMAND = KEY_DOWN_COMMAND;
exports.KEY_ENTER_COMMAND = KEY_ENTER_COMMAND;
exports.KEY_ESCAPE_COMMAND = KEY_ESCAPE_COMMAND;
exports.KEY_MODIFIER_COMMAND = KEY_MODIFIER_COMMAND;
exports.KEY_SPACE_COMMAND = KEY_SPACE_COMMAND;
exports.KEY_TAB_COMMAND = KEY_TAB_COMMAND;
exports.LineBreakNode = LineBreakNode;
exports.MOVE_TO_END = MOVE_TO_END;
exports.MOVE_TO_START = MOVE_TO_START;
exports.NODE_STATE_DIRECT = NODE_STATE_DIRECT;
exports.NODE_STATE_KEY = NODE_STATE_KEY;
exports.NODE_STATE_LATEST = NODE_STATE_LATEST;
exports.OUTDENT_CONTENT_COMMAND = OUTDENT_CONTENT_COMMAND;
exports.PASTE_COMMAND = PASTE_COMMAND;
exports.PASTE_TAG = PASTE_TAG;
exports.ParagraphNode = ParagraphNode;
exports.REDO_COMMAND = REDO_COMMAND;
exports.REMOVE_TEXT_COMMAND = REMOVE_TEXT_COMMAND;
exports.RootNode = RootNode;
exports.SELECTION_CHANGE_COMMAND = SELECTION_CHANGE_COMMAND;
exports.SELECTION_INSERT_CLIPBOARD_NODES_COMMAND = SELECTION_INSERT_CLIPBOARD_NODES_COMMAND;
exports.SELECT_ALL_COMMAND = SELECT_ALL_COMMAND;
exports.SET_TEXT_FORMAT_COMMAND = SET_TEXT_FORMAT_COMMAND;
exports.SKIP_COLLAB_TAG = SKIP_COLLAB_TAG;
exports.SKIP_DOM_SELECTION_TAG = SKIP_DOM_SELECTION_TAG;
exports.SKIP_SCROLL_INTO_VIEW_TAG = SKIP_SCROLL_INTO_VIEW_TAG;
exports.SKIP_SELECTION_FOCUS_TAG = SKIP_SELECTION_FOCUS_TAG;
exports.TEXT_TYPE_TO_FORMAT = TEXT_TYPE_TO_FORMAT;
exports.TabNode = TabNode;
exports.TextNode = TextNode;
exports.UNDO_COMMAND = UNDO_COMMAND;
exports.addClassNamesToElement = addClassNamesToElement;
exports.buildImportMap = buildImportMap;
exports.configExtension = configExtension;
exports.createCommand = createCommand;
exports.createEditor = createEditor;
exports.createRefCountedRegistry = createRefCountedRegistry;
exports.createSharedNodeState = createSharedNodeState;
exports.createState = createState;
exports.declarePeerDependency = declarePeerDependency;
exports.defineExtension = defineExtension;
exports.findAllLexicalElementsDeep = findAllLexicalElementsDeep;
exports.flipDirection = flipDirection;
exports.getActiveElement = getActiveElement;
exports.getActiveElementDeep = getActiveElementDeep;
exports.getComposedEventTarget = getComposedEventTarget;
exports.getComposedStaticRange = getComposedStaticRange;
exports.getDOMOwnerDocument = getDOMOwnerDocument;
exports.getDOMSelection = getDOMSelection;
exports.getDOMSelectionFromTarget = getDOMSelectionFromTarget;
exports.getDOMSelectionPoints = getDOMSelectionPoints;
exports.getDOMSelectionRange = getDOMSelectionRange;
exports.getDOMSelectionRangeAndPoints = getDOMSelectionRangeAndPoints;
exports.getDOMShadowRoots = getDOMShadowRoots;
exports.getDOMTextNode = getDOMTextNode;
exports.getDeclaredSlots = getDeclaredSlots;
exports.getEditorPropertyFromDOMNode = getEditorPropertyFromDOMNode;
exports.getNearestEditorFromDOMNode = getNearestEditorFromDOMNode;
exports.getParentElement = getParentElement;
exports.getRegisteredNode = getRegisteredNode;
exports.getRegisteredNodeOrThrow = getRegisteredNodeOrThrow;
exports.getRegisteredSubtypeMap = getRegisteredSubtypeMap;
exports.getRootOwnerDocument = getRootOwnerDocument;
exports.getStaticNodeConfig = getStaticNodeConfig;
exports.getStyleObjectFromCSS = getStyleObjectFromCSS;
exports.getTextDirection = getTextDirection;
exports.getTransformSetFromKlass = getTransformSetFromKlass;
exports.isBlockDomNode = isBlockDomNode;
exports.isCurrentlyReadOnlyMode = isCurrentlyReadOnlyMode;
exports.isDOMCapturingSelection = isDOMCapturingSelection;
exports.isDOMDocumentNode = isDOMDocumentNode;
exports.isDOMNode = isDOMNode;
exports.isDOMShadowRoot = isDOMShadowRoot;
exports.isDOMTextNode = isDOMTextNode;
exports.isDOMUnmanaged = isDOMUnmanaged;
exports.isDocumentFragment = isDocumentFragment;
exports.isExactShortcutMatch = isExactShortcutMatch;
exports.isHTMLAnchorElement = isHTMLAnchorElement;
exports.isHTMLElement = isHTMLElement;
exports.isHTMLTableCellElement = isHTMLTableCellElement;
exports.isHTMLTableRowElement = isHTMLTableRowElement;
exports.isInlineDomNode = isInlineDomNode;
exports.isLastChildInBlockNode = isLastChildInBlockNode;
exports.isLexicalEditor = isLexicalEditor;
exports.isModifierMatch = isModifierMatch;
exports.isOnlyChildInBlockNode = isOnlyChildInBlockNode;
exports.isSelectionCapturedInDecoratorInput = isSelectionCapturedInDecoratorInput;
exports.isSelectionWithinEditor = isSelectionWithinEditor;
exports.iterStaticNodeConfigChain = iterStaticNodeConfigChain;
exports.makeStepwiseIterator = makeStepwiseIterator;
exports.mergeRegister = mergeRegister;
exports.mountSlotContainer = mountSlotContainer;
exports.normalizeClassNames = normalizeClassNames;
exports.registerEventListener = registerEventListener;
exports.registerEventListeners = registerEventListeners;
exports.removeClassNamesFromElement = removeClassNamesFromElement;
exports.removeFromParent = removeFromParent;
exports.resetRandomKey = resetRandomKey;
exports.safeCast = safeCast;
exports.setDOMStyleFromCSS = setDOMStyleFromCSS;
exports.setDOMStyleObject = setDOMStyleObject;
exports.setDOMUnmanaged = setDOMUnmanaged;
exports.setNodeIndentFromDOM = setNodeIndentFromDOM;
exports.shallowMergeConfig = shallowMergeConfig;
exports.stopLexicalPropagation = stopLexicalPropagation;
exports.toggleTextFormatType = toggleTextFormatType;
exports.tokenizeRawText = tokenizeRawText;
exports.unmountSlotContainer = unmountSlotContainer;
