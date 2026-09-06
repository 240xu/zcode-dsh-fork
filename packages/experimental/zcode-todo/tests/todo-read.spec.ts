/**
 * zcode-todo plugin: oracle TodoWrite/TodoRead over the shared `todos`
 * projection owned by dsh-tool-todo.
 *
 * The shadow registers in a child scope (global core row + preset-scope
 * shadow is the production layering; same-layer duplicates throw). Priority
 * round-trip shapes are locked against the live oracle specimen
 * (corpus/todo/priority-round-trip/observation.json).
 */

import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { TOOL_DESCRIPTIONS } from '@deepseek-ai/dsh-zcode-prompt/src/tool-texts.ts'
import * as tool from '../src/index.ts'
import { TODO_READ_DESCRIPTION } from '../src/index.ts'

const testToolSignal = new AbortController().signal

/** An agent backed by a real Session (unregistered; execute needs only the session). */
function agentWithSession(id: string): Agent & { session: Session } {
  const session = Session.create(SessionId(id))
  return { id: SessionId(id), session } as unknown as Agent & { session: Session }
}

async function setup(): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(SessionProjectionRegistry)
  // The shadow owns the `todos` projection (mirroring production, where the
  // preset mounts this row INSTEAD of the core tool-todo row).
  await ctx.plugin(tool, { allowParallelInProgress: true })
  return ctx
}

let callCounter = 0
function callTool(ctx: Context, name: string, args: unknown, agent: Agent | undefined) {
  return ctx.tools.execute({
    signal: testToolSignal,
    callId: ToolCallId(`call-${++callCounter}`),
    name,
    arguments: args,
    ...agent ? { agent } : {},
  })
}

function valueOf(result: { isError: boolean; value?: unknown }): unknown {
  expect(result.isError).toBe(false)
  if (result.isError) throw new Error('expected tool success')
  return result.value
}

function textOf(result: { content: Array<{ type: string; text?: string }> }): string {
  return result.content.filter(block => block.type === 'text').map(block => block.text).join('')
}

const WRITE = [
  { content: 'Write the report', status: 'in_progress', priority: 'high' },
  { content: 'Review the draft', status: 'pending', priority: 'medium' },
  { content: 'File the archive', status: 'pending', priority: 'low' },
]

