import { type ImageFiles, type TransformOutcome } from './transform-image.ts';
export { DEFAULT_ROOT } from '@deepseek-ai/dsh-experimental-webworker-runtime';
/** Image path of the manifest; the layout contract's name, re-exported for callers. */
export declare const MANIFEST_PATH: string;
/** Image path of the composed profile; the layout contract's name, re-exported for callers. */
export declare const CONFIG_PATH: string;
/** One directory tree to copy into the image at a caller-selected mount. */
export interface ImageTree {
    /** Image path to mount it at, relative to the virtual root. */
    readonly mount: string;
    /** Absolute source directory. */
    readonly directory: string;
}
/** One configuration tree whose plugin rows may extend the package roster. */
export interface ConfigTree extends ImageTree {
    /**
     * Whether plugin names inside its `.yml` files join the materialization closure.
     * An agent preset mounts plugins the base composition never lists, and creating a
     * session fails if any of them is missing from the image.
     */
    readonly scanRoster?: boolean;
}
/** Everything the packer needs that it cannot know by itself. */
export interface PackOptions {
    /** Composed profile, `!!js` intact, as the CLI's `--dump-default-config` produced it. */
    readonly config: string;
    /** Profile name, recorded in the manifest. */
    readonly profile: string;
    /** Virtual root the image mounts under; defaults to {@link DEFAULT_ROOT}. */
    readonly root?: string;
    /** Package name to absolute directory, for workspace and vendored packages. */
    readonly workspaces: ReadonlyMap<string, string>;
    /** Directory Node-style dependency resolution walks up from for the roster. */
    readonly resolveFrom: string;
    /** Config trees to copy in beside the composition. */
    readonly configTrees?: readonly ConfigTree[];
    /** Empty directories to create; defaults to `home/`, `workspace/`, `tmp/`. */
    readonly emptyDirectories?: readonly string[];
    /**
     * Extra sweep roots: image specifiers requested by code outside the image.
     * Defaults to the worker assembly's own entries.
     */
    readonly entries?: readonly string[];
}
/** What one pack produced, for the caller to report or assert on. */
export interface PackResult {
    /** The gzip-compressed tar archive to write; the runtime inflates it at mount. */
    readonly image: Uint8Array;
    /** Every entry, before zipping; the manifest is already among them. */
    readonly files: ImageFiles;
    /** Package name to how many files it contributed, in materialization order. */
    readonly packages: ReadonlyMap<string, number>;
    /** How many of them came from the workspace rather than from `node_modules`. */
    readonly workspacePackages: number;
    /** Roster package names the closure started from. */
    readonly roster: readonly string[];
    /** Dependencies that did not resolve; a non-empty list means an incomplete image. */
    readonly missing: readonly string[];
    /** Executable scripts dropped from the image. */
    readonly executables: readonly string[];
    /** Page bundles left out of the transform; like every JavaScript entry they carry the trailing debugger name. */
    readonly pageBundles: readonly string[];
    /** JavaScript entries the image carries. */
    readonly javascriptEntries: number;
    /** JavaScript candidates no root reaches, dropped from the image. */
    readonly droppedJavascriptEntries: number;
    /** Third-party requests that resolve nowhere; loud at require time if hit. */
    readonly unresolvedExternalRequests: readonly string[];
    /** What the pack-time transform did. */
    readonly transform: TransformOutcome;
    /** Wrapper contract recorded in the manifest; every packed body meets it. */
    readonly contract: string;
}
/** One deterministic data-overlay archive and its uncompressed entries. */
export interface PackOverlayResult {
    /** Gzip-compressed ustar bytes consumed by the Worker host. */
    readonly image: Uint8Array;
    /** Every path in the overlay before compression. */
    readonly files: ImageFiles;
}
/**
 * Pack one VFS image.
 *
 * The manifest's claim is all-or-nothing: it names the one contract every packed body
 * was emitted against. A module the transform cannot express therefore fails the pack
 * rather than downgrading the image, because a mostly-transformed image boots into
 * errors far from their cause.
 * @param options - Composition, package index, and paths.
 * @returns The compressed image plus what went into it.
 * @throws When a config tree or workspace directory named in the options is missing,
 * because a silently thinner image fails much later and much less clearly.
 */
export declare function packVfsImage(options: PackOptions): PackResult;
/**
 * Pack opaque data trees into one ordered VFS overlay.
 *
 * Overlay mounts are restricted to the runtime-owned data directories, so an
 * overlay cannot replace configuration, the lowering manifest, or modules.
 * Files bypass package excludes and module reachability processing; later
 * trees replace earlier files at the same path.
 * @param trees - Absolute source directories and their data-directory mounts.
 * @returns Deterministic compressed archive plus its uncompressed entries.
 */
export declare function packVfsOverlay(trees: readonly ImageTree[]): PackOverlayResult;
//# sourceMappingURL=pack.d.ts.map