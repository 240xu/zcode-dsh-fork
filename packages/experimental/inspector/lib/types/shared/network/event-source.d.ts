/** Incremental UTF-8 parser for Server-Sent Events carried by captured responses. */
import type { InspectorEventSourceMessage } from './observation.ts';
/** Parse response bytes into consumer-neutral Server-Sent Event messages. */
export declare class InspectorEventSourceParser {
    private readonly decoder;
    private line;
    private eventName;
    private eventId;
    private data;
    private afterCarriageReturn;
    /**
     * Consume one response-body chunk.
     * @param bytes - Next bytes in response order.
     * @returns Complete events terminated by an empty line in this chunk.
     */
    push(bytes: Uint8Array): readonly InspectorEventSourceMessage[];
    private consume;
    private parseLine;
}
//# sourceMappingURL=event-source.d.ts.map