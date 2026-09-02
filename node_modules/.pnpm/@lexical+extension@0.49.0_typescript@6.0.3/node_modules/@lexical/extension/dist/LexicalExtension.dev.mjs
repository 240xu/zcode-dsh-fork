/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { defineExtension, safeCast, getActiveElement, CLEAR_EDITOR_COMMAND, COMMAND_PRIORITY_EDITOR, $getRoot, $getSelection, $createParagraphNode, $isRangeSelection, $isDecoratorNode, $isElementNode, registerEventListeners, stopLexicalPropagation, getStaticNodeConfig, DecoratorNode, $getState, toggleTextFormatType, $setState, $getDocument, TEXT_TYPE_TO_FORMAT, createState, shallowMergeConfig, RootNode, TextNode, LineBreakNode, TabNode, ParagraphNode, $isEditorState, HISTORY_MERGE_TAG, createEditor, mergeRegister, $getEditor, $getNodeByKey, $create, CLICK_COMMAND, isDOMNode, $getNodeFromDOMNode, COMMAND_PRIORITY_LOW, addClassNamesToElement, createCommand, $isNodeSelection, $createNodeSelection, $setSelection, removeClassNamesFromElement, COMPOSITION_START_COMMAND, COMMAND_PRIORITY_BEFORE_EDITOR, COMPOSITION_START_TAG, $isTextNode, registerEventListener, getRegisteredSubtypeMap, ElementNode, $getCaretRangeInDirection, $caretRangeFromSelection, $isTextPointCaret, $rewindSiblingCaret, $isSiblingCaret, $isLineBreakNode, $isChildCaret, $getSiblingCaret, $normalizeCaret, $getChildCaret, $setSelectionFromCaretRange, $getCaretRange, getDOMSelection, $updateDOMSelection, $getPreviousSelection, SKIP_SELECTION_FOCUS_TAG, SKIP_SCROLL_INTO_VIEW_TAG, SELECTION_CHANGE_COMMAND, COMMAND_PRIORITY_BEFORE_CRITICAL, isExactShortcutMatch, IS_APPLE, isHTMLElement, SELECT_ALL_COMMAND, $selectAll, $isRootNode, $getSlotFrame, $getSlotHost, KEY_TAB_COMMAND, OUTDENT_CONTENT_COMMAND, INDENT_CONTENT_COMMAND, INSERT_TAB_COMMAND, COMMAND_PRIORITY_CRITICAL, $isBlockElementNode, $createRangeSelection, $normalizeSelection__EXPERIMENTAL } from 'lexical';
export { configExtension, declarePeerDependency, defineExtension, safeCast, shallowMergeConfig } from 'lexical';
import { $insertNodeToNearestRoot, $isBlockFullySelected, selectionAlwaysOnDisplay, $handleIndentAndOutdent, $getNearestBlockElementAncestorOrThrow } from '@lexical/utils';

const i=Symbol.for("preact-signals");function t(){if(e>1){e--;return}let i,t=false;!function(){let i=r;r=void 0;while(void 0!==i){if(i.S.v===i.v)i.S.i=i.i;i=i.o;}}();while(void 0!==s){let n=s;s=void 0;u++;while(void 0!==n){const o=n.u;n.u=void 0;n.f&=-3;if(!(8&n.f)&&w(n))try{n.c();}catch(n){if(!t){i=n;t=true;}}n=o;}}u=0;e--;if(t)throw i}function n(i){if(e>0)return i();d=++c;e++;try{return i()}finally{t();}}let o,s;function h(i){const t=o;o=void 0;try{return i()}finally{o=t;}}let r,e=0,u=0,c=0,d=0,v=0;function l(i){if(void 0===o)return;let t=i.n;if(void 0===t||t.t!==o){t={i:0,S:i,p:o.s,n:void 0,t:o,e:void 0,x:void 0,r:t};if(void 0!==o.s)o.s.n=t;o.s=t;i.n=t;if(32&o.f)i.S(t);return t}else if(-1===t.i){t.i=0;if(void 0!==t.n){t.n.p=t.p;if(void 0!==t.p)t.p.n=t.n;t.p=o.s;t.n=void 0;o.s.n=t;o.s=t;}return t}}function y(i,t){this.v=i;this.i=0;this.n=void 0;this.t=void 0;this.l=0;this.W=null==t?void 0:t.watched;this.Z=null==t?void 0:t.unwatched;this.name=null==t?void 0:t.name;}y.prototype.brand=i;y.prototype.h=function(){return  true};y.prototype.S=function(i){const t=this.t;if(t!==i&&void 0===i.e){i.x=t;this.t=i;if(void 0!==t)t.e=i;else h(()=>{var i;null==(i=this.W)||i.call(this);});}};y.prototype.U=function(i){if(void 0!==this.t){const t=i.e,n=i.x;if(void 0!==t){t.x=n;i.e=void 0;}if(void 0!==n){n.e=t;i.x=void 0;}if(i===this.t){this.t=n;if(void 0===n)h(()=>{var i;null==(i=this.Z)||i.call(this);});}}};y.prototype.subscribe=function(i){return j(()=>{const t=this.value,n=o;o=void 0;try{i(t);}finally{o=n;}},{name:"sub"})};y.prototype.valueOf=function(){return this.value};y.prototype.toString=function(){return this.value+""};y.prototype.toJSON=function(){return this.value};y.prototype.peek=function(){const i=o;o=void 0;try{return this.value}finally{o=i;}};Object.defineProperty(y.prototype,"value",{get(){const i=l(this);if(void 0!==i)i.i=this.i;return this.v},set(i){if(i!==this.v){if(u>100)throw new Error("Cycle detected");!function(i){if(0!==e&&0===u)if(i.l!==d){i.l=d;r={S:i,v:i.v,i:i.i,o:r};}}(this);this.v=i;this.i++;v++;e++;try{for(let i=this.t;void 0!==i;i=i.x)i.t.N();}finally{t();}}}});function a(i,t){return new y(i,t)}function w(i){for(let t=i.s;void 0!==t;t=t.n)if(t.S.i!==t.i||!t.S.h()||t.S.i!==t.i)return  true;return  false}function _(i){for(let t=i.s;void 0!==t;t=t.n){const n=t.S.n;if(void 0!==n)t.r=n;t.S.n=t;t.i=-1;if(void 0===t.n){i.s=t;break}}}function b(i){let t,n=i.s;while(void 0!==n){const i=n.p;if(-1===n.i){n.S.U(n);if(void 0!==i)i.n=n.n;if(void 0!==n.n)n.n.p=i;}else t=n;n.S.n=n.r;if(void 0!==n.r)n.r=void 0;n=i;}i.s=t;}function p(i,t){y.call(this,void 0);this.x=i;this.s=void 0;this.g=v-1;this.f=4;this.W=null==t?void 0:t.watched;this.Z=null==t?void 0:t.unwatched;this.name=null==t?void 0:t.name;}p.prototype=new y;p.prototype.h=function(){this.f&=-3;if(1&this.f)return  false;if(32==(36&this.f))return  true;this.f&=-5;if(this.g===v)return  true;this.g=v;this.f|=1;if(this.i>0&&!w(this)){this.f&=-2;return  true}const i=o;try{_(this);o=this;const i=this.x();if(16&this.f||this.v!==i||0===this.i){this.v=i;this.f&=-17;this.i++;}}catch(i){this.v=i;this.f|=16;this.i++;}o=i;b(this);this.f&=-2;return  true};p.prototype.S=function(i){if(void 0===this.t){this.f|=36;for(let i=this.s;void 0!==i;i=i.n)i.S.S(i);}y.prototype.S.call(this,i);};p.prototype.U=function(i){if(void 0!==this.t){y.prototype.U.call(this,i);if(void 0===this.t){this.f&=-33;for(let i=this.s;void 0!==i;i=i.n)i.S.U(i);}}};p.prototype.N=function(){if(!(2&this.f)){this.f|=6;for(let i=this.t;void 0!==i;i=i.x)i.t.N();}};Object.defineProperty(p.prototype,"value",{get(){if(1&this.f)throw new Error("Cycle detected");const i=l(this);this.h();if(void 0!==i)i.i=this.i;if(16&this.f)throw this.v;return this.v}});function g(i,t){return new p(i,t)}function S(i){const n=i.m;i.m=void 0;if("function"==typeof n){e++;const s=o;o=void 0;try{n();}catch(t){i.f&=-2;i.f|=8;m(i);throw t}finally{o=s;t();}}}function m(i){for(let t=i.s;void 0!==t;t=t.n)t.S.U(t);i.x=void 0;i.s=void 0;S(i);}function x(i){if(o!==this)throw new Error("Out-of-order effect");b(this);o=i;this.f&=-2;if(8&this.f)m(this);t();}function E(i,t){this.x=i;this.m=void 0;this.s=void 0;this.u=void 0;this.f=32;this.name=null==t?void 0:t.name;}E.prototype.c=function(){const i=this.S();try{if(8&this.f)return;if(void 0===this.x)return;const t=this.x();if("function"==typeof t)this.m=t;}finally{i();}};E.prototype.S=function(){if(1&this.f)throw new Error("Cycle detected");this.f|=1;this.f&=-9;S(this);_(this);e++;const i=o;o=this;return x.bind(this,i)};E.prototype.N=function(){if(!(2&this.f)){this.f|=2;this.u=s;s=this;}};E.prototype.d=function(){this.f|=8;if(!(1&this.f))m(this);};E.prototype.dispose=function(){this.d();};function j(i,t){const n=new E(i,t);try{n.c();}catch(i){n.d();throw i}const o=n.d.bind(n);o[Symbol.dispose]=o;return o}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/**
 * Return an object with the same shape as `defaults` with a {@link Signal}
 * for each value. If specified, the second `opts` argument is a partial
 * of overrides to the defaults and will be used as the initial value.
 *
 * Typically used to make a reactive version of some subset of the
 * configuration of an extension, so it can be reconfigured at runtime.
 *
 * @param defaults The object with default values
 * @param opts Overrides to those default values
 * @returns An object with signals initialized with the default values
 */
