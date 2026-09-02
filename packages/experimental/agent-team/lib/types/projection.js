/** Host-only Team state projected incrementally from committed Session events. */
import { z } from 'zod';
import { brandString } from '@deepseek-ai/dsh-brand';
import { TeamId as toTeamId, TeamMessageId as toTeamMessageId, TeamTaskId as toTeamTaskId, } from "./types.js";
import { assertTaskGraphCandidate } from "./task-graph.js";
const nonNegativeSafeInteger = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const positiveSafeInteger = nonNegativeSafeInteger.min(1);
const sessionIdSchema = z.string().min(1).transform(value => brandString(value));
const teamIdSchema = z.string().min(1).transform(value => toTeamId(value));
const numericTaskIdPattern = /^task-(\d+)$/u;
const teamTaskIdSchema = z.string().min(1).refine((value) => {
    const match = numericTaskIdPattern.exec(value);
    return match === null || Number.isSafeInteger(Number(match[1]));
}, { message: 'numeric task id suffix must be a safe integer' }).transform(value => toTeamTaskId(value));
const teamMessageIdSchema = z.string().min(1).transform(value => toTeamMessageId(value));
const coreContentBlockTypes = new Set(['text', 'reasoning', 'image', 'tool-call', 'tool-result']);
const imageAttachmentSchema = z.object({
    attachmentId: z.string().min(1),
    mediaType: z.enum(['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
    bytes: nonNegativeSafeInteger,
    width: positiveSafeInteger,
    height: positiveSafeInteger,
    name: z.string().optional(),
}).strict();
// ContentBlockMap is merge-extensible. Validate every core variant exactly,
// while retaining JSON-decoded plugin variants under an unknown type tag.
const contentBlockSchema = z.lazy(() => z.union([
    z.object({ type: z.literal('text'), text: z.string() }).strict(),
    z.object({ type: z.literal('reasoning'), text: z.string() }).strict(),
    z.object({ type: z.literal('image'), attachment: imageAttachmentSchema }).strict(),
    z.object({
        type: z.literal('tool-call'),
        id: z.string().min(1),
        name: z.string(),
        arguments: z.string(),
    }).strict(),
    z.object({
        type: z.literal('tool-result'),
        toolCallId: z.string().min(1),
        content: z.array(contentBlockSchema),
        isError: z.boolean().optional(),
    }).strict(),
    z.object({ type: z.string().min(1) }).loose().refine(block => !coreContentBlockTypes.has(block.type), { message: 'known content block types must match their declared fields' }),
]));
const teamMemberSnapshotSchema = z.object({
    id: sessionIdSchema,
    name: z.string(),
    description: z.string(),
    provider: z.string(),
    context: z.enum(['fresh', 'fork']),
    phase: z.enum(['provisioning', 'active', 'failed']),
    error: z.string().optional(),
}).strict();
const teamTaskSnapshotSchema = z.object({
    id: teamTaskIdSchema,
    revision: positiveSafeInteger,
    subject: z.string(),
    description: z.string(),
    status: z.enum(['pending', 'in_progress', 'completed', 'deleted']),
    ownerId: sessionIdSchema.optional(),
    blockedBy: z.array(teamTaskIdSchema),
    writeScopes: z.array(z.string()),
}).strict();
const teamMessageSnapshotSchema = z.object({
    id: teamMessageIdSchema,
    senderId: sessionIdSchema,
    senderName: z.string(),
    targetId: sessionIdSchema,
    content: z.array(contentBlockSchema),
}).strict();
const teamEventSelectorSchema = z.object({
    version: nonNegativeSafeInteger,
    teamId: teamIdSchema,
}).loose();
const teamMemberEventSchema = z.object({
    version: z.literal(2),
    teamId: teamIdSchema,
    member: teamMemberSnapshotSchema,
}).strict();
const teamTaskEventSchema = z.object({
    version: z.literal(2),
    teamId: teamIdSchema,
    task: teamTaskSnapshotSchema,
}).strict();
const teamMessageQueuedEventSchema = z.object({
    version: z.literal(2),
    teamId: teamIdSchema,
    message: teamMessageSnapshotSchema,
}).strict();
const teamMessageDeliveredEventSchema = z.object({
    version: z.literal(2),
    teamId: teamIdSchema,
    messageId: teamMessageIdSchema,
    targetId: sessionIdSchema,
}).strict();
/**
 * Construct empty state for one Team identity.
 * @param rootId - root Session identity.
 * @returns mutable empty Team state.
 */
export function emptyTeamState(rootId) {
    return {
        id: toTeamId(rootId),
        members: [],
        tasks: [],
        messages: [],
        delivered: [],
        nextTaskNumber: 1,
    };
}
const teamProjectionEntrySchema = z.object({
    id: teamIdSchema,
    members: z.array(teamMemberSnapshotSchema),
    tasks: z.array(teamTaskSnapshotSchema),
    messages: z.array(teamMessageSnapshotSchema),
    delivered: z.array(teamMessageIdSchema),
    nextTaskNumber: positiveSafeInteger,
    failure: z.string().optional(),
}).strict();
/**
 * Test whether a Session event belongs to the Team domain.
 * @param event - candidate Session event.
 * @returns whether the event has a Team-owned type.
 */
export function isTeamEvent(event) {
    return event.type === 'team/member'
        || event.type === 'team/task'
        || event.type === 'team/message/queued'
        || event.type === 'team/message/delivered';
}
/** Decode one persisted Team value and retain the schema failure as its cause. */
function parsePersisted(type, schema, value) {
    try {
        return schema.parse(value);
    }
    catch (error) {
        throw new Error(`persisted Agent Teams ${type} payload is invalid`, { cause: error });
    }
}
/** Decode the complete current-version payload selected by one Team event type. */
function parseCurrentTeamEvent(event) {
    switch (event.type) {
        case 'team/member':
            return { ...event, data: parsePersisted(event.type, teamMemberEventSchema, event.data) };
        case 'team/task':
            return { ...event, data: parsePersisted(event.type, teamTaskEventSchema, event.data) };
        case 'team/message/queued':
            return { ...event, data: parsePersisted(event.type, teamMessageQueuedEventSchema, event.data) };
        case 'team/message/delivered':
            return { ...event, data: parsePersisted(event.type, teamMessageDeliveredEventSchema, event.data) };
        /* v8 ignore next 2 -- TeamEventType is closed and every member is handled above. */
        default:
            return event;
    }
}
function applyProjectionEvent(state, event) {
    if (state.failure !== undefined)
        return;
    if (!isTeamEvent(event))
        return;
    try {
        const selector = parsePersisted(event.type, teamEventSelectorSchema, event.data);
        if (selector.teamId !== state.id)
            return;
        if (selector.version !== 2) {
            throw new Error(`unsupported Agent Teams event version ${String(selector.version)}`);
        }
        applyCurrentTeamEvent(state, parseCurrentTeamEvent(event));
    }
    catch (error) {
        /* v8 ignore next -- the owned Team transition throws Error instances. */
        state.failure = error instanceof Error ? error.message : String(error);
    }
}
function applyCurrentTeamEvent(state, event) {
    switch (event.type) {
        case 'team/member': {
            const member = event.data.member;
            const index = state.members.findIndex(candidate => candidate.id === member.id);
            const prior = state.members[index];
            const named = state.members.find(candidate => candidate.name === member.name);
            if (named !== undefined && named.id !== member.id) {
                throw new Error(`teammate name "${member.name}" is reused by another member`);
            }
            if (prior === undefined) {
                if (member.phase !== 'provisioning')
                    throw new Error(`teammate "${member.name}" must begin provisioning`);
            }
            else {
                if (prior.name !== member.name || prior.provider !== member.provider || prior.context !== member.context) {
                    throw new Error(`teammate "${member.id}" changed immutable identity fields`);
                }
                if (prior.phase !== 'provisioning' || member.phase === 'provisioning') {
                    throw new Error(`teammate "${member.name}" has an invalid ${prior.phase} -> ${member.phase} transition`);
                }
            }
            if (index < 0)
                state.members.push(member);
            else
                state.members[index] = member;
            break;
        }
        case 'team/task': {
            const task = event.data.task;
            const index = state.tasks.findIndex(candidate => candidate.id === task.id);
            const prior = state.tasks[index];
            if (prior === undefined && task.revision !== 1) {
                throw new Error(`team task "${task.id}" must begin at revision 1`);
            }
            if (prior !== undefined && task.revision !== prior.revision + 1) {
                throw new Error(`team task "${task.id}" revision is not contiguous`);
            }
            assertTaskGraphCandidate(state.tasks, task);
            const match = numericTaskIdPattern.exec(task.id);
            if (match !== null) {
                const number = Number(match[1]);
                state.nextTaskNumber = Math.max(state.nextTaskNumber, number === Number.MAX_SAFE_INTEGER ? number : number + 1);
            }
            if (index < 0)
                state.tasks.push(task);
            else
                state.tasks[index] = task;
            break;
        }
        case 'team/message/queued': {
            const message = event.data.message;
            if (state.messages.some(candidate => candidate.id === message.id)) {
                throw new Error(`team message "${message.id}" was queued twice`);
            }
            state.messages.push(message);
            break;
        }
        case 'team/message/delivered': {
            const queued = state.messages.find(message => message.id === event.data.messageId);
            if (queued === undefined)
                throw new Error(`team message "${event.data.messageId}" was delivered before queueing`);
            if (queued.targetId !== event.data.targetId)
                throw new Error(`team message "${event.data.messageId}" target changed`);
            if (state.delivered.includes(event.data.messageId))
                throw new Error(`team message "${event.data.messageId}" was delivered twice`);
            state.delivered.push(event.data.messageId);
            break;
        }
        /* v8 ignore next 2 -- TeamEventType is closed and every member is handled above. */
        default:
            return;
    }
}
/** Host-only Team projection selected by the projected Session identity. */
export const teamProjectionDefinition = {
    key: 'agentTeam',
    stateVersion: 3,
    stateSchema: teamProjectionEntrySchema,
    init: header => emptyTeamState(header.id),
    apply: (state, event) => {
        applyProjectionEvent(state, event);
        return state;
    },
};
//# sourceMappingURL=projection.js.map