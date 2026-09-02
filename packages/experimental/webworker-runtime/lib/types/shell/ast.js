/**
 * The parsed command line, as this shell names it.
 *
 * `@yarnpkg/parsers` re-exports only part of its grammar's type map from the
 * package root, and its `exports` field forbids reaching the grammar module
 * directly, so the three missing members are derived from the ones it does
 * publish. `CommandChain` is `Command` plus an optional pipeline link, which
 * makes it usable wherever a command node is expected.
 * @module @deepseek-ai/dsh-experimental-webworker-runtime/src/shell/ast
 */
export {};
//# sourceMappingURL=ast.js.map