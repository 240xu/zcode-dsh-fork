/**
 * The in-host filesystem for shell runs: {@link ShellFileSystem} straight over
 * the mounted VFS, plus the path and diagnostic helpers every program shares.
 *
 * This implementation answers from memory. A command running in its own
 * worker uses the message-backed one (`./process/child.ts`), which this one
 * serves from the host side.
 * @module @deepseek-ai/dsh-experimental-webworker-runtime/src/shell/fs-access
 */
import { resolve } from "../module-system/posix-path.js";
import { requireActiveVfs } from "../storage/active.js";
/**
 * Resolve one shell word into an absolute VFS path.
 * @param cwd - the shell's working directory.
 * @param path - absolute or relative path as the command line spelled it.
 * @returns the absolute normalized path.
 */
export function resolveIn(cwd, path) {
    return resolve(cwd, path);
}
/**
 * Restate a filesystem failure the way a shell utility reports it, so the model
 * reads `cat: /dsh/none: No such file or directory` instead of a Node error
 * string.
 * @param program - the utility's name, used as the message prefix.
 * @param path - the path the utility was working on.
 * @param error - the failure the filesystem raised.
 * @returns the single-line diagnostic, without a trailing newline.
 */
export function describeFailure(program, path, error) {
    const code = error.code;
    const reason = code === 'ENOENT'
        ? 'No such file or directory'
        : code === 'ENOTDIR'
            ? 'Not a directory'
            : code === 'EISDIR'
                ? 'Is a directory'
                : code === 'ENOTEMPTY'
                    ? 'Directory not empty'
                    : code === 'EEXIST'
                        ? 'File exists'
                        : error instanceof Error ? error.message : String(error);
    return `${program}: ${path}: ${reason}`;
}
/**
 * Build a Node-shaped filesystem error, for the conditions this layer detects
 * itself and for the worker transport, which can carry a code but not a class.
 * @param code - the Node error code (`ENOENT`, `EISDIR`, …).
 * @param syscall - the operation that failed.
 * @param path - the path it failed on.
 * @returns the error to throw.
 */
export function filesystemError(code, syscall, path) {
    const reason = code === 'EACCES' ? 'permission denied' : `${syscall} failed`;
    const error = new Error(`${code}: ${reason}, ${syscall} '${path}'`);
    error.code = code;
    error.path = path;
    error.syscall = syscall;
    return error;
}
/** Project VFS stats onto the facts a program reads. */
function statsOf(stats) {
    return { directory: stats.isDirectory(), size: stats.size, mtimeMs: stats.mtimeMs };
}
/**
 * The filesystem backed by the VFS mounted in this thread.
 * @returns the in-host {@link ShellFileSystem}.
 */
export function hostFileSystem() {
    const vfs = () => requireActiveVfs();
    const stat = (path) => {
        try {
            return Promise.resolve(statsOf(vfs().statSync(path)));
        }
        catch {
            // Absence is the answer callers branch on; every other failure mode of
            // the in-memory backend is also "this path holds nothing readable".
            return Promise.resolve(undefined);
        }
    };
    // Several members take no await: the face is asynchronous because a process
    // worker's filesystem is, while this backend answers from memory.
    return {
        stat,
        list: async (path) => {
            const names = [...vfs().readdirSync(path)].sort();
            const entries = [];
            for (const name of names) {
                entries.push({ name, directory: (await stat(resolve(path, name)))?.directory ?? false });
            }
            return entries;
        },
        readText: async (path) => {
            if ((await stat(path))?.directory === true)
                throw filesystemError('EISDIR', 'read', path);
            return vfs().readFileSync(path, 'utf8');
        },
        writeText: (path, text, append = false) => {
            if (append)
                vfs().appendFileSync(path, text);
            else
                vfs().writeFileSync(path, text);
            return Promise.resolve();
        },
        mkdir: (path, recursive) => {
            vfs().mkdirSync(path, { recursive });
            return Promise.resolve();
        },
        remove: (path, options) => {
            vfs().rmSync(path, options);
            return Promise.resolve();
        },
        rename: (from, to) => {
            vfs().renameSync(from, to);
            return Promise.resolve();
        },
    };
}
//# sourceMappingURL=fs-access.js.map