/** Client Console observation shared by every active DevTools Runtime session. */
import { captureClientConsoleStack, clientErrorStack } from "./stack.js";
/**
 * Describe browser-side Console observation.
 * @returns The Console capability advertised by a browser Client source.
 */
export function consoleBridgeCapability() {
    return { type: 'client-console' };
}
const METHODS = [
    ['log', 'log'],
    ['debug', 'debug'],
    ['info', 'info'],
    ['error', 'error'],
    ['warn', 'warning'],
    ['dir', 'dir'],
    ['dirxml', 'dirxml'],
    ['table', 'table'],
    ['trace', 'trace'],
    ['clear', 'clear'],
    ['group', 'startGroup'],
    ['groupCollapsed', 'startGroupCollapsed'],
    ['groupEnd', 'endGroup'],
    ['assert', 'assert'],
    ['profile', 'profile'],
    ['profileEnd', 'profileEnd'],
    ['count', 'count'],
    ['timeEnd', 'timeEnd'],
];
/** Installs one transparent console/error observer and fans out session-local values. */
export class ClientConsoleObserver {
    runtime;
    sink;
    resolveScript;
    sessions = new Set();
    installed = [];
    active = false;
    closed = false;
    constructor(runtime, sink, resolveScript = () => undefined) {
        this.runtime = runtime;
        this.sink = sink;
        this.resolveScript = resolveScript;
    }
    /**
     * Start producing events for one DevTools Runtime session.
     * @param sessionId - Session whose object table retains event arguments.
     */
    enable(sessionId) {
        if (this.closed)
            return;
        this.sessions.add(sessionId);
        if (!this.active)
            this.install();
    }
    /**
     * Stop producing events and release Console objects for one session.
     * @param sessionId - Session being disabled or closed.
     */
    disable(sessionId) {
        this.sessions.delete(sessionId);
        this.runtime.releaseObjectGroup(sessionId, 'console');
        if (this.sessions.size === 0)
            this.uninstall();
    }
    /** Restore original browser hooks and clear every active session. */
    close() {
        if (this.closed)
            return;
        this.closed = true;
        this.reset();
    }
    /** Stop observing the current source generation while allowing a later reconnect. */
    reset() {
        this.sessions.clear();
        this.uninstall();
    }
    install() {
        this.active = true;
        for (const [name, type] of METHODS) {
            const candidate = Reflect.get(console, name);
            if (typeof candidate !== 'function')
                continue;
            const original = candidate;
            const capture = (values) => { this.captureConsole(type, values); };
            const replacement = function (...args) {
                const result = Reflect.apply(original, this, args);
                const values = name === 'assert' ? args.slice(1) : args;
                if (name !== 'assert' || !args[0])
                    capture(values);
                return result;
            };
            if (Reflect.set(console, name, replacement))
                this.installed.push({ name, original, replacement });
        }
        addGlobalListener('error', this.onError);
        addGlobalListener('unhandledrejection', this.onUnhandledRejection);
    }
    uninstall() {
        if (!this.active)
            return;
        this.active = false;
        removeGlobalListener('error', this.onError);
        removeGlobalListener('unhandledrejection', this.onUnhandledRejection);
        for (const method of this.installed.splice(0).reverse()) {
            if (Reflect.get(console, method.name) === method.replacement)
                Reflect.set(console, method.name, method.original);
        }
    }
    onError = (event) => {
        const error = Reflect.get(event, 'error');
        const message = Reflect.get(event, 'message');
        this.captureException(error ?? new Error(typeof message === 'string' ? message : 'Client error'));
    };
    onUnhandledRejection = (event) => {
        this.captureException(Reflect.get(event, 'reason'));
    };
    captureConsole(type, values) {
        const timestamp = Date.now();
        const stackTrace = captureClientConsoleStack(this.resolveScript);
        queueMicrotask(() => {
            for (const sessionId of [...this.sessions]) {
                try {
                    const event = this.runtime.consoleEvent(sessionId, type, values, timestamp, stackTrace);
                    if (event !== undefined)
                        this.sink(sessionId, event);
                }
                catch {
                    // Console observation must not affect the page's original console call.
                }
            }
        });
    }
    captureException(error) {
        const timestamp = Date.now();
        const stackTrace = clientErrorStack(error, this.resolveScript);
        queueMicrotask(() => {
            for (const sessionId of [...this.sessions]) {
                try {
                    const event = this.runtime.exceptionEvent(sessionId, error, timestamp, stackTrace);
                    if (event !== undefined)
                        this.sink(sessionId, event);
                }
                catch {
                    // Exception observation must not affect browser error dispatch.
                }
            }
        });
    }
}
function addGlobalListener(type, listener) {
    const add = Reflect.get(globalThis, 'addEventListener');
    if (typeof add === 'function')
        Reflect.apply(add, globalThis, [type, listener]);
}
function removeGlobalListener(type, listener) {
    const remove = Reflect.get(globalThis, 'removeEventListener');
    if (typeof remove === 'function')
        Reflect.apply(remove, globalThis, [type, listener]);
}
//# sourceMappingURL=console.js.map