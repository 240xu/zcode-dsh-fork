/** Client Runtime failures that belong to the transport rather than evaluated JavaScript. */
import type { ClientRuntimeError } from '../../shared/bridge/messages/runtime/index.ts';
/** Failure returned through the typed Client Runtime error outcome. */
export declare class ClientRuntimeExecutionError extends Error {
    readonly code: ClientRuntimeError['code'];
    constructor(code: ClientRuntimeError['code'], message: string);
}
//# sourceMappingURL=errors.d.ts.map