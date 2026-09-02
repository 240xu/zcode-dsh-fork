/**
 * Host-side session-log download: streams one ZIP archive whose files are the
 * sessions' logical session logs plus every referenced media object. Each log
 * is read through a persistence read handle and serialized here as canonical
 * JSONL — one header line, then one line per validated event — so every
 * backend (JSONL, SQLite, future) exports identically. The root log sits at
 * `session.jsonl`; each subagent descendant under
 * `subagents/<id>/session.jsonl`; each image referenced by any included log
 * under `media/<attachmentId>.<ext>` (content-addressed, so one archive never
 * duplicates a shared image). No manifest is written — every file is
 * self-describing through its own header line or media type. Before each live
 * session's log read, the SessionStore flush barrier makes the current
 * in-memory log durable; cold sessions need no barrier. Request abort and
 * response-consumer cancellation share one producer signal and terminate the
 * active compressor.
 * Compression runs on the host with fflate's streaming Zip API, so the archive
 * bytes are produced incrementally and the host never holds the whole archive
 * in one buffer; production waits for consumer pull whenever the response queue
 * reaches its byte high-water mark, so a slow consumer bounds accumulation to
 * the fixed 64 KiB response queue plus one synchronous fflate push.
 * @module
 */
import { Zip, ZipDeflate } from 'fflate';
import { SessionPersistenceNotFoundError } from '@deepseek-ai/dsh-session-persistence';
/** Balanced default used when Session export configuration omits a compression level. */
export const DEFAULT_SESSION_LOG_COMPRESSION_LEVEL = 6;
/**
 * Resolve the persistence, session-query, and attachment services a log export needs.
 * @param ctx - the composed host context.
 * @returns the export services (absent when the deployment does not mount them).
 */
export function sessionLogExportDeps(ctx) {
    return {
        sessionQuery: ctx.get('sessionQuery'),
        sessionPersistence: ctx.get('sessionPersistence'),
        attachments: ctx.get('attachments'),
        sessions: ctx.get('sessions'),
    };
}
/**
 * Flush one currently live session through the store's authoritative durability
 * barrier immediately before its raw artifact is read. A cold or absent id has
 * no in-memory work to flush.
 * @param deps - export services, including the optional live-session store.
 * @param id - the session whose artifact is about to be read.
 * @param signal - optional cancellation observed around the flush barrier.
 */
export async function flushLiveSessionLog(deps, id, signal) {
    signal?.throwIfAborted();
    const sessions = deps.sessions;
    if (sessions === undefined)
        return;
    const session = sessions.get(id);
    if (session === undefined)
        return;
    await sessions.flush(session);
    signal?.throwIfAborted();
}
/** The zip base filename for every exported session log. */
export const SESSION_LOG_FILENAME = 'session.jsonl';
/**
 * Serialize one session's logical log as canonical JSONL text: the header
 * line, then one line per event, with a trailing newline.
 * @param header - the session's immutable header.
 * @param inheritedEventCount - the exact fork-inherited prefix length stored
 *   beside the header (`0` when `header.isSeeded` is false).
 * @param events - the validated committed events in seq order.
 * @returns the JSONL text.
 */
export function serializeSessionLog(header, inheritedEventCount, events) {
    // Match the JSONL backend's canonical header line: lineage is the physical
    // `seedLength`, and `delegationDepth` is required-on-read there, so an
    // omitted top-level depth serializes as 0 and the exported log parses as a
    // valid log.
    /* jscpd:ignore-start -- deliberately mirrors the JSONL backend's
       `toHeaderLine`: the exported text is the canonical v0 physical header
       line, and this backend-agnostic package must not depend on one backend
       implementation. */
    const lines = [JSON.stringify({
            type: 'session',
            version: header.version,
            id: header.id,
            createdAt: header.createdAt,
            ...header.cwd !== undefined ? { cwd: header.cwd } : {},
            ...header.parentSession !== undefined ? { parentSession: header.parentSession } : {},
            ...header.isSeeded ? { seedLength: inheritedEventCount } : {},
            ...header.origin !== undefined ? { origin: header.origin } : {},
            delegationDepth: header.delegationDepth ?? 0,
            ...header.agentPreset !== undefined ? { agentPreset: header.agentPreset } : {},
        })];
    /* jscpd:ignore-end */
    for (const event of events)
        lines.push(JSON.stringify(event));
    return `${lines.join('\n')}\n`;
}
/**
 * Read one session's complete logical log through a read handle and serialize
 * it. The read observes the committed log only — persistence never returns a
 * torn tail — and a handle read after a resolved flush observes at least the
 * flushed prefix.
 * @param persistence - the mounted persistence backend.
 * @param id - the session to read.
 * @param signal - optional cancellation forwarded to the open and read.
 * @returns the serialized JSONL text, or `undefined` when the session does not exist.
 */
