import { SettingsSchemaService } from "./schema.js";
import { SettingsScopeBinder } from "./settings-scope.js";
import { SettingsDescribeMirror } from "./settings-mirror.js";
/**
 * Required services: the Remote namespace the mirror reads through and the
 * forwarded settings invalidation it refreshes on.
 */
export const inject = ['remote', 'remote.settings'];
/**
 * Provide the settings-namespace scope service over one shared describe
 * mirror, and keep that mirror fresh on the two signals that can move the
 * settings document: a document commit and a (re)connect.
 *
 * Constructing the service in this plugin's fiber keeps its traced methods
 * bound to each consuming plugin's context.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    const schema = new SettingsSchemaService(ctx);
    // Resolved once here, where `remote` is declared in this plugin's own
    // `inject`; the binder hands the same answer to every scope it binds.
    const persistence = ctx.remote.$host.isLoopback ? 'host' : 'memory';
    const mirror = new SettingsDescribeMirror(ctx, persistence);
    ctx.effect(() => {
        const disposers = [
            ctx.remote.$on('settings/document-updated', () => { void mirror.load(); }),
            ctx.on('connection/reset', () => { void mirror.load(); }),
        ];
        // The first connection also emits connection/reset, so startup normally
        // costs two reads (budgeted in startup-rpc-budget.e2e.ts). The in-flight
        // fold does not merge them into one; it guarantees at most one pending
        // read at a time and that no invalidation arriving mid-read is lost.
        void mirror.ensure();
        return () => { for (const dispose of disposers)
            dispose(); };
    }, 'ui-settings: describe mirror invalidations');
    new SettingsScopeBinder(ctx, { mirror, schema, persistence });
}
//# sourceMappingURL=index.js.map