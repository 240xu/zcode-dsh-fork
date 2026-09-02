import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { IconCheckOutline16, IconWarningOutline16 } from "./icons/index.js";
import css from './ConnectionIndicator.module.css';
/**
 * Render an inline connection-recovery control.
 * @param props.state - visible outage, retry-attempt, or recovered state.
 * @param props.disconnectedLabel - localized outage text.
 * @param props.reconnectLabel - localized action text shown on hover or focus.
 * @param props.connectingLabel - localized retry text followed by the attempt dots.
 * @param props.recoveredLabel - localized recovery confirmation.
 * @param props.reconnectActionLabel - accessible label for the outage action.
 * @param props.restartActionLabel - accessible label for replacing an active attempt.
 * @param props.onReconnect - request an immediate reconnect attempt.
 * @returns the indicator, or null when no connection feedback is active.
 */
export function ConnectionIndicator({ state, disconnectedLabel, reconnectLabel, connectingLabel, recoveredLabel, reconnectActionLabel, restartActionLabel, onReconnect, }) {
    if (state === undefined)
        return null;
    const sizeLabels = (_jsxs(_Fragment, { children: [_jsx("span", { className: css.sizeLabel, "aria-hidden": "true", children: disconnectedLabel }), _jsx("span", { className: css.sizeLabel, "aria-hidden": "true", children: reconnectLabel }), _jsxs("span", { className: css.sizeLabel, "aria-hidden": "true", children: [connectingLabel, _jsx("span", { className: css.dots, children: "..." })] }), _jsx("span", { className: css.sizeLabel, "aria-hidden": "true", children: recoveredLabel })] }));
    if (state === 'recovered') {
        return (_jsxs("div", { className: `${css.indicator} ${css.success}`, role: "status", "aria-label": recoveredLabel, children: [_jsx("span", { className: css.icon, "aria-hidden": "true", children: _jsx(IconCheckOutline16, { size: 14 }) }), _jsxs("span", { className: css.label, children: [sizeLabels, _jsx("span", { className: css.stateLabel, children: recoveredLabel })] })] }));
    }
    const connecting = state === 'connecting';
    return (_jsxs("button", { type: "button", className: `${css.indicator} ${css.warning}`, "data-phase": state, "aria-label": connecting ? restartActionLabel : reconnectActionLabel, onClick: onReconnect, children: [_jsx("span", { className: css.icon, "aria-hidden": "true", children: _jsx(IconWarningOutline16, { size: 14 }) }), _jsxs("span", { className: css.label, children: [sizeLabels, _jsx("span", { className: css.stateLabel, children: connecting
                            ? (_jsxs(_Fragment, { children: [connectingLabel, _jsxs("span", { className: css.dots, "aria-hidden": "true", children: [_jsx("span", { children: "." }), _jsx("span", { className: css.secondDot, children: "." }), _jsx("span", { className: css.thirdDot, children: "." })] })] }))
                            : disconnectedLabel }), _jsx("span", { className: css.hoverLabel, children: reconnectLabel })] })] }));
}
//# sourceMappingURL=ConnectionIndicator.js.map