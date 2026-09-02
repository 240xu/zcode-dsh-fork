/** Minimal page-target CDP methods required to expose Network, Console, and Sources together. */
import type { CdpRequest } from './protocol.ts';
/** Sentinel distinguishing an unowned method from an owned method returning undefined. */
export declare const CDP_METHOD_NOT_HANDLED: unique symbol;
/** Page-target identity used by discovery and scaffold responses. */
export interface CdpTargetDescriptor {
    readonly targetId: string;
    readonly title: string;
}
/**
 * Handle one Worker-local identity or page scaffold method.
 * @param request - Parsed CDP request.
 * @param target - Synthetic page-target identity.
 * @returns A response result or the unowned-method sentinel.
 */
export declare function handleScaffold(request: CdpRequest, target: CdpTargetDescriptor): object | typeof CDP_METHOD_NOT_HANDLED;
//# sourceMappingURL=target.d.ts.map