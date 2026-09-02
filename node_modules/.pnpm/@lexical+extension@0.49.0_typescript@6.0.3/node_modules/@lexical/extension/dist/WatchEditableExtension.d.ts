/**
 * Exposes the editor's editable state as a reactive `Signal<boolean>` that
 * mirrors `editor.isEditable()` via an editable listener.
 *
 * Depend on this extension and read its output `Signal` from a signals
 * `effect`/`computed` to react to editability changes without subscribing
 * through React (or any other framework).
 */
export declare const WatchEditableExtension: import("lexical").LexicalExtension<import("lexical").ExtensionConfigBase, "@lexical/extension/WatchEditable", import("@preact/signals-core").Signal<boolean>, unknown>;