function namedSignals(defaults, opts = {}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initial = {};
  for (const k in defaults) {
    const v = opts[k];
    const store = a(v === undefined ? defaults[k] : v);
    initial[k] = store;
  }
  return initial;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * An Extension to focus the LexicalEditor when the root element is set
 * (typically only when the editor is first created).
 */
const AutoFocusExtension = /* @__PURE__ */defineExtension({
  build: (editor, config, state) => {
    return namedSignals(config);
  },
  config: /* @__PURE__ */safeCast({
    defaultSelection: 'rootEnd',
    disabled: false
  }),
  name: '@lexical/extension/AutoFocus',
  register(editor, config, state) {
    const stores = state.getOutput();
    return j(() => stores.disabled.value ? undefined : editor.registerRootListener(rootElement => {
      editor.focus(() => {
        // If we try and move selection to the same point with setBaseAndExtent, it won't
        // trigger a re-focus on the element. So in the case this occurs, we'll need to correct it.
        // Normally this is fine, Selection API !== Focus API, but fore the intents of the naming
        // of this plugin, which should preserve focus too.
        // getActiveElement rather than document.activeElement, which
        // reports the shadow host when the editor is in a shadow root.
        const activeElement = rootElement !== null ? getActiveElement(rootElement) : null;
        if (rootElement !== null && (activeElement === null || !rootElement.contains(activeElement))) {
          // Note: preventScroll won't work in Webkit.
          rootElement.focus({
            preventScroll: true
          });
        }
      }, {
        defaultSelection: stores.defaultSelection.peek()
      });
    }));
  }
});

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

function $defaultOnClear() {
  const root = $getRoot();
  const selection = $getSelection();
  const paragraph = $createParagraphNode();
  root.clear();
  root.append(paragraph);
  if (selection !== null) {
    paragraph.select();
  }
  if ($isRangeSelection(selection)) {
    selection.format = 0;
  }
}
function registerClearEditor(editor, $onClear = $defaultOnClear) {
  return editor.registerCommand(CLEAR_EDITOR_COMMAND, () => {
    // Command listeners already run in an update context. Wrapping
    // $onClear in editor.update() would queue it as a nested update when
    // the command is dispatched from inside another update, running it
    // after the rest of that update's callback instead of inline here.
    $onClear();
    return true;
  }, COMMAND_PRIORITY_EDITOR);
}

/**
 * An extension to provide an implementation of {@link CLEAR_EDITOR_COMMAND}
 */
const ClearEditorExtension = /* @__PURE__ */defineExtension({
  build(editor, config, state) {
    return namedSignals(config);
  },
  config: /* @__PURE__ */safeCast({
    $onClear: $defaultOnClear
  }),
  name: '@lexical/extension/ClearEditor',
  register(editor, config, state) {
    const {
      $onClear
    } = state.getOutput();
    return j(() => registerClearEditor(editor, $onClear.value));
  }
});

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */


/**
 * @experimental
 *
 * Default predicate matches {@link DecoratorNode} and shadow-root
 * `ElementNode`s (e.g. `TableNode`). Apps that want to also trigger on
 * other node types — `CodeNode`, custom non-editable blocks — should
 * compose this default in their own predicate rather than re-deriving
 * the check:
 *
 * ```ts
 * configExtension(ClickAfterLastBlockExtension, {
 *   $shouldInsertAfter: (node) =>
 *     $defaultShouldInsertAfter(node) || $isCodeNode(node),
 * });
 * ```
 */
function $defaultShouldInsertAfter(node) {
  if ($isDecoratorNode(node)) {
    return true;
  }
  if ($isElementNode(node) && node.isShadowRoot()) {
    return true;
  }
  return false;
}
/**
 * Decide whether a click at `event` should be claimed by this extension.
 * Used by both the mousedown listener (to call preventDefault on the
 * browser's native caret pick) and the click listener (to actually
 * insert the paragraph). Factored out so the two handlers stay in sync
 * — they would otherwise share ~22 lines of byte-for-byte identical
 * logic and have to be maintained together.
 *
 * Read-only because it is called outside an editor.update; mutation
 * happens in the click handler's editor.update below.
 */
function shouldClaimClick(editor, rootElement, event, $shouldInsertAfter) {
  if (!editor.isEditable()) {
    return false;
  }
  // Only react to clicks on the root container itself. A click inside
  // an existing block is handled by the normal caret placement path.
  if (event.target !== rootElement) {
    return false;
  }
  return editor.read('latest', () => {
    const lastChild = $getRoot().getLastChild();
    if (lastChild === null) {
      return false;
    }
    const lastChildDOM = editor.getElementByKey(lastChild.getKey());
    if (lastChildDOM === null) {
      return false;
    }
    // Exclusive lower edge — clicks at exactly the bottom pixel fall
    // through to native handling, which is what users expect when
    // they click on a block's visible bottom border.
    if (event.clientY <= lastChildDOM.getBoundingClientRect().bottom) {
      return false;
    }
    return $shouldInsertAfter(lastChild);
  });
}

/**
 * Click handling for the empty area below the last block of the document.
 *
 * Without this extension, clicking the area below the last block when that
 * block is a {@link DecoratorNode}, a shadow-root ElementNode (e.g.
 * `TableNode`), or any other block that doesn't accept the click naturally
 * leaves the selection in an awkward place — `null` for a bare decorator,
 * or at the end of a table cell. Users typically expect a new paragraph
 * to appear below the block with the caret in it, matching the behavior
 * of editors like Notion.
 *
 * This extension intercepts clicks under those conditions, inserts a new
 * empty paragraph after the last block, and selects it.
 *
 * Closes #8544.
 */
const ClickAfterLastBlockExtension = /* @__PURE__ */defineExtension({
  build: (_editor, config) => namedSignals(config),
  config: /* @__PURE__ */safeCast({
    $shouldInsertAfter: $defaultShouldInsertAfter,
    disabled: false
  }),
  name: '@lexical/ClickAfterLastBlock',
  register: (editor, _config, _state) => j(() => {
    const output = _state.getOutput();
    if (output.disabled.value) {
      return;
    }
    return editor.registerRootListener(rootElement => {
      if (rootElement === null) {
        return;
      }
      // Two-phase: cancel native caret-pick at the earliest browser
      // event (mousedown), then claim the click for our own paragraph
      // insert. Without the mousedown leg the browser places a caret
      // on the previous text block before our editor.update lands,
      // visible as a one-frame cursor flicker.
      //
      // Side effect to be aware of: cancelling mousedown also cancels
      // native focus on that click. The subsequent paragraph.select()
      // inside editor.update DOM-focuses the root through the
      // reconciler, so the net effect is the same focused root, but
      // we are now responsible for the focus transition rather than
      // the browser.
      //
      // lexical core has a `pointerdown` listener that flips a
      // module-level `isSelectionChangeFromMouseDown` flag consumed
      // on the next selectionchange (LexicalEvents.ts). preventing
      // mousedown means no native selectionchange fires for this
      // click, so the flag never gets a chance to be consumed in the
      // wrong cycle. If you swap mousedown for pointerdown here you
      // also have to revisit that interaction.
      const onMouseDown = event => {
        if (shouldClaimClick(editor, rootElement, event, output.$shouldInsertAfter.peek())) {
          event.preventDefault();
        }
      };
      const onClick = event => {
        if (!shouldClaimClick(editor, rootElement, event, output.$shouldInsertAfter.peek())) {
          return;
        }
        event.preventDefault();
        // Tell lexical's root click handler to skip this event so the
        // default caret-placement logic in LexicalEvents.onClick exits
        // early. Without this the previous text block briefly receives
        // the caret before our paragraph insert lands.
        stopLexicalPropagation(event);
        editor.update(() => {
          const lastChild = $getRoot().getLastChild();
          if (lastChild === null) {
            return;
          }
          // Re-check inside the update — predicate may flip between
          // read and update if external transforms run.
          if (!output.$shouldInsertAfter.peek()(lastChild)) {
            return;
          }
          const paragraph = $createParagraphNode();
          lastChild.insertAfter(paragraph);
          paragraph.select();
        });
      };

      // Capture phase so the mousedown preventDefault runs before any
      // bubble-phase handler can react, and so the click flag is set
      // before lexical core's bubble-phase onClick reads it.
      return registerEventListeners(rootElement, {
        click: onClick,
        mousedown: onMouseDown
      }, true);
    });
  })
});

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/**
 * Get the sets of nodes and types registered in the
 * {@link InitialEditorConfig}. This is to be used when an extension
 * needs to register optional behavior if some node or type is present.
 *
 * @param config The InitialEditorConfig (accessible from an extension's init)
 * @returns The known types and nodes as Sets
 */
function getKnownTypesAndNodes(config) {
  const types = new Set();
  const nodes = new Set();
  for (const klassOrReplacement of getNodeConfig(config)) {
    const klass = typeof klassOrReplacement === 'function' ? klassOrReplacement : klassOrReplacement.replace;
    // For the side-effect of filling in the static methods
    void getStaticNodeConfig(klass);
    types.add(klass.getType());
    nodes.add(klass);
  }
  return {
    nodes,
    types
  };
}
function getNodeConfig(config) {
  return (typeof config.nodes === 'function' ? config.nodes() : config.nodes) || [];
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const formatState = /* @__PURE__ */createState('format', {
  parse: value => typeof value === 'number' ? value : 0
});
class DecoratorTextNode extends DecoratorNode {
  /** @internal */
  get __isInlineFormattable() {
    return true;
  }
  $config() {
    return this.config('decorator-text', {
      extends: DecoratorNode,
      stateConfigs: [{
        flat: true,
        stateConfig: formatState
      }]
    });
  }
  getFormat(version) {
    return $getState(this, formatState, version);
  }
  getFormatFlags(type, alignWithFormat) {
    return toggleTextFormatType(this.getFormat(), type, alignWithFormat);
  }
  hasFormat(type) {
    const formatFlag = TEXT_TYPE_TO_FORMAT[type];
    return (this.getFormat() & formatFlag) !== 0;
  }
  setFormat(type) {
    return $setState(this, formatState, type);
  }
  toggleFormat(type) {
    const format = this.getFormat();
    const newFormat = toggleTextFormatType(format, type, null);
    return this.setFormat(newFormat);
  }
  isInline() {
    return true;
  }
  createDOM(config, editor) {
    return $getDocument().createElement('span');
  }
}
function $isDecoratorTextNode(node) {
  return node instanceof DecoratorTextNode;
}

/**
 * Applies formatting to the node based on the properties in the passed style object.
 * By default, properties are checked according to the values set
 * when importing content from Google Docs.
 * This algorithm is identical to the TextNode import.

 * @param lexicalNode The node to which the format will apply
 * @param style CSS style object
 * @param shouldApply format to apply if it is not in style
 * @returns lexicalNode
 */
function applyFormatFromStyle(lexicalNode, style, shouldApply) {
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
}

/**
 * The function wraps the passed DOM node in semantic tags depending on the node format.
 *
 * @param lexicalNode The node where the format is checked
 * @param domNode DOM that will be wrapped in tags
 * @param tagNameToFormat Tag name and format mapping
 * @returns domNode
 */
function applyFormatToDom(lexicalNode, domNode, tagNameToFormat = DEFAULT_TAG_NAME_TO_FORMAT) {
  let rval = domNode;
  for (const [tag, format] of Object.entries(tagNameToFormat)) {
    if (lexicalNode.hasFormat(format)) {
      rval = wrapElementWith(rval, tag);
    }
  }
  return rval;
}

/**
 * @deprecated Use {@link applyFormatToDom} instead. The `$` prefix was a
 * mistake in the 0.47 release: the implementation does not read any editor
 * state, so the dollar convention does not apply. This alias is kept for
 * compatibility with 0.47.
 */
const $applyFormatToDom = applyFormatToDom;
function wrapElementWith(element, tag) {
  const el = element.ownerDocument.createElement(tag);
  el.appendChild(element);
  return el;
}
const DEFAULT_TAG_NAME_TO_FORMAT = {
  b: 'bold',
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

/**
 * An extension that registers DecoratorTextNode with the editor.
 */
const DecoratorTextExtension = /* @__PURE__ */defineExtension({
  name: '@lexical/extension/DecoratorText',
  nodes: () => [DecoratorTextNode]
});

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Create a Signal that will subscribe to a value from an external store when watched, similar to
 * React's [useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore).
 *
 * @param getSnapshot Used to get the initial value of the signal when created and when first watched.
 * @param register A callback that will subscribe to some external store and update the signal, must return a dispose function.
 * @returns The signal
 */
function watchedSignal(getSnapshot, register) {
  let dispose;
  return a(getSnapshot(), {
    unwatched() {
      if (dispose) {
        dispose();
        dispose = undefined;
      }
    },
    watched() {
      this.value = getSnapshot();
      dispose = register(this);
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

/**
 * An extension to provide the current EditorState as a signal
 */
const EditorStateExtension = /* @__PURE__ */defineExtension({
  build(editor) {
    return watchedSignal(() => editor.getEditorState(), editorStateSignal => editor.registerUpdateListener(payload => {
      editorStateSignal.value = payload.editorState;
    }));
  },
  name: '@lexical/extension/EditorState'
});

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

// `"0.49.0+dev.esm"` is statically replaced with the build-specific
// version string in a Rollup build, and a consumer's bundler `define` can
// inject it the same way — so the exact `"0.49.0+dev.esm"` member
// expression must be preserved for that substitution to match. Reading it
// inside a try/catch lets the source be consumed directly (via the `source`
// export condition) in a browser bundle, where `process` is undefined and
// nothing replaced the reference, without throwing a ReferenceError; it falls
// back to the literal below instead. The literal is regenerated by
// `pnpm run update-version`.
let envLexicalVersion;
try {
  envLexicalVersion = "0.49.0+dev.esm";
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

/**
 * Recursively merge the given theme configuration in-place.
 *
 * @returns If `a` and `b` are both objects (and `b` is not an Array) then
 * all keys in `b` are merged into `a` then `a` is returned.
 * Otherwise `b` is returned.
 *
 * @example
 * ```ts
 * const a = { a: "a", nested: { a: 1 } };
 * const b = { b: "b", nested: { b: 2 } };
 * const rval = deepThemeMergeInPlace(a, b);
 * expect(a).toBe(rval);
 * expect(a).toEqual({ a: "a", b: "b", nested: { a: 1, b: 2 } });
 * ```
 */
// Keys that must never be merged: assigning or recursing through them can
// mutate the prototype chain (prototype pollution). A malicious `__proto__`
// entry — e.g. from `JSON.parse('{"__proto__": {...}}')` — would otherwise
// leak into `Object.prototype` and affect every object in the realm.
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
function deepThemeMergeInPlace(a, b) {
  if (a && b && !Array.isArray(b) && typeof a === 'object' && typeof b === 'object') {
    const aObj = a;
    const bObj = b;
    for (const k in bObj) {
      // Only merge own, prototype-safe keys.
      if (UNSAFE_KEYS.has(k) || !Object.prototype.hasOwnProperty.call(bObj, k)) {
        continue;
      }
      aObj[k] = deepThemeMergeInPlace(aObj[k], bObj[k]);
    }
    return a;
  }
  return b;
}

const ExtensionRepStateIds = {
  /* eslint-disable sort-keys-fix/sort-keys-fix */
  unmarked: 0,
  temporary: 1,
  permanent: 2,
  configured: 3,
  initialized: 4,
  built: 5,
  registered: 6,
  afterRegistration: 7
  /* eslint-enable sort-keys-fix/sort-keys-fix */
};
function isExactlyUnmarkedExtensionRepState(state) {
  return state.id === ExtensionRepStateIds.unmarked;
}
function isExactlyTemporaryExtensionRepState(state) {
  return state.id === ExtensionRepStateIds.temporary;
}
function isExactlyPermanentExtensionRepState(state) {
  return state.id === ExtensionRepStateIds.permanent;
}
function isConfiguredExtensionRepState(state) {
  return state.id >= ExtensionRepStateIds.configured;
}
function isInitializedExtensionRepState(state) {
  return state.id >= ExtensionRepStateIds.initialized;
}
function isBuiltExtensionRepState(state) {
  return state.id >= ExtensionRepStateIds.built;
}
function isAfterRegistrationState(state) {
  return state.id >= ExtensionRepStateIds.afterRegistration;
}
function applyTemporaryMark(state) {
  if (!isExactlyUnmarkedExtensionRepState(state)) {
    formatDevErrorMessage(`LexicalBuilder: Can not apply a temporary mark from state id ${String(state.id)} (expected ${String(ExtensionRepStateIds.unmarked)} unmarked)`);
  }
  return Object.assign(state, {
    id: ExtensionRepStateIds.temporary
  });
}
function applyPermanentMark(state) {
  if (!isExactlyTemporaryExtensionRepState(state)) {
    formatDevErrorMessage(`LexicalBuilder: Can not apply a permanent mark from state id ${String(state.id)} (expected ${String(ExtensionRepStateIds.temporary)} temporary)`);
  }
  return Object.assign(state, {
    id: ExtensionRepStateIds.permanent
  });
}
function applyConfiguredState(state, config, registerState) {
  return Object.assign(state, {
    config,
    id: ExtensionRepStateIds.configured,
    registerState
  });
}
function applyInitializedState(state, initResult, registerState) {
  return Object.assign(state, {
    id: ExtensionRepStateIds.initialized,
    initResult,
    registerState
  });
}
function applyBuiltState(state, output, registerState) {
  return Object.assign(state, {
    id: ExtensionRepStateIds.built,
    output,
    registerState
  });
}
function applyRegisteredState(state) {
  return Object.assign(state, {
    id: ExtensionRepStateIds.registered
  });
}
function applyAfterRegistrationState(state) {
  return Object.assign(state, {
    id: ExtensionRepStateIds.afterRegistration
  });
}
function rollbackToBuiltState(state) {
  return Object.assign(state, {
    id: ExtensionRepStateIds.built
  });
}
const emptySet = new Set();

/**
 * @internal
 */
class ExtensionRep {
  builder;
  configs;
  _dependency;
  _peerNameSet;
  extension;
  state;
  _signal;
  constructor(builder, extension) {
    this.builder = builder;
    this.extension = extension;
    this.configs = new Set();
    this.state = {
      id: ExtensionRepStateIds.unmarked
    };
  }
  mergeConfigs() {
    let config = this.extension.config || {};
    const mergeConfig = this.extension.mergeConfig ? this.extension.mergeConfig.bind(this.extension) : shallowMergeConfig;
    for (const cfg of this.configs) {
      config = mergeConfig(config, cfg);
    }
    return config;
  }
  init(editorConfig) {
    const initialState = this.state;
    if (!isExactlyPermanentExtensionRepState(initialState)) {
      formatDevErrorMessage(`ExtensionRep: Can not configure from state id ${String(initialState.id)}`);
    }
    const initState = {
      getDependency: this.getInitDependency.bind(this),
      getDirectDependentNames: this.getDirectDependentNames.bind(this),
      getPeer: this.getInitPeer.bind(this),
      getPeerNameSet: this.getPeerNameSet.bind(this)
    };
    const buildState = {
      ...initState,
      getDependency: this.getDependency.bind(this),
      getInitResult: this.getInitResult.bind(this),
      getPeer: this.getPeer.bind(this)
    };
    const state = applyConfiguredState(initialState, this.mergeConfigs(), initState);
    this.state = state;
    let initResult;
    if (this.extension.init) {
      initResult = this.extension.init(editorConfig, state.config, initState);
    }
    this.state = applyInitializedState(state, initResult, buildState);
  }
  build(editor) {
    const state = this.state;
    if (!(state.id === ExtensionRepStateIds.initialized)) {
      formatDevErrorMessage(`ExtensionRep: register called in state id ${String(state.id)} (expected ${String(ExtensionRepStateIds.built)} initialized)`);
    }
    let output;
    if (this.extension.build) {
      output = this.extension.build(editor, state.config, state.registerState);
    }
    const registerState = {
      ...state.registerState,
      getOutput: () => output,
      getSignal: this.getSignal.bind(this)
    };
    this.state = applyBuiltState(state, output, registerState);
  }
  register(editor, signal) {
    this._signal = signal;
    const state = this.state;
    if (!(state.id === ExtensionRepStateIds.built)) {
      formatDevErrorMessage(`ExtensionRep: register called in state id ${String(state.id)} (expected ${String(ExtensionRepStateIds.built)} built)`);
    }
    const cleanup = this.extension.register && this.extension.register(editor, state.config, state.registerState);
    this.state = applyRegisteredState(state);
    return () => {
      const afterRegistrationState = this.state;
      if (!(afterRegistrationState.id === ExtensionRepStateIds.afterRegistration)) {
        formatDevErrorMessage(`ExtensionRep: rollbackToBuiltState called in state id ${String(state.id)} (expected ${String(ExtensionRepStateIds.afterRegistration)} afterRegistration)`);
      }
      this.state = rollbackToBuiltState(afterRegistrationState);
      if (cleanup) {
        cleanup();
      }
    };
  }
  afterRegistration(editor) {
    const state = this.state;
    if (!(state.id === ExtensionRepStateIds.registered)) {
      formatDevErrorMessage(`ExtensionRep: afterRegistration called in state id ${String(state.id)} (expected ${String(ExtensionRepStateIds.registered)} registered)`);
    }
    let rval;
    if (this.extension.afterRegistration) {
      rval = this.extension.afterRegistration(editor, state.config, state.registerState);
    }
    this.state = applyAfterRegistrationState(state);
    return rval;
  }
  getSignal() {
    if (!(this._signal !== undefined)) {
      formatDevErrorMessage(`ExtensionRep.getSignal() called before register`);
    }
    return this._signal;
  }
  getInitResult() {
    if (!(this.extension.init !== undefined)) {
      formatDevErrorMessage(`ExtensionRep: getInitResult() called for Extension ${this.extension.name} that does not define init`);
    }
    const state = this.state;
    if (!isInitializedExtensionRepState(state)) {
      formatDevErrorMessage(`ExtensionRep: getInitResult() called for ExtensionRep in state id ${String(state.id)} < ${String(ExtensionRepStateIds.initialized)} (initialized)`);
    }
    return state.initResult;
  }
  getInitPeer(name) {
    const rep = this.builder.extensionNameMap.get(name);
    return rep ? rep.getExtensionInitDependency() : undefined;
  }
  getExtensionInitDependency() {
    const state = this.state;
    if (!isConfiguredExtensionRepState(state)) {
      formatDevErrorMessage(`ExtensionRep: getExtensionInitDependency called in state id ${String(state.id)} (expected >= ${String(ExtensionRepStateIds.configured)} configured)`);
    }
    return {
      config: state.config
    };
  }
  getPeer(name) {
    const rep = this.builder.extensionNameMap.get(name);
    return rep ? rep.getExtensionDependency() : undefined;
  }
  getInitDependency(dep) {
    const rep = this.builder.getExtensionRep(dep);
    if (!(rep !== undefined)) {
      formatDevErrorMessage(`LexicalExtensionBuilder: Extension ${this.extension.name} missing dependency extension ${dep.name} to be in registry`);
    }
    return rep.getExtensionInitDependency();
  }
  getDependency(dep) {
    const rep = this.builder.getExtensionRep(dep);
    if (!(rep !== undefined)) {
      formatDevErrorMessage(`LexicalExtensionBuilder: Extension ${this.extension.name} missing dependency extension ${dep.name} to be in registry`);
    }
    return rep.getExtensionDependency();
  }
  getState() {
    const state = this.state;
    if (!isAfterRegistrationState(state)) {
      formatDevErrorMessage(`ExtensionRep getState called in state id ${String(state.id)} (expected ${String(ExtensionRepStateIds.afterRegistration)} afterRegistration)`);
    }
    return state;
  }
  getDirectDependentNames() {
    return this.builder.incomingEdges.get(this.extension.name) || emptySet;
  }
  getPeerNameSet() {
    let s = this._peerNameSet;
    if (!s) {
      s = new Set((this.extension.peerDependencies || []).map(([name]) => name));
      this._peerNameSet = s;
    }
    return s;
  }
  getExtensionDependency() {
    if (!this._dependency) {
      const state = this.state;
      if (!isBuiltExtensionRepState(state)) {
        formatDevErrorMessage(`Extension ${this.extension.name} used as a dependency before build`);
      }
      this._dependency = {
        config: state.config,
        init: state.initResult,
        output: state.output
      };
    }
    return this._dependency;
  }
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const HISTORY_MERGE_OPTIONS = {
  tag: HISTORY_MERGE_TAG
};
function $defaultInitializer() {
  const root = $getRoot();
  if (root.isEmpty()) {
    root.append($createParagraphNode());
  }
}
/**
 * An extension to set the initial state of the editor from
 * a function or serialized JSON EditorState. This is
 * implicitly included with all editors built with
 * Lexical Extension. This happens in the `afterRegistration`
 * phase so your initial state may depend on registered commands,
 * but you should not call `editor.setRootElement` earlier than
 * this phase to avoid rendering an empty editor first.
 */
const InitialStateExtension = /* @__PURE__ */defineExtension({
  config: /* @__PURE__ */safeCast({
    setOptions: HISTORY_MERGE_OPTIONS,
    updateOptions: HISTORY_MERGE_OPTIONS
  }),
  init({
    $initialEditorState = $defaultInitializer
  }) {
    return {
      $initialEditorState,
      initialized: false
    };
  },
  // eslint-disable-next-line sort-keys-fix/sort-keys-fix -- typescript inference is order dependent here for some reason
  afterRegistration(editor, {
    updateOptions,
    setOptions
  }, state) {
    const initResult = state.getInitResult();
    if (!initResult.initialized) {
      initResult.initialized = true;
      const {
        $initialEditorState
      } = initResult;
      if ($isEditorState($initialEditorState)) {
        editor.setEditorState($initialEditorState, setOptions);
      } else if (typeof $initialEditorState === 'function') {
        editor.update(() => {
          $initialEditorState(editor);
        }, updateOptions);
      } else if ($initialEditorState && (typeof $initialEditorState === 'string' || typeof $initialEditorState === 'object')) {
        const parsedEditorState = editor.parseEditorState($initialEditorState);
        editor.setEditorState(parsedEditorState, setOptions);
      }
    }
    return () => {};
  },
  name: '@lexical/extension/InitialState',
  // These are automatically added by createEditor, we add them here so they are
  // visible during extensionRep.init so extensions can see all known types before the
  // editor is created.
  // (excluding ArtificialNode__DO_NOT_USE because it isn't really public API
  // and shouldn't change anything)
  nodes: [RootNode, TextNode, LineBreakNode, TabNode, ParagraphNode]
});

/** @internal Use a well-known symbol for dev tools purposes */
const builderSymbol = Symbol.for('@lexical/extension/LexicalBuilder');
/**
 * Build a LexicalEditor by combining together one or more extensions, optionally
 * overriding some of their configuration.
 *
 * @param extensions - Extension arguments (extensions or extensions with config overrides)
 * @returns An editor handle
 *
 * @example
 * A single root extension with multiple dependencies
 *
 * ```ts
 * const editor = buildEditorFromExtensions(
 *   defineExtension({
 *     name: "[root]",
 *     dependencies: [
 *       RichTextExtension,
 *       configExtension(EmojiExtension, { emojiBaseUrl: "/assets/emoji" }),
 *     ],
 *     register: (editor: LexicalEditor) => {
 *       console.log("Editor Created");
 *       return () => console.log("Editor Disposed");
 *     },
 *   }),
 * );
 * ```
 *
 * @example
 * A very similar minimal configuration without the register hook
 *
 * ```ts
 * const editor = buildEditorFromExtensions(
 *   RichTextExtension,
 *   configExtension(EmojiExtension, { emojiBaseUrl: "/assets/emoji" }),
 * );
 * ```
 */
function buildEditorFromExtensions(...extensions) {
  return LexicalBuilder.fromExtensions(extensions).buildEditor();
}

/** @internal */
function noop() {
  /*empty*/
}

/** Throw the given Error */
function defaultOnError(err) {
  throw err;
}
/** @internal */
function maybeWithBuilder(editor) {
  return editor;
}
function normalizeExtensionArgument(arg) {
  return Array.isArray(arg) ? arg : [arg];
}
const PACKAGE_VERSION = LEXICAL_VERSION;

/** @internal */
class LexicalBuilder {
  roots;
  extensionNameMap;
  outgoingConfigEdges;
  incomingEdges;
  conflicts;
  _sortedExtensionReps;
  PACKAGE_VERSION;
  constructor(roots) {
    this.outgoingConfigEdges = new Map();
    this.incomingEdges = new Map();
    this.extensionNameMap = new Map();
    this.conflicts = new Map();
    this.PACKAGE_VERSION = PACKAGE_VERSION;
    this.roots = roots;
    for (const extension of roots) {
      this.addExtension(extension);
    }
  }
  static fromExtensions(extensions) {
    const roots = [normalizeExtensionArgument(InitialStateExtension)];
    for (const extension of extensions) {
      roots.push(normalizeExtensionArgument(extension));
    }
    return new LexicalBuilder(roots);
  }
  static maybeFromEditor(editor) {
    const builder = maybeWithBuilder(editor)[builderSymbol];
    if (builder) {
      // The dev tools variant of this will relax some of these invariants
      if (!(builder.PACKAGE_VERSION === PACKAGE_VERSION)) {
        formatDevErrorMessage(`LexicalBuilder.fromEditor: The given editor was created with LexicalBuilder ${builder.PACKAGE_VERSION} but this version is ${PACKAGE_VERSION}. A project should have exactly one copy of LexicalBuilder`);
      }
      if (!(builder instanceof LexicalBuilder)) {
        formatDevErrorMessage(`LexicalBuilder.fromEditor: There are multiple copies of the same version of LexicalBuilder in your project, and this editor was created with another one. Your project, or one of its dependencies, has its package.json and/or bundler configured incorrectly.`);
      }
    }
    return builder;
  }

  /** Look up the editor that was created by this LexicalBuilder or throw */
  static fromEditor(editor) {
    const builder = LexicalBuilder.maybeFromEditor(editor);
    if (!(builder !== undefined)) {
      formatDevErrorMessage(`LexicalBuilder.fromEditor: The given editor was not created with LexicalBuilder`);
    }
    return builder;
  }
  constructEditor() {
    const {
      $initialEditorState: _$initialEditorState,
      onError,
      onWarn,
      ...editorConfig
    } = this.buildCreateEditorArgs();
    const editor = Object.assign(createEditor({
      ...editorConfig,
      ...(onError ? {
        onError: err => {
          onError(err, editor);
        }
      } : {}),
      ...(onWarn ? {
        onWarn: err => {
          onWarn(err, editor);
        }
      } : {})
    }), {
      [builderSymbol]: this
    });
    for (const extensionRep of this.sortedExtensionReps()) {
      extensionRep.build(editor);
    }
    return editor;
  }
  buildEditor() {
    let disposeOnce = noop;
    function dispose() {
      try {
        disposeOnce();
      } finally {
        disposeOnce = noop;
      }
    }
    const editor = Object.assign(this.constructEditor(), {
      dispose,
      [Symbol.dispose]: dispose
    });
    disposeOnce = mergeRegister(this.registerEditor(editor), () => editor.setRootElement(null));
    return editor;
  }
  hasExtensionByName(name) {
    return this.extensionNameMap.has(name);
  }
  getExtensionRep(extension) {
    const rep = this.extensionNameMap.get(extension.name);
    if (rep) {
      if (!(rep.extension === extension)) {
        formatDevErrorMessage(`LexicalBuilder: A registered extension with name ${extension.name} exists but does not match the given extension`);
      }
      return rep;
    }
  }
  addEdge(fromExtensionName, toExtensionName, configs) {
    const outgoing = this.outgoingConfigEdges.get(fromExtensionName);
    if (outgoing) {
      outgoing.set(toExtensionName, configs);
    } else {
      this.outgoingConfigEdges.set(fromExtensionName, new Map([[toExtensionName, configs]]));
    }
    const incoming = this.incomingEdges.get(toExtensionName);
    if (incoming) {
      incoming.add(fromExtensionName);
    } else {
      this.incomingEdges.set(toExtensionName, new Set([fromExtensionName]));
    }
  }
  addExtension(arg) {
    if (!(this._sortedExtensionReps === undefined)) {
      formatDevErrorMessage(`LexicalBuilder: addExtension called after finalization`);
    }
    const normalized = normalizeExtensionArgument(arg);
    const [extension] = normalized;
    if (!(typeof extension.name === 'string')) {
      formatDevErrorMessage(`LexicalBuilder: extension name must be string, not ${typeof extension.name}`);
    }
    let extensionRep = this.extensionNameMap.get(extension.name);
    if (!(extensionRep === undefined || extensionRep.extension === extension)) {
      formatDevErrorMessage(`LexicalBuilder: Multiple extensions registered with name ${extension.name}, names must be unique`);
    }
    if (!extensionRep) {
      extensionRep = new ExtensionRep(this, extension);
      this.extensionNameMap.set(extension.name, extensionRep);
      const hasConflict = this.conflicts.get(extension.name);
      if (typeof hasConflict === 'string') {
        {
          formatDevErrorMessage(`LexicalBuilder: extension ${extension.name} conflicts with ${hasConflict}`);
        }
      }
      for (const name of extension.conflictsWith || []) {
        if (!!this.extensionNameMap.has(name)) {
          formatDevErrorMessage(`LexicalBuilder: extension ${extension.name} conflicts with ${name}`);
        }
        this.conflicts.set(name, extension.name);
      }
      for (const dep of extension.dependencies || []) {
        const normDep = normalizeExtensionArgument(dep);
        this.addEdge(extension.name, normDep[0].name, normDep.slice(1));
        this.addExtension(normDep);
      }
      for (const [depName, config] of extension.peerDependencies || []) {
        this.addEdge(extension.name, depName, config ? [config] : []);
      }
    }
  }
  sortedExtensionReps() {
    if (this._sortedExtensionReps) {
      return this._sortedExtensionReps;
    }
    // depth-first search based topological DAG sort
    // https://en.wikipedia.org/wiki/Topological_sorting
    const sortedExtensionReps = [];
    const visit = (rep, fromExtensionName) => {
      let mark = rep.state;
      if (isExactlyPermanentExtensionRepState(mark)) {
        return;
      }
      const extensionName = rep.extension.name;
      if (!isExactlyUnmarkedExtensionRepState(mark)) {
        formatDevErrorMessage(`LexicalBuilder: Circular dependency detected for Extension ${extensionName} from ${fromExtensionName || '[unknown]'}`);
      }
      mark = applyTemporaryMark(mark);
      rep.state = mark;
      const outgoingConfigEdges = this.outgoingConfigEdges.get(extensionName);
      if (outgoingConfigEdges) {
        for (const toExtensionName of outgoingConfigEdges.keys()) {
          const toRep = this.extensionNameMap.get(toExtensionName);
          // may be undefined for an optional peer dependency
          if (toRep) {
            visit(toRep, extensionName);
          }
        }
      }
      mark = applyPermanentMark(mark);
      rep.state = mark;
      sortedExtensionReps.push(rep);
    };
    for (const rep of this.extensionNameMap.values()) {
      if (isExactlyUnmarkedExtensionRepState(rep.state)) {
        visit(rep);
      }
    }
    for (const rep of sortedExtensionReps) {
      for (const [toExtensionName, configs] of this.outgoingConfigEdges.get(rep.extension.name) || []) {
        if (configs.length > 0) {
          const toRep = this.extensionNameMap.get(toExtensionName);
          if (toRep) {
            for (const config of configs) {
              toRep.configs.add(config);
            }
          }
        }
      }
    }
    for (const [extension, ...configs] of this.roots) {
      if (configs.length > 0) {
        const toRep = this.extensionNameMap.get(extension.name);
        if (!(toRep !== undefined)) {
          formatDevErrorMessage(`LexicalBuilder: Expecting existing ExtensionRep for ${extension.name}`);
        }
        for (const config of configs) {
          toRep.configs.add(config);
        }
      }
    }
    this._sortedExtensionReps = sortedExtensionReps;
    return this._sortedExtensionReps;
  }
  registerEditor(editor) {
    const extensionReps = this.sortedExtensionReps();
    const controller = new AbortController();
    const cleanups = [() => controller.abort()];
    const signal = controller.signal;
    for (const extensionRep of extensionReps) {
      const cleanup = extensionRep.register(editor, signal);
      if (cleanup) {
        cleanups.push(cleanup);
      }
    }
    for (const extensionRep of extensionReps) {
      const cleanup = extensionRep.afterRegistration(editor);
      if (cleanup) {
        cleanups.push(cleanup);
      }
    }
    return mergeRegister(...cleanups);
  }
  buildCreateEditorArgs() {
    const config = {};
    const nodes = new Set();
    const replacedNodes = new Map();
    const htmlExport = new Map();
    const htmlImport = {};
    const theme = {};
    const extensionReps = this.sortedExtensionReps();
    for (const extensionRep of extensionReps) {
      const {
        extension
      } = extensionRep;
      if (extension.onError !== undefined) {
        config.onError = extension.onError;
      }
      if (extension.onWarn !== undefined) {
        config.onWarn = extension.onWarn;
      }
      if (extension.disableEvents !== undefined) {
        config.disableEvents = extension.disableEvents;
      }
      if (extension.parentEditor !== undefined) {
        config.parentEditor = extension.parentEditor;
      }
      if (extension.editable !== undefined) {
        config.editable = extension.editable;
      }
      if (extension.namespace !== undefined) {
        config.namespace = extension.namespace;
      }
      if (extension.$initialEditorState !== undefined) {
        config.$initialEditorState = extension.$initialEditorState;
      }
      if (extension.nodes) {
        for (const node of getNodeConfig(extension)) {
          if (typeof node !== 'function') {
            const conflictExtension = replacedNodes.get(node.replace);
            if (conflictExtension) {
              {
                formatDevErrorMessage(`LexicalBuilder: Extension ${extension.name} can not register replacement for node ${node.replace.name} because ${conflictExtension.extension.name} already did`);
              }
            }
            replacedNodes.set(node.replace, extensionRep);
          }
          nodes.add(node);
        }
      }
      if (extension.html) {
        if (extension.html.export) {
          for (const [k, v] of extension.html.export.entries()) {
            htmlExport.set(k, v);
          }
        }
        if (extension.html.import) {
          Object.assign(htmlImport, extension.html.import);
        }
      }
      if (extension.theme) {
        deepThemeMergeInPlace(theme, extension.theme);
      }
    }
    if (Object.keys(theme).length > 0) {
      config.theme = theme;
    }
    if (nodes.size) {
      config.nodes = [...nodes];
    }
    const hasImport = Object.keys(htmlImport).length > 0;
    const hasExport = htmlExport.size > 0;
    if (hasImport || hasExport) {
      config.html = {};
      if (hasImport) {
        config.html.import = htmlImport;
      }
      if (hasExport) {
        config.html.export = htmlExport;
      }
    }
    for (const extensionRep of extensionReps) {
      extensionRep.init(config);
    }
    if (!config.onError) {
      config.onError = defaultOnError;
    }
    return config;
  }
}

/**
 * Get the finalized config and output of an Extension that was used to build the editor.
 *
 * This is useful in the implementation of a LexicalNode or in other
 * situations where you have an editor reference but it's not easy to
 * pass the config or {@link ExtensionRegisterState} around.
 *
 * It will throw if the Editor was not built using this Extension.
 *
 * Inside an editor read/update, prefer {@link $getExtensionDependency} or
 * {@link $getExtensionOutput} — they resolve the editor via `$getEditor()`
 * so you don't have to thread it through.
 *
 * @param editor - The editor that was built using extension
 * @param extension - The concrete reference to an Extension used to build this editor
 * @returns The config and output for that Extension
 */
function getExtensionDependencyFromEditor(editor, extension) {
  const builder = LexicalBuilder.fromEditor(editor);
  const rep = builder.getExtensionRep(extension);
  if (!(rep !== undefined)) {
    formatDevErrorMessage(`getExtensionDependencyFromEditor: Extension ${extension.name} was not built when creating this editor`);
  }
  return rep.getExtensionDependency();
}

/**
 * Get the finalized config and output of an Extension that was used to build the
 * editor by name.
 *
 * This can be used from the implementation of a LexicalNode or in other
 * situation where you have an editor reference but it's not easy to pass the
 * config around. Use this version if you do not have a concrete reference to
 * the Extension for some reason (e.g. it is an optional peer dependency, or you
 * are avoiding a circular import).
 *
 * Both the explicit Extension type and the name are required.
 *
 * Inside an editor read/update, prefer {@link $getPeerDependency} — it
 * resolves the editor via `$getEditor()` so you don't have to thread it
 * through.
 *
 *  @example
 * ```tsx
 * import type { HistoryExtension } from "@lexical/history";
 * getPeerDependencyFromEditor<typeof HistoryExtension>(editor, "@lexical/history/History");
 * ```

 * @param editor - The editor that may have been built using extension
 * @param extensionName - The name of the Extension
 * @returns The config and output of the Extension or undefined
 */
function getPeerDependencyFromEditor(editor, extensionName) {
  const builder = LexicalBuilder.maybeFromEditor(editor);
  if (!builder) return undefined;
  const peer = builder.extensionNameMap.get(extensionName);
  return peer ? peer.getExtensionDependency() : undefined;
}

/**
 * Get the finalized config and output of an Extension that was used to build the
 * editor by name.
 *
 * This can be used from the implementation of a LexicalNode or in other
 * situation where you have an editor reference but it's not easy to pass the
 * config around. Use this version if you do not have a concrete reference to
 * the Extension for some reason (e.g. it is an optional peer dependency, or you
 * are avoiding a circular import).
 *
 * Both the explicit Extension type and the name are required.
 *
 * Inside an editor read/update, prefer {@link $getPeerDependency} (which
 * resolves the editor via `$getEditor()`) and add your own invariant if
 * the peer is required.
 *
 *  @example
 * ```tsx
 * import type { EmojiExtension } from "./EmojiExtension";
 * export class EmojiNode extends TextNode {
 *   // other implementation details not included
 *   createDOM(
 *     config: EditorConfig,
 *     editor?: LexicalEditor | undefined
 *   ): HTMLElement {
 *     const dom = super.createDOM(config, editor);
 *     addClassNamesToElement(
 *       dom,
 *       getPeerDependencyFromEditorOrThrow<typeof EmojiExtension>(
 *         editor || $getEditor(),
 *         "@lexical/playground/emoji",
 *       ).config.emojiClass,
 *     );
 *     return dom;
 *   }
 * }
 * ```

 * @param editor - The editor that may have been built using extension
 * @param extensionName - The name of the Extension
 * @returns The config and output of the Extension
 */
function getPeerDependencyFromEditorOrThrow(editor, extensionName) {
  const dep = getPeerDependencyFromEditor(editor, extensionName);
  if (!(dep !== undefined)) {
    formatDevErrorMessage(`getPeerDependencyFromEditorOrThrow: Editor was not built with Extension ${extensionName}`);
  }
  return dep;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */


/**
 * Get the finalized config and output for `extension` from the editor
 * currently in scope. A `$`-flavored shorthand for
 * `getExtensionDependencyFromEditor($getEditor(), extension)`.
 *
 * Throws if the editor was not built with `extension` as a dependency.
 *
 * @example
 * ```ts
 * import {$getExtensionDependency} from '@lexical/extension';
 * import {KeywordsExtension} from './KeywordsExtension';
 *
 * class KeywordNode extends TextNode {
 *   createDOM(config: EditorConfig): HTMLElement {
 *     const dom = super.createDOM(config);
 *     dom.className =
 *       $getExtensionDependency(KeywordsExtension).config.className;
 *     return dom;
 *   }
 * }
 * ```
 *
 * @see {@link getExtensionDependencyFromEditor} when you have an explicit
 *   editor reference (e.g. outside a read/update).
 */
function $getExtensionDependency(extension) {
  return getExtensionDependencyFromEditor($getEditor(), extension);
}

/**
 * Shorthand for `$getExtensionDependency(extension).output` — the most
 * common reason to look up an extension dependency. Throws if the editor
 * was not built with `extension` as a dependency.
 *
 * @example
 * ```ts
 * import {$getExtensionOutput} from '@lexical/extension';
 * import {DOMImportExtension} from '@lexical/html';
 *
 * const nodes = $getExtensionOutput(DOMImportExtension).$generateNodesFromDOM(
 *   dom,
 * );
 * ```
 *
 * @see {@link $getExtensionDependency} when you need both `.config` and
 *   `.output` (or want to mirror the shape of
 *   {@link getExtensionDependencyFromEditor}).
 */
function $getExtensionOutput(extension) {
  return $getExtensionDependency(extension).output;
}

/**
 * Get the finalized config and output for an optional peer extension by
 * name, from the editor currently in scope. A `$`-flavored shorthand for
 * `getPeerDependencyFromEditor($getEditor(), extensionName)`.
 *
 * Returns `undefined` if the editor was not built with the named
 * extension. Both the explicit `Extension` type and the name are
 * required so the returned `config` / `output` types are correct.
 *
 * @example
 * ```ts
 * import {$getPeerDependency} from '@lexical/extension';
 * import type {HistoryExtension} from '@lexical/history';
 *
 * const dep = $getPeerDependency<typeof HistoryExtension>(
 *   '@lexical/history/History',
 * );
 * if (dep) {
 *   // …read dep.config / dep.output…
 * }
 * ```
 *
 * @see {@link getPeerDependencyFromEditor} when you have an explicit
 *   editor reference.
 */
function $getPeerDependency(extensionName) {
  return getPeerDependencyFromEditor($getEditor(), extensionName);
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const EMPTY_SET = new Set();

/**
 * An extension that provides a `watchNodeKey` output that
 * returns a signal for the selection state of a node.
 *
 * Typically used for tracking whether a DecoratorNode is
 * currently selected or not. A framework independent
 * alternative to {@link useLexicalNodeSelection}.
 */
const NodeSelectionExtension = /* @__PURE__ */defineExtension({
  build(editor, config, state) {
    const editorStateStore = state.getDependency(EditorStateExtension).output;
    const watchedNodeStore = a({
      watchedNodeKeys: new Map()
    });
    const selectedNodeKeys = watchedSignal(() => undefined, () => j(() => {
      const prevSelectedNodeKeys = selectedNodeKeys.peek();
      const {
        watchedNodeKeys
      } = watchedNodeStore.value;
      let nextSelectedNodeKeys;
      let didChange = false;
      editorStateStore.value.read(() => {
        const selection = $getSelection();
        if (selection) {
          for (const [key, listeners] of watchedNodeKeys.entries()) {
            if (listeners.size === 0) {
              // We intentionally mutate this without firing a signal, to
              // avoid re-triggering this effect. There are no subscribers
              // so nothing can observe whether key was in the set or not
              watchedNodeKeys.delete(key);
              continue;
            }
            const node = $getNodeByKey(key);
            const isSelected = node && node.isSelected() || false;
            didChange = didChange || isSelected !== (prevSelectedNodeKeys ? prevSelectedNodeKeys.has(key) : false);
            if (isSelected) {
              nextSelectedNodeKeys = nextSelectedNodeKeys || new Set();
              nextSelectedNodeKeys.add(key);
            }
          }
        }
      });
      if (!(!didChange && nextSelectedNodeKeys && prevSelectedNodeKeys && nextSelectedNodeKeys.size === prevSelectedNodeKeys.size)) {
        selectedNodeKeys.value = nextSelectedNodeKeys;
      }
    }));
    function watchNodeKey(key) {
      const watcher = g(() => (selectedNodeKeys.value || EMPTY_SET).has(key));
      const {
        watchedNodeKeys
      } = watchedNodeStore.peek();
      let listeners = watchedNodeKeys.get(key);
      const hadListener = listeners !== undefined;
      listeners = listeners || new Set();
      listeners.add(watcher);
      if (!hadListener) {
        watchedNodeKeys.set(key, listeners);
        watchedNodeStore.value = {
          watchedNodeKeys
        };
      }
      return watcher;
    }
    return {
      watchNodeKey
    };
  },
  dependencies: [EditorStateExtension],
  name: '@lexical/extension/NodeSelection'
});

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */


/**
 * The serialized form of a {@link HorizontalRuleNode}. It has no extra fields
 * beyond the base serialized node.
 */

/**
 * Command that inserts a {@link HorizontalRuleNode} at the current selection.
 * Dispatch it with
 * `editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND)`.
 */
const INSERT_HORIZONTAL_RULE_COMMAND = /* @__PURE__ */createCommand('INSERT_HORIZONTAL_RULE_COMMAND');
class HorizontalRuleNode extends DecoratorNode {
  $config() {
    // `extends` is intentionally left to the runtime default (the prototype
    // parent) rather than declared explicitly: the deprecated
    // `@lexical/react` HorizontalRuleNode subclasses this one and reuses the
    // same 'horizontalrule' type, so both `$config()` overrides must infer a
    // matching shape.
    return this.config('horizontalrule', {
      importDOM: {
        hr: () => ({
          conversion: $convertHorizontalRuleElement,
          priority: 0
        })
      }
    });
  }
  exportDOM() {
    return {
      element: $getDocument().createElement('hr')
    };
  }
  createDOM(config) {
    const element = $getDocument().createElement('hr');
    addClassNamesToElement(element, config.theme.hr);
    return element;
  }
  getTextContent() {
    return '\n';
  }
  isInline() {
    return false;
  }
  updateDOM() {
    return false;
  }
}
function $convertHorizontalRuleElement() {
  return {
    node: $createHorizontalRuleNode()
  };
}
function $createHorizontalRuleNode() {
  return $create(HorizontalRuleNode);
}

/**
 * @returns `true` if `node` is a {@link HorizontalRuleNode}, narrowing its type.
 */
function $isHorizontalRuleNode(node) {
  return node instanceof HorizontalRuleNode;
}
function $toggleNodeSelection(node, shiftKey = false) {
  const selection = $getSelection();
  const wasSelected = node.isSelected();
  const key = node.getKey();
  let nodeSelection;
  if (shiftKey && $isNodeSelection(selection)) {
    nodeSelection = selection;
  } else {
    nodeSelection = $createNodeSelection();
    $setSelection(nodeSelection);
  }
  if (wasSelected) {
    nodeSelection.delete(key);
  } else {
    nodeSelection.add(key);
  }
}

/**
 * An extension for HorizontalRuleNode that provides an implementation that
 * works without any React dependency.
 */
const HorizontalRuleExtension = /* @__PURE__ */defineExtension({
  dependencies: [EditorStateExtension, NodeSelectionExtension],
  name: '@lexical/extension/HorizontalRule',
  nodes: () => [HorizontalRuleNode],
  register(editor, config, state) {
    const {
      watchNodeKey
    } = state.getDependency(NodeSelectionExtension).output;
    const nodeSelectionStore = a({
      nodeSelections: new Map()
    });
    const isSelectedClassName = editor._config.theme.hrSelected ?? 'selected';
    return mergeRegister(editor.registerCommand(INSERT_HORIZONTAL_RULE_COMMAND, type => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        return false;
      }
      const focusNode = selection.focus.getNode();
      if (focusNode !== null) {
        const horizontalRuleNode = $createHorizontalRuleNode();
        $insertNodeToNearestRoot(horizontalRuleNode);
      }
      return true;
    }, COMMAND_PRIORITY_EDITOR), editor.registerCommand(CLICK_COMMAND, event => {
      if (isDOMNode(event.target)) {
        const node = $getNodeFromDOMNode(event.target);
        if ($isHorizontalRuleNode(node)) {
          $toggleNodeSelection(node, event.shiftKey);
          return true;
        }
      }
      return false;
    }, COMMAND_PRIORITY_LOW), editor.registerMutationListener(HorizontalRuleNode, (nodes, payload) => {
      n(() => {
        let didChange = false;
        const {
          nodeSelections
        } = nodeSelectionStore.peek();
        for (const [k, v] of nodes.entries()) {
          if (v === 'destroyed') {
            nodeSelections.delete(k);
            didChange = true;
          } else {
            const prev = nodeSelections.get(k);
            const dom = editor.getElementByKey(k);
            if (prev) {
              prev.domNode.value = dom;
            } else {
              didChange = true;
              nodeSelections.set(k, {
                domNode: a(dom),
                selectedSignal: watchNodeKey(k)
              });
            }
          }
        }
        if (didChange) {
          nodeSelectionStore.value = {
            nodeSelections
          };
        }
      });
    }), j(() => {
      const effects = [];
      for (const {
        domNode,
        selectedSignal
      } of nodeSelectionStore.value.nodeSelections.values()) {
        effects.push(j(() => {
          const dom = domNode.value;
          if (dom) {
            const isSelected = selectedSignal.value;
            if (isSelected) {
              addClassNamesToElement(dom, isSelectedClassName);
            } else {
              removeClassNamesFromElement(dom, isSelectedClassName);
            }
          }
        }));
      }
      return mergeRegister(...effects);
    }));
  }
});

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */


/**
 * Centralizes IME composition state so extensions that react to
 * composition lifecycle don't each re-implement the
 * COMPOSITION_START_COMMAND + compositionend listener dance.
 *
 * Exposes two signals (both always-active for the editor's lifetime —
 * listeners are wired up by `register`, not lazily on subscription, so
 * consumers can read `.value` from anywhere without holding a
 * subscription themselves):
 *
 * - `compositionKey` is the raw mirror — the value Lexical's own
 *   `$handleCompositionStart` writes to its internal `_compositionKey`,
 *   i.e. the `selection.anchor.key` at the moment composition starts.
 *   This can be a non-TextNode key when composition begins on an
 *   element-anchor selection (e.g. empty paragraph). Cleared on
 *   `compositionend`.
 *
 * - `composingTextNode` is the resolved view — the actual TextNode
 *   being composed on, or `null` while there is no TextNode-level
 *   composition. For an element-anchor start it stays `null` until
 *   the `COMPOSITION_START_TAG`-tagged update fires with the
 *   post-ZWSP-heuristic selection, at which point it updates to the
 *   new TextNode.
 *
 */
const IMEExtension = /* @__PURE__ */defineExtension({
  build(_editor) {
    return {
      composingTextNode: a(null),
      compositionKey: a(null)
    };
  },
  name: '@lexical/extension/IME',
  register(editor, _config, state) {
    const {
      compositionKey,
      composingTextNode
    } = state.getOutput();
    const removeStartCommand = editor.registerCommand(COMPOSITION_START_COMMAND, () => {
      // `BEFORE_EDITOR` lands at the head of the EDITOR-priority
      // bucket, sequenced immediately before Lexical's own
      // EDITOR-priority `$handleCompositionStart` that calls
      // `$setCompositionKey(anchor.key)`. Both write the same
      // `selection.anchor.key`. The lower nominal priority keeps
      // room for downstream extensions to override.
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        compositionKey.value = selection.anchor.key;
      }
      return false;
    }, COMMAND_PRIORITY_BEFORE_EDITOR);

    // Stage 1: react to compositionKey transitions. Resolve the key
    // to a TextNode when possible. Element-anchor starts resolve to
    // null here and stay null until stage 2.
    const stopKeyEffect = j(() => {
      const key = compositionKey.value;
      if (key === null) {
        composingTextNode.value = null;
        return;
      }
      composingTextNode.value = editor.read('latest', () => {
        const node = $getNodeByKey(key);
        return $isTextNode(node) ? node : null;
      });
    });

    // Stage 2: after Lexical's ZWSP heuristic inserts the actual
    // composing TextNode for an element-anchor start, the
    // corresponding update fires with COMPOSITION_START_TAG. The
    // selection now points at the new TextNode — re-read it and
    // upgrade the signal to the resolved node.
    const removeUpdateListener = editor.registerUpdateListener(({
      tags,
      editorState
    }) => {
      if (!tags.has(COMPOSITION_START_TAG)) {
        return;
      }
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return;
        }
        const node = selection.anchor.getNode();
        if ($isTextNode(node)) {
          composingTextNode.value = node;
        }
      });
    });
    const removeRootListener = editor.registerRootListener(rootElem => {
      if (rootElem === null) {
        compositionKey.value = null;
        return;
      }
      const onCompositionEnd = () => {
        compositionKey.value = null;
      };
      return registerEventListener(rootElem, 'compositionend', onCompositionEnd);
    });
    return mergeRegister(removeStartCommand, stopKeyEffect, removeUpdateListener, removeRootListener);
  }
});

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

function $defaultGetParentEditor() {
  const editor = $getEditor();
  LexicalBuilder.fromEditor(editor);
  return editor;
}
const NestedEditorExtension = /* @__PURE__ */defineExtension({
  build: (editor, config) => namedSignals({
    inheritEditableFromParent: config.inheritEditableFromParent
  }),
  config: /* @__PURE__ */safeCast({
    $getParentEditor: $defaultGetParentEditor,
    inheritEditableFromParent: false
  }),
  init: (editorConfig, config, state) => {
    const parentEditor = config.$getParentEditor();
    editorConfig.parentEditor = parentEditor;
    editorConfig.theme = editorConfig.theme || parentEditor._config.theme;
  },
  name: '@lexical/extension/NestedEditor',
  register: (editor, config, state) => j(() => {
    const parentEditor = editor._parentEditor;
    if (parentEditor) {
      if (state.getOutput().inheritEditableFromParent.value) {
        editor.setEditable(parentEditor.isEditable());
        return parentEditor.registerEditableListener(editor.setEditable.bind(editor));
      }
    }
  })
});

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
const NodeSelectionDataSelectedExtension = /* @__PURE__ */defineExtension({
  config: /* @__PURE__ */safeCast({
    attribute: 'data-selected',
    nodes: []
  }),
  // Expand the configured classes to the types of every registered subclass,
  // so a subclass instance still matches without a runtime `instanceof`. This
  // needs the editor's node list, which is only available before creation.
  init(editorConfig, config) {
    const matchTypes = new Set();
    const subtypeMap = getRegisteredSubtypeMap(getKnownTypesAndNodes(editorConfig).nodes);
    for (const klass of config.nodes) {
      const type = klass.getType();
      const subtypes = subtypeMap.get(type);
      if (!(subtypes !== undefined)) {
        formatDevErrorMessage(`Node class ${klass.name} with type ${type} not registered in editor`);
      }
      matchTypes.add(type);
      for (const subtype of subtypes) {
        matchTypes.add(subtype);
      }
    }
    return {
      matchTypes
    };
  },
  // Each consuming extension contributes its own node type through a separate
  // `configExtension` call, but they all resolve to this single named
  // extension. The default shallow merge would let the last `nodes` array win
  // and silently drop every earlier type, so concatenate them instead.
  mergeConfig(config, partial) {
    return shallowMergeConfig(config, {
      ...partial,
      ...(partial.nodes && {
        nodes: [...config.nodes, ...partial.nodes]
      })
    });
  },
  name: '@lexical/extension/NodeSelectionDataSelected',
  register(editor, config, state) {
    const {
      attribute
    } = config;
    const {
      matchTypes
    } = state.getInitResult();
    // key -> host DOM the attribute was set on, so the disposer can clear
    // still-mounted DOM even after the editor's key->DOM map is reset.
    const marked = new Map();
    const syncFromEditorState = editorState => {
      const nextKeys = new Set();
      editorState.read(() => {
        const selection = $getSelection();
        if ($isNodeSelection(selection)) {
          for (const node of selection.getNodes()) {
            if (matchTypes.has(node.getType())) {
              nextKeys.add(node.getKey());
            }
          }
        }
      });
      for (const [key, dom] of marked) {
        if (!nextKeys.has(key)) {
          dom.removeAttribute(attribute);
          marked.delete(key);
        }
      }
      for (const key of nextKeys) {
        const dom = editor.getElementByKey(key);
        if (dom !== null) {
          dom.setAttribute(attribute, 'true');
          marked.set(key, dom);
        }
      }
    };
    // A NodeSelection already committed when this registers (e.g. the
    // extension is added to a live editor) must be mirrored immediately,
    // not only on the next update.
    syncFromEditorState(editor.getEditorState());
    const removeUpdateListener = editor.registerUpdateListener(({
      editorState
    }) => syncFromEditorState(editorState));
    return () => {
      removeUpdateListener();
      for (const dom of marked.values()) {
        dom.removeAttribute(attribute);
      }
      marked.clear();
    };
  }
});

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

function deleteEmptyInline(node) {
  if ($isElementNode(node) && node.isInline() && node.isEmpty()) {
    node.remove();
    if (node.canBeEmpty()) {
      console.warn(`Empty inline elements are removed from the EditorState, so returning 'true' from ${node.constructor.name}.canBeEmpty() is not allowed`);
    }
  }
}

/**
 * This extension removes empty inline nodes from the EditorState.
 * This extension is designed to facilitate a smooth migration from
 * the plugin API with the option to disable it, but it may be removed
 * in the future and integrated into the core
 */
const NormalizeInlineElementsExtension = /* @__PURE__ */defineExtension({
  build: (editor, config, state) => namedSignals(config),
  config: /* @__PURE__ */safeCast({
    disabled: false
  }),
  name: '@lexical/NormalizeInlineElements',
  register: (editor, config, state) => {
    const stores = state.getOutput();
    return j(() => {
      if (!stores.disabled.value) {
        const disposeTransformers = [];
        for (const {
          klass,
          transforms
        } of editor._nodes.values()) {
          if (klass.prototype instanceof ElementNode && klass.prototype.isInline !== ElementNode.prototype.isInline) {
            transforms.add(deleteEmptyInline);
            disposeTransformers.push(() => transforms.delete(deleteEmptyInline));
          }
        }
        return () => disposeTransformers.forEach(fn => fn());
      }
    });
  }
});

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const SKIP_TAGS = new Set([SKIP_SELECTION_FOCUS_TAG, SKIP_SCROLL_INTO_VIEW_TAG]);
function $fixFocusOverselection() {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return;
  }
  if (!selection.isCollapsed()) {
    // Triple click causing selection to overflow into the nearest element. In that
    // case visually it looks like a single element content is selected, focus node
    // is actually at the beginning of the next element (if present) and any manipulations
    // with selection (formatting) are affecting second element as well
    const range = $getCaretRangeInDirection($caretRangeFromSelection(selection), 'next');
    let focusCaret = range.focus;
    // Move it out of the next TextNode if none of it is selected
    if ($isTextPointCaret(focusCaret) && range.anchor.origin !== focusCaret.origin && focusCaret.offset === 0) {
      focusCaret = $rewindSiblingCaret(focusCaret.getSiblingCaret());
    }
    // Move it behind a single LineBreakNode
    if ($isSiblingCaret(focusCaret) && range.anchor.origin !== focusCaret.origin && $isLineBreakNode(focusCaret.origin)) {
      focusCaret = $rewindSiblingCaret(focusCaret);
    }
    // Move the focus out of the start of any elements
    while ($isChildCaret(focusCaret) && range.anchor.origin !== focusCaret.origin) {
      focusCaret = $rewindSiblingCaret($getSiblingCaret(focusCaret.origin, 'next'));
    }
    // Move it inside the containing element
    if ($isSiblingCaret(focusCaret) && $isElementNode(focusCaret.origin)) {
      focusCaret = $normalizeCaret($getChildCaret(focusCaret.origin, 'previous')).getFlipped();
    }
    focusCaret = $normalizeCaret(focusCaret);
    if (!focusCaret.isSamePointCaret(range.focus)) {
      const sel = $setSelectionFromCaretRange($getCaretRange(range.anchor, focusCaret));
      const editor = $getEditor();
      const rootElement = editor.getRootElement();
      const domSelection = rootElement && getDOMSelection(rootElement.ownerDocument.defaultView);
      if (domSelection) {
        $updateDOMSelection($getPreviousSelection(), sel, $getEditor(), domSelection, SKIP_TAGS, rootElement);
      }
    }
  }
}

/**
 * This extension handles triple-click events and will move the focus
 * towards the anchor in certain conditions to meet expectations.
 * Simply speaking, the focus should prefer to land at the end of a node
 * rather than the beginning of its next sibling, and it should not skip
 * over a LineBreakNode.
 *
 * In order to fix the result visually and avoid a flash of over-selection
 * it will also eagerly manipulate the DOM selection directly.
 *
 * It is conservative in that it only fires this
 * `$fixFocusOverselection` callback when it has detected a triple click,
 * but it provides the function as an output signal so that it can both
 * be called from other places and it can be replaced or wrapped with
 * different functionality.
 */
const NormalizeTripleClickSelectionExtension = /* @__PURE__ */defineExtension({
  build: (editor, config, state) => namedSignals(config),
  config: /* @__PURE__ */safeCast({
    $fixFocusOverselection,
    dateNow: Date.now,
    disabled: false,
    thresholdMsec: 100
  }),
  name: '@lexical/NormalizeTripleClickSelection',
  register: (editor, config, state) => j(() => {
    const stores = state.getOutput();
    if (stores.disabled.value) {
      return;
    }
    return editor.registerRootListener(rootElement => {
      if (!rootElement) {
        return;
      }
      let lastTripleClick = 0;
      const refreshTripleClick = event => {
        if (event ? event.detail === 3 : lastTripleClick > 0) {
          const now = stores.dateNow.peek()();
          lastTripleClick = event && event.type === 'mousedown' || now - lastTripleClick <= stores.thresholdMsec.peek() ? now : 0;
        }
        return lastTripleClick;
      };
      return mergeRegister(editor.registerCommand(SELECTION_CHANGE_COMMAND, () => {
        if (refreshTripleClick(null)) {
          lastTripleClick = 0;
          stores.$fixFocusOverselection.peek()();
        }
        return false;
      }, COMMAND_PRIORITY_BEFORE_CRITICAL), registerEventListeners(rootElement, {
        mousedown: refreshTripleClick,
        mouseup: refreshTripleClick
      }, true));
    });
  })
});

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

function captureKeydown(e) {
  const target = e.target;
  if (isExactShortcutMatch(e, 'a', {
    ctrlKey: !IS_APPLE,
    metaKey: IS_APPLE
  }) && isHTMLElement(target) && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
    // prevents the event bubbling before it reaches the lexical scope
    target.addEventListener('keydown', stopLexicalPropagation, {
      once: true
    });
  }
}
/**
 * By default, lexical intercepts most events and dispatches the appropriate commands.
 * This extension prevents the keydown event propagating from input/textarea elements,
 * which are typically part of a decorator node, in order to stop dispatching the SELECT_ALL_COMMAND.
 *
 * When used as a dependency of SelectBlockExtension, its disabled state is
 * kept in sync with that extension.
 */
const PreventSelectAllExtension = /* @__PURE__ */defineExtension({
  build: (editor, config, state) => namedSignals(config),
  config: /* @__PURE__ */safeCast({
    disabled: false
  }),
  name: '@lexical/extension/PreventSelectAll',
  register: (editor, config, state) => {
    const stores = state.getOutput();
    return j(() => {
      if (!stores.disabled.value) {
        return editor.registerRootListener(rootElement => {
          if (rootElement) {
            return registerEventListener(rootElement, 'keydown', captureKeydown, true);
          }
        });
      }
    });
  }
});

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Exposes the editor's current root element as a reactive
 * `Signal<HTMLElement | null>` that mirrors `editor.getRootElement()` via a
 * root listener.
 *
 * Depend on this extension and read its output `Signal` from a signals
 * `effect`/`computed` to react to the root mounting, unmounting, or remounting
 * (e.g. into a different document such as an iframe) without subscribing
 * through React (or any other framework).
 */
const RootElementExtension = /* @__PURE__ */defineExtension({
  build(editor) {
    return watchedSignal(() => editor.getRootElement(), rootElementSignal => editor.registerRootListener(rootElement => {
      rootElementSignal.value = rootElement;
    }));
  },
  name: '@lexical/extension/RootElement'
});

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

function $hasCommonTopParent(nodes, commonTopParent) {
  return nodes.every(node => commonTopParent.is(node.getTopLevelElement()));
}
/**
 * This extension includes block selection.
 * If you press Ctrl + A, the nearest block element, for example paragraph, is selected first.
 * Pressing Ctrl + A again selects all content in the document. A selection
 * that already spans multiple blocks expands directly to the whole document.
 */
const SelectBlockExtension = /* @__PURE__ */defineExtension({
  build: (editor, config, state) => namedSignals(config),
  config: /* @__PURE__ */safeCast({
    cascadeSelection: false,
    disabled: false
  }),
  dependencies: [PreventSelectAllExtension],
  name: '@lexical/extension/SelectBlock',
  register: (editor, config, state) => {
    const stores = state.getOutput();
    const preventSelectAllStores = state.getDependency(PreventSelectAllExtension).output;
    return mergeRegister(
    // PreventSelectAllExtension is only a dependency in support of this
    // extension, so its disabled state is kept in sync
    j(() => {
      preventSelectAllStores.disabled.value = stores.disabled.value;
    }), j(() => {
      if (!stores.disabled.value) {
        return editor.registerCommand(SELECT_ALL_COMMAND, (event, triggerEditor) => {
          if (triggerEditor !== editor) {
            // The command bubbled up from a nested editor. Without
            // cascadeSelection it is ignored so that the nested editor's
            // own handlers (e.g. RichTextExtension) take care of it. With
            // cascadeSelection it is only handled when the nested
            // editor's content is already fully selected.
            if (!stores.cascadeSelection.peek()) {
              return false;
            }
            // read('pending') reflects an update in progress or queued
            // in the nested editor (such as its initial state) without
            // flushing it, which would not be safe if its update is
            // still in progress
            const isAllSelected = triggerEditor.read('pending', () => {
              const nestedSelection = $getSelection();
              return $isRangeSelection(nestedSelection) && $isBlockFullySelected($getRoot(), nestedSelection);
            });
            if (!isAllSelected) {
              return false;
            }
            $selectAll();
            return true;
          }
          const selection = $getSelection();
          if ($isNodeSelection(selection)) {
            const selectedNodes = selection.getNodes();
            const firstNode = selectedNodes[0];
            if (!firstNode) {
              // An empty NodeSelection, defer to the default handlers
              return false;
            }
            const topParent = firstNode.getTopLevelElement();
            if (!topParent || $isRootNode(topParent) || topParent.is(firstNode) ||
            // if multiple nodes are selected and they do not share a common ancestor
            selectedNodes.length > 1 && !$hasCommonTopParent(selectedNodes, topParent)) {
              $selectAll();
              // This is type narrowing.
              // If firstNode is a decorator, then it is equal to topParent
            } else if ($isElementNode(topParent)) {
              topParent.select(0, topParent.getChildrenSize());
            }
            return true;
          }
          if (!$isRangeSelection(selection)) {
            return false;
          }
          const anchorNode = selection.anchor.getNode();
          const blockNode = anchorNode.getTopLevelElement();
          if (blockNode &&
          // A selection that crosses block boundaries expands to the
          // next enclosing scope instead of shrinking to the anchor's
          // block
          blockNode.is(selection.focus.getNode().getTopLevelElement()) &&
          // an empty block is fully selected by its caret
          !$isBlockFullySelected(blockNode, selection)) {
            blockNode.select(0, blockNode.getChildrenSize());
            return true;
          }
          // Named slots are isolated sub-scopes between the block and
          // the document: expand to the innermost enclosing slot frame
          // that is not yet fully selected before escalating to the
          // whole document, walking outward through nested frames. A
          // frame whose single block is already fully selected counts
          // as fully selected itself, so a one-block slot escalates
          // straight to the next scope with no dead press.
          let frame = $getSlotFrame(anchorNode);
          while (frame !== null) {
            if ($isElementNode(frame) && !$isBlockFullySelected(frame, selection)) {
              frame.select(0, frame.getChildrenSize());
              return true;
            }
            const host = $getSlotHost(frame);
            frame = host === null ? null : $getSlotFrame(host);
          }
          if (!$isBlockFullySelected($getRoot(), selection)) {
            // don't trigger selectAll if the document is already
            // fully selected
            $selectAll();
          }
          return true;
        },
        // This must be in a higher priority bucket than
        // COMMAND_PRIORITY_EDITOR (e.g. not COMMAND_PRIORITY_BEFORE_EDITOR)
        // for cascadeSelection to work. Listeners run for all editors in
        // priority bucket order (nested editor first within each bucket),
        // so an EDITOR bucket listener here would run after the nested
        // editor's own RichTextExtension SELECT_ALL_COMMAND handler.
        COMMAND_PRIORITY_LOW);
      }
    }));
  }
});

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * An extension that highlights selected content in the Lexical editor
 * even when the editor is not currently focused.
 */
const SelectionAlwaysOnDisplayExtension = /* @__PURE__ */defineExtension({
  build: (editor, config, state) => namedSignals(config),
  config: /* @__PURE__ */safeCast({
    disabled: false,
    onReposition: undefined
  }),
  name: '@lexical/utils/SelectionAlwaysOnDisplay',
  register: (editor, config, state) => {
    const stores = state.getOutput();
    return j(() => {
      if (!stores.disabled.value) {
        return selectionAlwaysOnDisplay(editor, stores.onReposition.value);
      }
    });
  }
});

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

function $indentOverTab(selection) {
  // const handled = new Set();
  const nodes = selection.getNodes();
  const canIndentBlockNodes = nodes.filter(node => $isBlockElementNode(node) && node.canIndent());
  // 1. If selection spans across canIndent block nodes: indent
  if (canIndentBlockNodes.length > 0) {
    return true;
  }
  // 2. If first (anchor/focus) is at block start: indent
  const anchor = selection.anchor;
  const focus = selection.focus;
  const first = focus.isBefore(anchor) ? focus : anchor;
  const firstNode = first.getNode();
  const firstBlock = $getNearestBlockElementAncestorOrThrow(firstNode);
  if (firstBlock.canIndent()) {
    const firstBlockKey = firstBlock.getKey();
    let selectionAtStart = $createRangeSelection();
    selectionAtStart.anchor.set(firstBlockKey, 0, 'element');
    selectionAtStart.focus.set(firstBlockKey, 0, 'element');
    selectionAtStart = $normalizeSelection__EXPERIMENTAL(selectionAtStart);
    if (selectionAtStart.anchor.is(first)) {
      return true;
    }
  }
  // 3. Else: tab
  return false;
}
function $defaultCanIndent(node) {
  return node.canIndent();
}

/**
 * Registers a `KEY_TAB_COMMAND` handler that makes Tab and Shift+Tab indent and
 * outdent block elements (and otherwise insert a tab). Pass `maxIndent` to cap
 * the indent depth and `$canIndent` to control which elements may be indented.
 *
 * @returns A cleanup function that unregisters the handler.
 */
function registerTabIndentation(editor, maxIndent, $canIndent = $defaultCanIndent) {
  return mergeRegister(editor.registerCommand(KEY_TAB_COMMAND, event => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      return false;
    }
    event.preventDefault();
    const command = $indentOverTab(selection) ? event.shiftKey ? OUTDENT_CONTENT_COMMAND : INDENT_CONTENT_COMMAND : INSERT_TAB_COMMAND;
    return editor.dispatchCommand(command);
  }, COMMAND_PRIORITY_EDITOR), editor.registerCommand(INDENT_CONTENT_COMMAND, () => {
    const currentMaxIndent = typeof maxIndent === 'number' ? maxIndent : maxIndent ? maxIndent.peek() : null;
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      return false;
    }
    const $currentCanIndent = typeof $canIndent === 'function' ? $canIndent : $canIndent.peek();
    return $handleIndentAndOutdent(block => {
      if ($currentCanIndent(block)) {
        const newIndent = block.getIndent() + 1;
        if (!currentMaxIndent || newIndent < currentMaxIndent) {
          block.setIndent(newIndent);
        }
      }
    });
  }, COMMAND_PRIORITY_CRITICAL));
}
/**
 * This extension adds the ability to indent content using the tab key. Generally, we don't
 * recommend using this plugin as it could negatively affect accessibility for keyboard
 * users, causing focus to become trapped within the editor.
 */
const TabIndentationExtension = /* @__PURE__ */defineExtension({
  build(editor, config, state) {
    return namedSignals(config);
  },
  config: /* @__PURE__ */safeCast({
    $canIndent: $defaultCanIndent,
    disabled: false,
    maxIndent: null
  }),
  name: '@lexical/extension/TabIndentation',
  register(editor, config, state) {
    const {
      disabled,
      maxIndent,
      $canIndent
    } = state.getOutput();
    return j(() => {
      if (!disabled.value) {
        return registerTabIndentation(editor, maxIndent, $canIndent);
      }
    });
  }
});

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Exposes the editor's editable state as a reactive `Signal<boolean>` that
 * mirrors `editor.isEditable()` via an editable listener.
 *
 * Depend on this extension and read its output `Signal` from a signals
 * `effect`/`computed` to react to editability changes without subscribing
 * through React (or any other framework).
 */
const WatchEditableExtension = /* @__PURE__ */defineExtension({
  build(editor) {
    return watchedSignal(() => editor.isEditable(), signal => editor.registerEditableListener(editable => {
      signal.value = editable;
    }));
  },
  name: '@lexical/extension/WatchEditable'
});

export { $applyFormatToDom, $createHorizontalRuleNode, $defaultShouldInsertAfter, $getExtensionDependency, $getExtensionOutput, $getPeerDependency, $isDecoratorTextNode, $isHorizontalRuleNode, AutoFocusExtension, ClearEditorExtension, ClickAfterLastBlockExtension, DecoratorTextExtension, DecoratorTextNode, EditorStateExtension, HorizontalRuleExtension, HorizontalRuleNode, IMEExtension, INSERT_HORIZONTAL_RULE_COMMAND, InitialStateExtension, LexicalBuilder, NestedEditorExtension, NodeSelectionDataSelectedExtension, NodeSelectionExtension, NormalizeInlineElementsExtension, NormalizeTripleClickSelectionExtension, PreventSelectAllExtension, RootElementExtension, SelectBlockExtension, SelectionAlwaysOnDisplayExtension, TabIndentationExtension, WatchEditableExtension, applyFormatFromStyle, applyFormatToDom, n as batch, buildEditorFromExtensions, g as computed, j as effect, getExtensionDependencyFromEditor, getKnownTypesAndNodes, getPeerDependencyFromEditor, getPeerDependencyFromEditorOrThrow, namedSignals, registerClearEditor, registerTabIndentation, a as signal, h as untracked, watchedSignal };
