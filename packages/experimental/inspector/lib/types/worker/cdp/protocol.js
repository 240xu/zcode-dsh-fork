/** Minimal CDP request and transport types owned by the Worker. */
import { isPlainObject } from "../../shared/json.js";
/**
 * Parse one DevTools request before routing it.
 * @param value - Untrusted decoded WebSocket payload.
 * @returns The validated request envelope.
 */
export function parseCdpRequest(value) {
    if (!isPlainObject(value)
        || !Number.isSafeInteger(value.id)
        || value.id < 0
        || typeof value.method !== 'string'
        || value.method.length === 0
        || (value.params !== undefined && !isPlainObject(value.params))) {
        throw new Error('inspector CDP: invalid request');
    }
    return {
        id: value.id,
        method: value.method,
        params: value.params ?? {},
    };
}
/**
 * Build a stable CDP error response.
 * @param id - Request id copied from the caller.
 * @param code - JSON-RPC error code.
 * @param message - Human-readable failure reason.
 * @returns The CDP error envelope.
 */
export function cdpError(id, code, message) {
    return { id, error: { code, message } };
}
/**
 * Send one failed CDP operation using the domain error code.
 * @param transport - Connection receiving the response.
 * @param request - Request supplying the response id.
 * @param error - Rejection or synchronous error to render.
 */
export function sendCdpFailure(transport, request, error) {
    const message = error instanceof Error ? error.message : String(error);
    transport.send(cdpError(request.id, -32000, message));
}
/**
 * Settle an asynchronous CDP operation through one transport.
 * @param transport - Connection receiving the response.
 * @param request - Request supplying the response id.
 * @param operation - Domain operation that produces the result.
 */
export function respondToCdpRequest(transport, request, operation) {
    void operation().then((result) => { transport.send({ id: request.id, result }); }, (error) => { sendCdpFailure(transport, request, error); });
}
//# sourceMappingURL=protocol.js.map