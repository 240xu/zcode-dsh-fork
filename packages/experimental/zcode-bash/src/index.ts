/**
 * ZCode 3.10.2 Bash tool for the zcode agent preset.
 *
 * ZCode's bash keeps the session working directory across calls, runs an
 * optional background job, and enforces ZCode's own timeouts
 * (default 120000ms, cap 600000ms). DSH ships two bash variants that each
 * cover half of that contract (plain: background without state;
 * persistent: state without background, PTY-bound), so this preset-scoped
 * plugin implements the ZCode contract directly over DSH's own shell seam
 * (`ctx.shell`): sandboxing, timeouts, PTY-less spawn, and the `ctx.jobs`
 * registry are all reused, only the cwd tracking and the ZCode schema are
 * new. Registered as `bash`, shadowing the global registration inside the
 * preset scope (a supported layering: nearer scopes shadow farther ones).
 *
 * Equivalence notes (see spec section 10/11):
 * - cwd persists per agent session (ZCode session-cwd contract). Subagent
 *   sessions track their own cwd; their persona still mandates absolute
 *   paths, exactly as upstream's subagent notes do.
 * - env/functions do not persist (fresh process per call, as upstream).
 * - The shell is `bash -c` via the deployment's executor, not a login
 *   shell: upstream initializes from the user profile, which the seam does
 *   not offer. Behavior differs only for profile-customized environments.
 * - `dangerouslyDisableSandbox: true` fails loudly: DSH sandboxing is
 *   host-controlled and no tool may self-escalate. A silent ignore would
 *   lie to the model about confinement.
 * @module @deepseek-ai/dsh-zcode-bash
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { HarnessError } from '@deepseek-ai/dsh-llm'
import type { ShellProcess } from '@deepseek-ai/dsh-shell'
import { clampTimeout } from '@deepseek-ai/dsh-timeout'
import { processOutcome } from '@deepseek-ai/dsh-tool-bash/src/background.ts'
import { renderProcessRead } from '@deepseek-ai/dsh-tool-bash/src/render.ts'
import { TOOL_ABORTED, defineTool } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-jobs'
import type {} from '@deepseek-ai/dsh-sandbox-policy'
import type {} from '@deepseek-ai/dsh-shell-env'
import { TOOL_DESCRIPTIONS } from '@deepseek-ai/dsh-zcode-prompt/src/tool-texts.ts'

export const inject = ['tools', 'shell', 'shellEnv', 'systemPrompt'] as const

/** ZCode bash timeouts: default 120000ms, cap 600000ms, per-call override. */
export const ZCODE_BASH_DEFAULT_TIMEOUT_MS = 120_000
export const ZCODE_BASH_MAX_TIMEOUT_MS = 600_000

/** Session working directories, keyed by live session object (no leaks). */
const sessionCwd = new WeakMap<object, string>()

/** Marker token grammar: `__ZCODE_CWD_<rand>__:<pwd>:__END__` (one line). */
export function markerPrefix(token: string): string {
  return `__ZCODE_CWD_${token}__:`
}

export function markerSuffix(): string {
  return ':__END__'
}

/** Wrap a command so the shell reports its end-of-command directory. */
export function wrapWithCwdMarker(command: string, token: string): string {
  return `{ ${command}\n}\n__ZCODE_STATUS__=$?\nprintf '\\n${markerPrefix(token)}%s${markerSuffix()}\\n' "$PWD"\nexit $__ZCODE_STATUS__`
}

export interface ParsedCwdResult {
  /** Model-facing output with the marker line removed. */
  readonly output: string
  /** End-of-command directory, or undefined when the marker is absent. */
  readonly cwd: string | undefined
}

/** Split model output from the trailing cwd marker (last occurrence wins). */
export function parseCwdMarker(stdout: string, token: string): ParsedCwdResult {
  const prefix = markerPrefix(token)
  const suffix = markerSuffix()
  const lines = stdout.split('\n')
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i] ?? ''
    if (line.startsWith(prefix) && line.endsWith(suffix)) {
      const cwd = line.slice(prefix.length, line.length - suffix.length)
      return { output: lines.slice(0, i).join('\n'), cwd }
    }
  }
  return { output: stdout, cwd: undefined }
}

/** Remove marker lines from streamed text (background reads). */
export function stripMarkerLines(text: string): string {
  return text.split('\n').filter(line => !line.startsWith('__ZCODE_CWD_')).join('\n')
}

interface ZcodeBashArgs {
  command: string
  timeout?: number
  description?: string
  run_in_background?: boolean
  dangerouslyDisableSandbox?: boolean
}

