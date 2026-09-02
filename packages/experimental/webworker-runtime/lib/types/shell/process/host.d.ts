/**
 * Starting and supervising shell processes from the host worker.
 *
 * A process is a Web Worker started from this same bundle, told by its first
 * frame to be a shell process rather than a host. That is what buys real
 * process semantics in a browser: the command runs off the host's thread, and
 * `terminate()` stops it even mid-loop — the one thing a cooperative in-thread
 * interpreter can never do.
 *
 * Where no `Worker` constructor exists (a Node test host), the same command
 * runs inline on this thread. Everything except preemption behaves the same,
 * and the difference is named rather than hidden: {@link RunningProcess.destroy}
 * can only ask an inline command to stop.
 * @module @deepseek-ai/dsh-experimental-webworker-runtime/src/shell/process/host
 */
import type { ShellFileSystem } from '../types.ts';
import { runShellProcess } from './child.ts';
import type { ProcessScope } from './child.ts';
/** What the caller must supply to start one process. */
export interface ProcessStartOptions {
    /** Command source for `bash -c`, or undefined when `argv` names a program. */
    script?: string | undefined;
    /** The program and its arguments. */
    argv: readonly string[];
    /** Working directory the command starts in. */
    cwd: string;
    /** Environment the command starts with. */
    env: Record<string, string>;
    /** Everything on standard input. */
    stdin: string;
    /** Receives output as it is produced. */
    onOutput: (stream: 'stdout' | 'stderr', text: string) => void;
    /** Receives the settled status exactly once. */
    onExit: (code: number) => void;
    /** The filesystem the command acts on; defaults to the mounted VFS. */
    fs?: ShellFileSystem | undefined;
}
/** A started command, from the host's side. */
export interface RunningProcess {
    /** Ask the command to stop at its next command boundary (the `SIGTERM` rung). */
    interrupt(): void;
    /**
     * Stop the command now (the `SIGKILL` rung). A worker-backed process dies
     * whatever it was doing; an inline one can only be asked, because nothing
     * can preempt a synchronous loop on its own thread.
     */
    destroy(): void;
}
/**
 * Start one command.
 * @param options - the command, its environment, and the sinks for its output and status.
 * @returns the handle the process table signals through.
 */
export declare function startProcess(options: ProcessStartOptions): RunningProcess;
/** Re-exported for the worker entry, which decides its role from the first frame. */
export { runShellProcess };
export type { ProcessScope };
//# sourceMappingURL=host.d.ts.map