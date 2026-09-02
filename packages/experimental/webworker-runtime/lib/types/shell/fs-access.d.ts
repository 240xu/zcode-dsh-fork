/**
 * The in-host filesystem for shell runs: {@link ShellFileSystem} straight over
 * the mounted VFS, plus the path and diagnostic helpers every program shares.
 *
 * This implementation answers from memory. A command running in its own
 * worker uses the message-backed one (`./process/child.ts`), which this one
 * serves from the host side.
 * @module @deepseek-ai/dsh-experimental-webworker-runtime/src/shell/fs-access
 */
import type { VfsError } from '../storage/types.ts';
import type { ShellFileSystem } from './types.ts';
/**
 * Resolve one shell word into an absolute VFS path.
 * @param cwd - the shell's working directory.
 * @param path - absolute or relative path as the command line spelled it.
 * @returns the absolute normalized path.
 */
export declare function resolveIn(cwd: string, path: string): string;
/**
 * Restate a filesystem failure the way a shell utility reports it, so the model
 * reads `cat: /dsh/none: No such file or directory` instead of a Node error
 * string.
 * @param program - the utility's name, used as the message prefix.
 * @param path - the path the utility was working on.
 * @param error - the failure the filesystem raised.
 * @returns the single-line diagnostic, without a trailing newline.
 */
export declare function describeFailure(program: string, path: string, error: unknown): string;
/**
 * Build a Node-shaped filesystem error, for the conditions this layer detects
 * itself and for the worker transport, which can carry a code but not a class.
 * @param code - the Node error code (`ENOENT`, `EISDIR`, …).
 * @param syscall - the operation that failed.
 * @param path - the path it failed on.
 * @returns the error to throw.
 */
export declare function filesystemError(code: string, syscall: string, path: string): VfsError;
/**
 * The filesystem backed by the VFS mounted in this thread.
 * @returns the in-host {@link ShellFileSystem}.
 */
export declare function hostFileSystem(): ShellFileSystem;
//# sourceMappingURL=fs-access.d.ts.map