describe('dsh-zcode-todo', () => {
  it('registers a preset-scoped `todo_write` shadow with the ZCode description', async () => {
    const ctx = await setup()
    const agent = agentWithSession( 'schema')
    const schemas = ctx.tools.schemas(agent).filter(s => s.name === 'todo_write')
    expect(schemas).toHaveLength(1)
    expect(schemas[0]!.description).toBe(TOOL_DESCRIPTIONS['todo_write'])
    const props = (schemas[0]!.parameters as { properties?: Record<string, { properties?: Record<string, unknown> }> }).properties ?? {}
    expect(Object.keys(props)).toEqual(['todos'])
  })

  it('registers a read-only `todo_read` tool with the ZCode description', async () => {
    const ctx = await setup()
    const agent = agentWithSession( 'schema-read')
    const schema = ctx.tools.schemas(agent).find(s => s.name === 'todo_read')
    expect(schema).toBeDefined()
    expect(schema!.description).toBe(TODO_READ_DESCRIPTION)
    expect(TODO_READ_DESCRIPTION).toBe('Read the current session todo list')
    const props = (schema!.parameters as { properties?: Record<string, unknown> }).properties ?? {}
    expect(Object.keys(props)).toEqual([])
  })

  it('accepts priority and round-trips the oracle shapes (specimen-locked)', async () => {
    const ctx = await setup()
    const agent = agentWithSession( 'roundtrip')
    const written = await callTool(ctx, 'todo_write', { todos: WRITE }, agent)
    const value = valueOf(written) as { oldTodos: unknown[]; todos: unknown; summary: unknown }
    expect(value.oldTodos).toEqual([])
    expect(value.todos).toEqual(WRITE)
    expect(value.summary).toEqual({ total: 3, pending: 2, inProgress: 1, completed: 0 })
    expect(textOf(written)).toBe(
      '{"oldTodos":[],"todos":[{"content":"Write the report","status":"in_progress","priority":"high"},{"content":"Review the draft","status":"pending","priority":"medium"},{"content":"File the archive","status":"pending","priority":"low"}],"summary":{"total":3,"pending":2,"inProgress":1,"completed":0}}',
    )
    const read = await callTool(ctx, 'todo_read', {}, agent)
    expect(valueOf(read)).toEqual({ todos: WRITE })
    expect(textOf(read)).toBe(
      '{"todos":[{"content":"Write the report","status":"in_progress","priority":"high"},{"content":"Review the draft","status":"pending","priority":"medium"},{"content":"File the archive","status":"pending","priority":"low"}]}',
    )
  })

  it('returns the previous list as oldTodos on rewrite', async () => {
    const ctx = await setup()
    const agent = agentWithSession( 'rewrite')
    valueOf(await callTool(ctx, 'todo_write', { todos: WRITE }, agent))
    const second = valueOf(await callTool(ctx, 'todo_write', {
      todos: [{ content: 'Write the report', status: 'completed', priority: 'high' }],
    }, agent)) as { oldTodos: unknown; todos: unknown; summary: unknown }
    expect(second.oldTodos).toEqual(WRITE)
    expect(second.todos).toEqual([{ content: 'Write the report', status: 'completed', priority: 'high' }])
    expect(second.summary).toEqual({ total: 1, pending: 0, inProgress: 0, completed: 1 })
  })

  it('rejects items without priority and unknown priorities at the schema boundary', async () => {
    const ctx = await setup()
    const agent = agentWithSession( 'schema')
    const missing = await callTool(ctx, 'todo_write', { todos: [{ content: 'x', status: 'pending' }] }, agent)
    expect(missing.isError).toBe(true)
    const bogus = await callTool(ctx, 'todo_write', { todos: [{ content: 'x', status: 'pending', priority: 'urgent' }] }, agent)
    expect(bogus.isError).toBe(true)
  })

  it('mirrors the core list rules (non-empty, unique content)', async () => {
    const ctx = await setup()
    const agent = agentWithSession( 'rules')
    expect((await callTool(ctx, 'todo_write', { todos: [{ content: '   ', status: 'pending', priority: 'low' }] }, agent)).isError).toBe(true)
    expect((await callTool(ctx, 'todo_write', {
      todos: [
        { content: 'same', status: 'pending', priority: 'low' },
        { content: 'same', status: 'pending', priority: 'low' },
      ],
    }, agent)).isError).toBe(true)
  })

  it('reports an empty list before the first write', async () => {
    const ctx = await setup()
    const read = await callTool(ctx, 'todo_read', {}, agentWithSession('fresh'))
    expect(valueOf(read)).toEqual({ todos: [] })
    expect(textOf(read)).toBe('{"todos":[]}')
  })

  it('persists the list across turn boundaries with priorities intact', async () => {
    const ctx = await setup()
    const agent = agentWithSession('multiturn')
    valueOf(await callTool(ctx, 'todo_write', { todos: WRITE }, agent))
    agent.session.append('turn/start', { turn: 2 })
    const read = await callTool(ctx, 'todo_read', {}, agent)
    expect(valueOf(read)).toEqual({ todos: WRITE })
  })

  it('rejects callers without an owning agent session', async () => {
    const ctx = await setup()
    expect((await callTool(ctx, 'todo_write', { todos: WRITE }, undefined)).isError).toBe(true)
    expect((await callTool(ctx, 'todo_read', {}, undefined)).isError).toBe(true)
  })

  it('presents read/write call cards', async () => {
    const ctx = await setup()
    expect(ctx.tools.get('todo_read')?.presentCall?.({})).toEqual({ card: 'generic', title: 'Read todo list', kind: 'read' })
  })
})
