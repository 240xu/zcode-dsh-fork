let active;
/**
 * Publish the filesystem the `node:fs` proxy reads.
 * @param vfs - Filesystem mounted by the worker entry.
 */
export function setActiveVfs(vfs) {
    active = vfs;
}
/**
 * Read the mounted filesystem.
 * @returns The active filesystem.
 */
export function requireActiveVfs() {
    if (active === undefined) {
        throw new Error('webworker vfs: no filesystem is mounted; the worker entry must call setActiveVfs before any node:fs access');
    }
    return active;
}
//# sourceMappingURL=active.js.map