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

describe('the zcode shipped preset', () => {
  it('ships a preset.yml naming ZCode 模式 with order 5', async () => {
    const metadata: unknown = yaml.load(
      await readFile(join(SHIPPED_PRESET_ROOT, 'zcode', 'preset.yml'), 'utf8'),
    )
    expect(metadata).toMatchObject({ name: 'ZCode 模式', order: 5 })
  })

  it('composes a loadable Cordis entry list', async () => {
    const source = await readFile(join(SHIPPED_PRESET_ROOT, 'zcode', 'agent.cordis.yml'), 'utf8')
    const entries: unknown = yaml.load(source, { schema: entryListSchema })
    expect(Array.isArray(entries)).toBe(true)
    const ids = (entries as Array<{ id?: unknown }>).map(entry => entry.id)
    expect(ids).toContain('persona')
  })

  it('does not bundle the official zcode runtime binary', async () => {
    const source = await readFile(join(SHIPPED_PRESET_ROOT, 'zcode', 'agent.cordis.yml'), 'utf8')
    expect(source).not.toMatch(/zcode\.cjs/)
    expect(source.length).toBeLessThan(100_000)
  })
})
