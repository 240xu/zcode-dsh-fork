---
description: "ZCode 的工具描述文本与行为节：十五个 oracle 工具描述（与观测到的 ZCode 运行时逐字节一致），以及身份、动态行为、上下文管理节，供配置或调试它的用户和维护者使用。"
kind: "package-reference"
---

# @deepseek-ai/dsh-zcode-prompt

[English](README.md) | 中文

## Summary

`dsh-zcode-prompt` 承载 zcode preset 挂载的 ZCode 行为文本：十五个 oracle 工具描述（与观测到的 ZCode 运行时逐字节一致），以及身份、动态行为、上下文管理节。三个 txt 资源在构建时复制到 lib 入口旁。

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

在 zcode preset composition 内挂载本行以注册 oracle 工具文本。txt 资源在导入时相对于模块文件读取；`scripts/copy-zcode-txt-assets.ts` 会将其复制到构建产物旁，因为编译器不复制非代码资源。

<a id="understand-the-implementation"></a>
## Understand the implementation

`src/tool-texts.ts` 收录十五个描述字符串；`src/index.ts` 注册行为节。每个字符串都与观测到的 oracle 逐字节核对——不要为了文风改写，一字节之差即兼容性破坏，且有样本测试覆盖。

<a id="further-exploration"></a>
## Further Exploration

- `src/tool-texts.ts` —— 描述文本库。
- zcode-agent 证据仓中的 tool-surface 语料记录。

<a id="model-experience"></a>
## Dev Note

若 txt 资源变更，`src/` 与 `files[]` 的 lib 侧复制路径必须保持同步；复制脚本对缺失源文件直接报错。

## Model Experience

模型看到的工具面与 oracle 逐字一致：工具名、参数形态、行为说明。文本从不描述 DSH 内部机制；桥接差异在工具实现里，不在这里。

<a id="known-limitations-and-deferred-work"></a>
## Known Limitations and Deferred Work

- 文本版本锁定在已观测的 oracle（3.10.2-19，及 3.11.2 增补）；新 oracle 版本需重新验证，不能盲目复用。
- `web_fetch` 描述是 oracle 原文，描述了 DSH 桥接未实现的 QA 语义——该缺口由工具自身承担，已在其桥接注释中声明。

<a id="dev-note"></a>
