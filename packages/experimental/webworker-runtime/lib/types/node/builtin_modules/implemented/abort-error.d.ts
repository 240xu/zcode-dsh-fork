/** Build the Node-style cancellation error shared by abortable builtin APIs. */
/**
 * Create an `AbortError` carrying Node's stable error code.
 * @param reason - Optional AbortSignal reason exposed as the error cause.
 * @returns A Node-compatible abort error.
 */
export declare function abortError(reason?: unknown): Error & {
    code: string;
    cause?: unknown;
};
//# sourceMappingURL=abort-error.d.ts.map