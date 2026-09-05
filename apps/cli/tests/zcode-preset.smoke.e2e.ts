/**
 * Runtime smoke of the zcode preset on platforms whose native add-ons are
 * unavailable (Termux/android-arm64: sharp, pty, landlock). The full
 * `web-agent-presets.e2e.ts` boots the complete base bundle and cannot load
 * here at all — this suite boots the same real composition MINUS the three
 * rows that carry those add-ons, then mounts the shipped zcode preset and
 * asserts the assembled agent surface: persona, the three evidence-backed
 * sections, the DSH tool catalog, and the Explore subagent entry.
 *
 * What this suite deliberately does NOT prove: subprocess/sandbox/attachment
 * execution paths. Those rows are disabled identically for every preset this
 * way; what it does prove is the zcode composition itself — prompt assembly
 * and the tool/subagent catalog — through the real boot path.
 */

import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { boot, healProfilesModuleFallback, loadOverlayPatches } from '@deepseek-ai/dsh-app-boot'
import { provideCmdline } from '@deepseek-ai/dsh-cmdline'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { PatchOptions } from '@deepseek-ai/cordis-plugin-include'
import type {} from '@deepseek-ai/dsh-agent-presets'
import type {} from '@deepseek-ai/dsh-tools'
import { disablePresetRow } from './zcode-preset-e2e-helpers.ts'

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url))
const BASE_PATCH = join(REPO_ROOT, 'packages/bundle/base/cordis.patch.yml')
const WEB_PATCH = join(REPO_ROOT, 'packages/bundle/web-app/cordis.patch.yml')
const INSTALL_ANCHOR = join(REPO_ROOT, 'apps/cli/package.json')

let ctx: Context



beforeAll(async () => {
  const home = await mkdtemp(join(tmpdir(), 'zcode-smoke-'))
  const settingsFile = join(home, 'settings.yaml')
  await writeFile(settingsFile, '{}\n')

  // The shipped zcode composition, verbatim except the two rows whose executors
  // need the subprocess/shell services this platform cannot host (node-pty and
  // landlock have no android-arm64 builds). Everything asserted below — persona,
  // the three evidence sections, the tool catalog minus those two, the Explore
  // entry — rides the real discovery/mount/loader path over this root.
  const userRoot = join(home, 'presets')
  const zcodeDir = join(userRoot, 'zcode')
  await mkdir(zcodeDir, { recursive: true })
  const shipped = await readFile(
    join(REPO_ROOT, 'packages/preset/agent-presets/presets/zcode/agent.cordis.yml'),
    'utf8',
  )
  const composition = disablePresetRow(
    disablePresetRow(shipped, 'tool-bash'),
    'tool-fs-search',
  )
  await writeFile(join(zcodeDir, 'agent.cordis.yml'), composition)
  await writeFile(
    join(zcodeDir, 'preset.yml'),
    await readFile(join(REPO_ROOT, 'packages/preset/agent-presets/presets/zcode/preset.yml'), 'utf8'),
  )

  const overrides: PatchOptions[] = [
    { id: 'settings', config: { path: settingsFile, watch: false } },
    { id: 'storage-json', config: { root: join(dirname(settingsFile), 'storages') } },
    { id: 'webserver', disabled: true },
    { id: 'web-runtime', disabled: true },
    { id: 'session-telemetry-otel', disabled: true },
    { id: 'modules', disabled: true },
    { id: 'connection', disabled: true },
    { id: 'session-log-download', disabled: true },
    { id: 'client-hmr', disabled: true },
    { id: 'directory-picker', disabled: true },
    // Native add-ons unavailable on this platform (the full e2e bundle fails
    // to import them): image processing, PTY subprocesses, landlock sandbox.
    // None of these rows decide the zcode composition this suite asserts.
    { id: 'attachment-local', disabled: true },
    { id: 'subprocess', disabled: true },
    { id: 'sandbox', disabled: true },
    // Downstream consumers of the disabled rows above; their Bash/permission/
    // attachment execution paths are exactly what this suite does NOT cover.
    { id: 'bash-sandbox', disabled: true },
    { id: 'permission', disabled: true },
    { id: 'session-controller', disabled: true },
    // The rewritten zcode composition lives in a user root below, so the
    // shipped copy (with the two platform-blocked rows) must not shadow it.
    { id: 'agent-presets', config: {
      default: 'zcode',
      includeShippedRoot: false,
      includeUserRoot: false,
      roots: [{ path: userRoot, trust: 'user' }],
    } },
  ]

  await healProfilesModuleFallback({ installAnchor: INSTALL_ANCHOR, home })
  const profileDir = join(home, 'profiles', 'spec')
  await mkdir(profileDir, { recursive: true })
  // The two zcode packages are devDependencies of the cli install anchor, so
  // the module fallback the heal above maintains resolves their bare names —
  // the same path every shipped preset plugin takes.
  const bundlePatches: PatchOptions[] = [
    ...loadOverlayPatches('dsh-test', BASE_PATCH),
    ...loadOverlayPatches('dsh-test', WEB_PATCH),
  ]
  const rootConfig = join(profileDir, 'cordis.yml')
  await writeFile(rootConfig, '[]\n')
  ctx = await boot('dsh-test', rootConfig, [...bundlePatches, ...overrides], bootCtx => {
    provideCmdline(bootCtx, { args: [], exit: () => {} })
  })
}, 120_000)

