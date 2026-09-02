/** Stable Client source identity with a fresh descriptor for each WebSocket generation. */
import type { InspectorSourceDescriptor } from '../../shared/bridge/messages/observation.ts';
/** Owns one browser realm's stable source id across transport reconnects. */
export declare class ClientRealmSource {
    private readonly label;
    private releaseClaim?;
    /** Logical source id retained across reconnecting transport generations. */
    readonly sourceId: InspectorSourceDescriptor['sourceId'];
    constructor(label: string, sourceId?: import("../../shared/index.ts").InspectorSourceId, releaseClaim?: (() => void) | undefined);
    /**
     * Claim the tab identity before opening its source transport. Browsers with
     * Web Locks reject a copied `sessionStorage` identity while its original tab
     * remains live; a fresh id is persisted and claimed instead.
     * @param label - Human-readable Client label reported to the Worker.
     * @returns The claimed realm source.
     */
    static claim(label: string): Promise<ClientRealmSource>;
    /**
     * Create the descriptor for one newly admitted transport generation.
     * @param hasSources - Whether the built Client bundle is available for source reads.
     * @returns A source descriptor with a fresh generation.
     */
    connect(hasSources: boolean): InspectorSourceDescriptor;
    /** Release this page's identity claim. */
    close(): void;
}
//# sourceMappingURL=realm.d.ts.map