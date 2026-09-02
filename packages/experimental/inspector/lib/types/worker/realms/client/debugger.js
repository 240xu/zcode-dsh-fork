/** Explicit Client debugger capability until a pause-safe page agent exists. */
/**
 * Report the unavailable Client debugger backend.
 * @returns The typed unsupported result used by every Client realm session.
 */
export function clientDebuggerCapability() {
    return { state: 'unsupported', reason: 'Client native debugging is unavailable' };
}
//# sourceMappingURL=debugger.js.map