/**
 * Profile-named Claude Code one-shot subagent provider. Every accepted run
 * invokes the official Agent SDK in the delegating Session's workspace and
 * places the SDK-spawned real CLI under the shared subprocess owner.
 *
 * @module @deepseek-ai/dsh-subagent-claude-code
 */
import z from '@deepseek-ai/schemastery';
import { MAX_TIMER_DELAY_MS } from '@deepseek-ai/dsh-timeout';
import { assertPositiveFinite, NO_START_CAPABILITIES, resolveChildCwd, } from '@deepseek-ai/dsh-subagent';
import { CLAUDE_CODE_PERMISSION_MODES, DEFAULT_CLAUDE_CODE_PERMISSION_MODE, DEFAULT_DISPOSE_GRACE_MS, claudeCodeStartupFailure, startClaudeCodeRun, } from "./run.js";
export const name = 'subagent-claude-code';
export const inject = ['subagents', 'subprocess'];
const DEFAULT_PROVIDER_NAME = 'claude-code';
export const Config = z.object({
    providerName: z.string().min(1).default(DEFAULT_PROVIDER_NAME),
    model: z.string().min(1),
    env: z.dict(z.string()).default({}),
    permissionMode: z.union([...CLAUDE_CODE_PERMISSION_MODES])
        .default(DEFAULT_CLAUDE_CODE_PERMISSION_MODE),
    disposeGraceMs: z.number().default(DEFAULT_DISPOSE_GRACE_MS),
});
/* jscpd:ignore-end */
/* jscpd:ignore-start -- Cordis registration and shared-seam plumbing mirror
 * the Codex sibling; each product's lifecycle remains package-private. */
class ClaudeCodeProvider {
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
    async start(request) {
        const parentCwd = request.parent.session.header.cwd;
        if (parentCwd === undefined) {
            throw new Error('subagent-claude-code: no working directory for the child — delegate from a parent session that has one');
        }
        let cwd;
        try {
            cwd = resolveChildCwd('subagent-claude-code', undefined, parentCwd);
        }
        catch (error) {
            if (request.signal.aborted) {
                throw new Error('subagent-claude-code: request was aborted before SDK startup');
            }
            const failure = claudeCodeStartupFailure(error);
            this.ctx.logger.warn(`subagent-claude-code "${this.name}": child start failed: %o`, failure);
            throw failure;
        }
        const spec = {
            cwd,
            ...this.config.model === undefined ? {} : { model: this.config.model },
            permissionMode: this.config.permissionMode,
            env: this.config.env,
            disposeGraceMs: this.config.disposeGraceMs,
            spawn: spawnSpec => this.ctx.subprocess.spawn(spawnSpec),
            onError: (error, stopReason) => {
                this.ctx.logger.warn(`subagent-claude-code "${this.name}": child run failed (${stopReason}): %o`, error);
            },
        };
        return startClaudeCodeRun(request, spec);
    }
}
/**
 * Register one Profile-named Claude Code provider.
 * @param ctx - context carrying shared subagent and subprocess services.
 * @param config - registry name, optional model, permission mode, child environment, and disposal grace.
 */
export function apply(ctx, config) {
    const resolved = {
        providerName: config.providerName ?? DEFAULT_PROVIDER_NAME,
        ...config.model === undefined ? {} : { model: config.model },
        env: config.env,
        permissionMode: config.permissionMode ?? DEFAULT_CLAUDE_CODE_PERMISSION_MODE,
        disposeGraceMs: config.disposeGraceMs,
    };
    assertPositiveFinite('subagent-claude-code', 'disposeGraceMs', resolved.disposeGraceMs);
    if (resolved.disposeGraceMs > MAX_TIMER_DELAY_MS) {
        throw new Error(`subagent-claude-code: disposeGraceMs must be no greater than ${MAX_TIMER_DELAY_MS}`);
    }
    ctx.subagents.registerProvider(new ClaudeCodeProvider(resolved.providerName, ctx, resolved));
}
/* jscpd:ignore-end */
//# sourceMappingURL=index.js.map