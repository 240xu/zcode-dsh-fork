import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { basename } from "./turn-deliverables.js";
import css from './ProducedFiles.module.css';
/** Maximum number of file chips rendered before the remainder counter. */
const SHOWN_LIMIT = 6;
function moreLabel(t, count) {
    return count === 1 ? t('produced.moreOne') : t('produced.more', { count: String(count) });
}
/**
 * Render one turn's produced files as openable chips.
 * @param props - selector-matched paths, the chat view's file opener, and the locale seat.
 * @returns The produced-files row.
 */
export function ProducedFiles({ matched: paths, openFile, isLoopback, ensureWorkspacePathOpen, useWorkspacePathOpen, t, }) {
    useEffect(() => { ensureWorkspacePathOpen(); }, [ensureWorkspacePathOpen]);
    const hostCanOpenPath = useWorkspacePathOpen(available => available === true);
    const canOpenPath = isLoopback && hostCanOpenPath;
    const shown = paths.slice(0, SHOWN_LIMIT);
    return (_jsxs("div", { className: css.root, children: [_jsx("span", { className: css.label, children: t('produced.label') }), _jsxs("div", { className: css.lane, children: [_jsxs("div", { className: css.row, "data-produced-files-row": true, children: [shown.map(path => (_jsx("button", { type: "button", className: css.file, 
                                // The full path is the disambiguator when two turns produce files
                                // that share a basename; the chip itself stays short.
                                title: path, "aria-label": t('produced.open', { name: path }), onClick: () => { openFile(path); }, children: basename(path) }, path))), shown.map((_, index) => {
                                const shownCount = index + 1;
                                const remainder = paths.length - shownCount;
                                if (remainder <= 0)
                                    return null;
                                return (_jsx("span", { className: css.more, "data-shown": shownCount, children: moreLabel(t, remainder) }, shownCount));
                            })] }), paths.length > 1 && canOpenPath && (_jsx("button", { type: "button", className: css.showFolder, onClick: () => { openFile('.'); }, children: t('produced.showInFolder') }))] })] }));
}
//# sourceMappingURL=ProducedFiles.js.map