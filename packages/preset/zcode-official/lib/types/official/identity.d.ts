/** 安全 IMPORTANT 行：交互式身份与工作流子代理身份共用，逐字同一份。 */
export declare function buildSecurityNotice(): string;
/**
 * `# Harness` 块：稳定运行时约束，不属于 output style 可替换的 coding instructions，
 * 也是工作流子代理身份（sections/workflow-actor.ts）逐字复用的那一段。
 */
export declare function buildHarnessBlock(): string;
/** 官方 identity 正文（不含 cli-prefix 首行；intro 行按官方 interactive 分支取）。 */
export declare function buildIdentityText(intro?: string): string;
//# sourceMappingURL=identity.d.ts.map