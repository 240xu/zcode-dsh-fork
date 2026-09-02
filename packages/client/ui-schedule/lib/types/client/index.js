/** Browser half of the read-only Schedule catalog. */
import { ScheduleCatalogAction } from "./ScheduleCatalogAction.js";
import { en, NS, zh } from "./locales.js";
/** Required services for locale registration and header-slot contribution. */
export const inject = ['slots', 'locale'];
/** Register the dictionaries and Session-header catalog action. */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-schedule: dictionaries');
    ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
        name: 'conversation.session.header.actions',
        id: 'schedule-catalog',
        // Static Session identity precedes this entry; background jobs follow it.
        order: 10,
        locale: NS,
    }, ScheduleCatalogAction));
}
//# sourceMappingURL=index.js.map