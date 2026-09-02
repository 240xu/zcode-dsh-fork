import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { IconCloseOutline16 } from "./icons/index.js";
import css from './Modal.module.css';
/**
 * Render a centered, body-portaled modal over a blurred page mask.
 * @param props.open - whether the dialog is showing.
 * @param props.onClose - Escape or mask click.
 * @param props.title - dialog heading (aria-label in every mode).
 * @param props.closeLabel - localized accessible close-button label.
 * @param props.description - optional supporting sentence under the title.
 * @param props.children - body (inputs, etc.).
 * @param props.footer - action row (Cancel / Create).
 * @param props.contentClassName - optional class for a scrollable content region.
 * @param props.headless - render children directly in the card (no default
 * header/close/body chrome); mask, card, Escape, and aria-label remain.
 * @returns null when closed; otherwise the overlay tree.
 */
export function Modal({ open, onClose, title, closeLabel, description, children, footer, className, contentClassName, headless = false, }) {
    useEffect(() => {
        if (!open)
            return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape')
                onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => { document.removeEventListener('keydown', onKeyDown); };
    }, [open, onClose]);
    if (!open)
        return null;
    return createPortal((_jsxs("div", { className: css.root, role: "presentation", children: [_jsx("div", { className: css.mask, "aria-hidden": "true", onClick: onClose }), _jsx("div", { className: clsx(css.dialog, className), role: "dialog", "aria-modal": "true", "aria-label": title, children: headless
                    ? children
                    : (_jsxs(_Fragment, { children: [_jsxs("div", { className: clsx(css.content, contentClassName), children: [_jsxs("div", { className: css.header, children: [_jsx("h2", { className: css.title, children: title }), _jsx("button", { type: "button", className: css.close, "aria-label": closeLabel, onClick: onClose, children: _jsx(IconCloseOutline16, { size: 14 }) })] }), description !== undefined && description !== '' && (_jsx("p", { className: css.description, children: description })), children !== undefined && _jsx("div", { className: css.body, children: children })] }), footer !== undefined && _jsx("div", { className: css.footer, children: footer })] })) })] })), document.body);
}
//# sourceMappingURL=Modal.js.map