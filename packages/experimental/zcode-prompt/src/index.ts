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

import type { Context } from '@deepseek-ai/cordis'
import { BEHAVIOR_TEXT } from './behavior-text.ts'
import { TOOL_DESCRIPTIONS } from './tool-texts.ts'

export const inject = ['systemPrompt']

/** ZCode name for each DSH tool the zcode preset surfaces. */
const ZCODE_NAME: Record<string, string> = {
  read: 'Read', write: 'Write', edit: 'Edit', bash: 'Bash', glob: 'Glob', grep: 'Grep',
  web_fetch: 'WebFetch', web_search: 'WebSearch', todo_read: 'TodoRead', todo_write: 'TodoWrite',
  skill: 'Skill', agent: 'Agent', task: 'Task', goal_read: 'GoalRead',
  ask_user_question: 'AskUserQuestion',
}

/** ZCode-side parameter notes that DSH tool schemas do not carry. */
const PARAMETER_NOTES: Record<string, string> = {
  bash: 'ZCode parameter: `timeout` in milliseconds (default and max per the shell policy); `run_in_background` runs detached and re-invokes you on exit; interactive flags like `git rebase -i` are unsupported; use `gh` for GitHub operations; commit or push only when asked.',
  edit: 'ZCode requires the file to have been Read in this conversation before editing; `old_string` must match exactly including indentation and be unique; `replace_all` replaces every occurrence.',
  web_search: 'ZCode notes results are US-only.',
  goal_read: 'ZCode semantics: the goal text is the authoritative long-running objective; do not mark the goal complete without real evidence of achievement — a finished plan or todo list is not completion evidence.',
}

function toolSemanticsText(): string {
  const blocks: string[] = [
    '# ZCode tool semantics',
    '',
    'The tools available in this session are DSH tools. Their ZCode semantics follow; where a note names ZCode parameters, apply it to the corresponding DSH tool.',
    '',
  ]
  for (const [dshName, description] of Object.entries(TOOL_DESCRIPTIONS)) {
    const zcodeName = ZCODE_NAME[dshName] ?? dshName
    blocks.push(`## ${zcodeName}`)
    blocks.push('')
    blocks.push(description.trim())
    const note = PARAMETER_NOTES[dshName]
    if (note !== undefined) {
      blocks.push('')
      blocks.push(note)
    }
    blocks.push('')
  }
  return blocks.join('\n').trimEnd()
}

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.systemPrompt.section({
    name: 'zcode:behavior',
    order: 100,
    text: BEHAVIOR_TEXT,
  }), 'zcode behavior section')
  ctx.effect(() => ctx.systemPrompt.section({
    name: 'zcode:tool-semantics',
    order: 460,
    text: toolSemanticsText(),
  }), 'zcode tool-semantics section')
}
