/**
 * Live-LLM end-to-end of the zcode preset: real boot, real composition, real
 * network request through the `deepseek-official` adapter pointed at an
 * OpenAI-compatible gateway, and a real model answer from an agent whose
 * persona and sections are the zcode composition.
 *
 * Platform constraints (Termux/android-arm64) are identical to the smoke
 * suite: rows whose executors need native add-ons stay disabled, and
 * tool-bash / tool-fs-search rows inside the composition are disabled too.
 * What this adds over the smoke is the agent loop itself: prompt assembly
 * (persona + three zcode sections) is sent to a live model, the reply is
 * received over the wire, and the session records a completed turn.
 *
 * Environment:
 *   ZCODE_LIVE_KEY      API key for the gateway (required)
 *   ZCODE_LIVE_BASE     gateway base, default https://ai.sepic.space/v1
 *   ZCODE_LIVE_MODEL    model id, default qwen3.7-plus-fast
 *   ZCODE_LIVE_TASK     task text override
 */

import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { boot, healProfilesModuleFallback, loadOverlayPatches } from '@deepseek-ai/dsh-app-boot'
import { provideCmdline } from '@deepseek-ai/dsh-cmdline'
import { SessionId } from '@deepseek-ai/dsh-session'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { installModelSelection } from '@deepseek-ai/dsh-agent'
import type { PatchOptions } from '@deepseek-ai/cordis-plugin-include'
import type {} from '@deepseek-ai/dsh-agent-presets'
import type {} from '@deepseek-ai/dsh-tools'
import { disablePresetRow } from './zcode-preset-e2e-helpers.ts'

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url))
const BASE_PATCH = join(REPO_ROOT, 'packages/bundle/base/cordis.patch.yml')
const WEB_PATCH = join(REPO_ROOT, 'packages/bundle/web-app/cordis.patch.yml')
const INSTALL_ANCHOR = join(REPO_ROOT, 'apps/cli/package.json')

const API_KEY = process.env.ZCODE_LIVE_KEY ?? ''
const BASE_URL = process.env.ZCODE_LIVE_BASE ?? 'https://ai.sepic.space/v1'
const MODEL = process.env.ZCODE_LIVE_MODEL ?? 'qwen3.7-plus-fast'
const TASK
  = process.env.ZCODE_LIVE_TASK
    ?? 'Without using any tools, answer in one short sentence: which permission modes does the user choose between?'

// Termux (android, selinux) denies hard links on every filesystem the process
// can see, so the persistence backend's atomic link()-publish would abort the
// live turn mid-flight on this platform. This suite is single-process by
// construction, so the EEXIST protection link() exists to provide cannot race
// here and rename() is a faithful stand-in. On platforms where link works the
// mock is a transparent passthrough.
vi.mock('node:fs/promises', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  const linkProbe = async (): Promise<boolean> => {
    try {
      const dir = await actual.mkdtemp(join(tmpdir(), 'link-probe-'))
      const a = join(dir, 'a')
      await actual.writeFile(a, 'x')
      await actual.link(a, join(dir, 'b'))
      await actual.rm(dir, { recursive: true, force: true })
      return true
    } catch {
      return false
    }
  }
  const hardLinksWork = await linkProbe()
  if (hardLinksWork) return actual
  console.log('[zcode-live] hard links unavailable on this platform; link() is mocked to rename() for this process only')
  return {
    ...actual,
    link: (async (from: string, to: string) => {
      await actual.rename(from, to)
    }) as typeof actual.link,
  }
})

let ctx: Context



