import { EMPTY_CONVERSATION_SNAPSHOT, } from '@deepseek-ai/dsh-client-ui-conversation/client';
import { EMPTY_CHAT_SNAPSHOT, } from '@deepseek-ai/dsh-client-ui-chat/client';
/**
 * A complete quiescent Session Controller snapshot.
 * @param sessionId - owning session id.
 * @returns the snapshot; spread fixture overrides on top.
 */
export function sessionSnapshot(sessionId) {
    return {
        sessionId,
        queue: [],
        pendingSubmissions: [],
        running: false,
        subagent: null,
        removed: false,
        openState: 'open',
        openError: null,
        hasMore: false,
        loadingOlder: false,
        promptError: null,
        blank: false,
        lastAgentError: null,
        promptAttempted: false,
        awaitingFirstTurn: false,
    };
}
/**
 * A target-neutral Conversation snapshot.
 * @param overrides - target roster or activity overrides.
 * @returns an immutable fixture value.
 */
export function conversationSnapshot(overrides = {}) {
    return { ...EMPTY_CONVERSATION_SNAPSHOT, ...overrides };
}
/**
 * A Chat target snapshot.
 * @param overrides - Chat target overrides.
 * @returns an immutable fixture value.
 */
export function chatSnapshot(overrides = {}) {
    return { ...EMPTY_CHAT_SNAPSHOT, ...overrides };
}
/**
 * A ready Workspace Controller snapshot with no Workspace rows.
 * @returns the initial state of the test Workspace source.
 */
export function workspaceSnapshot() {
    return {
        items: [],
        archivedSessionIds: [],
        state: 'idle',
        phase: 'ready',
        error: null,
    };
}
//# sourceMappingURL=fixtures.js.map