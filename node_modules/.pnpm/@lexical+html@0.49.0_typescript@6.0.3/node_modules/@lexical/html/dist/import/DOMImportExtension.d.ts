import type { DOMImportExtensionOutput, DOMPreprocessFn, GenerateNodesFromDOMOptions, ImportContextPairOrUpdater } from './types';
import { type LexicalNode } from 'lexical';
import { type DOMImportRuleEntry } from './defineOverlayRules';
/**
 * Configuration for {@link DOMImportExtension}.
 *
 * @experimental
 */
export interface DOMImportConfig {
    /**
     * The set of rules contributed by this extension and its dependencies.
     * Entries can be raw {@link DOMImportRule}s or a
     * {@link CompiledOverlayRules} produced by {@link defineOverlayRules}
     * (the latter is inlined in priority order — useful for libraries
     * that already publish a compiled overlay).
     *
     * Rules are dispatched in priority order: rules contributed by
     * extensions merged later (i.e. closer to the editor root) run first
     * and may call `$next()` to delegate to lower-priority rules.
     *
     * `mergeConfig` prepends `partial.rules` to existing `rules`, so later
     * configuration carries higher priority.
     */
    readonly rules: readonly DOMImportRuleEntry[];
    /**
     * Default context pairs applied to every `$generateNodesFromDOM` call.
     * Per-call overrides can be supplied via
     * {@link GenerateNodesFromDOMOptions.context}.
     */
    readonly contextDefaults: readonly ImportContextPairOrUpdater[];
    /**
     * Functions run in order on the DOM before walking begins, mutating in
     * place. The default config registers
     * {@link $inlineStylesFromStyleSheets} (resolves `<style>` rules to
     * inline styles so the rules' style-driven matchers see them); apps
     * append additional preprocessors (e.g. strip unsafe elements,
     * normalize attributes, resolve relative URLs).
     *
     * `mergeConfig` appends, so each contributing extension's preprocessors
     * run in dependency order. Per-call preprocessors registered via
     * {@link GenerateNodesFromDOMOptions.preprocess} run AFTER these.
     */
    readonly preprocess: readonly DOMPreprocessFn[];
}
/**
 * Lowest-priority catch-all rule used as the default `config.rules` entry
 * for {@link DOMImportExtension}: descends into the element's children
 * and returns whatever they produced. With no other matching rule, an
 * element vanishes and its contents are inserted in its place — the
 * legacy `$createNodesFromDOM` hoisting behavior, but now expressed as a
 * regular rule that apps can override (e.g. with a `sel.any()` rule that
 * captures and discards unknown elements).
 *
 * @experimental
 */
export declare const DefaultHoistRule: import("./types").DOMImportRule<import("./types").ElementSelectorBuilder<HTMLElement, Record<string, never>>>;
/**
 * @experimental
 *
 * Extension-based replacement for the legacy `importDOM` / `DOMConversion`
 * machinery. Rules are contributed via configuration (see
 * {@link DOMImportConfig.rules}), compiled into a tag-bucketed dispatcher at
 * editor build time, and consumed via the extension's
 * {@link DOMImportExtensionOutput.$generateNodesFromDOM} output.
 *
 * The legacy `$generateNodesFromDOM` continues to work in parallel; the
 * intent is to migrate node packages over to this extension incrementally.
 */
export declare const DOMImportExtension: import("lexical").LexicalExtension<DOMImportConfig, "@lexical/html/DOMImport", DOMImportExtensionOutput, void>;
/**
 * Look up the editor's {@link DOMImportExtension} and run its
 * `$generateNodesFromDOM`. Designed as a drop-in replacement for the
 * legacy `$generateNodesFromDOM(editor, dom)` signature so it can be
 * supplied to `ClipboardImportExtension.$generateNodesFromDOM` (or any
 * other consumer that wants to route through the extension pipeline).
 *
 * Throws if the editor was not built with {@link DOMImportExtension} as a
 * dependency.
 *
 * @experimental
 */
export declare function $generateNodesFromDOMViaExtension(dom: Document | ParentNode, options?: GenerateNodesFromDOMOptions): LexicalNode[];
