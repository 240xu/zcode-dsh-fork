/**
 * zcode-memory plugin: the memory prompt must be the verbatim evidence
 * text (three scopes, MEMORY.md convention) with root and scope rendered,
 * plus the live MEMORY.md index — mirroring ZCode's K9r assembly.
 */

import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath as fileURLToPathLib } from 'node:url'
import { homedir } from 'node:os'
import { Context } from '@deepseek-ai/cordis'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import * as ZcodeMemory from '@deepseek-ai/dsh-zcode-memory/src/index.ts'
import {
  EMPTY_INDEX_MESSAGE,
  formatBytes,
  formatMemoryIndex,
  MEMORY_INDEX_MAX_BYTES,
  MEMORY_PROMPT,
  readMemoryIndex,
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
    expect(formatBytes(5 * 1024 * 1024)).toBe('5MB')
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe('2GB')
    expect(formatBytes(1536)).toBe('1.5KB')
  })

  it('warns with both counts when lines and bytes are both over', () => {
    const big = Array.from({ length: 250 }, (_, i) => `- [${'T'.repeat(200)}${i}](f${i}.md) — hook`).join('\n')
    const out = formatMemoryIndex(big)
    expect(out).toContain('> WARNING: MEMORY.md is 250 lines and')
    expect(out).toContain('Only part of it was loaded.')
  })

  it('cuts at the byte budget on a newline boundary when no line cap trips', () => {
    const lines = Array.from({ length: 100 }, (_, i) => `- [${'x'.repeat(300)}${i}](f.md)`)
    const out = formatMemoryIndex(lines.join('\n'))
    expect(out).toContain('index entries are too long')
    // every surviving line is whole (cut happened at a newline)
    for (const line of out.split('\n')) {
      if (line.startsWith('- [')) expect(line).toContain('](f.md)')
    }
  })

  it('cuts mid-line at the byte budget when no newline is in range', () => {
    const out = formatMemoryIndex('x'.repeat(30000))
    expect(out).toContain('index entries are too long')
    const body = out.split('\n\n> WARNING:')[0] ?? ''
    expect(body.length).toBe(MEMORY_INDEX_MAX_BYTES)
  })
})

describe('scope and roots', () => {
  const OLD_ENV = { ...process.env }

  it('falls back to user scope with a warning on an unrecognized value', () => {
    process.env.ZCODE_MEMORY_SCOPE = 'bogus'
    const warned: string[] = []
    const orig = console.warn
    console.warn = (msg: string) => { warned.push(msg) }
    try {
      expect(zcodeMemoryScope()).toBe('user')
      // second invalid call: covers the already-warned (no repeat warning) path
      expect(zcodeMemoryScope()).toBe('user')
    } finally {
      console.warn = orig
      process.env = { ...OLD_ENV }
    }
    expect(warned.join('\n')).toContain('ZCODE_MEMORY_SCOPE')
  })

  it('prefers ZCODE_MEMORY_HOME over ZCODE_STORAGE_DIR over ~/.zcode', () => {
    process.env = { ...OLD_ENV, ZCODE_MEMORY_HOME: '/m', ZCODE_STORAGE_DIR: '/s' }
    expect(zcodeMemoryRoot('user')).toBe('/m/agent-memory/zcode')
    process.env = { ...OLD_ENV, ZCODE_STORAGE_DIR: '/s' }
    delete process.env.ZCODE_MEMORY_HOME
    expect(zcodeMemoryRoot('user')).toBe('/s/agent-memory/zcode')
    process.env = { ...OLD_ENV }
    delete process.env.ZCODE_MEMORY_HOME
    delete process.env.ZCODE_STORAGE_DIR
    expect(zcodeMemoryRoot('user')).toBe(`${homedir()}/.zcode/agent-memory/zcode`)
    // project/local without an explicit workspace fall back to the cwd
    expect(zcodeMemoryRoot('project', { agentName: 'zcode' })).toBe(`${process.cwd()}/.zcode/agent-memory/zcode`)
  })

  it('treats any unreadable index as empty, mirroring the runtime catch-all', () => {
    // ZCode's loader swallows every read error the same way; the port keeps
    // that behavior deliberately (strict equivalence), locked here with a
    // non-ENOENT failure (ENOTDIR: a file used as the root directory).
    expect(readMemoryIndex(fileURLToPathLib(import.meta.url))).toBe('')
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

const describeIfBuilt = existsSync(join(dirname(fileURLToPathLib(import.meta.url)), '..', 'lib', 'index.js'))
  ? describe
  : describe.skip
describeIfBuilt('the built package entry', () => {
  it('loads its txt assets beside lib/index.js', async () => {
    // Locks the publish-shape finding: src tests pass via the tsconfig src
    // alias, but consumers resolve main -> lib/index.js, which reads the txt
    // beside itself. Fails with ENOENT if the asset is not shipped/copied.
    const built = // @ts-expect-error -- built lib/index.js ships without adjacent declarations; the cast below restores types
    await import('../lib/index.js') as typeof import('@deepseek-ai/dsh-zcode-memory/src/index.ts')
    expect(built.MEMORY_PROMPT).toContain('# Persistent Agent Memory')
    expect(built.MEMORY_PROMPT).toContain('## MEMORY.md')
  })
})
