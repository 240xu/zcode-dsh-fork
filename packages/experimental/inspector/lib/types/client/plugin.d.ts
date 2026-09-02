/** Client Cordis plugin that publishes browser observations directly to the Inspector Worker. */
import type { Context } from '@deepseek-ai/cordis';
import { type InspectorService as SharedInspectorService } from '../shared/service.ts';
export type { CordisRuntimeTreeReader } from '../shared/cordis/reader.ts';
export type { CordisRuntimeConnection, CordisRuntimeContext, CordisRuntimeFiber, CordisRuntimeNode, CordisRuntimeRealm, CordisRuntimeSource, CordisRuntimeTree, } from '../shared/cordis/model.ts';
/** Client-facing Inspector service backed by the shared implementation. */
export interface InspectorService extends SharedInspectorService {
}
declare global {
    /** Host-injected Inspector Client connection parameters. */
    var __DSH_INSPECTOR__: unknown;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Publish Client-realm observations and query the shared Inspector state. */
        inspector: InspectorService;
    }
}
/** Cordis plugin name shared with the Host face. */
export declare const name = "experimental-inspector";
/** This transport root has no Client service dependencies. */
export declare const inject: string[];
/**
 * Mount the Client source and shared `ctx.inspector` publishing API.
 * @param ctx - Client Cordis context whose page identity and lifecycle own the source.
 */
export declare function apply(ctx: Context): Promise<void>;
//# sourceMappingURL=plugin.d.ts.map