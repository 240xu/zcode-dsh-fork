/**
 * `node:vm` stub. Script compilation in a separate realm has no browser
 * counterpart; the self-modification and workflow rows mount and report the gap
 * when they try to compile.
 */
import { notImplementedFail } from "../../notImplementedFail.js";
const MODULE = 'node:vm';
/** Compiled script (unavailable). */
export const Script = notImplementedFail(MODULE, 'Script');
/** Context creation (unavailable). */
export const createContext = notImplementedFail(MODULE, 'createContext');
/** In-context evaluation (unavailable). */
export const runInContext = notImplementedFail(MODULE, 'runInContext');
/** New-context evaluation (unavailable). */
export const runInNewContext = notImplementedFail(MODULE, 'runInNewContext');
/** This-context evaluation (unavailable). */
export const runInThisContext = notImplementedFail(MODULE, 'runInThisContext');
/** Context predicate (unavailable). */
export const isContext = notImplementedFail(MODULE, 'isContext');
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ./builtins.ts). */
export const __esModule = true;
/** CommonJS default export: the members `require()` hands a caller of this module. */
export default {
    Script, createContext, runInContext, runInNewContext, runInThisContext, isContext,
};
//# sourceMappingURL=vm.js.map