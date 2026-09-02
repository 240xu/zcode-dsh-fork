/** One module the collector considered. */
export interface LoweredModule {
    /** Transformed body, or the input unchanged when nothing needed lowering. */
    readonly code: string;
    /** False means the entry may be packed as it is. */
    readonly lowered: boolean;
    /**
     * Static module requests the body makes: import and re-export sources,
     * literal dynamic imports and calls through `require`, plus module-scope
     * direct literal calls through an imported `createRequire(import.meta.url)`.
     * Computed and rebased requests resolve (and fail loud) at runtime only.
     */
    readonly moduleRequests: readonly string[];
    /**
     * Literal `import.meta.resolve()` requests. These are URL mappings, not
     * loads: the pack sweep keeps a resolvable target and tolerates a missing
     * one, and the loader answers or throws at the call site.
     */
    readonly metaResolveRequests: readonly string[];
}
/**
 * Lower one module at image-pack time.
 *
 * The collector calls this for every JavaScript entry it packs and records
 * `LOWERING_VERSION` in the image manifest; the loader then wraps those entries
 * without parsing them. `lowered: false` reports that the transform would have
 * returned the input verbatim (already CommonJS, no suspension point), so the
 * entry may be packed as it is.
 *
 * Throwing is the intended failure mode: a module this transform cannot express
 * must fail the build rather than ship an image that breaks at load.
 * @param options - Virtual path inside the image and the module source.
 * @returns The code to pack and whether it changed.
 */
export declare function lowerModuleSource(options: {
    readonly filename: string;
    readonly source: string;
}): LoweredModule;
//# sourceMappingURL=transform.d.ts.map