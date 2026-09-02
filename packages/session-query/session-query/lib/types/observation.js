/** Shared live/prepared observations for Session page and lifecycle consumers. */
import { SessionLogOffset } from '@deepseek-ai/dsh-session';
import { SESSION_QUERY_DEFAULT_PREPARED_SESSION_CACHE_SIZE, SessionQueryError } from "./config.js";
import { readColdSessionLog } from "./cold-read.js";
/**
 * Builds point observations without a corpus listing preflight.
 *
 * Cold reads are cached per session id, keyed by the persistence instance and
 * the `stat` revision observed before the log read: an unchanged revision
 * reuses the restored Session without re-reading the log. The cache is bounded
 * (least-recently-used unpinned entries are evicted past the capacity), and
 * entries pinned by active leases survive eviction and replacement — a lease's
 * cut stays valid for the lease lifetime even after a newer revision lands.
 */
export class SessionObservationReader {
    ctx;
    cacheCapacity;
    cache = new Map();
    /**
     * @param ctx - context carrying Session and optional persistence/projection services.
     * @param cacheCapacity - maximum unpinned cold observations retained for reuse.
     */
    constructor(ctx, cacheCapacity = SESSION_QUERY_DEFAULT_PREPARED_SESSION_CACHE_SIZE) {
        this.ctx = ctx;
        this.cacheCapacity = cacheCapacity;
    }
    /**
     * Observe one live-preferred Session and retain a cold preparation until disposal.
     * @param sessionId - logical Session identity.
     * @param options - cancellation and all-or-none projection computation for this read.
     * @returns one exact immutable observation.
     */
    async read(sessionId, options = {}) {
        const { signal, projectionMode = 'all' } = options;
        for (;;) {
            throwIfObservationAborted(signal);
            const live = this.ctx.sessions.get(sessionId);
            if (live !== undefined)
                return this.live(live, projectionMode);
            const persistence = this.ctx.get('sessionPersistence');
            if (persistence === undefined)
                throw notFound(sessionId);
            const snapshot = await this.statSource(persistence, sessionId, signal);
            const attachedDuringStat = this.ctx.sessions.get(sessionId);
            if (attachedDuringStat !== undefined)
                return this.live(attachedDuringStat, projectionMode);
            let entry = this.cachedEntry(persistence, sessionId, snapshot.revision);
            if (entry === undefined) {
                const loaded = await this.loadSource(persistence, sessionId, signal);
                throwIfObservationAborted(signal);
                const attached = this.ctx.sessions.get(sessionId);
                if (attached !== undefined)
                    return this.live(attached, projectionMode);
                // Ownership transfer into `prepare` freezes the seed in place, so the
                // entry keeps its own detached copies of the just-read events.
                const seed = loaded.events.map(event => structuredClone(event));
                let session;
                try {
                    session = this.ctx.sessions.prepare(sessionId, {
                        seed,
                        meta: structuredClone(loaded.header),
                        inheritedEventCount: loaded.inheritedEventCount,
                        seedSource: 'persistence',
                    });
                }
                catch (error) {
                    // The store rejects an id with a live owner: that owner is the
                    // fresher source, so retry the live path. Any other rejection means
                    // the stored log failed restore validation.
                    if (this.ctx.sessions.get(sessionId) !== undefined)
                        continue;
                    throw new SessionQueryError(`stored session "${sessionId}" is corrupt: ${errorMessage(error)}`, 'SESSION_QUERY_CORRUPT_SESSION', { cause: error });
                }
                entry = {
                    persistence,
                    revision: snapshot.revision,
                    session,
                    events: Object.freeze(seed),
                    refs: 0,
                };
                this.store(sessionId, entry);
            }
            let projections;
            try {
                projections = projectionMode === 'none' ? undefined : this.preparedProjections(entry);
            }
            catch (error) {
                throw new SessionQueryError(`failed to project session "${sessionId}": ${errorMessage(error)}`, 'SESSION_QUERY_CORRUPT_SESSION', { cause: error });
            }
            return this.preparedLease(sessionId, entry, projections);
        }
    }
    /** Observe the stored snapshot, mapping absence and backend failures to the query taxonomy. */
    async statSource(persistence, sessionId, signal) {
        let snapshot;
        try {
            snapshot = await persistence.stat(sessionId, signal === undefined ? undefined : { signal });
        }
        catch (error) {
            throwIfObservationAborted(signal);
            throw mapPersistenceFailure(sessionId, error);
        }
        throwIfObservationAborted(signal);
        if (snapshot === undefined)
            throw notFound(sessionId);
        if (snapshot.header.id !== sessionId) {
            throw new SessionQueryError(`session persistence returned "${snapshot.header.id}" for "${sessionId}"`, 'SESSION_QUERY_SOURCE_CONFLICT');
        }
        return snapshot;
    }
    /** Read the complete balanced cold log, mapping backend failures to the query taxonomy. */
    async loadSource(persistence, sessionId, signal) {
        try {
            return await readColdSessionLog(persistence, sessionId, signal);
        }
        catch (error) {
            throwIfObservationAborted(signal);
            throw mapPersistenceFailure(sessionId, error);
        }
    }
    /** Return a still-valid cached entry and mark it most recently used. */
    cachedEntry(persistence, sessionId, revision) {
        const cached = this.cache.get(sessionId);
        if (cached === undefined || cached.persistence !== persistence || cached.revision !== revision) {
            return undefined;
        }
        this.cache.delete(sessionId);
        this.cache.set(sessionId, cached);
        return cached;
    }
    /** Insert or replace the entry for one id, then evict past the capacity. */
    store(sessionId, entry) {
        // Replacing a stale revision only drops the map's reference; live leases
        // keep the old entry alive through their own references.
        this.cache.delete(sessionId);
        this.cache.set(sessionId, entry);
        this.evictPastCapacity(entry);
    }
    /**
     * Evict oldest unpinned entries until the cache fits its capacity again.
     * Runs on store and whenever a lease release unpins an entry, so leases
     * that pinned every candidate cannot leave the cache over budget for good.
     * @param keep - the entry being stored, about to be leased; never evicted.
     */
    evictPastCapacity(keep) {
        if (this.cache.size <= this.cacheCapacity)
            return;
        for (const [id, candidate] of this.cache) {
            if (candidate === keep || candidate.refs > 0)
                continue;
            this.cache.delete(id);
            if (this.cache.size <= this.cacheCapacity)
                return;
        }
    }
    /** Build one disposable lease over a cached entry, pinning it until every lease releases. */
    preparedLease(sessionId, entry, projections) {
        entry.refs += 1;
        const lease = () => {
            let disposed = false;
            return {
                source: 'prepared',
                header: entry.session.header,
                inheritedEventCount: entry.session.inheritedEventCount,
                events: entry.events,
                cursor: entry.events.at(-1)?.seq ?? -1,
                revision: entry.revision,
                ...projections === undefined ? {} : { projections },
                retain: () => {
                    if (disposed)
                        throw new Error(`session observation "${sessionId}" is disposed`);
                    entry.refs += 1;
                    return lease();
                },
                [Symbol.dispose]: () => {
                    if (disposed)
                        return;
                    disposed = true;
                    entry.refs -= 1;
                    if (entry.refs === 0)
                        this.evictPastCapacity();
                },
            };
        };
        return lease();
    }
    live(session, projectionMode) {
        const events = session.snapshotEvents();
        const projections = projectionMode === 'none'
            ? undefined
            : this.ctx.get('sessionProjections')?.snapshot(session);
        const lease = () => {
            let disposed = false;
            return {
                source: 'live',
                header: session.header,
                inheritedEventCount: session.inheritedEventCount,
                events,
                cursor: events.at(-1)?.seq ?? -1,
                ...projections === undefined ? {} : { projections },
                retain: () => {
                    if (disposed)
                        throw new Error(`session observation "${session.id}" is disposed`);
                    return lease();
                },
                [Symbol.dispose]: () => { disposed = true; },
            };
        };
        return lease();
    }
    preparedProjections(entry) {
        const registry = this.ctx.get('sessionProjections');
        if (registry === undefined)
            return undefined;
        const cache = this.ctx.get('sessionProjectionCache');
        return cache === undefined
            ? registry.hydrate(entry.session, {}, entry.events, SessionLogOffset(0))
            : cache.hydratePrepared(entry.session, entry.events);
    }
}
function throwIfObservationAborted(signal) {
    if (signal?.aborted !== true)
        return;
    throw new SessionQueryError('session observation was aborted', 'SESSION_QUERY_ABORTED', { cause: signal.reason });
}
function mapPersistenceFailure(sessionId, error) {
    if (hasErrorName(error, 'SessionPersistenceNotFoundError'))
        return notFound(sessionId, error);
    if (hasErrorName(error, 'SessionPersistenceCorruptionError')) {
        return new SessionQueryError(`stored session "${sessionId}" is corrupt: ${error.message}`, 'SESSION_QUERY_CORRUPT_SESSION', { cause: error });
    }
    return new SessionQueryError(`failed to observe session "${sessionId}": ${errorMessage(error)}`, 'SESSION_QUERY_PERSISTENCE_FAILED', { cause: error });
}
function notFound(sessionId, cause) {
    return new SessionQueryError(`session "${sessionId}" not found`, 'SESSION_QUERY_SESSION_NOT_FOUND', cause === undefined ? undefined : { cause });
}
function errorMessage(error) {
    return error instanceof Error ? error.message : 'unknown error';
}
function hasErrorName(error, name) {
    return error instanceof Error && error.name === name;
}
//# sourceMappingURL=observation.js.map