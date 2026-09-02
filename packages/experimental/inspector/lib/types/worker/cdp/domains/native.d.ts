/** Explicit adapter for Host-only native CDP methods during realm migration. */
import { type CdpRequest, type CdpTransport } from '../protocol.ts';
import type { NativeDomainBackend } from '../../../shared/cdp/realm.ts';
/** Forwards one explicit Host-native domain through a transport-neutral Node session. */
export declare class HostNativeDomainSession {
    private readonly transport;
    private readonly target;
    private readonly unsubscribe;
    constructor(transport: CdpTransport, target: NativeDomainBackend);
    /**
     * Execute one Host-native CDP request and send its correlated result.
     * @param request - Parsed request owned by a native Host domain.
     * @returns Whether this adapter owns the request's domain.
     */
    handle(request: CdpRequest): boolean;
    /**
     * Test whether this adapter owns a CDP method.
     * @param method - CDP method name.
     * @returns Whether the method belongs to an explicit Host-native domain.
     */
    owns(method: string): boolean;
    /** Stop forwarding native notifications to this DevTools connection. */
    close(): void;
}
//# sourceMappingURL=native.d.ts.map