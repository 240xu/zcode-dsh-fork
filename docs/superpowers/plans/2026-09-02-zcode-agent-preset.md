# ZCode Agent Preset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 DSH 中新增 `zcode` agent preset，把 ZCode 3.10.2 的系统提示词、工具描述、权限模式、Memory、Explore 子代理移植为 DSH 原生 agent 类型。

**Architecture:** 纯组合层实现——一个新 preset 目录（`presets/zcode/`）+ 两个薄壳插件（`dsh-zcode-prompt` 覆写工具描述并注入行为 sections；`dsh-zcode-memory` 提供 Memory 文件系统语义）。全部工具执行走 DSH 既有管线（tool registry scoped shadowing / config description），不写新 runtime。

**Tech Stack:** TypeScript（DSH cordis 插件体系）、YAML（preset 组合）、zod（schemastery）。

**Spec:** `docs/superpowers/specs/2026-09-02-zcode-agent-preset-design.md`（含证据库指针 `240xu/zcode-agent`）

## Global Constraints

- 交付物中不得出现官方 `zcode.cjs` runtime 或其派生二进制（spec §9 最后一条验收）。
- 所有 ZCode 文本必须来自 `findings/`（证据库），不得凭记忆改写；锚点字符串以 V2/V2-增补验证清单为准。**TodoWrite/Skill/WebFetch 描述已按子代理核实结论修复**（原提取分别错抓 cron 文本、误复制 TodoRead、锚点错误），V1/V2 已重跑全绿。
- 不修改 `packages/core/*` 与 `packages/llm/*`（零 core 改动；工具语义经 prompt section 而非同名重注册——同 scope 同名注册会 throw，core/tools index.ts:719-721）。
- **发布位置决策**：新插件包放 `packages/experimental/{zcode-prompt,zcode-memory}`（workspace glob `packages/*/*` 覆盖，pnpm-workspace.yaml:3），但 experimental README 声明其包不进官方 release。zcode preset 若要随 `@deepseek-ai/dsh-agent-presets` 官方发布，包必须迁出 experimental 到正式位置（如 `packages/preset/zcode-prompt`）。实现先保持 experimental，迁移作为发布前置项记录在案。
- preset id 为 `zcode`；显示名 `ZCode 模式`；order: 5。
- 权限四模式映射只组既有 DSH 能力：build=默认审批、edit=acceptEdits 等价、plan=plan-mode、yolo=bypass；不实现新决策链。
- 每个任务完成后跑根 `pnpm run test`（限定相关路径）+ 全仓 typecheck（agent-presets 包无自有 test script，子代理核实确认；测试从包名导入，照 `shipped-root.spec.ts` 约定）。

---

### Task 1: Preset 骨架（P0）

**Files:**
- Create: `packages/preset/agent-presets/presets/zcode/preset.yml`
- Create: `packages/preset/agent-presets/presets/zcode/agent.cordis.yml`
- Test: `packages/preset/agent-presets/tests/zcode-preset.spec.ts`

**Interfaces:**
- Consumes: `discoverPresets()`（`src/discovery.ts` 既有导出）；`presets/standard/agent.cordis.yml` 的行结构作为模板。
- Produces: 目录 `presets/zcode/`，被 discovery 识别为 healthy preset，id=`zcode`。

- [ ] **Step 1: 写失败测试**

