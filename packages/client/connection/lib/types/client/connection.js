const CONNECTION_DEFAULTS = {
    backoffBaseMs: 500,
    backoffFactor: 2,
    backoffMaxMs: 10_000,
    generationReadyTimeoutMs: 3_000,
};
const MANUAL_RECONNECT = new Error('connection: manual reconnect requested');
const NETWORK_STATE_CHANGED = new Error('connection: browser network state changed');
function sleep(ms, signal) {
    return new Promise((resolve) => {
        const t = setTimeout(done, ms);
        signal.addEventListener('abort', done, { once: true });
        function done() {
            clearTimeout(t);
            signal.removeEventListener('abort', done);
            resolve();
        }
    });
}
function waitForAbort(signal) {
    if (signal.aborted)
        return Promise.resolve();
    return new Promise((resolve) => {
        signal.addEventListener('abort', () => { resolve(); }, { once: true });
    });
}
/**
 * Opens the registered generation source, reconnecting with exponential backoff on loss.
 * State (generation/attempt) is instance-private, never in the store.
 * Sink exceptions do not kill the generation loop.
 */
export class ConnectionController {
    source;
    sinks;
    generation = 0;
    attempt = 0;
    current = null;
    retryDelay = null;
    running = false;
    immediateRetry = false;
    networkAvailable = true;
    lastState;
    config;
    constructor(source, sinks = {}, config = {}) {
        this.source = source;
        this.sinks = sinks;
        this.config = { ...CONNECTION_DEFAULTS, ...config };
    }
    /** Idempotent: begin the connect/pump/reconnect loop. */
    start() {
        if (this.running)
            return;
        this.running = true;
        void this.loop();
    }
    /** Stop the loop and abort the current generation source. */
    stop() {
        this.running = false;
        this.current?.abort();
        this.current = null;
        this.retryDelay?.abort();
        this.retryDelay = null;
    }
    /** Reset the retry sequence and replace the current generation or retry delay immediately. */
    reconnect() {
        if (!this.running)
            return;
        this.attempt = 0;
        this.immediateRetry = true;
        this.emitState('connecting');
        if (!this.isRunning())
            return;
        this.current?.abort(MANUAL_RECONNECT);
        this.retryDelay?.abort(MANUAL_RECONNECT);
    }
    /**
     * Suspend automatic retries while offline and restart backoff when the network returns.
     * @param available - whether the browser reports network access.
     */
    setNetworkAvailable(available) {
        if (this.networkAvailable === available)
            return;
        this.networkAvailable = available;
        this.attempt = 0;
        this.immediateRetry = false;
        if (!this.running)
            return;
        this.emitState(available ? 'connecting' : 'disconnected');
        if (!this.isRunning())
            return;
        this.current?.abort(NETWORK_STATE_CHANGED);
        this.retryDelay?.abort(NETWORK_STATE_CHANGED);
    }
    backoffCap(attempt) {
        const { backoffBaseMs, backoffFactor, backoffMaxMs } = this.config;
        return Math.min(backoffMaxMs, backoffBaseMs * backoffFactor ** Math.max(0, attempt - 1));
    }
    backoffDelay(attempt) {
        const cap = this.backoffCap(attempt);
        return cap / 2 + Math.random() * (cap / 2);
    }
    isFinalBackoffTier(attempt) {
        const cap = this.backoffCap(attempt);
        const nextCap = this.backoffCap(attempt + 1);
        return cap >= this.config.backoffMaxMs || !Number.isFinite(nextCap) || nextCap <= cap;
    }
    /** Read through a method: stop() flips the flag across awaits, so narrowing from the loop condition must not stick. */
    isRunning() {
        return this.running;
    }
    /** Re-read both mutable liveness guards after a potentially reentrant sink. */
    isGenerationActive(controller) {
        return this.isRunning() && !controller.signal.aborted;
    }
    async loop() {
        let retry = false;
        while (this.running) {
            if (!this.networkAvailable && !this.immediateRetry) {
                const retryDelay = new AbortController();
                this.retryDelay = retryDelay;
                this.emitState('disconnected');
                await waitForAbort(retryDelay.signal);
                if (this.retryDelay === retryDelay)
                    this.retryDelay = null;
                if (!this.isRunning())
                    return;
                retry = true;
                continue;
            }
            let manualAttempt = false;
            if (retry) {
                const immediate = this.immediateRetry;
                this.immediateRetry = false;
                if (immediate)
                    this.attempt = 0;
                manualAttempt = immediate;
                if (!immediate && this.attempt > 0 && this.isFinalBackoffTier(this.attempt)) {
                    const retryDelay = new AbortController();
                    this.retryDelay = retryDelay;
                    this.emitState('disconnected');
                    await waitForAbort(retryDelay.signal);
                    if (this.retryDelay === retryDelay)
                        this.retryDelay = null;
                    continue;
                }
                const attempt = ++this.attempt;
                this.emitState('connecting');
                if (!this.isRunning())
                    return;
                if (!immediate) {
                    const retryDelay = new AbortController();
                    this.retryDelay = retryDelay;
                    await sleep(this.backoffDelay(attempt), retryDelay.signal);
                    if (this.retryDelay === retryDelay)
                        this.retryDelay = null;
                    if (!this.isRunning())
                        return;
                    if (retryDelay.signal.aborted)
                        continue;
                }
                console.warn(`[connection] connection lost, retry #${String(attempt)}`);
                this.callSink(() => { this.sinks.onReconnectRequested?.(); });
                if (!this.isRunning())
                    return;
            }
            const gen = ++this.generation;
            const ac = new AbortController();
            this.current = ac;
            let sourceReady = false;
            let resolveReady;
            let rejectReady;
            let rejectSourceLost;
            const ready = new Promise((resolve, reject) => {
                resolveReady = resolve;
                rejectReady = reject;
            });
            const sourceLost = new Promise((_resolve, reject) => {
                rejectSourceLost = reject;
            });
            const reportReady = (host) => {
                if (sourceReady)
                    return;
                sourceReady = true;
                resolveReady(host);
            };
            const failed = new Promise((resolve) => {
                const settle = () => {
                    if (gen === this.generation && !ac.signal.aborted)
                        ac.abort();
                    resolve();
                };
                void Promise.resolve()
                    .then(() => this.source(ac.signal, reportReady))
                    .then(() => {
                    const error = new Error('connection generation ended');
                    if (!sourceReady)
                        rejectReady(error);
                    rejectSourceLost(error);
                    settle();
                }, (error) => {
                    const failure = error instanceof Error
                        ? error
                        : new Error('connection generation failed', { cause: error });
                    if (!sourceReady)
                        rejectReady(failure);
                    rejectSourceLost(failure);
                    settle();
                });
            });
            try {
                const host = await Promise.race([
                    waitForReady(ready, this.config.generationReadyTimeoutMs, ac.signal),
                    sourceLost,
                ]);
                if (ac.signal.aborted)
                    throw new Error('generation aborted during readiness handshake');
                this.attempt = 0;
                this.emitState('connected');
                // A state sink may synchronously stop this controller.
                if (this.isGenerationActive(ac)) {
                    this.callSink(() => { this.sinks.onConnected?.(host); });
                }
            }
            catch {
                // Source settlement and controller cancellation already abort the generation.
            }
            await failed;
            if (!this.isRunning())
                return;
            if (manualAttempt)
                this.attempt = 0;
            retry = true;
        }
    }
    /** Deduplicated state emission (sink isolation applies). */
    emitState(state) {
        if (this.lastState === state)
            return;
        this.lastState = state;
        this.callSink(() => this.sinks.onStateChange?.(state));
    }
    /** Sink exception isolation: a business-layer throw is logged only, never affecting pump or reconnect semantics. */
    callSink(fn) {
        try {
            fn();
        }
        catch (error) {
            console.error('[connection] connection sink threw:', error);
        }
    }
}
/** Await source readiness while reporting, but not cancelling, a slow Host. */
function waitForReady(ready, timeoutMs, signal) {
    return new Promise((resolve, reject) => {
        let settled = false;
        const timeout = setTimeout(() => {
            console.warn(`[connection] generation is still not ready after ${String(timeoutMs)}ms`);
        }, timeoutMs);
        const aborted = () => {
            finish({ error: new Error('connection generation aborted', { cause: signal.reason }) });
        };
        const finish = (outcome) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timeout);
            signal.removeEventListener('abort', aborted);
            if ('error' in outcome)
                reject(outcome.error);
            else
                resolve(outcome.value);
        };
        signal.addEventListener('abort', aborted, { once: true });
        void ready.then((value) => { finish({ value }); }, (error) => {
            finish({ error: error });
        });
    });
}
//# sourceMappingURL=connection.js.map