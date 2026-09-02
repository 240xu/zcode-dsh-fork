/**
 * Generic stdio language-server backend for `ctx.lsp`. One plugin instance configures a named table
 * of server commands and registers one isolated provider for each entry. Every provider lazily
 * single-flights one server process per canonical workspace target, serves transient-open queries
 * through it, and replaces a selected transport that fails before or during the next read-only
 * query. Providers read sources through `ctx.fs` and launch servers through
 * `ctx.subprocess`, so both local and remote implementations share one host.
 *
 * Namespace plugin (named exports, no default export). Lifecycle is effect-scoped: disposal
 * unregisters from `ctx.lsp` and tears down every live server.
 * @module @deepseek-ai/dsh-lsp-stdio
 */
import z from '@deepseek-ai/schemastery';
import { LspError, LspProviderId } from '@deepseek-ai/dsh-lsp';
import { MAX_TIMER_DELAY_MS } from '@deepseek-ai/dsh-timeout';
import { abortable, abortError } from "./abort.js";
import { canonicalizeWorkspace, readHostSource } from "./host.js";
import { LspInstance } from "./instance.js";
export { canonicalizeWorkspace, readHostSource } from "./host.js";
export { encodeMessage, MessageDecoder } from "./framing.js";
export { negotiatePositionEncoding, normalizeHover, normalizeLocations, requestMethod, supportsOperation, supportsTransientOpen, } from "./translate.js";
export { LspInstance } from "./instance.js";
export { LspConnection } from "./connection.js";
/** Cordis plugin name for loader diagnostics. */
export const name = 'lsp-stdio';
/** Services required by this plugin. */
export const inject = ['fs', 'lsp', 'subprocess'];
const DEFAULT_MAX_MESSAGE_BYTES = 16_000_000;
const DEFAULT_MAX_STDERR_BYTES = 1_000_000;
const DEFAULT_MAX_DOCUMENT_BYTES = 4_000_000;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 5_000;
const DEFAULT_KILL_GRACE_MS = 2_000;
const LspLocalServerConfig = z.object({
    command: z.string().required(),
    args: z.array(String).default([]),
    env: z.dict(String).default({}),
    extensionToLanguage: z.dict(String).required(),
    initializationOptions: z.any().default(null),
    configuration: z.any().default(null),
    maxMessageBytes: z.number().default(DEFAULT_MAX_MESSAGE_BYTES),
    maxStderrBytes: z.number().default(DEFAULT_MAX_STDERR_BYTES),
    maxDocumentBytes: z.number().default(DEFAULT_MAX_DOCUMENT_BYTES),
    shutdownTimeoutMs: z.number().max(MAX_TIMER_DELAY_MS).default(DEFAULT_SHUTDOWN_TIMEOUT_MS),
    killGraceMs: z.number().max(MAX_TIMER_DELAY_MS).default(DEFAULT_KILL_GRACE_MS),
});
export const Config = z.object({
    servers: z.dict(LspLocalServerConfig).required(),
});
/** Propagate teardown failures only after every sibling has settled. */
function throwTeardownFailures(results, message) {
    const failures = [];
    for (const result of results) {
        if (result.status === 'rejected')
            failures.push(result.reason);
    }
    if (failures.length === 1)
        throw failures[0];
    if (failures.length > 1)
        throw new AggregateError(failures, message);
}
/**
 * Register the configured stdio LSP providers. Resolves every executable at load (after credential
 * scrubbing) before publishing any provider; each process launches lazily on its first matching
 * query.
 * @param ctx - the plugin context carrying `fs`, `lsp`, and `subprocess`.
 * @param config - the resolved plugin configuration (schemastery has filled every default).
 */
