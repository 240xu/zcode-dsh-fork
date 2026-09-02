import { createSnapshotStore } from '@deepseek-ai/dsh-client-store';
import { resolveSlotLabel } from '@deepseek-ai/dsh-client-ui-slots';
import { UiConversation } from "./conversation/assembly.js";
import { createConversationStore, readConversationViewPreference } from "./stores.js";
import { ConversationController, UnsupportedImageMediaTypeError } from "./service.js";
import { ComposerBlockRegistry } from "./input/blocks.js";
import { InputHub } from "./input/hub.js";
import { ComposerSubmissionPolicy } from "./input/submission-policy.js";
import { queueDockEntry } from "./queue/QueueDock.js";
import { EnterBehaviorRow } from "./settings/EnterBehaviorRow.js";
import { ConversationRoot } from "./skeleton/ConversationRoot.js";
import { ConversationSession, ConversationSessionHeader } from "./skeleton/ConversationSession.js";
import { InputBar } from "./skeleton/InputBar.js";
import { todoDockEntry } from "./skeleton/TodoPanel.js";
import { resolveActiveView } from "./view-selection.js";
import { en, NS, zh } from "./locales.js";
import { CONVERSATION_SETTINGS_NAMESPACE } from "../submission-settings.js";
/** Services required by the Conversation plugin. */
export const inject = [
    'slots', 'sessions', 'uiSession', 'uiWorkspace', 'locale', 'settingsScope',
];
// Stable no-session sources keep the renderer's observable-hook cache and
// hook order unchanged across current-Session transitions.
const ABSENT_NOTICES = {
    getSnapshot: () => null,
    subscribe: () => () => { },
};
const ABSENT_BLOCK = {
    getSnapshot: () => undefined,
    subscribe: () => () => { },
};
const EMPTY_LEXICON = new Map();
const ABSENT_LEXICON = {
    getSnapshot: () => EMPTY_LEXICON,
    subscribe: () => () => { },
};
const ABSENT_MENU_LAUNCHER = {
    getSnapshot: () => null,
    subscribe: () => () => { },
};
/** Resolve the session-scoped Conversation action face, failing loud. */
function scopedConversation(sessions, id) {
    const scoped = sessions.scope(id);
    if (scoped === undefined)
        throw new Error(`ui-conversation: session "${id}" resolved no scope`);
    const conversation = scoped.get('conversation');
    if (conversation === undefined) {
        throw new Error('ui-conversation: conversation service unavailable through the session scope');
    }
    return conversation;
}
/** Resolve package-internal attachment operations from the public service. */
function concreteConversation(ctx) {
    const conversation = ctx.get('conversation');
    if (conversation === undefined)
        throw new Error('ui-conversation: conversation service unavailable');
    return conversation;
}
/**
 * Mount the Conversation core and target-neutral presentation.
 * @param ctx - Client root context.
 */
