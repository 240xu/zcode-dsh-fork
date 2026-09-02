/** Source-safe Agent Teams browser registration and Remote mount lifecycle. */
import { TeamAction, } from "./TeamAction.js";
import { en, NS, zh } from "./locales.js";
/** Required browser services for RPC, navigation, slots, and localized copy. */
export const inject = ['sessions', 'remote', 'slots', 'locale'];
function registerUi(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'client-ui-agent-team: dictionaries');
    const sessions = ctx.sessions;
    const leadSessionId = (sessionId) => {
        const address = sessions.binding(sessionId)?.session.getSnapshot().subagent?.address;
        return address?.parentSessionId ?? sessionId;
    };
    const actions = {
        async load(sessionId) {
            return await ctx.remote.agentTeams.view(leadSessionId(sessionId));
        },
        async createTask(sessionId, input) {
            return await ctx.remote.agentTeams.createTask(leadSessionId(sessionId), input);
        },
        async updateTask(sessionId, input) {
            const { owner, ...rest } = input;
            return await ctx.remote.agentTeams.updateTask(leadSessionId(sessionId), {
                ...rest,
                ...owner === undefined ? {} : { owner },
            });
        },
        async openTeammate(sessionId, member) {
            if (member.role !== 'teammate')
                return;
            const parentSessionId = leadSessionId(sessionId);
            await sessions.refreshSubagents(parentSessionId);
            if (sessions.list.getSnapshot().current !== sessionId)
                return;
            sessions.openSubagent({
                parentSessionId,
                childSessionId: member.id,
                mode: 'continuable',
            });
        },
    };
    ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
        name: 'conversation.session.header.actions',
        id: 'agent-team',
        order: 20,
        locale: NS,
        inject: () => actions,
    }, TeamAction));
}
/**
 * Mount one generated Team Remote contribution, then register its browser UI.
 * @param ctx - Client Context carrying navigation, locale, slot, and Remote services.
 * @param contribution - generated Team descriptors selected by the browser entry.
 * @returns disposer for both the UI registrations and Remote namespace.
 */
export async function mountAgentTeamUi(ctx, contribution) {
    const disposeRemote = await ctx.remote.$mount(contribution);
    const ui = ctx.inject(['sessions', 'remote.agentTeams', 'slots', 'locale'], registerUi);
    try {
        await ui;
    }
    catch (error) {
        await ui.dispose();
        await disposeRemote();
        throw error;
    }
    return async () => {
        await ui.dispose();
        await disposeRemote();
    };
}
//# sourceMappingURL=mount.js.map