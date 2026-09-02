import type { CpuInfo, NetworkInterfaceInfo } from 'node:os';
/** Line ending of the virtual platform. */
export declare const EOL = "\n";
/**
 * Temporary directory.
 * @returns the VFS temp path.
 */
export declare function tmpdir(): string;
/**
 * Home directory.
 * @returns `$DSH_HOME` inside the VFS.
 */
export declare function homedir(): string;
/**
 * Platform identity.
 * @returns always 'linux'.
 */
export declare function platform(): NodeJS.Platform;
/**
 * Operating-system type.
 * @returns always 'Linux'.
 */
export declare function type(): string;
/**
 * CPU architecture.
 * @returns always 'x64'.
 */
export declare function arch(): string;
/**
 * Kernel release.
 * @returns a synthetic release string.
 */
export declare function release(): string;
/**
 * Host name.
 * @returns a synthetic name.
 */
export declare function hostname(): string;
/**
 * Usable parallelism.
 * @returns the browser's hardware concurrency, at least 1.
 */
export declare function availableParallelism(): number;
/**
 * CPU inventory.
 * @returns an empty list (no per-core facts inside a worker).
 */
export declare function cpus(): CpuInfo[];
/**
 * Network interfaces.
 * @returns an empty record — the worker webserver binds the loopback literal, so
 * no LAN address is ever derived.
 */
export declare function networkInterfaces(): NodeJS.Dict<NetworkInterfaceInfo[]>;
/** OS constants: only the signal table is read (terminal signal name mapping). */
export declare const constants: {
    signals: {
        SIGHUP: number;
        SIGINT: number;
        SIGQUIT: number;
        SIGILL: number;
        SIGTRAP: number;
        SIGABRT: number;
        SIGBUS: number;
        SIGFPE: number;
        SIGKILL: number;
        SIGUSR1: number;
        SIGSEGV: number;
        SIGUSR2: number;
        SIGPIPE: number;
        SIGALRM: number;
        SIGTERM: number;
    };
    errno: {};
    priority: {};
};
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ./builtins.ts). */
export declare const __esModule = true;
/** CommonJS default export: the members `require()` hands a caller of this module. */
declare const _default: {
    EOL: string;
    tmpdir: typeof tmpdir;
    homedir: typeof homedir;
    platform: typeof platform;
    type: typeof type;
    arch: typeof arch;
    release: typeof release;
    hostname: typeof hostname;
    availableParallelism: typeof availableParallelism;
    cpus: typeof cpus;
    networkInterfaces: typeof networkInterfaces;
    constants: {
        signals: {
            SIGHUP: number;
            SIGINT: number;
            SIGQUIT: number;
            SIGILL: number;
            SIGTRAP: number;
            SIGABRT: number;
            SIGBUS: number;
            SIGFPE: number;
            SIGKILL: number;
            SIGUSR1: number;
            SIGSEGV: number;
            SIGUSR2: number;
            SIGPIPE: number;
            SIGALRM: number;
            SIGTERM: number;
        };
        errno: {};
        priority: {};
    };
};
export default _default;
//# sourceMappingURL=os.d.ts.map