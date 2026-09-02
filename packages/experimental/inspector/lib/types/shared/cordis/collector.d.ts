/** Shared Host/Client projection from live Cordis objects to a bounded semantic tree. */
import { Context } from '@deepseek-ai/cordis';
import { type CordisTreeSnapshot } from './snapshot.ts';
import { RealmObjectRegistry } from './object-registry.ts';
/** Bounds applied before one snapshot enters a source frame. */
export interface CordisTreeLimits {
    readonly maxNodes: number;
    readonly maxBytes: number;
}
/** Realm-local collector with a current live-object table. */
export declare class CordisTreeCollector {
    private readonly root;
    private readonly limits;
    /** Live-object table replaced atomically with each emitted snapshot. */
    readonly objects: RealmObjectRegistry;
    private revision;
    constructor(root: Context, limits: CordisTreeLimits);
    /**
     * Capture the current reachable Context/Fiber tree.
     * @returns A detached JSON snapshot whose retained objects replace the prior generation atomically.
     */
    snapshot(): CordisTreeSnapshot;
    /** Release the realm-global resolver and every retained object. */
    close(): void;
}
//# sourceMappingURL=collector.d.ts.map