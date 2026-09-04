/**
 * zcode-prompt plugin: the behavior section must carry the byte-verified
 * ZCode anchor strings, and the tool-semantics section must surface all
 * fifteen direct-map ZCode tool descriptions with their real first lines.
 */

import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath as fileURLToPathLib } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import * as ZcodePrompt from '@deepseek-ai/dsh-zcode-prompt/src/index.ts'
import { BEHAVIOR_TEXT } from '@deepseek-ai/dsh-zcode-prompt/src/behavior-text.ts'
import { trimFirstSentence } from '@deepseek-ai/dsh-zcode-prompt/src/behavior-text.ts'
import { TOOL_DESCRIPTIONS } from '@deepseek-ai/dsh-zcode-prompt/src/tool-texts.ts'

describe('the behavior text', () => {
  it('carries the bundle-verified ZCode anchor strings', () => {
    // identity-section-3.10.2.txt (# Harness block)
    expect(BEHAVIOR_TEXT).toContain('Text you output outside of tool use is displayed to the user')
    expect(BEHAVIOR_TEXT).toContain('Tools run behind a user-selected permission mode')
    expect(BEHAVIOR_TEXT).toContain('Prefer the dedicated file/search tools over shell commands')
    expect(BEHAVIOR_TEXT).toContain('Reference code as `file_path:line_number`')
    // dynamic-behavior-3.10.2.txt
    expect(BEHAVIOR_TEXT).toContain('Your text output is what the user reads')
    expect(BEHAVIOR_TEXT).toContain('Write code that reads like the surrounding code')
    expect(BEHAVIOR_TEXT).toContain('Only write a code comment to state a constraint')
  })

  it('does not duplicate the persona identity sentence', () => {
    expect(BEHAVIOR_TEXT.startsWith('You are an interactive ZCode agent')).toBe(false)
  })

  it('trims the identity first sentence only when present', () => {
    expect(trimFirstSentence('You are an interactive ZCode agent that helps users with software engineering tasks.\nRest')).toBe('Rest')
    expect(trimFirstSentence('Unrelated text')).toBe('Unrelated text')
  })
})

describe('the tool descriptions', () => {
  it('covers the fifteen direct-map tools with ZCode first lines', () => {
    const expected: Record<string, string> = {
      read: 'Reads a file from the local filesystem.',
      write: 'Writes a file to the local filesystem, overwriting if one exists.',
      edit: 'Performs exact string replacement in a file.',
      glob: 'Fast file pattern matching. Supports glob patterns like',
      grep: 'Content search built on ripgrep.',
      web_fetch: 'Fetches a URL, converts the page to markdown, and answers `prompt` against it using a small fast model.',
      web_search: 'Search the web. Returns result blocks with titles and URLs. US-only.',
      todo_read: 'Read the current session todo list',
      todo_write: 'Create and update a task list for the current session.',
      skill: 'Execute a skill within the main conversation',
      bash: 'Executes a bash command and returns its output.',
      agent: 'Launch a new agent to handle complex, multi-step tasks.',
      task: 'Claude Code-compatible alias for the Agent tool.',
      goal_read: 'Reads the current session goal state.',
      ask_user_question: 'Use this tool only when you are blocked on a decision',
    }
    expect(Object.keys(TOOL_DESCRIPTIONS)).toHaveLength(15)
    for (const [name, firstLine] of Object.entries(expected)) {
      expect(TOOL_DESCRIPTIONS[name]).toBeTruthy()
      expect(TOOL_DESCRIPTIONS[name]!.startsWith(firstLine)).toBe(true)
    }
  })
})

