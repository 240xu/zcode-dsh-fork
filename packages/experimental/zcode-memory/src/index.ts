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

import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'

export const inject = ['systemPrompt']

/** Prompt-section order: after zcode:behavior (100), before PLAN_POLICY (500). */
const MEMORY_SECTION_ORDER = 450

/** The verbatim ZCode memory prompt, with `<MEMORY_ROOT>` still as a placeholder. */
const rawPrompt = await readFile(join(dirname(fileURLToPath(import.meta.url)), 'memory-prompt.txt'), 'utf8')

/** This deployment's ZCode memory root. The three scopes live beneath it. */
export function zcodeMemoryRoot(): string {
  const base = process.env.ZCODE_MEMORY_HOME ?? join(homedir(), '.zcode-agent')
  return join(base, 'memory')
}

/** The rendered memory prompt: evidence text with the root substituted. */
export function renderMemoryPrompt(root: string): string {
  return rawPrompt.replaceAll('<MEMORY_ROOT>', root)
}

/** The full memory prompt with this deployment's root already substituted. */
export const MEMORY_PROMPT = renderMemoryPrompt(zcodeMemoryRoot())

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.systemPrompt.section({
    name: 'zcode:memory',
    order: MEMORY_SECTION_ORDER,
    text: MEMORY_PROMPT,
  }), 'zcode memory section')
}
