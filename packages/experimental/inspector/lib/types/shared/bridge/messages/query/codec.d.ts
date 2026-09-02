/** Exact decoders for non-CDP Inspector query frames. */
import type { InspectorQueryRequestFrame, InspectorQueryRequestId, InspectorQueryResponseFrame } from './frames.ts';
import type { InspectorSourceGeneration, InspectorSourceId } from '../../ids.ts';
/** Correlation fields recoverable before a query body is accepted. */
export interface InspectorQueryFrameIdentity {
    readonly sourceId: InspectorSourceId;
    readonly generation: InspectorSourceGeneration;
    readonly requestId: InspectorQueryRequestId;
}
/**
 * Test whether a decoded carrier value belongs to the query request protocol.
 * @param value - Decoded carrier value.
 * @returns Whether the query request decoder owns the value.
 */
export declare function isInspectorQueryRequestEnvelope(value: unknown): boolean;
/**
 * Test whether a decoded carrier value belongs to the query response protocol.
 * @param value - Decoded carrier value.
 * @returns Whether the query response decoder owns the value.
 */
export declare function isInspectorQueryResponseEnvelope(value: unknown): boolean;
/**
 * Decode one source-to-Worker query request.
 * @param value - Untrusted decoded carrier value.
 * @returns The detached, validated request frame.
 */
export declare function parseInspectorQueryRequestFrame(value: unknown): InspectorQueryRequestFrame;
/**
 * Decode correlation fields used to reject a malformed request without timing out its caller.
 * @param value - Candidate query request frame.
 * @returns Validated source and request identities.
 */
export declare function parseInspectorQueryFrameIdentity(value: unknown): InspectorQueryFrameIdentity;
/**
 * Decode one Worker-to-source query response.
 * @param value - Untrusted decoded carrier value.
 * @returns The detached, validated response frame.
 */
export declare function parseInspectorQueryResponseFrame(value: unknown): InspectorQueryResponseFrame;
//# sourceMappingURL=codec.d.ts.map