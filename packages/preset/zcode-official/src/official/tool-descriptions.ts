// Ported from zai-org/ZCode@872ad96 apps/zcode-cli/packages/core/src/tool/handlers/
//   (read.ts, write.ts, edit.ts, glob.ts, grep.ts, webfetch.ts, websearch.ts,
//    todo.ts, agent.ts, skill.ts, ask-user-question.ts, plan-mode-prompts.ts)
//   and tool/bash-prompt.ts + tool/bash-timeout-policy.ts.
// Each description is the official text verbatim; where the official runtime
// renders values (timeouts, month, agent roster), the official builder shape is
// kept as a function so the rendered text stays live. dynamicWorkflowEnabled is
// always false in this deployment (no CreateWorkflow tool exists here), which
// matches the official gate-closed branch of buildAgentProviderDescription.

export const READ_DEFAULT_MAX_LINES = 2_000;
export const DEFAULT_BASH_TIMEOUT_MS = 120_000;
export const DEFAULT_BASH_MAX_TIMEOUT_MS = 600_000;

// ---- tool/bash-prompt.ts ----

export function buildBashProviderDescription(input: {
  defaultTimeoutMs: number;
  maxTimeoutMs: number;
}): string {
  return [
    "Executes a bash command and returns its output.",
    "",
    "- Working directory persists between calls, but prefer absolute paths — `cd` in a compound command can trigger a permission prompt. Shell state (env vars, functions) does not persist; the shell is initialized from the user's profile.",
    "- IMPORTANT: Avoid using this tool to run `find`, `grep`, `cat`, `head`, `tail`, `sed`, `awk`, or `echo` commands, unless explicitly instructed or after you have verified that a dedicated tool cannot accomplish your task. Instead, use the appropriate dedicated tool as this will provide a much better experience for the user.",
    `- \`timeout\` is in milliseconds: default ${input.defaultTimeoutMs}, max ${input.maxTimeoutMs}.`,
    "- `run_in_background` runs the command detached: it keeps running across turns and re-invokes you when it exits. No `&` needed.",
    "",
    "# Git",
    "- Interactive flags (`-i`, e.g. `git rebase -i`) are not supported in this environment.",
    "- Use the `gh` CLI for GitHub operations (PRs, issues, API).",
    "- Commit or push only when the user asks. If on the default branch, branch first."
  ].join("\n");
}

// ---- tool/handlers/read.ts ----

export function buildReadDescription(): string {
  return [
    "Reads a file from the local filesystem.",
    "",
    "- `file_path` must be an absolute path.",
    `- Reads up to ${READ_DEFAULT_MAX_LINES} lines by default.`,
    "- You can optionally specify a line offset and limit (especially handy for long files), but it's recommended to read the whole file by not providing these parameters",
    "- Results are returned using cat -n format, with line numbers starting at 1",
    "- Reads images (PNG, JPG, …) and presents them visually.",
    "- Reads videos (MP4, MOV, WEBM, …) and presents them as video input (subject to ZCode's video input limit).",
    "- Reading a directory, a missing file, or an empty file returns an error or system reminder rather than content.",
    "- Do NOT re-read a file you just edited to verify — Edit/Write would have errored if the change failed, and the harness tracks file state for you."
  ].join("\n");
}

// ---- tool/handlers/write.ts / edit.ts / glob.ts / grep.ts / webfetch.ts ----

export function buildWriteDescription(): string {
  return "Writes a file to the local filesystem, overwriting if one exists.\n\nWhen to use: creating a new file, or fully replacing one you've already Read. Overwriting an existing file you haven't Read will fail. For partial changes, use Edit instead.";
}

export function buildEditDescription(): string {
  return "Performs exact string replacement in a file.\n\n- You must Read the file in this conversation before editing, or the call will fail.\n- `old_string` must match the file exactly, including indentation, and be unique — the edit fails otherwise. Strip the Read line prefix (line number + tab) before matching.\n- `replace_all: true` replaces every occurrence instead.";
}

export function buildGlobDescription(): string {
  return "Fast file pattern matching. Supports glob patterns like \"**/*.js\" or \"src/**/*.ts\". Returns matching file paths sorted by modification time.";
}

export function buildGrepDescription(): string {
  return "Content search built on ripgrep. Prefer this over `grep`/`rg` via Bash — results integrate with the permission UI and file links.\n\n- Full regex syntax (e.g. \"log.*Error\", \"function\\s+\\w+\"). Ripgrep, not grep — escape literal braces (`interface\\{\\}`).\n- Filter with `glob` (e.g. \"**/*.tsx\") or `type` (e.g. \"js\", \"py\", \"rust\").\n- `output_mode`: \"content\" (matching lines), \"files_with_matches\" (paths only, default), or \"count\".\n- `multiline: true` for patterns that span lines.";
}

export function buildWebFetchDescription(): string {
  return "Fetches a URL, converts the page to markdown, and answers `prompt` against it using a small fast model.\n\n- Fails on authenticated/private URLs — use an authenticated MCP tool or `gh` for those instead.\n- HTTP is upgraded to HTTPS. Cross-host redirects are returned to you rather than followed; call again with the redirect URL.\n- Responses are cached for 15 minutes per URL.";
}

// ---- tool/handlers/websearch.ts (buildWebSearchProviderDescription) ----

