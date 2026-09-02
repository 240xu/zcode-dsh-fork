import { OfficialBrandMark, OfficialBrandName } from "./Brand.js";
/** Required service: the UI slot registry. */
export const inject = ['slots'];
/**
 * Fill the sidebar brand slots as one declaration-aware registration set. The
 * conversation hero stays on its declaring package's animated fish fallback,
 * so the official build registers nothing there.
 * @param ctx - Client root context.
 */
export function apply(ctx) {
    if (process.env.DSH_CLIENT_BUILD_PROFILE !== 'official')
        return;
    ctx.slots.inject('sidebar.brand.mark', () => ctx.slots.inject('sidebar.brand.name', function* () {
        yield ctx.slots.register({ name: 'sidebar.brand.mark' }, OfficialBrandMark);
        yield ctx.slots.register({ name: 'sidebar.brand.name' }, OfficialBrandName);
    }));
}
//# sourceMappingURL=index.js.map