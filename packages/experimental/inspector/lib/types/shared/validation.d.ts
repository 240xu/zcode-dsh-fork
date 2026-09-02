/** Shared exact-object readers for versioned Inspector wire protocols. */
import { type InspectorId } from './identity.ts';
/**
 * Require a plain object containing only the listed fields.
 * @param value - Candidate object.
 * @param keys - Complete field allowlist.
 * @param label - Object name used in validation errors.
 * @returns The validated plain object.
 */
export declare function exactObject(value: unknown, keys: readonly string[], label: string): Record<string, unknown>;
/**
 * Reject fields outside one versioned object's declared field set.
 * @param value - Plain object being validated.
 * @param keys - Complete field allowlist.
 * @param label - Object name used in validation errors.
 */
export declare function exactKeys(value: Record<string, unknown>, keys: readonly string[], label: string): void;
/**
 * Read one non-empty opaque identifier.
 * @param value - Candidate identifier.
 * @param label - Field name used in validation errors.
 * @returns The role-branded identifier.
 */
export declare function wireId<Role extends string>(value: unknown, label: string): InspectorId<Role>;
/**
 * Read one optional string field.
 * @param value - Object containing the field.
 * @param key - Field name.
 * @returns An empty object or the validated field.
 */
export declare function optionalString<Key extends string>(value: Record<string, unknown>, key: Key): {
    readonly [Property in Key]?: string;
};
/**
 * Read one optional boolean field.
 * @param value - Object containing the field.
 * @param key - Field name.
 * @returns An empty object or the validated field.
 */
export declare function optionalBoolean<Key extends string>(value: Record<string, unknown>, key: Key): {
    readonly [Property in Key]?: boolean;
};
/**
 * Read one optional non-negative finite number field.
 * @param value - Object containing the field.
 * @param key - Field name.
 * @returns An empty object or the validated field.
 */
export declare function optionalNonNegativeNumber<Key extends string>(value: Record<string, unknown>, key: Key): {
    readonly [Property in Key]?: number;
};
//# sourceMappingURL=validation.d.ts.map