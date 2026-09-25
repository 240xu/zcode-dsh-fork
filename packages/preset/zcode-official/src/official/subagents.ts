// Ported from zai-org/ZCode@872ad96 apps/zcode-cli/packages/core/src/subagent/
// Ported from zai-org/ZCode@872ad96 apps/zcode-cli/packages/core/src/subagent/
//   explore.ts, general-purpose.ts, system-prompt.ts, explore-tools.ts, profile.ts
// Only the model-facing builders and the built-in profile descriptions are
// ported; frontmatter parsing, model selection, and runner plumbing are
// DSH-irrelevant. The embedded-search branches are kept verbatim but this
// deployment always runs non-embedded (embeddedSearchEnabled: false).

export const EXPLORE_AGENT_TYPE = "Explore" as const;
export const GENERAL_PURPOSE_AGENT_TYPE = "general-purpose" as const;
export const DEFAULT_SUBAGENT_TYPE = GENERAL_PURPOSE_AGENT_TYPE;

export interface ExploreAgentPromptOptions {
  embeddedSearchEnabled?: boolean;
}

export function buildExploreAgentPrompt(options: ExploreAgentPromptOptions): string {
  const searchGuidelines = options.embeddedSearchEnabled
    ? [
        "- Use `find` via Bash for broad file pattern matching",
        "- Use `grep` via Bash for searching file contents with regex",
      ]
    : [
        "- Use Glob for broad file pattern matching",
        "- Use Grep for searching file contents with regex",
      ];
  const bashReadOnlyCommands = options.embeddedSearchEnabled
    ? "ls, git status, git log, git diff, find, grep, cat, head, tail"
    : "ls, git status, git log, git diff, find, cat, head, tail";

  return [
    "You are ZCode Explore, a file search and codebase research specialist for ZCode CLI. You excel at thoroughly navigating and exploring codebases.",
    "",
    "=== CRITICAL: READ-ONLY MODE - NO FILE MODIFICATIONS ===",
    "This is a READ-ONLY exploration task. You are STRICTLY PROHIBITED from:",
    "- Creating new files (no Write, touch, or file creation of any kind)",
    "- Modifying existing files (no Edit operations)",
    "- Deleting files (no rm or deletion)",
    "- Moving or copying files (no mv or cp)",
    "- Creating temporary files anywhere, including /tmp",
    "- Using redirect operators (>, >>, |) or heredocs to write to files",
    "- Running ANY commands that change system state",
    "",
    "Your role is EXCLUSIVELY to search and analyze existing code. You do NOT have access to file editing tools - attempting to edit files will fail.",
    "",
    "Your strengths:",
    "- Rapidly finding files using glob patterns",
    "- Searching code and text with powerful regex patterns",
    "- Reading and analyzing file contents",
    "",
    "Guidelines:",
    ...searchGuidelines,
    "- Use Read when you know the specific file path you need to read",
    `- Use Bash ONLY for read-only operations (${bashReadOnlyCommands})`,
    "- NEVER use Bash for: mkdir, touch, rm, cp, mv, git add, git commit, npm install, pip install, or any file creation/modification",
    "- Adapt your search approach based on the thoroughness level specified by the caller",
    "- Communicate your final report directly as a regular message - do NOT attempt to create files",
    "",
    "NOTE: You are meant to be a fast agent that returns output as quickly as possible. In order to achieve this you must:",
    "- Make efficient use of the tools that you have at your disposal: be smart about how you search for files and implementations",
    "- Wherever possible you should try to spawn multiple parallel tool calls for grepping and reading files",
    "",
    "Complete the user's search request efficiently and report your findings clearly.",
  ].join("\n");
}

export function buildGeneralPurposeSystemPrompt(): string {
  return [
    "You are an agent for ZCode CLI. Given the user's message, you should use the tools available to complete the task. Complete the task fully—don't gold-plate, but don't leave it half-done. When you complete the task, respond with a concise report covering what was done and any key findings — the caller will relay this to the user, so it only needs the essentials.",
    "",
    "Your strengths:",
    "- Searching for code, configurations, and patterns across large codebases",
    "- Analyzing multiple files to understand system architecture",
    "- Investigating complex questions that require exploring many files",
    "- Performing multi-step research tasks",
    "",
    "Guidelines:",
    "- For file searches: search broadly when you don't know where something lives. Use Read when you know the specific file path.",
    "- For analysis: Start broad and narrow down. Use multiple search strategies if the first doesn't yield results.",
    "- Be thorough: Check multiple locations, consider different naming conventions, look for related files.",
    "- NEVER create files unless they're absolutely necessary for achieving your goal. ALWAYS prefer editing an existing file to creating a new one.",
    "- NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested.",
  ].join("\n");
}

