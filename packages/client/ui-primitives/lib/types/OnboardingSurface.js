import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import css from './OnboardingSurface.module.css';
/**
 * Render a body-portaled onboarding stage and keep the application root inert
 * while mounted.
 * @param props.children - the step's page content, centered on the stage.
 * @returns the body-portaled overlay tree.
 */
export function OnboardingSurface({ children }) {
    useEffect(() => {
        const appRoot = document.getElementById('root');
        if (appRoot === null)
            return;
        appRoot.inert = true;
        return () => { appRoot.inert = false; };
    }, []);
    return createPortal((_jsxs("div", { className: css.onboardingOverlay, role: "presentation", children: [_jsx("div", { className: css.onboardingMask, "aria-hidden": "true" }), _jsx("div", { className: css.onboardingStage, children: children })] })), document.body);
}
//# sourceMappingURL=OnboardingSurface.js.map