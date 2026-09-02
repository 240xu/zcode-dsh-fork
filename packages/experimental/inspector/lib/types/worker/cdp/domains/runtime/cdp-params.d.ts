/** Validation and normalization of CDP Runtime parameters routed to a Client realm. */
import type { RuntimeBackendObjectHandle } from '../../../../shared/cdp/ids.ts';
import { type InspectorJsonValue } from '../../../../shared/json.ts';
import type { RuntimeAwaitPromiseRequest, RuntimeCallFunctionRequest, RuntimeEvaluateRequest, RuntimeGetPropertiesRequest } from '../../../../shared/cdp/index.ts';
/** Numeric or globally unique selector for one execution context. */
export interface CdpExecutionContextSelector {
    readonly contextId?: number;
    readonly executionContextId?: number;
    readonly uniqueContextId?: string;
}
/** Validated Runtime.evaluate parameters and their routing selector. */
export interface ParsedEvaluate extends CdpExecutionContextSelector {
    readonly request: RuntimeEvaluateRequest;
}
/** Client-independent call argument before object ids are routed. */
export type CdpCallArgument = {
    readonly kind: 'value';
    readonly value: InspectorJsonValue;
} | {
    readonly kind: 'unserializable';
    readonly value: string;
} | {
    readonly kind: 'object';
    readonly objectId: string;
} | {
    readonly kind: 'undefined';
};
/** Validated Runtime.callFunctionOn parameters before object-id routing. */
export interface ParsedCallFunction extends CdpExecutionContextSelector {
    readonly objectId?: string;
    readonly arguments: readonly CdpCallArgument[];
    readonly request: Omit<RuntimeCallFunctionRequest<RuntimeBackendObjectHandle>, 'receiver' | 'arguments'>;
}
/**
 * Parse realm-routed `Runtime.evaluate` parameters.
 * @param params - Untrusted CDP parameters.
 * @returns A context selector and normalized Runtime request.
 */
export declare function parseEvaluate(params: Readonly<Record<string, unknown>>): ParsedEvaluate;
/**
 * Parse realm-routed `Runtime.getProperties` parameters.
 * @param params - Untrusted CDP parameters.
 * @returns The external object id and handle-free Runtime request.
 */
export declare function parseGetProperties(params: Readonly<Record<string, unknown>>): {
    readonly objectId: string;
    readonly request: Omit<RuntimeGetPropertiesRequest<RuntimeBackendObjectHandle>, 'handle'>;
};
/**
 * Parse Client-routed `Runtime.callFunctionOn` parameters.
 * @param params - Untrusted CDP parameters.
 * @returns Routing fields, arguments, and a handle-free Runtime request.
 */
export declare function parseCallFunction(params: Readonly<Record<string, unknown>>): ParsedCallFunction;
/**
 * Parse Client-routed `Runtime.awaitPromise` parameters.
 * @param params - Untrusted CDP parameters.
 * @returns The external promise id and handle-free Runtime request.
 */
export declare function parseAwaitPromise(params: Readonly<Record<string, unknown>>): {
    readonly promiseObjectId: string;
    readonly request: Omit<RuntimeAwaitPromiseRequest<RuntimeBackendObjectHandle>, 'promise'>;
};
/**
 * Parse one required object id.
 * @param params - Untrusted CDP parameters.
 * @returns The object id.
 */
export declare function parseReleaseObject(params: Readonly<Record<string, unknown>>): string;
/**
 * Parse one required object-group name.
 * @param params - Untrusted CDP parameters.
 * @returns The object-group name.
 */
export declare function parseReleaseObjectGroup(params: Readonly<Record<string, unknown>>): string;
/**
 * Parse `Runtime.globalLexicalScopeNames` context selection.
 * @param params - Untrusted CDP parameters.
 * @returns The validated context selector.
 */
export declare function parseGlobalLexicalScopeNames(params: Readonly<Record<string, unknown>>): CdpExecutionContextSelector;
//# sourceMappingURL=cdp-params.d.ts.map