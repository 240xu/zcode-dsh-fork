import { createScope, MutableSessionEventSource, scopeOf, SESSION_SEARCH_RESULT_LIMIT, } from '@deepseek-ai/dsh-api-session-controller/client';
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store';
import { sessionSnapshot } from "./fixtures.js";
/**
 * The fixture-backed session face: lifecycle reads delegate to the fixture's
 * snapshot store; Session verbs are fail-loud stubs unless the
 * fixture supplies them (the runtime never fakes behavior a test did not
 * declare — an unstubbed call names itself instead of half-working). Extra
 * fixture methods are grafted verbatim for feature-side casts.
 */
export class FixtureSession {
    sessionId;
    store;
    /** Mutable event source consumed only by Conversation assembly. */
    eventSource = new MutableSessionEventSource();
    /**
     * Identity-stable per-key faces over fixture-controlled projection values.
     */
    projections;
    /**
     * @param sessionId - host identity (branded view of the fixture id).
     * @param store - Session Controller snapshot store.
     * @param overrides - fixture-declared behavior face, grafted over the stubs.
     */
    constructor(sessionId, store, overrides) {
        this.sessionId = sessionId;
        this.store = store;
        const values = new Map();
        const listeners = new Map();
        const faces = new Map();
        this.projections = {
            faceOf: (key) => {
                let face = faces.get(key);
                if (face === undefined) {
                    face = {
                        getSnapshot: () => values.get(key),
                        subscribe: (fn) => {
                            const set = listeners.get(key) ?? new Set();
                            set.add(fn);
                            listeners.set(key, set);
                            return () => { set.delete(fn); };
                        },
                    };
                    faces.set(key, face);
                }
                return face;
            },
            set: (key, value) => {
                values.set(key, value);
                for (const fn of [...(listeners.get(key) ?? [])])
                    fn();
            },
        };
        Object.assign(this, overrides);
    }
    /** @returns the fixture Session Controller snapshot (useSession read side). */
    getSnapshot() {
        return this.store.getSnapshot();
    }
    /**
     * Subscribe to fixture snapshot changes.
     * @param fn - change callback.
     * @returns unsubscribe.
     */
    subscribe(fn) {
        return this.store.subscribe(fn);
    }
    /**
     * Fail-loud stub; supply `prompt` on the fixture's session face to exercise it.
     * @returns never — always throws.
     */
    prompt() {
        throw new Error(`test session "${this.sessionId}": prompt is not stubbed — supply it on the fixture's session face`);
    }
    /**
     * Minimal local-echo registration: mints an identity without touching the
     * fixture snapshot (submission echoes are client-only presentation state).
     * Supply `beginSubmission` on the fixture's session face to observe echoes.
     * @returns a handle whose abandon is a no-op.
     */
    beginSubmission() {
        this.submissionSeq += 1;
        return {
            requestId: `test-submission-${this.submissionSeq}`,
            abandon: () => { },
        };
    }
    submissionSeq = 0;
    /**
     * Fail-loud stub; supply `readAttachment` on the fixture's session face to exercise it.
     * @param _attachmentId - opaque durable attachment id.
     * @returns never — always throws.
     */
    readAttachment(_attachmentId) {
        throw new Error(`test session "${this.sessionId}": readAttachment is not stubbed — supply it on the fixture's session face`);
    }
    /**
     * Fail-loud stub; supply `updateQueue` on the fixture's session face to exercise it.
     * @returns never — always throws.
     */
    updateQueue() {
        throw new Error(`test session "${this.sessionId}": updateQueue is not stubbed — supply it on the fixture's session face`);
    }
    /**
     * Fail-loud stub; supply `cancel` on the fixture's session face to exercise it.
     * @returns never — always throws.
     */
    cancel() {
        throw new Error(`test session "${this.sessionId}": cancel is not stubbed — supply it on the fixture's session face`);
    }
    /**
     * Fail-loud stub; supply `command` on the fixture's session face to exercise it.
     * @returns never — always throws.
     */
    command() {
        throw new Error(`test session "${this.sessionId}": command is not stubbed — supply it on the fixture's session face`);
    }
    /**
     * Fail-loud stub; supply `loadOlder` on the fixture's session face to exercise it.
     * @returns never — always throws.
     */
    loadOlder() {
        throw new Error(`test session "${this.sessionId}": loadOlder is not stubbed — supply it on the fixture's session face`);
    }
    /**
     * Fail-loud stub; supply `loadThrough` on the fixture's session face to exercise it.
     * @returns never — always throws.
     */
    loadThrough() {
        throw new Error(`test session "${this.sessionId}": loadThrough is not stubbed — supply it on the fixture's session face`);
    }
    /**
     * Fail-loud stub; supply `rename` on the fixture's session face to exercise it.
     * @returns never — always throws.
     */
    rename() {
        throw new Error(`test session "${this.sessionId}": rename is not stubbed — supply it on the fixture's session face`);
    }
}
/**
 * Sessions test double behind the renderer host and feature injects: owns the
 * list/current observable, scope minting through the production `createScope`,
 * stable Controller bindings, and the session behavior face supplied per
 * fixture. `ui-session` owns standard-source materialization.
 *
 * Implements the same ISessions face features receive as `ctx.sessions`, so
 * a production face change breaks this double at compile time; the extra
 * members (add/updateSessionSnapshot/event-window drivers/setCurrent/remove/
 * behavior/calls/stubs) are bench-only surface.
 */
