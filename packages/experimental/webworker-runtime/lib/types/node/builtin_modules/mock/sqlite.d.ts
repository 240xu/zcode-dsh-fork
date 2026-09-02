/** Synchronous database handle (unavailable). */
export declare const DatabaseSync: typeof import('node:sqlite').DatabaseSync;
/** Prepared statement handle (unavailable). */
export declare const StatementSync: typeof import('node:sqlite').StatementSync;
/**
 * Backup helper (unavailable).
 * @returns Never — it throws naming the unavailable member.
 */
export declare function backup(): never;
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ./builtins.ts). */
export declare const __esModule = true;
/** CommonJS default export: the members `require()` hands a caller of this module. */
declare const _default: {
    DatabaseSync: typeof import("node:sqlite").DatabaseSync;
    StatementSync: typeof import("node:sqlite").StatementSync;
    backup: typeof backup;
};
export default _default;
//# sourceMappingURL=sqlite.d.ts.map