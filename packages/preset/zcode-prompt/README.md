---
description: "Oracle-verbatim ZCode tool description texts and behavior sections backing the zcode agent preset, for users and maintainers configuring or debugging it."
kind: "package-reference"
---

# @deepseek-ai/dsh-zcode-prompt

English | [中文](README.zh.md)

## Summary

`dsh-zcode-prompt` carries the ZCode behavior text the zcode preset mounts: the fifteen oracle tool descriptions (byte-identical to the observed ZCode runtime) plus the identity, dynamic-behavior, and context-management sections, with the three txt assets copied beside the built lib entry at build time.

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

Mount this row inside the zcode preset composition to register the oracle tool texts. The txt assets (`identity-section.txt`, `dynamic-behavior.txt`, `context-management.txt`) are read at import time relative to the module file; `scripts/copy-zcode-txt-assets.ts` copies them beside the built lib entry because the compiler does not copy non-code assets.

<a id="understand-the-implementation"></a>
## Understand the implementation

`src/tool-texts.ts` holds the fifteen description strings; `src/index.ts` registers the behavior sections. Every string is byte-verified against the observed oracle — do not reword them for style; a one-byte change is a compatibility break covered by specimen tests.

<a id="further-exploration"></a>
## Further Exploration

- `src/tool-texts.ts` — the description bank.
- Evidence: `corpus/` tool-surface records in the zcode-agent evidence repo.

<a id="model-experience"></a>
## Dev Note

If a txt asset changes, both `src/` and the `files[]` lib-side copy path must stay in sync; the copy script fails loud on a missing source.

## Model Experience

### The tool texts

#### What the model sees

The fifteen oracle tool descriptions verbatim (the `tool-texts.ts` bank), plus the identity, dynamic-behavior, and context-management sections, mounted as system-prompt rows for agents on the zcode preset. Parameter shapes, behavior notes, and tool names match the observed oracle exactly.

#### Token effect

Fixed per preset: the description and section tokens ride every request the zcode agent makes, and no other agent pays for them. The text never changes at runtime.

#### KV Cache effect

Prefix-stable for the life of an agent: the rows mount once before the agent is published, so the system prompt prefix is identical across that agent's requests and shares cache with same-preset agents.

## Known Limitations and Deferred Work

- Texts are version-pinned to the observed oracle (3.10.2-19, with 3.11.2 amendments); a new oracle version requires re-verification, not blind reuse.
- The `web_fetch` description is oracle-verbatim and describes QA semantics the DSH bridge does not implement — that gap is owned by the tool, documented in its bridge comment.

<a id="dev-note"></a>
