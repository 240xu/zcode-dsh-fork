/**
 * One-shot Claude Code lifecycle: invoke the official Agent SDK, place its
 * real CLI process under the shared subprocess owner, map only strict SDK
 * success to completion, and dispose to whole-tree quiescence.
 *
 * @module @deepseek-ai/dsh-subagent-claude-code/run
 */
import { randomUUID } from 'node:crypto';
import { query as officialQuery, } from '@anthropic-ai/claude-agent-sdk';
import { brandString } from '@deepseek-ai/dsh-brand';
import { settleRunResult, subprocessRunHandle, } from '@deepseek-ai/dsh-subagent';
import { scrubbedParentEnv, } from '@deepseek-ai/dsh-subprocess';
import { claudeSpawnSpec, ManagedClaudeCodeProcess, } from "./process.js";
/** Default POSIX grace between subprocess termination tiers. */
export const DEFAULT_DISPOSE_GRACE_MS = 3_000;
/** Claude Code permission modes that cannot wait for a human response. */
export const CLAUDE_CODE_PERMISSION_MODES = [
    'dontAsk',
    'acceptEdits',
    'auto',
    'plan',
    'bypassPermissions',
];
/** Safe default for unattended Claude Code runs. */
export const DEFAULT_CLAUDE_CODE_PERMISSION_MODE = 'dontAsk';
const SUPPORTED_UNATTENDED_DIALOG_KINDS = [
    'refusal_fallback_prompt',
];
function failureDiagnostic(facts) {
    const fields = [
        'product: Claude Code',
        `stage: ${facts.stage}`,
        `category: ${facts.category}`,
    ];
    const exitCode = facts.outcome?.exitCode;
    if (exitCode !== null && exitCode !== undefined) {
        fields.push(`exit code: ${exitCode}`);
    }
    const signal = facts.outcome?.signal;
    if (signal !== null && signal !== undefined) {
        fields.push(`signal: ${signal}`);
    }
    return `Product subagent failure (${fields.join('; ')})`;
}
class ClaudeCodeFailure extends Error {
    facts;
    constructor(facts, cause) {
        super(`subagent-claude-code: ${failureDiagnostic(facts)}`, cause === undefined ? undefined : { cause });
        this.facts = facts;
        this.name = 'ClaudeCodeFailure';
    }
}
function sdkFailureCategory(subtype) {
    switch (subtype) {
        case 'error_max_turns':
        case 'error_max_budget_usd':
        case 'error_max_structured_output_retries':
            return 'limit';
        case 'error_during_execution':
            return 'product-error';
        default:
            return 'unknown';
    }
}
/**
 * Hide an unpublished product startup failure behind fixed safe facts.
 * @param cause - original host-side failure retained only on the Error cause chain.
 * @returns a rejection safe to expose through the subagent start boundary.
 */
export function claudeCodeStartupFailure(cause) {
    return new ClaudeCodeFailure({
        stage: 'query-start',
        category: 'unknown',
    }, cause);
}
function unattendedDiagnostic(mode, request, decision, reason) {
    return `Claude Code unattended decision (mode: ${mode}; request: ${request}; decision: ${decision}): ${reason}`;
}
function thrown(value) {
    /* v8 ignore next -- typed SDK and subprocess failures reject with Error. */
    return value instanceof Error ? value : new Error(String(value));
}
/** Read live request cancellation across awaited startup cleanup. */
function isAborted(signal) {
    return signal.aborted;
}
/* jscpd:ignore-end */
/**
 * Validate and preserve the one-shot task before crossing the SDK boundary.
 * @param prompt - task content accepted from the shared subagent service.
 * @returns the exact text sequence as one SDK prompt.
 */
export function textTask(prompt) {
    if (prompt.length === 0) {
        throw new Error('subagent-claude-code: the one-shot task must contain only text blocks');
    }
    const texts = [];
    for (const block of prompt) {
        if (block.type !== 'text') {
            throw new Error('subagent-claude-code: the one-shot task must contain only text blocks');
        }
        texts.push(block.text);
    }
    if (texts.every(text => text.trim().length === 0)) {
        throw new Error('subagent-claude-code: the one-shot task must not be empty');
    }
    return texts.join('');
}
/**
 * Strictly derive the only SDK result that can complete a shared run.
 * @param message - an official discriminated result union.
 * @returns exact final text for a successful, non-error result.
 */
export function successfulResult(message) {
    if (message.subtype !== 'success') {
        const category = sdkFailureCategory(message.subtype);
        const detail = category === 'unknown'
            ? undefined
            : message.errors.join('; ');
        throw new ClaudeCodeFailure({ stage: 'query-run', category }, detail === undefined || detail.length === 0
            ? undefined
            : new Error(detail));
    }
    if (message.is_error || message.result.trim().length === 0) {
        throw new ClaudeCodeFailure({
            stage: 'query-run',
            category: 'invalid-result',
        });
    }
    return message.result;
}
/**
 * Consume the complete SDK stream and require one strict success plus normal
 * iterator completion.
 * @param query - published official SDK query.
 * @param onPermissionDenied - records a safe fact when the SDK reports native denial.
 * @param onResult - records that the SDK supplied a terminal result message.
 * @returns the completed shared result.
 */
