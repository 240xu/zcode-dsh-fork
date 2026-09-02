function assertNever(row) {
    throw new Error(`webworker-runtime: unknown index injection row ${JSON.stringify(row)}`);
}
/**
 * Execute every row in table order.
 * @param rows - Injection table from the boot payload.
 * @param loadScript - Executes one script-src row; the tunnel's `loadBundle`,
 * because the row URLs (`/plugins/...`) resolve only through the worker.
 */
export async function applyIndexInjections(rows, loadScript) {
    for (const row of rows) {
        switch (row.kind) {
            case 'global':
                globalThis[row.name] = row.value;
                break;
            case 'script': {
                const el = document.createElement('script');
                el.textContent = row.text;
                (row.placement === 'head' ? document.head : document.body).append(el);
                break;
            }
            case 'script-src':
                await loadScript(row.src);
                break;
            case 'script-preload':
                // The worker tunnel has no browser URL to warm without also executing
                // the script; loadScript handles the real request when the row arrives.
                break;
            case 'style': {
                const el = document.createElement('style');
                el.textContent = row.text;
                document.head.append(el);
                break;
            }
            case 'html':
                (row.placement === 'head' ? document.head : document.body).insertAdjacentHTML('beforeend', row.html);
                break;
            default:
                assertNever(row);
        }
    }
}
//# sourceMappingURL=apply-injections.js.map