export async function readSessionLogText(persistence, id, signal) {
    const options = signal === undefined ? {} : { signal };
    let handle;
    try {
        handle = await persistence.open(id, 'read', options);
    }
    catch (error) {
        // Absence is `open`'s decision; every other failure (corruption,
        // unsupported format, I/O, cancellation) stays fail-loud.
        if (error instanceof SessionPersistenceNotFoundError)
            return undefined;
        throw error;
    }
    try {
        const events = await handle.read(0, undefined, options);
        return serializeSessionLog(handle.header, Number(handle.inheritedEventCount), events);
    }
    finally {
        await handle.close();
    }
}
/** Zip extension for each accepted raster media type. */
const MEDIA_TYPE_EXTENSIONS = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
};
/**
 * The zip path for one media object: content-addressed by the opaque
 * attachment id so shared images land once and the id in the log maps back to
 * the archive entry without a manifest.
 * @param ref - the durable reference from a session log.
 * @returns the archive path.
 */
function mediaEntryPath(ref) {
    return `media/${String(ref.attachmentId)}.${MEDIA_TYPE_EXTENSIONS[ref.mediaType]}`;
}
/**
 * Collect every image reference inside one content array, descending into
 * nested tool results the way the live attachment route does.
 * @param content - an event content array (or nested tool-result content).
 * @param refs - the dedupe map being filled (keyed by attachment id).
 */
function collectImageRefs(content, refs) {
    if (!Array.isArray(content))
        return;
    const pending = [];
    for (const item of content)
        pending.push(item);
    while (pending.length > 0) {
        const value = pending.pop();
        if (typeof value !== 'object' || value === null || Array.isArray(value))
            continue;
        const block = value;
        if (block.type === 'image' && typeof block.attachment === 'object' && block.attachment !== null) {
            const ref = block.attachment;
            refs.set(String(ref.attachmentId), ref);
        }
        if (Array.isArray(block.content)) {
            for (const item of block.content)
                pending.push(item);
        }
    }
}
/**
 * Collect every image reference one session event carries, across the same
 * carriers the live attachment route scans (direct content, message content,
 * inserted messages, and completed assistant chunk blocks).
 * @param event - one parsed JSONL event object.
 * @param refs - the dedupe map being filled (keyed by attachment id).
 */
function collectEventImageRefs(event, refs) {
    const data = event.data;
    if (typeof data !== 'object' || data === null)
        return;
    const carrier = data;
    collectImageRefs(carrier.content, refs);
    if (carrier.message !== undefined)
        collectImageRefs(carrier.message.content, refs);
    if (carrier.inserted !== undefined) {
        for (const message of carrier.inserted)
            collectImageRefs(message.content, refs);
    }
    if (carrier.chunk?.type === 'block-end')
        collectImageRefs([carrier.chunk.block], refs);
}
/**
 * Collect the distinct media references one stored artifact text names.
 * Lines that fail to parse cannot reference media and are skipped (the
 * artifact text itself is exported verbatim regardless).
 * @param content - the stored artifact text.
 * @returns the dedupe map keyed by attachment id.
 */
function imageRefsInArtifact(content) {
    const refs = new Map();
    for (const line of content.split('\n')) {
        if (line === '')
            continue;
        let event;
        try {
            event = JSON.parse(line);
        }
        catch {
            continue;
        }
        collectEventImageRefs(event, refs);
    }
    return refs;
}
/**
 * One safe zip path segment from an untrusted session id. Session ids are
 * host-controlled, but the brand allows any non-empty string, so `../`, dot
 * segments, and separator characters are neutralized before they can shape
 * archive entries. Distinct ids may collapse onto one segment (id collision
 * is impossible for the host-minted UUIDs, so no uniqueness suffix is kept).
 * @param id - the raw session id.
 * @returns a filesystem-safe single path segment.
 */
function safeSessionIdSegment(id) {
    return id.replace(/[^A-Za-z0-9_-]/g, '_');
}
/**
 * The export archive filename for one root session.
 * @param sessionId - the root session id (sanitized to one safe path segment).
 * @returns the attachment filename for the session's export archive.
 */