export async function apply(ctx, config) {
    const entries = Object.entries(config.servers);
    if (entries.length === 0)
        throw new Error('lsp-stdio: servers must contain at least one server');
    const setupAbort = new AbortController();
    const stopSetupCancellation = ctx.on('internal/plugin', (fiber) => {
        // An async plugin callback must observe its own disposal before Cordis can
        // run effect cleanup, because unload otherwise waits for this callback.
        if (fiber === ctx.fiber && fiber.uid === null) {
            setupAbort.abort(new Error('lsp-stdio setup disposed'));
        }
    });
    // Resolve every server-local setting before registration so a bad later command or bound cannot
    // publish an earlier provider. Registry-level mapping conflicts are rolled back below.
    const providers = await (async () => {
        const lookups = entries.map(async ([providerId, rawConfig]) => {
            if (providerId.trim() === '')
                throw new Error('lsp-stdio: server ids must be non-empty strings');
            const resolved = rawConfig;
            validateServerConfig(providerId, resolved);
            const executable = await ctx.subprocess.resolveExecutable(resolved.command, resolved.env, setupAbort.signal);
            setupAbort.signal.throwIfAborted();
            return new LocalLspProvider(providerId, ctx.fs, resolved, executable, spec => ctx.subprocess.spawn(spec));
        });
        try {
            return await Promise.all(lookups);
        }
        catch (error) {
            setupAbort.abort(error);
            await Promise.allSettled(lookups);
            throw error;
        }
        finally {
            stopSetupCancellation();
        }
    })();
    ctx.effect(() => {
        const disposers = [];
        try {
            for (const provider of providers)
                disposers.push(ctx.lsp.registerProvider(provider));
        }
        catch (error) {
            for (const dispose of disposers.reverse())
                dispose();
            throw error;
        }
        return async () => {
            // Remove every route before process teardown so no new query can enter a draining provider.
            for (const dispose of disposers.reverse())
                dispose();
            const results = await Promise.allSettled(providers.map(provider => provider.disposeAll()));
            throwTeardownFailures(results, 'lsp-stdio provider teardown failed');
        };
    }, 'lsp-stdio.registerProviders');
}
/** Validate one resolved server entry before any provider in the table is registered. */
function validateServerConfig(providerId, resolved) {
    // Teardown budgets feed `deadline()`, whose `<= 0` is the internal no-timeout sentinel; a
    // nonpositive value would let a server that ignores shutdown hang disposal forever. Fail at load.
    assertTimer(providerId, 'shutdownTimeoutMs', resolved.shutdownTimeoutMs);
    assertTimer(providerId, 'killGraceMs', resolved.killGraceMs);
    // Byte caps must be positive: a nonpositive stderr cap defeats the retained-tail bound
    // (`slice(-0)` keeps everything), `maxMessageBytes: 0` makes every response fatal, and a bad
    // document cap fails later in the read path instead of at load.
    assertPositiveInteger(providerId, 'maxStderrBytes', resolved.maxStderrBytes);
    assertPositiveInteger(providerId, 'maxMessageBytes', resolved.maxMessageBytes);
    assertPositiveInteger(providerId, 'maxDocumentBytes', resolved.maxDocumentBytes);
}
/** Reject a timer value Node would clamp instead of scheduling as configured. */
function assertTimer(providerId, name, value) {
    if (!Number.isInteger(value) || value < 1 || value > MAX_TIMER_DELAY_MS) {
        throw new Error(`lsp-stdio: servers.${providerId}.${name} must be a positive integer no greater than ${MAX_TIMER_DELAY_MS}`);
    }
}
/** Reject a nonpositive or non-integer config value at load, so misconfiguration fails loud. */
function assertPositiveInteger(providerId, name, value) {
    if (!Number.isInteger(value) || value < 1) {
        throw new Error(`lsp-stdio: servers.${providerId}.${name} must be a positive integer`);
    }
}
/** A pooled generic provider: one server process per canonical workspace, created on demand. */
class LocalLspProvider {
    fs;
    config;
    executable;
    spawner;
    id;
    extensionToLanguage;
    /** One live instance per stable canonical workspace identity. */
    instances = new Map();
    /** One complete source-read→open→query→close serialization tail per canonical workspace. */
    queues = new Map();
    /** Workspace canonicalizations that have not entered a provider-owned queue yet. */
    workspaceLookups = new Set();
    lifetime = new AbortController();
    disposed = false;
    constructor(providerId, fs, config, executable, spawner) {
        this.fs = fs;
        this.config = config;
        this.executable = executable;
        this.spawner = spawner;
        this.id = LspProviderId(providerId);
        this.extensionToLanguage = config.extensionToLanguage;
    }
    /** Read the disposed flag through a method so a `query()` await cannot narrow it to a literal. */
    isDisposed() {
        return this.disposed;
    }
    /** Reject work that cannot publish or use a provider-owned instance. */
    assertActive(signal) {
        /* v8 ignore next -- the seam unregisters this provider before disposal; direct in-flight calls
           exercise the post-await check instead. */
        if (this.isDisposed())
            throw new LspError('lsp-stdio provider is disposed', 'LSP_DISPOSED');
        if (signal?.aborted)
            throw abortError(signal);
    }
    /** Fuse caller cancellation with provider disposal for every filesystem and protocol await. */
    querySignal(signal) {
        return signal === undefined
            ? this.lifetime.signal
            : AbortSignal.any([signal, this.lifetime.signal]);
    }
    async query(request, signal) {
        // Honor an already-aborted signal before provider I/O so a canceled request never starts a server.
        this.assertActive(signal);
        const querySignal = this.querySignal(signal);
        const workspaceResult = canonicalizeWorkspace(this.fs, request.workspaceRoot, querySignal);
        const workspaceLookup = workspaceResult.then(() => undefined, () => undefined);
        this.workspaceLookups.add(workspaceLookup);
        let workspace;
        try {
            workspace = await workspaceResult;
        }
        finally {
            this.workspaceLookups.delete(workspaceLookup);
        }
        this.assertActive(querySignal);
        const workspaceKey = workspace.target.targetKey;
        return this.enqueue(workspaceKey, querySignal, async () => {
            this.assertActive(querySignal);
            // Read inside the workspace queue but before spawning: a queued query sees current bytes when
            // its turn starts, while an invalid source still cannot leave an idle process pooled.
            const source = await readHostSource(this.fs, request.filePath, workspace, this.config.maxDocumentBytes, querySignal);
            // Disposal may have snapshotted the instance map while host I/O was pending. Re-check before a
            // synchronous get-or-create so every spawned process remains owned by teardown.
            this.assertActive(querySignal);
            let instance = this.instanceFor(workspaceKey, workspace);
            try {
                return await instance.query(request, source, querySignal);
            }
            catch (error) {
                // A selected child can have died while idle or fail during the next write. Queries are
                // read-only, so replace that transport once and retry transparently.
                if (!instance.isTransportFailure(error))
                    throw error;
                await instance.dispose();
                this.evictIfCurrent(workspaceKey, instance);
                this.assertActive(querySignal);
                instance = this.instanceFor(workspaceKey, workspace);
                return await instance.query(request, source, querySignal);
            }
            finally {
                // Reach quiescence before dropping a dead slot; a replacement must survive this ownership check.
                if (instance.dead) {
                    await instance.dispose();
                    this.evictIfCurrent(workspaceKey, instance);
                }
            }
        });
    }
    /** Serialize one complete query lifecycle for a canonical workspace. */
    enqueue(workspace, signal, run) {
        const previous = this.queues.get(workspace) ?? Promise.resolve();
        const result = abortable(previous, signal).then(run);
        // The tail follows the actual prior work even when this caller aborts its wait. It never rejects,
        // so later callers serialize without inheriting an earlier query's outcome.
        const tail = previous.then(() => result).then(() => undefined, () => undefined);
        this.queues.set(workspace, tail);
        void tail.then(() => {
            if (this.queues.get(workspace) === tail)
                this.queues.delete(workspace);
        });
        return result;
    }
    /** Return or synchronously publish the one instance for a canonical workspace. */
    instanceFor(workspaceKey, workspace) {
        this.assertActive();
        const existing = this.instances.get(workspaceKey);
        if (existing !== undefined)
            return existing;
        const created = this.createInstance(workspace);
        this.instances.set(workspaceKey, created);
        return created;
    }
    /** Drop the slot iff it still contains this instance. */
    evictIfCurrent(workspace, instance) {
        /* v8 ignore next -- mismatch requires another query to replace the slot before this finally runs. */
        if (this.instances.get(workspace) === instance)
            this.instances.delete(workspace);
    }
    createInstance(workspace) {
        const spec = {
            command: this.executable,
            args: this.config.args,
            cwd: workspace.canonicalPath,
            workspaceUri: workspace.fileUrl,
            env: this.config.env,
            configuration: this.config.configuration,
            initializationOptions: this.config.initializationOptions,
            maxMessageBytes: this.config.maxMessageBytes,
            maxStderrBytes: this.config.maxStderrBytes,
            shutdownTimeoutMs: this.config.shutdownTimeoutMs,
            killGraceMs: this.config.killGraceMs,
        };
        return new LspInstance(spec, this.spawner);
    }
    /** Dispose every live instance and block further queries. */
    async disposeAll() {
        this.disposed = true;
        this.lifetime.abort(new LspError('lsp-stdio provider is disposed', 'LSP_DISPOSED'));
        const live = [...this.instances.values()];
        const draining = [...this.queues.values()];
        const resolving = [...this.workspaceLookups];
        this.instances.clear();
        const results = await Promise.allSettled([
            ...live.map(instance => instance.dispose()),
            ...draining,
            ...resolving,
        ]);
        this.queues.clear();
        this.workspaceLookups.clear();
        throwTeardownFailures(results, 'lsp-stdio instance teardown failed');
    }
}
//# sourceMappingURL=index.js.map