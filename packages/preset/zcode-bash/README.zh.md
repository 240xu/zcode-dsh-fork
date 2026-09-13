---
description: "ZCode Bash 工具：DSH shell 缝之上的 session cwd、超时、截断与后台任务，供配置或调试它的用户和维护者使用。"
kind: "package-reference"
---

# @deepseek-ai/dsh-zcode-bash

[English](README.md) | 中文

## Summary

`dsh-zcode-bash` 在 DSH 自有 shell 缝之上为 zcode preset 注册 oracle Bash 契约：经 `__ZCODE_CWD_<rand>__:<pwd>:__END__` 尾标跟踪的 session 持久 cwd、oracle 超时（120000 默认 / 600000 上限，遵守 `BASH_*_TIMEOUT_MS` 环境变量，人性化 deadline 行）、前台截断（原始 stdout+stderr 超 30000 字节则持久化为 `call_<n>_0-stdout.log` 并附 `<persisted-output>` 信封），以及三条执行路由（显式后台、可后台、纯前台）。

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

在 zcode preset composition 内挂载本行。它遮蔽全局 `bash`，使 oracle 形态的调用（cwd 采纳、超时值、`run_in_background`）表现与 oracle 一致；不合格命令（`sleep` 开头）走前台，超时即杀，与 oracle 一致。

<a id="understand-the-implementation"></a>
## Understand the implementation

`src/index.ts` 收录标记包装/解析、超时策略（`resolveBashTimeoutPolicy`）、人性化器（`formatTimeoutDuration`）、持久化钩子（`persistIfOversized`）与渲染器。cwd 仅在工作区内 exit-0 前台成功时采纳（raw+realpath 双通道，`..` 拒绝）；后台完成永不移动跟踪。`dangerouslyDisableSandbox` 被接受但无工具级效果——隔离仍由 host 控制，与 oracle 一致。

<a id="further-exploration"></a>
## Further Exploration

- `src/index.ts` —— 完整契约。
- `tests/bash.spec.ts`、`tests/markers.spec.ts`、`tests/truncation.spec.ts` —— 54 个样本用例。
- 证据：zcode-agent 证据仓中的 `corpus/bash/` 记录。

<a id="model-experience"></a>
## Dev Note

每 session 调用计数器存于 key 为 live session 的 WeakMap；编号保持稠密（每次前台调用消耗一个序号）。保持渲染器逐字节精确——truncation.spec 已锁定信封模板。

## Model Experience

模型看到的是 oracle Bash：cwd 跨调用持久、超时报告人性化 deadline（`1.5s`、`2m`）、超大输出以持久化文件 + 2KB 预览呈现、后台回执携带可恢复 task id。

<a id="known-limitations-and-deferred-work"></a>
## Known Limitations and Deferred Work

- 持久化根目录为进程临时目录（DSH 无 HOME 状态目录约定）；信封文本除路径外逐字节一致。
- 大输出 + 超时的 abort-tag 位置为推断（几乎不可达：可后台命令会走后台而非超时）。
- `call_<n>` 计数器作用域为纯路径面，仍开放。

<a id="dev-note"></a>
