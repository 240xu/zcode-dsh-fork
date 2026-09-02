/**
 * Filesystem interfaces shared by every VFS backend. The shipped implementation
 * is in memory; browser persistence hydrates it and consumes its committed
 * mutation stream. Errors carry Node's `code` values because roster plugins
 * branch on them (`ENOENT` for optional files, `EACCES` for read-only trees).
 * @module @deepseek-ai/dsh-experimental-webworker-runtime/src/storage/types
 */
export {};
//# sourceMappingURL=types.js.map