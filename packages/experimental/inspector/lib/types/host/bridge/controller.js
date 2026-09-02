/** Host controller that owns the Inspector Worker and Host observation source. */
import { randomBytes, randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { MessageChannel, Worker } from 'node:worker_threads';
import { INSPECTOR_PROTOCOL_VERSION } from "../../shared/bridge/version.js";
import { installFetchObserver, NETWORK_TOPICS } from "../inspection/network.js";
import { HostInspectorSource } from "./transport.js";
import { InspectorWorkerLifecycle } from "./lifecycle.js";
const DEFAULT_MAX_REQUEST_BODY_BYTES = 8 * 1024 * 1024;
const DEFAULT_MAX_RESPONSE_BODY_BYTES = 32 * 1024 * 1024;
const DEFAULT_MAX_BODY_CHUNK_BYTES = 48 * 1024;
const DEFAULT_MAX_JOURNAL_BYTES = 256 * 1024 * 1024;
const DEFAULT_MAX_RETAINED_REQUESTS = 2_000;
const DEFAULT_MAX_SOURCE_FRAME_BYTES = 128 * 1024;
const DEFAULT_MAX_SOURCE_RECORDS_PER_FRAME = 128;
const DEFAULT_MAX_QUEUED_RECORDS = 2_048;
const DEFAULT_MAX_QUEUED_BYTES = 16 * 1024 * 1024;
const DEFAULT_STARTUP_TIMEOUT_MS = 10_000;
const DEFAULT_STOP_TIMEOUT_MS = 5_000;
const DEFAULT_CLIENT_RECONNECT_BASE_MS = 250;
const DEFAULT_CLIENT_RECONNECT_MAX_MS = 5_000;
const DEFAULT_CLIENT_RUNTIME_TIMEOUT_MS = 30_000;
const DEFAULT_QUERY_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_CLIENT_RUNTIME_OBJECTS = 10_000;
const DEFAULT_MAX_CLIENT_RUNTIME_PROPERTIES = 2_000;
const DEFAULT_MAX_CLIENT_SOURCE_BYTES = 8 * 1024 * 1024;
const DEFAULT_MAX_CORDIS_NODES = 2_048;
const DEFAULT_MAX_DISCONNECTED_CORDIS_TREES = 8;
/**
 * Resolve and validate all deployment-varying Inspector choices.
 * @param options - Partial caller configuration.
 * @returns A complete immutable configuration.
 */
export function resolveInspectorOptions(options = {}) {
    const spec = {
        host: options.host ?? '127.0.0.1',
        port: natural(options.port ?? 0, 'port', true),
        clientOrigins: [...(options.clientOrigins ?? [])],
        captureFetch: options.captureFetch ?? true,
        maxRequestBodyBytes: natural(options.maxRequestBodyBytes ?? DEFAULT_MAX_REQUEST_BODY_BYTES, 'maxRequestBodyBytes'),
        maxResponseBodyBytes: natural(options.maxResponseBodyBytes ?? DEFAULT_MAX_RESPONSE_BODY_BYTES, 'maxResponseBodyBytes'),
        maxBodyChunkBytes: natural(options.maxBodyChunkBytes ?? DEFAULT_MAX_BODY_CHUNK_BYTES, 'maxBodyChunkBytes'),
        maxJournalBytes: natural(options.maxJournalBytes ?? DEFAULT_MAX_JOURNAL_BYTES, 'maxJournalBytes'),
        maxRetainedRequests: natural(options.maxRetainedRequests ?? DEFAULT_MAX_RETAINED_REQUESTS, 'maxRetainedRequests'),
        maxSourceFrameBytes: natural(options.maxSourceFrameBytes ?? DEFAULT_MAX_SOURCE_FRAME_BYTES, 'maxSourceFrameBytes'),
        maxSourceRecordsPerFrame: natural(options.maxSourceRecordsPerFrame ?? DEFAULT_MAX_SOURCE_RECORDS_PER_FRAME, 'maxSourceRecordsPerFrame'),
        maxQueuedRecords: natural(options.maxQueuedRecords ?? DEFAULT_MAX_QUEUED_RECORDS, 'maxQueuedRecords'),
        maxQueuedBytes: natural(options.maxQueuedBytes ?? DEFAULT_MAX_QUEUED_BYTES, 'maxQueuedBytes'),
        startupTimeoutMs: natural(options.startupTimeoutMs ?? DEFAULT_STARTUP_TIMEOUT_MS, 'startupTimeoutMs'),
        stopTimeoutMs: natural(options.stopTimeoutMs ?? DEFAULT_STOP_TIMEOUT_MS, 'stopTimeoutMs'),
        clientReconnectBaseMs: natural(options.clientReconnectBaseMs ?? DEFAULT_CLIENT_RECONNECT_BASE_MS, 'clientReconnectBaseMs'),
        clientReconnectMaxMs: natural(options.clientReconnectMaxMs ?? DEFAULT_CLIENT_RECONNECT_MAX_MS, 'clientReconnectMaxMs'),
        clientRuntimeTimeoutMs: natural(options.clientRuntimeTimeoutMs ?? DEFAULT_CLIENT_RUNTIME_TIMEOUT_MS, 'clientRuntimeTimeoutMs'),
        queryTimeoutMs: natural(options.queryTimeoutMs ?? DEFAULT_QUERY_TIMEOUT_MS, 'queryTimeoutMs'),
        maxClientRuntimeObjects: natural(options.maxClientRuntimeObjects ?? DEFAULT_MAX_CLIENT_RUNTIME_OBJECTS, 'maxClientRuntimeObjects'),
        maxClientRuntimeProperties: natural(options.maxClientRuntimeProperties ?? DEFAULT_MAX_CLIENT_RUNTIME_PROPERTIES, 'maxClientRuntimeProperties'),
        maxClientSourceBytes: natural(options.maxClientSourceBytes ?? DEFAULT_MAX_CLIENT_SOURCE_BYTES, 'maxClientSourceBytes'),
        maxCordisNodes: natural(options.maxCordisNodes ?? DEFAULT_MAX_CORDIS_NODES, 'maxCordisNodes'),
        maxDisconnectedCordisTrees: natural(options.maxDisconnectedCordisTrees ?? DEFAULT_MAX_DISCONNECTED_CORDIS_TREES, 'maxDisconnectedCordisTrees', true),
    };
    if (spec.port > 65_535)
        throw new Error('inspector: port must not exceed 65535');
    const largestEncodedChunk = Math.ceil(spec.maxBodyChunkBytes / 3) * 4 + 4_096;
    if (largestEncodedChunk > spec.maxSourceFrameBytes) {
        throw new Error('inspector: maxSourceFrameBytes cannot carry one base64 body chunk');
    }
    if (spec.clientReconnectMaxMs < spec.clientReconnectBaseMs) {
        throw new Error('inspector: clientReconnectMaxMs must be at least clientReconnectBaseMs');
    }
    for (const origin of spec.clientOrigins) {
        if (new URL(origin).origin !== origin)
            throw new Error(`inspector: client origin must be canonical: ${origin}`);
    }
    return spec;
}
/**
 * Start the Worker, create the Host source, and install full fetch capture by default.
 * @param options - Partial caller configuration.
 * @returns The ready endpoint and its quiescent shutdown handle.
 */
export async function startInspector(options = {}) {
    const spec = resolveInspectorOptions(options);
    const channel = new MessageChannel();
    const clientProtocol = `dsh-inspector-v${String(INSPECTOR_PROTOCOL_VERSION)}-${randomBytes(32).toString('base64url')}`;
    const config = {
        host: spec.host,
        startPort: spec.port,
        targetId: randomUUID(),
        clientToken: clientProtocol,
        clientOrigins: spec.clientOrigins,
        maxSourceFrameBytes: spec.maxSourceFrameBytes,
        maxSourceRecordsPerFrame: spec.maxSourceRecordsPerFrame,
        maxRetainedRequests: spec.maxRetainedRequests,
        maxJournalBytes: spec.maxJournalBytes,
        clientRuntimeTimeoutMs: spec.clientRuntimeTimeoutMs,
        maxClientSourceBytes: spec.maxClientSourceBytes,
        maxCordisNodes: spec.maxCordisNodes,
        maxDisconnectedCordisTrees: spec.maxDisconnectedCordisTrees,
    };
    const boot = { config, hostSourcePort: channel.port2 };
    const worker = spawnWorker(boot);
    const lifecycle = new InspectorWorkerLifecycle(worker);
    let source;
    try {
        source = new HostInspectorSource(channel.port1, {
            label: 'Host',
            topics: ['*', ...NETWORK_TOPICS],
            maxQueuedRecords: spec.maxQueuedRecords,
            maxQueuedBytes: spec.maxQueuedBytes,
            maxRecordsPerFrame: spec.maxSourceRecordsPerFrame,
            maxFrameBytes: spec.maxSourceFrameBytes,
            queryTimeoutMs: spec.queryTimeoutMs,
        });
    }
    catch (error) {
        channel.port1.close();
        await lifecycle.terminate();
        throw error;
    }
    const ready = await lifecycle.waitForReady(spec.startupTimeoutMs).catch(async (error) => {
        source.close();
        await lifecycle.terminate();
        throw error;
    });
    const authority = `${ready.host}:${String(ready.port)}`;
    const endpoint = {
        httpUrl: `http://${authority}/`,
        webSocketDebuggerUrl: `ws://${authority}/devtools/page/${ready.targetId}`,
        devtoolsFrontendUrl: `devtools://devtools/bundled/devtools_app.html?ws=${authority}/devtools/page/${ready.targetId}&panel=elements&noJavaScriptCompletion=true`,
        client: {
            endpoint: `ws://${authority}/ingest`,
            protocol: clientProtocol,
            maxQueuedRecords: spec.maxQueuedRecords,
            maxQueuedBytes: spec.maxQueuedBytes,
            maxRecordsPerFrame: spec.maxSourceRecordsPerFrame,
            maxFrameBytes: spec.maxSourceFrameBytes,
            reconnectBaseMs: spec.clientReconnectBaseMs,
            reconnectMaxMs: spec.clientReconnectMaxMs,
            queryTimeoutMs: spec.queryTimeoutMs,
            maxRuntimeObjectsPerSession: spec.maxClientRuntimeObjects,
            maxRuntimePropertiesPerResult: spec.maxClientRuntimeProperties,
            maxClientSourceBytes: spec.maxClientSourceBytes,
            maxCordisNodes: spec.maxCordisNodes,
        },
    };
    let fetchObserver;
    try {
        fetchObserver = spec.captureFetch
            ? installFetchObserver(source, {
                maxRequestBodyBytes: spec.maxRequestBodyBytes,
                maxResponseBodyBytes: spec.maxResponseBodyBytes,
                maxChunkBytes: spec.maxBodyChunkBytes,
            })
            : undefined;
    }
    catch (error) {
        source.close();
        await lifecycle.terminate();
        throw error;
    }
    lifecycle.markRunning((error) => {
        try {
            source.close();
        }
        catch (closeError) {
            console.error('dsh inspector: Host source cleanup after Worker failure failed', closeError);
        }
        void fetchObserver?.stop().catch((stopError) => {
            console.error('dsh inspector: fetch cleanup after Worker failure failed', stopError);
        });
        console.error('dsh inspector: Worker stopped unexpectedly', error);
    });
    let closing;
    return {
        endpoint,
        source,
        close() {
            closing ??= closeInspector(lifecycle, source, fetchObserver, spec.stopTimeoutMs);
            return closing;
        },
    };
}
function spawnWorker(boot) {
    const options = {
        workerData: boot,
        transferList: [boot.hostSourcePort],
        execArgv: [],
    };
    if (!import.meta.url.endsWith('.ts')) {
        return new Worker(new URL('./worker.js', import.meta.url), options);
    }
    const workerEntry = new URL('../../worker/entry.ts', import.meta.url);
    const tsxEsmApiEntry = import.meta.resolve('tsx/esm/api');
    const bootstrap = [
        `import { register } from ${JSON.stringify(tsxEsmApiEntry)}`,
        'register()',
        `await import(${JSON.stringify(workerEntry.href)})`,
    ].join('\n');
    return new Worker(new URL(`data:text/javascript,${encodeURIComponent(bootstrap)}`), {
        ...options,
        env: sourceWorkerEnv(),
    });
}
function sourceWorkerEnv() {
    const env = {};
    if (process.platform === 'win32') {
        env.TMP = tmpdir();
        env.TEMP = tmpdir();
    }
    if (process.env.TSX_TSCONFIG_PATH !== undefined)
        env.TSX_TSCONFIG_PATH = process.env.TSX_TSCONFIG_PATH;
    return env;
}
async function closeInspector(lifecycle, source, fetchObserver, timeoutMs) {
    const failures = [];
    try {
        await fetchObserver?.stop();
    }
    catch (error) {
        failures.push(error);
    }
    try {
        source.close();
    }
    catch (error) {
        failures.push(error);
    }
    try {
        await lifecycle.stop(timeoutMs);
    }
    catch (error) {
        failures.push(error);
    }
    if (failures.length > 0)
        throw new AggregateError(failures, 'inspector: shutdown failed');
}
function natural(value, name, zero = false) {
    if (!Number.isSafeInteger(value) || value < (zero ? 0 : 1)) {
        throw new Error(`inspector: ${name} must be ${zero ? 'a non-negative' : 'a positive'} safe integer`);
    }
    return value;
}
//# sourceMappingURL=controller.js.map