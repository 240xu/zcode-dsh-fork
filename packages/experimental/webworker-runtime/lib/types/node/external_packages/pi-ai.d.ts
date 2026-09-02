/** Provider factory (unavailable). */
export declare const createProvider: (...args: never[]) => never;
/** Model-list factory (unavailable). */
export declare const createModels: (...args: never[]) => never;
/** Thinking-level catalog (unavailable). */
export declare const getSupportedThinkingLevels: (...args: never[]) => never;
/** Context-overflow predicate (unavailable). */
export declare const isContextOverflow: (...args: never[]) => never;
/**
 * Installed catalog providers, read while `llm-pi-ai` activates. Each carries the
 * api-key auth marker the adapter filters on, and no models: the provider
 * directory therefore matches the served deployment while every request path
 * lands on a loud symbol above.
 * @returns one entry per builtin provider.
 */
export declare function builtinProviders(): unknown[];
/**
 * Provider route ids of the installed catalog. `llm-pi-ai` registers the whole
 * catalog as configurable the moment it mounts and rejects an empty
 * registration, so these are pi-ai's real ids rather than an empty list.
 * @returns the builtin provider ids.
 */
export declare function getBuiltinProviders(): string[];
/**
 * Models of one installed catalog provider.
 * @returns no models.
 */
export declare function getBuiltinModels(): unknown[];
/** Anthropic messages API binding (unavailable). */
export declare const anthropicMessagesApi: (...args: never[]) => never;
/** OpenAI completions API binding (unavailable). */
export declare const openAICompletionsApi: (...args: never[]) => never;
/** OpenAI responses API binding (unavailable). */
export declare const openAIResponsesApi: (...args: never[]) => never;
/** CommonJS interop marker: the worker loader hands `default` to default imports. */
export declare const __esModule = true;
/** CommonJS default export: the members `require()` hands a caller of this module. */
declare const _default: {
    createProvider: (...args: never[]) => never;
    createModels: (...args: never[]) => never;
    getSupportedThinkingLevels: (...args: never[]) => never;
    isContextOverflow: (...args: never[]) => never;
    builtinProviders: typeof builtinProviders;
    getBuiltinModels: typeof getBuiltinModels;
    getBuiltinProviders: typeof getBuiltinProviders;
    anthropicMessagesApi: (...args: never[]) => never;
    openAICompletionsApi: (...args: never[]) => never;
    openAIResponsesApi: (...args: never[]) => never;
};
export default _default;
//# sourceMappingURL=pi-ai.d.ts.map