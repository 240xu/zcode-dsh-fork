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
 * - The shell is `bash -c` via the deployment's executor: oracle probes
 *   show NONLOGIN with no profile/bashrc sourcing, which the seam
 *   matches exactly. HOME propagates from the host environment on both
 *   sides (values differ by deployment, same mechanism).
 * - `dangerouslyDisableSandbox` is accepted without tool-level effect
 *   (confinement stays host-controlled), matching the oracle's runs.
 *   An empty command runs and renders `(Bash completed with no output)`.
 * - Foreground truncation follows the oracle exactly: raw stdout+stderr
 *   over 30000 UTF-8 bytes persists to `call_<n>_0-stdout.log` and renders
 *   the `<persisted-output>` envelope (first 2000 chars preview, headers
 *   outside); at or under renders inline.
 * @module @deepseek-ai/dsh-zcode-bash
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative, sep } from 'node:path'
import { realpathSync } from 'node:fs'
import { HarnessError } from '@deepseek-ai/dsh-llm'
import type { ShellProcess } from '@deepseek-ai/dsh-shell'
import { processOutcome, renderProcessRead } from '@deepseek-ai/dsh-tool-bash'
import { TOOL_ABORTED, defineTool } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-jobs'
import type {} from '@deepseek-ai/dsh-sandbox-policy'
import type {} from '@deepseek-ai/dsh-shell-env'
import { TOOL_DESCRIPTIONS } from '@deepseek-ai/dsh-zcode-prompt'

export const inject = ['tools', 'shell', 'shellEnv', 'systemPrompt'] as const

/** ZCode bash timeouts: default 120000ms, cap 600000ms, per-call override. */
export const ZCODE_BASH_DEFAULT_TIMEOUT_MS = 120_000
export const ZCODE_BASH_MAX_TIMEOUT_MS = 600_000

/**
 * Oracle env-number parsing (WPr, bundle-verbatim): blank or
 * non-positive or NaN inputs are absent (undefined); otherwise the
 * parsed integer. Negative/zero timeouts therefore fall back to the
 * default exactly like an absent value.
 */
export function parseBashTimeoutEnv(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === '') return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) || parsed <= 0 ? undefined : parsed
}

export interface ZcodeBashTimeoutPolicy {
  readonly defaultTimeoutMs: number
  readonly maxTimeoutMs: number
}

/**
 * Oracle timeout policy (vpt, bundle-verbatim): default from
 * `BASH_DEFAULT_TIMEOUT_MS` (fallback 120000); max from
 * `BASH_MAX_TIMEOUT_MS` (fallback 600000) floored at the default —
 * an env max below the default never lowers the cap (observed live:
 * max=5000 with default=120000 still completed an 8s sleep).
 * Read per call from process.env (the oracle snapshots per session;
 * process env is static in practice, so this is observably equal).
 */
export function resolveBashTimeoutPolicy(env: NodeJS.ProcessEnv = process.env): ZcodeBashTimeoutPolicy {
  const defaultTimeoutMs = parseBashTimeoutEnv(env['BASH_DEFAULT_TIMEOUT_MS']) ?? ZCODE_BASH_DEFAULT_TIMEOUT_MS
  const maxTimeoutMs = Math.max(parseBashTimeoutEnv(env['BASH_MAX_TIMEOUT_MS']) ?? ZCODE_BASH_MAX_TIMEOUT_MS, defaultTimeoutMs)
  return { defaultTimeoutMs, maxTimeoutMs }
}

/**
 * Oracle foreground output cap (live probes 2026-09-06, ZCode 3.10.2-19):
 * combined stdout+stderr at or under this many UTF-8 bytes renders inline;
 * anything larger persists to a file and renders the `<persisted-output>`
 * envelope. Probes: 30000 bytes inline, 30001 persisted.
 */
export const ZCODE_BASH_INLINE_OUTPUT_LIMIT_BYTES = 30_000

/**
 * Oracle preview width: the envelope carries the first 2000 CHARACTERS of
 * the persisted content (multibyte probe: 2000 `é` = 4000 bytes previewed).
 */
