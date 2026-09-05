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
 * - Session cwd follows the oracle rule: after a successful call the
 *   end-of-command directory is adopted when it lies inside the session
 *   workspace root, otherwise tracking reverts to the root and stderr
 *   gains `Shell cwd was reset to <root>`. Nonzero/timed-out calls leave
 *   tracking untouched. Subagent sessions track their own cwd; their
 *   persona still mandates absolute paths.
 * - env/functions do not persist (fresh process per call, as upstream).
 * - The shell is `bash -c` via the deployment's executor, not a login
 *   shell: upstream initializes from the user profile, which the seam does
 *   not offer. Behavior differs only for profile-customized environments.
 * - `dangerouslyDisableSandbox` is accepted without tool-level effect
 *   (confinement stays host-controlled), matching the oracle's runs.
 *   An empty command runs and renders `(Bash completed with no output)`.
 * @module @deepseek-ai/dsh-zcode-bash
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { isAbsolute, relative, sep } from 'node:path'
import { realpathSync } from 'node:fs'
import { HarnessError } from '@deepseek-ai/dsh-llm'
import type { ShellProcess } from '@deepseek-ai/dsh-shell'
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

/**
 * Oracle timeout rule (resolveBashTimeoutMs): a falsy timeout (absent,
 * zero) falls back to the default; anything higher is capped at the max.
 * Never an error. (Negative values are truthy — their live effect is
 * still under probe; currently they flow through like the oracle.)
 */
export function resolveTimeoutMs(timeout: number | undefined): number {
  return Math.min(timeout || ZCODE_BASH_DEFAULT_TIMEOUT_MS, ZCODE_BASH_MAX_TIMEOUT_MS)
}

/** Session working directories, keyed by live session object (no leaks). */
const sessionCwd = new WeakMap<object, string>()

/** Session workspace roots (the tracked cwd of the first call). */
const sessionRoot = new WeakMap<object, string>()

/**
 * Oracle boundary rule: the end-of-command directory is adopted only when
 * it lies inside the workspace root (same directory counts). Checked on
 * both the raw and the symlink-resolved pair, exactly like the oracle.
 */