export async function consumeClaudeQuery(query, onPermissionDenied, onResult) {
    let answer;
    for await (const message of query) {
        if (message.type === 'system' && message.subtype === 'permission_denied') {
            onPermissionDenied?.();
            continue;
        }
        if (message.type !== 'result')
            continue;
        onResult?.();
        answer = successfulResult(message);
    }
    if (answer === undefined) {
        throw new ClaudeCodeFailure({
            stage: 'query-run',
            category: 'invalid-result',
        });
    }
    return {
        output: [{ type: 'text', text: answer }],
        stopReason: 'completed',
    };
}
/**
 * Close the official query, terminate the managed process tree, and wait for
 * the subprocess owner to prove it is gone.
 * @param query - official SDK query, when creation reached that point.
 * @param child - live shared-service handle that owns the CLI process tree;
 * spawn-failed handles settle at the startup boundary instead.
 */
export async function disposeClaudeCodeChild(query, child) {
    const failures = [];
    try {
        query?.close();
    }
    catch (error) {
        failures.push(thrown(error));
    }
    child.terminate();
    try {
        await child.waitForExit();
    }
    catch (error) {
        failures.push(thrown(error));
    }
    const outcome = await child.done;
    const firstFailure = failures[0];
    if (firstFailure !== undefined) {
        const facts = {
            stage: 'teardown',
            category: 'unknown',
            outcome,
        };
        const cause = failures.length === 1
            ? firstFailure
            : new AggregateError(failures, 'Claude Code teardown failures');
        throw new ClaudeCodeFailure(facts, cause);
    }
}
/**
 * Build the fixed official SDK options for one one-shot provider run.
 * @param spec - Workspace, environment, process service, and disposal policy.
 * @param controller - per-run cancellation owner.
 * @param capture - receives the shared child and SDK-facing process synchronously.
 * @param captureDiagnostic - receives safe facts from unattended interaction callbacks.
 * @returns options that inherit native settings while disabling persistence and user questions.
 */
export function claudeQueryOptions(spec, controller, capture, captureDiagnostic) {
    return {
        abortController: controller,
        cwd: spec.cwd,
        ...spec.model === undefined ? {} : { model: spec.model },
        env: { ...scrubbedParentEnv(), ...spec.env },
        persistSession: false,
        disallowedTools: spec.permissionMode === 'plan'
            ? ['AskUserQuestion', 'ExitPlanMode']
            : ['AskUserQuestion'],
        permissionMode: spec.permissionMode,
        ...spec.permissionMode === 'bypassPermissions'
            ? { allowDangerouslySkipPermissions: true }
            : {
                canUseTool: () => {
                    captureDiagnostic(unattendedDiagnostic(spec.permissionMode, 'tool permission', 'denied', 'the provider does not request human approval'));
                    return Promise.resolve({
                        behavior: 'deny',
                        message: 'This unattended Claude Code subagent cannot request human approval.',
                    });
                },
            },
        onElicitation: () => {
            captureDiagnostic(unattendedDiagnostic(spec.permissionMode, 'MCP elicitation', 'declined', 'the provider does not collect interactive MCP input'));
            return Promise.resolve({ action: 'decline' });
        },
        onUserDialog: () => {
            captureDiagnostic(unattendedDiagnostic(spec.permissionMode, 'user dialog', 'cancelled', 'the provider does not render blocking dialogs'));
            return Promise.resolve({ behavior: 'cancelled' });
        },
        supportedDialogKinds: SUPPORTED_UNATTENDED_DIALOG_KINDS,
        spawnClaudeCodeProcess: (options) => {
            const child = spec.spawn(claudeSpawnSpec(options, spec.disposeGraceMs));
            const process = new ManagedClaudeCodeProcess(child);
            capture(child, process);
            return process;
        },
    };
}
/**
 * Start one official Claude Agent SDK query and publish its one-shot run.
 * @param request - resolved shared subagent request.
 * @param spec - Workspace, environment, process service, and diagnostic policy.
 * @returns the published run after both Query and real CLI handle exist.
 */
