# Ported Source Notice

Model-facing text and builder functions in `src/official/` are ported from the
official open-source repository:

- Source: https://github.com/zai-org/ZCode (tag/commit: main @ 872ad96, snapshot 2026-09-21)
- Version: 3.14.0
- License: Apache License 2.0 (see the upstream repository root `LICENSE` and `NOTICE.md`)

Each ported module carries a header comment naming its upstream file path.
Modifications are limited to interface adaptation (DSH section metadata instead
of the official `ContextSection` wrappers, narrowed env/model types, dropped
runner/frontmatter plumbing) and are documented inline. The official dynamic-
workflow gate is treated as closed (`dynamicWorkflowEnabled: false`), matching
upstream's own gate-closed branch, because this deployment ships no
CreateWorkflow tool.
