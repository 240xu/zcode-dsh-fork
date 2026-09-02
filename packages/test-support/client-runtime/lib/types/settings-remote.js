/** Test double for the `settings` Remote namespace a bench's plugins inject. */
import { vi } from 'vitest';
/**
 * Build a scripted `settings` Remote namespace for a bench. Each write answers
 * with the addressed namespace unchanged, so a bench that only needs its
 * plugins to activate scripts nothing; one asserting a write reads the
 * corresponding spy or replaces the face.
 * @param namespaces - namespace views the first describe answers with.
 * @param options - deployment facts the describe answer reports.
 * @returns the face and its controls.
 */
export function scriptedSettingsRemote(namespaces = [], options = {}) {
    let served = namespaces;
    const writable = options.writable ?? true;
    const hasDocument = options.hasDocument ?? false;
    const answer = (ns) => {
        const view = served.find(candidate => candidate.ns === ns);
        return Promise.resolve(view === undefined
            ? {
                ok: false,
                error: { code: 'settings/rejected', message: `no scripted namespace "${ns}"`, details: { ns } },
            }
            : { ok: true, value: view });
    };
    const update = vi.fn((ns, _patch, _expectedRevision) => answer(ns));
    const replace = vi.fn((ns, _section, _expectedRevision) => answer(ns));
    const mutate = vi.fn((ns, _ops, _expectedRevision) => answer(ns));
    return {
        settings: {
            describe: () => Promise.resolve({ ok: true, value: { writable, hasDocument, namespaces: served } }),
            update: (ns, patch, expectedRevision) => update(ns, patch, expectedRevision),
            replace: (ns, section, expectedRevision) => replace(ns, section, expectedRevision),
            mutate: (ns, ops, expectedRevision) => mutate(ns, ops, expectedRevision),
        },
        update,
        replace,
        mutate,
        publish(next) { served = next; },
    };
}
//# sourceMappingURL=settings-remote.js.map