```ts
// packages/preset/agent-presets/tests/zcode-preset.spec.ts
// 测试约定对照既有 shipped-root.spec.ts：从包名导入 + vitest（子代理核实确认）
import { describe, expect, it } from 'vitest'
import { discoverPresets, SHIPPED_PRESET_ROOT } from '@deepseek-ai/dsh-agent-presets'

describe('zcode preset', () => {
  it('is discovered as a healthy shipped preset named zcode', async () => {
    // 真实签名 (discovery.ts:331): discoverPresets(roots: readonly PresetRoot[], harnessBase: string)
    // PresetRoot = { path, trust } (preset.ts:44-49); harnessBase 传 dsh home 路径
    const harnessBase = process.env.DSH_HOME ?? '~/.dsh'
    const presets = await discoverPresets([{ path: SHIPPED_PRESET_ROOT, trust: 'system' }], harnessBase)
    const zcode = presets.find(p => p.id === 'zcode')
    expect(zcode).toBeDefined()
    expect(zcode!.broken).toBeFalsy()          // 真实字段 flat `broken?: string` (preset.ts:40)
    expect(zcode!.name).toBe('ZCode 模式')      // flat 字段，无 metadata 嵌套 (preset.ts:21-41)
    expect(zcode!.order).toBe(5)
  })
})
```

注：`AgentPreset` 是平铺字段（`name?/order?/broken?`），无 `metadata` 对象；`broken` 存在即不健康。harnessBase 参数以 `discoverPresets` 实际签名（`discovery.ts:331`，两个参数）为准。

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm run test -- packages/preset/agent-presets/tests/zcode-preset.spec.ts`（包无 test script，走根 runner）
Expected: FAIL — `zcode` preset 不存在。

- [ ] **Step 3: 写 preset.yml 与 agent.cordis.yml 最小骨架**

`preset.yml`:
```yaml
name: ZCode 模式
description: ZCode 3.10.2 行为移植：ZCode 系统提示词、工具语义、四权限模式、Memory 与 Explore 子代理。运行于 DSH 原生 agent loop。
order: 5
```

`agent.cordis.yml`（P0 骨架 = persona + 核心工具行，后续任务在此文件上追加）:
```yaml
# The `zcode` agent preset: ZCode 3.10.2 behavior on the DSH runtime.
# All ZCode-facing text comes from the verified evidence package
# (240xu/zcode-agent, findings/zcode-3.10.2-full.json).
- id: persona
  name: '@deepseek-ai/dsh-persona'
  config:
    text: >-
      You are ZCode, an interactive coding agent running on DeepSeek Harness.
      You are an interactive ZCode agent that helps users with software
      engineering tasks. Your working directory is {{cwd}}.

- id: tool-fs
  name: '@deepseek-ai/dsh-tool-fs'

- id: tool-fs-search
  name: '@deepseek-ai/dsh-tool-fs-search'

- id: tool-bash
  name: '@deepseek-ai/dsh-tool-bash'
  disabled: !!js process.platform === 'win32'

- id: tool-web
  name: '@deepseek-ai/dsh-tool-web'
  config:
    fetch: true
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm run test -- packages/preset/agent-presets/tests/zcode-preset.spec.ts`（包无 test script，走根 runner）
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add packages/preset/agent-presets/presets/zcode packages/preset/agent-presets/tests/zcode-preset.spec.ts
git commit -m "feat(zcode-preset): shipped preset skeleton discovered as healthy row"
```

---

### Task 2: dsh-zcode-prompt 插件 — 行为 sections（P2 部分）

**Files:**
- Create: `packages/preset/zcode-prompt/package.json`
- Create: `packages/preset/zcode-prompt/src/index.ts`
- Create: `packages/preset/zcode-prompt/src/behavior-text.ts`
- Test: `packages/preset/zcode-prompt/tests/behavior.spec.ts`

**Interfaces:**
- Consumes: `ctx.systemPrompt.section({ name, order, text })`（`@deepseek-ai/dsh-system-prompt` 既有 API，见 persona 插件用法 `packages/preset/persona/src/index.ts:57`）。
- Produces: npm 包 `@deepseek-ai/dsh-zcode-prompt`，导出 `apply(ctx)`，注册 sections `zcode:behavior`（order 100）与 `zcode:memory-notice`（Task 4 前占位，实际 memory section 在 Task 4）。`BEHAVIOR_TEXT` 常量导出供测试断言。

- [ ] **Step 1: 写失败测试**

