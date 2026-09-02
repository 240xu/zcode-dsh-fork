/** Same clock object the worker global exposes. */
export declare const performance: Performance;
/** Observation of performance entries has no consumer here. */
export declare const PerformanceObserver: typeof import('node:perf_hooks').PerformanceObserver;
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ./builtins.ts). */
export declare const __esModule = true;
/** CommonJS default export: the members `require()` hands a caller of this module. */
declare const _default: {
    performance: Performance;
    PerformanceObserver: typeof import("perf_hooks").PerformanceObserver;
};
export default _default;
//# sourceMappingURL=perf_hooks.d.ts.map