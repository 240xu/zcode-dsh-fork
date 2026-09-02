# ZCode Agent Preset for DSH — 设计规格

**日期**: 2026-09-02
**状态**: 已验证证据（三轮验证 PASS），待实现
**证据库**: `240xu/zcode-3102-evidence`（private GitHub repo）
**证据基线**: ZCode Desktop 3.10.2 官方 runtime（zcode.cjs 12,574,097 bytes，静态提取，V1/V2/V3 三轮验证通过）

---

## 1. 目标与非目标

### 目标
在 DSH 中新增一种名为 `zcode` 的**原生 agent preset**，把 ZCode 3.10.2 的 agent 行为——系统提示词、工具语义、权限模式、Memory 系统、子代理派发——移植为 DH 插件体系内的一种可选 agent 类型。

- 运行时是 DSH 的（agent loop、tool registry、permission、session log、TUI）。
- Agent 人格、提示词、工具描述、权限语义来自 ZCode 3.10.2 官方 runtime 的静态提取证据。
- 用户可在 `dsh` 中选择 `zcode` preset，与 `standard`/`minimal`/`cordis`/`ptc` 并列。

### 非目标
- **不是**把官方 zcode.cjs runtime 嵌入 DSH（不打包、不执行、不分发官方 runtime）。
- **不实现** ZCode 私有协议（OAuth/JWT、ACP 私有 wire、订阅计费）。
- **不声称**与官方 ZCode 行为逐位一致；目标是高保真语义移植。
- 首版不接入 ZCode 模型路由（任何 DSH LLM adapter 均可驱动，含 Zen 免费模型调试）。

---

## 2. 证据基础（全部三轮验证 PASS）

| 证据 | 内容 | 验证 |
|---|---|---|
| `findings/zcode-3.10.2-full.json` | 30 工具全量定义（描述/Schema/权限/风险） | V1 100% + V2 字节级 |
| `findings/memory-prompt-3.10.2.txt` | Memory 系统 prompt（12,372 字符，user/project/local 三 scope） | V2 字节级 |
| `findings/sections-3.10.2.json` + EVIDENCE | 15 个 prompt section（name/source/injectionTarget/cacheHint） | V2 字节级 |
| `findings/schemas-region.js.txt` | 工具 zod schema 原文区（47KB） | V2 字节级 |
| 权限模型 | 4 用户模式（build/edit/plan/yolo）+ auto；风险三分类（readOnly/write/destructive） | V2 结构事实 |

关键修正（相对社区 3.0.1 重建资料）：
1. 工具是 **30 个**，不是 22 或 14。
2. 权限模式是 **4+1**，不是 10 模式 11 级决策链。
3. `TaskOutput` 官方已标 DEPRECATED。
4. `ApplyPatch` 是 provider server-tool 映射 + Write/Edit 派发（`k9o: ApplyPatch->[Write,Edit]`）。
5. Task 是 Agent 的 Claude-Code 兼容别名；`web_search` 是 WebSearch 别名；`mcp__node_repl__js*` 是 js 系列的 MCP 命名空间双注册。

---

## 3. 架构

### 3.1 放置方式：DSH agent preset（`presets/zcode/`）

完全遵循 DSH 现有 preset 机制（`packages/preset/agent-presets/presets/`）：

```
packages/preset/agent-presets/presets/zcode/
├── preset.yml          # name: ZCode 模式 / description / order: 5
└── agent.cordis.yml    # 组合行（复用 DSH 全部现有工具插件）
```

**核心原则：最大化复用 DSH 现有插件，不写新 runtime 代码。** ZCode 语义通过以下手段注入：

| ZCode 语义 | DSH 实现载体 |
|---|---|
| 系统提示词（identity/行为/风格） | `@deepseek-ai/dsh-persona` 的 `text` + 自定义 prompt section 插件 |
| 工具描述（Read/Write/Edit/Bash/Glob/Grep/Web/…） | DSH 现有工具插件的描述映射/覆写 section |
| 权限模式（build/edit/plan/yolo） | DSH `permission-presets` / plan-mode 映射 |
| Memory 系统（12K prompt + 3 scope） | 新小插件 `zcode-memory`（写 `~/.zcode-agent/memory/`） |
| Explore 子代理（只读约束 prompt） | `dsh-tool-subagent` provider 配置 + 自定义 prompt |
| Todo / Goal / Skill | DSH 现有 `tool-todo`/`tool-goal`/`tool-skill` |

### 3.2 工具映射表（30 → DSH）

**直接映射（复用 DSH 现有工具，改描述文本）— 15 个 + 1 别名：**

