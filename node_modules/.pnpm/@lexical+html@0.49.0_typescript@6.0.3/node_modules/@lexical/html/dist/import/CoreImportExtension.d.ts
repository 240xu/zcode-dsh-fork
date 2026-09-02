/**
 * Bundles {@link CoreImportRules} into a {@link DOMImportExtension}-aware
 * extension. Node-providing extensions that contribute import rules
 * (`RichTextExtension`, `ListExtension`, `LinkExtension`,
 * `TableExtension`, `CodeExtension`, …) depend on this themselves, so
 * most editors get it implicitly; depend on it directly to get the
 * equivalent of the legacy core `importDOM` behavior for `<p>`,
 * `<span>`, `<b>`, `<strong>`, `<em>`, `<i>`, `<code>`, `<mark>`,
 * `<s>`, `<sub>`, `<sup>`, `<u>`, `<br>`, and `#text` (plus `<hr>`
 * when `HorizontalRuleNode` is registered).
 *
 * @experimental
 */
export declare const CoreImportExtension: import("lexical").LexicalExtension<import("lexical").ExtensionConfigBase, "@lexical/html/CoreImport", unknown, unknown>;
