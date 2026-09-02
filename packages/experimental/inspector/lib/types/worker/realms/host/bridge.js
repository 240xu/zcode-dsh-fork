/** Per-DevTools-connection bridge to the Host main thread's real V8 inspector target. */
import { Session } from 'node:inspector';
/** Connection-local carrier for requests and notifications from the Host V8 inspector. */
export class HostInspectorSession {
    contextName;
    session = new Session();
    listeners = new Set();
    connected = false;
    failure;
    constructor(contextName) {
        this.contextName = contextName;
        this.session.on('inspectorNotification', (message) => {
            const rewritten = this.rewriteContextName(message);
            for (const listener of [...this.listeners]) {
                try {
                    listener(rewritten);
                }
                catch {
                    // One domain subscriber cannot starve notifications for sibling domains.
                }
            }
        });
    }
    /**
     * Subscribe to native inspector notifications.
     * @param listener - Consumer owned by one Worker domain adapter.
     * @returns A disposer removing the consumer.
     */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }
    /**
     * Execute one Host V8 request for a Worker-owned composite Runtime operation.
     * @param method - CDP method name.
     * @param params - Validated request parameters.
     * @returns The Host inspector result.
     */
    request(method, params) {
        const failure = this.connect();
        if (failure !== undefined)
            return Promise.reject(new Error(failure));
        return new Promise((resolve, reject) => {
            try {
                this.session.post(method, params, (error, result) => {
                    if (error !== null)
                        reject(error);
                    else
                        resolve(result ?? {});
                });
            }
            catch (error) {
                reject(new Error(renderError(error)));
            }
        });
    }
    /** Disconnect this DevTools client's V8 session. */
    close() {
        this.listeners.clear();
        if (!this.connected || this.failure !== undefined)
            return;
        this.connected = false;
        try {
            this.session.disconnect();
        }
        catch {
            // The underlying inspector session is already disconnected.
        }
    }
    connect() {
        if (this.connected)
            return this.failure;
        this.connected = true;
        try {
            this.session.connectToMainThread();
        }
        catch (error) {
            this.failure = `Host V8 inspector is unavailable: ${renderError(error)}`;
        }
        return this.failure;
    }
    rewriteContextName(message) {
        if (message.method !== 'Runtime.executionContextCreated')
            return message;
        const params = message.params;
        const context = params?.context;
        if (typeof context !== 'object' || context === null)
            return message;
        const record = context;
        const auxData = record.auxData;
        if (typeof auxData !== 'object' || auxData === null || auxData.isDefault !== true) {
            return message;
        }
        return {
            method: message.method,
            params: {
                ...params,
                context: { ...record, name: this.contextName },
            },
        };
    }
}
/** Serializes accepted native notifications and isolates sibling consumers. */
export class HostNotificationChannel {
    accepts;
    project;
    listeners = new Set();
    unsubscribe;
    delivery = Promise.resolve();
    constructor(target, accepts, project) {
        this.accepts = accepts;
        this.project = project;
        this.unsubscribe = target.subscribe((message) => { this.receive(message); });
    }
    /**
     * Subscribe to projected native notifications.
     * @param listener - Consumer invoked in subscription order.
     * @returns A disposer removing the consumer.
     */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }
    /** Release the native notification subscription and all consumers. */
    close() {
        this.unsubscribe();
        this.listeners.clear();
    }
    receive(message) {
        if (!this.accepts(message))
            return;
        this.delivery = this.delivery.then(async () => {
            const event = await this.project(message);
            if (event === undefined)
                return;
            for (const listener of [...this.listeners]) {
                try {
                    listener(event);
                }
                catch {
                    // One notification consumer cannot prevent delivery to its siblings.
                }
            }
        }).catch(() => {
            // Malformed optional native notifications do not interrupt request handling.
        });
    }
}
function renderError(error) {
    return error instanceof Error ? error.message : String(error);
}
//# sourceMappingURL=bridge.js.map