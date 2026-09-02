/**
 * `node:perf_hooks`: the worker's own high-resolution clock.
 */
import { notImplementedFail } from "../../notImplementedFail.js";
const MODULE = 'node:perf_hooks';
/** Same clock object the worker global exposes. */
export const performance = globalThis.performance;
/** Observation of performance entries has no consumer here. */
export const PerformanceObserver = notImplementedFail(MODULE, 'PerformanceObserver');
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ./builtins.ts). */
export const __esModule = true;
/** CommonJS default export: the members `require()` hands a caller of this module. */
export default { performance, PerformanceObserver };
//# sourceMappingURL=perf_hooks.js.map