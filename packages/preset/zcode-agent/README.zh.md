---
description: "ZCode Agent 多路复用器：DSH 委托行之上的 oracle 单一 Agent 工具，供配置或调试它的用户和维护者使用。"
kind: "package-reference"
---

# @deepseek-ai/dsh-zcode-agent

[English](README.md) | 中文

## Summary

`dsh-zcode-agent` 为 zcode preset 注册 oracle 的单一 `Agent` 工具：在 DSH 按类型委托行之上做精确的 `general-purpose` / `Explore` 类型分发（未知类型错误逐字一致），附 live persona 与工具过滤器、可继续子会话与 jobs 后台执行。以一个多路复用器取代按类型工具行。

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

在 zcode preset composition 内挂载本行。调用方使用精确的 `subagent_type: "general-purpose" | "Explore"`；其他值以 oracle 逐字的 `Agent type '...' not found` 错误失败。

<a id="understand-the-implementation"></a>
## Understand the implementation

`src/index.ts` 收录多路复用器（路由、footer 向 `send_message` id 的适配）；`src/personas.ts` 收录 live persona 与 Explore 5 工具过滤器。子会话经 `send_message` 以 oracle footer 形态向父会话发消息；`to` 作为 `agent_id` 别名被接受，`summary` 仅为元数据（丢弃，不存储）。

<a id="further-exploration"></a>
## Further Exploration

- `src/personas.ts` —— persona 与过滤器。
- `tests/agent.spec.ts`、`tests/delegation.spec.ts` —— 多路复用与委托用例。
- 证据：zcode-agent 证据仓中的 `corpus/subagents/` 记录。

<a id="model-experience"></a>
## Dev Note

保持 persona 逐字节精确——agent.spec 已锁定。footer id 适配对恢复至关重要。

## Model Experience

模型只看到一个 `Agent` 工具、两种类型、oracle persona、可恢复/后台子会话——无按类型行泄漏。

<a id="known-limitations-and-deferred-work"></a>
## Known Limitations and Deferred Work

- 仅存在观测到的两种类型；新 oracle 类型需新证据，不得猜测。
- 子代理环境后缀行为是开放探针，本包不断言。

<a id="dev-note"></a>
