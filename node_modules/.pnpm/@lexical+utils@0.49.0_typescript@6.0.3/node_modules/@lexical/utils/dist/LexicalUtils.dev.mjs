/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { createRectsFromDOMRange, $isAtEdgeOfElement } from '@lexical/selection';
import { getRootOwnerDocument, isHTMLElement, mergeRegister, $getSelection, $isRangeSelection, $isElementNode, $isTextNode, $getDOMTextNode, getDOMTextNode, $getDOMSlot, registerEventListener, getDOMSelectionPoints, getParentElement, $isSlotHost, $getSlotNames, $getSlot, $getChildCaret, $getSlotHost, $findMatchingParent, $getChildCaretOrSelf, $getSiblingCaret, $getAdjacentSiblingOrParentSiblingCaret, $caretRangeFromSelection, $getCaretRangeInDirection, $removeTextFromCaretRange, $isTextPointCaret, $splitAtPointCaretNext, $setSelectionFromCaretRange, $getCaretRange, $getPreviousSelection, $caretFromPoint, $getRoot, $createParagraphNode, $insertNodeToNearestRootAtCaret, $getAdjacentChildCaret, $isChildCaret, $normalizeCaret, $getCollapsedCaretRange, $getSlotFrame, $getCaretInDirection, $comparePointCaretNext, $cloneWithProperties, $fullReconcile, $setSelection, $rewindSiblingCaret, makeStepwiseIterator, $isSiblingCaret, $getState, $setState, IS_FIREFOX, CAN_USE_DOM } from 'lexical';
export { $findMatchingParent, $getAdjacentSiblingOrParentSiblingCaret, $insertNodeToNearestRootAtCaret, $splitNode, CAN_USE_BEFORE_INPUT, CAN_USE_DOM, IS_ANDROID, IS_ANDROID_CHROME, IS_APPLE, IS_APPLE_WEBKIT, IS_CHROME, IS_FIREFOX, IS_IOS, IS_SAFARI, addClassNamesToElement, isBlockDomNode, isHTMLAnchorElement, isHTMLElement, isInlineDomNode, mergeRegister, removeClassNamesFromElement } from 'lexical';

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

/**
 * Dedupe a list of selection client-rects before they are drawn as fills.
 *
 * `Range.getClientRects()` can return rects that are duplicated or contained
 * within another, and WebKit in particular emits a spurious wider rect alongside
 * the real text rect on some blocks (balanced or letter-spaced headings are the
 * reproducible case). Drawn as semi-transparent fills, duplicates read brighter
 * than a single rect, and the wider rect paints the "extra empty selection area"
 * reported in facebook/lexical#7106.
 *
 * This drops zero-area rects and any rect that contains another, keeping the
 * smaller text-hugging one, with a 1px tolerance for sub-pixel jitter. The
 * assumption is that genuine same-line rects are horizontally disjoint (one rect
 * per visual row; inline boxes on a row tile side by side), so containment only
 * holds for the duplicate or spurious-wider cases, never for a legitimate
 * sub-fragment that should be kept.
 *
 * On the `createRectsFromDOMRange` path (e.g. `positionNodeOnRange`): that
 * helper's own `selectionSpansElement` filter already drops the full-block-width
 * spurious rect, so there this mainly prevents the duplicate-doubling. The #7106
 * extra-area paint is addressed for consumers that feed raw `getClientRects()`,
 * where `selectionSpansElement` does not run — that is the path that needs it.
 *
 * Known limitation: the disjoint assumption holds for normal flow. Overlapping
 * inline content — a negative margin, a transform, or a baseline-shifted inline
 * decorator — can place a real sub-fragment inside a wider real-text rect on the
 * same row; if a sub-pixel top offset also lets both clear
 * `createRectsFromDOMRange`'s asymmetric overlap filter, keep-smaller drops the
 * wider rect and under-paints the glyphs it uniquely covered. There is no
 * rect-only fix: that wider rect is geometrically indistinguishable from the
 * spurious-wider (#7106) rect, so keeping it would re-introduce the extra-area
 * paint. See the under-paint characterization browser test.
 *
 * Typed on the structural subset of `DOMRect` it reads, so it accepts a live
 * `DOMRectList` from `getClientRects()` as well as the `DOMRect[]` returned by
 * `createRectsFromDOMRange`, and is unit-testable without a DOM.
 */