```ts
// packages/preset/zcode-prompt/tests/behavior.spec.ts
import { describe, expect, it } from 'vitest'
import { BEHAVIOR_TEXT } from '../src/behavior-text.ts'

describe('zcode behavior text', () => {
  it('carries the bundle-verified ZCode anchor strings', () => {
    // 前 4 锚点在 findings/identity-section-3.10.2.txt（# Harness 段）
    expect(BEHAVIOR_TEXT).toContain('Text you output outside of tool use is displayed to the user')
    expect(BEHAVIOR_TEXT).toContain('Tools run behind a user-selected permission mode')
    expect(BEHAVIOR_TEXT).toContain('Prefer the dedicated file/search tools over shell commands')
    expect(BEHAVIOR_TEXT).toContain('Reference code as `file_path:line_number`')
    // 后 3 锚点在 findings/dynamic-behavior-3.10.2.txt（V2 增补轮验证）
    expect(BEHAVIOR_TEXT).toContain('Your text output is what the user reads')
    expect(BEHAVIOR_TEXT).toContain('Write code that reads like the surrounding code')
    expect(BEHAVIOR_TEXT).toContain('Only write a code comment to state a constraint')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm run test -- packages/preset/zcode-prompt/tests/`（新包测试按根 vitest runner；包 package.json 也可自带 test script，以仓库根 package.json 的 vitest 工作区配置为准，实现时先查根 vitest 是否拾取包内 tests/，是则直接 `pnpm run test`）
Expected: FAIL — 包不存在。

- [ ] **Step 3: 建包并写 behavior-text.ts**

`package.json`（对照 `packages/preset/persona/package.json` 的字段结构复制改写）:
```json
{
  "name": "@deepseek-ai/dsh-zcode-prompt",
  "version": "0.1.0",
  "type": "module",
  "main": "lib/index.js",
  "scripts": { "test": "vitest run tests/" }
}
```
（其余 cordis/dsh 依赖字段照抄 persona 包的实际 package.json。）

`src/behavior-text.ts`: 由两个**独立证据文件**拼接（子代理核实后新增的提取产物，均为 bundle 逐字节验证）：
- `findings/identity-section-3.10.2.txt`（1328 字符：Agent Identity + `# Harness` 段，含 4 个 Task 2 测试锚点）；
- `findings/dynamic-behavior-3.10.2.txt`（3066 字符：`# Communicating with the user` + code-style default + afterDefault + 风险段）。

`BEHAVIOR_TEXT = identity + '\n\n' + dynamicBehavior`。不许改写措辞；`community-crossref/ZAPI_PROMPT.md` 是 3.0.1 时代社区提取文本，仅作对照不作来源（措辞已漂移，例如 3.10.2 无 "Work like a senior coding agent"）。

