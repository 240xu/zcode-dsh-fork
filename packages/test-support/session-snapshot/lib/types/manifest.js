/** Parse and validate one recorded-session snapshot manifest. */
import { isAbsolute } from 'node:path';
import * as yaml from 'js-yaml';
const PROFILES = new Set(['headless', 'sdk', 'acp', 'web']);
const RECORDINGS = new Set(['live', 'authored']);
const PLATFORMS = new Set(['posix', 'pwsh']);
const PERMISSIONS = new Set(['read-only', 'workspace-write', 'danger-full-access']);
const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function record(value, label) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`${label} must be a mapping`);
    }
    return value;
}
function exactKeys(value, allowed, label) {
    const unknown = Object.keys(value).filter(key => !allowed.includes(key)).sort();
    if (unknown.length > 0)
        throw new Error(`${label} has unknown field(s): ${unknown.join(', ')}`);
}
function name(value, label) {
    if (typeof value !== 'string' || !NAME_RE.test(value)) {
        throw new Error(`${label} must be a lower-kebab-case name`);
    }
    return value;
}
function scenarioSource(value, label) {
    if (typeof value !== 'string' || !value.split('/').every(segment => NAME_RE.test(segment))) {
        throw new Error(`${label} must be a lower-kebab-case name or corpus-relative path`);
    }
    return value;
}
function positiveIndexes(value, label) {
    if (!Array.isArray(value)
        || value.some(item => !Number.isInteger(item) || Number(item) < 1)
        || new Set(value).size !== value.length) {
        throw new Error(`${label} must be an array of unique positive integers`);
    }
    return [...value];
}
/**
 * Parse one `snapshot.yml` without admitting JavaScript YAML tags or unknown fields.
 * @param source - complete manifest text.
 * @param path - diagnostic path.
 * @returns validated manifest metadata.
 */
