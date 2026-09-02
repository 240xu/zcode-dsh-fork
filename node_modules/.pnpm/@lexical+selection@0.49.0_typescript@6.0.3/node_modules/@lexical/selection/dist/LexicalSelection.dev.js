/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

var lexical = require('lexical');

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

function getDOMTextNode(element) {
  let node = element;
  while (node != null) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node;
    }
    node = node.firstChild;
  }
  return null;
}
function getDOMIndexWithinParent(node) {
  const parent = node.parentNode;
  if (parent == null) {
    throw new Error('Should never happen');
  }
  return [parent, Array.from(parent.childNodes).indexOf(node)];
}

/**
 * Creates a selection range for the DOM.
 * @param editor - The lexical editor.
 * @param anchorNode - The anchor node of a selection.
 * @param _anchorOffset - The amount of space offset from the anchor to the focus.
 * @param focusNode - The current focus.
 * @param _focusOffset - The amount of space offset from the focus to the anchor.
 * @returns The range of selection for the DOM that was created.
 */
function createDOMRange(editor, anchorNode, _anchorOffset, focusNode, _focusOffset) {
  const anchorKey = anchorNode.getKey();
  const focusKey = focusNode.getKey();
  // Resolve through the editor's own document so iframe / shadow-mounted
  // editors don't end up with a Range bound to the wrong realm.
  const range = lexical.getRootOwnerDocument(editor.getRootElement()).createRange();
  let anchorDOM = editor.getElementByKey(anchorKey);
  let focusDOM = editor.getElementByKey(focusKey);
  let anchorOffset = _anchorOffset;
  let focusOffset = _focusOffset;
  if (lexical.$isTextNode(anchorNode)) {
    anchorDOM = getDOMTextNode(anchorDOM);
  }
  if (lexical.$isTextNode(focusNode)) {
    focusDOM = getDOMTextNode(focusDOM);
  }
  if (anchorNode === undefined || focusNode === undefined || anchorDOM === null || focusDOM === null) {
    return null;
  }
  if (anchorDOM.nodeName === 'BR') {
    [anchorDOM, anchorOffset] = getDOMIndexWithinParent(anchorDOM);
  }
  if (focusDOM.nodeName === 'BR') {
    [focusDOM, focusOffset] = getDOMIndexWithinParent(focusDOM);
  }
  const firstChild = anchorDOM.firstChild;
  if (anchorDOM === focusDOM && firstChild != null && firstChild.nodeName === 'BR' && anchorOffset === 0 && focusOffset === 0) {
    focusOffset = 1;
  }
  try {
    range.setStart(anchorDOM, anchorOffset);
    range.setEnd(focusDOM, focusOffset);
  } catch (_e) {
    return null;
  }
  if (range.collapsed && (anchorOffset !== focusOffset || anchorKey !== focusKey)) {
    // Range is backwards, we need to reverse it
    range.setStart(focusDOM, focusOffset);
    range.setEnd(anchorDOM, anchorOffset);
  }
  return range;
}

/**
 * Creates DOMRects, generally used to help the editor find a specific location on the screen.
 * @param editor - The lexical editor
 * @param range - A fragment of a document that can contain nodes and parts of text nodes.
 * @returns The selectionRects as an array.
 */
function createRectsFromDOMRange(editor, range) {
  const rootElement = editor.getRootElement();
  if (rootElement === null) {
    return [];
  }
  const rootRect = rootElement.getBoundingClientRect();
  const computedStyle = getComputedStyle(rootElement);
  const rootPadding = parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight);
  const selectionRects = Array.from(range.getClientRects());
  let selectionRectsLength = selectionRects.length;
  //sort rects from top left to bottom right.
  selectionRects.sort((a, b) => {
    const top = a.top - b.top;
    // Some rects match position closely, but not perfectly,
    // so we give a 3px tolerance.
    if (Math.abs(top) <= 3) {
      return a.left - b.left;
    }
    return top;
  });
  let prevRect;
  for (let i = 0; i < selectionRectsLength; i++) {
    const selectionRect = selectionRects[i];
    // Exclude rects that overlap preceding Rects in the sorted list.
    const isOverlappingRect = prevRect && prevRect.top <= selectionRect.top && prevRect.top + prevRect.height > selectionRect.top && prevRect.left + prevRect.width > selectionRect.left;
    // Exclude selections that span the entire element
    const selectionSpansElement = selectionRect.width + rootPadding === rootRect.width;
    if (isOverlappingRect || selectionSpansElement) {
      selectionRects.splice(i--, 1);
      selectionRectsLength--;
      continue;
    }
    prevRect = selectionRect;
  }
  return selectionRects;
}

/**
 * Serializes a style object into a CSS declaration string, the inverse of
 * {@link getStyleObjectFromCSS}.
 * @param styles - An object mapping CSS property names to their values.
 * @returns A CSS string of the form `prop: value;` for each entry, concatenated together.
 */
function getCSSFromStyleObject(styles) {
  let css = '';
  for (const style in styles) {
    if (style) {
      css += `${style}: ${styles[style]};`;
    }
  }
  return css;
}

/**
 * Gets the computed DOM styles of the element.
 * @param element - The node to check the styles for.
 * @returns the computed styles of the element or null if there is no DOM element or no default view for the document.
 */