describe('the zcode preset on a native-addon-less boot', () => {
  it('is the roster default and mounts through the real composition', async () => {
    expect(ctx.agentPresets.defaultId).toBe('zcode')
  })

  it('composes the ZCode persona, three evidence sections, tool catalog, and Explore subagent', async () => {
    const handle = await ctx.agents.create({
      sessionId: SessionId('zcode-smoke'),
      meta: { agentPreset: 'zcode' },
      setup: agentCtx => ctx.agentPresets.mount(agentCtx, 'zcode').then(() => undefined),
    })
    try {
      expect(handle.agent.session.header.agentPreset).toBe('zcode')

      const assembly = await ctx.systemPrompt.assemble({ scope: handle.agent })
      const names = assembly.sections.map(section => section.name)

      const persona = assembly.sections.find(section => section.name === 'deployment:persona')?.text ?? ''
      expect(persona).toContain('You are ZCode, an interactive coding agent running on DeepSeek Harness')
      expect(persona).toContain('interactive ZCode agent that helps users with software engineering tasks')

      expect(names).toContain('zcode:behavior')
      expect(names).toContain('zcode:memory')
      expect(names).toContain('zcode:tool-semantics')

      const behavior = assembly.sections.find(section => section.name === 'zcode:behavior')?.text ?? ''
      expect(behavior).toContain('# Harness')
      expect(behavior).toContain('Tools run behind a user-selected permission mode')
      expect(behavior).toContain('Your text output is what the user reads')

      const memory = assembly.sections.find(section => section.name === 'zcode:memory')?.text ?? ''
      expect(memory).toContain('# Persistent Agent Memory')
      // Scope-resolved root per resolvePersistentAgentMemoryRoot
      // (user scope: <storageRoot>/agent-memory/<agent>)
      expect(memory).toContain('agent-memory')
      expect(memory).not.toContain('<MEMORY_ROOT>')
      expect(memory).not.toContain('<SCOPE_GUIDANCE>')
      expect(memory).toContain('## MEMORY.md')

      const cliPrefix = assembly.sections.find(section => section.name === 'zcode:cli-prefix')?.text ?? ''
      expect(cliPrefix).toBe('You are ZCode, an interactive coding agent')

      const env = assembly.sections.find(section => section.name === 'zcode:env')?.text ?? ''
      expect(env).toContain('# Environment')
      expect(env).toContain('You have been invoked in the following environment:')
      expect(env).toContain('- Primary working directory: ')

      const date = assembly.sections.find(section => section.name === 'zcode:date')?.text ?? ''
      expect(date).toMatch(/^# currentDate\nToday's date is \d{4}-\d{2}-\d{2}\.$/)

      const context = assembly.sections.find(section => section.name === 'zcode:context')?.text ?? ''
      expect(context).toContain('# Context management')
      expect(context).toContain('When you have enough information to act, act.')

      const semantics = assembly.sections.find(section => section.name === 'zcode:tool-semantics')?.text ?? ''
      expect(semantics).toContain('## Read')
      expect(semantics).toContain('## Bash')
      expect(semantics).toContain('Launch a new agent to handle complex, multi-step tasks.')
      expect(semantics).toContain('## ZCode tools mapped to DSH equivalents')

      const catalog = ctx.tools.schemas(handle.agent).map(schema => schema.name).sort()
      // Minus the platform-blocked executors: bash, and tool-fs-search's
      // rg-backed glob/grep pair.
      for (const expected of ['edit', 'read', 'write', 'todo_read', 'todo_write']) {
        expect(catalog).toContain(expected)
      }
      expect(catalog).not.toContain('bash')
      expect(catalog).not.toContain('glob')
      expect(catalog).toContain('explore')
    } finally {
      await handle.dispose()
    }
  })
})
