/** Explicit Client debugger capability until a pause-safe page agent exists. */
import type { DebuggerBackend, RealmCapability } from '../../../shared/cdp/realm.ts';
/**
 * Report the unavailable Client debugger backend.
 * @returns The typed unsupported result used by every Client realm session.
 */
export declare function clientDebuggerCapability(): RealmCapability<DebuggerBackend>;
//# sourceMappingURL=debugger.d.ts.map