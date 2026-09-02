import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { ReferenceIcon } from "./ReferenceIcon.js";
import css from './user-text.module.css';
/** The wire form a session chip serializes to; label is the display text. */
const SESSION_WIRE_RE = /@\[([^\]\n]+)\]\(dsh-session:[^)\s]+\)/gu;
/**
 * Split one sent text into inline plain runs and reference chips.
 * @param text - the logged model text of the message or queue row.
 * @param sessionLabels - exact session mention labels associated by an adjacent recall.
 * @returns inline nodes covering the whole text.
 */
export function projectUserText(text, sessionLabels) {
    const ranges = [];
    SESSION_WIRE_RE.lastIndex = 0;
    let wire;
    while ((wire = SESSION_WIRE_RE.exec(text)) !== null) {
        ranges.push({
            start: wire.index,
            end: wire.index + wire[0].length,
            label: wire[0],
            kind: 'session',
            display: wire[1], // non-optional capture in SESSION_WIRE_RE
        });
    }
    for (const rawLabel of [...new Set(sessionLabels)].sort((a, b) => b.length - a.length)) {
        const label = `@${rawLabel}`;
        let start = text.indexOf(label);
        while (start >= 0) {
            ranges.push({ start, end: start + label.length, label, kind: 'session' });
            start = text.indexOf(label, start + label.length);
        }
    }
    const re = /(^|\s)(\/[\w-]+|@"[^"\n]+"|@[^\s]+)/gu;
    let m;
    while ((m = re.exec(text)) !== null) {
        const tokenStart = m.index + m[1].length; // (^|\s) captures '' at line start
        const rawLabel = m[2]; // non-optional alternation capture
        const label = rawLabel.startsWith('@"')
            ? rawLabel
            : rawLabel.replace(/[.,;:!?，。；：！？]+$/gu, '');
        if (label.length <= 1)
            continue;
        ranges.push({ start: tokenStart, end: tokenStart + label.length, label, kind: 'plain' });
    }
    const rankOf = (range) => range.kind === 'session' ? 0 : 1;
    ranges.sort((a, b) => a.start - b.start || rankOf(a) - rankOf(b) || b.end - a.end);
    const parts = [];
    let cursor = 0;
    const pushPlain = (from, to) => {
        parts.push(_jsx("span", { className: css.plainRun, children: text.slice(from, to) }, `t${from}`));
    };
    for (const range of ranges) {
        if (range.start < cursor)
            continue;
        const { start: tokenStart, end, label, kind } = range;
        if (tokenStart > cursor)
            pushPlain(cursor, tokenStart);
        const referenceKind = kind === 'session'
            ? 'session'
            : label.startsWith('@')
                ? label.endsWith('/') ? 'folder' : 'file'
                : undefined;
        const displayLabel = range.display
            ?? (referenceKind === undefined
                ? label
                : referenceKind === 'session'
                    ? label.slice(1)
                    : label.slice(1).replace(/^"|"$/gu, '').split(/[\\/]/u).filter(Boolean).at(-1) ?? label.slice(1));
        parts.push(_jsxs("span", { className: css.refChip, "data-ref-chip": referenceKind ?? 'skill', title: label, children: [referenceKind !== undefined && (_jsx(ReferenceIcon, { kind: referenceKind, size: 16, className: css.refIcon })), displayLabel] }, tokenStart));
        cursor = end;
    }
    if (parts.length === 0)
        return _jsx("span", { className: css.plainRun, children: text });
    if (cursor < text.length)
        pushPlain(cursor, text.length);
    return _jsx(_Fragment, { children: parts });
}
//# sourceMappingURL=user-text.js.map