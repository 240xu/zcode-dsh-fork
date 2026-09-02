/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

var utils = require('@lexical/utils');
var lexical = require('lexical');
var extension = require('@lexical/extension');
var html = require('@lexical/html');

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
 * Checks the depth of listNode from the root node.
 * @param listNode - The ListNode to be checked.
 * @returns The depth of the ListNode.
 */
function $getListDepth(listNode) {
  let depth = 1;
  let parent = listNode.getParent();
  while (parent != null) {
    if ($isListItemNode(parent)) {
      const parentList = parent.getParent();
      if ($isListNode(parentList)) {
        depth++;
        parent = parentList.getParent();
        continue;
      }
      {
        formatDevErrorMessage(`A ListItemNode must have a ListNode for a parent.`);
      }
    }
    return depth;
  }
  return depth;
}

/**
 * Finds the nearest ancestral ListNode and returns it, throws an invariant if listItem is not a ListItemNode.
 * @param listItem - The node to be checked.
 * @returns The ListNode found.
 */
function $getTopListNode(listItem) {
  const parentList = listItem.getParent();
  if (!$isListNode(parentList)) {
    {
      formatDevErrorMessage(`A ListItemNode must have a ListNode for a parent.`);
    }
  }
  let list = parentList;
  let parent = parentList;
  while (parent !== null) {
    parent = parent.getParent();
    if ($isListNode(parent)) {
      list = parent;
    }
  }
  return list;
}

/**
 * A recursive Depth-First Search (Postorder Traversal) that finds all of a node's children
 * that are of type ListItemNode and returns them in an array.
 * @param node - The ListNode to start the search.
 * @returns An array containing all nodes of type ListItemNode found.
 */
// This should probably be $getAllChildrenOfType
function $getAllListItems(node) {
  let listItemNodes = [];
  const listChildren = node.getChildren().filter($isListItemNode);
  for (let i = 0; i < listChildren.length; i++) {
    const listItemNode = listChildren[i];
    const firstChild = listItemNode.getFirstChild();
    if ($isListNode(firstChild)) {
      listItemNodes = listItemNodes.concat($getAllListItems(firstChild));
    } else {
      listItemNodes.push(listItemNode);
    }
  }
  return listItemNodes;
}

/**
 * Checks to see if the passed node is a ListItemNode and has a ListNode as a child.
 * @param node - The node to be checked.
 * @returns true if the node is a ListItemNode and has a ListNode child, false otherwise.
 */
function $isNestedListNode(node) {
  return $isListItemNode(node) && $isListNode(node.getFirstChild());
}

/**
 * Takes a deeply nested ListNode or ListItemNode and traverses up the branch to delete the first
 * ancestral ListNode (which could be the root ListNode) or ListItemNode with siblings, essentially
 * bringing the deeply nested node up the branch once. Would remove sublist if it has siblings.
 * Should not break ListItem -> List -> ListItem chain as empty List/ItemNodes should be removed on .remove().
 * @param sublist - The nested ListNode or ListItemNode to be brought up the branch.
 */
function $removeHighestEmptyListParent(sublist) {
  // Nodes may be repeatedly indented, to create deeply nested lists that each
  // contain just one bullet.
  // Our goal is to remove these (empty) deeply nested lists. The easiest
  // way to do that is crawl back up the tree until we find a node that has siblings
  // (e.g. is actually part of the list contents) and delete that, or delete
  // the root of the list (if no list nodes have siblings.)
  let emptyListPtr = sublist;
  while (emptyListPtr.getNextSibling() == null && emptyListPtr.getPreviousSibling() == null) {
    const parent = emptyListPtr.getParent();
    if (parent == null || !($isListItemNode(parent) || $isListNode(parent))) {
      break;
    }
    emptyListPtr = parent;
  }
  emptyListPtr.remove();
}

/**
 * Calculates the start value for a new list created by splitting an existing list.
 */
function $getNewListStart(list, listItem) {
  return list.getStart() + listItem.getIndexWithinParent();
}

function $isSelectingEmptyListItem(anchorNode, nodes) {
  return $isListItemNode(anchorNode) && (nodes.length === 0 || nodes.length === 1 && anchorNode.is(nodes[0]) && anchorNode.getChildrenSize() === 0);
}

/**
 * Inserts a new ListNode. If the selection's anchor node is an empty ListItemNode and is a child of
 * the root/shadow root, it will replace the ListItemNode with a ListNode and the old ListItemNode.
 * Otherwise it will replace its parent with a new ListNode and re-insert the ListItemNode and any previous children.
 * If the selection's anchor node is not an empty ListItemNode, it will add a new ListNode or merge an existing ListNode,
 * unless the node is a leaf node, in which case it will attempt to find a ListNode up the branch and replace it with
 * a new ListNode, or create a new ListNode at the nearest root/shadow root.
 * @param listType - The type of list, "number" | "bullet" | "check".
 */
function $insertList(listType) {
  const selection = lexical.$getSelection();
  if (selection !== null) {
    let nodes = selection.getNodes();
    if (lexical.$isRangeSelection(selection)) {
      const [anchor] = selection.getStartEndPoints();
      const anchorNode = anchor.getNode();
      const anchorNodeParent = anchorNode.getParent();
      if (lexical.$isRootOrShadowRoot(anchorNode)) {
        const firstChild = anchorNode.getFirstChild();
        if (firstChild) {
          nodes = firstChild.selectStart().getNodes();
        } else {
          const paragraph = lexical.$createParagraphNode();
          anchorNode.append(paragraph);
          nodes = paragraph.select().getNodes();
        }
      } else if ($isSelectingEmptyListItem(anchorNode, nodes)) {
        const list = $createListNode(listType);
        if (lexical.$isRootOrShadowRoot(anchorNodeParent)) {
          anchorNode.replace(list);
          const listItem = $createListItemNode();
          if (lexical.$isElementNode(anchorNode)) {
            listItem.setFormat(anchorNode.getFormatType());
            listItem.setIndent(anchorNode.getIndent());
          }
          list.append(listItem);
        } else if ($isListItemNode(anchorNode)) {
          const parent = anchorNode.getParentOrThrow();
          append(list, parent.getChildren());
          parent.replace(list);
        }
        return;
      }
    }
    const handled = new Set();
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (lexical.$isElementNode(node) && node.isEmpty() && !$isListItemNode(node) && !handled.has(node.getKey())) {
        $createListOrMerge(node, listType);
        continue;
      }
      let parent = lexical.$isLeafNode(node) ? node.getParent() : $isListItemNode(node) && node.isEmpty() ? node : null;
      while (parent != null) {
        const parentKey = parent.getKey();
        if ($isListNode(parent)) {
          if (!handled.has(parentKey)) {
            const newListNode = $createListNode(listType);
            append(newListNode, parent.getChildren());
            parent.replace(newListNode);
            handled.add(parentKey);
          }
          break;
        } else {
          const nextParent = parent.getParent();
          if (lexical.$isRootOrShadowRoot(nextParent) && !handled.has(parentKey)) {
            handled.add(parentKey);
            $createListOrMerge(parent, listType);
            break;
          }
          parent = nextParent;
        }
      }
    }
  }
}
function append(node, nodesToAppend) {
  node.splice(node.getChildrenSize(), 0, nodesToAppend);
}
function $createListOrMerge(node, listType) {
  if ($isListNode(node)) {
    return node;
  }
  const previousSibling = node.getPreviousSibling();
  const nextSibling = node.getNextSibling();
  const listItem = $createListItemNode();
  append(listItem, node.getChildren());
  let targetList;
  if ($isListNode(previousSibling) && listType === previousSibling.getListType()) {
    previousSibling.append(listItem);
    // if the same type of list is on both sides, merge them.
    if ($isListNode(nextSibling) && listType === nextSibling.getListType()) {
      append(previousSibling, nextSibling.getChildren());
      nextSibling.remove();
    }
    targetList = previousSibling;
  } else if ($isListNode(nextSibling) && listType === nextSibling.getListType()) {
    nextSibling.getFirstChildOrThrow().insertBefore(listItem);
    targetList = nextSibling;
  } else {
    const list = $createListNode(listType);
    list.append(listItem);
    node.replace(list);
    targetList = list;
  }
  // listItem needs to be attached to root prior to setting indent
  listItem.setFormat(node.getFormatType());
  listItem.setIndent(node.getIndent());

  // Preserve element-anchored selections by updating them to anchor to the listItem instead of the listNode.
  const selection = lexical.$getSelection();
  if (lexical.$isRangeSelection(selection)) {
    if (targetList.getKey() === selection.anchor.key) {
      selection.anchor.set(listItem.getKey(), selection.anchor.offset, 'element');
    }
    if (targetList.getKey() === selection.focus.key) {
      selection.focus.set(listItem.getKey(), selection.focus.offset, 'element');
    }
  }
  node.remove();
  return targetList;
}

/**
 * A recursive function that goes through each list and their children, including nested lists,
 * appending list2 children after list1 children and updating ListItemNode values.
 * @param list1 - The first list to be merged.
 * @param list2 - The second list to be merged.
 */
function mergeLists(list1, list2) {
  const listItem1 = list1.getLastChild();
  const listItem2 = list2.getFirstChild();
  if (listItem1 && listItem2 && $isNestedListNode(listItem1) && $isNestedListNode(listItem2)) {
    mergeLists(listItem1.getFirstChild(), listItem2.getFirstChild());
    listItem2.remove();
  }
  const toMerge = list2.getChildren();
  if (toMerge.length > 0) {
    list1.append(...toMerge);
  }
  list2.remove();
}

