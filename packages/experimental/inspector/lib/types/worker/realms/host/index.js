/** Host realm adapter backed by a connection-local Node inspector session. */
import { randomUUID } from 'node:crypto';
import { inspectorId } from "../../../shared/identity.js";
import { HostConsoleBackend } from "./console.js";
import { HostDebuggerBackend } from "./debugger.js";
import { HostRuntimeBackend } from "./runtime.js";
import { HostSourceBackend } from "./sources.js";
import { HostInspectorSession } from "./bridge.js";
const HOST_RUNTIME_OPERATIONS = [
    'evaluate',
    'get-properties',
    'call-function',
    'await-promise',
    'release-object',
    'release-object-group',
    'global-lexical-scope-names',
];
/** Host realm definition that opens one native V8 session per DevTools connection. */
export class HostInspectorRealm {
    label;
    descriptor;
    context = { kind: 'native' };
    capabilities = {
        runtime: HOST_RUNTIME_OPERATIONS,
        console: ['events', 'exceptions', 'clear'],
        sources: ['catalog', 'content', 'source-map'],
        debugger: ['breakpoint', 'pause', 'resume', 'step', 'call-frame'],
    };
    constructor(label) {
        this.label = label;
        this.descriptor = {
            realmId: inspectorId(randomUUID(), 'realmId'),
            sourceId: inspectorId('host-runtime', 'sourceId'),
            generation: inspectorId(randomUUID(), 'generation'),
            kind: 'host',
            label,
        };
    }
    /** Open a native Host inspector session for one DevTools connection. */
    openSession() {
        const target = new HostInspectorSession(this.label);
        const runtime = new HostRuntimeBackend(target);
        const console = new HostConsoleBackend(target, runtime);
        const sources = new HostSourceBackend(target);
        const debug = new HostDebuggerBackend(target, runtime);
        return {
            descriptor: this.descriptor,
            context: this.context,
            runtime: { state: 'supported', backend: runtime },
            console: { state: 'supported', backend: console },
            sources: { state: 'supported', backend: sources },
            debugger: { state: 'supported', backend: debug },
            nativeDomains: { state: 'supported', backend: target },
            close: () => {
                sources.close();
                debug.close();
                console.close();
                runtime.close();
                target.close();
            },
        };
    }
}
//# sourceMappingURL=index.js.map