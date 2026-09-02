/** ConsoleBackend over the typed Client Console event transport. */
import { clientConsoleEvent } from "./values.js";
/** Adapts session-local Client Console events to common Runtime values. */
export class ClientConsoleBackend {
    target;
    sessionId;
    router;
    scriptIds;
    disposers = new Set();
    constructor(target, sessionId, router, scriptIds) {
        this.target = target;
        this.sessionId = sessionId;
        this.router = router;
        this.scriptIds = scriptIds;
    }
    subscribe(listener) {
        const dispose = this.router.subscribeConsole(this.target, this.sessionId, (event) => {
            listener(clientConsoleEvent(event, scriptKey => this.scriptIds.toRuntime(scriptKey)));
        });
        this.disposers.add(dispose);
        return () => {
            if (!this.disposers.delete(dispose))
                return;
            dispose();
        };
    }
    async clear() { }
    /** Disable every active Console subscription for this connection. */
    close() {
        for (const dispose of this.disposers)
            dispose();
        this.disposers.clear();
    }
}
//# sourceMappingURL=console.js.map