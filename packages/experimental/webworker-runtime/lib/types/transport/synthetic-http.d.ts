/**
 * `IncomingMessage`/`ServerResponse` synthesis for tunnel requests. The app's
 * `node:http` proxy reports a successful bind and captures the webserver's
 * request listener; the tunnel feeds that listener these pairs, so the real
 * route table, its trust fences, and every handler run unchanged.
 *
 * Synthesized members are exactly the ones the route handlers read; anything
 * else is absent on purpose so a new consumer
 * fails loud instead of silently reading a stub.
 * @module @deepseek-ai/dsh-experimental-webworker-runtime/src/transport/synthetic-http
 */
import type { TunnelRequestFrame } from './frames.ts';
/** Where a synthesized response writes to. */
export interface ResponseSink {
    /** Head of a streaming response. */
    head(status: number, headers: Record<string, string>): void;
    /** One body chunk after {@link ResponseSink.head}. */
    chunk(bytes: Uint8Array): void;
    /** Completion; the payload is present only for unary answers. */
    end(payload?: {
        status: number;
        headers: Record<string, string>;
        body?: Uint8Array | undefined;
    }): void;
    /** Failure of the exchange. */
    fail(message: string): void;
}
/** Request listener shape the app's `createServer` captured. */
export type RequestListener = (req: unknown, res: unknown) => void;
/** The pair a route handler consumes, plus abort control for the tunnel. */
export interface SyntheticExchange {
    readonly req: unknown;
    readonly res: unknown;
    /** Whether the page abandoned the request before it finished. */
    readonly aborted: boolean;
    /** Mark the page as gone: emits `close` and stops further frames. */
    abort(): void;
}
/**
 * Build the request/response pair for one tunnel request.
 *
 * `res.end()` is the settle point: the captured listener returns void, so the
 * response object itself reports completion. `write()` always returns true,
 * which skips backpressure waiting the tunnel cannot observe anyway.
 * @param frame - Validated request frame.
 * @param sink - Frame emitter for the response.
 * @returns The pair handed to the captured request listener.
 */
export declare function createSyntheticExchange(frame: TunnelRequestFrame, sink: ResponseSink): SyntheticExchange;
//# sourceMappingURL=synthetic-http.d.ts.map