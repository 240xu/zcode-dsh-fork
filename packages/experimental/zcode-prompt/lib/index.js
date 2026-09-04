import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
//#region lib/types/behavior-text.js
/**
* ZCode 3.10.2 behavior text: identity/Harness plus dynamic behavior.
*
* Byte-verified evidence: identity-section-3.10.2.txt and
* dynamic-behavior-3.10.2.txt in the evidence package
* (240xu/zcode-agent), extracted statically from the official
* ZCode Desktop 3.10.2 runtime. This module loads the two evidence files
* shipped beside it and joins them verbatim; no wording is authored here.
*/
const here = dirname(fileURLToPath(import.meta.url));
/** The identity section, minus its first sentence — the preset's persona row already states it. */
const identityText = await readFile(join(here, "identity-section.txt"), "utf8");
/** The dynamic-behavior section: communicating with the user, code style, comment policy, risk policy. */
const dynamicText = await readFile(join(here, "dynamic-behavior.txt"), "utf8");
function trimFirstSentence(text) {
	return (text.trim().startsWith("You are an interactive ZCode agent that helps users with software engineering tasks.") ? text.trim().slice(84) : text).replace(/^\s+/, "");
}
/** ZCode identity/Harness + dynamic behavior, joined verbatim from evidence. */
const BEHAVIOR_TEXT = [
	trimFirstSentence(identityText).trim(),
	"",
	dynamicText.trim()
].join("\n");
//#endregion
//#region lib/types/tool-texts.js
/**
* ZCode 3.10.2 tool descriptions, keyed by the DSH tool name each maps to.
*
* Generated verbatim from the evidence package's
* findings/zcode-3.10.2-full.json (240xu/zcode-agent; three-round
* verified). Do not hand-edit: regenerate from the evidence JSON instead.
*/
const TOOL_DESCRIPTIONS = {
	"read": "Reads a file from the local filesystem.\n\n- `file_path` must be an absolute path.\n- Reads up to 2000 lines by default.\n- You can optionally specify a line offset and limit (especially handy for long files), but it's recommended to read the whole file by not providing these parameters\n- Results are returned using cat -n format, with line numbers starting at 1\n- Reads images (PNG, JPG, …) and presents them visually.\n- Reads videos (MP4, MOV, WEBM, …) and presents them as video input (subject to ZCode's video input limit).\n- Reading a directory, a missing file, or an empty file returns an error or system reminder rather than content.\n- Do NOT re-read a file you just edited to verify — Edit/Write would have errored if the change failed, and the harness tracks file state for you.",
	"write": "Writes a file to the local filesystem, overwriting if one exists.\n\nWhen to use: creating a new file, or fully replacing one you've already Read. Overwriting an existing file you haven't Read will fail. For partial changes, use Edit instead.",
	"edit": "Performs exact string replacement in a file.\n\n- You must Read the file in this conversation before editing, or the call will fail.\n- `old_string` must match the file exactly, including indentation, and be unique — the edit fails otherwise. Strip the Read line prefix (line number + tab) before matching.\n- `replace_all: true` replaces every occurrence instead.",
	"bash": "Executes a bash command and returns its output.\n\n- Working directory persists between calls, but prefer absolute paths — `cd` in a compound command can trigger a permission prompt. Shell state (env vars, functions) does not persist; the shell is initialized from the user's profile.\n- IMPORTANT: Avoid using this tool to run `find`, `grep`, `cat`, `head`, `tail`, `sed`, `awk`, or `echo` commands, unless explicitly instructed or after you have verified that a dedicated tool cannot accomplish your task. Instead, use the appropriate dedicated tool as this will provide a much better experience for the user.\n- \\`timeout\\` is in milliseconds: default 120000, max 600000.\n- `run_in_background` runs the command detached: it keeps running across turns and re-invokes you when it exits. No `&` needed.\n\n# Git\n- Interactive flags (`-i`, e.g. `git rebase -i`, `git add -i`) are not supported in this environment.\n- Use the `gh` CLI for GitHub operations (PRs, issues, API).\n- Commit or push only when the user asks. If on the default branch, branch first.",
	"glob": "Fast file pattern matching. Supports glob patterns like \"**/*.js\" or \"src/**/*.ts\". Returns matching file paths sorted by modification time.",
	"grep": "Content search built on ripgrep. Prefer this over `grep`/`rg` via Bash — results integrate with the permission UI and file links.\n\n- Full regex syntax (e.g. \"log.*Error\", \"function\\s+\\w+\"). Ripgrep, not grep — escape literal braces (`interface\\{\\}`).\n- Filter with `glob` (e.g. \"**/*.tsx\") or `type` (e.g. \"js\", \"py\", \"rust\").\n- `output_mode`: \"content\" (matching lines), \"files_with_matches\" (paths only, default), or \"count\".\n- `multiline: true` for patterns that span lines.",
	"web_fetch": "Fetches a URL, converts the page to markdown, and answers `prompt` against it using a small fast model.\n\n- Fails on authenticated/private URLs — use an authenticated MCP tool or `gh` for those instead.\n- HTTP is upgraded to HTTPS. Cross-host redirects are returned to you rather than followed; call again with the redirect URL.\n- Responses are cached for 15 minutes per URL.",
	"web_search": "Search the web. Returns result blocks with titles and URLs. US-only.",
	"todo_read": "Read the current session todo list",
	"todo_write": "Create and update a task list for the current session. The list is rendered to the user as your working plan.\n\n- Each todo has `content`, `status` (\"pending\" | \"in_progress\" | \"completed\"), and `priority` (\"high\" | \"medium\" | \"low\").\n- Send the full list each call; it replaces the previous one.\n- Keep one item `in_progress` at a time and mark it `completed` when done.",
	"skill": "Execute a skill within the main conversation\n\nWhen users ask you to perform tasks, check if any of the available skills match. Skills provide specialized capabilities and domain knowledge.\n\nWhen users reference a \"slash command\" or \"/<something>\", they are referring to a skill. Use this tool to invoke it.\n\nHow to invoke:\n- Set `skill` to the exact name of an available skill (no leading slash). For plugin-namespaced skills use the fully qualified `plugin:skill` form.\n- Set `args` to pass optional arguments.\n\nImportant:\n- Available skills are listed in system-reminder messages in the conversation\n- Only invoke a skill that appears in that list, or one the user explicitly typed as `/<name>` in their message. Never guess or invent a skill name from training data; otherwise do not call this tool\n- When a skill matches the user's request, this is a BLOCKING REQUIREMENT: invoke the relevant Skill tool BEFORE generating any other response about the task\n- NEVER mention a skill without actually calling this tool\n- Do not invoke a skill that is already running\n- Do not use this tool for built-in CLI commands (like /help, /clear, etc.)\n- If you see a <command-name> tag in the current conversation turn, the skill has ALREADY been loaded - follow the instructions directly instead of calling this tool again",
	"agent": "Launch a new agent to handle complex, multi-step tasks. Each agent type has specific capabilities and tools available to it.\n\n{AGENT_PROFILES}\n\nWhen using the Agent tool, specify a subagent_type parameter to select which agent type to use. If omitted, the general-purpose agent is used.\n\n## When to use\n\nReach for this when the task matches an available agent type, when you have independent work to run in parallel, or when answering would mean reading across several files — delegate it and you keep the conclusion, not the file dumps. For a single-fact lookup where you already know the file, symbol, or value, search directly. Once you have delegated a search, do not also run it yourself — wait for the result.\n\n- The agent final message is returned to you as the tool result; it is not shown to the user — relay what matters.\n- A new Agent call starts fresh, so the prompt must be self-contained.\n- run_in_background: true runs the agent asynchronously; you will be notified when it completes.\n- When you launch multiple agents for independent work, send them in a single message with multiple tool uses so they run concurrently.",
	"task": "Claude Code-compatible alias for the Agent tool. Use this when plugin instructions ask for the Task tool.\n\nLaunch a new agent to handle complex, multi-step tasks. Each agent type has specific capabilities and tools available to it.\n\n{AGENT_PROFILES}\n\nWhen using the Agent tool, specify a subagent_type parameter to select which agent type to use. If omitted, the general-purpose agent is used.\n\n## When to use\n\nReach for this when the task matches an available agent type, when you have independent work to run in parallel, or when answering would mean reading across several files — delegate it and you keep the conclusion, not the file dumps. For a single-fact lookup where you already know the file, symbol, or value, search directly. Once you have delegated a search, do not also run it yourself — wait for the result.\n\n- The agent final message is returned to you as the tool result; it is not shown to the user — relay what matters.\n- A new Agent call starts fresh, so the prompt must be self-contained.\n- run_in_background: true runs the agent asynchronously; you will be notified when it completes.\n- When you launch multiple agents for independent work, send them in a single message with multiple tool uses so they run concurrently.",
	"goal_read": "Reads the current session goal state. The goal text is authoritative for the long-running objective; a later GoalRead result or runtime goal event updates it. Do not mark the goal complete unless real evidence shows the objective has been achieved. A completed plan, todo list, checklist, or planning phase is not completion evidence unless the objective was only to produce that artifact.",
	"ask_user_question": "Use this tool only when you are blocked on a decision that is genuinely the user's to make: one you cannot resolve from the request, the code, or sensible defaults.\n\nUsage notes:\nOther\n- Use multiSelect: true to allow multiple answers to be selected for a question\n(Recommended)\n\nIs my plan ready?\nShould I proceed?\nthe plan\n\nReserve this for decisions where the user's answer changes what you do next — not for choices with a conventional default or facts you can verify in the codebase yourself. In those cases pick the obvious option, mention it in your response, and proceed.\n\nPreview feature:\nUse the optional `preview` field on options when presenting concrete artifacts that users need to visually compare:\n- ASCII mockups of UI layouts or components\n- Code snippets showing different implementations\n- Diagram variations\n- Configuration examples\n\nPreview content is rendered as markdown in a monospace box. Multi-line text with newlines is supported. When any option has a preview, the UI switches to a side-by-side layout with a vertical option list on the left and preview on the right. Do not use previews for simple preference questions where labels and descriptions suffice. Note: previews are only supported for single-select questions (not multiSelect)."
};
//#endregion
//#region lib/types/index.js
/**
* ZCode behavior sections for the zcode agent preset.
*
* This plugin contributes prompt SECTIONS only — it deliberately registers no
* tools: same-scope re-registration of a name the base rows already
* registered throws in dsh-tools, so ZCode tool semantics arrive as prompt
* prose beside DSH's own tool schemas, never as replacement tool entries.
*
* Sections (order values chosen between DEPLOYMENT_PERSONA=0 and
* PLAN_POLICY=500; literal orders are legal — section() only requires a
* finite number):
* - `zcode:behavior` (order 100): identity/Harness + dynamic behavior,
*   verbatim from the byte-verified evidence files shipped beside this
*   module.
* - `zcode:context` (order 200): ZCode's Context Management section
*   (WSr: autonomy and turn-completion guidance), verbatim from
*   context-management.txt.
* - `zcode:tool-semantics` (order 460): ZCode's tool descriptions keyed by
*   the DSH tool name each maps to, plus the ZCode-side parameter notes the
*   DSH schemas do not carry.
* @module @deepseek-ai/dsh-zcode-prompt
*/
const inject = ["systemPrompt"];
/** ZCode's Context Management section, verbatim from the shipped evidence file. */
const CONTEXT_TEXT = await readFile(join(dirname(fileURLToPath(import.meta.url)), "context-management.txt"), "utf8");
/** ZCode name for each DSH tool the zcode preset surfaces. */
const ZCODE_NAME = {
	read: "Read",
	write: "Write",
	edit: "Edit",
	bash: "Bash",
	glob: "Glob",
	grep: "Grep",
	web_fetch: "WebFetch",
	web_search: "WebSearch",
	todo_read: "TodoRead",
	todo_write: "TodoWrite",
	skill: "Skill",
	agent: "Agent",
	task: "Task",
	goal_read: "GoalRead",
	ask_user_question: "AskUserQuestion"
};
/** ZCode-side parameter notes that DSH tool schemas do not carry. */
const PARAMETER_NOTES = {
	bash: "ZCode parameter: `timeout` in milliseconds (default and max per the shell policy); `run_in_background` runs detached and re-invokes you on exit; interactive flags like `git rebase -i` are unsupported; use `gh` for GitHub operations; commit or push only when asked.",
	edit: "ZCode requires the file to have been Read in this conversation before editing; `old_string` must match exactly including indentation and be unique; `replace_all` replaces every occurrence.",
	web_search: "ZCode notes results are US-only.",
	goal_read: "ZCode semantics: the goal text is the authoritative long-running objective; do not mark the goal complete without real evidence of achievement — a finished plan or todo list is not completion evidence.",
	skill: "ZCode session guidance: when the user types `/<skill-name>`, invoke it via Skill. Only use skills listed in the user-invocable skills section — don't guess."
};
function toolSemanticsText() {
	const blocks = [
		"# ZCode tool semantics",
		"",
		"The tools available in this session are DSH tools. Their ZCode semantics follow; where a note names ZCode parameters, apply it to the corresponding DSH tool.",
		"",
		"## ZCode tools mapped to DSH equivalents",
		"",
		"- `EnterPlanMode` / `ExitPlanMode`: this session's plan mode (see the plan-mode section). Enter plan mode to align on approach before implementing; exit it to submit the plan for approval. A user's conversational agreement approves nothing — only exiting plan mode requests approval.",
		"- `SendMessage`: continue a background subagent with a follow-up message instead of starting a new one.",
		"- `TaskOutput` is DEPRECATED upstream: never poll for background results; collect finished background work with `job_output` (wait only when genuinely blocked) and stop irrelevant work with `job_kill` (`TaskStop`).",
		"- `ApplyPatch`: never call a patch tool directly — perform the same edit with `write`/`edit` (upstream dispatches ApplyPatch to Write/Edit).",
		"- `ReadSessionContext`: read context from another persisted session with the `session_search`, `session_event_search`, `session_trace`, `session_event_trace`, and `session_event_read` tools (e.g. when the user references a prior session or asks to continue it).",
		""
	];
	for (const [dshName, description] of Object.entries(TOOL_DESCRIPTIONS)) {
		const zcodeName = ZCODE_NAME[dshName] ?? dshName;
		blocks.push(`## ${zcodeName}`);
		blocks.push("");
		blocks.push(description.trim());
		const note = PARAMETER_NOTES[dshName];
		if (note !== void 0) {
			blocks.push("");
			blocks.push(note);
		}
		blocks.push("");
	}
	return blocks.join("\n").trimEnd();
}
function apply(ctx) {
	ctx.effect(() => ctx.systemPrompt.section({
		name: "zcode:behavior",
		order: 100,
		text: BEHAVIOR_TEXT
	}), "zcode behavior section");
	ctx.effect(() => ctx.systemPrompt.section({
		name: "zcode:context",
		order: 200,
		text: CONTEXT_TEXT.trim()
	}), "zcode context section");
	ctx.effect(() => ctx.systemPrompt.section({
		name: "zcode:tool-semantics",
		order: 460,
		text: toolSemanticsText()
	}), "zcode tool-semantics section");
}
//#endregion
export { apply, inject };
