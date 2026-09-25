/** Minimal env shape the official EnvInfo type carries for rendering. */
export interface EnvInfoText {
    cwd: string;
    isGitRepository?: boolean;
    platform: string;
    shell: string;
    osVersion: string;
    gitBranch?: string;
    gitMainBranch?: string;
    gitUser?: string;
    gitStatus?: "clean" | "dirty" | "not_repo";
    gitStatusLines?: readonly string[];
    recentCommits?: readonly string[];
}
export interface ModelRef {
    providerId: string;
    modelId: string;
}
export declare function isEnvInfoGitRepository(info: EnvInfoText): boolean;
/** Section text for the Environment Info section. */
export declare function buildEnvText(info: EnvInfoText, model?: ModelRef): string;
/** Section text for the git System Context section (callers drop when not a repo). */
export declare function buildGitSystemContextText(info: EnvInfoText): string;
//# sourceMappingURL=env-info.d.ts.map