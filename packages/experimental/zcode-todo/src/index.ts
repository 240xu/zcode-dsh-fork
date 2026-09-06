/**
 * ZCode TodoRead/TodoWrite tools for the zcode agent preset.
 *
 * ZCode 3.10.2 exposes two todo tools: TodoWrite (whole-list replacement
 * where every item carries `content`, `status`, AND `priority`) and TodoRead
 * (read-only view). DSH's `tool-todo` registers only `todo_write` whose items
 * carry no priority — its core type deliberately documents "No id, priority"
 * — so an oracle-shaped write is rejected with INVALID_ARGS even though this
 * preset's own in-prompt ZCode text instructs the model to send `priority`
 * (verified live: `"todos[0].priority" is not a declared property`).
 *
 * This preset-scoped plugin registers the oracle contract for both names
 * (nearer scopes shadow the global `todo_write`, a supported layering):
 * - `todo_write`: oracle schema (priority required), whole-list replacement
 *   with the core validation rules mirrored (trimmed non-empty unique
 *   content; single `in_progress` unless the deployment allows parallel
 *   work), writing the priority-stripped list through the SAME
 *   `todo/write` session event the core projection folds — no new state,
 *   no forked lifecycle — while priorities ride a session-keyed sidecar
 *   (the core `TodoItem` cannot hold them). Returns and renders the oracle
 *   shapes: `{oldTodos, todos, summary}` / its JSON.
 * - `todo_read`: the same shared list with priorities merged back, returning
 *   and rendering the oracle `{todos}` JSON.
 *
 * Equivalence notes (see evidence corpus/todo/priority-round-trip):
 * - Key order in every JSON shape mirrors the observed oracle bytes.
 * - `priority` fallback `medium` applies only to items that reached the
 *   shared list through a non-shadow writer (unreachable in the normal
 *   preset flow, where every model call resolves the shadow); inventing no
 *   data in the observed paths.
 * - Empty-list read renders `{"todos":[]}` (inferred from the result-shape
 *   rule; no empty-read specimen exists yet).
 * @module @deepseek-ai/dsh-zcode-todo
 */

import type { Context } from '@deepseek-ai/cordis'
import { z as zod } from 'zod'
import type { ZodType } from 'zod'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-session-projection'
import type { TodoItem } from '@deepseek-ai/dsh-tool-todo'
import { TOOL_DESCRIPTIONS } from '@deepseek-ai/dsh-zcode-prompt/src/tool-texts.ts'

export const inject = ['tools', 'sessionProjections'] as const

/** ZCode TodoRead description, verbatim from the 3.10.2 evidence. */
export const TODO_READ_DESCRIPTION = 'Read the current session todo list'

const STATUSES = ['pending', 'in_progress', 'completed'] as const
type Status = (typeof STATUSES)[number]

const PRIORITIES = ['high', 'medium', 'low'] as const
export type Priority = (typeof PRIORITIES)[number]

/** Fallback for items that reached the shared list without the shadow. */
const FALLBACK_PRIORITY: Priority = 'medium'

export interface ZcodeTodoConfig {
  /** Mirror of the core row's policy; the preset mounts both with true. */
  readonly allowParallelInProgress?: boolean
}

interface TodoWithPriority {
  readonly content: string
  readonly status: Status
  readonly priority: Priority
}

/** Session-keyed priority sidecar (the core projection cannot hold it). */
const sessionPriorities = new WeakMap<object, Map<string, Priority>>()

function prioritiesOf(session: object): Map<string, Priority> {
  let map = sessionPriorities.get(session)
  if (map === undefined) {
    map = new Map<string, Priority>()
    sessionPriorities.set(session, map)
  }
  return map
}

/** Merge the shared core list with the session sidecar. */
export function withPriorities(
  todos: readonly TodoItem[],
  session: object,
): TodoWithPriority[] {
  const sidecar = sessionPriorities.get(session)
  return todos.map(todo => ({
    content: todo.content,
    status: todo.status,
    priority: sidecar?.get(todo.content) ?? FALLBACK_PRIORITY,
  }))
}

function summarize(todos: readonly TodoWithPriority[]): { total: number; pending: number; inProgress: number; completed: number } {
  const count = (status: Status): number => todos.filter(t => t.status === status).length
  return {
    total: todos.length,
    pending: count('pending'),
    inProgress: count('in_progress'),
    completed: count('completed'),
  }
}

const todoItemProperties = {
  content: { type: 'string', required: true, description: 'Brief description of the task' },
  status: {
    type: 'string',
    required: true,
    enum: [...STATUSES],
    description: 'Current status of the task',
  },
  priority: {
    type: 'string',
    required: true,
    enum: [...PRIORITIES],
    description: 'Priority level of the task',
  },
} as const