export function sessionLogZipFilename(sessionId) {
    return `dsh-session-${safeSessionIdSegment(sessionId)}.zip`;
}
/**
 * Yield the export entries in zip order: the preloaded root log first, then
 * every subagent descendant in lineage order (each flushed when live, read
 * through a persistence read handle right before it is yielded, and dropped
 * after the consumer moves on), then every distinct media object referenced by any of
 * the included logs (read and verified from the attachment store, one archive
 * entry per attachment id). The host holds at most one descendant's log text
 * and one media object at a time beyond the root.
 * @param deps - the mounted export services (the caller answered 500 before this runs).
 * @param rootContent - the already-serialized root log (read by the caller so
 * the missing-session path can answer cleanly before streaming starts).
 * @param sessionId - the root session id.
 * @param includeDescendants - whether to include every subagent descendant.
 * @param signal - optional cancellation forwarded to lineage, persistence, and attachment reads.
 * @returns the export entries in zip order.
 */
export async function* sessionLogZipEntries(deps, rootContent, sessionId, includeDescendants, signal) {
    const media = new Map();
    const rememberMedia = (content) => {
        for (const [id, ref] of imageRefsInArtifact(content))
            media.set(id, ref);
    };
    rememberMedia(rootContent);
    yield { path: SESSION_LOG_FILENAME, content: rootContent };
    if (includeDescendants) {
        const seen = new Set([sessionId]);
        const collect = async function* (nodes) {
            for (const node of nodes) {
                signal?.throwIfAborted();
                const id = node.session.header.id;
                if (seen.has(id))
                    continue;
                seen.add(id);
                await flushLiveSessionLog(deps, id, signal);
                const content = await readSessionLogText(deps.sessionPersistence, id, signal);
                signal?.throwIfAborted();
                if (content === undefined) {
                    throw new Error(`subagent "${id}" has no stored log`);
                }
                rememberMedia(content);
                yield {
                    path: `subagents/${safeSessionIdSegment(id)}/${SESSION_LOG_FILENAME}`,
                    content,
                };
                yield* collect(node.descendants);
            }
        };
        const lineage = await deps.sessionQuery.traceSession(sessionId, signal);
        signal?.throwIfAborted();
        yield* collect(lineage.descendants);
    }
    for (const ref of media.values()) {
        signal?.throwIfAborted();
        const stored = await deps.attachments.readImage(ref, signal);
        signal?.throwIfAborted();
        yield { path: mediaEntryPath(ref), data: stored.data };
    }
}
/** How many code units of artifact text one zip push carries (bounded encode memory). */
const PUSH_CHUNK_CODE_UNITS = 1 << 16;
/** How many bytes of media one zip push carries (bounded memory; images are already size-capped). */
const PUSH_CHUNK_BYTES = 1 << 16;
/** Byte capacity retained by the response stream before ZIP production waits for pull. */
const RESPONSE_HIGH_WATER_MARK_BYTES = 1 << 16;
/** One producer waiter released only when ReadableStream pull restores capacity. */
class ResponseCapacityGate {
    releasePending;
    /**
     * Wait until the response queue has positive byte capacity or cancellation wins.
     * @param controller - response controller whose desired size owns capacity.
     * @param signal - combined request/consumer cancellation.
     */
    async wait(controller, signal) {
        signal.throwIfAborted();
        if (controller.desiredSize === null || controller.desiredSize > 0)
            return;
        await new Promise((resolve) => {
            const release = () => {
                this.releasePending = undefined;
                signal.removeEventListener('abort', release);
                resolve();
            };
            this.releasePending = release;
            signal.addEventListener('abort', release, { once: true });
        });
        signal.throwIfAborted();
    }
    /** Release the current producer waiter after a consumer pull. */
    pulled() {
        this.releasePending?.();
    }
}
/**
 * Push one media object's bytes into a deflate stream in bounded chunks,
 * waiting for consumer capacity between chunks like the artifact path does.
 * @param deflate - the zip entry's deflate stream.
 * @param data - the stored image bytes.
 * @param controller - response queue controller.
 * @param capacity - pull-driven response-capacity gate.
 * @param signal - cancellation; throws when aborted.
 */
async function pushBinaryChunks(deflate, data, controller, capacity, signal) {
    let offset = 0;
    do {
        signal.throwIfAborted();
        const end = Math.min(offset + PUSH_CHUNK_BYTES, data.byteLength);
        const finalChunk = end >= data.byteLength;
        deflate.push(data.subarray(offset, end), finalChunk);
        offset = end;
        await capacity.wait(controller, signal);
    } while (offset < data.byteLength);
}
/**
 * Push one artifact's text into a deflate stream in bounded chunks, never
 * splitting a surrogate pair across a chunk boundary (a lone high surrogate
 * re-encodes as U+FFFD and would silently corrupt the exported artifact).
 * @param deflate - the zip entry's deflate stream.
 * @param content - the artifact text verbatim.
 * @param controller - response queue controller.
 * @param capacity - pull-driven response-capacity gate.
 * @param signal - cancellation; throws when aborted.
 */
