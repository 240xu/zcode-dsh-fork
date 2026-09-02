/**
 * `node:net` for the worker. Nothing accepts or dials a socket here: the fake
 * HTTP server never emits `upgrade`, so only the address predicates and a
 * constructible-but-loud Socket are reachable.
 */
/** Constructible placeholder: the WebSocket upgrade path never runs in the worker. */
export declare class Socket {
    /**
     * Sockets are never written to; reaching this means an upgrade path activated.
     * @returns Never — it throws naming the unavailable member.
     */
    write(): never;
    /**
     * Counterpart of {@link write}.
     * @returns Never — it throws naming the unavailable member.
     */
    end(): never;
    /** Teardown is accepted so disposal paths stay quiet. */
    destroy(): void;
}
/**
 * Whether a string is an IPv4 literal.
 * @param value - candidate.
 * @returns true for dotted-quad literals.
 */
export declare function isIPv4(value: string): boolean;
/**
 * Whether a string is an IPv6 literal.
 * @param value - candidate.
 * @returns true for colon-hex literals.
 */
export declare function isIPv6(value: string): boolean;
/**
 * IP family of a literal.
 * @param value - candidate.
 * @returns 4, 6, or 0 when it is not an IP literal.
 */
export declare function isIP(value: string): number;
/**
 * TCP listening is the fake HTTP server's business; a bare net server is unreachable.
 * @returns Never — it throws naming the unavailable member.
 */
export declare function createServer(): never;
/**
 * Outbound connections have no carrier in a worker.
 * @returns Never — it throws naming the unavailable member.
 */
export declare function connect(): never;
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ./builtins.ts). */
export declare const __esModule = true;
/** CommonJS default export: the members `require()` hands a caller of this module. */
declare const _default: {
    Socket: typeof Socket;
    isIP: typeof isIP;
    isIPv4: typeof isIPv4;
    isIPv6: typeof isIPv6;
    createServer: typeof createServer;
    connect: typeof connect;
};
export default _default;
//# sourceMappingURL=net.d.ts.map