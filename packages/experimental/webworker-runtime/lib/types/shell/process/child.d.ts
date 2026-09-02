/**
 * The process worker's own half: a fresh worker that received a
 * {@link ShellStartFrame} runs one command here and then closes.
 *
 * It mounts no VFS image, boots no Cordis tree, and loads no plugins — the
 * only thing it shares with the host worker is the bundle it was started from.
 * Its filesystem is the host's, reached by message.
 * @module @deepseek-ai/dsh-experimental-webworker-runtime/src/shell/process/child
 */
import type { FromProcessFrame, ShellStartFrame } from './protocol.ts';
/** The messaging face this module needs from a worker scope. */
export interface ProcessScope {
    postMessage(frame: FromProcessFrame): void;
    addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
    close(): void;
}
/**
 * Run one command as this worker's whole purpose, then close.
 *
 * Output is forwarded as it is written, so a caller reading a background job
 * sees progress before the command settles.
 * @param start - the frame that named the command, its directory, and its input.
 * @param scope - the worker scope to message through (`self`).
 */
export declare function runShellProcess(start: ShellStartFrame, scope: ProcessScope): void;
//# sourceMappingURL=child.d.ts.map