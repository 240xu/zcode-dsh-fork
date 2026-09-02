/**
 * CPython subprocess code runtime: a fresh `python3` process runs each model program under an
 * asyncio event loop with top-level ``await``. Binding calls travel on fd 3 as JSON-lines,
 * leaving stdout/stderr free for the program's own output. This is containment, not a security
 * boundary: model code has bash-equivalent trust, contained by a tempdir-only environment,
 * RLIMIT_CPU + RLIMIT_AS, wall-clock timeout, and SIGTERM→grace→SIGKILL on the process group.
 *
 * The package also owns the versionless fd-3 wire protocol itself; its host-side codec and
 * hostile-frame validators are re-exported so every consumer of the wire shares one vocabulary.
 * @module @deepseek-ai/dsh-experimental-code-runtime-python
 */
import { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { CodeRuntime } from '@deepseek-ai/dsh-code-runtime';
import type { CodeRunRequest, CodeRunResult } from '@deepseek-ai/dsh-code-runtime';
export type { BootMessage, ChildToHost, ReplyMessage } from './protocol.ts';
export { checkDoneValue, encodeJsonPlain, hasNonLosslessNumber, hasUnsafeIntegerToken, logTruncationMarker, validateChildFrame, } from './protocol.ts';
/** Plugin config: every cap, changeable from `cordis.yml` (no hardcoded tunables). */
export interface Config {
    /**
     * RLIMIT_CPU in whole seconds (a positive integer — `setrlimit` in the child
     * rejects a float). The child sets the soft limit to `cpuSeconds` and the
     * hard limit to `cpuSeconds + 1`: the kernel delivers SIGXCPU at the soft
     * limit, which the host classifies as a `timeout`; the +1s hard limit is a
     * SIGKILL backstop for a program that traps SIGXCPU. Granularity is seconds —
     * a coarser counterpart to the worker backend's millisecond `computeMs`.
     */
    cpuSeconds?: number;
    /** Wall-clock ceiling in milliseconds; backstops CPU time for programs awaiting a promise nobody resolves. */
    maxWallMs?: number;
    /**
     * RLIMIT_AS in mebibytes; caps address space so a runaway allocation fails
     * cleanly. Not applied on Darwin, where the dyld shared cache mapped into
     * every process at exec exceeds any practical cap and the kernel rejects
     * the call; `cpuSeconds` and `maxWallMs` still bound the run there. Bounds
     * `maxLogBytes`/`maxValueBytes` at load on EVERY platform (this static check
     * runs on Darwin too, where only the runtime `setrlimit` is skipped): each
     * budget times a worst-case Unicode expansion must fit this byte count minus a
     * fixed interpreter baseline, so a near-budget output cannot breach the address
     * space during the child's build-and-encode.
     */
    addressSpaceMb?: number;
    /**
     * Shared byte budget for captured log text (host-side ledger). Bounded at load
     * against `addressSpaceMb`: the child builds and encodes a near-budget entry
     * under RLIMIT_AS with several copies live at once, so this cap times the
     * worst-case Unicode expansion must fit the address space left after the
     * interpreter baseline (see `addressSpaceMb`) — a load-time rejection, not a
     * runtime clamp. Also bounded at load by the host's configured heap like
     * `maxValueBytes` (see its JSDoc): the effective frame cap minus the frame
     * envelope.
     */
    maxLogBytes?: number;
    /**
     * Byte cap for the completion value. Bounded at load against `addressSpaceMb`
     * the same way `maxLogBytes` is: the child builds and encodes a near-budget
     * value under RLIMIT_AS with several copies live at once, so this cap times the
     * worst-case Unicode expansion must fit the address space left after the
     * interpreter baseline. Both budgets are ALSO bounded at load by the host's
     * configured heap: the effective frame cap (the protocol cap, or a lower
     * heap-derived ceiling when the host heap cannot safely parse a near-cap
     * frame — see `hostFrameParseCeiling`) minus the frame envelope, so a budget
     * whose honest frame could OOM the host's own JSON.parse is rejected up
     * front.
     */
    maxValueBytes?: number;
    /** SIGTERM→SIGKILL grace period on kill, matching bash-local's default. */
    graceMs?: number;
    /**
     * Absolute path, relative path, or basename of a CPython 3.10+ interpreter.
     * Resolved and validated once at plugin load under a five-second force-kill
     * deadline; a basename searches `PATH`.
     */
    pythonBin?: string;
}
/**
 * The largest inbound fd-3 frame the HOST can parse without risking a
 * process-level OOM on its current heap: the configured heap limit (honoring
 * `--max-old-space-size`) minus the application baseline, divided by the
 * worst-case parse multiple, floored to the protocol frame cap. The
 * raw-byte cap alone does not protect the heap — `JSON.parse` of a
 * ≤64 MiB wide-object frame materializes several times that in property
 * storage — so the effective cap is the smaller of the two. A default Node
 * heap (~4 GiB) never binds; a constrained host (e.g.
 * `--max-old-space-size=256` reports a ~300 MiB limit) lowers it to ~14 MiB,
 * and the load gate rejects budgets that cannot cross it.
 * @param heapLimit - the host's configured heap limit; the live
 * `heap_size_limit` when omitted. A parameter so the derivation is unit
 * testable against simulated heap sizes.
 * @returns the effective frame parse cap in bytes.
 */
export declare function hostFrameParseCeiling(heapLimit?: number): number;
/**
 * A process's start time, as the identity half of (pid, started).
 *
 * A pid is reusable the moment the kernel reaps it, so signalling one that a
 * later process inherited would terminate an unrelated process group. Start
 * time is what distinguishes the original from its replacement: `kill(pid, 0)`
 * answers "does this number exist", which is true for both.
 *
 * Linux reads field 22 of `/proc/<pid>/stat` (starttime in clock ticks); the
 * field is positional after the comm field's closing parenthesis, which is
 * parsed from the LAST such character because a process name may contain one.
 * Darwin has no `/proc`, so the caller gets `undefined` there and `killGroup`
 * signals the pgid without the identity re-check rather than paying a `ps`
 * fork on a teardown path. Any read failure is `undefined` for the same
 * reason: this
 * hardens a narrow race and must never be the thing that breaks teardown.
 * @param pid - the process to read.
 * @returns its start time, or undefined when unavailable.
 */
export declare function readProcessStart(pid: number): string | undefined;
/**
 * Resolve `pythonBin` to one executable absolute path at plugin load. A basename
 * (the default `python3`) searches the current process `PATH`; the child receives
 * no `PATH`, so Node's own lookup would otherwise fall back to the platform
 * default (`/usr/bin:/bin`) and miss interpreters
 * that live only on the caller's `PATH` (Nix, pyenv, Homebrew, conda). An
 * absolute path is verified in place, and an explicitly relative path is first
 * resolved against the load-time working directory. When no candidate is an
 * executable regular file, `undefined` is returned and the load check rejects
 * the configuration: falling back to the bare name would let spawn's scrubbed env
 * execvp silently start a system interpreter from the platform default PATH
 * that the caller never asked for.
 * @param bin - the configured interpreter (absolute path, relative path, or bare command).
 * @returns an absolute path when resolvable, else `undefined`.
 */
export declare function resolvePythonBin(bin: string): string | undefined;
/**
 * Copy an fd-3 line residual into a fresh, right-sized Buffer so it no longer
 * shares the joined-frame allocation it was sliced from.
 *
 * After the newline loop over a `Buffer.concat` of the pending chunks, the
 * leftover partial line is a `subarray` VIEW onto that concat's backing store.
 * A view keeps the ENTIRE backing allocation alive for as long as it is
 * retained, so carrying the view forward as the next pending chunk would pin a
 * whole large frame's worth of memory behind a tiny trailing fragment — and the
 * `pendingBytes` counter, set to the fragment's own length, would no longer
 * measure the memory actually held. `Buffer.from` allocates exactly
 * `residual.length` bytes and copies, letting the concat allocation be
 * collected; an empty residual carries nothing forward.
 * @param residual - the leftover slice after the last newline (a view).
 * @returns the pending-chunk list to carry forward: `[copy]`, or `[]` when empty.
 */
export declare function detachResidual(residual: Buffer): Buffer[];
/**
 * The experimental {@link CodeRuntime} backend (private, not released) registering as `codeRuntime`. Every
 * cap is validated config; every long-running operation honors the request's
 * `AbortSignal`; every disposer awaits child-process exit.
 */
export declare class PythonCodeRuntime extends CodeRuntime {
    static Config: z<Config>;
    readonly language = "python";
    readonly isolation = "process";
    private readonly config;
    private readonly pythonBin;
    private readonly frameParseCapBytes;
    private readonly live;
    private disposed;
    constructor(ctx: Context, config: Config);
    /**
     * Dispose to quiescence: fail every in-flight run as aborted and AWAIT each
     * child's exit so no subprocess that stays in the child's process group
     * outlives the fiber. A descendant that escaped the group with `setsid()` /
     * `start_new_session=True` is unreachable by `kill(-pid)` and is the documented
     * exception (see the package README's Known Limitations); the process-group
     * teardown reaps everything that stays in the group.
     */
    private teardown;
    /**
     * Execute one program in a fresh Python subprocess. Success resolves with
     * `result.value` (and no `result.error`); failure — parse failure, thrown
     * exception, invalid completion, output overflow, budget expiry, abort, or
     * substrate death — resolves with `result.error` set (classified by
     * `CodeRunFailure.kind`). The method rejects only for seam misuse.
     */
    run(request: CodeRunRequest): Promise<CodeRunResult>;
    /**
     * Reject (seam misuse) malformed binding namespaces: non-identifier or
     * reserved globals/error classes, duplicates, and colliding or
     * runtime-owned injected globals.
     */
    private validateBindings;
    /** Spawn the child for one validated run and drive it to settlement. */
    private execute;
}
export default PythonCodeRuntime;
//# sourceMappingURL=index.d.ts.map