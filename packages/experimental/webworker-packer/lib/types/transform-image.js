/**
 * The wrapper contract packed bodies are emitted against, and the image-entry
 * types the pack pass consumes.
 *
 * One transform serves both sides — the pack pass lowers with the runtime's
 * own `lowerModuleSource`, never a reimplementation — and the image records
 * the contract version it was lowered against. Bodies emitted against a
 * different wrapper contract are refused at mount time rather than
 * half-working at run time.
 * @module @deepseek-ai/dsh-experimental-webworker-packer/src/transform-image
 */
import { LOWERING_VERSION } from '@deepseek-ai/dsh-experimental-webworker-runtime';
/** Wrapper contract the packed bodies are emitted against. */
export const WRAPPER_CONTRACT = LOWERING_VERSION;
//# sourceMappingURL=transform-image.js.map