/**
 * Searches for the nearest ancestral ListNode and removes it. If selection is an empty ListItemNode
 * it will remove the whole list, including the ListItemNode. For each ListItemNode in the ListNode,
 * removeList will also generate new ParagraphNodes in the removed ListNode's place. Any child node
 * inside a ListItemNode will be appended to the new ParagraphNodes.
 */
function $removeList() {
  const selection = lexical.$getSelection();
  if (lexical.$isRangeSelection(selection)) {
    const listNodes = new Set();
    const nodes = selection.getNodes();
    const anchorNode = selection.anchor.getNode();
    if ($isSelectingEmptyListItem(anchorNode, nodes)) {
      listNodes.add($getTopListNode(anchorNode));
    } else {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (lexical.$isLeafNode(node)) {
          const listItemNode = utils.$getNearestNodeOfType(node, ListItemNode);
          if (listItemNode != null) {
            listNodes.add($getTopListNode(listItemNode));
          }
        }
      }
    }
    for (const listNode of listNodes) {
      let insertionPoint = listNode;
      const listItems = $getAllListItems(listNode);
      for (const listItemNode of listItems) {
        const paragraph = lexical.$createParagraphNode().setTextStyle(selection.style).setTextFormat(selection.format);
        append(paragraph, listItemNode.getChildren());
        insertionPoint.insertAfter(paragraph);
        insertionPoint = paragraph;

        // When the anchor and focus fall on the textNode
        // we don't have to change the selection because the textNode will be appended to
        // the newly generated paragraph.
        // When selection is in empty nested list item, selection is actually on the listItemNode.
        // When the corresponding listItemNode is deleted and replaced by the newly generated paragraph
        // we should manually set the selection's focus and anchor to the newly generated paragraph.
        if (listItemNode.__key === selection.anchor.key) {
          lexical.$setPointFromCaret(selection.anchor, lexical.$normalizeCaret(lexical.$getChildCaret(paragraph, 'next')));
        }
        if (listItemNode.__key === selection.focus.key) {
          lexical.$setPointFromCaret(selection.focus, lexical.$normalizeCaret(lexical.$getChildCaret(paragraph, 'next')));
        }
        listItemNode.remove();
      }
      listNode.remove();
    }
  }
}

/**
 * Takes the value of a child ListItemNode and makes it the value the ListItemNode
 * should be if it isn't already. Also ensures that checked is undefined if the
 * parent does not have a list type of 'check'.
 * @param list - The list whose children are updated.
 */
function updateChildrenListItemValue(list) {
  const isNotChecklist = list.getListType() !== 'check';
  let value = list.getStart();
  for (const child of list.getChildren()) {
    if ($isListItemNode(child)) {
      if (child.getValue() !== value) {
        child.setValue(value);
      }
      if (isNotChecklist && child.getLatest().__checked != null) {
        child.setChecked(undefined);
      }
      if (!$isListNode(child.getFirstChild())) {
        value++;
      }
    }
  }
}

/**
 * Merge the next sibling list if same type.
 * <ul> will merge with <ul>, but NOT <ul> with <ol>.
 * @param list - The list whose next sibling should be potentially merged
 */
function mergeNextSiblingListIfSameType(list) {
  const nextSibling = list.getNextSibling();
  if ($isListNode(nextSibling) && list.getListType() === nextSibling.getListType()) {
    mergeLists(list, nextSibling);
  }
}

/**
 * Adds an empty ListNode/ListItemNode chain at listItemNode, so as to
 * create an indent effect. Won't indent ListItemNodes that have a ListNode as
 * a child, but does merge sibling ListItemNodes if one has a nested ListNode.
 * @param listItemNode - The ListItemNode to be indented.
 */
function $handleIndent(listItemNode) {
  // go through each node and decide where to move it.
  const removed = new Set();
  if ($isNestedListNode(listItemNode) || removed.has(listItemNode.getKey())) {
    return;
  }
  const parent = listItemNode.getParent();
  const nextSibling = listItemNode.getNextSibling();
  const previousSibling = listItemNode.getPreviousSibling();
  // if there are nested lists on either side, merge them all together.

  if ($isNestedListNode(nextSibling) && $isNestedListNode(previousSibling)) {
    const innerList = previousSibling.getFirstChild();
    if ($isListNode(innerList)) {
      innerList.append(listItemNode);
      const nextInnerList = nextSibling.getFirstChild();
      if ($isListNode(nextInnerList)) {
        const children = nextInnerList.getChildren();
        append(innerList, children);
        nextSibling.remove();
        removed.add(nextSibling.getKey());
      }
    }
  } else if ($isNestedListNode(nextSibling)) {
    // if the ListItemNode is next to a nested ListNode, merge them
    const innerList = nextSibling.getFirstChild();
    if ($isListNode(innerList)) {
      const firstChild = innerList.getFirstChild();
      if (firstChild !== null) {
        firstChild.insertBefore(listItemNode);
      }
    }
  } else if ($isNestedListNode(previousSibling)) {
    const innerList = previousSibling.getFirstChild();
    if ($isListNode(innerList)) {
      innerList.append(listItemNode);
    }
  } else {
    // otherwise, we need to create a new nested ListNode

    if ($isListNode(parent)) {
      const newListItem = lexical.$copyNode(listItemNode);
      const newList = lexical.$copyNode(parent);
      newListItem.append(newList);
      newList.append(listItemNode);
      if (previousSibling) {
        previousSibling.insertAfter(newListItem);
      } else if (nextSibling) {
        nextSibling.insertBefore(newListItem);
      } else {
        parent.append(newListItem);
      }
    }
  }
}

/**
 * Removes an indent by removing an empty ListNode/ListItemNode chain. An indented ListItemNode
 * has a great grandparent node of type ListNode, which is where the ListItemNode will reside
 * within as a child.
 * @param listItemNode - The ListItemNode to remove the indent (outdent).
 */
function $handleOutdent(listItemNode) {
  // go through each node and decide where to move it.

  if ($isNestedListNode(listItemNode)) {
    return;
  }
  const parentList = listItemNode.getParent();
  const grandparentListItem = parentList ? parentList.getParent() : undefined;
  const greatGrandparentList = grandparentListItem ? grandparentListItem.getParent() : undefined;
  // If it doesn't have these ancestors, it's not indented.

  if ($isListNode(greatGrandparentList) && $isListItemNode(grandparentListItem) && $isListNode(parentList)) {
    // if it's the first child in it's parent list, insert it into the
    // great grandparent list before the grandparent
    const firstChild = parentList ? parentList.getFirstChild() : undefined;
    const lastChild = parentList ? parentList.getLastChild() : undefined;
    if (listItemNode.is(firstChild)) {
      grandparentListItem.insertBefore(listItemNode);
      if (parentList.isEmpty()) {
        grandparentListItem.remove();
      }
      // if it's the last child in it's parent list, insert it into the
      // great grandparent list after the grandparent.
    } else if (listItemNode.is(lastChild)) {
      grandparentListItem.insertAfter(listItemNode);
      if (parentList.isEmpty()) {
        grandparentListItem.remove();
      }
    } else {
      // otherwise, we need to split the siblings into two new nested lists
      const previousSiblingsListItem = lexical.$copyNode(listItemNode);
      const previousSiblingsList = lexical.$copyNode(parentList);
      previousSiblingsListItem.append(previousSiblingsList);
      listItemNode.getPreviousSiblings().forEach(sibling => previousSiblingsList.append(sibling));
      const nextSiblingsListItem = lexical.$copyNode(listItemNode);
      const nextSiblingsList = lexical.$copyNode(parentList);
      nextSiblingsListItem.append(nextSiblingsList);
      append(nextSiblingsList, listItemNode.getNextSiblings());
      // put the sibling nested lists on either side of the grandparent list item in the great grandparent.
      grandparentListItem.insertBefore(previousSiblingsListItem);
      grandparentListItem.insertAfter(nextSiblingsListItem);
      // replace the grandparent list item (now between the siblings) with the outdented list item.
      grandparentListItem.replace(listItemNode);
    }
  }
}

/**
 * Attempts to insert a ParagraphNode at selection and selects the new node. The selection must contain a ListItemNode
 * or a node that does not already contain text. If its grandparent is the root/shadow root, it will get the ListNode
 * (which should be the parent node) and insert the ParagraphNode as a sibling to the ListNode. If the ListNode is
 * nested in a ListItemNode instead, it will add the ParagraphNode after the grandparent ListItemNode.
 * Throws an invariant if the selection is not a child of a ListNode.
 * @returns true if a ParagraphNode was inserted successfully, false if there is no selection
 * or the selection does not contain a ListItemNode or the node already holds text.
 */
