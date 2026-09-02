/** Browser stack parsing for realm-neutral Runtime and Console events. */
import type { RuntimeScriptKey } from '../../shared/cdp/ids.ts';
import type { RuntimeStackTrace } from '../../shared/cdp/index.ts';
/** Resolve a browser stack-frame URL to a Client catalog script key. */
export type ClientScriptKeyResolver = (url: string) => RuntimeScriptKey | undefined;
/**
 * Capture the caller stack of a wrapped Client Console method.
 * @param resolveScript - Resolver for Client catalog script keys.
 * @returns Parsed call frames when the browser supplies a stack.
 */
export declare function captureClientConsoleStack(resolveScript: ClientScriptKeyResolver): RuntimeStackTrace | undefined;
/**
 * Parse the stack attached to an uncaught Client value when available.
 * @param value - Thrown or rejected value.
 * @param resolveScript - Resolver for Client catalog script keys.
 * @returns Parsed call frames when the value has a recognized stack string.
 */
export declare function clientErrorStack(value: unknown, resolveScript?: ClientScriptKeyResolver): RuntimeStackTrace | undefined;
/**
 * Parse V8- and Firefox-style textual frames into the common stack model.
 * @param stack - Browser stack text.
 * @param resolveScript - Resolver for Client catalog script keys.
 * @param skipFrames - Parsed observer frames omitted from the result.
 * @returns Parsed call frames, or `undefined` when none remain.
 */
export declare function parseClientStack(stack: string | undefined, resolveScript: ClientScriptKeyResolver, skipFrames: number): RuntimeStackTrace | undefined;
//# sourceMappingURL=stack.d.ts.map