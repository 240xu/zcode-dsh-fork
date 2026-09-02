/** Browser entry binding the generated Team Remote artifact to its Client UI. */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
export { inject } from './mount.ts';
export type { TeamActionInjected, TeamActionProps, TeamActionResult } from './TeamAction.tsx';
export type { TeamKey } from './locales.ts';
/** Mount the generated Team Remote contribution and its browser UI. */
export declare function apply(ctx: ClientContext): Promise<() => Promise<void>>;
//# sourceMappingURL=index.d.ts.map