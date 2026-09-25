export declare const EXPLORE_AGENT_TYPE: "Explore";
export declare const ASK_USER_QUESTION_TOOL_NAME: "AskUserQuestion";
export declare const EXIT_PLAN_MODE_TOOL_NAME: "ExitPlanMode";
export declare const RUNTIME_MODE_REMINDER_CONFIG: Readonly<{
    TURNS_BETWEEN_ATTACHMENTS: 5;
    FULL_REMINDER_EVERY_N_ATTACHMENTS: 5;
}>;
export declare function buildPlanWorkflow(): string;
export declare const PLAN_MODE_FULL_REMINDER: string[];
export declare const PLAN_MODE_SPARSE_REMINDER: string[];
export declare const PLAN_MODE_EXIT_REMINDER: string[];
/** Full reminder body (first attachment in a plan-mode session). */
export declare function buildPlanModeFullReminderBody(): string;
/** Sparse reminder body (subsequent attachments). */
export declare function buildPlanModeSparseReminderBody(): string;
//# sourceMappingURL=plan-workflow.d.ts.map