function dedupeSelectionRects(rects) {
  const contains = (a, b) => b.left >= a.left - 1 && b.top >= a.top - 1 && b.right <= a.right + 1 && b.bottom <= a.bottom + 1;
  const kept = [];
  for (const rect of Array.from(rects)) {
    if (rect.width < 0.5 || rect.height < 0.5) {
      continue;
    }
    // `rect` contains a smaller rect already kept: keep the smaller one.
    if (kept.some(keptRect => contains(rect, keptRect))) {
      continue;
    }
    // A kept rect contains `rect`: drop the larger, keep the smaller `rect`.
    for (let i = kept.length - 1; i >= 0; i--) {
      if (contains(kept[i], rect)) {
        kept.splice(i, 1);
      }
    }
    kept.push(rect);
  }
  return kept;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

function px(value) {
  return `${value}px`;
}

const mutationObserverConfig = {
  attributes: true,
  characterData: true,
  childList: true,
  subtree: true
};
function prependDOMNode(parent, node) {
  parent.insertBefore(node, parent.firstChild);
}

/**
 * Place one or multiple newly created Nodes at the passed Range's position.
 * Multiple nodes will only be created when the Range spans multiple lines (aka
 * client rects).
 *
 * This function can come particularly useful to highlight particular parts of
 * the text without interfering with the EditorState, that will often replicate
 * the state across collab and clipboard.
 *
 * This function accounts for DOM updates which can modify the passed Range.
 * Hence, the function return to remove the listener.
 */
function mlcPositionNodeOnRange(editor, range, onReposition) {
  let rootDOMNode = null;
  let parentDOMNode = null;
  let observer = null;
  let lastNodes = [];
  const wrapperNode = getRootOwnerDocument(editor.getRootElement()).createElement('div');
  wrapperNode.style.position = 'relative';
  function position() {
    if (!(rootDOMNode !== null)) {
      formatDevErrorMessage(`Unexpected null rootDOMNode`);
    }
    if (!(parentDOMNode !== null)) {
      formatDevErrorMessage(`Unexpected null parentDOMNode`);
    }
    const {
      left: parentLeft,
      top: parentTop
    } = parentDOMNode.getBoundingClientRect();
    const rects = dedupeSelectionRects(createRectsFromDOMRange(editor, range));
    if (!wrapperNode.isConnected) {
      prependDOMNode(parentDOMNode, wrapperNode);
    }
    let hasRepositioned = false;
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      // Try to reuse the previously created Node when possible, no need to
      // remove/create on the most common case reposition case
      const rectNode = lastNodes[i] || getRootOwnerDocument(rootDOMNode).createElement('div');
      const rectNodeStyle = rectNode.style;
      if (rectNodeStyle.position !== 'absolute') {
        rectNodeStyle.position = 'absolute';
        hasRepositioned = true;
      }
      const left = px(rect.left - parentLeft);
      if (rectNodeStyle.left !== left) {
        rectNodeStyle.left = left;
        hasRepositioned = true;
      }
      const top = px(rect.top - parentTop);
      if (rectNodeStyle.top !== top) {
        rectNode.style.top = top;
        hasRepositioned = true;
      }
      const width = px(rect.width);
      if (rectNodeStyle.width !== width) {
        rectNode.style.width = width;
        hasRepositioned = true;
      }
      const height = px(rect.height);
      if (rectNodeStyle.height !== height) {
        rectNode.style.height = height;
        hasRepositioned = true;
      }
      if (rectNode.parentNode !== wrapperNode) {
        wrapperNode.append(rectNode);
        hasRepositioned = true;
      }
      lastNodes[i] = rectNode;
    }
    while (lastNodes.length > rects.length) {
      const node = lastNodes.pop();
      if (node != null) {
        node.remove();
      }
    }
    if (hasRepositioned) {
      onReposition(lastNodes);
    }
  }
  function stop() {
    parentDOMNode = null;
    rootDOMNode = null;
    if (observer !== null) {
      observer.disconnect();
    }
    observer = null;
    wrapperNode.remove();
    for (const node of lastNodes) {
      node.remove();
    }
    lastNodes = [];
  }
  function restart() {
    const currentRootDOMNode = editor.getRootElement();
    if (currentRootDOMNode === null) {
      return stop();
    }
    const currentParentDOMNode = currentRootDOMNode.parentElement;
    if (!isHTMLElement(currentParentDOMNode)) {
      return stop();
    }
    stop();
    rootDOMNode = currentRootDOMNode;
    parentDOMNode = currentParentDOMNode;
    observer = new MutationObserver(mutations => {
      const nextRootDOMNode = editor.getRootElement();
      const nextParentDOMNode = nextRootDOMNode && nextRootDOMNode.parentElement;
      if (nextRootDOMNode !== rootDOMNode || nextParentDOMNode !== parentDOMNode) {
        return restart();
      }
      for (const mutation of mutations) {
        if (!wrapperNode.contains(mutation.target)) {
          // TODO throttle
          return position();
        }
      }
    });
    observer.observe(currentParentDOMNode, mutationObserverConfig);
    position();
  }
  const removeRootListener = editor.registerRootListener(restart);
  return () => {
    removeRootListener();
    stop();
  };
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

function $getOrderedSelectionPoints(selection) {
  const points = selection.getStartEndPoints();
  return selection.isBackward() ? [points[1], points[0]] : points;
}
function $rangeTargetFromPoint(editor, point, node, dom) {
  if (point.type === 'text' || !$isElementNode(node)) {
    const textDOM = ($isTextNode(node) ? $getDOMTextNode(node, dom, editor) : getDOMTextNode(dom)) || dom;
    return [textDOM, point.offset];
  } else {
    const slot = $getDOMSlot(node, dom, editor);
    return [slot.element, slot.getFirstChildOffset() + point.offset];
  }
}
function $rangeFromPoints(editor, start, startNode, startDOM, end, endNode, endDOM) {
  const editorDocument = editor._window ? editor._window.document : document;
  const range = editorDocument.createRange();
  range.setStart(...$rangeTargetFromPoint(editor, start, startNode, startDOM));
  range.setEnd(...$rangeTargetFromPoint(editor, end, endNode, endDOM));
  return range;
}
function defaultOnReposition(domNodes) {
  for (const domNode of domNodes) {
    const domNodeStyle = domNode.style;
    if (domNodeStyle.background !== 'Highlight') {
      domNodeStyle.background = 'Highlight';
    }
    if (domNodeStyle.color !== 'HighlightText') {
      domNodeStyle.color = 'HighlightText';
    }
    if (domNodeStyle.marginTop !== px(-1.5)) {
      domNodeStyle.marginTop = px(-1.5);
    }
    if (domNodeStyle.paddingTop !== px(4)) {
      domNodeStyle.paddingTop = px(4);
    }
    if (domNodeStyle.paddingBottom !== px(0)) {
      domNodeStyle.paddingBottom = px(0);
    }
  }
}

/**
 * Place one or multiple newly created Nodes at the current selection. Multiple
 * nodes will only be created when the selection spans multiple lines (aka
 * client rects).
 *
 * This function can come useful when you want to show the selection but the
 * editor has been focused away.
 */
function markSelection(editor, onReposition = defaultOnReposition) {
  let previousAnchorNode = null;
  let previousAnchorNodeDOM = null;
  let previousAnchorOffset = null;
  let previousFocusNode = null;
  let previousFocusNodeDOM = null;
  let previousFocusOffset = null;
  let removeRangeListener = () => {};
  function compute(editorState) {
    editorState.read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        // TODO
        previousAnchorNode = null;
        previousAnchorOffset = null;
        previousFocusNode = null;
        previousFocusOffset = null;
        removeRangeListener();
        removeRangeListener = () => {};
        return;
      }
      const [start, end] = $getOrderedSelectionPoints(selection);
      const currentStartNode = start.getNode();
      const currentStartNodeKey = currentStartNode.getKey();
      const currentStartOffset = start.offset;
      const currentEndNode = end.getNode();
      const currentEndNodeKey = currentEndNode.getKey();
      const currentEndOffset = end.offset;
      const currentStartNodeDOM = editor.getElementByKey(currentStartNodeKey);
      const currentEndNodeDOM = editor.getElementByKey(currentEndNodeKey);
      const differentStartDOM = previousAnchorNode === null || currentStartNodeDOM !== previousAnchorNodeDOM || currentStartOffset !== previousAnchorOffset || currentStartNodeKey !== previousAnchorNode.getKey();
      const differentEndDOM = previousFocusNode === null || currentEndNodeDOM !== previousFocusNodeDOM || currentEndOffset !== previousFocusOffset || currentEndNodeKey !== previousFocusNode.getKey();
      if ((differentStartDOM || differentEndDOM) && currentStartNodeDOM !== null && currentEndNodeDOM !== null) {
        const range = $rangeFromPoints(editor, start, currentStartNode, currentStartNodeDOM, end, currentEndNode, currentEndNodeDOM);
        removeRangeListener();
        removeRangeListener = mlcPositionNodeOnRange(editor, range, onReposition);
      }
      previousAnchorNode = currentStartNode;
      previousAnchorNodeDOM = currentStartNodeDOM;
      previousAnchorOffset = currentStartOffset;
      previousFocusNode = currentEndNode;
      previousFocusNodeDOM = currentEndNodeDOM;
      previousFocusOffset = currentEndOffset;
      // Pass {editor} so the active editor is set: $rangeTargetFromPoint reads
      // the slot (getFirstChildOffset), which consults the active editor to
      // skip the block cursor.
    }, {
      editor
    });
  }
  compute(editor.getEditorState());
  return mergeRegister(editor.registerUpdateListener(({
    editorState
  }) => compute(editorState)), () => {
    removeRangeListener();
  });
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

