/**
 * ZCode behavior sections for the zcode agent preset.
 *
 * This plugin contributes prompt SECTIONS only — it deliberately registers no
 * tools: same-scope re-registration of a name the base rows already
 * registered throws in dsh-tools, so ZCode tool semantics arrive as prompt
 * prose beside DSH's own tool schemas, never as replacement tool entries.
 *
 * Sections (order values chosen between DEPLOYMENT_PERSONA=0 and
 * PLAN_POLICY=500; literal orders are legal — section() only requires a
 * finite number):
 * - `zcode:behavior` (order 100): identity/Harness + dynamic behavior,
 *   verbatim from the byte-verified evidence files shipped beside this
 *   module.
 * - `zcode:tool-semantics` (order 460): ZCode's tool descriptions keyed by
 *   the DSH tool name each maps to, plus the ZCode-side parameter notes the
 *   DSH schemas do not carry.
 * @module @deepseek-ai/dsh-zcode-prompt
 */
import type { Context } from '@deepseek-ai/cordis';
export declare const inject: string[];
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map