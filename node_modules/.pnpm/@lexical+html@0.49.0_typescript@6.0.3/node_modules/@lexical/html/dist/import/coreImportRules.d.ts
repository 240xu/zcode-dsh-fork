import { type ElementFormatType } from 'lexical';
/**
 * True if `value` is a non-empty {@link ElementFormatType} (matches one of
 * the supported `text-align` / legacy `align`-attribute values).
 *
 * @internal
 */
export declare function isAlignmentValue(value: string): value is ElementFormatType;
/**
 * `<hr>` rule, gated on {@link HorizontalRuleNode} registration so it
 * mirrors the legacy `importDOM` contract (a node's conversions are only
 * active when the node itself is registered). It lives here rather than
 * next to `HorizontalRuleExtension` because `@lexical/extension`
 * is upstream of `@lexical/html` in the package graph and cannot define
 * import rules — this is the one node-providing extension whose import
 * support cannot be implied by depending on it.
 *
 * Registered ahead of {@link TransparentBlockRule}: `<hr>` matches
 * `isBlockDomNode`, so the wildcard block rule would otherwise consume
 * it. When `HorizontalRuleNode` is not registered, `$next()` restores
 * the old behavior (the childless element vanishes).
 *
 * @internal
 */
export declare const HorizontalRuleRule: import("./types").DOMImportRule<import("./types").ElementSelectorBuilder<HTMLHRElement, Record<string, never>>>;
/**
 * Rules covering the {@link ParagraphNode}, {@link TextNode},
 * {@link LineBreakNode}, and {@link TabNode} cases that the legacy
 * `importDOM` machinery in `@lexical/lexical` handled, plus the
 * registration-gated `<hr>` rule for {@link HorizontalRuleNode} (see
 * {@link HorizontalRuleRule}). Intended to be registered as a dependency
 * of every editor that uses {@link DOMImportExtension}.
 *
 * @experimental
 */
export declare const CoreImportRules: (import("./types").DOMImportRule<import("./types").ElementSelectorBuilder<HTMLElement, Record<string, never>>> | import("./types").DOMImportRule<import("./types").CompiledSelector<Text, Record<string, RegExpMatchArray>>>)[];
