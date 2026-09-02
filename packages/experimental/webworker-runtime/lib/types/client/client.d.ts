/**
 * Page half of the postMessage tunnel. It
 * turns fetch-shaped calls into `req` frames and rebuilds Responses from the
 * worker's `res` / `res-head`+`res-chunk`+`res-end` frames, so every consumer
 * (boot payload, bundle transport, ApiClient, Typert RPC) speaks plain HTTP.
 */
import type { IndexInjection } from '@deepseek-ai/dsh-host-webserver';
/** Boot payload of the tunnel bootstrap route. */
export interface BootPayload {
    /** Structured index injection table, executed by the page interpreter. */
    injections: IndexInjection[];
}
/** Fetch-shaped transport the client tree consumes. */
export type TunnelFetch = (input: URL | string, init?: RequestInit) => Promise<Response>;
/** The page half of the tunnel: one `fetch`-shaped face over `postMessage`. */
export declare class WorkerTunnel {
    private readonly worker;
    private nextId;
    private readonly unary;
    private readonly bodyStreams;
    private readonly logicalStreams;
    /**
     * In-flight request descriptions, so a refusal names what was refused.
     *
     * A tunnel failure and a failure inside the host tree look identical from the
     * page — both surface as one rejected fetch — and the acceptance run keeps the
     * page console but not the frames. Warning here separates the two without
     * recording anything on the normal path, where no refusal frame ever arrives.
     */
    private readonly inFlight;
    /** Body-phase abort listeners, released when their stream settles. */
    private readonly releases;
    /**
     * Attach to a spawned worker and start consuming response frames.
     * @param worker - the host worker.
     */
    constructor(worker: Worker);
    /**
     * Open the tunnel: the worker assembles its host from this frame.
     * @param image - VFS image URL the worker fetches.
     * @param overlays - Ordered data overlay URLs applied before boot.
     */
    init(image: string, overlays?: readonly string[]): void;
    /** Fetch-shaped entry: one request frame, one Response (streamed when the worker streams). */
    readonly fetch: TunnelFetch;
    /**
     * Open one decoded Gateway Remote stream over the worker-local carrier.
     * @param endpoint - canonical Gateway Remote endpoint.
     * @param payload - decoded endpoint payload.
     * @param signal - logical-stream cancellation.
     * @returns decoded stream values from the worker Host.
     */
    open(endpoint: string, payload: unknown, signal: AbortSignal): AsyncGenerator;
    /**
     * Read the pre-cordis boot payload (the injection table).
     * @returns The payload the page applies before the client tree loads.
     */
    bootPayload(): Promise<BootPayload>;
    /**
     * `loadBundle` seam: take one client bundle through the tunnel and execute it
     * as a classic script, exactly like the shell's same-origin `<script src>`.
     * The image packs each bundle with a trailing `sourceURL` naming its image
     * path, so the blob shows under that name in the debugger instead of as an
     * anonymous blob entry.
     * @param url - Graph combo URL (`/plugins/??<id>/client.js&rev=...`).
     */
    loadBundle(url: string): Promise<void>;
    private rejectOnAbort;
    /**
     * Tear down one request the page abandoned: the maps forget it, the worker
     * is told, and a live body stream errors for its reader.
     * @param id - request id being abandoned.
     * @returns The abort error the caller surfaces.
     */
    private abortRequest;
    /**
     * Hold the caller's signal over the body phase: the head settled, so
     * {@link rejectOnAbort}'s listener is about to go, but a stop must still
     * end the stream. Released when the stream settles.
     * @param id - request id whose body is still crossing.
     * @param signal - the caller's signal.
     */
    private observeStreamAbort;
    /** Release a body-phase abort listener a settled stream no longer needs. */
    private releaseSignal;
    /** Cancel a stream the consumer stopped reading (the head already resolved). */
    private cancelStream;
    /** Best-effort cancellation: a failed worker cannot receive the frame anyway. */
    private abortWorkerOperation;
    /**
     * Report a refusal on the page console, where the acceptance run already keeps it.
     *
     * The prefix names the reporter, not the culprit: a 5xx can equally come from a
     * handler inside the host tree. The message text decides — the worker expands
     * nested causes into it, and its deepest layer is where the failure was thrown.
     * @param id - request id the frame answers.
     * @param outcome - what came back instead of a reply.
     */
    private warnRefusal;
    private receive;
}
//# sourceMappingURL=client.d.ts.map