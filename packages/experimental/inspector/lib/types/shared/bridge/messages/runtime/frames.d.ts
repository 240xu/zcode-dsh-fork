/** Versioned envelopes for Worker-to-Client Runtime operations. */
import type { ClientRuntimeRequestId, ClientRuntimeSessionId, InspectorSourceGeneration, InspectorSourceId } from '../../ids.ts';
import { INSPECTOR_PROTOCOL_VERSION } from '../../version.ts';
import type { ClientRuntimeCommand, ClientRuntimeError, ClientRuntimeResult } from './commands.ts';
/** Source capability that permits synthetic Runtime execution contexts. */
export interface ClientRuntimeCapability {
    readonly type: 'client-runtime';
    readonly origin: string;
}
/** Worker request for one operation in a specific source generation and DevTools session. */
export interface ClientRuntimeRequestFrame {
    readonly v: typeof INSPECTOR_PROTOCOL_VERSION;
    readonly t: 'client-runtime/request';
    readonly sourceId: InspectorSourceId;
    readonly generation: InspectorSourceGeneration;
    readonly sessionId: ClientRuntimeSessionId;
    readonly requestId: ClientRuntimeRequestId;
    readonly command: ClientRuntimeCommand;
}
/** Worker cancellation of one outstanding Client Runtime request. */
export interface ClientRuntimeCancelFrame {
    readonly v: typeof INSPECTOR_PROTOCOL_VERSION;
    readonly t: 'client-runtime/cancel';
    readonly sourceId: InspectorSourceId;
    readonly generation: InspectorSourceGeneration;
    readonly sessionId: ClientRuntimeSessionId;
    readonly requestId: ClientRuntimeRequestId;
}
/** Worker acknowledgement that commits one successful Client Runtime response. */
export interface ClientRuntimeResponseAcknowledgedFrame {
    readonly v: typeof INSPECTOR_PROTOCOL_VERSION;
    readonly t: 'client-runtime/response-acknowledged';
    readonly sourceId: InspectorSourceId;
    readonly generation: InspectorSourceGeneration;
    readonly sessionId: ClientRuntimeSessionId;
    readonly requestId: ClientRuntimeRequestId;
}
/** Client response to one typed Runtime request. */
export interface ClientRuntimeResponseFrame {
    readonly v: typeof INSPECTOR_PROTOCOL_VERSION;
    readonly t: 'client-runtime/response';
    readonly sourceId: InspectorSourceId;
    readonly generation: InspectorSourceGeneration;
    readonly sessionId: ClientRuntimeSessionId;
    readonly requestId: ClientRuntimeRequestId;
    readonly outcome: {
        readonly ok: true;
        readonly result: ClientRuntimeResult;
    } | {
        readonly ok: false;
        readonly error: ClientRuntimeError;
    };
}
/** One-way cleanup when a DevTools connection or its Runtime domain closes. */
export interface ClientRuntimeSessionClosedFrame {
    readonly v: typeof INSPECTOR_PROTOCOL_VERSION;
    readonly t: 'client-runtime/session-closed';
    readonly sourceId: InspectorSourceId;
    readonly generation: InspectorSourceGeneration;
    readonly sessionId: ClientRuntimeSessionId;
}
/**
 * Parse and rebuild a Client Runtime capability.
 * @param value - Untrusted capability declaration.
 * @returns The validated capability.
 */
export declare function parseClientRuntimeCapability(value: unknown): ClientRuntimeCapability;
/**
 * Parse and rebuild one Worker-to-Client Runtime request.
 * @param value - Untrusted request frame.
 * @returns The validated request frame.
 */
export declare function parseClientRuntimeRequestFrame(value: Record<string, unknown>): ClientRuntimeRequestFrame;
/**
 * Parse and rebuild one Worker-to-Client Runtime cancellation.
 * @param value - Untrusted cancellation frame.
 * @returns The validated cancellation frame.
 */
export declare function parseClientRuntimeCancelFrame(value: Record<string, unknown>): ClientRuntimeCancelFrame;
/**
 * Parse and rebuild one Worker acknowledgement for a Client Runtime response.
 * @param value - Untrusted acknowledgement frame.
 * @returns The validated acknowledgement frame.
 */
export declare function parseClientRuntimeResponseAcknowledgedFrame(value: Record<string, unknown>): ClientRuntimeResponseAcknowledgedFrame;
/**
 * Parse and rebuild one Client-to-Worker Runtime response.
 * @param value - Untrusted response frame.
 * @returns The validated response frame.
 */
export declare function parseClientRuntimeResponseFrame(value: Record<string, unknown>): ClientRuntimeResponseFrame;
/**
 * Parse and rebuild one Runtime-session cleanup notification.
 * @param value - Untrusted cleanup frame.
 * @returns The validated cleanup frame.
 */
export declare function parseClientRuntimeSessionClosedFrame(value: Record<string, unknown>): ClientRuntimeSessionClosedFrame;
//# sourceMappingURL=frames.d.ts.map