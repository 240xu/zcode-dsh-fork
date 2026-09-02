import type { ConfigTree, ImageTree, PackResult } from './pack.ts';
/** One built-in Preview source and the trees packed into its overlay. */
export interface PreviewFixture {
    /** URL/query-safe identifier. */
    readonly id: string;
    /** User-facing chooser label. */
    readonly label: string;
    /** User-facing chooser detail. */
    readonly description: string;
    /** Opaque trees packed into this fixture's overlay archive. */
    readonly trees: readonly ImageTree[];
}
/**
 * Index every workspace and vendored package by name.
 * @param repoRoot - Absolute repository root.
 * @returns Package name to absolute directory.
 */
export declare function indexWorkspacePackages(repoRoot: string): Map<string, string>;
/**
 * Compose one profile through the real CLI dump path, leaving `!!js`
 * unevaluated. The dump runs against a throwaway Harness home and default
 * layers only, so the image is the shipped profile: the machine's `$DSH_HOME`
 * — its profile manifest with locally installed bundles, and its patch files —
 * would otherwise leak this machine's plugins into the image and break the
 * same-tree-same-bytes guarantee.
 * @param repoRoot - Absolute repository root.
 * @param profile - Profile name to compose.
 * @returns The composed YAML.
 */
export declare function composeProfile(repoRoot: string, profile: string): string;
/**
 * Config trees the CLI package declares for deployment images
 * (`dsh.configTrees` in its package.json): `path` is relative to the CLI
 * package root, `mount` is the image path, `scanRoster` feeds the tree's yml
 * plugin rows into the pack roster. The CLI owns its config layout; this
 * reader follows the declaration instead of naming directories. A malformed
 * declaration refuses the pack.
 * @param repoRoot - Absolute repository root.
 * @returns Trees with absolute source directories.
 */
export declare function configTrees(repoRoot: string): ConfigTree[];
/**
 * Built-in filesystem fixtures offered by the repository preview.
 * Session and Workspace semantics remain opaque here; the owning runtime tests
 * validate those files through their production readers.
 * @param repoRoot - Absolute repository root.
 * @returns Named chooser entries and their overlay trees.
 */
export declare function previewFixtures(repoRoot: string): PreviewFixture[];
/**
 * Render one pack as the lines a build log should carry.
 *
 * Refusals and unresolved dependencies are the two states a reader must not miss, so
 * they are spelled out rather than counted.
 * @param result - What the pack produced.
 * @param repoRoot - Absolute repository root, for relative paths.
 * @param outputFile - Where the image was written.
 * @returns Lines to print.
 */
export declare function describePack(result: PackResult, repoRoot: string, outputFile: string): string[];
//# sourceMappingURL=repository.d.ts.map