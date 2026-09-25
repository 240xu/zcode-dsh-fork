export declare const EXPLORE_AGENT_TYPE: "Explore";
export declare const GENERAL_PURPOSE_AGENT_TYPE: "general-purpose";
export declare const DEFAULT_SUBAGENT_TYPE: "general-purpose";
export interface ExploreAgentPromptOptions {
    embeddedSearchEnabled?: boolean;
}
export declare function buildExploreAgentPrompt(options: ExploreAgentPromptOptions): string;
export declare function buildGeneralPurposeSystemPrompt(): string;
export declare function buildSubagentCommonNotes(): string;
import type { EnvInfoText, ModelRef } from "./env-info.ts";
export interface SubagentEnvironmentContextOptions {
    agentPrompt: string;
    envInfo: EnvInfoText;
    model?: ModelRef;
}
export declare function buildSubagentEnvironmentContext(options: SubagentEnvironmentContextOptions): string;
export declare const EXPLORE_AGENT_ALLOWED_TOOLS: readonly ["Bash", "Glob", "Grep", "Read", "WebFetch", "WebSearch", "TodoWrite"];
export type ExploreAgentAllowedTool = (typeof EXPLORE_AGENT_ALLOWED_TOOLS)[number];
export declare const EXPLORE_AGENT_EMBEDDED_SEARCH_ALLOWED_TOOLS: readonly ["Bash", "Read", "WebFetch", "WebSearch", "TodoWrite"];
export declare function buildExploreAllowedTools(options?: {
    embeddedSearchEnabled?: boolean;
}): readonly ExploreAgentAllowedTool[];
export declare function formatExploreAllowedToolsForAgentDescription(options?: {
    embeddedSearchEnabled?: boolean;
}): string;
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
export declare function createBuiltInGeneralPurposeAgentProfile(): AgentProfile;
export declare function createBuiltInExploreAgentProfile(): AgentProfile;
export declare function normalizeAgentProfiles(profiles: readonly AgentProfile[]): AgentProfile[];
/** 用户/项目 profile 可以同名覆盖内置 Explore，不能只按名称套用内置行为。 */
export declare function isBuiltInExploreAgentProfile(profile: Pick<AgentProfile, "name" | "source">): boolean;
export declare function normalizeToolNameAlias(toolName: string): string;
export declare function buildSubagentChildDisallowRules(disallowedTools: readonly string[] | undefined): readonly string[];
export declare function filterSubagentChildToolNames(toolNames: readonly string[], disallowedTools: readonly string[] | undefined): readonly string[];
export declare function formatAgentProfilesForPrompt(profiles: readonly AgentProfile[], options?: {
    embeddedSearchEnabled?: boolean;
}): string | null;
/** Built-in roster for this deployment: general-purpose + Explore, non-embedded. */
export declare function builtInAgentProfiles(): AgentProfile[];
//# sourceMappingURL=subagents.d.ts.map