/** Host Cordis plugin for the cross-realm Inspector Worker and full fetch capture. */
import { resolveInspectorOptions, startInspector } from "./bridge/controller.js";
import { createInspectorService } from "../shared/service.js";
import { publishCordisTree } from "./inspection/cordis.js";
export { resolveInspectorOptions, startInspector } from "./bridge/controller.js";
/** Start the Worker, expose `ctx.inspector`, and inject the matching Client bootstrap. */
export async function apply(ctx, config) {
    await ctx.effect(async () => {
        const spec = resolveInspectorOptions(config);
        const handle = await startInspector(spec);
        const disposers = [];
        try {
            disposers.push(publishCordisTree(ctx, handle.source, {
                maxNodes: spec.maxCordisNodes,
                maxBytes: spec.maxSourceFrameBytes - 4_096,
            }));
            disposers.push(ctx.provide('inspector', createInspectorService(handle.source)));
            disposers.push(ctx.on('webserver/index-inject', (table) => {
                table.push({ kind: 'global', name: '__DSH_INSPECTOR__', value: handle.endpoint.client });
            }));
            // This readiness URL is emitted while the plugin tree is still loading, before a logger sink is guaranteed.
            console.log(`dsh inspector: ${handle.endpoint.devtoolsFrontendUrl}`);
        }
        catch (error) {
            await disposeInspector(handle, disposers).catch((cleanupError) => {
                ctx.logger.error('experimental-inspector: initialization rollback failed', cleanupError);
            });
            throw error;
        }
        return async () => { await disposeInspector(handle, disposers); };
    }, 'experimental-inspector: Host Worker');
}
async function disposeInspector(handle, disposers) {
    const failures = [];
    for (const dispose of [...disposers].reverse()) {
        try {
            await dispose();
        }
        catch (error) {
            failures.push(error);
        }
    }
    try {
        await handle.close();
    }
    catch (error) {
        failures.push(error);
    }
    if (failures.length > 0)
        throw new AggregateError(failures, 'experimental-inspector: disposal failed');
}
//# sourceMappingURL=plugin.js.map