export async function startClaudeCodeRun(request, spec) {
    const prompt = textTask(request.prompt);
    if (request.signal.aborted) {
        throw new Error('subagent-claude-code: request was aborted before SDK startup');
    }
    const controller = new AbortController();
    const requestCancel = () => {
        if (!controller.signal.aborted) {
            controller.abort(new Error('subagent-claude-code: run cancelled locally'));
        }
    };
    const onAbort = () => { requestCancel(); };
    request.signal.addEventListener('abort', onAbort, { once: true });
    const reportFailure = (error) => {
        try {
            spec.onError?.(error, 'error');
        }
        catch {
            // Host diagnostic logging cannot replace the product failure.
        }
    };
    let child;
    let query;
    let managedProcess;
    let diagnostic;
    const capturePermissionDiagnostic = (value) => {
        diagnostic = value;
    };
    const prependFailureDiagnostic = (facts) => {
        const failure = failureDiagnostic(facts);
        diagnostic = diagnostic === undefined
            ? failure
            : `${failure}\n${diagnostic}`;
    };
    const captureChild = (captured, process) => {
        child = captured;
        managedProcess = process;
    };
    try {
        query = officialQuery({
            prompt,
            options: claudeQueryOptions(spec, controller, captureChild, capturePermissionDiagnostic),
        });
        if (child === undefined || child.pid <= 0) {
            throw new Error('subagent-claude-code: official SDK did not publish a controllable Claude Code process');
        }
        if (controller.signal.aborted) {
            throw new Error('subagent-claude-code: request was aborted before SDK startup');
        }
    }
    catch (error) {
        request.signal.removeEventListener('abort', onAbort);
        const cancelledBeforeCleanup = controller.signal.aborted;
        // Let child.done publish a concurrently observed exit before classification.
        await Promise.resolve();
        const startupOutcome = managedProcess?.outcome;
        const startupFacts = {
            stage: 'query-start',
            category: 'unknown',
            outcome: startupOutcome,
        };
        const startupFailure = (cause = error) => new ClaudeCodeFailure(startupFacts, thrown(cause));
        requestCancel();
        if (child !== undefined && child.pid <= 0) {
            let closeError;
            try {
                query?.close();
            }
            catch (disposeError) {
                closeError = thrown(disposeError);
            }
            let spawnError = thrown(error);
            try {
                await child.done;
            }
            catch (childError) {
                spawnError = thrown(childError);
            }
            if (closeError !== undefined) {
                const failure = startupFailure(spawnError);
                const cleanupFailure = new ClaudeCodeFailure({
                    stage: 'teardown',
                    category: 'unknown',
                }, closeError);
                const aggregate = new AggregateError([failure, cleanupFailure], `${failure.message}; ${cleanupFailure.message}`);
                reportFailure(aggregate);
                throw aggregate;
            }
            if (cancelledBeforeCleanup || isAborted(request.signal)) {
                throw new Error('subagent-claude-code: request was aborted before SDK startup');
            }
            const failure = startupFailure(spawnError);
            reportFailure(failure);
            throw failure;
        }
        if (child !== undefined) {
            try {
                await disposeClaudeCodeChild(query, child);
            }
            catch (disposeError) {
                const failure = startupFailure();
                const cleanupFailure = thrown(disposeError);
                const aggregate = new AggregateError([failure, cleanupFailure], `${failure.message}; ${cleanupFailure.message}`);
                reportFailure(aggregate);
                throw aggregate;
            }
        }
        else if (query !== undefined) {
            try {
                query.close();
            }
            catch (disposeError) {
                const failure = startupFailure();
                const cleanupFailure = new ClaudeCodeFailure({
                    stage: 'teardown',
                    category: 'unknown',
                }, thrown(disposeError));
                const aggregate = new AggregateError([failure, cleanupFailure], `${failure.message}; ${cleanupFailure.message}`);
                reportFailure(aggregate);
                throw aggregate;
            }
        }
        if (cancelledBeforeCleanup || isAborted(request.signal)) {
            throw new Error('subagent-claude-code: request was aborted before SDK startup');
        }
        const failure = startupFailure();
        reportFailure(failure);
        throw failure;
    }
    const publishedQuery = query;
    const publishedChild = child;
    let receivedResult = false;
    const result = settleRunResult({
        attempt: async () => {
            try {
                return await consumeClaudeQuery(publishedQuery, () => {
                    capturePermissionDiagnostic(unattendedDiagnostic(spec.permissionMode, 'tool permission', 'denied', 'Claude Code denied the request before an interactive prompt'));
                }, () => {
                    receivedResult = true;
                });
            }
            catch (error) {
                const processOutcome = managedProcess?.outcome;
                let facts;
                if (error instanceof ClaudeCodeFailure) {
                    facts = { ...error.facts, outcome: processOutcome };
                }
                else if (processOutcome !== undefined && !receivedResult) {
                    facts = {
                        stage: 'process',
                        category: 'process',
                        outcome: processOutcome,
                    };
                }
                else {
                    facts = {
                        stage: 'query-run',
                        category: 'unknown',
                        outcome: processOutcome,
                    };
                }
                prependFailureDiagnostic(facts);
                // Keep the SDK category and cause; the diagnostic adds later process facts.
                throw error instanceof ClaudeCodeFailure
                    ? error
                    : new ClaudeCodeFailure(facts, thrown(error));
            }
        },
        collectOutput: () => [],
        collectDiagnostic: () => diagnostic,
        cancelled: () => controller.signal.aborted,
        onError: spec.onError,
        signal: request.signal,
        onAbort,
    });
    return subprocessRunHandle({
        id: brandString(randomUUID()),
        result,
        signal: request.signal,
        onAbort,
        requestCancel,
        teardown: async () => {
            try {
                await disposeClaudeCodeChild(publishedQuery, publishedChild);
            }
            catch (error) {
                const failure = thrown(error);
                reportFailure(failure);
                throw failure;
            }
        },
    });
}
//# sourceMappingURL=run.js.map