function selectionAlwaysOnDisplay(editor, onReposition) {
  let removeSelectionMark = null;
  const onSelectionChange = () => {
    const editorRootElement = editor.getRootElement();
    // Read the selection from the editor's own document/window so iframe-
    // mounted editors don't fall back to the global one. The selectionchange
    // listener below is registered on rootElement.ownerDocument, so this
    // matches the event's source.
    const targetWindow = editorRootElement !== null ? editorRootElement.ownerDocument.defaultView : null;
    const domSelection = targetWindow !== null ? targetWindow.getSelection() : null;
    // Shadow-aware anchor so the contains() check below isn't fooled by the
    // retargeted host.
    const domAnchorNode = domSelection !== null ? getDOMSelectionPoints(domSelection, editorRootElement).anchorNode : null;
    const isSelectionInsideEditor = domAnchorNode !== null && editorRootElement !== null && editorRootElement.contains(domAnchorNode);
    if (isSelectionInsideEditor) {
      if (removeSelectionMark !== null) {
        removeSelectionMark();
        removeSelectionMark = null;
      }
    } else {
      if (removeSelectionMark === null) {
        removeSelectionMark = markSelection(editor, onReposition);
      }
    }
  };
  return editor.registerRootListener(rootElement => {
    if (rootElement) {
      const document = rootElement.ownerDocument;
      const cleanup = mergeRegister(registerEventListener(document, 'selectionchange', onSelectionChange), () => {
        if (removeSelectionMark !== null) {
          removeSelectionMark();
        }
      });
      onSelectionChange();
      return cleanup;
    }
  });
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */


// Got from https://stackoverflow.com/a/42543908/2013580
/**
 * Walks up from `element` and returns the nearest scrollable ancestor (or
 * `ownerDocument.body` if none is found), used to keep the active typeahead
 * option scrolled into view. Set `includeHidden` to also treat
 * `overflow: hidden` ancestors as scroll parents.
 *
 * The walk crosses ShadowRoot→host (via `getParentElement`) so a
 * shadow-mounted editor's scroll parent is found in the enclosing light-DOM
 * ancestor chain, and the styles / body are resolved through the element's
 * own realm so an iframe-mounted editor stays inside its document.
 */
function getScrollParent(element, includeHidden) {
  // Resolve through the element's own realm so an iframe-mounted editor's
  // scroll parent and computed styles come from its document, not the top one.
  const ownerDocument = element.ownerDocument;
  const win = ownerDocument.defaultView || window;
  let style = win.getComputedStyle(element);
  const excludeStaticParent = style.position === 'absolute';
  const overflowRegex = includeHidden ? /(auto|scroll|hidden)/ : /(auto|scroll)/;
  if (style.position === 'fixed') {
    return ownerDocument.body;
  }
  for (let parent = element; parent = getParentElement(parent);) {
    style = win.getComputedStyle(parent);
    if (excludeStaticParent && style.position === 'static') {
      continue;
    }
    if (overflowRegex.test(style.overflow + style.overflowY + style.overflowX)) {
      return parent;
    }
  }
  return ownerDocument.body;
}

/**
 * Returns true if the file type matches the types passed within the acceptableMimeTypes array, false otherwise.
 * The types passed must be strings and are CASE-SENSITIVE.
 * eg. if file is of type 'text' and acceptableMimeTypes = ['TEXT', 'IMAGE'] the function will return false.
 * @param file - The file you want to type check.
 * @param acceptableMimeTypes - An array of strings of types which the file is checked against.
 * @returns true if the file is an acceptable mime type, false otherwise.
 */
function isMimeType(file, acceptableMimeTypes) {
  for (const acceptableType of acceptableMimeTypes) {
    if (file.type.startsWith(acceptableType)) {
      return true;
    }
  }
  return false;
}

/**
 * Lexical File Reader with:
 *  1. MIME type support
 *  2. batched results (HistoryPlugin compatibility)
 *  3. Order aware (respects the order when multiple Files are passed)
 *
 * const filesResult = await mediaFileReader(files, ['image/']);
 * filesResult.forEach(file => editor.dispatchCommand('INSERT_IMAGE', \\{
 *   src: file.result,
 * \\}));
 */
function mediaFileReader(files, acceptableMimeTypes) {
  const filesIterator = files[Symbol.iterator]();
  return new Promise((resolve, reject) => {
    const processed = [];
    const handleNextFile = () => {
      const {
        done,
        value: file
      } = filesIterator.next();
      if (done) {
        return resolve(processed);
      }
      const fileReader = new FileReader();
      fileReader.addEventListener('error', reject);
      fileReader.addEventListener('load', () => {
        const result = fileReader.result;
        if (typeof result === 'string') {
          processed.push({
            file,
            result
          });
        }
        handleNextFile();
      });
      if (isMimeType(file, acceptableMimeTypes)) {
        fileReader.readAsDataURL(file);
      } else {
        handleNextFile();
      }
    };
    handleNextFile();
  });
}
/**
 * "Depth-First Search" starts at the root/top node of a tree and goes as far as it can down a branch end
 * before backtracking and finding a new path. Consider solving a maze by hugging either wall, moving down a
 * branch until you hit a dead-end (leaf) and backtracking to find the nearest branching path and repeat.
 * It will then return all the nodes found in the search in an array of objects.
 * Preorder traversal is used, meaning that nodes are listed in the order of when they are FIRST encountered.
 *
 * Children-only spine: named slot subtrees are skipped. Use {@link $dfsWithSlots}
 * when you need to descend into slots (e.g. character counting, slot-aware
 * content extraction).
 *
 * @param startNode - The node to start the search (inclusive), if omitted, it will start at the root node.
 * @param endNode - The node to end the search (inclusive), if omitted, it will find all descendants of the startingNode. If endNode
 * is an ElementNode, it will stop before visiting any of its children.
 * @returns An array of objects of all the nodes found by the search, including their depth into the tree.
 * \\{depth: number, node: LexicalNode\\} It will always return at least 1 node (the start node).
 */
function $dfs(startNode, endNode) {
  return Array.from($dfsIterator(startNode, endNode));
}

/**
 * Get the adjacent caret in the same direction
 *
 * @param caret A caret or null
 * @returns `caret.getAdjacentCaret()` or `null`
 */
function $getAdjacentCaret(caret) {
  return caret ? caret.getAdjacentCaret() : null;
}

/**
 * $dfs iterator (right to left). Tree traversal is done on the fly as new values are requested with O(1) memory.
 * @param startNode - The node to start the search, if omitted, it will start at the root node.
 * @param endNode - The node to end the search, if omitted, it will find all descendants of the startingNode.
 * @returns An iterator, each yielded value is a DFSNode. It will always return at least 1 node (the start node).
 */
function $reverseDfs(startNode, endNode) {
  return Array.from($reverseDfsIterator(startNode, endNode));
}

/**
 * $dfs iterator (left to right). Tree traversal is done on the fly as new values are requested with O(1) memory.
 * Preorder traversal is used, meaning that nodes are iterated over in the order of when they are FIRST encountered.
 *
 * Children-only spine: named slot subtrees are skipped. Use {@link $dfsWithSlotsIterator}
 * (or {@link $dfsWithSlots}) when you need to descend into slots — e.g. character
 * counting, content extraction, or any cross-tree analysis where slotted content
 * should be visited.
 *
 * @param startNode - The node to start the search (inclusive), if omitted, it will start at the root node.
 * @param endNode - The node to end the search (inclusive), if omitted, it will find all descendants of the startingNode.
 * If endNode is an ElementNode, the iterator will end as soon as it reaches the endNode (no children will be visited).
 * @returns An iterator, each yielded value is a DFSNode. It will always return at least 1 node (the start node).
 */
function $dfsIterator(startNode, endNode) {
  return $dfsCaretIterator('next', startNode, endNode);
}

/**
 * Like {@link $dfs}, but also descends into named slots. Slots are not on the
 * linked-list spine, so each host's slot subtrees are emitted slots-first,
 * right after the host node and before its linked-list children.
 * @experimental
 * @param startNode - The node to start the search (inclusive), defaults to the root node.
 * @param endNode - The node to end the search (inclusive), defaults to all descendants of startNode.
 * Like {@link $dfs}, reaching endNode stops the traversal before visiting any of its
 * children — including its slot subtrees. An endNode strictly inside a slot subtree
 * is never reached (slot subtrees are spliced in whole), so it does not truncate
 * the traversal.
 * @returns An array of DFSNodes. It will always return at least 1 node (the start node).
 */
function $dfsWithSlots(startNode, endNode) {
  return Array.from($dfsWithSlotsIterator(startNode, endNode));
}

/**
 * Slot-aware {@link $dfsIterator}: a host's slot subtrees are emitted
 * slots-first, right after the host node and before its linked-list children.
 * The caret iterator drives the linked-list spine untouched.
 * @experimental
 * @param startNode - The node to start the search (inclusive), defaults to the root node.
 * @param endNode - The node to end the search (inclusive), defaults to all descendants of startNode.
 * Like {@link $dfs}, reaching endNode stops the traversal before visiting any of its
 * children — including its slot subtrees. An endNode strictly inside a slot subtree
 * is never reached (slot subtrees are spliced in whole), so it does not truncate
 * the traversal.
 * @returns An iterator, each yielded value is a DFSNode. It will always return at least 1 node (the start node).
 */
function* $dfsWithSlotsIterator(startNode, endNode) {
  for (const dfsNode of $dfsCaretIterator('next', startNode, endNode)) {
    yield dfsNode;
    const {
      node,
      depth
    } = dfsNode;
    // endNode is an inclusive stop: none of its children are visited, so its
    // slot subtrees must not be either.
    if ($isSlotHost(node) && !node.is(endNode)) {
      for (const name of $getSlotNames(node)) {
        const slot = $getSlot(node, name);
        if (slot !== null) {
          yield* $dfsSubtreeIterator(slot, depth + 1);
        }
      }
    }
  }
}

/**
 * Slots-first preorder traversal of a self-contained subtree (a slot node and
 * everything it owns). Used to splice slot subtrees into $dfsWithSlotsIterator.
 */
function* $dfsSubtreeIterator(node, depth) {
  yield {
    depth,
    node
  };
  const childDepth = depth + 1;
  if ($isSlotHost(node)) {
    for (const name of $getSlotNames(node)) {
      const slot = $getSlot(node, name);
      if (slot !== null) {
        yield* $dfsSubtreeIterator(slot, childDepth);
      }
    }
  }
  if ($isElementNode(node)) {
    for (const child of node.getChildren()) {
      yield* $dfsSubtreeIterator(child, childDepth);
    }
  }
}
function $getEndCaret(startNode, direction) {
  const rval = $getAdjacentSiblingOrParentSiblingCaret($getSiblingCaret(startNode, direction));
  return rval && rval[0];
}
function $dfsCaretIterator(direction, startNode, endNode) {
  const root = $getRoot();
  const start = startNode || root;
  const startCaret = $isElementNode(start) ? $getChildCaret(start, direction) : $getSiblingCaret(start, direction);
  const startDepth = $getDepth(start);
  const endCaret = endNode ? $getAdjacentChildCaret($getChildCaretOrSelf($getSiblingCaret(endNode, direction))) || $getEndCaret(endNode, direction) : $getEndCaret(start, direction);
  let depth = startDepth;
  return makeStepwiseIterator({
    hasNext: state => state !== null,
    initial: startCaret,
    map: state => ({
      depth,
      node: state.origin
    }),
    step: state => {
      if (state.isSameNodeCaret(endCaret)) {
        return null;
      }
      if ($isChildCaret(state)) {
        depth++;
      }
      const rval = $getAdjacentSiblingOrParentSiblingCaret(state);
      if (!rval || rval[0].isSameNodeCaret(endCaret)) {
        return null;
      }
      depth += rval[1];
      return rval[0];
    }
  });
}

/**
 * Returns the Node sibling when this exists, otherwise the closest parent sibling. For example
 * R -> P -> T1, T2
 *   -> P2
 * returns T2 for node T1, P2 for node T2, and null for node P2.
 * @param node LexicalNode.
 * @returns An array (tuple) containing the found Lexical node and the depth difference, or null, if this node doesn't exist.
 */
function $getNextSiblingOrParentSibling(node) {
  const rval = $getAdjacentSiblingOrParentSiblingCaret($getSiblingCaret(node, 'next'));
  return rval && [rval[0].origin, rval[1]];
}
function $getDepth(node) {
  let depth = -1;
  for (let innerNode = node; innerNode !== null;
  // A slotted node has no parent; climb its slot host instead.
  innerNode = innerNode.getParent() ?? $getSlotHost(innerNode)) {
    depth++;
  }
  return depth;
}

/**
 * Performs a right-to-left preorder tree traversal.
 * From the starting node it goes to the rightmost child, than backtracks to parent and finds new rightmost path.
 * It will return the next node in traversal sequence after the startingNode.
 * The traversal is similar to $dfs functions above, but the nodes are visited right-to-left, not left-to-right.
 * @param startingNode - The node to start the search.
 * @returns The next node in pre-order right to left traversal sequence or `null`, if the node does not exist
 */
function $getNextRightPreorderNode(startingNode) {
  const startCaret = $getChildCaretOrSelf($getSiblingCaret(startingNode, 'previous'));
  const next = $getAdjacentSiblingOrParentSiblingCaret(startCaret, 'root');
  return next && next[0].origin;
}

/**
 * $dfs iterator (right to left). Tree traversal is done on the fly as new values are requested with O(1) memory.
 * @param startNode - The node to start the search, if omitted, it will start at the root node.
 * @param endNode - The node to end the search, if omitted, it will find all descendants of the startingNode.
 * @returns An iterator, each yielded value is a DFSNode. It will always return at least 1 node (the start node).
 */
function $reverseDfsIterator(startNode, endNode) {
  return $dfsCaretIterator('previous', startNode, endNode);
}

/**
 * Like {@link $reverseDfs}, but also descends into named slots. Mirror of
 * {@link $dfsWithSlots}.
 * @experimental
 * @param startNode - The node to start the search (inclusive), defaults to the root node.
 * @param endNode - The node to end the search (inclusive), defaults to all descendants of startNode.
 * Mirroring {@link $dfsWithSlots}, reaching endNode stops the traversal without
 * emitting its slot subtrees. An endNode strictly inside a slot subtree is never
 * reached (slot subtrees are spliced in whole), so it does not truncate the
 * traversal.
 * @returns An array of DFSNodes. It will always return at least 1 node (the start node).
 */
function $reverseDfsWithSlots(startNode, endNode) {
  return Array.from($reverseDfsWithSlotsIterator(startNode, endNode));
}

/**
 * Right-to-left mirror of {@link $dfsWithSlotsIterator}. Forward visits slots
 * before children, so the mirror visits them last: a host's slot subtrees are
 * emitted (in reverse slot order) only once its linked-list subtree is fully
 * traversed. Because the caret spine streams nodes, "left the host subtree" is
 * detected when a node at the host's depth or shallower arrives, flushing the
 * host's pending slots. The caret iterator drives the spine untouched.
 * @experimental
 * @param startNode - The node to start the search (inclusive), defaults to the root node.
 * @param endNode - The node to end the search (inclusive), defaults to all descendants of startNode.
 * Mirroring {@link $dfsWithSlotsIterator}, reaching endNode stops the traversal
 * without emitting its slot subtrees. An endNode strictly inside a slot subtree is
 * never reached (slot subtrees are spliced in whole), so it does not truncate the
 * traversal.
 * @returns An iterator, each yielded value is a DFSNode. It will always return at least 1 node (the start node).
 */
function* $reverseDfsWithSlotsIterator(startNode, endNode) {
  const pending = [];
  for (const dfsNode of $dfsCaretIterator('previous', startNode, endNode)) {
    while (pending.length > 0 && dfsNode.depth <= pending[pending.length - 1].depth) {
      const host = pending.pop();
      yield* $reverseSlotsOf(host.node, host.depth + 1);
    }
    yield dfsNode;
    const {
      node,
      depth
    } = dfsNode;
    // endNode is an inclusive stop: mirror the forward iterator and leave its
    // slot subtrees unvisited rather than flushing them after the stop.
    if ($isSlotHost(node) && $getSlotNames(node).length > 0 && !node.is(endNode)) {
      pending.push({
        depth,
        node
      });
    }
  }
  while (pending.length > 0) {
    const host = pending.pop();
    yield* $reverseSlotsOf(host.node, host.depth + 1);
  }
}

/** Emit a host's slot subtrees in reverse slot order (mirror of slots-first). */
function* $reverseSlotsOf(host, childDepth) {
  const names = $getSlotNames(host);
  for (let i = names.length - 1; i >= 0; i--) {
    const slot = $getSlot(host, names[i]);
    if (slot !== null) {
      yield* $reverseDfsSubtreeIterator(slot, childDepth);
    }
  }
}

/**
 * Right-to-left slots-last preorder of a self-contained subtree: children in
 * reverse order, then slots in reverse order. Mirror of $dfsSubtreeIterator.
 */
function* $reverseDfsSubtreeIterator(node, depth) {
  yield {
    depth,
    node
  };
  const childDepth = depth + 1;
  if ($isElementNode(node)) {
    const children = node.getChildren();
    for (let i = children.length - 1; i >= 0; i--) {
      yield* $reverseDfsSubtreeIterator(children[i], childDepth);
    }
  }
  if ($isSlotHost(node)) {
    yield* $reverseSlotsOf(node, childDepth);
  }
}

/**
 * Takes a node and traverses up its ancestors (toward the root node)
 * in order to find a specific type of node.
 * @param node - the node to begin searching.
 * @param klass - an instance of the type of node to look for.
 * @returns the node of type klass that was passed, or null if none exist.
 */
function $getNearestNodeOfType(node, klass) {
  let parent = node;
  while (parent != null) {
    if (parent instanceof klass) {
      return parent;
    }
    parent = parent.getParent();
  }
  return null;
}

/**
 * Returns the element node of the nearest ancestor, otherwise throws an error.
 * @param startNode - The starting node of the search
 * @returns The ancestor node found
 */
function $getNearestBlockElementAncestorOrThrow(startNode) {
  const blockNode = $findMatchingParent(startNode, node => $isElementNode(node) && !node.isInline());
  if (!$isElementNode(blockNode)) {
    {
      formatDevErrorMessage(`Expected node ${startNode.__key} to have closest block element node.`);
    }
  }
  return blockNode;
}

/**
 * Checks whether the selection covers the entire block: the selection's
 * start point is at or before the first position inside blockNode and its
 * end point is at or after the last position inside blockNode. A selection
 * that extends beyond the block's boundaries still fully selects the block,
 * and an empty block is fully selected by any selection that touches or
 * surrounds it.
 *
 * @param blockNode - The ElementNode to check, typically a top-level block or the RootNode
 * @param selectionOrRange - The RangeSelection or CaretRange to check
 * @returns true if the selection covers the entire blockNode
 */
function $isBlockFullySelected(blockNode, selectionOrRange) {
  const range = $getCaretRangeInDirection($isRangeSelection(selectionOrRange) ? $caretRangeFromSelection(selectionOrRange) : selectionOrRange, 'next');
  // A named-slot subtree is isolated from its host through a parentless
  // up-link, so a range inside a slot can never cover a block outside that
  // slot frame (and vice versa) — and the caret comparison below has no
  // common ancestor to walk across the boundary. Different frames are
  // never fully selected; the same frame compares safely within it.
  const anchorFrame = $getSlotFrame(range.anchor.origin);
  const blockFrame = $getSlotFrame(blockNode.getLatest());
  if (anchorFrame === null ? blockFrame !== null : !anchorFrame.is(blockFrame)) {
    return false;
  }
  const blockStart = $normalizeCaret($getChildCaret(blockNode, 'next'));
  const blockEnd = $getCaretInDirection($normalizeCaret($getChildCaret(blockNode, 'previous')), 'next');
  return $comparePointCaretNext(range.anchor, blockStart) <= 0 && $comparePointCaretNext(range.focus, blockEnd) >= 0;
}
/**
 * Attempts to resolve nested element nodes of the same type into a single node of that type.
 * It is generally used for marks/commenting
 * @param editor - The lexical editor
 * @param targetNode - The target for the nested element to be extracted from.
 * @param cloneNode - See {@link $createMarkNode}
 * @param handleOverlap - Handles any overlap between the node to extract and the targetNode
 * @returns The lexical editor
 */
function registerNestedElementResolver(editor, targetNode, cloneNode, handleOverlap) {
  const $isTargetNode = node => {
    return node instanceof targetNode;
  };
  const $findMatch = node => {
    // First validate we don't have any children that are of the target,
    // as we need to handle them first.
    const children = node.getChildren();
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if ($isTargetNode(child)) {
        return null;
      }
    }
    let parentNode = node;
    let childNode = node;
    while (parentNode !== null) {
      childNode = parentNode;
      parentNode = parentNode.getParent();
      if ($isTargetNode(parentNode)) {
        return {
          child: childNode,
          parent: parentNode
        };
      }
    }
    return null;
  };
  const $elementNodeTransform = node => {
    const match = $findMatch(node);
    if (match !== null) {
      const {
        child,
        parent
      } = match;

      // Simple path, we can move child out and siblings into a new parent.

      if (child.is(node)) {
        handleOverlap(parent, node);
        const nextSiblings = child.getNextSiblings();
        const nextSiblingsLength = nextSiblings.length;
        parent.insertAfter(child);
        if (nextSiblingsLength !== 0) {
          const newParent = cloneNode(parent);
          child.insertAfter(newParent);
          for (let i = 0; i < nextSiblingsLength; i++) {
            newParent.append(nextSiblings[i]);
          }
        }
        if (!parent.canBeEmpty() && parent.getChildrenSize() === 0) {
          parent.remove();
        }
      }
    }
  };
  return editor.registerNodeTransform(targetNode, $elementNodeTransform);
}

