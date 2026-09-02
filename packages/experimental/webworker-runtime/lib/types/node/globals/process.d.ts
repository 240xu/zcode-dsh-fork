/** Construction inputs for {@link installProcessGlobal}. */
export interface ProcessShimOptions {
    /** Virtual root reported by `cwd()`. */
    readonly cwd: string;
    /** Environment the tree reads; `DSH_HOME` belongs here. */
    readonly env: Readonly<Record<string, string>>;
    /** Argument vector reported to the tree. */
    readonly argv?: readonly string[];
}
/** The members this shim publishes. */
export interface ProcessShim {
    readonly env: Record<string, string>;
    readonly argv: string[];
    readonly execArgv: string[];
    /** Node process identity used by dependencies for environment detection. */
    readonly title: string;
    /**
     * Node 22 `process.getBuiltinModule`: the worker's module proxy for a
     * builtin id (`fs`, `node:fs`), or undefined for anything else — it never
     * resolves image modules.
     * @param id - Builtin module id, with or without the `node:` prefix.
     * @returns the proxied builtin, or undefined.
     */
    getBuiltinModule(id: string): unknown;
    readonly platform: string;
    readonly arch: string;
    readonly pid: number;
    readonly version: string;
    readonly versions: Record<string, string>;
    cwd(): string;
    /**
     * Signal one command started through the `node:child_process` shim. Signal
     * `0` is the liveness probe the subprocess service polls a process tree
     * with; a negative pid addresses the group, which here holds exactly the one
     * command that leads it.
     * @param pid - the target pid, negative for its group.
     * @param signal - signal name, or `0` to probe without delivering one.
     * @returns true once the signal is recorded.
     * @throws Error with `code: 'ESRCH'` when no such command is running.
     */
    kill(pid: number, signal?: NodeJS.Signals | 0): boolean;
    nextTick(callback: (...args: unknown[]) => void, ...args: unknown[]): void;
    readonly stdout: {
        write(chunk: string): boolean;
    };
    readonly stderr: {
        write(chunk: string): boolean;
    };
    on(): ProcessShim;
    off(): ProcessShim;
    once(): ProcessShim;
    prependListener(): ProcessShim;
    prependOnceListener(): ProcessShim;
    removeListener(): ProcessShim;
    removeAllListeners(): ProcessShim;
    listeners(): unknown[];
    listenerCount(): number;
    setMaxListeners(): ProcessShim;
    emit(): boolean;
    readonly hrtime: {
        bigint(): bigint;
    };
    uptime(): number;
    exit(code?: number): void;
}
/**
 * Publish `globalThis.process`.
 *
 * `versions.node` is `0.0.0` on purpose: it makes Cordis's
 * `ModuleLoader.fromInternal()` return undefined instead of reaching for Node
 * internals, which is what lets the worker install its own module seam.
 * @param options - Root, environment, and argument vector.
 * @returns The published object, for the module proxy table.
 */
export declare function installProcessGlobal(options: ProcessShimOptions): ProcessShim;
//# sourceMappingURL=process.d.ts.map