/** Filesystem-seam source access for the generic stdio LSP provider. */
import { Buffer } from 'node:buffer';
import { throwIfAborted } from "./abort.js";
/**
 * Resolve and validate one workspace through `ctx.fs`.
 * @param fs - filesystem provider sharing the language server's execution world.
 * @param workspaceRoot - caller-supplied workspace path.
 * @param signal - optional cancellation around provider operations.
 * @returns stable identity plus process path and file URI.
 */
export async function canonicalizeWorkspace(fs, workspaceRoot, signal) {
    throwIfAborted(signal);
    let target;
    try {
        target = await fs.resolve(workspaceRoot, signal === undefined ? {} : { signal });
    }
    catch (error) {
        throwIfAborted(signal);
        throw new Error(`workspace root "${workspaceRoot}" cannot be resolved: ${messageOf(error)}`, { cause: error });
    }
    throwIfAborted(signal);
    const info = await fs.stat(target, signal).catch((error) => {
        throwIfAborted(signal);
        throw error;
    });
    throwIfAborted(signal);
    if (info?.type !== 'directory') {
        throw new Error(`workspace root "${workspaceRoot}" is not a directory`);
    }
    return {
        target,
        canonicalPath: fs.processPath(target),
        fileUrl: fs.fileUrl(target),
    };
}
/**
 * Resolve, contain, and read one byte-bounded query source through `ctx.fs`.
 * This layer owns the LSP-specific complete-document cap while the filesystem
 * provider owns streaming, regular-file checks, and UTF-8 validation.
 * @param fs - filesystem provider sharing the server's execution world.
 * @param filePath - absolute source path or path relative to `workspace`.
 * @param workspace - already-canonical workspace.
 * @param maxDocumentBytes - largest complete source accepted by this host.
 * @param signal - optional cancellation.
 * @returns canonical file URI and current text.
 */
export async function readHostSource(fs, filePath, workspace, maxDocumentBytes, signal) {
    throwIfAborted(signal);
    let target;
    try {
        target = await fs.resolve(filePath, {
            cwd: workspace.canonicalPath,
            ...signal === undefined ? {} : { signal },
        });
    }
    catch (error) {
        throwIfAborted(signal);
        throw new Error(`source "${filePath}" cannot be resolved: ${messageOf(error)}`, { cause: error });
    }
    throwIfAborted(signal);
    if (!fs.contains(workspace.target, target)) {
        throw new Error(`source "${filePath}" resolves outside the workspace`);
    }
    const chunks = [];
    let bytes = 0;
    try {
        // XXX(lsp-source-replacement): Revisit stable-handle identity only if a real query observes
        // replacement between canonical containment and the provider opening this stream.
        const stream = await fs.streamText(target, signal);
        for await (const chunk of stream) {
            throwIfAborted(signal);
            bytes += Buffer.byteLength(chunk);
            if (bytes > maxDocumentBytes)
                break;
            chunks.push(chunk);
        }
    }
    catch (error) {
        throwIfAborted(signal);
        throw new Error(`source "${filePath}" could not be read: ${messageOf(error)}`, { cause: error });
    }
    if (bytes > maxDocumentBytes) {
        throw new Error(`source "${filePath}" exceeds the ${maxDocumentBytes}-byte limit; reading stopped after ${bytes} bytes`);
    }
    throwIfAborted(signal);
    return {
        fileUrl: fs.fileUrl(target),
        text: chunks.join(''),
    };
}
function messageOf(error) {
    return error instanceof Error ? error.message : String(error);
}
//# sourceMappingURL=host.js.map