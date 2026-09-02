/**
 * Word expansion: one parsed argument becomes the zero or more fields a
 * program receives in its argv. Covers the segment kinds the grammar produces
 * — literal text, variables (with `:-` / `:+` forms), command substitution,
 * arithmetic, and globs matched against the VFS.
 * @module @deepseek-ai/dsh-experimental-webworker-runtime/src/shell/expand
 */
import type { ShellLine, ValueArgument } from './ast.ts';
import type { ShellFileSystem, ShellState } from './types.ts';
/**
 * Whether one word is a glob the shell should match against the filesystem.
 * Handed to `parseShell`, which decides between a `text` and a `glob` segment.
 * @param word - the word exactly as it was written.
 * @returns true when the word contains a wildcard.
 */
export declare function isGlobPattern(word: string): boolean;
/**
 * Read one variable the way `$name` does.
 *
 * Shell variables shadow the environment (an assignment without `export` is
 * only visible to this shell), and the specials report what a shell without
 * job control or positional parameters can honestly report.
 * @param state - the shell state to read.
 * @param name - variable name, or one of `?`, `$`, `#`, `@`, `*`, `0`.
 * @returns the value, or undefined when the variable is unset.
 */
export declare function readVariable(state: ShellState, name: string): string | undefined;
/**
 * Expand one glob against the filesystem, one path segment at a time.
 *
 * Matches keep the pattern's own spelling: a relative pattern yields relative
 * paths, so `ls *.ts` prints what the model typed.
 * @param pattern - the glob as written.
 * @param cwd - directory a relative pattern starts from.
 * @param fs - the filesystem to match against.
 * @returns sorted matches, or an empty array when nothing matches.
 */
export declare function expandGlob(pattern: string, cwd: string, fs: ShellFileSystem): Promise<string[]>;
/**
 * Everything expansion needs that the argument itself cannot supply: how to
 * run a command substitution, and the state variables resolve against.
 */
export interface ExpansionContext {
    state: ShellState;
    /** The filesystem globs match against. */
    fs: ShellFileSystem;
    /**
     * Run one nested command line and return its standard output.
     * @param shell - the parsed line inside `$( … )`.
     * @returns the captured output, with trailing newlines already stripped.
     */
    substitute(shell: ShellLine): Promise<string>;
}
/**
 * Expand one argument into fields.
 *
 * Unquoted expansions split on whitespace the way a shell does, so
 * `cat $FILES` with two names runs `cat` with two arguments while
 * `cat "$FILES"` runs it with one.
 * @param argument - the parsed argument.
 * @param context - substitution hook and shell state.
 * @returns the fields this argument contributes to argv.
 */
export declare function expandArgument(argument: ValueArgument, context: ExpansionContext): Promise<string[]>;
//# sourceMappingURL=expand.d.ts.map