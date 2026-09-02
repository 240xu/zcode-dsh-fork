/** E2B PTY allocation and process-session ownership for the subprocess seam. */
import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { PassThrough } from 'node:stream';
import { posix } from 'node:path';
import { CommandExitError, e2bControlEnvs, FileNotFoundError, SandboxNotFoundError, quoteE2BShellArg, } from '@deepseek-ai/dsh-e2b';
import { bootstrapEnvironment, readRemoteEnvironment, serializeRemoteEnvironment, } from "./environment.js";
import { asError, commandOpts, delay, signalOpts, signalRemoteGroups } from "./remote.js";
const TERMINAL_RUNNER_SOURCE = [
    '#!/bin/bash',
    'set -euo pipefail',
    'dsh_state=$1',
    'mapfile -d \'\' -t dsh_env < "$dsh_state/environment"',
    'mapfile -d \'\' -t dsh_argv < "$dsh_state/argv"',
    'dsh_output_marker=$(<"$dsh_state/output-marker")',
    'rm -f -- "$dsh_state/environment" "$dsh_state/argv" "$dsh_state/output-marker" "$dsh_state/runner.bash"',
    'if (( ${#dsh_argv[@]} == 0 )); then',
    "  printf 'terminal runner received empty argv\\n' >&2",
    '  exit 125',
    'fi',
    'printf \'%s\' "$dsh_output_marker"',
    'exec env -i -- "${dsh_env[@]}" "${dsh_argv[@]}"',
    '',
].join('\n');
class BootstrapOutputFilter {
    marker;
    output;
    ready;
    readyState = Promise.withResolvers();
    pending = Buffer.alloc(0);
    published = false;
    constructor(marker, output) {
        this.marker = marker;
        this.output = output;
        this.ready = this.readyState.promise;
    }
    push(data) {
        if (this.published) {
            this.write(data);
            return;
        }
        const combined = Buffer.concat([this.pending, Buffer.from(data)]);
        const markerOffset = combined.indexOf(this.marker);
        if (markerOffset < 0) {
            const retained = Math.min(combined.length, this.marker.length - 1);
            this.pending = Buffer.from(combined.subarray(combined.length - retained));
            return;
        }
        this.published = true;
        this.pending = Buffer.alloc(0);
        this.readyState.resolve();
        this.write(combined.subarray(markerOffset + this.marker.length));
    }
    write(data) {
        if (data.length > 0 && !this.output.destroyed)
            this.output.write(data);
    }
}
async function waitForBootstrapOutput(ready, completion, signal) {
    signal?.throwIfAborted();
    await new Promise((resolve, reject) => {
        let settled = false;
        let removeAbort;
        const finish = (complete) => {
            if (settled)
                return;
            settled = true;
            removeAbort?.();
            complete();
        };
        const onExit = () => {
            finish(() => { reject(new Error('subprocess-e2b: terminal exited before publishing its output boundary')); });
        };
        if (signal !== undefined) {
            const onAbort = () => {
                finish(() => { reject(asError(signal.reason)); });
            };
            signal.addEventListener('abort', onAbort, { once: true });
            removeAbort = () => { signal.removeEventListener('abort', onAbort); };
        }
        void ready.then(() => { finish(resolve); });
        void completion.then(onExit, onExit);
    });
}
function parsePositiveId(value, message) {
    const raw = value.trim();
    const id = Number(raw);
    if (!/^[1-9][0-9]*$/.test(raw) || !Number.isSafeInteger(id))
        throw new Error(message);
    return id;
}
function serializeValues(values, kind) {
    for (const value of values) {
        if (value.includes('\0'))
            throw new Error(`subprocess-e2b: terminal ${kind} must not contain NUL bytes`);
    }
    return values.map(value => `${value}\0`).join('');
}
async function terminalSessionId(sandbox, pid, envs, signal) {
    const result = await sandbox.commands.run(`ps -o sid= -p ${pid}`, commandOpts(envs, signal));
    signal?.throwIfAborted();
    return parsePositiveId(result.stdout, `subprocess-e2b: cannot resolve process session for terminal ${pid}`);
}
async function sessionProcessGroups(sandbox, sessionId, envs) {
    let result;
    try {
        result = await sandbox.commands.run(`set -o pipefail; ps -eo sid=,pgid=,stat= | awk '$1 == ${sessionId} && $3 !~ /^[ZXx]/ { print $2 }'`, commandOpts(envs));
    }
    catch (error) {
        if (error instanceof SandboxNotFoundError)
            return [];
        throw error;
    }
    const groups = new Set();
    for (const raw of result.stdout.trim().split(/\s+/)) {
        if (raw.length === 0)
            continue;
        const group = parsePositiveId(raw, `subprocess-e2b: invalid process group ${JSON.stringify(raw)} in terminal session ${sessionId}`);
        if (group <= 1) {
            throw new Error(`subprocess-e2b: unsafe process group ${group} in terminal session ${sessionId}`);
        }
        groups.add(group);
    }
    return [...groups];
}
async function awaitSessionEmpty(sandbox, sessionId, envs, graceMs, pollMs, kill = false) {
    const deadline = Date.now() + graceMs;
    for (;;) {
        const groups = await sessionProcessGroups(sandbox, sessionId, envs);
        if (groups.length === 0)
            return groups;
        if (kill) {
            await signalRemoteGroups(sandbox, envs, groups, 'KILL');
            if (Date.now() >= deadline)
                return await sessionProcessGroups(sandbox, sessionId, envs);
        }
        else if (Date.now() >= deadline) {
            return groups;
        }
        await delay(Math.min(pollMs, Math.max(1, deadline - Date.now())));
    }
}
async function rollbackUnpublishedTerminal(sandbox, handle, completion, envs, graceMs, pollMs) {
    let topLevelExited = false;
    void completion.then(() => { topLevelExited = true; }, () => { topLevelExited = true; });
    const validPid = Number.isSafeInteger(handle.pid) && handle.pid > 1;
    const attemptFailures = [];
    let sessionId;
    if (validPid) {
        sessionId = handle.pid;
        try {
            sessionId = await terminalSessionId(sandbox, handle.pid, envs);
        }
        catch (_sessionLookupFailure) {
            // E2B's PTY leader is also the provisional POSIX session leader, so its
            // PID remains usable after the setup lookup itself fails or is canceled.
        }
        try {
            let groups = await sessionProcessGroups(sandbox, sessionId, envs);
            if (groups.length > 0) {
                await signalRemoteGroups(sandbox, envs, groups, 'TERM');
                groups = await awaitSessionEmpty(sandbox, sessionId, envs, graceMs, pollMs);
            }
            if (groups.length > 0) {
                await awaitSessionEmpty(sandbox, sessionId, envs, graceMs, pollMs, true);
            }
        }
        catch (error) {
            attemptFailures.push(asError(error));
        }
    }
    // Completion can settle while any awaited provider cleanup above is running.
    // oxlint-disable-next-line typescript/no-unnecessary-condition -- Provider cleanup yields to completion.
    if (!topLevelExited) {
        try {
            await handle.kill();
        }
        catch (error) {
            if (error instanceof SandboxNotFoundError)
                return;
            attemptFailures.push(asError(error));
        }
        await Promise.race([completion.catch(() => undefined), delay(graceMs)]);
    }
    const proofFailures = [];
    if (sessionId !== undefined) {
        try {
            const groups = await awaitSessionEmpty(sandbox, sessionId, envs, graceMs, pollMs, true);
            if (groups.length > 0) {
                proofFailures.push(new Error(`subprocess-e2b: terminal setup rollback failed; surviving process groups: ${groups.join(', ')}`));
            }
        }
        catch (error) {
            proofFailures.push(asError(error));
        }
    }
    // The bounded completion race above updates this callback-owned state.
    // oxlint-disable-next-line typescript/no-unnecessary-condition -- The callback mutates this after a race.
    if (!topLevelExited) {
        proofFailures.push(new Error(`subprocess-e2b: terminal setup rollback failed; surviving pid: ${handle.pid}`));
    }
    if (proofFailures.length > 0) {
        throw new AggregateError([...attemptFailures, ...proofFailures], 'subprocess-e2b: terminal setup rollback did not reach quiescence');
    }
    try {
        await handle.disconnect();
    }
    catch (error) {
        if (!(error instanceof SandboxNotFoundError))
            throw error;
    }
}
/** One E2B PTY and all process groups in its remote process session. */
export class E2BTerminalHandle {
    sandbox;
    handle;
    output;
    completion;
    sessionId;
    controlEnvs;
    stateDir;
    graceMs;
    pollMs;
    pid;
    done;
    topLevelExited = false;
    cleanup;
    operationController = new AbortController();
    operations = new Set();
    terminationSignal = null;
    constructor(sandbox, handle, output, completion, sessionId, controlEnvs, stateDir, graceMs, pollMs) {
        this.sandbox = sandbox;
        this.handle = handle;
        this.output = output;
        this.completion = completion;
        this.sessionId = sessionId;
        this.controlEnvs = controlEnvs;
        this.stateDir = stateDir;
        this.graceMs = graceMs;
        this.pollMs = pollMs;
        this.pid = handle.pid;
        this.done = this.waitForCommand();
    }
    // TODO(e2b-pgid-identity): Replace retained numeric PTY/session ids when E2B
    // exposes identity-bound input, foreground-signal, and cleanup operations.
    /** @inheritdoc */
    write(data) {
        return this.trackOperation(async (signal) => {
            if (this.topLevelExited)
                throw new Error('terminal process has exited');
            await this.sandbox.pty.sendInput(this.pid, Buffer.from(data, 'utf8'), { signal });
        });
    }
    /** @inheritdoc */
    inspectForeground() {
        return this.trackOperation(signal => this.inspectForegroundOnce(signal));
    }
    /** @inheritdoc */
    signalForeground(signal) {
        return this.trackOperation(async (operationSignal) => {
            const foreground = await this.inspectForegroundOnce(operationSignal);
            if (foreground === undefined) {
                throw new Error(`subprocess-e2b: cannot resolve foreground process group for terminal ${this.pid}`);
            }
            if (signal === 'SIGKILL' && foreground.processGroupId === this.pid) {
                throw new Error('refusing to SIGKILL the terminal shell; terminate the terminal session instead');
            }
            await this.sandbox.commands.run(`kill -${signal.slice(3)} -- -${foreground.processGroupId}`, commandOpts(this.controlEnvs, operationSignal));
            return foreground.processGroupId;
        });
    }
    /** @inheritdoc */
    terminate() {
        if (this.cleanup !== undefined)
            return this.cleanup;
        this.operationController.abort(new Error('subprocess-e2b: terminal is terminating'));
        const cleanup = this.closeAfterOperations();
        this.cleanup = cleanup;
        void cleanup.catch((_cleanupFailure) => {
            this.cleanup = undefined;
        });
        return cleanup;
    }
    async inspectForegroundOnce(signal) {
        try {
            const result = await this.sandbox.commands.run(`ps -o tpgid= -p ${this.pid}`, commandOpts(this.controlEnvs, signal));
            return {
                processGroupId: parsePositiveId(result.stdout, `subprocess-e2b: cannot resolve foreground process group for terminal ${this.pid}`),
                // E2B exposes process-table commands but not the /proc memory access
                // needed to prove a specific syscall is waiting on fd 0.
                inputWaiting: false,
            };
        }
        catch (error) {
            if (error instanceof CommandExitError && (error.exitCode === 1 || this.topLevelExited))
                return undefined;
            throw error;
        }
    }
    trackOperation(operation) {
        if (this.operationController.signal.aborted) {
            return Promise.reject(new Error('subprocess-e2b: terminal is terminating'));
        }
        const pending = operation(this.operationController.signal);
        this.operations.add(pending);
        void pending.then(() => { this.operations.delete(pending); }, () => { this.operations.delete(pending); });
        return pending;
    }
    async closeAfterOperations() {
        await Promise.allSettled(this.operations);
        await this.closeOnce();
    }
    async waitForCommand() {
        try {
            const result = await this.completion;
            return { exitCode: result.exitCode, signal: null };
        }
        catch (error) {
            if (error instanceof CommandExitError) {
                return this.terminationSignal === null
                    ? { exitCode: error.exitCode, signal: null }
                    : { exitCode: null, signal: this.terminationSignal };
            }
            this.output.destroy(error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
        finally {
            this.topLevelExited = true;
            if (!this.output.destroyed)
                this.output.end();
        }
    }
    async closeOnce() {
        let groups = await sessionProcessGroups(this.sandbox, this.sessionId, this.controlEnvs);
        if (groups.length > 0) {
            this.terminationSignal = 'SIGTERM';
            await signalRemoteGroups(this.sandbox, this.controlEnvs, groups, 'TERM');
            groups = await awaitSessionEmpty(this.sandbox, this.sessionId, this.controlEnvs, this.graceMs, this.pollMs);
        }
        if (groups.length === 0 && !this.topLevelExited) {
            await Promise.race([this.done.catch(() => undefined), delay(this.graceMs)]);
        }
        if (groups.length > 0 || !this.topLevelExited) {
            this.terminationSignal = 'SIGKILL';
            if (!this.topLevelExited) {
                try {
                    await this.handle.kill();
                }
                catch (error) {
                    if (error instanceof SandboxNotFoundError)
                        return;
                    throw error;
                }
            }
            groups = await awaitSessionEmpty(this.sandbox, this.sessionId, this.controlEnvs, this.graceMs, this.pollMs, true);
            if (!this.topLevelExited)
                await Promise.race([this.done.catch(() => undefined), delay(this.graceMs)]);
        }
        if (groups.length > 0) {
            throw new Error(`subprocess-e2b: terminal cleanup failed; surviving process groups: ${groups.join(', ')}`);
        }
        if (!this.topLevelExited) {
            throw new Error(`subprocess-e2b: terminal cleanup failed; surviving pid: ${this.pid}`);
        }
        try {
            await this.handle.disconnect();
        }
        catch (error) {
            if (!(error instanceof SandboxNotFoundError))
                throw error;
        }
        try {
            await this.sandbox.files.remove(this.stateDir);
        }
        catch (_adapterPrivateStateRemovalFailure) {
            // The terminal is quiescent; owner teardown bounds private residue.
        }
    }
}
/**
 * Allocate an E2B PTY, replace its bootstrap shell with the requested argv,
 * and return only after the private runner has published readiness.
 * @param runtime - Shared E2B sandbox owner.
 * @param spec - Fully specified terminal-process request.
 * @param stateDir - Private remote directory for one startup transaction.
 * @param pollMs - Remote session liveness poll cadence.
 * @returns The live subprocess terminal handle.
 */
export async function spawnE2BTerminal(runtime, spec, stateDir, pollMs) {
    const sandbox = await runtime.getSandbox();
    spec.signal?.throwIfAborted();
    const paths = {
        runner: posix.join(stateDir, 'runner.bash'),
        environment: posix.join(stateDir, 'environment'),
        argv: posix.join(stateDir, 'argv'),
        outputMarker: posix.join(stateDir, 'output-marker'),
    };
    const outputMarker = Buffer.from(`dsh-e2b-bootstrap:${randomUUID()}`);
    const output = new PassThrough();
    const outputFilter = new BootstrapOutputFilter(outputMarker, output);
    let handle;
    let completion;
    let stateDirectoryCreated = false;
    let controlEnvs = {};
    try {
        const ambient = await readRemoteEnvironment(sandbox, spec.signal);
        controlEnvs = bootstrapEnvironment(ambient);
        const environment = serializeRemoteEnvironment(ambient, spec.env);
        const argv = serializeValues(spec.argv, 'argv');
        stateDirectoryCreated = true;
        await sandbox.files.makeDir(stateDir, signalOpts(spec.signal));
        await sandbox.commands.run(`chmod 700 -- ${quoteE2BShellArg(stateDir)}`, commandOpts(controlEnvs, spec.signal));
        await sandbox.files.write([
            { path: paths.runner, data: TERMINAL_RUNNER_SOURCE },
            { path: paths.environment, data: environment },
            { path: paths.argv, data: argv },
            { path: paths.outputMarker, data: outputMarker.toString('utf8') },
        ], signalOpts(spec.signal));
        await sandbox.commands.run(`chmod 600 -- ${quoteE2BShellArg(paths.runner)} ${quoteE2BShellArg(paths.environment)} ${quoteE2BShellArg(paths.argv)} ${quoteE2BShellArg(paths.outputMarker)}`, commandOpts(controlEnvs, spec.signal));
        handle = await sandbox.pty.create({
            rows: spec.rows,
            cols: spec.cols,
            cwd: spec.cwd,
            envs: e2bControlEnvs(controlEnvs),
            timeoutMs: 0,
            onData: (data) => { outputFilter.push(data); },
        });
        completion = handle.wait();
        void completion.catch(() => { });
        spec.signal?.throwIfAborted();
        if (!Number.isSafeInteger(handle.pid) || handle.pid <= 0) {
            throw new Error(`subprocess-e2b: E2B returned invalid terminal pid ${handle.pid}`);
        }
        const command = `exec /bin/bash ${quoteE2BShellArg(paths.runner)} ${quoteE2BShellArg(stateDir)}\r`;
        await sandbox.pty.sendInput(handle.pid, Buffer.from(command), signalOpts(spec.signal));
        await waitForBootstrapOutput(outputFilter.ready, completion, spec.signal);
        const sessionId = await terminalSessionId(sandbox, handle.pid, controlEnvs, spec.signal);
        return new E2BTerminalHandle(sandbox, handle, output, completion, sessionId, controlEnvs, stateDir, spec.graceMs, pollMs);
    }
    catch (error) {
        output.destroy();
        let terminalQuiescent = handle === undefined;
        let stateRemoved = !stateDirectoryCreated;
        const cleanup = async () => {
            const failures = [];
            if (!terminalQuiescent && handle !== undefined) {
                try {
                    if (completion === undefined)
                        await handle.kill();
                    else
                        await rollbackUnpublishedTerminal(sandbox, handle, completion, controlEnvs, spec.graceMs, pollMs);
                    terminalQuiescent = true;
                }
                catch (cleanupError) {
                    if (cleanupError instanceof SandboxNotFoundError)
                        terminalQuiescent = true;
                    else
                        failures.push(asError(cleanupError));
                }
            }
            if (!stateRemoved) {
                try {
                    await sandbox.files.remove(stateDir);
                    stateRemoved = true;
                }
                catch (stateError) {
                    if (stateError instanceof FileNotFoundError || stateError instanceof SandboxNotFoundError)
                        stateRemoved = true;
                    else
                        failures.push(asError(stateError));
                }
            }
            if (failures.length > 0) {
                throw new AggregateError(failures, 'subprocess-e2b: terminal setup cleanup did not complete');
            }
        };
        try {
            await cleanup();
        }
        catch (cleanupError) {
            // TODO(e2b-terminal-setup-rollback): Retain retry state only if a real
            // double failure must be recovered before sandbox disposal or timeout.
            throw new AggregateError([asError(error), asError(cleanupError)], asError(error).message);
        }
        throw error;
    }
}
//# sourceMappingURL=terminal.js.map