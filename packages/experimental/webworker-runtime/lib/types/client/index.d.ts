import { WorkerTunnel } from './client.ts';
export { WorkerTunnel, type TunnelFetch } from './client.ts';
export { applyIndexInjections } from './apply-injections.ts';
export { IMAGE_FILE_NAME } from '../image-layout.ts';
export { parsePreviewFixtureManifest, PREVIEW_FIXTURE_MANIFEST_FILE, PREVIEW_FIXTURE_MANIFEST_VERSION, type PreviewFixtureManifest, type PreviewFixtureManifestEntry, } from '../fixture-manifest.ts';
/** Inputs for {@link connectWorkerHost}. */
export interface WorkerHostConnectOptions {
    /**
     * VFS image URL, the one deployment-shaped input. Defaults to
     * {@link IMAGE_FILE_NAME} beside the page; a deployment that packs the
     * image elsewhere passes its own URL. Data overlays are independent.
     */
    readonly image?: string | URL;
    /** Ordered data overlay URLs, resolved against the page like the base image. */
    readonly overlays?: readonly (string | URL)[];
}
/** Inputs for the optional pre-boot filesystem-source chooser. */
export interface WorkerHostSourceOptions {
    /** Base VFS image URL; defaults to {@link IMAGE_FILE_NAME} beside the page. */
    readonly image?: string | URL;
    /** Fixture catalog URL; defaults to {@link PREVIEW_FIXTURE_MANIFEST_FILE} beside the image. */
    readonly fixtureManifest?: string | URL;
}
/** Filesystem inputs selected before {@link connectWorkerHost}. */
export interface WorkerHostSource {
    /** Ordered data overlays to pass through unchanged to the Host connection. */
    readonly overlays: readonly URL[];
}
/** A page connected to a worker-hosted harness, ready to run a shell entry. */
export interface WorkerHostConnection {
    readonly worker: Worker;
    readonly tunnel: WorkerTunnel;
    /** Bundle transport for the shell's boot seam. */
    loadBundle(url: string): Promise<void>;
}
/**
 * Run the optional pre-boot source-selection stage. Calling this stage holds
 * the stock shell until the caller passes its result to {@link connectWorkerHost};
 * callers that need no chooser call `connectWorkerHost` directly and receive
 * the base image with an empty overlay list.
 * @param options - Base image and optional fixture-catalog locations.
 * @returns The ordered overlays selected by the user.
 */
export declare function chooseWorkerHostSource(options?: WorkerHostSourceOptions): Promise<WorkerHostSource>;
/**
 * Connect a spawned host worker and complete the pre-Cordis handshake.
 *
 * The caller constructs the Worker so its bundler resolves the bundle URL
 * statically; the opening `init` frame then carries the base image and ordered
 * overlay locations.
 *
 * Order is fixed by the web boot protocol: the transport global must exist
 * before any bundle executes; the injection table then reproduces the served
 * boot rows — the `__ModuleLoader__` registration queue, the parser-preload
 * bundles, `__DSH_BOOT__`, the theme bootstrap — in table order. The
 * boot-readiness deferred (`__DSH_BOOT_READY__`) is installed before the
 * first await and settles with the handshake, so a client entry evaluating
 * concurrently in the same document holds at its pre-boot await until every
 * row has taken effect, and surfaces a failed handshake instead of
 * proceeding on missing globals.
 * @param worker - The host worker.
 * @param options - Base-image and overlay location overrides.
 * @returns The connection; hand `loadBundle` to the shell entry's boot seam.
 */
export declare function connectWorkerHost(worker: Worker, options?: WorkerHostConnectOptions): Promise<WorkerHostConnection>;
//# sourceMappingURL=index.d.ts.map