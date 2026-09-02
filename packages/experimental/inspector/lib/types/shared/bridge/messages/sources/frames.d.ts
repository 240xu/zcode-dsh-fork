/** Versioned envelopes for Client source catalog operations. */
import type { ClientSourceRequestId, ClientSourceSessionId, InspectorSourceGeneration, InspectorSourceId } from '../../ids.ts';
import { INSPECTOR_PROTOCOL_VERSION } from '../../version.ts';
import type { ClientSourceCommand, ClientSourceError, ClientSourceResult } from './commands.ts';
/** Source capability that permits read-only Client script discovery. */
export interface ClientSourcesCapability {
    readonly type: 'client-sources';
}
/** Worker request for one operation in a Client source catalog. */
export interface ClientSourceRequestFrame {
    readonly v: typeof INSPECTOR_PROTOCOL_VERSION;
    readonly t: 'client-sources/request';
    readonly sourceId: InspectorSourceId;
    readonly generation: InspectorSourceGeneration;
    readonly sessionId: ClientSourceSessionId;
    readonly requestId: ClientSourceRequestId;
    readonly command: ClientSourceCommand;
}
/** Client response to one source catalog operation. */
export interface ClientSourceResponseFrame {
    readonly v: typeof INSPECTOR_PROTOCOL_VERSION;
    readonly t: 'client-sources/response';
    readonly sourceId: InspectorSourceId;
    readonly generation: InspectorSourceGeneration;
    readonly sessionId: ClientSourceSessionId;
    readonly requestId: ClientSourceRequestId;
    readonly outcome: {
        readonly ok: true;
        readonly result: ClientSourceResult;
    } | {
        readonly ok: false;
        readonly error: ClientSourceError;
    };
}
/** One-way cleanup for in-flight operations owned by a closed DevTools session. */
export interface ClientSourceSessionClosedFrame {
    readonly v: typeof INSPECTOR_PROTOCOL_VERSION;
    readonly t: 'client-sources/session-closed';
    readonly sourceId: InspectorSourceId;
    readonly generation: InspectorSourceGeneration;
    readonly sessionId: ClientSourceSessionId;
}
/**
 * Parse the marker capability for a Client source catalog.
 * @param value - Untrusted capability declaration.
 * @returns The validated marker capability.
 */
export declare function parseClientSourcesCapability(value: unknown): ClientSourcesCapability;
/**
 * Parse one Worker-to-Client source request.
 * @param value - Untrusted decoded request.
 * @returns The validated request frame.
 */
export declare function parseClientSourceRequestFrame(value: Record<string, unknown>): ClientSourceRequestFrame;
/**
 * Parse one Client-to-Worker source response.
 * @param value - Untrusted decoded response.
 * @returns The validated response frame.
 */
export declare function parseClientSourceResponseFrame(value: Record<string, unknown>): ClientSourceResponseFrame;
/**
 * Parse one Client source-session cleanup notification.
 * @param value - Untrusted decoded notification.
 * @returns The validated cleanup frame.
 */
export declare function parseClientSourceSessionClosedFrame(value: Record<string, unknown>): ClientSourceSessionClosedFrame;
//# sourceMappingURL=frames.d.ts.map