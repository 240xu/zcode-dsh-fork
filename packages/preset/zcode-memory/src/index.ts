/**
 * ZCode persistent memory section for the zcode agent preset.
 *
 * This plugin ports ZCode 3.10.2's persistent agent memory operating
 * principles (evidence package 240xu/zcode-agent, extracted
 * statically from the official runtime):
 *
 * - Prompt template `Isi`: the byte-verified 12K memory prompt shipped
 *   beside this module as memory-prompt.txt, carrying two placeholders.
 * - `<MEMORY_ROOT>`: substituted with the scope-resolved root directory
 *   (`resolvePersistentAgentMemoryRoot`):
 *   user → `<storageRoot>/agent-memory/<agent>`;
 *   project → `<workspace>/.zcode/agent-memory/<agent>`;
 *   local → `<workspace>/.zcode/agent-memory-local/<agent>`,
 *   with the agent name sanitized (`Esi`: non `[a-zA-Z0-9_-]` → `-`).
 * - `<SCOPE_GUIDANCE>`: substituted with the scope line from the runtime's
 *   `Tsi` table (user / project / local).
 * - `## MEMORY.md` + the live index: the section always ends with the
 *   current MEMORY.md index content (`K9r`), formatted by `B1e`/`Wut`
 *   (frontmatter stripped, 200-line / 25KB cap with the exact WARNING
 *   text, or the empty-index message when there is no index yet).
 *
 * Deployment mapping: ZCode profiles opt into one memory scope each; this
 * preset is a single agent, so the scope comes from `ZCODE_MEMORY_SCOPE`
 * (default `user`) and the storage root from `ZCODE_MEMORY_HOME`
 * (falling back to ZCode's own `ZCODE_STORAGE_DIR`, then `~/.zcode`).
 * Reading and writing memory files is done by the ordinary DSH filesystem
 * tools under the rendered root — this plugin owns only the prompt, the
 * root convention, and the index formatting, no filesystem access of its
 * own beyond reading MEMORY.md for the prompt.
 * @module @deepseek-ai/dsh-zcode-memory
 */

import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-system-prompt'

export const inject = ['systemPrompt']

/** Prompt-section order: after zcode:behavior (100), before PLAN_POLICY (500). */
const MEMORY_SECTION_ORDER = 450

/** The verbatim ZCode memory prompt template, placeholders intact. */
const rawPrompt = await readFile(join(dirname(fileURLToPath(import.meta.url)), 'memory-prompt.txt'), 'utf8')

/** ZCode's three memory scopes. */
export type MemoryScope = 'user' | 'project' | 'local'

/**
 * Scope guidance lines, verbatim from the runtime's `Tsi` table, one of
 * which replaces `<SCOPE_GUIDANCE>` per the active scope.
 */
export const SCOPE_GUIDANCE: Record<MemoryScope, string> = {
  user: '- Since this memory is user-scope, keep learnings general since they apply across all projects',
  project: '- Since this memory is project-scope and shared with your team via version control, tailor your memories to this project',
  local: '- Since this memory is local-scope (not checked into version control), tailor your memories to this project and machine',
}

/**
 * Agent-name sanitization, mirroring the runtime's `Esi`
 * (`/[^a-zA-Z0-9_-]/g` → `-`, empty → `unknown`).
 */
export function sanitizeAgentName(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9_-]/g, '-')
  return clean === '' ? 'unknown' : clean
}

/**
 * Active memory scope from `ZCODE_MEMORY_SCOPE` (default `user`).
 *
 * Deployment mapping, not upstream behavior: ZCode reads the scope from the
 * profile config, while this preset takes it from the environment. An
 * unrecognized value falls back to `user` with a one-time startup warning
 * rather than throwing — an import-time throw would take down the whole
 * process boot for a typo, and ZCode itself never throws here (an unknown
 * scope renders no guidance line).
 */
let warnedInvalidScope = false
export function zcodeMemoryScope(): MemoryScope {
  const raw = (process.env.ZCODE_MEMORY_SCOPE ?? 'user').trim().toLowerCase()
  if (raw === 'user' || raw === 'project' || raw === 'local') return raw
  if (!warnedInvalidScope) {
    warnedInvalidScope = true
    console.warn(`[zcode-memory] ZCODE_MEMORY_SCOPE must be user, project, or local (got ${JSON.stringify(process.env.ZCODE_MEMORY_SCOPE)}); falling back to 'user'`)
  }
  return 'user'
}

/**
 * Memory storage root: `ZCODE_MEMORY_HOME`, then ZCode's own
 * `ZCODE_STORAGE_DIR`, then `~/.zcode`.
 */
export function zcodeStorageRoot(): string {
  return process.env.ZCODE_MEMORY_HOME?.trim()
    || process.env.ZCODE_STORAGE_DIR?.trim()
    || join(homedir(), '.zcode')
}

/**
 * Scope-resolved memory root, mirroring `resolvePersistentAgentMemoryRoot`.
 * @param scope - memory scope (defaults to the active scope).
 * @param opts - storageRoot / workspaceRoot / agentName overrides (tests).
 */