export function insideWorkspace(resolvedCwd: string, workspaceRoot: string): boolean {
  const pairs: Array<readonly [string, string]> = [[resolvedCwd, workspaceRoot]]
  try {
    pairs.push([realpathSync(resolvedCwd), realpathSync(workspaceRoot)])
  } catch {
    // Unresolvable path: the raw pair decides alone.
  }
  return pairs.some(([cwd, root]) => {
    const rel = relative(root, cwd)
    return rel === '' || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`))
  })
}

/** Oracle suffix join: strip trailing newlines, then append the suffix. */
export function appendResetSuffix(stderrText: string, suffix: string): string {
  const stripped = stderrText.replace(/[\r\n]+$/, '')
  return stripped !== '' ? `${stripped}\n${suffix}` : suffix
}

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

/** Oracle-observed stdout cleaning: drop leading blank lines, trim the end. */
export function cleanStdout(stdout: string): string {
  return stdout !== '' ? stdout.replace(/^(\s*\n)+/, '').trimEnd() : ''
}

/** Oracle-observed stderr rendering, with the abort tag when interrupted. */
export function renderStderr(stderr: string, interrupted: boolean): string {
  let text = stderr.trim()
  if (interrupted) {
    if (text !== '') text += '\n'
    text += '<error>Command was aborted before completion</error>'
  }
  return text
}

/**
 * Oracle-observed foreground result text:
 * - timed out: `Command timed out after <ms>` + output parts;
 * - failed: `Exit code <N>` + output parts;
 * - completed: output parts only.
 * Empty parts are dropped and the rest joined with a single newline.
 */
export function renderForegroundResult(stdout: string, stderr: string, outcome: { status: 'completed' | 'failed' | 'timed_out'; exitCode: number | null; timeoutMs: number }): string {
  const parts = [cleanStdout(stdout), renderStderr(stderr, outcome.status === 'timed_out')]
  if (outcome.status === 'timed_out') parts.unshift(`Command timed out after ${outcome.timeoutMs}ms`)
  else if (outcome.status === 'failed') parts.unshift(`Exit code ${outcome.exitCode ?? 'unknown'}`)
  return parts.filter(part => part !== '').join('\n')
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
      render: (args, value) => {
        if (value.kind === 'background') {
          // UNKNOWN (oracle background probe pending): the oracle reports
          // background starts with its own wording; this ack is interim.
          return [{ type: 'text', text: `started background job ${value.backgroundTaskId}` }]
        }
        // The oracle's timeout line carries the effective timeout.
        const effectiveTimeoutMs = resolveTimeoutMs((args as ZcodeBashArgs).timeout)
        const text = renderForegroundResult(value.stdout, value.stderr, { status: value.status, exitCode: value.exitCode, timeoutMs: effectiveTimeoutMs })
        // Oracle presentation rule: wholly empty content renders a
        // parenthetical naming the ZCode-side tool.
        return [{ type: 'text', text: text === '' ? '(Bash completed with no output)' : text }]
      },
    },
    async execute(args: ZcodeBashArgs, exec) {
      // Oracle behavior, confirmed live: an empty/whitespace command
      // short-circuits to completed-empty without spawning (its empty
      // output renders `(Bash completed with no output)`), and
      // dangerouslyDisableSandbox is accepted without effect at the tool
      // layer — confinement stays host-controlled, exactly as in the
      // oracle's yolo runs. Neither is an error.
      void args.dangerouslyDisableSandbox
      if (args.command.trim().length === 0) {
        return { kind: 'foreground' as const, stdout: '', stderr: '', status: 'completed' as const, exitCode: 0, timedOut: false }
      }
      const timeoutMs = resolveTimeoutMs(args.timeout)
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
      // Oracle cwd policy: only a successful call moves tracking. An
      // inside-workspace end directory is adopted; an outside one reverts
      // to the root and appends the reset suffix to stderr. Anything else
      // (nonzero exit, timeout, missing marker) leaves tracking untouched.
      // Returns the stderr suffix for the revert case, if any.
      const applyCwdPolicy = (endCwd: string | undefined, successful: boolean): string | undefined => {
        if (session === undefined || endCwd === undefined || !successful) return undefined
        let root = sessionRoot.get(session)
        if (root === undefined) {
          root = tracked
          sessionRoot.set(session, root)
        }
        if (insideWorkspace(endCwd, root)) {
          sessionCwd.set(session, endCwd)
          return undefined
        }
        sessionCwd.set(session, root)
        return `Shell cwd was reset to ${root}`
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
            let suffixDelivered = false
            return {
              cancel: () => void proc.kill(),
              done: proc.done.then(() => processOutcome(proc)),
              readOutput: () => {
                const read = proc.readOutput()
                seen += read.delta
                // Policy re-evaluates on every read: interim reads see no
                // marker (it prints last) and a running process is not yet
                // successful, so only settled-successful output moves
                // tracking — mirroring the oracle's completed+exit-0 gate.
                const suffix = applyCwdPolicy(
                  parseCwdMarker(seen, token).cwd,
                  proc.status === 'completed' && proc.exitCode === 0,
                )
                let delta = stripMarkerLines(read.delta)
                if (suffix !== undefined && !suffixDelivered) {
                  suffixDelivered = true
                  delta = appendResetSuffix(delta, suffix)
                }
                return renderProcessRead({ ...read, delta }, proc.sandbox, [])
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
      const status = (result.timedOut ? 'timed_out' : result.exitCode !== 0 ? 'failed' : 'completed') as 'completed' | 'failed' | 'timed_out'
      const suffix = applyCwdPolicy(parsed.cwd, status === 'completed')
      const stderrText = suffix !== undefined ? appendResetSuffix(result.stderr.text, suffix) : result.stderr.text
      return {
        kind: 'foreground' as const,
        stdout: parsed.output,
        stderr: stderrText,
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
