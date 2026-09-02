/**
 * Tool bridge: discovers MCP tools, registers them on the harness ToolRuntime
 * under deterministic server-qualified public names, and handles re-sync when
 * the server's tool list changes.
 *
 * Naming contract (see the mcp-client Agent Note "Naming invariants"): every MCP tool
 * has the stable identity `(serverName, rawName)`; the model-facing public name
 * is `mcp__<serverName>__<rawName>`, normalized to the DeepSeek function-name
 * constraints. The raw name is only ever sent on the wire (`tools/call`); the
 * public name is never parsed to recover it.
 *
 * @module
 */
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { isImageAdmissionError } from '@deepseek-ai/dsh-attachment';
import { assertSupportedJsonSchema } from '@deepseek-ai/dsh-tools';
/**
 * DeepSeek function-name contract: at most 64 characters. Wire-protocol
 * constant, not configuration.
 */
const MAX_PUBLIC_NAME_LENGTH = 64;
/** DeepSeek function-name contract: only `[A-Za-z0-9_-]` is allowed. */
const INVALID_NAME_CHARS = /[^A-Za-z0-9_-]/g;
/** Hex chars of the SHA-256 identity hash appended on lossy normalization. */
const HASH_LENGTH = 12;
/** Raw result record: the bridge owns JSON-value validation after transport. */
const RawCallToolResultSchema = z.record(z.string(), z.unknown());
/** Raster formats supported by the durable attachment vocabulary. */
const IMAGE_MEDIA_TYPES = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
];
/** Canonical RFC 4648 base64, excluding whitespace and URL-safe aliases. */
const CANONICAL_BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
/** List without mutating the SDK's per-page output-validator cache. */
function listToolsUncached(client, cursor) {
    return client.request({ method: 'tools/list', ...cursor === undefined ? {} : { params: { cursor } } }, ListToolsResultSchema);
}
/** Call without the SDK pre-validating an output schema the bridge may not support. */
function callToolUncached(client, rawName, args, exec, opts) {
    return client.request({ method: 'tools/call', params: { name: rawName, arguments: args } }, RawCallToolResultSchema, {
        signal: exec.signal,
        timeout: opts.toolCallTimeoutMs,
    });
}
/**
 * Derive the model-facing public name for one MCP tool.
 *
 * Deterministic pure function of `(serverName, rawName)`: the clean case is
 * `mcp__<serverName>__<rawName>` verbatim. When character replacement or
 * truncation to the DeepSeek function-name contract (64 chars,
 * `[A-Za-z0-9_-]`) changes the name, a 12-hex-char SHA-256 hash of the
 * identity is appended so distinct MCP identities never collapse into the
 * same public name.
 *
 * @param serverName - Stable local namespace from plugin config.
 * @param rawName - The MCP server's own tool name.
 * @returns The globally unique, model-facing ToolRuntime name.
 */
export function publicToolName(serverName, rawName) {
    const joined = `mcp__${serverName}__${rawName}`;
    const normalized = joined.replace(INVALID_NAME_CHARS, '_');
    if (normalized === joined && normalized.length <= MAX_PUBLIC_NAME_LENGTH)
        return normalized;
    const hash = createHash('sha256').update(`${serverName}\0${rawName}`).digest('hex').slice(0, HASH_LENGTH);
    return `${normalized.slice(0, MAX_PUBLIC_NAME_LENGTH - HASH_LENGTH - 1)}_${hash}`;
}
/**
 * Sync the MCP server's tool list into the harness ToolRuntime.
 *
 * Two phases keep the swap safe:
 *
 * 1. Fetch: drain uncached `tools/list` pagination and build the full next
 *    generation of `ToolDefinition`s under public names. Any failure here
 *    (network error, duplicate raw name in the server's list) rejects and
 *    leaves the previous generation registered untouched.
 * 2. Swap: dispose the previous generation, register the new one. A registry
 *    conflict here can only mean a foreign registration squats on this
 *    server's `mcp__<serverName>__` namespace — the partial generation is
 *    rolled back (zero tools from this server) and logged. Initial strict
 *    synchronization may propagate the conflict so its parent transaction
 *    rejects; ordinary clients and later re-syncs return an empty map.
 *
 * @param client - Connected MCP Client instance used to list and call tools.
 * @param ctx - Cordis context providing the `tools` service for registration.
 * @param opts - Bridge options: server namespace and per-call timeout.
 * @param previous - Disposer map from the prior sync generation; disposed
 *   during the swap phase (only after the fetch phase succeeded).
 * @returns A map of registered public tool names to their unregister
 *   disposers — the exact set of live registrations owned by this server.
 */
