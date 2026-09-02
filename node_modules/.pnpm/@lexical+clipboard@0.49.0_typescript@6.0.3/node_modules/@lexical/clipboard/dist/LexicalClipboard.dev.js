/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

var lexical = require('lexical');
var extension = require('@lexical/extension');
var html = require('@lexical/html');
var selection = require('@lexical/selection');
var utils = require('@lexical/utils');

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */


// True when `node` is `rootElement` or a composed descendant of it, walking
// across shadow boundaries via getParentElement. A point retargeted to the
// shadow host resolves to an ancestor of rootElement, so it fails this check
// (the host is above rootElement, never below it).
function isWithinComposedTree(node, rootElement) {
  for (let current = node; current !== null;) {
    if (current === rootElement) {
      return true;
    }
    current = lexical.getParentElement(current);
  }
  return false;
}

// Find the closest caret position at (x, y) by walking text nodes under
// `container`. Two-phase: pick the nearest text node via getClientRects(),
// then scan offsets within that single node. Vertical-first comparison
// prevents cross-line mispicks on wrapped spans and RTL/bidi text.
// Not a hot path (runs once per drag-drop).
function findTextOffsetAtPoint(x, y, container, doc) {
  const range = doc.createRange();
  const vDist = r => y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
  const hDist = r => x < r.left ? r.left - x : x > r.right ? x - r.right : 0;

  // Phase 1: pick the nearest text node via one getClientRects() per node
  // (each returns its per-line fragments) so phase 2 scans a single node.
  const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let bestNode = null;
  let bestV = Infinity;
  let bestH = Infinity;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) {
      const v = vDist(r);
      const h = hDist(r);
      if (v < bestV || v === bestV && h < bestH) {
        bestV = v;
        bestH = h;
        bestNode = n;
      }
    }
  }
  if (bestNode === null) {
    return null;
  }

  // Phase 2: closest caret offset within that node, vertical-first again
  // (so LTR and RTL both land on the right line).
  let bestOffset = 0;
  let offV = Infinity;
  let offH = Infinity;
  for (let i = 0; i <= bestNode.length; i++) {
    range.setStart(bestNode, i);
    range.collapse(true);
    const r = range.getBoundingClientRect();
    const v = vDist(r);
    const h = Math.abs(x - r.left);
    if (v < offV || v === offV && h < offH) {
      offV = v;
      offH = h;
      bestOffset = i;
    }
  }
  return {
    node: bestNode,
    offset: bestOffset
  };
}

