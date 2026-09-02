import { ComposerAttachments } from "./ComposerAttachments.js";
import { MessageImages } from "./MessageImages.js";
/** Slot registry required by this presentation plugin. */
export const inject = ['slots'];
/** Register attachment presentation without exporting React components as package values. */
export function apply(ctx) {
    ctx.slots.inject('conversation.input.attachments', () => ctx.slots.register({
        name: 'conversation.input.attachments',
        locale: 'conversation',
    }, ComposerAttachments));
    ctx.slots.inject('conversation.message.images', () => ctx.slots.register({
        name: 'conversation.message.images',
        locale: 'conversation',
    }, MessageImages));
    ctx.slots.inject('conversation.trajectory.images', () => ctx.slots.register({
        name: 'conversation.trajectory.images',
        locale: 'conversation',
    }, MessageImages));
    // The tool image gallery reuses the message gallery renderer: its owner
    // carries the same images/loadImage/align share the message arm does.
    ctx.slots.inject('tool.call.images', () => ctx.slots.register({
        name: 'tool.call.images',
        locale: 'conversation',
    }, MessageImages));
}
//# sourceMappingURL=index.js.map