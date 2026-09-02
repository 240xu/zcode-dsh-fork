/**
 * The shipped `zcode` preset: ZCode 3.10.2 behavior on the DSH runtime.
 *
 * Verified-evidence package: 240xu/zcode-3102-evidence (three-round verified).
 * The composition reuses DSH's own tool plugins; ZCode semantics arrive as
 * prompt sections, not as re-registered tools (same-scope re-registration of
 * a name the base rows already registered throws in dsh-tools).
 */

import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as yaml from 'js-yaml'
import { describe, expect, it } from 'vitest'
import { entryListSchema } from '@deepseek-ai/cordis-plugin-include'
import { SHIPPED_PRESET_ROOT } from '@deepseek-ai/dsh-agent-presets'

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
  })

  it('does not bundle the official ZCode runtime binary', async () => {
    const source = await readFile(join(SHIPPED_PRESET_ROOT, 'zcode', 'agent.cordis.yml'), 'utf8')
    expect(source).not.toMatch(/zcode\.cjs/)
    expect(source.length).toBeLessThan(100_000)
  })

  it('registers the Explore subagent with ZCode read-only persona and tool filter', async () => {
    const entries = await zcodeEntries()
    const explore = findEntry(entries, 'tool-subagent-explore')
    expect(explore).toBeDefined()
    const config = explore?.config as Record<string, unknown> | undefined
    expect(config?.toolName).toBe('explore')
    expect(config?.provider).toBe('spawn')
    // ZCode Explore persona anchors (byte-verified evidence)
    const persona = String(config?.persona ?? '')
    expect(persona).toContain('You are ZCode Explore')
    expect(persona).toContain('READ-ONLY MODE - NO FILE MODIFICATIONS')
    // Read-only tool filter on DSH tool names
    const filter = config?.toolFilter as Record<string, unknown> | undefined
    expect(filter?.allow).toEqual(['bash', 'glob', 'grep', 'read', 'web_fetch', 'web_search', 'todo'])
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