/**
 * Clones the editor and marks it as dirty to be reconciled. If there was a selection,
 * it would be set back to its previous state, or null otherwise.
 * @param editor - The lexical editor
 * @param editorState - The editor's state
 */
function $restoreEditorState(editor, editorState) {
  const nodeMap = new Map();
  const activeEditorState = editor._pendingEditorState;
  for (const [key, node] of editorState._nodeMap) {
    nodeMap.set(key, $cloneWithProperties(node));
  }
  if (activeEditorState) {
    activeEditorState._nodeMap = nodeMap;
  }
  $fullReconcile();
  const selection = editorState._selection;
  $setSelection(selection === null ? null : selection.clone());
}

/**
 * If the selected insertion area is the root/shadow root node (see {@link lexical!$isRootOrShadowRoot}),
 * the node will be appended there, otherwise, it will be inserted before the insertion area.
 * If there is no selection where the node is to be inserted, it will be appended after any current nodes
 * within the tree, as a child of the root node. A paragraph will then be added after the inserted node and selected.
 * @param node - The node to be inserted
 * @returns The node after its insertion
 */
function $insertNodeToNearestRoot(node) {
  const selection = $getSelection() || $getPreviousSelection();
  let initialCaret;
  if ($isRangeSelection(selection)) {
    initialCaret = $caretFromPoint(selection.focus, 'next');
  } else {
    if (selection != null) {
      const nodes = selection.getNodes();
      const lastNode = nodes[nodes.length - 1];
      if (lastNode) {
        initialCaret = $getSiblingCaret(lastNode, 'next');
      }
    }
    initialCaret = initialCaret || $getChildCaret($getRoot(), 'previous').getFlipped().insert($createParagraphNode());
  }
  const insertCaret = $insertNodeToNearestRootAtCaret(node, initialCaret);
  const adjacent = $getAdjacentChildCaret(insertCaret);
  const selectionCaret = $isChildCaret(adjacent) ? $normalizeCaret(adjacent) : insertCaret;
  $setSelectionFromCaretRange($getCollapsedCaretRange(selectionCaret));
  return node.getLatest();
}