function $getComputedStyleForElement(element) {
  const editor = lexical.$getEditor();
  const domElement = editor.getElementByKey(element.getKey());
  if (domElement === null) {
    return null;
  }
  const view = domElement.ownerDocument.defaultView;
  if (view === null) {
    return null;
  }
  return view.getComputedStyle(domElement);
}

/**
 * Gets the computed DOM styles of the parent of the node.
 * @param node - The node to check its parent's styles for.
 * @returns the computed styles of the node or null if there is no DOM element or no default view for the document.
 */
function $getComputedStyleForParent(node) {
  const parent = lexical.$isRootNode(node) ? node : node.getParentOrThrow();
  return $getComputedStyleForElement(parent);
}

/**
 * Determines whether a node's parent is RTL.
 * @param node - The node to check whether it is RTL.
 * @returns whether the node is RTL.
 */
function $isParentRTL(node) {
  const styles = $getComputedStyleForParent(node);
  return styles !== null && styles.direction === 'rtl';
}

/**
 * Generally used to append text content to HTML and JSON. Grabs the text content and "slices"
 * it to be generated into the new TextNode.
 * @param selection - The selection containing the node whose TextNode is to be edited.
 * @param textNode - The TextNode to be edited.
 * @param mutates - 'clone' to return a clone before mutating, 'self' to update in-place
 * @returns The updated TextNode or clone.
 */
function $sliceSelectedTextNodeContent(selection, textNode, mutates = 'self') {
  const anchorAndFocus = selection.getStartEndPoints();
  if (textNode.isSelected(selection) && !lexical.$isTokenOrSegmented(textNode) && anchorAndFocus !== null) {
    const [anchor, focus] = anchorAndFocus;
    const isBackward = selection.isBackward();
    const anchorNode = anchor.getNode();
    const focusNode = focus.getNode();
    const isAnchor = textNode.is(anchorNode);
    const isFocus = textNode.is(focusNode);
    if (isAnchor || isFocus) {
      const [anchorOffset, focusOffset] = lexical.$getCharacterOffsets(selection);
      const isSame = anchorNode.is(focusNode);
      const isFirst = textNode.is(isBackward ? focusNode : anchorNode);
      const isLast = textNode.is(isBackward ? anchorNode : focusNode);
      let startOffset = 0;
      let endOffset = undefined;
      if (isSame) {
        startOffset = anchorOffset > focusOffset ? focusOffset : anchorOffset;
        endOffset = anchorOffset > focusOffset ? anchorOffset : focusOffset;
      } else if (isFirst) {
        const offset = isBackward ? focusOffset : anchorOffset;
        startOffset = offset;
        endOffset = undefined;
      } else if (isLast) {
        const offset = isBackward ? anchorOffset : focusOffset;
        startOffset = 0;
        endOffset = offset;
      }

      // NOTE: This mutates __text directly because the primary use case is to
      // modify a $cloneWithProperties node that should never be added
      // to the EditorState so we must not call getWritable via setTextContent
      const text = textNode.__text.slice(startOffset, endOffset);
      if (text !== textNode.__text) {
        if (mutates === 'clone') {
          textNode = lexical.$cloneWithPropertiesEphemeral(textNode);
        }
        textNode.__text = text;
      }
    }
  }
  return textNode;
}

/**
 * Determines if the current selection is at the end of the node.
 * @param point - The point of the selection to test.
 * @returns true if the provided point offset is in the last possible position, false otherwise.
 */
function $isAtNodeEnd(point) {
  if (point.type === 'text') {
    return point.offset === point.getNode().getTextContentSize();
  }
  const node = point.getNode();
  if (!lexical.$isElementNode(node)) {
    formatDevErrorMessage(`isAtNodeEnd: node must be a TextNode or ElementNode`);
  }
  return point.offset === node.getChildrenSize();
}

/**
 * Trims text from a node in order to shorten it, eg. to enforce a text's max length. If it deletes text
 * that is an ancestor of the anchor then it will leave 2 indents, otherwise, if no text content exists, it deletes
 * the TextNode. It will move the focus to either the end of any left over text or beginning of a new TextNode.
 * @param editor - The lexical editor.
 * @param anchor - The anchor of the current selection, where the selection should be pointing.
 * @param delCount - The amount of characters to delete. Useful as a dynamic variable eg. textContentSize - maxLength;
 */
