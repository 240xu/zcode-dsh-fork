/**
 * `node:dns/promises` stub. The static WebWorker preview has no DNS resolver;
 * reaching public-address preflight must fail loud instead of inventing an
 * address or bypassing the native HTTP provider's SSRF policy.
 */
import { notImplementedFail } from "../../../notImplementedFail.js";
const MODULE = 'node:dns/promises';
/** DNS lookup (unavailable in the worker host). */
export const lookup = notImplementedFail(MODULE, 'lookup');
/** CommonJS interop marker: the worker loader hands `default` to default imports. */
export const __esModule = true;
/** CommonJS default export: the members `require()` hands a caller of this module. */
export default { lookup };
//# sourceMappingURL=promises.js.map