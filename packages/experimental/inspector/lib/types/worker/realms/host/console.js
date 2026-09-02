/** ConsoleBackend implementation over native Node Runtime notifications. */
import { isNativeRecord } from "./values.js";
import { HostNotificationChannel } from "./bridge.js";
const CONSOLE_TYPES = new Set([
    'log', 'debug', 'info', 'error', 'warning', 'dir', 'dirxml', 'table', 'trace', 'clear',
    'startGroup', 'startGroupCollapsed', 'endGroup', 'assert', 'profile', 'profileEnd', 'count', 'timeEnd',
]);
/** Converts native Runtime notifications to realm-neutral Console events. */
export class HostConsoleBackend {
    target;
    runtime;
    events;
    constructor(target, runtime) {
        this.target = target;
        this.runtime = runtime;
        this.events = new HostNotificationChannel(target, message => message.method === 'Runtime.consoleAPICalled' || message.method === 'Runtime.exceptionThrown', async (message) => message.method === 'Runtime.consoleAPICalled'
            ? this.consoleEvent(message.params)
            : this.exceptionEvent(message.params));
    }
    /**
     * Subscribe to native Console and exception events.
     * @param listener - Connection-local event consumer.
     * @returns A disposer removing the consumer.
     */
    subscribe(listener) {
        return this.events.subscribe(listener);
    }
    async clear() {
        await this.target.request('Runtime.discardConsoleEntries', {});
    }
    /** Release the native notification subscription. */
    close() {
        this.events.close();
    }
    async consoleEvent(params) {
        const type = params?.type;
        const args = params?.args;
        const timestamp = params?.timestamp;
        const stackTrace = params?.stackTrace;
        if (!CONSOLE_TYPES.has(type) || !Array.isArray(args) || typeof timestamp !== 'number')
            return undefined;
        return {
            type: 'console-api',
            event: {
                type: type,
                arguments: await Promise.all(args.map(value => this.runtime.remoteObject(value))),
                timestamp,
                ...(typeof params?.executionContextId === 'number' ? { contextId: params.executionContextId } : {}),
                ...(isNativeRecord(stackTrace) ? { stackTrace: this.runtime.stackTrace(stackTrace) } : {}),
            },
        };
    }
    async exceptionEvent(params) {
        const timestamp = params?.timestamp;
        const exceptionDetails = params?.exceptionDetails;
        const contextId = params?.executionContextId;
        if (typeof timestamp !== 'number' || exceptionDetails === undefined)
            return undefined;
        return {
            type: 'exception',
            event: {
                timestamp,
                ...(typeof contextId === 'number' ? { contextId } : {}),
                details: await this.runtime.exceptionDetails(exceptionDetails),
            },
        };
    }
}
//# sourceMappingURL=console.js.map