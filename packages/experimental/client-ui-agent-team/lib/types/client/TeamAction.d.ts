import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { TeamMemberView as TeamRosterMember, TeamTaskAction, TeamTaskId, TeamTaskMutationResult, TeamView } from '@deepseek-ai/dsh-experimental-agent-team/client';
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client';
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { NS } from './locales.ts';
/** Generated Remote result consumed directly by the Team UI. */
export type TeamActionResult<T> = RemoteResult<T>;
/** Generated Remote result whose business value preserves Team task rejections. */
export type TeamTaskActionResult = RemoteResult<TeamTaskMutationResult>;
/** Business actions injected by the browser plugin. */
export interface TeamActionInjected {
    load: (sessionId: SessionId) => Promise<TeamActionResult<TeamView>>;
    createTask: (sessionId: SessionId, input: {
        subject: string;
        description: string;
        blockedBy: TeamTaskId[];
        writeScopes: string[];
    }) => Promise<TeamTaskActionResult>;
    updateTask: (sessionId: SessionId, input: {
        taskId: TeamTaskId;
        expectedRevision: number;
        action: TeamTaskAction;
        subject?: string;
        description?: string;
        blockedBy?: TeamTaskId[];
        writeScopes?: string[];
        owner?: string;
    }) => Promise<TeamTaskActionResult>;
    openTeammate: (sessionId: SessionId, member: TeamRosterMember) => Promise<void>;
}
/** Full props of the Team conversation-header action. */
export type TeamActionProps = PropsRuntime<'conversation.session.header.actions'> & TeamActionInjected & PropsLocale<typeof NS>;
/** Render the live Team roster and compare-and-set task board. */
export declare function TeamAction({ sessionId, load, createTask, updateTask, openTeammate, t, }: TeamActionProps): import("react").JSX.Element;
//# sourceMappingURL=TeamAction.d.ts.map