export function apply(ctx: Context): void {
  const description = TOOL_DESCRIPTIONS['bash']
  if (description === undefined) throw new Error("zcode-bash: TOOL_DESCRIPTIONS['bash'] is missing")
  ctx.systemPrompt.section({
    name: 'tool:bash',
    order: ctx.systemPrompt.getSectionOrder('TOOL_BASH'),
    text: 'Check the [exit code: N] marker on every bash result; investigate failures before moving on.',
  })
  ctx.tools.register(defineTool({
    name: 'bash',
    description,
    parameters: {
      command: { type: 'string', required: true, description: 'The bash command to execute.' },
      timeout: {
        type: 'number',
        description: `Timeout in milliseconds (max ${ZCODE_BASH_MAX_TIMEOUT_MS}).`,
      },
      description: {
        type: 'string',
        description: 'Clear, concise description of what this command does in active voice, 5-10 words (shown in the UI).',
      },
      run_in_background: {
        type: 'boolean' as const,
        description: 'Run in the background and return a job id immediately (collect with job_output, stop with job_kill). No timeout applies.',
      },
      dangerouslyDisableSandbox: {
        type: 'boolean' as const,
        description: 'Set this to true to dangerously override sandbox mode and run commands without sandboxing.',
      },
    },
    output: {
      schema: {
        oneOf: [
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
              kind: { type: 'string', required: true, const: 'foreground' },
              stdout: { type: 'string', required: true },
              stderr: { type: 'string', required: true },
              status: { type: 'string', required: true, enum: ['completed', 'failed', 'timed_out'] },
              exitCode: { required: true, oneOf: [{ type: 'integer' }, { type: 'null' }] },
              timedOut: { type: 'boolean', required: true },
            },
          },
        ],
      },
      render: (_args, value) => {
        if (value.kind === 'background') {
          return [{ type: 'text', text: `started background job ${value.backgroundTaskId}` }]
        }
        const body = value.stderr.length > 0 ? `${value.stdout}\n${value.stderr}` : value.stdout
        return [{ type: 'text', text: `${body}\n[exit code: ${value.exitCode ?? value.status}]` }]
      },
    },
    async execute(args: ZcodeBashArgs, exec) {
      if (args.command.trim().length === 0) {
        throw new Error('invalid command: expected a non-empty string')
      }
      if (args.dangerouslyDisableSandbox === true) {
        throw new Error(
          'dangerouslyDisableSandbox is not available in this deployment: sandboxing is host-controlled '
          + '(DSH_PERMISSION_MODE); no tool may lift its own confinement. '
          + 'Request a wider mode from the user instead.',
        )
      }
      const timeoutMs = clampTimeout(args.timeout, ZCODE_BASH_DEFAULT_TIMEOUT_MS, ZCODE_BASH_MAX_TIMEOUT_MS, 'timeout')
      const agent = exec.agent as Agent | undefined
      const session = agent?.session as { header: { cwd?: string } } | undefined
      const tracked = (session !== undefined ? sessionCwd.get(session) : undefined)
        ?? session?.header.cwd
        ?? process.cwd()
      const token = Math.random().toString(36).slice(2)
      const script = wrapWithCwdMarker(args.command, token)
      const sandboxPolicy = ctx.get('sandboxPolicy')
      const standingPolicy = sandboxPolicy?.resolve(agent === undefined ? {} : { session: agent.session })
      const dshEnv = ctx.shellEnv.collect(exec)
      const request = {
        command: script,
        workdir: tracked,
        timeoutMs,
        dshEnv,
        ...standingPolicy !== undefined ? { sandboxPolicy: standingPolicy } : {},
      }
      const remember = (stdout: string): void => {
        const parsed = parseCwdMarker(stdout, token)
        if (session !== undefined && parsed.cwd !== undefined) sessionCwd.set(session, parsed.cwd)
      }
      if (args.run_in_background === true) {
        const jobs = ctx.get('jobs')
        if (jobs === undefined) {
          throw new Error('background jobs unavailable: load @deepseek-ai/dsh-jobs and @deepseek-ai/dsh-tool-jobs')
        }
        if (exec.signal.aborted) {
          const error = new HarnessError('tool call aborted', TOOL_ABORTED)
          error.name = 'AbortError'
          throw error
        }
        const id = jobs.start({
          kind: 'bash',
          label: args.command,
          ...agent !== undefined ? { owner: agent } : {},
          run: () => {
            const proc: ShellProcess = ctx.shell.start(ctx.shell.resolve(request))
            // Background cwd tracking rides on the consumed deltas: reads
            // are consuming by contract (dsh-shell types.ts), so `done`
            // must never call readOutput() itself — that would eat the
            // model's output. The marker is parsed from the accumulated
            // stream instead; output the agent never collects leaves no
            // marker behind, and then the cwd simply stays untracked.
            let seen = ''
            return {
              cancel: () => void proc.kill(),
              done: proc.done.then(() => processOutcome(proc)),
              readOutput: () => {
                const read = proc.readOutput()
                seen += read.delta
                remember(seen)
                return renderProcessRead({ ...read, delta: stripMarkerLines(read.delta) }, proc.sandbox, [])
              },
            }
          },
        })
        return { kind: 'background' as const, backgroundTaskId: String(id) }
      }
      const result = await ctx.shell.run(ctx.shell.resolve({ ...request, signal: exec.signal }))
      if (result.aborted) {
        const error = new HarnessError('tool call aborted', TOOL_ABORTED)
        error.name = 'AbortError'
        throw error
      }
      const parsed = parseCwdMarker(result.stdout.text, token)
      remember(result.stdout.text)
      const status = (result.timedOut ? 'timed_out' : result.exitCode !== 0 ? 'failed' : 'completed') as 'completed' | 'failed' | 'timed_out'
      return {
        kind: 'foreground' as const,
        stdout: parsed.output,
        stderr: result.stderr.text,
        status,
        exitCode: result.exitCode,
        timedOut: result.timedOut,
      }
    },
    presentCall: (args: ZcodeBashArgs) => {
      const label = typeof args.description === 'string' && args.description.trim() !== '' ? args.description : args.command
      return { card: 'generic', title: label, kind: 'execute' }
    },
  }))
}
