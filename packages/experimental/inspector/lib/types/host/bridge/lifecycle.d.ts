/** Failure containment and shutdown coordination for the Inspector Worker. */
import type { Worker } from 'node:worker_threads';
import type { InspectorWorkerControl } from '../../shared/bridge/messages/control.ts';
/** Tracks Worker termination without removing the listener that contains runtime errors. */
export declare class InspectorWorkerLifecycle {
    private readonly worker;
    private readonly exitResolution;
    private readonly failureResolution;
    private failure;
    private running;
    private expectedExit;
    private notified;
    private onUnexpectedExit;
    private exitCodeValue;
    /** Worker exit code once its `exit` event has fired. */
    get exitCode(): number | undefined;
    constructor(worker: Worker);
    /**
     * Wait for the validated ready frame while also observing startup failure and exit.
     * @param timeoutMs - Readiness deadline in milliseconds.
     * @returns The Worker's bound endpoint fields.
     */
    waitForReady(timeoutMs: number): Promise<Extract<InspectorWorkerControl, {
        type: 'ready';
    }>>;
    /**
     * Begin reporting an unexpected runtime exit through one contained callback.
     * @param listener - Failure observer that must not throw.
     */
    markRunning(listener: (error: Error) => void): void;
    /** Mark subsequent Worker termination as owner-requested. */
    expectExit(): void;
    /** Terminate the Worker during failed initialization. */
    terminate(): Promise<void>;
    /**
     * Request graceful shutdown and terminate after the deadline.
     * @param timeoutMs - Grace period before forced termination.
     */
    stop(timeoutMs: number): Promise<void>;
    private notifyUnexpectedExit;
}
//# sourceMappingURL=lifecycle.d.ts.map