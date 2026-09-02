/** Per-session Conversation store shared by the shell body and header. */
import { defineStore } from '@deepseek-ai/dsh-client-store';
const CONVERSATION_STORE_KEY = 'dsh.conversation';
/**
 * Declare per-session draft persistence and View selection.
 * @returns the store handle.
 */
export function createConversationStore() {
    return defineStore({
        init: () => ({ draft: '', view: null, viewRequest: null }),
        persist: CONVERSATION_STORE_KEY,
        actions: {
            setDraft: (d, text) => { d.draft = text; },
            setView: (d, view) => { d.view = view; },
            openView: (d, view, focus) => {
                d.view = view;
                d.viewRequest = { view, focus };
            },
            completeViewRequest: (d) => { d.viewRequest = null; },
        },
    });
}
/**
 * Read the persisted View preference before the Slot store is materialized.
 * @param sessionId - Session-scoped persistence suffix.
 * @returns the preferred View id, or null when storage has no usable value.
 */
export function readConversationViewPreference(sessionId) {
    if (typeof localStorage === 'undefined')
        return null;
    try {
        const raw = localStorage.getItem(`${CONVERSATION_STORE_KEY}.${sessionId}`);
        if (raw === null)
            return null;
        const stored = JSON.parse(raw);
        if (typeof stored !== 'object' || stored === null || !('view' in stored))
            return null;
        return typeof stored.view === 'string' ? stored.view : null;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=stores.js.map