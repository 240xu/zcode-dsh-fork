/** Browser-readable catalog of built-in Preview filesystem overlays. */
/** Manifest format version emitted beside the base VFS image. */
export const PREVIEW_FIXTURE_MANIFEST_VERSION = 1;
/** Leaf name resolved beside the base image. */
export const PREVIEW_FIXTURE_MANIFEST_FILE = 'fixtures.json';
function recordOf(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value
        : undefined;
}
/**
 * Validate the static fixture catalog before it controls Worker fetches.
 * @param value - Parsed JSON response.
 * @returns A detached manifest with unique ids and non-empty overlay lists.
 */
export function parsePreviewFixtureManifest(value) {
    const record = recordOf(value);
    if (record?.version !== PREVIEW_FIXTURE_MANIFEST_VERSION || !Array.isArray(record.fixtures)) {
        throw new Error(`preview fixture manifest must use version ${String(PREVIEW_FIXTURE_MANIFEST_VERSION)}`);
    }
    const fixtures = [];
    const ids = new Set();
    for (const value of record.fixtures) {
        const fixture = recordOf(value);
        const id = fixture?.id;
        const label = fixture?.label;
        const description = fixture?.description;
        const overlays = fixture?.overlays;
        const overlayUrls = Array.isArray(overlays)
            ? overlays.filter((overlay) => typeof overlay === 'string' && overlay.length > 0)
            : [];
        if (typeof id !== 'string' || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(id)
            || id === 'none' || id === 'webfs'
            || typeof label !== 'string' || label.length === 0
            || typeof description !== 'string' || description.length === 0
            || !Array.isArray(overlays) || overlays.length === 0 || overlayUrls.length !== overlays.length) {
            throw new Error('preview fixture manifest contains an invalid fixture entry');
        }
        if (ids.has(id))
            throw new Error(`preview fixture manifest repeats id "${id}"`);
        ids.add(id);
        fixtures.push({ id, label, description, overlays: overlayUrls });
    }
    const defaultFixture = record.defaultFixture;
    if (defaultFixture !== null && (typeof defaultFixture !== 'string' || !ids.has(defaultFixture))) {
        throw new Error('preview fixture manifest defaultFixture does not name a fixture');
    }
    return { version: PREVIEW_FIXTURE_MANIFEST_VERSION, defaultFixture, fixtures };
}
//# sourceMappingURL=fixture-manifest.js.map