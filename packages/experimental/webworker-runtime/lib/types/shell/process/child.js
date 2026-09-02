/**
 * The process worker's own half: a fresh worker that received a
 * {@link ShellStartFrame} runs one command here and then closes.
 *
 * It mounts no VFS image, boots no Cordis tree, and loads no plugins — the
 * only thing it shares with the host worker is the bundle it was started from.
 * Its filesystem is the host's, reached by message.
 * @module @deepseek-ai/dsh-experimental-webworker-runtime/src/shell/process/child
 */
import { runShellCommand, runShellProgram } from "../interpret.js";
import { filesystemError } from "../fs-access.js";
/**
 * Run one command as this worker's whole purpose, then close.
 *
 * Output is forwarded as it is written, so a caller reading a background job
 * sees progress before the command settles.
 * @param start - the frame that named the command, its directory, and its input.
 * @param scope - the worker scope to message through (`self`).
 */
export function runShellProcess(start, scope) {
    const pending = new Map();
    const stopping = new AbortController();
    let nextCall = 0;
    scope.addEventListener('message', (event) => {
        const frame = event.data;
        if (frame.t === 'shell-signal') {
            // The host's first termination rung: the command stops at its next
            // command boundary. A command that ignores it gets terminated instead.
            stopping.abort(new Error('killed by signal'));
            return;
        }
        if (frame.t !== 'fs-reply')
            return;
        const waiting = pending.get(frame.id);
        if (waiting === undefined)
            return;
        pending.delete(frame.id);
        if (frame.failure === undefined)
            waiting.settle(frame.value);
        else
            waiting.fail(filesystemError(frame.failure.code ?? 'EIO', 'fs', frame.failure.message));
    });
    const call = async (op, args) => {
        nextCall += 1;
        const id = nextCall;
        const reply = new Promise((settle, fail) => { pending.set(id, { settle, fail }); });
        scope.postMessage({ t: 'fs-call', id, op, args });
        return await reply;
    };
    const fs = {
        stat: async (path) => await call('stat', [path]),
        list: async (path) => await call('list', [path]),
        readText: async (path) => await call('readText', [path]),
        writeText: async (path, text, append = false) => { await call('writeText', [path, text, append]); },
        mkdir: async (path, recursive) => { await call('mkdir', [path, recursive]); },
        remove: async (path, options) => { await call('remove', [path, options]); },
        rename: async (from, to) => { await call('rename', [from, to]); },
    };
    const options = {
        cwd: start.cwd,
        env: start.env,
        stdin: start.stdin,
        signal: stopping.signal,
        fs,
        onOutput: (stream, text) => { scope.postMessage({ t: 'shell-out', stream, text }); },
    };
    const run = start.script === undefined
        ? runShellProgram(start.argv, options)
        : runShellCommand(start.script, options);
    void run.then((outcome) => {
        scope.postMessage({ t: 'shell-exit', code: outcome.exitCode });
        scope.close();
    }, (error) => {
        // The interpreter contains its own failures; reaching here means the
        // shell machinery itself broke, which the host reports as a failed spawn.
        scope.postMessage({ t: 'shell-out', stream: 'stderr', text: `bash: ${String(error)}\n` });
        scope.postMessage({ t: 'shell-exit', code: 1 });
        scope.close();
    });
}
//# sourceMappingURL=child.js.map