declare const Duplex: typeof import("stream").Duplex, PassThrough: typeof import("stream").PassThrough, Readable: typeof import("stream").Readable, StreamBase: typeof import("stream"), Transform: typeof import("stream").Transform, Writable: typeof import("stream").Writable, addAbortSignal: typeof import("stream").addAbortSignal, compose: (...streams: unknown[]) => unknown, destroy: (stream: unknown, error?: Error) => void, finished: typeof import("stream").finished, isDisturbed: (stream: unknown) => boolean, isErrored: typeof import("stream").isErrored, isReadable: typeof import("stream").isReadable, pipeline: typeof import("stream").pipeline, promises: typeof import("node:stream/promises");
declare const getDefaultHighWaterMark: typeof import("stream").getDefaultHighWaterMark & ((objectMode: boolean) => number), isDestroyed: (stream: unknown) => boolean | null, isWritable: typeof import("stream").isWritable & ((stream: unknown) => boolean | null), setDefaultHighWaterMark: typeof import("stream").setDefaultHighWaterMark & ((objectMode: boolean, value: number) => void);
/**
 * Test whether a value is an ArrayBuffer view.
 * @param value - Candidate value.
 * @returns Whether the value is a typed-array or DataView instance.
 */
declare const _isArrayBufferView: (value: unknown) => value is ArrayBufferView;
/** Default-import namespace carrying Node's stream class and static helpers. */
declare const streamDefault: typeof import("stream") & {
    _isArrayBufferView: (value: unknown) => value is ArrayBufferView;
    getDefaultHighWaterMark: typeof import("stream").getDefaultHighWaterMark & ((objectMode: boolean) => number);
    isDestroyed: (stream: unknown) => boolean | null;
    isWritable: typeof import("stream").isWritable & ((stream: unknown) => boolean | null);
    setDefaultHighWaterMark: typeof import("stream").setDefaultHighWaterMark & ((objectMode: boolean, value: number) => void);
};
export { Duplex, PassThrough, Readable, StreamBase as Stream, Transform, Writable, addAbortSignal, compose, destroy, finished, getDefaultHighWaterMark, _isArrayBufferView, isDestroyed, isDisturbed, isErrored, isReadable, isWritable, pipeline, promises, setDefaultHighWaterMark, };
/** CommonJS interop marker consumed by the worker module loader. */
export declare const __esModule = true;
/** CommonJS-compatible namespace for default imports. */
export default streamDefault;
//# sourceMappingURL=stream.d.ts.map