function $trimTextContentFromAnchor(editor, anchor, delCount) {
  // Work from the current selection anchor point
  let currentNode = anchor.getNode();
  let remaining = delCount;
  if (lexical.$isElementNode(currentNode)) {
    const descendantNode = currentNode.getDescendantByIndex(anchor.offset);
    if (descendantNode !== null) {
      currentNode = descendantNode;
    }
  }
  while (remaining > 0 && currentNode !== null) {
    if (lexical.$isElementNode(currentNode)) {
      // Annotation breaks a circular inference through the loop (TS7022),
      // remove when the deprecated generic signatures from #8661 are removed
      const lastDescendant = currentNode.getLastDescendant();
      if (lastDescendant !== null) {
        currentNode = lastDescendant;
      }
    }
    // Annotation breaks a circular inference through the loop (TS7022),
    // remove when the deprecated generic signatures from #8661 are removed
    let nextNode = currentNode.getPreviousSibling();
    let additionalElementWhitespace = 0;
    if (nextNode === null) {
      let parent = currentNode.getParentOrThrow();
      // Annotation breaks a circular inference through the loop (TS7022),
      // remove when the deprecated generic signatures from #8661 are removed
      let parentSibling = parent.getPreviousSibling();
      while (parentSibling === null) {
        parent = parent.getParent();
        if (parent === null) {
          nextNode = null;
          break;
        }
        parentSibling = parent.getPreviousSibling();
      }
      if (parent !== null) {
        additionalElementWhitespace = parent.isInline() ? 0 : 2;
        nextNode = parentSibling;
      }
    }
    let text = currentNode.getTextContent();
    // If the text is empty, we need to consider adding in two line breaks to match
    // the content if we were to get it from its parent.
    if (text === '' && lexical.$isElementNode(currentNode) && !currentNode.isInline()) {
      // TODO: should this be handled in core?
      text = '\n\n';
    }
    const currentNodeSize = text.length;
    if (!lexical.$isTextNode(currentNode) || remaining >= currentNodeSize) {
      const parent = currentNode.getParent();
      currentNode.remove();
      if (parent != null && parent.getChildrenSize() === 0 && !lexical.$isRootNode(parent)) {
        parent.remove();
      }
      remaining -= currentNodeSize + additionalElementWhitespace;
      currentNode = nextNode;
    } else {
      const key = currentNode.getKey();
      // See if we can just revert it to what was in the last editor state
      const prevTextContent = editor.read('latest', () => {
        const prevNode = lexical.$getNodeByKey(key);
        if (lexical.$isTextNode(prevNode) && prevNode.isSimpleText()) {
          return prevNode.getTextContent();
        }
        return null;
      });
      const offset = currentNodeSize - remaining;
      const slicedText = text.slice(0, offset);
      if (prevTextContent !== null && prevTextContent !== text) {
        const prevSelection = lexical.$getPreviousSelection();
        let target = currentNode;
        if (!currentNode.isSimpleText()) {
          const textNode = lexical.$createTextNode(prevTextContent);
          currentNode.replace(textNode);
          target = textNode;
        } else {
          currentNode.setTextContent(prevTextContent);
        }
        if (lexical.$isRangeSelection(prevSelection) && prevSelection.isCollapsed()) {
          const prevOffset = prevSelection.anchor.offset;
          target.select(prevOffset, prevOffset);
        }
      } else if (currentNode.isSimpleText()) {
        // Split text
        const isSelected = anchor.key === key;
        let anchorOffset = anchor.offset;
        // Move offset to end if it's less than the remaining number, otherwise
        // we'll have a negative splitStart.
        if (anchorOffset < remaining) {
          anchorOffset = currentNodeSize;
        }
        const splitStart = isSelected ? anchorOffset - remaining : 0;
        const splitEnd = isSelected ? anchorOffset : offset;
        if (isSelected && splitStart === 0) {
          const [excessNode] = currentNode.splitText(splitStart, splitEnd);
          excessNode.remove();
        } else {
          const [, excessNode] = currentNode.splitText(splitStart, splitEnd);
          excessNode.remove();
        }
      } else {
        const textNode = lexical.$createTextNode(slicedText);
        currentNode.replace(textNode);
      }
      remaining = 0;
    }
  }
}

/**
 * @deprecated node styles are parsed on demand and not cached eternally
 */
const $addNodeStyle = warnOnlyOnce('$addNodeStyle is a deprecated no-op and calls should be removed');

/**
 * Applies the provided styles to the given TextNode, ElementNode, or
 * collapsed RangeSelection.
 *
 * @param target - The TextNode, ElementNode, or collapsed RangeSelection to apply the styles to
 * @param patch - The patch to apply, which can include multiple styles. \\{CSSProperty: value\\} . Can also accept a function that returns the new property value.
 */
function $patchStyle(target, patch) {
  if (!(lexical.$isRangeSelection(target) ? target.isCollapsed() : lexical.$isTextNode(target) || lexical.$isElementNode(target))) {
    formatDevErrorMessage(`$patchStyle must only be called with a TextNode, ElementNode, or collapsed RangeSelection`);
  }
  const prevStyles = lexical.getStyleObjectFromCSS(lexical.$isRangeSelection(target) ? target.style : lexical.$isTextNode(target) ? target.getStyle() : target.getTextStyle());
  const newStyles = Object.entries(patch).reduce((styles, [key, value]) => {
    if (typeof value === 'function') {
      styles[key] = value(prevStyles[key], target);
    } else if (value === null) {
      delete styles[key];
    } else {
      styles[key] = value;
    }
    return styles;
  }, {
    ...prevStyles
  });
  const newCSSText = getCSSFromStyleObject(newStyles);
  if (lexical.$isRangeSelection(target) || lexical.$isTextNode(target)) {
    target.setStyle(newCSSText);
  } else {
    target.setTextStyle(newCSSText);
  }
}

/**
 * Applies the provided styles to the TextNodes in the provided Selection.
 * Will update partially selected TextNodes by splitting the TextNode and applying
 * the styles to the appropriate one.
 * @param selection - The selected node(s) to update.
 * @param patch - The patch to apply, which can include multiple styles. \\{CSSProperty: value\\} . Can also accept a function that returns the new property value.
 */
