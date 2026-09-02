/** Browser-readable catalog of built-in Preview filesystem overlays. */
/** Manifest format version emitted beside the base VFS image. */
export declare const PREVIEW_FIXTURE_MANIFEST_VERSION = 1;
/** Leaf name resolved beside the base image. */
export declare const PREVIEW_FIXTURE_MANIFEST_FILE = "fixtures.json";
/** One selectable built-in fixture and its ordered overlay archives. */
export interface PreviewFixtureManifestEntry {
    readonly id: string;
    readonly label: string;
    readonly description: string;
    readonly overlays: readonly string[];
}
/** Complete built-in fixture catalog consumed before Worker startup. */
export interface PreviewFixtureManifest {
    readonly version: number;
    /** Required default fixture id, or null when the chooser should default to an empty overlay. */
    readonly defaultFixture: string | null;
    readonly fixtures: readonly PreviewFixtureManifestEntry[];
}
/**
 * Validate the static fixture catalog before it controls Worker fetches.
 * @param value - Parsed JSON response.
 * @returns A detached manifest with unique ids and non-empty overlay lists.
 */
export declare function parsePreviewFixtureManifest(value: unknown): PreviewFixtureManifest;
//# sourceMappingURL=fixture-manifest.d.ts.map