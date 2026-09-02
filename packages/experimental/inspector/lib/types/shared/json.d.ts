/** JSON values admitted by every Inspector cross-realm message. */
/** JSON scalar accepted by Inspector transports. */
export type InspectorJsonPrimitive = null | boolean | number | string;
/** Recursively JSON-compatible value accepted by Inspector transports. */
export type InspectorJsonValue = InspectorJsonPrimitive | readonly InspectorJsonValue[] | InspectorJsonObject;
/** JSON-compatible object accepted by Inspector transports. */
export interface InspectorJsonObject {
    readonly [key: string]: InspectorJsonValue;
}
/**
 * Test that a value can cross both MessagePort and JSON WebSocket carriers without coercion.
 * @param value - Candidate wire value.
 * @returns Whether the value is lossless JSON data.
 */
export declare function isJsonValue(value: unknown): value is InspectorJsonValue;
/**
 * Require a plain JSON object and return it with a narrowed type.
 * @param value - Candidate wire value.
 * @param label - Field name used in validation errors.
 * @returns The validated JSON object.
 */
export declare function requireJsonObject(value: unknown, label: string): InspectorJsonObject;
/**
 * Compute the UTF-8 byte length of a JSON wire value.
 * @param value - Validated JSON value.
 * @returns Its encoded byte length.
 */
export declare function jsonByteLength(value: InspectorJsonValue): number;
/**
 * Test whether a value is a plain object with string own keys.
 * @param value - Candidate object.
 * @returns Whether the value has `Object.prototype` or a null prototype.
 */
export declare function isPlainObject(value: unknown): value is Record<string, unknown>;
//# sourceMappingURL=json.d.ts.map