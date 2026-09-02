import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Render the shared head-tail fold control with caller-owned localized copy.
 * @param props - Fold state, localized labels, and toggle callback.
 * @returns The accessible expand or collapse button.
 */
export function FoldToggle({ className, expanded, hidden, labels, onToggle, }) {
    return (_jsx("button", { type: "button", className: className, "aria-expanded": expanded, "aria-label": expanded ? labels.collapseAria : labels.expandAria(hidden), onClick: onToggle, children: expanded ? labels.collapse : labels.expand(hidden) }));
}
//# sourceMappingURL=FoldToggle.js.map