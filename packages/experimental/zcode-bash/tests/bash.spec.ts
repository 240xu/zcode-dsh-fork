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

function registerFakeAgent(ctx: Context, sessionId: string): Agent {
  const scopeFiber = ctx.plugin(() => {})
  const id = SessionId(sessionId)
  const agent = {
    id,
    ctx: scopeFiber.ctx,
    session: { id, header: { version: 0, id, createdAt: 0 } },
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
): Promise<Awaited<ReturnType<typeof call>>> {
  const deadline = Date.now() + timeoutMs
  let last: Awaited<ReturnType<typeof call>> | undefined
  while (Date.now() < deadline) {
    last = await call(ctx, name, args)
    if (text(last).includes(expected)) return last
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  throw new Error(`timed out waiting for ${JSON.stringify(expected)}; last: ${last === undefined ? 'none' : text(last)}`)
}

describe('dsh-zcode-bash', () => {
  it('foreground: runs the command and renders the exit-code marker', async () => {
    const ctx = await setup()
    const agent = registerFakeAgent(ctx, 'fg-1')
    const result = await call(ctx, 'bash', { command: 'echo hello', description: 'say hello' }, agent)
    const value = valueOf(result) as { kind: string; stdout: string; stderr: string; status: string; exitCode: number; timedOut: boolean }
    expect(value).toMatchObject({ kind: 'foreground', stdout: 'hello\n', status: 'completed', exitCode: 0, timedOut: false })
    expect(value.stdout).not.toContain('__ZCODE_CWD_')
    expect(text(result)).toContain('[exit code: 0]')
  })

  it('foreground: stderr is preserved and failures report failed with the exit code', async () => {
    const ctx = await setup()
    const agent = registerFakeAgent(ctx, 'fg-2')
    const result = await call(ctx, 'bash', { command: 'echo oops >&2; exit 3', description: 'fail loudly' }, agent)
    const value = valueOf(result) as { kind: string; stdout: string; stderr: string; status: string; exitCode: number }
    expect(value).toMatchObject({ kind: 'foreground', status: 'failed', exitCode: 3 })
    expect(value.stderr).toContain('oops')
    expect(text(result)).toContain('[exit code: 3]')
  })

  it('cwd persists across calls within one session and stays isolated between sessions', async () => {
    const ctx = await setup()
    const a = registerFakeAgent(ctx, 'cwd-a')
    const b = registerFakeAgent(ctx, 'cwd-b')
    const subdir = join(workRoot, 'subdir')
    await call(ctx, 'bash', { command: `cd ${subdir}`, description: 'move down' }, a)
    const again = await call(ctx, 'bash', { command: 'pwd', description: 'where am i' }, a)
    expect((valueOf(again) as { stdout: string }).stdout.trim()).toBe(subdir)
    const other = await call(ctx, 'bash', { command: 'pwd', description: 'where is b' }, b)
    expect((valueOf(other) as { stdout: string }).stdout.trim()).not.toBe(subdir)
  })

  it('run_in_background acks with the job id, readable through the REAL job_output tool', async () => {
    const ctx = await setup()
    const started = await call(ctx, 'bash', { command: 'echo bg-ok', description: 'test command', run_in_background: true })
    expect(valueOf(started)).toMatchObject({ kind: 'background' })
    expect(text(started)).toMatch(/started background job bash-\d+/)
    const id = (valueOf(started) as { backgroundTaskId: string }).backgroundTaskId
    const read = await callUntilText(ctx, 'job_output', { job_id: id }, 'bg-ok')
    expect(text(read)).toContain('bg-ok')
    const done = await callUntilText(ctx, 'job_output', { job_id: id }, '[status: completed, exit code: 0]')
    expect(text(done)).toContain('[status: completed, exit code: 0]')
  })

  it('timeout: an over-long command reports timed_out instead of hanging', async () => {
    const ctx = await setup()
    const agent = registerFakeAgent(ctx, 'timeout-1')
    const result = await call(ctx, 'bash', { command: 'sleep 30', description: 'sleep long', timeout: 50 }, agent)
    const value = valueOf(result) as { kind: string; status: string; timedOut: boolean }
    expect(value).toMatchObject({ kind: 'foreground', status: 'timed_out', timedOut: true })
  })

  it('timeout: non-positive values are rejected', async () => {
    const ctx = await setup()
    const agent = registerFakeAgent(ctx, 'timeout-2')
    const result = await call(ctx, 'bash', { command: 'echo x', description: 'bad timeout', timeout: -5 }, agent)
    expect(result.isError).toBe(true)
  })

  it('dangerouslyDisableSandbox fails loudly instead of silently ignoring confinement', async () => {
    const ctx = await setup()
    const agent = registerFakeAgent(ctx, 'sandbox-1')
    const result = await call(
      ctx,
      'bash',
      { command: 'echo x', description: 'escalate', dangerouslyDisableSandbox: true },
      agent,
    )
    expect(result.isError).toBe(true)
    expect(text(result)).toContain('DSH_PERMISSION_MODE')
  })

  it('empty commands are rejected', async () => {
    const ctx = await setup()
    const agent = registerFakeAgent(ctx, 'empty-1')
    const result = await call(ctx, 'bash', { command: '   ', description: 'nothing' }, agent)
    expect(result.isError).toBe(true)
  })
})
