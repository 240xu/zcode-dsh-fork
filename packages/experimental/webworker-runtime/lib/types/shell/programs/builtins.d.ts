/**
 * Shell builtins: the programs that read or change the shell's own state
 * (directory, environment, exit status) rather than the filesystem.
 * @module @deepseek-ai/dsh-experimental-webworker-runtime/src/shell/programs/builtins
 */
import type { ShellProgram } from '../types.ts';
/** The state builtins, keyed by the name a command line uses. */
export declare const BUILTIN_PROGRAMS: Readonly<Record<string, ShellProgram>>;
//# sourceMappingURL=builtins.d.ts.map