/**
 * Inserts a node into leaf — the deepest accessible node at the carriage position
 * @param node - The node to be inserted
 */
function $insertNodeIntoLeaf(node) {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    if (selection) {
      selection.insertNodes([node]);
    }
    return;
  }
  const caretRange = $caretRangeFromSelection(selection);
  let insertCaret = $getCaretRangeInDirection($removeTextFromCaretRange(caretRange), 'next').anchor;
  if ($isTextPointCaret(insertCaret)) {
    const nextAnchor = $splitAtPointCaretNext(insertCaret);
    if (!nextAnchor) {
      return;
    }
    insertCaret = nextAnchor;
  }
  const focus = insertCaret.getFlipped();
  focus.insert(node);
  $setSelectionFromCaretRange($getCaretRange(focus, focus));
}

/**
 * Wraps the node into another node created from a createElementNode function, eg. $createParagraphNode
 * @param node - Node to be wrapped.
 * @param createElementNode - Creates a new lexical element to wrap the to-be-wrapped node and returns it.
 * @returns A new lexical element with the previous node appended within (as a child, including its children).
 */
function $wrapNodeInElement(node, createElementNode) {
  const elementNode = createElementNode();
  node.replace(elementNode);
  elementNode.append(node);
  return elementNode;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any

/**
 * @param object = The instance of the type
 * @param objectClass = The class of the type
 * @returns Whether the object is has the same Klass of the objectClass, ignoring the difference across window (e.g. different iframes)
 */
function objectKlassEquals(object, objectClass) {
  return object !== null ? Object.getPrototypeOf(object).constructor.name === objectClass.name : false;
}

// Clipboard may contain files that we aren't allowed to read. While the event is arguably useless,
// in certain occasions, we want to know whether it was a file transfer, as opposed to text. We
// control this with the first boolean flag.
function eventFiles(event) {
  let dataTransfer = null;
  if (objectKlassEquals(event, DragEvent)) {
    dataTransfer = event.dataTransfer;
  } else if (objectKlassEquals(event, ClipboardEvent)) {
    dataTransfer = event.clipboardData;
  }
  if (dataTransfer === null) {
    return [false, [], false];
  }
  const types = dataTransfer.types;
  const hasFiles = types.includes('Files');
  const hasContent = types.includes('text/html') || types.includes('text/plain');
  return [hasFiles, Array.from(dataTransfer.files), hasContent];
}

/**
 * @deprecated Use Array filter or flatMap
 *
 * Filter the nodes
 * @param nodes Array of nodes that needs to be filtered
 * @param filterFn A filter function that returns node if the current node satisfies the condition otherwise null
 * @returns Array of filtered nodes
 */

function $filter(nodes, filterFn) {
  const result = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = filterFn(nodes[i]);
    if (node !== null) {
      result.push(node);
    }
  }
  return result;
}

