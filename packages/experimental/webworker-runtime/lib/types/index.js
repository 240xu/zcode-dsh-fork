/**
 * Browser-only host runtime: the harness Cordis tree inside a dedicated Web Worker.
 * @module @deepseek-ai/dsh-experimental-webworker-runtime
 */
export { createAlsRuntime, } from "./polyfill/async-context/als-runtime.js";
export { parseInboundFrame, } from "./transport/frames.js";
export { DEFAULT_CONDITIONS, requireActiveModuleLoader, setActiveModuleLoader, WorkerModuleLoader, } from "./module-system/module-loader.js";
export * as posixPath from "./module-system/posix-path.js";
export { createSyntheticExchange, } from "./transport/synthetic-http.js";
export { lowerModuleSource } from "./compile/transform.js";
export { API_PREFIX, SYNTHETIC_HOST, TunnelServer, } from "./transport/tunnel.js";
export { installProcessGlobal } from "./node/globals/process.js";
export { createWorkerHost, } from "./worker-host.js";
export { DEFAULT_ROOT, IMAGE_CONFIG_PATH, IMAGE_EMPTY_DIRECTORIES, IMAGE_FILE_NAME, IMAGE_HOME_DIRECTORY, IMAGE_MANIFEST_PATH, IMAGE_OVERLAY_DIRECTORIES, LOWERING_VERSION, WRAPPER_PARAMS, } from "./image-layout.js";
export { parsePreviewFixtureManifest, PREVIEW_FIXTURE_MANIFEST_FILE, PREVIEW_FIXTURE_MANIFEST_VERSION, } from "./fixture-manifest.js";
export { loadVfsImage, loadVfsOverlay, MemoryVfs } from "./storage/memory.js";
export { inflateImage, inflateImageStream } from "./storage/image-gzip.js";
export { packTar, parseTar } from "./storage/tar.js";
export { requireActiveVfs, setActiveVfs } from "./storage/active.js";
//# sourceMappingURL=index.js.map