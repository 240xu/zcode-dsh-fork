/** ConsoleBackend implementation over native Node Runtime notifications. */
import type { RuntimeBackendObjectHandle } from '../../../shared/cdp/ids.ts';
import type { RuntimeConsoleBackendEvent } from '../../../shared/cdp/index.ts';
import type { HostInspectorSession } from './bridge.ts';
import type { ConsoleBackend } from '../../../shared/cdp/realm.ts';
import type { HostRuntimeBackend } from './runtime.ts';
/** Converts native Runtime notifications to realm-neutral Console events. */
export declare class HostConsoleBackend implements ConsoleBackend {
    private readonly target;
    private readonly runtime;
    private readonly events;
    constructor(target: HostInspectorSession, runtime: HostRuntimeBackend);
    /**
     * Subscribe to native Console and exception events.
     * @param listener - Connection-local event consumer.
     * @returns A disposer removing the consumer.
     */
    subscribe(listener: (event: RuntimeConsoleBackendEvent<RuntimeBackendObjectHandle>) => void): () => void;
    clear(): Promise<void>;
    /** Release the native notification subscription. */
    close(): void;
    private consoleEvent;
    private exceptionEvent;
}
//# sourceMappingURL=console.d.ts.map