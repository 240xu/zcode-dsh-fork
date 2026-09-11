---
description: "ZCode TodoRead/TodoWrite tools for the zcode agent preset: oracle shapes over the shared todos projection, for users and maintainers configuring or debugging it."
kind: "package-reference"
---

# @deepseek-ai/dsh-zcode-todo

English | [中文](README.zh.md)

## Summary

`dsh-zcode-todo` registers the oracle TodoRead/TodoWrite contract for the zcode preset: whole-list replacement where every item carries `content`, `status`, AND `priority`, rendered as the oracle `{oldTodos, todos, summary}` / `{todos}` JSON. Priorities ride a session-keyed sidecar while the priority-stripped list flows through the same `todo/write` session event the core projection folds — no new state, no forked lifecycle.

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

Mount this row inside the zcode preset composition. It shadows the global `todo_write` (nearer scopes shadow farther ones, a supported layering) so oracle-shaped writes validate; the core `TodoItem` type cannot hold priorities, hence the sidecar.

<a id="understand-the-implementation"></a>
## Understand the implementation

`src/index.ts` holds the shadow tools, the sidecar, and the summary fold. Key order in every JSON shape mirrors the observed oracle bytes; the `priority` fallback `medium` applies only to items that reached the shared list through a non-shadow writer. Empty-list read renders `{"todos":[]}`; empty write clears.

<a id="further-exploration"></a>
## Further Exploration

- `src/index.ts` — tools, sidecar, summary.
- `tests/todo-read.spec.ts` — specimen-locked round-trip, cross-turn, reset, empty-read cases.
- Evidence: `corpus/todo/` records in the zcode-agent evidence repo.

<a id="model-experience"></a>
## Dev Note

The sidecar is keyed per live session object; a new session starts empty by construction. Keep the JSON key order stable — tests lock it.

## Model Experience

### The todo tools

#### What the model sees

Oracle TodoWrite and TodoRead: whole-list replacement with required `content`, `status`, and `priority` per item, the `{oldTodos, todos, summary}` write shape with exact summary counts, and the `{todos}` read shape. Reads never mutate.

#### Token effect

Pay-per-result: only the returned list and summary tokens, proportional to list size. No standing prompt cost beyond the tool descriptions.

#### KV Cache effect

Result-dependent: list contents change as work progresses, so tool results across turns do not share cache entries beyond identical repeated reads.

## Known Limitations and Deferred Work

- Compaction-boundary todo behavior remains UNKNOWN on the oracle side.
- `todoGroups` shape is an open probe, not asserted here.

<a id="dev-note"></a>
