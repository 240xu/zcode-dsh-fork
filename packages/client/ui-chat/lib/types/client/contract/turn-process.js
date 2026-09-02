const TURN_PROCESS_INDEPENDENT_KIND_LIST = [
    'system-prompt',
    'user',
    'steering',
    'turn-process',
    'turn-error',
    'turn-max-tokens',
    'turn-tail',
];
/** Chat Node kinds that remain independent of a Turn's process disclosure. */
export const TURN_PROCESS_INDEPENDENT_KINDS = new Set(TURN_PROCESS_INDEPENDENT_KIND_LIST);
/**
 * Compare immutable Turn-process specifications by their published fields.
 * @param left - previous specification.
 * @param right - next specification.
 * @returns whether both values describe the same process presentation.
 */
export function sameTurnProcessSpec(left, right) {
    return left.turn === right.turn
        && left.controlAnchorSeq === right.controlAnchorSeq
        && left.processStartSeq === right.processStartSeq
        && left.answerAnchorSeq === right.answerAnchorSeq
        && left.answerStep === right.answerStep
        && left.inlineReasoning === right.inlineReasoning
        && left.messageCount === right.messageCount
        && left.toolCallCount === right.toolCallCount
        && left.subagentCount === right.subagentCount;
}
/**
 * Recognize the shipped subagent delegation name and its configured variants.
 * Control tools use distinct names such as `send_message` and `list_agents`.
 * @param name - durable Tool-call name.
 * @returns whether the call creates or forks a subagent.
 */
export function isSubagentDelegationTool(name) {
    return name === 'subagent' || name.startsWith('subagent_');
}
//# sourceMappingURL=turn-process.js.map