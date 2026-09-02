import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useEffect, useId, useRef, useState, } from 'react';
import css from './TurnNavigator.module.css';
/** Fixed pitch between neighbouring marks; overflow scrolls inside the frame. */
const TURN_SPACING_PX = 10;
/** Rail padding above the first mark and below the last one, per end. */
const RAIL_INSET_PX = 6;
/** Fade band the mask reserves at a scrollable end. */
const FADE_PX = 24;
function itemPosition(index) {
    return { '--turn-natural-position': `${String(index * TURN_SPACING_PX)}px` };
}
function frameStyle(count, scrollTop) {
    return {
        '--turn-natural-height': `${String((count - 1) * TURN_SPACING_PX + 2 * RAIL_INSET_PX)}px`,
        '--turn-rail-inset': `${String(RAIL_INSET_PX)}px`,
        '--turn-scroll-top': `${String(scrollTop)}px`,
    };
}
function itemAtPointer(items, frame, scrollTop, clientY) {
    const rect = frame.getBoundingClientRect();
    const offset = clientY - rect.top + scrollTop - RAIL_INSET_PX;
    const index = Math.max(0, Math.min(items.length - 1, Math.round(offset / TURN_SPACING_PX)));
    return items[index];
}
const RAIL_AT_REST = { top: 0, canScrollUp: false, canScrollDown: false };
function railScrollState(scroller) {
    const top = scroller.scrollTop;
    return {
        top,
        canScrollUp: top > 1,
        canScrollDown: top < scroller.scrollHeight - scroller.clientHeight - 1,
    };
}
function sameRailScrollState(left, right) {
    return left.top === right.top
        && left.canScrollUp === right.canScrollUp
        && left.canScrollDown === right.canScrollDown;
}
function TurnNavigatorRail({ items, activeTurn, busyTurn, onNavigate, t }) {
    const [previewTurn, setPreviewTurn] = useState(null);
    const [scrollState, setScrollState] = useState(RAIL_AT_REST);
    const scrollerRef = useRef(null);
    /** While the pointer works the rail, follow must not move it under the hand. */
    const pointerInsideRef = useRef(false);
    const previewId = useId();
    const syncScrollState = () => {
        const scroller = scrollerRef.current;
        if (scroller === null)
            return;
        const next = railScrollState(scroller);
        setScrollState(current => sameRailScrollState(current, next) ? current : next);
    };
    // Frame resizes (band/composer changes) move the overflow edges without a
    // scroll event; item count changes move the content height the same way.
    useEffect(() => {
        const scroller = scrollerRef.current;
        if (scroller === null || typeof ResizeObserver === 'undefined')
            return;
        const observer = new ResizeObserver(syncScrollState);
        observer.observe(scroller);
        return () => { observer.disconnect(); };
    }, []);
    useEffect(syncScrollState, [items.length]);
    // Keep the active mark visible: centre it whenever it leaves the scrollport,
    // unless the reader's pointer is working the rail.
    useEffect(() => {
        const scroller = scrollerRef.current;
        const index = items.findIndex(item => item.turn === activeTurn);
        if (scroller === null || index < 0 || pointerInsideRef.current)
            return;
        const markTop = index * TURN_SPACING_PX + RAIL_INSET_PX;
        const viewTop = scroller.scrollTop;
        const viewHeight = scroller.clientHeight;
        if (viewHeight <= 0 || (markTop >= viewTop + FADE_PX && markTop <= viewTop + viewHeight - FADE_PX))
            return;
        const target = Math.max(0, markTop - viewHeight / 2);
        const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (typeof scroller.scrollTo === 'function') {
            scroller.scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' });
        }
        else {
            scroller.scrollTop = target;
        }
        syncScrollState();
    }, [activeTurn, items]);
    if (items.length < 2)
        return null;
    const previewIndex = items.findIndex(item => item.turn === previewTurn);
    const preview = previewIndex < 0 ? undefined : items[previewIndex];
    const previewPosition = previewIndex < 0 ? undefined : itemPosition(previewIndex);
    const previewAtPointer = (event) => {
        const scrollTop = scrollerRef.current?.scrollTop ?? 0;
        setPreviewTurn(itemAtPointer(items, event.currentTarget, scrollTop, event.clientY)?.turn ?? null);
    };
    const navigateAtPointer = (event) => {
        const scrollTop = scrollerRef.current?.scrollTop ?? 0;
        const item = itemAtPointer(items, event.currentTarget, scrollTop, event.clientY);
        if (item !== undefined)
            onNavigate(item);
    };
    const fadeClasses = [css.scroller];
    if (scrollState.canScrollUp)
        fadeClasses.push(css.fadeTop);
    if (scrollState.canScrollDown)
        fadeClasses.push(css.fadeBottom);
    return (_jsx("div", { className: css.slot, children: _jsxs("nav", { className: css.frame, style: frameStyle(items.length, scrollState.top), "aria-label": t('chat.turnNavigation.label'), onClick: navigateAtPointer, onPointerMove: previewAtPointer, onPointerEnter: () => { pointerInsideRef.current = true; }, onPointerLeave: () => {
                pointerInsideRef.current = false;
                setPreviewTurn(null);
            }, children: [_jsx("div", { ref: scrollerRef, className: fadeClasses.join(' '), onScroll: () => { syncScrollState(); }, children: _jsx("div", { className: css.marks, children: items.map((item, index) => {
                            const active = item.turn === activeTurn;
                            const showingPreview = item.turn === previewTurn;
                            const classes = [css.mark];
                            if (item.anchor.kind === 'unloaded')
                                classes.push(css.markUnloaded);
                            if (active)
                                classes.push(css.markActive);
                            else if (showingPreview)
                                classes.push(css.markPreview);
                            if (item.turn === busyTurn)
                                classes.push(css.markBusy);
                            return (_jsx("div", { className: css.markPosition, style: itemPosition(index), children: _jsx("button", { type: "button", className: classes.join(' '), "aria-label": t(item.anchor.kind === 'loaded' ? 'chat.turnNavigation.jump' : 'chat.turnNavigation.jumpLoad', { turn: item.turn }), "aria-current": active ? 'true' : undefined, "aria-busy": item.turn === busyTurn ? 'true' : undefined, "aria-describedby": showingPreview ? previewId : undefined, onClick: (event) => {
                                        event.stopPropagation();
                                        onNavigate(item);
                                    }, onFocus: () => { setPreviewTurn(item.turn); }, onBlur: () => { setPreviewTurn(null); } }) }, item.turn));
                        }) }) }), preview !== undefined && previewPosition !== undefined && (_jsxs("div", { id: previewId, role: "tooltip", className: css.preview, style: previewPosition, children: [_jsx("div", { className: css.previewPrompt, children: preview.prompt || t('chat.turnNavigation.turn', { turn: preview.turn }) }), preview.response !== '' && _jsx("div", { className: css.previewResponse, children: preview.response })] }))] }) }));
}
/**
 * Fixed-pitch rail of every known Turn — loaded marks scroll, unloaded marks
 * page history in first — with hover and focus previews. Overflow scrolls
 * inside the frame, gradient fades marking each scrollable end, and the
 * active mark keeps itself in view while the pointer is elsewhere.
 *
 * Memoized because it renders two host elements per Turn while the
 * enclosing view re-renders on every streaming delta: without the guard a long
 * session rebuilds hundreds of marks per commit for a rail that only changes
 * when a Turn is added, removed, or becomes active. Its props must therefore
 * stay referentially stable across those commits.
 */
export const TurnNavigator = memo(TurnNavigatorRail);
//# sourceMappingURL=TurnNavigator.js.map