/**
 * File and directory utilities of the command table, all of them over the
 * shell's filesystem. Listings print one entry per line: nothing here is ever
 * a terminal, so the column layout a real `ls` picks for a tty would only be
 * noise in a tool result.
 * @module @deepseek-ai/dsh-experimental-webworker-runtime/src/shell/programs/files
 */
import type { ShellProgram } from '../types.ts';
/** The file utilities, keyed by the name a command line uses. */
export declare const FILE_PROGRAMS: Readonly<Record<string, ShellProgram>>;
//# sourceMappingURL=files.d.ts.map