/**
 * zcode-todo plugin: `todo_read` is ZCode 3.10.2's TodoRead — a read-only
 * view over the `todos` projection owned by dsh-tool-todo, which registers
 * only `todo_write`.
 */

import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import type { Agent } from '@deepseek-ai/dsh-agent'
import * as ToolTodo from '@deepseek-ai/dsh-tool-todo/src/index.ts'
import * as tool from '../src/index.ts'
import { TODO_READ_DESCRIPTION } from '../src/index.ts'

const testToolSignal = new AbortController().signal

/** A parent Agent backed by a real Session. */
function agentWithSession(id = 'parent-1'): Agent & { session: Session } {
  const session = Session.create(SessionId(id))
  return { id: SessionId(id), session } as unknown as Agent & { session: Session }
}

async function setup(): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(SessionProjectionRegistry)
  await ctx.plugin(ToolTodo, { allowParallelInProgress: true })
  await ctx.plugin(tool)
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

describe('dsh-zcode-todo', () => {
  it('registers a read-only `todo_read` tool with the ZCode description', async () => {
    const ctx = await setup()
    const schema = ctx.tools.schemas().find(s => s.name === 'todo_read')
    expect(schema).toBeDefined()
    expect(schema!.description).toBe(TODO_READ_DESCRIPTION)
    expect(TODO_READ_DESCRIPTION).toBe('Read the current session todo list')
    const props = (schema!.parameters as { properties?: Record<string, unknown> }).properties ?? {}
    expect(Object.keys(props)).toEqual([])
  })

  it('reads back the list written through `todo_write` without modifying it', async () => {
    const ctx = await setup()
    const agent = agentWithSession('reader')
    const todos = [
      { content: 'plan', status: 'in_progress' },
      { content: 'build', status: 'pending' },
    ]
    valueOf(await callTool(ctx, 'todo_write', { todos }, agent))
    const read = valueOf(await callTool(ctx, 'todo_read', {}, agent)) as {
      todos: Array<{ content: string; status: string }>
      counts: { pending: number; inProgress: number; completed: number }
    }
    expect(read.todos).toEqual(todos)
    expect(read.counts).toEqual({ pending: 1, inProgress: 1, completed: 0 })
  })

  it('reports an empty list before the first write', async () => {
    const ctx = await setup()
    const read = valueOf(await callTool(ctx, 'todo_read', {}, agentWithSession('fresh'))) as {
      todos: unknown[]
      counts: { pending: number; inProgress: number; completed: number }
    }
    expect(read.todos).toEqual([])
    expect(read.counts).toEqual({ pending: 0, inProgress: 0, completed: 0 })
  })

  it('rejects callers without an owning agent session', async () => {
    const ctx = await setup()
    const result = await callTool(ctx, 'todo_read', {}, undefined)
    expect(result.isError).toBe(true)
  })

  it('presents a read-kind call card', async () => {
    const ctx = await setup()
    expect(ctx.tools.get('todo_read')?.presentCall?.({})).toEqual({ card: 'generic', title: 'Read todo list', kind: 'read' })
  })
})