export class TestSessions {
    stabilize;
    rootCtx;
    /** The useSessions standard feed (list rows + current selection). */
    list;
    records = new Map();
    /** Calls observed on the service-level face, newest last. */
    calls = [];
    /** The wire schema's `session.search` result bound (production parity). */
    searchResultLimit = SESSION_SEARCH_RESULT_LIMIT;
    /** Replaceable search behavior (see {@link TestSessions.stubSearch}). */
    searchStub;
    createStub;
    /**
     * @param stabilize - the owning runtime's act wrapper.
     * @param rootCtx - the runtime's Cordis root; scope fibers mount under it.
     */
    constructor(stabilize, rootCtx) {
        this.stabilize = stabilize;
        this.rootCtx = rootCtx;
        this.list = createSnapshotStore({
            ids: [], byId: {}, current: undefined, phase: 'ready',
            subagentsByParent: {}, jobsBySession: {}, currentAddress: undefined,
        });
    }
    /**
     * Add a session from a fixture and (by default) make it current.
     * @param fixture - identity + snapshot/summary overrides + behavior face.
     * @param opts - pass `current: false` to add without selecting.
     * @returns the stable session id (branded view of `fixture.id`).
     */
    async add(fixture, opts) {
        const id = fixture.id;
        if (this.records.has(id))
            throw new Error(`test session "${id}" already added`);
        const summary = {
            id,
            displayTitle: fixture.id,
            running: false,
            blank: false,
            updatedAt: this.records.size + 1,
            ...fixture.summary,
        };
        const snapshot = createSnapshotStore({
            ...sessionSnapshot(id),
            ...fixture.snapshot,
        });
        const session = new FixtureSession(id, snapshot, fixture.session ?? {});
        if (fixture.events !== undefined || fixture.hasMore === true) {
            session.eventSource.replace(fixture.events ?? [], fixture.hasMore ?? false);
        }
        this.records.set(id, {
            summary,
            snapshot,
            session,
            scope: undefined,
            scopeFiber: undefined,
            binding: undefined,
        });
        await this.stabilize(() => {
            this.list.update((draft) => {
                draft.ids.push(id);
                draft.byId[id] = summary;
                if (opts?.current !== false)
                    draft.current = id;
            });
        });
        return id;
    }
    /**
     * Update Session Controller lifecycle state through an immer draft.
     * @param id - session id.
     * @param mutate - draft mutator.
     */
    async updateSessionSnapshot(id, mutate) {
        const record = this.require(id);
        await this.stabilize(() => { record.snapshot.update(mutate); });
    }
    /**
     * Replace a Session's complete contiguous event window.
     * @param id - Session identity.
     * @param entries - complete event window.
     * @param hasMore - whether older history remains.
     */
    async replaceEvents(id, entries, hasMore = false) {
        await this.stabilize(() => { this.require(id).session.eventSource.replace(entries, hasMore); });
    }
    /**
     * Prepend one older contiguous event page.
     * @param id - Session identity.
     * @param entries - older entries.
     * @param hasMore - whether another older page remains.
     */
    async prependEvents(id, entries, hasMore = false) {
        await this.stabilize(() => { this.require(id).session.eventSource.prepend(entries, hasMore); });
    }
    /**
     * Append one live event to a Session's contiguous window.
     * @param id - Session identity.
     * @param entry - live event entry.
     */
    async appendEvent(id, entry) {
        await this.stabilize(() => { this.require(id).session.eventSource.append(entry); });
    }
    /**
     * Update a session's list row (the wire-echo stand-in: title settles,
     * running flips — components subscribed via useSessions re-render).
     * @param id - session id.
     * @param patch - summary fields to merge over the row.
     */
    async updateSummary(id, patch) {
        const record = this.require(id);
        record.summary = { ...record.summary, ...patch };
        await this.stabilize(() => {
            this.list.update((draft) => { draft.byId[id] = record.summary; });
        });
    }
    /**
     * Switch the current selection (undefined = the no-session empty state).
     * @param id - session id to select, or undefined to clear.
     */
    async setCurrent(id) {
        if (id !== undefined)
            this.require(id);
        await this.stabilize(() => {
            this.list.update((draft) => { draft.current = id; });
        });
    }
    /**
     * Remove a session: list row, scope fiber, and per-session store instances
     * (with persisted state) die together — the same single lifecycle axis the
     * production Client Sessions service drives on session death, minus staging.
     * @param id - session id.
     */
    async remove(id) {
        const record = this.require(id);
        this.records.delete(id);
        await this.stabilize(async () => {
            this.list.update((draft) => {
                draft.ids = draft.ids.filter(existing => existing !== id);
                const { [id]: _dead, ...rest } = draft.byId;
                draft.byId = rest;
                if (draft.current === id)
                    draft.current = undefined;
            });
            if (record.scopeFiber !== undefined)
                await record.scopeFiber.dispose();
        });
    }
    /**
     * Resolve (mint on first touch) the session-scoped Cordis context through
     * the production `createScope`, so real `scopeOf`/scope-addressed services
     * resolve it.
     * @param id - session id.
     * @returns the scoped context, or undefined for unknown sessions.
     */
    scope(id) {
        const record = this.records.get(id);
        if (record === undefined)
            return undefined;
        if (record.scope === undefined) {
            const handle = createScope(this.rootCtx, id);
            record.scope = handle.ctx;
            record.scopeFiber = handle.fiber;
        }
        return record.scope;
    }
    /**
     * Session assembly binding (inject factories and provide resolvers receive it).
     * @param id - session id.
     * @returns sessionId + behavior face + scoped ctx, or undefined when unknown.
     */
    binding(id) {
        const record = this.records.get(id);
        if (record === undefined)
            return undefined;
        record.binding ??= this.bindingOf(id, record);
        return record.binding;
    }
    /**
     * Read the session scope tag off a context (service-method boundary mirror).
     * @param ctx - any client context.
     * @returns the session id, or undefined on root contexts.
     */
    scopeOf(ctx) {
        return scopeOf(ctx);
    }
    /**
     * Resolve the scoped session face off a context (production `sessionOf`
     * mirror).
     * @param ctx - any client context.
     * @returns the fixture session face, or undefined off-scope.
     */
    sessionOf(ctx) {
        const id = scopeOf(ctx);
        if (id === undefined)
            return undefined;
        return this.records.get(id)?.session;
    }
    /**
     * Install Session creation behavior for navigation tests.
     * @param impl - implementation that must return an already-added fixture id.
     */
    stubCreate(impl) {
        this.createStub = impl;
    }
    /** Create through the installed test behavior and require an addressable binding. */
    async create(opts) {
        this.calls.push({ method: 'create', args: [opts] });
        if (this.createStub === undefined) {
            throw new Error('test sessions: create is not stubbed — call stubCreate() first');
        }
        const id = await this.createStub(opts);
        this.require(id);
        return id;
    }
    /**
     * Service-level selection call (recorded, then applied to the list store
     * synchronously — inject callbacks call this outside any act window; the
     * store notify is microtask-batched so the next stabilized step observes it).
     * @param id - session id.
     */
    open(id) {
        this.calls.push({ method: 'open', args: [id] });
        this.require(id);
        this.list.update((draft) => {
            draft.current = id;
            draft.currentAddress = undefined;
        });
    }
    /** Open an existing fixture through its catalog address. */
    openSubagent(address) {
        this.calls.push({ method: 'openSubagent', args: [address] });
        this.require(address.childSessionId);
        this.list.update((draft) => {
            draft.current = address.childSessionId;
            draft.currentAddress = address;
        });
    }
    /** Resolve the current fixture's retained catalog address. */
    subagentAddress(id) {
        const address = this.list.getSnapshot().currentAddress;
        return address?.childSessionId === id ? address : undefined;
    }
    /** Record catalog consumption; fixture callers drive snapshots explicitly. */
    setSubagentCatalogOpen(parentSessionId, open) {
        this.calls.push({ method: 'setSubagentCatalogOpen', args: [parentSessionId, open] });
    }
    /** Record a catalog refresh; fixture callers drive snapshots explicitly. */
    refreshSubagents(parentSessionId) {
        this.calls.push({ method: 'refreshSubagents', args: [parentSessionId] });
        return Promise.resolve();
    }
    /** Clear the current selection (recorded; the production no-session flow). */
    clear() {
        this.calls.push({ method: 'clear', args: [] });
        this.list.update((draft) => {
            draft.current = undefined;
            draft.currentAddress = undefined;
        });
    }
    /** Record a list refresh; fixture callers publish list state explicitly. */
    refresh() {
        this.calls.push({ method: 'refresh', args: [] });
        return Promise.resolve();
    }
    /**
     * Replace the sidebar-search result page (the call is still recorded).
     * @param impl - hits for a query, as the Host would rank them.
     */
    stubSearch(impl) {
        this.searchStub = impl;
    }
    /**
     * Content search over the fixture corpus (recorded). The default answers an
     * empty page: content ranking is Host behavior, so a scenario that asserts
     * hits declares them through {@link TestSessions.stubSearch}.
     * @param query - non-blank literal phrase.
     * @param signal - cancellation for a superseded search (recorded and forwarded).
     * @returns the stubbed or empty result page.
     */
    search(query, signal) {
        this.calls.push({ method: 'search', args: [query, signal] });
        return Promise.resolve({ ok: true, value: this.searchStub?.(query, signal) ?? { items: [], hasMore: false } });
    }
    /**
     * Recorded fork stub: no child materializes (benches asserting the full
     * fork flow drive the production service; this face only proves the call).
     * @param opts - source session id, optional cut anchor, and client title policy.
     * @returns the source id (no child record is created).
     */
    fork(opts) {
        this.calls.push({ method: 'fork', args: [opts] });
        return Promise.resolve(opts.sessionId);
    }
    /**
     * The session face of a fixture (typed view for assertions; fixture
     * behavior methods are grafted onto it).
     * @param id - session id.
     * @returns the FixtureSession carried by the Controller binding.
     */
    behavior(id) {
        return this.require(id).session;
    }
    /** Dispose minted scope fibers (runtime dispose path). */
    async disposeScopes() {
        for (const record of this.records.values()) {
            if (record.scopeFiber !== undefined) {
                await record.scopeFiber.dispose();
                record.scope = undefined;
                record.scopeFiber = undefined;
                record.binding = undefined;
            }
        }
    }
    bindingOf(id, record) {
        const ctx = this.scope(id);
        /* v8 ignore next 2 -- bindingOf only runs for a live record, whose scope
         * always resolves; kept so a future caller cannot mint a ctx-less binding. */
        if (ctx === undefined)
            throw new Error(`test session "${id}" resolved no scope`);
        return {
            sessionId: id,
            session: record.session,
            eventSource: record.session.eventSource,
            ctx,
        };
    }
    require(id) {
        const record = this.records.get(id);
        if (record === undefined)
            throw new Error(`test session "${id}" is not added`);
        return record;
    }
}
//# sourceMappingURL=sessions.js.map