/**
 * Virtual root of the worker host's in-memory filesystem. Kept
 * in one module so the process shim, the path/os shims, and the VFS image
 * collector cannot drift apart.
 */
/** Virtual filesystem root; `process.cwd()` and every absolute path start here. */
export declare const DSH_ROOT = "/dsh";
/** `$DSH_HOME`: durable-state directory inside the image. */
export declare const DSH_HOME = "/dsh/home";
/** Flat, symlink-free package tree resolved by the worker module loader. */
export declare const DSH_NODE_MODULES = "/dsh/node_modules";
/** Directory holding the composed cordis.yml and the agent-preset tree. */
export declare const DSH_CONFIG = "/dsh/config";
/** Default (empty) workspace directory. */
export declare const DSH_WORKSPACE = "/dsh/workspace";
/** Temporary directory reported by `os.tmpdir()`. */
export declare const DSH_TMP = "/dsh/tmp";
//# sourceMappingURL=paths.d.ts.map