export async function syncTools(client, ctx, opts, previous) {
    // Phase 1: fetch and build the next generation without touching the registry.
    const definitions = new Map();
    let cursor;
    do {
        const response = await listToolsUncached(client, cursor);
        for (const tool of response.tools) {
            const publicName = publicToolName(opts.serverName, tool.name);
            if (definitions.has(publicName)) {
                throw new Error(`mcp-client(${opts.serverName}): server listed tool "${tool.name}" more than once — invalid tool list`);
            }
            definitions.set(publicName, createDefinition(client, ctx, publicName, tool.name, tool.description ?? '', tool.inputSchema, supportedOutputSchema(tool.outputSchema), tool.execution?.taskSupport === 'required', opts));
        }
        cursor = response.nextCursor;
    } while (cursor);
    // Phase 2: swap generations.
    for (const dispose of previous.values())
        dispose();
    const disposers = new Map();
    try {
        for (const [publicName, definition] of definitions) {
            disposers.set(publicName, ctx.tools.register(definition));
        }
    }
    catch (error) {
        // A conflict on an `mcp__<serverName>__`-qualified name means a foreign
        // registration occupies this server's namespace. Roll back so the model
        // sees either the full generation or none of it — never a partial set.
        for (const dispose of disposers.values())
            dispose();
        ctx.logger.error(`mcp-client(${opts.serverName}): tool registration failed, no tools registered: ${String(error)}`);
        if (opts.registrationFailure === 'throw')
            throw error;
        return new Map();
    }
    return disposers;
}
/** Keep a supported advertised schema; unsupported MCP vocabulary falls back to JsonValue. */
function supportedOutputSchema(candidate) {
    if (candidate === undefined)
        return undefined;
    try {
        assertSupportedJsonSchema(candidate);
        return candidate;
    }
    catch {
        return undefined;
    }
}
/**
 * Build one generation-local tool definition and its execution-local rich projections.
 * @param client - connected MCP client used for calls.
 * @param ctx - plugin context carrying optional attachment and model services.
 * @param publicName - registry-qualified public tool name.
 * @param rawName - MCP wire tool name.
 * @param description - model-facing tool description.
 * @param parameters - MCP input schema.
 * @param structuredSchema - supported structured-output schema, when advertised.
 * @param taskRequired - whether this MCP tool requires unsupported task execution.
 * @param opts - bridge timeout and namespace options.
 * @returns a complete ToolRuntime definition.
 */
function createDefinition(client, ctx, publicName, rawName, description, parameters, structuredSchema, taskRequired, opts) {
    const projections = new WeakMap();
    return {
        name: publicName,
        description,
        parameters,
        output: createOutput(rawName, structuredSchema),
        execute: createExecutor(client, ctx, rawName, taskRequired, opts, projections),
        finalizeContent(exec, result) {
            const projection = projections.get(exec);
            if (projection === undefined)
                return undefined;
            projections.delete(exec);
            if (result.isError)
                return undefined;
            if (!isDeepStrictEqual(result.value, projection.value))
                return undefined;
            if (!isDeepStrictEqual(result.content, projection.fallback))
                return undefined;
            return projection.content;
        },
    };
}
/** Build the canonical result schema and existing Native text projection. */
function createOutput(rawName, structuredSchema) {
    return {
        schema: {
            type: 'object',
            properties: {
                content: { type: 'array', items: {} },
                structuredContent: structuredSchema ?? {},
            },
            required: structuredSchema === undefined ? ['content'] : ['content', 'structuredContent'],
            additionalProperties: false,
        },
        render(_args, value) {
            const result = value;
            return [{ type: 'text', text: extractText(result.content, rawName) }];
        },
    };
}
/**
 * Create an execute function for one MCP tool. The executor closes over the
 * raw MCP tool name and sends an uncached `tools/call` request with it (never
 * the public name), with abort signal and timeout, then maps the result to
 * harness ContentBlocks. Owning the raw request prevents the SDK's internal
 * per-page schema cache from pre-validating a different contract.
 *
 * When the MCP server returns `isError: true`, the executor throws so that
 * the ToolRuntime's catch path produces an `isError` result for the model.
 */
