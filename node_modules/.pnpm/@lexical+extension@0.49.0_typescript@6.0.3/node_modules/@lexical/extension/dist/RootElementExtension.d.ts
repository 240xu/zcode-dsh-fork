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
export declare const RootElementExtension: import("lexical").LexicalExtension<import("lexical").ExtensionConfigBase, "@lexical/extension/RootElement", import("@preact/signals-core").Signal<HTMLElement | null>, unknown>;