function $handleListInsertParagraph(restoreNumbering = false) {
  const selection = lexical.$getSelection();
  if (!lexical.$isRangeSelection(selection) || !selection.isCollapsed()) {
    return false;
  }
  // Only run this code on empty list items (including whitespace-only)
  const anchor = selection.anchor.getNode();
  let listItem = null;
  if ($isListItemNode(anchor) && anchor.getChildrenSize() === 0) {
    // Truly empty list item (element selection)
    listItem = anchor;
  } else if (lexical.$isTextNode(anchor)) {
    // Check if the entire list item contains only whitespace text nodes
    const parentListItem = anchor.getParent();
    if ($isListItemNode(parentListItem) && parentListItem.getChildren().every(node => lexical.$isTextNode(node) && node.getTextContent().trim() === '')) {
      listItem = parentListItem;
    }
  }
  if (listItem === null) {
    return false;
  }
  const topListNode = $getTopListNode(listItem);
  const parent = listItem.getParent();
  if (!$isListNode(parent)) {
    formatDevErrorMessage(`A ListItemNode must have a ListNode for a parent.`);
  }
  const grandparent = parent.getParent();
  let replacementNode;
  if (lexical.$isRootOrShadowRoot(grandparent)) {
    replacementNode = lexical.$createParagraphNode();
    topListNode.insertAfter(replacementNode);
  } else if ($isListItemNode(grandparent)) {
    replacementNode = lexical.$copyNode(grandparent);
    grandparent.insertAfter(replacementNode);
  } else {
    return false;
  }
  replacementNode.setTextStyle(selection.style).setTextFormat(selection.format).select();
  const nextSiblings = listItem.getNextSiblings();
  if (nextSiblings.length > 0) {
    const newStart = restoreNumbering ? $getNewListStart(parent, listItem) : 1;
    const newList = lexical.$copyNode(parent).setStart(newStart);
    if ($isListItemNode(replacementNode)) {
      const newListItem = lexical.$copyNode(replacementNode);
      newListItem.append(newList);
      replacementNode.insertAfter(newListItem);
    } else {
      replacementNode.insertAfter(newList);
    }
    newList.append(...nextSiblings);
  }

  // Don't leave hanging nested empty lists
  $removeHighestEmptyListParent(listItem);
  return true;
}

function applyMarkerStyles(dom, node, prevNode) {
  const nextTextStyle = node.__textStyle;
  const prevTextStyle = prevNode ? prevNode.__textStyle : '';
  if (prevNode !== null && prevTextStyle === nextTextStyle) {
    return;
  }
  const styles = lexical.getStyleObjectFromCSS(nextTextStyle);
  for (const k in styles) {
    dom.style.setProperty(`--listitem-marker-${k}`, styles[k]);
  }
  if (prevTextStyle !== '') {
    for (const k in lexical.getStyleObjectFromCSS(prevTextStyle)) {
      if (!(k in styles)) {
        dom.style.removeProperty(`--listitem-marker-${k}`);
      }
    }
  }
}

/** @noInheritDoc */
class ListItemNode extends lexical.ElementNode {
  /** @internal */
  __value;
  /** @internal */
  __checked;