describe('the context text', () => {
  it('carries the bundle-verified Context Management anchors', async () => {
    const ctx = new Context()
    await ctx.plugin(SystemPrompt, { persona: 'test persona' })
    await ctx.plugin(ZcodePrompt)

    const assembly = await ctx.systemPrompt.assemble({})
    const section = assembly.sections.find(s => s.name === 'zcode:context')
    expect(section).toBeDefined()
    // WSr.default
    expect(section?.text).toContain('# Context management')
    expect(section?.text).toContain('you don\'t need to wrap up early or hand off mid-task')
    // WSr.additional autonomy guidance
    expect(section?.text).toContain('When you have enough information to act, act.')
    expect(section?.text).toContain('You are operating autonomously.')
    expect(section?.text).toContain('Before ending your turn, check your last paragraph.')
    expect(section?.text).toContain('check that the evidence actually supports that specific action')
    // No unresolved runtime templates; size guard against swallowed source
    expect(section?.text).not.toMatch(/\$\{[a-zA-Z]/)
    expect(section?.text.length).toBeLessThan(5000)
  })
})

describe('the plugin rows', () => {
  it('registers both sections into the system prompt registry', async () => {
    const ctx = new Context()
    await ctx.plugin(SystemPrompt, { persona: 'test persona' })
    await ctx.plugin(ZcodePrompt)

    const assembly = await ctx.systemPrompt.assemble({})
    const names = assembly.sections.map(section => section.name)
    expect(names).toContain('zcode:behavior')
    expect(names).toContain('zcode:context')
    expect(names).toContain('zcode:tool-semantics')

    const behavior = assembly.sections.find(section => section.name === 'zcode:behavior')
    expect(behavior?.text).toContain('# Harness')
    const semantics = assembly.sections.find(section => section.name === 'zcode:tool-semantics')
    expect(semantics?.text).toContain('## Read')
    expect(semantics?.text).toContain('## Bash')
    expect(semantics?.text).toContain('ZCode parameter')
    // Mapped-tool notes for ZCode tools without a DSH counterpart row
    expect(semantics?.text).toContain('## ZCode tools mapped to DSH equivalents')
    expect(semantics?.text).toContain('`EnterPlanMode` / `ExitPlanMode`')
    expect(semantics?.text).toContain('`TaskOutput` is DEPRECATED')
    expect(semantics?.text).toContain('`ApplyPatch`')
    expect(semantics?.text).toContain('`ReadSessionContext`')
    // Session guidance on the skill note
    expect(semantics?.text).toContain('when the user types `/<skill-name>`, invoke it via Skill')

    // Size guard: the whole tool-semantics section is ~9-11 KB of curated
    // text. An unterminated string literal in the evidence extraction once
    // silently embedded megabytes of the bundled runtime source here, which
    // no existence-based assertion catches. Both sections must stay far
    // below any threshold that could indicate swallowed source code.
    const totalSemantics = semantics?.text.length ?? 0
    const totalBehavior = behavior?.text.length ?? 0
    expect(totalSemantics).toBeLessThan(20_000)
    expect(totalBehavior).toBeLessThan(20_000)
    for (const description of Object.values(TOOL_DESCRIPTIONS)) {
      expect(description.length).toBeLessThan(4_000)
      expect(description).not.toContain('"use strict"')
      expect(description).not.toContain('function ')
    }
  })
})

const describeIfBuilt = existsSync(join(dirname(fileURLToPathLib(import.meta.url)), '..', 'lib', 'index.js'))
  ? describe
  : describe.skip
describeIfBuilt('the built package entry', () => {
  it('loads its txt assets beside lib/index.js', async () => {
    // Same publish-shape lock as the memory package: the built entry must
    // find identity/behavior/context txt files next to itself.
    const built = // @ts-expect-error -- built lib/index.js ships without adjacent declarations; the cast below restores types
    await import('../lib/index.js') as typeof import('@deepseek-ai/dsh-zcode-prompt/src/index.ts')
    // Import success alone is the lock: the entry top-level-awaits three
    // txt reads beside itself and rejects with ENOENT when they are absent.
    expect(typeof built.apply).toBe('function')
  })
})