export function zcodeMemoryRoot(scope: MemoryScope = zcodeMemoryScope(), opts?: {
  storageRoot?: string
  workspaceRoot?: string
  agentName?: string
}): string {
  const agent = sanitizeAgentName(opts?.agentName ?? 'zcode')
  if (scope === 'user') return join(opts?.storageRoot ?? zcodeStorageRoot(), 'agent-memory', agent)
  const workspace = resolve(opts?.workspaceRoot ?? process.cwd())
  const dir = scope === 'project' ? 'agent-memory' : 'agent-memory-local'
  return join(workspace, '.zcode', dir, agent)
}

/** MEMORY.md index caps from the runtime (`Vut` = 200 lines, `mre` = 25KB). */
export const MEMORY_INDEX_MAX_LINES = 200
export const MEMORY_INDEX_MAX_BYTES = 25 * 1024

/** Frontmatter strip (`VFo`) and HTML-comment strip (`GFo`). */
const FRONTMATTER_RE = /^---\s*\n[\s\S]*?---\s*\n?/u
const COMMENT_RE = /<!--[\s\S]*?-->/gu

/**
 * Byte formatter mirroring the runtime's `Gut` (bytes → KB → MB → GB).
 */
export function formatBytes(bytes: number): string {
  const kb = bytes / 1024
  if (kb < 1) return `${bytes} bytes`
  const trim = (n: number): string => n.toFixed(1).replace(/\.0$/u, '')
  if (kb < 1024) return `${trim(kb)}KB`
  const mb = kb / 1024
  if (mb < 1024) return `${trim(mb)}MB`
  return `${trim(mb / 1024)}GB`
}

/**
 * MEMORY.md index formatter, mirroring `B1e`/`Wut`: strip frontmatter and
 * comments, trim, cap at 200 lines / 25KB with the exact WARNING text.
 * (Upstream strips comments through a markdown lexer; the `GFo` regex here
 * is behaviorally identical for index files, which carry no fenced code.)
 */
export function formatMemoryIndex(raw: string): string {
  const text = raw.replace(FRONTMATTER_RE, '').replace(COMMENT_RE, '').trim()
  if (text === '') return ''
  const lines = text.split('\n')
  const count = lines.length
  const size = text.length
  const overLines = count > MEMORY_INDEX_MAX_LINES
  const overBytes = size > MEMORY_INDEX_MAX_BYTES
  if (!overLines && !overBytes) return text
  let truncated = overLines ? lines.slice(0, MEMORY_INDEX_MAX_LINES).join('\n') : text
  if (truncated.length > MEMORY_INDEX_MAX_BYTES) {
    const cut = truncated.lastIndexOf('\n', MEMORY_INDEX_MAX_BYTES)
    truncated = truncated.slice(0, cut > 0 ? cut : MEMORY_INDEX_MAX_BYTES)
  }
  const what = !overBytes
    ? `${count} lines (limit: ${MEMORY_INDEX_MAX_LINES})`
    : !overLines
      ? `${formatBytes(size)} (limit: ${formatBytes(MEMORY_INDEX_MAX_BYTES)}) — index entries are too long`
      : `${count} lines and ${formatBytes(size)}`
  return `${truncated}\n\n> WARNING: MEMORY.md is ${what}. Only part of it was loaded. Keep index entries to one line under ~200 chars; move detail into topic files.`
}

/** Verbatim empty-index message from the runtime's `K9r`. */
export const EMPTY_INDEX_MESSAGE =
  'Your MEMORY.md is currently empty. When you save new memories, they will appear here.'

/** Read and format `<root>/MEMORY.md`; missing/unreadable means no index yet. */
export function readMemoryIndex(root: string): string {
  try {
    return formatMemoryIndex(readFileSync(join(root, 'MEMORY.md'), 'utf8'))
  } catch {
    return ''
  }
}

/**
 * The rendered memory prompt: template with root and scope substituted,
 * plus `## MEMORY.md` and the live index — exactly the runtime's `K9r`
 * assembly (`[prompt, '', '## MEMORY.md', '', index || empty].join('\n')`).
 */
export function renderMemoryPrompt(root: string, scope: MemoryScope = zcodeMemoryScope(), indexContent?: string): string {
  const withRoot = rawPrompt.replaceAll('<MEMORY_ROOT>', root)
  const withScope = withRoot.replaceAll('<SCOPE_GUIDANCE>', SCOPE_GUIDANCE[scope])
  const index = indexContent ?? readMemoryIndex(root)
  return [withScope, '', '## MEMORY.md', '', index === '' ? EMPTY_INDEX_MESSAGE : index].join('\n')
}

/** The full memory prompt with this deployment's root and scope substituted. */
export const MEMORY_PROMPT = renderMemoryPrompt(zcodeMemoryRoot(), zcodeMemoryScope())

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.systemPrompt.section({
    name: 'zcode:memory',
    order: MEMORY_SECTION_ORDER,
    // Rendered per assembly so MEMORY.md edits and scope changes land
    // without a restart — the runtime rebuilds this prompt per session.
    text: () => renderMemoryPrompt(zcodeMemoryRoot(), zcodeMemoryScope()),
  }), 'zcode memory section')
}