  /** @internal */
  $config() {
    return this.config('listitem', {
      $transform: node => {
        const parent = node.getParent();
        if ($isListNode(parent)) {
          if (parent.getListType() !== 'check' && node.getChecked() != null) {
            node.setChecked(undefined);
          }
        } else if (parent) {
          const newParent = node.createParentElementNode();
          if (!$isListNode(newParent)) {
            formatDevErrorMessage(`ListItemNode.createParentElementNode() must return a ListNode`);
          } // Insert an empty ListNode at the orphan's position, splitting
          // any enclosing non-shadow-root blocks so the ListNode lifts to
          // a valid container before we move the orphan in. The ListNode
          // $transform merges adjacent same-type lists, so neighbouring
          // orphans will coalesce once their own transforms run.
          const children = [node];
          for (const dir of ['previous', 'next']) {
            children.reverse();
            for (const {
              origin
            } of lexical.$getSiblingCaret(node, dir)) {
              if (!$isListItemNode(origin)) {
                break;
              }
              children.push(origin);
            }
          }
          node.insertBefore(newParent);
          newParent.splice(0, 0, children);
          if (!lexical.$isRootOrShadowRoot(parent)) {
            lexical.$insertNodeToNearestRootAtCaret(newParent, lexical.$rewindSiblingCaret(lexical.$getSiblingCaret(newParent, 'next')), {
              $shouldSplit: () => false,
              removeEmptyDestination: true
            });
            if (parent.isEmpty() && parent.isAttached()) {
              parent.remove();
            }
          }
        }
      },
      extends: lexical.ElementNode,
      importDOM: lexical.buildImportMap({
        li: () => ({
          conversion: $convertListItemElement,
          priority: 0
        })
      })
    });
  }
  constructor(value = 1, checked = undefined, key) {
    super(key);
    this.__value = value === undefined ? 1 : value;
    this.__checked = checked;
  }
  afterCloneFrom(prevNode) {
    super.afterCloneFrom(prevNode);
    this.__value = prevNode.__value;
    this.__checked = prevNode.__checked;
  }
  createDOM(config) {
    const element = lexical.$getDocument().createElement('li');
    this.updateListItemDOM(null, element, config);
    return element;
  }
  updateListItemDOM(prevNode, dom, config) {
    updateListItemChecked(dom, this);
    dom.value = this.__value;
    $setListItemThemeClassNames(dom, config.theme, this);
    const prevStyle = prevNode ? prevNode.__style : '';
    const nextStyle = this.__style;
    if (prevStyle !== nextStyle) {
      lexical.setDOMStyleFromCSS(dom.style, nextStyle, prevStyle);
    }
    applyMarkerStyles(dom, this, prevNode);
  }
  updateDOM(prevNode, dom, config) {
    // @ts-expect-error - this is always HTMLListItemElement
    const element = dom;
    this.updateListItemDOM(prevNode, element, config);
    return false;
  }
  updateFromJSON(serializedNode) {
    return super.updateFromJSON(serializedNode).setValue(serializedNode.value).setChecked(serializedNode.checked);
  }
  exportDOM(editor) {
    const element = this.createDOM(editor._config);
    const formatType = this.getFormatType();
    if (formatType) {
      element.style.textAlign = formatType;
    }
    const direction = this.getDirection();
    if (direction) {
      element.dir = direction;
    }
    if ($isNestedListNode(this)) {
      return {
        after(containerElement) {
          if (lexical.isHTMLElement(containerElement)) {
            const prevSibling = containerElement.previousElementSibling;
            if (lexical.isHTMLElement(prevSibling) && prevSibling.nodeName === 'LI') {
              while (containerElement.firstChild) {
                prevSibling.append(containerElement.firstChild);
              }
              containerElement.remove();
            }
          }
          return containerElement;
        },
        element
      };
    }
    return {
      element
    };
  }
  exportJSON() {
    return {
      ...super.exportJSON(),
      checked: this.getChecked(),
      value: this.getValue()
    };
  }
  append(...nodes) {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (lexical.$isElementNode(node) && this.canMergeWith(node)) {
        const children = node.getChildren();
        this.append(...children);
        node.remove();
      } else {
        super.append(node);
      }
    }
    return this;
  }
  replace(replaceWithNode, includeChildren) {
    if ($isListItemNode(replaceWithNode)) {
      return super.replace(replaceWithNode);
    }
    this.setIndent(0);
    const list = this.getParentOrThrow();
    if (!$isListNode(list)) {
      return replaceWithNode;
    }
    if (list.__first === this.getKey()) {
      list.insertBefore(replaceWithNode);
    } else if (list.__last === this.getKey()) {
      list.insertAfter(replaceWithNode);
    } else {
      // Split the list
      const newList = lexical.$copyNode(list);
      let nextSibling = this.getNextSibling();
      while (nextSibling) {
        const nodeToAppend = nextSibling;
        nextSibling = nextSibling.getNextSibling();
        newList.append(nodeToAppend);
      }
      list.insertAfter(replaceWithNode);
      replaceWithNode.insertAfter(newList);
    }
    const toReplaceKey = this.__key;
    let prevSizeBeforeChildrenTransfer = 0;
    if (includeChildren) {
      if (!lexical.$isElementNode(replaceWithNode)) {
        formatDevErrorMessage(`includeChildren should only be true for ElementNodes`);
      }
      prevSizeBeforeChildrenTransfer = replaceWithNode.getChildrenSize();
      replaceWithNode.splice(prevSizeBeforeChildrenTransfer, 0, this.getChildren());
    }
    // The base LexicalNode.replace remaps element-anchored selection points
    // from the replaced node to the replacement, but this override skips
    // super and the trailing this.remove() would otherwise drop selection
    // onto a sibling list item via moveSelectionPointToSibling. Mirror the
    // base behavior here for the element-anchored case.
    if (includeChildren && lexical.$isElementNode(replaceWithNode)) {
      const selection = lexical.$getSelection();
      if (lexical.$isRangeSelection(selection)) {
        for (const point of selection.getStartEndPoints()) {
          if (point.key === toReplaceKey && point.type === 'element') {
            point.set(replaceWithNode.getKey(), prevSizeBeforeChildrenTransfer + point.offset, 'element');
          }
        }
      }
    }
    this.remove();
    if (list.getChildrenSize() === 0) {
      list.remove();
    }
    return replaceWithNode;
  }
  insertAfter(node, restoreSelection = true) {
    const listNode = this.getParentOrThrow();
    if (!$isListNode(listNode)) {
      {
        formatDevErrorMessage(`insertAfter: list node is not parent of list item node`);
      }
    }
    if ($isListItemNode(node)) {
      return super.insertAfter(node, restoreSelection);
    }
    const siblings = this.getNextSiblings();

    // Split the lists and insert the node in between them
    listNode.insertAfter(node, restoreSelection);
    if (siblings.length !== 0) {
      const newListNode = lexical.$copyNode(listNode);
      siblings.forEach(sibling => newListNode.append(sibling));
      node.insertAfter(newListNode, restoreSelection);
    }
    return node;
  }
  remove(preserveEmptyParent) {
    const prevSibling = this.getPreviousSibling();
    const nextSibling = this.getNextSibling();
    super.remove(preserveEmptyParent);
    if (prevSibling && nextSibling && $isNestedListNode(prevSibling) && $isNestedListNode(nextSibling)) {
      mergeLists(prevSibling.getFirstChild(), nextSibling.getFirstChild());
      nextSibling.remove();
    }
  }
  resetOnCopyNodeFrom(original) {
    super.resetOnCopyNodeFrom(original);
    if (original.getChecked()) {
      this.setChecked(false);
    }
  }
  insertNewAfter(_, restoreSelection = true) {
    const newElement = lexical.$copyNode(this);
    this.insertAfter(newElement, restoreSelection);
    return newElement;
  }
  collapseAtStart(selection) {
    if ($isNestedListNode(this)) {
      return false;
    }
    const listNode = this.getParentOrThrow();
    const listNodeParent = listNode.getParentOrThrow();
    if ($isListItemNode(listNodeParent)) {
      $handleOutdent(this);
      return true;
    }
    const paragraph = lexical.$createParagraphNode().append(...this.getChildren());
    const nextSiblings = this.getNextSiblings();
    if (nextSiblings.length > 0) {
      const newList = lexical.$copyNode(listNode);
      newList.append(...nextSiblings);
      listNode.insertAfter(newList);
    }
    listNode.insertAfter(paragraph);
    this.remove();
    if (listNode.getChildrenSize() === 0) {
      listNode.remove();
    }
    paragraph.selectStart();
    return true;
  }
  getValue() {
    const self = this.getLatest();
    return self.__value;
  }
  setValue(value) {
    const self = this.getWritable();
    self.__value = value;
    return self;
  }
  getChecked() {
    const self = this.getLatest();
    let listType;
    const parent = this.getParent();
    if ($isListNode(parent)) {
      listType = parent.getListType();
    }
    return listType === 'check' ? Boolean(self.__checked) : undefined;
  }
  setChecked(checked) {
    const self = this.getWritable();
    self.__checked = checked;
    return self;
  }
  toggleChecked() {
    const self = this.getWritable();
    return self.setChecked(!self.__checked);
  }
  getIndent() {
    // If we don't have a parent, we are likely serializing
    const parent = this.getParent();
    if (parent === null || !this.isAttached()) {
      return this.getLatest().__indent;
    }
    // ListItemNode should always have a ListNode for a parent.
    let listNodeParent = parent.getParentOrThrow();
    let indentLevel = 0;
    while ($isListItemNode(listNodeParent)) {
      listNodeParent = listNodeParent.getParentOrThrow().getParentOrThrow();
      indentLevel++;
    }
    return indentLevel;
  }
  setIndent(indent) {
    if (!(typeof indent === 'number')) {
      formatDevErrorMessage(`Invalid indent value.`);
    }
    indent = Math.floor(indent);
    if (!(indent >= 0)) {
      formatDevErrorMessage(`Indent value must be non-negative.`);
    }
    let currentIndent = this.getIndent();
    while (currentIndent !== indent) {
      if (currentIndent < indent) {
        $handleIndent(this);
        currentIndent++;
      } else {
        $handleOutdent(this);
        currentIndent--;
      }
    }
    return this;
  }

  /** @deprecated @internal */
  canInsertAfter(node) {
    return $isListItemNode(node);
  }

  /** @deprecated @internal */
  canReplaceWith(replacement) {
    return $isListItemNode(replacement);
  }
  canMergeWith(node) {
    return $isListItemNode(node) || lexical.$isParagraphNode(node);
  }
  extractWithChild(child, selection) {
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    const anchorNode = selection.anchor.getNode();
    const focusNode = selection.focus.getNode();
    return this.isParentOf(anchorNode) && this.isParentOf(focusNode) && this.getTextContent().length === selection.getTextContent().length;
  }
  isParentRequired() {
    return true;
  }
  createParentElementNode() {
    return $createListNode('bullet');
  }
  canMergeWhenEmpty() {
    return true;
  }
}
function $setListItemThemeClassNames(dom, editorThemeClasses, node) {
  const listTheme = editorThemeClasses.list;
  if (!listTheme) {
    return;
  }
  const listItemClassName = listTheme.listitem;
  const nestedListItemClassName = listTheme.nested && listTheme.nested.listitem;
  const parentNode = node.getParent();
  const isCheckList = $isListNode(parentNode) && parentNode.getListType() === 'check';
  const checked = node.getChecked();
  const isNested = node.getChildren().some(child => $isListNode(child));

  // Always remove the variable theme classes first so that the className
  // string stays in a canonical order regardless of how the dom got here
  // (fresh create vs. cross-parent reuse). classList.remove on a missing
  // class is a no-op, so this is safe even on a freshly-created element.
  const classesToRemove = [];
  if (listTheme.listitemChecked !== undefined) {
    classesToRemove.push(listTheme.listitemChecked);
  }
  if (listTheme.listitemUnchecked !== undefined) {
    classesToRemove.push(listTheme.listitemUnchecked);
  }
  if (nestedListItemClassName !== undefined) {
    classesToRemove.push(...lexical.normalizeClassNames(nestedListItemClassName));
  }
  if (classesToRemove.length > 0) {
    lexical.removeClassNamesFromElement(dom, ...classesToRemove);
  }
  const classesToAdd = [];
  if (listItemClassName !== undefined) {
    classesToAdd.push(...lexical.normalizeClassNames(listItemClassName));
  }
  if (isCheckList) {
    const checkClassName = checked ? listTheme.listitemChecked : listTheme.listitemUnchecked;
    if (checkClassName !== undefined) {
      classesToAdd.push(checkClassName);
    }
  }
  if (nestedListItemClassName !== undefined && isNested) {
    classesToAdd.push(...lexical.normalizeClassNames(nestedListItemClassName));
  }
  if (classesToAdd.length > 0) {
    lexical.addClassNamesToElement(dom, ...classesToAdd);
  }
}
function updateListItemChecked(dom, listItemNode, prevListItemNode) {
  const parent = listItemNode.getParent();
  const isCheckbox = $isListNode(parent) && parent.getListType() === 'check' &&
  // Only add attributes for leaf list items
  !$isListNode(listItemNode.getFirstChild());
  if (!isCheckbox) {
    dom.removeAttribute('role');
    dom.removeAttribute('tabIndex');
    dom.removeAttribute('aria-checked');
  } else {
    dom.setAttribute('role', 'checkbox');
    dom.setAttribute('tabIndex', '-1');
    dom.setAttribute('aria-checked', listItemNode.getChecked() ? 'true' : 'false');
  }
}
function $convertListItemElement(domNode) {
  const isGitHubCheckList = domNode.classList.contains('task-list-item');
  if (isGitHubCheckList) {
    for (const child of domNode.children) {
      if (child.tagName === 'INPUT') {
        return $convertCheckboxInput(child);
      }
    }
  }
  const isJoplinCheckList = domNode.classList.contains('joplin-checkbox');
  if (isJoplinCheckList) {
    for (const child of domNode.children) {
      if (child.classList.contains('checkbox-wrapper') && child.children.length > 0 && child.children[0].tagName === 'INPUT') {
        return $convertCheckboxInput(child.children[0]);
      }
    }
  }
  const ariaCheckedAttr = domNode.getAttribute('aria-checked');
  const checked = ariaCheckedAttr === 'true' ? true : ariaCheckedAttr === 'false' ? false : undefined;
  const node = $createListItemNode(checked);
  lexical.$setFormatFromDOM(node, domNode);
  return {
    after: setFormatFromChildren.bind(null, node),
    node: lexical.$setDirectionFromDOM(node, domNode)
  };
}
function $convertCheckboxInput(domNode) {
  const isCheckboxInput = domNode.getAttribute('type') === 'checkbox';
  if (!isCheckboxInput) {
    return {
      node: null
    };
  }
  const checked = domNode.hasAttribute('checked');
  const node = $createListItemNode(checked);
  return {
    after: setFormatFromChildren.bind(null, node),
    node
  };
}
function setFormatFromChildren(listItemNode, children) {
  const firstChild = children[0];
  // google doc sets the alignment of the <p> tag inside the <li>
  if (children.length === 1 && lexical.$isParagraphNode(firstChild) && !listItemNode.getFormatType() && firstChild.getFormatType()) {
    listItemNode.setFormat(firstChild.getFormatType());
    return firstChild.getChildren();
  }
  return children;
}

/**
 * Creates a new List Item node, passing true/false will convert it to a checkbox input.
 * @param checked - Is the List Item a checkbox and, if so, is it checked? undefined/null: not a checkbox, true/false is a checkbox and checked/unchecked, respectively.
 * @returns The new List Item.
 */
function $createListItemNode(checked) {
  return lexical.$applyNodeReplacement(new ListItemNode(undefined, checked));
}

/**
 * Checks to see if the node is a ListItemNode.
 * @param node - The node to be checked.
 * @returns true if the node is a ListItemNode, false otherwise.
 */
