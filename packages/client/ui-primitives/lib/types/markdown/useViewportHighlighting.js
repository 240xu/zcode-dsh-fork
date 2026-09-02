import { useCallback, useEffect, useState } from 'react';
import { supportsHighlighting } from "./highlight.js";
const noop = () => { };
/** One document-wide observer; activated elements leave it permanently. */
class HighlightViewport {
    observer;
    activators = new Map();
    observe(element, activate) {
        if (typeof IntersectionObserver === 'undefined') {
            activate();
            return noop;
        }
        this.observer ??= new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting)
                    continue;
                const current = this.activators.get(entry.target);
                /* v8 ignore next -- the observer reports only elements still registered with it. */
                if (current === undefined)
                    continue;
                this.activators.delete(entry.target);
                this.observer?.unobserve(entry.target);
                current();
            }
            this.releaseEmptyObserver();
        });
        this.activators.set(element, activate);
        this.observer.observe(element);
        return () => {
            this.activators.delete(element);
            this.observer?.unobserve(element);
            this.releaseEmptyObserver();
        };
    }
    releaseEmptyObserver() {
        if (this.activators.size > 0)
            return;
        this.observer?.disconnect();
        this.observer = undefined;
    }
}
const highlightViewport = new HighlightViewport();
/**
 * Activate one supported code surface when it first intersects the viewport.
 * Activation lasts for the component lifetime; browsers without
 * IntersectionObserver activate immediately.
 * @param target - Code surface whose plain rendering reserves its geometry.
 * @param lang - Optional language hint.
 * @returns Whether this component may build highlighted output.
 */
export function useViewportHighlighting(target, lang) {
    const supported = supportsHighlighting(lang);
    const [activated, setActivated] = useState(false);
    const activate = useCallback(() => { setActivated(true); }, []);
    useEffect(() => {
        if (activated || !supported)
            return;
        const element = target.current;
        /* v8 ignore next -- React attaches the host ref before running effects. */
        if (element === null)
            return;
        return highlightViewport.observe(element, activate);
    }, [activate, activated, supported, target]);
    return activated && supported;
}
//# sourceMappingURL=useViewportHighlighting.js.map