/** Agent Teams runtime invariant companion. */
import { isTeamEvent, teamProjectionDefinition, } from "./projection.js";
const PACKAGE_NAME = '@deepseek-ai/dsh-experimental-agent-team';
/** Cordis companion plugin name. */
export const name = 'team-invariant';
/** Invariant registry required by the companion. */
export const inject = ['invariants'];
/** Validate candidate Team events against the projected committed prefix. */
const install = Object.assign((ctx, fail) => {
    ctx.on('internal/dispatch', (_mode, eventName, args) => {
        if (eventName !== 'session/event')
            return;
        const [session, event] = args;
        /* v8 ignore next -- non-Team Session events have no Agent Teams invariant. */
        if (!isTeamEvent(event))
            return;
        const state = ctx.sessionProjections.stateOf(session, 'agentTeam');
        const candidate = teamProjectionDefinition.apply(structuredClone(state), event);
        if (candidate.failure !== undefined) {
            fail(`session event ${event.seq} violates the Agent Teams stream: ${candidate.failure}`);
        }
    }, { global: true });
}, { inject: ['sessionProjections'] });
/** Register the package invariant companion. */
export const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//# sourceMappingURL=invariant.js.map