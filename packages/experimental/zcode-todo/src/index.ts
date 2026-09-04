/**
 * ZCode TodoRead tool for the zcode agent preset.
 *
 * ZCode 3.10.2 exposes two todo tools: TodoRead ("Read the current session
 * todo list without modifying external state") and TodoWrite (whole-list
 * replacement). DSH's `tool-todo` registers only `todo_write`, so a zcode
 * session has no read-only path to the list. This plugin registers a
 * read-only `todo_read` view over the SAME `todos` session projection that
 * `tool-todo` owns — no new state, no writes, the same whole-list snapshot
 * the writer maintains. Mounted in the zcode preset scope only; the global
 * `todo_write` registration is untouched.
 * @module @deepseek-ai/dsh-zcode-todo
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-session-projection'
import type { TodoItem } from '@deepseek-ai/dsh-tool-todo'

export const inject = ['tools', 'sessionProjections']

/** ZCode TodoRead description, verbatim from the 3.10.2 evidence. */
export const TODO_READ_DESCRIPTION = 'Read the current session todo list'

const STATUSES = ['pending', 'in_progress', 'completed'] as const

export function apply(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'todo_read',
    description: TODO_READ_DESCRIPTION,
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          todos: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                content: { type: 'string', required: true },
                status: { type: 'string', required: true, enum: [...STATUSES] },
              },
            },
          },
          counts: {
            type: 'object',
            additionalProperties: false,
            required: true,
            properties: {
              pending: { type: 'integer', required: true },
              inProgress: { type: 'integer', required: true },
              completed: { type: 'integer', required: true },
            },
          },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: value.todos.length === 0
          ? '(no todos)'
          : `Todo list: ${value.counts.pending} pending, ${value.counts.inProgress} in progress, ${value.counts.completed} completed.`,
      }],
    },
    execute(_args, exec) {
      if (!exec.agent) {
        throw new Error('todo_read requires an owning agent session')
      }
      const todos: readonly TodoItem[] = ctx.sessionProjections.stateOf(exec.agent.session, 'todos') ?? []
      const count = (status: TodoItem['status']): number => todos.filter(t => t.status === status).length
      return Promise.resolve({
        todos: todos.map(todo => ({ content: todo.content, status: todo.status })),
        counts: {
          pending: count('pending'),
          inProgress: count('in_progress'),
          completed: count('completed'),
        },
      })
    },
    presentCall: () => ({ card: 'generic', title: 'Read todo list', kind: 'read' }),
  }))
}