function $patchStyleText(selection, patch) {
  if (lexical.$isRangeSelection(selection) && selection.isCollapsed()) {
    $patchStyle(selection, patch);
    const emptyNode = selection.anchor.getNode();
    if (lexical.$isElementNode(emptyNode) && emptyNode.isEmpty()) {
      $patchStyle(emptyNode, patch);
    }
  }
  $forEachSelectedTextNode(textNode => {
    $patchStyle(textNode, patch);
  });
  const nodes = selection.getNodes();
  if (nodes.length > 0) {
    const patchedElementKeys = new Set();
    for (const node of nodes) {
      if (!lexical.$isElementNode(node) || !node.canBeEmpty() || node.getChildrenSize() !== 0) {
        continue;
      }
      const key = node.getKey();
      if (patchedElementKeys.has(key)) {
        continue;
      }
      patchedElementKeys.add(key);
      $patchStyle(node, patch);
    }
  }
}
function $forEachSelectedTextNode(fn) {
  const selection = lexical.$getSelection();
  if (!selection) {
    return;
  }
  const slicedTextNodes = new Map();
  const getSliceIndices = node => slicedTextNodes.get(node.getKey()) || [0, node.getTextContentSize()];
  if (lexical.$isRangeSelection(selection)) {
    for (const slice of lexical.$caretRangeFromSelection(selection).getTextSlices()) {
      if (slice) {
        slicedTextNodes.set(slice.caret.origin.getKey(), slice.getSliceIndices());
      }
    }
  }
  const selectedNodes = selection.getNodes();
  for (const selectedNode of selectedNodes) {
    if (!(lexical.$isTextNode(selectedNode) && selectedNode.canHaveFormat())) {
      continue;
    }
    const [startOffset, endOffset] = getSliceIndices(selectedNode);
    // No actual text is selected, so do nothing.
    if (endOffset === startOffset) {
      continue;
    }

    // The entire node is selected or a token/segment, so just format it
    if (lexical.$isTokenOrSegmented(selectedNode) || startOffset === 0 && endOffset === selectedNode.getTextContentSize()) {
      fn(selectedNode);
    } else {
      // The node is partially selected, so split it into two or three nodes
      // and style the selected one.
      const splitNodes = selectedNode.splitText(startOffset, endOffset);
      const replacement = splitNodes[startOffset === 0 ? 0 : 1];
      fn(replacement);
    }
  }
  // Prior to NodeCaret #7046 this would have been a side-effect
  // so we do this for test compatibility.
  // TODO: we may want to consider simplifying by removing this
  if (lexical.$isRangeSelection(selection) && selection.anchor.type === 'text' && selection.focus.type === 'text' && selection.anchor.key === selection.focus.key) {
    $ensureForwardRangeSelection(selection);
  }
}

/**
 * Ensure that the given RangeSelection is not backwards. If it
 * is backwards, then the anchor and focus points will be swapped
 * in-place. Ensuring that the selection is a writable RangeSelection
 * is the responsibility of the caller (e.g. in a read-only context
 * you will want to clone $getSelection() before using this).
 *
 * @param selection a writable RangeSelection
 */
function $ensureForwardRangeSelection(selection) {
  if (selection.isBackward()) {
    const {
      anchor,
      focus
    } = selection;
    // stash for the in-place swap
    const {
      key,
      offset,
      type
    } = anchor;
    anchor.set(focus.key, focus.offset, focus.type);
    focus.set(key, offset, type);
  }
}

function $copyBlockFormatIndent(srcNode, destNode) {
  const format = srcNode.getFormatType();
  const indent = srcNode.getIndent();
  if (format !== destNode.getFormatType()) {
    destNode.setFormat(format);
  }
  if (indent !== destNode.getIndent()) {
    destNode.setIndent(indent);
  }
}

/**
 * Determine whether a point sits at the leading ('previous') or trailing
 * ('next') edge of `element`'s content — i.e. there is no content between the
 * point and that edge of the element.
 *
 * This is the caret-based generalization of {@link $isAtNodeEnd}. An empty
 * `element` is considered to be at both of its edges. `@lexical/utils`
 * re-exports this as the direction-specific `$isAtStartOfNode` /
 * `$isAtEndOfNode` helpers.
 *
 * @param point - The point to test.
 * @param element - The ancestor element whose edge is tested.
 * @param direction - 'previous' for the start of `element`, 'next' for the end.
 */
function $isAtEdgeOfElement(point, element, direction) {
  // An extendable TextPointCaret has text remaining in `direction`, so the
  // point is in the middle of a TextNode rather than at the element edge.
  let caret = lexical.$caretFromPoint(point, direction);
  if (lexical.$isExtendableTextPointCaret(caret)) {
    return false;
  }
  // Walk up towards element: the point is at the edge only when nothing
  // precedes it in `direction` at every level up to element. The match is read
  // from getParentAtCaret (origin.getParent()) rather than from a CaretRange
  // iteration, because iterating ascends via getParentCaret, which stops at the
  // document root and at shadow-root/slot boundaries — so it would never yield
  // `element` when `element` is itself such a boundary (e.g. a named slot's
  // value, a shadow root).
  for (; caret; caret = caret.getParentCaret()) {
    const parent = caret.getParentAtCaret();
    if (!parent || caret.getNodeAtCaret()) {
      return false;
    }
    if (element.is(parent)) {
      return true;
    }
  }
  return false;
}

