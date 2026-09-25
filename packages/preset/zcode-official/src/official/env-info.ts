// Ported from zai-org/ZCode@872ad96 apps/zcode-cli/packages/core/src/context/sections/env-info.ts
// Ported from zai-org/ZCode@872ad96 apps/zcode-cli/packages/core/src/context/sections/env-info.ts
// Content builders verbatim; the EnvInfo contract type is narrowed to the
// text-relevant fields (EnvInfoText) and the Model type to {providerId,modelId}.

/** Minimal env shape the official EnvInfo type carries for rendering. */
export interface EnvInfoText {
  cwd: string
  isGitRepository?: boolean
  platform: string
  shell: string
  osVersion: string
  gitBranch?: string
  gitMainBranch?: string
  gitUser?: string
  gitStatus?: "clean" | "dirty" | "not_repo"
  gitStatusLines?: readonly string[]
  recentCommits?: readonly string[]
}

export interface ModelRef {
  providerId: string
  modelId: string
}

const ENVIRONMENT_HEADING = "# Environment";
const WORKING_DIRECTORY_LABEL = "Primary working directory";
const IS_GIT_REPOSITORY_LABEL = "Is a git repository";
const PLATFORM_LABEL = "Platform";
const SHELL_LABEL = "Shell";
const OS_VERSION_LABEL = "OS Version";
// const NODE_VERSION_LABEL = "Node version";
// const OPERATING_SYSTEM_LABEL = "Operating system";
const YES_LABEL = "yes";
const NO_LABEL = "no";
const GIT_SYSTEM_CONTEXT_PREFIX =
  "gitStatus: This is the git status at the start of the conversation. Note that this status is a snapshot in time, and will not update during the conversation.";
const CURRENT_BRANCH_LABEL = "Current branch";
const MAIN_BRANCH_LABEL = "Main branch (you will usually use this for PRs)";
const GIT_USER_LABEL = "Git user";
const STATUS_LABEL = "Status";
const RECENT_COMMITS_LABEL = "Recent commits";
const CLEAN_GIT_STATUS = "(clean)";
const DIRTY_GIT_STATUS = "(dirty)";
const UNKNOWN_GIT_STATUS = "(unknown)";

export function isEnvInfoGitRepository(info: EnvInfoText): boolean {
  return (
    info.isGitRepository ??
    (info.gitStatus !== undefined ? info.gitStatus !== "not_repo" : Boolean(info.gitBranch))
  );
}

function buildEnvInfoContent(info: EnvInfoText, model?: ModelRef): string {
  const hasGitRepository = isEnvInfoGitRepository(info);
  const lines: string[] = [
    ENVIRONMENT_HEADING,
    "You have been invoked in the following environment:",
    `- ${WORKING_DIRECTORY_LABEL}: ${info.cwd}`,
    `- ${IS_GIT_REPOSITORY_LABEL}: ${hasGitRepository ? YES_LABEL : NO_LABEL}`,
    `- ${PLATFORM_LABEL}: ${info.platform}`,
    `- ${SHELL_LABEL}: ${info.shell}`,
    `- ${OS_VERSION_LABEL}: ${info.osVersion}`,
    // 旧环境快照可能携带历史模型字段；渲染只读取本步骤实际执行的 Model。
    ...(model
      ? [`- You are powered by the model named ${model.providerId}/${model.modelId}.`]
      : []),
  ];

  return lines.join("\n");
}

function buildGitSystemContextContent(info: EnvInfoText): string {
  const lines: string[] = [GIT_SYSTEM_CONTEXT_PREFIX];

  if (info.gitBranch) {
    lines.push("", `${CURRENT_BRANCH_LABEL}: ${info.gitBranch}`);
  }
  if (info.gitMainBranch) {
    lines.push("", `${MAIN_BRANCH_LABEL}: ${info.gitMainBranch}`);
  }
  if (info.gitUser) {
    lines.push("", `${GIT_USER_LABEL}: ${info.gitUser}`);
  }

  lines.push("", `${STATUS_LABEL}:\n${formatGitStatus(info)}`);
  lines.push("", `${RECENT_COMMITS_LABEL}:\n${formatRecentCommits(info)}`);

  return lines.join("\n");
}

function formatGitStatus(info: EnvInfoText): string {
  if (info.gitStatusLines && info.gitStatusLines.length > 0) {
    return info.gitStatusLines.join("\n");
  }
  if (info.gitStatus === "dirty") {
    return DIRTY_GIT_STATUS;
  }
  if (info.gitStatus === "clean") {
    return CLEAN_GIT_STATUS;
  }
  return UNKNOWN_GIT_STATUS;
}

function formatRecentCommits(info: EnvInfoText): string {
  if (info.recentCommits && info.recentCommits.length > 0) {
    return info.recentCommits.join("\n");
  }
  return "";
}

/** Section text for the Environment Info section. */
export function buildEnvText(info: EnvInfoText, model?: ModelRef): string {
  return buildEnvInfoContent(info, model)
}

/** Section text for the git System Context section (callers drop when not a repo). */
export function buildGitSystemContextText(info: EnvInfoText): string {
  return buildGitSystemContextContent(info)
}

