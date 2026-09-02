/** Client Cordis plugin that publishes browser observations directly to the Inspector Worker. */
import { parseInspectorClientBootstrap } from "../shared/bridge/control-codec.js";
import { createInspectorService } from "../shared/service.js";
import { publishCordisTree } from "./inspection/cordis.js";
import { startInspectorClient } from "./bridge/controller.js";
/** Cordis plugin name shared with the Host face. */
export const name = 'experimental-inspector';
/** This transport root has no Client service dependencies. */
export const inject = [];
/**
 * Mount the Client source and shared `ctx.inspector` publishing API.
 * @param ctx - Client Cordis context whose page identity and lifecycle own the source.
 */
export async function apply(ctx) {
    const injected = globalThis.__DSH_INSPECTOR__;
    if (injected === undefined) {
        throw new Error('experimental inspector: Host bootstrap is missing');
    }
    const bootstrap = parseInspectorClientBootstrap(injected);
    await ctx.effect(async () => {
        const source = await startInspectorClient(bootstrap);
        const disposers = [];
        try {
            disposers.push(publishCordisTree(ctx, source, {
                maxNodes: bootstrap.maxCordisNodes,
                maxBytes: bootstrap.maxFrameBytes - 4_096,
            }));
            disposers.push(ctx.provide('inspector', createInspectorService(source)));
        }
        catch (error) {
            try {
                disposeInspectorClient(source, disposers);
            }
            catch (cleanupError) {
                ctx.logger.error('experimental-inspector: Client initialization rollback failed', cleanupError);
            }
            throw error;
        }
        return () => { disposeInspectorClient(source, disposers); };
    }, 'experimental-inspector: Client source');
}
function disposeInspectorClient(source, disposers) {
    const failures = [];
    for (const dispose of [...disposers].reverse()) {
        try {
            dispose();
        }
        catch (error) {
            failures.push(error);
        }
    }
    try {
        source.close();
    }
    catch (error) {
        failures.push(error);
    }
    if (failures.length > 0)
        throw new AggregateError(failures, 'experimental-inspector: Client disposal failed');
}
//# sourceMappingURL=plugin.js.map