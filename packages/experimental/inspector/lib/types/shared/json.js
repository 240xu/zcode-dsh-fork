/** JSON values admitted by every Inspector cross-realm message. */
/**
 * Test that a value can cross both MessagePort and JSON WebSocket carriers without coercion.
 * @param value - Candidate wire value.
 * @returns Whether the value is lossless JSON data.
 */
export function isJsonValue(value) {
    return visitJson(value, new Set());
}
/**
 * Require a plain JSON object and return it with a narrowed type.
 * @param value - Candidate wire value.
 * @param label - Field name used in validation errors.
 * @returns The validated JSON object.
 */
export function requireJsonObject(value, label) {
    if (!isPlainObject(value) || !isJsonValue(value)) {
        throw new Error(`inspector protocol: ${label} must be a JSON object`);
    }
    return value;
}
/**
 * Compute the UTF-8 byte length of a JSON wire value.
 * @param value - Validated JSON value.
 * @returns Its encoded byte length.
 */
export function jsonByteLength(value) {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}
/**
 * Test whether a value is a plain object with string own keys.
 * @param value - Candidate object.
 * @returns Whether the value has `Object.prototype` or a null prototype.
 */
export function isPlainObject(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        return false;
    const prototype = Reflect.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}
function visitJson(value, ancestors) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean')
        return true;
    if (typeof value === 'number')
        return Number.isFinite(value) && !Object.is(value, -0);
    if (typeof value !== 'object' || ancestors.has(value))
        return false;
    ancestors.add(value);
    try {
        if (Array.isArray(value)) {
            if (Object.getPrototypeOf(value) !== Array.prototype || Reflect.ownKeys(value).length !== value.length + 1)
                return false;
            return value.every(item => visitJson(item, ancestors));
        }
        if (!isPlainObject(value))
            return false;
        for (const key of Reflect.ownKeys(value)) {
            if (typeof key !== 'string')
                return false;
            const descriptor = Object.getOwnPropertyDescriptor(value, key);
            if (descriptor?.enumerable !== true || !('value' in descriptor) || !visitJson(descriptor.value, ancestors))
                return false;
        }
        return true;
    }
    finally {
        ancestors.delete(value);
    }
}
//# sourceMappingURL=json.js.map