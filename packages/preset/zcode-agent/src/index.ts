/**
 * ZCode 3.10.2 Agent multiplexer for the zcode agent preset.
 *
 * The oracle exposes ONE delegation tool (`Agent`) multiplexed by
 * `subagent_type` over two child types (`general-purpose`, `Explore`).
 * This preset-scoped plugin registers exactly that contract and spawns
 * through DSH's own subagent seam (`ctx.subagents.start`, one-shot jobs,
 * continuable children) with the oracle-verbatim personas and the
 * availability-gated tool filters. The settle/failure semantics mirror
 * `tool-subagent` line-for-line (cited below); routing, personas, and the
 * oracle-shaped result footer are the only new behavior.
 *
 * Equivalence notes (see spec section 10/11):
 * - Type names are matched exactly (`general-purpose`, `Explore`); anything
 *   else fails with the oracle's verbatim registry error.
 * - The result footer adapts the oracle shape to this runtime's ids
 *   (`send_message` + session id instead of `SendMessage` + `agent_uuid`);
 *   usage rollups have no counterpart and are omitted.
 * - Background shapes follow the sibling-row precedent this replaces
 *   (Explore one-shot via jobs, general-purpose continuable); the oracle's
 *   task registry has no equivalent here.
 * - Children join the parent composition, so preset-scoped tools (bash
 *   shadow, todo_read) stay visible to them; the read-only TodoRead leak
 *   into Explore (oracle denies it) is accepted and documented.
 * @module @deepseek-ai/dsh-zcode-agent
 */

import type { Context } from '@deepseek-ai/cordis'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import type { JobOutcome } from '@deepseek-ai/dsh-jobs'
import type { SubagentResult, SubagentRun } from '@deepseek-ai/dsh-subagent'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { JsonValue } from '@deepseek-ai/dsh-util-values'
import { TOOL_DESCRIPTIONS } from '@deepseek-ai/dsh-zcode-prompt'
import { EXPLORE_PERSONA, GENERAL_PERSONA } from './personas.ts'

export const inject = ['tools', 'subagents'] as const

/** Oracle agent registry, in oracle order. Omitted type = general-purpose. */
export const ZCODE_AGENT_TYPES = ['general-purpose', 'Explore'] as const
export type ZcodeAgentType = (typeof ZCODE_AGENT_TYPES)[number]

/** Verbatim oracle registry error for unknown types. */
export function unknownAgentTypeError(subagentType: string): string {
  return `Agent type '${subagentType}' not found. Available agents: general-purpose, Explore`
}

interface ChildShape {
  readonly persona: string
  readonly toolFilter: { readonly allow: readonly string[] }
  readonly continuable: boolean
}

/** Per-type child shape (oracle personas/filters, DSH background modes). */
export const CHILD_SHAPES: Record<ZcodeAgentType, ChildShape> = {
  'general-purpose': {
    persona: GENERAL_PERSONA,
    toolFilter: { allow: ['ask_user_question', 'bash', 'edit', 'read', 'skill', 'todo_write', 'web_fetch', 'write'] },
    continuable: true,
  },
  Explore: {
    persona: EXPLORE_PERSONA,
    toolFilter: { allow: ['bash', 'read', 'web_fetch', 'todo_write'] },
    continuable: false,
  },
}

/** Route a subagent_type to its child shape (exact match, like the oracle). */
export function routeAgentType(subagentType: string | undefined): ZcodeAgentType {
  if (subagentType === undefined || subagentType === 'general-purpose') return 'general-purpose'
  if (subagentType === 'Explore') return 'Explore'
  throw new Error(unknownAgentTypeError(subagentType))
}

/** Oracle-shaped rendering of multiplexer results (adapted ids). */
export function renderAgentResult(value: { kind: 'foreground'; runId: string; output: unknown } | { kind: 'background'; backgroundTaskId: string } | { kind: 'continuable'; subagentId: string }): Array<{ type: 'text'; text: string }> {
  if (value.kind === 'background') {
    return [{ type: 'text', text: `Agent running in background with ID: ${value.backgroundTaskId}. You will be notified when it completes.` }]
  }
  if (value.kind === 'continuable') {
    return [{ type: 'text', text: `Agent running with ID: ${value.subagentId} (use send_message with agent_id '${value.subagentId}' to continue this agent)` }]
  }
  const finalText = textOf(value.output)
  return [{ type: 'text', text: `${finalText}\nagentId: ${value.runId} (use send_message with agent_id '${value.runId}' to continue this agent)` }]
}
/** Model-visible text blocks of a content-block array. */
export function textOf(output: unknown): string {
  if (!Array.isArray(output)) return ''
  return output
    .filter((block): block is { type: 'text'; text: string } =>
      typeof block === 'object' && block !== null && !Array.isArray(block)
      && (block as { type?: unknown }).type === 'text'
      && typeof (block as { text?: unknown }).text === 'string')
    .map(block => block.text)
    .join('')
}

interface ZcodeAgentArgs {
  description: string
  prompt: string
  subagent_type?: string
  run_in_background?: boolean
}

