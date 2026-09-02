/** Node `Timeout`/`Immediate` face the harness relies on. */
export interface TimerHandle {
    ref(): TimerHandle;
    unref(): TimerHandle;
    hasRef(): boolean;
    [Symbol.toPrimitive](): number;
}
/** Replace the worker's timer globals with the Node-shaped wrappers. */
export declare function installTimerGlobals(): void;
//# sourceMappingURL=timers.d.ts.map