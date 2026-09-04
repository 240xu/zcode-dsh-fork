/**
 * zcode-memory plugin: the memory prompt must be the verbatim evidence
 * text (three scopes, MEMORY.md convention) with root and scope rendered,
 * plus the live MEMORY.md index — mirroring ZCode's K9r assembly.
 */

import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import * as ZcodeMemory from '@deepseek-ai/dsh-zcode-memory/src/index.ts'
import {
  EMPTY_INDEX_MESSAGE,
  formatBytes,
  formatMemoryIndex,
  MEMORY_PROMPT,
  renderMemoryPrompt,
  sanitizeAgentName,
  SCOPE_GUIDANCE,
  zcodeMemoryRoot,
  zcodeMemoryScope,
} from '@deepseek-ai/dsh-zcode-memory/src/index.ts'

describe('the memory prompt', () => {
  it('is the verbatim evidence text with the memory types', () => {
    expect(MEMORY_PROMPT.startsWith('# Persistent Agent Memory')).toBe(true)
    expect(MEMORY_PROMPT).toContain('<types>')
    expect(MEMORY_PROMPT).toContain('<name>user</name>')
    expect(MEMORY_PROMPT).toContain('<name>feedback</name>')
    expect(MEMORY_PROMPT).toContain('`MEMORY.md` is an index, not a memory')
    expect(MEMORY_PROMPT.length).toBeGreaterThan(10000)
  })

  it('renders the deployment memory root and scope into every placeholder', () => {
    expect(MEMORY_PROMPT).toContain(zcodeMemoryRoot())
    expect(MEMORY_PROMPT).not.toContain('<MEMORY_ROOT>')
    expect(MEMORY_PROMPT).not.toContain('<SCOPE_GUIDANCE>')
    expect(MEMORY_PROMPT).toContain(SCOPE_GUIDANCE[zcodeMemoryScope()])
    const custom = renderMemoryPrompt('/custom/root', 'project', '')
    expect(custom).toContain('/custom/root')
    expect(custom).not.toContain('<MEMORY_ROOT>')
    expect(custom).not.toContain('<SCOPE_GUIDANCE>')
    expect(custom).toContain(SCOPE_GUIDANCE.project)
  })

  it('appends the MEMORY.md index section like the runtime assembly', () => {
    const withIndex = renderMemoryPrompt('/r', 'user', '- [Foo](foo.md) — hook')
    expect(withIndex).toContain('## MEMORY.md')
    expect(withIndex).toContain('- [Foo](foo.md) — hook')
    const empty = renderMemoryPrompt('/r', 'user', '')
    expect(empty).toContain('## MEMORY.md')
    expect(empty).toContain(EMPTY_INDEX_MESSAGE)
  })
})

describe('the scope roots', () => {
  it('follows resolvePersistentAgentMemoryRoot per scope', () => {
    // user → <storageRoot>/agent-memory/<agent>
    expect(zcodeMemoryRoot('user', { storageRoot: '/s', agentName: 'zcode' })).toBe('/s/agent-memory/zcode')
    // project → <workspace>/.zcode/agent-memory/<agent>
    expect(zcodeMemoryRoot('project', { workspaceRoot: '/w', agentName: 'zcode' })).toBe('/w/.zcode/agent-memory/zcode')
    // local → <workspace>/.zcode/agent-memory-local/<agent>
    expect(zcodeMemoryRoot('local', { workspaceRoot: '/w', agentName: 'zcode' })).toBe('/w/.zcode/agent-memory-local/zcode')
  })

  it('sanitizes the agent name like Esi', () => {
    expect(sanitizeAgentName('my agent!')).toBe('my-agent-')
    expect(sanitizeAgentName('')).toBe('unknown')
    expect(sanitizeAgentName('zcode')).toBe('zcode')
  })
})

describe('the index formatter', () => {
  it('strips frontmatter and comments, trims', () => {
    expect(formatMemoryIndex('---\ntitle: x\n---\nhello\n')).toBe('hello')
    expect(formatMemoryIndex('a <!-- c --> b')).toBe('a  b')
    expect(formatMemoryIndex('   \n  ')).toBe('')
  })

  it('caps lines and bytes with the exact WARNING text', () => {
    const long = Array.from({ length: 250 }, (_, i) => `- [T${i}](f${i}.md) — hook`).join('\n')
    const out = formatMemoryIndex(long)
    expect(out).toContain('> WARNING: MEMORY.md is 250 lines (limit: 200). Only part of it was loaded.')
    expect(out.split('\n').length).toBeLessThan(250)
    expect(formatBytes(512)).toBe('512 bytes')
    expect(formatBytes(2048)).toBe('2KB')
    expect(formatBytes(25600)).toBe('25KB')
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
    expect(section?.text).not.toContain('<MEMORY_ROOT>')
    expect(section?.text).not.toContain('<SCOPE_GUIDANCE>')
    expect(section?.text).toContain('## MEMORY.md')
  })
})
