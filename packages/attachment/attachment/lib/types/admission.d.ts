/** Wire-form admission of base64-encoded image uploads. @module @deepseek-ai/dsh-attachment/admission */
import type { AttachmentStore } from './index.ts';
import type { AdmittedPromptContentPart, EncodedImageAttachment, ImageAttachmentRef, PromptContentPart } from './types.ts';
/**
 * Admit one wire image batch: enforce canonical base64 on every member, then
 * delegate batch admission — count and aggregate-byte limits, media-type and
 * per-image validation, ordered commit — to {@link AttachmentStore.saveImages}.
 * The shared entry for every RPC endpoint accepting browser uploads.
 * @param attachments - the deployment attachment store owning batch policy.
 * @param images - base64-encoded uploads in caller order.
 * @returns durable references in the same order as `images`.
 * @throws AttachmentError on a non-canonical payload or a refused batch.
 */
export declare function admitEncodedImages(attachments: AttachmentStore, images: readonly EncodedImageAttachment[]): Promise<readonly ImageAttachmentRef[]>;
/**
 * Admit one browser prompt and replace each uploaded image with its durable reference.
 * Text-only prompts do not access the attachment store.
 * @param attachments - the deployment attachment store owning batch policy.
 * @param content - browser prompt parts in message order.
 * @returns admitted prompt parts in the same order as `content`.
 * @throws AttachmentError when the image batch is refused.
 */
export declare function admitPromptContent(attachments: AttachmentStore, content: readonly PromptContentPart[]): Promise<AdmittedPromptContentPart[]>;
//# sourceMappingURL=admission.d.ts.map