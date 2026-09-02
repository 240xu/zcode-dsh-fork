import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState, } from 'react';
import { createPortal } from 'react-dom';
import { IconAlarmClockOutline16, IconChevronDownOutline14, useAnchoredPosition, useDismissOnOutsidePointer, } from '@deepseek-ai/dsh-client-ui-primitives';
import css from './ScheduleCatalogAction.module.css';
const EMPTY_RECORDS = [];
const SECOND_MS = 1_000;
const SECOND_UNIT = { unit: 'second', seconds: 1 };
const MEASURE_STYLE = { visibility: 'hidden', left: 0, top: 0 };
const UNIT_SECONDS = [
    { unit: 'day', seconds: 86_400 },
    { unit: 'hour', seconds: 3_600 },
    { unit: 'minute', seconds: 60 },
    SECOND_UNIT,
];
/** Localized unit word for one integral magnitude. */
function unitLabel(unit, value, t) {
    const keys = {
        day: ['unit.day.one', 'unit.day.other'],
        hour: ['unit.hour.one', 'unit.hour.other'],
        minute: ['unit.minute.one', 'unit.minute.other'],
        second: ['unit.second.one', 'unit.second.other'],
    };
    const pair = keys[unit];
    return t(value === 1 ? pair[0] : pair[1], { count: value });
}
/** Pick the largest exact whole unit without rounding the durable interval. */
export function formatScheduleFrequency(record, t) {
    if (record.kind !== 'every')
        return t('frequency.once');
    let selected = SECOND_UNIT;
    for (const candidate of UNIT_SECONDS) {
        if (record.everySeconds % candidate.seconds !== 0)
            continue;
        selected = candidate;
        break;
    }
    const value = record.everySeconds / selected.seconds;
    return t('frequency.every', { value, unit: unitLabel(selected.unit, value, t) });
}
/** Format the durable UTC target in the browser's current locale and time zone. */
export function formatScheduleLocalTime(scheduledAt, locale) {
    return new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(Date.parse(scheduledAt));
}
/** Human relative target using the largest natural clock unit. */
export function formatScheduleRelative(scheduledAt, now, t) {
    const difference = Date.parse(scheduledAt) - now;
    if (difference === 0)
        return t('relative.now');
    const absoluteSeconds = Math.abs(difference) / SECOND_MS;
    const selected = UNIT_SECONDS.find(candidate => absoluteSeconds >= candidate.seconds)
        ?? SECOND_UNIT;
    const value = Math.max(1, difference > 0
        ? Math.ceil(absoluteSeconds / selected.seconds)
        : Math.floor(absoluteSeconds / selected.seconds));
    const unit = unitLabel(selected.unit, value, t);
    return t(difference > 0 ? 'relative.future' : 'relative.overdue', { value, unit });
}
/** Overdue records first, then ascending target time; exact ties stay stable. */
export function orderScheduleRecords(records, now) {
    return records.map((record, index) => ({ record, index })).sort((left, right) => {
        const leftTime = Date.parse(left.record.scheduledAt);
        const rightTime = Date.parse(right.record.scheduledAt);
        const leftOverdue = leftTime <= now;
        const rightOverdue = rightTime <= now;
        if (leftOverdue !== rightOverdue)
            return Number(rightOverdue) - Number(leftOverdue);
        return leftTime - rightTime || left.index - right.index;
    }).map(({ record }) => record);
}
/** Read-only current-Session active reminder catalog. */
export function ScheduleCatalogAction({ useSession, useProjection, t }) {
    const openState = useSession(snapshot => snapshot.openState);
    const projected = useProjection('schedule');
    const records = projected ?? EMPTY_RECORDS;
    const visible = openState === 'open' && records.length > 0;
    const [open, setOpen] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const rootRef = useRef(null);
    const triggerRef = useRef(null);
    const catalogRef = useRef(null);
    const catalogPosition = useAnchoredPosition({
        open,
        anchorRef: triggerRef,
        panelRef: catalogRef,
        side: 'bottom',
        gap: 5,
        margin: 16,
    });
    useDismissOnOutsidePointer(rootRef, open, setOpen, catalogRef);
    useEffect(() => {
        if (!open)
            return;
        setNow(Date.now());
        const timer = setInterval(() => { setNow(Date.now()); }, SECOND_MS);
        return () => { clearInterval(timer); };
    }, [open]);
    useEffect(() => {
        if (visible || !open)
            return;
        setOpen(false);
    }, [visible, open]);
    const rows = useMemo(() => orderScheduleRecords(records, now), [records, now]);
    if (!visible)
        return null;
    const countKey = records.length === 1 ? 'trigger.one' : 'trigger.other';
    const countLabel = t(countKey, { count: records.length });
    const toggleCatalog = () => {
        setNow(Date.now());
        setOpen(current => !current);
    };
    const onKeyDown = (event) => {
        if (event.key !== 'Escape' || !open)
            return;
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
    };
    const trigger = (_jsxs("button", { ref: triggerRef, type: "button", className: css.trigger, "aria-expanded": open, "aria-label": countLabel, onClick: toggleCatalog, children: [_jsx(IconAlarmClockOutline16, { size: 14 }), _jsx("span", { className: css.count, children: countLabel }), _jsx(IconChevronDownOutline14, { className: open ? css.triggerOpen : undefined })] }));
    const catalog = open
        ? createPortal((_jsx("ul", { ref: catalogRef, className: css.menu, style: catalogPosition ?? MEASURE_STYLE, "aria-label": t('list.aria'), children: rows.map((record) => {
                const overdue = Date.parse(record.scheduledAt) <= now;
                return (_jsxs("li", { className: overdue ? `${css.row} ${css.rowOverdue}` : css.row, children: [_jsxs("span", { className: css.status, children: [_jsx("span", { className: css.statusDot, "aria-hidden": "true" }), _jsx("span", { children: t(overdue ? 'status.overdue' : 'status.scheduled') })] }), _jsx("span", { className: css.prompt, children: record.prompt }), _jsxs("span", { className: css.metadata, children: [_jsx("span", { children: formatScheduleFrequency(record, t) }), _jsx("span", { "aria-hidden": "true", children: "\u00B7" }), _jsx("span", { children: formatScheduleLocalTime(record.scheduledAt, document.documentElement.lang) }), _jsx("span", { "aria-hidden": "true", children: "\u00B7" }), _jsx("span", { className: overdue ? css.relativeOverdue : undefined, children: formatScheduleRelative(record.scheduledAt, now, t) })] })] }, record.id));
            }) })), document.body)
        : null;
    return (_jsxs("div", { ref: rootRef, className: css.root, onKeyDown: onKeyDown, children: [trigger, catalog] }));
}
//# sourceMappingURL=ScheduleCatalogAction.js.map