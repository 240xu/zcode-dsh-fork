/** Source-side interfaces shared by MessagePort and WebSocket bridge implementations. */
/** Shared observation and query delegation inherited by both source transports. */
export class InspectorSourceConnection {
    /** Publish one JSON observation without waiting on its carrier. */
    publish(topic, payload, monotonicMs = performance.now()) {
        this.publisher.publish(topic, payload, monotonicMs);
    }
    /** Retain and publish one state value for reconnect or replacement recovery. */
    setState(topic, payload, monotonicMs = performance.now()) {
        this.publisher.setState(topic, payload, monotonicMs);
    }
    /** Execute one non-CDP query through the active source generation. */
    request(query) {
        return this.queries.request(query);
    }
}
//# sourceMappingURL=publisher.js.map