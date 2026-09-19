# zcode-preset — 在 DeepSeek Harness 上运行 ZCode 行为

**English (abstract):** This fork of [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) adds the **zcode preset**: a clean-room, evidence-driven behavioral port of the ZCode coding agent onto DSH's plugin architecture. It is *not* a source port and bundles no ZCode runtime — the tool semantics, prompt texts, output rendering, and state machines were derived from black-box observation of ZCode and re-implemented as DSH plugins. Verified against the reference at five independent layers (see [Verification](#验证)). 上游平台文档见 [README.upstream.md](README.upstream.md)。

中文技术文档（本页） | 保留上游原文：[README.upstream.md](README.upstream.md) · [README.zh.upstream.md](README.zh.upstream.md)

---

## 这是什么

一个 DeepSeek Harness 的 fork，在 DSH 的插件体系上实现了一个 **`zcode` 预设**：安装后，DSH 的会话可以选择"**ZCode 模式**"，获得与 ZCode 编码代理一致的外部行为——工具语义、系统提示词、输出渲染、状态机、错误文案——全部经过与参考实现的逐字节差分验证。

**设计原则：行为等价，而非源码移植。** 本仓库不包含、也不链接任何 ZCode 官方运行时；全部实现是依据黑盒观测独立重写的 DSH 插件（Clean-room）。证据驱动：每条行为契约都有观测标本，每个改动都有回归验证。

## 内容一览

| 组件 | 位置 | 作用 |
|---|---|---|
| `dsh-zcode-bash` | `packages/preset/zcode-bash/` | Bash 工具的 oracle 行为：30000 字节截断信封、超时人性化梯子、exit code 渲染、cwd 跟随、后台任务 |
| `dsh-zcode-prompt` | `packages/preset/zcode-prompt/` | 15 份 oracle 工具描述与行为/记忆/上下文管理提示词 section |
| `dsh-zcode-todo` | `packages/preset/zcode-todo/` | Todo 状态机（priority 透传、跨 turn 持久、空读字节形状） |
| `dsh-zcode-agent` | `packages/preset/zcode-agent/` | 单一 Agent 工具多路复用（general-purpose / Explore 子代理类型） |
| `dsh-zcode-memory` | `packages/preset/zcode-memory/` | Memory 提示词 section |
| WebFetch QA 桥 | `packages/web/tool-web/` | `prompt` 参数触发专用 QA 模型调用（严格模板、fail-closed、答案 trim 透传） |
| zcode preset | `packages/preset/agent-presets/presets/zcode/` | 上述组件的 composition（`agent.cordis.yml`），shipped root 自动发现 |
| Termux/Android 修复 | 各包 | sharp 懒加载、koffi 3.2.1（android 预置）、session flock/link 回退、win32 import 门控 |

## 验证（五层，全部可复现）

| 层 | 内容 | 结果 |
|---|---|---|
| 1. 银行标本 | 对参考实现做 stub-model 差分观测，110+ 运行存档 | 行为规格的唯一事实源 |
| 2. 单元契约 | 规格导出的契约以单元测试编码 | 103/103 |
| 3. 活体协议差分 | DSH 运行时在 stub 模型协议下真跑，模型可见字节对照标本 | **4/4 EXACT**（echo / exit-3 / 30KB 截断信封 / 800ms 超时） |
| 4. 组合与 e2e | 真实 shipped composition 装配断言 | preset spec 7/7 + e2e 块绿 |
| 5. 生产实测 | 真实模型路由下的完整 turn：工具真实执行、输出逐字回复 | 三轮完整证据 |

## 快速开始

```sh
# 依赖：Node.js ≥ 24，pnpm ≥ 10
pnpm install --no-frozen-lockfile --ignore-scripts
npm run build:lib          # host 面 + client 面 + txt 资产
npm run build:web          # web UI（可选；pnpm filter 报 @pnpm/exe 缺失时：
                           #   cd apps/web && node_modules/.bin/vite build）

# 启动（web UI）
node --expose-internals apps/cli/lib/bin.js --profile web

# 或无头一次性任务（不需要浏览器）
node --expose-internals --import tsx/esm apps/cli/src/bin.ts \
  --profile headless "your task here"
```

Web UI 左下模式选择器选择 **"ZCode 模式"**（仅空白会话可切换——上游语义）。模型路由、凭证走 DSH 原生机制（设置文档或 profile patch 配置 provider）。

## 架构：两个平面

DSH 是"一切皆插件"的 Cordis 架构（上游文档见 [README.upstream.md](README.upstream.md)）。zcode 预设刻意只活在一个平面上：

