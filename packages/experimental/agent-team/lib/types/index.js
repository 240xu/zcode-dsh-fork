/** Agent Teams service façade over roster, mailbox, task, and runtime lifecycle owners. */
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
import z from '@deepseek-ai/schemastery';
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { TeamActivity } from "./activity.js";
import { errorMessage, TeamError } from "./error.js";
import { TeamJournal } from "./journal.js";
import { TeamRuntimeLifecycle } from "./lifecycle.js";
import { TeamMailbox } from "./mailbox.js";
import { teamProjectionDefinition } from "./projection.js";
import { TeamRoster } from "./roster.js";
import { TeamTaskBoard } from "./task-board.js";
import { TeamId } from "./types.js";
export { TeamId, TeamMessageId, TeamTaskId } from "./types.js";
export { TeamError } from "./error.js";
const DEFAULT_MAX_MEMBERS = 8;
const DEFAULT_MAX_TASKS = 256;
const DEFAULT_MAX_PENDING_MESSAGES = 64;
const DEFAULT_MAX_MESSAGE_BYTES = 65_536;
const DEFAULT_DISPOSAL_TIMEOUT_MS = 5_000;
/** Validate one positive safe-integer deployment limit. */
function positiveLimit(name, value) {
    if (!Number.isSafeInteger(value) || value < 1) {
        throw new TeamError(`${name} must be a positive safe integer`, 'TEAM_INVALID_CONFIG');
    }
    return value;
}
/** Agent Teams service backed by the exact live Lead Session log. */
let TeamService = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _remoteView_decorators;
    let _remoteCreateTask_decorators;
    let _remoteUpdateTask_decorators;
    return class TeamService extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _remoteView_decorators = [Remote('view')];
            _remoteCreateTask_decorators = [Remote('createTask')];
            _remoteUpdateTask_decorators = [Remote('updateTask')];
            __esDecorate(this, null, _remoteView_decorators, { kind: "method", name: "remoteView", static: false, private: false, access: { has: obj => "remoteView" in obj, get: obj => obj.remoteView }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _remoteCreateTask_decorators, { kind: "method", name: "remoteCreateTask", static: false, private: false, access: { has: obj => "remoteCreateTask" in obj, get: obj => obj.remoteCreateTask }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _remoteUpdateTask_decorators, { kind: "method", name: "remoteUpdateTask", static: false, private: false, access: { has: obj => "remoteUpdateTask" in obj, get: obj => obj.remoteUpdateTask }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        static inject = ['agents', 'sessions', 'sessionPersistence', 'sessionProjections', 'subagents'];
        static Config = z.object({
            maxMembers: z.number().step(1).min(1).default(DEFAULT_MAX_MEMBERS),
            maxTasks: z.number().step(1).min(1).default(DEFAULT_MAX_TASKS),
            maxPendingMessagesPerMember: z.number().step(1).min(1).default(DEFAULT_MAX_PENDING_MESSAGES),
            maxMessageBytes: z.number().step(1).min(1).default(DEFAULT_MAX_MESSAGE_BYTES),
            disposalTimeoutMs: z.number().step(1).min(1).default(DEFAULT_DISPOSAL_TIMEOUT_MS),
        });
        /** Validated deployment limits used by every Team operation. */
        config = __runInitializers(this, _instanceExtraInitializers);
        activity;
        lifecycle;
        journal;
        roster;
        mailbox;
        tasks;
        constructor(ctx, config = {}) {
            super(ctx, 'agentTeams');
            this.config = {
                maxMembers: positiveLimit('maxMembers', config.maxMembers ?? DEFAULT_MAX_MEMBERS),
                maxTasks: positiveLimit('maxTasks', config.maxTasks ?? DEFAULT_MAX_TASKS),
                maxPendingMessagesPerMember: positiveLimit('maxPendingMessagesPerMember', config.maxPendingMessagesPerMember ?? DEFAULT_MAX_PENDING_MESSAGES),
                maxMessageBytes: positiveLimit('maxMessageBytes', config.maxMessageBytes ?? DEFAULT_MAX_MESSAGE_BYTES),
                disposalTimeoutMs: positiveLimit('disposalTimeoutMs', config.disposalTimeoutMs ?? DEFAULT_DISPOSAL_TIMEOUT_MS),
            };
            this.activity = new TeamActivity();
            this.lifecycle = new TeamRuntimeLifecycle(this.config.disposalTimeoutMs);
            this.journal = new TeamJournal(ctx, (root) => { this.activity.notify(TeamId(root.id)); });
            this.roster = new TeamRoster(ctx, this.journal, this.lifecycle, this.config.maxMembers);
            this.mailbox = new TeamMailbox(ctx, this.journal, this.roster, this.lifecycle, this.config.maxPendingMessagesPerMember, this.config.maxMessageBytes);
            this.tasks = new TeamTaskBoard(this.journal, this.config.maxTasks);
            ctx.on('session/event', (session, event) => { this.mailbox.observeSessionEvent(session, event); });
            ctx.on('agent/session-start', ({ agent }) => { this.scheduleRecovery(agent); });
            ctx.on('agent/status', ({ agent }) => {
                const membership = this.roster.tryMembership(agent);
                if (membership !== undefined)
                    this.activity.notify(membership.id);
            });
            ctx.effect(() => {
                const disposeProjection = ctx.root.sessionProjections.register(teamProjectionDefinition);
                return async () => {
                    try {
                        await this.disposeRuntime();
                    }
                    finally {
                        disposeProjection();
                    }
                };
            }, 'agentTeams.runtimeLifecycle()');
            for (const agent of ctx.agents.list())
                this.scheduleRecovery(agent);
        }
        /**
         * Resolve one exact live Agent's Team role.
         * @param agent - exact live Agent used as the authority credential.
         * @returns its root, Team identity, role, and model-facing name.
         */
        membership(agent) {
            return this.roster.membership(agent);
        }
        /**
         * List the runtime-enriched roster visible to one Team member.
         * @param agent - exact live Team member.
         * @returns Lead and teammate rows in creation order.
         */
        listMembers(agent) {
            return this.roster.list(this.roster.membership(agent));
        }
        /**
         * Create one named, continuable direct child of the Team Lead.
         * @param caller - exact live Lead Agent.
         * @param request - immutable name, description, prompt, context mode, provider, and cancellation.
         * @returns the active roster row.
         */
        async spawnTeammate(caller, request) {
            return await this.roster.spawn(caller, request);
        }
        /**
         * Queue one durable peer message, then attempt immediate delivery.
         * @param caller - exact live sending Team member.
         * @param request - target name, content, and pre-queue cancellation.
         * @returns durable message identity and immediate-delivery observation.
         */
        async sendMessage(caller, request) {
            return await this.mailbox.send(caller, request);
        }
        /**
         * Create one unowned pending task in the Team Lead log.
         * @param caller - exact live Team member creating the task.
         * @param request - task text, blockers, and advisory write scopes.
         * @returns the revision-one task view.
         */
        async createTask(caller, request) {
            return await this.tasks.create(this.roster.membership(caller), request);
        }
        /**
         * Return one task, including a deleted tombstone.
         * @param caller - exact live Team member reading the task.
         * @param id - Team-local task identity.
         * @returns the latest task value and derived readiness diagnostics.
         */
        getTask(caller, id) {
            return this.tasks.get(this.roster.membership(caller), id);
        }
        /**
         * List current non-deleted tasks in numeric creation order.
         * @param caller - exact live Team member reading the board.
         * @returns detached current task views.
         */
        listTasks(caller) {
            return this.tasks.list(this.roster.membership(caller));
        }
        /**
         * Compare-and-set one authorized task transition.
         * @param caller - exact live Team member authorizing the mutation.
         * @param request - task identity, expected revision, action, and action fields.
         * @returns the committed next task revision.
         */
        async updateTask(caller, request) {
            return await this.tasks.update(caller, this.roster.membership(caller), request);
        }
        /**
         * Wait for the next Team-domain or member-status change.
         * @param caller - exact live Team member waiting for activity.
         * @param timeoutMs - bounded wait duration from ten seconds through one hour.
         * @param signal - caller cancellation for the wait only.
         * @returns one observed change or a timeout result.
         */
        async waitForChange(caller, timeoutMs, signal) {
            const membership = this.roster.membership(caller);
            return await this.activity.wait(membership.id, timeoutMs, signal);
        }
        /**
         * Interrupt one live teammate turn without clearing its pending inbox.
         * @param caller - exact live Lead Agent.
         * @param targetName - durable teammate name.
         * @returns the target status sampled before cancellation.
         */
        interrupt(caller, targetName) {
            return this.roster.interrupt(caller, targetName);
        }
        /**
         * Resolve a caller without throwing, used by scoped-tool installation and observers.
         * @param agent - candidate exact live Agent.
         * @returns Team membership, or undefined for non-Team subagents and stale identities.
         */
        tryMembership(agent) {
            return this.roster.tryMembership(agent);
        }
        /**
         * Read the current roster and non-deleted task board through the generated Remote API.
         * @param agent - exact live Team member used as the authority credential.
         * @returns detached current roster and task views.
         */
        remoteView(agent) {
            return {
                members: this.listMembers(agent),
                tasks: this.listTasks(agent),
            };
        }
        /**
         * Create one shared task through the generated Remote API.
         * @param agent - exact live Team member creating the task.
         * @param request - task text, blockers, and advisory write scopes.
         * @returns the revision-one task or a typed Team rejection.
         */
        remoteCreateTask(agent, request) {
            return this.taskMutationResult(this.createTask(agent, request));
        }
        /**
         * Apply one task mutation and preserve Team rejections as business results.
         * @param agent - exact live Team member authorizing the mutation.
         * @param request - task identity, expected revision, action, and action fields.
         * @returns the committed task or a typed Team rejection.
         */
        remoteUpdateTask(agent, request) {
            return this.taskMutationResult(this.updateTask(agent, request));
        }
        /** Preserve Team task rejections while allowing unexpected failures to reject the Remote call. */
        async taskMutationResult(operation) {
            try {
                return { ok: true, value: await operation };
            }
            catch (error) {
                if (!(error instanceof TeamError))
                    throw error;
                return {
                    ok: false,
                    error: {
                        code: error.code === 'TEAM_TASK_STALE_REVISION' ? 'team-task-conflict' : 'team-rejected',
                        message: error.message,
                    },
                };
            }
        }
        /** Queue one contained recovery pass after publication has unwound. */
        scheduleRecovery(agent) {
            queueMicrotask(() => {
                if (this.lifecycle.disposed)
                    return;
                void this.recoverFor(agent).catch((error) => {
                    if (this.lifecycle.disposed)
                        return;
                    this.ctx.logger.warn(`Agent Teams recovery for "${agent.id}" failed: ${errorMessage(error)}`);
                });
            });
        }
        /** Reconcile roster provisioning before retrying that member's pending mailbox. */
        async recoverFor(agent) {
            await this.roster.recoverFor(agent, this.lifecycle.signal);
            await this.mailbox.recoverFor(agent, this.lifecycle.signal);
        }
        /** Stop Team-owned live branches and release every waiter before service disposal completes. */
        async disposeRuntime() {
            this.lifecycle.close();
            this.activity.close();
            const failures = [];
            await this.lifecycle.settle(this.roster.pendingCreations(), failures);
            await this.lifecycle.settle(this.mailbox.pendingDispatches(), failures);
            for (const [root, childIds] of this.roster.liveChildrenByRoot()) {
                try {
                    await this.roster.stopTeammates(root, childIds);
                }
                catch (error) {
                    failures.push(error);
                }
            }
            if (failures.length > 0)
                throw new AggregateError(failures, 'Agent Teams runtime disposal failed');
        }
    };
})();
export { TeamService };
export default TeamService;
//# sourceMappingURL=index.js.map