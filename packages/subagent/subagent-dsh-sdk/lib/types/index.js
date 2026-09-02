/**
 * Out-of-process SDK subagent backend. Each child is a complete DeepSeek
 * Harness runtime in its own process — own named profile and patch composition,
 * session, model route, and tools — driven over stdio JSON-RPC through the
 * TypeScript SDK client, so it shares no Cordis context. It accepts the
 * provider/model/reasoning/maxTokens subset of `agentOptions`; other start
 * features remain unsupported. The ONE thing it reads off `request.parent`
 * is the session's workspace cwd. This plugin uses named
 * exports only; a default would hide its loader metadata (see
 * `docs/postmortem/0001-acp-default-export-drops-inject.md`).
 * @module @deepseek-ai/dsh-subagent-dsh-sdk
 */
import { statSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import z from '@deepseek-ai/schemastery';
import { assertPositiveFinite, NO_START_CAPABILITIES, resolveChildCwd, validateConfiguredCwd } from '@deepseek-ai/dsh-subagent';
import { DEFAULT_DISPOSE_EOF_GRACE_MS, DEFAULT_DISPOSE_GRACE_MS, DEFAULT_SHUTDOWN_TIMEOUT_MS, sdkConfigurationFailure, startSdkRun, } from "./run.js";
export const name = 'subagent-dsh-sdk';
export const inject = ['subagents'];
export const Config = z.object({
    providerName: z.string().default('dsh-sdk'),
    dshBin: z.string(),
    profile: z.string().default('sdk'),
    patches: z.array(z.string()).default([]),
    dshHome: z.string().required(),
    cwd: z.string(),
    provider: z.string().default('deepseek-official'),
    model: z.string().default('deepseek-v4-flash'),
    maxTokens: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER),
    env: z.dict(z.string()).default({}),
    shutdownTimeoutMs: z.number().default(DEFAULT_SHUTDOWN_TIMEOUT_MS),
    disposeEofGraceMs: z.number().default(DEFAULT_DISPOSE_EOF_GRACE_MS),
    disposeGraceMs: z.number().default(DEFAULT_DISPOSE_GRACE_MS),
});
/** Resolve one configured runtime file against the harness launch directory and require a regular file. */
function resolveConfiguredFile(field, value) {
    const path = resolve(value);
    try {
        if (statSync(path).isFile())
            return path;
    }
    catch {
        // The diagnostic below owns missing, inaccessible, and non-file paths uniformly.
    }
    throw new TypeError(`subagent-dsh-sdk ${field} must name an existing file: ${path}`);
}
/** DSH SDK can apply Agent route options while the other start features remain child-owned. */
const SDK_START_CAPABILITIES = Object.freeze({
    ...NO_START_CAPABILITIES,
    agentOptions: true,
});
/** Merge the request's supported route fields over this provider instance's defaults. */
function resolveSdkRoute(config, requested) {
    const maxTokens = requested?.maxTokens ?? config.maxTokens;
    return {
        provider: requested?.provider ?? config.provider,
        model: requested?.model ?? config.model,
        ...requested?.reasoningEffort === undefined ? {} : { reasoningEffort: requested.reasoningEffort },
        ...maxTokens === undefined ? {} : { maxTokens },
    };
}
/**
 * The SDK provider. It resolves Agent route options into the child runtime's
 * process-wide handshake; output schema, depth, tool filter, and persona stay
 * unsupported because their ownership does not cross this process boundary.
 */
class SdkSubagentProvider {
    name;
    ctx;
    config;
    capabilities = SDK_START_CAPABILITIES;
    agentRouteDefaults;
    // Context contract: an out-of-process SDK child starts fresh — no parent conversation crosses the process boundary.
    inheritsParentContext = false;
    constructor(name, ctx, config) {
        this.name = name;
        this.ctx = ctx;
        this.config = config;
        this.agentRouteDefaults = Object.freeze({ provider: config.provider, model: config.model });
    }
    start(request) {
        if (request.signal.aborted) {
            throw new Error('subagent request was aborted before the SDK child started');
        }
        let cwd;
        try {
            cwd = resolveChildCwd('subagent-dsh-sdk', this.config.cwd, request.parent.session.header.cwd);
        }
        catch (error) {
            const failure = sdkConfigurationFailure(error);
            this.ctx.logger.warn(`subagent-dsh-sdk "${this.name}": child start failed: %o`, error);
            throw failure;
        }
        const route = resolveSdkRoute(this.config, request.agentOptions);
        const spec = {
            ...this.config.dshBin === undefined ? {} : { dshBin: this.config.dshBin },
            profile: this.config.profile,
            patches: this.config.patches,
            dshHome: this.config.dshHome,
            cwd,
            ...route,
            env: this.config.env,
            shutdownTimeoutMs: this.config.shutdownTimeoutMs,
            disposeEofGraceMs: this.config.disposeEofGraceMs,
            disposeGraceMs: this.config.disposeGraceMs,
            onError: (error, stopReason) => {
                // The seam forbids `result` rejecting, so a child-level failure is
                // flattened to a stop reason — preserve it here rather than losing it.
                this.ctx.logger.warn(`subagent-dsh-sdk "${this.name}": child run failed (${stopReason}): ${error.message}`);
            },
        };
        return startSdkRun(request, spec);
    }
}
export function apply(ctx, config) {
    // schemastery (Config) has already filled every defaulted field.
    const resolved = config;
    assertPositiveFinite('subagent-dsh-sdk', 'shutdownTimeoutMs', resolved.shutdownTimeoutMs);
    assertPositiveFinite('subagent-dsh-sdk', 'disposeEofGraceMs', resolved.disposeEofGraceMs);
    assertPositiveFinite('subagent-dsh-sdk', 'disposeGraceMs', resolved.disposeGraceMs);
    if (resolved.maxTokens !== undefined && (!Number.isSafeInteger(resolved.maxTokens) || resolved.maxTokens <= 0)) {
        throw new TypeError('subagent-dsh-sdk maxTokens must be a positive safe integer');
    }
    if (!isAbsolute(resolved.dshHome))
        throw new TypeError('subagent-dsh-sdk dshHome must be an absolute path');
    const launchPaths = {
        ...resolved,
        patches: resolved.patches.map((path, index) => resolveConfiguredFile(`patches[${String(index)}]`, path)),
        ...resolved.dshBin === undefined ? {} : { dshBin: resolveConfiguredFile('dshBin', resolved.dshBin) },
    };
    // Interpret a relative configured cwd against the harness launch directory
    // ONCE, at load, and fail a misconfigured directory here — not per start.
    const configuredCwd = validateConfiguredCwd('subagent-dsh-sdk', resolved.cwd);
    const validated = configuredCwd === undefined
        ? launchPaths
        : { ...launchPaths, cwd: configuredCwd };
    ctx.subagents.registerProvider(new SdkSubagentProvider(validated.providerName, ctx, validated));
}
//# sourceMappingURL=index.js.map