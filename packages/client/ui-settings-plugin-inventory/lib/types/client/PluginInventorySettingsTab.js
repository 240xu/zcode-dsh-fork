import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useId, useMemo, useState } from 'react';
import { IconChevronDownOutline14, IconSearchOutline16, Menu, } from '@deepseek-ai/dsh-client-ui-primitives';
import css from './PluginInventorySettingsTab.module.css';
const PHASE_KEYS = {
    pending: 'pending',
    loading: 'loadingPhase',
    active: 'active',
    failed: 'failed',
    unloading: 'unloading',
};
/** Localized accessible label for one root Fiber phase. */
function phaseLabel(phase, t) {
    return phase === null ? t('unobserved') : t(PHASE_KEYS[phase]);
}
/** Compact a module specifier without guessing whether its Loader id was generated. */
function moduleShortName(moduleName) {
    const unscoped = moduleName.startsWith('@') ? moduleName.slice(moduleName.indexOf('/') + 1) : moduleName;
    return unscoped
        .replace(/^cordis:/, '')
        .replace(/^cordis-plugin-/, '')
        .replace(/^dsh-(?:host-|client-)?/, '');
}
/** Whether one row's module name or entry id matches the catalog query. */
function matches(moduleName, entryId, normalizedQuery) {
    if (normalizedQuery.length === 0)
        return true;
    return [moduleName, ...entryId === null ? [] : [entryId]]
        .some(value => value.toLocaleLowerCase().includes(normalizedQuery));
}
/** The roster row shown when the preset switcher has no explicit choice. */
function fallbackPreset(presets) {
    return presets.find(preset => preset.isDefault) ?? presets[0];
}
/** The switcher's display label for one preset. */
function presetLabel(preset, t, presetName) {
    const name = presetName(preset);
    if (preset.broken !== undefined)
        return t('presetOptionBroken', { name });
    if (preset.isDefault)
        return t('presetOptionDefault', { name });
    return name;
}
/** One expandable plugin card; the caller owns the trailing status content. */
function PluginCard({ rowKey, moduleName, entryId, trailing, ariaLabel, failed, expanded, onToggle, children }) {
    const open = expanded === rowKey;
    const detailId = `plugin-details-${encodeURIComponent(rowKey)}`;
    return (_jsxs("li", { className: css.card, "data-plugin-entry": entryId ?? undefined, "data-plugin-module": moduleName, "data-failed": failed ? 'true' : undefined, "data-open": open ? 'true' : undefined, children: [_jsxs("button", { className: css.cardContent, type: "button", "aria-expanded": open, "aria-controls": detailId, "aria-label": ariaLabel, onClick: () => { onToggle(rowKey); }, children: [_jsx("strong", { className: css.cardTitle, title: moduleName, children: moduleShortName(moduleName) }), _jsxs("span", { className: css.cardTrailing, children: [trailing, _jsx(IconChevronDownOutline14, { className: css.chevron, size: 12, "aria-hidden": "true" })] })] }), open ? _jsx("div", { className: css.cardDetails, id: detailId, children: children }) : null] }));
}
/** Detail rows shared by every card: the Loader identity, then labeled facts. */
function CardFacts({ moduleName, moduleLabel, entryId, facts }) {
    return (_jsxs(_Fragment, { children: [entryId === null ? null : _jsx("code", { className: css.entryValue, "data-loader-entry": true, children: entryId }), _jsxs("dl", { className: css.details, children: [_jsxs("div", { children: [_jsx("dt", { children: moduleLabel }), _jsx("dd", { children: moduleName })] }), facts.map(([label, value]) => (_jsxs("div", { children: [_jsx("dt", { children: label }), _jsx("dd", { children: value })] }, label)))] })] }));
}
/** Status dot naming a live root-fiber phase; rows with no live fiber show none. */
function PhaseDot({ phase, t }) {
    const status = phaseLabel(phase, t);
    return (_jsx("span", { className: css.statusDot, "data-phase": phase, role: "img", "aria-label": status, title: status }));
}
/** Enablement tag; `kind` selects the palette. */
function StateTag({ kind, label }) {
    return _jsx("span", { className: css.configTag, "data-kind": kind, children: label });
}
/** Render the read-only plugin inventory: agent presets first, then the global plane. */
export function PluginInventorySettingsTab({ list, presetName, t }) {
    const sectionId = useId();
    const [request, setRequest] = useState(0);
    const [query, setQuery] = useState('');
    const [expanded, setExpanded] = useState(null);
    const [chosenPreset, setChosenPreset] = useState(null);
    const [switcherOpen, setSwitcherOpen] = useState(false);
    const [presetOpen, setPresetOpen] = useState(null);
    const [globalOpen, setGlobalOpen] = useState(null);
    const [state, setState] = useState({ status: 'loading' });
    useEffect(() => {
        let current = true;
        void Promise.resolve().then(() => list()).then((snapshot) => { if (current)
            setState({ status: 'ready', snapshot }); }, () => { if (current)
            setState({ status: 'error' }); });
        return () => { current = false; };
    }, [list, request]);
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const searching = normalizedQuery.length > 0;
    const snapshot = state.status === 'ready' ? state.snapshot : undefined;
    const presets = snapshot?.agentPresets ?? [];
    const selected = presets.find(preset => preset.id === chosenPreset) ?? fallbackPreset(presets);
    /** Presets that actually enable a module, keyed by module name. */
    const enabledIn = useMemo(() => {
        const found = new Map();
        for (const preset of presets) {
            for (const row of preset.rows) {
                if (row.enabled !== true)
                    continue;
                const groups = found.get(row.moduleName);
                if (groups === undefined)
                    found.set(row.moduleName, [preset]);
                else if (!groups.includes(preset))
                    groups.push(preset);
            }
        }
        return found;
    }, [presets]);
    const entries = snapshot?.entries ?? [];
    const failedEntries = [];
    const regularEntries = [];
    for (const entry of entries) {
        if (entry.fiberPhase === 'failed')
            failedEntries.push(entry);
        else
            regularEntries.push(entry);
    }
    const entryMatch = (entry) => matches(entry.moduleName, entry.entryId, normalizedQuery);
    const rowMatch = (row) => matches(row.moduleName, row.entryId, normalizedQuery);
    const filteredFailed = failedEntries.filter(entryMatch);
    const filteredRegular = regularEntries.filter(entryMatch);
    const globalCount = filteredFailed.length + filteredRegular.length;
    const selectedRows = selected === undefined ? [] : selected.rows.filter(rowMatch);
    const otherPresetMatches = searching
        ? presets.filter(preset => preset !== selected && preset.rows.some(rowMatch))
        : [];
    const otherMatchCount = otherPresetMatches
        .reduce((total, preset) => total + preset.rows.filter(rowMatch).length, 0);
    const presetEffectiveOpen = searching || (presetOpen ?? true);
    const globalEffectiveOpen = searching || (globalOpen ?? presets.length === 0);
    const nothingMatches = searching && globalCount === 0 && selectedRows.length === 0
        && otherPresetMatches.length === 0;
    const retry = () => {
        setState({ status: 'loading' });
        setRequest(value => value + 1);
    };
    const toggleRow = (key) => {
        setExpanded(current => current === key ? null : key);
    };
    /** Trailing status and detail facts for one row of the selected preset. */
    const presetRowCard = (preset, row, index) => {
        const key = `preset:${preset.id}:${String(index)}`;
        const title = moduleShortName(row.moduleName);
        const failed = row.fiberPhase === 'failed';
        const stateText = failed
            ? t('failedTag')
            : row.enabled === true ? t('enabledTag') : row.enabled === false ? t('disabledTag') : t('conditionalTag');
        const kind = failed ? 'failed' : row.enabled === true ? 'enabled' : row.enabled === false ? 'disabled' : 'conditional';
        return (_jsx(PluginCard, { rowKey: key, moduleName: row.moduleName, entryId: row.entryId, failed: failed, expanded: expanded, onToggle: toggleRow, ariaLabel: `${title}, ${stateText}`, trailing: (_jsxs(_Fragment, { children: [row.enabled === true && !failed && row.fiberPhase !== null
                        ? _jsx(PhaseDot, { phase: row.fiberPhase, t: t })
                        : null, _jsx(StateTag, { kind: kind, label: stateText })] })), children: _jsx(CardFacts, { moduleName: row.moduleName, moduleLabel: t('moduleLabel'), entryId: row.entryId, facts: [
                    [t('fromPreset'), presetName(preset)],
                    [t('configuration'), stateText],
                    ...row.fiberPhase === null ? [] : [[t('runtime'), phaseLabel(row.fiberPhase, t)]],
                    ...row.condition === undefined ? [] : [[t('condition'), _jsx("code", { children: row.condition }, "condition")]],
                ] }) }, key));
    };
    /** One global-plane row; a preset-provided row carries the presets that enable it. */
    const globalRowCard = (entry, providers) => {
        const key = `global:${entry.entryId}`;
        const title = moduleShortName(entry.moduleName);
        const failed = entry.fiberPhase === 'failed';
        const stateText = failed
            ? t('failedTag')
            : providers !== undefined ? t('presetEnabledTag') : t(entry.enabled ? 'enabledTag' : 'disabledTag');
        const kind = failed ? 'failed' : providers !== undefined ? 'preset' : entry.enabled ? 'enabled' : 'disabled';
        return (_jsx(PluginCard, { rowKey: key, moduleName: entry.moduleName, entryId: entry.entryId, failed: failed, expanded: expanded, onToggle: toggleRow, ariaLabel: `${title}, ${stateText}`, trailing: (_jsxs(_Fragment, { children: [entry.enabled && !failed && entry.fiberPhase !== null
                        ? _jsx(PhaseDot, { phase: entry.fiberPhase, t: t })
                        : null, _jsx(StateTag, { kind: kind, label: stateText })] })), children: _jsx(CardFacts, { moduleName: entry.moduleName, moduleLabel: t('moduleLabel'), entryId: entry.entryId, facts: providers !== undefined
                    ? [
                        [t('configuration'), t('presetProvidedDetail')],
                        [t('enabledIn'), (_jsxs("span", { className: css.enabledIn, children: [_jsx("span", { children: providers.map(preset => presetName(preset)).join(' · ') }), _jsx("button", { type: "button", className: css.jumpLink, onClick: () => { setChosenPreset(providers[0].id); }, children: t('viewInPreset') })] }))],
                    ]
                    : [
                        [t('configuration'), t(entry.enabled ? 'enabledTag' : 'disabledTag')],
                        ...entry.enabled ? [[t('runtime'), phaseLabel(entry.fiberPhase, t)]] : [],
                    ] }) }, key));
    };
    return (_jsxs("div", { className: css.section, "aria-busy": state.status === 'loading', children: [state.status === 'loading' ? _jsx("p", { className: css.status, children: t('loading') }) : null, state.status === 'error' ? (_jsxs("div", { className: css.failure, children: [_jsx("p", { role: "alert", children: t('error') }), _jsx("button", { type: "button", onClick: retry, children: t('retry') })] })) : null, snapshot !== undefined ? (_jsxs("div", { className: css.catalog, children: [_jsxs("label", { className: css.search, children: [_jsx(IconSearchOutline16, { "aria-hidden": "true" }), _jsx("span", { className: css.visuallyHidden, children: t('search') }), _jsx("input", { type: "search", value: query, placeholder: t('search'), "aria-label": t('search'), onChange: (event) => { setQuery(event.currentTarget.value); } })] }), entries.length === 0 && presets.length === 0 ? _jsx("p", { className: css.status, children: t('empty') }) : null, nothingMatches ? _jsx("p", { className: css.status, children: t('emptySearch') }) : null, selected !== undefined ? (_jsxs("section", { className: css.group, "data-plugin-scope": "preset", "data-preset-id": selected.id, children: [_jsxs("div", { className: css.groupTitleRow, children: [_jsxs("button", { type: "button", className: css.groupToggle, "aria-expanded": presetEffectiveOpen, "aria-controls": `${sectionId}-preset`, onClick: () => { setPresetOpen(!presetEffectiveOpen); }, children: [_jsx(IconChevronDownOutline14, { className: css.chevron, size: 12, "aria-hidden": "true" }), _jsx("span", { className: css.groupTitle, children: t('presetTitle') })] }), _jsx("div", { className: css.headerEnd, children: _jsx(Menu, { open: switcherOpen, onClose: () => { setSwitcherOpen(false); }, items: presets.map(preset => ({ id: preset.id, label: presetLabel(preset, t, presetName) })), selectedId: selected.id, onSelect: (id) => {
                                                setSwitcherOpen(false);
                                                setChosenPreset(id);
                                            }, align: "end", portal: true, anchor: (_jsxs("button", { type: "button", className: css.switcher, "aria-haspopup": "menu", "aria-expanded": switcherOpen, "aria-label": t('switcherLabel'), onClick: () => { setSwitcherOpen(value => !value); }, children: [_jsx("span", { className: css.switcherLabel, children: presetLabel(selected, t, presetName) }), _jsx(IconChevronDownOutline14, { className: css.chevron, "aria-hidden": "true" })] })) }) })] }), _jsxs("p", { className: css.groupSub, children: [t('presetSubtitle'), _jsx("span", { "data-preset-plugin-count": selectedRows.length, children: ` · ${String(selectedRows.length)} ${t('countUnit')}` })] }), presetEffectiveOpen ? (_jsxs("div", { id: `${sectionId}-preset`, className: css.groupBody, children: [selected.broken !== undefined ? (_jsx("p", { className: css.brokenNote, role: "alert", children: selected.broken })) : null, selectedRows.length > 0 ? (_jsx("ul", { className: css.cards, children: selectedRows.map((row, index) => presetRowCard(selected, row, index)) })) : null, otherMatchCount > 0 ? (_jsxs("p", { className: css.hint, children: [t('matchesInOtherPresets', { count: String(otherMatchCount) }), otherPresetMatches.map(preset => (_jsx("button", { type: "button", className: css.jumpLink, onClick: () => { setChosenPreset(preset.id); }, children: presetName(preset) }, preset.id)))] })) : null] })) : null] })) : null, entries.length > 0 ? (_jsxs("section", { className: css.group, "data-plugin-scope": "global", children: [_jsx("div", { className: css.groupTitleRow, children: _jsxs("button", { type: "button", className: css.groupToggle, "aria-expanded": globalEffectiveOpen, "aria-controls": `${sectionId}-global`, onClick: () => { setGlobalOpen(!globalEffectiveOpen); }, children: [_jsx(IconChevronDownOutline14, { className: css.chevron, size: 12, "aria-hidden": "true" }), _jsx("span", { className: css.groupTitle, children: t('globalTitle') })] }) }), _jsxs("p", { className: css.groupSub, children: [t('globalSubtitle'), _jsx("span", { "data-plugin-count": globalCount, children: ` · ${String(globalCount)} ${t('countUnit')}` }), filteredFailed.length > 0 ? (_jsxs("span", { className: css.failedCount, children: [filteredFailed.length, " ", t('failedCountLabel')] })) : null] }), globalEffectiveOpen && globalCount > 0 ? (_jsxs("ul", { className: css.cards, id: `${sectionId}-global`, children: [filteredFailed.map(entry => globalRowCard(entry)), filteredRegular.map(entry => globalRowCard(entry, entry.enabled ? undefined : enabledIn.get(entry.moduleName)))] })) : null] })) : null] })) : null] }));
}
//# sourceMappingURL=PluginInventorySettingsTab.js.map