export function apply(ctx) {
    const sessions = ctx.sessions;
    const slots = ctx.slots;
    const workspaceNavigation = ctx.get('uiWorkspace');
    const uiConversation = new UiConversation(ctx, sessions);
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-conversation: dictionaries');
    const t = ctx.locale.bind(NS);
    const conversationStore = createConversationStore();
    const submissionPolicy = new ComposerSubmissionPolicy(ctx.settingsScope.bind({ namespace: CONVERSATION_SETTINGS_NAMESPACE }));
    ctx.slots.inject('settings.general.item', () => ctx.slots.register({
        name: 'settings.general.item',
        id: 'composer-enter',
        order: 20,
        locale: NS,
        inject: () => ({
            hooks: { busyEnter: submissionPolicy.busyEnter },
            setBusyEnter: (behavior) => { submissionPolicy.setBusyEnter(behavior); },
        }),
    }, EnterBehaviorRow));
    const viewTabs = () => {
        const tabs = [];
        for (const entry of slots.entries('conversation.view')) {
            /* v8 ignore next -- list registration validates id at load. */
            if (entry.options.id === undefined)
                continue;
            tabs.push({
                id: entry.options.id,
                label: resolveSlotLabel(entry.options.label) ?? entry.options.id,
            });
        }
        return tabs;
    };
    const activateView = (sessionId, preferred) => {
        const active = resolveActiveView(viewTabs(), preferred);
        if (active !== undefined)
            uiConversation.binding(sessionId).activate(active.id);
    };
    const restoreView = (sessionId) => {
        activateView(sessionId, readConversationViewPreference(sessionId));
    };
    const restoreCurrentView = () => {
        const sessionId = sessions.list.getSnapshot().current;
        if (sessionId !== undefined && sessions.binding(sessionId) !== undefined) {
            restoreView(sessionId);
        }
    };
    const conversationViews = createSnapshotStore(viewTabs());
    const refreshViews = () => {
        const current = conversationViews.getSnapshot();
        const next = viewTabs();
        const unchanged = current.length === next.length
            && current.every((tab, index) => {
                const candidate = next.at(index);
                return candidate !== undefined && tab.id === candidate.id && tab.label === candidate.label;
            });
        if (!unchanged)
            conversationViews.set(next);
        restoreCurrentView();
    };
    ctx.effect(() => {
        let currentSessionId = sessions.list.getSnapshot().current;
        const disposeViews = slots.subscribe('conversation.view', refreshViews);
        const disposeLocale = ctx.locale.subscribe(refreshViews);
        const disposeCurrent = sessions.list.subscribe(() => {
            const nextSessionId = sessions.list.getSnapshot().current;
            if (nextSessionId === currentSessionId)
                return;
            currentSessionId = nextSessionId;
            restoreCurrentView();
        });
        return () => {
            disposeCurrent();
            disposeLocale();
            disposeViews();
        };
    }, 'ui-conversation: View selection');
    const inputHub = new InputHub(ctx, t);
    const composerBlocks = new ComposerBlockRegistry();
    // Conversation assembly and input share the Session binding lifecycle. The
    // source roster is installed before any consuming Slot entry.
    ctx.uiSession.provide({
        hooks: ['conversation', 'input'],
        props: ['inputActions'],
        resolve: (binding) => {
            const shell = inputHub.shellFor(binding);
            const conversation = uiConversation.binding(binding);
            restoreView(binding.sessionId);
            return {
                hooks: {
                    conversation: conversation.snapshot,
                    input: shell.state,
                },
                props: { inputActions: shell.actions },
            };
        },
    });
    const registerConversationRoot = () => slots.register({
        name: 'conversation',
        locale: NS,
        children: {
            'conversation.session': { kind: 'single', scope: 'session' },
            'conversation.session.header': { kind: 'single', scope: 'session' },
            'conversation.composer': { kind: 'chain', scope: 'session' },
            'conversation.composer.bar': { kind: 'single', scope: 'session-maybe' },
            'conversation.input.dock': { kind: 'list', scope: 'session' },
            'conversation.hero.brand.mark': { kind: 'single', scope: 'root' },
            'conversation.hero.workspace': { kind: 'single', scope: 'root' },
            'conversation.hero.agentPreset': { kind: 'single', scope: 'root' },
        },
        inject: (sessionId) => ({
            hooks: {
                composerBlock: sessionId === undefined ? ABSENT_BLOCK : composerBlocks.storeFor(sessionId),
            },
            selectWorkspace: async (workspaceId) => {
                const nextId = await workspaceNavigation.connectWorkspace(workspaceId);
                if (sessionId !== undefined && nextId !== sessionId) {
                    const from = inputHub.shell(sessionId);
                    const draft = from.snapshot.draft;
                    const imageIds = from.snapshot.imageIds;
                    const next = inputHub.shell(nextId);
                    if (imageIds.length === 0 || next.addImages(imageIds)) {
                        if (draft !== '') {
                            next.setDraft(draft);
                            from.setDraft('');
                        }
                        if (imageIds.length > 0) {
                            for (const id of imageIds)
                                from.removeImage(id);
                        }
                    }
                }
                sessions.open(nextId);
            },
        }),
    }, ConversationRoot);
    const registerConversationSession = () => slots.register({
        name: 'conversation.session',
        children: {
            'conversation.view': { kind: 'list', scope: 'session' },
        },
        store: conversationStore,
        inject: (sessionId, actions) => ({
            hooks: { conversationViews },
            bindDraftMirror: write => inputHub.shell(sessionId).bindMirror(write),
            openView: (view, focus) => {
                activateView(sessionId, view);
                actions.openView(view, focus);
            },
        }),
    }, ConversationSession);
    const registerConversationHeader = () => slots.register({
        name: 'conversation.session.header',
        locale: NS,
        children: {
            'conversation.session.header.lineage': { kind: 'single', scope: 'session' },
            'conversation.session.header.actions': { kind: 'list', scope: 'session' },
            'conversation.session.header.utilities': { kind: 'list', scope: 'session' },
        },
        store: conversationStore,
        inject: (sessionId, actions) => ({
            hooks: { conversationViews },
            open: (id) => { sessions.open(id); },
            selectView: (view) => {
                activateView(sessionId, view);
                actions.setView(view);
            },
        }),
    }, ConversationSessionHeader);
    const registerComposerBar = () => slots.register({
        name: 'conversation.composer.bar',
        locale: NS,
        children: {
            'conversation.input.attachments': { kind: 'single', scope: 'session-maybe' },
            'conversation.input.overlay': { kind: 'list', scope: 'session' },
            'conversation.input.left': { kind: 'list', scope: 'session' },
            'conversation.input.plan': { kind: 'single', scope: 'session' },
            'conversation.input.right': { kind: 'list', scope: 'session' },
            'conversation.input.model': { kind: 'single', scope: 'session' },
            'conversation.composer.dock': { kind: 'list', scope: 'session' },
        },
        inject: (sessionId) => {
            if (sessionId === undefined) {
                return {
                    keyboard: undefined,
                    addImages: undefined,
                    removeImage: undefined,
                    draftImages: undefined,
                    resolveSubmitMode: (running, gesture, steeringAvailable) => submissionPolicy.resolve(running, gesture, steeringAvailable),
                    toggleCommandMenu: undefined,
                    stop: undefined,
                    command: undefined,
                    hooks: {
                        notices: ABSENT_NOTICES,
                        lexicon: ABSENT_LEXICON,
                        menuLauncher: ABSENT_MENU_LAUNCHER,
                    },
                };
            }
            const conversation = concreteConversation(ctx);
            const shell = inputHub.shell(sessionId);
            const inputTriggers = inputHub.inputTriggers(sessionId);
            return {
                keyboard: shell,
                addImages: (files) => {
                    try {
                        const images = conversation.createDraftImages(files);
                        if (!shell.addImages(images.map(image => image.id))) {
                            conversation.releaseDraftImages(images);
                        }
                        return null;
                    }
                    catch (error) {
                        if (error instanceof UnsupportedImageMediaTypeError)
                            return t('image.unsupportedType');
                        return error instanceof Error ? error.message : String(error);
                    }
                },
                removeImage: (id) => {
                    conversation.releaseDraftImage(id);
                    shell.removeImage(id);
                },
                draftImages: ids => conversation.draftImages(ids),
                resolveSubmitMode: (running, gesture, steeringAvailable) => submissionPolicy.resolve(running, gesture, steeringAvailable),
                toggleCommandMenu: inputTriggers === undefined
                    ? undefined
                    : (selection) => {
                        shell.dismissPopup();
                        const snapshot = shell.snapshot;
                        inputTriggers.toggleSource('command', {
                            trigger: '/',
                            query: '',
                            quoted: false,
                            position: snapshot.draft.slice(0, selection.start).trim() === '' ? 'leading' : 'inline',
                            span: { ...selection, draftRev: snapshot.draftRev },
                        });
                    },
                stop: () => {
                    scopedConversation(sessions, sessionId).cancel().catch(() => {
                        // Stop failure is published through Session promptError.
                    });
                },
                command: async (line) => {
                    const session = sessions.binding(sessionId)?.session;
                    if (session === undefined)
                        return false;
                    const result = await session.command(line);
                    return result.ok && result.value.matched;
                },
                hooks: {
                    notices: shell.notices,
                    lexicon: shell.lexicon,
                    menuLauncher: inputTriggers?.launcher ?? ABSENT_MENU_LAUNCHER,
                },
            };
        },
    }, InputBar);
    slots.inject('conversation', function* () {
        yield registerConversationRoot();
        yield registerConversationSession();
        yield registerConversationHeader();
        yield registerComposerBar();
    });
    ctx.plugin(ConversationController, { input: inputHub, blocks: composerBlocks });
    ctx.plugin(todoDockEntry);
    ctx.plugin(queueDockEntry);
}
//# sourceMappingURL=apply.js.map