/** Failure containment and shutdown coordination for the Inspector Worker. */
import { parseInspectorWorkerControl } from "../../shared/bridge/control-codec.js";
/** Tracks Worker termination without removing the listener that contains runtime errors. */
export class InspectorWorkerLifecycle {
    worker;
    exitResolution = Promise.withResolvers();
    failureResolution = Promise.withResolvers();
    failure;
    running = false;
    expectedExit = false;
    notified = false;
    onUnexpectedExit;
    exitCodeValue;
    /** Worker exit code once its `exit` event has fired. */
    get exitCode() {
        return this.exitCodeValue;
    }
    constructor(worker) {
        this.worker = worker;
        worker.on('error', (error) => {
            this.failure ??= error;
            this.failureResolution.resolve(error);
            this.notifyUnexpectedExit();
        });
        worker.once('exit', (code) => {
            this.exitCodeValue = code;
            this.exitResolution.resolve(code);
            this.notifyUnexpectedExit();
        });
    }
    /**
     * Wait for the validated ready frame while also observing startup failure and exit.
     * @param timeoutMs - Readiness deadline in milliseconds.
     * @returns The Worker's bound endpoint fields.
     */
    async waitForReady(timeoutMs) {
        let timer;
        let onMessage;
        const message = new Promise((resolve, reject) => {
            onMessage = (value) => {
                let control;
                try {
                    control = parseInspectorWorkerControl(value);
                }
                catch (error) {
                    reject(error instanceof Error ? error : new Error(String(error)));
                    return;
                }
                if (control.type === 'ready')
                    resolve(control);
                else if (control.type === 'failure')
                    reject(new Error(`inspector Worker failed: ${control.message}`));
            };
            timer = setTimeout(() => {
                reject(new Error(`inspector Worker did not become ready within ${String(timeoutMs)}ms`));
            }, timeoutMs);
            this.worker.on('message', onMessage);
        });
        try {
            return await Promise.race([
                message,
                this.failureResolution.promise.then((error) => { throw error; }),
                this.exitResolution.promise.then((code) => {
                    throw new Error(`inspector Worker exited before readiness (code ${String(code)})`);
                }),
            ]);
        }
        finally {
            if (timer !== undefined)
                clearTimeout(timer);
            if (onMessage !== undefined)
                this.worker.off('message', onMessage);
        }
    }
    /**
     * Begin reporting an unexpected runtime exit through one contained callback.
     * @param listener - Failure observer that must not throw.
     */
    markRunning(listener) {
        this.running = true;
        this.onUnexpectedExit = listener;
        this.notifyUnexpectedExit();
    }
    /** Mark subsequent Worker termination as owner-requested. */
    expectExit() {
        this.expectedExit = true;
    }
    /** Terminate the Worker during failed initialization. */
    async terminate() {
        this.expectExit();
        if (this.exitCodeValue === undefined)
            await this.worker.terminate();
    }
    /**
     * Request graceful shutdown and terminate after the deadline.
     * @param timeoutMs - Grace period before forced termination.
     */
    async stop(timeoutMs) {
        this.expectExit();
        if (this.exitCodeValue !== undefined)
            return;
        this.worker.postMessage({ type: 'shutdown' });
        let timer;
        const timeout = new Promise((resolve) => {
            timer = setTimeout(() => { resolve('timeout'); }, timeoutMs);
        });
        const outcome = await Promise.race([
            this.exitResolution.promise.then(() => 'exited'),
            timeout,
        ]);
        if (timer !== undefined)
            clearTimeout(timer);
        if (outcome === 'exited')
            return;
        await this.worker.terminate();
        throw new Error(`inspector Worker did not stop within ${String(timeoutMs)}ms and was terminated`);
    }
    notifyUnexpectedExit() {
        if (!this.running || this.expectedExit || this.notified || this.exitCodeValue === undefined)
            return;
        this.notified = true;
        this.onUnexpectedExit?.(this.failure ?? new Error(`inspector Worker exited unexpectedly with code ${String(this.exitCodeValue)}`));
    }
}
//# sourceMappingURL=lifecycle.js.map