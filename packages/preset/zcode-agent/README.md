---
description: "ZCode Agent multiplexer for the zcode agent preset: the oracle's single Agent tool over DSH's delegation rows, for users and maintainers configuring or debugging it."
kind: "package-reference"
---

# @deepseek-ai/dsh-zcode-agent

English | [中文](README.zh.md)

## Summary

`dsh-zcode-agent` registers the oracle's single `Agent` tool for the zcode preset: exact `general-purpose` / `Explore` type dispatch (verbatim unknown-type error) over DSH's per-type delegation rows, with live personas and tool filters, continuable children, and jobs-background execution. It replaces per-type tool rows with one multiplexer.

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

Mount this row inside the zcode preset composition. Callers use `subagent_type: "general-purpose" | "Explore"` exactly; anything else fails with the oracle-verbatim `Agent type '...' not found` error.

<a id="understand-the-implementation"></a>
## Understand the implementation

`src/index.ts` holds the multiplexer (routing, footer adaptation to `send_message` ids); `src/personas.ts` holds the live personas and the Explore 5-tool filter. Child sessions message the parent via `send_message` with the oracle footer shape; `to` is accepted as an alias of `agent_id` and `summary` is metadata-only (dropped, no store).

<a id="further-exploration"></a>
## Further Exploration

- `src/personas.ts` — personas and filters.
- `tests/agent.spec.ts`, `tests/delegation.spec.ts` — multiplexer and delegation cases.
- Evidence: `corpus/subagents/` records in the zcode-agent evidence repo.

<a id="model-experience"></a>
## Dev Note

Keep personas byte-exact — agent.spec locks them. The footer id adaptation is load-bearing for resume.

## Model Experience

### The Agent multiplexer

#### What the model sees

One `Agent` tool with exactly two types, `general-purpose` and `Explore`, carrying the oracle personas and the Explore tool filter. Unknown types fail with the oracle-verbatim error. Children message the parent through `send_message` with the oracle footer shape.

#### Token effect

Pay-per-result plus persona cost: personas ride the tool description on every request the zcode agent makes; child transcripts are scoped to the child session and summarized back through the footer on resume.

#### KV Cache effect

Description text is prefix-stable per preset. Child sessions establish their own prefixes; resumption replays the footer deterministically.

## Known Limitations and Deferred Work

- Only the two observed types exist; new oracle types need new evidence, not guessing.
- Subagent environment suffix behavior is an open probe, not asserted here.

<a id="dev-note"></a>
