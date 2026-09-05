# ZCode Agent Preset for DSH — 设计规格

**日期**: 2026-09-02
**状态**: 已验证证据（三轮验证 PASS），待实现
**证据库**: `240xu/zcode-agent`（private GitHub repo）
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
| Bash | `dsh-zcode-bash`（preset 域，见 §12 D1） | ZCode 原文（含 Git 准则段） |
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

---

## 10. 等价性决议（严格等效：不降级、不偏移）

对抗审查（2026-09-04，三镜头 R1+R2，报告见工作区外
`adversarial-review-zcode-preset.md`）提出的问题中，凡修法本身会偏离上游
行为的，一律**保持上游行为、锁定并记录**，不做“比上游更正确”的修改。
只有上游本就有而移植缺失的，才补实现。

### 10.1 保持上游行为（有意不修，测试锁定）

| # | 现象 | 上游事实 | 决议 |
|---|---|---|---|
| B1 | Explore persona 称只读却授 Bash | 上游 `i8` 列表即授 Explore Bash（`buildExploreAgentPrompt` @10351692，`i8=["Bash","Glob",...]`）；persona 原文同样 READ-ONLY。张力上游本有 | 保留 Bash；persona 逐字上游。测试锁定 filter 内容 |
| B3 | MEMORY.md 索引逐字进 system prompt，无不可信分隔 | 上游 `K9r` 即原文拼接（@10831308），无 delimiter。加分隔符会改变模型所见文本 = 偏移 | 保留逐字；不加护栏。`verify-before-recommend` 原文即上游的缓解 |
| A1 | `replaceAll('<MEMORY_ROOT>', root)` 解释 `$` 模式 | 上游 `Isi.replace("<MEMORY_ROOT>/", t)` 同为字符串替换，同行为 | 保留；文档注明 |
| A2 | 25KB 上限按 `.length`（UTF-16 码元）而非字节计量 | 上游 `Wut` 即 `t.length`/`mre=25e3`（@7728397），名 bytes 实 chars | 保留；常量名沿用上游（`MEMORY_INDEX_MAX_BYTES` 即 `mre`） |
| A5/C5 | 读失败全吞为“空索引”（含 EACCES/ENOTDIR） | 上游 `X9r` 的 `try{...}catch{}` 同样全吞（@10846081） | 保留；单测锁定 ENOTDIR 路径 |
| B2 | Explore 的 `todo_write`（已挡回） | 子 session 隔离，写不到父计划；上游 i8 本就授 TodoWrite | 保留（隔离 scratchpad）；注释正名理由 |

### 10.2 已补的缺失（上游有、移植缺）

- `{AGENT_PROFILES}`：上游 `ROr` 渲染实时 profiles 列表（@10360192，
  `- <name>: <desc> (Tools: ...)` 形）。移植渲染本 preset 实际 roster
  （Explore 一行），与组合子代理行由 preset 单测锁定同步。
- `todo_read`：上游 TodoRead/TodoWrite 双工具；DSH 只有 `todo_write`。
  新增 preset 内只读视图（同 `todos` 投影，零新状态）。
- `session-query` 挂载：上游 ReadSessionContext 等价（P2 缺口关闭）。
- `zcode:context` section：上游 `WSr` 自主准则此前未移植。
- Scope 指引/目录约定/索引组装：按 `Tsi/Asi/K9r/B1e` 实现（此前三处提取
  artifact 已修正，memory 全文与 `Isi` 字节一致）。

### 10.3 已知非等效（诚实记录）

- DSH 权限是 host 级（`DSH_PERMISSION_MODE`），ZCode 四模式无逐项对应：
  build≈workspace-write、yolo≈danger-full-access、plan=行、edit 无等价、
  auto=DSH 自身机制。见组合注释。
- DSH `MEMORY_PROMPT` 导出是 import 期快照（测试/检视用），生产路径是
  `apply()` 闭包实时渲染；`ZCODE_MEMORY_SCOPE` 非法值 fallback+警告（上游
  以 profile 诊断拒绝，本 preset 无该管线，崩溃不如降级）。

---

## 11. 引擎等价矩阵（DSH 原生引擎 vs ZCode 行为）

目标：引擎 DSH 原生，但功能至少等价、不降级不删减。逐项 `ZCode 声称 → DSH 实际 → 处置`。
`EQUIVALENT` 均有文件行级依据；`GAP` 需决策（见 §12）。

