export declare const READ_DEFAULT_MAX_LINES = 2000;
export declare const DEFAULT_BASH_TIMEOUT_MS = 120000;
export declare const DEFAULT_BASH_MAX_TIMEOUT_MS = 600000;
export declare function buildBashProviderDescription(input: {
    defaultTimeoutMs: number;
    maxTimeoutMs: number;
}): string;
export declare function buildReadDescription(): string;
export declare function buildWriteDescription(): string;
export declare function buildEditDescription(): string;
export declare function buildGlobDescription(): string;
export declare function buildGrepDescription(): string;
export declare function buildWebFetchDescription(): string;
export declare function buildWebSearchProviderDescription(now?: Date): string;
export declare const TODO_READ_DESCRIPTION = "Read the current session todo list";
export declare function buildTodoWriteDescription(): string;
export declare function buildSkillDescription(): string;
export declare const ASK_USER_QUESTION_DESCRIPTION = "Use this tool only when you are blocked on a decision that is genuinely the user's to make: one you cannot resolve from the request, the code, or sensible defaults.\n\nUsage notes:\nOther\n- Use multiSelect: true to allow multiple answers to be selected for a question\n(Recommended)\n\nIs my plan ready?\nShould I proceed?\nthe plan\n\nReserve this for decisions where the user's answer changes what you do next \u2014 not for choices with a conventional default or facts you can verify in the codebase yourself. In those cases pick the obvious option, mention it in your response, and proceed.\n\nPreview feature:\nUse the optional `preview` field on options when presenting concrete artifacts that users need to visually compare:\n- ASCII mockups of UI layouts or components\n- Code snippets showing different implementations\n- Diagram variations\n- Configuration examples\n\nPreview content is rendered as markdown in a monospace box. Multi-line text with newlines is supported. When any option has a preview, the UI switches to a side-by-side layout with a vertical option list on the left and preview on the right. Do not use previews for simple preference questions where labels and descriptions suffice. Note: previews are only supported for single-select questions (not multiSelect).\n";
export declare const EXIT_PLAN_MODE_MODEL_INSTRUCTIONS: readonly ["Use this tool when you have finished writing your plan and are ready for user approval.\n\n## How This Tool Works\n- You should have already explored the codebase and finalized the plan you want the user to review\n- Pass the complete plan in the plan field; the user will review that content before approving implementation\n- This tool simply signals that you're done planning and ready for the user to review and approve\n- The user will see the contents of the plan parameter when they review it\n\n## When to Use This Tool\nIMPORTANT: Only use this tool when the task requires planning the implementation steps of a task that requires writing code. For research tasks where you're gathering information, searching files, reading files or in general trying to understand the codebase - do NOT use this tool.\n\n## Before Using This Tool\nEnsure your plan is complete and unambiguous:\n- If you have unresolved questions about requirements or approach, use AskUserQuestion before finalizing your plan\n- Once your plan is finalized, use THIS tool to request approval\n\n**Important:** Do NOT use AskUserQuestion to ask \"Is this plan okay?\" or \"Should I proceed?\" - that's exactly what THIS tool does. ExitPlanMode inherently requests user approval of your plan."];
export declare function buildAgentProviderDescription(agentList: string): string;
export declare function buildTaskDescription(agentDescription: string): string;
//# sourceMappingURL=tool-descriptions.d.ts.map