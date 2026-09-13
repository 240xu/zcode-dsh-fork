---
description: "ZCode Bash tool for the zcode agent preset: session cwd, timeouts, truncation, and background jobs over DSH's shell seam, for users and maintainers configuring or debugging it."
kind: "package-reference"
---

# @deepseek-ai/dsh-zcode-bash

English | [中文](README.zh.md)

## Summary

`dsh-zcode-bash` registers the oracle Bash contract for the zcode preset over DSH's own shell seam: session-persistent cwd tracked via a `__ZCODE_CWD_<rand>__:<pwd>:__END__` trailer, oracle timeouts (120000 default / 600000 cap, `BASH_*_TIMEOUT_MS` env honored, humanized deadline line), foreground truncation (raw stdout+stderr over 30000 bytes persists to `call_<n>_0-stdout.log` with the `<persisted-output>` envelope), and three execution routes (explicit background, eligible auto-background, plain foreground).

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

Mount this row inside the zcode preset composition. It shadows the global `bash` so oracle-shaped calls (cwd adoption, timeout values, `run_in_background`) behave like the oracle; ineligible commands (`sleep`-first) run foreground and die on timeout exactly like the oracle.

<a id="understand-the-implementation"></a>
## Understand the implementation

`src/index.ts` holds the marker wrap/parse, the timeout policy (`resolveBashTimeoutPolicy`), the humanizer (`formatTimeoutDuration`), the persist hook (`persistIfOversized`), and the renderers. Cwd is adopted only on exit-0 foreground success inside the workspace (raw+realpath pairs, `..` rejected); background completions never move tracking. `dangerouslyDisableSandbox` is accepted with no tool-level effect — confinement stays host-controlled, matching the oracle.

<a id="further-exploration"></a>
## Further Exploration

- `src/index.ts` — the full contract.
- `tests/bash.spec.ts`, `tests/markers.spec.ts`, `tests/truncation.spec.ts` — 54 specimen cases.
- Evidence: `corpus/bash/` records in the zcode-agent evidence repo.

<a id="model-experience"></a>
## Dev Note

The per-session call counter lives in a WeakMap keyed by live session; numbering stays dense (every foreground call consumes an index). Keep renderers byte-exact — truncation.spec locks the envelope template.

## Model Experience

### The Bash tool

#### What the model sees

Oracle Bash: a `bash` tool whose session cwd persists across calls, whose timeouts report humanized deadlines, whose oversized output arrives as a persisted file plus a 2KB preview, and whose background acknowledgements carry resumable task ids. Empty output renders the no-output parenthetical.

#### Token effect

Pay-per-result: command output tokens proportional to output size, capped by the 30000-byte inline budget beyond which only the 2KB preview rides the turn. Timeout and background-ack lines are short fixed strings.

#### KV Cache effect

Result-dependent: outputs differ per command, so no cross-call cache sharing is expected from results. The tool description itself is prefix-stable per preset.

## Known Limitations and Deferred Work

- Persist root is the process temp dir (DSH has no HOME state-dir convention); envelope text matches modulo the path.
- Big+timed-out abort-tag placement is inference (nearly unreachable: eligible commands background instead).
- `call_<n>` counter scope is path-only surface, still open.

<a id="dev-note"></a>
