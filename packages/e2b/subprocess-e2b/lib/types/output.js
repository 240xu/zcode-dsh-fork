/** Bounded host-side projection of a complete output file retained in E2B. */
import { Buffer } from 'node:buffer';
const BASE64_TEXT = /^[A-Za-z0-9+/]+={0,2}$/u;
/** Reserved non-base64 frame proving that one remote encoder reached clean EOF. */
export const E2B_OUTPUT_COMPLETE_FRAME = '!dsh-e2b-output-complete!';
/** Incrementally decode newline-delimited base64 frames emitted by one remote encoder. */
export class E2BBase64Decoder {
    pending = '';
    complete = false;
    /**
     * Decode every complete newline-delimited frame in one arbitrarily split SDK callback.
     * @param text - ASCII base64 frames from E2B's decoded callback.
     * @returns the complete raw bytes made available by this callback.
     */
    push(text) {
        if (text.length === 0)
            return Buffer.alloc(0);
        this.pending += text;
        const decoded = [];
        for (;;) {
            const boundary = this.pending.indexOf('\n');
            if (boundary < 0)
                break;
            const frame = this.pending.slice(0, boundary);
            this.pending = this.pending.slice(boundary + 1);
            if (frame === E2B_OUTPUT_COMPLETE_FRAME) {
                if (this.complete)
                    throw new Error('subprocess-e2b: duplicate output transport completion');
                this.complete = true;
                continue;
            }
            if (this.complete)
                throw new Error('subprocess-e2b: output transport continued after completion');
            if (!BASE64_TEXT.test(frame)) {
                throw new Error('subprocess-e2b: invalid base64 output transport');
            }
            const bytes = Buffer.from(frame, 'base64');
            if (bytes.toString('base64') !== frame) {
                throw new Error('subprocess-e2b: invalid base64 output transport');
            }
            decoded.push(bytes);
        }
        return Buffer.concat(decoded);
    }
    /**
     * Validate clean encoder completion, or discard an interrupted trailing frame after requested termination.
     * @param requireComplete - Whether natural completion requires the reserved EOF frame.
     */
    finish(requireComplete = true) {
        if (!requireComplete) {
            this.pending = '';
            return;
        }
        if (this.pending.length > 0) {
            throw new Error('subprocess-e2b: truncated base64 output transport');
        }
        if (!this.complete)
            throw new Error('subprocess-e2b: incomplete output transport');
    }
}
/** Offset reader used for one collect-mode E2B stream. */
export class E2BOutputReader {
    maxBytes;
    maxSpillBytes;
    spillPath;
    chunks = [];
    retainedBytes = 0;
    totalBytes = 0;
    spillValid = true;
    /**
     * Create a bounded reader over one remote spill path.
     * @param maxBytes - In-memory tail cap.
     * @param maxSpillBytes - Maximum complete remote file size the caller accepts.
     * @param spillPath - Remote full-output path.
     */
    constructor(maxBytes, maxSpillBytes, spillPath) {
        this.maxBytes = maxBytes;
        this.maxSpillBytes = maxSpillBytes;
        this.spillPath = spillPath;
    }
    /** Total bytes observed from the SDK stream. */
    get size() {
        return this.totalBytes;
    }
    /** Stop advertising a remote spill whose writer did not reach clean EOF. */
    invalidateSpill() {
        this.spillValid = false;
    }
    /**
     * Append one byte-faithful decoded transport event.
     * @param bytes - Raw command bytes recovered from the ASCII SDK transport.
     */
    push(bytes) {
        if (bytes.length === 0)
            return;
        const chunk = Buffer.from(bytes);
        this.totalBytes += chunk.length;
        this.chunks.push(chunk);
        this.retainedBytes += chunk.length;
        while (this.retainedBytes > this.maxBytes) {
            const head = this.chunks[0];
            const excess = this.retainedBytes - this.maxBytes;
            if (head.length <= excess) {
                this.chunks.shift();
                this.retainedBytes -= head.length;
            }
            else {
                this.chunks[0] = head.subarray(excess);
                this.retainedBytes -= excess;
            }
        }
    }
    /** @inheritdoc */
    readFrom(fromByte) {
        const retained = Buffer.concat(this.chunks, this.retainedBytes);
        const firstRetained = this.totalBytes - this.retainedBytes;
        const lossy = fromByte < firstRetained;
        const start = lossy ? 0 : Math.min(retained.length, Math.max(0, fromByte - firstRetained));
        return {
            text: retained.subarray(start).toString('utf8'),
            nextOffset: this.totalBytes,
            lossy,
            ...(lossy && this.spillValid && this.maxSpillBytes !== undefined && this.totalBytes <= this.maxSpillBytes
                ? { spillPath: this.spillPath }
                : {}),
        };
    }
}
//# sourceMappingURL=output.js.map