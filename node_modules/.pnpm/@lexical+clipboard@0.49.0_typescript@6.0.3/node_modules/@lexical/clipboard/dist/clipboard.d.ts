/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { type BaseSelection, type LexicalEditor, type LexicalNode } from 'lexical';
export interface LexicalClipboardData {
    'text/html'?: string | undefined;
    'application/x-lexical-editor'?: string | undefined;
    'text/plain': string;
    [mimeType: string & {}]: string | undefined;
}
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
export declare function $getHtmlContent(editor: LexicalEditor, selection?: BaseSelection | null): string;
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
export declare function $getLexicalContent(editor: LexicalEditor, selection?: BaseSelection | null): null | string;
/**
 * Attempts to insert content of the mime-types text/plain or text/uri-list from
 * the provided DataTransfer object into the editor at the provided selection.
 * text/uri-list is only used if text/plain is not also provided.
 *
 * @param dataTransfer an object conforming to the [DataTransfer interface] (https://html.spec.whatwg.org/multipage/dnd.html#the-datatransfer-interface)
 * @param selection the selection to use as the insertion point for the content in the DataTransfer object
 */
export declare function $insertDataTransferForPlainText(dataTransfer: DataTransfer, selection: BaseSelection): void;
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
export declare function $insertDataTransferForRichText(dataTransfer: DataTransfer, selection: BaseSelection, _editor?: LexicalEditor): void;
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
export declare function $writeDragSourceToDataTransfer(dataTransfer: DataTransfer, editor: LexicalEditor): void;
/**
 * Drop handler for rich-text editors. Inserts the DataTransfer payload via
 * {@link $insertDataTransferForRichText} at the drop caret and, when the drag
 * originated from a Lexical editor (marked via
 * {@link $writeDragSourceToDataTransfer} on DRAGSTART), removes the source
 * range — producing cut-and-paste semantics whether the drop is in the same
 * editor or a different one on the same page.
 */
export declare function $handleRichTextDrop(event: DragEvent, editor: LexicalEditor): boolean;
/**
 * Drop handler for plain-text editors. Same semantics as
 * {@link $handleRichTextDrop} but inserts via
 * {@link $insertDataTransferForPlainText}.
 */
export declare function $handlePlainTextDrop(event: DragEvent, editor: LexicalEditor): boolean;
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
export declare function $insertGeneratedNodes(editor: LexicalEditor, nodes: LexicalNode[], selection: BaseSelection): void;
export interface BaseSerializedNode {
    children?: BaseSerializedNode[];
    /**
     * Named slot subtrees keyed by slot name; present on serialized hosts.
     * Mirrors {@link SerializedLexicalNode.$slots}.
     * @experimental named-slots
     */
    $slots?: Record<string, BaseSerializedNode>;
    type: string;
    version: number;
}
/**
 * Gets the Lexical JSON of the nodes inside the provided Selection.
 *
 * @param editor LexicalEditor to get the JSON content from.
 * @param selection Selection to get the JSON content from.
 * @returns an object with the editor namespace and a list of serializable nodes as JavaScript objects.
 */
export declare function $generateJSONFromSelectedNodes<SerializedNode extends BaseSerializedNode>(editor: LexicalEditor, selection: BaseSelection | null): {
    namespace: string;
    nodes: SerializedNode[];
};
/**
 * This method takes an array of objects conforming to the BaseSerializedNode interface and returns
 * an Array containing instances of the corresponding LexicalNode classes registered on the editor.
 * Normally, you'd get an Array of BaseSerialized nodes from {@link $generateJSONFromSelectedNodes}
 *
 * @param serializedNodes an Array of objects conforming to the BaseSerializedNode interface.
 * @returns an Array of Lexical Node objects.
 */
export declare function $generateNodesFromSerializedNodes(serializedNodes: BaseSerializedNode[]): LexicalNode[];
/**
 * Copies the content of the current selection to the clipboard in
 * text/plain, text/html, and application/x-lexical-editor (Lexical JSON)
 * formats.
 *
 * @param editor the LexicalEditor instance to copy content from
 * @param event the native browser ClipboardEvent to add the content to.
 * @returns
 */
export declare function copyToClipboard(editor: LexicalEditor, event: null | ClipboardEvent, data?: LexicalClipboardData): Promise<boolean>;
/**
 * Serialize the content of the current selection to strings in
 * text/plain, text/html, and application/x-lexical-editor (Lexical JSON)
 * formats (as available).
 *
 * @param selection the selection to serialize (defaults to $getSelection())
 * @returns LexicalClipboardData
 */
export declare function $getClipboardDataFromSelection(selection?: BaseSelection | null): LexicalClipboardData;
/**
 * Call setData on the given clipboardData for each MIME type present
 * in the given data (from {@link $getClipboardDataFromSelection})
 *
 * @param clipboardData the event.clipboardData to populate from data
 * @param data The lexical data
 */
export declare function setLexicalClipboardDataTransfer(clipboardData: DataTransfer, data: LexicalClipboardData): void;
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
export type ExportMimeTypeFunction = (selection: null | BaseSelection, next: () => null | string) => null | string;
/**
 * Configuration for {@link GetClipboardDataExtension}.
 */
export interface GetClipboardDataConfig {
    /**
     * The per-MIME-type serializer stacks used when copying or dragging the
     * current selection out of the editor. See {@link ExportMimeTypeConfig}.
     *
     * Merged with [...prev, ...override]
     */
    $exportMimeType: ExportMimeTypeConfig;
}
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
export type ExportMimeTypeConfig = {
    [K in keyof LexicalClipboardData]?: ExportMimeTypeFunction[];
};
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
export declare function $exportMimeTypeFromSelection(mimeType: keyof ExportMimeTypeConfig, selection?: null | BaseSelection): string | null;
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
export declare const GetClipboardDataExtension: import("lexical").LexicalExtension<GetClipboardDataConfig, "@lexical/clipboard/GetClipboardData", ExportMimeTypeConfig, unknown>;
