import type { ShellFileSystem } from '../types.ts';
import type { VirtualExecutable } from './virtual-executables.ts';
/** Parsed invocation of the native launcher's unchanged argv grammar. */
export type LandlockInvocation = {
    readonly kind: 'probe';
} | {
    readonly kind: 'run';
    readonly readOnly: readonly string[];
    readonly readWrite: readonly string[];
    readonly argv: readonly string[];
};
/** Launcher-owned failure; callers print its message with the `landlock-run:` prefix. */
export declare class LandlockLauncherError extends Error {
}
/**
 * Parse the native launcher's argv grammar.
 * @param args - Arguments after the launcher executable.
 * @returns A probe or confined-run request.
 */
export declare function parseLandlockArguments(args: readonly string[]): LandlockInvocation;
/**
 * Validate grant roots and create one process-local filesystem guard.
 * @param base - Host-side VFS adapter all permitted calls delegate to.
 * @param invocation - Parsed confined-run request.
 * @param cwd - Launcher's working directory for relative grant paths.
 * @returns A filesystem enforcing only this invocation's grants.
 */
export declare function landlockFileSystem(base: ShellFileSystem, invocation: Extract<LandlockInvocation, {
    kind: 'run';
}>, cwd: string): Promise<ShellFileSystem>;
/** Virtual executable implementing the native launcher's CLI over VFS grants. */
export declare const LANDLOCK_EXECUTABLE: VirtualExecutable;
//# sourceMappingURL=landlock.d.ts.map