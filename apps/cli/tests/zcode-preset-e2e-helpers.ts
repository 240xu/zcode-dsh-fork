/**
 * Shared helpers for the zcode preset end-to-end suites (smoke + live).
 *
 * Both suites boot the real composition from the shipped preset and disable
 * platform-blocked rows the same way; a single implementation keeps
 * composition edits from becoming two-file chores.
 */

/**
 * Force `disabled: true` onto one top-level preset composition row.
 *
 * The composition is edited as text on purpose: the suites rewrite the
 * shipped file into an isolated temp preset root, and a YAML round-trip
 * would drop comments and literal-block styles the loader may depend on.
 * Throws when the row is absent so a renamed row id fails loudly instead
 * of silently booting the unmodified composition.
 */
export function disablePresetRow(composition: string, id: string): string {
  const row = `- id: ${id}\n`
  const start = composition.indexOf(row)
  if (start < 0) throw new Error(`missing preset row ${id}`)
  const next = composition.indexOf('\n- id:', start + row.length)
  const end = next < 0 ? composition.length : next + 1
  const block = composition.slice(start, end)
  if (block.includes('disabled: true\n')) return composition
  if (block.includes('disabled: ')) {
    // Replace an existing disabled expression (e.g. the win32 platform gate).
    const lineStart = block.indexOf('disabled: ')
    const lineEnd = block.indexOf('\n', lineStart)
    return composition.slice(0, start + lineStart)
      + 'disabled: true'
      + composition.slice(start + lineEnd)
  }
  return composition.slice(0, end) + '  disabled: true\n' + composition.slice(end)
}
