/** Minimal CDP request and transport types owned by the Worker. */
/** Parsed client request. */
export interface CdpRequest {
    readonly id: number;
    readonly method: string;
    readonly params: Readonly<Record<string, unknown>>;
}
/** Outbound CDP event. */
export interface CdpNotification {
    readonly method: string;
    readonly params: Readonly<Record<string, unknown>>;
}
/** A connected DevTools transport. */
export interface CdpTransport {
    send(payload: unknown): void;
    close(): void;
}
/**
 * Parse one DevTools request before routing it.
 * @param value - Untrusted decoded WebSocket payload.
 * @returns The validated request envelope.
 */
export declare function parseCdpRequest(value: unknown): CdpRequest;
/**
 * Build a stable CDP error response.
 * @param id - Request id copied from the caller.
 * @param code - JSON-RPC error code.
 * @param message - Human-readable failure reason.
 * @returns The CDP error envelope.
 */
export declare function cdpError(id: number, code: number, message: string): object;
/**
 * Send one failed CDP operation using the domain error code.
 * @param transport - Connection receiving the response.
 * @param request - Request supplying the response id.
 * @param error - Rejection or synchronous error to render.
 */
export declare function sendCdpFailure(transport: CdpTransport, request: CdpRequest, error: unknown): void;
/**
 * Settle an asynchronous CDP operation through one transport.
 * @param transport - Connection receiving the response.
 * @param request - Request supplying the response id.
 * @param operation - Domain operation that produces the result.
 */
export declare function respondToCdpRequest(transport: CdpTransport, request: CdpRequest, operation: () => Promise<object>): void;
//# sourceMappingURL=protocol.d.ts.map