export const ZCODE_BASH_PREVIEW_CHARS = 2_000

/**
 * Oracle timeout rule (vIe, bundle-verbatim): effective = min(timeout
 * || default, max). A falsy timeout (absent, zero) falls back to the
 * default; anything higher is capped at the max. Never an error.
 * Negative values are truthy so they survive the `||`, then go
 * non-positive → plain foreground run with no timer (observed live:
 * `timeout: -5` + sleep 2 completes).
 */
export function resolveTimeoutMs(timeout: number | undefined, env: NodeJS.ProcessEnv = process.env): number {
  const policy = resolveBashTimeoutPolicy(env)
  return Math.min(timeout || policy.defaultTimeoutMs, policy.maxTimeoutMs)
}

/** Oracle one-decimal strip (jUe): integers print bare, else one decimal. */
export function stripDecimalOne(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}

/**
 * Oracle duration label (cLt, bundle-verbatim): sub-second (or
 * non-finite) renders whole milliseconds; below a minute renders
 * seconds; below an hour renders minutes; otherwise hours.
 * Live ladder: 800 -> `800ms`, 1000 -> `1s`, 1500 -> `1.5s`,
 * 3000 -> `3s`, 90000 -> `1.5m`. The timeout line carries the
 * EFFECTIVE deadline in this form (observed: env default 3000 with
 * no timeout arg rendered `3s`; requested 700000 capped to env max
 * 5000 rendered `5s`).
 */
export function formatTimeoutDuration(timeoutMs: number): string {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1_000) return `${Math.max(0, Math.round(timeoutMs))}ms`
  if (timeoutMs < 60_000) return `${stripDecimalOne(timeoutMs / 1_000)}s`
  if (timeoutMs < 3_600_000) return `${stripDecimalOne(timeoutMs / 60_000)}m`
  return `${stripDecimalOne(timeoutMs / 3_600_000)}h`
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

/**
 * Oracle auto-background eligibility (isBashAutoBackgroundEligible):
 * a foreground command may be moved to the background on timeout unless
 * it is empty or its first whitespace-separated word is `sleep`.
 */
export function isAutoBackgroundEligible(command: string): boolean {
  const trimmed = command.trim()
  if (trimmed.length === 0) return false
  return trimmed.split(/\s+/u)[0] !== 'sleep'
}

/**
 * Oracle-adapted background ack (third oPr variant). The id and the
 * collection channel are ours (DSH jobs keep output in-memory, read via
 * job_output — there is no output file), the shape mirrors the oracle:
 * id, notification promise, interim-output pointer.
 */
