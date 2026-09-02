/** DebuggerBackend implementation over one native Node inspector session. */
import type { RuntimeBackendObjectHandle } from '../../../shared/cdp/ids.ts';
import type { RuntimeDebuggerEvent } from '../../../shared/cdp/index.ts';
import type { DebuggerBackend } from '../../../shared/cdp/realm.ts';
import type { HostInspectorSession } from './bridge.ts';
import type { HostRuntimeBackend } from './runtime.ts';
/** Native Host debugger adapted to common commands, Runtime values, and events. */
export declare class HostDebuggerBackend implements DebuggerBackend {
    private readonly target;
    private readonly runtime;
    private readonly events;
    constructor(target: HostInspectorSession, runtime: HostRuntimeBackend);
    enable(request: Parameters<DebuggerBackend['enable']>[0]): Promise<Readonly<Record<string, unknown>>>;
    disable(): Promise<Readonly<Record<string, unknown>>>;
    pause(): Promise<Readonly<Record<string, unknown>>>;
    resume(request: Parameters<DebuggerBackend['resume']>[0]): Promise<Readonly<Record<string, unknown>>>;
    evaluateOnCallFrame(request: Parameters<DebuggerBackend['evaluateOnCallFrame']>[0]): ReturnType<DebuggerBackend['evaluateOnCallFrame']>;
    subscribe(listener: (event: RuntimeDebuggerEvent<RuntimeBackendObjectHandle>) => void): () => void;
    /** Release the native notification subscription. */
    close(): void;
    private paused;
    private callFrame;
    private scope;
}
//# sourceMappingURL=debugger.d.ts.map