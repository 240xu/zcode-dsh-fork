/**
 * dsh-zcode-agent: oracle Agent multiplexer over DSH's subagent seam.
 *
 * Routing/render/persona unit tests run anywhere. End-to-end delegation
 * (real spawn provider) needs a session-capable host; see
 * delegation.integration.spec.ts (server2/CI).
 */

import { describe, expect, it } from 'vitest'
import { Context, Service } from '@deepseek-ai/cordis'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { TOOL_DESCRIPTIONS } from '@deepseek-ai/dsh-zcode-prompt/src/tool-texts.ts'
import * as tool from '../src/index.ts'
import { CHILD_SHAPES, renderAgentResult, routeAgentType, textOf, unknownAgentTypeError } from '../src/index.ts'
import { EXPLORE_PERSONA, GENERAL_PERSONA } from '../src/personas.ts'

describe('dsh-zcode-agent routing', () => {
  it('routes omitted/general-purpose to general-purpose and Explore to explore', () => {
    expect(routeAgentType(undefined)).toBe('general-purpose')
    expect(routeAgentType('general-purpose')).toBe('general-purpose')
    expect(routeAgentType('Explore')).toBe('Explore')
  })

  it('rejects unknown types with the oracle verbatim error', () => {
    expect(() => routeAgentType('Nope')).toThrow(unknownAgentTypeError('Nope'))
    expect(unknownAgentTypeError('Nope')).toBe("Agent type 'Nope' not found. Available agents: general-purpose, Explore")
  })

  it('textOf concatenates text blocks only', () => {
    expect(textOf([{ type: 'text', text: 'a' }, { type: 'other' }, { type: 'text', text: 'b' }])).toBe('ab')
    expect(textOf('nope')).toBe('')
  })

  it('renders all three result shapes', () => {
    expect(renderAgentResult({ kind: 'foreground', runId: 'r1', output: [{ type: 'text', text: 'hi' }] }))
      .toEqual([{ type: 'text', text: "hi\nagentId: r1 (use send_message with agent_id 'r1' to continue this agent)" }])
    expect(renderAgentResult({ kind: 'background', backgroundTaskId: 'bash-1' }))
      .toEqual([{ type: 'text', text: 'Agent running in background with ID: bash-1. You will be notified when it completes.' }])
    expect(renderAgentResult({ kind: 'continuable', subagentId: 's1' }))
      .toEqual([{ type: 'text', text: "Agent running with ID: s1 (use send_message with agent_id 's1' to continue this agent)" }])
  })
})

describe('dsh-zcode-agent child shapes', () => {
  it('explore keeps the live allowlist and one-shot mode', () => {
    expect(CHILD_SHAPES.Explore.toolFilter.allow).toEqual(['bash', 'read', 'web_fetch', 'todo_write'])
    expect(CHILD_SHAPES.Explore.continuable).toBe(false)
  })

  it('general-purpose keeps the live 9-tool filter and continuable mode', () => {
    expect(CHILD_SHAPES['general-purpose'].toolFilter.allow).toEqual(
      ['ask_user_question', 'bash', 'edit', 'read', 'skill', 'todo_write', 'web_fetch', 'write'],
    )
    expect(CHILD_SHAPES['general-purpose'].continuable).toBe(true)
  })

  it('personas carry the live identity prefix and read-only core', () => {
    for (const persona of [EXPLORE_PERSONA, GENERAL_PERSONA]) {
      expect(persona.startsWith('You are ZCode, an interactive coding agent\n')).toBe(true)
      expect(persona).toContain('only use absolute file paths')
      expect(persona).not.toContain('<env>')
    }
    expect(EXPLORE_PERSONA).toContain('READ-ONLY MODE - NO FILE MODIFICATIONS')
    expect(EXPLORE_PERSONA).toContain('Use `find` via Bash for broad file pattern matching')
  })
})

describe('dsh-zcode-agent registration', () => {
  it('registers `agent` with the oracle description and schema keys', async () => {
    const ctx = new Context()
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(class extends Service {
      constructor(ctx: Context) { super(ctx, 'subagents') }
    })
    await ctx.plugin(tool)
    const schema = ctx.tools.schemas().find(s => s.name === 'agent')
    expect(schema).toBeDefined()
    expect(schema!.description).toBe(TOOL_DESCRIPTIONS['agent'])
    expect(Object.keys(schema!.parameters.properties)).toEqual(
      expect.arrayContaining(['description', 'prompt', 'subagent_type', 'run_in_background']),
    )
  })
})
