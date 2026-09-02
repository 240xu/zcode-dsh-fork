/** Opaque identifiers owned by one Worker-side Chrome DevTools connection. */
/**
 * Validate and brand a string id allocated or accepted by the CDP adapter.
 * @param value - CDP identifier text.
 * @param label - Field named in validation failures.
 * @returns The branded CDP identifier.
 */
export function cdpStringId(value, label) {
    if (value.length === 0 || value.length > 16_384) {
        throw new Error(`inspector CDP: ${label} must contain 1 to 16384 characters`);
    }
    return value;
}
/**
 * Validate and brand a positive numeric id allocated by the CDP adapter.
 * @param value - CDP identifier number.
 * @param label - Field named in validation failures.
 * @returns The branded numeric identifier.
 */
export function cdpNumericId(value, label) {
    if (!Number.isSafeInteger(value) || value < 1)
        throw new Error(`inspector CDP: ${label} must be a positive integer`);
    return value;
}
//# sourceMappingURL=ids.js.map