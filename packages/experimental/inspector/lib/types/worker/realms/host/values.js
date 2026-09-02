/** Small validators for values returned by Node's native Inspector protocol. */
/**
 * Test whether a native protocol value is a non-array object record.
 * @param value - Native protocol value.
 * @returns Whether the value can be read as named fields.
 */
export function isNativeRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/**
 * Require a native protocol object record.
 * @param value - Native protocol value.
 * @param label - Subject named in the validation error.
 * @returns The validated object record.
 */
export function requireNativeRecord(value, label) {
    if (!isNativeRecord(value))
        throw new Error(`${label} must be an object`);
    return value;
}
/**
 * Include an optional field only when the native request supplied a value.
 * @param key - Native protocol field name.
 * @param value - Optional field value.
 * @returns An empty record or the requested field.
 */
export function optionalNativeField(key, value) {
    return value === undefined ? {} : { [key]: value };
}
//# sourceMappingURL=values.js.map