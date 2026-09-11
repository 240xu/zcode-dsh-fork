---
description: "ZCode persistent three-scope memory prompt section for the zcode agent preset, for users and maintainers configuring or debugging it."
kind: "package-reference"
---

# @deepseek-ai/dsh-zcode-memory

English | [中文](README.zh.md)

## Summary

`dsh-zcode-memory` provides the ZCode memory prompt section the zcode preset mounts: persistent three-scope memory system-prompt text. The prompt text (`memory-prompt.txt`) is read at import time relative to the module file; the build chain copies it beside the lib entry because the compiler does not copy non-code assets.

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

Mount this row inside the zcode preset composition to register the memory prompt section. Do not reword the prompt text — it is evidence text aligned byte-for-byte with the observed oracle.

<a id="understand-the-implementation"></a>
## Understand the implementation

`src/index.ts` registers the memory section; the text body lives in `src/memory-prompt.txt`. The lib-side copy is guaranteed by the build chain's copy step, which fails loud on a missing source.

<a id="further-exploration"></a>
## Further Exploration

- `src/memory-prompt.txt` — the prompt text body.
- Memory corpus records in the zcode-agent evidence repo.

<a id="model-experience"></a>
## Dev Note

After editing the txt, keep the lib-side path in `files[]` in sync; the copy script errors on a missing source file.

## Model Experience

### The memory section

#### What the model sees

The persistent three-scope memory prompt section (`src/memory-prompt.txt`), carrying the memory contract text for agents on the zcode preset. Storage behavior is implemented by the host session; the text describes what the model may assume about recall across turns.

#### Token effect

Fixed per preset: the memory section tokens ride every request the zcode agent makes, and no other agent pays for them.

#### KV Cache effect

Prefix-stable for the life of an agent: the section mounts once before the agent is published, so same-preset agents share the system-prompt prefix.

## Known Limitations and Deferred Work

- Text is version-pinned to the observed oracle; a new oracle version requires re-verification.
- The compaction boundary behavior remains UNKNOWN on the oracle side; this package asserts nothing about it.

<a id="dev-note"></a>
