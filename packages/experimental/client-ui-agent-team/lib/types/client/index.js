/** Browser entry binding the generated Team Remote artifact to its Client UI. */
import agentTeamsRemote from '@deepseek-ai/dsh-experimental-agent-team/remote';
import { mountAgentTeamUi } from "./mount.js";
export { inject } from "./mount.js";
/** Mount the generated Team Remote contribution and its browser UI. */
export async function apply(ctx) {
    return await mountAgentTeamUi(ctx, agentTeamsRemote);
}
//# sourceMappingURL=index.js.map