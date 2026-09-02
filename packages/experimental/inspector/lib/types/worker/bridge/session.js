/** Shared cleanup delivery for Worker-owned Client sessions. */
/**
 * Send cleanup to an active Client generation when its transport is still usable.
 * @param sources - Worker source registry owning the transport.
 * @param source - Generation whose session closed.
 * @param frame - Typed Runtime or source-catalog cleanup frame.
 */
export function sendClientSessionClosed(sources, source, frame) {
    try {
        sources.send(source, frame);
    }
    catch {
        // Source removal already invalidates every session owned by this generation.
    }
}
//# sourceMappingURL=session.js.map