/** Model and UI rendering for persistent terminal tool results. */
import { TextRetainer } from '@deepseek-ai/dsh-output-retention';
const encoder = new TextEncoder();
const TRUNCATED = '\n[output truncated]';
function byteLength(text) {
    return encoder.encode(text).byteLength;
}
function retain(text, maxBytes, kind) {
    const retainer = new TextRetainer({ kind, maxBytes });
    retainer.push(text);
    return retainer.finish().text;
}
function fitWithSuffix(content, suffix, maxBytes) {
    const fixedBytes = byteLength(suffix);
    if (fixedBytes >= maxBytes)
        return retain(suffix, maxBytes, 'tail');
    return `${retain(content, maxBytes - fixedBytes, 'tail')}${suffix}`;
}
function fitWithPrefix(prefix, content, maxBytes) {
    const fixed = `${prefix}${TRUNCATED}`;
    const fixedBytes = byteLength(fixed);
    if (fixedBytes >= maxBytes)
        return retain(fixed, maxBytes, 'head');
    return `${prefix}${retain(content, maxBytes - fixedBytes, 'tail')}${TRUNCATED}`;
}
function boundBodyWithSuffix(content, metadata, upstreamTruncated, maxBytes) {
    const suffix = `${metadata}${upstreamTruncated ? TRUNCATED : ''}`;
    const complete = `${content}${suffix}`;
    if (byteLength(complete) <= maxBytes)
        return complete;
    return fitWithSuffix(content, `${metadata}${TRUNCATED}`, maxBytes);
}
/**
 * Bound one complete terminal acknowledgement while preserving UTF-8 cuts.
 * @param text - complete acknowledgement text.
 * @param maxBytes - positive final result cap.
 * @returns bounded text with a truncation marker when it fits.
 */
export function boundTerminalText(text, maxBytes) {
    if (byteLength(text) <= maxBytes)
        return text;
    const markerBytes = byteLength(TRUNCATED);
    if (markerBytes >= maxBytes)
        return retain(TRUNCATED, maxBytes, 'tail');
    return `${retain(text, maxBytes - markerBytes, 'head')}${TRUNCATED}`;
}
/**
 * Render one created session and its bounded MOTD.
 * @param result - published spawn result.
 * @param maxBytes - complete UTF-8 result cap.
 * @returns Model-facing session acknowledgement.
 */
export function renderSpawn(result, maxBytes) {
    const label = result.name === undefined ? result.sessionId : `${result.sessionId} (${result.name})`;
    const prefix = `started terminal session ${label} [type: ${result.type}]\n`;
    const motd = result.motd || '(no startup output)';
    const complete = `${prefix}${motd}`;
    return byteLength(complete) <= maxBytes ? complete : fitWithPrefix(prefix, motd, maxBytes);
}
/**
 * Render one settled interactive send.
 * @param result - settled send outcome.
 * @param maxBytes - complete UTF-8 result cap.
 * @returns Terminal output plus wait/session markers.
 */
export function renderSend(result, maxBytes) {
    const output = result.viewport || '(no new output)';
    const status = result.sessionStatus.kind === 'running'
        ? 'running'
        : `exited code=${result.sessionStatus.exitCode ?? 'null'} signal=${result.sessionStatus.signal ?? 'null'}`;
    return boundBodyWithSuffix(output, `\n[wait: ${result.waitReason}]\n[session: ${status}]`, result.truncated, maxBytes);
}
/**
 * Render one incremental background operation read.
 * @param read - consuming operation delta.
 * @returns Delta plus its upstream truncation marker. The generic task control
 *   applies the producer's complete-result cap after adding job status.
 */
export function renderSendRead(read) {
    const separator = read.delta.endsWith('\n') || read.delta.length === 0 ? '' : '\n';
    return `${read.delta}${read.truncated ? `${separator}[output truncated]` : ''}`;
}
/**
 * Render one bounded historical page.
 * @param result - retained scrollback page.
 * @param maxBytes - complete UTF-8 result cap.
 * @returns Page text plus pagination and truncation markers.
 */
export function renderRead(result, maxBytes) {
    const output = result.text || '(no retained output)';
    return boundBodyWithSuffix(output, `\n[lines: ${result.lineBegin}-${result.lineEnd} of ${result.totalLines}]`, result.truncated, maxBytes);
}
/**
 * Render owner-visible live sessions.
 * @param sessions - fresh owner-scoped snapshots.
 * @param maxBytes - complete UTF-8 result cap.
 * @returns One line per session or the empty marker.
 */
export function renderList(sessions, maxBytes) {
    if (sessions.length === 0)
        return '(no terminal sessions)';
    const text = sessions.map((session) => {
        const name = session.name === undefined ? '' : ` (${session.name})`;
        const pid = session.pid === undefined ? '' : ` pid=${session.pid}`;
        const status = session.status.kind === 'running'
            ? 'running'
            : `exited code=${session.status.exitCode ?? 'null'} signal=${session.status.signal ?? 'null'}`;
        return `${session.sessionId}${name} [${session.type}] ${status}${pid}`;
    }).join('\n');
    return boundBodyWithSuffix(text, '', false, maxBytes);
}
//# sourceMappingURL=render.js.map