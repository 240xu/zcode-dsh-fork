import type { StaticModuleFactory } from '../module-system/module-loader.ts';
/**
 * Prefixes whose every subpath resolves to one replacement module. The loader
 * matches the longest prefix after its exact table misses, so pi-ai's
 * `/providers/*` and `/api/*.lazy` entries need no enumeration.
 */
export declare const REPLACED_PREFIXES: Record<string, StaticModuleFactory>;
/**
 * Build the specifier → factory table the worker module loader consults first.
 * @returns every replaced specifier, including its `node:`-prefixed alias.
 */
export declare function createNodeBuiltins(): Record<string, StaticModuleFactory>;
//# sourceMappingURL=builtins.d.ts.map