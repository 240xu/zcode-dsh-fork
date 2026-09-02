/** Worker-side bridge dependencies for one connected Client realm. */
/**
 * Bind one Client source generation to the Worker bridge services that can address it.
 * @param target - Active Client source generation and execution context.
 * @param runtime - Runtime and Console RPC router.
 * @param sources - Source-catalog RPC router.
 * @returns The immutable Client realm bridge.
 */
export function createClientRealmBridge(target, runtime, sources) {
    return { target, runtime, sources };
}
//# sourceMappingURL=bridge.js.map