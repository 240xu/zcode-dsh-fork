---
description: "ZCode TodoRead/TodoWrite 工具：共享 todos 投影之上的 oracle 形态，供配置或调试它的用户和维护者使用。"
kind: "package-reference"
---

# @deepseek-ai/dsh-zcode-todo

[English](README.md) | 中文

## Summary

`dsh-zcode-todo` 为 zcode preset 注册 oracle TodoRead/TodoWrite 契约：整表替换，每个条目携带 `content`、`status` 与 `priority`，渲染为 oracle 的 `{oldTodos, todos, summary}` / `{todos}` JSON。优先级经由 session-keyed sidecar 传递，去优先级后的表走核心投影折叠的同一 `todo/write` 会话事件——不新增状态，不分叉生命周期。

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

在 zcode preset composition 内挂载本行。它遮蔽全局 `todo_write`（近 scope 遮蔽远 scope，属支持的分层），使 oracle 形态的写入通过校验；核心 `TodoItem` 类型装不下优先级，因此使用 sidecar。

<a id="understand-the-implementation"></a>
## Understand the implementation

`src/index.ts` 收录 shadow 工具、sidecar 与 summary 折叠。每个 JSON 形态的键序与观测到的 oracle 字节一致；`priority` 回退 `medium` 仅适用于经非 shadow 写入者进入共享表的条目。空表读取渲染 `{"todos":[]}`；空写入清空。

<a id="further-exploration"></a>
## Further Exploration

- `src/index.ts` —— 工具、sidecar、summary。
- `tests/todo-read.spec.ts` —— 样本锁定的 round-trip、跨 turn、reset、空读用例。
- 证据：zcode-agent 证据仓中的 `corpus/todo/` 记录。

<a id="model-experience"></a>
## Dev Note

sidecar 按 live session 对象 key；新 session 按构造即为空。保持 JSON 键序稳定——测试已锁定。

## Model Experience

模型看到的是 oracle TodoWrite/TodoRead：必填优先级被接受、整表替换、跨 turn 持久、精确的 summary 计数。读取永不变更。

<a id="known-limitations-and-deferred-work"></a>
## Known Limitations and Deferred Work

- 压缩（compaction）边界的 todo 行为在 oracle 侧仍为 UNKNOWN。
- `todoGroups` 形态是开放探针，本包不断言。

<a id="dev-note"></a>
