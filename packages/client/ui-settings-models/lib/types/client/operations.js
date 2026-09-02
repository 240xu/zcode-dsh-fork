/**
 * The Host reads and writes the Models cards perform, as callbacks built in the
 * plugin body. Cards receive these instead of a context: the outcomes name what
 * a card renders — a stored view, a stale revision, a refusal message — so the
 * failure codes and Remote namespaces stay in the apply world.
 */
/**
 * Bind the page's Host operations to the plugin's own Remote namespaces.
 * @param ctx - the page plugin's context, which declares `remote.credentials`,
 * `remote.llm`, and `remote.settings` in its own `inject`.
 * @returns the callbacks the section and its cards are injected with.
 */
export function createModelsOperations(ctx) {
    return {
        describeCredential: async (ref) => {
            const response = await ctx.remote.credentials.describe([ref]);
            return response.ok ? response.value[ref] : undefined;
        },
        storeCredential: async (ref, value) => {
            const response = await ctx.remote.credentials.set(ref, value);
            return response.ok ? undefined : response.error.message;
        },
        removeCredential: async (ref) => {
            const response = await ctx.remote.credentials.unset(ref);
            return response.ok ? undefined : response.error.message;
        },
        writeSettings: async (ns, ops, expectedRevision) => {
            const response = await ctx.remote.settings.mutate(ns, ops, expectedRevision);
            if (response.ok)
                return { kind: 'written', view: response.value };
            const { code, message } = response.error;
            return code === 'settings/conflict' ? { kind: 'conflict', message } : { kind: 'refused', message };
        },
        discoverModels: async (settingsNs, request) => {
            const response = await ctx.remote.llm.discoverModels(settingsNs, request);
            return response.ok
                ? { kind: 'found', models: response.value }
                : { kind: 'refused', message: response.error.message };
        },
    };
}
//# sourceMappingURL=operations.js.map