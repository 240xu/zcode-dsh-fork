/**
 * Page-side interpreter for the structured index injection table. The served
 * form renders the same rows into index.html text; a static worker page has
 * no served HTML, so it executes the table directly. Rows execute strictly in
 * table order, so a global row lands before the scripts that read it.
 */
import type { IndexInjection } from '@deepseek-ai/dsh-host-webserver';
/**
 * Execute every row in table order.
 * @param rows - Injection table from the boot payload.
 * @param loadScript - Executes one script-src row; the tunnel's `loadBundle`,
 * because the row URLs (`/plugins/...`) resolve only through the worker.
 */
export declare function applyIndexInjections(rows: readonly IndexInjection[], loadScript: (src: string) => Promise<void>): Promise<void>;
//# sourceMappingURL=apply-injections.d.ts.map