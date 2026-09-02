/** Consumer-neutral Cordis runtime tree shared by non-CDP readers. */
import { type InspectorId } from '../identity.ts';
/** Current consumer-neutral Cordis tree version. */
export declare const CORDIS_RUNTIME_TREE_SCHEMA_VERSION: 0;
/** Consumer-visible identity of one inspected Cordis runtime. */
export type CordisRuntimeSourceId = InspectorId<'CordisRuntimeSourceId'>;
/** Execution environment represented by one consumer-visible Cordis runtime. */
export type CordisRuntimeSourceKind = 'host' | 'client';
/** Availability of the realm represented by a retained tree. */
export type CordisRuntimeConnection = {
    readonly state: 'connected';
} | {
    readonly state: 'disconnected';
    readonly reason: string;
};
/** Consumer-visible identity of one Cordis realm. */
export interface CordisRuntimeSource {
    readonly sourceId: CordisRuntimeSourceId;
    readonly kind: CordisRuntimeSourceKind;
    readonly label: string;
}
/** One Context in a consumer-neutral Cordis tree. */
export interface CordisRuntimeContext {
    readonly kind: 'context';
    readonly children: readonly CordisRuntimeNode[];
}
/** One Fiber and its owned Context in a consumer-neutral Cordis tree. */
export interface CordisRuntimeFiber {
    readonly kind: 'fiber';
    readonly uid: number;
    readonly children: readonly [CordisRuntimeContext];
}
/** One semantic Cordis runtime node. */
export type CordisRuntimeNode = CordisRuntimeContext | CordisRuntimeFiber;
/** Latest retained topology and availability of one Cordis realm. */
export interface CordisRuntimeRealm {
    readonly source: CordisRuntimeSource;
    readonly connection: CordisRuntimeConnection;
    readonly revision: number;
    readonly truncated: boolean;
    readonly root: CordisRuntimeContext;
}
/** Latest Host and Client Cordis topology without routing or CDP identifiers. */
export interface CordisRuntimeTree {
    readonly schemaVersion: typeof CORDIS_RUNTIME_TREE_SCHEMA_VERSION;
    readonly host: CordisRuntimeRealm | null;
    readonly clients: readonly CordisRuntimeRealm[];
}
/**
 * Decode a consumer-neutral tree received across an Inspector transport.
 * @param value - Untrusted query result value.
 * @returns A detached tree containing only public semantic fields.
 */
export declare function parseCordisRuntimeTree(value: unknown): CordisRuntimeTree;
/**
 * Project an inspected source id into the consumer-visible Cordis identity namespace.
 * @param value - Stable source id carried by the current runtime observation.
 * @returns The corresponding Cordis runtime source id.
 */
export declare function cordisRuntimeSourceId(value: string): CordisRuntimeSourceId;
//# sourceMappingURL=model.d.ts.map