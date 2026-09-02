/** One-shot cold session read through the handle-based persistence seam. */
import { interruptedTurnClosers } from '@deepseek-ai/dsh-session';
/**
 * Read one complete stored session log without taking ownership or mutating
 * storage: open a read handle, read the validated contiguous log, close the
 * handle, and append `interruptedTurnClosers` so a log whose writer crashed
 * mid-turn folds as a balanced transcript. Backend failures propagate
 * unmapped — each caller owns its error taxonomy.
 * @param persistence - the mounted persistence service.
 * @param sessionId - the stored session to read.
 * @param signal - optional cancellation for the open and read work.
 * @returns the stored header and the balanced event log.
 */
export async function readColdSessionLog(persistence, sessionId, signal) {
    const options = signal === undefined ? undefined : { signal };
    const handle = await persistence.open(sessionId, 'read', options);
    let events;
    try {
        events = await handle.read(0, undefined, options);
    }
    catch (error) {
        try {
            await handle.close();
        }
        catch {
            // The read failure is the actionable cause; a close failure on the same broken handle adds nothing.
        }
        throw error;
    }
    await handle.close();
    return { header: handle.header, inheritedEventCount: handle.inheritedEventCount, events: [...events, ...interruptedTurnClosers(events)] };
}
//# sourceMappingURL=cold-read.js.map