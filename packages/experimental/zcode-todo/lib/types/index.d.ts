/**
 * ZCode TodoRead tool for the zcode agent preset.
 *
 * ZCode 3.10.2 exposes two todo tools: TodoRead ("Read the current session
 * todo list without modifying external state") and TodoWrite (whole-list
 * replacement). DSH's `tool-todo` registers only `todo_write`, so a zcode
 * session has no read-only path to the list. This plugin registers a
 * read-only `todo_read` view over the SAME `todos` session projection that
 * `tool-todo` owns — no new state, no writes, the same whole-list snapshot
 * the writer maintains. Mounted in the zcode preset scope only; the global
 * `todo_write` registration is untouched.
 * @module @deepseek-ai/dsh-zcode-todo
 */
import type { Context } from '@deepseek-ai/cordis';
export declare const inject: string[];
/** ZCode TodoRead description, verbatim from the 3.10.2 evidence. */
export declare const TODO_READ_DESCRIPTION = "Read the current session todo list";
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map