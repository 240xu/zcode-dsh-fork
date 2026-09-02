/**
 * The interpreter: it walks the parsed command line and runs the command table
 * against the VFS. Structure (`;` `&` `|` `|&` `&&` `||`, subshells, groups,
 * redirections, prefix assignments) is honored here; what a command *does*
 * belongs to its program in `./programs/`.
 *
 * Output is text, not streams: every program is a JavaScript function that
 * returns before the next one runs, so a pipeline hands a string along instead
 * of plumbing byte streams a browser worker has no way to schedule between.
 * @module @deepseek-ai/dsh-experimental-webworker-runtime/src/shell/interpret
 */
import type { ShellFileSystem, ShellRunOutcome } from './types.ts';
/** Everything one `bash -c` invocation needs. */
export interface ShellRunOptions {
    /** Working directory the line starts in. */
    cwd: string;
    /** Environment the line starts with. */
    env: Record<string, string>;
    /** Standard input contents; absent means empty. */
    stdin?: string | undefined;
    /** Cancellation: an aborted line stops before its next command. */
    signal?: AbortSignal | undefined;
    /**
     * The filesystem this run acts on; defaults to the VFS mounted in this
     * thread. A run inside a process worker passes the message-backed one.
     */
    fs?: ShellFileSystem | undefined;
    /**
     * Called with each write as it happens, before the run settles. The returned
     * outcome still carries the complete text; this only lets a caller that
     * reports progress (a background job's incremental reads) see output while
     * the line is still running.
     */
    onOutput?: ((stream: 'stdout' | 'stderr', text: string) => void) | undefined;
}
/**
 * Run one shell command line to completion.
 * @param source - the command source, exactly as `bash -c` would receive it.
 * @param options - starting directory, environment, standard input, cancellation, filesystem, output callback.
 * @returns the exit status and the complete standard output and standard error.
 */
export declare function runShellCommand(source: string, options: ShellRunOptions): Promise<ShellRunOutcome>;
/**
 * Run one program directly, without a command line to parse.
 *
 * This is the path for an argv the caller already has in pieces — a spawn that
 * names a program instead of handing `bash` a script — so nothing re-quotes
 * words that were never quoted in the first place.
 * @param argv - the program name at index 0, then its arguments.
 * @param options - starting directory, environment, standard input, cancellation, filesystem, output callback.
 * @returns the exit status and the complete standard output and standard error.
 */
export declare function runShellProgram(argv: readonly string[], options: ShellRunOptions): Promise<ShellRunOutcome>;
//# sourceMappingURL=interpret.d.ts.map