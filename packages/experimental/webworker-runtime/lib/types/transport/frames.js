/**
 * Tunnel frame protocol between the page and the worker host. Frames cross
 * `postMessage`, so inbound frames are validated before use.
 * @module @deepseek-ai/dsh-experimental-webworker-runtime/src/transport/frames
 */
/**
 * Validate a `postMessage` payload as a tunnel frame.
 * @param data - Message data received by the worker.
 * @returns The frame.
 */
export function parseInboundFrame(data) {
    if (typeof data !== 'object' || data === null) {
        throw new Error(`webworker tunnel: message is not a frame: ${String(data)}`);
    }
    const frame = data;
    if (frame.t === 'init') {
        if (typeof frame.image !== 'string') {
            throw new Error('webworker tunnel: init frame needs a string image url');
        }
        if (!Array.isArray(frame.overlays) || frame.overlays.some(overlay => typeof overlay !== 'string')) {
            throw new Error('webworker tunnel: init frame needs an array of string overlay urls');
        }
        return { t: 'init', image: frame.image, overlays: frame.overlays };
    }
    const id = frame.id;
    if (typeof id !== 'string' && typeof id !== 'number') {
        throw new Error(`webworker tunnel: frame has no usable id: ${JSON.stringify(frame.id)}`);
    }
    if (frame.t === 'abort')
        return { t: 'abort', id };
    if (frame.t === 'stream-open') {
        if (typeof frame.endpoint !== 'string' || frame.endpoint.length === 0) {
            throw new Error(`webworker tunnel: stream ${String(id)} needs a non-empty endpoint`);
        }
        return { t: 'stream-open', id, endpoint: frame.endpoint, payload: frame.payload };
    }
    if (frame.t !== 'req')
        throw new Error(`webworker tunnel: unknown frame type ${JSON.stringify(frame.t)}`);
    if (typeof frame.method !== 'string' || typeof frame.url !== 'string') {
        throw new Error(`webworker tunnel: request ${String(id)} needs string method and url`);
    }
    if (typeof frame.headers !== 'object' || frame.headers === null) {
        throw new Error(`webworker tunnel: request ${String(id)} needs a headers object`);
    }
    const headers = {};
    for (const [key, value] of Object.entries(frame.headers)) {
        if (typeof value === 'string')
            headers[key.toLowerCase()] = value;
    }
    const body = frame.body;
    if (body !== undefined && !(body instanceof ArrayBuffer)) {
        throw new Error(`webworker tunnel: request ${String(id)} body must be an ArrayBuffer`);
    }
    return { t: 'req', id, method: frame.method, url: frame.url, headers, body };
}
//# sourceMappingURL=frames.js.map