/** @internal */
function caretFromPoint(x, y, rootElement = null) {
  const doc = lexical.getRootOwnerDocument(rootElement);
  const shadowRoots = rootElement ? lexical.getDOMShadowRoots(rootElement) : [];
  const hasShadow = rootElement !== null && shadowRoots.length > 0;
  // caretPositionFromPoint with {shadowRoots} (Chrome 128+, Firefox 125+)
  // returns the un-retargeted node inside the shadow tree directly.
  if (hasShadow && typeof doc.caretPositionFromPoint === 'function') {
    const caretPosition = doc.caretPositionFromPoint(x, y, {
      shadowRoots
    });
    if (caretPosition !== null && isWithinComposedTree(caretPosition.offsetNode, rootElement)) {
      return {
        node: caretPosition.offsetNode,
        offset: caretPosition.offset
      };
    }
  }
  // Shadow fallback: caretRangeFromPoint retargets shadow-internal nodes
  // to the shadow host. Use shadowRoot.elementFromPoint to find the
  // correct element, then walk its text nodes to find the offset.
  // Also reached when caretPositionFromPoint exists but silently ignored
  // the {shadowRoots} option (older Chrome/Firefox).
  if (hasShadow) {
    const rootNode = rootElement.getRootNode();
    if (lexical.isDOMShadowRoot(rootNode)) {
      const element = rootNode.elementFromPoint(x, y);
      if (element !== null && rootElement.contains(element)) {
        const result = findTextOffsetAtPoint(x, y, element, doc);
        if (result !== null) {
          return result;
        }
      }
      // The point missed the editor's shadow content (gutter/padding, slotted
      // content, or a sibling outside rootElement). Fall through to the legacy
      // caretRangeFromPoint path for a best-effort (host-level) caret rather
      // than dropping the interaction entirely.
    }
  }
  // Non-shadow path.
  if (typeof doc.caretRangeFromPoint === 'function') {
    const range = doc.caretRangeFromPoint(x, y);
    if (range === null) {
      return null;
    }
    return {
      node: range.startContainer,
      offset: range.startOffset
    };
  } else if (typeof doc.caretPositionFromPoint === 'function') {
    const caretPosition = doc.caretPositionFromPoint(x, y);
    if (caretPosition === null) {
      return null;
    }
    return {
      node: caretPosition.offsetNode,
      offset: caretPosition.offset
    };
  }
  return null;
}

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
 * A middleware function in a per-MIME-type clipboard-import stack. Mirrors
 * the shape of {@link ExportMimeTypeFunction} on the export side.
 *
 * - `data` is the non-empty string returned by `DataTransfer.getData(mime)`
 *   for this MIME type.
 * - `selection` is the current editor selection at the insertion point.
 * - `$next` defers to the next-lower handler in the stack (i.e. the handler
 *   that was registered earlier). Returns `true` if that handler claimed
 *   the data; `false` if no handler accepted it.
 * - `dataTransfer` is the full {@link DataTransfer} the paste/drop came
 *   from, so a handler can inspect companion MIME types or attached
 *   files in addition to the slot it was invoked for (e.g. peek at
 *   `'application/x-vscode-source'` while handling `'text/html'`). When
 *   threading through the new pipeline, pass this into
 *   `$generateNodesFromDOMViaExtension(dom, {
 *     context: [contextValue(ImportSourceDataTransfer, dataTransfer)],
 *   })` so rules and preprocessors can read it via
 *   `ctx.get(ImportSourceDataTransfer)`.
 *
 * The function should return `true` if it consumed the data (the caller
 * stops trying further handlers for this MIME type and does not move on to
 * the next MIME type). Return `$next()` to delegate. Return `false` if the
 * function decided not to handle the data after inspecting it (e.g. the
 * JSON namespace didn't match) so a lower-priority handler — or the next
 * MIME type — gets a chance.
 *
 * @experimental
 */

/**
 * A mapping from MIME type to a stack of {@link ImportMimeTypeFunction}.
 *
 * Each entry is an ordered array; the function at the highest index runs
 * first and may call `next()` to fall through to the function below it.
 * The default config provides one handler each for
 * `'application/x-lexical-editor'`, `'text/html'`, and `'text/plain'` that
 * matches the legacy {@link $insertDataTransferForRichText} behavior.
 *
 * When {@link ClipboardImportExtension} merges a partial config, new
 * functions are appended to the existing array for each MIME type, so
 * later-registered handlers run before earlier ones (including the
 * defaults) and may delegate to them via `next()`.
 *
 * @experimental
 */

/**
 * Per-MIME-type ordering weights. Lower numbers run first.
 *
 * Composable across extensions: each extension contributes weights for
 * its MIME types without needing to coordinate. A partial config that
 * sets `{'application/vnd.myapp+json': 5}` slots its type between the
 * built-in `application/x-lexical-editor` (0) and `text/html` (10) — no
 * need to enumerate the full ordering. mergeConfig spreads pairs (later
 * keys override earlier ones for the same MIME type, so an extension
 * can also re-rank a built-in by repeating its key with a new weight).
 *
 * Iteration: every MIME type that has a handler stack and is present in
 * the dataTransfer (regardless of whether it has an explicit weight) is
 * tried; MIME types with no explicit weight sort to the end, behind all
 * weighted ones, in lexical order.
 *
 * @experimental
 */

/**
 * Configuration for {@link ClipboardImportExtension}.
 *
 * @experimental
 */

/**
 * Default per-MIME-type weights reproducing the legacy
 * `$insertDataTransferForRichText` ordering:
 *
 * `application/x-lexical-editor` (0) → `text/html` (10) →
 * `text/plain` (20) → `text/uri-list` (30).
 *
 * Gaps between weights let third-party MIME types slot in (e.g. weight
 * 5 to run between lexical and html). Apps can also override built-in
 * weights to demote them.
 *
 * @experimental
 */
const DEFAULT_IMPORT_MIME_TYPE_PRIORITY = {
  'application/x-lexical-editor': 0,
  'text/html': 10,
  'text/plain': 20,
  'text/uri-list': 30
};
function trustHTML(html) {
  // eslint-disable-next-line no-restricted-syntax
  if (window.trustedTypes && window.trustedTypes.createPolicy) {
    // eslint-disable-next-line no-restricted-syntax
    const policy = window.trustedTypes.createPolicy('lexical', {
      createHTML: input => input
    });
    return policy.createHTML(html);
  }
  return html;
}

/**
 * Default handler for `'application/x-lexical-editor'`: parse the JSON,
 * verify the namespace, and insert the serialized nodes.
 */
const $defaultLexicalEditorImporter = (data, selection, $next) => {
  try {
    const editor = lexical.$getEditor();
    const payload = JSON.parse(data);
    if (payload && payload.namespace === editor._config.namespace && Array.isArray(payload.nodes)) {
      const nodes = $generateNodesFromSerializedNodes(payload.nodes);
      $insertGeneratedNodes(editor, nodes, selection);
      return true;
    }
  } catch (error) {
    console.error(error);
  }
  return $next();
};

/**
 * Default handler for `'text/html'`: parse the HTML and run the legacy
 * `$generateNodesFromDOM`. Override (or stack a higher-priority handler
 * on top) to route HTML pastes through {@link DOMImportExtension} or any
 * custom pipeline. See {@link $generateNodesFromDOMViaExtension} for the
 * built-in `DOMImportExtension` adapter.
 */
const $defaultHtmlImporter = (data, selection, $next) => {
  try {
    const editor = lexical.$getEditor();
    const parser = new DOMParser();
    const dom = parser.parseFromString(trustHTML(data), 'text/html');
    const nodes = html.$generateNodesFromDOM(editor, dom);
    $insertGeneratedNodes(editor, nodes, selection);
    return true;
  } catch (error) {
    console.error(error);
    return $next();
  }
};

/**
 * Default handler for `'text/plain'`. On a RangeSelection, drive the
 * insertion off {@link tokenizeRawText} so each `\n` becomes a real
 * paragraph break via `insertParagraph` (preserving current text
 * format / style on the surrounding `insertText` calls). For other
 * selection types, defer to the selection's own `insertRawText`.
 */
const $defaultPlainTextImporter = (data, selection) => {
  if (!lexical.$isRangeSelection(selection)) {
    selection.insertRawText(data);
    return true;
  }
  const withCurrentRange = fn => {
    const cur = lexical.$getSelection();
    if (lexical.$isRangeSelection(cur)) {
      fn(cur);
    }
  };
  lexical.tokenizeRawText(data, {
    linebreak: () => withCurrentRange(cur => cur.insertParagraph()),
    tab: () => withCurrentRange(cur => cur.insertNodes([lexical.$createTabNode()])),
    text: part => withCurrentRange(cur => cur.insertText(part))
  });
  return true;
};

/**
 * The default per-MIME-type handler stacks reproducing the legacy
 * {@link $insertDataTransferForRichText} behavior exactly. Stacked
 * extensions append on top of these.
 *
 * @experimental
 */
const DEFAULT_IMPORT_MIME_TYPE = {
  'application/x-lexical-editor': [$defaultLexicalEditorImporter],
  'text/html': [$defaultHtmlImporter],
  'text/plain': [$defaultPlainTextImporter],
  // `text/uri-list` is a Webkit-only payload that drops behave-like text;
  // reuse the plain-text handler so a URL drop on a rich-text editor
  // inserts as plain text rather than being ignored.
  'text/uri-list': [$defaultPlainTextImporter]
};

/**
 * Output of {@link ClipboardImportExtension}: the merged configuration
 * plus a self-contained {@link $insertDataTransfer} function that owns
 * the entire paste-side iteration over the priority list. Apps look this
 * up via peer-dependency and call it directly; {@link
 * $insertDataTransferForRichText} delegates to it.
 *
 * @experimental
 */

function $callImportMimeTypeFunctionStack(fns, data, selection, dataTransfer) {
  if (!fns) {
    return false;
  }
  const callAt = i => fns[i] ? fns[i](data, selection, callAt.bind(null, i - 1), dataTransfer) : false;
  return callAt(fns.length - 1);
}

/**
 * Sort the MIME types that have a registered handler stack by their
 * configured priority weight (ascending). Types with no explicit weight
 * sort after all weighted types, in lexical order, so unknown types
 * remain reachable but never preempt a known one.
 */
function orderedMimeTypes(config) {
  const mimes = Object.keys(config.$importMimeType).filter(k => config.$importMimeType[k] !== undefined);
  return mimes.sort((a, b) => {
    const wa = config.priority[a];
    const wb = config.priority[b];
    if (wa === undefined && wb === undefined) {
      return a < b ? -1 : a > b ? 1 : 0;
    }
    if (wa === undefined) {
      return 1;
    }
    if (wb === undefined) {
      return -1;
    }
    return wa - wb;
  });
}
function $runImport(config, dataTransfer, selection) {
  // Read once for the iOS Safari heuristic that skips text/html when it
  // matches text/plain verbatim (iOS Safari autocorrect produces a
  // text/html payload identical to the plain text).
  const plainString = dataTransfer.getData('text/plain');
  for (const mime of orderedMimeTypes(config)) {
    const data = dataTransfer.getData(mime);
    if (!data) {
      continue;
    }
    if (mime === 'text/html' && data === plainString) {
      continue;
    }
    if ($callImportMimeTypeFunctionStack(config.$importMimeType[mime], data, selection, dataTransfer)) {
      return true;
    }
  }
  return false;
}
const DEFAULT_OUTPUT = {
  $importMimeType: DEFAULT_IMPORT_MIME_TYPE,
  $insertDataTransfer: (dataTransfer, selection) => $runImport({
    $importMimeType: DEFAULT_IMPORT_MIME_TYPE,
    priority: DEFAULT_IMPORT_MIME_TYPE_PRIORITY
  }, dataTransfer, selection),
  priority: DEFAULT_IMPORT_MIME_TYPE_PRIORITY
};

/**
 * @internal
 *
 * Look up the {@link ClipboardImportOutput} on the active editor. Returns
 * a static default-backed output when no {@link ClipboardImportExtension}
 * is configured, so callers can always invoke `output.$insertDataTransfer`
 * regardless of whether the editor opted in.
 */
function $getImportOutput() {
  const dep = extension.$getPeerDependency(ClipboardImportExtension.name);
  return dep ? dep.output : DEFAULT_OUTPUT;
}

/**
 * @experimental
 *
 * Mirror of {@link GetClipboardDataExtension} for the import direction.
 * Holds a per-MIME-type stack of {@link ImportMimeTypeFunction}s.
 *
 * @example
 * Route `text/html` pastes through {@link DOMImportExtension}, leaving the
 * defaults for other MIME types untouched:
 * ```ts
 * import {configExtension, defineExtension, $getEditor} from 'lexical';
 * import {
 *   ClipboardImportExtension,
 *   $insertGeneratedNodes,
 * } from '@lexical/clipboard';
 * import {
 *   contextValue,
 *   DOMImportExtension,
 *   ImportSource,
 *   ImportSourceDataTransfer,
 *   $generateNodesFromDOMViaExtension,
 * } from '@lexical/html';
 *
 * defineExtension({
 *   name: 'app',
 *   dependencies: [
 *     DOMImportExtension,
 *     configExtension(ClipboardImportExtension, {
 *       $importMimeType: {
 *         'text/html': [
 *           (html, selection, _$next, dataTransfer) => {
 *             const parser = new DOMParser();
 *             const dom = parser.parseFromString(html, 'text/html');
 *             const nodes = $generateNodesFromDOMViaExtension(dom, {
 *               context: [
 *                 contextValue(ImportSource, 'paste'),
 *                 contextValue(ImportSourceDataTransfer, dataTransfer),
 *               ],
 *             });
 *             $insertGeneratedNodes($getEditor(), nodes, selection);
 *             return true;
 *           },
 *         ],
 *       },
 *     }),
 *   ],
 * });
 * ```
 */
const ClipboardImportExtension = /* @__PURE__ */lexical.defineExtension({
  build: (_editor, config) => ({
    $importMimeType: config.$importMimeType,
    $insertDataTransfer: (dataTransfer, selection) => $runImport(config, dataTransfer, selection),
    priority: config.priority
  }),
  config: /* @__PURE__ */lexical.safeCast({
    $importMimeType: DEFAULT_IMPORT_MIME_TYPE,
    priority: DEFAULT_IMPORT_MIME_TYPE_PRIORITY
  }),
  mergeConfig(config, partial) {
    const merged = lexical.shallowMergeConfig(config, partial);
    if (partial.$importMimeType) {
      const $importMimeType = {
        ...config.$importMimeType
      };
      for (const [k, v] of Object.entries(partial.$importMimeType)) {
        if (v) {
          const prev = $importMimeType[k];
          $importMimeType[k] = prev ? [...prev, ...v] : v;
        }
      }
      merged.$importMimeType = $importMimeType;
    }
    if (partial.priority) {
      // Spread-merge weights. Per-MIME-type keys in `partial` override
      // any matching key in `config` (so an extension can rerank a
      // built-in MIME type) and new keys are simply added (so multiple
      // extensions can each contribute their own MIME types without
      // having to coordinate).
      merged.priority = {
        ...config.priority,
        ...partial.priority
      };
    }
    return merged;
  },
  name: '@lexical/clipboard/Import'
});

/**
 * @experimental
 *
 * Drop-in extension that routes `text/html` clipboard pastes and drops
 * through the {@link DOMImportExtension} pipeline (rules, schemas,
 * preprocessors, overlays) instead of the legacy
 * {@link $generateNodesFromDOM}. Node-providing extensions
 * (`RichTextExtension`, `ListExtension`, `LinkExtension`,
 * `TableExtension`, `CodeExtension`, …) register their own import rules,
 * so adding this extension to an editor built from them is all it takes
 * to activate the pipeline for pastes. {@link CoreImportExtension} (the
 * paragraph/text/inline-format baseline) is a dependency of this
 * extension, so even an editor with no rule-contributing node extensions
 * gets sensible text handling.
 *
 * The original {@link DataTransfer} and `'paste'` source kind are forwarded
 * into the import context so rules and preprocessors can read them via
 * `ctx.get(ImportSourceDataTransfer)` / `ctx.get(ImportSource)`.
 *
 * Equivalent to stacking this `text/html` handler manually via
 * `configExtension(ClipboardImportExtension, {...})`.
 *
 * @example
 * ```ts
 * import {defineExtension} from 'lexical';
 * import {ClipboardDOMImportExtension} from '@lexical/clipboard';
 * import {RichTextExtension} from '@lexical/rich-text';
 *
 * defineExtension({
 *   name: 'app',
 *   dependencies: [
 *     RichTextExtension,
 *     ClipboardDOMImportExtension,
 *   ],
 * });
 * ```
 */
const ClipboardDOMImportExtension = /* @__PURE__ */lexical.defineExtension({
  dependencies: [html.CoreImportExtension, /* @__PURE__ */extension.configExtension(ClipboardImportExtension, {
    $importMimeType: {
      'text/html': [(html$1, selection, _$next, dataTransfer) => {
        const parser = new DOMParser();
        const dom = parser.parseFromString(trustHTML(html$1), 'text/html');
        const nodes = html.$generateNodesFromDOMViaExtension(dom, {
          context: [html.contextValue(html.ImportSource, 'paste'), html.contextValue(html.ImportSourceDataTransfer, dataTransfer)]
        });
        $insertGeneratedNodes(lexical.$getEditor(), nodes, selection);
        return true;
      }]
    }
  })],
  name: '@lexical/clipboard/DOMImport'
});

/**
 * Returns the *currently selected* Lexical content as an HTML string, relying on the
 * logic defined in the exportDOM methods on the LexicalNode classes. Note that
 * this will not return the HTML content of the entire editor (unless all the content is included
 * in the current selection).
 *
 * @param editor - LexicalEditor instance to get HTML content from
 * @param selection - The selection to use (default is $getSelection())
 * @returns a string of HTML content
 */
function $getHtmlContent(editor, selection = lexical.$getSelection()) {
  if (selection == null) {
    {
      formatDevErrorMessage(`Expected valid LexicalSelection`);
    }
  }

  // If we haven't selected anything
  if (lexical.$isRangeSelection(selection) && selection.isCollapsed() || selection.getNodes().length === 0) {
    return '';
  }
  return html.$generateHtmlFromNodes(editor, selection);
}

/**
 * Returns the *currently selected* Lexical content as a JSON string, relying on the
 * logic defined in the exportJSON methods on the LexicalNode classes. Note that
 * this will not return the JSON content of the entire editor (unless all the content is included
 * in the current selection).
 *
 * @param editor  - LexicalEditor instance to get the JSON content from
 * @param selection - The selection to use (default is $getSelection())
 * @returns
 */
function $getLexicalContent(editor, selection = lexical.$getSelection()) {
  if (selection == null) {
    {
      formatDevErrorMessage(`Expected valid LexicalSelection`);
    }
  }

  // If we haven't selected anything
  if (lexical.$isRangeSelection(selection) && selection.isCollapsed() || selection.getNodes().length === 0) {
    return null;
  }
  return JSON.stringify($generateJSONFromSelectedNodes(editor, selection));
}

/**
 * Attempts to insert content of the mime-types text/plain or text/uri-list from
 * the provided DataTransfer object into the editor at the provided selection.
 * text/uri-list is only used if text/plain is not also provided.
 *
 * @param dataTransfer an object conforming to the [DataTransfer interface] (https://html.spec.whatwg.org/multipage/dnd.html#the-datatransfer-interface)
 * @param selection the selection to use as the insertion point for the content in the DataTransfer object
 */
function $insertDataTransferForPlainText(dataTransfer, selection) {
  const text = dataTransfer.getData('text/plain') || dataTransfer.getData('text/uri-list');
  if (text != null) {
    selection.insertRawText(text);
  }
}

/**
 * Insert the contents of `dataTransfer` at `selection` using the rich-text
 * import pipeline (`application/x-lexical-editor` → `text/html` → `text/plain`
 * → `text/uri-list`, in descending order of priority).
 *
 * @param dataTransfer an object conforming to the [DataTransfer interface] (https://html.spec.whatwg.org/multipage/dnd.html#the-datatransfer-interface)
 * @param selection the selection to use as the insertion point for the content in the DataTransfer object
 * @param _editor unused; retained for backwards compatibility. Safe to
 *   omit on new call sites.
 */
function $insertDataTransferForRichText(dataTransfer, selection, _editor) {
  $getImportOutput().$insertDataTransfer(dataTransfer, selection);
}
const LEXICAL_DRAG_MIME_TYPE = 'application/x-lexical-drag';
/**
 * Populate `dataTransfer` with a marker identifying the current editor as a
 * drag source. Pair this with {@link $handleRichTextDrop} or
 * {@link $handlePlainTextDrop} on the drop side to get cut-and-paste semantics
 * for drags that end in a different editor.
 *
 * Only the source editor's key needs to round-trip — the source's
 * RangeSelection itself is preserved on the source editor between drag start
 * and drop (Lexical suppresses selectionchange during drag), so the drop
 * handler reads it directly via `$getSelection()` on the resolved source
 * editor.
 *
 * Callers typically invoke this from a DRAGSTART_COMMAND handler alongside
 * {@link setLexicalClipboardDataTransfer} (so that the dragged content itself
 * round-trips with full node fidelity).
 */
function $writeDragSourceToDataTransfer(dataTransfer, editor) {
  const marker = {
    editorKey: editor.getKey()
  };
  dataTransfer.setData(LEXICAL_DRAG_MIME_TYPE, JSON.stringify(marker));
}
function isLexicalDragMarker(value) {
  return value !== null && typeof value === 'object' && 'editorKey' in value && typeof value.editorKey === 'string';
}
function readDragMarker(dataTransfer) {
  const raw = dataTransfer.getData(LEXICAL_DRAG_MIME_TYPE);
  if (!raw) {
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (_unused) {
    return null;
  }
  return isLexicalDragMarker(parsed) ? parsed : null;
}
function findEditorRootByKey(key, doc) {
  for (const el of lexical.findAllLexicalElementsDeep(doc)) {
    const editor = lexical.getEditorPropertyFromDOMNode(el);
    if (lexical.isLexicalEditor(editor) && editor.getKey() === key && lexical.isHTMLElement(el)) {
      return el;
    }
  }
  return null;
}
function $resolveDropPointCaret(event, editor) {
  const hit = caretFromPoint(event.clientX, event.clientY, editor.getRootElement());
  if (hit === null) {
    return null;
  }
  const node = lexical.$getNearestNodeFromDOMNode(hit.node);
  if (node === null) {
    return null;
  }
  if (lexical.$isTextNode(node)) {
    return lexical.$getTextPointCaret(node, 'next', hit.offset);
  }
  if (lexical.$isElementNode(node)) {
    return lexical.$getChildCaretAtIndex(node, hit.offset, 'next');
  }
  const parent = node.getParent();
  if (parent === null) {
    return null;
  }
  return lexical.$getChildCaretAtIndex(parent, node.getIndexWithinParent() + 1, 'next');
}
function $isDropCaretInsideSelection(dropCaret, selection) {
  const {
    anchor: start,
    focus: end
  } = lexical.$getCaretRangeInDirection(lexical.$caretRangeFromSelection(selection), 'next');
  return lexical.$comparePointCaretNext(start, dropCaret) < 0 && lexical.$comparePointCaretNext(dropCaret, end) < 0;
}
function $doDrop(event, editor, $insertDataTransfer) {
  const dataTransfer = event.dataTransfer;
  if (dataTransfer === null) {
    return false;
  }

  // Drags that didn't originate in a Lexical editor (no marker) fall through
  // to the browser's native drag-and-drop flow; its beforeinput
  // insertFromDrop is already handled correctly by Lexical's existing
  // beforeinput logic.
  const marker = readDragMarker(dataTransfer);
  if (marker === null) {
    return false;
  }
  const dropCaret = $resolveDropPointCaret(event, editor);
  if (dropCaret === null) {
    return false;
  }

  // Split at the drop caret so we have a stable NodeCaret boundary that
  // survives text-content mutations in its siblings.
  const stableDropCaret = lexical.$splitAtPointCaretNext(dropCaret);
  if (stableDropCaret === null) {
    return false;
  }
  const isSameEditorDrag = marker.editorKey === editor.getKey();
  const currentSelection = lexical.$getSelection();
  if (isSameEditorDrag) {
    // Same-editor drag: the destination's $getSelection() is the still-
    // selected dragged range, so Lexical's beforeinput handler would skip
    // applyDOMRange and route the insert to the source's location instead
    // of the drop point. Remove the dragged range ourselves, then insert
    // at the stable drop caret.
    if (!lexical.$isRangeSelection(currentSelection) || currentSelection.isCollapsed()) {
      return false;
    }
    if ($isDropCaretInsideSelection(dropCaret, currentSelection)) {
      event.preventDefault();
      return true;
    }
    currentSelection.removeText();
  }

  // If the drop caret's origin was swept away by the source removal, abort —
  // this can happen on a same-editor drag whose range covered the entire
  // text node we tried to split at.
  if (!stableDropCaret.origin.isAttached()) {
    event.preventDefault();
    return true;
  }
  const dropSelection = lexical.$setSelectionFromCaretRange(lexical.$getCollapsedCaretRange(stableDropCaret));
  $insertDataTransfer(dataTransfer, dropSelection, editor);
  if (!isSameEditorDrag) {
    // Cross-editor drag. The native drag-out deletion that the browser
    // would normally fire (beforeinput deleteByDrag on the source) isn't
    // reliable when the source is a nested contenteditable of the
    // destination (e.g. an image caption inside the main editor), so we
    // dispatch it ourselves at the source editor's root. The source
    // editor's own beforeinput handler runs the deletion through its own
    // REMOVE_TEXT_COMMAND and SKIP_SELECTION_FOCUS_TAG path.
    const rootElement = editor.getRootElement();
    const doc = rootElement ? rootElement.ownerDocument : null;
    const sourceRoot = doc ? findEditorRootByKey(marker.editorKey, doc) : null;
    if (sourceRoot !== null) {
      sourceRoot.dispatchEvent(new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        inputType: 'deleteByDrag'
      }));
    }
  }
  event.preventDefault();
  return true;
}