function createExecutor(client, ctx, rawName, taskRequired, opts, projections) {
    return async (args, exec) => {
        if (taskRequired) {
            throw new Error(`Tool "${rawName}" requires task-based execution, which this bridge does not support`);
        }
        // The agent loop passes `JSON.parse(model_arguments)` which is usually an
        // object, but can be any JSON value if the model misbehaves (outputs a bare
        // string/number/null). Fallback to {} lets the MCP server produce a
        // specific "missing required param" error the model can learn from.
        const argsObj = (typeof args === 'object' && args !== null ? args : {});
        const result = await callToolUncached(client, rawName, argsObj, exec, opts);
        // The SDK may return a legacy `toolResult` shape; normalize to content array.
        if (!Array.isArray(result.content)) {
            const rendered = 'toolResult' in result
                ? JSON.stringify(result.toolResult)
                : '(no output)';
            const text = typeof rendered === 'string' ? rendered : '(no output)';
            if (result.isError === true)
                throw new Error(text);
            return {
                content: [{ type: 'text', text }],
                ...result.structuredContent !== undefined
                    ? { structuredContent: result.structuredContent }
                    : {},
            };
        }
        // Trust boundary: the SDK's return type erases to `any[]` due to the
        // union of CallToolResult | CompatibilityCallToolResult; extractText
        // validates each element.
        const content = result.content;
        const text = extractText(content, rawName);
        // MCP isError → throw so ToolRuntime produces an isError result for the model.
        if (result.isError === true) {
            throw new Error(text);
        }
        const value = {
            content,
            ...result.structuredContent !== undefined
                ? { structuredContent: result.structuredContent }
                : {},
        };
        if (containsImage(content)) {
            const fallback = [{ type: 'text', text: extractText(content, rawName) }];
            const projected = await prepareImageProjection(ctx, exec, content, rawName);
            projections.set(exec, { value, fallback, content: projected });
        }
        return value;
    };
}
/** Whether an untrusted MCP content array contains a declared image block. */
function containsImage(content) {
    return content.some(value => isRecord(value) && value.type === 'image');
}
/** Narrow one JSON value to a string-keyed object. */
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/** Narrow a declared MIME string to the durable image vocabulary. */
function isImageMediaType(value) {
    return IMAGE_MEDIA_TYPES.includes(value);
}
/** Decode one untrusted MCP image block without accepting base64 aliases. */
function decodeImage(block) {
    if (block.mimeType === undefined || !isImageMediaType(block.mimeType)) {
        throw new Error('the declared media type is not PNG, JPEG, WebP, or GIF');
    }
    if (block.data === undefined || !CANONICAL_BASE64.test(block.data)) {
        throw new Error('the image data is not canonical base64');
    }
    const data = Buffer.from(block.data, 'base64');
    if (data.toString('base64') !== block.data) {
        throw new Error('the image data is not canonical base64');
    }
    return { data, mediaType: block.mimeType };
}
/**
 * Resolve the active model route and durable store for an image-bearing result.
 * @param ctx - plugin context with optional services.
 * @param exec - exact tool execution whose agent supplies the latest route.
 * @returns the attachment store after exact positive image-capability proof.
 */
async function resolveImageAdmission(ctx, exec) {
    const attachments = ctx.get('attachments');
    if (attachments === undefined)
        throw new Error('no attachment store is mounted');
    const routed = exec.agent?.session.requestHeader()?.config;
    const provider = routed?.provider ?? exec.agent?.options.provider;
    const model = routed?.model ?? exec.agent?.options.model;
    const llm = ctx.get('llm');
    if (provider === undefined || model === undefined || llm === undefined) {
        throw new Error('the current model route could not be resolved');
    }
    let info;
    try {
        info = await llm.resolveModelInfo(provider, model, exec.signal);
    }
    catch {
        throw new Error('the current model route could not be verified');
    }
    if (info.inputModalities === undefined || !info.inputModalities.includes('image')) {
        throw new Error(`model "${model}" does not declare image input`);
    }
    if (exec.signal.aborted)
        throw new Error('the tool call was canceled before image storage');
    return attachments;
}
/** Stable diagnostic text for an image block that was not admitted. */
function imageDiagnostic(block, reason) {
    const mediaType = block.mimeType ?? 'unknown media type';
    return `[image unavailable: ${mediaType}; ${reason}; raw image data remains available to programmatic callers]`;
}
/**
 * Decode, preflight, and durably save one MCP result's ordered image batch.
 * Any refusal projects every image as text while retaining the canonical raw
 * value for programmatic callers.
 */
