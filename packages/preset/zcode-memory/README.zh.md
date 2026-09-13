---
description: "ZCode 记忆提示节，为 zcode agent preset 提供持久三作用域记忆的 system-prompt 文本，供配置或调试它的用户和维护者使用。"
kind: "package-reference"
---

# @deepseek-ai/dsh-zcode-memory

[English](README.md) | 中文

## Summary

`dsh-zcode-memory` 提供 zcode preset 挂载的 ZCode 记忆提示节：持久三作用域记忆的 system-prompt 文本。提示文本（`memory-prompt.txt`）在导入时相对于模块文件读取；构建时由 `scripts/copy-zcode-txt-assets.ts` 复制到 lib 旁，因为编译器不复制非代码资源。

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

在 zcode preset composition 内挂载本行以注册记忆提示节。不要改写提示文本的措辞——它是与观测到的 oracle 逐字节对齐的证据文本。

<a id="understand-the-implementation"></a>
## Understand the implementation

`src/index.ts` 注册记忆节；文本本体在 `src/memory-prompt.txt`。lib 侧的副本由构建链的复制步骤保证存在，缺失会大声失败。

<a id="further-exploration"></a>
## Further Exploration

- `src/memory-prompt.txt` —— 提示文本本体。
- zcode-agent 证据仓中的记忆相关语料记录。

<a id="model-experience"></a>
## Dev Note

修改 txt 后须同步 `files[]` 的 lib 侧路径；复制脚本对缺失源文件直接报错。

## Model Experience

模型看到的记忆节与 oracle 一致：三作用域、持久语义。存储语义由宿主 session 实现，文本只描述契约。

<a id="known-limitations-and-deferred-work"></a>
## Known Limitations and Deferred Work

- 文本版本锁定在已观测的 oracle；新 oracle 版本需重新验证。
- 压缩（compaction）边界行为在 oracle 侧仍为 UNKNOWN，本包不做断言。

<a id="dev-note"></a>