/**
 * Determine whether a point sits at the edge of a block in the given
 * direction: 'previous' for the start of the block, 'next' for the end.
 *
 * Unlike {@link $isAtEdgeOfElement}, an empty block is treated as not being at
 * the edge: when an ElementNode is empty it's not possible to distinguish if
 * the selection's intent is the entire block or the edge so we consider it to
 * be the entire block.
 */
function $isPointAtBlockEdge(point, block, direction) {
  const node = point.getNode();
  if (lexical.$isElementNode(node) && node.isEmpty()) {
    return false;
  }
  return $isAtEdgeOfElement(point, block, direction);
}

/**
 * Converts all nodes in the selection that are of one block type to another.
 * @param selection - The selected blocks to be converted.
 * @param $createElement - The function that creates the node. eg. $createParagraphNode.
 * @param $afterCreateElement - The function that updates the new node based on the previous one ($copyBlockFormatIndent by default)
 */
function $setBlocksType(selection, $createElement, $afterCreateElement = $copyBlockFormatIndent) {
  if (!selection) {
    return;
  }
  // Selections tend to not include their containing blocks so we effectively
  // expand it here
  const anchorAndFocus = selection.getStartEndPoints();
  let skipFocus = false;
  let focusBlock = null;
  const blockMap = new Map();
  if (anchorAndFocus) {
    const [anchor, focus] = anchorAndFocus;
    const anchorBlock = lexical.$findMatchingParent(anchor.getNode(), lexical.INTERNAL_$isBlock);
    focusBlock = lexical.$findMatchingParent(focus.getNode(), lexical.INTERNAL_$isBlock);
    // The focus is the moving edge of the selection, travelling in `direction`
    // (towards the end of the document for a forward selection). When a
    // selection overshoots, its focus lands at the leading edge of focusBlock
    // in that direction — the edge opposite to travel — so focusBlock holds
    // none of the selection and is skipped.
    const direction = selection.isBackward() ? 'previous' : 'next';
    skipFocus = lexical.$isElementNode(focusBlock) && !focusBlock.is(anchorBlock) && $isPointAtBlockEdge(focus, focusBlock, lexical.flipDirection(direction));
    if (lexical.$isElementNode(anchorBlock)) {
      blockMap.set(anchorBlock.getKey(), anchorBlock);
    }
    if (lexical.$isElementNode(focusBlock) && !skipFocus) {
      blockMap.set(focusBlock.getKey(), focusBlock);
    }
  }
  for (const node of selection.getNodes()) {
    if (lexical.$isElementNode(node) && lexical.INTERNAL_$isBlock(node)) {
      if (skipFocus && node.is(focusBlock)) {
        continue;
      }
      blockMap.set(node.getKey(), node);
    } else if (!anchorAndFocus) {
      const ancestorBlock = lexical.$findMatchingParent(node, lexical.INTERNAL_$isBlock);
      if (lexical.$isElementNode(ancestorBlock)) {
        blockMap.set(ancestorBlock.getKey(), ancestorBlock);
      }
    }
  }
  // Selection remapping is delegated to LexicalNode.replace (and the
  // ListItemNode.replace override): both remap an element-anchored point
  // on the replaced block to {key: replacement, offset: prevSize + offset}.
  for (const prevNode of blockMap.values()) {
    const element = $createElement();
    $afterCreateElement(prevNode, element);
    prevNode.replace(element, true);
  }
}
function isPointAttached(point) {
  return point.getNode().isAttached();
}
function $removeParentEmptyElements(startingNode) {
  let node = startingNode;
  while (node !== null && !lexical.$isRootOrShadowRoot(node)) {
    const latest = node.getLatest();
    // Annotation breaks a circular inference through the loop (TS7022),
    // remove when the deprecated generic signatures from #8661 are removed
    const parentNode = node.getParent();
    if (latest.getChildrenSize() === 0) {
      node.remove(true);
    }
    node = parentNode;
  }
}

/**
 * @deprecated In favor of $setBlockTypes
 * Wraps all nodes in the selection into another node of the type returned by createElement.
 * @param selection - The selection of nodes to be wrapped.
 * @param createElement - A function that creates the wrapping ElementNode. eg. $createParagraphNode.
 * @param wrappingElement - An element to append the wrapped selection and its children to.
 */
function $wrapNodes(selection, createElement, wrappingElement = null) {
  const anchorAndFocus = selection.getStartEndPoints();
  const anchor = anchorAndFocus ? anchorAndFocus[0] : null;
  const nodes = selection.getNodes();
  const nodesLength = nodes.length;
  if (anchor !== null && (nodesLength === 0 || nodesLength === 1 && anchor.type === 'element' && anchor.getNode().getChildrenSize() === 0)) {
    const target = anchor.type === 'text' ? anchor.getNode().getParentOrThrow() : anchor.getNode();
    const children = target.getChildren();
    let element = createElement();
    element.setFormat(target.getFormatType());
    element.setIndent(target.getIndent());
    children.forEach(child => element.append(child));
    if (wrappingElement) {
      element = wrappingElement.append(element);
    }
    target.replace(element);
    return;
  }
  let topLevelNode = null;
  let descendants = [];
  for (let i = 0; i < nodesLength; i++) {
    const node = nodes[i];
    // Determine whether wrapping has to be broken down into multiple chunks. This can happen if the
    // user selected multiple Root-like nodes that have to be treated separately as if they are
    // their own branch. I.e. you don't want to wrap a whole table, but rather the contents of each
    // of each of the cell nodes.
    if (lexical.$isRootOrShadowRoot(node)) {
      $wrapNodesImpl(selection, descendants, descendants.length, createElement, wrappingElement);
      descendants = [];
      topLevelNode = node;
    } else if (topLevelNode === null || topLevelNode !== null && lexical.$hasAncestor(node, topLevelNode)) {
      descendants.push(node);
    } else {
      $wrapNodesImpl(selection, descendants, descendants.length, createElement, wrappingElement);
      descendants = [node];
    }
  }
  $wrapNodesImpl(selection, descendants, descendants.length, createElement, wrappingElement);
}

