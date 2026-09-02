/**
 * Shared ownership of one E2B sandbox. Capability adapters await the same SDK
 * handle, so filesystem and process operations inhabit one remote Linux world.
 * @module @deepseek-ai/dsh-e2b
 */
import { randomUUID } from 'node:crypto';
import { posix } from 'node:path';
import { Service } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { FileType, Sandbox, SandboxNotFoundError } from 'e2b';
export { CommandExitError, FileNotFoundError, FileType, Sandbox, SandboxNotFoundError, } from 'e2b';
/**
 * Quote one opaque argument for the SDK's unavoidable `/bin/bash -l -c` layer.
 * @param value - Exact argument value to preserve.
 * @returns A single shell word with no interpolation.
 */
export function quoteE2BShellArg(value) {
    return `'${value.replaceAll('\'', "'\"'\"'")}'`;
}
/**
 * Isolate E2B's hard-coded login shell behind a fresh randomized home path.
 * @param overrides - Additional environment entries for the internal command.
 * @returns A fresh mutable map that the E2B SDK may extend.
 */
export function e2bControlEnvs(overrides = {}) {
    return { ...overrides, HOME: `/.dsh-e2b-control-${randomUUID()}` };
}
/**
 * Creates one lazily consumable E2B SDK handle and deletes the sandbox at
 * timeout or disposal. Creation begins at plugin construction; adapters await
 * {@link getSandbox} before their first operation.
 */
export class E2BRuntime extends Service {
    static Config = z.object({
        apiKey: z.string(),
        cwd: z.string().default('/home/user/workspace'),
        timeoutMs: z.number().default(300_000),
    });
    /** Validated remote working directory shared by provider adapters. */
    cwd;
    /** Remote directory reserved for adapter-owned process and terminal state. */
    runtimeRoot;
    config;
    ready;
    disposed = false;
    constructor(ctx, config) {
        super(ctx, 'e2b');
        // Schemastery fills these fields before construction; the type does not encode that step.
        const resolved = config;
        const apiKey = config.apiKey ?? process.env.E2B_API_KEY;
        this.config = {
            apiKey: apiKey ?? '',
            cwd: resolved.cwd,
            timeoutMs: resolved.timeoutMs,
        };
        this.validate();
        this.cwd = this.config.cwd;
        this.runtimeRoot = posix.join(this.cwd, '.dsh-e2b');
        this.ready = this.open();
        // A deployment may load the owner before any adapter uses it. Keep a
        // failed eager connection observed; getSandbox() still returns the error.
        void this.ready.catch(() => { });
        ctx.effect(() => async () => {
            this.disposed = true;
            let sandbox;
            try {
                sandbox = await this.ready;
            }
            catch (_sandboxSetupFailure) {
                // open() either acquired no sandbox or already made the POC's one rollback attempt.
                return;
            }
            try {
                await sandbox.kill();
            }
            catch (error) {
                if (!(error instanceof SandboxNotFoundError))
                    throw error;
            }
        }, 'e2b sandbox teardown');
    }
    /**
     * Return the shared live SDK handle.
     * @returns the created sandbox after the configured cwd exists.
     * @throws when E2B rejects creation or the service is disposing.
     */
    async getSandbox() {
        if (this.disposed)
            throw new Error('E2B sandbox service is disposing');
        const sandbox = await this.ready;
        // Disposal can race the awaited sandbox readiness despite the synchronous precheck.
        // oxlint-disable-next-line typescript/no-unnecessary-condition -- Awaiting readiness yields to disposal.
        if (this.disposed)
            throw new Error('E2B sandbox service is disposing');
        return sandbox;
    }
    validate() {
        if (this.config.apiKey.length === 0) {
            throw new Error('dsh-e2b: configure apiKey or set E2B_API_KEY');
        }
        if (!posix.isAbsolute(this.config.cwd)) {
            throw new Error(`dsh-e2b: cwd must be an absolute Linux path: ${this.config.cwd}`);
        }
        if (!Number.isFinite(this.config.timeoutMs) || this.config.timeoutMs <= 0) {
            throw new Error('dsh-e2b: timeoutMs must be a positive finite number');
        }
    }
    async open() {
        const sandbox = await Sandbox.create({
            apiKey: this.config.apiKey,
            timeoutMs: this.config.timeoutMs,
            secure: true,
            lifecycle: { onTimeout: 'kill' },
        });
        try {
            await sandbox.files.makeDir(this.cwd);
            await sandbox.files.makeDir(this.runtimeRoot);
            const runtimeRoot = await sandbox.files.getInfo(this.runtimeRoot);
            if (runtimeRoot.type !== FileType.DIR || runtimeRoot.symlinkTarget !== undefined) {
                throw new Error(`dsh-e2b: runtime root must be a real directory: ${this.runtimeRoot}`);
            }
            await sandbox.commands.run(`chmod 700 -- ${quoteE2BShellArg(this.runtimeRoot)}`, { envs: e2bControlEnvs() });
            return sandbox;
        }
        catch (error) {
            try {
                await sandbox.kill();
            }
            catch (_sandboxSetupRollbackFailure) {
                // TODO(e2b-setup-rollback): Add retry state only if a real double failure
                // outlives E2B's configured sandbox timeout.
            }
            throw error;
        }
    }
}
export default E2BRuntime;
//# sourceMappingURL=index.js.map