/**
 * Drop handler for rich-text editors. Inserts the DataTransfer payload via
 * {@link $insertDataTransferForRichText} at the drop caret and, when the drag
 * originated from a Lexical editor (marked via
 * {@link $writeDragSourceToDataTransfer} on DRAGSTART), removes the source
 * range — producing cut-and-paste semantics whether the drop is in the same
 * editor or a different one on the same page.
 */
function $handleRichTextDrop(event, editor) {
  return $doDrop(event, editor, $insertDataTransferForRichText);
}

/**
 * Drop handler for plain-text editors. Same semantics as
 * {@link $handleRichTextDrop} but inserts via
 * {@link $insertDataTransferForPlainText}.
 */
function $handlePlainTextDrop(event, editor) {
  return $doDrop(event, editor, (dataTransfer, selection) => $insertDataTransferForPlainText(dataTransfer, selection));
}

/**
 * Inserts Lexical nodes into the editor using different strategies depending on
 * some simple selection-based heuristics. If you're looking for a generic way to
 * to insert nodes into the editor at a specific selection point, you probably want
 * {@link lexical.$insertNodes}
 *
 * @param editor LexicalEditor instance to insert the nodes into.
 * @param nodes The nodes to insert.
 * @param selection The selection to insert the nodes into.
 */