| ZCode 工具 | DSH 行 | 描述处理 |
|---|---|---|
| Read | `tool-fs`（read 模式） | ZCode 原文 |
| Write | `tool-fs` | ZCode 原文 |
| Edit | `tool-fs` | ZCode 原文 |
| Bash | `tool-bash` | ZCode 原文（含 Git 准则段） |
| Glob | `tool-fs-search` | ZCode 原文 |
| Grep | `tool-fs-search` | ZCode 原文 |
| WebFetch | `tool-web`（fetch: true） | ZCode 原文 |
| WebSearch | `tool-web` | ZCode 原文 |
| TodoRead/TodoWrite | `tool-todo` | ZCode 原文（双工具合一由 DSH 决定） |
| Skill | `tool-skill` | ZCode 原文 |
| Agent/Task | `tool-subagent`（spawn，双注册同 DSH fork 模式） | ZCode 原文（Task 标 alias） |
| GoalRead | `tool-goal` | ZCode 语义（目标权威性、完成判定） |
| AskUserQuestion | `tool-ask-user` | ZCode 原文 |

**映射到 DSH 等价物（语义转换）— 7 个：**

| ZCode 工具 | DSH 等价物 | 转换说明 |
|---|---|---|
| EnterPlanMode | `plan-mode` 插件（enter 路径） | DSH plan section 换 ZCode plan 语义 |
| ExitPlanMode | `plan-mode`（exit 路径） | plan+allowedPrompts 字段映射 |
| SendMessage | `tool-subagent`（continuable background） | agentId 续话 = DSH 可继续子代理 |
| TaskOutput/TaskStop | `tool-jobs`（collect/stop） | 描述标注官方 DEPRECATED 语义改用输出文件 |
| ApplyPatch | `tool-fs`（Write/Edit 派发，同官方 k9o 映射） | 保持官方派发行为 |

**首版暂缺（DSH 无直接对应，标记 gap）— 5 个（js 三件套与其 MCP 别名合并计 3+3=6 名）：**

| ZCode 工具 | 状态 | 计划 |
|---|---|---|
| ReadSessionContext | 首版省略 | DSH 有 session-query seam（SECTION_ORDERS 有 TOOL_SESSION_QUERY: 2300）；P2 核实覆盖面后接入 |
| RespondToCoordinator | 首版省略 | DSH 无 coordinator 概念；P4 评估 |
| js/js_reset/js_add_node_module_dir | 首版省略 | 需新写 node REPL 插件；P4 |
| （mcp__node_repl__* 三件套） | 同上（别名） | 同上 |

覆盖统计：15 直接 + 1 别名（Task→Agent）+ 7 语义转换 = **23/30 工具语义覆盖**，其余 6 名（js 系双注册）与 ReadSessionContext/RespondToCoordinator 记为 P4 gap。

### 3.3 系统提示词组装

ZCode 15 个 section 中，行为约束类文本（12 段、约 14K 字符，V2 全部字节验证）打包为一个新插件 `dsh-zcode-prompt`（或直接放 persona + section），按 DSH `SECTION_ORDERS` 挂载：

| ZCode section | DSH section 挂载点 | order |
|---|---|---|
| CLI Prefix + Agent Identity + Harness | `DEPLOYMENT_PERSONA`（persona 覆写） | 0 |
| Dynamic Behavior / Context Management / Communication | 新 section `zcode:behavior` | 100–400（HARNESS_IDENTITY 之后 persona 附近） |
| Task Behavior | 合并入 `zcode:behavior` | 同上 |
| Environment Info / System Context / Current Date | DSH `runtime-context`（`includeRuntimeContext: true` 默认） | 已有 |
| Memory（12K prompt） | 新 section `zcode:memory` | 450（PLAN_POLICY 之前） |
| Skills | DSH `tool-skill` 自有呈现 | 已有 |
| Explore subagent prompt | `tool-subagent` provider prompt 注入 | 已有机制 |

persona text 模板（`{{model}}`/`{{cwd}}` 用 DSH 变量）：

```
You are ZCode, an interactive coding agent running on DeepSeek Harness.
You are an interactive ZCode agent that helps users with software engineering tasks.
…（ZCode 原文 Dynamic Behavior/Harness 约束，来自 findings，逐字）…
```

### 3.4 权限模式映射

| ZCode 模式 | DSH 映射 | 说明 |
|---|---|---|
| `build`（Ask before changes，默认） | DSH 标准审批策略（写操作需确认） | ZCode 新默认 |
| `edit`（Edit automatically） | DSH acceptEdits 等价预设 | |
| `plan` | DSH `plan-mode`（ZCode plan 语义 section） | |
| `yolo`（Full access） | DSH bypass 审批预设 | |

风险三分类沿用 DSH guard（readOnly/write/destructive 与 DSH 风险模型一致，无需新代码）。

### 3.5 Explore 子代理

`tool-subagent`（provider: spawn）注册名为 `Explore` 的子代理，prompt 用 findings 中的完整只读约束文本（CRITICAL: READ-ONLY MODE 段 + 工具集 + 并行建议），工具集限定 `Bash,Glob,Grep,Read,WebFetch,WebSearch,TodoWrite`。

### 3.6 Memory 系统（新插件 `dsh-zcode-memory`）

