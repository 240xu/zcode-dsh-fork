/**
 * Process-wide slot holding the mounted filesystem. Kept apart from any
 * backend implementation: the `node:fs` proxy depends on the slot, not on
 * which backend the worker entry mounted.
 * @module @deepseek-ai/dsh-experimental-webworker-runtime/src/storage/active
 */
import type { Vfs } from './types.ts';
/**
 * Publish the filesystem the `node:fs` proxy reads.
 * @param vfs - Filesystem mounted by the worker entry.
 */
export declare function setActiveVfs(vfs: Vfs): void;
/**
 * Read the mounted filesystem.
 * @returns The active filesystem.
 */
export declare function requireActiveVfs(): Vfs;
//# sourceMappingURL=active.d.ts.map