import { readCardModel } from "../models/read-card-model.js";
import { readFamilyRow } from "./read-family-row.js";
import { CONVERSATION_NS as NS } from "../../locale.js";
/**
 * Lets users expand a completed read result and open its reported path.
 */
export function ReadRow(props) {
    const { block, cwd, home } = props;
    return readFamilyRow(props, { read: readCardModel(block, cwd, home) });
}
/** Registers the read tool's conversation row. */
export const readToolview = {
    name: 'read-toolview',
    inject: ['slots'],
    apply(ctx) {
        ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({ name: 'tool.call.toolview', key: 'read', locale: NS }, ReadRow));
    },
};
//# sourceMappingURL=read-row.js.map