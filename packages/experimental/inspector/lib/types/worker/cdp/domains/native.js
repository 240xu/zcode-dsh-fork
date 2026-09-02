/** Explicit adapter for Host-only native CDP methods during realm migration. */
import { respondToCdpRequest } from "../protocol.js";
/** Forwards one explicit Host-native domain through a transport-neutral Node session. */
export class HostNativeDomainSession {
    transport;
    target;
    unsubscribe;
    constructor(transport, target) {
        this.transport = transport;
        this.target = target;
        this.unsubscribe = target.subscribe((message) => {
            if (!this.owns(message.method)
                || message.method === 'Runtime.consoleAPICalled'
                || message.method === 'Runtime.exceptionThrown')
                return;
            this.transport.send(message);
        });
    }
    /**
     * Execute one Host-native CDP request and send its correlated result.
     * @param request - Parsed request owned by a native Host domain.
     * @returns Whether this adapter owns the request's domain.
     */
    handle(request) {
        if (!this.owns(request.method))
            return false;
        respondToCdpRequest(this.transport, request, async () => this.target.request(request.method, request.params));
        return true;
    }
    /**
     * Test whether this adapter owns a CDP method.
     * @param method - CDP method name.
     * @returns Whether the method belongs to an explicit Host-native domain.
     */
    owns(method) {
        return NATIVE_DOMAINS.has(method.slice(0, method.indexOf('.')));
    }
    /** Stop forwarding native notifications to this DevTools connection. */
    close() {
        this.unsubscribe();
    }
}
const NATIVE_DOMAINS = new Set(['Runtime', 'Profiler', 'HeapProfiler', 'Schema']);
//# sourceMappingURL=native.js.map