function $insertGeneratedNodes(editor, nodes, selection) {
  if (!editor.dispatchCommand(lexical.SELECTION_INSERT_CLIPBOARD_NODES_COMMAND, {
    nodes,
    selection
  })) {
    selection.insertNodes(nodes);
    $updateSelectionOnInsert(selection);
  }
  return;
}
function $updateSelectionOnInsert(selection) {
  if (lexical.$isRangeSelection(selection) && selection.isCollapsed()) {
    const anchor = selection.anchor;
    let nodeToInspect = null;
    const anchorCaret = lexical.$caretFromPoint(anchor, 'previous');
    if (anchorCaret) {
      if (lexical.$isTextPointCaret(anchorCaret)) {
        nodeToInspect = anchorCaret.origin;
      } else {
        const range = lexical.$getCaretRange(anchorCaret, lexical.$getChildCaret(lexical.$getRoot(), 'next').getFlipped());
        for (const caret of range) {
          if (lexical.$isTextNode(caret.origin)) {
            nodeToInspect = caret.origin;
            break;
          } else if (lexical.$isElementNode(caret.origin) && !caret.origin.isInline()) {
            break;
          }
        }
      }
    }
    if (nodeToInspect && lexical.$isTextNode(nodeToInspect)) {
      const newFormat = nodeToInspect.getFormat();
      const newStyle = nodeToInspect.getStyle();
      if (selection.format !== newFormat || selection.style !== newStyle) {
        selection.format = newFormat;
        selection.style = newStyle;
        selection.dirty = true;
      }
    }
  }
}
function exportNodeToJSON(node) {
  const serializedNode = node.exportJSON();
  const nodeClass = node.constructor;
  if (serializedNode.type !== nodeClass.getType()) {
    {
      formatDevErrorMessage(`LexicalNode: Node ${nodeClass.name} does not implement .exportJSON().`);
    }
  }
  if (lexical.$isElementNode(node)) {
    const serializedChildren = serializedNode.children;
    if (!Array.isArray(serializedChildren)) {
      {
        formatDevErrorMessage(`LexicalNode: Node ${nodeClass.name} is an element but .exportJSON() does not have a children array.`);
      }
    }
  }
  return serializedNode;
}
function $appendNodesToJSON(editor, selection$1, currentNode, targetArray = []) {
  let shouldInclude = selection$1 !== null ? currentNode.isSelected(selection$1) : true;
  const shouldExclude = lexical.$isElementNode(currentNode) && currentNode.excludeFromCopy('html');
  let target = currentNode;
  if (selection$1 !== null && lexical.$isTextNode(target)) {
    target = selection.$sliceSelectedTextNodeContent(selection$1, target, 'clone');
  }
  const children = lexical.$isElementNode(target) ? target.getChildren() : [];
  const serializedNode = exportNodeToJSON(target);
  if (lexical.$isTextNode(target) && target.getTextContentSize() === 0) {
    // If an uncollapsed selection ends or starts at the end of a line of specialized,
    // TextNodes, such as code tokens, we will get a 'blank' TextNode here, i.e., one
    // with text of length 0. We don't want this, it makes a confusing mess. Reset!
    shouldInclude = false;
  }

  // An element host in a NodeSelection (e.g. a Card promoted whole-host by a
  // chrome click) recurses into its children with a null selection so the
  // whole subtree serializes even when none of the children are in the outer
  // selection themselves — the old shell-only output made cut silently lossy.
  // Only a whole-host NodeSelection promotes: a partial RangeSelection that
  // happens to contain the host must keep slicing/excluding per child, or a
  // drag into the host's interior would over-export unselected content.
  const childSelection = shouldInclude && lexical.$isNodeSelection(selection$1) && lexical.$isElementNode(currentNode) ? null : selection$1;
  for (let i = 0; i < children.length; i++) {
    const childNode = children[i];
    const shouldIncludeChild = $appendNodesToJSON(editor, childSelection, childNode, serializedNode.children);
    if (!shouldInclude && lexical.$isElementNode(currentNode) && shouldIncludeChild && currentNode.extractWithChild(childNode, selection$1, 'clone')) {
      shouldInclude = true;
    }
  }

  // Slots are shadow-root isolated, so they can't be partially selected by a
  // RangeSelection — when the host is included, each slot subtree is copied
  // whole. Pass a null selection to deep-export the slot regardless of the
  // outer selection, mirroring the EditorState slot serialization. Gate on the
  // same condition as the push below (and as the HTML exporter): only emit
  // slots for a host that is itself emitted, so a host outside the selection
  // is never walked — its slots must not influence (or break) this export.
  if (shouldInclude && !shouldExclude) {
    const slotNames = lexical.$getSlotNames(target);
    if (slotNames.length > 0) {
      const serializedSlots = {};
      for (const name of slotNames) {
        const slotNode = lexical.$getSlot(target, name);
        if (!(slotNode !== null)) {
          formatDevErrorMessage(`LexicalNode: Node ${target.constructor.name} has slot "${name}" but it resolved to no node during export.`);
        }
        const slotArray = [];
        $appendNodesToJSON(editor, null, slotNode, slotArray);
        // A whole-slot export must serialize to exactly the slot node. A slot
        // value that overrides excludeFromCopy would otherwise make
        // $appendNodesToJSON splice up its children (or emit nothing), leaving
        // a dangling/undefined slot entry that breaks on paste.
        if (!(slotArray.length === 1 && slotArray[0].type === slotNode.getType())) {
          formatDevErrorMessage(`LexicalNode: slot "${name}" on ${target.constructor.name} did not serialize to exactly the slot value node (got ${String(slotArray.length)} of type ${String(slotArray.length > 0 ? slotArray[0].type : 'none')}); a slot value must not be excluded from copy.`);
        }
        serializedSlots[name] = slotArray[0];
      }
      serializedNode.$slots = serializedSlots;
    }
  }
  if (shouldInclude && !shouldExclude) {
    targetArray.push(serializedNode);
  } else if (Array.isArray(serializedNode.children)) {
    for (let i = 0; i < serializedNode.children.length; i++) {
      const serializedChildNode = serializedNode.children[i];
      targetArray.push(serializedChildNode);
    }
  }
  return shouldInclude;
}

