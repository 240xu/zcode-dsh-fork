/**
 * A JSON-RPC endpoint over one language server spawned through the subprocess
 * capability. Owns id correlation, outbound requests/notifications, and inbound
 * server→client requests: it answers `workspace/configuration` from static
 * config, and rejects `workspace/applyEdit` (this host never applies edits or
 * runs commands). It caps stderr, surfaces framing/decoder failures as a
 * fatal close, and exposes tree-scoped termination through the handle so the
 * instance owns teardown; group/tree mechanics live in the subprocess
 * Service Provider.
 * @module @deepseek-ai/dsh-lsp-stdio/connection
 */
import { encodeMessage, MessageDecoder } from "./framing.js";
const writeConnectionMessage = (stdin, message, done) => {
    stdin.write(encodeMessage(message), done);
};
/** A live JSON-RPC endpoint bound to one child process. */
export class LspConnection {
    onServerRequest;
    writer;
    handle;
    stdin;
    decoder;
    pending = new Map();
    nextId = 1;
    closeReason;
    /** Set once the process has fully exited; the instance awaits it during teardown. */
    closed;
    /**
     * @param spec - how to launch the server and answer its config requests.
     * @param spawner - the subprocess seam's spawn (the provider passes `ctx.subprocess.spawn`).
     * @param onServerRequest - answers a server→client request; rejects to send an error response.
     * @param writer - message writer; tests inject callback failures without relying on OS pipe races.
     */
    constructor(spec, spawner, onServerRequest, writer = writeConnectionMessage) {
        this.onServerRequest = onServerRequest;
        this.writer = writer;
        this.decoder = new MessageDecoder(spec.maxMessageBytes);
        // stdin/stdout are piped protocol streams this endpoint frames itself;
        // stderr is a collected diagnostic tail (no spill — the bounded tail IS
        // the contract). The seam owns detachment and tree-scoped signalling.
        this.handle = spawner({
            argv: [spec.command, ...spec.args],
            cwd: spec.cwd,
            stdio: {
                stdin: 'pipe',
                stdout: 'pipe',
                stderr: { maxBytes: spec.maxStderrBytes },
            },
            graceMs: spec.killGraceMs,
            // The seam merges explicit config entries after its ambient scrub, so a
            // configured credential or DSH_* fact reaches the child deliberately.
            env: spec.env,
        });
        /* v8 ignore start -- 'pipe' dispositions expose both streams by the seam contract; defensive. */
        if (this.handle.stdin === undefined || this.handle.stdout === undefined) {
            throw new Error('lsp-stdio: subprocess implementation dropped a piped protocol stream');
        }
        /* v8 ignore stop */
        this.stdin = this.handle.stdin;
        this.closed = new Promise((resolve) => {
            const close = () => {
                const reason = this.closeReason ?? new Error(this.exitMessage());
                // Record the reason so any request issued AFTER close rejects immediately instead of hanging
                // (a closed process sends no further responses).
                this.closeReason = reason;
                this.failAll(reason);
                resolve();
            };
            this.handle.done.then(close, (error) => {
                // A spawn-level failure never produces a close event; the rejection is
                // the fatal cause and the close boundary at once.
                this.fail(asError(error));
                close();
            });
        });
        // Child stdin can fail while the process itself remains alive (for example, a server closes fd
        // 0). Treat that as a fatal connection error so pending requests reject immediately instead of
        // waiting for a process-close event that may never arrive.
        this.stdin.on('error', (error) => { this.fail(error); });
        this.handle.stdout.on('data', (chunk) => { this.onStdout(chunk); });
    }
    /** The child's pid, or `-1` when the spawn produced no pid (so signalling is a no-op). */
    get pid() {
        return this.handle.pid;
    }
    /** The retained stderr tail, for diagnostics on a failed server. */
    get stderrTail() {
        /* v8 ignore next -- the collect disposition always exposes a stderr reader; defensive. */
        return this.handle.collected.stderr?.readFrom(0).text ?? '';
    }
    /** Whether the transport has failed even if the child close event has not arrived yet. */
    get failed() {
        return this.closeReason !== undefined;
    }
    /**
     * Test whether a caught error is this connection's retained fatal transport cause.
     * @param error - error caught by the instance or provider.
     * @returns `true` only when this connection produced that exact failure.
     */
    failedWith(error) {
        return this.closeReason === error;
    }
    /**
     * Send a request and await its result.
     * @param method - the JSON-RPC method.
     * @param params - the request params.
     * @returns the response result; rejects on an error response, write failure, or close.
     */
    request(method, params) {
        const id = this.nextId++;
        const promise = new Promise((resolve, reject) => {
            if (this.closeReason !== undefined) {
                reject(this.closeReason);
                return;
            }
            this.pending.set(id, { resolve, reject });
            // `write()` records either synchronous or callback-delivered failures on the connection and
            // rejects every pending request. This handler only consumes the write promise itself.
            void this.write({ jsonrpc: '2.0', id, method, params }).catch(() => { });
        });
        // A caller that stops awaiting (e.g. an aborted query) can leave this promise to reject later
        // when the process closes; a benign no-op handler keeps that from surfacing as an unhandled
        // rejection. The returned promise still delivers the rejection to the caller's own await/catch.
        promise.catch(() => { });
        return promise;
    }
    /**
     * Send a notification (no id, no response).
     * @param method - the JSON-RPC method.
     * @param params - the notification params.
     * @returns a promise that settles when the framed notification has been written.
     */
    notify(method, params) {
        return this.write({ jsonrpc: '2.0', method, params });
    }
    /**
     * Send a `$/cancelRequest` for an in-flight request id (best-effort; ignores write failure).
     * @param requestId - the numeric id of the request to cancel.
     */
    cancel(requestId) {
        // The server is already gone or unwritable when this rejects; `write()` has recorded the fatal
        // connection failure and rejected the pending request, so cancellation remains best-effort.
        void this.write({ jsonrpc: '2.0', method: '$/cancelRequest', params: { id: requestId } }).catch(() => { });
    }
    /**
     * The id the NEXT `request()` will use, so the instance can pre-arm a cancel.
     * @returns the numeric id the next request will be assigned.
     */
    peekNextId() {
        return this.nextId;
    }
    /** Terminate the server's process tree (the seam's SIGTERM→grace→SIGKILL escalation; idempotent). */
    terminate() {
        this.handle.terminate();
    }
    /**
     * Wait until the owned process tree has exited.
     * @param signal - optional bound for the wait.
     * @returns `true` when the tree exited, or `false` when the signal aborted first.
     */
    async waitForProcessTreeExit(signal) {
        return await this.handle.waitForExit(signal);
    }
    onStdout(chunk) {
        let messages;
        try {
            messages = this.decoder.push(chunk);
        }
        catch (error) {
            // A framing/JSON failure corrupts the stream position irrecoverably: fail the instance and
            // terminate the whole group so helper processes don't outlive the leader (SIGTERM first, then
            // the kill grace's SIGKILL — a misbehaving server still gets its bounded flush window).
            this.fail(asError(error));
            this.handle.terminate();
            return;
        }
        for (const message of messages)
            this.dispatch(message);
    }
    dispatch(message) {
        if (message === null || typeof message !== 'object')
            return;
        const frame = message;
        const id = frame.id;
        const method = frame.method;
        if (typeof method === 'string' && (typeof id === 'number' || typeof id === 'string')) {
            // A response-write failure has already invalidated the connection in `write()`.
            /* v8 ignore next -- protocol tests exercise response writes; only a simultaneous connection
               failure makes this consumption handler run. */
            void this.handleServerRequest(id, method, frame.params).catch(() => { });
            return;
        }
        if (typeof method === 'string') {
            // A server→client notification (e.g. diagnostics, logs): ignored by this MVP host.
            return;
        }
        if (typeof id === 'number')
            this.handleResponse(id, frame);
    }
    async handleServerRequest(id, method, params) {
        try {
            const result = await this.onServerRequest(method, params);
            await this.write({ jsonrpc: '2.0', id, result });
        }
        catch (error) {
            await this.write({ jsonrpc: '2.0', id, error: { code: -32601, message: asError(error).message } });
        }
    }
    handleResponse(id, frame) {
        const pending = this.pending.get(id);
        if (!pending)
            return;
        this.pending.delete(id);
        const error = frame.error;
        if (error !== null && typeof error === 'object') {
            const record = error;
            pending.reject(new Error(typeof record.message === 'string' ? record.message : 'LSP error response'));
            return;
        }
        pending.resolve(frame.result);
    }
    write(message) {
        if (this.closeReason !== undefined)
            return Promise.reject(this.closeReason);
        return new Promise((resolve, reject) => {
            const done = (error) => {
                if (error === undefined || error === null) {
                    resolve();
                    return;
                }
                this.fail(error);
                reject(error);
            };
            try {
                this.writer(this.stdin, message, done);
                /* v8 ignore start -- Node stream write failures are callback-delivered; this guards a
                   nonconforming Writable implementation throwing synchronously. */
            }
            catch (error) {
                const failure = asError(error);
                this.fail(failure);
                reject(failure);
            }
            /* v8 ignore stop */
        });
    }
    /** The exit-close error message, appending the retained stderr tail when the server wrote any. */
    exitMessage() {
        const tail = this.stderrTail.trim();
        return tail === '' ? 'language server exited' : `language server exited; stderr: ${tail}`;
    }
    fail(error) {
        /* v8 ignore next -- the second arm (closeReason already set) needs two fail() calls before close; defensive. */
        if (this.closeReason === undefined)
            this.closeReason = error;
        this.failAll(error);
    }
    failAll(error) {
        const waiting = [...this.pending.values()];
        this.pending.clear();
        for (const pending of waiting)
            pending.reject(error);
    }
}
/** Coerce an unknown thrown value to an `Error`. */
function asError(value) {
    /* v8 ignore next -- the non-Error branch guards against a non-Error throw, which our paths never produce. */
    return value instanceof Error ? value : new Error(String(value));
}
//# sourceMappingURL=connection.js.map