/**
 * Applies the provided callback to each indentable block element in the Selection
 *
 * @param indentOrOutdent callback for performing the indent or outdent action
 * on a given block element.
 * @returns true if at least one block was handled, false otherwise.
 */
function $handleIndentAndOutdent(indentOrOutdent) {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return false;
  }
  const alreadyHandled = new Set();
  const nodes = selection.getNodes();
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const key = node.getKey();
    if (alreadyHandled.has(key)) {
      continue;
    }
    const parentBlock = $findMatchingParent(node, parentNode => $isElementNode(parentNode) && !parentNode.isInline());
    if (parentBlock === null) {
      continue;
    }
    const parentKey = parentBlock.getKey();
    if (parentBlock.canIndent() && !alreadyHandled.has(parentKey)) {
      alreadyHandled.add(parentKey);
      indentOrOutdent(parentBlock);
    }
  }
  return alreadyHandled.size > 0;
}

/**
 * Appends the node before the first child of the parent node
 * @param parent A parent node
 * @param node Node that needs to be appended
 */
function $insertFirst(parent, node) {
  $getChildCaret(parent, 'next').insert(node);
}
let NEEDS_MANUAL_ZOOM = IS_FIREFOX || !CAN_USE_DOM ? false : undefined;
function needsManualZoom() {
  if (NEEDS_MANUAL_ZOOM === undefined) {
    // If the browser implements standardized CSS zoom, then the client rect
    // will be wider after zoom is applied
    // https://chromestatus.com/feature/5198254868529152
    // https://github.com/facebook/lexical/issues/6863
    // eslint-disable-next-line no-restricted-syntax
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.opacity = '0';
    div.style.width = '100px';
    div.style.left = '-1000px';
    // eslint-disable-next-line no-restricted-syntax
    document.body.appendChild(div);
    const noZoom = div.getBoundingClientRect();
    div.style.setProperty('zoom', '2');
    NEEDS_MANUAL_ZOOM = div.getBoundingClientRect().width === noZoom.width;
    // eslint-disable-next-line no-restricted-syntax
    document.body.removeChild(div);
  }
  return NEEDS_MANUAL_ZOOM;
}

