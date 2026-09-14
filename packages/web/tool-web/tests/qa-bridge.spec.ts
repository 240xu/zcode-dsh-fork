/** Oracle QA bridge tests for web_fetch (no network, no model). */

import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime, { type ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import WebRuntime from '@deepseek-ai/dsh-web'
import type { WebFetchProvider } from '@deepseek-ai/dsh-web'
import * as ToolWeb from '@deepseek-ai/dsh-tool-web'
import { buildQaPrompt, capQaInput, resolveQaRoute } from '../src/fetch.ts'

const testToolSignal = new AbortController().signal

function fetchProvider(html: string): WebFetchProvider {
  return {
    id: 'stub-fetch',
    available: () => true,
    fetch: () => Promise.resolve({
      url: 'https://a.test',
      statusCode: 200,
      body: { kind: 'html', content: html },
      truncated: false,
    }),
  }
}

function textScript(text: string): StreamChunk[] {
  return [
    { type: 'block-start', index: 0, blockType: 'text' },
    { type: 'text-delta', index: 0, text },
    { type: 'finish', reason: { kind: 'stop' } },
  ]
}

function fakeLlm(script: StreamChunk[] | Error, seen: GenerateOptions[]) {
  return {
    async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
      seen.push(options)
      if (script instanceof Error) throw script
      yield *script
    },
  }
}

function fakeAgent(): Agent {
  return {
    session: {
      id: 'sess-test',
      requestHeader: () => ({ config: { provider: 'test-p', model: 'test-m' } }),
    },
    options: {},
  } as unknown as Agent
}

async function mountQa(opts: {
  html?: string
  script?: StreamChunk[] | Error
  agent?: Agent
  /** Set to mount a QA-capable llm fake (default true when script given). */
  withLlm?: boolean
}): Promise<{
  ctx: Context
  fiber: Awaited<ReturnType<Context['plugin']>>
  seen: GenerateOptions[]
  call: (args: unknown) => Promise<ToolExecutionResult>
}> {
  const seen: GenerateOptions[] = []
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(WebRuntime, {})
  ctx.web.registerFetchProvider(fetchProvider(opts.html ?? '<p>page body here</p>'))
  if (opts.script !== undefined || opts.withLlm === true) {
    ctx.provide('llm', fakeLlm(opts.script ?? textScript('answer'), seen))
  }
  const fiber = await ctx.plugin(ToolWeb, {})
  let counter = 0
  const agent = opts.agent
  const call = (args: unknown) => ctx.tools.execute({
    signal: testToolSignal,
    callId: ToolCallId(`qa-${++counter}`),
    name: 'web_fetch',
    arguments: args,
    ...(agent === undefined ? {} : { agent }),
  })
  return { ctx, fiber, seen, call }
}

function textOf(out: ToolExecutionResult): string {
  return out.content.map(block => block.type === 'text' ? block.text : '').join('')
}

