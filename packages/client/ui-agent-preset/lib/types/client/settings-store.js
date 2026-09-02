/**
 * Agent-preset roster store shared by the display surfaces.
 *
 * Options come from one `agentPresets.list` call. Writes target the settings
 * namespace's `default` field, which is what the host resolves at creation;
 * the management section is the surface that writes it.
 */
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store';
/** The agent-preset settings namespace on the host wire. */
export const AGENT_PRESET_SETTINGS_NS = 'agent-presets';
/**
 * Persist one preset as the default for sessions created later.
 *
 * The default is a settings field rather than a preset property; the
 * management section writes it here — one home for which namespace and field
 * the host resolves at session creation.
 * @param ctx - the browser plugin context carrying the Remote namespaces.
 * @param id - the preset to make default.
 * @returns the failure message, or undefined once the write landed.
 */
export async function writeDefaultPreset(ctx, id) {
    const response = await ctx.remote.settings.update(AGENT_PRESET_SETTINGS_NS, { default: id }, undefined);
    return response.ok ? undefined : response.error.message;
}
const EMPTY_ROSTER = { presets: [], authorable: false };
/**
 * Read the roster, turning a refusal into the message every surface shows.
 * @param ctx - the browser plugin context carrying the Remote namespaces.
 * @returns the roster, or the message to show in its place.
 */
export async function readRoster(ctx) {
    const result = await ctx.remote.agentPresets.list();
    if (result.ok)
        return { ok: true, value: result.value };
    // Agent presets are optional: without that service every session uses the
    // Host composition, so callers receive the same empty roster as a mounted
    // service with no configured roots.
    if (result.error.code === 'gateway/invocation-unavailable')
        return { ok: true, value: EMPTY_ROSTER };
    return { ok: false, error: result.error.message };
}
/**
 * The opening move every roster-backed surface makes: refuse a read that is
 * already in flight, mark the store loading, then read.
 *
 * A surface that gets `undefined` returns without touching its snapshot
 * further — either another read owns it, or this one already wrote the
 * failure. What differs between surfaces starts after this.
 * @param ctx - the browser plugin context carrying the Remote namespaces.
 * @param store - the surface's own snapshot store.
 * @returns the roster, or undefined when the caller should return.
 */
export async function beginRosterRead(ctx, store) {
    const before = store.getSnapshot();
    if (before.status === 'loading')
        return undefined;
    store.set({ ...before, status: 'loading', error: null });
    const roster = await readRoster(ctx);
    if (roster.ok)
        return roster.value;
    store.set({ ...store.getSnapshot(), status: 'error', error: roster.error });
    return undefined;
}
/**
 * The roster entries as the pickers render them: healthy presets only.
 *
 * The chip exists to choose the NEXT session's composition, and a broken
 * preset cannot compose one — offering it would defer the discovery of that
 * fact to a failed session start. The management section renders the full
 * roster (broken rows included) from its own store instead.
 *
 * The chip, the header label, and the management section all show the same
 * facts, and `exactOptionalPropertyTypes` makes "absent" and "present as
 * undefined" different shapes — so the spread dance belongs in one place rather than
 * once per store.
 * @param presets - the roster the host answered with.
 * @returns one option per selectable preset, in roster order.
 */
export function presetOptions(presets) {
    return presets.filter(preset => preset.broken === undefined).map(preset => ({
        id: preset.id,
        trust: preset.trust,
        ...preset.name === undefined ? {} : { name: preset.name },
        ...preset.description === undefined ? {} : { description: preset.description },
    }));
}
const INITIAL = {
    status: 'idle',
    error: null,
    options: [],
};
/** Reads the roster for the surfaces that only display it. */
export class AgentPresetSettingsController {
    ctx;
    /** Roster snapshot the renderer subscribes to. */
    store = createSnapshotStore(INITIAL);
    /**
     * @param ctx - the browser plugin context (the roster read).
     */
    constructor(ctx) {
        this.ctx = ctx;
    }
    set(patch) {
        this.store.set({ ...this.store.getSnapshot(), ...patch });
    }
    /**
     * Load the roster. An empty roster means the deployment composes no
     * presets, which is a valid deployment rather than a failure — the
     * surfaces report `unavailable` and render nothing.
     * @returns once the snapshot reflects the host.
     */
    async load() {
        const roster = await beginRosterRead(this.ctx, this.store);
        if (roster === undefined)
            return;
        const { presets } = roster;
        if (presets.length === 0) {
            this.set({ status: 'unavailable', options: [] });
            return;
        }
        this.set({
            status: 'ready',
            error: null,
            options: presetOptions(presets),
        });
    }
}
//# sourceMappingURL=settings-store.js.map