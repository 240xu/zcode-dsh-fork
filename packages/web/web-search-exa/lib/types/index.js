/**
 * Exa-backed `WebSearchProvider` plugin. It contributes to the `ctx.web`
 * registry without owning the service.
 *
 * @module @deepseek-ai/dsh-web-search-exa
 */
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment';
import z from '@deepseek-ai/schemastery';
import { ExaSearchProvider, EXA_DEFAULT_BASE_URL, EXA_DEFAULT_HIGHLIGHTS_PER_RESULT, EXA_DEFAULT_SEARCH_TYPE, } from "./provider.js";
export { EXA_DEFAULT_BASE_URL, EXA_DEFAULT_HIGHLIGHTS_PER_RESULT, EXA_DEFAULT_SEARCH_TYPE, EXA_PROVIDER_ID, ExaSearchProvider, } from "./provider.js";
/** Cordis plugin name used by loader diagnostics. */
export const name = 'web-search-exa';
/** The web seam this provider registers into. */
export const inject = ['web'];
export const Config = z.object({
    apiKey: z.string(),
    baseURL: z.string(),
    searchType: z.union(['auto', 'keyword', 'neural']),
    numResults: z.number().step(1).min(1),
    highlightsPerResult: z.number().step(1).min(1),
});
/** Register the Exa search provider with `ctx.web`. */
export function apply(ctx, config) {
    ctx.web.registerSearchProvider(new ExaSearchProvider({
        // Every environment layer may name this key: the product trusts the
        // project it is launched in, and the managed store is not involved here.
        apiKey: config.apiKey ?? launchEnvironmentOf(ctx).get('EXA_API_KEY')?.value ?? '',
        baseURL: config.baseURL ?? EXA_DEFAULT_BASE_URL,
        searchType: config.searchType ?? EXA_DEFAULT_SEARCH_TYPE,
        highlightsPerResult: config.highlightsPerResult ?? EXA_DEFAULT_HIGHLIGHTS_PER_RESULT,
        ...config.numResults !== undefined ? { numResults: config.numResults } : {},
    }));
}
//# sourceMappingURL=index.js.map