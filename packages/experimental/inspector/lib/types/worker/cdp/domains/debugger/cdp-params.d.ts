/** Validation for CDP Debugger requests handled by the shared domain. */
import type { RuntimeCallFrameEvaluationRequest } from '../../../../shared/cdp/index.ts';
/**
 * Parse Debugger.evaluateOnCallFrame without silently accepting unsupported options.
 * @param params - Untrusted CDP parameters.
 * @returns The common call-frame evaluation request.
 */
export declare function parseCallFrameEvaluation(params: Readonly<Record<string, unknown>>): RuntimeCallFrameEvaluationRequest;
/**
 * Find a ScriptId carried directly or by a Debugger location parameter.
 * @param params - Parsed CDP parameter record.
 * @returns The targeted script id when the request names one.
 */
export declare function requestScriptId(params: Readonly<Record<string, unknown>>): string | undefined;
//# sourceMappingURL=cdp-params.d.ts.map