describe('zcode web_fetch QA bridge (oracle prompt-qa contract)', () => {
  it('returns the trimmed model answer, never the page', async () => {
    const { fiber, seen, call } = await mountQa({ script: textScript('\n  QUIXOTIC-ZEBRA-42  \n'), agent: fakeAgent() })
    const out = await call({ url: 'https://a.test', prompt: 'Reply with ONLY the string.' })
    expect(out.isError).toBe(false)
    expect(textOf(out)).toBe('QUIXOTIC-ZEBRA-42')
    expect(seen).toHaveLength(1)
    expect(seen[0]?.provider).toBe('test-p')
    expect(seen[0]?.model).toBe('test-m')
    expect(seen[0]?.maxTokens).toBe(4096)
    expect(seen[0]).not.toHaveProperty('tools')
    const first = seen[0]
    if (first === undefined) throw new Error('expected a QA call')
    const prompt = ((first.messages[0] as { content: Array<{ text: string }> }).content[0] as { text: string }).text
    expect(prompt).toContain('Web page content:')
    expect(prompt).toContain('page body here')
    expect(prompt).toContain('Reply with ONLY the string.')
    expect(prompt).toContain('strict 125-character maximum')
    await fiber.dispose()
  })

  it('completes with the verbatim fallback on a whitespace-only answer', async () => {
    const { fiber, call } = await mountQa({ script: textScript('   \n  '), agent: fakeAgent() })
    const out = await call({ url: 'https://a.test', prompt: 'Q?' })
    expect(out.isError).toBe(false)
    expect(textOf(out)).toBe('WebFetch completed, but the extraction model returned no text.')
    await fiber.dispose()
  })

  it('fails the lifecycle with the oracle text when the QA call throws', async () => {
    const { fiber, call } = await mountQa({ script: new Error('boom'), agent: fakeAgent() })
    const out = await call({ url: 'https://a.test', prompt: 'Q?' })
    expect(out.isError).toBe(true)
    expect(textOf(out)).toContain('Model request failed.')
    await fiber.dispose()
  })

  it('keeps page behavior with no llm service mounted', async () => {
    const { fiber, seen, call } = await mountQa({ agent: fakeAgent() })
    const out = await call({ url: 'https://a.test', prompt: 'Q?' })
    expect(out.isError).toBe(false)
    expect(textOf(out)).toContain('page body here')
    expect(seen).toHaveLength(0)
    await fiber.dispose()
  })

  it('keeps page behavior with no calling agent (no route)', async () => {
    const { fiber, seen, call } = await mountQa({ script: textScript('answer'), withLlm: true })
    const out = await call({ url: 'https://a.test', prompt: 'Q?' })
    expect(textOf(out)).toContain('page body here')
    expect(seen).toHaveLength(0)
    await fiber.dispose()
  })

  it('keeps page behavior for a blank prompt without calling the model', async () => {
    const { fiber, seen, call } = await mountQa({ script: textScript('answer'), agent: fakeAgent() })
    const out = await call({ url: 'https://a.test', prompt: '   ' })
    expect(textOf(out)).toContain('page body here')
    expect(seen).toHaveLength(0)
    await fiber.dispose()
  })

  it('caps QA input at 100000 chars with the oracle note', async () => {
    const big = `<p>${'A'.repeat(100_010)}</p>`
    const { fiber, seen, call } = await mountQa({ html: big, script: textScript('ok'), agent: fakeAgent() })
    await call({ url: 'https://a.test', prompt: 'Q?' })
    const first = seen[0]
    if (first === undefined) throw new Error('expected a QA call')
    const prompt = ((first.messages[0] as { content: Array<{ text: string }> }).content[0] as { text: string }).text
    const markdown = prompt.split('Web page content:\n---\n')[1]?.split('\n---\n\n')[0] ?? ''
    expect(markdown.length).toBe(100_000)
    expect(markdown.endsWith('[WebFetch content truncated before prompt processing]')).toBe(true)
    await fiber.dispose()
  })
})

describe('zcode QA prompt pure functions', () => {
  it('buildQaPrompt matches the oracle template shape', () => {
    expect(buildQaPrompt('MD', 'P?')).toBe(
      '\nWeb page content:\n---\nMD\n---\n\nP?\n\nProvide a concise response based only on the content above. In your response:\n - Enforce a strict 125-character maximum for quotes from any source document. Open Source Software is ok as long as we respect the license.\n - Use quotation marks for exact language from articles; any language outside of the quotation should never be word-for-word the same.\n - You are not a lawyer and never comment on the legality of your own prompts and responses.\n - Never produce or reproduce exact song lyrics.',
    )
  })

  it('capQaInput passes short input through and notes over-cap input', () => {
    expect(capQaInput('short')).toBe('short')
    expect(capQaInput('A'.repeat(100_000))).toBe('A'.repeat(100_000))
    const capped = capQaInput('A'.repeat(100_001))
    expect(capped.length).toBe(100_000)
    expect(capped.endsWith('[WebFetch content truncated before prompt processing]')).toBe(true)
  })

  it('resolveQaRoute prefers the session header, falls back to agent options', () => {
    expect(resolveQaRoute(undefined)).toBeUndefined()
    expect(resolveQaRoute({})).toBeUndefined()
    expect(resolveQaRoute({ options: { provider: 'p', model: 'm' } })).toEqual({ provider: 'p', model: 'm' })
    expect(resolveQaRoute({
      session: { requestHeader: () => ({ config: { provider: 'h', model: 'n' } }) },
      options: { provider: 'p', model: 'm' },
    })).toEqual({ provider: 'h', model: 'n' })
    expect(resolveQaRoute({ session: { requestHeader: () => null }, options: {} })).toBeUndefined()
  })
})
