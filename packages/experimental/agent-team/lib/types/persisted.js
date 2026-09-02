/** Short-lived read-handle access to persisted Team member Sessions. */
/**
 * Read one stored session's header and complete event log through a
 * short-lived read handle, closing the handle before returning.
 * @param persistence - the durable session store.
 * @param id - the stored session to read.
 * @param signal - cancellation observed by open and read.
 * @returns the stored header and every committed event.
 */
export async function readPersistedSession(persistence, id, signal) {
    const handle = await persistence.open(id, 'read', { signal });
    try {
        return { header: handle.header, inheritedEventCount: handle.inheritedEventCount, events: await handle.read(0, undefined, { signal }) };
    }
    finally {
        await handle.close();
    }
}
//# sourceMappingURL=persisted.js.map