// TODO why $ function with Editor instance?
/**
 * Gets the Lexical JSON of the nodes inside the provided Selection.
 *
 * @param editor LexicalEditor to get the JSON content from.
 * @param selection Selection to get the JSON content from.
 * @returns an object with the editor namespace and a list of serializable nodes as JavaScript objects.
 */
function $generateJSONFromSelectedNodes(editor, selection) {
  const nodes = [];
  const root = lexical.$getRoot();
  // A selection wholly inside a slot subtree never includes its host (slots
  // are shadow-root isolated), so a root-children walk would miss the
  // selected nodes entirely and export an empty payload (cut = data loss).
  // Walk the selection's slot frame instead; outside slots this is the root.
  // NodeSelection participates here too — a click that selects a decorator
  // nested in a slot needs the same frame redirect, otherwise its export
  // pipeline silently produces an empty clipboard.
  //
  // NodeSelection.getNodes()[0] is the first node by insertion order (the
  // internal _nodes Set's iteration order), not document order. For the
  // common single-decorator case this is the only node and the frame is
  // unambiguous. A multi-node NodeSelection that straddles a slot boundary
  // is currently undefined — slots are shadow-isolated, so straddling is
  // already invalid construction, and we pick the first inserted node's
  // frame rather than asserting.
  const slotFrameAnchor = lexical.$isRangeSelection(selection) ? selection.anchor.getNode() : lexical.$isNodeSelection(selection) ? selection.getNodes()[0] ?? null : null;
  const slotFrame = slotFrameAnchor !== null ? lexical.$getSlotFrame(slotFrameAnchor) : null;
  const topLevelChildren = (lexical.$isElementNode(slotFrame) ? slotFrame : root).getChildren();
  for (let i = 0; i < topLevelChildren.length; i++) {
    const topLevelNode = topLevelChildren[i];
    $appendNodesToJSON(editor, selection, topLevelNode, nodes);
  }
  return {
    namespace: editor._config.namespace,
    nodes
  };
}

