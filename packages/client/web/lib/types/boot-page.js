import css from './boot-page.module.css';
/** Create a div with one module class and optional text. */
function div(className, text) {
    const el = document.createElement('div');
    el.className = className ?? '';
    if (text !== undefined)
        el.textContent = text;
    return el;
}
/** Kernel-owned page mounted below the application's root element. */
export class BootPage {
    root;
    card;
    wordmark;
    spinner;
    hint;
    states = new Map();
    active = new Set();
    total = 0;
    failure;
    /**
     * Build and attach the boot page.
     * @param container - Application mount point.
     */
    constructor(container) {
        this.root = div(css.boot);
        this.root.dataset.dshBoot = '';
        this.card = div(css.card);
        this.wordmark = div(css.wordmark, 'HARNESS');
        this.spinner = div(css.spinner);
        this.spinner.dataset.dshBootSpinner = '';
        this.hint = div(css.hint, 'Loading plugins…');
        this.card.append(this.wordmark, this.spinner, this.hint);
        this.root.append(this.card);
        container.append(this.root);
        this.updateProgress();
    }
    /**
     * Set the number of loader entries represented by the progress arc.
     * @param total - Complete boot roster size.
     */
    setTotal(total) {
        this.total = total;
        this.updateProgress();
    }
    /**
     * Project one loader entry's fiber state.
     * @param id - Loader entry name.
     * @param state - Projected fiber state.
     */
    setState(id, state) {
        this.states.set(id, state);
        if (state === 'active')
            this.active.add(id);
        this.updateProgress();
        this.render();
    }
    /**
     * Display the boot failure report.
     * @param message - Failure report text.
     */
    fail(message) {
        this.failure = message;
        this.render();
    }
    /** Detach the page before or after the UI renderer takes the mount point. */
    dispose() {
        this.root.remove();
    }
    /** Redraw the state-dependent content below the wordmark. */
    render() {
        const failed = [...this.states].filter(([, state]) => state === 'failed').map(([id]) => id);
        if (this.failure === undefined && failed.length === 0) {
            if (this.spinner.parentElement !== this.card) {
                this.card.replaceChildren(this.wordmark, this.spinner, this.hint);
            }
            return;
        }
        const report = div(css.failed);
        report.append(div(css.failedTitle, 'Failed to load plugins'));
        for (const id of failed)
            report.append(div(css.failedItem, id));
        if (this.failure !== undefined)
            report.append(div(css.failedItem, this.failure));
        this.card.replaceChildren(this.wordmark, report);
    }
    /** Grow the rotating arc monotonically as loader entries activate. */
    updateProgress() {
        const ratio = this.total === 0 ? 0 : Math.min(this.active.size / this.total, 1);
        this.spinner.style.setProperty('--dsh-boot-arc', `${String(Math.round(72 + ratio * 216))}deg`);
    }
}
//# sourceMappingURL=boot-page.js.map