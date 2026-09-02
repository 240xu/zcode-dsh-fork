/**
 * `node:net` for the worker. Nothing accepts or dials a socket here: the fake
 * HTTP server never emits `upgrade`, so only the address predicates and a
 * constructible-but-loud Socket are reachable.
 */
const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6 = /^[0-9a-f:]+$/i;
/** Constructible placeholder: the WebSocket upgrade path never runs in the worker. */
export class Socket {
    /**
     * Sockets are never written to; reaching this means an upgrade path activated.
     * @returns Never — it throws naming the unavailable member.
     */
    write() {
        throw new Error('web-preview: node:net Socket.write is not available in the worker host');
    }
    /**
     * Counterpart of {@link write}.
     * @returns Never — it throws naming the unavailable member.
     */
    end() {
        throw new Error('web-preview: node:net Socket.end is not available in the worker host');
    }
    /** Teardown is accepted so disposal paths stay quiet. */
    destroy() {
        // No resource was ever held.
    }
}
/**
 * Whether a string is an IPv4 literal.
 * @param value - candidate.
 * @returns true for dotted-quad literals.
 */
export function isIPv4(value) {
    return IPV4.test(value) && value.split('.').every(part => Number(part) <= 255);
}
/**
 * Whether a string is an IPv6 literal.
 * @param value - candidate.
 * @returns true for colon-hex literals.
 */
export function isIPv6(value) {
    return value.includes(':') && IPV6.test(value);
}
/**
 * IP family of a literal.
 * @param value - candidate.
 * @returns 4, 6, or 0 when it is not an IP literal.
 */
export function isIP(value) {
    if (isIPv4(value))
        return 4;
    if (isIPv6(value))
        return 6;
    return 0;
}
/**
 * TCP listening is the fake HTTP server's business; a bare net server is unreachable.
 * @returns Never — it throws naming the unavailable member.
 */
export function createServer() {
    throw new Error('web-preview: node:net.createServer is not available in the worker host');
}
/**
 * Outbound connections have no carrier in a worker.
 * @returns Never — it throws naming the unavailable member.
 */
export function connect() {
    throw new Error('web-preview: node:net.connect is not available in the worker host');
}
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ./builtins.ts). */
export const __esModule = true;
/** CommonJS default export: the members `require()` hands a caller of this module. */
export default { Socket, isIP, isIPv4, isIPv6, createServer, connect };
//# sourceMappingURL=net.js.map