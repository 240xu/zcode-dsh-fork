/** Host RemoteObject handles never cross the Host source bridge. */
/**
 * Reject an object operation that must use the Worker-owned native inspector session.
 * @param operation - Misrouted object operation.
 * @returns This function never returns.
 */
export declare function rejectObjectBridgeOperation(operation: string): never;
//# sourceMappingURL=objects.d.ts.map