- **Session 平面**（本仓库的全部行为代码）：preset composition 挂载于 `isolate` realm，逐会话生效，对宿主与兄弟会话不可见；
- **Host 平面**（DSH 原生，本仓库不碰）：模型路由、审批闭包、持久化、驱动循环。

ZCode 的提示词与工具文本**riding 在 DSH 原生的 system-prompt 装配机制上**——机制是宿主的，内容是 ZCode 的。因此上游 DSH 升级时，本预设的升级面极小（见[升级](#升级)）。

## 有意差异（不是缺陷）

| 差异 | 理由 |
|---|---|
| 工具命名 snake_case（`bash` vs `Bash`） | 模型读 schema 适应；参数/行为才是承重墙 |
| 后台任务 `bash-N` + `job_output`（非 `exec_uuid` + 落盘文件） | 两侧 id 均 owner-relative；ack 文案已对齐 |
| `AskUserQuestion` 要求 `id` 字段 | DSH UI 结构所需 |
| 无 Cron 四件套、无模型主动 EnterPlanMode | 不做假等价；DSH 有对应原生机制（reminders / `/plan`） |
| `allowedPrompts` / skill `args` / `summary` 收下忽略 | accept-and-ignore 即等价（有活体证据） |
| 截断落盘根 = 进程 tmpdir（非 HOME 状态目录） | 平台缝；信封文本除路径外逐字节一致 |

## 升级

上游 DSH 出新版本时：

1. 新分支 = 新上游 tag；5 包 + preset 目录 verbatim 搬运；
2. 只 diff 集成相关的包目录，核对契约符号清单——零命中即"无影响"；
3. 部署修复（sharp 懒加载 / koffi / session 回退）按新基座重新验证后保留或重构；
4. 过验证门（见下）后推送新分支，切换生产实例。

## 回滚

运行实例与代码分支一一对应；回滚 = 停新实例 + 用旧构建/旧安装版重启（DSH 启动时会自动 heal 模块链接，无需手工恢复）。会话、设置、凭证存于 Harness home，与运行时无关，回滚零数据损失。

## 验证命令速查

```sh
# 行为契约门（103 项）
node_modules/.bin/vitest run \
  packages/preset/agent-presets/tests/zcode-preset.spec.ts \
  packages/preset/agent-presets/tests/shipped-root.spec.ts \
  packages/web/tool-web/tests/qa-bridge.spec.ts \
  packages/web/tool-web/tests/integration.spec.ts \
  packages/preset/zcode-bash/tests/truncation.spec.ts \
  packages/preset/zcode-prompt/tests/behavior.spec.ts \
  packages/preset/zcode-memory/tests/memory.spec.ts \
  packages/interaction/permission-presets

# 预设 roster（期望 5 个全部 ok，含 zcode）
node -e "import('./packages/preset/agent-presets/lib/index.js').then(async m=>{
  const r=await m.scanRoot({path:m.SHIPPED_PRESET_ROOT,trust:'shipped'},
    'file://'+process.cwd().replace(/\\\\/g,'/')+'/apps/cli/lib/');
  console.log(r.map(p=>p.id+':'+(p.broken?'BROKEN':'ok')).join(' '))})"
```

## Termux / Android 注意事项

- `koffi` 全线 ≥ 3.2.1（官方含 android-arm64 预置；3.1.x 没有）；
- `sharp` 无 android 预置：本仓库将其懒加载化（插件正常挂载，仅图片处理路径在用时抛错）；
- `node-pty` 仓库 prebuilds/ 无 android：需自编或从可用安装树拷贝 `build/Release/pty.node`；
- 会话持久化的 `flock`/`link` 在部分 android 文件系统上不可用：已内置 rename 回退；
- pnpm 自举二进制（`@pnpm/exe.android-arm64`）不在 lockfile：`build:web` 的 `pnpm --filter` 会失败，直接进 `apps/web` 跑 `vite build` 绕过。

## 诚实边界

- 三项 UNKNOWN：64000 字节答案悬崖成因、compaction 边界、continuation 可达性（均证明不影响已验证行为）；
- 本仓库的历史含上游 fork 的完整提交记录；zcode 相关提交集中在各 `zcode-*` 分支顶端。

## License

沿用上游 [MIT License](LICENSE)（Copyright (c) 2026 DeepSeek）。zcode 预设部分同样以 MIT 释出。

*本仓库与 ZCode 官方无隶属关系；ZCode 行为规格经由黑盒观测获得，不含任何官方源码或运行时。*
