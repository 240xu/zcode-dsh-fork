import type { EnvInfoText } from './official/env-info.ts';
/** Best-effort snapshot; returns not_repo-shaped info outside repositories. */
export declare function collectEnvInfo(cwd: string): EnvInfoText;
/** Official memory root convention. */
export declare function memoryRootFor(cwd: string): string;
/** Local-ISO date in YYYY-MM-DD form (official formatLocalIsoDate date part). */
export declare function localIsoDate(now?: Date): string;
//# sourceMappingURL=env-live.d.ts.map