/**
 * This method takes an array of objects conforming to the BaseSerializedNode interface and returns
 * an Array containing instances of the corresponding LexicalNode classes registered on the editor.
 * Normally, you'd get an Array of BaseSerialized nodes from {@link $generateJSONFromSelectedNodes}
 *
 * @param serializedNodes an Array of objects conforming to the BaseSerializedNode interface.
 * @returns an Array of Lexical Node objects.
 */
function $generateNodesFromSerializedNodes(serializedNodes) {
  const nodes = [];
  for (const serializedNode of serializedNodes) {
    nodes.push(lexical.$parseSerializedNode(serializedNode));
  }
  return nodes;
}
const EVENT_LATENCY = 50;
let clipboardEventTimeout = null;

// TODO custom selection
// TODO potentially have a node customizable version for plain text
/**
 * Copies the content of the current selection to the clipboard in
 * text/plain, text/html, and application/x-lexical-editor (Lexical JSON)
 * formats.
 *
 * @param editor the LexicalEditor instance to copy content from
 * @param event the native browser ClipboardEvent to add the content to.
 * @returns
 */
async function copyToClipboard(editor, event, data) {
  if (clipboardEventTimeout !== null) {
    // Prevent weird race conditions that can happen when this function is run multiple times
    // synchronously. In the future, we can do better, we can cancel/override the previously running job.
    return false;
  }
  if (event !== null) {
    return new Promise((resolve, reject) => {
      editor.update(() => {
        resolve($copyToClipboardEvent(editor, event, data));
      });
    });
  }
  const rootElement = editor.getRootElement();
  const editorWindow = editor._window || window;
  const windowDocument = editorWindow.document;
  const domSelection = lexical.getDOMSelection(editorWindow);
  if (rootElement === null || domSelection === null) {
    return false;
  }
  const element = windowDocument.createElement('span');
  element.style.position = 'fixed';
  element.style.top = '-1000px';
  element.append(windowDocument.createTextNode('#'));
  rootElement.append(element);
  const range = windowDocument.createRange();
  range.setStart(element, 0);
  range.setEnd(element, 1);
  domSelection.removeAllRanges();
  domSelection.addRange(range);
  return new Promise((resolve, reject) => {
    const removeListener = editor.registerCommand(lexical.COPY_COMMAND, secondEvent => {
      if (utils.objectKlassEquals(secondEvent, ClipboardEvent)) {
        removeListener();
        if (clipboardEventTimeout !== null) {
          editorWindow.clearTimeout(clipboardEventTimeout);
          clipboardEventTimeout = null;
        }
        resolve($copyToClipboardEvent(editor, secondEvent, data));
      }
      // Block the entire copy flow while we wait for the next ClipboardEvent
      return true;
    }, lexical.COMMAND_PRIORITY_CRITICAL);
    // If the above hack execCommand hack works, this timeout code should never fire. Otherwise,
    // the listener will be quickly freed so that the user can reuse it again
    clipboardEventTimeout = editorWindow.setTimeout(() => {
      removeListener();
      clipboardEventTimeout = null;
      resolve(false);
    }, EVENT_LATENCY);
    windowDocument.execCommand('copy');
    element.remove();
  });
}

