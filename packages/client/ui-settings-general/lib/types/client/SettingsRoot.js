import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Settings shell root: the sidebar-foot trigger row plus the centered modal
 * panel (figma 501:29947, 1080x700) with the section nav rail. The shell is
 * a pure composition face — every piece of text (trigger label, panel title,
 * close label, sections) arrives from registrants through slots; accessible
 * names resolve to that content (trigger: its own text; dialog:
 * aria-labelledby the title node; close: visually-hidden slot text). Modal
 * open state and the active section id are component-local viewing state;
 * the onboarding coordinator mounts exactly one ordered registrant while the
 * sessions-derived empty-Hero fact is active. Visible dialog chrome belongs
 * to the step, so a mounted-but-deciding step paints nothing here.
 */
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ConnectionIndicator, IconAgentPresetOutline16, IconCloseOutline16, IconDataOutline16, IconPersonalizationOutline16, IconSettingsOutline16, } from '@deepseek-ai/dsh-client-ui-primitives';
import css from './SettingsRoot.module.css';
const RECOVERY_CONFIRMATION_MS = 2_000;
/** Nav glyph by section id; unknown ids fall back to the settings gear. */
function navIcon(id) {
    if (id === 'models')
        return _jsx(IconDataOutline16, { className: css.navIcon, size: 16 });
    if (id === 'agent-presets')
        return _jsx(IconAgentPresetOutline16, { className: css.navIcon, size: 16 });
    if (id === 'plugins')
        return _jsx(IconPersonalizationOutline16, { className: css.navIcon, size: 16 });
    return _jsx(IconSettingsOutline16, { className: css.navIcon, size: 16 });
}
/**
 * The modal layer: full-viewport mask + centered panel. Close paths: the
 * header button, a mask click, and document-level Escape (mounted only while
 * open, so the listener lifetime is the panel's).
 */
function SettingsPanel({ rows, renderSlot, activeId, onSelect, onClose }) {
    // Entries can unmount underneath the requested id, so the render-time
    // projection falls back to the first row when the id is gone.
    const active = rows.find(r => r.id === activeId)?.id ?? rows[0]?.id;
    const titleId = useId();
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === 'Escape')
                onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => { document.removeEventListener('keydown', onKeyDown); };
    }, [onClose]);
    // Entering the dialog focuses the close button; the root restores its trigger on close.
    const closeButton = useRef(null);
    useEffect(() => { closeButton.current?.focus(); }, []);
    return (_jsxs("div", { className: css.overlay, role: "presentation", children: [_jsx("div", { className: css.mask, "aria-hidden": "true", onClick: onClose }), _jsxs("div", { className: css.panel, role: "dialog", "aria-modal": "true", "aria-labelledby": titleId, children: [_jsxs("nav", { className: css.nav, children: [_jsx("div", { className: css.navTitle, id: titleId, children: renderSlot('settings.header', {}) }), _jsx("div", { className: css.navList, children: rows.map(row => (_jsxs("button", { type: "button", className: clsx(css.navCell, row.id === active && css.active), "aria-current": row.id === active ? 'true' : undefined, onClick: () => { onSelect(row.id); }, children: [navIcon(row.id), _jsx("span", { className: css.navLabel, children: row.label })] }, row.id))) })] }), _jsxs("div", { className: css.content, children: [_jsxs("div", { className: css.header, children: [_jsx("div", { className: css.actions, children: renderSlot('settings.action', {}) }), _jsxs("button", { ref: closeButton, type: "button", className: css.close, onClick: onClose, children: [_jsx(IconCloseOutline16, { size: 14 }), _jsx("span", { className: css.hiddenLabel, children: renderSlot('settings.close', {}) })] })] }), _jsx("div", { className: css.options, children: active !== undefined && renderSlot('settings.section', { close: onClose }, { only: active }) })] })] })] }));
}
/**
 * Render the settings trigger and panel.
 * @param props - composed slot props (contract/slots.ts).
 * @returns the settings shell element tree.
 */