beforeAll(async () => {
  const home = await mkdtemp(join(tmpdir(), 'zcode-live-'))
  const settingsFile = join(home, 'settings.yaml')
  await writeFile(settingsFile, [
    'llm-deepseek:',
    '  baseURL: ' + JSON.stringify(BASE_URL),
    '  apiKeyEnv: ZCODE_LIVE_KEY',
    // The live gateway's model answers with empty content when a reasoning
    // effort is forced; `off` keeps this about the zcode prompt, not the pool.
    "  reasoningEffort: 'off'",
    '  models:',
    `    - id: ${JSON.stringify(MODEL)}`,
    `      name: ${JSON.stringify(`${MODEL} (live gateway)`)}`,
    '      contextWindow: 131072',
    '      maxTokens: 8192',
    '',
  ].join('\n'))
  process.env.ZCODE_LIVE_KEY = API_KEY

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
    // Session persistence stays ACTIVE: its live writes are background-batched
    // and a materialization failure lands in reportBackgroundFailure, not in
    // the agent loop. On Termux (no hard links anywhere) those background
    // writes log EACCES noise; on normal platforms they write real logs.
    { id: 'webserver', disabled: true },
    { id: 'web-runtime', disabled: true },
    { id: 'session-telemetry-otel', disabled: true },
    { id: 'modules', disabled: true },
    { id: 'connection', disabled: true },
    { id: 'session-log-download', disabled: true },
    { id: 'client-hmr', disabled: true },
    { id: 'directory-picker', disabled: true },
    { id: 'attachment-local', disabled: true },
    { id: 'subprocess', disabled: true },
    { id: 'sandbox', disabled: true },
    { id: 'bash-sandbox', disabled: true },
    { id: 'permission', disabled: true },
    { id: 'session-controller', disabled: true },
    { id: 'session-persistence-jsonl', config: { root: join(dirname(settingsFile), 'sessions') } },
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

describe.skipIf(API_KEY === '')('the zcode preset against a live model', () => {
  it('answers a real task with the zcode composition mounted', async () => {
    expect(ctx.agentPresets.defaultId).toBe('zcode')

    const selection = { provider: 'deepseek-official', model: MODEL }
    const handle = await ctx.agents.create({
      sessionId: SessionId(`zcode-live-${randomUUID().slice(0, 8)}`),
      meta: { agentPreset: 'zcode', cwd: process.cwd() },
      agentOptions: selection,
      setup: agentCtx => Promise.all([
        ctx.agentPresets.mount(agentCtx, 'zcode').then(() => undefined),
        Promise.resolve(installModelSelection(agentCtx, {
          current: selection,
          assembled: undefined,
        })),
      ]).then(() => undefined),
    })
    try {
      const agent = handle.agent
      await agent.whenIdle()
      const withTimeout = <T>(p: Promise<T>, ms: number, label: string): Promise<T> =>
        Promise.race([
          p,
          new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} exceeded ${ms}ms`)), ms)),
        ])

      // The assembled prompt this agent will really send: zcode persona plus
      // the three evidence sections, through the same assembly the smoke suite
      // asserts. Asserting here proves the LIVE request carries the port.
      const assembly = await ctx.systemPrompt.assemble({ scope: agent })
      const names = assembly.sections.map(s => s.name)
      expect(names).toContain('deployment:persona')
      expect(names).toContain('zcode:cli-prefix')
      expect(names).toContain('zcode:behavior')
      expect(names).toContain('zcode:context')
      expect(names).toContain('zcode:env')
      expect(names).toContain('zcode:memory')
      expect(names).toContain('zcode:date')
      expect(names).toContain('zcode:tool-semantics')

      const firstSeq = agent.session.seq
      agent.followup(createUserMessage({
        content: [{ type: 'text', text: TASK }],
        source: { kind: 'user' },
      }))
      await withTimeout(agent.whenIdle(), 240_000, 'initial whenIdle')

      const { SessionSeq } = await import('@deepseek-ai/dsh-session')

      // The public gateway fronts free web pools and returns 502/503 under
      // load. Retry the whole turn on a provider-side error; the composition
      // under test is the prompt, not the pool's bad afternoon.
      const summarizeTurn = (): { text: string; reason: { kind: string; error?: { message?: string } } | undefined } => {
        let started = false
        let text = ''
        let reason: { kind: string; error?: { message?: string } } | undefined
        const length = agent.session.seq
        for (let seq = firstSeq; seq < length; seq++) {
          const event = agent.session.eventAt(SessionSeq(seq))
          if (event === undefined) break
          if (event.type === 'turn/start') { started = true; continue }
          if (!started) continue
          if (event.type === 'assistant/message') {
            const joined = (event.data.message.content as Array<{ type: string; text?: string }>)
              .filter(block => block.type === 'text')
              .map(block => block.text ?? '')
              .join('')
            if (joined !== '') text = joined
          }
          if (event.type === 'turn/end') reason = event.data.reason as { kind: string; error?: { message?: string } }
        }
        return { text, reason }
      }

      let outcome = summarizeTurn()
      if (outcome.reason === undefined || outcome.reason.kind === 'error') {
        // Gateway flakes (502/503/524 on free pools): exponential backoff
        // with jitter, bounded at four retries. Kept flat-free on purpose —
        // fixed sleeps synchronized retries into the pool's bad minutes.
        for (let attempt = 0; attempt < 4; attempt++) {
          const delay = Math.min(5000 * 2 ** attempt, 40000) + Math.floor(Math.random() * 2000)
          await new Promise(resolve => setTimeout(resolve, delay))
          agent.followup(createUserMessage({
            content: [{ type: 'text', text: `${TASK} (retry ${attempt + 1})` }],
            source: { kind: 'user' },
          }))
          await withTimeout(agent.whenIdle(), 240_000, `whenIdle retry ${attempt + 1}`)
          outcome = summarizeTurn()
          if (outcome.reason !== undefined && outcome.reason.kind !== 'error') break
          console.log(`[zcode-live] gateway retry ${attempt + 1}:`,
            JSON.stringify(outcome.reason?.error?.message ?? outcome.reason?.kind).slice(0, 120))
        }
      }

      const { text, reason } = outcome
      console.log('[zcode-live] turn reason:', JSON.stringify(reason))
      console.log('[zcode-live] assistant reply:', JSON.stringify(text.slice(0, 400)))
      expect(text.trim().length).toBeGreaterThan(0)
      expect(reason?.kind).toBe('completed')
      // A real answer from a model that read its zcode prompt: it must talk
      // about permission modes at all (the exact set it names depends on
      // which section the gateway's model attended to, so the assertion is
      // the topic, not one keyword).
      expect(text.toLowerCase()).toMatch(/permission|mode/)
    } finally {
      await handle.dispose()
    }
  })
}, 600_000)
