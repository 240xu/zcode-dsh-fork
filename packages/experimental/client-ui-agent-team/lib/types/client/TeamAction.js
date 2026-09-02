import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { IconCheckOutline14, IconCloseOutline16, IconEditOutline16, IconPlusOutline16, IconRefreshOutline14, IconTrashOutline16, IconUserOutline16, StateDot, } from '@deepseek-ai/dsh-client-ui-primitives';
import css from './TeamAction.module.css';
const EMPTY_DRAFT = { subject: '', description: '', blockers: '', scopes: '' };
function items(value) {
    return [...new Set(value.split(',').map(item => item.trim()).filter(Boolean))];
}
function taskIds(value) {
    return items(value);
}
/**
 * One failure line for either carrier: a Remote failure, or a Team business
 * rejection whose codes stay local to this seam and never ride the wire.
 */
function failureText(error) {
    return `${error.message} (${error.code})`;
}
function statusKey(status) {
    switch (status) {
        case 'pending': return 'status.pending';
        case 'in_progress': return 'status.in_progress';
        case 'completed': return 'status.completed';
        /* v8 ignore next -- Team views omit deleted task tombstones. */
        case 'deleted': return 'status.completed';
    }
}
function memberStatusKey(status) {
    switch (status) {
        case 'running': return 'memberStatus.running';
        case 'idle': return 'memberStatus.idle';
        case 'inactive': return 'memberStatus.inactive';
        case 'provisioning': return 'memberStatus.provisioning';
        case 'failed': return 'memberStatus.failed';
    }
}
/** Render the live Team roster and compare-and-set task board. */
export function TeamAction({ sessionId, load, createTask, updateTask, openTeammate, t, }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState(null);
    const [error, setError] = useState(null);
    const [creating, setCreating] = useState(false);
    const [createDraft, setCreateDraft] = useState(EMPTY_DRAFT);
    const [editing, setEditing] = useState(null);
    const [editDraft, setEditDraft] = useState(EMPTY_DRAFT);
    const [pendingTasks, setPendingTasks] = useState(() => new Set());
    const sessionRef = useRef(sessionId);
    const refreshGeneration = useRef(0);
    sessionRef.current = sessionId;
    useEffect(() => {
        refreshGeneration.current += 1;
        setOpen(false);
        setLoading(false);
        setView(null);
        setError(null);
        setCreating(false);
        setCreateDraft(EMPTY_DRAFT);
        setEditing(null);
        setEditDraft(EMPTY_DRAFT);
        setPendingTasks(new Set());
    }, [sessionId]);
    const refresh = useCallback(async () => {
        const requestedSession = sessionId;
        const generation = ++refreshGeneration.current;
        setLoading(true);
        const result = await load(requestedSession);
        if (sessionRef.current !== requestedSession || refreshGeneration.current !== generation)
            return false;
        setLoading(false);
        if (result.ok) {
            setView(result.value);
            setError(null);
            return true;
        }
        else {
            setError(failureText(result.error));
            return false;
        }
    }, [load, sessionId]);
    const invalidateRefresh = useCallback(() => {
        refreshGeneration.current += 1;
        setLoading(false);
    }, []);
    const settleTask = useCallback(async (taskId, operation) => {
        const requestedSession = sessionId;
        invalidateRefresh();
        setPendingTasks(current => new Set(current).add(taskId));
        try {
            const result = await operation();
            if (sessionRef.current !== requestedSession)
                return undefined;
            if (!result.ok) {
                setError(failureText(result.error));
                return undefined;
            }
            if (!result.value.ok) {
                if (result.value.error.code === 'team-task-conflict') {
                    const reloaded = await refresh();
                    if (sessionRef.current !== requestedSession)
                        return undefined;
                    if (reloaded)
                        setError(t('conflict'));
                }
                else {
                    setError(failureText(result.value.error));
                }
                return undefined;
            }
            const task = result.value.value;
            setError(null);
            await refresh();
            if (sessionRef.current !== requestedSession)
                return undefined;
            return task;
        }
        finally {
            if (sessionRef.current === requestedSession) {
                setPendingTasks((current) => {
                    const next = new Set(current);
                    next.delete(taskId);
                    return next;
                });
            }
        }
    }, [invalidateRefresh, refresh, sessionId, t]);
    const submitCreate = async () => {
        const subject = createDraft.subject.trim();
        const description = createDraft.description.trim();
        /* v8 ignore next -- TaskForm disables Save while either normalized field is empty. */
        if (subject === '' || description === '')
            return;
        const created = await settleTask('create', () => createTask(sessionId, {
            subject,
            description,
            blockedBy: taskIds(createDraft.blockers),
            writeScopes: items(createDraft.scopes),
        }));
        if (created === undefined)
            return;
        setCreateDraft(EMPTY_DRAFT);
        setCreating(false);
    };
    const startEdit = (task) => {
        setEditing(task.id);
        setEditDraft({
            subject: task.subject,
            description: task.description,
            blockers: task.blockedBy.join(', '),
            scopes: task.writeScopes.join(', '),
        });
    };
    const submitEdit = async (task) => {
        const requestedSession = sessionId;
        const edited = await settleTask(task.id, () => updateTask(requestedSession, {
            taskId: task.id,
            expectedRevision: task.revision,
            action: 'edit',
            subject: editDraft.subject.trim(),
            description: editDraft.description.trim(),
            writeScopes: items(editDraft.scopes),
        }));
        if (edited === undefined)
            return;
        const blockedBy = taskIds(editDraft.blockers);
        if (blockedBy.length === edited.blockedBy.length
            && blockedBy.every((blocker, index) => blocker === edited.blockedBy[index])) {
            setEditing(null);
            return;
        }
        const dependencyTask = await settleTask(task.id, () => updateTask(requestedSession, {
            taskId: task.id,
            expectedRevision: edited.revision,
            action: 'set_dependencies',
            blockedBy,
        }));
        if (dependencyTask === undefined)
            return;
        setEditing(null);
    };
    const teammates = view?.members.filter(member => member.role === 'teammate') ?? [];
    const assignable = view?.members.filter(member => member.status !== 'failed' && member.status !== 'provisioning') ?? [];
    return (_jsxs("div", { className: css.root, "data-team-action": true, children: [_jsxs("button", { type: "button", className: css.trigger, "aria-expanded": open, onClick: () => {
                    const next = !open;
                    setOpen(next);
                    if (next)
                        void refresh();
                }, children: [_jsx(IconUserOutline16, { size: 14 }), _jsx("span", { children: t('trigger') }), teammates.length > 0 && _jsx("span", { className: css.count, children: teammates.length })] }), open && (_jsxs("div", { className: css.panel, role: "dialog", "aria-label": t('trigger'), children: [_jsxs("div", { className: css.toolbar, children: [_jsx("strong", { children: t('trigger') }), _jsx("span", { className: css.spacer }), _jsx("button", { type: "button", className: css.iconButton, "aria-label": t('refresh'), onClick: () => { void refresh(); }, children: _jsx(IconRefreshOutline14, {}) }), _jsx("button", { type: "button", className: css.iconButton, "aria-label": t('close'), onClick: () => { setOpen(false); }, children: _jsx(IconCloseOutline16, { size: 14 }) })] }), error !== null && _jsx("div", { className: css.error, role: "alert", children: error }), loading && view === null && _jsx("div", { className: css.notice, children: t('loading') }), view !== null && (_jsxs(_Fragment, { children: [_jsxs("section", { children: [_jsx("h3", { children: t('roster') }), _jsx("div", { className: css.roster, children: view.members.map(member => (_jsxs("button", { type: "button", className: css.member, disabled: member.role === 'lead' || member.status === 'failed' || member.status === 'provisioning', title: member.role === 'teammate' ? t('open') : undefined, onClick: () => {
                                                void openTeammate(sessionId, member).catch((reason) => { setError(String(reason)); });
                                            }, children: [_jsx(StateDot, { state: member.status === 'running' ? 'ongoing' : member.status === 'failed' ? 'error' : 'done' }), _jsxs("span", { className: css.memberText, children: [_jsx("span", { children: member.name }), _jsxs("small", { children: [t(memberStatusKey(member.status)), member.model === undefined ? '' : ` · ${t('model')}: ${member.model}`] }), member.diagnostics.map(diagnostic => _jsx("small", { className: css.diagnostic, children: diagnostic }, diagnostic))] })] }, member.id))) })] }), _jsxs("section", { children: [_jsxs("div", { className: css.sectionTitle, children: [_jsx("h3", { children: t('tasks') }), _jsxs("button", { type: "button", className: css.smallButton, onClick: () => { setCreating(true); }, children: [_jsx(IconPlusOutline16, { size: 13 }), " ", t('create')] })] }), creating && (_jsx(TaskForm, { draft: createDraft, setDraft: setCreateDraft, pending: pendingTasks.has('create'), onSave: () => { void submitCreate(); }, onCancel: () => { setCreating(false); }, t: t })), view.tasks.length === 0 && !creating && _jsx("div", { className: css.notice, children: t('empty') }), _jsx("div", { className: css.tasks, children: view.tasks.map(task => editing === task.id
                                            ? (_jsx(TaskForm, { draft: editDraft, setDraft: setEditDraft, pending: pendingTasks.has(task.id), onSave: () => { void submitEdit(task); }, onCancel: () => { setEditing(null); }, t: t }, task.id))
                                            : (_jsxs("article", { className: css.task, children: [_jsxs("div", { className: css.taskTitle, children: [_jsx("strong", { children: task.subject }), _jsx("span", { children: t(statusKey(task.status)) })] }), _jsx("p", { children: task.description }), _jsxs("div", { className: css.meta, children: [_jsx("span", { children: task.id }), task.status === 'pending' && _jsx("span", { children: task.ready ? t('ready') : t('blocked') }), task.blockedBy.length > 0 && _jsxs("span", { children: [t('blockedBy'), ": ", task.blockedBy.join(', ')] }), task.writeScopes.length > 0 && _jsxs("span", { children: [t('writeScopes'), ": ", task.writeScopes.join(', ')] }), task.writeScopeWarnings.map(warning => _jsx("span", { className: css.warning, children: warning }, warning))] }), _jsxs("div", { className: css.taskActions, children: [_jsxs("label", { children: [t('owner'), _jsxs("select", { value: task.ownerName ?? '', disabled: pendingTasks.has(task.id) || task.status === 'completed', onChange: (event) => {
                                                                            const owner = event.target.value;
                                                                            void settleTask(task.id, () => updateTask(sessionId, {
                                                                                taskId: task.id,
                                                                                expectedRevision: task.revision,
                                                                                action: 'reassign',
                                                                                ...owner === '' ? {} : { owner },
                                                                            }));
                                                                        }, children: [_jsx("option", { value: "", children: t('unowned') }), assignable.map(member => _jsx("option", { value: member.name, children: member.name }, member.id))] })] }), _jsxs("button", { type: "button", onClick: () => { startEdit(task); }, disabled: pendingTasks.has(task.id), children: [_jsx(IconEditOutline16, { size: 13 }), " ", t('edit')] }), task.status === 'in_progress' && (_jsxs("button", { type: "button", disabled: pendingTasks.has(task.id), onClick: () => {
                                                                    void settleTask(task.id, () => updateTask(sessionId, {
                                                                        taskId: task.id, expectedRevision: task.revision, action: 'complete',
                                                                    }));
                                                                }, children: [_jsx(IconCheckOutline14, {}), " ", t('complete')] })), task.status === 'completed' && (_jsx("button", { type: "button", disabled: pendingTasks.has(task.id), onClick: () => {
                                                                    void settleTask(task.id, () => updateTask(sessionId, {
                                                                        taskId: task.id, expectedRevision: task.revision, action: 'reopen',
                                                                    }));
                                                                }, children: t('reopen') })), _jsxs("button", { type: "button", disabled: pendingTasks.has(task.id), onClick: () => {
                                                                    void settleTask(task.id, () => updateTask(sessionId, {
                                                                        taskId: task.id, expectedRevision: task.revision, action: 'delete',
                                                                    }));
                                                                }, children: [_jsx(IconTrashOutline16, { size: 13 }), " ", t('delete')] })] })] }, task.id))) })] })] }))] }))] }));
}
function TaskForm({ draft, setDraft, pending, onSave, onCancel, t }) {
    const field = (key, value) => { setDraft({ ...draft, [key]: value }); };
    return (_jsxs("div", { className: css.form, children: [_jsx("input", { value: draft.subject, placeholder: t('subject'), onChange: (event) => { field('subject', event.target.value); } }), _jsx("textarea", { value: draft.description, placeholder: t('description'), onChange: (event) => { field('description', event.target.value); } }), _jsx("input", { value: draft.blockers, placeholder: t('blockers'), onChange: (event) => { field('blockers', event.target.value); } }), _jsx("input", { value: draft.scopes, placeholder: t('scopes'), onChange: (event) => { field('scopes', event.target.value); } }), _jsxs("div", { className: css.formActions, children: [_jsx("button", { type: "button", disabled: pending || draft.subject.trim() === '' || draft.description.trim() === '', onClick: onSave, children: t('save') }), _jsx("button", { type: "button", disabled: pending, onClick: onCancel, children: t('cancel') })] })] }));
}
//# sourceMappingURL=TeamAction.js.map