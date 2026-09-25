// Ported from zai-org/ZCode@872ad96 apps/zcode-cli/packages/core/src/runtime/helpers/runtime-reminders.ts
// Ported from zai-org/ZCode@872ad96 apps/zcode-cli/packages/core/src/runtime/helpers/runtime-reminders.ts
// Only the plan-mode parts: buildPlanWorkflow, the full/sparse/exit reminder
// bodies, and the reminder cadence constants. Tool-name constants are inlined
// (EXPLORE_AGENT_TYPE, ASK_USER_QUESTION, EXIT_PLAN_MODE from @zcode/contracts);
// the todo/date/attachment reminder machinery and output-style reminder are
// DSH-irrelevant and dropped.

export const EXPLORE_AGENT_TYPE = "Explore" as const;
export const ASK_USER_QUESTION_TOOL_NAME = "AskUserQuestion" as const;
export const EXIT_PLAN_MODE_TOOL_NAME = "ExitPlanMode" as const;

const planResearchAgentCount = 3;

export const RUNTIME_MODE_REMINDER_CONFIG = Object.freeze({
  TURNS_BETWEEN_ATTACHMENTS: 5,
  FULL_REMINDER_EVERY_N_ATTACHMENTS: 5,
});

export function buildPlanWorkflow() {
  return `## Plan Workflow

### Phase 1: Initial Understanding
Goal: Gain a comprehensive understanding of the user's request by reading through code and asking them questions. Critical: In this phase you should only use the ${EXPLORE_AGENT_TYPE} subagent type.

1. Focus on understanding the user's request and the code associated with their request. Actively search for existing functions, utilities, and patterns that can be reused \u2014 avoid proposing new code when suitable implementations already exist.

2. **Launch up to ${planResearchAgentCount} ${EXPLORE_AGENT_TYPE} agents IN PARALLEL** (single message, multiple tool calls) to efficiently explore the codebase.
   - Use 1 agent when the task is isolated to known files, the user provided specific file paths, or you're making a small targeted change.
   - Use multiple agents when: the scope is uncertain, multiple areas of the codebase are involved, or you need to understand existing patterns before planning.
   - Quality over quantity - ${planResearchAgentCount} agents maximum, but you should try to use the minimum number of agents necessary (usually just 1)
   - If using multiple agents: Provide each agent with a specific search focus or area to explore. Example: One agent searches for existing implementations, another explores related components, a third investigating testing patterns

### Phase 2: Design
Goal: Design an implementation approach.

**Guidelines:**
- Use the context gathered in Phase 1, including relevant files and code paths.
- Account for the user's requirements and constraints.
- Produce a concrete implementation plan that is detailed enough to execute.
- Consider useful perspectives for the task type:
  - New feature: simplicity vs performance vs maintainability
  - Bug fix: root cause vs workaround vs prevention
  - Refactoring: minimal change vs clean architecture

### Phase 3: Review
Goal: Review the plan(s) from Phase 2 and ensure alignment with the user's intentions.
1. Read the critical files to deepen your understanding
2. Ensure that the plans align with the user's original request
3. Use ${ASK_USER_QUESTION_TOOL_NAME} to clarify any remaining questions with the user

### Phase 4: Call ${EXIT_PLAN_MODE_TOOL_NAME}
At the very end of your turn, once you have asked the user questions and are happy with your final plan - you should always call ${EXIT_PLAN_MODE_TOOL_NAME} to indicate to the user that you are done planning.
This is critical - your turn should only end with either using the ${ASK_USER_QUESTION_TOOL_NAME} tool OR calling ${EXIT_PLAN_MODE_TOOL_NAME}. Do not stop unless it's for these 2 reasons

**Important:** Use ${ASK_USER_QUESTION_TOOL_NAME} ONLY to clarify requirements or choose between approaches. Use ${EXIT_PLAN_MODE_TOOL_NAME} to request plan approval. Do NOT ask about plan approval in any other way - no text questions, no AskUserQuestion. Phrases like "Is this plan okay?", "Should I proceed?", "How does this plan look?", "Any changes before we start?", or similar MUST use ${EXIT_PLAN_MODE_TOOL_NAME}.

NOTE: At any point in time through this workflow you should feel free to ask the user questions or clarifications using the ${ASK_USER_QUESTION_TOOL_NAME} tool. Don't make large assumptions about user intent. The goal is to present a well researched plan to the user, and tie any loose ends before implementation begins.`;
}

export const PLAN_MODE_FULL_REMINDER = [
  "Plan mode is active. The user indicated that they do not want you to execute yet -- you MUST NOT make any edits, run any non-readonly tools (including changing configs or making commits), or otherwise make any changes to the system. This supercedes any other instructions you have received.",
  buildPlanWorkflow(),
];

export const PLAN_MODE_SPARSE_REMINDER = [
  `Plan mode still active (see full instructions earlier in conversation). Read-only. Follow 4-phase workflow. End turns with ${ASK_USER_QUESTION_TOOL_NAME} (for clarifications) or ${EXIT_PLAN_MODE_TOOL_NAME} (for plan approval). Never ask about plan approval via text or AskUserQuestion.`,
];

export const PLAN_MODE_EXIT_REMINDER = [
  "## Exited Plan Mode",
  "",
  `You have exited plan mode. You can now make edits, run tools, and take actions.`,
];

/** Full reminder body (first attachment in a plan-mode session). */
export function buildPlanModeFullReminderBody(): string {
  return PLAN_MODE_FULL_REMINDER.join("\n");
}

/** Sparse reminder body (subsequent attachments). */
export function buildPlanModeSparseReminderBody(): string {
  return PLAN_MODE_SPARSE_REMINDER.join("\n");
}