/**
 * Calculates the zoom level of an element as a result of using
 * css zoom property. For browsers that implement standardized CSS
 * zoom (Firefox, Chrome >= 128), this will always return 1.
 * @param element
 * @param useManualZoom - If true, always use zoom level will be calculated manually, otherwise it will be calculated on as needed basis.
 */
function calculateZoomLevel(element, useManualZoom = false) {
  let zoom = 1;
  if (needsManualZoom() || useManualZoom) {
    // Read styles from the element's own realm so an iframe-mounted editor's
    // zoom isn't computed through the top-level window (cross-realm
    // getComputedStyle can return an empty zoom).
    const win = element && element.ownerDocument.defaultView || window;
    while (element) {
      zoom *= Number(win.getComputedStyle(element).getPropertyValue('zoom'));
      element = getParentElement(element);
    }
  }
  return zoom;
}

/**
 * Checks if the editor is a nested editor created by LexicalNestedComposer
 */
function $isEditorIsNestedEditor(editor) {
  return editor._parentEditor !== null;
}

/**
 * A depth first last-to-first traversal of root that stops at each node that matches
 * $predicate and ensures that its parent is root. This is typically used to discard
 * invalid or unsupported wrapping nodes. For example, a TableNode must only have
 * TableRowNode as children, but an importer might add invalid nodes based on
 * caption, tbody, thead, etc. and this will unwrap and discard those.
 *
 * @param root The root to start the traversal
 * @param $predicate Should return true for nodes that are permitted to be children of root
 * @returns true if this unwrapped or removed any nodes
 */
function $unwrapAndFilterDescendants(root, $predicate) {
  return $unwrapAndFilterDescendantsImpl(root, $predicate, null);
}
function $unwrapAndFilterDescendantsImpl(root, $predicate, $onSuccess) {
  let didMutate = false;
  for (const node of $lastToFirstIterator(root)) {
    if ($predicate(node)) {
      if ($onSuccess !== null) {
        $onSuccess(node);
      }
      continue;
    }
    didMutate = true;
    if ($isElementNode(node)) {
      $unwrapAndFilterDescendantsImpl(node, $predicate, $onSuccess || (child => node.insertAfter(child)));
    }
    node.remove();
  }
  return didMutate;
}

/**
 * A depth first traversal of the children array that stops at and collects
 * each node that `$predicate` matches. This is typically used to discard
 * invalid or unsupported wrapping nodes on a children array in the `after`
 * of an {@link lexical!DOMConversionOutput}. For example, a TableNode must only have
 * TableRowNode as children, but an importer might add invalid nodes based on
 * caption, tbody, thead, etc. and this will unwrap and discard those.
 *
 * This function is read-only and performs no mutation operations, which makes
 * it suitable for import and export purposes but likely not for any in-place
 * mutation. You should use {@link $unwrapAndFilterDescendants} for in-place
 * mutations such as node transforms.
 *
 * @param children The children to traverse
 * @param $predicate Should return true for nodes that are permitted to be children of root
 * @returns The children or their descendants that match $predicate
 */

function $descendantsMatching(children, $predicate) {
  const result = [];
  const stack = Array.from(children).reverse();
  for (let child = stack.pop(); child !== undefined; child = stack.pop()) {
    if ($predicate(child)) {
      result.push(child);
    } else if ($isElementNode(child)) {
      for (const grandchild of $lastToFirstIterator(child)) {
        stack.push(grandchild);
      }
    }
  }
  return result;
}

/**
 * Return an iterator that yields each child of node from first to last, taking
 * care to preserve the next sibling before yielding the value in case the caller
 * removes the yielded node.
 *
 * @param node The node whose children to iterate
 * @returns An iterator of the node's children
 */
function $firstToLastIterator(node) {
  return $childIterator($getChildCaret(node, 'next'));
}

/**
 * Return an iterator that yields each child of node from last to first, taking
 * care to preserve the previous sibling before yielding the value in case the caller
 * removes the yielded node.
 *
 * @param node The node whose children to iterate
 * @returns An iterator of the node's children
 */
