/** Capture readable, path-stable workspace state for recorded-session tests. */
import { readFile, readdir, readlink } from 'node:fs/promises';
import { join } from 'node:path';
/** Marker that lets Git retain an expected empty directory without becoming expected workspace state. */
export const EMPTY_WORKSPACE_MARKER = '.empty';
function textContent(bytes) {
    if (bytes.includes(0))
        return undefined;
    const text = bytes.toString('utf8');
    return Buffer.from(text, 'utf8').equals(bytes) ? text : undefined;
}
/**
 * Capture one workspace without resolving links or depending on host path separators.
 * @param root - Absolute directory whose user-visible state is captured.
 * @param options - Harness-owned immediate children to omit.
 * @returns Stable entries sorted by relative path.
 */
export async function captureWorkspaceSnapshot(root, options = {}) {
    const ignoredRootEntries = new Set(options.ignoredRootEntries ?? []);
    const visit = async (directory, segments) => {
        const entries = (await readdir(directory, { withFileTypes: true }))
            .filter(entry => segments.length > 0 || !ignoredRootEntries.has(entry.name))
            .sort((left, right) => Buffer.compare(Buffer.from(left.name), Buffer.from(right.name)));
        const captured = [];
        for (const entry of entries) {
            const childSegments = [...segments, entry.name];
            const path = childSegments.join('/');
            const absolute = join(directory, entry.name);
            if (entry.isDirectory()) {
                const children = await visit(absolute, childSegments);
                captured.push(...children.length === 0 ? [{ path, kind: 'empty-directory' }] : children);
            }
            else if (entry.isFile()) {
                const bytes = await readFile(absolute);
                const content = textContent(bytes);
                captured.push(content === undefined
                    ? { path, kind: 'binary', base64: bytes.toString('base64') }
                    : { path, kind: 'text', content });
            }
            else {
                captured.push({ path, kind: 'symlink', target: await readlink(absolute) });
            }
        }
        return captured;
    };
    return visit(root, []);
}
/**
 * Capture a committed `workspace.expected/` tree, excluding its Git-only empty marker.
 * @param root - Absolute expected-workspace directory.
 * @returns Stable expected entries.
 */
export function captureExpectedWorkspaceSnapshot(root) {
    return captureWorkspaceSnapshot(root, { ignoredRootEntries: [EMPTY_WORKSPACE_MARKER] });
}
//# sourceMappingURL=workspace.js.map