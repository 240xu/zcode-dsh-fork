import { execFileSync, spawn } from "node:child_process";
import { accessSync, constants, copyFileSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getHeapStatistics } from "node:v8";
import z from "@deepseek-ai/schemastery";
import { CodeRuntime, DUNDER_MEMBER, PORTABLE_RESERVED_WORDS, RESERVED_BINDING_GLOBALS, RESERVED_ERROR_MEMBERS } from "@deepseek-ai/dsh-code-runtime";
import { snapshotJsonValue } from "@deepseek-ai/dsh-util-values";
import { MAX_TIMER_DELAY_MS } from "@deepseek-ai/dsh-timeout";
Object.fromEntries(Object.entries({
	BootMessage: {
		type: "required",
		cpuSeconds: "required",
		addressSpaceBytes: "required",
		maxLogBytes: "required",
		maxValueBytes: "required",
		namespaces: "required"
	},
	Namespace: {
		global: "required",
		names: "required",
		errorClass: "optional"
	},
	RunMessage: {
		type: "required",
		program: "required"
	},
	BootAckMessage: { type: "required" },
	CallMessage: {
		type: "required",
		id: "required",
		global: "required",
		name: "required",
		args: "required"
	},
	LogMessage: {
		type: "required",
		text: "required",
		truncated: "optional",
		open: "optional"
	},
	DoneErrorField: {
		kind: "required",
		message: "required"
	},
	DoneMessage: {
		type: "required",
		value: "optional",
		error: "optional"
	},
	ErrorClass: {
		name: "required",
		memberNameProperty: "required"
	},
	ReplyOk: {
		type: "required",
		id: "required",
		ok: "required",
		value: "required"
	},
	ReplyErr: {
		type: "required",
		id: "required",
		ok: "required",
		message: "required"
	}
}).map(([frame, roles]) => {
	return [frame, {
		required: Object.keys(roles).filter((key) => roles[key] === "required").sort(),
		optional: Object.keys(roles).filter((key) => roles[key] === "optional").sort()
	}];
}));
/**
* The in-band marker text announcing that log capture stopped at the byte
* budget. Shared wire vocabulary: the Python-side LogBuffer emits it when ITS
* ledger exhausts, and the host emits identical text when its own ledger drops
* a frame first (forged fd-3 traffic, stray stdout bytes) — a truncated run
* reads the same however the cap was hit.
* @param maxBytes - the configured `maxLogBytes` the marker names.
* @returns the marker line.
*/
function logTruncationMarker(maxBytes) {
	return `[dsh-code-runtime-python] log capture truncated at ${maxBytes} bytes`;
}
/**
* Serialize one JSON-parse-produced value without recursion. `JSON.stringify`
* recurses per nesting level and throws `RangeError` a few thousand levels
* deep, but the seam's `CodeJsonValue` has no depth limit — an honest deep
* completion or binding resolution below the byte budget must cross intact
* (the worker backend's wire is equally stack-safe). Callers must pass a value
* produced by `JSON.parse` (or equally JSON-plain): only `null`, finite
* numbers, booleans, strings, dense arrays, and plain objects — this encoder
* validates nothing. Output matches compact `JSON.stringify` byte for byte
* EXCEPT on an integral double beyond the safe range, where {@link scalarJson}
* emits the exact integer's BigInt digits rather than `JSON.stringify`'s rounded
* spelling (`1152921504606846976`, not `...847000`) so the seam's lossless-JSON
* promise holds across the wire.
* @param value - a JSON-plain value (e.g. straight from `JSON.parse`).
* @returns the compact JSON encoding.
*/
function encodeJsonPlain(value) {
	const chunks = [];
	const tasks = [{ value }];
	for (let task = tasks.pop(); task !== void 0; task = tasks.pop()) {
		if ("text" in task) {
			chunks.push(task.text);
			continue;
		}
		const current = task.value;
		if (typeof current === "string") chunks.push(JSON.stringify(current));
		else if (Array.isArray(current)) {
			chunks.push("[");
			tasks.push({ text: "]" });
			for (let index = current.length - 1; index >= 0; index--) {
				if (index < current.length - 1) tasks.push({ text: "," });
				tasks.push({ value: current[index] });
			}
		} else if (typeof current === "object" && current !== null) {
			const record = current;
			chunks.push("{");
			tasks.push({ text: "}" });
			const keys = Object.keys(record);
			for (let index = keys.length - 1; index >= 0; index--) {
				const key = keys[index];
				if (index < keys.length - 1) tasks.push({ text: "," });
				tasks.push({ value: record[key] });
				tasks.push({ text: `${JSON.stringify(key)}:` });
			}
		} else chunks.push(scalarJson(current));
	}
	return chunks.join("");
}
/**
* One scalar (null, boolean, finite number) as JSON text. A beyond-safe-range
* integral double needs BigInt digits: `String(2 ** 60)` emits the ROUNDED
* `...847000` form, and echoing that to the child would silently change the
* integer the seam promised to carry losslessly — `BigInt(2 ** 60)` prints the
* exact `...846976` the double actually holds.
* @param current - a JSON-plain scalar (JSON.parse emits nothing else).
* @returns its JSON encoding.
*/
function scalarJson(current) {
	if (typeof current === "number" && Number.isInteger(current) && !Number.isSafeInteger(current)) return BigInt(current).toString();
	return String(current);
}
/**
* Exact UTF-8 byte length of one string's compact JSON form (quotes + escapes),
* computed by a single non-allocating scan that stops the instant the running
* total exceeds `maxBytes`. Used instead of `Buffer.byteLength(JSON.stringify(s))`
* so a control-heavy forged string — whose escaped copy expands up to ~6x — is
* rejected BEFORE that copy is materialized: `JSON.stringify` would allocate the
* full escaped form first, the very hundreds-of-MB spike the metered traversal
* exists to avoid. Mirrors `JSON.stringify`'s escaping byte-for-byte: `"` and
* `\` and the five short C0 escapes cost 2, other C0 controls `\uXXXX` cost 6, a
* valid surrogate pair is one astral code point emitted as raw 4-byte UTF-8, a
* LONE surrogate becomes `\uXXXX` at 6, and any other code point costs its raw
* UTF-8 width.
* @param text - the string to meter.
* @param maxBytes - largest serialized size the caller can still admit.
* @returns the exact serialized byte length, or `undefined` once it exceeds `maxBytes`.
*/
function jsonStringBytesUpTo(text, maxBytes) {
	let bytes = 2;
	if (bytes > maxBytes) return void 0;
	for (let index = 0; index < text.length; index++) {
		const code = text.charCodeAt(index);
		if (code === 34 || code === 92 || code === 8 || code === 9 || code === 10 || code === 12 || code === 13) bytes += 2;
		else if (code < 32) bytes += 6;
		else if (code < 128) bytes += 1;
		else if (code < 2048) bytes += 2;
		else if (code >= 55296 && code <= 56319 && index + 1 < text.length) {
			const next = text.charCodeAt(index + 1);
			if (next >= 56320 && next <= 57343) {
				bytes += 4;
				index++;
			} else bytes += 6;
		} else if (code >= 55296 && code <= 57343) bytes += 6;
		else bytes += 3;
		if (bytes > maxBytes) return void 0;
	}
	return bytes;
}
/**
* Meter a `JSON.parse`-produced done value's compact-JSON byte length AND its
* number losslessness in one traversal, stopping the instant `maxBytes` is
* crossed. This bounds the INCREMENTAL allocation the check itself would add on
* top of the already-parsed value — the enqueued children; strings and keys are
* metered by {@link jsonStringBytesUpTo} without allocating an escaped copy —
* not the parse that produced `value`.
* That upstream width is bounded separately, by the host-side cap on inbound
* fd-3 frame size before `JSON.parse` runs (owned by the runtime that reads the
* channel), so `value` cannot be arbitrarily large when it reaches here. The
* budget is the `maxValueBytes` the boot frame carries — a required wire field
* with no default at this layer. The traversal rejects over-budget BEFORE
* materializing a string's escaped form or enqueuing an array's/object's
* children, so a forgery within that frame cap cannot force those secondary
* allocations. Object key COUNTING is
* unavoidably O(keys) — JS has no lazy own-key iterator, and the parse already
* built the key set — but the check still refuses the per-entry work before the
* enqueue loop. A non-lossless number (non-finite, negative zero) is caught only
* when the value fits the budget — an over-budget value is rejected regardless,
* so the distinction is moot. Same JSON-plain precondition and traversal shape
* as {@link encodeJsonPlain}; a number's byte length is measured through
* {@link scalarJson} (matching the encoder, so a beyond-safe-range integer
* meters its exact BigInt digits, not `JSON.stringify`'s rounded spelling) and
* a string's/key's through {@link jsonStringBytesUpTo} (the exact escaped size,
* scanned without allocating the escaped copy).
* @param value - a JSON-plain value (e.g. straight from `JSON.parse`).
* @param maxBytes - the completion-value budget in bytes.
* @returns `{ ok: true, bytes }` with the exact serialized size, or
* `{ ok: false, reason }` — `over-budget` once the size exceeds `maxBytes`,
* `non-lossless` on a non-finite or negative-zero number.
*/
function checkDoneValue(value, maxBytes) {
	let bytes = 0;
	let nonLossless = false;
	const cursors = [{
		kind: "values",
		iter: [value].values()
	}];
	while (cursors.length > 0) {
		const cursor = cursors.at(-1);
		const step = cursor.iter.next();
		if (step.done === true) {
			cursors.pop();
			continue;
		}
		let current;
		if (cursor.kind === "entries") {
			const [key, member] = step.value;
			const keyBytes = jsonStringBytesUpTo(key, maxBytes - bytes);
			if (keyBytes === void 0) return {
				ok: false,
				reason: "over-budget"
			};
			bytes += keyBytes + 1;
			current = member;
		} else current = step.value;
		if (typeof current === "number") {
			if (!Number.isFinite(current) || Object.is(current, -0)) nonLossless = true;
			bytes += Buffer.byteLength(scalarJson(current), "utf8");
		} else if (typeof current === "string") {
			const stringBytes = jsonStringBytesUpTo(current, maxBytes - bytes);
			if (stringBytes === void 0) return {
				ok: false,
				reason: "over-budget"
			};
			bytes += stringBytes;
		} else if (Array.isArray(current)) {
			bytes += 2 + (current.length > 1 ? current.length - 1 : 0);
			if (bytes + current.length > maxBytes) return {
				ok: false,
				reason: "over-budget"
			};
			cursors.push({
				kind: "values",
				iter: current.values()
			});
		} else if (typeof current === "object" && current !== null) {
			const record = current;
			let count = 0;
			for (const key in record) if (Object.hasOwn(record, key)) count += 1;
			bytes += 2 + (count > 1 ? count - 1 : 0);
			if (bytes + count * 4 > maxBytes) return {
				ok: false,
				reason: "over-budget"
			};
			cursors.push({
				kind: "entries",
				iter: ownEntries(record)
			});
		} else bytes += Buffer.byteLength(scalarJson(current), "utf8");
		if (bytes > maxBytes) return {
			ok: false,
			reason: "over-budget"
		};
	}
	if (nonLossless) return {
		ok: false,
		reason: "non-lossless"
	};
	return {
		ok: true,
		bytes
	};
}
/**
* Whether a raw JSON line contains an integer token that would lose precision
* as a JavaScript number. `JSON.parse` silently rounds such a token
* (`9007199254740993` becomes `...992`) BEFORE any validation can see it, so
* the check must read the source text; a beyond-safe-range token whose double
* parse round-trips exactly (`2**53`, `2**60`) is lossless and passes. The scan walks the line skipping string literals (a digit run
* inside a string is data, not a number token) and tests every number token
* in plain integer form — no fraction or exponent, which parse as doubles by
* intent. A reviver cannot do this job: the reviver walk recurses per nesting
* level and would reintroduce the depth limit `encodeJsonPlain` removes.
* @param line - the raw UTF-8 text of one JSON-lines frame.
* @returns true when an unsafe integer token is present outside strings.
*/
function hasUnsafeIntegerToken(line) {
	for (let index = 0; index < line.length; index++) {
		const char = line[index];
		if (char === "\"") {
			for (index++; index < line.length; index++) if (line[index] === "\\") index++;
			else if (line[index] === "\"") break;
			continue;
		}
		if (char === "-" || char !== void 0 && char >= "0" && char <= "9") {
			let end = index + 1;
			while (end < line.length) {
				const c = line[end];
				if (c >= "0" && c <= "9" || c === "." || c === "e" || c === "E" || c === "+" || c === "-") end++;
				else break;
			}
			const token = line.slice(index, end);
			if (/^-?\d+$/.test(token)) {
				const parsed = Number(token);
				if (!Number.isFinite(parsed)) return true;
				if (!Number.isSafeInteger(parsed) && BigInt(token) !== BigInt(parsed)) return true;
			}
			index = end - 1;
		}
	}
	return false;
}
/**
* Lazily yield one plain object's own enumerable [key, value] entries. The
* key escapes are metered when {@link checkDoneValue}'s cursor walk reaches
* each entry, so a wide object never materializes a member list: each entry
* is produced straight off the already-parsed record, and the escaped key
* bytes are counted without building the escaped string.
* @param record - a JSON-parse-produced object.
* @yields each own enumerable [key, value] pair, in key order.
*/
function* ownEntries(record) {
	for (const key in record) if (Object.hasOwn(record, key)) yield [key, record[key]];
}
/**
* Lazily yield one plain object's own enumerable property values. A generator
* (not `Object.values`/`Object.entries`) because {@link hasNonLosslessNumber}
* walks breadth it cannot bound: those helpers copy the whole VALUE (or
* key/value pair) list into a fresh array up front, so a wide object would cost
* that second full-breadth allocation before a single value is examined. The
* `for...in` here does not make the walk sublinear — V8 still materializes the
* key-name enumeration when the loop starts — but it avoids the extra value
* array, yielding each value straight off the already-parsed object.
* @param record - a JSON-parse-produced object.
* @yields each own enumerable property value, in key order.
*/
function* ownValues(record) {
	for (const key in record) if (Object.hasOwn(record, key)) yield record[key];
}
/**
* Whether a JSON.parse-produced value contains a number outside lossless
* JSON: non-finite (`1e400` parses to `Infinity`) or negative zero (`-0.0`
* parses to JS `-0`, whose sign bit a re-serialization drops). The honest
* child's validator rejects these before sending, so a frame carrying one is
* forged.
*
* Runs on `call.args`, which — unlike a completion value — has NO seam byte
* cap, so there is no budget to reject a wide payload against the way
* {@link checkDoneValue} does. The traversal therefore holds ONE cursor per
* NESTING LEVEL (an array or {@link ownValues} iterator) instead of one entry
* per member: a forged flat `args` at the top of the host's inbound frame-size
* cap would
* otherwise push tens of millions of stack entries — and `Object.values` would
* copy each object's full breadth — allocating hundreds of megabytes beyond
* what `JSON.parse` already holds. Iterative either way, so a deep frame
* cannot overflow the host stack.
* @param value - a JSON-parse-produced value from an fd-3 frame.
* @returns true when any contained number is non-finite or negative zero.
*/
function hasNonLosslessNumber(value) {
	const cursors = [[value].values()];
	while (cursors.length > 0) {
		const step = cursors.at(-1).next();
		if (step.done === true) {
			cursors.pop();
			continue;
		}
		const current = step.value;
		if (typeof current === "number") {
			if (!Number.isFinite(current) || Object.is(current, -0)) return true;
		} else if (Array.isArray(current)) cursors.push(current.values());
		else if (typeof current === "object" && current !== null) cursors.push(ownValues(current));
	}
	return false;
}
/**
* Runtime shape gate for inbound fd-3 traffic. Model code has full access to
* fd 3 and can post anything — `null`, primitives, poisoned fields — so the
* compile-time union means nothing here: every field is validated and REBUILT
* before the host reads it (forged extras never ride along; a non-number id
* can never be echoed into a reply). Junk returns `undefined` and is dropped
* so a throw in the host's `message` handler cannot crash the host process.
* @param raw - one JSON-parsed frame from fd 3.
* @returns the rebuilt frame, or `undefined` to drop it silently.
*/
function validateChildFrame(raw) {
	if (typeof raw !== "object" || raw === null) return void 0;
	const m = raw;
	switch (m.type) {
		case "boot-ack": return { type: "boot-ack" };
		case "log":
			if (typeof m.text !== "string") return void 0;
			return {
				type: "log",
				text: m.text,
				...m.truncated === true ? { truncated: true } : {},
				...m.open === true ? { open: true } : {}
			};
		case "call":
			if (typeof m.id !== "number" || !Number.isFinite(m.id) || Object.is(m.id, -0) || typeof m.global !== "string" || typeof m.name !== "string") return void 0;
			if (!Object.hasOwn(m, "args")) return void 0;
			if (hasNonLosslessNumber(m.args)) return void 0;
			return {
				type: "call",
				id: m.id,
				global: m.global,
				name: m.name,
				args: m.args
			};
		case "done": {
			const err = m.error;
			if (err === void 0) return m.value === void 0 ? { type: "done" } : {
				type: "done",
				value: m.value
			};
			if (typeof err !== "object" || err === null) return void 0;
			const { kind, message } = err;
			if (typeof message !== "string") return void 0;
			if (kind !== "exception" && kind !== "invalid-output" && kind !== "output-limit") return void 0;
			return m.value === void 0 ? {
				type: "done",
				error: {
					kind,
					message
				}
			} : {
				type: "done",
				value: m.value,
				error: {
					kind,
					message
				}
			};
		}
		default: return;
	}
}
//#endregion
//#region lib/types/index.js
/**
* CPython subprocess code runtime: a fresh `python3` process runs each model program under an
* asyncio event loop with top-level ``await``. Binding calls travel on fd 3 as JSON-lines,
* leaving stdout/stderr free for the program's own output. This is containment, not a security
* boundary: model code has bash-equivalent trust, contained by a tempdir-only environment,
* RLIMIT_CPU + RLIMIT_AS, wall-clock timeout, and SIGTERM→grace→SIGKILL on the process group.
*
* The package also owns the versionless fd-3 wire protocol itself; its host-side codec and
* hostile-frame validators are re-exported so every consumer of the wire shares one vocabulary.
* @module @deepseek-ai/dsh-experimental-code-runtime-python
*/
/**
* The seam's language-portable identifier subset (see
* `CodeBindingNamespace.global`) — identical to Python's identifier grammar,
* so the shared contract needs no per-backend mapping here.
*/
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
/**
* The seam's cross-language reserved-word union: the portable-identifier
* contract promises a namespace list valid here is valid on every backend, so
* a JS keyword like `typeof` is refused even though it is a legal Python name.
*/
const RESERVED_NAMES = PORTABLE_RESERVED_WORDS;
/**
* The seam's shared backend-owned globals (`console` is the worker's slot;
* `__dsh_main__`/`__builtins__`/`__name__` are this bootstrap's wrapper and
* seeded module globals). Shared so a namespace list valid on one backend is
* valid on all — colliding with an owned slot would be silently overwritten
* (or overwrite builtins), so the seam rejects them up front.
*/
const RUNTIME_OWNED_GLOBALS = RESERVED_BINDING_GLOBALS;
/**
* The seam's shared error-member exclusions (`RESERVED_ERROR_MEMBERS` +
* dunder-form names) — enforced identically here and in the worker backend so
* an errorClass valid on one backend is valid on all. Several dunders are
* constrained CPython descriptors whose `setattr` raises while constructing
* the very rejection it was meant to carry; the exact set is an interpreter
* version detail, hence the dunder-wide rule at the seam.
*/
const EXCEPTION_RESERVED_MEMBERS = RESERVED_ERROR_MEMBERS;
const DUNDER = DUNDER_MEMBER;
/**
* The `py/` scripts the interpreter must be able to open: the entry script plus
* every module it imports from its own directory. Kept beside the built JS so a
* consumer package with `files: ['lib', 'py']` ships both.
*/
const PY_SCRIPTS = ["bootstrap.py", "protocol.py"];
/**
* Copy the `py/` scripts to a real filesystem directory and return the entry
* script's path there.
*
* The interpreter is an EXTERNAL process, so it can only open paths the OS
* resolves. Inside the single-file Python-SDK executable, `import.meta.url`
* resolves into pkg's virtual filesystem, which Node reads through its patched
* `fs` but `python3` cannot see at all — the spawn fails with ENOENT on a path
* that exists as far as the host is concerned. `bootstrap.py` additionally
* inserts its own directory on `sys.path` to import the sibling `protocol.py`,
* so both files must land in the SAME real directory.
*
* The copy is unconditional rather than gated on a bundled-runtime probe: the
* read goes through Node's `fs` either way, and one code path means the
* packaged deployment runs what the tests exercise. Placement is under
* `os.tmpdir()` with `0o700` keeps the scripts off other users' reach, but NOT
* the model's: the child runs as the same UID as the host, so a program can
* rewrite the very files it was started from. Hence one copy per RUN, discarded
* at settlement — a rewrite then damages only the run that performed it, which
* is what fresh-subprocess-per-run already promises. Sharing one copy across
* runs made an overwritten `bootstrap.py` break the next run.
*
* Deliberately SYNCHRONOUS. An `await` here would open an async boundary in
* `execute` before the run is registered in `live` and before the abort
* listener is installed, so a disposal or an abort landing in that window would
* be missed: `teardown` would see no runs and return while the continuation
* went on to spawn a subprocess, and an `addEventListener('abort')` installed
* afterwards does not replay an event that already fired. Three small
* filesystem operations per run are not worth that class of race, and `execute`
* already runs synchronously up to `spawn`.
*
* A failed copy removes the directory here, so a partial attempt never outlives
* the call that made it; a successful one is the caller's to remove, which it
* derives from the returned path.
*
* @returns the absolute path of the materialized entry script.
*/
function materializePyScripts() {
	const dir = mkdtempSync(join(tmpdir(), "dsh-code-runtime-python-"));
	const source = fileURLToPath(new URL("../py/", import.meta.url));
	try {
		for (const name of PY_SCRIPTS) copyFileSync(join(source, name), join(dir, name));
	} catch (error) {
		try {
			rmSync(dir, {
				recursive: true,
				force: true
			});
		} catch {}
		throw error;
	}
	return join(dir, "bootstrap.py");
}
/**
* A frame's RAW length is capped before JSON.parse: the 64 MiB fd-3 frame
* parse cap bounds the bytes, not the decoded structure, and a compact wide
* frame near that ceiling (e.g. a huge array of tiny elements) could decode to
* far more host memory than the wire admitted — an OOM inside the receive
* path. 64 MiB raw admits every legal config (the widest in-tree completion
* and binding frames are ~12 MB) while bounding decode amplification to a
* roughly constant factor of the wire bytes. The unframed-buffer counter is
* checked against this same cap BEFORE a `Buffer.concat` join, so an oversized
* frame is dropped at one copy of its wire bytes. A hostile-peer invariant,
* not a deployment choice.
*/
const FRAME_PARSE_CAP_BYTES = 64 * 1024 * 1024;
/**
* Fragments the unframed fd-3 buffer may hold before they are coalesced into
* one Buffer, bounding retained per-chunk overhead that the byte cap cannot
* see: the cap meters payload bytes, while each chunk is a distinct Buffer
* with its own object and backing store. A
* program writing single bytes without a newline produced one chunk per write.
* 1024 keeps the overhead a small constant factor of the payload while leaving
* normal pipe-sized reads (which arrive in far fewer, much larger chunks)
* untouched. A framing invariant, not a deployment choice.
*/
const MAX_PENDING_CHUNKS = 1024;
/**
* Replies the host retains before fd 3 accepts them. The drain loop writes one
* reply per iteration and waits for `drain` when the pipe is full; a child
* that never reads its replies (hostile or wedged) leaves the pipe full, so
* every call frame it keeps sending adds a reply the drain cannot write, and
* the backlog would grow without bound until the wall clock. 1024 keeps
* legitimate concurrent gathers (measured queue depths reach 11) far below
* the ceiling while bounding the hostile backlog; the run settles as a
* worker-exit past it, like the frame cap settles an oversized frame. A
* framing invariant, not a deployment choice.
*/
const MAX_PENDING_REPLIES = 1024;
/**
* Bytes a frame spends on its own JSON structure around a capped payload, used
* to bound `maxLogBytes`/`maxValueBytes` against {@link FRAME_PARSE_CAP_BYTES}
* (the receive path rejects raw frames past that cap, settling the run as a
* worker-exit).
* The widest carrier is `{"type":"log","text":"","truncated":true}` at 41
* bytes; 64 rounds that up so adding a field to either frame does not silently
* invalidate the bound. A protocol constant, not a deployment choice.
*/
const FRAME_ENVELOPE_BYTES = 64;
/**
* Smallest `maxLogBytes` the backend can honor. The truncation marker alone
* (`logTruncationMarker`) must serialize within the budget, or a marker-only
* truncated run returns more than the configured cap: the marker text is
* `[dsh-code-runtime-python] log capture truncated at <N> bytes` — 51 fixed
* characters (the bracketed prefix `[dsh-code-runtime-python] log capture
* truncated at ` counts both square brackets) plus the digits of N plus 6 —
* and its serialized form adds 4 (two quotes, two array brackets), so the
* smallest N that admits its own marker is 63 (51 + 2 + 6 + 4 = 63); 64 is the
* floor with one byte of room. The marker itself remains envelope, not
* payload, so a truncated run with admitted entries serializes to at most
* `maxLogBytes + marker + envelope`.
* `maxValueBytes` has no floor beyond the positive-integer requirement: a
* completion can be as small as a single byte (`1`), and the done-frame
* envelope is seam protocol cost, not the advertised completion budget.
*/
const MIN_LOG_BYTES = 64;
/**
* Extra time added to `graceMs` before the post-kill close-deadline force-settles
* a run whose `close` never fires (a setsid-escaped orphan holds our inherited
* stdio; see the `closeDeadline` arm in {@link PythonCodeRuntime.execute}). It
* covers the OS reaping the killed child itself after SIGKILL — not a deployment
* choice but a fixed safety margin, so it is a constant rather than a config knob.
*/
const CLOSE_REAP_MARGIN_MS = 2e3;
/**
* Worst-case peak child-process bytes a one-`maxLogBytes`/`maxValueBytes`-budget
* output can transiently occupy while the child charges and frames it, expressed
* as a multiple of the budget. The child's ledgers trigger on CHARACTER count
* against a serialized-BYTE budget, and an astral character is one character but
* four bytes of CPython `str` storage and four UTF-8 bytes — so a budget's worth
* of astral characters is ~4x the budget in each string that holds it. The
* heaviest path holds THREE such copies at once: a single
* `sys.stdout.write(line + "\n")` keeps the caller's `text` argument (alive for
* the whole `write` call, ~4x), the line slice `text[pos:newline]` handed to
* `LogBuffer.push` (~4x), and the `text.encode("utf-8")` copy `_push_locked`
* takes to charge and ship it (~4x). The settlement `flush_line` path holds only
* two (its `"".join(...)` and that encode copy — it drops the pending chunks
* before pushing), so the newline path is the binding worst case. Twelve covers
* those three simultaneous ~4x copies. The interpreter baseline is NOT in this
* multiple — it is reserved separately as {@link INTERPRETER_BASELINE_BYTES} —
* because it is a fixed cost, not one that scales with the budget. Used to bound
* `maxLogBytes`/`maxValueBytes` against `addressSpaceMb` at load, with a `>=` so
* a budget whose worst-case peak exactly equals the room left after the baseline
* is rejected (that peak plus the baseline is the whole address space, the
* RLIMIT_AS edge), so a legitimate near-budget output truncates (log) or fails
* as `output-limit` (value) rather than breaching `RLIMIT_AS` as `worker-exit`.
* A fixed safety invariant tying the budgets to the address space, not a knob.
*/
const OUTPUT_BUDGET_WORST_CASE_ADDRESS_SPACE_MULTIPLE = 12;
/**
* Fixed address-space headroom reserved for the CPython interpreter itself
* (loaded modules, the asyncio loop, import machinery) before the output-budget
* multiple claims the rest. The budget check subtracts this from `addressSpaceMb`
* so a budget sized right at `addressSpaceMb / MULTIPLE` — which the multiple
* alone would admit — cannot leave the peak output allocation plus the
* interpreter over the limit. Sized against ADDRESS SPACE, which is what
* `RLIMIT_AS` bounds, not resident set: the bootstrap's own measurement is
* 30.23 MiB of mappings for a `python3 -I` child (see `_make_cpu_enforcer`,
* which also records the 64 MiB glibc per-thread arena reservation that pushes
* it to 102.37 MiB when threads are used). 64 MiB is roughly twice the measured
* baseline, leaving room for allocator arenas and import jitter. The value is a
* fixed safety margin, not a deployment knob.
*/
const INTERPRETER_BASELINE_BYTES = 64 * 1024 * 1024;
/**
* Worst-case peak host-heap bytes the PARSE of one inbound fd-3 frame can
* transiently occupy, expressed as a multiple of the frame's raw bytes.
* `JSON.parse` of a wide container materializes the object's property storage
* and key strings on top of the raw text; the WORST shape is a dict of many
* SHORT UNIQUE keys, which forces V8's dictionary-mode property storage
* (~32-64 bytes per entry) plus one interned string per key (header + data)
* plus string-table growth: measured 6.4x for a 3,000,000-key frame (~31 MB
* raw) on a 1 GiB heap, trending up with key count (a flat unique-key array
* is ~4x, a repeated-key dict ~3x). On a constrained heap the parse also
* retains the raw frame string while the object builds, so the safety factor
* is 16x — ~2.5x over the measured worst shape, ~1.6x over the claimed
* GC-headroom bound. Used with the host's configured heap limit to derive the
* largest frame whose parse cannot OOM the host process. This bounds the
* HOST's parse; {@link OUTPUT_BUDGET_WORST_CASE_ADDRESS_SPACE_MULTIPLE} bounds
* the CHILD's build and encode under RLIMIT_AS, a different resource. A fixed
* safety invariant, not a knob.
*/
const HOST_PARSE_WORST_CASE_MULTIPLE = 16;
/**
* Fixed host-heap headroom reserved for the application itself (the dsh
* fiber, plugins, and this runtime's own state) before the frame-parse
* multiple claims the rest: the effective frame cap is derived from
* `heap_size_limit - HOST_PARSE_BASELINE_BYTES`, so a constrained host's
* parse ceiling never spends the application's working set. A fixed safety
* margin, not a knob.
*/
const HOST_PARSE_BASELINE_BYTES = 64 * 1024 * 1024;
/**
* The largest inbound fd-3 frame the HOST can parse without risking a
* process-level OOM on its current heap: the configured heap limit (honoring
* `--max-old-space-size`) minus the application baseline, divided by the
* worst-case parse multiple, floored to the protocol frame cap. The
* raw-byte cap alone does not protect the heap — `JSON.parse` of a
* ≤64 MiB wide-object frame materializes several times that in property
* storage — so the effective cap is the smaller of the two. A default Node
* heap (~4 GiB) never binds; a constrained host (e.g.
* `--max-old-space-size=256` reports a ~300 MiB limit) lowers it to ~14 MiB,
* and the load gate rejects budgets that cannot cross it.
* @param heapLimit - the host's configured heap limit; the live
* `heap_size_limit` when omitted. A parameter so the derivation is unit
* testable against simulated heap sizes.
* @returns the effective frame parse cap in bytes.
*/
function hostFrameParseCeiling(heapLimit = getHeapStatistics().heap_size_limit) {
	return Math.min(FRAME_PARSE_CAP_BYTES, Math.floor((heapLimit - HOST_PARSE_BASELINE_BYTES) / HOST_PARSE_WORST_CASE_MULTIPLE));
}
/**
* Interval between process-group liveness probes while settlement waits for an
* escalated SIGKILL to empty the group (see the `killing` branch in
* {@link PythonCodeRuntime.execute}'s settle). A poll rather than an event
* because the group members are the model's own descendants, which the host does
* not `wait()` for and gets no exit signal from; the probe is a signal-0
* `process.kill(-pid, 0)`, so the interval only bounds how promptly a now-empty
* group is noticed, capped by `graceMs + CLOSE_REAP_MARGIN_MS`.
*/
const GROUP_REAP_POLL_MS = 50;
/**
* Extract a human message from an unknown thrown value.
*
* `String(error)` runs the value's own conversion, and a host binding may reject
* with an object whose `Symbol.toPrimitive` or `toString` throws. One call site
* is a detached async reply callback, where that throw escapes as an unhandled
* rejection: the reply frame is never written, the program stays blocked on
* `await`, and the run degrades to a `maxWallMs` timeout (a Node host without an
* `unhandledRejection` listener exits outright). The conversion is therefore
* wrapped, with a fixed literal as the fallback — the value already proved it
* cannot be rendered, so nothing derived from it is safe to try.
*
* `Error.message` is typed `string` but is a plain writable property, so a
* rejecting binding can hand back an `Error` carrying any value there. The
* `Error` arm therefore goes through the same conversion rather than returning
* `message` verbatim: the returned string crosses the wire under
* `encodeJsonPlain`'s JSON-plain precondition, where a cyclic object grows the
* encoder stack until the host exhausts memory and any other unsupported value
* prevents the reply frame outright.
*
* The same conversion renders abort reasons, which reach an `AbortSignal`
* listener: Node reports a throw from such a listener as an uncaught exception,
* so an unwrapped conversion there can terminate the host with the run left
* unsettled.
*
* @param error The thrown value, of unknown shape.
* @returns The value's message or string form; a fixed placeholder when its own
*   conversion throws.
*/
function messageOf(error) {
	try {
		return String(error instanceof Error ? error.message : error);
	} catch {
		return "<unrenderable rejection value>";
	}
}
/**
* A process's start time, as the identity half of (pid, started).
*
* A pid is reusable the moment the kernel reaps it, so signalling one that a
* later process inherited would terminate an unrelated process group. Start
* time is what distinguishes the original from its replacement: `kill(pid, 0)`
* answers "does this number exist", which is true for both.
*
* Linux reads field 22 of `/proc/<pid>/stat` (starttime in clock ticks); the
* field is positional after the comm field's closing parenthesis, which is
* parsed from the LAST such character because a process name may contain one.
* Darwin has no `/proc`, so the caller gets `undefined` there and `killGroup`
* signals the pgid without the identity re-check rather than paying a `ps`
* fork on a teardown path. Any read failure is `undefined` for the same
* reason: this
* hardens a narrow race and must never be the thing that breaks teardown.
* @param pid - the process to read.
* @returns its start time, or undefined when unavailable.
*/
function readProcessStart(pid) {
	/* v8 ignore next -- one arm per platform: the Linux coverage lane always takes the read path, and Darwin always this one. */
	if (process.platform !== "linux") return void 0;
	try {
		const stat = readFileSync(`/proc/${String(pid)}/stat`, "utf8");
		return stat.slice(stat.lastIndexOf(")") + 2).split(" ")[19];
	} catch {
		return;
	}
}
/**
* Resolve `pythonBin` to one executable absolute path at plugin load. A basename
* (the default `python3`) searches the current process `PATH`; the child receives
* no `PATH`, so Node's own lookup would otherwise fall back to the platform
* default (`/usr/bin:/bin`) and miss interpreters
* that live only on the caller's `PATH` (Nix, pyenv, Homebrew, conda). An
* absolute path is verified in place, and an explicitly relative path is first
* resolved against the load-time working directory. When no candidate is an
* executable regular file, `undefined` is returned and the load check rejects
* the configuration: falling back to the bare name would let spawn's scrubbed env
* execvp silently start a system interpreter from the platform default PATH
* that the caller never asked for.
* @param bin - the configured interpreter (absolute path, relative path, or bare command).
* @returns an absolute path when resolvable, else `undefined`.
*/
function resolvePythonBin(bin) {
	const executableFile = (candidate) => {
		try {
			accessSync(candidate, constants.X_OK);
			return statSync(candidate).isFile() ? candidate : void 0;
		} catch {
			return;
		}
	};
	if (isAbsolute(bin)) return executableFile(bin);
	if (bin.includes("/")) return executableFile(resolve(bin));
	const path = process.env.PATH;
	/* v8 ignore next -- PATH is set in every environment the runtime boots in; the guard is defensive. */
	if (path === void 0) return void 0;
	for (const dir of path.split(delimiter)) {
		if (dir === "" || !isAbsolute(dir)) continue;
		const executable = executableFile(join(dir, bin));
		if (executable !== void 0) return executable;
	}
}
/** Lowest CPython version supported by the bootstrap and its traceback behavior. */
const MIN_CPYTHON = {
	major: 3,
	minor: 10
};
/** Fixed load-time probe bound; a configured executable must not hang plugin activation. */
const PYTHON_PROBE_TIMEOUT_MS = 5e3;
/** The only host environment fact exposed to the child. */
function pythonEnvironment() {
	return { TMPDIR: tmpdir() };
}
/** Fail load unless `bin` is a responsive CPython 3.10+ interpreter. */
function validatePythonBin(bin) {
	let output;
	try {
		output = execFileSync(bin, [
			"-I",
			"-c",
			"import sys; print(sys.implementation.name, sys.version_info.major, sys.version_info.minor, sys.version_info.micro)"
		], {
			encoding: "utf8",
			env: pythonEnvironment(),
			timeout: PYTHON_PROBE_TIMEOUT_MS,
			killSignal: "SIGKILL",
			maxBuffer: 1024
		}).trim();
	} catch (error) {
		throw new Error(`dsh-code-runtime-python: config.pythonBin ${JSON.stringify(bin)} failed the CPython version probe: ${messageOf(error)}`);
	}
	const match = /^(\S+) (\d+) (\d+) (\d+)$/.exec(output);
	if (match === null) throw new Error(`dsh-code-runtime-python: config.pythonBin ${JSON.stringify(bin)} did not report a CPython version`);
	const [, implementation, majorText, minorText, patchText] = match;
	const major = Number(majorText);
	const minor = Number(minorText);
	if (implementation !== "cpython") throw new Error(`dsh-code-runtime-python: config.pythonBin ${JSON.stringify(bin)} must be CPython, got ${implementation}`);
	if (major < MIN_CPYTHON.major || major === MIN_CPYTHON.major && minor < MIN_CPYTHON.minor) throw new Error(`dsh-code-runtime-python: config.pythonBin ${JSON.stringify(bin)} must be CPython ${MIN_CPYTHON.major}.${MIN_CPYTHON.minor} or newer, got ${implementation} ${majorText}.${minorText}.${patchText}`);
}
/** The marker appended when a diagnostic message is byte-capped host-side. */
const TRUNCATION_MARKER = "… [truncated]";
/**
* The marker's own UTF-8 byte length, reserved out of the budget so a capped
* message stays WITHIN `maxValueBytes` rather than exceeding it by the marker.
* The ellipsis is 3 bytes, so this is 15, not the string's 13 code units.
*/
const TRUNCATION_MARKER_BYTES = Buffer.byteLength(TRUNCATION_MARKER, "utf8");
const UTF8_FATAL = new TextDecoder("utf-8", { fatal: true });
/**
* Serialized JSON byte width of one character, given its code point and the
* one-character string. Control characters below 0x20 escape to `\uXXXX` (6)
* except the five with short forms `\b \t \n \f \r` (2); `"` and `\` escape to
* 2; a LONE surrogate escapes to `\uXXXX` (6) under ES2019 well-formed
* `JSON.stringify`; everything else rides at its raw UTF-8 width.
* @param code - the character's code point.
* @param character - the one-character (or one-code-point) string.
* @returns the character's serialized JSON byte width.
*/
function serializedCharCost(code, character) {
	if (code < 32) return code === 8 || code === 9 || code === 10 || code === 12 || code === 13 ? 2 : 6;
	if (code === 34 || code === 92) return 2;
	if (code >= 55296 && code <= 57343) return 6;
	return Buffer.byteLength(character, "utf8");
}
/**
* Serialized JSON-string cost of `text` (the two quotes plus each character's
* escaped byte width), measured WITHOUT materializing the escaped copy, and
* abandoned the instant it exceeds `maxBytes`. `JSON.stringify(text)` would
* allocate the whole escaped form first — up to sixfold a control-char-dense
* string — so a near-budget line under a large `maxLogBytes` could momentarily
* allocate over a gigabyte just to measure it. This walks code point by code
* point (a matched surrogate pair yields its combined code point ≥ 0x10000; a
* lone surrogate yields a value in 0xD800–0xDFFF that {@link serializedCharCost}
* charges the full six escaped bytes) and stops at the cap, allocating nothing.
* @param text - the candidate string.
* @param maxBytes - the largest serialized size the caller can admit.
* @returns the exact serialized byte cost, or `undefined` once it exceeds `maxBytes`.
*/
function jsonStringCostUpTo(text, maxBytes) {
	if (maxBytes < 2) return void 0;
	let bytes = 2;
	for (const character of text) {
		bytes += serializedCharCost(character.codePointAt(0), character);
		if (bytes > maxBytes) return void 0;
	}
	return bytes;
}
/**
* Accrue the serialized JSON cost of raw pipe bytes `buf`, decoding UTF-8 the way
* `toString('utf8')` (WHATWG) would so a byte that renders as U+FFFD is charged
* the three bytes that replacement character serializes to. A naive tally that
* charged every byte 1 let a `b"\xff"` flood (every byte illegal → U+FFFD each)
* grow the residual to a full budget's worth of raw bytes before flushing; near
* a large `maxLogBytes` that retained ~256 MiB, then `flushStray`'s
* `Buffer.concat` + `toString` expanded it to a ~1 GiB peak. Charging only the
* structural width would leave the same gap for structurally-well-formed but
* ILLEGAL sequences a flood produces just as cheaply — a CESU-8 surrogate
* (`ED A0 80`) or an overlong (`E0 80 80`) decodes to THREE U+FFFD (cost 9), not
* one width-3 character, so this validates each lead's first continuation range
* (WHATWG: `E0`→A0-BF, `ED`→80-9F, `F0`→90-BF, `F4`→80-8F, others 80-BF) and
* charges 3 per byte of any sequence that breaks. A control byte below 0x20
* costs 6 (`\uXXXX`) or 2 (five short escapes); `"`/`\` cost 2; ASCII costs 1; a
* fully valid multibyte sequence costs its byte width (2/3/4). `state` carries
* the in-progress sequence across chunks; an unfinished tail at stream end is
* decoded by the final `flushStray` and costed exactly there.
* @param buf - raw bytes from a stdout/stderr pipe chunk.
* @param state - the pipe's carried UTF-8 sequence state, mutated in place.
* @returns the serialized cost accrued by the bytes that resolved in this call.
*/
function accrueStrayCost(buf, state) {
	let cost = 0;
	let index = 0;
	while (index < buf.length) {
		const byte = buf[index];
		if (state.expected > 0) {
			const consumed = state.width - state.expected;
			const lower = consumed === 1 ? state.lowerFirst : 128;
			const upper = consumed === 1 ? state.upperFirst : 191;
			if (byte >= lower && byte <= upper) {
				state.expected -= 1;
				if (state.expected === 0) {
					cost += state.width;
					state.width = 0;
				}
				index += 1;
				continue;
			}
			cost += 3;
			state.expected = 0;
			state.width = 0;
			continue;
		}
		if (byte < 32) cost += byte === 8 || byte === 9 || byte === 10 || byte === 12 || byte === 13 ? 2 : 6;
		else if (byte === 34 || byte === 92) cost += 2;
		else if (byte < 128) cost += 1;
		else if (byte >= 194 && byte <= 223) {
			state.expected = 1;
			state.width = 2;
			state.lowerFirst = 128;
			state.upperFirst = 191;
		} else if (byte >= 224 && byte <= 239) {
			state.expected = 2;
			state.width = 3;
			state.lowerFirst = byte === 224 ? 160 : 128;
			state.upperFirst = byte === 237 ? 159 : 191;
		} else if (byte >= 240 && byte <= 244) {
			state.expected = 3;
			state.width = 4;
			state.lowerFirst = byte === 240 ? 144 : 128;
			state.upperFirst = byte === 244 ? 143 : 191;
		} else cost += 3;
		index += 1;
	}
	return cost;
}
/**
* Cap a done-frame `error.message` to `maxValueBytes` host-side: a forged done
* frame can carry an arbitrarily long message, so truncate by RAW UTF-8 byte
* length and append the shared marker on overflow. Completion VALUES are never
* truncated — the seam forbids substitution, so an oversized value fails the run
* as `output-limit` instead (see the done case in `execute`).
*
* This is the RECEIVE-side backstop, and it bills by raw bytes on purpose,
* unlike the producing-side `_cap_message` in `py/bootstrap.py`, which bills by
* SERIALIZED (JSON-escaped) cost. The split is deliberate: `_cap_message`'s
* output has to cross fd 3 as a JSON string, so its escaped width is what the
* frame ceiling bounds; this function's output goes straight into
* `CodeRunResult.error.message` and never re-crosses a frame-bounded channel, so
* the honest measure of what it retains is the raw length. An honest child has
* already capped the diagnostic by serialized cost, and raw length ≤ serialized
* cost, so a well-formed message passes through unchanged. A forged message with
* control characters could serialize to roughly six times its raw length, but it
* is not travelling any capped channel, so the raw-byte bound is the right one:
* the value it protects is the model-visible size of `error.message`, not a wire
* width.
*
* The marker's bytes are RESERVED from the budget, not added on top: the whole
* returned string, marker included, is at most `maxValueBytes` bytes. Appending
* the marker after retaining a full budget's worth of text would overrun the
* very cap this function exists to enforce. The one exception is a configured
* cap SMALLER than the marker itself, which leaves no room for message text at
* all; the marker alone is returned there, so the bound is
* `max(maxValueBytes, 15)`. Reporting the truncation is worth those 15 bytes,
* and the default cap is 32 KiB.
* @param message - the error message from an inbound (possibly forged) done frame.
* @param maxValueBytes - the configured completion-value budget, reused here.
* @returns the message unchanged, or its byte-capped form on overflow.
*/
function capMessage(message, maxValueBytes) {
	if (message.length * 3 <= maxValueBytes) return message;
	const keep = Math.min(message.length, maxValueBytes);
	const whole = keep === message.length;
	const bytes = Buffer.from(whole ? message : message.slice(0, keep), "utf8");
	if (whole && bytes.length <= maxValueBytes) return message;
	const budget = Math.max(0, maxValueBytes - TRUNCATION_MARKER_BYTES);
	let end = Math.min(budget, bytes.length);
	while (end > 0 && (bytes[end] & 192) === 128) end--;
	return `${bytes.subarray(0, end).toString("utf8")}${TRUNCATION_MARKER}`;
}
/**
* Copy an fd-3 line residual into a fresh, right-sized Buffer so it no longer
* shares the joined-frame allocation it was sliced from.
*
* After the newline loop over a `Buffer.concat` of the pending chunks, the
* leftover partial line is a `subarray` VIEW onto that concat's backing store.
* A view keeps the ENTIRE backing allocation alive for as long as it is
* retained, so carrying the view forward as the next pending chunk would pin a
* whole large frame's worth of memory behind a tiny trailing fragment — and the
* `pendingBytes` counter, set to the fragment's own length, would no longer
* measure the memory actually held. `Buffer.from` allocates exactly
* `residual.length` bytes and copies, letting the concat allocation be
* collected; an empty residual carries nothing forward.
* @param residual - the leftover slice after the last newline (a view).
* @returns the pending-chunk list to carry forward: `[copy]`, or `[]` when empty.
*/
function detachResidual(residual) {
	return residual.length > 0 ? [Buffer.from(residual)] : [];
}
/**
* The experimental {@link CodeRuntime} backend (private, not released) registering as `codeRuntime`. Every
* cap is validated config; every long-running operation honors the request's
* `AbortSignal`; every disposer awaits child-process exit.
*/
var PythonCodeRuntime = class extends CodeRuntime {
	static Config = z.object({
		cpuSeconds: z.number().default(60),
		maxWallMs: z.number().default(6e5),
		addressSpaceMb: z.number().default(512),
		maxLogBytes: z.number().default(65536),
		maxValueBytes: z.number().default(32768),
		graceMs: z.number().default(3e3),
		pythonBin: z.string().default("python3")
	});
	language = "python";
	isolation = "process";
	config;
	pythonBin;
	frameParseCapBytes = hostFrameParseCeiling();
	live = /* @__PURE__ */ new Set();
	disposed = false;
	constructor(ctx, config) {
		super(ctx);
		if (process.platform === "win32") throw new Error("dsh-code-runtime-python: this backend requires a Unix platform (POSIX rlimits, fd-3 stdio, process-group signals); it cannot run on Windows");
		this.config = config;
		for (const [key, value] of Object.entries(this.config)) if (typeof value === "number" && !(Number.isFinite(value) && value > 0)) throw new Error(`dsh-code-runtime-python: config.${key} must be a positive number, got ${String(value)}`);
		if (!Number.isInteger(this.config.cpuSeconds)) throw new Error(`dsh-code-runtime-python: config.cpuSeconds must be a positive integer, got ${String(this.config.cpuSeconds)}`);
		if (!Number.isSafeInteger(this.config.cpuSeconds + 1)) throw new Error(`dsh-code-runtime-python: config.cpuSeconds must be at most ${Number.MAX_SAFE_INTEGER - 1} (it and its +1 hard limit cross to setrlimit as exact integers), got ${String(this.config.cpuSeconds)}`);
		if (!Number.isSafeInteger(this.config.addressSpaceMb * 1024 * 1024)) throw new Error(`dsh-code-runtime-python: config.addressSpaceMb must be at most ${Math.floor(Number.MAX_SAFE_INTEGER / (1024 * 1024))} (its byte count crosses the wire as an exact integer), got ${String(this.config.addressSpaceMb)}`);
		if (this.config.pythonBin === "" || this.config.pythonBin.includes("\0")) throw new Error(`dsh-code-runtime-python: config.pythonBin must be a non-empty path without NUL bytes, got ${JSON.stringify(this.config.pythonBin)}`);
		if (this.config.maxWallMs > MAX_TIMER_DELAY_MS) throw new Error(`dsh-code-runtime-python: config.maxWallMs must not exceed ${MAX_TIMER_DELAY_MS} (setTimeout clamps a larger delay to 1ms), got ${String(this.config.maxWallMs)}`);
		if (this.config.graceMs + CLOSE_REAP_MARGIN_MS > MAX_TIMER_DELAY_MS) throw new Error(`dsh-code-runtime-python: config.graceMs must not exceed ${MAX_TIMER_DELAY_MS - CLOSE_REAP_MARGIN_MS} (its close deadline adds ${CLOSE_REAP_MARGIN_MS}ms, and setTimeout clamps a larger delay to 1ms), got ${String(this.config.graceMs)}`);
		for (const key of ["maxLogBytes", "maxValueBytes"]) {
			if (!Number.isInteger(this.config[key])) throw new Error(`dsh-code-runtime-python: config.${key} must be a positive integer (the child reads it as an int, so a float diverges from the host), got ${String(this.config[key])}`);
			const limit = this.frameParseCapBytes - FRAME_ENVELOPE_BYTES;
			if (this.config[key] > limit) {
				/* v8 ignore next -- the heap-constrained message arm needs a host heap below the protocol cap. */
				const heapNote = this.frameParseCapBytes < FRAME_PARSE_CAP_BYTES ? ` — this host's heap limits the parse to ${this.frameParseCapBytes} bytes, so the protocol cap of ${FRAME_PARSE_CAP_BYTES} would be unsafe` : "";
				throw new Error(`dsh-code-runtime-python: config.${key} must not exceed ${limit} (a payload that large cannot cross the fd-3 frame PARSER, which rejects raw frames past ${this.frameParseCapBytes} bytes before decoding to bound host memory${heapNote} — a larger budget would admit a config whose honest child frames the host then rejects as a worker-exit), got ${String(this.config[key])}`);
			}
			if (key === "maxLogBytes" && this.config[key] < MIN_LOG_BYTES) throw new Error(`dsh-code-runtime-python: config.maxLogBytes must be at least ${MIN_LOG_BYTES} (a smaller budget cannot serialize the truncation marker itself, so a marker-only truncated run would return more than the configured cap), got ${String(this.config[key])}`);
		}
		const addressSpaceBytes = this.config.addressSpaceMb * 1024 * 1024;
		const budgetableBytes = addressSpaceBytes - INTERPRETER_BASELINE_BYTES;
		if (budgetableBytes <= 0) throw new Error(`dsh-code-runtime-python: config.addressSpaceMb must exceed the ${INTERPRETER_BASELINE_BYTES}-byte interpreter baseline with room for the output budgets, so the child has address space left to build and encode them; got ${String(this.config.addressSpaceMb)} MiB (${addressSpaceBytes} bytes)`);
		const admissibleBudget = Math.ceil(budgetableBytes / OUTPUT_BUDGET_WORST_CASE_ADDRESS_SPACE_MULTIPLE) - 1;
		for (const key of ["maxLogBytes", "maxValueBytes"]) if (this.config[key] * OUTPUT_BUDGET_WORST_CASE_ADDRESS_SPACE_MULTIPLE >= budgetableBytes) throw new Error(`dsh-code-runtime-python: config.${key} times the ${OUTPUT_BUDGET_WORST_CASE_ADDRESS_SPACE_MULTIPLE}x worst-case Unicode expansion must fit within the ${budgetableBytes} bytes left after the ${INTERPRETER_BASELINE_BYTES}-byte interpreter baseline within the ${addressSpaceBytes}-byte addressSpaceMb, so a near-budget output truncates rather than breaching RLIMIT_AS as worker-exit; got ${String(this.config[key])} against a limit of ${admissibleBudget}`);
		const pythonBin = resolvePythonBin(this.config.pythonBin);
		if (pythonBin === void 0) {
			const explicit = isAbsolute(this.config.pythonBin) || this.config.pythonBin.includes("/");
			throw new Error(`dsh-code-runtime-python: config.pythonBin ${JSON.stringify(this.config.pythonBin)} ${explicit ? "is not an executable regular file" : "does not resolve on PATH"}`);
		}
		validatePythonBin(pythonBin);
		this.pythonBin = pythonBin;
		ctx.effect(() => () => this.teardown(), "python code-runtime teardown");
	}
	/**
	* Dispose to quiescence: fail every in-flight run as aborted and AWAIT each
	* child's exit so no subprocess that stays in the child's process group
	* outlives the fiber. A descendant that escaped the group with `setsid()` /
	* `start_new_session=True` is unreachable by `kill(-pid)` and is the documented
	* exception (see the package README's Known Limitations); the process-group
	* teardown reaps everything that stays in the group.
	*/
	async teardown() {
		this.disposed = true;
		const runs = [...this.live];
		for (const run of runs) run.settle({
			kind: "abort",
			message: "runtime disposed"
		});
		await Promise.all(runs.map((run) => run.finished));
	}
	/**
	* Execute one program in a fresh Python subprocess. Success resolves with
	* `result.value` (and no `result.error`); failure — parse failure, thrown
	* exception, invalid completion, output overflow, budget expiry, abort, or
	* substrate death — resolves with `result.error` set (classified by
	* `CodeRunFailure.kind`). The method rejects only for seam misuse.
	*/
	async run(request) {
		if (this.disposed) throw new Error("dsh-code-runtime-python: run() after disposal");
		const bindings = this.validateBindings(request);
		if (request.signal?.aborted) return {
			logs: [],
			error: {
				kind: "abort",
				message: messageOf(request.signal.reason)
			}
		};
		let bootstrapPath;
		try {
			bootstrapPath = materializePyScripts();
		} catch (error) {
			return {
				logs: [],
				error: {
					kind: "worker-exit",
					message: `failed to stage the python bootstrap: ${messageOf(error)}`
				}
			};
		}
		return await this.execute(request, bindings, bootstrapPath);
	}
	/**
	* Reject (seam misuse) malformed binding namespaces: non-identifier or
	* reserved globals/error classes, duplicates, and colliding or
	* runtime-owned injected globals.
	*/
	validateBindings(request) {
		const bindings = /* @__PURE__ */ new Map();
		const injectedGlobals = /* @__PURE__ */ new Set();
		const claimGlobal = (name, role) => {
			if (RUNTIME_OWNED_GLOBALS.has(name)) throw new Error(`dsh-code-runtime-python: ${role} ${JSON.stringify(name)} collides with a runtime-owned global`);
			if (injectedGlobals.has(name)) throw new Error(`dsh-code-runtime-python: ${role} ${JSON.stringify(name)} collides with another injected global`);
			injectedGlobals.add(name);
		};
		for (const namespace of request.bindings) {
			const global = namespace.global;
			if (!IDENTIFIER.test(global) || RESERVED_NAMES.has(global)) throw new Error(`dsh-code-runtime-python: binding global ${JSON.stringify(global)} is not a usable Python identifier`);
			if (bindings.has(global)) throw new Error(`dsh-code-runtime-python: duplicate binding global ${JSON.stringify(global)}`);
			claimGlobal(global, "binding global");
			const errorClass = namespace.errorClass;
			let validatedErrorClass;
			if (errorClass) {
				const name = errorClass.name;
				const memberNameProperty = errorClass.memberNameProperty;
				if (!IDENTIFIER.test(name) || RESERVED_NAMES.has(name)) throw new Error(`dsh-code-runtime-python: errorClass.name ${JSON.stringify(name)} is not a usable Python identifier`);
				if (memberNameProperty.length === 0) throw new Error("dsh-code-runtime-python: errorClass.memberNameProperty must be a non-empty attribute name");
				if (EXCEPTION_RESERVED_MEMBERS.has(memberNameProperty) || DUNDER.test(memberNameProperty)) throw new Error(`dsh-code-runtime-python: errorClass.memberNameProperty ${JSON.stringify(memberNameProperty)} is a reserved error member and cannot be assigned`);
				claimGlobal(name, "errorClass.name");
				validatedErrorClass = {
					name,
					memberNameProperty
				};
			}
			const functions = Object.create(null);
			for (const name of Object.keys(namespace.functions)) {
				const fn = namespace.functions[name];
				if (typeof fn === "function") functions[name] = fn;
			}
			bindings.set(global, {
				functions,
				...validatedErrorClass ? { errorClass: validatedErrorClass } : {}
			});
		}
		return bindings;
	}
	/** Spawn the child for one validated run and drive it to settlement. */
	execute(request, bindings, bootstrapPath) {
		const bootstrapDir = dirname(bootstrapPath);
		let child;
		let proto;
		try {
			child = spawn(this.pythonBin, [
				"-u",
				"-I",
				bootstrapPath
			], {
				env: pythonEnvironment(),
				detached: true,
				stdio: [
					"pipe",
					"pipe",
					"pipe",
					"pipe"
				]
			});
			proto = child.stdio[3];
			/* v8 ignore next 3 -- `'pipe'` stdio always populates fd 3; guarding Node's `Stream | null` typing widening. */
			if (proto === null) throw new Error("dsh-code-runtime-python: python subprocess spawned without a fd-3 pipe");
			child.stdin?.destroy();
		} catch (error) {
			try {
				rmSync(bootstrapDir, {
					recursive: true,
					force: true
				});
			} catch {}
			return Promise.resolve({
				logs: [],
				error: {
					kind: "worker-exit",
					message: `python spawn error: ${messageOf(error)}`
				}
			});
		}
		return new Promise((resolve) => {
			let settled = false;
			const logs = [];
			let openParts = [];
			let openSealed = [];
			const truncateLogs = () => {
				logsTruncated = true;
				if (openSealed.length > 0 || openParts.length > 0) {
					logs.push(openSealed.join("") + openParts.join(""));
					openSealed = [];
					openParts = [];
				}
				logs.push(logTruncationMarker(this.config.maxLogBytes));
				clearStray(strayOut);
				clearStray(strayErr);
			};
			let logBudget = this.config.maxLogBytes - 1;
			let logsTruncated = false;
			const clearStray = (stray) => {
				stray.chunks = [];
				stray.blocks = [];
				stray.cost = 0;
				stray.utf8 = {
					expected: 0,
					width: 0,
					lowerFirst: 0,
					upperFirst: 0
				};
			};
			const admit = (text) => {
				if (logsTruncated) return;
				if (text.length + 3 > logBudget) {
					truncateLogs();
					return;
				}
				const measured = jsonStringCostUpTo(text, logBudget - 1);
				if (measured === void 0) {
					truncateLogs();
					return;
				}
				logBudget -= measured + 1;
				logs.push(text);
			};
			const strayOut = {
				chunks: [],
				blocks: [],
				cost: 0,
				utf8: {
					expected: 0,
					width: 0,
					lowerFirst: 0,
					upperFirst: 0
				}
			};
			const strayErr = {
				chunks: [],
				blocks: [],
				cost: 0,
				utf8: {
					expected: 0,
					width: 0,
					lowerFirst: 0,
					upperFirst: 0
				}
			};
			const captureStray = (stray, chunk) => {
				if (logsTruncated) return;
				stray.chunks.push(chunk);
				stray.cost += accrueStrayCost(chunk, stray.utf8);
				if (stray.chunks.length >= MAX_PENDING_CHUNKS) {
					stray.blocks.push(Buffer.concat(stray.chunks));
					stray.chunks = [];
				}
				if (chunk.includes(10)) {
					let buffered = Buffer.concat(stray.blocks.length > 0 ? [...stray.blocks, ...stray.chunks] : stray.chunks);
					stray.blocks = [];
					let newline;
					while ((newline = buffered.indexOf(10)) >= 0) {
						admit(buffered.subarray(0, newline).toString("utf8"));
						buffered = buffered.subarray(newline + 1);
					}
					if (logsTruncated) return;
					stray.chunks = detachResidual(buffered);
					stray.utf8 = {
						expected: 0,
						width: 0,
						lowerFirst: 0,
						upperFirst: 0
					};
					stray.cost = accrueStrayCost(buffered, stray.utf8);
				}
				if (strayOut.cost + strayErr.cost + 3 > logBudget) {
					flushStray(strayOut, true);
					flushStray(strayErr, true);
				}
			};
			function flushStray(stray, retainPartialTail) {
				if (stray.chunks.length === 0 && stray.blocks.length === 0) return;
				let full = Buffer.concat([...stray.blocks, ...stray.chunks]);
				let keep;
				/* v8 ignore next 18 -- mid-sequence budget-flush boundary is not schedulable from a test. */
				if (retainPartialTail && stray.utf8.expected > 0) {
					const drop = Math.min(stray.utf8.width - stray.utf8.expected, full.length);
					keep = full.subarray(full.length - drop);
					full = full.subarray(0, full.length - drop);
					stray.chunks = detachResidual(keep);
					stray.utf8 = {
						expected: 0,
						width: 0,
						lowerFirst: 0,
						upperFirst: 0
					};
					stray.cost = accrueStrayCost(keep, stray.utf8);
					stray.blocks = [];
					if (full.length > 0) admit(full.toString("utf8"));
				} else {
					stray.chunks = [];
					stray.cost = 0;
					stray.utf8 = {
						expected: 0,
						width: 0,
						lowerFirst: 0,
						upperFirst: 0
					};
					stray.blocks = [];
					admit(full.toString("utf8"));
				}
			}
			child.stdout.on("data", (chunk) => {
				captureStray(strayOut, chunk);
			});
			child.stderr.on("data", (chunk) => {
				captureStray(strayErr, chunk);
			});
			child.stdout.on("end", () => {
				flushStray(strayOut);
			});
			child.stderr.on("end", () => {
				flushStray(strayErr);
			});
			let pendingChunks = [];
			let sealedBlocks = [];
			let pendingBytes = 0;
			proto.on("data", (chunk) => {
				/* v8 ignore next -- post-settlement data needs the child to outrace close after we decided. */
				if (settled) return;
				if (!postBatchCheckPending) {
					postBatchCheckPending = true;
					setImmediate(() => {
						postBatchCheckPending = false;
						/* v8 ignore next -- the done frame can settle the run between the schedule and this callback. */
						if (settled) return;
						if (pendingCalls > MAX_PENDING_REPLIES) finish({ error: {
							kind: "worker-exit",
							message: `call backlog exceeded ${MAX_PENDING_REPLIES} in-flight binding calls (a binding never settled)`
						} });
					});
				}
				pendingChunks.push(chunk);
				pendingBytes += chunk.length;
				if (pendingBytes > this.frameParseCapBytes && !chunk.includes(10)) {
					pendingChunks = [];
					sealedBlocks = [];
					pendingBytes = 0;
					finish({ error: {
						kind: "worker-exit",
						message: `protocol frame exceeded ${this.frameParseCapBytes} bytes on fd 3`
					} });
					return;
				}
				if (chunk.includes(10)) {
					let firstFrameLen = 0;
					let sawNewline = false;
					for (const b of sealedBlocks) firstFrameLen += b.length;
					for (const c of pendingChunks) {
						const nl = c.indexOf(10);
						if (nl >= 0) {
							firstFrameLen += nl;
							sawNewline = true;
							break;
						}
						firstFrameLen += c.length;
					}
					if (sawNewline && firstFrameLen > this.frameParseCapBytes) {
						pendingChunks = [];
						sealedBlocks = [];
						pendingBytes = 0;
						finish({ error: {
							kind: "worker-exit",
							message: `protocol frame exceeded ${this.frameParseCapBytes} bytes on fd 3`
						} });
						return;
					}
					let buffered = Buffer.concat(sealedBlocks.length > 0 ? [...sealedBlocks, ...pendingChunks] : pendingChunks);
					sealedBlocks = [];
					let newline;
					while ((newline = buffered.indexOf(10)) >= 0) {
						const line = buffered.subarray(0, newline);
						buffered = buffered.subarray(newline + 1);
						/* v8 ignore next -- an empty line comes only from a forged `\n\n` write. */
						if (line.length === 0) continue;
						let text;
						try {
							text = UTF8_FATAL.decode(line);
						} catch {
							continue;
						}
						if (hasUnsafeIntegerToken(text)) continue;
						let parsed;
						try {
							parsed = JSON.parse(text);
						} catch {
							continue;
						}
						const message = validateChildFrame(parsed);
						if (message) handleFrame(message);
					}
					pendingChunks = detachResidual(buffered);
					pendingBytes = buffered.length;
				} else if (pendingChunks.length >= MAX_PENDING_CHUNKS) {
					sealedBlocks.push(Buffer.concat(pendingChunks));
					pendingChunks = [];
				}
			});
			let nextCallId = 0;
			const bootAckGate = {};
			const handleFrame = (message) => {
				/* v8 ignore next -- late frame after settlement; defensive against forged post-settlement traffic. */
				if (settled) return;
				switch (message.type) {
					case "boot-ack":
						bootAckGate.run?.();
						return;
					case "log":
						if (message.truncated === true) {
							if (!logsTruncated) truncateLogs();
							return;
						}
						if (message.open === true) {
							if (!logsTruncated) {
								const cap = openParts.length === 0 ? logBudget - 1 : logBudget + 2;
								const cost = jsonStringCostUpTo(message.text, cap);
								if (cost === void 0) truncateLogs();
								else {
									const bill = openParts.length === 0 ? cost + 1 : Math.max(cost - 2, 0);
									logBudget -= bill;
									if (message.text !== "") {
										if (openParts.length >= MAX_PENDING_CHUNKS) {
											openSealed.push(openParts.join(""));
											openParts = [];
										}
										openParts.push(message.text);
									}
								}
							}
							return;
						}
						if (openParts.length > 0) {
							/* v8 ignore next -- logsTruncated is an invariant false here: an open
							* frame that would trip the ledger resets openParts, so a non-empty
							* hold implies the ledger never truncated. The guard is defensive. */
							if (!logsTruncated) {
								const cost = jsonStringCostUpTo(message.text, logBudget + 2);
								if (cost === void 0) truncateLogs();
								else {
									logBudget -= Math.max(cost - 2, 0);
									logs.push(openSealed.join("") + openParts.join("") + message.text);
								}
							}
							openSealed = [];
							openParts = [];
							return;
						}
						admit(message.text);
						return;
					case "done": {
						if (pendingCalls > MAX_PENDING_REPLIES) {
							finish({ error: {
								kind: "worker-exit",
								message: `call backlog exceeded ${MAX_PENDING_REPLIES} in-flight binding calls (a binding never settled)`
							} });
							return;
						}
						if (message.error) {
							finish({ error: {
								kind: message.error.kind,
								message: capMessage(message.error.message, this.config.maxValueBytes)
							} });
							return;
						}
						if (message.value === void 0) {
							finish({});
							return;
						}
						const check = checkDoneValue(message.value, this.config.maxValueBytes);
						if (!check.ok) {
							finish(check.reason === "over-budget" ? { error: {
								kind: "output-limit",
								message: `completion value exceeded ${this.config.maxValueBytes} bytes`
							} } : { error: {
								kind: "invalid-output",
								message: "completion value contained a non-lossless number"
							} });
							return;
						}
						finish({ value: message.value });
						return;
					}
					case "call": {
						if (message.id !== nextCallId) return;
						nextCallId += 1;
						const record = bindings.get(message.global)?.functions;
						const fn = record && Object.hasOwn(record, message.name) ? record[message.name] : void 0;
						if (typeof fn !== "function") {
							const cap = this.config.maxValueBytes;
							const target = `${message.global.slice(0, cap)}.${message.name.slice(0, cap)}`;
							const preview = JSON.stringify(target.slice(0, 1024));
							sendReply({
								type: "reply",
								id: message.id,
								ok: false,
								message: capMessage(`unknown binding ${preview}`, cap)
							});
							return;
						}
						pendingCalls += 1;
						(async () => {
							try {
								const resolved = await fn(message.args);
								if (settled) return;
								const value = snapshotJsonValue(resolved);
								if (value === void 0) {
									sendReply({
										type: "reply",
										id: message.id,
										ok: false,
										message: "binding resolution must be lossless JSON"
									});
									return;
								}
								sendReply({
									type: "reply",
									id: message.id,
									ok: true,
									value
								});
							} catch (error) {
								/* v8 ignore next -- a rejection arriving after settlement is not schedulable from a test. */
								if (settled) return;
								sendReply({
									type: "reply",
									id: message.id,
									ok: false,
									message: messageOf(error)
								});
							} finally {
								pendingCalls -= 1;
							}
						})();
						return;
					}
				}
			};
			const replyQueue = [];
			let pendingReplies = 0;
			let pendingCalls = 0;
			let postBatchCheckPending = false;
			let draining = false;
			const waitForDrain = () => new Promise((resolvePromise) => {
				const finish = () => {
					proto.off("drain", finish);
					proto.off("close", finish);
					proto.off("error", finish);
					resolvePromise();
				};
				proto.once("drain", finish);
				proto.once("close", finish);
				proto.once("error", finish);
			});
			const drainReplies = async () => {
				if (draining) return;
				draining = true;
				let head = 0;
				try {
					while (head < replyQueue.length) {
						/* v8 ignore next -- see above; not schedulable from a test. */
						if (settled) break;
						if (proto.destroyed) break;
						const payload = replyQueue[head];
						replyQueue[head] = void 0;
						head += 1;
						pendingReplies -= 1;
						if (head >= MAX_PENDING_REPLIES) {
							replyQueue.splice(0, head);
							head = 0;
						}
						if (!proto.write(`${encodeJsonPlain(payload)}\n`)) await waitForDrain();
					}
				} catch {} finally {
					draining = false;
					pendingReplies = 0;
					replyQueue.length = 0;
				}
			};
			const sendReply = (payload) => {
				/* v8 ignore next -- `settled` covers a race where the child exits between decision and write. */
				if (settled) return;
				if (pendingReplies >= MAX_PENDING_REPLIES) {
					finish({ error: {
						kind: "worker-exit",
						message: `reply queue exceeded ${MAX_PENDING_REPLIES} pending frames on fd 3 (the child stopped consuming its replies)`
					} });
					return;
				}
				pendingReplies += 1;
				replyQueue.push(payload);
				drainReplies();
			};
			let killing = false;
			let graceTimer;
			let closeDeadline;
			const leaderStarted = child.pid === void 0 ? void 0 : readProcessStart(child.pid);
			const killGroup = (sig) => {
				try {
					/* v8 ignore next -- undefined pid means spawn never produced a process; finish() short-circuits before reaching kill(). */
					if (child.pid === void 0) return;
					const nowStarted = readProcessStart(child.pid);
					/* v8 ignore next -- unreachable without real pid reuse; see above. */
					if (leaderStarted !== void 0 && nowStarted !== void 0 && nowStarted !== leaderStarted) return;
					process.kill(-child.pid, sig);
				} catch {}
			};
			const kill = () => {
				/* v8 ignore next -- kill() is idempotent; tests do not double-invoke it. */
				if (killing) return;
				killing = true;
				killGroup("SIGTERM");
				graceTimer = setTimeout(() => {
					killGroup("SIGKILL");
				}, this.config.graceMs);
				graceTimer.unref();
			};
			const groupEmpty = () => {
				/* v8 ignore next -- pid is always defined once escalation runs; the guard narrows the type. */
				if (child.pid === void 0) return true;
				try {
					process.kill(-child.pid, 0);
					return false;
				} catch (error) {
					return error.code === "ESRCH";
				}
			};
			let finishResolve;
			const finished = new Promise((done) => {
				finishResolve = done;
			});
			let resolved = false;
			let decided;
			const settle = (result) => {
				if (resolved) return;
				resolved = true;
				if (closeDeadline !== void 0) clearTimeout(closeDeadline);
				try {
					rmSync(bootstrapDir, {
						recursive: true,
						force: true
					});
				} catch {}
				resolve({
					...result,
					logs
				});
				const finalize = () => {
					this.live.delete(live);
					finishResolve();
				};
				if (!killing || groupEmpty()) {
					if (graceTimer !== void 0) clearTimeout(graceTimer);
					finalize();
					return;
				}
				const deadline = Date.now() + this.config.graceMs + CLOSE_REAP_MARGIN_MS;
				let hardDeadline = 0;
				const pollGroup = () => {
					if (groupEmpty()) {
						clearTimeout(graceTimer);
						finalize();
						return;
					}
					if (hardDeadline === 0 && Date.now() >= deadline) {
						killGroup("SIGKILL");
						clearTimeout(graceTimer);
						hardDeadline = Date.now() + CLOSE_REAP_MARGIN_MS;
					}
					/* v8 ignore next 4 -- reachable only in a PID-1-doesn't-reap container (zombie survivor); not deterministically buildable. */
					if (hardDeadline !== 0 && Date.now() >= hardDeadline) {
						finalize();
						return;
					}
					setTimeout(pollGroup, GROUP_REAP_POLL_MS);
				};
				pollGroup();
			};
			const finish = (result) => {
				if (settled) return;
				settled = true;
				decided = result;
				clearTimeout(wallTimer);
				request.signal?.removeEventListener("abort", onAbort);
				if (openSealed.length > 0 || openParts.length > 0) logs.push(openSealed.join("") + openParts.join(""));
				openSealed = [];
				openParts = [];
				if (child.pid === void 0) {
					settle(result);
					return;
				}
				kill();
				closeDeadline = setTimeout(() => {
					flushStray(strayOut);
					flushStray(strayErr);
					proto.destroy();
					child.stdout.destroy();
					child.stderr.destroy();
					settle(result);
				}, this.config.graceMs + CLOSE_REAP_MARGIN_MS);
				closeDeadline.unref();
			};
			child.on("error", (error) => {
				finish({ error: {
					kind: "worker-exit",
					message: `python spawn error: ${error.message}`
				} });
			});
			child.on("close", (code, signal) => {
				finish(signal === "SIGXCPU" ? { error: {
					kind: "timeout",
					message: `CPU time exhausted (limit at most the configured ${this.config.cpuSeconds}s; a stricter inherited RLIMIT_CPU can fire sooner)`
				} } : { error: {
					kind: "worker-exit",
					message: `python exited (code=${String(code)}, signal=${String(signal)}) before completing`
				} });
				settle(decided);
			});
			const silenceStreamError = () => {};
			proto.on("error", silenceStreamError);
			child.stdout.on("error", silenceStreamError);
			child.stderr.on("error", silenceStreamError);
			const wallTimer = setTimeout(() => {
				finish({ error: {
					kind: "timeout",
					message: `wall-clock ceiling reached (${this.config.maxWallMs}ms)`
				} });
			}, this.config.maxWallMs);
			const onAbort = () => {
				finish({ error: {
					kind: "abort",
					message: messageOf(request.signal?.reason)
				} });
			};
			request.signal?.addEventListener("abort", onAbort, { once: true });
			const live = {
				kill,
				finished,
				settle: (failure) => {
					finish({ error: failure });
				}
			};
			this.live.add(live);
			const boot = {
				type: "boot",
				cpuSeconds: this.config.cpuSeconds,
				addressSpaceBytes: this.config.addressSpaceMb * 1024 * 1024,
				maxLogBytes: this.config.maxLogBytes,
				maxValueBytes: this.config.maxValueBytes,
				namespaces: [...bindings].map(([global, namespace]) => ({
					global,
					names: Object.keys(namespace.functions),
					...namespace.errorClass ? { errorClass: namespace.errorClass } : {}
				}))
			};
			let runSent = false;
			try {
				proto.write(`${JSON.stringify(boot)}\n`);
			} catch (error) {
				finish({ error: {
					kind: "worker-exit",
					message: `failed to boot python subprocess: ${messageOf(error)}`
				} });
				return;
			}
			bootAckGate.run = () => {
				if (runSent) return;
				runSent = true;
				try {
					proto.write(`${JSON.stringify({
						type: "run",
						program: request.program
					})}\n`);
				} catch (error) {
					/* v8 ignore next -- the child exited between its ack and this write; the run settles as worker-exit. */
					finish({ error: {
						kind: "worker-exit",
						message: `failed to boot python subprocess: ${messageOf(error)}`
					} });
				}
			};
		});
	}
};
//#endregion
export { PythonCodeRuntime, PythonCodeRuntime as default, checkDoneValue, detachResidual, encodeJsonPlain, hasNonLosslessNumber, hasUnsafeIntegerToken, hostFrameParseCeiling, logTruncationMarker, readProcessStart, resolvePythonBin, validateChildFrame };