function $lastToFirstIterator(node) {
  return $childIterator($getChildCaret(node, 'previous'));
}
function $childIterator(startCaret) {
  const seen = new Set() ;
  return makeStepwiseIterator({
    hasNext: $isSiblingCaret,
    initial: startCaret.getAdjacentCaret(),
    map: caret => {
      const origin = caret.origin.getLatest();
      if (seen !== null) {
        const key = origin.getKey();
        if (!!seen.has(key)) {
          formatDevErrorMessage(`$childIterator: Cycle detected, node with key ${String(key)} has already been traversed`);
        }
        seen.add(key);
      }
      return origin;
    },
    step: caret => caret.getAdjacentCaret()
  });
}

/**
 * Replace this node with its children
 *
 * @param node The ElementNode to unwrap and remove
 */
function $unwrapNode(node) {
  $rewindSiblingCaret($getSiblingCaret(node, 'next')).splice(1, node.getChildren());
}

/**
 * A wrapper that creates bound functions and methods for the
 * StateConfig to save some boilerplate when defining methods
 * or exporting only the accessors from your modules rather
 * than exposing the StateConfig directly.
 */

/**
 * EXPERIMENTAL
 *
 * A convenience interface for working with {@link $getState} and
 * {@link $setState}.
 *
 * @param stateConfig The stateConfig to wrap with convenience functionality
 * @returns a StateWrapper
 */
function makeStateWrapper(stateConfig) {
  const $get = node => $getState(node, stateConfig);
  const $set = (node, valueOrUpdater) => $setState(node, stateConfig, valueOrUpdater);
  return {
    $get,
    $set,
    accessors: [$get, $set],
    makeGetterMethod: () => function $getter() {
      return $get(this);
    },
    makeSetterMethod: () => function $setter(valueOrUpdater) {
      return $set(this, valueOrUpdater);
    },
    stateConfig
  };
}

/**
 * Inserts a new paragraph before a container node when the cursor moves outside the container element
 *
 * Intended for use ArrowLeft/ArrowUp keyboard handlers to allow the user to break out
 * of a container node by creating a new paragraph before it.
 *
 * A paragraph is inserted if that the cursor is positioned at the beginning inside the container,
 * and the container itself is the first element in the document and has no preceding sibling
 *
 * When a paragraph is inserted the selection is moved to it and, if the
 * triggering keyboard event is provided, its default action is prevented so
 * the browser does not additionally move the selection. Relying on the native
 * caret movement is not portable: Chromium moves into the freshly inserted
 * paragraph while Firefox leaves the caret inside the container.
 *
 * @param $isContainerNode - Type guard identifying the container node type to escape from.
 * @param event - The keyboard event that triggered the escape, if any. Its
 *   default action is prevented when a paragraph is inserted.
 * @returns `true` if a paragraph was inserted, `false` otherwise.
 */
function $onEscapeUp($isContainerNode, event) {
  const selection = $getSelection();
  if ($isRangeSelection(selection) && selection.isCollapsed()) {
    const containerNode = $findMatchingParent(selection.anchor.getNode(), $isContainerNode);
    if (containerNode) {
      const parent = containerNode.getParent();
      if (parent !== null && parent.getFirstChild() === containerNode && $isAtStartOfNode(selection.anchor, containerNode)) {
        containerNode.insertBefore($createParagraphNode()).selectEnd();
        if (event) {
          event.preventDefault();
        }
        return true;
      }
    }
  }
  return false;
}

/**
 * Inserts a new paragraph after a container node when the cursor moves outside the container element
 *
 * Intended for use ArrowRight/ArrowDown keyboard handlers to allow the user to break out
 * of a container node by creating a new paragraph after it.
 *
 * A paragraph is inserted if that the cursor is positioned at the ending inside the container,
 * and the container itself is the last element in the document and has no next sibling
 *
 * When a paragraph is inserted the selection is moved to it and, if the
 * triggering keyboard event is provided, its default action is prevented so
 * the browser does not additionally move the selection. Relying on the native
 * caret movement is not portable: Chromium moves into the freshly inserted
 * paragraph while Firefox leaves the caret inside the container.
 *
 * @param $isContainerNode - Type guard identifying the container node type to escape from.
 * @param event - The keyboard event that triggered the escape, if any. Its
 *   default action is prevented when a paragraph is inserted.
 * @returns `true` if a paragraph was inserted, `false` otherwise.
 */
function $onEscapeDown($isContainerNode, event) {
  const selection = $getSelection();
  if ($isRangeSelection(selection) && selection.isCollapsed()) {
    const containerNode = $findMatchingParent(selection.anchor.getNode(), $isContainerNode);
    if (containerNode) {
      const parent = containerNode.getParent();
      if (parent !== null && parent.getLastChild() === containerNode && $isAtEndOfNode(selection.anchor, containerNode)) {
        containerNode.insertAfter($createParagraphNode()).selectEnd();
        if (event) {
          event.preventDefault();
        }
        return true;
      }
    }
  }
  return false;
}

/**
 * Whether the collapsed `point` sits at the very start of `node`'s content —
 * on its first descendant (or on the empty node itself) at offset 0. Shared by
 * {@link $onEscapeUp} and slot-aware variants so the "at the leading edge of a
 * container" test stays in one place.
 */
function $isAtStartOfNode(point, node) {
  return $isAtEdgeOfElement(point, node, 'previous');
}

/**
 * Whether the collapsed `point` sits at the very end of `node`'s content — on
 * its last descendant (or on the empty node itself) at that node's end. Shared
 * by {@link $onEscapeDown} and slot-aware variants so the "at the trailing edge
 * of a container" test stays in one place.
 */
function $isAtEndOfNode(point, node) {
  return $isAtEdgeOfElement(point, node, 'next');
}

export { $descendantsMatching, $dfs, $dfsIterator, $dfsWithSlots, $dfsWithSlotsIterator, $filter, $firstToLastIterator, $getAdjacentCaret, $getDepth, $getNearestBlockElementAncestorOrThrow, $getNearestNodeOfType, $getNextRightPreorderNode, $getNextSiblingOrParentSibling, $handleIndentAndOutdent, $insertFirst, $insertNodeIntoLeaf, $insertNodeToNearestRoot, $isAtEndOfNode, $isAtStartOfNode, $isBlockFullySelected, $isEditorIsNestedEditor, $lastToFirstIterator, $onEscapeDown, $onEscapeUp, $restoreEditorState, $reverseDfs, $reverseDfsIterator, $reverseDfsWithSlots, $reverseDfsWithSlotsIterator, $unwrapAndFilterDescendants, $unwrapNode, $wrapNodeInElement, calculateZoomLevel, dedupeSelectionRects, eventFiles, getScrollParent, isMimeType, makeStateWrapper, markSelection, mediaFileReader, objectKlassEquals, mlcPositionNodeOnRange as positionNodeOnRange, registerNestedElementResolver, selectionAlwaysOnDisplay };