export function buildSubagentCommonNotes(): string {
  return [
    "Notes:",
    "- Agent threads always have their cwd reset between bash calls, as a result please only use absolute file paths.",
    "- In your final response, share file paths (always absolute, never relative) that are relevant to the task. Include code snippets only when the exact text is load-bearing (e.g., a bug you found, a function signature the caller asked for) — do not recap code you merely read.",
    "- For clear communication with the user the assistant MUST avoid using emojis.",
    '- Do not use a colon before tool calls. Text like "Let me read the file:" followed by a read tool call should just be "Let me read the file." with a period.',
    "- Do NOT Write report/summary/findings/analysis .md files. Return findings directly as your final assistant message — the parent agent reads your text output, not files you create.",
  ].join("\n");
}

import type { EnvInfoText, ModelRef } from "./env-info.ts";
import { isEnvInfoGitRepository } from "./env-info.ts";

export interface SubagentEnvironmentContextOptions {
  agentPrompt: string;
  envInfo: EnvInfoText;
  model?: ModelRef;
}

export function buildSubagentEnvironmentContext(
  options: SubagentEnvironmentContextOptions,
): string {
  const { envInfo, model } = options;
  const modelLine = model
    ? [`You are powered by the model named ${model.providerId}/${model.modelId}.`]
    : [];

  return [
    "Here is useful information about the environment you are running in:",
    "<env>",
    `Working directory: ${envInfo.cwd}`,
    `Is directory a git repo: ${isEnvInfoGitRepository(envInfo) ? "Yes" : "No"}`,
    `Platform: ${envInfo.platform}`,
    `Shell: ${envInfo.shell}`,
    `OS Version: ${envInfo.osVersion}`,
    "</env>",
    ...modelLine,
  ].join("\n");
}

export const EXPLORE_AGENT_ALLOWED_TOOLS = [
  "Bash",
  "Glob",
  "Grep",
  "Read",
  "WebFetch",
  "WebSearch",
  "TodoWrite",
] as const;

export type ExploreAgentAllowedTool = (typeof EXPLORE_AGENT_ALLOWED_TOOLS)[number];

export const EXPLORE_AGENT_EMBEDDED_SEARCH_ALLOWED_TOOLS = [
  "Bash",
  "Read",
  "WebFetch",
  "WebSearch",
  "TodoWrite",
] as const;

const EXPLORE_AGENT_DESCRIPTION_TOOL_PRIORITY = [
  "Glob",
  "Grep",
  "Read",
  "Bash",
  "WebFetch",
  "WebSearch",
  "TodoWrite",
] as const satisfies readonly ExploreAgentAllowedTool[];

const EXPLORE_AGENT_DESCRIPTION_TOOL_PRIORITY_SET = new Set<ExploreAgentAllowedTool>(
  EXPLORE_AGENT_DESCRIPTION_TOOL_PRIORITY,
);

export function buildExploreAllowedTools(options: {
  embeddedSearchEnabled?: boolean;
} = {}): readonly ExploreAgentAllowedTool[] {
  return options.embeddedSearchEnabled
    ? EXPLORE_AGENT_EMBEDDED_SEARCH_ALLOWED_TOOLS
    : EXPLORE_AGENT_ALLOWED_TOOLS;
}

export function formatExploreAllowedToolsForAgentDescription(options: {
  embeddedSearchEnabled?: boolean;
} = {}): string {
  const allowedTools = buildExploreAllowedTools(options);
  const allowedToolSet = new Set(allowedTools);
  const prioritizedTools = EXPLORE_AGENT_DESCRIPTION_TOOL_PRIORITY.filter((tool) =>
    allowedToolSet.has(tool),
  );
  const unprioritizedTools = allowedTools.filter(
    (tool) => !EXPLORE_AGENT_DESCRIPTION_TOOL_PRIORITY_SET.has(tool),
  );
  return [...prioritizedTools, ...unprioritizedTools].join(", ");
}


export type AgentProfileSource = "built-in" | "project" | "user";
export type AgentMemoryScope = "user" | "project" | "local";
export type AgentPermissionMode = "auto" | "plan";

export interface AgentProfile {
  background?: boolean;
  color?: "red" | "blue" | "green" | "yellow" | "purple" | "orange" | "pink" | "cyan";
  description: string;
  disallowedTools?: readonly string[];
  injectAgentsMd?: boolean;
  maxTurns?: number;
  mcpServers?: readonly string[];
  memory?: AgentMemoryScope;
  name: string;
  path?: string;
  permissionMode?: AgentPermissionMode;
  skills?: readonly string[];
  source: AgentProfileSource;
  systemPrompt: string;
  tools?: readonly string[];
}

export function createBuiltInGeneralPurposeAgentProfile(): AgentProfile {
  return {
    name: DEFAULT_SUBAGENT_TYPE,
    description:
      "General-purpose agent for researching complex questions, searching for code, and executing multi-step tasks. When you are searching for a keyword or file and are not confident that you will find the right match in the first few tries use this agent to perform the search for you.",
    // 内置子智能体使用显式身份色，避免 UI 按名称 hash 后把 general-purpose 显示为红色。
    color: "blue",
    injectAgentsMd: true,
      source: "built-in",
    systemPrompt: buildGeneralPurposeSystemPrompt(),
    tools: ["*"],
  };
}

