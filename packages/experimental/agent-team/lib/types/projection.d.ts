/** Host-only Team state projected incrementally from committed Session events. */
import { z } from 'zod';
import type { SessionEvent, SessionId } from '@deepseek-ai/dsh-session';
import type { TeamId, TeamMemberSnapshot, TeamMessageId, TeamMessageSnapshot, TeamTaskSnapshot } from './types.ts';
/** Current Team state selected by durable Team identity. */
export interface TeamState {
    readonly id: TeamId;
    readonly members: TeamMemberSnapshot[];
    readonly tasks: TeamTaskSnapshot[];
    readonly messages: TeamMessageSnapshot[];
    readonly delivered: TeamMessageId[];
    nextTaskNumber: number;
}
/**
 * Construct empty state for one Team identity.
 * @param rootId - root Session identity.
 * @returns mutable empty Team state.
 */
export declare function emptyTeamState(rootId: SessionId): TeamProjectionState;
/** Checkpoint-safe state for the Team owned by the projected Session. */
export interface TeamProjectionState extends TeamState {
    failure?: string;
}
declare module '@deepseek-ai/dsh-session-projection/types' {
    interface SessionProjectionStateMap {
        agentTeam: TeamProjectionState;
    }
}
/** Whether one event belongs to the Team domain. */
export type TeamEventType = 'team/member' | 'team/task' | 'team/message/queued' | 'team/message/delivered';
/** One event owned by the Team domain. */
type TeamSessionEvent = SessionEvent<TeamEventType>;
/**
 * Test whether a Session event belongs to the Team domain.
 * @param event - candidate Session event.
 * @returns whether the event has a Team-owned type.
 */
export declare function isTeamEvent(event: SessionEvent): event is TeamSessionEvent;
/** Host-only Team projection selected by the projected Session identity. */
export declare const teamProjectionDefinition: {
    key: "agentTeam";
    stateVersion: number;
    stateSchema: z.ZodType<TeamProjectionState, unknown, z.core.$ZodTypeInternals<TeamProjectionState, unknown>>;
    init: (header: import("@deepseek-ai/dsh-session").SessionHeader) => TeamProjectionState;
    apply: (state: NoInfer<TeamProjectionState>, event: SessionEvent) => TeamProjectionState;
};
export {};
//# sourceMappingURL=projection.d.ts.map