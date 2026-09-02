/** Small validators for values returned by Node's native Inspector protocol. */
/**
 * Test whether a native protocol value is a non-array object record.
 * @param value - Native protocol value.
 * @returns Whether the value can be read as named fields.
 */
export declare function isNativeRecord(value: unknown): value is Readonly<Record<string, unknown>>;
/**
 * Require a native protocol object record.
 * @param value - Native protocol value.
 * @param label - Subject named in the validation error.
 * @returns The validated object record.
 */
export declare function requireNativeRecord(value: unknown, label: string): Readonly<Record<string, unknown>>;
/**
 * Include an optional field only when the native request supplied a value.
 * @param key - Native protocol field name.
 * @param value - Optional field value.
 * @returns An empty record or the requested field.
 */
export declare function optionalNativeField<Key extends string, Value>(key: Key, value: Value | undefined): Partial<Record<Key, Value>>;
//# sourceMappingURL=values.d.ts.map