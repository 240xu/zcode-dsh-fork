/**
 * `node:events`: a minimal EventEmitter with the members harness code uses.
 * Emission order and listener identity follow Node; anything beyond the basic
 * on/once/off/emit set throws.
 */
/** The `node:events` subset the harness registers on: add, remove, and emit. */
export class EventEmitter {
    registry = new Map();
    /**
     * Register a listener.
     * @param event - event name.
     * @param listener - the listener.
     * @returns this emitter.
     */
    on(event, listener) {
        const list = this.registry.get(event) ?? [];
        list.push(listener);
        this.registry.set(event, list);
        return this;
    }
    /**
     * Register a listener removed after its first call.
     * @param event - event name.
     * @param listener - the listener.
     * @returns this emitter.
     */
    once(event, listener) {
        const wrapper = ((...args) => {
            this.off(event, wrapper);
            listener(...args);
        });
        wrapper.listener = listener;
        return this.on(event, wrapper);
    }
    /**
     * Register a listener ahead of the existing ones.
     * @param event - event name.
     * @param listener - the listener.
     * @returns this emitter.
     */
    prependListener(event, listener) {
        const list = this.registry.get(event) ?? [];
        list.unshift(listener);
        this.registry.set(event, list);
        return this;
    }
    /**
     * Remove a listener, by the function that was registered or by the one a
     * `once` wrapper stands for.
     * @param event - event name.
     * @param listener - the listener.
     * @returns this emitter.
     */
    off(event, listener) {
        const list = this.registry.get(event);
        if (list !== undefined) {
            // Last registration first, as Node removes it.
            for (let at = list.length - 1; at >= 0; at--) {
                const registered = list[at];
                if (registered === listener || registered?.listener === listener) {
                    list.splice(at, 1);
                    break;
                }
            }
        }
        return this;
    }
    /**
     * Alias of {@link off}.
     * @param event - event name.
     * @param listener - the listener.
     * @returns this emitter.
     */
    removeListener(event, listener) {
        return this.off(event, listener);
    }
    /**
     * Drop listeners for one event, or all of them.
     * @param event - event name; omitted clears every event.
     * @returns this emitter.
     */
    removeAllListeners(event) {
        if (event === undefined)
            this.registry.clear();
        else
            this.registry.delete(event);
        return this;
    }
    /**
     * Emit an event.
     * @param event - event name.
     * @param args - listener arguments.
     * @returns whether any listener ran.
     */
    emit(event, ...args) {
        const list = this.registry.get(event);
        if (list === undefined || list.length === 0)
            return false;
        for (const listener of [...list])
            listener(...args);
        return true;
    }
    /**
     * Listeners of one event.
     * @param event - event name.
     * @returns a copy of the listener list.
     */
    listeners(event) {
        return [...this.registry.get(event) ?? []];
    }
    /**
     * Listener count of one event.
     * @param event - event name.
     * @returns the count.
     */
    listenerCount(event) {
        return this.registry.get(event)?.length ?? 0;
    }
    /**
     * Node's max-listener knob has no effect here.
     * @returns This emitter, for chaining.
     */
    setMaxListeners() {
        return this;
    }
}
/** CommonJS interop marker: the worker loader hands `default` to default imports (see ./builtins.ts). */
export const __esModule = true;
/** CommonJS default export: the members `require()` hands a caller of this module. */
export default { EventEmitter };
//# sourceMappingURL=events.js.map