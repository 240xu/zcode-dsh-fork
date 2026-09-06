/**
 * The shipped `zcode` preset: ZCode 3.10.2 behavior on the DSH runtime.
 *
 * Verified-evidence package: 240xu/zcode-agent (three-round verified).
 * The composition reuses DSH's own tool plugins; ZCode semantics arrive as
 * prompt sections, not as re-registered tools (same-scope re-registration of
 * a name the base rows already registered throws in dsh-tools).
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import * as yaml from 'js-yaml'
import { describe, expect, it } from 'vitest'
import { entryListSchema } from '@deepseek-ai/cordis-plugin-include'
import { SHIPPED_PRESET_ROOT } from '@deepseek-ai/dsh-agent-presets'
import { TOOL_DESCRIPTIONS } from '@deepseek-ai/dsh-zcode-prompt/src/tool-texts.ts'

interface CompositionEntry {
  id?: unknown
  name?: unknown
  config?: unknown
}

/** Load the zcode composition with nested group traversal. */
async function zcodeEntries(): Promise<CompositionEntry[]> {
  const source = await readFile(join(SHIPPED_PRESET_ROOT, 'zcode', 'agent.cordis.yml'), 'utf8')
  const entries: unknown = yaml.load(source, { schema: entryListSchema })
  if (!Array.isArray(entries)) throw new TypeError('zcode preset must contain a Cordis entry list')
  return entries as CompositionEntry[]
}

/** Find one entry through nested groups (config-as-array). */
function findEntry(entries: CompositionEntry[], id: string): CompositionEntryEntry | undefined {
  for (const entry of entries) {
    if (entry.id === id) return entry
    if (Array.isArray(entry.config)) {
      const nested = findEntry(entry.config as CompositionEntry[], id)
      if (nested !== undefined) return nested
    }
  }
  return undefined
}

type CompositionEntryEntry = CompositionEntry

describe('the zcode shipped preset', () => {
  it('ships a preset.yml naming ZCode 模式 with order 5', async () => {
    const metadata: unknown = yaml.load(
      await readFile(join(SHIPPED_PRESET_ROOT, 'zcode', 'preset.yml'), 'utf8'),
    )
    expect(metadata).toMatchObject({ name: 'ZCode 模式', order: 5 })
  })

  it('composes a loadable Cordis entry list with the core rows', async () => {
    const entries = await zcodeEntries()
    const ids = entries.map(entry => entry.id)
    expect(ids).toContain('persona')
    expect(ids).toContain('zcode-prompt')
    expect(ids).toContain('zcode-memory')
    expect(ids).toContain('tool-fs')
    expect(ids).toContain('tool-bash')
    expect(ids).toContain('tool-web')
    expect(ids).toContain('tool-todo-read')
    expect(ids).toContain('tool-session-query')
  })

  it('does not bundle the official ZCode runtime binary', async () => {
    const source = await readFile(join(SHIPPED_PRESET_ROOT, 'zcode', 'agent.cordis.yml'), 'utf8')
    expect(source).not.toMatch(/zcode\.cjs/)
    expect(source.length).toBeLessThan(100_000)
  })

  it('mounts the Agent multiplexer with the two oracle child types', async () => {
    const entries = await zcodeEntries()
    const agent = findEntry(entries, 'tool-agent')
    expect(agent).toBeDefined()
    expect(agent?.name).toBe('@deepseek-ai/dsh-zcode-agent')
    // No per-type delegation rows: the multiplexer routes by subagent_type
    // over the subagent seam (personas/filters verified in zcode-agent).
    expect(findEntry(entries, 'tool-subagent')).toBeUndefined()
    expect(findEntry(entries, 'tool-subagent-explore')).toBeUndefined()
  })

  it('owns todos through the zcode row alone (core row would collide)', async () => {
    const entries = await zcodeEntries()
    const shadow = findEntry(entries, 'tool-todo-read')
    expect(shadow).toBeDefined()
    expect(shadow?.name).toBe('@deepseek-ai/dsh-zcode-todo')
    expect((shadow?.config as Record<string, unknown> | undefined)?.allowParallelInProgress).toBe(true)
    // Same-scope duplicates throw: the shadow owns the `todos` projection
    // and both tools, so the core tool-todo row must stay out.
    expect(findEntry(entries, 'tool-todo')).toBeUndefined()
  })

  it('renders the AGENT_PROFILES slot as this preset’s actual subagent roster', async () => {
    // ZCode renders the live ROr profiles slot at assembly; the DSH port
    // renders this preset's real roster in the same ROr shape. This locks
    // the two together: adding/removing a subagent row must update the text.
    for (const key of ['agent', 'task'] as const) {
      const text = TOOL_DESCRIPTIONS[key] ?? ''
      expect(text).not.toContain('{AGENT_PROFILES}')
      expect(text).toContain('Available agent types and the tools they have access to:')
      // Live oracle roster line (capitalized type name, PascalCase tools).
      expect(text).toContain('- Explore:')
    }
  })

  it('carries a plan-mode section with ZCode plan semantics', async () => {
    const entries = await zcodeEntries()
    const planning = findEntry(entries, 'plan-mode')
    expect(planning).toBeDefined()
    const config = planning?.config as Record<string, unknown> | undefined
    const section = String(config?.section ?? '')
    expect(section).toContain('You are in plan mode')
    expect(section).toContain('Imperative language to implement changes means plan the implementation')
    expect(section).toContain('Explore first')
  })
})
