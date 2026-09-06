/**
 * End-to-end delegation through the real spawn provider: the multiplexer
 * routes by type, the child runs a scripted model turn, and the result
 * settles with the oracle-shaped footer.
 *
 * Needs session persistence (hard links) + the agent loop; runs on
 * server2/CI, not on filesystems without hard-link support.
 */

import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import { SessionId } from '@deepseek-ai/dsh-session'
import JsonlSessionPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import SubagentRuntime from '@deepseek-ai/dsh-subagent'
import * as SubagentSpawn from '@deepseek-ai/dsh-subagent-spawn-in-process'
import * as ToolTodo from '@deepseek-ai/dsh-tool-todo'
import * as ToolBash from '@deepseek-ai/dsh-tool-bash'
import * as BashEnvPlugin from '@deepseek-ai/dsh-shell-env'
import LocalFileSystem from '@deepseek-ai/dsh-fs-local'
import * as FsPolicy from '@deepseek-ai/dsh-fs-observation-policy'
import * as ToolFs from '@deepseek-ai/dsh-tool-fs'
import * as ToolFsSearch from '@deepseek-ai/dsh-tool-fs-search'
import WebRuntime from '@deepseek-ai/dsh-web'
import * as WebFetchLocal from '@deepseek-ai/dsh-web-fetch-http'
import * as ToolWeb from '@deepseek-ai/dsh-tool-web'
import * as ToolSkill from '@deepseek-ai/dsh-tool-skill'
import * as ToolAskUser from '@deepseek-ai/dsh-tool-ask-user'
import * as ToolSessionQuery from '@deepseek-ai/dsh-tool-session-query'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import UserQuestionService from '@deepseek-ai/dsh-user-questions'
import * as ToolSubagentControl from '@deepseek-ai/dsh-tool-subagent-control'
import { LocalBashExecutor } from '@deepseek-ai/dsh-bash-local'
import LocalSubprocessRuntime from '@deepseek-ai/dsh-subprocess-local'
import { mkdtempSync as mkspill } from 'node:fs'
import { MockAdapter, textResponse } from '../../../core/agent-loop/tests/mock-adapter.ts'
import * as tool from '../src/index.ts'
import { TestSessionQuery } from '../../../subagent/tool-subagent-control/tests/test-session-query.ts'

const testToolSignal = new AbortController().signal
const roots: string[] = []
afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root !== undefined) rmSync(root, { force: true, recursive: true })
  }
})

async function setup(script: ConstructorParameters<typeof MockAdapter>[0]) {
  const ctx = new Context()
  await mountAgentLoopTestDependencies(ctx)
  const root = mkdtempSync(join(tmpdir(), 'dsh-zcode-agent-'))
  roots.push(root)
  await ctx.plugin(JsonlSessionPersistence, { root })
  await ctx.plugin(TestSessionQuery)
  await ctx.plugin(AgentLoop, { agents: [] })
  await ctx.plugin(SessionProjectionRegistry)
  await ctx.plugin(SubagentRuntime)
  await ctx.plugin(SubagentSpawn, { providerName: 'spawn' })
  await ctx.plugin(ToolTodo, { allowParallelInProgress: true })
  // Global rows the child filters name (children join the parent scope and
  // see these through the global layer).
  await ctx.plugin(LocalSubprocessRuntime)
  ;(ctx.subprocess as LocalSubprocessRuntime).internals = { spillDir: mkspill(join(tmpdir(), 'dsh-zcode-agent-spill-')) }
  await ctx.plugin(BashEnvPlugin)
  await ctx.plugin(LocalBashExecutor, { timeoutMs: 10_000, graceMs: 200 })
  await ctx.plugin(ToolBash)
  await ctx.plugin(LocalFileSystem, { cwd: root })
  await ctx.plugin(FsPolicy)
  await ctx.plugin(ToolFs)
  await ctx.plugin(ToolFsSearch, { sampleOverCapGlobResults: false })
  await ctx.plugin(WebRuntime, { fetchProvider: WebFetchLocal.LOCAL_FETCH_PROVIDER_ID })
  await ctx.plugin(WebFetchLocal, {})
  await ctx.plugin(ToolWeb)
  await ctx.plugin(SkillRegistry)
  await ctx.plugin(ToolSkill)
  await ctx.plugin(UserQuestionService)
  await ctx.plugin(ToolAskUser)
  await ctx.plugin(ToolSessionQuery)
  await ctx.plugin(ToolSubagentControl)
  await ctx.plugin(tool)
  ctx.llm.registerAdapter(['mock'], new MockAdapter(script))
  const parent = await ctx.agentLoop.create(SessionId('parent'), { provider: 'mock', model: 'mock' })
  // Global rows (not preset-mounted here): children join the parent scope
  // and see these through the global layer, so the oracle filters resolve.
  return { ctx, parent }
}

let calls = 0
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
  it('runs a real Explore child and renders the footer', async () => {
    const { ctx, parent } = await setup([textResponse('explore found nothing')])
    const result = await callAgent(ctx, { description: 'find code', prompt: 'search', subagent_type: 'Explore' }, parent)
    expect(result.isError).toBe(false)
    const value = result.value as { kind: string; runId: string; output: unknown }
    expect(value.kind).toBe('foreground')
    expect(text(result)).toContain('explore found nothing')
    expect(text(result)).toContain(`agentId: ${value.runId}`)
  }, 30000)

  it('starts a real general-purpose child as continuable', async () => {
    const { ctx, parent } = await setup([textResponse('gp done')])
    const result = await callAgent(ctx, { description: 'research task', prompt: 'investigate' }, parent)
    expect(result.isError).toBe(false)
    const value = result.value as { kind: string; subagentId: string }
    expect(value.kind).toBe('continuable')
    expect(text(result)).toContain(`use send_message with agent_id '${value.subagentId}'`)
  }, 30000)
})

