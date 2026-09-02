/** Stable Client source identity with a fresh descriptor for each WebSocket generation. */
import { randomUUID } from '@deepseek-ai/dsh-util-crypto';
import { inspectorId } from "../../shared/identity.js";
import { bridgeCapabilities } from "../cdp/index.js";
const CLIENT_SOURCE_STORAGE_KEY = 'dsh.experimental-inspector.client-source-id.v0';
const CLIENT_SOURCE_LOCK_PREFIX = 'dsh.experimental-inspector.client-source:';
/** Owns one browser realm's stable source id across transport reconnects. */
export class ClientRealmSource {
    label;
    releaseClaim;
    /** Logical source id retained across reconnecting transport generations. */
    sourceId;
    constructor(label, sourceId = sessionClientSourceId(), releaseClaim) {
        this.label = label;
        this.releaseClaim = releaseClaim;
        this.sourceId = sourceId;
    }
    /**
     * Claim the tab identity before opening its source transport. Browsers with
     * Web Locks reject a copied `sessionStorage` identity while its original tab
     * remains live; a fresh id is persisted and claimed instead.
     * @param label - Human-readable Client label reported to the Worker.
     * @returns The claimed realm source.
     */
    static async claim(label) {
        let sourceId = sessionClientSourceId();
        const locks = browserLockManager();
        if (locks === undefined)
            return new ClientRealmSource(label, sourceId);
        while (true) {
            const release = await tryClaimSourceId(locks, sourceId);
            if (release !== undefined) {
                persistClientSourceId(sourceId);
                return new ClientRealmSource(label, sourceId, release);
            }
            sourceId = generatedClientSourceId();
        }
    }
    /**
     * Create the descriptor for one newly admitted transport generation.
     * @param hasSources - Whether the built Client bundle is available for source reads.
     * @returns A source descriptor with a fresh generation.
     */
    connect(hasSources) {
        return {
            sourceId: this.sourceId,
            generation: inspectorId(randomUUID(), 'generation'),
            kind: 'client',
            label: this.label,
            timeOriginMs: performance.timeOrigin,
            capabilities: bridgeCapabilities(clientOrigin(), hasSources),
        };
    }
    /** Release this page's identity claim. */
    close() {
        this.releaseClaim?.();
        this.releaseClaim = undefined;
    }
}
function sessionClientSourceId() {
    const generated = generatedClientSourceId();
    try {
        const stored = sessionStorage.getItem(CLIENT_SOURCE_STORAGE_KEY);
        if (stored !== null) {
            try {
                return inspectorId(stored, 'sourceId');
            }
            catch {
                // Invalid page-owned storage is replaced with a fresh protocol identity below.
            }
        }
        sessionStorage.setItem(CLIENT_SOURCE_STORAGE_KEY, generated);
    }
    catch {
        // Disabled or unavailable session storage limits identity to this page lifetime.
    }
    return generated;
}
function generatedClientSourceId() {
    return inspectorId(`client-${randomUUID()}`, 'sourceId');
}
function persistClientSourceId(sourceId) {
    try {
        sessionStorage.setItem(CLIENT_SOURCE_STORAGE_KEY, sourceId);
    }
    catch {
        // Disabled or unavailable session storage limits identity to this page lifetime.
    }
}
function browserLockManager() {
    if (typeof navigator === 'undefined')
        return undefined;
    return navigator.locks;
}
function tryClaimSourceId(locks, sourceId) {
    return new Promise((resolve, reject) => {
        let release;
        const held = new Promise((released) => { release = released; });
        void locks.request(`${CLIENT_SOURCE_LOCK_PREFIX}${sourceId}`, { ifAvailable: true }, async (lock) => {
            if (lock === null) {
                resolve(undefined);
                return;
            }
            resolve(release);
            await held;
        }).catch(reject);
    });
}
function clientOrigin() {
    const location = Reflect.get(globalThis, 'location');
    if (typeof location !== 'object' || location === null)
        return '';
    const origin = Reflect.get(location, 'origin');
    return typeof origin === 'string' ? origin : '';
}
//# sourceMappingURL=realm.js.map