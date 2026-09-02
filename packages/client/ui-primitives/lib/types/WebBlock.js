import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import { MarkdownText } from "./markdown/MarkdownText.js";
import css from './WebBlock.module.css';
/**
 * The URL to link to, or undefined when the URL must render as plain text. Only
 * http(s) becomes a navigable external anchor, so a `javascript:`/`data:`/`file:`
 * URL or an unparseable string never reaches the DOM as an href. This is the
 * http(s) subset of the allowlist MarkdownText applies to untrusted links —
 * MarkdownText also permits `mailto:`, deliberately excluded here since a
 * retrieval URL is never a mail address.
 * @param url - the source or fetch URL, from tool result content.
 * @returns the href to use, or undefined for plain text.
 */
function safeHref(url) {
    try {
        const { protocol } = new URL(url);
        return protocol === 'http:' || protocol === 'https:' ? url : undefined;
    }
    catch {
        return undefined;
    }
}
/**
 * The link's visible label: the title when the provider gave one, otherwise the
 * URL's hostname, falling back to the raw URL when it does not parse OR parses
 * to an empty hostname (a `file:`/`data:`/`javascript:` URL), so a label is
 * never blank.
 * @param url - the source URL.
 * @param title - the provider title, if any.
 * @returns the label text.
 */
function linkLabel(url, title) {
    if (title !== undefined && title !== '')
        return title;
    try {
        const { hostname } = new URL(url);
        return hostname === '' ? url : hostname;
    }
    catch {
        return url;
    }
}
/**
 * A single URL rendered as a safe external anchor, or as plain text when the
 * URL is not an http(s) link.
 * @param props.url - the URL to render.
 * @param props.label - the visible label.
 * @param props.className - class for the anchor or the plain span.
 * @returns the anchor or span element.
 */
function SafeLink({ url, label, className }) {
    const href = safeHref(url);
    if (href === undefined)
        return _jsx("span", { className: className, children: label });
    return (_jsx("a", { className: className, href: href, target: "_blank", rel: "noopener noreferrer", children: label }));
}
/**
 * One source row in a search card: the safe link plus its snippet and date. The
 * `<li value>` pins the source's 1-based citation index explicitly rather than
 * relying on the `<ol>`'s implicit numbering, so a row reads by its real index
 * even inside the scroll container.
 * @param props.source - the source to render.
 * @param props.ordinal - the source's 1-based position in the full list.
 * @returns the source list item.
 */
function SourceItem({ source, ordinal }) {
    return (_jsxs("li", { className: css.source, value: ordinal, children: [_jsx(SafeLink, { url: source.url, label: linkLabel(source.url, source.title), className: css.sourceLink }), source.snippet !== undefined && source.snippet !== '' && (_jsx("div", { className: css.snippet, children: source.snippet })), source.publishedAt !== undefined && source.publishedAt !== '' && (_jsx("div", { className: css.published, children: source.publishedAt }))] }));
}
/**
 * The search card body: the answer over the full source list, which scrolls in
 * place once it exceeds the `.sources` container height.
 * @param props - see {@link WebSearchBlockProps}.
 * @returns the search card element.
 */
function WebSearchBlock({ answer, sources, truncated, labels, className }) {
    // A provider may legitimately return no answer and no sources; the chat WebRow
    // does not show the raw result content, so without this the user would see an
    // empty card. Mirror the backend's `No results found.` render text.
    const empty = (answer === undefined || answer === '') && sources.length === 0;
    return (_jsxs("div", { className: clsx(css.block, className), "data-web": "search", children: [answer !== undefined && answer !== '' && (_jsx("div", { className: css.answer, children: _jsx(MarkdownText, { text: answer, labels: labels.markdown }) })), empty ? (_jsx("div", { className: css.empty, children: labels.noResults })) : (_jsx("ol", { className: css.sources, children: sources.map((source, index) => _jsx(SourceItem, { source: source, ordinal: index + 1 }, index)) })), truncated && _jsx("div", { className: css.truncated, children: labels.sourcesTruncated })] }));
}
/**
 * The fetch card body: the linked URL and its HTTP status.
 * @param props - see {@link WebFetchBlockProps}.
 * @returns the fetch card element.
 */
function WebFetchBlock({ url, statusCode, truncated, labels, className }) {
    return (_jsxs("div", { className: clsx(css.block, css.fetch, className), "data-web": "fetch", children: [_jsx(SafeLink, { url: url, label: url, className: css.fetchUrl }), _jsxs("div", { className: css.fetchMeta, children: [_jsxs("span", { className: css.status, children: [labels.http, " ", statusCode] }), truncated && _jsx("span", { className: css.truncated, children: labels.contentTruncated })] })] }));
}
/**
 * Render a completed web retrieval as a structured card.
 * @param props - see {@link WebBlockProps}; `kind` selects the search or fetch body.
 * @returns the web card element.
 */
export function WebBlock(props) {
    return props.kind === 'search' ? _jsx(WebSearchBlock, { ...props }) : _jsx(WebFetchBlock, { ...props });
}
//# sourceMappingURL=WebBlock.js.map