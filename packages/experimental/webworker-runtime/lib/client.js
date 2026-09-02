//#region src/image-layout.ts
/**
* Leaf name of the packed base image: one gzip member holding the ustar archive.
* The app build writes it beside the page and the page's boot fetches it from
* there, so the extension is part of what a deployment serves.
*/
const IMAGE_FILE_NAME = "vfs-image.tar.gz";
//#endregion
//#region src/fixture-manifest.ts
/** Browser-readable catalog of built-in Preview filesystem overlays. */
/** Manifest format version emitted beside the base VFS image. */
const PREVIEW_FIXTURE_MANIFEST_VERSION = 1;
/** Leaf name resolved beside the base image. */
const PREVIEW_FIXTURE_MANIFEST_FILE = "fixtures.json";
function recordOf(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
/**
* Validate the static fixture catalog before it controls Worker fetches.
* @param value - Parsed JSON response.
* @returns A detached manifest with unique ids and non-empty overlay lists.
*/
function parsePreviewFixtureManifest(value) {
	const record = recordOf(value);
	if (record?.version !== 1 || !Array.isArray(record.fixtures)) throw new Error(`preview fixture manifest must use version ${String(1)}`);
	const fixtures = [];
	const ids = /* @__PURE__ */ new Set();
	for (const value of record.fixtures) {
		const fixture = recordOf(value);
		const id = fixture?.id;
		const label = fixture?.label;
		const description = fixture?.description;
		const overlays = fixture?.overlays;
		const overlayUrls = Array.isArray(overlays) ? overlays.filter((overlay) => typeof overlay === "string" && overlay.length > 0) : [];
		if (typeof id !== "string" || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(id) || id === "none" || id === "webfs" || typeof label !== "string" || label.length === 0 || typeof description !== "string" || description.length === 0 || !Array.isArray(overlays) || overlays.length === 0 || overlayUrls.length !== overlays.length) throw new Error("preview fixture manifest contains an invalid fixture entry");
		if (ids.has(id)) throw new Error(`preview fixture manifest repeats id "${id}"`);
		ids.add(id);
		fixtures.push({
			id,
			label,
			description,
			overlays: overlayUrls
		});
	}
	const defaultFixture = record.defaultFixture;
	if (defaultFixture !== null && (typeof defaultFixture !== "string" || !ids.has(defaultFixture))) throw new Error("preview fixture manifest defaultFixture does not name a fixture");
	return {
		version: 1,
		defaultFixture,
		fixtures
	};
}
//#endregion
//#region src/client/client.ts
/** Error carrying stream semantics across independently bundled Client code. */
var TunnelLogicalStreamError = class extends Error {
	dshRemoteStreamFailure;
	constructor(failure, options) {
		super(failure.message, options);
		this.name = "TunnelLogicalStreamError";
		this.dshRemoteStreamFailure = failure.kind === "remote" ? {
			kind: "remote",
			code: failure.code,
			details: failure.details
		} : { kind: "carrier" };
	}
};
var LogicalStreamInbox = class {
	frames = [];
	wake;
	failed = false;
	failure;
	push(frame) {
		if (this.failed) return;
		this.frames.push(frame);
		this.wake?.();
		this.wake = void 0;
	}
	fail(reason) {
		if (this.failed) return;
		this.failed = true;
		this.failure = reason;
		this.frames.length = 0;
		this.wake?.();
		this.wake = void 0;
	}
	async next() {
		while (this.frames.length === 0) {
			if (this.failed) throw this.failure;
			await new Promise((resolve) => {
				this.wake = resolve;
			});
		}
		return this.frames.shift();
	}
};
/**
* Statuses the worker only produces when the host refused the exchange rather than
* answered it; a route's own 4xx is the tree talking and stays silent here.
*/
const REFUSAL_STATUS = 500;
const encoder = new TextEncoder();
const SOURCE_MAP_TRAILER = /\/\/# sourceMappingURL=([^\r\n]+)\s*$/;
const BASE64_CHUNK_BYTES = 32 * 1024;
/** Encode UTF-8 text for an inline data URL without a call-stack-sized spread. */
function base64(value) {
	const bytes = encoder.encode(value);
	let binary = "";
	for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK_BYTES) binary += String.fromCharCode(...bytes.subarray(offset, offset + BASE64_CHUNK_BYTES));
	return btoa(binary);
}
/** Replace a tunnel-only map reference with a self-contained Base64 data URL. */
async function localizeSourceMap(source, bundleUrl, fetch) {
	const match = SOURCE_MAP_TRAILER.exec(source);
	if (match?.[1] === void 0) return source;
	try {
		const response = await fetch(new URL(match[1], new URL(bundleUrl, globalThis.location.origin)));
		if (!response.ok) return source.replace(SOURCE_MAP_TRAILER, "");
		const dataUrl = `data:application/json;charset=utf-8;base64,${base64(await response.text())}`;
		return source.replace(SOURCE_MAP_TRAILER, `//# sourceMappingURL=${dataUrl}`);
	} catch {
		return source.replace(SOURCE_MAP_TRAILER, "");
	}
}
/** Normalize a RequestInit body to a transferable ArrayBuffer. */
function toBodyBuffer(body) {
	if (body === void 0 || body === null) return void 0;
	if (typeof body === "string") return encoder.encode(body).buffer;
	if (body instanceof ArrayBuffer) return body;
	if (ArrayBuffer.isView(body)) return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
	throw new Error(`web-preview tunnel: unsupported request body ${Object.prototype.toString.call(body)}`);
}
/** Statuses whose Response must carry a null body. */
const NULL_BODY_STATUS = new Set([
	101,
	204,
	205,
	304
]);
/** The page half of the tunnel: one `fetch`-shaped face over `postMessage`. */
var WorkerTunnel = class {
	worker;
	nextId = 1;
	unary = /* @__PURE__ */ new Map();
	bodyStreams = /* @__PURE__ */ new Map();
	logicalStreams = /* @__PURE__ */ new Map();
	/**
	* In-flight request descriptions, so a refusal names what was refused.
	*
	* A tunnel failure and a failure inside the host tree look identical from the
	* page — both surface as one rejected fetch — and the acceptance run keeps the
	* page console but not the frames. Warning here separates the two without
	* recording anything on the normal path, where no refusal frame ever arrives.
	*/
	inFlight = /* @__PURE__ */ new Map();
	/** Body-phase abort listeners, released when their stream settles. */
	releases = /* @__PURE__ */ new Map();
	/**
	* Attach to a spawned worker and start consuming response frames.
	* @param worker - the host worker.
	*/
	constructor(worker) {
		this.worker = worker;
		worker.addEventListener("message", (event) => {
			this.receive(event.data);
		});
		worker.addEventListener("error", (event) => {
			const reason = /* @__PURE__ */ new Error(`web-preview tunnel: worker failed: ${event.message}`);
			for (const id of this.inFlight.keys()) this.warnRefusal(id, `worker failed: ${event.message}`);
			this.inFlight.clear();
			for (const pending of this.unary.values()) pending.reject(reason);
			this.unary.clear();
			for (const controller of this.bodyStreams.values()) controller.error(reason);
			this.bodyStreams.clear();
			const failure = new TunnelLogicalStreamError({
				kind: "carrier",
				message: `web-preview tunnel: worker failed: ${event.message}`
			}, { cause: reason });
			for (const inbox of this.logicalStreams.values()) inbox.fail(failure);
			this.logicalStreams.clear();
			for (const release of this.releases.values()) release();
			this.releases.clear();
		});
	}
	/**
	* Open the tunnel: the worker assembles its host from this frame.
	* @param image - VFS image URL the worker fetches.
	* @param overlays - Ordered data overlay URLs applied before boot.
	*/
	init(image, overlays = []) {
		this.worker.postMessage({
			t: "init",
			image,
			overlays
		});
	}
	/** Fetch-shaped entry: one request frame, one Response (streamed when the worker streams). */
	fetch = async (input, init) => {
		const signal = init?.signal;
		if (signal?.aborted === true) throw new DOMException("The operation was aborted.", "AbortError");
		const id = this.nextId++;
		const frame = {
			t: "req",
			id,
			method: init?.method ?? "GET",
			url: new URL(input, globalThis.location.origin).toString(),
			headers: Object.fromEntries(new Headers(init?.headers).entries()),
			...init?.body === void 0 || init.body === null ? {} : { body: toBodyBuffer(init.body) }
		};
		const response = new Promise((resolve, reject) => {
			this.unary.set(id, {
				resolve,
				reject
			});
		});
		this.inFlight.set(id, `${frame.method} ${frame.url}`);
		this.worker.postMessage(frame);
		if (signal === void 0 || signal === null) return await response;
		const raced = this.rejectOnAbort(id, signal);
		try {
			const settled = await Promise.race([response, raced.rejected]);
			if (this.bodyStreams.has(id)) this.observeStreamAbort(id, signal);
			return settled;
		} finally {
			raced.release();
		}
	};
	/**
	* Open one decoded Gateway Remote stream over the worker-local carrier.
	* @param endpoint - canonical Gateway Remote endpoint.
	* @param payload - decoded endpoint payload.
	* @param signal - logical-stream cancellation.
	* @returns decoded stream values from the worker Host.
	*/
	async *open(endpoint, payload, signal) {
		signal.throwIfAborted();
		const id = this.nextId++;
		const inbox = new LogicalStreamInbox();
		let opened = false;
		let terminal = false;
		const onAbort = () => {
			inbox.fail(signal.reason);
		};
		signal.addEventListener("abort", onAbort, { once: true });
		this.logicalStreams.set(id, inbox);
		this.inFlight.set(id, `STREAM ${endpoint}`);
		try {
			const frame = {
				t: "stream-open",
				id,
				endpoint,
				payload
			};
			try {
				this.worker.postMessage(frame);
				opened = true;
			} catch (cause) {
				throw new TunnelLogicalStreamError({
					kind: "carrier",
					message: `web-preview tunnel: failed to open Remote stream ${endpoint}`
				}, { cause });
			}
			while (true) {
				const response = await inbox.next();
				signal.throwIfAborted();
				if (response.t === "stream-item") {
					yield response.value;
					continue;
				}
				terminal = true;
				if (response.t === "stream-error") throw new TunnelLogicalStreamError(response.failure);
				return;
			}
		} finally {
			signal.removeEventListener("abort", onAbort);
			this.logicalStreams.delete(id);
			this.inFlight.delete(id);
			if (opened && !terminal) this.abortWorkerOperation(id);
		}
	}
	/**
	* Read the pre-cordis boot payload (the injection table).
	* @returns The payload the page applies before the client tree loads.
	*/
	async bootPayload() {
		const response = await this.fetch("/__boot__");
		if (!response.ok) throw new Error(`web-preview tunnel: boot payload failed with HTTP ${String(response.status)}: ${await response.text()}`);
		return await response.json();
	}
	/**
	* `loadBundle` seam: take one client bundle through the tunnel and execute it
	* as a classic script, exactly like the shell's same-origin `<script src>`.
	* The image packs each bundle with a trailing `sourceURL` naming its image
	* path, so the blob shows under that name in the debugger instead of as an
	* anonymous blob entry.
	* @param url - Graph combo URL (`/plugins/??<id>/client.js&rev=...`).
	*/
	async loadBundle(url) {
		const response = await this.fetch(url);
		if (!response.ok) throw new Error(`web-preview tunnel: bundle ${url} failed with HTTP ${String(response.status)}`);
		const source = await localizeSourceMap(await response.text(), url, this.fetch);
		const blob = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
		try {
			await new Promise((resolve, reject) => {
				const el = document.createElement("script");
				el.src = blob;
				el.addEventListener("load", () => {
					el.remove();
					resolve();
				}, { once: true });
				el.addEventListener("error", () => {
					el.remove();
					reject(/* @__PURE__ */ new Error(`web-preview tunnel: bundle ${url} failed to execute`));
				}, { once: true });
				document.head.append(el);
			});
		} finally {
			URL.revokeObjectURL(blob);
		}
	}
	rejectOnAbort(id, signal) {
		let release = () => {};
		return {
			rejected: new Promise((_resolve, reject) => {
				const fail = () => {
					reject(this.abortRequest(id));
				};
				if (signal.aborted) {
					fail();
					return;
				}
				signal.addEventListener("abort", fail, { once: true });
				release = () => {
					signal.removeEventListener("abort", fail);
				};
			}),
			release
		};
	}
	/**
	* Tear down one request the page abandoned: the maps forget it, the worker
	* is told, and a live body stream errors for its reader.
	* @param id - request id being abandoned.
	* @returns The abort error the caller surfaces.
	*/
	abortRequest(id) {
		this.unary.delete(id);
		const controller = this.bodyStreams.get(id);
		this.bodyStreams.delete(id);
		this.inFlight.delete(id);
		this.releases.delete(id);
		this.abortWorkerOperation(id);
		const reason = new DOMException("The operation was aborted.", "AbortError");
		controller?.error(reason);
		return reason;
	}
	/**
	* Hold the caller's signal over the body phase: the head settled, so
	* {@link rejectOnAbort}'s listener is about to go, but a stop must still
	* end the stream. Released when the stream settles.
	* @param id - request id whose body is still crossing.
	* @param signal - the caller's signal.
	*/
	observeStreamAbort(id, signal) {
		const onAbort = () => {
			this.abortRequest(id);
		};
		signal.addEventListener("abort", onAbort, { once: true });
		this.releases.set(id, () => {
			signal.removeEventListener("abort", onAbort);
		});
	}
	/** Release a body-phase abort listener a settled stream no longer needs. */
	releaseSignal(id) {
		const release = this.releases.get(id);
		this.releases.delete(id);
		release?.();
	}
	/** Cancel a stream the consumer stopped reading (the head already resolved). */
	cancelStream(id) {
		this.releaseSignal(id);
		this.bodyStreams.delete(id);
		this.inFlight.delete(id);
		this.abortWorkerOperation(id);
	}
	/** Best-effort cancellation: a failed worker cannot receive the frame anyway. */
	abortWorkerOperation(id) {
		const abort = {
			t: "abort",
			id
		};
		try {
			this.worker.postMessage(abort);
		} catch {}
	}
	/**
	* Report a refusal on the page console, where the acceptance run already keeps it.
	*
	* The prefix names the reporter, not the culprit: a 5xx can equally come from a
	* handler inside the host tree. The message text decides — the worker expands
	* nested causes into it, and its deepest layer is where the failure was thrown.
	* @param id - request id the frame answers.
	* @param outcome - what came back instead of a reply.
	*/
	warnRefusal(id, outcome) {
		console.warn(`web-preview tunnel: request ${String(id)} ${this.inFlight.get(id) ?? "(unknown request)"} → ${outcome}`);
	}
	receive(frame) {
		switch (frame.t) {
			case "res": {
				const pending = this.unary.get(frame.id);
				if (pending === void 0) return;
				if (frame.status >= REFUSAL_STATUS) this.warnRefusal(frame.id, `HTTP ${String(frame.status)}${frame.message === void 0 ? "" : `: ${frame.message}`}`);
				this.unary.delete(frame.id);
				this.inFlight.delete(frame.id);
				const body = NULL_BODY_STATUS.has(frame.status) ? null : frame.body ?? frame.message ?? null;
				pending.resolve(new Response(body, {
					status: frame.status,
					headers: frame.headers
				}));
				return;
			}
			case "res-head": {
				const pending = this.unary.get(frame.id);
				if (pending === void 0) return;
				this.unary.delete(frame.id);
				const stream = new ReadableStream({
					start: (controller) => {
						this.bodyStreams.set(frame.id, controller);
					},
					cancel: () => {
						this.cancelStream(frame.id);
					}
				});
				pending.resolve(new Response(stream, {
					status: frame.status,
					headers: frame.headers
				}));
				return;
			}
			case "res-chunk":
				this.bodyStreams.get(frame.id)?.enqueue(new Uint8Array(frame.chunk));
				return;
			case "res-end": {
				const controller = this.bodyStreams.get(frame.id);
				if (controller === void 0) return;
				this.bodyStreams.delete(frame.id);
				this.inFlight.delete(frame.id);
				this.releaseSignal(frame.id);
				controller.close();
				return;
			}
			case "res-err": {
				const reason = /* @__PURE__ */ new Error(`web-preview tunnel: ${frame.message}`);
				this.warnRefusal(frame.id, `res-err: ${frame.message}`);
				const pending = this.unary.get(frame.id);
				this.inFlight.delete(frame.id);
				if (pending !== void 0) {
					this.unary.delete(frame.id);
					pending.reject(reason);
					return;
				}
				const controller = this.bodyStreams.get(frame.id);
				if (controller === void 0) return;
				this.bodyStreams.delete(frame.id);
				this.releaseSignal(frame.id);
				controller.error(reason);
				return;
			}
			case "stream-item":
			case "stream-end":
			case "stream-error":
				this.logicalStreams.get(frame.id)?.push(frame);
				return;
			default: throw new Error(`web-preview tunnel: unknown frame ${JSON.stringify(frame)}`);
		}
	}
};
//#endregion
//#region src/client/apply-injections.ts
function assertNever(row) {
	throw new Error(`webworker-runtime: unknown index injection row ${JSON.stringify(row)}`);
}
/**
* Execute every row in table order.
* @param rows - Injection table from the boot payload.
* @param loadScript - Executes one script-src row; the tunnel's `loadBundle`,
* because the row URLs (`/plugins/...`) resolve only through the worker.
*/
async function applyIndexInjections(rows, loadScript) {
	for (const row of rows) switch (row.kind) {
		case "global":
			globalThis[row.name] = row.value;
			break;
		case "script": {
			const el = document.createElement("script");
			el.textContent = row.text;
			(row.placement === "head" ? document.head : document.body).append(el);
			break;
		}
		case "script-src":
			await loadScript(row.src);
			break;
		case "script-preload": break;
		case "style": {
			const el = document.createElement("style");
			el.textContent = row.text;
			document.head.append(el);
			break;
		}
		case "html":
			(row.placement === "head" ? document.head : document.body).insertAdjacentHTML("beforeend", row.html);
			break;
		default: assertNever(row);
	}
}
//#endregion
//#region src/client/source-chooser.ts
/** Pre-boot filesystem-source chooser for static WebWorker previews. */
const EMPTY_SOURCE = "none";
const WEBFS_SOURCE = "webfs";
const PREVIEW_FIXTURE_QUERY = "preview-fixture";
const CHOOSER_STYLE = `
  [data-preview-source-chooser] {
    position: fixed;
    inset: 0;
    z-index: 1200;
    display: grid;
    place-items: center;
    overflow: auto;
    padding: 24px;
    box-sizing: border-box;
    color: #0f1115;
    background: #fff;
    font-size: 14px;
    line-height: 22px;
  }
  [data-preview-source-card] {
    width: min(600px, 100%);
    max-height: calc(100dvh - 48px);
    box-sizing: border-box;
    padding: 28px;
    overflow-y: auto;
    border: 1px solid transparent;
    border-radius: 24px;
    background: #fff;
    box-shadow: 0 0 1px rgb(0 0 0 / 20%), 0 12px 32px rgb(0 0 0 / 8%);
  }
  [data-preview-source-card] h1 {
    margin: 0;
    font-size: 20px;
    line-height: 28px;
    font-weight: 500;
  }
  [data-preview-source-card] > p {
    margin: 8px 0 0;
    color: #61666b;
  }
  [data-preview-source-card] fieldset {
    display: flex;
    flex-direction: column;
    gap: 1px;
    margin: 24px 0 0;
    padding: 0;
    border: 0;
  }
  [data-preview-source-card] legend {
    margin: 0 0 8px;
    padding: 0 4px;
    color: #61666b;
    font-size: 13px;
    line-height: 20px;
    font-weight: 500;
  }
  [data-preview-source-option] {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    min-height: 56px;
    padding: 8px 12px 8px 8px;
    box-sizing: border-box;
    border: 1px solid transparent;
    border-radius: 12px;
    background: transparent;
    cursor: pointer;
    transition: background-color 120ms ease, border-color 120ms ease;
  }
  [data-preview-source-option]:hover:not(:has(input:disabled)),
  [data-preview-source-option]:has(input:checked) {
    background: rgb(38 49 72 / 6%);
  }
  [data-preview-source-option]:has(input:checked) {
    border-color: rgb(0 0 0 / 10%);
  }
  [data-preview-source-option]:has(input:disabled) {
    cursor: default;
    opacity: 0.4;
  }
  [data-preview-source-option] input {
    flex: none;
    width: 16px;
    height: 16px;
    margin: 4px 0 0;
    accent-color: #0f1115;
  }
  [data-preview-source-option] > span { flex: 1; min-width: 0; }
  [data-preview-source-option] strong {
    display: block;
    font-size: 14px;
    line-height: 24px;
    font-weight: 500;
  }
  [data-preview-source-option] strong + span {
    display: block;
    color: #81858c;
    font-size: 14px;
    line-height: 24px;
  }
  [data-preview-source-submit] {
    display: block;
    min-width: 120px;
    height: 36px;
    margin: 24px 0 0 auto;
    padding: 0 14px;
    border: 0;
    border-radius: 18px;
    color: #fff;
    background: #0f1115;
    font-size: 14px;
    line-height: 22px;
    cursor: pointer;
    transition: background-color 120ms ease;
  }
  [data-preview-source-submit]:hover:not(:disabled) {
    background: #43454a;
  }
  [data-preview-source-submit]:focus-visible {
    outline: 2px solid rgb(0 0 0 / 16%);
    outline-offset: 2px;
  }
  [data-preview-source-submit]:disabled { cursor: not-allowed; opacity: 0.5; }
  @media (prefers-color-scheme: dark) {
    [data-preview-source-chooser] {
      color: #f9fafb;
      background: #151517;
    }
    [data-preview-source-card] { border-color: rgb(255 255 255 / 6%); background: #2c2c2e; }
    [data-preview-source-card] > p, [data-preview-source-card] legend { color: #cfd3d6; }
    [data-preview-source-option] strong + span { color: #adb2b8; }
    [data-preview-source-option]:hover:not(:has(input:disabled)),
    [data-preview-source-option]:has(input:checked) { background: rgb(255 255 255 / 8%); }
    [data-preview-source-option]:has(input:checked) { border-color: rgb(255 255 255 / 12%); }
    [data-preview-source-option] input { accent-color: #f9fafb; }
    [data-preview-source-submit] { color: #0f1115; background: #f9fafb; }
    [data-preview-source-submit]:hover:not(:disabled) { background: #ebeef2; }
    [data-preview-source-submit]:focus-visible { outline-color: rgb(255 255 255 / 20%); }
  }
  @media (max-width: 560px) {
    [data-preview-source-card] { padding: 24px; }
    [data-preview-source-submit] { width: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    [data-preview-source-option], [data-preview-source-submit] { transition: none; }
  }
`;
const ENTITIES = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;",
	"'": "&#39;"
};
function escapeMarkup(value) {
	return value.replace(/[&<>"']/g, (character) => ENTITIES[character] ?? character);
}
function optionMarkup(choice, selected) {
	return `<label data-preview-source-option>
    <input type="radio" name="preview-source" value="${choice.id}"${choice.id === selected ? " checked" : ""}${choice.disabled === true ? " disabled" : ""}>
    <span>
      <strong>${escapeMarkup(choice.label)}</strong>
      <span>${escapeMarkup(choice.description)}</span>
    </span>
  </label>`;
}
function fixtureChoices(entries, manifestUrl) {
	return entries.map((entry) => ({
		id: entry.id,
		label: entry.label,
		description: entry.description,
		overlays: entry.overlays.map((overlay) => new URL(overlay, manifestUrl))
	}));
}
/**
* Render the source chooser and wait for an enabled selection.
* @param manifestUrl - Built-in fixture catalog URL.
* @returns Ordered overlay URLs selected for the Worker mount.
*/
async function choosePreviewSource(manifestUrl) {
	const requested = new URL(location.href).searchParams.get(PREVIEW_FIXTURE_QUERY);
	if (requested === EMPTY_SOURCE) return [];
	const response = await fetch(manifestUrl);
	if (!response.ok) throw new Error(`preview source chooser: fixture manifest returned ${String(response.status)}`);
	const manifest = parsePreviewFixtureManifest(await response.json());
	const choices = [
		{
			id: EMPTY_SOURCE,
			label: "Empty environment",
			description: "Load only the base runtime to verify first launch and workspace creation.",
			overlays: []
		},
		...fixtureChoices(manifest.fixtures, manifestUrl),
		{
			id: WEBFS_SOURCE,
			label: "WebFS directory",
			description: "Requires directory access and will be available after the WebFS provider lands.",
			overlays: [],
			disabled: true
		}
	];
	if (requested !== null) {
		const requestedChoice = choices.find((choice) => choice.id === requested && choice.disabled !== true);
		if (requestedChoice === void 0) throw new Error(`preview source chooser: unknown or interactive source "${requested}"`);
		return requestedChoice.overlays;
	}
	const root = document.getElementById("root");
	if (root === null) throw new Error("preview source chooser: missing #root");
	const selected = manifest.defaultFixture ?? EMPTY_SOURCE;
	const style = document.createElement("style");
	style.dataset.previewSourceStyle = "";
	style.textContent = CHOOSER_STYLE;
	document.head.append(style);
	const chooser = document.createElement("main");
	chooser.dataset.previewSourceChooser = "";
	chooser.innerHTML = `<form data-preview-source-card aria-labelledby="preview-source-title">
      <h1 id="preview-source-title">Choose Preview data</h1>
      <p>Data mounts before the Worker and application start. Refresh to choose again.</p>
      <fieldset>
        <legend>Filesystem source</legend>
        ${choices.map((choice) => optionMarkup(choice, selected)).join("")}
      </fieldset>
      <button data-preview-source-submit type="submit">Start Preview</button>
    </form>`;
	root.prepend(chooser);
	const form = chooser.querySelector("[data-preview-source-card]");
	if (form === null) throw new Error("preview source chooser: form was not rendered");
	const sourceId = await new Promise((resolve, reject) => {
		form.addEventListener("submit", (event) => {
			event.preventDefault();
			const value = new FormData(form).get("preview-source");
			if (typeof value === "string") resolve(value);
			else reject(/* @__PURE__ */ new Error("preview source chooser: no source selected"));
		}, { once: true });
	});
	const choice = choices.find((candidate) => candidate.id === sourceId && candidate.disabled !== true);
	if (choice === void 0) throw new Error(`preview source chooser: unavailable source "${sourceId}"`);
	chooser.remove();
	style.remove();
	return choice.overlays;
}
//#endregion
//#region src/client/index.ts
/**
* Page half: everything a deployment needs to reach a worker-hosted harness.
*
* This is **pre-Cordis glue, not a client plugin**: it installs the transport
* global and executes the boot injection table that the client plugin graph
* is later loaded through, so it cannot itself be a graph row. A page imports
* it directly and decides where the worker bundle and image live; nothing
* here mounts into a shipped roster.
* @module @deepseek-ai/dsh-experimental-webworker-runtime/client
*/
function bootReadyGate() {
	return globalThis.__DSH_BOOT_READY__ ??= Promise.withResolvers();
}
/**
* Install the page boot barrier before an asynchronous source chooser waits
* for user input. The later {@link connectWorkerHost} call settles the same
* barrier.
*/
function holdWorkerHostBoot() {
	bootReadyGate().promise.catch(() => {});
}
/**
* Run the optional pre-boot source-selection stage. Calling this stage holds
* the stock shell until the caller passes its result to {@link connectWorkerHost};
* callers that need no chooser call `connectWorkerHost` directly and receive
* the base image with an empty overlay list.
* @param options - Base image and optional fixture-catalog locations.
* @returns The ordered overlays selected by the user.
*/
async function chooseWorkerHostSource(options = {}) {
	holdWorkerHostBoot();
	const image = new URL(options.image ?? "vfs-image.tar.gz", document.baseURI);
	const manifest = new URL(options.fixtureManifest ?? "fixtures.json", image);
	try {
		return { overlays: await choosePreviewSource(manifest) };
	} catch (reason) {
		bootReadyGate().reject(reason);
		throw reason;
	}
}
/**
* Connect a spawned host worker and complete the pre-Cordis handshake.
*
* The caller constructs the Worker so its bundler resolves the bundle URL
* statically; the opening `init` frame then carries the base image and ordered
* overlay locations.
*
* Order is fixed by the web boot protocol: the transport global must exist
* before any bundle executes; the injection table then reproduces the served
* boot rows — the `__ModuleLoader__` registration queue, the parser-preload
* bundles, `__DSH_BOOT__`, the theme bootstrap — in table order. The
* boot-readiness deferred (`__DSH_BOOT_READY__`) is installed before the
* first await and settles with the handshake, so a client entry evaluating
* concurrently in the same document holds at its pre-boot await until every
* row has taken effect, and surfaces a failed handshake instead of
* proceeding on missing globals.
* @param worker - The host worker.
* @param options - Base-image and overlay location overrides.
* @returns The connection; hand `loadBundle` to the shell entry's boot seam.
*/
async function connectWorkerHost(worker, options) {
	const ready = bootReadyGate();
	ready.promise.catch(() => {});
	try {
		const tunnel = new WorkerTunnel(worker);
		tunnel.init(new URL(options?.image ?? "vfs-image.tar.gz", document.baseURI).href, (options?.overlays ?? []).map((overlay) => new URL(overlay, document.baseURI).href));
		const payload = await tunnel.bootPayload();
		globalThis.__DSH_TRANSPORT__ = {
			fetch: (input, init) => tunnel.fetch(input, init),
			openStream: (endpoint, payload, signal) => tunnel.open(endpoint, payload, signal),
			loadBundle: (url) => tunnel.loadBundle(url),
			ownsHost: true
		};
		await applyIndexInjections(payload.injections, (src) => tunnel.loadBundle(src));
		ready.resolve();
		return {
			worker,
			tunnel,
			loadBundle: (url) => tunnel.loadBundle(url)
		};
	} catch (reason) {
		ready.reject(reason);
		throw reason;
	}
}
//#endregion
export { IMAGE_FILE_NAME, PREVIEW_FIXTURE_MANIFEST_FILE, PREVIEW_FIXTURE_MANIFEST_VERSION, WorkerTunnel, applyIndexInjections, chooseWorkerHostSource, connectWorkerHost, parsePreviewFixtureManifest };
