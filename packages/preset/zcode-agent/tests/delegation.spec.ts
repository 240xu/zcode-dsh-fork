/**
 * dsh-zcode-agent delegation through a scripted child boundary: the
 * multiplexer routes by type, observes start requests, and settles with
 * the oracle-shaped footer. Runs anywhere (no session persistence, no
 * model loop). The real-spawn proof lives in delegation.integration.
 */

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import AgentRegistry, { type Agent } from '@deepseek-ai/dsh-agent'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { SessionId } from '@deepseek-ai/dsh-session'
import SubagentRuntime from '@deepseek-ai/dsh-subagent'
import type { SubagentStartRequest } from '@deepseek-ai/dsh-subagent'
import LocalJobRegistry from '@deepseek-ai/dsh-jobs-local'
import * as ToolTasks from '@deepseek-ai/dsh-tool-jobs'
import JsonlSessionPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import SessionStore from '@deepseek-ai/dsh-session'
import * as tool from '../src/index.ts'
import { mountScriptedProvider } from '../../../subagent/tool-subagent/tests/scripted-provider.ts'

const testToolSignal = new AbortController().signal
let calls = 0

const roots: string[] = []
afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root !== undefined) rmSync(root, { force: true, recursive: true })
  }
})

async function setup(reply = 'child says hi') {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(SubagentRuntime)
  await ctx.plugin(LocalJobRegistry)
  await ctx.plugin(ToolTasks)
  await ctx.plugin(SessionStore)
  const root = mkdtempSync(join(tmpdir(), 'dsh-zcode-agent-'))
  roots.push(root)
  await ctx.plugin(JsonlSessionPersistence, { root })
  const seen: SubagentStartRequest[] = []
  await mountScriptedProvider(ctx, {
    name: 'spawn',
    reply,
    onStart: (request) => {
      seen.push(request)
    },
  })
  await ctx.plugin(tool)
  const parent = registerFakeAgent(ctx)
  return { ctx, seen, parent }
}

function registerFakeAgent(ctx: Context): Agent {
  const scopeFiber = ctx.plugin(() => {})
  const id = SessionId('zcode-agent-parent')
  const agent = {
    id,
    ctx: scopeFiber.ctx,
    options: {},
    session: {
      id,
      header: { version: 0, id, createdAt: 0 },
      requestHeader: () => undefined,
    },
  } as unknown as Agent
  ctx.agents.register(agent)
  return agent
}

function callAgent(ctx: Context, args: unknown, agent: unknown) {
  return ctx.tools.execute({
    signal: testToolSignal,
    callId: ToolCallId(`call-${++calls}`),
    name: 'agent',
    arguments: args,
    agent: agent as never,
  })
}

function text(result: { content: { type: string; text?: string }[] }): string {
  return result.content.filter(block => block.type === 'text').map(block => block.text).join('')
}

describe('dsh-zcode-agent delegation', () => {
  it('delegates general-purpose foreground with the live persona and 9-tool filter', async () => {
    const { ctx, seen, parent } = await setup('gp says hi')
    const result = await callAgent(ctx, { description: 'research', prompt: 'investigate', run_in_background: false }, parent)
    expect(result.isError).toBe(false)
    expect(seen).toHaveLength(1)
    expect((seen[0]!.persona ?? '')).toContain("You are an agent for ZCode CLI. Given the user's message")
    expect(seen[0]!.toolFilter).toEqual({
      allow: ['ask_user_question', 'bash', 'edit', 'read', 'skill', 'todo_write', 'web_fetch', 'write'],
    })
    expect(text(result)).toContain('gp says hi')
    expect(text(result)).toContain('agentId:')
  })

  it('delegates Explore foreground with the read-only persona and filter', async () => {
    const { ctx, seen, parent } = await setup('explore says hi')
    const result = await callAgent(ctx, { description: 'find code', prompt: 'search', subagent_type: 'Explore' }, parent)
    expect(result.isError).toBe(false)
    expect(seen).toHaveLength(1)
    expect((seen[0]!.persona ?? '')).toContain('READ-ONLY MODE - NO FILE MODIFICATIONS')
    expect(seen[0]!.toolFilter).toEqual({ allow: ['bash', 'read', 'web_fetch', 'todo_write'] })
    expect(text(result)).toContain('explore says hi')
  })

  it('backgrounds Explore explicitly and keeps general-purpose continuable default (continuable needs a real provider — covered in integration)', async () => {
    const { ctx, parent } = await setup('bg says hi')
    const gp = await callAgent(ctx, { description: 'research', prompt: 'investigate', run_in_background: false }, parent)
    expect((gp.value as { kind: string }).kind).toBe('foreground')
    const bg = await callAgent(ctx, { description: 'find code', prompt: 'search', subagent_type: 'Explore', run_in_background: true }, parent)
    expect(bg.isError).toBe(false)
    expect((bg.value as { kind: string }).kind).toBe('background')
    expect(text(bg)).toContain('Agent running in background')
  })

  it('rejects unknown types before starting anything', async () => {
    const { ctx, seen, parent } = await setup()
    const result = await callAgent(ctx, { description: 'doom', prompt: 'fail', subagent_type: 'Nope' }, parent)
    expect(result.isError).toBe(true)
    expect(text(result)).toContain("Agent type 'Nope' not found. Available agents: general-purpose, Explore")
    expect(seen).toHaveLength(0)
  })
})