export function apply(ctx: Context): void {
  const description = TOOL_DESCRIPTIONS['agent']
  if (description === undefined) throw new Error("zcode-agent: TOOL_DESCRIPTIONS['agent'] is missing")
  ctx.tools.register(defineTool({
    name: 'agent',
    description,
    parameters: {
      description: { type: 'string', required: true, description: 'A short (3-5 word) description of the task' },
      prompt: { type: 'string', required: true, description: 'The task for the agent to perform' },
      subagent_type: { type: 'string', description: 'The type of specialized agent to use for this task' },
      run_in_background: { type: 'boolean' as const, description: 'Set to true to run this agent in the background. You will be notified when it completes.' },
    },
    output: {
      schema: {
        oneOf: [
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              kind: { type: 'string', required: true, const: 'foreground' },
              runId: { type: 'string', required: true },
              output: { type: 'array', required: true },
            },
          },
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              kind: { type: 'string', required: true, const: 'background' },
              backgroundTaskId: { type: 'string', required: true },
            },
          },
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              kind: { type: 'string', required: true, const: 'continuable' },
              subagentId: { type: 'string', required: true },
            },
          },
        ],
      },
      render: (_args, value) => renderAgentResult(value as { kind: 'foreground'; runId: string; output: unknown } | { kind: 'background'; backgroundTaskId: string } | { kind: 'continuable'; subagentId: string }),
    },
    async execute(args: ZcodeAgentArgs, exec) {
      const parent = exec.agent
      if (!parent) {
        // Non-agent callers provide no parent for delegation ownership.
        throw new Error('agent tool requires a calling agent (exec.agent was undefined)')
      }
      const childType = routeAgentType(args.subagent_type)
      const shape = CHILD_SHAPES[childType]
      // Background default mirrors tool-subagent: continuable work runs
      // detached unless the caller needs the result; one-shot waits unless
      // explicitly backgrounded.
      const runInBackground = args.run_in_background ?? shape.continuable
      const startRequest = {
        label: args.description,
        prompt: [{ type: 'text', text: args.prompt }] as ContentBlock[],
        parent,
        persona: shape.persona,
        toolFilter: { allow: [...shape.toolFilter.allow] },
      }
      if (runInBackground && shape.continuable) {
        const started = await ctx.subagents.startContinuable({
          provider: 'spawn',
          label: args.description,
          request: startRequest,
          signal: exec.signal,
        })
        return { kind: 'continuable' as const, subagentId: String(started.childId) }
      }
      if (runInBackground) {
        const jobs = ctx.get('jobs')
        if (jobs === undefined) {
          throw new Error('background jobs unavailable: load @deepseek-ai/dsh-jobs and @deepseek-ai/dsh-tool-jobs')
        }
        const id = jobs.start({
          kind: 'subagent',
          label: args.description,
          owner: parent,
          run: () => {
            const controller = new AbortController()
            const start = ctx.subagents.start('spawn', { ...startRequest, signal: controller.signal })
            return {
              cancel: (reason?: string) => {
                controller.abort(reason ?? 'background subagent task killed')
              },
              done: settleStart(start, controller.signal),
            }
          },
        })
        return { kind: 'background' as const, backgroundTaskId: String(id) }
      }
      const run = await ctx.subagents.start('spawn', { ...startRequest, signal: exec.signal })
      return await settleForegroundRun(run)
    },
    presentCall: (args: ZcodeAgentArgs) => ({
      card: 'generic',
      title: args.description,
      kind: 'execute',
    }),
  }))
}

/**
 * Settle helpers below mirror tool-subagent/src/index.ts (settleStart,
 * stopReasonError, withDiagnosticAndPartialText, settleForegroundRun):
 * identical terminal semantics, local copies so the preset owns its
 * contract without reaching into the sibling's module privates.
 */
async function settleStart(start: Promise<SubagentRun>, signal: AbortSignal): Promise<JobOutcome> {
  try {
    return await settleRun(await start)
  } catch (error: unknown) {
    return signal.aborted && !(error instanceof AggregateError)
      ? { status: 'killed' }
      : { status: 'failed', detail: String(error) }
  }
}

async function settleRun(run: SubagentRun): Promise<JobOutcome> {
  try {
    const result = await run.result
    const error = stopReasonError(result)
    if (error !== undefined) return { status: 'failed', detail: withDiagnosticAndPartialText(error, result) }
    return { status: 'completed' }
  } finally {
    await run.dispose()
  }
}

function stopReasonError(result: SubagentResult): string | undefined {
  switch (result.stopReason) {
    case 'completed':
      return undefined
    case 'aborted':
      return 'subagent run was cancelled'
    case 'error':
      return 'subagent run failed'
    case 'max-tokens':
      return 'subagent run hit its token limit before finishing'
    case 'refusal':
      return 'subagent declined the task'
    default:
      return `subagent run ended abnormally (${String(result.stopReason)})`
  }
}

function withDiagnosticAndPartialText(error: string, result: SubagentResult): string {
  const diagnostic = result.diagnostic === undefined ? '' : `\nDiagnostic: ${result.diagnostic}`
  const text = textOf(result.output)
  const partial = text.length === 0 ? '' : `\nPartial output before the run ended:\n${text}`
  return `${error}${diagnostic}${partial}`
}

async function settleForegroundRun(run: SubagentRun): Promise<{ kind: 'foreground'; runId: string; output: JsonValue[] }> {
  const [execution] = await Promise.allSettled([
    run.result.then((result) => {
      const error = stopReasonError(result)
      if (error !== undefined) {
        throw new Error(withDiagnosticAndPartialText(error, result))
      }
      return {
        kind: 'foreground' as const,
        runId: String(run.id),
        output: result.output as unknown as JsonValue[],
      }
    }),
  ])
  const [disposal] = await Promise.allSettled([Promise.resolve().then(() => run.dispose())])
  if (execution.status === 'rejected') {
    if (disposal.status === 'rejected') {
      throw new AggregateError(
        [execution.reason, disposal.reason],
        `subagent run failed: ${String(execution.reason)}; dispose failed: ${String(disposal.reason)}`,
      )
    }
    throw execution.reason
  }
  if (disposal.status === 'rejected') throw disposal.reason
  return execution.value
}