export function apply(ctx: Context, config: ZcodeTodoConfig = {}): void {
  // Kept in sync with the preset composition (the only consumer); the
  // single-in_progress rule below must match the deployment policy.
  const allowParallel = config.allowParallelInProgress ?? true

  // The `todos` projection, mirrored from dsh-tool-todo (which this
  // preset-scoped row replaces in the zcode composition — same-scope
  // duplicates throw, so one owner must register projection and tools
  // together): whole list or pre-first-write null; latest `todo/write`
  // wins; cleared by the next turn/start; stateVersion kept identical so
  // persisted sessions keep replaying.
  const todosProjectionSchema: ZodType<TodoItem[] | null> = zod.union([
    zod.array(zod.object({
      content: zod.string(),
      status: zod.union([zod.literal('pending'), zod.literal('in_progress'), zod.literal('completed')]),
    })),
    zod.null(),
  ])
  ctx.sessionProjections.register<'todos', TodoItem[] | null>({
    key: 'todos',
    stateSchema: todosProjectionSchema,
    init: () => null,
    apply: (state, event) => {
      if (event.type === 'todo/write') return event.data.todos
      if (event.type === 'turn/start') return null
      return state
    },
    wire: { viewSchema: todosProjectionSchema, view: state => state },
    stateVersion: 2,
  })

  /** Canonicalize a model-supplied list with the core rules mirrored. */
  const toTodoList = (raw: Array<{ content: string; status: string; priority: string }>): TodoWithPriority[] => {
    const todos: TodoWithPriority[] = []
    const seen = new Set<string>()
    let active = 0
    for (const item of raw) {
      const content = item.content.trim()
      if (content.length === 0) {
        throw new Error('invalid todo: `content` must be a non-empty string')
      }
      if (seen.has(content)) {
        throw new Error(`invalid todos: duplicate content ${JSON.stringify(content)}`)
      }
      seen.add(content)
      if (item.status === 'in_progress') active++
      todos.push({
        content,
        status: item.status as Status,
        priority: item.priority as Priority,
      })
    }
    if (!allowParallel && active > 1) {
      throw new Error(`invalid todos: at most one task may be in_progress (got ${active})`)
    }
    return todos
  }

  const todoWriteDescription = TOOL_DESCRIPTIONS['todo_write']
  if (todoWriteDescription === undefined) throw new Error("zcode-todo: TOOL_DESCRIPTIONS['todo_write'] is missing")

  ctx.tools.register(defineTool({
    name: 'todo_write',
    description: todoWriteDescription,
    parameters: {
      todos: {
        type: 'array',
        required: true,
        description: 'The complete updated todo list. At most one item may be in_progress at a time.',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: { ...todoItemProperties },
        },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          oldTodos: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: { ...todoItemProperties },
            },
          },
          todos: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: { ...todoItemProperties },
            },
          },
          summary: {
            type: 'object',
            additionalProperties: false,
            required: true,
            properties: {
              total: { type: 'integer', required: true },
              pending: { type: 'integer', required: true },
              inProgress: { type: 'integer', required: true },
              completed: { type: 'integer', required: true },
            },
          },
        },
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    execute(args, exec) {
      if (!exec.agent) {
        throw new Error('todo_write requires an owning agent session')
      }
      const todos = toTodoList(args.todos)
      const session = exec.agent.session
      const previous: readonly TodoItem[] = ctx.sessionProjections.stateOf(session, 'todos') ?? []
      const oldTodos = withPriorities(previous, session)
      exec.agent.session.append('todo/write', {
        todos: todos.map(todo => ({ content: todo.content, status: todo.status })),
      })
      const sidecar = prioritiesOf(session)
      sidecar.clear()
      for (const todo of todos) sidecar.set(todo.content, todo.priority)
      const summary = summarize(todos)
      return Promise.resolve({ oldTodos, todos, summary })
    },
    presentCall: args => ({ card: 'generic', title: 'Update todo list', kind: 'other', rawInput: args.todos }),
  }))

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
              properties: { ...todoItemProperties },
            },
          },
        },
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    execute(_args, exec) {
      if (!exec.agent) {
        throw new Error('todo_read requires an owning agent session')
      }
      const todos: readonly TodoItem[] = ctx.sessionProjections.stateOf(exec.agent.session, 'todos') ?? []
      return Promise.resolve({ todos: withPriorities(todos, exec.agent.session) })
    },
    presentCall: () => ({ card: 'generic', title: 'Read todo list', kind: 'read' }),
  }))
}