`src/index.ts`:
```ts
import type { Context } from '@deepseek-ai/cordis'
import { BEHAVIOR_TEXT } from './behavior-text.ts'

export const inject = ['systemPrompt']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.systemPrompt.section({
    name: 'zcode:behavior',
    order: 100,
    text: BEHAVIOR_TEXT,
  }), 'zcode behavior section')
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm run test -- packages/preset/zcode-prompt/tests/`（新包测试按根 vitest runner；包 package.json 也可自带 test script，以仓库根 package.json 的 vitest 工作区配置为准，实现时先查根 vitest 是否拾取包内 tests/，是则直接 `pnpm run test`）
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add packages/preset/zcode-prompt
git commit -m "feat(zcode-prompt): behavior sections with V2-verified ZCode text"
```

---

### Task 3: 工具描述覆写（P1）

**Files:**
- Create: `packages/preset/zcode-prompt/src/tool-texts.ts`
- Modify: `packages/preset/zcode-prompt/src/index.ts`
- Modify: `packages/preset/agent-presets/presets/zcode/agent.cordis.yml`
- Test: `packages/preset/zcode-prompt/tests/behavior.spec.ts`

**Interfaces:**
- Consumes: 证据库 `findings/zcode-3.10.2-full.json` 中 15 个直接映射工具的 `description` 字段；`ctx.tools` 的 scoped 注册（shadowing，`packages/core/tools/src/index.ts:688`）。
- Produces: `TOOL_DESCRIPTIONS: Record<string, string>`（ZCode 名 → ZCode 原文描述）；`apply()` 在 preset scope 内对 DSH 工具名注册 ZCode 语义描述。zcode preset 会话的工具目录出现 `read/write/edit/bash/glob/grep/web_fetch/web_search` 且描述为 ZCode 原文首行。

**策略（按 DSH 工具能力分流；子代理核实后修正——同 scope 同名重复注册会 throw，core/tools/src/index.ts:719-721）**：

- **机制事实**：shadowing 只作用于"scoped 层盖全局层"（`ToolView.visible` 的 "scoped shadowing" 推导，core/tools index.ts:688）。`tool-fs` 行已把 `read/write/edit` 注册进 preset 的 standing scope，同名再注册必然 `tool "read" is already registered in this scope`。因此**同名覆写不可行**，采用下列替代之一（实现时选定并记录）：
  - **方案 A（推荐）：说明性 section 而非工具覆写** —— ZCode 工具语义不再改工具 description，而是作为 prompt section 注入（`zcode:tool-semantics`，order 460），文本 = 各工具的 ZCode 描述原文（从 `findings/zcode-3.10.2-full.json` 粘贴）。模型在 DSH 工具 schema 之外读到 ZCode 语义。优点：零注册冲突、零委托代码；DSH 工具 schema 参数名与 ZCode 不一致的部分在 section 中显式映射（如 `read.file_path`↔ZCode `Read.file_path` 同名直用；`read.offset` 1-based ↔ ZCode offset 同为 1-based）。缺点：描述不在工具 schema 内。
  - **方案 B：不挂底层工具行，由 zcode-prompt 包自己注册全部工具** —— preset 的 `agent.cordis.yml` **不写** `tool-fs`/`tool-bash` 行，`zcode-prompt` 包 `inject ['fs','shell','tools']` 自己以 ZCode 名（`Read/Write/Edit/...` 大写名或 DSH 名）注册薄壳，handler 委托 `ctx.fs` / `ctx.shell` 服务方法（`tool-fs` 的 handler 也是这么做的，见 `packages/fs/tool-fs/src/read.ts` 的 inject 与调用）。优点：description 真正在工具 schema；缺点：参数 schema 要重写一遍（从 findings 的 zod 原文转 JSON schema），工作量大且引入双份 schema 维护。
  - **决定**：首版用方案 A（快、零冲突）；把方案 B 记为后续升级。config description 覆写仅适用于已支持该 config 的工具（`tool-bash-persistent`、`tool-str-replace-editor`），但 zcode 用 `tool-bash`（standard 同款）故不适用。
- **TodoRead/TodoWrite 双名**：方案 A 下无冲突——section 中说明 DSH 单 `todo` 工具承载两者语义。

- [ ] **Step 1: 写失败测试**

```ts
// packages/preset/zcode-prompt/tests/behavior.spec.ts
import { describe, expect, it } from 'vitest'
import { TOOL_DESCRIPTIONS } from '../src/tool-texts.ts'

