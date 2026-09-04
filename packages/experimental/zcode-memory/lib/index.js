import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
//#region lib/types/index.js
/**
* ZCode persistent memory section for the zcode agent preset.
*
* This plugin ports ZCode 3.10.2's persistent agent memory operating
* principles (evidence package 240xu/zcode-3102-evidence, extracted
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
const inject = ["systemPrompt"];
/** Prompt-section order: after zcode:behavior (100), before PLAN_POLICY (500). */
const MEMORY_SECTION_ORDER = 450;
/** The verbatim ZCode memory prompt template, placeholders intact. */
const rawPrompt = await readFile(join(dirname(fileURLToPath(import.meta.url)), "memory-prompt.txt"), "utf8");
/**
* Scope guidance lines, verbatim from the runtime's `Tsi` table, one of
* which replaces `<SCOPE_GUIDANCE>` per the active scope.
*/
const SCOPE_GUIDANCE = {
	user: "- Since this memory is user-scope, keep learnings general since they apply across all projects",
	project: "- Since this memory is project-scope and shared with your team via version control, tailor your memories to this project",
	local: "- Since this memory is local-scope (not checked into version control), tailor your memories to this project and machine"
};
/**
* Agent-name sanitization, mirroring the runtime's `Esi`
* (`/[^a-zA-Z0-9_-]/g` → `-`, empty → `unknown`).
*/
function sanitizeAgentName(name) {
	const clean = name.replace(/[^a-zA-Z0-9_-]/g, "-");
	return clean === "" ? "unknown" : clean;
}
/** Active memory scope from `ZCODE_MEMORY_SCOPE` (default `user`). */
function zcodeMemoryScope() {
	const raw = (process.env.ZCODE_MEMORY_SCOPE ?? "user").trim().toLowerCase();
	if (raw === "user" || raw === "project" || raw === "local") return raw;
	throw new Error(`ZCODE_MEMORY_SCOPE must be user, project, or local (got ${JSON.stringify(process.env.ZCODE_MEMORY_SCOPE)})`);
}
/**
* Memory storage root: `ZCODE_MEMORY_HOME`, then ZCode's own
* `ZCODE_STORAGE_DIR`, then `~/.zcode`.
*/
function zcodeStorageRoot() {
	return process.env.ZCODE_MEMORY_HOME?.trim() || process.env.ZCODE_STORAGE_DIR?.trim() || join(homedir(), ".zcode");
}
/**
* Scope-resolved memory root, mirroring `resolvePersistentAgentMemoryRoot`.
* @param scope - memory scope (defaults to the active scope).
* @param opts - storageRoot / workspaceRoot / agentName overrides (tests).
*/
function zcodeMemoryRoot(scope = zcodeMemoryScope(), opts) {
	const agent = sanitizeAgentName(opts?.agentName ?? "zcode");
	if (scope === "user") return join(opts?.storageRoot ?? zcodeStorageRoot(), "agent-memory", agent);
	return join(resolve(opts?.workspaceRoot ?? process.cwd()), ".zcode", scope === "project" ? "agent-memory" : "agent-memory-local", agent);
}
/** MEMORY.md index caps from the runtime (`Vut` = 200 lines, `mre` = 25KB). */
const MEMORY_INDEX_MAX_LINES = 200;
const MEMORY_INDEX_MAX_BYTES = 25 * 1024;
/** Frontmatter strip (`VFo`) and HTML-comment strip (`GFo`). */
const FRONTMATTER_RE = /^---\s*\n[\s\S]*?---\s*\n?/u;
const COMMENT_RE = /<!--[\s\S]*?-->/gu;
/**
* Byte formatter mirroring the runtime's `Gut` (bytes → KB → MB → GB).
*/
function formatBytes(bytes) {
	const kb = bytes / 1024;
	if (kb < 1) return `${bytes} bytes`;
	const trim = (n) => n.toFixed(1).replace(/\.0$/u, "");
	if (kb < 1024) return `${trim(kb)}KB`;
	const mb = kb / 1024;
	if (mb < 1024) return `${trim(mb)}MB`;
	return `${trim(mb / 1024)}GB`;
}
/**
* MEMORY.md index formatter, mirroring `B1e`/`Wut`: strip frontmatter and
* comments, trim, cap at 200 lines / 25KB with the exact WARNING text.
* (Upstream strips comments through a markdown lexer; the `GFo` regex here
* is behaviorally identical for index files, which carry no fenced code.)
*/
function formatMemoryIndex(raw) {
	const text = raw.replace(FRONTMATTER_RE, "").replace(COMMENT_RE, "").trim();
	if (text === "") return "";
	const lines = text.split("\n");
	const count = lines.length;
	const size = text.length;
	const overLines = count > 200;
	const overBytes = size > MEMORY_INDEX_MAX_BYTES;
	if (!overLines && !overBytes) return text;
	let truncated = overLines ? lines.slice(0, 200).join("\n") : text;
	if (truncated.length > 25600) {
		const cut = truncated.lastIndexOf("\n", MEMORY_INDEX_MAX_BYTES);
		truncated = truncated.slice(0, cut > 0 ? cut : MEMORY_INDEX_MAX_BYTES);
	}
	const what = !overBytes ? `${count} lines (limit: 200)` : !overLines ? `${formatBytes(size)} (limit: ${formatBytes(MEMORY_INDEX_MAX_BYTES)}) — index entries are too long` : `${count} lines and ${formatBytes(size)}`;
	return `${truncated}\n\n> WARNING: MEMORY.md is ${what}. Only part of it was loaded. Keep index entries to one line under ~200 chars; move detail into topic files.`;
}
/** Verbatim empty-index message from the runtime's `K9r`. */
const EMPTY_INDEX_MESSAGE = "Your MEMORY.md is currently empty. When you save new memories, they will appear here.";
/** Read and format `<root>/MEMORY.md`; missing/unreadable means no index yet. */
function readMemoryIndex(root) {
	try {
		return formatMemoryIndex(readFileSync(join(root, "MEMORY.md"), "utf8"));
	} catch {
		return "";
	}
}
/**
* The rendered memory prompt: template with root and scope substituted,
* plus `## MEMORY.md` and the live index — exactly the runtime's `K9r`
* assembly (`[prompt, '', '## MEMORY.md', '', index || empty].join('\n')`).
*/
function renderMemoryPrompt(root, scope = zcodeMemoryScope(), indexContent) {
	const withScope = rawPrompt.replaceAll("<MEMORY_ROOT>", root).replaceAll("<SCOPE_GUIDANCE>", SCOPE_GUIDANCE[scope]);
	const index = indexContent ?? readMemoryIndex(root);
	return [
		withScope,
		"",
		"## MEMORY.md",
		"",
		index === "" ? EMPTY_INDEX_MESSAGE : index
	].join("\n");
}
/** The full memory prompt with this deployment's root and scope substituted. */
const MEMORY_PROMPT = renderMemoryPrompt(zcodeMemoryRoot(), zcodeMemoryScope());
function apply(ctx) {
	ctx.effect(() => ctx.systemPrompt.section({
		name: "zcode:memory",
		order: MEMORY_SECTION_ORDER,
		text: () => renderMemoryPrompt(zcodeMemoryRoot(), zcodeMemoryScope())
	}), "zcode memory section");
}
//#endregion
export { EMPTY_INDEX_MESSAGE, MEMORY_INDEX_MAX_BYTES, MEMORY_INDEX_MAX_LINES, MEMORY_PROMPT, SCOPE_GUIDANCE, apply, formatBytes, formatMemoryIndex, inject, readMemoryIndex, renderMemoryPrompt, sanitizeAgentName, zcodeMemoryRoot, zcodeMemoryScope, zcodeStorageRoot };
