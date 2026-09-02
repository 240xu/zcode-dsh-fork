/**
 * The frames a shell process and its host exchange.
 *
 * A command runs in its own Web Worker, which owns no filesystem: the VFS
 * stays in the host worker and every read or write is a request on this
 * channel. Blocking the child on a reply is impossible here (that would need
 * `SharedArrayBuffer`, which requires a cross-origin isolation this deployment
 * cannot have), so the filesystem face is asynchronous end to end.
 * @module @deepseek-ai/dsh-experimental-webworker-runtime/src/shell/process/protocol
 */
/**
 * Whether a message is the frame that turns a fresh worker into a shell
 * process. The host worker's entry reads this to pick its role.
 * @param data - the raw message payload.
 * @returns true when the payload starts a shell process.
 */
export function isShellStartFrame(data) {
    return typeof data === 'object' && data !== null && data.t === 'shell-start';
}
//# sourceMappingURL=protocol.js.map