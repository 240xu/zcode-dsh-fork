/** Repository-facing Host package entry over the mirrored implementation tree. */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { type InspectorOptions } from './host/bridge/controller.ts';
import type { CordisRuntimeTreeReader } from './shared/cordis/reader.ts';
import type { InspectorJsonValue } from './shared/json.ts';
export { resolveInspectorOptions, startInspector } from './host/plugin.ts';
export type { InspectorEndpoint, InspectorHandle, InspectorOptions, InspectorSpec } from './host/plugin.ts';
export type { CordisRuntimeTreeReader } from './shared/cordis/reader.ts';
export type { CordisRuntimeConnection, CordisRuntimeContext, CordisRuntimeFiber, CordisRuntimeNode, CordisRuntimeRealm, CordisRuntimeSource, CordisRuntimeTree, } from './shared/cordis/model.ts';
export type { InspectorClientBootstrap } from './shared/bridge/messages/control.ts';
export type { InspectorRecordInput, InspectorSourceDescriptor, InspectorSourceKind, } from './shared/bridge/messages/observation.ts';
export type { InspectorJsonObject, InspectorJsonPrimitive, InspectorJsonValue } from './shared/json.ts';
export type { CordisContextTreeNode, CordisFiberTreeNode, CordisTreeNode, CordisTreeSnapshot, } from './shared/cordis/snapshot.ts';
/** Shared Host/Client service façade over the realm's source publisher. */
export interface InspectorService {
    /**
     * Publish one JSON observation without waiting for Worker delivery.
     * @param topic - Domain-owned topic name.
     * @param payload - JSON value validated before it reaches the carrier.
     * @param monotonicMs - Source-clock timestamp; defaults to `performance.now()`.
     */
    publish(topic: string, payload: InspectorJsonValue, monotonicMs?: number): void;
    /** Read-only Cordis topology queries independent of CDP sessions. */
    readonly cordis: CordisRuntimeTreeReader;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Publish Host-realm observations and query the shared Inspector state. */
        inspector: InspectorService;
    }
}
/** Cordis plugin name shared with the Client face. */
export declare const name = "experimental-inspector";
/** Host service required to inject the Client connection bootstrap into index.html. */
export declare const inject: string[];
/** Host plugin configuration. Fetch capture is enabled by default. */
export interface Config extends Omit<InspectorOptions, 'clientOrigins'> {
    /** Browser origins allowed to open the Client ingest WebSocket. */
    clientOrigins?: string[];
}
/** Runtime validation for {@link Config}. */
export declare const Config: z<Config>;
/**
 * Apply the Host implementation from the repository-standard package entry.
 * @param ctx - Host Cordis plugin context.
 * @param config - Validated Inspector configuration.
 */
export declare function apply(ctx: Context, config: Config): Promise<void>;
//# sourceMappingURL=index.d.ts.map