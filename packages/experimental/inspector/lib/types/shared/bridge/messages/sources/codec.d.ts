/** Exact decoders for Client source catalog operations and values. */
import type { ClientSourceCommand, ClientSourceResult } from './commands.ts';
/**
 * Parse one Worker-to-Client source command.
 * @param value - Untrusted decoded command.
 * @returns The validated command.
 */
export declare function parseClientSourceCommand(value: unknown): ClientSourceCommand;
/**
 * Parse one successful Client source result.
 * @param value - Untrusted decoded result.
 * @returns The validated result.
 */
export declare function parseClientSourceResult(value: unknown): ClientSourceResult;
//# sourceMappingURL=codec.d.ts.map