/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

var clipboard = require('@lexical/clipboard');
var dragon = require('@lexical/dragon');
var extension = require('@lexical/extension');
var selection = require('@lexical/selection');
var utils = require('@lexical/utils');
var lexical = require('lexical');

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

function onCopyForPlainText(event, editor) {
  editor.update(() => {
    if (event !== null) {
      const clipboardData = utils.objectKlassEquals(event, KeyboardEvent) ? null : event.clipboardData;
      const selection = lexical.$getSelection();
      if (selection !== null && !selection.isCollapsed() && clipboardData != null) {
        event.preventDefault();
        const htmlString = clipboard.$getHtmlContent(editor);
        if (htmlString !== null) {
          clipboardData.setData('text/html', htmlString);
        }
        clipboardData.setData('text/plain', selection.getTextContent());
      }
    }
  });
}
function onPasteForPlainText(event, editor) {
  event.preventDefault();
  editor.update(() => {
    const selection = lexical.$getSelection();
    const clipboardData = utils.objectKlassEquals(event, ClipboardEvent) ? event.clipboardData : null;
    if (clipboardData != null && lexical.$isRangeSelection(selection)) {
      clipboard.$insertDataTransferForPlainText(clipboardData, selection);
    }
  }, {
    // PASTE_TAG gives the paste its own undo entry: @lexical/history treats
    // the tag as a history boundary so undoing a paste does not also undo any
    // typing that preceded it (see #8609).
    tag: lexical.PASTE_TAG
  });
}
function onCutForPlainText(event, editor) {
  onCopyForPlainText(event, editor);
  editor.update(() => {
    const selection = lexical.$getSelection();
    if (lexical.$isRangeSelection(selection)) {
      selection.removeText();
    }
  }, {
    // CUT_TAG gives the cut its own undo entry: @lexical/history treats the
    // tag as a history boundary so undoing a cut does not also undo any typing
    // that preceded it (see #8609).
    tag: lexical.CUT_TAG
  });
}
function registerPlainText(editor) {
  const removeListener = lexical.mergeRegister(editor.registerCommand(lexical.DELETE_CHARACTER_COMMAND, isBackward => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    selection.deleteCharacter(isBackward);
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.DELETE_WORD_COMMAND, isBackward => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    selection.deleteWord(isBackward);
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.DELETE_LINE_COMMAND, isBackward => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    selection.deleteLine(isBackward);
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.CONTROLLED_TEXT_INSERTION_COMMAND, eventOrText => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    if (typeof eventOrText === 'string') {
      selection.insertText(eventOrText);
    } else {
      const dataTransfer = eventOrText.dataTransfer;
      if (dataTransfer != null) {
        clipboard.$insertDataTransferForPlainText(dataTransfer, selection);
      } else {
        const data = eventOrText.data;
        if (data) {
          selection.insertText(data);
        }
      }
    }
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.REMOVE_TEXT_COMMAND, () => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    selection.removeText();
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.INSERT_LINE_BREAK_COMMAND, selectStart => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    selection.insertLineBreak(selectStart);
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.INSERT_PARAGRAPH_COMMAND, () => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    selection.insertLineBreak();
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.KEY_ARROW_LEFT_COMMAND, payload => {
    const selection$1 = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection$1)) {
      return false;
    }
    const event = payload;
    const isHoldingShift = event.shiftKey;
    if (selection.$shouldOverrideDefaultCharacterSelection(selection$1, true)) {
      event.preventDefault();
      selection.$moveCharacter(selection$1, isHoldingShift, true);
      return true;
    }
    return false;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.KEY_ARROW_RIGHT_COMMAND, payload => {
    const selection$1 = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection$1)) {
      return false;
    }
    const event = payload;
    const isHoldingShift = event.shiftKey;
    if (selection.$shouldOverrideDefaultCharacterSelection(selection$1, false)) {
      event.preventDefault();
      selection.$moveCharacter(selection$1, isHoldingShift, false);
      return true;
    }
    return false;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.KEY_BACKSPACE_COMMAND, event => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }

    // On iOS, blocking the keydown event's default prevents the system
    // keyboard from updating its autocomplete/autocorrect suggestion bar
    // after Backspace. Returning false here skips event.preventDefault()
    // on keydown; the beforeinput deleteContentBackward handler still runs
    // and performs the deletion, so editing behavior is unchanged.
    // See https://github.com/facebook/lexical/issues/5841
    if (lexical.IS_IOS && lexical.CAN_USE_BEFORE_INPUT) {
      return false;
    }
    event.preventDefault();
    return editor.dispatchCommand(lexical.DELETE_CHARACTER_COMMAND, true);
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.KEY_DELETE_COMMAND, event => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    event.preventDefault();
    return editor.dispatchCommand(lexical.DELETE_CHARACTER_COMMAND, false);
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.KEY_ENTER_COMMAND, event => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    if (event !== null) {
      // If we have beforeinput, then we can avoid blocking
      // the default behavior. This ensures that the iOS can
      // intercept that we're actually inserting a paragraph,
      // and autocomplete, autocapitalize etc work as intended.
      // This can also cause a strange performance issue in
      // Safari, where there is a noticeable pause due to
      // preventing the key down of enter.
      if ((lexical.IS_IOS || lexical.IS_SAFARI || lexical.IS_APPLE_WEBKIT) && lexical.CAN_USE_BEFORE_INPUT) {
        return false;
      }
      event.preventDefault();
    }
    return editor.dispatchCommand(lexical.INSERT_LINE_BREAK_COMMAND, false);
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.SELECT_ALL_COMMAND, () => {
    // Scope SELECT_ALL only when the caret is inside a named-slot frame:
    // slots are shadow-root isolated, so a whole-document select-all
    // would escape the slot and let a single keystroke replace the host.
    // Every other context (including TableCell shadow roots) keeps the
    // legacy whole-document behavior; block/document scoping elsewhere
    // is provided by the opt-in SelectBlockExtension.
    const selection = lexical.$getSelection();
    lexical.$selectAll(lexical.$isRangeSelection(selection) && lexical.$getSlotFrame(selection.anchor.getNode()) !== null ? selection : null);
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.COPY_COMMAND, event => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    onCopyForPlainText(event, editor);
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.CUT_COMMAND, event => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    onCutForPlainText(event, editor);
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.PASTE_COMMAND, event => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    onPasteForPlainText(event, editor);
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.DROP_COMMAND, event => clipboard.$handlePlainTextDrop(event, editor), lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.DRAGSTART_COMMAND, event => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    // Mark the drag source so a drop in a different editor can remove
    // the source range to produce cut-and-paste semantics.
    if (!selection.isCollapsed() && event.dataTransfer !== null) {
      clipboard.$writeDragSourceToDataTransfer(event.dataTransfer, editor);
    }
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR));
  return removeListener;
}

/**
 * An extension to register \@lexical/plain-text behavior
 */
const PlainTextExtension = /* @__PURE__ */lexical.defineExtension({
  conflictsWith: ['@lexical/rich-text'],
  dependencies: [dragon.DragonExtension, extension.NormalizeInlineElementsExtension, extension.NormalizeTripleClickSelectionExtension],
  name: '@lexical/plain-text',
  register: registerPlainText
});

exports.PlainTextExtension = PlainTextExtension;
exports.registerPlainText = registerPlainText;
