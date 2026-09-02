/**
 * The command table: every program name this shell can run. A browser worker
 * spawns no processes, so this table IS the machine's `/bin` — a name that is
 * not here reports `command not found`, exactly as a real shell would for a
 * binary that is not installed.
 * @module @deepseek-ai/dsh-experimental-webworker-runtime/src/shell/programs
 */
import type { ShellProgram } from '../types.ts';
/**
 * The standard command table, built once and shared by every command line.
 * @returns the program table, keyed by command name.
 */
export declare function standardPrograms(): ReadonlyMap<string, ShellProgram>;
//# sourceMappingURL=index.d.ts.map