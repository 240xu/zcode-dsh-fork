import type { Browser, Locator, Page } from 'playwright';
/** The built page under test; `pnpm run test:web` rebuilds it before running. */
export declare const DIST_INDEX: string;
export declare const REPO_ROOT: string;
/**
 * Browser language a page must advertise to boot into the product's Chinese
 * surface: with no stored preference the client derives its initial locale
 * from the browser, and Playwright's default browser asks for English.
 */
export declare const ZH_BROWSER_LOCALE = "zh-CN";
/**
 * Open the standard browser-test page advertising English before client boot.
 * This keeps role locators and goldens deterministic while leaving the Host
 * settings document free to override the provisional browser-derived locale;
 * scenarios asserting the Chinese surface advertise
 * {@link ZH_BROWSER_LOCALE} instead.
 * @param browser - Playwright browser owning the page.
 * @param height - Viewport height; width is fixed to the lane baseline.
 * @returns the initialized page.
 */
export declare function newEnglishPage(browser: Browser, height?: number): Promise<Page>;
/**
 * Expand every currently eligible Turn-process group so a Tool-focused
 * scenario can exercise the original row contract beneath product-default
 * compact Chat presentation.
 * @param page - page containing the Chat view.
 */
export declare function expandTurnProcesses(page: Page): Promise<void>;
/**
 * Expand the Turn-process group containing one possibly hidden descendant.
 * @param page - page containing the Chat view.
 * @param target - descendant whose owning Turn process should open.
 */
export declare function expandOwningTurnProcess(page: Page, target: Locator): Promise<void>;
/** Fail loud on a stale checkout instead of testing yesterday's bundle. */
export declare function requireDist(): void;
/** OS-assigned free port, released before use (the spawned `dsh web` needs a concrete --port). */
export declare function probeFreePort(): Promise<number>;
/**
 * Drive the hero's workspace picker through the composed directory dialog
 * until the live composer unlocks. A fresh world has no Workspace, so the boot
 * lands in the Workspace-trigger view state (startup auto-selection has nothing to
 * select); every scenario that types into the composer must connect one
 * first. With nothing to list, activating the composer surface raises the dialog directly —
 * adding a workspace is the picker's only entry. The directory is staged here
 * and adopted through the path editor, which is idempotent across the repeated
 * connects a scenario may make; creating a folder from inside the dialog (the
 * product's other half of the same route) is covered by
 * workspace-management.e2e.ts. The default name 'workspace' keeps the session
 * header cwd at <root>/workspace, the materialization proof several scenarios
 * assert.
 * @param page - the page under test.
 * @param root - host directory the workspace folder is staged in (the scaffold's `workspaceCwd`).
 * @param name - folder name staged and adopted as the workspace.
 */
export declare function connectFreshWorkspace(page: Page, root: string, name?: string): Promise<void>;
/**
 * {@link connectFreshWorkspace} over a page that advertises
 * {@link ZH_BROWSER_LOCALE}: the English helper's anchors assume the locale
 * most other scenarios boot, so a scenario that deliberately keeps zh needs
 * the localized picker copy.
 * @param page - the browser page under test.
 * @param root - workspace parent directory.
 * @param name - directory created under `root` and connected.
 */
export declare function connectFreshWorkspaceZh(page: Page, root: string, name?: string): Promise<void>;
/**
 * Replace the composer draft through per-key gestures. `fill()` issues
 * select-all and insertText inside one task; directly after a trigger-menu or
 * chip interaction Lexical's internal selection has not yet absorbed the DOM
 * selection, and the batched edit lands on a null selection and is silently
 * dropped, leaving the previous draft in place. Real keystrokes leave room for
 * `selectionchange` between keys, which is also what a user's typing does.
 *
 * Waits for the surface to be editable first. While the input machine is
 * adjudicating or submitting a send — and in every locked state (removed
 * session, no workspace, an owner block) — the composer renders read-only
 * with `contenteditable="false"` on the same element. `fill()` throws
 * immediately on that element, and `isEnabled()` reports `true` for a
 * `<div>` regardless of the attribute — so a gesture directly after a
 * submit must gate on the attribute, not on enablement. A running turn by
 * itself keeps the composer editable (that is what queueing types into).
 * @param page - the page under test.
 * @param input - the `[data-composer-input]` surface locator.
 * @param text - the replacement draft; `''` clears the draft. Must not
 * contain a newline: typed Enter submits the composer.
 */
export declare function writeComposerDraft(page: Page, input: ReturnType<Page['locator']>, text: string): Promise<void>;
/** Failure evidence goes to the gitignored .artifacts/ (repo convention). */
export declare function saveFailureShot(page: Page, name: string): Promise<void>;
/**
 * The conversation engine's Context key format, restated here rather than
 * imported: these specs live in the Host compiler aggregate, which must not
 * reach the Client plane. The engine's own copy is
 * `conversationContextKey` in ui-conversation; a drift between them makes
 * the key miss its rendered node, so the assertion fails loudly.
 * @param kind - Definition kind.
 * @param id - Definition-local business identity.
 * @returns the engine-owned Context key.
 */
export declare function conversationContextKey(kind: string, id: string): string;
//# sourceMappingURL=support.d.ts.map