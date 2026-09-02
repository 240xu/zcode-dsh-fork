/**
 * Session-log snapshot support behind the keyless snapshot tier
 * (`pnpm run test:snapshot`). The current ACP adapter has four layers: the
 * shared subprocess/client launcher ({@link launchAcpTestAgent}), the scripted
 * scenario harness ({@link runScenario}), the pure expected-output normalizers
 * ({@link normalizeStdout} / {@link normalizeSessionLog} /
 * {@link scrubRequestHeaders} / {@link scrubSystemPrompts}), and the suite
 * factory ({@link defineAcpSnapshotSuite}) that registers a scenario table as a
 * full describe/it tree. Transport-neutral normalizers and fixture invariants
 * remain reusable by other profile adapters. Ordinary ACP e2e tests can use the launcher directly;
 * the ACP corpus adapter supplies only its {@link AgentUnderTest} paths,
 * snapshots directory, and {@link Scenario} table.
 *
 * NOTE: ./suite.ts imports vitest, so this package is importable only inside a
 * vitest run — a support-tier constraint stated in the README.
 *
 * @module @deepseek-ai/dsh-session-snapshot
 */
export { redactSessionSnapshotIds, } from "./identity.js";
export { runScenario, snapshotSpillRoot, } from "./harness.js";
export { launchAcpTestAgent, materializeProfilePatch, } from "./launcher.js";
export { extractSnapshotSpillPaths, normalizeSessionLog, normalizeSessionSnapshot, normalizeSessionSnapshots, normalizeStdout, scrubRequestHeaders, scrubSessionSnapshot, scrubSystemPrompts, scrubToolSchemas, tokenizeSessionFixtureCwd, } from "./normalize.js";
export { parseSnapshotManifest, } from "./manifest.js";
export { formatSystemPromptSnapshot, formatToolSchemasSnapshot, fixtureContext, headerChangeCount, defineAcpSnapshotSuite, normalizedHeaders, normalizedSystemPrompts, normalizedToolSchemas, parseToolSchemasSnapshot, refreshFixtureReplacements, restorePinnedToolSchemas, sessionFixtureNames, stabilizeFixtureMessageIds, stabilizeRefreshLog, } from "./suite.js";
export { captureExpectedWorkspaceSnapshot, captureWorkspaceSnapshot, EMPTY_WORKSPACE_MARKER, } from "./workspace.js";
//# sourceMappingURL=index.js.map