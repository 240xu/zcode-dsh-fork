const encoder = new TextEncoder();
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
export function createSyntheticExchange(frame, sink) {
    const listeners = new Map();
    let status = 200;
    let headers = {};
    let streaming = false;
    let finished = false;
    let aborted = false;
    const emit = (event) => {
        for (const callback of [...(listeners.get(event) ?? [])])
            callback();
    };
    const req = {
        url: frame.url,
        method: frame.method,
        headers: frame.headers,
        destroy: () => { aborted = true; },
        async *[Symbol.asyncIterator]() {
            if (frame.body === undefined || frame.body.byteLength === 0)
                return;
            yield new Uint8Array(frame.body);
        },
    };
    const res = {
        writeHead: (nextStatus, nextHeaders) => {
            status = nextStatus;
            if (nextHeaders !== undefined) {
                headers = {};
                for (const [key, value] of Object.entries(nextHeaders))
                    headers[key.toLowerCase()] = String(value);
            }
            return res;
        },
        write: (chunk) => {
            if (finished || aborted)
                return false;
            if (!streaming) {
                streaming = true;
                sink.head(status, headers);
            }
            sink.chunk(typeof chunk === 'string' ? encoder.encode(chunk) : chunk);
            return true;
        },
        end: (body) => {
            if (finished)
                return res;
            finished = true;
            const bytes = body === undefined ? undefined : typeof body === 'string' ? encoder.encode(body) : body;
            if (streaming) {
                if (bytes !== undefined)
                    sink.chunk(bytes);
                sink.end();
            }
            else {
                sink.end({ status, headers, body: bytes });
            }
            emit('close');
            return res;
        },
        destroy: () => {
            if (finished)
                return;
            finished = true;
            sink.fail(`response destroyed for ${frame.method} ${frame.url}`);
            emit('close');
        },
        on: (event, callback) => {
            const set = listeners.get(event) ?? new Set();
            set.add(callback);
            listeners.set(event, set);
            return res;
        },
        off: (event, callback) => {
            listeners.get(event)?.delete(callback);
            return res;
        },
    };
    res.once = res.on;
    Object.defineProperty(res, 'headersSent', { get: () => streaming });
    Object.defineProperty(res, 'writableEnded', { get: () => finished });
    return {
        req,
        res,
        get aborted() {
            return aborted;
        },
        abort: () => {
            if (finished)
                return;
            aborted = true;
            finished = true;
            emit('close');
        },
    };
}
//# sourceMappingURL=synthetic-http.js.map