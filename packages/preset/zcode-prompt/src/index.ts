/**
 * ZCode behavior sections for the zcode agent preset.
 *
 * This plugin contributes prompt SECTIONS only — it deliberately registers no
 * tools: same-scope re-registration of a name the base rows already
 * registered throws in dsh-tools, so ZCode tool semantics arrive as prompt
 * prose beside DSH's own tool schemas, never as replacement tool entries.
 *
 * Sections (order values chosen between DEPLOYMENT_PERSONA_PREFIX=0 and
 * PLAN_POLICY=500; literal orders are legal — section() only requires a
 * finite number):
 * - `zcode:behavior` (order 100): identity/Harness + dynamic behavior,
 *   verbatim from the byte-verified evidence files shipped beside this
 *   module.
 * - `zcode:cli-prefix` (order 50): the stable CLI prefix line (`Djo`),
 *   verbatim. ZCode injects it as its own first system message.
 * - `zcode:env` (order 300): Environment Info (`Xjo` shape), labels
 *   verbatim, values resolved live per assembly.
 * - `zcode:sysctx` (order 320): git System Context (`eFo` shape), snapshot
 *   at first assembly per directory; `''` outside repos (dropped).
 * - `zcode:date` (order 490): Current Date (`fre` shape), local-ISO date.
 * - `zcode:context` (order 200): ZCode's Context Management section
 *   (WSr: autonomy and turn-completion guidance), verbatim from
 *   context-management.txt.
 * - `zcode:tool-semantics` (order 460): ZCode's tool descriptions keyed by
 *   the DSH tool name each maps to, plus the ZCode-side parameter notes the
 *   DSH schemas do not carry.
 * @module @deepseek-ai/dsh-zcode-prompt
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-system-prompt'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BEHAVIOR_TEXT } from './behavior-text.ts'
import { buildCliPrefix, buildCurrentDate, buildEnvInfo, buildSystemContext } from './env-sections.ts'
import { TOOL_DESCRIPTIONS } from './tool-texts.ts'

// Re-exported so sibling preset packages consume the description bank through
// the package root instead of reaching into ./src/* subpaths, which packed
// tarballs do not contain.
/** @internal Preset-shared bank; not part of this package's model surface. */
export { TOOL_DESCRIPTIONS } from './tool-texts.ts'

export const inject = ['systemPrompt']

/** ZCode's Context Management section, verbatim from the shipped evidence file. */
const CONTEXT_TEXT = await readFile(join(dirname(fileURLToPath(import.meta.url)), 'context-management.txt'), 'utf8')

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
  skill: "ZCode session guidance, verbatim:\n- When the user types `/<skill-name>`, invoke it via Skill. Only use skills listed in the user-invocable skills section — don't guess.",
}

function toolSemanticsText(): string {
  const blocks: string[] = [
    '# ZCode tool semantics',
    '',
    'The tools available in this session are DSH tools. Their ZCode semantics follow; where a note names ZCode parameters, apply it to the corresponding DSH tool.',
    '',
    '## ZCode tools mapped to DSH equivalents',
    '',
    '- `EnterPlanMode` / `ExitPlanMode`: this session\'s plan mode (see the plan-mode section). In this deployment plan mode is entered by the user (`/plan` command), not by a tool call — there is no EnterPlanMode tool. Exit it (exit_plan_mode) to submit the plan for approval. A user\'s conversational agreement approves nothing — only exiting plan mode requests approval.',
    '- `SendMessage`: continue a background subagent with a follow-up message instead of starting a new one.',
    '- `TaskOutput` is DEPRECATED upstream: never poll for background results; collect finished background work with `job_output` (wait only when genuinely blocked) and stop irrelevant work with `job_kill` (`TaskStop`).',
    '- `ApplyPatch`: never call a patch tool directly — perform the same edit with `write`/`edit` (upstream dispatches ApplyPatch to Write/Edit).',
    '- `ReadSessionContext`: read context from another persisted session with the `session_search`, `session_event_search`, `session_trace`, `session_event_trace`, and `session_event_read` tools (e.g. when the user references a prior session or asks to continue it).',
    '',
  ]
  for (const [dshName, description] of Object.entries(TOOL_DESCRIPTIONS)) {
    // Every key is mapped today; the fallback only serves future keys.
    /* v8 ignore next -- defensive fallback unreachable while ZCODE_NAME covers all TOOL_DESCRIPTIONS keys (locked by the roster test) */
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
    name: 'zcode:cli-prefix',
    order: 50,
    text: buildCliPrefix(),
  }), 'zcode cli-prefix section')
  ctx.effect(() => ctx.systemPrompt.section({
    name: 'zcode:behavior',
    order: 100,
    text: BEHAVIOR_TEXT,
  }), 'zcode behavior section')
  ctx.effect(() => ctx.systemPrompt.section({
    name: 'zcode:context',
    order: 200,
    text: CONTEXT_TEXT.trim(),
  }), 'zcode context section')
  ctx.effect(() => ctx.systemPrompt.section({
    name: 'zcode:env',
    order: 300,
    text: () => buildEnvInfo(),
  }), 'zcode env section')
  ctx.effect(() => ctx.systemPrompt.section({
    name: 'zcode:sysctx',
    order: 320,
    text: () => buildSystemContext(),
  }), 'zcode sysctx section')
  ctx.effect(() => ctx.systemPrompt.section({
    name: 'zcode:tool-semantics',
    order: 460,
    text: toolSemanticsText(),
  }), 'zcode tool-semantics section')
  ctx.effect(() => ctx.systemPrompt.section({
    name: 'zcode:date',
    order: 490,
    text: () => buildCurrentDate(),
  }), 'zcode date section')
}