const WEBSEARCH_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export function buildWebSearchProviderDescription(now: Date = new Date()): string {
  const currentMonth = `${WEBSEARCH_MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
  return [
    "Search the web. Returns result blocks with titles and URLs. US-only.",
    "",
    `- The current month is ${currentMonth} — use this when searching for recent information.`,
    "- `allowed_domains` / `blocked_domains` filter results.",
    "Sources:"
  ].join("\n");
}

// ---- tool/handlers/todo.ts ----

export const TODO_READ_DESCRIPTION = "Read the current session todo list";

export function buildTodoWriteDescription(): string {
  return "Create and update a task list for the current session. The list is rendered to the user as your working plan.\n\n- Each todo has \\`content\\`, \\`status\\` (\"pending\" | \"in_progress\" | \"completed\"), and \\`priority\\` (\"high\" | \"medium\" | \"low\").\n- Send the full list each call; it replaces the previous one.\n- Keep one item \\`in_progress\\` at a time and mark it \\`completed\\` when done.";
}

// ---- tool/handlers/skill.ts ----

export function buildSkillDescription(): string {
  return "Execute a skill within the main conversation\n\nWhen users ask you to perform tasks, check if any of the available skills match. Skills provide specialized capabilities and domain knowledge.\n\nWhen users reference a \"slash command\" or \"/<something>\", they are referring to a skill. Use this tool to invoke it.\n\nHow to invoke:\n- Set \\`skill\\` to the exact name of an available skill (no leading slash). For plugin-namespaced skills use the fully qualified \\`plugin:skill\\` form.\n- Set \\`args\\` to pass optional arguments.\n\nImportant:\n- Available skills are listed in system-reminder messages in the conversation\n- Only invoke a skill that appears in that list, or one the user explicitly typed as \\`/<name>\\` in their message. Never guess or invent a skill name from training data; otherwise do not call this tool\n- When a skill matches the user's request, this is a BLOCKING REQUIREMENT: invoke the relevant Skill tool BEFORE generating any other response about the task\n- NEVER mention a skill without actually calling this tool\n- Do not invoke a skill that is already running\n- Do not use this tool for built-in CLI commands (like /help, /clear, etc.)\n- If you see a <command-name> tag in the current conversation turn, the skill has ALREADY been loaded - follow the instructions directly instead of calling this tool again\n";
}

// ---- tool/handlers/ask-user-question.ts ----

export const ASK_USER_QUESTION_DESCRIPTION = "Use this tool only when you are blocked on a decision that is genuinely the user's to make: one you cannot resolve from the request, the code, or sensible defaults.\n\nUsage notes:\nOther\n- Use multiSelect: true to allow multiple answers to be selected for a question\n(Recommended)\n\nIs my plan ready?\nShould I proceed?\nthe plan\n\nReserve this for decisions where the user's answer changes what you do next — not for choices with a conventional default or facts you can verify in the codebase yourself. In those cases pick the obvious option, mention it in your response, and proceed.\n\nPreview feature:\nUse the optional `preview` field on options when presenting concrete artifacts that users need to visually compare:\n- ASCII mockups of UI layouts or components\n- Code snippets showing different implementations\n- Diagram variations\n- Configuration examples\n\nPreview content is rendered as markdown in a monospace box. Multi-line text with newlines is supported. When any option has a preview, the UI switches to a side-by-side layout with a vertical option list on the left and preview on the right. Do not use previews for simple preference questions where labels and descriptions suffice. Note: previews are only supported for single-select questions (not multiSelect).\n";

// ---- tool/handlers/plan-mode-prompts.ts (deployment adaptation) ----

export const EXIT_PLAN_MODE_MODEL_INSTRUCTIONS = [
  `Use this tool when you have finished writing your plan and are ready for user approval.

## How This Tool Works
- You should have already explored the codebase and finalized the plan you want the user to review
- Pass the complete plan in the plan field; the user will review that content before approving implementation
- This tool simply signals that you're done planning and ready for the user to review and approve
- The user will see the contents of the plan parameter when they review it

## When to Use This Tool
IMPORTANT: Only use this tool when the task requires planning the implementation steps of a task that requires writing code. For research tasks where you're gathering information, searching files, reading files or in general trying to understand the codebase - do NOT use this tool.

## Before Using This Tool
Ensure your plan is complete and unambiguous:
- If you have unresolved questions about requirements or approach, use AskUserQuestion before finalizing your plan
- Once your plan is finalized, use THIS tool to request approval

**Important:** Do NOT use AskUserQuestion to ask "Is this plan okay?" or "Should I proceed?" - that's exactly what THIS tool does. ExitPlanMode inherently requests user approval of your plan.`,
] as const;

// ---- tool/handlers/agent.ts (buildAgentProviderDescription) ----

export function buildAgentProviderDescription(agentList: string): string {
  return [
    "Launch a new agent to handle complex, multi-step tasks. Each agent type has specific capabilities and tools available to it.",
    "",
    agentList,
    "",
    "When using the Agent tool, specify a subagent_type parameter to select which agent type to use. If omitted, the general-purpose agent is used.",
    "",
    "## When to use",
    "",
    "Reach for this when the task matches an available agent type, when you have independent work to run in parallel, or when answering would mean reading across several files — delegate it and you keep the conclusion, not the file dumps. For a single-fact lookup where you already know the file, symbol, or value, search directly. Once you've delegated a search, don't also run it yourself — wait for the result.",
    "",
    "- The agent's final message is returned to you as the tool result; it is not shown to the user — relay what matters.",
    "- A new Agent call starts fresh, so the prompt must be self-contained.",
    "- `run_in_background: true` runs the agent asynchronously; you'll be notified when it completes.",
    "- When you launch multiple agents for independent work, send them in a single message with multiple tool uses so they run concurrently."
  ].join("\n");
}

export function buildTaskDescription(agentDescription: string): string {
  return [
    "Claude Code-compatible alias for the Agent tool. Use this when plugin instructions ask for the Task tool.",
    "",
    agentDescription
  ].join("\n");
}