/**
 * Wraps each node into a new ElementNode.
 * @param selection - The selection of nodes to wrap.
 * @param nodes - An array of nodes, generally the descendants of the selection.
 * @param nodesLength - The length of nodes.
 * @param createElement - A function that creates the wrapping ElementNode. eg. $createParagraphNode.
 * @param wrappingElement - An element to wrap all the nodes into.
 * @returns
 */
function $wrapNodesImpl(selection, nodes, nodesLength, createElement, wrappingElement = null) {
  if (nodes.length === 0) {
    return;
  }
  const firstNode = nodes[0];
  const elementMapping = new Map();
  const elements = [];
  // The below logic is to find the right target for us to
  // either insertAfter/insertBefore/append the corresponding
  // elements to. This is made more complicated due to nested
  // structures.
  const firstNodeBlock = lexical.$isElementNode(firstNode) ? firstNode : firstNode.getParentOrThrow();
  let target = firstNodeBlock.isInline() ? firstNodeBlock.getParentOrThrow() : firstNodeBlock;
  let targetIsPrevSibling = false;
  while (target !== null) {
    // Annotation breaks a circular inference through the loop (TS7022),
    // remove when the deprecated generic signatures from #8661 are removed
    const prevSibling = target.getPreviousSibling();
    if (prevSibling !== null) {
      target = prevSibling;
      targetIsPrevSibling = true;
      break;
    }
    target = target.getParentOrThrow();
    if (lexical.$isRootOrShadowRoot(target)) {
      break;
    }
  }
  const emptyElements = new Set();

  // Find any top level empty elements
  for (let i = 0; i < nodesLength; i++) {
    const node = nodes[i];
    if (lexical.$isElementNode(node) && node.getChildrenSize() === 0) {
      emptyElements.add(node.getKey());
    }
  }
  const movedNodes = new Set();

  // Move out all leaf nodes into our elements array.
  // If we find a top level empty element, also move make
  // an element for that.
  for (let i = 0; i < nodesLength; i++) {
    const node = nodes[i];
    let parent = node.getParent();
    if (parent !== null && parent.isInline()) {
      parent = parent.getParent();
    }
    if (parent !== null && lexical.$isLeafNode(node) && !movedNodes.has(node.getKey())) {
      const parentKey = parent.getKey();
      if (elementMapping.get(parentKey) === undefined) {
        const targetElement = createElement();
        targetElement.setFormat(parent.getFormatType());
        targetElement.setIndent(parent.getIndent());
        elements.push(targetElement);
        elementMapping.set(parentKey, targetElement);
        // Move node and its siblings to the new
        // element.
        const children = parent.getChildren();
        targetElement.splice(targetElement.getChildrenSize(), 0, children);
        for (const child of children) {
          movedNodes.add(child.getKey());
          if (lexical.$isElementNode(child)) {
            // Skip nested leaf nodes if the parent has already been moved
            for (const key of child.getChildrenKeys()) {
              movedNodes.add(key);
            }
          }
        }
        $removeParentEmptyElements(parent);
      }
    } else if (emptyElements.has(node.getKey())) {
      if (!lexical.$isElementNode(node)) {
        formatDevErrorMessage(`Expected node in emptyElements to be an ElementNode`);
      }
      const targetElement = createElement();
      targetElement.setFormat(node.getFormatType());
      targetElement.setIndent(node.getIndent());
      elements.push(targetElement);
      node.remove(true);
    }
  }
  if (wrappingElement !== null) {
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      wrappingElement.append(element);
    }
  }
  let lastElement = null;

  // If our target is Root-like, let's see if we can re-adjust
  // so that the target is the first child instead.
  if (lexical.$isRootOrShadowRoot(target)) {
    if (targetIsPrevSibling) {
      if (wrappingElement !== null) {
        target.insertAfter(wrappingElement);
      } else {
        for (let i = elements.length - 1; i >= 0; i--) {
          const element = elements[i];
          target.insertAfter(element);
        }
      }
    } else {
      // Capture the narrowed type, the reassignment of target below would
      // otherwise widen it back to LexicalNode
      const rootTarget = target;
      const firstChild = rootTarget.getFirstChild();
      if (lexical.$isElementNode(firstChild)) {
        target = firstChild;
      }
      if (firstChild === null) {
        if (wrappingElement) {
          rootTarget.append(wrappingElement);
        } else {
          for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            rootTarget.append(element);
            lastElement = element;
          }
        }
      } else {
        if (wrappingElement !== null) {
          firstChild.insertBefore(wrappingElement);
        } else {
          for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            firstChild.insertBefore(element);
            lastElement = element;
          }
        }
      }
    }
  } else {
    if (wrappingElement) {
      target.insertAfter(wrappingElement);
    } else {
      for (let i = elements.length - 1; i >= 0; i--) {
        const element = elements[i];
        target.insertAfter(element);
        lastElement = element;
      }
    }
  }
  const prevSelection = lexical.$getPreviousSelection();
  if (lexical.$isRangeSelection(prevSelection) && isPointAttached(prevSelection.anchor) && isPointAttached(prevSelection.focus)) {
    lexical.$setSelection(prevSelection.clone());
  } else if (lastElement !== null) {
    lastElement.selectEnd();
  } else {
    selection.dirty = true;
  }
}

