/** Shared branded-identifier construction without assigning protocol ownership. */
/**
 * Validate and brand a non-empty identifier received from or sent across a runtime boundary.
 * @param value - Untrusted identifier text.
 * @param label - Field name used in validation errors.
 * @returns The role-branded identifier.
 */
export function inspectorId(value, label) {
    if (value.length === 0 || value.length > 256) {
        throw new Error(`inspector protocol: ${label} must contain 1 to 256 characters`);
    }
    return value;
}
//# sourceMappingURL=identity.js.map