async function prepareImageProjection(ctx, exec, content, toolName) {
    const decoded = [];
    const validationErrors = new Map();
    const imageIndexes = [];
    for (const [index, value] of content.entries()) {
        if (!isRecord(value) || value.type !== 'image')
            continue;
        imageIndexes.push(index);
        try {
            decoded.push(decodeImage(value));
        }
        catch (error) {
            // decodeImage owns every throw above and always produces Error.
            validationErrors.set(index, error.message);
        }
    }
    if (validationErrors.size > 0) {
        return projectContent(content, toolName, (block, index) => ({
            type: 'text',
            text: imageDiagnostic(block, validationErrors.get(index) ?? 'another image in the same result was invalid'),
        }));
    }
    let attachments;
    try {
        attachments = await resolveImageAdmission(ctx, exec);
    }
    catch (error) {
        // resolveImageAdmission contains provider failures and throws Error only.
        const reason = error.message;
        return projectContent(content, toolName, block => ({ type: 'text', text: imageDiagnostic(block, reason) }));
    }
    try {
        const refs = await attachments.saveImages(decoded);
        const byIndex = new Map(imageIndexes.map((index, offset) => [index, refs[offset]]));
        return projectContent(content, toolName, (_block, index) => ({
            type: 'image',
            attachment: byIndex.get(index),
        }));
    }
    catch (error) {
        const reason = isImageAdmissionError(error)
            ? `image admission rejected the result: ${error.message}`
            : 'durable image storage rejected the result';
        return projectContent(content, toolName, block => ({
            type: 'text',
            text: imageDiagnostic(block, reason),
        }));
    }
}
/**
 * Extract text from an MCP content array into a single string.
 * - text blocks: join with '\n'
 * - image/audio/resource blocks: replaced with a placeholder
 *
 * Defensive: fields that the MCP spec declares required (mimeType, text) are
 * guarded with fallbacks because this is a network trust boundary.
 */
function extractText(mcpContent, toolName) {
    const content = projectContent(mcpContent, toolName);
    // The default image projector below also returns text, so this local call
    // cannot produce a core image block.
    return content.map(block => block.text).join('\n');
}
/**
 * Project ordered MCP blocks into the core content vocabulary.
 * Text-like runs are newline-coalesced; admitted images split those runs at
 * their original position.
 */
function projectContent(mcpContent, toolName, image = block => ({
    type: 'text',
    text: imageDiagnostic(block, 'this result was not admitted to durable model context'),
})) {
    const projected = [];
    const text = [];
    const flushText = () => {
        if (text.length === 0)
            return;
        projected.push({ type: 'text', text: text.splice(0).join('\n') });
    };
    for (const [index, value] of mcpContent.entries()) {
        if (!isRecord(value)) {
            text.push('[unsupported MCP content block: expected an object]');
            continue;
        }
        const block = value;
        switch (block.type) {
            case 'text':
                if (block.text !== undefined)
                    text.push(block.text);
                break;
            case 'image':
                flushText();
                projected.push(image(block, index));
                break;
            case 'resource_link':
                if (block.name === undefined || block.uri === undefined) {
                    text.push('[resource link unavailable: the MCP block is missing its name or URI]');
                }
                else {
                    text.push(`Resource link: ${block.name} (${block.uri})`);
                }
                break;
            case 'audio':
                text.push(`[audio result unsupported: ${block.mimeType ?? 'unknown media type'}; raw audio data remains available to programmatic callers]`);
                break;
            case 'resource':
                text.push('[embedded resource unsupported; raw resource data remains available to programmatic callers]');
                break;
            default:
                text.push(`[unsupported MCP content type: ${block.type}]`);
        }
    }
    flushText();
    return projected.length > 0
        ? projected
        : [{ type: 'text', text: `(${toolName} returned no model-visible content)` }];
}
//# sourceMappingURL=tools.js.map