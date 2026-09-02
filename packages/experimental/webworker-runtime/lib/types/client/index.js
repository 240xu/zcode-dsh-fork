/**
 * Page half: everything a deployment needs to reach a worker-hosted harness.
 *
 * This is **pre-Cordis glue, not a client plugin**: it installs the transport
 * global and executes the boot injection table that the client plugin graph
 * is later loaded through, so it cannot itself be a graph row. A page imports
 * it directly and decides where the worker bundle and image live; nothing
 * here mounts into a shipped roster.
 * @module @deepseek-ai/dsh-experimental-webworker-runtime/client
 */
import { IMAGE_FILE_NAME } from "../image-layout.js";
import { PREVIEW_FIXTURE_MANIFEST_FILE } from "../fixture-manifest.js";
import { WorkerTunnel } from "./client.js";
import { applyIndexInjections } from "./apply-injections.js";
import { choosePreviewSource } from "./source-chooser.js";
export { WorkerTunnel } from "./client.js";
export { applyIndexInjections } from "./apply-injections.js";
export { IMAGE_FILE_NAME } from "../image-layout.js";
export { parsePreviewFixtureManifest, PREVIEW_FIXTURE_MANIFEST_FILE, PREVIEW_FIXTURE_MANIFEST_VERSION, } from "../fixture-manifest.js";
function bootReadyGate() {
    return globalThis.__DSH_BOOT_READY__ ??= Promise.withResolvers();
}
/**
 * Install the page boot barrier before an asynchronous source chooser waits
 * for user input. The later {@link connectWorkerHost} call settles the same
 * barrier.
 */
function holdWorkerHostBoot() {
    const ready = bootReadyGate();
    // A chooser may remain open indefinitely; if a later connection fails before
    // the stock entry subscribes, retain the rejection without browser noise.
    void ready.promise.catch(() => { });
}
/**
 * Run the optional pre-boot source-selection stage. Calling this stage holds
 * the stock shell until the caller passes its result to {@link connectWorkerHost};
 * callers that need no chooser call `connectWorkerHost` directly and receive
 * the base image with an empty overlay list.
 * @param options - Base image and optional fixture-catalog locations.
 * @returns The ordered overlays selected by the user.
 */
export async function chooseWorkerHostSource(options = {}) {
    holdWorkerHostBoot();
    const image = new URL(options.image ?? IMAGE_FILE_NAME, document.baseURI);
    const manifest = new URL(options.fixtureManifest ?? PREVIEW_FIXTURE_MANIFEST_FILE, image);
    try {
        const overlays = await choosePreviewSource(manifest);
        return { overlays };
    }
    catch (reason) {
        bootReadyGate().reject(reason);
        throw reason;
    }
}
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
export async function connectWorkerHost(worker, options) {
    const ready = bootReadyGate();
    // The handshake may fail before any entry awaits the promise; this no-op
    // subscription keeps that from surfacing as an unhandled rejection.
    void ready.promise.catch(() => { });
    try {
        const tunnel = new WorkerTunnel(worker);
        tunnel.init(new URL(options?.image ?? IMAGE_FILE_NAME, document.baseURI).href, (options?.overlays ?? []).map(overlay => new URL(overlay, document.baseURI).href));
        const payload = await tunnel.bootPayload();
        globalThis.__DSH_TRANSPORT__ = {
            fetch: (input, init) => tunnel.fetch(input, init),
            openStream: (endpoint, payload, signal) => tunnel.open(endpoint, payload, signal),
            loadBundle: (url) => tunnel.loadBundle(url),
            // The host lives in a worker this page spawned: the page owns it, so
            // the privileged surface stays reachable off loopback authorities.
            ownsHost: true,
        };
        await applyIndexInjections(payload.injections, src => tunnel.loadBundle(src));
        ready.resolve();
        return { worker, tunnel, loadBundle: (url) => tunnel.loadBundle(url) };
    }
    catch (reason) {
        ready.reject(reason);
        throw reason;
    }
}
//# sourceMappingURL=index.js.map