- 范围：`user`（`~/.zcode-agent/memory/user/`）/ `project`（`<cwd>/.zcode/memory/`）/ `local`（`<cwd>/.zcode/local/`），遵循 findings 的 scope 指引文本。
- prompt section 用 findings/memory-prompt-3.10.2.txt 原文（`<MEMORY_ROOT>` 变量替换）。
- 读写走 DSH `tool-fs`（复用文件系统插件，无新沙箱代码）。

---

## 4. 数据流

```
dsh session (--preset zcode)
  → agent-presets 挂载 presets/zcode/agent.cordis.yml（standing scope）
  → persona + zcode:behavior + zcode:memory sections 注册
  → DSH 工具按映射表注册（16 直接 + 8 语义转换）
  → 模型请求（任意 DSH LLM adapter，含 Zen 免费模型）
  → turn/step loop（DSH 原生）
  → 工具执行（DSH 原生管线 + guard/approval）
  → session log 持久化（DSH 原生）
```

无新 agent loop、无新工具执行框架、无新 session 机制。全部走 DSH 既有管线。

---

## 5. 错误处理

| 场景 | 处理 |
|---|---|
| preset 组合引用不存在的包 | DSH discovery 健康检查会报 broken row（现有机制） |
| Zen 免费模型地区不可用 | 换任意已配置 provider；preset 不绑模型 |
| Memory 目录不可写 | 降级为无 memory section；工具报错走 DSH fs 错误路径 |
| 子代理 provider 缺失 | `tool-subagent` disabled 行为（DSH 现有） |

---

## 6. 测试策略

1. **Preset 挂载测试**：`presets/zcode` 被 discovery 识别为 healthy row；session 用它启动后工具清单 = 映射表预期集合。
2. **Prompt 快照测试**：persona + behavior + memory sections 的组装输出含 ZCode 原文关键句（用 V2 验证过的锚点字符串做断言，如 "You are ZCode, an interactive coding agent"）。
3. **权限测试**：build 模式写操作触发审批；yolo 不触发；plan 模式禁写。
4. **Explore 子代理测试**：spawn 的 Explore 拿到只读工具集。
5. **会话测试**：prompt→tool-call→result→session log 循环（mock LLM）。
6. **回归**：现有四个 preset 的快照测试不受影响。

---

## 7. 分阶段交付

| 阶段 | 内容 | 验收 |
|---|---|---|
| P0 | `presets/zcode` 骨架（preset.yml + agent.cordis.yml + persona） | dsh 可见 zcode preset；挂载成功 |
| P1 | 16 个直接映射工具 + ZCode 描述文本 | 工具清单 + 描述断言测试过 |
| P2 | behavior/memory sections + 权限四模式映射 | prompt 快照 + 权限测试过 |
| P3 | Explore 子代理 + SendMessage 语义（continuable） | 子代理测试过 |
| P4 | 暂缺工具 gap 评估（node REPL / coordinator / session-query） | 决策记录 |

---

## 8. 风险与开放问题

1. **描述文本归属**：ZCode 工具描述文本是官方 runtime 提取的字符串。私库内部使用无问题；若未来开源 preset 文本，需法务确认（preset 本身不分发官方 runtime，只含描述文本——与社区 ZAPI_PROMPT.md 同类）。
2. **DSH 工具描述覆写点（已核实）**：`dsh-tools` 支持 **scoped shadowing**（`ToolView.visible` 经 "restrictions, scoped shadowing, and transport insertion" 派生；per-agent 注册经 `agent.ctx` 合法覆盖同名全局工具，见 `packages/core/tools/src/index.ts:720` 的错误信息说明）。因此 zcode preset 在 preset scope 内以 ZCode 名/描述重注册（或 `toolRestriction` + 自有层工具）即可呈现 ZCode 描述，无需改 DSH core。
3. **TodoRead/TodoWrite 双工具**：DSH 是单 todo 工具。P1 决定合一（单工具描述合并）还是双注册（scoped 注册两个薄壳指向同一 executor）——推荐双注册，与 ZCode 模型侧契约一致。
4. **模型无关性**：ZCode 原文假设 GLM 系模型；行为文本对不同模型的兼容性靠 P2 调试（用任意可用免费 provider + 本地 provider）。

---

## 9. 验收标准（整体）

- [ ] `dsh` preset 选择器出现 `ZCode 模式`，可正常启动 session。
- [ ] 23 个映射工具（15 直接 + 1 别名 + 7 语义转换）在 zcode agent 会话中可用，描述为 ZCode 原文或注明语义转换。
- [ ] 系统提示词快照含全部 V2 验证锚点字符串。
- [ ] 四权限模式行为符合第 3.4 节表。
- [ ] Explore 子代理只读约束生效。
- [ ] Memory 三 scope 读写正常。
- [ ] 现有 preset 回归全绿。
- [ ] 官方 zcode.cjs runtime 不进入任何交付物（复核：交付物中无 vendor/zcode.cjs、无其派生二进制）。