// TODO shouldn't pass editor (pass namespace directly)
function $copyToClipboardEvent(editor, event, data) {
  if (data === undefined) {
    const domSelection = lexical.getDOMSelection(editor._window);
    const selection = lexical.$getSelection();
    if (!selection || selection.isCollapsed()) {
      return false;
    }
    if (!domSelection) {
      return false;
    }
    const points = lexical.getDOMSelectionPoints(domSelection, editor.getRootElement());
    const anchorDOM = points.anchorNode;
    const focusDOM = points.focusNode;
    if (anchorDOM !== null && focusDOM !== null && !lexical.isSelectionWithinEditor(editor, anchorDOM, focusDOM)) {
      return false;
    }
    data = $getClipboardDataFromSelection(selection);
  }
  event.preventDefault();
  const clipboardData = event.clipboardData;
  if (clipboardData === null) {
    return false;
  }
  setLexicalClipboardDataTransfer(clipboardData, data);
  return true;
}
const clipboardDataFunctions = [['text/html', $getHtmlContent], ['application/x-lexical-editor', $getLexicalContent]];

/**
 * Serialize the content of the current selection to strings in
 * text/plain, text/html, and application/x-lexical-editor (Lexical JSON)
 * formats (as available).
 *
 * @param selection the selection to serialize (defaults to $getSelection())
 * @returns LexicalClipboardData
 */
function $getClipboardDataFromSelection(selection = lexical.$getSelection()) {
  return $getClipboardDataWithConfigFromSelection($getExportConfig(), selection);
}

/**
 * Call setData on the given clipboardData for each MIME type present
 * in the given data (from {@link $getClipboardDataFromSelection})
 *
 * @param clipboardData the event.clipboardData to populate from data
 * @param data The lexical data
 */
function setLexicalClipboardDataTransfer(clipboardData, data) {
  for (const [k] of clipboardDataFunctions) {
    if (data[k] === undefined) {
      clipboardData.setData(k, '');
    }
  }
  for (const k in data) {
    const v = data[k];
    if (v !== undefined) {
      clipboardData.setData(k, v);
    }
  }
}

/**
 * A function that produces the serialized representation of a selection for
 * a single MIME type. Functions are arranged in a stack per MIME type (see
 * {@link ExportMimeTypeConfig}); the function at the top of the stack is
 * invoked first and may call `next()` to delegate to the previous function
 * in the stack (typically the default Lexical serializer).
 *
 * Returning `null` from the top-most function omits that MIME type from the
 * resulting {@link LexicalClipboardData}.
 *
 * @param selection - The selection to serialize, or `null` if there is none.
 * @param next - Calls the previous handler in the stack and returns its
 *   result, or `null` if there is no previous handler.
 * @returns The serialized string for this MIME type, or `null` to omit it.
 */

/**
 * Configuration for {@link GetClipboardDataExtension}.
 */

/**
 * A mapping from MIME type to a stack of {@link ExportMimeTypeFunction}.
 *
 * Each entry is an ordered array; the function at the highest index runs
 * first and may call `next()` to fall through to the function below it.
 * The default config provides a single fallback handler for
 * `'application/x-lexical-editor'`, `'text/html'`, and `'text/plain'`.
 *
 * When {@link GetClipboardDataExtension} merges a partial config, new
 * functions are appended to the existing array for each MIME type, so
 * later-registered handlers run before earlier ones (including the
 * defaults) and may delegate to them via `next()`. To register a brand new
 * MIME type, supply a key not present in the default config; arbitrary
 * string keys are accepted in addition to the keys of
 * {@link LexicalClipboardData}.
 */

