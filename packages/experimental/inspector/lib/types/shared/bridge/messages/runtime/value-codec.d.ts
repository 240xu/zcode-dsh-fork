/** Exact wire decoder for Client Runtime results and RemoteObject data. */
import type { RuntimeStackTrace } from '../../../cdp/index.ts';
import type { ClientRuntimeExceptionDetails, ClientRuntimeRemoteObject, ClientRuntimeResult } from './commands.ts';
/**
 * Parse and rebuild one successful Client Runtime result.
 * @param value - Untrusted result value.
 * @returns The validated result union member.
 */
export declare function parseClientRuntimeResult(value: unknown): ClientRuntimeResult;
/**
 * Decode one Client Runtime object carrying an optional session-local handle.
 * @param value - Untrusted wire value.
 * @returns The validated realm-neutral object value.
 */
export declare function parseClientRuntimeRemoteObject(value: unknown): ClientRuntimeRemoteObject;
/**
 * Decode Client exception details used by command results and events.
 * @param value - Untrusted wire value.
 * @returns Validated exception details.
 */
export declare function parseClientRuntimeExceptionDetails(value: unknown): ClientRuntimeExceptionDetails;
/**
 * Decode a stack trace carried by a Client Runtime or Console frame.
 * @param value - Untrusted stack-trace value.
 * @returns The validated realm-neutral stack trace.
 */
export declare function parseClientRuntimeStackTrace(value: unknown): RuntimeStackTrace;
//# sourceMappingURL=value-codec.d.ts.map