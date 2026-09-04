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
import type { Context } from '@deepseek-ai/cordis';
export declare const inject: string[];
/** ZCode's three memory scopes. */
export type MemoryScope = 'user' | 'project' | 'local';
/**
 * Scope guidance lines, verbatim from the runtime's `Tsi` table, one of
 * which replaces `<SCOPE_GUIDANCE>` per the active scope.
 */
export declare const SCOPE_GUIDANCE: Record<MemoryScope, string>;
/**
 * Agent-name sanitization, mirroring the runtime's `Esi`
 * (`/[^a-zA-Z0-9_-]/g` → `-`, empty → `unknown`).
 */
export declare function sanitizeAgentName(name: string): string;
/** Active memory scope from `ZCODE_MEMORY_SCOPE` (default `user`). */
export declare function zcodeMemoryScope(): MemoryScope;
/**
 * Memory storage root: `ZCODE_MEMORY_HOME`, then ZCode's own
 * `ZCODE_STORAGE_DIR`, then `~/.zcode`.
 */
export declare function zcodeStorageRoot(): string;
/**
 * Scope-resolved memory root, mirroring `resolvePersistentAgentMemoryRoot`.
 * @param scope - memory scope (defaults to the active scope).
 * @param opts - storageRoot / workspaceRoot / agentName overrides (tests).
 */
export declare function zcodeMemoryRoot(scope?: MemoryScope, opts?: {
    storageRoot?: string;
    workspaceRoot?: string;
    agentName?: string;
}): string;
/** MEMORY.md index caps from the runtime (`Vut` = 200 lines, `mre` = 25KB). */
export declare const MEMORY_INDEX_MAX_LINES = 200;
export declare const MEMORY_INDEX_MAX_BYTES: number;
/**
 * Byte formatter mirroring the runtime's `Gut` (bytes → KB → MB → GB).
 */
export declare function formatBytes(bytes: number): string;
/**
 * MEMORY.md index formatter, mirroring `B1e`/`Wut`: strip frontmatter and
 * comments, trim, cap at 200 lines / 25KB with the exact WARNING text.
 * (Upstream strips comments through a markdown lexer; the `GFo` regex here
 * is behaviorally identical for index files, which carry no fenced code.)
 */
export declare function formatMemoryIndex(raw: string): string;
/** Verbatim empty-index message from the runtime's `K9r`. */
export declare const EMPTY_INDEX_MESSAGE = "Your MEMORY.md is currently empty. When you save new memories, they will appear here.";
/** Read and format `<root>/MEMORY.md`; missing/unreadable means no index yet. */
export declare function readMemoryIndex(root: string): string;
/**
 * The rendered memory prompt: template with root and scope substituted,
 * plus `## MEMORY.md` and the live index — exactly the runtime's `K9r`
 * assembly (`[prompt, '', '## MEMORY.md', '', index || empty].join('\n')`).
 */
export declare function renderMemoryPrompt(root: string, scope?: MemoryScope, indexContent?: string): string;
/** The full memory prompt with this deployment's root and scope substituted. */
export declare const MEMORY_PROMPT: string;
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map