function $getExportConfig(editor = lexical.$getEditor()) {
  const dep = extension.getPeerDependencyFromEditor(editor, GetClipboardDataExtension.name);
  return dep ? dep.output : DEFAULT_EXPORT_MIME_TYPE;
}
const DEFAULT_EXPORT_MIME_TYPE = {
  'application/x-lexical-editor': [(sel, next) => sel ? $getLexicalContent(lexical.$getEditor(), sel) : next()],
  'text/html': [(sel, next) => sel ? $getHtmlContent(lexical.$getEditor(), sel) : next()],
  'text/plain': [(sel, next) => sel ? sel.getTextContent() : next()]
};
function $getClipboardDataWithConfigFromSelection($exportMimeType, selection) {
  const clipboardData = {
    'text/plain': ''
  };
  for (const [k, fns] of Object.entries($exportMimeType)) {
    if (fns) {
      const v = callExportMimeTypeFunctionStack(fns, selection);
      if (v !== null) {
        clipboardData[k] = v;
      }
    }
  }
  return clipboardData;
}
function callExportMimeTypeFunctionStack(fns, selection) {
  const callAt = i => fns[i] ? fns[i](selection, callAt.bind(null, i - 1)) : null;
  return callAt(fns.length - 1);
}

/**
 * Serialize the given selection for a single MIME type using the active
 * editor's configured {@link ExportMimeTypeConfig}. The configured stack is
 * read from {@link GetClipboardDataExtension} via the editor's peer
 * dependency lookup; if the extension was not built into the editor, the
 * default stack is used.
 *
 * Useful when only one MIME representation is needed rather than the full
 * {@link LexicalClipboardData} produced by
 * {@link $getClipboardDataFromSelection}.
 *
 * Must be called from within an editor update or read.
 *
 * @param mimeType - The MIME type to serialize, e.g. `'text/html'`,
 *   `'application/x-lexical-editor'`, `'text/plain'`, or any custom key
 *   registered in the {@link ExportMimeTypeConfig}.
 * @param selection - The selection to serialize (defaults to
 *   `$getSelection()`).
 * @returns The serialized string for the requested MIME type, or `null` if
 *   no handler is registered for it or every handler returned `null`.
 */
function $exportMimeTypeFromSelection(mimeType, selection = lexical.$getSelection()) {
  return callExportMimeTypeFunctionStack($getExportConfig()[mimeType] || [], selection);
}

/**
 * Lexical extension that controls how the current selection is serialized
 * into clipboard MIME types when copying or dragging out of the editor.
 *
 * The extension's config holds an {@link ExportMimeTypeConfig} — a stack of
 * {@link ExportMimeTypeFunction} per MIME type. Out of the box it provides
 * fallback serializers for `'application/x-lexical-editor'`, `'text/html'`,
 * and `'text/plain'` that defer to {@link $getLexicalContent},
 * {@link $getHtmlContent}, and `selection.getTextContent()` respectively.
 *
 * Apps can layer additional handlers on top to customize an existing
 * payload (delegating to the default via `next()`) or to register an
 * entirely new MIME type. Functions provided through `mergeConfig` are
 * appended to the existing stack for each MIME type, so a newly registered
 * handler runs first and may fall through to the previously registered
 * handlers via its `next` argument.
 *
 * The extension's `output` is the resolved {@link ExportMimeTypeConfig},
 * which {@link $getClipboardDataFromSelection} and
 * {@link $exportMimeTypeFromSelection} read via the editor's peer
 * dependency lookup.
 *
 * @example
 * ```ts
 * import {configExtension, defineExtension} from '@lexical/extension';
 * import {GetClipboardDataExtension} from '@lexical/clipboard';
 *
 * const MyClipboardExtension = defineExtension({
 *   name: 'my-app/clipboard',
 *   dependencies: [
 *     configExtension(GetClipboardDataExtension, {
 *       $exportMimeType: {
 *         // Wrap the default HTML output with an app-specific marker.
 *         'text/html': [
 *           (selection, next) => {
 *             const html = next();
 *             return html ? wrapWithMyAppMarker(html) : html;
 *           },
 *         ],
 *         // Add a brand-new MIME type.
 *         'application/vnd.myapp+json': [
 *           (selection) =>
 *             selection ? exportMyAppFormat(selection) : null,
 *         ],
 *       },
 *     }),
 *   ],
 * });
 * ```
 */
const GetClipboardDataExtension = /* @__PURE__ */lexical.defineExtension({
  build(editor, config, state) {
    return config.$exportMimeType;
  },
  config: /* @__PURE__ */lexical.safeCast({
    $exportMimeType: DEFAULT_EXPORT_MIME_TYPE
  }),
  mergeConfig(config, partial) {
    const merged = lexical.shallowMergeConfig(config, partial);
    if (partial.$exportMimeType) {
      const $exportMimeType = {
        ...config.$exportMimeType
      };
      for (const [k, v] of Object.entries(partial.$exportMimeType)) {
        if (v) {
          const prev = $exportMimeType[k];
          $exportMimeType[k] = prev ? [...prev, ...v] : v;
        }
      }
      merged.$exportMimeType = $exportMimeType;
    }
    return merged;
  },
  name: '@lexical/clipboard/GetClipboardData'
});

exports.$exportMimeTypeFromSelection = $exportMimeTypeFromSelection;
exports.$generateJSONFromSelectedNodes = $generateJSONFromSelectedNodes;
exports.$generateNodesFromSerializedNodes = $generateNodesFromSerializedNodes;
exports.$getClipboardDataFromSelection = $getClipboardDataFromSelection;
exports.$getHtmlContent = $getHtmlContent;
exports.$getLexicalContent = $getLexicalContent;
exports.$handlePlainTextDrop = $handlePlainTextDrop;
exports.$handleRichTextDrop = $handleRichTextDrop;
exports.$insertDataTransferForPlainText = $insertDataTransferForPlainText;
exports.$insertDataTransferForRichText = $insertDataTransferForRichText;
exports.$insertGeneratedNodes = $insertGeneratedNodes;
exports.$writeDragSourceToDataTransfer = $writeDragSourceToDataTransfer;
exports.ClipboardDOMImportExtension = ClipboardDOMImportExtension;
exports.ClipboardImportExtension = ClipboardImportExtension;
exports.DEFAULT_IMPORT_MIME_TYPE = DEFAULT_IMPORT_MIME_TYPE;
exports.DEFAULT_IMPORT_MIME_TYPE_PRIORITY = DEFAULT_IMPORT_MIME_TYPE_PRIORITY;
exports.GetClipboardDataExtension = GetClipboardDataExtension;
exports.caretFromPoint = caretFromPoint;
exports.copyToClipboard = copyToClipboard;
exports.setLexicalClipboardDataTransfer = setLexicalClipboardDataTransfer;
