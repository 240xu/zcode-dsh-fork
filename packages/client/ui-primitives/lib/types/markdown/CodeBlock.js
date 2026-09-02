import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Fragment, useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import clsx from 'clsx';
import { writeClipboard } from "../clipboard.js";
import { StreamingHighlightSession, grammarLoadCount, highlightToHtml, subscribeGrammarLoaded, } from "./highlight.js";
import { useViewportHighlighting } from "./useViewportHighlighting.js";
import css from './CodeBlock.module.css';
/**
 * The `pre` attributes shiki's HTML arm emits for the css-variables theme,
 * mirrored so the streaming arm's tree is interchangeable with the settled
 * swap (`tests/streaming-code-block.client.spec.tsx` pins the two arms'
 * parity).
 */
const SHIKI_PRE_PROPS = {
    className: 'shiki css-variables',
    style: { backgroundColor: 'var(--shiki-background)', color: 'var(--shiki-foreground)' },
    tabIndex: 0,
};
/** Completed-line group size; React reconciles groups while the DOM remains line-for-line identical. */
const STREAMING_LINE_GROUP_SIZE = 32;
function renderLine(line, index) {
    return (_jsxs(Fragment, { children: [index > 0 && '\n', _jsx("span", { className: "line", children: line.map((span, spanIndex) => _jsx("span", { style: span.style, children: span.text }, spanIndex)) })] }, index));
}
export function CodeBlock({ code, lang, streaming, className, copyLabel, copiedLabel }) {
    const trimmed = code.endsWith('\n') ? code.slice(0, -1) : code;
    const rootRef = useRef(null);
    const highlighting = useViewportHighlighting(rootRef, lang);
    // Re-render when a lazy grammar finishes loading, so a fence that showed plain
    // text while its language's grammar imported picks up highlighting. The
    // snapshot value is opaque; only its change across renders drives the memo.
    const loaded = useSyncExternalStore(subscribeGrammarLoaded, grammarLoadCount, grammarLoadCount);
    // Streaming state lives in refs mutated inside the memo (the MarkdownText
    // streaming-cache pattern): the session's caches carry across chunks only
    // because the owner keys this instance stably while the fence grows.
    const sessionRef = useRef(null);
    const lineCacheRef = useRef(null);
    const settledRef = useRef(false);
    const streamedBody = useMemo(() => {
        if (!highlighting) {
            sessionRef.current = null;
            lineCacheRef.current = null;
            settledRef.current = false;
            return undefined;
        }
        if (streaming !== true) {
            const previous = lineCacheRef.current;
            if (previous !== null && previous.code === trimmed && previous.lang === lang) {
                settledRef.current = true;
                return previous.body;
            }
            sessionRef.current = null;
            lineCacheRef.current = null;
            settledRef.current = true;
            return undefined;
        }
        if (settledRef.current) {
            sessionRef.current = null;
            lineCacheRef.current = null;
            settledRef.current = false;
        }
        sessionRef.current ??= new StreamingHighlightSession();
        const frame = sessionRef.current.updateFrame(trimmed, lang);
        if (frame === undefined) {
            lineCacheRef.current = null;
            return undefined;
        }
        const previous = lineCacheRef.current;
        if (previous?.frame === frame && previous.code === trimmed && previous.lang === lang) {
            return previous.body;
        }
        const sameGeneration = previous?.generation === frame.generation;
        const groups = sameGeneration ? [...previous.groups] : [];
        let pending = sameGeneration ? [...previous.pending] : [];
        let nextLine = sameGeneration ? previous.nextLine : 0;
        for (const line of frame.appended) {
            pending.push(renderLine(line, nextLine));
            nextLine += 1;
            if (pending.length !== STREAMING_LINE_GROUP_SIZE)
                continue;
            const start = nextLine - pending.length;
            groups.push(_jsx(Fragment, { children: pending }, start));
            pending = [];
        }
        const tail = frame.tail.map((line, index) => renderLine(line, nextLine + index));
        const tailGroup = _jsx(Fragment, { children: [...pending, ...tail] }, nextLine - pending.length);
        const body = _jsx("pre", { ...SHIKI_PRE_PROPS, children: _jsxs("code", { children: [groups, tailGroup] }) });
        lineCacheRef.current = {
            code: trimmed, lang, generation: frame.generation, frame, groups, pending, nextLine, body,
        };
        return body;
    }, [streaming, highlighting, trimmed, lang, loaded]);
    const html = useMemo(() => (highlighting && streaming !== true && streamedBody === undefined
        ? highlightToHtml(trimmed, lang)
        : undefined), [streaming, highlighting, streamedBody, trimmed, lang, loaded]);
    const [copied, setCopied] = useState(false);
    const onCopy = useCallback(() => {
        if (copied)
            return;
        /* v8 ignore next -- both arms always mount a <pre>; trimmed is the
           typed fallback if the DOM shape ever diverges. */
        const text = rootRef.current?.querySelector('pre')?.textContent ?? trimmed;
        void writeClipboard(text).then((ok) => {
            if (!ok)
                return;
            setCopied(true);
            window.setTimeout(() => { setCopied(false); }, 1000);
        });
    }, [copied, trimmed]);
    // shiki's HTML output is a static span tree it generated from `code` (no
    // user HTML passes through), the sanctioned innerHTML consumption path per
    // shiki's own docs.
    const body = streamedBody !== undefined
        ? streamedBody
        : html === undefined
            ? (_jsx("pre", { className: css.plain, children: _jsx("code", { children: trimmed }) }))
            : (_jsx("div", { dangerouslySetInnerHTML: { __html: html } }));
    return (_jsxs("div", { ref: rootRef, className: clsx(css.block, 'md-code-block', className), children: [_jsx("div", { className: css.bannerWrap, children: _jsxs("div", { className: css.banner, children: [_jsx("div", { className: css.infostring, children: lang ?? '' }), _jsx("div", { className: css.action, children: _jsx("button", { type: "button", className: css.copyButton, onClick: onCopy, children: copied ? copiedLabel : copyLabel }) })] }) }), body] }));
}
//# sourceMappingURL=CodeBlock.js.map