function $isListItemNode(node) {
  return node instanceof ListItemNode;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/** @noInheritDoc */
class ListNode extends lexical.ElementNode {
  /** @internal */
  __tag;
  /** @internal */
  __start;
  /** @internal */
  __listType;

  /** @internal */
  $config() {
    return this.config('list', {
      $transform: node => {
        mergeNextSiblingListIfSameType(node);
        updateChildrenListItemValue(node);
      },
      extends: lexical.ElementNode,
      importDOM: lexical.buildImportMap({
        ol: () => ({
          conversion: $convertListNode,
          priority: 0
        }),
        ul: () => ({
          conversion: $convertListNode,
          priority: 0
        })
      })
    });
  }
  constructor(listType = 'number', start = 1, key) {
    super(key);
    const _listType = TAG_TO_LIST_TYPE[listType] || listType;
    this.__listType = _listType;
    this.__tag = _listType === 'number' ? 'ol' : 'ul';
    this.__start = start;
  }
  afterCloneFrom(prevNode) {
    super.afterCloneFrom(prevNode);
    this.__listType = prevNode.__listType;
    this.__tag = prevNode.__tag;
    this.__start = prevNode.__start;
  }
  getTag() {
    return this.getLatest().__tag;
  }
  setListType(type) {
    const writable = this.getWritable();
    writable.__listType = type;
    writable.__tag = type === 'number' ? 'ol' : 'ul';
    return writable;
  }
  getListType() {
    return this.getLatest().__listType;
  }
  getStart() {
    return this.getLatest().__start;
  }
  setStart(start) {
    const self = this.getWritable();
    self.__start = start;
    return self;
  }

  // View

  createDOM(config, _editor) {
    const tag = this.__tag;
    const dom = lexical.$getDocument().createElement(tag);
    if (this.__start !== 1) {
      dom.setAttribute('start', String(this.__start));
    }
    // @ts-expect-error Internal field.
    dom.__lexicalListType = this.__listType;
    $setListThemeClassNames(dom, config.theme, this);
    return dom;
  }
  updateDOM(prevNode, dom, config) {
    if (prevNode.__tag !== this.__tag || prevNode.__listType !== this.__listType) {
      return true;
    }
    $setListThemeClassNames(dom, config.theme, this);
    if (prevNode.__start !== this.__start) {
      dom.setAttribute('start', String(this.__start));
    }
    return false;
  }
  updateFromJSON(serializedNode) {
    return super.updateFromJSON(serializedNode).setListType(serializedNode.listType).setStart(serializedNode.start);
  }
  exportDOM(editor) {
    const element = this.createDOM(editor._config, editor);
    if (lexical.isHTMLElement(element)) {
      if (this.__start !== 1) {
        element.setAttribute('start', String(this.__start));
      }
      if (this.__listType === 'check') {
        element.setAttribute('__lexicalListType', 'check');
      }
    }
    return {
      element
    };
  }
  exportJSON() {
    return {
      ...super.exportJSON(),
      listType: this.getListType(),
      start: this.getStart(),
      tag: this.getTag()
    };
  }
  canBeEmpty() {
    return false;
  }
  canIndent() {
    return false;
  }
  splice(start, deleteCount, nodesToInsert) {
    let listItemNodesToInsert = nodesToInsert;
    for (let i = 0; i < nodesToInsert.length; i++) {
      const node = nodesToInsert[i];
      if (!$isListItemNode(node)) {
        if (listItemNodesToInsert === nodesToInsert) {
          listItemNodesToInsert = [...nodesToInsert];
        }
        listItemNodesToInsert[i] = this.createListItemNode().append(lexical.$isElementNode(node) && !($isListNode(node) || node.isInline()) ? lexical.$createTextNode(node.getTextContent()) : node);
      }
    }
    return super.splice(start, deleteCount, listItemNodesToInsert);
  }
  extractWithChild(child) {
    return $isListItemNode(child);
  }

  /**
   * Create an appropriate ListItemNode to be a child of this ListNode,
   * {@link $createListItemNode} is the default implementation.
   *
   * @returns A new ListItemNode.
   */
  createListItemNode() {
    return $createListItemNode();
  }
}
function $setListThemeClassNames(dom, editorThemeClasses, node) {
  const classesToAdd = [];
  const classesToRemove = [];
  const listTheme = editorThemeClasses.list;
  if (listTheme !== undefined) {
    const listLevelsClassNames = listTheme[`${node.__tag}Depth`] || [];
    const listDepth = $getListDepth(node) - 1;
    const normalizedListDepth = listDepth % listLevelsClassNames.length;
    const listLevelClassName = listLevelsClassNames[normalizedListDepth];
    const listClassName = listTheme[node.__tag];
    let nestedListClassName;
    const nestedListTheme = listTheme.nested;
    const checklistClassName = listTheme.checklist;
    if (nestedListTheme !== undefined && nestedListTheme.list) {
      nestedListClassName = nestedListTheme.list;
    }
    if (listClassName !== undefined) {
      classesToAdd.push(listClassName);
    }
    if (checklistClassName !== undefined && node.__listType === 'check') {
      classesToAdd.push(checklistClassName);
    }
    if (listLevelClassName !== undefined) {
      classesToAdd.push(...lexical.normalizeClassNames(listLevelClassName));
      for (let i = 0; i < listLevelsClassNames.length; i++) {
        if (i !== normalizedListDepth) {
          classesToRemove.push(node.__tag + i);
        }
      }
    }
    if (nestedListClassName !== undefined) {
      const nestedListItemClasses = lexical.normalizeClassNames(nestedListClassName);
      if (listDepth > 1) {
        classesToAdd.push(...nestedListItemClasses);
      } else {
        classesToRemove.push(...nestedListItemClasses);
      }
    }
  }
  if (classesToRemove.length > 0) {
    lexical.removeClassNamesFromElement(dom, ...classesToRemove);
  }
  if (classesToAdd.length > 0) {
    lexical.addClassNamesToElement(dom, ...classesToAdd);
  }
}

/*
 * This function normalizes the children of a ListNode after the conversion from HTML,
 * ensuring that they are all ListItemNodes and contain either a single nested ListNode
 * or some other inline content.
 */
function $normalizeChildren(nodes, listNode) {
  const $createWrapperItem = listNode.createListItemNode.bind(listNode);
  const normalizedListItems = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if ($isListItemNode(node)) {
      normalizedListItems.push(node);
      const children = node.getChildren();
      if (children.length > 1) {
        children.forEach(child => {
          if ($isListNode(child)) {
            normalizedListItems.push($createWrapperItem().append(child));
          }
        });
      }
    } else {
      normalizedListItems.push($createWrapperItem().append(node));
    }
  }
  return normalizedListItems;
}
function isDomChecklist$1(domNode) {
  if (domNode.getAttribute('__lexicallisttype') === 'check' ||
  // is github checklist
  domNode.classList.contains('contains-task-list') ||
  // is joplin checklist
  domNode.getAttribute('data-is-checklist') === '1') {
    return true;
  }
  // if children are checklist items, the node is a checklist ul. Applicable for googledoc checklist pasting.
  for (const child of domNode.childNodes) {
    if (lexical.isHTMLElement(child) && child.hasAttribute('aria-checked')) {
      return true;
    }
  }
  return false;
}
function isHTMLOListElement(node) {
  return lexical.isHTMLElement(node) && node.nodeName.toLowerCase() === 'ol';
}
function $convertListNode(domNode) {
  let node;
  if (isHTMLOListElement(domNode)) {
    const start = domNode.start;
    node = $createListNode('number', start);
  } else if (isDomChecklist$1(domNode)) {
    node = $createListNode('check');
  } else {
    node = $createListNode('bullet');
  }
  lexical.$setDirectionFromDOM(node, domNode);
  return {
    after: children => $normalizeChildren(children, node),
    node
  };
}
const TAG_TO_LIST_TYPE = {
  ol: 'number',
  ul: 'bullet'
};

/**
 * Creates a ListNode of listType.
 * @param listType - The type of list to be created. Can be 'number', 'bullet', or 'check'.
 * @param start - Where an ordered list starts its count, start = 1 if left undefined.
 * @returns The new ListNode
 */
function $createListNode(listType = 'number', start = 1) {
  return lexical.$applyNodeReplacement(new ListNode(listType, start));
}

/**
 * Checks to see if the node is a ListNode.
 * @param node - The node to be checked.
 * @returns true if the node is a ListNode, false otherwise.
 */
