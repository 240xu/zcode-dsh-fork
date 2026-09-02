/**
 * Web shell library entry. The shell's product is {@link AppWebEntry} —
 * apps/web's Vite entry runs it against #root. The boot page and fiber-state
 * projection remain internal; the static module table and its platform words
 * form the package's build-time contract.
 * @module @deepseek-ai/dsh-client-web
 */
export { AppWebEntry } from "./boot.js";
export { getStaticModules } from "./seed.js";
export { PLATFORM_MODULES, PRELOADED_CLIENT_EXTERNALS } from "./platform.js";
//# sourceMappingURL=index.js.map