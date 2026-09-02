/**
 * ZCode persistent memory section for the zcode agent preset.
 *
 * The prompt text is the byte-verified ZCode 3.10.2 memory prompt
 * (evidence package 240xu/zcode-3102-evidence,
 * findings/memory-prompt-3.10.2.txt — 12,372 chars, user/project/local
 * scopes). This plugin loads the evidence file shipped beside it, renders
 * the `<MEMORY_ROOT>` placeholder as this deployment's zcode memory root,
 * and registers it as one system-prompt section. Reading and writing
 * memory files is done by the ordinary DSH filesystem tools under the
 * rendered root — this plugin owns only the prompt and the root
 * convention, no filesystem access of its own.
 * @module @deepseek-ai/dsh-zcode-memory
 */
import type { Context } from '@deepseek-ai/cordis';
export declare const inject: string[];
/** This deployment's ZCode memory root. The three scopes live beneath it. */
export declare function zcodeMemoryRoot(): string;
/** The rendered memory prompt: evidence text with the root substituted. */
export declare function renderMemoryPrompt(root: string): string;
/** The full memory prompt with this deployment's root already substituted. */
export declare const MEMORY_PROMPT: string;
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map