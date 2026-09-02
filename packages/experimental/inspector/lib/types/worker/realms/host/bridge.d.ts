/** Per-DevTools-connection bridge to the Host main thread's real V8 inspector target. */
import type { NativeProtocolNotification } from '../../../shared/cdp/realm.ts';
/** Notification emitted by Node's native inspector session. */
export type HostInspectorNotification = NativeProtocolNotification;
/** Connection-local carrier for requests and notifications from the Host V8 inspector. */
export declare class HostInspectorSession {
    private readonly contextName;
    private readonly session;
    private readonly listeners;
    private connected;
    private failure;
    constructor(contextName: string);
    /**
     * Subscribe to native inspector notifications.
     * @param listener - Consumer owned by one Worker domain adapter.
     * @returns A disposer removing the consumer.
     */
    subscribe(listener: (message: HostInspectorNotification) => void): () => void;
    /**
     * Execute one Host V8 request for a Worker-owned composite Runtime operation.
     * @param method - CDP method name.
     * @param params - Validated request parameters.
     * @returns The Host inspector result.
     */
    request(method: string, params: Readonly<Record<string, unknown>>): Promise<Readonly<Record<string, unknown>>>;
    /** Disconnect this DevTools client's V8 session. */
    close(): void;
    private connect;
    private rewriteContextName;
}
/** Serializes accepted native notifications and isolates sibling consumers. */
export declare class HostNotificationChannel<Event> {
    private readonly accepts;
    private readonly project;
    private readonly listeners;
    private readonly unsubscribe;
    private delivery;
    constructor(target: HostInspectorSession, accepts: (message: HostInspectorNotification) => boolean, project: (message: HostInspectorNotification) => Promise<Event | undefined>);
    /**
     * Subscribe to projected native notifications.
     * @param listener - Consumer invoked in subscription order.
     * @returns A disposer removing the consumer.
     */
    subscribe(listener: (event: Event) => void): () => void;
    /** Release the native notification subscription and all consumers. */
    close(): void;
    private receive;
}
//# sourceMappingURL=bridge.d.ts.map