/**
 * dsh-zcode-bash: ZCode 3.10.2 Bash over DSH's own shell seam.
 *
 * ZCode's bash keeps the session working directory across calls, runs an
 * optional background job, and enforces ZCode's timeouts (default 120000ms,
 * cap 600000ms). These tests pin that contract: cwd persistence per agent
 * session (isolated between sessions), ZCode schema keys, background jobs
 * collectible through the REAL job_output tool, timeout clamping, and the
 * loud refusal of self-escalating sandbox overrides.
 *
 * NOTE: this file drives the REAL local shell executor, which loads node-pty
 * through @deepseek-ai/dsh-subprocess-local. Hosts without a node-pty
 * prebuild (e.g. Termux android-arm64) cannot run it — upstream
 * tool-bash/tests/tools.spec.ts fails identically there. Run on CI or a
 * node-pty-capable host.
 */

import { mkdtempSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { SessionId } from '@deepseek-ai/dsh-session'
import LocalJobRegistry from '@deepseek-ai/dsh-jobs-local'
import * as ToolTasks from '@deepseek-ai/dsh-tool-jobs'
import LocalSubprocessRuntime from '@deepseek-ai/dsh-subprocess-local'
import { LocalBashExecutor } from '@deepseek-ai/dsh-bash-local'
import * as BashEnvPlugin from '@deepseek-ai/dsh-shell-env'
import * as tool from '../src/index.ts'

const testToolSignal = new AbortController().signal

const spillDir = mkdtempSync(join(tmpdir(), 'dsh-zcode-bash-spec-'))
const workRoot = mkdtempSync(join(tmpdir(), 'dsh-zcode-bash-cwd-'))
mkdirSync(join(workRoot, 'subdir'))

async function setup() {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(LocalJobRegistry)
  await ctx.plugin(ToolTasks)
  await ctx.plugin(LocalSubprocessRuntime)
  ;(ctx.subprocess as LocalSubprocessRuntime).internals = { spillDir }
  await ctx.plugin(BashEnvPlugin)
  await ctx.plugin(LocalBashExecutor, { timeoutMs: 10_000, graceMs: 200 })
  await ctx.plugin(tool)
  return ctx
}

function registerFakeAgent(ctx: Context, sessionId: string, cwd?: string): Agent {
  const scopeFiber = ctx.plugin(() => {})
  const id = SessionId(sessionId)
  const agent = {
    id,
    ctx: scopeFiber.ctx,
    session: { id, header: { version: 0, id, createdAt: 0, ...cwd !== undefined ? { cwd } : {} } },
  } as unknown as Agent
  ctx.agents.register(agent)
  return agent
}

let callCounter = 0
function call(ctx: Context, name: string, args: unknown, agent?: Agent) {
  return ctx.tools.execute({
    signal: testToolSignal,
    callId: ToolCallId(`call-${++callCounter}`),
    name,
    arguments: args,
    ...agent ? { agent } : {},
  })
}

function text(result: { content: { type: string; text?: string }[] }): string {
  return result.content.filter(block => block.type === 'text').map(block => block.text).join('')
}

function valueOf(result: { isError: boolean; value?: unknown }): unknown {
  expect(result.isError).toBe(false)
  if (result.isError) throw new Error('expected tool success')
  return result.value
}

async function callUntilText(
  ctx: Context,
  name: string,
  args: unknown,
  expected: string,
  timeoutMs = 10_000,
  agent?: Agent,
): Promise<Awaited<ReturnType<typeof call>>> {
  const deadline = Date.now() + timeoutMs
  let last: Awaited<ReturnType<typeof call>> | undefined
  while (Date.now() < deadline) {
    last = await call(ctx, name, args, agent)
    if (text(last).includes(expected)) return last
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  throw new Error(`timed out waiting for ${JSON.stringify(expected)}; last: ${last === undefined ? 'none' : text(last)}`)
}

describe('dsh-zcode-bash', () => {
  it('foreground: runs the command and renders raw output with no marker on success', async () => {
    const ctx = await setup()
    const agent = registerFakeAgent(ctx, 'fg-1')
    const result = await call(ctx, 'bash', { command: 'echo hello', description: 'say hello' }, agent)
    const value = valueOf(result) as { kind: string; stdout: string; stderr: string; status: string; exitCode: number; timedOut: boolean }
    expect(value).toMatchObject({ kind: 'foreground', stdout: 'hello\n', status: 'completed', exitCode: 0, timedOut: false })
    expect(value.stdout).not.toContain('__ZCODE_CWD_')
    // Oracle contract: success renders stdout+stderr only, trailing newline trimmed.
    expect(text(result)).toBe('hello')
  })

  it('foreground: failures render an `Exit code N` header, stderr included', async () => {
    const ctx = await setup()
    const agent = registerFakeAgent(ctx, 'fg-2')
    const result = await call(ctx, 'bash', { command: 'echo oops >&2; exit 3', description: 'fail loudly' }, agent)
    const value = valueOf(result) as { kind: string; stdout: string; stderr: string; status: string; exitCode: number }
    expect(value).toMatchObject({ kind: 'foreground', status: 'failed', exitCode: 3 })
    expect(value.stderr).toContain('oops')
    expect(text(result)).toBe('Exit code 3\noops')
  })

  it('cwd persists across calls within one session and stays isolated between sessions', async () => {
    const ctx = await setup()
    const a = registerFakeAgent(ctx, 'cwd-a', workRoot)
    const b = registerFakeAgent(ctx, 'cwd-b', workRoot)
    const subdir = join(workRoot, 'subdir')
    await call(ctx, 'bash', { command: `cd ${subdir}`, description: 'move down' }, a)
    const again = await call(ctx, 'bash', { command: 'pwd', description: 'where am i' }, a)
    expect((valueOf(again) as { stdout: string }).stdout.trim()).toBe(subdir)
    const other = await call(ctx, 'bash', { command: 'pwd', description: 'where is b' }, b)
    expect((valueOf(other) as { stdout: string }).stdout.trim()).not.toBe(subdir)
  })

  it('cwd reverts to the workspace root with a stderr suffix when leaving it', async () => {
    const ctx = await setup()
    const agent = registerFakeAgent(ctx, 'cwd-outside', workRoot)
    const start = (valueOf(await call(ctx, 'bash', { command: 'pwd', description: 'start' }, agent)) as { stdout: string }).stdout.trim()
    const escaped = await call(ctx, 'bash', { command: 'cd /tmp && pwd', description: 'leave workspace' }, agent)
    const escapedValue = valueOf(escaped) as { stdout: string; stderr: string }
    expect(escapedValue.stdout.trim()).toBe('/tmp')
    // Oracle contract: the reset note lands on stderr, and the model text
    // carries it after the stdout part.
    expect(escapedValue.stderr).toBe(`Shell cwd was reset to ${start}`)
    expect(text(escaped)).toBe(`/tmp\nShell cwd was reset to ${start}`)
    const back = await call(ctx, 'bash', { command: 'pwd', description: 'back at root' }, agent)
    expect((valueOf(back) as { stdout: string }).stdout.trim()).toBe(start)
  })

  it('a failed cd leaves tracking untouched', async () => {
    const ctx = await setup()
    const agent = registerFakeAgent(ctx, 'cwd-fail', workRoot)
    const subdir = join(workRoot, 'subdir')
    await call(ctx, 'bash', { command: `cd ${subdir}`, description: 'move down' }, agent)
    await call(ctx, 'bash', { command: 'cd /tmp/nonexistent && pwd', description: 'fail to move' }, agent)
    const again = await call(ctx, 'bash', { command: 'pwd', description: 'still inside' }, agent)
    expect((valueOf(again) as { stdout: string }).stdout.trim()).toBe(subdir)
  })

  it('run_in_background acks with the job id, readable through the REAL job_output tool', async () => {
    const ctx = await setup()
    const started = await call(ctx, 'bash', { command: 'echo bg-ok', description: 'test command', run_in_background: true })
    expect(valueOf(started)).toMatchObject({ kind: 'background' })
    expect(text(started)).toMatch(/Command running in background with ID: bash-\d+/)
    const id = (valueOf(started) as { backgroundTaskId: string }).backgroundTaskId
    const read = await callUntilText(ctx, 'job_output', { job_id: id }, 'bg-ok')
    expect(text(read)).toContain('bg-ok')
    const done = await callUntilText(ctx, 'job_output', { job_id: id }, '[status: completed, exit code: 0]')
    expect(text(done)).toContain('[status: completed, exit code: 0]')
  })

  it('background: a background cd never moves session cwd (oracle: foreground-only capture)', async () => {
    const ctx = await setup()
    const agent = registerFakeAgent(ctx, 'bg-cwd', workRoot)
    const subdir = join(workRoot, 'subdir')
    const started = await call(
      ctx,
      'bash',
      { command: `cd ${subdir} && echo moved`, description: 'move in background', run_in_background: true },
      agent,
    )
    const id = (valueOf(started) as { backgroundTaskId: string }).backgroundTaskId
    const done = await callUntilText(ctx, 'job_output', { job_id: id }, '[status: completed, exit code: 0]', 10_000, agent)
    expect(text(done)).toContain('moved')
    const pwd = await call(ctx, 'bash', { command: 'pwd', description: 'still at root' }, agent)
    expect((valueOf(pwd) as { stdout: string }).stdout.trim()).toBe(workRoot)
  })

  it('background: a job started by an agent is owned by that agent', async () => {
    const ctx = await setup()
    const agent = registerFakeAgent(ctx, 'sess-owner')
    const started = await call(ctx, 'bash', { command: 'sleep 60', description: 'test command', run_in_background: true }, agent)
    expect(text(started)).toMatch(/Command running in background with ID: bash-\d+/)
    const id = (valueOf(started) as { backgroundTaskId: string }).backgroundTaskId

    const anon = await call(ctx, 'job_output', { job_id: id })
    expect(anon.isError).toBe(true)
    expect(text(anon)).toMatch(/belongs to another session/)

    const killed = await call(ctx, 'job_kill', { job_id: id }, agent)
    expect(killed.isError).toBe(false)
    await call(ctx, 'job_output', { job_id: id, wait: true }, agent) // await settlement — no orphan
  })

  it('timeout: an over-long command reports timed_out with the oracle wording', async () => {
    const ctx = await setup()
    const agent = registerFakeAgent(ctx, 'timeout-1')
    const result = await call(ctx, 'bash', { command: 'sleep 30', description: 'sleep long', timeout: 50 }, agent)
    const value = valueOf(result) as { kind: string; status: string; timedOut: boolean }
    expect(value).toMatchObject({ kind: 'foreground', status: 'timed_out', timedOut: true })
    expect(text(result)).toBe('Command timed out after 50ms\n<error>Command was aborted before completion</error>')
  })

  it('timeout: an eligible command backgrounds instead of dying', async () => {
    const ctx = await setup()
    const agent = registerFakeAgent(ctx, 'timeout-auto', workRoot)
    const started = await call(
      ctx,
      'bash',
      { command: 'echo auto-bg && sleep 3', description: 'auto background', timeout: 200 },
      agent,
    )
    const startedValue = valueOf(started) as { kind: string; backgroundTaskId: string }
    expect(startedValue.kind).toBe('background')
    expect(text(started)).toMatch(/Command running in background with ID: bash-\d+/)
    // job_output streams incrementally: content and completion arrive on
    // different reads.
    const content = await callUntilText(ctx, 'job_output', { job_id: startedValue.backgroundTaskId }, 'auto-bg', 15_000, agent)
    expect(text(content)).toContain('auto-bg')
    await callUntilText(ctx, 'job_output', { job_id: startedValue.backgroundTaskId }, '[status: completed, exit code: 0]', 15_000, agent)
  })

  it('timeout: non-positive means no timer (unlimited foreground)', async () => {
    const ctx = await setup()
    const agent = registerFakeAgent(ctx, 'timeout-neg', workRoot)
    const result = await call(ctx, 'bash', { command: 'sleep 2 && echo neg-ok', description: 'negative timeout', timeout: -5 }, agent)
    expect(valueOf(result)).toMatchObject({ kind: 'foreground', status: 'completed' })
    expect(text(result)).toBe('neg-ok')
  })

  it('timeout: zero falls back to the default and runs', async () => {
    const ctx = await setup()
    const agent = registerFakeAgent(ctx, 'timeout-2')
    const result = await call(ctx, 'bash', { command: 'echo zero-ok', description: 'zero timeout', timeout: 0 }, agent)
    const value = valueOf(result) as { status: string }
    expect(value).toMatchObject({ kind: 'foreground', status: 'completed' })
    expect(text(result)).toBe('zero-ok')
  })

  it('dangerouslyDisableSandbox is accepted without tool-level effect', async () => {
    const ctx = await setup()
    const agent = registerFakeAgent(ctx, 'sandbox-1')
    const result = await call(
      ctx,
      'bash',
      { command: 'echo sandbox-probe', description: 'sandbox flag', dangerouslyDisableSandbox: true },
      agent,
    )
    expect(valueOf(result)).toMatchObject({ kind: 'foreground', status: 'completed' })
    expect(text(result)).toBe('sandbox-probe')
  })

  it('empty commands run and render the no-output parenthetical', async () => {
    const ctx = await setup()
    const agent = registerFakeAgent(ctx, 'empty-1')
    const result = await call(ctx, 'bash', { command: '   ', description: 'nothing' }, agent)
    expect(valueOf(result)).toMatchObject({ kind: 'foreground', status: 'completed' })
    expect(text(result)).toBe('(Bash completed with no output)')
  })
})
