/** Exact wire decoder for Client Runtime commands. */
import type { ClientRuntimeCommand } from './commands.ts';
/**
 * Parse and rebuild one Runtime command before it enters the Client realm.
 * @param value - Untrusted command value.
 * @returns The validated command union member.
 */
export declare function parseClientRuntimeCommand(value: unknown): ClientRuntimeCommand;
//# sourceMappingURL=command-codec.d.ts.map