/** Client Console observation shared by every active DevTools Runtime session. */
import type { ClientRemoteObjectHandle, ClientRuntimeSessionId } from '../../shared/bridge/ids.ts';
import type { ClientConsoleCapability } from '../../shared/bridge/messages/runtime/index.ts';
import type { RuntimeConsoleBackendEvent } from '../../shared/cdp/index.ts';
import type { ClientRuntimeExecutor } from './runtime.ts';
import { type ClientScriptKeyResolver } from './stack.ts';
/**
 * Describe browser-side Console observation.
 * @returns The Console capability advertised by a browser Client source.
 */
export declare function consoleBridgeCapability(): ClientConsoleCapability;
/** Receives one Console event whose object handles belong to the given session. */
export type ClientConsoleSink = (sessionId: ClientRuntimeSessionId, event: RuntimeConsoleBackendEvent<ClientRemoteObjectHandle>) => void;
/** Installs one transparent console/error observer and fans out session-local values. */
export declare class ClientConsoleObserver {
    private readonly runtime;
    private readonly sink;
    private readonly resolveScript;
    private readonly sessions;
    private readonly installed;
    private active;
    private closed;
    constructor(runtime: ClientRuntimeExecutor, sink: ClientConsoleSink, resolveScript?: ClientScriptKeyResolver);
    /**
     * Start producing events for one DevTools Runtime session.
     * @param sessionId - Session whose object table retains event arguments.
     */
    enable(sessionId: ClientRuntimeSessionId): void;
    /**
     * Stop producing events and release Console objects for one session.
     * @param sessionId - Session being disabled or closed.
     */
    disable(sessionId: ClientRuntimeSessionId): void;
    /** Restore original browser hooks and clear every active session. */
    close(): void;
    /** Stop observing the current source generation while allowing a later reconnect. */
    reset(): void;
    private install;
    private uninstall;
    private readonly onError;
    private readonly onUnhandledRejection;
    private captureConsole;
    private captureException;
}
//# sourceMappingURL=console.d.ts.map