/**
 * Tests if the selection's parent element has vertical writing mode.
 * @param selection - The selection whose parent to test.
 * @returns true if the selection's parent has vertical writing mode (writing-mode: vertical-rl), false otherwise.
 */
function $isEditorVerticalOrientation(selection) {
  const computedStyle = $getComputedStyle(selection);
  return computedStyle !== null && computedStyle.writingMode === 'vertical-rl';
}

/**
 * Gets the computed DOM styles of the parent of the selection's anchor node.
 * @param selection - The selection to check the styles for.
 * @returns the computed styles of the node or null if there is no DOM element or no default view for the document.
 */
function $getComputedStyle(selection) {
  const anchorNode = selection.anchor.getNode();
  if (lexical.$isElementNode(anchorNode)) {
    return $getComputedStyleForElement(anchorNode);
  }
  return $getComputedStyleForParent(anchorNode);
}

/**
 * Determines if the default character selection should be overridden. Used with DecoratorNodes
 * @param selection - The selection whose default character selection may need to be overridden.
 * @param isBackward - Is the selection backwards (the focus comes before the anchor)?
 * @returns true if it should be overridden, false if not.
 */
function $shouldOverrideDefaultCharacterSelection(selection, isBackward) {
  const isVertical = $isEditorVerticalOrientation(selection);

  // In vertical writing mode, we adjust the direction for correct caret movement
  let adjustedIsBackward = isVertical ? !isBackward : isBackward;

  // In right-to-left writing mode, we invert the direction for correct caret movement
  if ($isParentElementRTL(selection)) {
    adjustedIsBackward = !adjustedIsBackward;
  }
  const focusCaret = lexical.$caretFromPoint(selection.focus, adjustedIsBackward ? 'previous' : 'next');
  if (lexical.$isExtendableTextPointCaret(focusCaret)) {
    return false;
  }
  // At an unmergeable TextNode boundary adjacent to another plain TextNode,
  // override so Lexical's modify() can pre-normalize across inline-grid/flex
  // spans (#7301). Restricted to unmergeable nodes to avoid disrupting
  // format-affinity at normal bold/italic boundaries.
  if (lexical.$isTextPointCaret(focusCaret) && !lexical.$isTabNode(focusCaret.origin) && focusCaret.origin.isUnmergeable()) {
    const sibling = focusCaret.getNodeAtCaret();
    if (lexical.$isTextNode(sibling) && !lexical.$isTabNode(sibling)) {
      return true;
    }
  }
  for (const nextCaret of lexical.$extendCaretToRange(focusCaret)) {
    if (lexical.$isChildCaret(nextCaret)) {
      return !nextCaret.origin.isInline();
    } else if (lexical.$isElementNode(nextCaret.origin)) {
      continue;
    } else if (lexical.$isDecoratorNode(nextCaret.origin)) {
      return true;
    }
    break;
  }
  return false;
}

/**
 * Moves the selection according to the arguments.
 * @param selection - The selected text or nodes.
 * @param isHoldingShift - Is the shift key being held down during the operation.
 * @param isBackward - Is the selection selected backwards (the focus comes before the anchor)?
 * @param granularity - The distance to adjust the current selection.
 */
function $moveCaretSelection(selection, isHoldingShift, isBackward, granularity) {
  selection.modify(isHoldingShift ? 'extend' : 'move', isBackward, granularity);
}

/**
 * Tests a parent element for right to left direction.
 * @param selection - The selection whose parent is to be tested.
 * @returns true if the selections' parent element has a direction of 'rtl' (right to left), false otherwise.
 */
function $isParentElementRTL(selection) {
  const computedStyle = $getComputedStyle(selection);
  return computedStyle !== null && computedStyle.direction === 'rtl';
}

/**
 * Moves selection by character according to arguments.
 * @param selection - The selection of the characters to move.
 * @param isHoldingShift - Is the shift key being held down during the operation.
 * @param isBackward - Is the selection backward (the focus comes before the anchor)?
 */
function $moveCharacter(selection, isHoldingShift, isBackward) {
  const isRTL = $isParentElementRTL(selection);
  const isVertical = $isEditorVerticalOrientation(selection);

  // In vertical-rl writing mode, arrow key directions need to be flipped
  // to match the visual flow of text (top to bottom, right to left)
  let adjustedIsBackward;
  if (isVertical) {
    // In vertical-rl mode, we need to completely invert the direction
    // Left arrow (backward) should move down (forward)
    // Right arrow (forward) should move up (backward)
    adjustedIsBackward = !isBackward;
  } else if (isRTL) {
    // In horizontal RTL mode, use the standard RTL behavior
    adjustedIsBackward = !isBackward;
  } else {
    // Standard LTR horizontal text
    adjustedIsBackward = isBackward;
  }

  // Apply the direction adjustment to move the caret
  $moveCaretSelection(selection, isHoldingShift, adjustedIsBackward, 'character');
}

