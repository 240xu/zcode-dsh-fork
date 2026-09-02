/** Image entries, keyed by their path relative to the virtual root. */
export type ImageFiles = Record<string, Uint8Array>;
/** Wrapper contract the packed bodies are emitted against. */
export declare const WRAPPER_CONTRACT: string;
/** What one pack-time transform pass did. */
export interface TransformOutcome {
    /** JavaScript entries visited. */
    readonly visited: number;
    /** How many changed; the rest were already in final form. */
    readonly rewritten: number;
}
//# sourceMappingURL=transform-image.d.ts.map