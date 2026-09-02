/**
 * zcode-memory plugin: the memory prompt must be the verbatim evidence
 * text (three scopes, MEMORY.md convention) with the root rendered.
 */

import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import * as ZcodeMemory from '@deepseek-ai/dsh-zcode-memory/src/index.ts'
import { MEMORY_PROMPT, renderMemoryPrompt, zcodeMemoryRoot } from '@deepseek-ai/dsh-zcode-memory/src/index.ts'

describe('the memory prompt', () => {
  it('is the verbatim evidence text with the memory types', () => {
    expect(MEMORY_PROMPT.startsWith('# Persistent Agent Memory')).toBe(true)
    expect(MEMORY_PROMPT).toContain('<types>')
    expect(MEMORY_PROMPT).toContain('<name>user</name>')
    expect(MEMORY_PROMPT).toContain('<name>feedback</name>')
    expect(MEMORY_PROMPT).toContain('`MEMORY.md` is an index, not a memory')
    expect(MEMORY_PROMPT.length).toBeGreaterThan(10000)
  })

  it('renders the deployment memory root into every placeholder', () => {
    expect(MEMORY_PROMPT).toContain(zcodeMemoryRoot())
    expect(MEMORY_PROMPT).not.toContain('<MEMORY_ROOT>')
    const custom = renderMemoryPrompt('/custom/root')
    expect(custom).toContain('/custom/root')
    expect(custom).not.toContain('<MEMORY_ROOT>')
  })
})

describe('the plugin row', () => {
  it('registers the zcode:memory section into the registry', async () => {
    const ctx = new Context()
    await ctx.plugin(SystemPrompt, { persona: 'test persona' })
    await ctx.plugin(ZcodeMemory)

    const assembly = await ctx.systemPrompt.assemble({})
    const section = assembly.sections.find(s => s.name === 'zcode:memory')
    expect(section).toBeDefined()
    expect(section?.text).toContain('# Persistent Agent Memory')
    expect(section?.text).toContain(zcodeMemoryRoot())
  })
})
