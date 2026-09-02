/** Opaque type descriptor standing in for a koffi type handle. */
interface KoffiType {
    readonly __dshKoffiType: string;
    /** Byte size under the x64 ABI; struct layout guards compare against it. */
    readonly size: number;
    /** Byte alignment under the x64 ABI. */
    readonly alignment: number;
}
/**
 * Pointer type descriptor.
 * @param target - pointee type name or descriptor.
 * @returns the descriptor token.
 */
declare function pointer(target: unknown): KoffiType;
/**
 * Struct type descriptor. The size and alignment are computed with the same
 * padding rules koffi uses on x64, because the Windows ACL layer compares them
 * against its own header probe at module scope.
 * @param name - struct name, or the field record when the name is omitted.
 * @param fields - field name → type record.
 * @returns the descriptor token.
 */
declare function struct(name: unknown, fields?: Record<string, unknown>): KoffiType;
/**
 * Array type descriptor.
 * @param target - element type.
 * @param length - element count.
 * @returns the descriptor token.
 */
declare function array(target: unknown, length: number): KoffiType;
/**
 * Opaque type descriptor.
 * @param name - type name.
 * @returns the descriptor token.
 */
declare function opaque(name?: string): KoffiType;
/** Primitive type table; members carry their x64 sizes. */
declare const types: Record<string, KoffiType>;
/** The koffi face its consumers read; every call refuses. */
declare const koffi: {
    pointer: typeof pointer;
    struct: typeof struct;
    array: typeof array;
    opaque: typeof opaque;
    types: Record<string, KoffiType>;
    alias: (name: string, target: unknown) => KoffiType;
    sizeof: (target: unknown) => number;
    alignof: (target: unknown) => number;
    load: (...args: never[]) => never;
    alloc: (...args: never[]) => never;
    free: (...args: never[]) => never;
    decode: (...args: never[]) => never;
    encode: (...args: never[]) => never;
    address: (...args: never[]) => never;
    register: (...args: never[]) => never;
    unregister: (...args: never[]) => never;
    call: (...args: never[]) => never;
};
export { pointer, struct, array, opaque, types };
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ./builtins.ts). */
export declare const __esModule = true;
export default koffi;
//# sourceMappingURL=koffi.d.ts.map