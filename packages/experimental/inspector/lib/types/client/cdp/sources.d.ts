/** Browser-side catalog for the Inspector Client bundle and its source map. */
import type { ClientSourceCommand, ClientSourceError, ClientSourceResult, ClientSourcesCapability } from '../../shared/bridge/messages/sources/index.ts';
import type { RuntimeScriptKey } from '../../shared/cdp/ids.ts';
/**
 * Describe browser-side source access.
 * @param available - Whether the Client bundle was discovered.
 * @returns The Sources capability when this Client discovered its bundle.
 */
export declare function sourcesBridgeCapability(available: boolean): ClientSourcesCapability | undefined;
/** One lazily loaded browser script exposed by a Client source catalog. */
export interface ClientSourceAsset {
    readonly scriptKey: RuntimeScriptKey;
    readonly url: string;
    readonly hash: string;
    readonly sourceMapUrl?: string;
    readonly isModule?: boolean;
    loadSource(): Promise<string>;
    loadSourceMap?(): Promise<string | undefined>;
}
/** Deliberate error serialized by the Client source transport. */
export declare class ClientSourceCatalogError extends Error {
    readonly code: ClientSourceError['code'];
    constructor(code: ClientSourceError['code'], message: string);
}
/** Executes bounded, read-only operations over Client script assets. */
export declare class ClientSourceCatalog {
    private readonly assets;
    constructor(assets: readonly ClientSourceAsset[]);
    /**
     * Resolve a stack-frame URL to this catalog's local script key.
     * @param url - Absolute or page-relative stack-frame URL.
     * @returns The matching script key when the URL belongs to this catalog.
     */
    scriptKeyForUrl(url: string): RuntimeScriptKey | undefined;
    /**
     * Execute one validated source operation.
     * @param command - Read-only catalog command.
     * @param maxContentBytes - Maximum encoded bytes admitted for one asset.
     * @returns Script metadata or one bounded content chunk.
     */
    execute(command: ClientSourceCommand, maxContentBytes: number): Promise<ClientSourceResult>;
    private describe;
    private source;
    private sourceBytes;
    private sourceMapBytes;
}
/**
 * Discover this package's bundle URL from the Host-injected web boot graph.
 * @returns A lazy catalog, or `undefined` outside the assembled web application.
 */
export declare function discoverInspectorClientSourceCatalog(): ClientSourceCatalog | undefined;
//# sourceMappingURL=sources.d.ts.map