### 11.1 EQUIVALENT（已核验）

| 工具/机制 | ZCode | DSH | 依据 |
|---|---|---|---|
| edit 精确/唯一/replace_all + 先读强制 | 描述声称 | executor 强制（fs-observation-policy + replace_all 参数） | tool-fs/src/edit.ts:22,34,54,79 |
| read offset/limit/图片/行号窗口 | 描述声称 | offset/limit/schema、read-image.ts、行号渲染 | tool-fs/src/read.ts:26-59, read-image.ts, read-render.ts |
| glob 语法 + mtime 排序 | 描述声称 | `--sort=modified`，rg 后端 | tool-fs-search/src/glob.ts:82-93 |
| todo 整单替换/三状态/priority | 描述声称 | 同投影整单替换；默认 AT MOST ONE in_progress（与 ZCode 指引一致） | tool-todo/src/index.ts:58,210 |
| bash 超时默认/上限 | 120000/600000 | 本地后端默认 120_000、上限 600_000 | shell/bash-local/src/index.ts:107-108 |
| bash 后台（plain） | run_in_background | job id + job_output/job_kill | tool-bash/src/index.ts:71,256 |
| subagent 后台 + SendMessage 继续 | run_in_background + SendMessage | continuable + send_message/interrupt_agent（control 行已挂载）+ list-agents | tool-subagent:315,338；control:29,66 |
| Explore one-shot / Agent continuable | 用途区分 | composition 两行分别配置 | agent.cordis.yml:163,170 |
| goal 完成证据规则 | prompt 层（goal_read 描述） | prompt 层（model-driven complete） | tool-goal/src/index.ts:118 |
| plan exit 机制 | ExitPlanMode 提审 | exit_plan_mode + /plan 命令 + isolate | plan-mode/src/index.ts:4,60,137 |
| compaction | microcompact | compaction service（auto policy） | compaction/compaction/src/index.ts:88-109 |
| memory Write+Edit 落盘 | Csi 保证 | fs read/write/edit 工具存在 | composition tool-fs 行 |
| edit/tool 重名 | k9o 派发 | 同 scope 重注册抛错 → prompt 映射（已选方案 A） | 审计 Task 2 结论 |

### 11.2 GAP（待 §12 决策，均经行级核验）

| # | 缺口 | 详情 |
|---|---|---|
| G1 | bash 三选一无全等价 | ~~plain/persistent 二选一~~ → 已解决：preset 域自研 `dsh-zcode-bash`（见 §12 D1），plain/persistent 行不再挂载 |
| G2 | web_fetch 小模型问答 | ZCode 用小模型就 prompt 作答；DSH 返回 markdown 全文。preset 层无法实现 |
| G3 | web_fetch 跨域重定向 | ZCode 回调模型；DSH 跟随允许的重定向（fetch.ts:372）。策略级差异 |
| G4 | web_search US-only | ZCode 声明 US-only；DSH provider 相关，无此声明 |
| G5 | grep 缺 output_mode/multiline/type 参数 | schema 仅 pattern/path/include（grep.ts:89-94）。preset 层无法加参 |
| G6 | read 缺视频 | 仅图片（read-image.ts），无 MP4/MOV/WEBM。preset 层无法加 |
| G7 | ask-user 缺 previews | 有 multiSelect（index.ts:50,87），无 preview 字段。preset 层无法加 |
| G8 | 模型无工具进入 plan mode | 只有 exit_plan_mode + 用户 /plan 命令；ZCode 模型可调 EnterPlanMode。且 tool-semantics 注说“enter plan mode”而模型无入口 |
| G9 | 逐 call 四档权限 | host 级两档是 DSH core 现状（§10.3 已记） |
| G10 | node_repl 三件套 | ZCode 内建 MCP；DSH 有 MCP 客户端但无 JS-eval 执行器（bash+node 可部分代偿） |
| G11 | RespondToCoordinator | DSH 无 coordinator 概念（P4 已知） |
| G12 | skill `plugin:skill` 命名式 | 未在 DSH skill 侧找到对应支持（UNVERIFIED；preset 无命名空间 skill，暂不阻塞） |
| G13 | read 目录/缺失/空的精确文本 | 双方皆报错/提醒，精确文本未逐字比对（功能等价，文本未验证） |

