/** Browser-side catalog for the Inspector Client bundle and its source map. */
import { bytesToBase64 } from '@deepseek-ai/dsh-util-crypto';
import { inspectorId } from "../../shared/identity.js";
const PACKAGE_ID = '@deepseek-ai/dsh-experimental-inspector';
const CLIENT_SCRIPT_KEY = inspectorId('client-bundle', 'scriptKey');
/**
 * Describe browser-side source access.
 * @param available - Whether the Client bundle was discovered.
 * @returns The Sources capability when this Client discovered its bundle.
 */
export function sourcesBridgeCapability(available) {
    return available ? { type: 'client-sources' } : undefined;
}
/** Deliberate error serialized by the Client source transport. */
export class ClientSourceCatalogError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
/** Executes bounded, read-only operations over Client script assets. */
export class ClientSourceCatalog {
    assets = new Map();
    constructor(assets) {
        for (const asset of assets) {
            if (this.assets.has(asset.scriptKey)) {
                throw new Error(`inspector: duplicate Client script key ${asset.scriptKey}`);
            }
            this.assets.set(asset.scriptKey, { asset });
        }
    }
    /**
     * Resolve a stack-frame URL to this catalog's local script key.
     * @param url - Absolute or page-relative stack-frame URL.
     * @returns The matching script key when the URL belongs to this catalog.
     */
    scriptKeyForUrl(url) {
        const normalized = normalizedUrl(url);
        for (const entry of this.assets.values()) {
            if (normalizedUrl(entry.asset.url) === normalized)
                return entry.asset.scriptKey;
        }
        return undefined;
    }
    /**
     * Execute one validated source operation.
     * @param command - Read-only catalog command.
     * @param maxContentBytes - Maximum encoded bytes admitted for one asset.
     * @returns Script metadata or one bounded content chunk.
     */
    async execute(command, maxContentBytes) {
        if (command.op === 'list-scripts') {
            return {
                op: command.op,
                scripts: await Promise.all([...this.assets.values()].map(async (entry) => this.describe(entry, maxContentBytes))),
            };
        }
        const entry = this.assets.get(command.scriptKey);
        if (entry === undefined)
            throw new ClientSourceCatalogError('script-not-found', 'Client script is not available');
        const bytes = command.content === 'source'
            ? await this.sourceBytes(entry, maxContentBytes)
            : await this.sourceMapBytes(entry, maxContentBytes);
        if (bytes === undefined) {
            return {
                op: command.op,
                scriptKey: command.scriptKey,
                content: command.content,
                available: false,
            };
        }
        if (command.offset > bytes.byteLength) {
            throw new ClientSourceCatalogError('invalid-request', 'Client source chunk offset exceeds content length');
        }
        const nextOffset = Math.min(bytes.byteLength, command.offset + command.maxBytes);
        return {
            op: command.op,
            scriptKey: command.scriptKey,
            content: command.content,
            available: true,
            offset: command.offset,
            nextOffset,
            data: bytesToBase64(bytes.subarray(command.offset, nextOffset)),
            eof: nextOffset === bytes.byteLength,
        };
    }
    async describe(entry, maxContentBytes) {
        const source = await this.source(entry, maxContentBytes);
        const newline = source.lastIndexOf('\n');
        return {
            scriptKey: entry.asset.scriptKey,
            url: entry.asset.url,
            hash: entry.asset.hash,
            buildId: '',
            ...(entry.asset.sourceMapUrl === undefined ? {} : { sourceMapUrl: entry.asset.sourceMapUrl }),
            startLine: 0,
            startColumn: 0,
            endLine: countNewlines(source),
            endColumn: newline === -1 ? source.length : source.length - newline - 1,
            ...(entry.asset.isModule === undefined ? {} : { isModule: entry.asset.isModule }),
            length: source.length,
        };
    }
    source(entry, maxContentBytes) {
        entry.source ??= entry.asset.loadSource().catch((error) => {
            throw new ClientSourceCatalogError('load-failed', `Cannot load Client script: ${renderError(error)}`);
        });
        return entry.source.then((source) => {
            if (new TextEncoder().encode(source).byteLength > maxContentBytes) {
                throw new ClientSourceCatalogError('result-too-large', 'Client script exceeds the configured content limit');
            }
            return source;
        });
    }
    sourceBytes(entry, maxContentBytes) {
        entry.sourceBytes ??= this.source(entry, maxContentBytes).then(source => new TextEncoder().encode(source));
        return entry.sourceBytes;
    }
    sourceMapBytes(entry, maxContentBytes) {
        if (entry.asset.loadSourceMap === undefined)
            return Promise.resolve(undefined);
        entry.sourceMapBytes ??= entry.asset.loadSourceMap().then(value => value === undefined ? undefined : new TextEncoder().encode(value)).catch((error) => {
            throw new ClientSourceCatalogError('load-failed', `Cannot load Client source map: ${renderError(error)}`);
        });
        return entry.sourceMapBytes.then((bytes) => {
            if (bytes !== undefined && bytes.byteLength > maxContentBytes) {
                throw new ClientSourceCatalogError('result-too-large', 'Client source map exceeds the configured content limit');
            }
            return bytes;
        });
    }
}
/**
 * Discover this package's bundle URL from the Host-injected web boot graph.
 * @returns A lazy catalog, or `undefined` outside the assembled web application.
 */
export function discoverInspectorClientSourceCatalog() {
    const graph = Reflect.get(globalThis, '__DSH_BOOT__');
    if (typeof graph !== 'object' || graph === null)
        return undefined;
    const entries = Reflect.get(graph, 'entries');
    if (!Array.isArray(entries))
        return undefined;
    const row = entries.find((value) => {
        if (typeof value !== 'object' || value === null)
            return false;
        return Reflect.get(value, 'id') === PACKAGE_ID;
    });
    if (row === undefined || typeof row.url !== 'string' || typeof row.rev !== 'string')
        return undefined;
    const base = browserLocation();
    if (base === undefined)
        return undefined;
    const sourceUrl = new URL(row.url, base);
    const sourceMapUrl = new URL(sourceUrl.href);
    sourceMapUrl.pathname = `${sourceMapUrl.pathname}.map`;
    return new ClientSourceCatalog([{
            scriptKey: CLIENT_SCRIPT_KEY,
            url: sourceUrl.href,
            hash: row.rev,
            sourceMapUrl: sourceMapUrl.href,
            isModule: false,
            loadSource: async () => fetchText(sourceUrl.href),
            loadSourceMap: async () => fetchText(sourceMapUrl.href),
        }]);
}
async function fetchText(url) {
    const response = await fetch(url);
    if (!response.ok)
        throw new Error(`${String(response.status)} ${response.statusText}`);
    return response.text();
}
function browserLocation() {
    const location = Reflect.get(globalThis, 'location');
    if (typeof location !== 'object' || location === null)
        return undefined;
    const href = Reflect.get(location, 'href');
    return typeof href === 'string' ? href : undefined;
}
function countNewlines(value) {
    let count = 0;
    for (let index = 0; index < value.length; index++) {
        if (value.charCodeAt(index) === 10)
            count++;
    }
    return count;
}
function renderError(error) {
    return error instanceof Error ? error.message : String(error);
}
function normalizedUrl(value) {
    try {
        const url = new URL(value, browserLocation());
        url.hash = '';
        return url.href;
    }
    catch {
        return value;
    }
}
//# sourceMappingURL=sources.js.map