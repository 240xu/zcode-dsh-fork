/** Typed transport for Client Console sessions and events. */
import type { ClientRemoteObjectHandle, ClientRuntimeSessionId, InspectorSourceGeneration, InspectorSourceId } from '../../ids.ts';
import type { RuntimeConsoleBackendEvent } from '../../../cdp/index.ts';
import { INSPECTOR_PROTOCOL_VERSION } from '../../version.ts';
/** Source capability that permits Client Console event forwarding. */
export interface ClientConsoleCapability {
    readonly type: 'client-console';
}
/** Worker request to start Console observation for one DevTools session. */
export interface ClientConsoleEnableFrame {
    readonly v: typeof INSPECTOR_PROTOCOL_VERSION;
    readonly t: 'client-console/enable';
    readonly sourceId: InspectorSourceId;
    readonly generation: InspectorSourceGeneration;
    readonly sessionId: ClientRuntimeSessionId;
}
/** Worker request to stop Console observation for one DevTools session. */
export interface ClientConsoleDisableFrame {
    readonly v: typeof INSPECTOR_PROTOCOL_VERSION;
    readonly t: 'client-console/disable';
    readonly sourceId: InspectorSourceId;
    readonly generation: InspectorSourceGeneration;
    readonly sessionId: ClientRuntimeSessionId;
}
/** Client Console event carrying objects retained for one DevTools session. */
export interface ClientConsoleEventFrame {
    readonly v: typeof INSPECTOR_PROTOCOL_VERSION;
    readonly t: 'client-console/event';
    readonly sourceId: InspectorSourceId;
    readonly generation: InspectorSourceGeneration;
    readonly sessionId: ClientRuntimeSessionId;
    readonly event: RuntimeConsoleBackendEvent<ClientRemoteObjectHandle>;
}
/**
 * Parse the marker capability for Client Console forwarding.
 * @param value - Untrusted capability declaration.
 * @returns The validated marker capability.
 */
export declare function parseClientConsoleCapability(value: unknown): ClientConsoleCapability;
/**
 * Parse a Worker-to-Client Console lifecycle frame.
 * @param value - Untrusted decoded frame.
 * @returns A validated enable or disable frame.
 */
export declare function parseClientConsoleControlFrame(value: Record<string, unknown>): ClientConsoleEnableFrame | ClientConsoleDisableFrame;
/**
 * Parse one Client-to-Worker Console event.
 * @param value - Untrusted decoded frame.
 * @returns A validated Console event frame.
 */
export declare function parseClientConsoleEventFrame(value: Record<string, unknown>): ClientConsoleEventFrame;
//# sourceMappingURL=console-frames.d.ts.map