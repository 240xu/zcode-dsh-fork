/**
 * `node:child_process` over the worker's own shell.
 *
 * A browser worker cannot fork, so this module IS the machine's process layer:
 * `spawn` starts the argv as a shell process (`src/shell/process/`) — its own
 * Web Worker, off this thread — and reports it through the `ChildProcess`
 * surface the subprocess service consumes: pipes, `exit`/`close`, pid, and
 * signals, with `SIGKILL` terminating the worker for real. Worker-owned
 * executable wrappers resolve before the shell's command table; anything in
 * neither set fails with `ENOENT`, exactly as a missing binary does on a real
 * host.
 *
 * What stays impossible is what needs a real process: synchronous execution
 * (`execSync`, and `spawnSync` for a known program) and `fork`.
 * @module @deepseek-ai/dsh-experimental-webworker-runtime/src/node/builtin_modules/implemented/child_process
 */
import { Buffer } from 'buffer';
import { EventEmitter } from './events.ts';
/** Per-stream disposition, as Node's `stdio` array spells it. */
type StdioSetting = 'pipe' | 'ignore' | 'inherit';
/** The spawn options this shim reads; Node accepts more, none of which apply here. */
export interface WorkerSpawnOptions {
    cwd?: string | undefined;
    env?: Record<string, string | undefined> | undefined;
    stdio?: StdioSetting | readonly StdioSetting[] | undefined;
    /** Accepted and ignored: process groups do not exist, so there is no group to detach into. */
    detached?: boolean | undefined;
}
/**
 * The readable half of a pipe: `data` events carrying Buffers, `end`, and a
 * `destroy` that stops delivery.
 *
 * The stream-shaping members below are no-ops rather than omissions. A caller
 * that configures the pipe before reading it (the browser launcher calls
 * `setEncoding`) would otherwise die of a TypeError on the configuration line,
 * hiding the real outcome — which for an unknown program is the `ENOENT` this
 * shim is about to emit.
 */
declare class WorkerReadable extends EventEmitter {
    private destroyed;
    /**
     * Accept an encoding (chunks are always UTF-8 text carried as Buffers).
     * @returns this stream.
     */
    setEncoding(): this;
    /**
     * Accept a flow-control request; delivery is driven by the command, which
     * has already produced whatever it produced.
     * @returns this stream.
     */
    pause(): this;
    /** @returns this stream; see {@link pause}. */
    resume(): this;
    /**
     * Deliver one chunk to the `data` listeners.
     * @param text - the text written by the command.
     */
    push(text: string): void;
    /** Signal end of stream. */
    finish(): void;
    /** Stop delivering; the collector calls this once the process settles. */
    destroy(): void;
}
/** The writable half of stdin: the batch write the subprocess service performs. */
declare class WorkerWritable extends EventEmitter {
    private text;
    /**
     * Buffer one write.
     * @param chunk - text or bytes to add to standard input.
     * @returns true, since nothing here applies backpressure.
     */
    write(chunk: string | Uint8Array): boolean;
    /**
     * Finish standard input.
     * @param chunk - optional final write.
     */
    end(chunk?: string | Uint8Array): void;
    /** @returns everything written so far. */
    contents(): string;
}
/**
 * One running command, wearing the parts of `ChildProcess` its consumers read.
 */
export declare class WorkerChildProcess extends EventEmitter {
    /** The worker's own process id for this command, from the process table. */
    readonly pid: number;
    /** Standard input, when the caller asked for a pipe; null otherwise. */
    readonly stdin: WorkerWritable | null;
    /** Standard output, when the caller asked for a pipe; null otherwise. */
    readonly stdout: WorkerReadable | null;
    /** Standard error, when the caller asked for a pipe; null otherwise. */
    readonly stderr: WorkerReadable | null;
    /** Exit status once settled; null while running and after a signal. */
    exitCode: number | null;
    /** The signal that ended the command, or null when it exited on its own. */
    signalCode: NodeJS.Signals | null;
    constructor(pid: number, stdio: readonly StdioSetting[]);
    /**
     * Deliver a signal to this command.
     * @param signal - signal name; every one of them terminates.
     * @returns true when the command was still running.
     */
    kill(signal?: NodeJS.Signals): boolean;
}
/**
 * Run one command in the worker.
 *
 * The call returns immediately with a handle; the command runs in its own
 * worker (or inline where no `Worker` exists) and reports back through the
 * handle's pipes and events.
 * @param program - the program name, as argv[0].
 * @param args - its arguments.
 * @param options - working directory, environment, and stdio dispositions.
 * @returns the running command's handle.
 */
export declare function spawn(program: string, args?: readonly string[], options?: WorkerSpawnOptions): WorkerChildProcess;
/** The result shape `spawnSync` returns, holding only the members consumers read. */
export interface WorkerSpawnSyncResult {
    pid: number;
    status: number | null;
    signal: NodeJS.Signals | null;
    stdout: Buffer;
    stderr: Buffer;
    output: (Buffer | null)[];
    /** Why the run did not happen; carries `code` for the callers that classify by it. */
    error?: NodeJS.ErrnoException;
}
/**
 * Report that a command cannot run synchronously.
 *
 * Callers use `spawnSync` to probe for a binary (the sandbox runner probes do)
 * and Node answers a missing one with an `error` rather than a throw, so this
 * answers in the same shape: absent programs report `ENOENT`, and a program
 * this shell *does* have reports that only the asynchronous path can run it.
 * @param program - the program name.
 * @param args - arguments passed to the virtual launcher probe.
 * @returns the Node-shaped synchronous result carrying the failure.
 */
export declare function spawnSync(program: string, args?: readonly string[]): WorkerSpawnSyncResult;
/** Callback `exec` and `execFile` report through. */
type ExecCallback = (error: Error | null, stdout: string, stderr: string) => void;
/**
 * Run a command line and report its output through a callback.
 * @param command - the shell source to run.
 * @param options - working directory and environment, or the callback.
 * @param callback - receives the failure (nonzero status included), stdout, and stderr.
 * @returns the running command's handle.
 */
export declare function exec(command: string, options?: WorkerSpawnOptions | ExecCallback, callback?: ExecCallback): WorkerChildProcess;
/**
 * Run one program with an explicit argv and report its output through a callback.
 * @param program - the program name.
 * @param args - its arguments, or the options, or the callback.
 * @param options - working directory and environment, or the callback.
 * @param callback - receives the failure (nonzero status included), stdout, and stderr.
 * @returns the running command's handle.
 */
export declare function execFile(program: string, args?: readonly string[] | WorkerSpawnOptions | ExecCallback, options?: WorkerSpawnOptions | ExecCallback, callback?: ExecCallback): WorkerChildProcess;
/** Run a command line synchronously (unavailable: the interpreter is asynchronous). */
export declare const execSync: typeof import('node:child_process').execSync;
/** Run one program synchronously (unavailable: the interpreter is asynchronous). */
export declare const execFileSync: typeof import('node:child_process').execFileSync;
/** Start a Node child (unavailable: the worker cannot create another Node runtime). */
export declare const fork: typeof import('node:child_process').fork;
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ../../builtins.ts). */
export declare const __esModule = true;
/** CommonJS default export: the members `require()` hands a caller of this module. */
declare const _default: {
    spawn: typeof spawn;
    spawnSync: typeof spawnSync;
    exec: typeof exec;
    execFile: typeof execFile;
    execFileSync: typeof import("child_process").execFileSync;
    execSync: typeof import("child_process").execSync;
    fork: typeof import("child_process").fork;
};
export default _default;
//# sourceMappingURL=child_process.d.ts.map