/**
 * Returns the current value of a CSS property for Nodes, if set. If not set, it returns the defaultValue.
 * @param node - The node whose style value to get.
 * @param styleProperty - The CSS style property.
 * @param defaultValue - The default value for the property.
 * @returns The value of the property for node.
 */
function $getNodeStyleValueForProperty(node, styleProperty, defaultValue) {
  const css = node.getStyle();
  const styleObject = lexical.getStyleObjectFromCSS(css);
  if (styleObject !== null) {
    return styleObject[styleProperty] || defaultValue;
  }
  return defaultValue;
}

/**
 * Returns the current value of a CSS property for TextNodes in the Selection, if set. If not set, it returns the defaultValue.
 * If all TextNodes do not have the same value, it returns an empty string.
 * @param selection - The selection of TextNodes whose value to find.
 * @param styleProperty - The CSS style property.
 * @param defaultValue - The default value for the property, defaults to an empty string.
 * @returns The value of the property for the selected TextNodes.
 */
function $getSelectionStyleValueForProperty(selection, styleProperty, defaultValue = '') {
  let styleValue = null;
  const nodes = selection.getNodes();

  // The anchor/focus boundary handling below is specific to RangeSelection;
  // other selection types (e.g. table) style every node they contain.
  let startNode;
  let endNode;
  if (lexical.$isRangeSelection(selection)) {
    if (selection.isCollapsed() && selection.style !== '') {
      const styleObject = lexical.getStyleObjectFromCSS(selection.style);
      if (styleObject !== null && styleProperty in styleObject) {
        return styleObject[styleProperty];
      }
    }
    const {
      anchor,
      focus
    } = selection;
    const isBackward = selection.isBackward();
    const firstNode = isBackward ? focus.getNode() : anchor.getNode();
    const lastNode = isBackward ? anchor.getNode() : focus.getNode();
    const startOffset = isBackward ? focus.offset : anchor.offset;
    const endOffset = isBackward ? anchor.offset : focus.offset;
    // A boundary node contributes no styled text when the selection merely
    // touches its edge: the first node when the start offset is at its very
    // end, and the last node when the end offset is at its very beginning.
    if (lexical.$isTextNode(firstNode) && startOffset === firstNode.getTextContentSize()) {
      startNode = firstNode;
    }
    if (endOffset === 0) {
      endNode = lastNode;
    }
  }
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    // Skip the excluded boundary node for this position (startNode at the
    // head, endNode elsewhere); both are undefined when nothing is excluded.
    if (lexical.$isTextNode(node) && !node.is(i === 0 ? startNode : endNode)) {
      const nodeStyleValue = $getNodeStyleValueForProperty(node, styleProperty, defaultValue);
      if (styleValue === null) {
        styleValue = nodeStyleValue;
      } else if (styleValue !== nodeStyleValue) {
        // multiple text nodes are in the selection and they don't all
        // have the same style.
        styleValue = '';
        break;
      }
    }
  }
  return styleValue === null ? defaultValue : styleValue;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/** @deprecated moved to the `lexical` package */
const getStyleObjectFromCSS = lexical.getStyleObjectFromCSS;
/** @deprecated renamed to {@link $trimTextContentFromAnchor} by @lexical/eslint-plugin rules-of-lexical */
const trimTextContentFromAnchor = $trimTextContentFromAnchor;

exports.$cloneWithProperties = lexical.$cloneWithProperties;
exports.$selectAll = lexical.$selectAll;
exports.$addNodeStyle = $addNodeStyle;
exports.$copyBlockFormatIndent = $copyBlockFormatIndent;
exports.$ensureForwardRangeSelection = $ensureForwardRangeSelection;
exports.$forEachSelectedTextNode = $forEachSelectedTextNode;
exports.$getComputedStyleForElement = $getComputedStyleForElement;
exports.$getComputedStyleForParent = $getComputedStyleForParent;
exports.$getSelectionStyleValueForProperty = $getSelectionStyleValueForProperty;
exports.$isAtEdgeOfElement = $isAtEdgeOfElement;
exports.$isAtNodeEnd = $isAtNodeEnd;
exports.$isParentElementRTL = $isParentElementRTL;
exports.$isParentRTL = $isParentRTL;
exports.$moveCaretSelection = $moveCaretSelection;
exports.$moveCharacter = $moveCharacter;
exports.$patchStyleText = $patchStyleText;
exports.$setBlocksType = $setBlocksType;
exports.$shouldOverrideDefaultCharacterSelection = $shouldOverrideDefaultCharacterSelection;
exports.$sliceSelectedTextNodeContent = $sliceSelectedTextNodeContent;
exports.$trimTextContentFromAnchor = $trimTextContentFromAnchor;
exports.$wrapNodes = $wrapNodes;
exports.createDOMRange = createDOMRange;
exports.createRectsFromDOMRange = createRectsFromDOMRange;
exports.getCSSFromStyleObject = getCSSFromStyleObject;
exports.getStyleObjectFromCSS = getStyleObjectFromCSS;
exports.trimTextContentFromAnchor = trimTextContentFromAnchor;
