/**
 * Registration tests for dsh-zcode-bash: tool name, ZCode description,
 * schema keys, and the tool:bash prompt section. Needs no shell executor,
 * so it runs on hosts without node-pty (e.g. Termux android-arm64).
 */

import { describe, expect, it } from 'vitest'
import { Context, Service } from '@deepseek-ai/cordis'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { TOOL_DESCRIPTIONS } from '@deepseek-ai/dsh-zcode-prompt/src/tool-texts.ts'
import * as tool from '../src/index.ts'

/** Stubs for the shell seam: registration touches neither at apply() time. */
class StubShell extends Service {
  constructor(ctx: Context) { super(ctx, 'shell') }
}
class StubShellEnv extends Service {
  constructor(ctx: Context) { super(ctx, 'shellEnv') }
}

async function setup() {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(StubShell)
  await ctx.plugin(StubShellEnv)
  await ctx.plugin(tool)
  return ctx
}

describe('dsh-zcode-bash registration', () => {
  it('registers `bash` with the ZCode description and ZCode schema keys', async () => {
    const ctx = await setup()
    const schema = ctx.tools.schemas().find(s => s.name === 'bash')
    expect(schema).toBeDefined()
    expect(schema!.description).toBe(TOOL_DESCRIPTIONS['bash'])
    const keys = Object.keys(schema!.parameters.properties as Record<string, unknown>)
    expect(keys).toEqual(expect.arrayContaining(['command', 'timeout', 'description', 'run_in_background', 'dangerouslyDisableSandbox']))
    expect(schema!.description).toContain('detached')
    expect(schema!.description).toContain('run_in_background')
  })

  it('registers a tool:bash prompt section with the exit-code guidance', async () => {
    const ctx = await setup()
    const section = (await ctx.systemPrompt.assemble()).sections.find(s => s.name === 'tool:bash')
    expect(section).toBeDefined()
    expect(section!.text).toContain('[exit code: N]')
  })
})
