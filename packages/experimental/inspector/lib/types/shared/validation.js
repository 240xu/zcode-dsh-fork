/** Shared exact-object readers for versioned Inspector wire protocols. */
import { inspectorId } from "./identity.js";
import { isPlainObject } from "./json.js";
/**
 * Require a plain object containing only the listed fields.
 * @param value - Candidate object.
 * @param keys - Complete field allowlist.
 * @param label - Object name used in validation errors.
 * @returns The validated plain object.
 */
export function exactObject(value, keys, label) {
    if (!isPlainObject(value))
        throw new Error(`inspector protocol: ${label} must be an object`);
    exactKeys(value, keys, label);
    return value;
}
/**
 * Reject fields outside one versioned object's declared field set.
 * @param value - Plain object being validated.
 * @param keys - Complete field allowlist.
 * @param label - Object name used in validation errors.
 */
export function exactKeys(value, keys, label) {
    const allowed = new Set(keys);
    for (const key of Reflect.ownKeys(value)) {
        if (typeof key !== 'string' || !allowed.has(key)) {
            throw new Error(`inspector protocol: ${label} has unknown field ${JSON.stringify(String(key))}`);
        }
    }
}
/**
 * Read one non-empty opaque identifier.
 * @param value - Candidate identifier.
 * @param label - Field name used in validation errors.
 * @returns The role-branded identifier.
 */
export function wireId(value, label) {
    if (typeof value !== 'string')
        throw new Error(`inspector protocol: ${label} must be a string`);
    return inspectorId(value, label);
}
/**
 * Read one optional string field.
 * @param value - Object containing the field.
 * @param key - Field name.
 * @returns An empty object or the validated field.
 */
export function optionalString(value, key) {
    const item = value[key];
    if (item === undefined)
        return {};
    if (typeof item !== 'string')
        throw new Error(`inspector protocol: ${key} must be a string`);
    return { [key]: item };
}
/**
 * Read one optional boolean field.
 * @param value - Object containing the field.
 * @param key - Field name.
 * @returns An empty object or the validated field.
 */
export function optionalBoolean(value, key) {
    const item = value[key];
    if (item === undefined)
        return {};
    if (typeof item !== 'boolean')
        throw new Error(`inspector protocol: ${key} must be a boolean`);
    return { [key]: item };
}
/**
 * Read one optional non-negative finite number field.
 * @param value - Object containing the field.
 * @param key - Field name.
 * @returns An empty object or the validated field.
 */
export function optionalNonNegativeNumber(value, key) {
    const item = value[key];
    if (item === undefined)
        return {};
    if (typeof item !== 'number' || !Number.isFinite(item) || item < 0) {
        throw new Error(`inspector protocol: ${key} must be a non-negative finite number`);
    }
    return { [key]: item };
}
//# sourceMappingURL=validation.js.map