function $isListNode(node) {
  return node instanceof ListNode;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const INSERT_CHECK_LIST_COMMAND = /* @__PURE__ */lexical.createCommand('INSERT_CHECK_LIST_COMMAND');

/**
 * Registers the checklist plugin with the editor.
 * @param editor The LexicalEditor instance.
 * @param options Optional configuration.
 *   - disableTakeFocusOnClick: If true, clicking a checklist item will not focus the editor (useful for mobile).
 */
function registerCheckList(editor, options) {
  const disableTakeFocusOnClick = options && options.disableTakeFocusOnClick || false;
  const peekDisableTakeFocusOnClick = typeof disableTakeFocusOnClick === 'boolean' ? () => disableTakeFocusOnClick : disableTakeFocusOnClick.peek.bind(disableTakeFocusOnClick);

  // Mobile tap fix: the touchstart listener registered below calls
  // event.preventDefault() to keep the caret away from the marker. On iOS
  // Safari and Android Chrome that suppression also cancels the synthesized
  // click, so handleClick never runs and the checkbox cannot be toggled by
  // tap. We additionally listen for pointerup with pointerType === 'touch'
  // and run the same toggle logic, deduplicating against any click that
  // does fire on browsers where preventDefault doesn't suppress it.
  //
  // Dedup state is per-target: recorded as `__lexicalCheckListLastHandled`
  // on the target element. A global window would
  // block tapping a second checkbox within 500ms of toggling the first.
  const DEDUP_WINDOW_MS = 500;
  const isWithinDedupWindow = event => {
    const target = event.target;
    if (!lexical.isHTMLElement(target)) {
      return false;
    }
    // @ts-ignore internal field
    const last = target.__lexicalCheckListLastHandled;
    return last !== undefined && event.timeStamp - last < DEDUP_WINDOW_MS;
  };
  const recordHandled = event => {
    const target = event.target;
    if (lexical.isHTMLElement(target)) {
      // @ts-ignore internal field
      target.__lexicalCheckListLastHandled = event.timeStamp;
    }
  };
  const configHandleClick = event => {
    if (isWithinDedupWindow(event)) {
      return;
    }
    recordHandled(event);
    handleClick(event, peekDisableTakeFocusOnClick());
  };
  const configHandlePointerUp = event => {
    if (event.pointerType !== 'touch') {
      return;
    }
    if (isWithinDedupWindow(event)) {
      return;
    }
    recordHandled(event);
    handleClick(event, peekDisableTakeFocusOnClick());
  };
  const configHandleSelectDefaults = event => {
    handleSelectDefaults(event, peekDisableTakeFocusOnClick());
  };
  return lexical.mergeRegister(editor.registerCommand(INSERT_CHECK_LIST_COMMAND, () => {
    $insertList('check');
    return true;
  }, lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(lexical.KEY_ARROW_DOWN_COMMAND, event => {
    return handleArrowUpOrDown(event, editor, false);
  }, lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(lexical.KEY_ARROW_UP_COMMAND, event => {
    return handleArrowUpOrDown(event, editor, true);
  }, lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(lexical.KEY_ESCAPE_COMMAND, () => {
    const activeItem = getActiveCheckListItem(editor);
    if (activeItem != null) {
      const rootElement = editor.getRootElement();
      if (rootElement != null) {
        rootElement.focus();
      }
      return true;
    }
    return false;
  }, lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(lexical.KEY_SPACE_COMMAND, event => {
    const activeItem = getActiveCheckListItem(editor);
    if (activeItem != null && editor.isEditable()) {
      editor.update(() => {
        const listItemNode = lexical.$getNearestNodeFromDOMNode(activeItem);
        if ($isListItemNode(listItemNode)) {
          event.preventDefault();
          listItemNode.toggleChecked();
        }
      });
      return true;
    }
    return false;
  }, lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(lexical.KEY_ARROW_LEFT_COMMAND, event => {
    return editor.read('latest', () => {
      const selection = lexical.$getSelection();
      if (lexical.$isRangeSelection(selection) && selection.isCollapsed()) {
        const {
          anchor
        } = selection;
        const isElement = anchor.type === 'element';
        if (isElement || anchor.offset === 0) {
          const anchorNode = anchor.getNode();
          const elementNode = lexical.$findMatchingParent(anchorNode, node => lexical.$isElementNode(node) && !node.isInline());
          if ($isListItemNode(elementNode)) {
            const parent = elementNode.getParent();
            if ($isListNode(parent) && parent.getListType() === 'check' && (isElement || elementNode.getFirstDescendant() === anchorNode)) {
              const domNode = editor.getElementByKey(elementNode.__key);

              // getActiveElement rather than document.activeElement, which
              // reports the shadow host in a shadow root (so this would
              // otherwise always re-focus and swallow the arrow key).
              if (domNode != null && lexical.getActiveElement(domNode) !== domNode) {
                domNode.focus();
                event.preventDefault();
                return true;
              }
            }
          }
        }
      }
      return false;
    });
  }, lexical.COMMAND_PRIORITY_LOW), editor.registerRootListener(rootElement => {
    if (rootElement !== null) {
      return lexical.mergeRegister(lexical.registerEventListeners(rootElement, {
        click: configHandleClick,
        pointerup: configHandlePointerUp
      }),
      // Use capture so we run before other listeners that might move focus.
      // Some browsers / integrations still generate mousedown events as well
      // as pointerdown, so handle both.
      lexical.registerEventListeners(rootElement, {
        mousedown: configHandleSelectDefaults,
        pointerdown: configHandleSelectDefaults
      }, {
        capture: true
      }),
      // Intercept touchstart to stop the mobile browser from placing the
      // caret and opening the keyboard when tapping the checklist marker.
      // passive:false lets the handler call preventDefault, so it needs its
      // own options and can't share the capture-only group above.
      lexical.registerEventListener(rootElement, 'touchstart', configHandleSelectDefaults, {
        capture: true,
        passive: false
      }));
    }
  }));
}
function handleCheckItemEvent(event, callback) {
  const target = event.target;
  if (!lexical.isHTMLElement(target)) {
    return;
  }

  // Ignore clicks on LI that have nested lists
  const firstChild = target.firstChild;
  if (lexical.isHTMLElement(firstChild) && (firstChild.tagName === 'UL' || firstChild.tagName === 'OL')) {
    return;
  }
  const parentNode = target.parentNode;

  // @ts-ignore internal field
  if (!parentNode || parentNode.__lexicalListType !== 'check') {
    return;
  }
  let clientX = null;
  let pointerType = null;
  if ('clientX' in event) {
    clientX = event.clientX;
  } else if ('touches' in event) {
    const touches = event.touches;
    if (touches.length > 0) {
      clientX = touches[0].clientX;
      pointerType = 'touch';
    }
  }

  // If we couldn't resolve a clientX (unexpected input), bail out.
  if (clientX == null) {
    return;
  }
  const rect = target.getBoundingClientRect();
  const zoom = utils.calculateZoomLevel(target);
  const clientXInPixels = clientX / zoom;

  // Use getComputedStyle if available, otherwise fallback to 0px width
  const targetView = target.ownerDocument.defaultView;
  const beforeStyles = targetView ? targetView.getComputedStyle(target, '::before') : {
    width: '0px'
  };
  const beforeWidthInPixels = parseFloat(beforeStyles.width);

  // Make click area slightly larger for touch devices to improve accessibility
  // Determine whether this is a touch event; some environments may supply
  // pointerType on PointerEvent while touch events use the `touches` API above.
  const isTouchEvent = pointerType === 'touch' || 'pointerType' in event && event.pointerType === 'touch';
  const clickAreaPadding = isTouchEvent ? 32 : 0; // Add 32px padding for touch events

  if (target.dir === 'rtl' ? clientXInPixels < rect.right + clickAreaPadding && clientXInPixels > rect.right - beforeWidthInPixels - clickAreaPadding : clientXInPixels > rect.left - clickAreaPadding && clientXInPixels < rect.left + beforeWidthInPixels + clickAreaPadding) {
    callback();
  }
}
function handleClick(event, disableFocusOnClick) {
  handleCheckItemEvent(event, () => {
    if (lexical.isHTMLElement(event.target)) {
      const domNode = event.target;
      const editor = lexical.getNearestEditorFromDOMNode(domNode);
      if (editor != null && editor.isEditable()) {
        editor.update(() => {
          const node = lexical.$getNearestNodeFromDOMNode(domNode);
          if ($isListItemNode(node)) {
            if (disableFocusOnClick) {
              lexical.$addUpdateTag(lexical.SKIP_SELECTION_FOCUS_TAG);
              lexical.$addUpdateTag(lexical.SKIP_DOM_SELECTION_TAG);
            } else {
              domNode.focus();
            }
            node.toggleChecked();
          }
        });
      }
    }
  });
}

/**
 * Prevents default focus switch behavior
 *
 * @param event might be of type PointerEvent, MouseEvent, or TouchEvent, hence the generic Event type
 *
 */
function handleSelectDefaults(event, disableTakeFocusOnClick) {
  handleCheckItemEvent(event, () => {
    // Prevents caret moving when clicking on check mark.
    event.preventDefault();
    if (disableTakeFocusOnClick) {
      event.stopPropagation();
    }
  });
}
function getActiveCheckListItem(editor) {
  // getActiveElement scoped to the editor's root rather than
  // document.activeElement, which reports the shadow host when the editor is
  // in a shadow root (so the focused <li> would otherwise be invisible here).
  const rootElement = editor.getRootElement();
  const activeElement = rootElement ? lexical.getActiveElement(rootElement) : null;
  return lexical.isHTMLElement(activeElement) && activeElement.tagName === 'LI' && activeElement.parentNode != null &&
  // @ts-ignore internal field
  activeElement.parentNode.__lexicalListType === 'check' ? activeElement : null;
}
function findCheckListItemSibling(node, backward) {
  let sibling = backward ? node.getPreviousSibling() : node.getNextSibling();
  let parent = node;

  // Going up in a tree to get non-null sibling
  while (sibling == null && $isListItemNode(parent)) {
    // Get li -> parent ul/ol -> parent li
    parent = parent.getParentOrThrow().getParent();
    if (parent != null) {
      sibling = backward ? parent.getPreviousSibling() : parent.getNextSibling();
    }
  }

  // Going down in a tree to get first non-nested list item
  while ($isListItemNode(sibling)) {
    const firstChild = backward ? sibling.getLastChild() : sibling.getFirstChild();
    if (!$isListNode(firstChild)) {
      return sibling;
    }
    sibling = backward ? firstChild.getLastChild() : firstChild.getFirstChild();
  }
  return null;
}
function handleArrowUpOrDown(event, editor, backward) {
  const activeItem = getActiveCheckListItem(editor);
  if (activeItem != null) {
    editor.update(() => {
      const listItem = lexical.$getNearestNodeFromDOMNode(activeItem);
      if (!$isListItemNode(listItem)) {
        return;
      }
      const nextListItem = findCheckListItemSibling(listItem, backward);
      if (nextListItem != null) {
        nextListItem.selectStart();
        const dom = editor.getElementByKey(nextListItem.__key);
        if (dom != null) {
          event.preventDefault();
          setTimeout(() => {
            dom.focus();
          }, 0);
        }
      }
    });
  }
  return false;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */


/**
 * Mirrors the legacy `isDomChecklist` heuristic from
 * `@lexical/list`.
 */
function isDomChecklist(domNode) {
  return domNode.matches('[__lexicallisttype="check"], .contains-task-list, [data-is-checklist="1"]') || domNode.querySelector(':scope > [aria-checked]') !== null;
}

/**
 * Lift nested `ListNode`s out of `ListItemNode`s into sibling
 * `ListItemNode`s (the legacy `$normalizeChildren` shape). Also wraps any
 * non-`ListItemNode` children in a new `ListItemNode`.
 */
function $normalizeListChildren(children) {
  const out = [];
  for (const child of children) {
    if ($isListItemNode(child)) {
      out.push(child);
      const innerChildren = child.getChildren();
      if (innerChildren.length > 1) {
        for (const inner of innerChildren) {
          if ($isListNode(inner)) {
            out.push($createListItemNode().append(inner));
          }
        }
      }
    } else {
      out.push($createListItemNode().append(child));
    }
  }
  return out;
}
const ListRule = /* @__PURE__ */html.defineImportRule({
  $import: (ctx, el) => {
    let node;
    if (html.isElementOfTag(el, 'ol')) {
      node = $createListNode('number', el.start);
    } else if (isDomChecklist(el)) {
      node = $createListNode('check');
    } else {
      node = $createListNode('bullet');
    }
    lexical.$setDirectionFromDOM(node, el);
    // Propagate the list's `text-align` onto each `ListItemNode` child
    // (legacy `wrapContinuousInlines` did the same), so pasting
    // `<ul style="text-align: left"><li>…</li></ul>` ends up with the
    // alignment on the list items where the reconciler renders it as
    // `style="text-align: left"`.
    return [node.splice(0, 0, html.$propagateTextAlignToBlockChildren($normalizeListChildren(ctx.$importChildren(el)), el))];
  },
  match: html.sel.tag('ol', 'ul'),
  name: '@lexical/list/list'
});

/**
 * Apply formatting from the first child paragraph of `<li>` to the list
 * item itself, then unwrap that paragraph (Google Docs sets the alignment
 * of the `<p>` inside the `<li>`). Mirrors the legacy
 * `setFormatFromChildren`.
 */
function $liftFormatFromSingleParagraph(listItemNode, children) {
  if (children.length !== 1) {
    return children;
  }
  const firstChild = children[0];
  if (lexical.$isParagraphNode(firstChild) && !listItemNode.getFormatType() && firstChild.getFormatType()) {
    listItemNode.setFormat(firstChild.getFormatType());
    return firstChild.getChildren();
  }
  return children;
}

/**
 * Collapse block children of a `<li>` into inline-with-line-break form: a
 * `ListItemNode` is an inline-level container, so any block child marks a
 * boundary. Contiguous inline siblings are kept together as a single run and
 * one {@link $createLineBreakNode} is inserted between runs — reproducing the
 * legacy `wrapContinuousInlines` + `$unwrapArtificialNodes` shape
 * (`<li>1<div>2</div>3</li>` → `1<br>2<br>3`) without the
 * `ArtificialNode__DO_NOT_USE` marker.
 *
 * Boundaries are detected with {@link $isBlockLevel}, NOT `$isParagraphNode`:
 * the `<div>`/`<section>`/… `TransparentBlockRule` happens to emit
 * `ParagraphNode`s, but a `<blockquote>` (`QuoteNode`), heading
 * (`HeadingNode`), or block decorator (`HorizontalRuleNode`, …) is just as
 * much a block boundary and must not be silently spliced into the list item
 * as-is. A nested `ListNode` is the one deliberate exception — it is a valid
 * list-item child that {@link $normalizeListChildren} lifts into a sibling,
 * so it is preserved here rather than unwrapped.
 */
function $flattenListItemBlocks(children) {
  const $isBoundary = node => html.$isBlockLevel(node) && !$isListNode(node);
  if (!children.some($isBoundary)) {
    return children;
  }
  // Partition into segments — each maximal run of inline siblings, and each
  // boundary's own content — then join the segments with a single line break.
  const segments = [];
  let inlineRun = [];
  const flushInlineRun = () => {
    if (inlineRun.length > 0) {
      segments.push(inlineRun);
      inlineRun = [];
    }
  };
  for (const child of children) {
    if ($isBoundary(child)) {
      flushInlineRun();
      // Unwrap a block ElementNode to its inline content; a childless block
      // DecoratorNode stands on its own line.
      segments.push(lexical.$isElementNode(child) ? child.getChildren() : [child]);
    } else {
      inlineRun.push(child);
    }
  }
  flushInlineRun();
  const out = [];
  for (const segment of segments) {
    if (out.length > 0) {
      out.push(lexical.$createLineBreakNode());
    }
    out.push(...segment);
  }
  return out;
}
const ListItemRule = /* @__PURE__ */html.defineImportRule({
  $import: (ctx, el) => {
    const ariaChecked = el.getAttribute('aria-checked');
    const checked = ariaChecked === 'true' ? true : ariaChecked === 'false' ? false : undefined;
    const node = $createListItemNode(checked);
    lexical.$setFormatFromDOM(node, el);
    lexical.$setDirectionFromDOM(node, el);
    return [node.splice(0, 0,
    // Lift a sole wrapping paragraph's format onto the item *before*
    // flattening, otherwise the paragraph would already be unwrapped and
    // its alignment lost.
    $flattenListItemBlocks($liftFormatFromSingleParagraph(node, ctx.$importChildren(el))))];
  },
  match: html.sel.tag('li'),
  name: '@lexical/list/li'
});
function $buildChecklistItem(ctx, el, checkboxOwner) {
  const checkboxInput = html.isElementOfTag(checkboxOwner, 'input') ? checkboxOwner : checkboxOwner.querySelector('input[type="checkbox"]');
  if (!checkboxInput || checkboxInput.getAttribute('type') !== 'checkbox') {
    return [];
  }
  const checked = checkboxInput.hasAttribute('checked');
  const node = $createListItemNode(checked);
  lexical.$setFormatFromDOM(node, el);
  lexical.$setDirectionFromDOM(node, el);
  return [node.splice(0, 0, $flattenListItemBlocks($liftFormatFromSingleParagraph(node, ctx.$importChildren(el))))];
}
const TaskListItemRule = /* @__PURE__ */html.defineImportRule({
  $import: (ctx, el, $next) => {
    const input = el.querySelector(':scope > input[type="checkbox"]');
    if (!input) {
      return $next();
    }
    return $buildChecklistItem(ctx, el, input);
  },
  match: html.sel.tag('li').classAll('task-list-item'),
  name: '@lexical/list/li-task-list-item'
});
const JoplinChecklistItemRule = /* @__PURE__ */html.defineImportRule({
  $import: (ctx, el, $next) => {
    const wrapper = el.querySelector(':scope > .checkbox-wrapper');
    if (!wrapper) {
      return $next();
    }
    const input = wrapper.querySelector(':scope > input[type="checkbox"]');
    if (!input) {
      return $next();
    }
    return $buildChecklistItem(ctx, el, input);
  },
  match: html.sel.tag('li').classAll('joplin-checkbox'),
  name: '@lexical/list/li-joplin-checkbox'
});

/**
 * A {@link ChildSchema} that enforces ListNode invariants: only
 * `ListItemNode` and (immediately-nested) `ListNode` children are
 * accepted; runs of other children get wrapped in a fresh
 * `ListItemNode`.
 *
 * @experimental
 */
const ListSchema = {
  $accepts: child => $isListItemNode(child) || $isListNode(child),
  // Inline runs inside a `<ul>`/`<ol>` (e.g. text between two `<li>`s)
  // become the children of a synthetic `ListItemNode`. `ListItemNode`
  // is itself a block-level container of inlines, so no intermediate
  // `ParagraphNode` is needed (and the demoted-paragraph normalization
  // would strip one anyway).
  $packageRun: run => [$createListItemNode().splice(0, 0, run)],
  name: 'ListSchema'
};

/**
 * Import rules for {@link ListNode} and {@link ListItemNode}, including
 * GitHub task-list and Joplin checkbox heuristics.
 *
 * Registered by {@link ListExtension} itself (together with
 * `CoreImportExtension`), so any editor that uses the list extension can
 * import these tags through the `DOMImportExtension` pipeline without
 * further configuration.
 *
 * @experimental
 */
const ListImportRules = [
// More specific rules (class-restricted) must precede the generic `li`
// rule so they win the dispatch race (lower array index = higher
// priority).
TaskListItemRule, JoplinChecklistItemRule, ListRule, ListItemRule];

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const UPDATE_LIST_START_COMMAND = /* @__PURE__ */lexical.createCommand('UPDATE_LIST_START_COMMAND');
const INSERT_UNORDERED_LIST_COMMAND = /* @__PURE__ */lexical.createCommand('INSERT_UNORDERED_LIST_COMMAND');
const INSERT_ORDERED_LIST_COMMAND = /* @__PURE__ */lexical.createCommand('INSERT_ORDERED_LIST_COMMAND');
const REMOVE_LIST_COMMAND = /* @__PURE__ */lexical.createCommand('REMOVE_LIST_COMMAND');
function registerList(editor, options) {
  const removeListener = lexical.mergeRegister(editor.registerCommand(INSERT_ORDERED_LIST_COMMAND, () => {
    $insertList('number');
    return true;
  }, lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(UPDATE_LIST_START_COMMAND, payload => {
    const {
      listNodeKey,
      newStart
    } = payload;
    const listNode = lexical.$getNodeByKey(listNodeKey);
    if (!$isListNode(listNode)) {
      return false;
    }
    if (listNode.getListType() === 'number') {
      listNode.setStart(newStart);
      updateChildrenListItemValue(listNode);
    }
    return true;
  }, lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(INSERT_UNORDERED_LIST_COMMAND, () => {
    $insertList('bullet');
    return true;
  }, lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(REMOVE_LIST_COMMAND, () => {
    $removeList();
    return true;
  }, lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(lexical.INSERT_PARAGRAPH_COMMAND, () => {
    const shouldRestore = options && options.restoreNumbering;
    return $handleListInsertParagraph(!!shouldRestore);
  }, lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(lexical.KEY_BACKSPACE_COMMAND, event => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection) || !selection.isCollapsed()) {
      return false;
    }
    const {
      anchor
    } = selection;
    if (anchor.offset !== 0) {
      return false;
    }
    let current = anchor.getNode();
    while (!$isListItemNode(current)) {
      if (current.getPreviousSibling() !== null) {
        return false;
      }
      const parent = current.getParent();
      if (parent === null) {
        return false;
      }
      current = parent;
    }
    if ($isListItemNode(current) && current.collapseAtStart(selection)) {
      event.preventDefault();
      return true;
    }
    return false;
  }, lexical.COMMAND_PRIORITY_BEFORE_EDITOR), editor.registerNodeTransform(ListItemNode, node => {
    const firstChild = node.getFirstChild();
    if (firstChild) {
      if (lexical.$isTextNode(firstChild)) {
        const style = firstChild.getStyle();
        const format = firstChild.getFormat();
        if (node.getTextStyle() !== style) {
          node.setTextStyle(style);
        }
        if (node.getTextFormat() !== format) {
          node.setTextFormat(format);
        }
      }
    } else {
      // If it's empty, check the selection
      const selection = lexical.$getSelection();
      if (lexical.$isRangeSelection(selection) && (selection.style !== node.getTextStyle() || selection.format !== node.getTextFormat()) && selection.isCollapsed() && node.is(selection.anchor.getNode())) {
        node.setTextStyle(selection.style).setTextFormat(selection.format);
      }
    }
  }), editor.registerNodeTransform(lexical.TextNode, node => {
    const listItemParentNode = node.getParent();
    if ($isListItemNode(listItemParentNode) && node.is(listItemParentNode.getFirstChild())) {
      const style = node.getStyle();
      const format = node.getFormat();
      if (style !== listItemParentNode.getTextStyle() || format !== listItemParentNode.getTextFormat()) {
        listItemParentNode.setTextStyle(style).setTextFormat(format);
      }
    }
  }));
  return removeListener;
}
function registerListStrictIndentTransform(editor) {
  const $formatListIndentStrict = listItemNode => {
    const listNode = listItemNode.getParent();
    if ($isListNode(listItemNode.getFirstChild()) || !$isListNode(listNode)) {
      return;
    }
    const startingListItemNode = lexical.$findMatchingParent(listItemNode, node => $isListItemNode(node) && $isListNode(node.getParent()) && $isListItemNode(node.getPreviousSibling()));
    if (startingListItemNode === null && listItemNode.getIndent() > 0) {
      listItemNode.setIndent(0);
    } else if ($isListItemNode(startingListItemNode)) {
      const prevListItemNode = startingListItemNode.getPreviousSibling();
      if ($isListItemNode(prevListItemNode)) {
        const endListItemNode = $findChildrenEndListItemNode(prevListItemNode);
        const endListNode = endListItemNode.getParent();
        if ($isListNode(endListNode)) {
          const prevDepth = $getListDepth(endListNode);
          const depth = $getListDepth(listNode);
          if (prevDepth + 1 < depth) {
            listItemNode.setIndent(prevDepth);
          }
        }
      }
    }
  };
  const $processListWithStrictIndent = listNode => {
    const queue = [listNode];
    while (queue.length > 0) {
      const node = queue.shift();
      if (!$isListNode(node)) {
        continue;
      }
      for (const child of node.getChildren()) {
        if ($isListItemNode(child)) {
          $formatListIndentStrict(child);
          const firstChild = child.getFirstChild();
          if ($isListNode(firstChild)) {
            queue.push(firstChild);
          }
        }
      }
    }
  };
  return editor.registerNodeTransform(ListNode, $processListWithStrictIndent);
}
function $findChildrenEndListItemNode(listItemNode) {
  let current = listItemNode;
  let firstChild = current.getFirstChild();
  while ($isListNode(firstChild)) {
    const lastChild = firstChild.getLastChild();
    if ($isListItemNode(lastChild)) {
      current = lastChild;
      firstChild = current.getFirstChild();
    } else {
      break;
    }
  }
  return current;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Configures {@link ListNode}, {@link ListItemNode} and registers
 * the strict indent transform if `hasStrictIndent` is true (default false).
 */
const ListExtension = /* @__PURE__ */lexical.defineExtension({
  build(editor, config, state) {
    return extension.namedSignals(config);
  },
  config: /* @__PURE__ */lexical.safeCast({
    hasStrictIndent: false,
    shouldPreserveNumbering: false
  }),
  dependencies: [
  // DOMImportExtension support for the nodes registered here. Inert
  // unless the editor routes HTML through the pipeline (e.g. via
  // ClipboardDOMImportExtension or $generateNodesFromDOMViaExtension).
  html.CoreImportExtension, /* @__PURE__ */lexical.configExtension(html.DOMImportExtension, {
    rules: ListImportRules
  })],
  name: '@lexical/list/List',
  nodes: () => [ListNode, ListItemNode],
  register(editor, config, state) {
    const stores = state.getOutput();
    return lexical.mergeRegister(extension.effect(() => {
      return registerList(editor, {
        restoreNumbering: stores.shouldPreserveNumbering.value
      });
    }), extension.effect(() => stores.hasStrictIndent.value ? registerListStrictIndentTransform(editor) : undefined));
  }
});
/**
 * Registers checklist functionality for {@link ListNode} and
 * {@link ListItemNode} with a `INSERT_CHECK_LIST_COMMAND` listener and
 * the expected keyboard and mouse interactions for checkboxes.
 */
const CheckListExtension = /* @__PURE__ */lexical.defineExtension({
  build: (editor, config) => extension.namedSignals(config),
  config: /* @__PURE__ */lexical.safeCast({
    disableTakeFocusOnClick: false
  }),
  dependencies: [ListExtension],
  name: '@lexical/list/CheckList',
  register: (editor, config, state) => registerCheckList(editor, state.getOutput())
});

/**
 * Bundles {@link ListImportRules} together with the runtime
 * {@link ListExtension}.
 *
 * @experimental
 * @deprecated {@link ListExtension} now registers
 * {@link ListImportRules} (and `CoreImportExtension`) itself — depend on
 * it directly instead.
 */
const ListImportExtension = /* @__PURE__ */lexical.defineExtension({
  dependencies: [ListExtension],
  name: '@lexical/list/Import'
});

exports.$createListItemNode = $createListItemNode;
exports.$createListNode = $createListNode;
exports.$getListDepth = $getListDepth;
exports.$handleListInsertParagraph = $handleListInsertParagraph;
exports.$insertList = $insertList;
exports.$isListItemNode = $isListItemNode;
exports.$isListNode = $isListNode;
exports.$removeList = $removeList;
exports.CheckListExtension = CheckListExtension;
exports.INSERT_CHECK_LIST_COMMAND = INSERT_CHECK_LIST_COMMAND;
exports.INSERT_ORDERED_LIST_COMMAND = INSERT_ORDERED_LIST_COMMAND;
exports.INSERT_UNORDERED_LIST_COMMAND = INSERT_UNORDERED_LIST_COMMAND;
exports.ListExtension = ListExtension;
exports.ListImportExtension = ListImportExtension;
exports.ListImportRules = ListImportRules;
exports.ListItemNode = ListItemNode;
exports.ListNode = ListNode;
exports.ListSchema = ListSchema;
exports.REMOVE_LIST_COMMAND = REMOVE_LIST_COMMAND;
exports.UPDATE_LIST_START_COMMAND = UPDATE_LIST_START_COMMAND;
exports.registerCheckList = registerCheckList;
exports.registerList = registerList;
exports.registerListStrictIndentTransform = registerListStrictIndentTransform;
