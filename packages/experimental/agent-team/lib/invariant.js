import { z } from "zod";
import { brandString } from "@deepseek-ai/dsh-brand";
//#region lib/types/types.js
/** Public Agent Teams identities, durable records, and service request values. */
/**
* Brand one root Session identity as its implicit Team identity.
* @param id - Root Session identity.
* @returns the same string branded as a Team identity.
*/
function TeamId(id) {
	return id;
}
/**
* Brand a validated task id.
* @param id - Team-local task identity.
* @returns the same string branded as a Team task identity.
*/
function TeamTaskId(id) {
	return id;
}
/**
* Brand a generated peer-message id.
* @param id - Durable mailbox message identity.
* @returns the same string branded as a Team message identity.
*/
function TeamMessageId(id) {
	return id;
}
//#endregion
//#region lib/types/task-graph.js
/** Complete dependency validation for current Team task snapshots. */
/** Package-private task dependency failure retained for command error mapping. */
var TeamTaskGraphError = class extends Error {
	violation;
	/**
	* @param message - concrete invalid dependency relation.
	* @param violation - stable relation category used by Team commands.
	*/
	constructor(message, violation) {
		super(message);
		this.violation = violation;
		this.name = "TeamTaskGraphError";
	}
};
/**
* Validate the complete active task graph after replacing one candidate snapshot.
* @param current - current task snapshots before the candidate event.
* @param candidate - new or next-revision task snapshot.
* @throws {TeamTaskGraphError} when an active dependency is missing, duplicated, self-referential, or cyclic.
*/
function assertTaskGraphCandidate(current, candidate) {
	const tasks = new Map(current.map((task) => [task.id, task]));
	tasks.set(candidate.id, candidate);
	for (const task of tasks.values()) {
		if (task.status === "deleted") continue;
		const seen = /* @__PURE__ */ new Set();
		for (const blockerId of task.blockedBy) {
			if (blockerId === task.id) throw new TeamTaskGraphError(`team task "${task.id}" cannot block itself`, "cycle");
			if (seen.has(blockerId)) throw new TeamTaskGraphError(`team task "${task.id}" repeats blocker "${blockerId}"`, "duplicate");
			const blocker = tasks.get(blockerId);
			if (blocker === void 0 || blocker.status === "deleted") throw new TeamTaskGraphError(`blocker task "${blockerId}" for "${task.id}" is missing or deleted`, "missing");
			seen.add(blockerId);
		}
	}
	const visiting = /* @__PURE__ */ new Set();
	const visited = /* @__PURE__ */ new Set();
	const visit = (id) => {
		if (visiting.has(id)) throw new TeamTaskGraphError(`task dependency cycle includes "${id}"`, "cycle");
		if (visited.has(id)) return;
		const task = tasks.get(id);
		if (task === void 0 || task.status === "deleted") return;
		visiting.add(id);
		for (const blockerId of task.blockedBy) visit(blockerId);
		visiting.delete(id);
		visited.add(id);
	};
	for (const task of tasks.values()) visit(task.id);
}
//#endregion
//#region lib/types/projection.js
/** Host-only Team state projected incrementally from committed Session events. */
const nonNegativeSafeInteger = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const positiveSafeInteger = nonNegativeSafeInteger.min(1);
const sessionIdSchema = z.string().min(1).transform((value) => brandString(value));
const teamIdSchema = z.string().min(1).transform((value) => TeamId(value));
const numericTaskIdPattern = /^task-(\d+)$/u;
const teamTaskIdSchema = z.string().min(1).refine((value) => {
	const match = numericTaskIdPattern.exec(value);
	return match === null || Number.isSafeInteger(Number(match[1]));
}, { message: "numeric task id suffix must be a safe integer" }).transform((value) => TeamTaskId(value));
const teamMessageIdSchema = z.string().min(1).transform((value) => TeamMessageId(value));
const coreContentBlockTypes = new Set([
	"text",
	"reasoning",
	"image",
	"tool-call",
	"tool-result"
]);
const imageAttachmentSchema = z.object({
	attachmentId: z.string().min(1),
	mediaType: z.enum([
		"image/png",
		"image/jpeg",
		"image/webp",
		"image/gif"
	]),
	bytes: nonNegativeSafeInteger,
	width: positiveSafeInteger,
	height: positiveSafeInteger,
	name: z.string().optional()
}).strict();
const contentBlockSchema = z.lazy(() => z.union([
	z.object({
		type: z.literal("text"),
		text: z.string()
	}).strict(),
	z.object({
		type: z.literal("reasoning"),
		text: z.string()
	}).strict(),
	z.object({
		type: z.literal("image"),
		attachment: imageAttachmentSchema
	}).strict(),
	z.object({
		type: z.literal("tool-call"),
		id: z.string().min(1),
		name: z.string(),
		arguments: z.string()
	}).strict(),
	z.object({
		type: z.literal("tool-result"),
		toolCallId: z.string().min(1),
		content: z.array(contentBlockSchema),
		isError: z.boolean().optional()
	}).strict(),
	z.object({ type: z.string().min(1) }).loose().refine((block) => !coreContentBlockTypes.has(block.type), { message: "known content block types must match their declared fields" })
]));
const teamMemberSnapshotSchema = z.object({
	id: sessionIdSchema,
	name: z.string(),
	description: z.string(),
	provider: z.string(),
	context: z.enum(["fresh", "fork"]),
	phase: z.enum([
		"provisioning",
		"active",
		"failed"
	]),
	error: z.string().optional()
}).strict();
const teamTaskSnapshotSchema = z.object({
	id: teamTaskIdSchema,
	revision: positiveSafeInteger,
	subject: z.string(),
	description: z.string(),
	status: z.enum([
		"pending",
		"in_progress",
		"completed",
		"deleted"
	]),
	ownerId: sessionIdSchema.optional(),
	blockedBy: z.array(teamTaskIdSchema),
	writeScopes: z.array(z.string())
}).strict();
const teamMessageSnapshotSchema = z.object({
	id: teamMessageIdSchema,
	senderId: sessionIdSchema,
	senderName: z.string(),
	targetId: sessionIdSchema,
	content: z.array(contentBlockSchema)
}).strict();
const teamEventSelectorSchema = z.object({
	version: nonNegativeSafeInteger,
	teamId: teamIdSchema
}).loose();
const teamMemberEventSchema = z.object({
	version: z.literal(2),
	teamId: teamIdSchema,
	member: teamMemberSnapshotSchema
}).strict();
const teamTaskEventSchema = z.object({
	version: z.literal(2),
	teamId: teamIdSchema,
	task: teamTaskSnapshotSchema
}).strict();
const teamMessageQueuedEventSchema = z.object({
	version: z.literal(2),
	teamId: teamIdSchema,
	message: teamMessageSnapshotSchema
}).strict();
const teamMessageDeliveredEventSchema = z.object({
	version: z.literal(2),
	teamId: teamIdSchema,
	messageId: teamMessageIdSchema,
	targetId: sessionIdSchema
}).strict();
/**
* Construct empty state for one Team identity.
* @param rootId - root Session identity.
* @returns mutable empty Team state.
*/
function emptyTeamState(rootId) {
	return {
		id: TeamId(rootId),
		members: [],
		tasks: [],
		messages: [],
		delivered: [],
		nextTaskNumber: 1
	};
}
const teamProjectionEntrySchema = z.object({
	id: teamIdSchema,
	members: z.array(teamMemberSnapshotSchema),
	tasks: z.array(teamTaskSnapshotSchema),
	messages: z.array(teamMessageSnapshotSchema),
	delivered: z.array(teamMessageIdSchema),
	nextTaskNumber: positiveSafeInteger,
	failure: z.string().optional()
}).strict();
/**
* Test whether a Session event belongs to the Team domain.
* @param event - candidate Session event.
* @returns whether the event has a Team-owned type.
*/
function isTeamEvent(event) {
	return event.type === "team/member" || event.type === "team/task" || event.type === "team/message/queued" || event.type === "team/message/delivered";
}
/** Decode one persisted Team value and retain the schema failure as its cause. */
function parsePersisted(type, schema, value) {
	try {
		return schema.parse(value);
	} catch (error) {
		throw new Error(`persisted Agent Teams ${type} payload is invalid`, { cause: error });
	}
}
/** Decode the complete current-version payload selected by one Team event type. */
function parseCurrentTeamEvent(event) {
	switch (event.type) {
		case "team/member": return {
			...event,
			data: parsePersisted(event.type, teamMemberEventSchema, event.data)
		};
		case "team/task": return {
			...event,
			data: parsePersisted(event.type, teamTaskEventSchema, event.data)
		};
		case "team/message/queued": return {
			...event,
			data: parsePersisted(event.type, teamMessageQueuedEventSchema, event.data)
		};
		case "team/message/delivered": return {
			...event,
			data: parsePersisted(event.type, teamMessageDeliveredEventSchema, event.data)
		};
		/* v8 ignore next 2 -- TeamEventType is closed and every member is handled above. */
		default: return event;
	}
}
function applyProjectionEvent(state, event) {
	if (state.failure !== void 0) return;
	if (!isTeamEvent(event)) return;
	try {
		const selector = parsePersisted(event.type, teamEventSelectorSchema, event.data);
		if (selector.teamId !== state.id) return;
		if (selector.version !== 2) throw new Error(`unsupported Agent Teams event version ${String(selector.version)}`);
		applyCurrentTeamEvent(state, parseCurrentTeamEvent(event));
	} catch (error) {
		/* v8 ignore next -- the owned Team transition throws Error instances. */
		state.failure = error instanceof Error ? error.message : String(error);
	}
}
function applyCurrentTeamEvent(state, event) {
	switch (event.type) {
		case "team/member": {
			const member = event.data.member;
			const index = state.members.findIndex((candidate) => candidate.id === member.id);
			const prior = state.members[index];
			const named = state.members.find((candidate) => candidate.name === member.name);
			if (named !== void 0 && named.id !== member.id) throw new Error(`teammate name "${member.name}" is reused by another member`);
			if (prior === void 0) {
				if (member.phase !== "provisioning") throw new Error(`teammate "${member.name}" must begin provisioning`);
			} else {
				if (prior.name !== member.name || prior.provider !== member.provider || prior.context !== member.context) throw new Error(`teammate "${member.id}" changed immutable identity fields`);
				if (prior.phase !== "provisioning" || member.phase === "provisioning") throw new Error(`teammate "${member.name}" has an invalid ${prior.phase} -> ${member.phase} transition`);
			}
			if (index < 0) state.members.push(member);
			else state.members[index] = member;
			break;
		}
		case "team/task": {
			const task = event.data.task;
			const index = state.tasks.findIndex((candidate) => candidate.id === task.id);
			const prior = state.tasks[index];
			if (prior === void 0 && task.revision !== 1) throw new Error(`team task "${task.id}" must begin at revision 1`);
			if (prior !== void 0 && task.revision !== prior.revision + 1) throw new Error(`team task "${task.id}" revision is not contiguous`);
			assertTaskGraphCandidate(state.tasks, task);
			const match = numericTaskIdPattern.exec(task.id);
			if (match !== null) {
				const number = Number(match[1]);
				state.nextTaskNumber = Math.max(state.nextTaskNumber, number === Number.MAX_SAFE_INTEGER ? number : number + 1);
			}
			if (index < 0) state.tasks.push(task);
			else state.tasks[index] = task;
			break;
		}
		case "team/message/queued": {
			const message = event.data.message;
			if (state.messages.some((candidate) => candidate.id === message.id)) throw new Error(`team message "${message.id}" was queued twice`);
			state.messages.push(message);
			break;
		}
		case "team/message/delivered": {
			const queued = state.messages.find((message) => message.id === event.data.messageId);
			if (queued === void 0) throw new Error(`team message "${event.data.messageId}" was delivered before queueing`);
			if (queued.targetId !== event.data.targetId) throw new Error(`team message "${event.data.messageId}" target changed`);
			if (state.delivered.includes(event.data.messageId)) throw new Error(`team message "${event.data.messageId}" was delivered twice`);
			state.delivered.push(event.data.messageId);
			break;
		}
		/* v8 ignore next 2 -- TeamEventType is closed and every member is handled above. */
		default: return;
	}
}
/** Host-only Team projection selected by the projected Session identity. */
const teamProjectionDefinition = {
	key: "agentTeam",
	stateVersion: 3,
	stateSchema: teamProjectionEntrySchema,
	init: (header) => emptyTeamState(header.id),
	apply: (state, event) => {
		applyProjectionEvent(state, event);
		return state;
	}
};
//#endregion
//#region lib/types/invariant.js
/** Agent Teams runtime invariant companion. */
const PACKAGE_NAME = "@deepseek-ai/dsh-experimental-agent-team";
/** Cordis companion plugin name. */
const name = "team-invariant";
/** Invariant registry required by the companion. */
const inject = ["invariants"];
/** Validate candidate Team events against the projected committed prefix. */
const install = Object.assign((ctx, fail) => {
	ctx.on("internal/dispatch", (_mode, eventName, args) => {
		if (eventName !== "session/event") return;
		const [session, event] = args;
		/* v8 ignore next -- non-Team Session events have no Agent Teams invariant. */
		if (!isTeamEvent(event)) return;
		const state = ctx.sessionProjections.stateOf(session, "agentTeam");
		const candidate = teamProjectionDefinition.apply(structuredClone(state), event);
		if (candidate.failure !== void 0) fail(`session event ${event.seq} violates the Agent Teams stream: ${candidate.failure}`);
	}, { global: true });
}, { inject: ["sessionProjections"] });
/** Register the package invariant companion. */
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//#endregion
export { apply, inject, name };