export function renderBackgroundAck(backgroundTaskId: string): string {
  return `Command running in background with ID: ${backgroundTaskId}. You will be notified when it completes. To check interim output, use job_output.`
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

/**
 * Start-path variant: stderr is diverted to a file so the incremental
 * mixed delta never has to be split back into streams. The marker still
 * travels on stdout; the exit code is preserved.
 */
export function wrapWithCwdMarkerAndStderrFile(command: string, token: string, stderrPath: string): string {
  const quoted = `'${stderrPath.replace(/'/g, `'\\''`)}'`
  return `{ ${command}\n} 2> ${quoted}\n__ZCODE_STATUS__=$?\nprintf '\\n${markerPrefix(token)}%s${markerSuffix()}\\n' "$PWD"\nexit $__ZCODE_STATUS__`
}

/** Allocate a scratch stderr file; callers own cleanup via removeStderrFile. */
export function makeStderrFile(): { dir: string; file: string } {
  const dir = mkdtempSync(join(tmpdir(), 'zcode-bash-'))
  return { dir, file: join(dir, 'stderr.log') }
}

/** Best-effort removal of a scratch stderr allocation. */
export function removeStderrFile(dir: string): void {
  rmSync(dir, { force: true, recursive: true })
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
 * - timed out: `Command timed out after <humanized>` + output parts
 *   (cLt: ms under 1s, s under 1m, m under 1h, else h; the EFFECTIVE
 *   deadline, so env defaults/caps show through: 3000 -> `3s`);
 * - failed with a numeric exit code: `Exit code <N>` + output parts;
 * - failed WITHOUT a numeric code (death by signal — corpus/bash/
 *   signal-death): output parts only, no header; status still failed;
 * - completed: output parts only.
 * Empty parts are dropped and the rest joined with a single newline.
 */
export function renderForegroundResult(stdout: string, stderr: string, outcome: { status: 'completed' | 'failed' | 'timed_out'; exitCode: number | null; timeoutMs: number }): string {
  const parts = [cleanStdout(stdout), renderStderr(stderr, outcome.status === 'timed_out')]
  if (outcome.status === 'timed_out') parts.unshift(`Command timed out after ${formatTimeoutDuration(outcome.timeoutMs)}`)
  else if (outcome.status === 'failed' && outcome.exitCode !== null) parts.unshift(`Exit code ${outcome.exitCode}`)
  return parts.filter(part => part !== '').join('\n')
}

/** Oracle one-decimal strip (Kmt): `1.0` -> `1`, `1.5` -> `1.5`. */
export function trimTrailingZero(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '')
}

/**
 * Oracle byte-size label (formatBytes, bundle-verbatim): under 1KB renders
 * `N bytes`; KB/MB/GB render one decimal with a stripped `.0`.
 * Probes: 30001 -> `29.3KB`, 40010 -> `39.1KB`, 35000 -> `34.2KB`.
 */
export function formatOutputBytes(bytes: number): string {
  const kb = bytes / 1024
  if (kb < 1) return `${bytes} bytes`
  if (kb < 1024) return `${trimTrailingZero(kb)}KB`
  const mb = kb / 1024
  return mb < 1024 ? `${trimTrailingZero(mb)}MB` : `${trimTrailingZero(mb / 1024)}GB`
}

/**
 * Oracle persisted-output envelope (byte-identical modulo the path):
 * `<persisted-output>\nOutput too large (<size>). Full output saved to:
 * <path>\n\nPreview (first 2KB):\n<preview>\n...\n</persisted-output>`.
 */
export function renderPersistedOutput(outputFile: string, originalBytes: number, preview: string): string {
  return `<persisted-output>\nOutput too large (${formatOutputBytes(originalBytes)}). Full output saved to: ${outputFile}\n\nPreview (first 2KB):\n${preview}\n...\n</persisted-output>`
}

/**
 * Oracle persist measurand (live probes 2026-09-06): the UTF-8 byte length
 * of the RAW stdout+stderr concatenation — trailing newlines count (29995
 * `A` + 10 `\n` = 30005 persisted), multibyte counts as bytes (15001 `é` =
 * 30002 bytes persisted), stderr counts untrimmed (29998 `A` + 10 stderr
 * spaces = 30008 persisted). Persisted content is that same raw
 * concatenation, stdout first; status headers (`Exit code N`, timeout line)
 * compose OUTSIDE the envelope (observed: `Exit code 3\n<envelope>`, file =
 * pure command output).
 */
export function persistedByteLength(stdout: string, stderr: string): number {
  return Buffer.byteLength(stdout + stderr, 'utf8')
}

/** True when the raw stdout+stderr concatenation exceeds the inline cap. */
export function shouldPersistOutput(stdout: string, stderr: string): boolean {
  return persistedByteLength(stdout, stderr) > ZCODE_BASH_INLINE_OUTPUT_LIMIT_BYTES
}

/** Sanitize a session id for use as a directory name. */
export function sanitizeSessionId(sessionId: string): string {
  const clean = sessionId.replace(/[^A-Za-z0-9_-]/g, '_')
  return clean !== '' ? clean : 'session'
}

/** Per-session foreground call counters (oracle `call_<n>` numbering). */
const sessionCallCount = new WeakMap<object, number>()

/** Fallback session key when a call runs without an agent session. */
const fallbackSessionKey: object = {}

/** Best-effort session id string for output-file layout. */
export function sessionIdString(session: unknown): string {
  const sess = session as { sessionId?: unknown; id?: unknown } | undefined
  const raw = sess !== undefined && typeof sess.sessionId === 'string' ? sess.sessionId
    : sess !== undefined && typeof sess.id === 'string' ? sess.id
    : 'session'
  return String(raw)
}

/** Next per-session foreground call index (oracle `call_<n>` numbering). */
export function nextCallIndex(sessionKey: object): number {
  const next = (sessionCallCount.get(sessionKey) ?? 0) + 1
  sessionCallCount.set(sessionKey, next)
  return next
}

/**
 * Oracle foreground persistence hook: consume a call index, and when the
 * raw stdout+stderr concatenation exceeds the inline cap, persist it and
 * return the file path. Returns undefined for inline-sized output or a
 * failed write (callers render inline).
 */
export function persistIfOversized(session: unknown, stdout: string, stderr: string): string | undefined {
  const key = (session as object | undefined) ?? fallbackSessionKey
  const index = nextCallIndex(key)
  if (!shouldPersistOutput(stdout, stderr)) return undefined
  return writeCallFile(sessionIdString(session), index, stdout + stderr)
}

/**
 * Persist oversized foreground output and return the file path, or
 * undefined when the write fails (callers fall back to inline rendering).
 * Layout mirrors the oracle (`.../<sess>/call_<n>_0-stdout.log`); the root
 * is the process temp dir because DSH has no HOME state-dir convention —
 * the envelope text (the behaviorally relevant surface) matches
 * byte-for-byte modulo this path. Content is the raw stdout+stderr
 * concatenation, exactly as observed (headers never included).
 */
export function writeCallFile(sessionId: string, index: number, content: string): string | undefined {
  try {
    const dir = join(tmpdir(), 'zcode-bash-exec', sanitizeSessionId(sessionId))
    mkdirSync(dir, { recursive: true })
    const file = join(dir, `call_${index}_0-stdout.log`)
    writeFileSync(file, content, 'utf8')
    return file
  } catch {
    return undefined
  }
}

/**
 * Oracle foreground render for persisted output: headers compose OUTSIDE
 * the envelope (observed: `Exit code 3\n<envelope>`). The timed-out abort
 * tag trails after the envelope — big+timed-out is unobserved (eligible
 * commands background instead of timing out), so tag placement there is
 * inference; the file itself stays raw stdout+stderr per the observed
 * invariant, and the small-output render is unchanged.
 */
export function renderForegroundResultPersisted(
  stdout: string,
  stderr: string,
  outputFile: string,
  outcome: { status: 'completed' | 'failed' | 'timed_out'; exitCode: number | null; timeoutMs: number },
): string {
  const content = stdout + stderr
  const envelope = renderPersistedOutput(outputFile, Buffer.byteLength(content, 'utf8'), content.slice(0, ZCODE_BASH_PREVIEW_CHARS))
  if (outcome.status === 'timed_out') return `Command timed out after ${formatTimeoutDuration(outcome.timeoutMs)}\n${envelope}\n<error>Command was aborted before completion</error>`
  if (outcome.status === 'failed' && outcome.exitCode !== null) return `Exit code ${outcome.exitCode}\n${envelope}`
  return envelope
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
              outputFile: { type: 'string', description: 'Present when combined output exceeded the inline cap; full output persisted here, render the persisted-output envelope.' },
            },
          },
        ],
      },
      render: (args, value) => {
        if (value.kind === 'background') {
          return [{ type: 'text', text: renderBackgroundAck(value.backgroundTaskId) }]
        }
        // Oracle foreground truncation: oversized output persisted at
        // execute time renders the persisted-output envelope (headers
        // outside); otherwise the classic inline render.
        if (typeof value.outputFile === 'string') {
          const effectiveTimeoutMs = resolveTimeoutMs((args as ZcodeBashArgs).timeout)
          return [{ type: 'text', text: renderForegroundResultPersisted(value.stdout, value.stderr, value.outputFile, { status: value.status, exitCode: value.exitCode, timeoutMs: effectiveTimeoutMs }) }]
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
      const abortError = (): Error => {
        const error = new HarnessError('tool call aborted', TOOL_ABORTED)
        error.name = 'AbortError'
        return error
      }
      // Shared jobs-registry adapter for a live process. Background
      // completions never move session cwd (oracle: captureCwdAfterSuccess
      // is set for foreground only); the marker is stripped so model text
      // stays clean. Reads are consuming by contract, so `done` must
      // never read — that would eat the model's output. When stderr was
      // diverted to a file at spawn, new file bytes are appended as an
      // [stderr] section, mirroring the executor's mixed-delta shape.
      const wrapJobRun = (proc: ShellProcess, stderrDir?: string, stderrFile?: string): { cancel: () => void; done: Promise<{ status: 'completed' | 'killed'; detail: string }>; readOutput: () => ReturnType<typeof renderProcessRead> } => {
        let errOffset = 0
        if (stderrDir !== undefined) {
          void proc.done.then(() => removeStderrFile(stderrDir))
        }
        return {
          cancel: () => void proc.kill(),
          done: proc.done.then(() => processOutcome(proc)),
          readOutput: () => {
            const read = proc.readOutput()
            let delta = stripMarkerLines(read.delta)
            if (stderrFile !== undefined) {
              let errBytes = ''
              try {
                errBytes = readFileSync(stderrFile, 'utf8').slice(errOffset)
                errOffset += errBytes.length
              } catch {
                errBytes = ''
              }
              if (errBytes.length > 0) {
                if (delta.length > 0 && !delta.endsWith('\n')) delta += '\n'
                delta += `[stderr]\n${errBytes}`
              }
            }
            return renderProcessRead({ ...read, delta }, proc.sandbox, [])
          },
        }
      }
      if (args.run_in_background === true) {
        const jobs = ctx.get('jobs')
        if (jobs === undefined) {
          throw new Error('background jobs unavailable: load @deepseek-ai/dsh-jobs and @deepseek-ai/dsh-tool-jobs')
        }
        if (exec.signal.aborted) throw abortError()
        const id = jobs.start({
          kind: 'bash',
          label: args.command,
          ...agent !== undefined ? { owner: agent } : {},
          run: () => {
            const err = makeStderrFile()
            const proc = ctx.shell.start(ctx.shell.resolve({
              command: wrapWithCwdMarkerAndStderrFile(args.command, token, err.file),
              workdir: tracked,
              ...standingPolicy !== undefined ? { sandboxPolicy: standingPolicy } : {},
              dshEnv,
            }))
            return wrapJobRun(proc, err.dir, err.file)
          },
        })
        return { kind: 'background' as const, backgroundTaskId: String(id) }
      }
      // Oracle timeout routing (resolveBashTimeoutMs + background machine):
      // falsy -> default; non-positive -> plain foreground run with no
      // timer; eligible + positive + lifecycle available -> foreground
      // deadline that backgrounds instead of killing; otherwise a plain
      // killing run. Eligibility mirrors the oracle exactly (non-empty,
      // first word is not `sleep`).
      const policy = resolveBashTimeoutPolicy()
      const rawTimeout = args.timeout || policy.defaultTimeoutMs
      const startForeground = async (err: { dir: string; file: string }, deadlineMs: number | undefined): Promise<{ kind: 'foreground'; stdout: string; stderr: string; status: 'completed' | 'failed' | 'timed_out'; exitCode: number | null; timedOut: boolean } | { kind: 'background'; backgroundTaskId: string }> => {
        const proc: ShellProcess = ctx.shell.start(ctx.shell.resolve({
          command: wrapWithCwdMarkerAndStderrFile(args.command, token, err.file),
          workdir: tracked,
          ...standingPolicy !== undefined ? { sandboxPolicy: standingPolicy } : {},
          dshEnv,
        }))
        const outcome = await new Promise<'done' | 'timeout' | 'aborted'>((resolve) => {
          let settled = false
          const settle = (which: 'done' | 'timeout' | 'aborted'): void => {
            if (settled) return
            settled = true
            cleanup()
            resolve(which)
          }
          const timer = deadlineMs !== undefined ? setTimeout(() => settle('timeout'), deadlineMs) : undefined
          const onAbort = (): void => settle('aborted')
          const cleanup = (): void => {
            if (timer !== undefined) clearTimeout(timer)
            exec.signal.removeEventListener('abort', onAbort)
          }
          if (exec.signal.aborted) settle('aborted')
          else exec.signal.addEventListener('abort', onAbort, { once: true })
          void proc.done.then(() => settle('done'))
        })
        if (outcome === 'aborted') {
          proc.kill()
          removeStderrFile(err.dir)
          throw abortError()
        }
        if (outcome === 'timeout') {
          // Foreground deadline: the process keeps running under the jobs
          // registry instead of being killed — exactly like the oracle.
          const jobs = ctx.get('jobs')
          if (jobs === undefined) {
            // No lifecycle available: plain killing run, like the oracle.
            proc.kill()
            await proc.done
            const parsedKill = parseCwdMarker(proc.readOutput().delta, token)
            let killStderr = ''
            try {
              killStderr = readFileSync(err.file, 'utf8')
            } catch {
              killStderr = ''
            }
            removeStderrFile(err.dir)
            const persistedKill = persistIfOversized(session, parsedKill.output, killStderr)
            return { kind: 'foreground' as const, stdout: parsedKill.output, stderr: killStderr, status: 'timed_out' as const, exitCode: null, timedOut: true, ...persistedKill !== undefined ? { outputFile: persistedKill } : {} }
          }
          const id = jobs.start({
            kind: 'bash',
            label: args.command,
            ...agent !== undefined ? { owner: agent } : {},
            run: () => wrapJobRun(proc, err.dir, err.file),
          })
          return { kind: 'background' as const, backgroundTaskId: String(id) }
        }
        const parsed = parseCwdMarker(proc.readOutput().delta, token)
        const successful = proc.status === 'completed' && proc.exitCode === 0
        const suffix = applyCwdPolicy(parsed.cwd, successful)
        let stderrText: string
        try {
          stderrText = readFileSync(err.file, 'utf8')
        } catch {
          stderrText = ''
        }
        removeStderrFile(err.dir)
        if (suffix !== undefined) stderrText = appendResetSuffix(stderrText, suffix)
        const status = (proc.status !== 'completed' ? 'failed' : proc.exitCode !== 0 ? 'failed' : 'completed') as 'completed' | 'failed' | 'timed_out'
        const persisted = persistIfOversized(session, parsed.output, stderrText)
        return { kind: 'foreground' as const, stdout: parsed.output, stderr: stderrText, status, exitCode: proc.exitCode, timedOut: false, ...persisted !== undefined ? { outputFile: persisted } : {} }
      }
      if (rawTimeout <= 0) {
        // No timer (oracle): plain foreground run over the start seam.
        return await startForeground(makeStderrFile(), undefined)
      }
      const timeoutMs = Math.min(rawTimeout, policy.maxTimeoutMs)
      const jobsAvailable = ctx.get('jobs') !== undefined
      if (isAutoBackgroundEligible(args.command) && jobsAvailable) {
        return await startForeground(makeStderrFile(), timeoutMs)
      }
      const result = await ctx.shell.run(ctx.shell.resolve({ ...request, timeoutMs, signal: exec.signal }))
      if (result.aborted) throw abortError()
      const parsed = parseCwdMarker(result.stdout.text, token)
      const status = (result.timedOut ? 'timed_out' : result.exitCode !== 0 ? 'failed' : 'completed') as 'completed' | 'failed' | 'timed_out'
      const suffix = applyCwdPolicy(parsed.cwd, status === 'completed')
      const stderrText = suffix !== undefined ? appendResetSuffix(result.stderr.text, suffix) : result.stderr.text
      const persistedRun = persistIfOversized(session, parsed.output, stderrText)
      return {
        kind: 'foreground' as const,
        stdout: parsed.output,
        stderr: stderrText,
        status,
        exitCode: result.exitCode,
        timedOut: result.timedOut,
        ...persistedRun !== undefined ? { outputFile: persistedRun } : {},
      }
    },
    presentCall: (args: ZcodeBashArgs) => {
      const label = typeof args.description === 'string' && args.description.trim() !== '' ? args.description : args.command
      return { card: 'generic', title: label, kind: 'execute' }
    },
  }))
}