## 12. 差距决策记录（GAP → 决议）

### D1（G1：bash 全等价）— 2026-09-05：preset 域自研 `dsh-zcode-bash`，不再二选一

- 结论：plain（无 cwd 持久）与 persistent（丢 background、env 反持久、需 PTY）都不符合 ZCode 契约；preset 域新增 `@deepseek-ai/dsh-zcode-bash`（`packages/experimental/zcode-bash`），注册名仍为 `bash`（近 scope 遮蔽远 scope，`core/tools/src/index.ts:1167` 允许），composition `tool-bash` 行改挂本包。
- 契约（`packages/experimental/zcode-bash/src/index.ts`）：命令经一次性 `__ZCODE_CWD_<rand>__:<pwd>:__END__` 尾标跟踪 session cwd（WeakMap per live session，渲染/透出前剥离，异 token 尾标忽略）；`timeout` 经 `clampTimeout` 按 120000/600000 钳制（非法值抛错）；`run_in_background` 走 `ctx.jobs` + `ctx.shell` 同 plain（`String(JobId)` 回填 `backgroundTaskId`，`processOutcome`/`renderProcessRead` 复用 `dsh-tool-bash`）；`dangerouslyDisableSandbox: true` 大声拒绝（sandbox 系 host 控制，工具不得自提权）。
- 有意差异（§10 登记）：shell 系部署 executor 的 `bash -c` 而非登录 shell（profile 定制环境行为不同）；无 PTY（与 plain 一致，后台输出轮询经 job_output）。
- 验证：`tests/registration.spec.ts` + `tests/markers.spec.ts` 本地 5/5；`tests/bash.spec.ts` 10/10 已在 node-pty 主机（server2）实跑通过；`tsc -b` 0 错误；oxlint 干净；`zcode-preset.spec.ts` 行 id 不变仍绿。
- BUG 回顾（分类：实现 bug，非环境）：首版后台 `done` 回调内调用 `proc.readOutput()` 取尾标——而该 API 按契约是消费式的（`dsh-shell/src/types.ts:177`），吃掉了模型的输出，`job_output` 只剩 `(no new output)`（对照：上游同 harness 通过）。修复：`done` 只做 `processOutcome`（与上游一致）；尾标改为在 `readOutput` 包装内随消费累积解析。回归：后台 `cd` 经收集后更新 session cwd 且输出完整；agent-owned 作业不可见于匿名读取（与上游一致）。
- RENDER 回顾（分类：错误推断的规约）：首版前台渲染统一追加 `[exit code: N]`（从 DSH plain bash 习惯推断）。oracle 5 specimen + bundle 行级确认实际契约：成功只渲染 stdout+stderr（去首空行、trimEnd，无 marker）；失败首行 `Exit code N`；超时 `Command timed out after <ms>ms` + 中断 tag；空段丢弃后 `\n` 连接。已按此重写 `renderForegroundResult`（stdout 清洗/中断 tag/三态首行），server2 10/10。差异：hints（staleReadFileStateHint/ghRateLimitHint）边沿触发未观测到，暂空实现并记 UNKNOWN；超时 partial-stdout 是否计入、trim 深度、cancelled/spawn_error 路径待探。
- CWD 回顾（分类：描述文本误导的设计假设）：首版按工具描述“persists”实现无条件持久。oracle 活体 `cd /tmp`（workspace 外）→ 内容 `"/tmp\nShell cwd was reset to <root>"` 且下一次调用回到 root；`cd sub`（workspace 内）→ 持久且无后缀；bundle 行级确认规则（成功+exit0+main scope：inside 则 adopt，outside 则 revert + stderr 后缀；raw 与 realpath 双 pair、`..` 逃逸拒绝）。已改写为 adopt/revert + stderr 后缀（前台直接拼、后台随消费 delta 拼、仅 settled-success 评估），server2 12/12。差异：subagent（non-main scope）oracle 永不 adopt，本实现暂统一规则并记 UNKNOWN；workspaceRoot 取 session 首调用 cwd。
- 已知语义（非推测，待 oracle 确认记 UNKNOWN）：从未被收集的后台输出不产生尾标，cwd 保持未跟踪。ZCode 自身对后台 `cd` 是否影响 session cwd 尚未观测到，记 UNKNOWN，待差分 harness 对 oracle 实测后再定。
