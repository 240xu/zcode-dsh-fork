/** Versioned source lifecycle, observation, and extension frames shared by both carriers. */
import { type InspectorSourceGeneration, type InspectorSourceId } from '../ids.ts';
import { type InspectorJsonValue } from '../../json.ts';
import { INSPECTOR_PROTOCOL_VERSION } from '../version.ts';
import { type ClientConsoleCapability, type ClientConsoleDisableFrame, type ClientConsoleEnableFrame, type ClientConsoleEventFrame, type ClientRuntimeCapability, type ClientRuntimeCancelFrame, type ClientRuntimeRequestFrame, type ClientRuntimeResponseAcknowledgedFrame, type ClientRuntimeResponseFrame, type ClientRuntimeSessionClosedFrame } from './runtime/index.ts';
import { type ClientSourceRequestFrame, type ClientSourceResponseFrame, type ClientSourceSessionClosedFrame, type ClientSourcesCapability } from './sources/index.ts';
export { INSPECTOR_PROTOCOL_VERSION } from '../version.ts';
/** Realm producing observations. */
export type InspectorSourceKind = 'host' | 'client';
/** Optional protocols implemented by one source generation. */
export type InspectorSourceCapability = ClientRuntimeCapability | ClientConsoleCapability | ClientSourcesCapability;
/** One logical source and connection generation. */
export interface InspectorSourceDescriptor {
    /** Producer identity retained across transport reconnects. */
    readonly sourceId: InspectorSourceId;
    /** One transport admission, replaced on every reconnect. */
    readonly generation: InspectorSourceGeneration;
    readonly kind: InspectorSourceKind;
    readonly label: string;
    readonly timeOriginMs: number;
    readonly capabilities: readonly InspectorSourceCapability[];
}
/** One domain-owned observation before its sequence is assigned. */
export interface InspectorRecordInput {
    readonly monotonicMs: number;
    readonly topic: string;
    readonly payload: InspectorJsonValue;
}
/** Initial source handshake. */
export interface SourceOpenFrame {
    readonly v: typeof INSPECTOR_PROTOCOL_VERSION;
    readonly t: 'source/open';
    readonly source: InspectorSourceDescriptor;
    readonly topics: readonly string[];
}
/** Replace one source's current state after opening or resynchronization. */
export interface SourceReplaceFrame {
    readonly v: typeof INSPECTOR_PROTOCOL_VERSION;
    readonly t: 'source/replace';
    readonly sourceId: InspectorSourceId;
    readonly generation: InspectorSourceGeneration;
    readonly nextSequence: number;
    readonly records: readonly InspectorRecordInput[];
}
/** Append one contiguous observation batch. */
export interface SourceAppendFrame {
    readonly v: typeof INSPECTOR_PROTOCOL_VERSION;
    readonly t: 'source/append';
    readonly sourceId: InspectorSourceId;
    readonly generation: InspectorSourceGeneration;
    readonly firstSequence: number;
    readonly droppedBefore: number;
    readonly records: readonly InspectorRecordInput[];
}
/** Clean source closure. */
export interface SourceCloseFrame {
    readonly v: typeof INSPECTOR_PROTOCOL_VERSION;
    readonly t: 'source/close';
    readonly sourceId: InspectorSourceId;
    readonly generation: InspectorSourceGeneration;
}
/** Every source-to-Worker frame. */
export type SourceToWorkerFrame = SourceOpenFrame | SourceReplaceFrame | SourceAppendFrame | SourceCloseFrame | ClientConsoleEventFrame | ClientRuntimeResponseFrame | ClientSourceResponseFrame;
/** Worker acceptance of one source generation. */
export interface SourceAcceptedFrame {
    readonly v: typeof INSPECTOR_PROTOCOL_VERSION;
    readonly t: 'source/accepted';
    readonly sourceId: InspectorSourceId;
    readonly generation: InspectorSourceGeneration;
}
/** Worker acknowledgement that releases one Host MessagePort batch credit. */
export interface SourceAppendAcknowledgedFrame {
    readonly v: typeof INSPECTOR_PROTOCOL_VERSION;
    readonly t: 'source/append-acknowledged';
    readonly sourceId: InspectorSourceId;
    readonly generation: InspectorSourceGeneration;
    readonly nextSequence: number;
}
/** Worker request for a complete source-state replacement. */
export interface SourceResnapshotFrame {
    readonly v: typeof INSPECTOR_PROTOCOL_VERSION;
    readonly t: 'source/resnapshot';
    readonly sourceId: InspectorSourceId;
    readonly generation: InspectorSourceGeneration;
    readonly expectedSequence: number;
    readonly reason: string;
}
/** Rejection of one malformed or incompatible source connection. */
export interface SourceRejectedFrame {
    readonly v: typeof INSPECTOR_PROTOCOL_VERSION;
    readonly t: 'source/rejected';
    readonly code: 'invalid-frame' | 'version-mismatch' | 'unauthorized';
    readonly message: string;
}
/** Every Worker-to-source control frame. */
export type WorkerToSourceFrame = SourceAcceptedFrame | SourceAppendAcknowledgedFrame | SourceResnapshotFrame | SourceRejectedFrame | ClientConsoleEnableFrame | ClientConsoleDisableFrame | ClientRuntimeCancelFrame | ClientRuntimeRequestFrame | ClientRuntimeResponseAcknowledgedFrame | ClientRuntimeSessionClosedFrame | ClientSourceRequestFrame | ClientSourceSessionClosedFrame;
/**
 * Parse and rebuild one Worker control frame received by a source.
 * @param value - Untrusted decoded wire value.
 * @returns The validated Worker-to-source frame.
 */
export declare function parseWorkerSourceFrame(value: unknown): WorkerToSourceFrame;
/**
 * Parse and rebuild one source frame received at a process or network boundary.
 * @param value - Untrusted decoded wire value.
 * @param maxRecords - Maximum records admitted in one frame.
 * @returns The validated source-to-Worker frame.
 */
export declare function parseSourceFrame(value: unknown, maxRecords: number): SourceToWorkerFrame;
//# sourceMappingURL=observation.d.ts.map