export function createBuiltInExploreAgentProfile(): AgentProfile {
  return {
    name: EXPLORE_AGENT_TYPE,
    description:
      'Read-only search agent for broad fan-out searches - when answering means sweeping many files, directories, or naming conventions and you only need the conclusion, not the file dumps. It reads excerpts rather than whole files, so it locates code; it doesn\'t review or audit it. Specify search breadth: "medium" for moderate exploration, "very thorough" for multiple locations and naming conventions.',
    color: "cyan",
    injectAgentsMd: false,
      source: "built-in",
    systemPrompt: "",
    tools: ["Bash", "Glob", "Grep", "Read", "WebFetch", "WebSearch", "TodoWrite"],
  };
}

export function normalizeAgentProfiles(
  profiles: readonly AgentProfile[],
): AgentProfile[] {
  const active = new Map<string, AgentProfile>();
  active.set(
    DEFAULT_SUBAGENT_TYPE,
    createBuiltInGeneralPurposeAgentProfile(),
  );
  active.set(
    EXPLORE_AGENT_TYPE,
    createBuiltInExploreAgentProfile(),
  );
  for (const profile of profiles) {
    active.set(profile.name, profile);
  }
  return Array.from(active.values());
}


/** 用户/项目 profile 可以同名覆盖内置 Explore，不能只按名称套用内置行为。 */
export function isBuiltInExploreAgentProfile(
  profile: Pick<AgentProfile, "name" | "source">,
): boolean {
  return profile.name === EXPLORE_AGENT_TYPE && profile.source === "built-in";
}


// ---- tool-policy.ts + tool/tool-visibility.ts (the two helpers formatAgentProfilesForPrompt uses) ----

export function normalizeToolNameAlias(toolName: string): string {
  return toolName === "web_search" ? "WebSearch" : toolName;
}

function getToolRuleName(rule: string): string {
  const trimmed = rule.trim();
  const parenIndex = trimmed.indexOf("(");
  const rawName = parenIndex > 0 ? trimmed.slice(0, parenIndex) : trimmed;
  return normalizeToolNameAlias(rawName);
}

function createToolRuleNameSet(
  rules: readonly string[] | undefined,
): ReadonlySet<string> | undefined {
  if (!rules || rules.length === 0) return undefined;
  const names = new Set<string>();
  for (const rule of rules) {
    const name = getToolRuleName(rule);
    if (name) names.add(name);
  }
  return names.size > 0 ? names : undefined;
}

function filterDisallowedToolNames(
  toolNames: readonly string[],
  disallowedTools: readonly string[] | undefined,
): readonly string[] {
  const disallowed = createToolRuleNameSet(disallowedTools);
  if (!disallowed) return toolNames;
  return toolNames.filter((toolName) => !disallowed.has(normalizeToolNameAlias(toolName)));
}

const SUBAGENT_CHILD_FORCED_DISALLOWED_TOOLS = [
  "EnterPlanMode",
  "ExitPlanMode",
] as const;

export function buildSubagentChildDisallowRules(
  disallowedTools: readonly string[] | undefined,
): readonly string[] {
  return [...SUBAGENT_CHILD_FORCED_DISALLOWED_TOOLS, ...(disallowedTools ?? [])];
}

export function filterSubagentChildToolNames(
  toolNames: readonly string[],
  disallowedTools: readonly string[] | undefined,
): readonly string[] {
  // 子 agent 没有独立的 plan approval 恢复面，暴露 plan tools 会让
  // ExitPlanMode 等待用户确认并卡住父 turn，因此所有子 agent 工具面统一剔除。
  return filterDisallowedToolNames(toolNames, buildSubagentChildDisallowRules(disallowedTools));
}

export function formatAgentProfilesForPrompt(
  profiles: readonly AgentProfile[],
  options: { embeddedSearchEnabled?: boolean } = {},
): string | null {
  const active = normalizeAgentProfiles(profiles);
  if (active.length === 0) return null;

  return [
    "Available agent types and the tools they have access to:",
    ...active.map((profile) => {
      const tools = isBuiltInExploreAgentProfile(profile)
        ? formatExploreAllowedToolsForAgentDescription(options)
        : profile.tools
          ? filterSubagentChildToolNames(profile.tools, profile.disallowedTools)
          : undefined;
      const toolText = typeof tools === "string" ? tools : tools?.join(", ");
      const suffix = toolText ? ` (Tools: ${toolText})` : "";
      return `- ${profile.name}: ${profile.description}${suffix}`;
    }),
  ].join("\n");
}

/** Built-in roster for this deployment: general-purpose + Explore, non-embedded. */
export function builtInAgentProfiles(): AgentProfile[] {
  return normalizeAgentProfiles([
    createBuiltInGeneralPurposeAgentProfile(),
    createBuiltInExploreAgentProfile(),
  ]);
}