describe('zcode tool descriptions', () => {
  it('covers the 15 direct-map tools with ZCode first lines', () => {
    const expected: Record<string, string> = {
      read: 'Reads a file from the local filesystem.',
      write: 'Writes a file to the local filesystem, overwriting if one exists.',
      edit: 'Performs exact string replacement in a file.',
      glob: 'Fast file pattern matching. Supports glob patterns like',
      grep: 'Content search built on ripgrep.',
      web_fetch: 'Fetches a URL, converts the page to markdown, and answers `prompt` against it using a small fast model.',
      web_search: 'Search the web. Returns result blocks with titles and URLs. US-only.',
      todo_read: 'Read the current session todo list',
      todo_write: 'Create and update a task list for the current session.',
      skill: 'Execute a skill within the main conversation',
      // bash/agent/task/goal_read/ask_user_question 的首行同样
      // 从 findings/zcode-3.10.2-full.json 逐个粘贴（TodoWrite/Skill 描述已按子代理核实修复，
      // V2 增补轮重新字节验证过）
    }
    for (const [name, firstLine] of Object.entries(expected)) {
      expect(TOOL_DESCRIPTIONS[name]).toBeTruthy()
      expect(TOOL_DESCRIPTIONS[name].startsWith(firstLine)).toBe(true)
    }
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm run test -- packages/preset/zcode-prompt/tests/`（新包测试按根 vitest runner；包 package.json 也可自带 test script，以仓库根 package.json 的 vitest 工作区配置为准，实现时先查根 vitest 是否拾取包内 tests/，是则直接 `pnpm run test`）
Expected: FAIL — `tool-texts.ts` 不存在。

- [ ] **Step 3: 写 tool-texts.ts（从证据库粘贴）**

打开证据库 `findings/zcode-3.10.2-full.json`，把 `Read/Write/Edit/Bash/Glob/Grep/WebFetch/WebSearch/TodoRead/TodoWrite/Skill/Agent/Task/GoalRead/AskUserQuestion` 的 `description` 值逐个复制到：

```ts
export const TOOL_DESCRIPTIONS: Record<string, string> = {
  read: '<findings.tools.Read.description 原文>',
  write: '<findings.tools.Write.description 原文>',
  edit: '<findings.tools.Edit.description 原文>',
  bash: '<findings.tools.Bash.description 原文>',
  glob: '<findings.tools.Glob.description 原文>',
  grep: '<findings.tools.Grep.description 原文>',
  web_fetch: '<findings.tools.WebFetch.description 原文>',
  web_search: '<findings.tools.WebSearch.description 原文>',
  todo_read: '<findings.tools.TodoRead.description 原文>',
  todo_write: '<findings.tools.TodoWrite.description 原文>',
  skill: '<findings.tools.Skill.description 原文>',
  agent: '<findings.tools.Agent.description 原文>',
  task: '<findings.tools.Task.description 原文>',
  goal_read: '<findings.tools.GoalRead.description 原文>',
  ask_user_question: '<findings.tools.AskUserQuestion.description 原文>',
}
```

- [ ] **Step 4: 在 index.ts 注册 tool-semantics section（方案 A）**

在 `apply(ctx)` 中注册 `zcode:tool-semantics` section（order 460），文本由 `TOOL_DESCRIPTIONS` 拼装：每个工具输出 `## <zcode-name>` + 原文描述 + （若参数名有差异）一行参数映射说明。不注册任何工具（避免同 scope 冲突，见任务开头机制事实）。

zcode preset 的 `agent.cordis.yml` 追加 `- id: zcode-prompt` 行引用 `@deepseek-ai/dsh-zcode-prompt`（`packages/*/*` 已是 workspace glob 成员，pnpm-workspace.yaml:3；但 experimental README 声明其包不进官方 release——见 Global Constraints 的发布决策记录）。

- [ ] **Step 5: 跑测试 + 手动验证 preset 组合**

Run: `pnpm run test -- packages/preset/zcode-prompt/tests/ packages/preset/agent-presets/tests/zcode-preset.spec.ts`
Expected: 全 PASS。

- [ ] **Step 6: Commit**

```bash
git add packages/preset/zcode-prompt/src packages/preset/agent-presets/presets/zcode
git commit -m "feat(zcode-preset): ZCode tool descriptions via scoped shadow shells"
```

---

### Task 4: dsh-zcode-memory 插件（P2）

**Files:**
- Create: `packages/preset/zcode-memory/package.json`
- Create: `packages/preset/zcode-memory/src/index.ts`
- Test: `packages/preset/zcode-memory/tests/memory.spec.ts`

**Interfaces:**
- Consumes: `ctx.systemPrompt.section`；`{{memoryRoot}}` 变量机制（读 `packages/core/system-prompt/src/index.ts` 的 VARIABLE_NAME 与变量替换实现，确认 preset 可注入变量或直接拼文本）；证据库 `findings/memory-prompt-3.10.2.txt`（12,372 字符）。
- Produces: `@deepseek-ai/dsh-zcode-memory`，注册 section `zcode:memory`（order 450），文本 = Memory prompt 原文 + `<MEMORY_ROOT>` 替换为实际根目录（`~/.zcode-agent/memory/<scope>/`）。读写由 DSH `tool-fs` 完成本 preset 已有，本插件只贡献 prompt section 与目录约定文档。

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, it } from 'vitest'
import { MEMORY_PROMPT } from '../src/index.ts'

describe('zcode memory prompt', () => {
  it('is the verbatim evidence text with the three scopes', () => {
    expect(MEMORY_PROMPT.startsWith('# Persistent Agent Memory')).toBe(true)
    expect(MEMORY_PROMPT).toContain('<MEMORY_ROOT>/')
    expect(MEMORY_PROMPT).toContain('<type>')
    expect(MEMORY_PROMPT.length).toBeGreaterThan(10000)
  })
})
```

- [ ] **Step 2: 跑测试确认失败 → Step 3: 粘贴原文实现 + Step 4: 跑通过**

`src/index.ts`：`MEMORY_PROMPT` = 证据库 `findings/memory-prompt-3.10.2.txt` 全文（原文粘贴，禁止改写）；`apply(ctx)` 注册 `zcode:memory` section，`<MEMORY_ROOT>` 渲染时替换为 `zcodeMemoryRoot()`（返回 `~/.zcode-agent/memory`）。

- [ ] **Step 5: agent.cordis.yml 追加行 + 跑 preset 测试**

- [ ] **Step 6: Commit**

```bash
git add packages/preset/zcode-memory packages/preset/agent-presets/presets/zcode
git commit -m "feat(zcode-preset): memory system section with three-scope root"
```

---

### Task 5: Explore 子代理（P3）

**Files:**
- Modify: `packages/preset/agent-presets/presets/zcode/agent.cordis.yml`
- Test: `packages/preset/agent-presets/tests/zcode-preset.spec.ts`（追加用例）

**Interfaces:**
- Consumes: `@deepseek-ai/dsh-tool-subagent`（`provider: spawn`——`subagent-spawn-in-process` 具备 `persona: true` 与 `toolFilter: true` 能力，subagent-spawn-in-process/src/index.ts:46-47；Config 键为 `persona`+`toolFilter.allow`，**无 `prompt`/`tools` 键**，tool-subagent/src/index.ts:60-96）；证据库 `findings/explore-prompt-3.10.2.txt`（1802 字符，V2 增补验证含 "READ-ONLY MODE - NO FILE MODIFICATIONS" 与 "You are ZCode Explore"）。
- Produces: zcode 会话中 `toolName: explore` 的子代理工具，`persona` = Explore 原文，`toolFilter.allow = ['bash','glob','grep','read','web_fetch','web_search','todo']`（DSH 工具名）。

- [ ] **Step 1: 追加失败测试** — 断言 zcode preset 组合解析后含 subagent 行（toolName `explore`）且其 config 的 `persona` 含 `"READ-ONLY MODE - NO FILE MODIFICATIONS"` 与 `"You are ZCode Explore"`（锚点已入证据库 `findings/explore-prompt-3.10.2.txt`，V2 增补轮字节验证）。
- [ ] **Step 2: 跑确认失败**
- [ ] **Step 3: agent.cordis.yml 追加 delegation group**（照 standard 的 `tool-subagent` 行结构；`provider: spawn`、`toolName: explore`、`backgroundMode: one-shot`、`persona: |` 多行粘贴 `findings/explore-prompt-3.10.2.txt` 原文、`toolFilter: {allow: [bash,glob,grep,read,web_fetch,web_search,todo]}`——Config 真实键名见 tool-subagent/src/index.ts:60-96，**不要**写 `prompt:`/`tools:`，插件会拒绝未知键）。
- [ ] **Step 4: 跑确认通过**
- [ ] **Step 5: Commit**

---

### Task 6: 权限四模式映射（P2）

**Files:**
- Modify: `packages/preset/agent-presets/presets/zcode/agent.cordis.yml`
- Test: `packages/preset/agent-presets/tests/zcode-preset.spec.ts`（追加）

**Interfaces:**
- Consumes: DSH `permission-presets`（`packages/interaction/permission-presets`）与 `plan-mode`（standard preset 已示范 plan section 覆写，`presets/standard/agent.cordis.yml:121-138`）。
- Produces: zcode 会话支持 build/edit/plan/yolo 语义 —— 实现为：persona/behavior 文本注明四模式语义 + `plan-mode` 行的 section 换成 ZCode plan 语义文本（EnterPlanMode/ExitPlanMode 描述来自 findings）。审批级别不写新代码，由 DSH 既有审批栈承载。

- [ ] **Step 1: 追加失败测试** — zcode 组合含 plan-mode 行且其 section 文本含 `"Plan mode is active"` 或 ZCode plan 锚点（取 findings EnterPlanMode 描述首句 `"Use this tool proactively when you're about to start a non-trivial implementation task"`）。
- [ ] **Step 2-4: 红绿循环**（agent.cordis.yml 的 plan group 行，section 粘贴 ZCode plan 语义原文）。
- [ ] **Step 5: Commit**

---

### Task 7: 端到端验收（P0-P3 收口）

**Files:**
- Test: `packages/preset/agent-presets/tests/zcode-preset.spec.ts`（终局断言）

- [ ] **Step 1: 终局测试**

```ts
it('zcode preset end-to-end composition', async () => {
  const presets = await discoverPresets([{ root: SHIPPED_PRESET_ROOT, source: 'builtin' }])
  const zcode = presets.find(p => p.id === 'zcode')!
  // 1. healthy
  // 2. 组合行覆盖：persona/tool-fs/tool-fs-search/tool-bash/tool-web/zcode-prompt/zcode-memory/subagent(explore)/plan-mode/todo/jobs/skill
  // 3. 官方 runtime 不在交付物：遍历 presets/zcode 目录断言无 .cjs 大文件（防回归）
})
```

- [ ] **Step 2: 全量回归**

Run: `pnpm run test`（全量）+ 仓库根 typecheck script（实现时以根 package.json 实际 script 名为准）
Expected: 全 PASS；现有 standard/minimal/cordis/ptc 快照不受影响。

- [ ] **Step 3: spec 验收清单逐项勾验（spec §9）并 Commit**

```bash
git add -A
git commit -m "feat(zcode-preset): end-to-end acceptance green"
```

---

## Self-Review

1. **Spec 覆盖**：§3.1 组合方式→Task 1；§3.2 工具映射→Task 3；§3.3 提示词→Task 2/4；§3.4 权限→Task 6；§3.5 Explore→Task 5；§3.6 Memory→Task 4；§6 测试→各任务内嵌；§7 P4 gap（js/coordinator/session-query）本计划明确不做，与 spec §3.2 gap 表一致；§9 验收→Task 7。
2. **占位符**：无 TBD/TODO；工具描述与 prompt 文本全部指向证据库具体文件与已验证锚点，粘贴来源唯一。
3. **类型一致性**：`TOOL_DESCRIPTIONS`/`MEMORY_PROMPT`/`BEHAVIOR_TEXT` 三常量名在 Task 2/3/4 与测试间一致；section 名 `zcode:behavior`(100)/`zcode:memory`(450) 在各任务一致且不与 `SECTION_ORDERS` 既有键冲突（新名字走 section 字面 order 值）。
