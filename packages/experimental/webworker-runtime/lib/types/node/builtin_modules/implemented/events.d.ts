/**
 * `node:events`: a minimal EventEmitter with the members harness code uses.
 * Emission order and listener identity follow Node; anything beyond the basic
 * on/once/off/emit set throws.
 */
type Listener = (...args: unknown[]) => void;
/** The `node:events` subset the harness registers on: add, remove, and emit. */
export declare class EventEmitter {
    private readonly registry;
    /**
     * Register a listener.
     * @param event - event name.
     * @param listener - the listener.
     * @returns this emitter.
     */
    on(event: string, listener: Listener): this;
    /**
     * Register a listener removed after its first call.
     * @param event - event name.
     * @param listener - the listener.
     * @returns this emitter.
     */
    once(event: string, listener: Listener): this;
    /**
     * Register a listener ahead of the existing ones.
     * @param event - event name.
     * @param listener - the listener.
     * @returns this emitter.
     */
    prependListener(event: string, listener: Listener): this;
    /**
     * Remove a listener, by the function that was registered or by the one a
     * `once` wrapper stands for.
     * @param event - event name.
     * @param listener - the listener.
     * @returns this emitter.
     */
    off(event: string, listener: Listener): this;
    /**
     * Alias of {@link off}.
     * @param event - event name.
     * @param listener - the listener.
     * @returns this emitter.
     */
    removeListener(event: string, listener: Listener): this;
    /**
     * Drop listeners for one event, or all of them.
     * @param event - event name; omitted clears every event.
     * @returns this emitter.
     */
    removeAllListeners(event?: string): this;
    /**
     * Emit an event.
     * @param event - event name.
     * @param args - listener arguments.
     * @returns whether any listener ran.
     */
    emit(event: string, ...args: unknown[]): boolean;
    /**
     * Listeners of one event.
     * @param event - event name.
     * @returns a copy of the listener list.
     */
    listeners(event: string): Listener[];
    /**
     * Listener count of one event.
     * @param event - event name.
     * @returns the count.
     */
    listenerCount(event: string): number;
    /**
     * Node's max-listener knob has no effect here.
     * @returns This emitter, for chaining.
     */
    setMaxListeners(): this;
}
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ./builtins.ts). */
export declare const __esModule = true;
/** CommonJS default export: the members `require()` hands a caller of this module. */
declare const _default: {
    EventEmitter: typeof EventEmitter;
};
export default _default;
//# sourceMappingURL=events.d.ts.map