export function parseSnapshotManifest(source, path = 'snapshot.yml') {
    let parsed;
    try {
        parsed = yaml.load(source, { schema: yaml.JSON_SCHEMA });
    }
    catch (error) {
        throw new Error(`session-snapshot: ${path}: invalid YAML: ${String(error)}`);
    }
    try {
        const root = record(parsed, 'manifest');
        exactKeys(root, [
            'version',
            'scenario',
            'profile',
            'composition',
            'recording',
            'header',
            'replay',
            'platform',
            'permission',
            'environment',
            'workspace',
            'input',
            'session',
        ], 'manifest');
        if (root.version !== 1)
            throw new Error('manifest.version must equal 1');
        const scenario = root.scenario === undefined ? undefined : name(root.scenario, 'manifest.scenario');
        if (typeof root.profile !== 'string' || !PROFILES.has(root.profile)) {
            throw new Error('manifest.profile must be headless, sdk, acp, or web');
        }
        const composition = root.composition === undefined
            ? undefined
            : name(root.composition, 'manifest.composition');
        let recording;
        if (root.recording !== undefined) {
            if (typeof root.recording !== 'string' || !RECORDINGS.has(root.recording)) {
                throw new Error('manifest.recording must be live or authored');
            }
            recording = root.recording;
        }
        let header;
        if (root.header !== undefined) {
            const value = record(root.header, 'manifest.header');
            exactKeys(value, [
                'class',
                'pin',
                'systemPromptSource',
                'toolSchemasSource',
                'childSystemPrompts',
                'childToolSchemas',
                'changes',
            ], 'manifest.header');
            if (value.pin !== undefined && value.pin !== true) {
                throw new Error('manifest.header.pin must equal true when present');
            }
            if (value.changes !== undefined && (!Number.isInteger(value.changes) || Number(value.changes) < 0)) {
                throw new Error('manifest.header.changes must be a non-negative integer');
            }
            header = {
                class: name(value.class, 'manifest.header.class'),
                ...(value.pin === true ? { pin: true } : {}),
                ...(value.systemPromptSource === undefined
                    ? {}
                    : { systemPromptSource: scenarioSource(value.systemPromptSource, 'manifest.header.systemPromptSource') }),
                ...(value.toolSchemasSource === undefined
                    ? {}
                    : { toolSchemasSource: scenarioSource(value.toolSchemasSource, 'manifest.header.toolSchemasSource') }),
                ...(value.childSystemPrompts === undefined
                    ? {}
                    : { childSystemPrompts: positiveIndexes(value.childSystemPrompts, 'manifest.header.childSystemPrompts') }),
                ...(value.childToolSchemas === undefined
                    ? {}
                    : { childToolSchemas: positiveIndexes(value.childToolSchemas, 'manifest.header.childToolSchemas') }),
                ...(value.changes === undefined ? {} : { changes: Number(value.changes) }),
            };
        }
        let replay;
        if (root.replay !== undefined) {
            const value = record(root.replay, 'manifest.replay');
            exactKeys(value, ['override'], 'manifest.replay');
            if (value.override !== true)
                throw new Error('manifest.replay.override must equal true');
            replay = { override: true };
        }
        let platform;
        if (root.platform !== undefined) {
            if (typeof root.platform !== 'string' || !PLATFORMS.has(root.platform)) {
                throw new Error('manifest.platform must be posix or pwsh');
            }
            platform = root.platform;
        }
        let permission;
        if (root.permission !== undefined) {
            if (typeof root.permission !== 'string' || !PERMISSIONS.has(root.permission)) {
                throw new Error('manifest.permission must be read-only, workspace-write, or danger-full-access');
            }
            permission = root.permission;
        }
        let environment;
        if (root.environment !== undefined) {
            const value = record(root.environment, 'manifest.environment');
            if (Object.entries(value).some(([key, item]) => !/^[A-Z][A-Z0-9_]*$/.test(key) || typeof item !== 'string')) {
                throw new Error('manifest.environment must map uppercase environment names to strings');
            }
            environment = value;
        }
        let workspace;
        if (root.workspace !== undefined) {
            const value = record(root.workspace, 'manifest.workspace');
            exactKeys(value, ['setup', 'final', 'parent'], 'manifest.workspace');
            if (value.final !== undefined && value.final !== true) {
                throw new Error('manifest.workspace.final must equal true when present');
            }
            if (value.parent !== undefined && value.parent !== 'home') {
                throw new Error('manifest.workspace.parent must equal home');
            }
            workspace = {
                ...(value.setup === undefined ? {} : { setup: name(value.setup, 'manifest.workspace.setup') }),
                ...(value.final === true ? { final: true } : {}),
                ...(value.parent === 'home' ? { parent: 'home' } : {}),
            };
            if (Object.keys(workspace).length === 0)
                throw new Error('manifest.workspace must not be empty');
        }
        let input;
        if (root.input !== undefined) {
            const value = record(root.input, 'manifest.input');
            exactKeys(value, ['task', 'attachments'], 'manifest.input');
            if (value.task !== undefined && (typeof value.task !== 'string' || value.task.trim() === '')) {
                throw new Error('manifest.input.task must be a non-empty string when present');
            }
            let attachments;
            if (value.attachments !== undefined) {
                if (!Array.isArray(value.attachments) || value.attachments.length === 0) {
                    throw new Error('manifest.input.attachments must be a non-empty array');
                }
                attachments = value.attachments.map((item, index) => {
                    const attachment = record(item, `manifest.input.attachments[${index}]`);
                    exactKeys(attachment, ['id', 'mediaType', 'data'], `manifest.input.attachments[${index}]`);
                    if (typeof attachment.id !== 'string' || !attachment.id.startsWith('sha256:')) {
                        throw new Error(`manifest.input.attachments[${index}].id must start with sha256:`);
                    }
                    if (typeof attachment.mediaType !== 'string' || !attachment.mediaType.includes('/')) {
                        throw new Error(`manifest.input.attachments[${index}].mediaType must be a MIME type`);
                    }
                    if (typeof attachment.data !== 'string' || attachment.data.length === 0) {
                        throw new Error(`manifest.input.attachments[${index}].data must be non-empty base64`);
                    }
                    return { id: attachment.id, mediaType: attachment.mediaType, data: attachment.data };
                });
                if (new Set(attachments.map(attachment => attachment.id)).size !== attachments.length) {
                    throw new Error('manifest.input.attachments must have unique ids');
                }
            }
            if (value.task === undefined && attachments === undefined) {
                throw new Error('manifest.input must declare task or attachments');
            }
            input = {
                ...(value.task === undefined ? {} : { task: value.task }),
                ...(attachments === undefined ? {} : { attachments }),
            };
        }
        let session;
        if (root.session !== undefined) {
            const value = record(root.session, 'manifest.session');
            exactKeys(value, ['source'], 'manifest.session');
            if (typeof value.source !== 'string' || value.source.trim() === '') {
                throw new Error('manifest.session.source must be a non-empty string');
            }
            if (isAbsolute(value.source) || value.source.includes('\\') || value.source.includes('\0')) {
                throw new Error('manifest.session.source must be a relative POSIX path');
            }
            session = { source: value.source };
        }
        return {
            version: 1,
            ...(scenario === undefined ? {} : { scenario }),
            profile: root.profile,
            ...(composition === undefined ? {} : { composition }),
            ...(recording === undefined ? {} : { recording }),
            ...(header === undefined ? {} : { header }),
            ...(replay === undefined ? {} : { replay }),
            ...(platform === undefined ? {} : { platform }),
            ...(permission === undefined ? {} : { permission }),
            ...(environment === undefined ? {} : { environment }),
            ...(workspace === undefined ? {} : { workspace }),
            ...(input === undefined ? {} : { input }),
            ...(session === undefined ? {} : { session }),
        };
    }
    catch (error) {
        /* v8 ignore next -- every parser and validator above throws Error instances. */
        throw new Error(`session-snapshot: ${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
}
//# sourceMappingURL=manifest.js.map