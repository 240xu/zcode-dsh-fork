/** Client Runtime failures that belong to the transport rather than evaluated JavaScript. */
/** Failure returned through the typed Client Runtime error outcome. */
export class ClientRuntimeExecutionError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
//# sourceMappingURL=errors.js.map