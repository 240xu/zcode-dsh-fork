/** Durable per-session state for the user-controlled model-selection opt-in. */
import { z as zod } from 'zod';
import { assertAllowedModelRoutes } from "./model-selection.js";
const modelSelectionPolicySchema = zod.array(zod.object({
    provider: zod.string().min(1),
    model: zod.string().min(1),
}).strict()).min(1).nullable();
/** Host-only projection of the durable model-selection policy. */
export const subagentModelSelectionProjectionDefinition = {
    key: 'subagentModelSelectionPolicy',
    stateVersion: 1,
    stateSchema: modelSelectionPolicySchema,
    init: () => null,
    apply: (policy, event) => {
        if (policy !== null || event.type !== 'subagent/model-selection-policy')
            return policy;
        const { allowedModels } = event.data;
        assertAllowedModelRoutes(allowedModels);
        if (allowedModels.length === 0) {
            throw new Error('subagent/model-selection-policy requires at least one route');
        }
        return allowedModels;
    },
};
/**
 * Read the exact route list captured for a model-selectable definition.
 * @param projections - registry that owns the policy projection.
 * @param session - session whose durable decision is read.
 * @returns a detached route list, or undefined for the fixed-route definition.
 */
export function subagentModelSelectionPolicy(projections, session) {
    return projections.stateOf(session, 'subagentModelSelectionPolicy')?.map(route => ({ ...route }));
}
/**
 * Append the route policy once, before its definition can reach a model request.
 * @param projections - registry that owns the policy projection.
 * @param session - session receiving the model-selectable definition.
 * @param allowedModels - exact routes the definition may select explicitly.
 */
export function recordSubagentModelSelection(projections, session, allowedModels) {
    if (subagentModelSelectionPolicy(projections, session) !== undefined)
        return;
    session.append('subagent/model-selection-policy', {
        allowedModels: allowedModels.map(route => ({ ...route })),
    });
}
//# sourceMappingURL=model-selection-state.js.map