async function pushArtifactChunks(deflate, content, controller, capacity, signal) {
    const encoder = new TextEncoder();
    let offset = 0;
    let finalChunk;
    do {
        signal.throwIfAborted();
        let end = Math.min(offset + PUSH_CHUNK_CODE_UNITS, content.length);
        if (end < content.length && end - offset > 1) {
            // Back off one code unit when the boundary lands inside a surrogate
            // pair: the pair then starts the next chunk whole.
            const last = content.charCodeAt(end - 1);
            if (last >= 0xd800 && last <= 0xdbff)
                end -= 1;
        }
        finalChunk = end >= content.length;
        deflate.push(encoder.encode(content.slice(offset, end)), finalChunk);
        offset = end;
        await capacity.wait(controller, signal);
    } while (!finalChunk);
}
/**
 * Stream one session-log ZIP as a WHATWG ReadableStream. The root log is read
 * and serialized by the caller before this is called (a missing root or
 * missing services answer cleanly before any byte is produced); each entry is
 * then encoded and deflated in bounded chunks as it is produced, so the
 * archive bytes arrive incrementally. A descendant that fails to read errors
 * the stream (fail-loud, never silent under-export).
 * @param deps - the mounted export services (the caller answered 500 before this runs).
 * @param rootContent - the already-serialized root log (first zip entry).
 * @param sessionId - the root session id.
 * @param includeDescendants - whether to include every subagent descendant.
 * @param compressionLevel - validated fflate DEFLATE level for every ZIP entry.
 * @param signal - request cancellation combined with response-consumer cancellation.
 * @returns the zip byte stream.
 */
export function streamSessionLogZip(deps, rootContent, sessionId, includeDescendants, compressionLevel, signal) {
    const consumerAbort = new AbortController();
    const producerSignal = AbortSignal.any([signal, consumerAbort.signal]);
    let zip;
    let zipTerminated = false;
    const capacity = new ResponseCapacityGate();
    const terminateZip = () => {
        if (zip === undefined || zipTerminated)
            return;
        zipTerminated = true;
        zip.terminate();
    };
    return new ReadableStream({
        start(controller) {
            // fflate invokes the callback synchronously per compressed chunk, so a
            // single push can enqueue ahead of a slow consumer; the capacity gate
            // waits for pull between pushes once the byte queue is full, bounding
            // accumulation to the queue high-water mark plus one synchronous push.
            const archive = new Zip((error, data, final) => {
                /* v8 ignore next 3 -- fflate reports only internal zip failures, unreachable for valid inputs */
                if (error) {
                    controller.error(error);
                    return;
                }
                /* v8 ignore next -- fflate may emit empty chunks; not controllable from tests */
                if (data.byteLength > 0)
                    controller.enqueue(data);
                if (final)
                    controller.close();
            });
            zip = archive;
            void (async () => {
                try {
                    for await (const entry of sessionLogZipEntries(deps, rootContent, sessionId, includeDescendants, producerSignal)) {
                        const deflate = new ZipDeflate(entry.path, { level: compressionLevel });
                        archive.add(deflate);
                        if ('content' in entry) {
                            await pushArtifactChunks(deflate, entry.content, controller, capacity, producerSignal);
                        }
                        else {
                            await pushBinaryChunks(deflate, entry.data, controller, capacity, producerSignal);
                        }
                    }
                    archive.end();
                }
                catch (error) {
                    // A mid-stream failure (missing descendant, cancellation, read
                    // error) must fail the download rather than ship a truncated archive.
                    /* v8 ignore next -- typed backends reject with Error, and DOMException is one in Node */
                    terminateZip();
                    controller.error(error instanceof Error ? error : new Error(String(error)));
                }
            })();
        },
        pull() {
            capacity.pulled();
        },
        cancel(reason) {
            consumerAbort.abort(reason instanceof Error ? reason : new Error('session log export stream cancelled'));
            terminateZip();
        },
    }, {
        highWaterMark: RESPONSE_HIGH_WATER_MARK_BYTES,
        size: chunk => chunk.byteLength,
    });
}
//# sourceMappingURL=archive.js.map