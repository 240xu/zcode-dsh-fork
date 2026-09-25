# @deepseek-ai/dsh-zcode-official

ZCode preset plugin whose model-facing text is **ported from the official
open-source `zai-org/ZCode` v3.14.0 sources** (Apache-2.0) — not reverse-engineered.

Registers the following system-prompt sections (orders between the persona
prefix at 0 and the plan policy at 500):

| order | section | upstream source |
|---|---|---|
| 50 | CLI prefix | `context/sections/cli-prefix.ts` |
| 100 | identity (intro + security notice + `# Harness`) | `context/sections/identity.ts` |
| 110 | dynamic behavior | `context/dynamic-sections.ts` |
| 120 | context management | `context/dynamic-sections.ts` |
| 300 | environment info | `context/sections/env-info.ts` |
| 320 | git system context (repos only) | `context/sections/env-info.ts` |
| 340 | file-based memory | `context/sections/memory.ts` |
| 460 | ZCode tool semantics (official description builders keyed by DSH tool names) | `tool/handlers/*`, `tool/bash-prompt.ts` |
| 490 | current date | `context/sections/current-date.ts` |

Subagent definitions (general-purpose, Explore, common notes, tool allowlists)
come from `subagent/*`; the plan-mode section in the preset patch carries the
official 4-phase plan workflow from `runtime/helpers/runtime-reminders.ts`.

See `NOTICE-PORTED.md` for license/attribution. Upstream anchors are locked by
`tests/sections.spec.ts`.

## Build note

`lib/index.js` is an esbuild bundle over `src/index.ts`
(`--external:@deepseek-ai/*`); regenerate after editing `src/`.
