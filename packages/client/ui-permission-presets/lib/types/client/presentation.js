import { en } from "./locales.js";
/** Machine value of the preset that requires an explicit GUI risk gate. */
export const FULL_ACCESS_PRESET = 'danger-full-access';
const PRESET_LABEL_KEYS = new Map([
    ['read-only', 'preset.readOnly'],
    ['workspace-write', 'preset.workspaceWrite'],
    [FULL_ACCESS_PRESET, 'preset.fullAccess'],
]);
const DEFAULT_PRESET_LABELS = {
    'preset.readOnly': en['preset.readOnly'],
    'preset.workspaceWrite': en['preset.workspaceWrite'],
    'preset.fullAccess': en['preset.fullAccess'],
};
/**
 * Convert conventional kebab-case preset names into user-facing title case.
 * @param name - host-supplied preset label or key.
 * @returns the title-cased conventional key, or a non-kebab label unchanged.
 */
export function displayPresetName(name) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name))
        return name;
    return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
/**
 * Render a permission preset under its product label.
 * @param value - preset machine value.
 * @param name - host-supplied preset name.
 * @param t - optional locale dictionary lookup for built-in product labels.
 * @returns the built-in product label or the conventional display name.
 */
export function displayPermissionPreset(value, name, t) {
    const key = PRESET_LABEL_KEYS.get(value);
    if (key !== undefined && (name === value || name === DEFAULT_PRESET_LABELS[key])) {
        return t?.(key) ?? DEFAULT_PRESET_LABELS[key];
    }
    return displayPresetName(name);
}
//# sourceMappingURL=presentation.js.map