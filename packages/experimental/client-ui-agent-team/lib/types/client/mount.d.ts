/** Source-safe Agent Teams browser registration and Remote mount lifecycle. */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol';
import { type TeamKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Agent Teams roster and task-board copy. */
        'agent-team': TeamKey;
    }
}
/** Required browser services for RPC, navigation, slots, and localized copy. */
export declare const inject: string[];
/**
 * Mount one generated Team Remote contribution, then register its browser UI.
 * @param ctx - Client Context carrying navigation, locale, slot, and Remote services.
 * @param contribution - generated Team descriptors selected by the browser entry.
 * @returns disposer for both the UI registrations and Remote namespace.
 */
export declare function mountAgentTeamUi(ctx: ClientContext, contribution: TypertRemoteContribution): Promise<() => Promise<void>>;
//# sourceMappingURL=mount.d.ts.map