export function SettingsRoot(props) {
    const { wide, reconnect, useConnectionState, useSections, useOnboardingSteps, useSessions, renderSlot, t, } = props;
    const [open, setOpen] = useState(false);
    const [activeId, setActiveId] = useState(undefined);
    const [completedOnboarding, setCompletedOnboarding] = useState(() => new Set());
    const [showRecovery, setShowRecovery] = useState(false);
    const triggerButton = useRef(null);
    const wasOpen = useRef(open);
    const close = useCallback(() => {
        setOpen(false);
        setActiveId(undefined);
    }, []);
    // Restore after the close commit, when the dialog can no longer own focus.
    useEffect(() => {
        if (wasOpen.current && !open)
            triggerButton.current?.focus();
        wasOpen.current = open;
    }, [open]);
    const openSection = useCallback((id) => {
        setActiveId(id);
        setOpen(true);
    }, []);
    // The ledger tick keeps the nav rows fresh: registrants re-register with
    // freshly localized text on locale change, and the trigger/header/close
    // seats re-render through their own outlets' subscriptions.
    const rows = useSections(s => s);
    const connectionState = useConnectionState(state => state);
    const previousConnectionState = useRef(connectionState);
    const onboardingSteps = useOnboardingSteps(s => s);
    const onboardingActive = useSessions(state => state.phase === 'ready'
        && (state.current === undefined || state.byId[state.current]?.blank === true));
    const onboardingStep = onboardingActive
        ? onboardingSteps.find(step => !completedOnboarding.has(step.id))
        : undefined;
    useEffect(() => {
        if (onboardingActive)
            return;
        setCompletedOnboarding(new Set());
    }, [onboardingActive]);
    useLayoutEffect(() => {
        const previous = previousConnectionState.current;
        previousConnectionState.current = connectionState;
        if (connectionState !== 'connected') {
            setShowRecovery(false);
            return;
        }
        if (previous !== 'disconnected' && previous !== 'connecting')
            return;
        setShowRecovery(true);
        const timeout = window.setTimeout(() => { setShowRecovery(false); }, RECOVERY_CONFIRMATION_MS);
        return () => { window.clearTimeout(timeout); };
    }, [connectionState]);
    const completeOnboardingStep = useCallback((id) => {
        setCompletedOnboarding((previous) => {
            if (previous.has(id))
                return previous;
            return new Set([...previous, id]);
        });
    }, []);
    let connectionIndicator;
    if (connectionState === 'disconnected') {
        connectionIndicator = 'disconnected';
    }
    else if (connectionState === 'connecting') {
        connectionIndicator = 'connecting';
    }
    else if (showRecovery) {
        connectionIndicator = 'recovered';
    }
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: clsx(css.triggerRow, !wide && css.railRow), children: [_jsx("button", { ref: triggerButton, type: "button", className: clsx(css.trigger, !wide && css.rail), "aria-haspopup": "dialog", "aria-expanded": open, onClick: () => { setOpen(true); }, children: renderSlot('settings.trigger', { wide }) }), _jsx(ConnectionIndicator, { state: wide ? connectionIndicator : undefined, disconnectedLabel: t('connection.error'), reconnectLabel: t('connection.retry'), connectingLabel: t('connection.connecting'), recoveredLabel: t('connection.connected'), reconnectActionLabel: t('connection.reconnect'), restartActionLabel: t('connection.restart'), onReconnect: reconnect })] }), open && (_jsx(SettingsPanel, { rows: rows, renderSlot: renderSlot, activeId: activeId, onSelect: setActiveId, onClose: close })), onboardingStep !== undefined && renderSlot('settings.onboarding', {
                stepId: onboardingStep.id,
                complete: () => { completeOnboardingStep(onboardingStep.id); },
                openSection,
            }, { only: onboardingStep.id })] }));
}
//# sourceMappingURL=SettingsRoot.js.map