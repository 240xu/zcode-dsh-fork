/**
 * Profile-named Codex one-shot subagent provider. Every accepted run starts a
 * fresh official package-local Codex wrapper with `app-server --stdio` in the
 * delegating Session's workspace and publishes only after an ephemeral thread exists.
 *
 * @module @deepseek-ai/dsh-subagent-codex
 */
import z from '@deepseek-ai/schemastery';
import { MAX_TIMER_DELAY_MS } from '@deepseek-ai/dsh-timeout';
import { assertPositiveFinite, NO_START_CAPABILITIES, resolveChildCwd, } from '@deepseek-ai/dsh-subagent';
import { CODEX_PERMISSION_MODES, DEFAULT_CODEX_PERMISSION_MODE, DEFAULT_DISPOSE_GRACE_MS, codexStartupFailure, startCodexRun, } from "./run.js";
export const name = 'subagent-codex';
export const inject = ['subagents', 'subprocess'];
const DEFAULT_PROVIDER_NAME = 'codex';
export const Config = z.object({
    providerName: z.string().min(1).default(DEFAULT_PROVIDER_NAME),
    model: z.string().min(1),
    env: z.dict(z.string()).default({}),
    permissionMode: z.union([...CODEX_PERMISSION_MODES])
        .default(DEFAULT_CODEX_PERMISSION_MODE),
    disposeGraceMs: z.number().default(DEFAULT_DISPOSE_GRACE_MS),
});
class CodexProvider {
    name;
    ctx;
    config;
    capabilities = NO_START_CAPABILITIES;
    inheritsParentContext = false;
    constructor(name, ctx, config) {
        this.name = name;
        this.ctx = ctx;
        this.config = config;
    }
    start(request) {
        const parentCwd = request.parent.session.header.cwd;
        if (parentCwd === undefined) {
            throw new Error('subagent-codex: no working directory for the child — delegate from a parent session that has one');
        }
        let cwd;
        try {
            cwd = resolveChildCwd('subagent-codex', undefined, parentCwd);
        }
        catch (error) {
            if (request.signal.aborted) {
                throw new Error('subagent-codex: request was aborted before app-server startup');
            }
            throw codexStartupFailure(error);
        }
        const spec = {
            cwd,
            ...this.config.model === undefined ? {} : { model: this.config.model },
            permissionMode: this.config.permissionMode,
            env: this.config.env,
            disposeGraceMs: this.config.disposeGraceMs,
            spawn: spawnSpec => this.ctx.subprocess.spawn(spawnSpec),
            onError: (error, stopReason) => {
                this.ctx.logger.warn(`subagent-codex "${this.name}": child run failed (${stopReason}): ${error.message}`);
            },
        };
        return startCodexRun(request, spec);
    }
}
/**
 * Register one Profile-named Codex provider.
 * @param ctx - context carrying shared subagent and subprocess services.
 * @param config - registry name, optional model, permission mode, child environment, and disposal grace.
 */
export function apply(ctx, config) {
    const resolved = {
        providerName: config.providerName ?? DEFAULT_PROVIDER_NAME,
        ...config.model === undefined ? {} : { model: config.model },
        env: config.env,
        permissionMode: config.permissionMode ?? DEFAULT_CODEX_PERMISSION_MODE,
        disposeGraceMs: config.disposeGraceMs,
    };
    assertPositiveFinite('subagent-codex', 'disposeGraceMs', resolved.disposeGraceMs);
    if (resolved.disposeGraceMs > MAX_TIMER_DELAY_MS) {
        throw new Error(`subagent-codex: disposeGraceMs must be no greater than ${MAX_TIMER_DELAY_MS}`);
    }
    ctx.subagents.registerProvider(new CodexProvider(resolved.providerName, ctx, resolved));
}
//# sourceMappingURL=index.js.map