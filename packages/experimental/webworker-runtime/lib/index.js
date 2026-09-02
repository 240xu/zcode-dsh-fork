import { parse } from "acorn";
//#region \0rolldown/runtime.js
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
//#endregion
//#region src/polyfill/async-context/als-runtime.ts
/**
* Build the runtime the rewritten code calls.
* @param causality - Snapshot face from the `node:async_hooks` proxy; omitted
*   leaves the rewrite inert (it still hops a microtask, but moves no state).
* @returns Runtime object passed to every module wrapper.
*/
function createAlsRuntime(causality) {
	const snapshot = () => causality?.snapshot();
	const restore = (value) => {
		causality?.restore(value);
	};
	return {
		snapshot,
		pause: (value) => {
			const captured = snapshot();
			return Promise.resolve(value).then((settled) => ({
				ok: true,
				value: settled,
				snapshot: captured
			}), (error) => ({
				ok: false,
				error,
				snapshot: captured
			}));
		},
		resume: (token) => {
			restore(token.snapshot);
			if (token.ok) return token.value;
			throw token.error;
		},
		afterYield: (captured, sent) => {
			restore(captured);
			return sent;
		},
		iterator: (value) => {
			const source = value;
			const asyncFactory = source[Symbol.asyncIterator];
			if (typeof asyncFactory === "function") return asyncFactory.call(source);
			const syncFactory = source[Symbol.iterator];
			if (typeof syncFactory !== "function") throw new TypeError("webworker als: for-await source is neither async nor sync iterable");
			const inner = syncFactory.call(source);
			return {
				next: async (...args) => {
					const step = inner.next(...args);
					return {
						done: step.done ?? false,
						value: await step.value
					};
				},
				return: async (sent) => {
					const step = inner.return?.(sent) ?? {
						done: true,
						value: void 0
					};
					return {
						done: step.done ?? true,
						value: await step.value
					};
				}
			};
		},
		close: async (iterator) => {
			try {
				return await iterator.return?.(void 0);
			} catch {
				return;
			}
		}
	};
}
//#endregion
//#region src/transport/frames.ts
/**
* Validate a `postMessage` payload as a tunnel frame.
* @param data - Message data received by the worker.
* @returns The frame.
*/
function parseInboundFrame(data) {
	if (typeof data !== "object" || data === null) throw new Error(`webworker tunnel: message is not a frame: ${String(data)}`);
	const frame = data;
	if (frame.t === "init") {
		if (typeof frame.image !== "string") throw new Error("webworker tunnel: init frame needs a string image url");
		if (!Array.isArray(frame.overlays) || frame.overlays.some((overlay) => typeof overlay !== "string")) throw new Error("webworker tunnel: init frame needs an array of string overlay urls");
		return {
			t: "init",
			image: frame.image,
			overlays: frame.overlays
		};
	}
	const id = frame.id;
	if (typeof id !== "string" && typeof id !== "number") throw new Error(`webworker tunnel: frame has no usable id: ${JSON.stringify(frame.id)}`);
	if (frame.t === "abort") return {
		t: "abort",
		id
	};
	if (frame.t === "stream-open") {
		if (typeof frame.endpoint !== "string" || frame.endpoint.length === 0) throw new Error(`webworker tunnel: stream ${String(id)} needs a non-empty endpoint`);
		return {
			t: "stream-open",
			id,
			endpoint: frame.endpoint,
			payload: frame.payload
		};
	}
	if (frame.t !== "req") throw new Error(`webworker tunnel: unknown frame type ${JSON.stringify(frame.t)}`);
	if (typeof frame.method !== "string" || typeof frame.url !== "string") throw new Error(`webworker tunnel: request ${String(id)} needs string method and url`);
	if (typeof frame.headers !== "object" || frame.headers === null) throw new Error(`webworker tunnel: request ${String(id)} needs a headers object`);
	const headers = {};
	for (const [key, value] of Object.entries(frame.headers)) if (typeof value === "string") headers[key.toLowerCase()] = value;
	const body = frame.body;
	if (body !== void 0 && !(body instanceof ArrayBuffer)) throw new Error(`webworker tunnel: request ${String(id)} body must be an ArrayBuffer`);
	return {
		t: "req",
		id,
		method: frame.method,
		url: frame.url,
		headers,
		body
	};
}
//#endregion
//#region src/module-system/posix-path.ts
var posix_path_exports = /* @__PURE__ */ __exportAll({
	SEP: () => "/",
	basename: () => basename,
	dirname: () => dirname,
	extname: () => extname,
	fileUrlToPath: () => fileUrlToPath,
	isAbsolute: () => isAbsolute,
	join: () => join,
	normalize: () => normalize,
	parse: () => parse$1,
	pathToFileUrl: () => pathToFileUrl,
	relative: () => relative,
	resolve: () => resolve,
	toNamespacedPath: () => toNamespacedPath
});
/**
* Collapse `.` and `..` segments.
* @param path - Path with any number of separators.
* @returns Normalized path; a relative input keeps leading `..` segments.
*/
function normalize(path) {
	const absolute = path.startsWith("/");
	const trailing = path.length > 1 && path.endsWith("/");
	const out = [];
	for (const segment of path.split("/")) {
		if (segment === "" || segment === ".") continue;
		if (segment === ".." && out.length > 0 && out[out.length - 1] !== "..") {
			out.pop();
			continue;
		}
		if (segment === ".." && absolute) continue;
		out.push(segment);
	}
	const body = out.join("/");
	if (absolute) return "/" + body + (trailing && body !== "" ? "/" : "");
	if (body === "") return trailing ? "./" : ".";
	return body + (trailing ? "/" : "");
}
/**
* Join segments and normalize the result.
* @param segments - Path segments.
* @returns Joined path, `.` when nothing remains.
*/
function join(...segments) {
	const joined = segments.filter((segment) => segment !== "").join("/");
	return joined === "" ? "." : normalize(joined);
}
/**
* Resolve segments right to left against a base directory.
* @param segments - Path segments; the first absolute one wins.
* @returns Absolute normalized path.
*/
function resolve(...segments) {
	let path = "";
	for (const segment of [...segments].reverse()) {
		if (segment === "") continue;
		path = path === "" ? segment : `${segment}/${path}`;
		if (segment.startsWith("/")) break;
	}
	return normalize(path.startsWith("/") ? path : `/${path}`);
}
/**
* Directory part of a path, after normalization (see the module note).
* @param path - Path to inspect.
* @returns Parent path; `/` for root children and `.` for bare names.
*/
function dirname(path) {
	const normalized = normalize(path).replace(/\/+$/, "");
	const index = normalized.lastIndexOf("/");
	if (index < 0) return ".";
	if (index === 0) return "/";
	return normalized.slice(0, index);
}
/**
* Last segment of a path, after normalization (see the module note).
* @param path - Path to inspect.
* @param suffix - Optional suffix to strip.
* @returns Final segment.
*/
function basename(path, suffix) {
	const normalized = normalize(path).replace(/\/+$/, "");
	const name = normalized.slice(normalized.lastIndexOf("/") + 1);
	if (suffix !== void 0 && suffix !== name && name.endsWith(suffix)) return name.slice(0, -suffix.length);
	return name;
}
/**
* Extension of the last segment, dot included.
* @param path - Path to inspect.
* @returns Extension, or an empty string when there is none.
*/
function extname(path) {
	const name = basename(path);
	const index = name.lastIndexOf(".");
	return index <= 0 ? "" : name.slice(index);
}
/**
* Report whether a path starts at the root.
* @param path - Path to inspect.
* @returns True for absolute paths.
*/
function isAbsolute(path) {
	return path.startsWith("/");
}
/**
* Relative path from one absolute path to another.
* @param from - Source directory.
* @param to - Target path.
* @returns Relative path using `..` segments.
*/
function relative(from, to) {
	const source = resolve(from).split("/").filter((segment) => segment !== "");
	const target = resolve(to).split("/").filter((segment) => segment !== "");
	let shared = 0;
	while (shared < source.length && shared < target.length && source[shared] === target[shared]) shared += 1;
	return [...new Array(source.length - shared).fill(".."), ...target.slice(shared)].join("/");
}
/**
* Split a path into components, after normalization (see the module note).
* @param path - Path to split.
* @returns Root, directory, base name, extension, and stem.
*/
function parse$1(path) {
	const root = isAbsolute(path) ? "/" : "";
	const base = basename(path);
	const ext = extname(path);
	return {
		root,
		dir: dirname(path),
		base,
		ext,
		name: ext === "" ? base : base.slice(0, -ext.length)
	};
}
/**
* Node's Windows-only namespaced-path conversion.
* @param path - the path to convert.
* @returns The path unchanged; namespaced paths are a Windows concept.
*/
function toNamespacedPath(path) {
	return path;
}
/**
* Convert a VFS path into a `file:` URL string.
* @param path - Absolute VFS path.
* @returns URL text with each segment percent-encoded.
*/
function pathToFileUrl(path) {
	return `file://${resolve(path).split("/").map((segment) => encodeURIComponent(segment)).join("/")}`;
}
/**
* Convert a `file:` URL back into a VFS path.
* @param url - URL text or URL instance.
* @returns Absolute VFS path.
*/
function fileUrlToPath(url) {
	const text = typeof url === "string" ? url : url.href;
	if (!text.startsWith("file://")) throw new Error(`webworker vfs: not a file URL: ${text}`);
	return decodeURIComponent(text.slice(7).replace(/[?#].*$/, "")) || "/";
}
//#endregion
//#region src/image-layout.ts
/**
* Image layout contract shared by the packer and the worker host: the virtual
* root, where the composed config and the manifest sit inside the image, and
* the working directories every image carries empty. One definition, two
* consumers — the packer writes this layout, the worker host mounts it.
*/
/** Default virtual root; the runtime mounts the image here unless told otherwise. */
const DEFAULT_ROOT = "/dsh";
/**
* Leaf name of the packed base image: one gzip member holding the ustar archive.
* The app build writes it beside the page and the page's boot fetches it from
* there, so the extension is part of what a deployment serves.
*/
const IMAGE_FILE_NAME = "vfs-image.tar.gz";
/** Image path the composed profile is written to; the runtime's Loader reads it. */
const IMAGE_CONFIG_PATH = "config/cordis.yml";
/** Image path of the manifest the runtime reads before it wraps a single module. */
const IMAGE_MANIFEST_PATH = "config/vfs-manifest.json";
/** Home directory under the root; the process shim's `DSH_HOME`/`HOME` default. */
const IMAGE_HOME_DIRECTORY = "home";
/** Working directories the host tree expects to exist, empty. */
const IMAGE_EMPTY_DIRECTORIES = [
	"home/",
	"workspace/",
	"tmp/"
];
/**
* Top-level directories an overlay archive may populate. Runtime code,
* configuration, and the lowering manifest remain owned by the base image.
*/
const IMAGE_OVERLAY_DIRECTORIES = ["home", "workspace"];
/**
* Identity of the lowered code shape, recorded in the image manifest by the
* packer and required by the worker host: an image lowered by an older transform
* would otherwise run against newer wrapper semantics. Bump on any change to
* emitted code or to {@link WRAPPER_PARAMS}.
*/
const LOWERING_VERSION = "dsh-worker-transform/1";
/**
* Free variables a lowered body expects from its wrapper, in order.
*
* Part of the image layout rather than of the transform, because the loader
* wraps bodies it never parses: the packer emits against these names and the
* worker binds them, with no compiler in the worker bundle to agree with.
*/
const WRAPPER_PARAMS = [
	"exports",
	"require",
	"module",
	"__filename",
	"__dirname",
	"__dsh$meta",
	"__als"
];
//#endregion
//#region src/module-system/module-loader.ts
/**
* CommonJS module loader over the worker VFS. It fills the `loader.internal`
* seam Cordis uses for every entry import, and backs the `node:module`
* `createRequire` proxy that `typert-loader`, `client-modules`, and the plugin
* package inventory resolve package metadata through.
*
* Resolution is a narrowed Node `require` algorithm: `exports` walk with a
* fixed condition order, extension probing, and one cache keyed by resolved
* absolute path. Module bodies are wrapped as the image holds them: lowering is
* the packer's job, so nothing here parses JavaScript.
* @module @deepseek-ai/dsh-experimental-webworker-runtime/src/module-system/module-loader
*/
/** Condition keys honoured in `exports`, in order; `node` is deliberately absent. */
const DEFAULT_CONDITIONS = [
	"browser",
	"require",
	"import",
	"default"
];
/** Extensions probed when a specifier has no usable one. */
const EXTENSIONS = [
	".js",
	".json",
	".mjs",
	".cjs"
];
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
/** Loader for one VFS mount; construct once per worker. */
var WorkerModuleLoader = class {
	vfs;
	root;
	staticModules;
	staticPrefixes;
	conditions;
	als;
	modules = /* @__PURE__ */ new Map();
	manifests = /* @__PURE__ */ new Map();
	stack = [];
	/**
	* The Cordis module seam. `parentURL` positions relative specifiers;
	* import attributes are ignored, as the client implementation does.
	*/
	internal;
	constructor(options) {
		this.vfs = options.vfs;
		this.root = options.root ?? "/dsh";
		this.staticModules = new Map(Object.entries(options.staticModules));
		this.staticPrefixes = Object.entries(options.staticModulePrefixes ?? {}).sort(([left], [right]) => right.length - left.length);
		this.conditions = new Set(options.conditions ?? DEFAULT_CONDITIONS);
		this.als = createAlsRuntime(options.alsCausality);
		const resolveInternal = (specifier, parentURL) => {
			const from = parentURL === void 0 ? this.root : this.baseDirectoryOf(parentURL);
			const resolution = this.resolve(specifier, from);
			if (resolution.kind === "static") return {
				format: "builtin",
				url: resolution.specifier
			};
			return {
				format: resolution.path.endsWith(".json") ? "json" : "commonjs",
				url: pathToFileUrl(resolution.path)
			};
		};
		this.internal = {
			version: "worker",
			import: async (specifier, parentURL) => {
				const from = parentURL === void 0 ? this.root : this.baseDirectoryOf(parentURL);
				return this.load(this.resolve(specifier, from));
			},
			resolve: async (specifier, parentURL) => resolveInternal(specifier, parentURL),
			resolveSync: resolveInternal
		};
	}
	fail(detail) {
		const chain = this.stack.length === 0 ? "" : ` (importer chain: ${this.stack.join(" -> ")})`;
		throw new Error(`webworker modules: ${detail}${chain}`);
	}
	/** @returns Directory a base path or URL resolves specifiers from. */
	baseDirectoryOf(base) {
		const text = typeof base === "string" ? base : base.href;
		const path = text.startsWith("file://") ? fileUrlToPath(text) : text;
		if (path.endsWith("/")) return resolve(path);
		return this.vfs.existsSync(path) && this.vfs.statSync(path).isDirectory() ? resolve(path) : dirname(path);
	}
	manifestOf(directory) {
		const cached = this.manifests.get(directory);
		if (cached !== void 0) return cached;
		const path = join(directory, "package.json");
		const text = this.vfs.readFileSync(path, "utf8");
		let parsed;
		try {
			parsed = JSON.parse(text);
		} catch (reason) {
			this.fail(`${path} is not valid JSON: ${reason.message}`);
		}
		if (!isRecord(parsed)) this.fail(`${path} does not hold an object`);
		const manifest = parsed;
		this.manifests.set(directory, manifest);
		return manifest;
	}
	/** Walk one `exports` value against the condition set and requested subpath. */
	selectExport(field, subpath, packageName) {
		if (field === null) return void 0;
		if (typeof field === "string") return subpath === "." ? field : void 0;
		if (Array.isArray(field)) {
			for (const candidate of field) {
				const picked = this.selectExport(candidate, subpath, packageName);
				if (picked !== void 0) return picked;
			}
			return;
		}
		const entries = Object.entries(field);
		if (!entries.some(([key]) => key === "." || key.startsWith("./"))) {
			if (subpath !== ".") return void 0;
			return this.selectCondition(field, packageName);
		}
		for (const [key, value] of entries) if (key === subpath) return typeof value === "string" ? value : this.selectCondition(value, packageName, subpath);
		for (const [key, value] of entries) {
			const star = key.indexOf("*");
			if (star < 0) continue;
			const prefix = key.slice(0, star);
			const suffix = key.slice(star + 1);
			if (!subpath.startsWith(prefix) || !subpath.endsWith(suffix)) continue;
			const captured = subpath.slice(prefix.length, subpath.length - suffix.length);
			const target = typeof value === "string" ? value : this.selectCondition(value, packageName, subpath);
			if (target !== void 0) return target.replaceAll("*", captured);
		}
	}
	/** Pick the first condition branch this runtime satisfies. */
	selectCondition(field, packageName, subpath = ".") {
		if (field === null) return void 0;
		if (typeof field === "string") return field;
		if (Array.isArray(field)) {
			for (const candidate of field) {
				const picked = this.selectCondition(candidate, packageName, subpath);
				if (picked !== void 0) return picked;
			}
			return;
		}
		for (const [key, value] of Object.entries(field)) {
			if (!this.conditions.has(key)) continue;
			const picked = this.selectCondition(value, packageName, subpath);
			if (picked !== void 0) return picked;
		}
	}
	/** Extension and directory probing for a concrete path. */
	probe(path, specifier) {
		const candidates = [path, ...EXTENSIONS.map((extension) => path + extension)];
		for (const candidate of candidates) if (this.vfs.existsSync(candidate) && this.vfs.statSync(candidate).isFile()) return candidate;
		if (this.vfs.existsSync(path) && this.vfs.statSync(path).isDirectory()) {
			if (this.vfs.existsSync(join(path, "package.json"))) {
				const main = this.manifestOf(path).main;
				if (main !== void 0) return this.probe(join(path, main), specifier);
			}
			return this.probe(join(path, "index"), specifier);
		}
		return this.fail(`cannot resolve "${specifier}": no file at ${candidates.join(", ")}`);
	}
	/** @returns The Worker-provided implementation of a static specifier. */
	staticModule(specifier) {
		const exact = this.staticModules.get(specifier);
		if (exact !== void 0) return exact;
		for (const [prefix, factory] of this.staticPrefixes) if (specifier.startsWith(prefix)) return factory;
		return this.staticModules.get(`node:${specifier}`);
	}
	/**
	* Resolve a specifier the way the module that requested it would.
	* @param specifier - Bare name, relative path, absolute path, or file URL.
	* @param fromDirectory - Directory of the requesting module.
	* @returns Static module or the resolved VFS path.
	*/
	resolve(specifier, fromDirectory) {
		const staticModule = this.staticModule(specifier);
		if (staticModule !== void 0) return {
			kind: "static",
			specifier,
			factory: staticModule
		};
		if (specifier.startsWith("cordis:") || specifier.startsWith("node:")) return this.fail(`no static module is registered for "${specifier}"`);
		if (specifier.startsWith("file://")) return {
			kind: "file",
			path: this.probe(fileUrlToPath(specifier), specifier)
		};
		if (specifier.startsWith(".")) return {
			kind: "file",
			path: this.probe(join(fromDirectory, specifier), specifier)
		};
		if (isAbsolute(specifier)) return {
			kind: "file",
			path: this.probe(specifier, specifier)
		};
		const segments = specifier.split("/");
		const packageName = specifier.startsWith("@") ? segments.slice(0, 2).join("/") : segments[0] ?? specifier;
		const rest = specifier.slice(packageName.length).replace(/^\//, "");
		const packageDirectory = join(this.root, "node_modules", packageName);
		if (!this.vfs.existsSync(join(packageDirectory, "package.json"))) return this.fail(`cannot resolve "${specifier}": ${packageDirectory}/package.json is not in the image`);
		const manifest = this.manifestOf(packageDirectory);
		const subpath = rest === "" ? "." : `./${rest}`;
		if (manifest.exports !== void 0) {
			const target = this.selectExport(manifest.exports, subpath, packageName);
			if (target === void 0) return this.fail(`"${packageName}" does not export "${subpath}" under conditions [${[...this.conditions].join(", ")}]`);
			return {
				kind: "file",
				path: this.probe(join(packageDirectory, target), specifier)
			};
		}
		const legacy = subpath === "." ? manifest.main ?? "index.js" : rest;
		return {
			kind: "file",
			path: this.probe(join(packageDirectory, legacy), specifier)
		};
	}
	/**
	* Load a resolved module, reusing the cache and tolerating cycles with
	* CommonJS partial-export semantics.
	* @param resolution - Result of {@link resolve}.
	* @returns The module's exports.
	*/
	load(resolution) {
		if (resolution.kind === "static") return resolution.factory();
		const path = resolution.path;
		const cached = this.modules.get(path);
		if (cached !== void 0) return cached.module.exports;
		if (path.endsWith(".json")) {
			const parsed = JSON.parse(this.vfs.readFileSync(path, "utf8"));
			this.modules.set(path, { module: { exports: parsed } });
			return parsed;
		}
		const record = { module: { exports: {} } };
		this.modules.set(path, record);
		this.stack.push(path);
		try {
			const source = this.vfs.readFileSync(path, "utf8");
			const factory = this.compile(source, path);
			const directory = dirname(path);
			factory(record.module.exports, this.requireFrom(directory), record.module, path, directory, {
				url: pathToFileUrl(path),
				resolve: (specifier) => {
					const resolution = this.resolve(specifier, directory);
					return resolution.kind === "static" ? resolution.specifier : pathToFileUrl(resolution.path);
				}
			}, this.als);
			return record.module.exports;
		} catch (reason) {
			this.modules.delete(path);
			throw reason;
		} finally {
			this.stack.pop();
		}
	}
	/**
	* Compile a body the image already lowered.
	*
	* Module syntax reaching here means the image was packed by something other
	* than the packer, or its collector missed the entry. The worker carries no
	* transform to recover with, so it names the image as the thing to rebuild.
	* @param code - Module body as the image holds it.
	* @param path - Resolved VFS path.
	* @returns The wrapper factory.
	*/
	compile(code, path) {
		try {
			return new Function(...WRAPPER_PARAMS, code);
		} catch (reason) {
			if (reason instanceof SyntaxError && /await/i.test(reason.message)) this.fail(`${path} uses top-level await, which cannot run as CommonJS in the worker: ${reason.message}`);
			if (reason instanceof SyntaxError && /import|export/i.test(reason.message)) this.fail(`${path} still carries module syntax, so the image was not lowered by the packer (${reason.message}); rebuild the image`);
			this.fail(`${path} failed to compile: ${reason.message}`);
		}
	}
	/**
	* Build a `require` bound to a directory.
	* @param fromDirectory - Directory relative specifiers resolve against.
	* @returns Callable require with `resolve`.
	*/
	requireFrom(fromDirectory) {
		const require = (specifier) => this.load(this.resolve(specifier, fromDirectory));
		const resolve$1 = ((specifier) => {
			const resolution = this.resolve(specifier, fromDirectory);
			if (resolution.kind === "static") return this.fail(`"${specifier}" is a worker-provided module and has no VFS path`);
			return resolution.path;
		});
		resolve$1.paths = (specifier) => {
			if (this.staticModule(specifier) !== void 0 || specifier.startsWith("node:")) return null;
			if (specifier.startsWith(".")) return [resolve(fromDirectory, ".")];
			return [join(this.root, "node_modules")];
		};
		return Object.assign(require, { resolve: resolve$1 });
	}
	/**
	* `node:module` `createRequire` for the VFS.
	* @param base - Module path, directory path, or `file:` URL.
	* @returns Require bound to that base.
	*/
	createRequire(base) {
		return this.requireFrom(this.baseDirectoryOf(base));
	}
	/**
	* Report what this loader has done, for the host's boot diagnostics.
	* @returns How many module bodies it has run.
	*/
	usage() {
		return { modules: this.modules.size };
	}
};
let active$1;
/**
* Publish the loader the `node:module` proxy resolves through.
* @param loader - Loader built by the worker entry.
*/
function setActiveModuleLoader(loader) {
	active$1 = loader;
}
/**
* Read the published loader.
* @returns The active loader.
*/
function requireActiveModuleLoader() {
	if (active$1 === void 0) throw new Error("webworker modules: no loader is mounted; the worker entry must call setActiveModuleLoader before any createRequire use");
	return active$1;
}
//#endregion
//#region src/transport/synthetic-http.ts
const encoder$3 = new TextEncoder();
/**
* Build the request/response pair for one tunnel request.
*
* `res.end()` is the settle point: the captured listener returns void, so the
* response object itself reports completion. `write()` always returns true,
* which skips backpressure waiting the tunnel cannot observe anyway.
* @param frame - Validated request frame.
* @param sink - Frame emitter for the response.
* @returns The pair handed to the captured request listener.
*/
function createSyntheticExchange(frame, sink) {
	const listeners = /* @__PURE__ */ new Map();
	let status = 200;
	let headers = {};
	let streaming = false;
	let finished = false;
	let aborted = false;
	const emit = (event) => {
		for (const callback of [...listeners.get(event) ?? []]) callback();
	};
	const req = {
		url: frame.url,
		method: frame.method,
		headers: frame.headers,
		destroy: () => {
			aborted = true;
		},
		async *[Symbol.asyncIterator]() {
			if (frame.body === void 0 || frame.body.byteLength === 0) return;
			yield new Uint8Array(frame.body);
		}
	};
	const res = {
		writeHead: (nextStatus, nextHeaders) => {
			status = nextStatus;
			if (nextHeaders !== void 0) {
				headers = {};
				for (const [key, value] of Object.entries(nextHeaders)) headers[key.toLowerCase()] = String(value);
			}
			return res;
		},
		write: (chunk) => {
			if (finished || aborted) return false;
			if (!streaming) {
				streaming = true;
				sink.head(status, headers);
			}
			sink.chunk(typeof chunk === "string" ? encoder$3.encode(chunk) : chunk);
			return true;
		},
		end: (body) => {
			if (finished) return res;
			finished = true;
			const bytes = body === void 0 ? void 0 : typeof body === "string" ? encoder$3.encode(body) : body;
			if (streaming) {
				if (bytes !== void 0) sink.chunk(bytes);
				sink.end();
			} else sink.end({
				status,
				headers,
				body: bytes
			});
			emit("close");
			return res;
		},
		destroy: () => {
			if (finished) return;
			finished = true;
			sink.fail(`response destroyed for ${frame.method} ${frame.url}`);
			emit("close");
		},
		on: (event, callback) => {
			const set = listeners.get(event) ?? /* @__PURE__ */ new Set();
			set.add(callback);
			listeners.set(event, set);
			return res;
		},
		off: (event, callback) => {
			listeners.get(event)?.delete(callback);
			return res;
		}
	};
	res.once = res.on;
	Object.defineProperty(res, "headersSent", { get: () => streaming });
	Object.defineProperty(res, "writableEnded", { get: () => finished });
	return {
		req,
		res,
		get aborted() {
			return aborted;
		},
		abort: () => {
			if (finished) return;
			aborted = true;
			finished = true;
			emit("close");
		}
	};
}
//#endregion
//#region src/compile/transform.ts
/**
* The worker's module transform: one acorn parse turns an ES module into a
* CommonJS body **and** routes every suspension point through the ambient-store
* protocol.
*
* Both jobs live in one pass because they are two edits over one syntax tree;
* running a lexer first and a parser second meant two scanners, two sets of
* blind spots, and a second pass reading the first pass's output. Editing is
* interval-based — the original text is sliced and spliced, never reprinted —
* so **line numbers survive**: a stack frame in a transformed module points at
* the same line as the built artifact it came from.
*
* The image packer is this transform's only caller: it lowers every JavaScript
* entry it packs and records `LOWERING_VERSION` in the image manifest, so the
* worker wraps those bodies without carrying a compiler of its own.
* @module @deepseek-ai/dsh-experimental-webworker-runtime/src/compile/transform
*/
const HELPER_SOURCE = {
	def: "const __dsh$def=(t,k,get)=>Object.defineProperty(t,k,{enumerable:true,configurable:true,get});",
	default: "const __dsh$default=(m)=>(m&&m.__esModule?m.default:m);",
	ns: "const __dsh$ns=(m)=>(m&&m.__esModule?m:Object.assign({},m,{default:m}));",
	exportAll: "const __dsh$exportAll=(t,m)=>{for(const k of Object.keys(m))if(k!==\"default\"&&!(k in t))__dsh$def(t,k,()=>m[k]);};",
	dynImport: "const __dsh$dynImport=(s)=>Promise.resolve().then(()=>__dsh$ns(require(s)));"
};
const HELPER_DEPENDENCIES = {
	exportAll: ["def"],
	dynImport: ["ns"]
};
/** Runtime identifier the suspension protocol reaches. */
const ALS = "__als";
/** @returns Number of line breaks in a slice. */
function countNewlines(text) {
	let count = 0;
	for (let index = text.indexOf("\n"); index >= 0; index = text.indexOf("\n", index + 1)) count += 1;
	return count;
}
var Transformer = class {
	path;
	edits = [];
	source;
	helpers = /* @__PURE__ */ new Set();
	bindings = [];
	modules = 0;
	temporaries = 0;
	moduleSyntax = false;
	moduleRequests = /* @__PURE__ */ new Set();
	metaResolveRequests = /* @__PURE__ */ new Set();
	createRequireBindings = /* @__PURE__ */ new Set();
	constructor(source, path) {
		this.path = path;
		this.source = source.startsWith("#!") ? `//${source.slice(2)}` : source;
	}
	fail(detail, index) {
		const line = this.source.slice(0, index).split("\n").length;
		throw new Error(`webworker transform: ${detail} (${this.path}:${line})`);
	}
	helper(name) {
		for (const dependency of HELPER_DEPENDENCIES[name] ?? []) this.helper(dependency);
		this.helpers.add(name);
		return `__dsh$${name}`;
	}
	moduleTemp() {
		this.modules += 1;
		return `__dsh$m${this.modules}`;
	}
	alsTemp() {
		this.temporaries += 1;
		return `__als$${this.temporaries}`;
	}
	/**
	* Replace a range, keeping the module's line count.
	*
	* The padding is the newlines the original range held **minus** the ones the
	* replacement re-emits: a rewrite that splices the original body back in
	* (a desugared loop) already carries that body's newlines, and padding by the
	* whole range again would push every later line down.
	*/
	edit(start, end, build) {
		const original = countNewlines(this.source.slice(start, end));
		this.edits.push({
			start,
			end,
			render: (inner) => {
				const text = build(inner);
				return text + "\n".repeat(Math.max(0, original - countNewlines(text)));
			}
		});
	}
	replace(start, end, text) {
		this.edit(start, end, () => text);
	}
	insert(at, text) {
		this.edits.push({
			start: at,
			end: at,
			render: () => text
		});
	}
	structural(start, end, render) {
		this.edit(start, end, render);
	}
	literal(node) {
		const value = node.value;
		if (typeof value !== "string") this.fail("a module specifier must be a string literal", node.start);
		this.moduleRequests.add(value);
		return JSON.stringify(value);
	}
	/** @returns Static module requests the body makes, in first-appearance order. */
	requests() {
		return [...this.moduleRequests];
	}
	/** @returns Literal `import.meta.resolve()` requests, in first-appearance order. */
	metaRequests() {
		return [...this.metaResolveRequests];
	}
	importDeclaration(node) {
		this.moduleSyntax = true;
		if (Array.isArray(node.attributes) && node.attributes.length > 0) this.fail("import attributes are not supported", node.start);
		const source = node.source;
		const request = `require(${this.literal(source)})`;
		const specifiers = node.specifiers;
		if (specifiers.length === 0) {
			this.replace(node.start, node.end, `${request};`);
			return;
		}
		const held = this.moduleTemp();
		const lines = [`const ${held}=${request};`];
		for (const specifier of specifiers) {
			const local = specifier.local.name;
			if (specifier.type === "ImportDefaultSpecifier") {
				lines.push(`const ${local}=${this.helper("default")}(${held});`);
				continue;
			}
			if (specifier.type === "ImportNamespaceSpecifier") {
				lines.push(`const ${local}=${this.helper("ns")}(${held});`);
				continue;
			}
			const imported = specifier.imported;
			const name = imported.type === "Identifier" ? imported.name : imported.value;
			lines.push(`const ${local}=${held}[${JSON.stringify(name)}];`);
		}
		this.replace(node.start, node.end, lines.join(""));
	}
	exportNamed(node) {
		this.moduleSyntax = true;
		const declaration = node.declaration;
		const source = node.source;
		const specifiers = node.specifiers;
		if (declaration !== null) {
			this.replace(node.start, declaration.start, "");
			for (const { exported, local } of declaredBindings(declaration, (detail) => this.fail(detail, declaration.start))) this.bindings.push({
				exported,
				local
			});
			return;
		}
		if (source !== null) {
			const held = this.moduleTemp();
			const define = this.helper("def");
			const lines = [`const ${held}=require(${this.literal(source)});`];
			for (const specifier of specifiers) {
				const local = nameOf(specifier.local);
				const exported = nameOf(specifier.exported);
				lines.push(`${define}(exports,${JSON.stringify(exported)},()=>${held}[${JSON.stringify(local)}]);`);
			}
			this.replace(node.start, node.end, lines.join(""));
			return;
		}
		for (const specifier of specifiers) this.bindings.push({
			exported: nameOf(specifier.exported),
			local: nameOf(specifier.local)
		});
		this.replace(node.start, node.end, "");
	}
	exportDefault(node) {
		this.moduleSyntax = true;
		const declaration = node.declaration;
		this.replace(node.start, declaration.start, "exports.default = ");
	}
	exportAll(node) {
		this.moduleSyntax = true;
		const request = `require(${this.literal(node.source)})`;
		const exported = node.exported;
		if (exported === null) {
			this.replace(node.start, node.end, `${this.helper("exportAll")}(exports,${request});`);
			return;
		}
		const held = this.moduleTemp();
		const define = this.helper("def");
		this.replace(node.start, node.end, `const ${held}=${this.helper("ns")}(${request});${define}(exports,${JSON.stringify(nameOf(exported))},()=>${held});`);
	}
	awaitExpression(node) {
		const keywordEnd = node.start + 5;
		if (this.source.slice(node.start, keywordEnd) !== "await") this.fail("unexpected await layout", node.start);
		this.replace(node.start, keywordEnd, `${ALS}.resume(await ${ALS}.pause(`);
		this.insert(node.end, "))");
	}
	/**
	* `for await (L of R) B` becomes an explicit loop over the same protocol.
	* `iterator.return` runs only on abrupt completion, as the language says, and
	* is awaited so teardown still orders before the loop exits.
	*/
	forAwait(node) {
		const left = node.left;
		const right = node.right;
		const body = node.body;
		const iterator = this.alsTemp();
		const step = this.alsTemp();
		const exhausted = this.alsTemp();
		const binding = (inner) => {
			if (left.type !== "VariableDeclaration") return `(${inner(left.start, left.end)})=${step}.value;`;
			const declarations = left.declarations;
			const pattern = declarations[0]?.id;
			if (declarations.length !== 1 || pattern === void 0) this.fail("for-await must declare exactly one binding", left.start);
			return `${String(left.kind)} ${inner(pattern.start, pattern.end)}=${step}.value;`;
		};
		this.structural(node.start, node.end, (inner) => [
			`{const ${iterator}=${ALS}.iterator(${inner(right.start, right.end)});`,
			`let ${step};let ${exhausted}=false;`,
			`try{for(;;){${step}=${ALS}.resume(await ${ALS}.pause(${iterator}.next()));`,
			`if(${step}.done){${exhausted}=true;break}`,
			`{${binding(inner)}${body.type === "BlockStatement" ? inner(body.start, body.end) : `{${inner(body.start, body.end)}}`}}}}`,
			`finally{if(!${exhausted})${ALS}.resume(await ${ALS}.pause(${ALS}.close(${iterator})))}}`
		].join(""));
	}
	/**
	* `yield` resumes with whatever the consumer sent, so the snapshot is taken
	* before suspending and restored when the call completes. `yield*` delegates,
	* which has no expression form here: it is desugared as a statement, and a
	* consumer's `throw()` is not forwarded into the inner iterator (`next` and
	* `return` are).
	*/
	yieldExpression(node, statement) {
		if (node.delegate !== true) {
			this.insert(node.start, `${ALS}.afterYield(${ALS}.snapshot(),`);
			this.insert(node.end, ")");
			return;
		}
		const argument = node.argument;
		if (argument === null) this.fail("yield* without an operand", node.start);
		if (statement === void 0) this.fail("yield* is only supported as a statement", node.start);
		if (statement.expression !== node) this.fail("yield* is only supported as the whole statement expression", node.start);
		const iterator = this.alsTemp();
		const step = this.alsTemp();
		const sent = this.alsTemp();
		const exhausted = this.alsTemp();
		this.structural(statement.start, statement.end, (inner) => [
			`{const ${iterator}=${ALS}.iterator(${inner(argument.start, argument.end)});`,
			`let ${sent};let ${exhausted}=false;`,
			`try{for(;;){const ${step}=${ALS}.resume(await ${ALS}.pause(${iterator}.next(${sent})));`,
			`if(${step}.done){${exhausted}=true;break}`,
			`${sent}=${ALS}.afterYield(${ALS}.snapshot(),yield ${step}.value)}}`,
			`finally{if(!${exhausted})${ALS}.resume(await ${ALS}.pause(${ALS}.close(${iterator})))}}`
		].join(""));
	}
	visit(node, context) {
		if (node === null || typeof node !== "object") return;
		if (Array.isArray(node)) {
			for (const child of node) this.visit(child, context);
			return;
		}
		const record = node;
		if (typeof record.type !== "string") return;
		let next = context;
		switch (record.type) {
			case "ImportDeclaration":
				this.importDeclaration(record);
				break;
			case "ExportNamedDeclaration":
				this.exportNamed(record);
				break;
			case "ExportDefaultDeclaration":
				this.exportDefault(record);
				break;
			case "ExportAllDeclaration":
				this.exportAll(record);
				break;
			case "ImportExpression": {
				this.moduleSyntax = true;
				if (!this.source.startsWith("import", record.start)) this.fail("unexpected dynamic import layout", record.start);
				this.replace(record.start, record.start + 6, this.helper("dynImport"));
				const argument = record.source;
				if (argument !== void 0 && typeof argument.value === "string") this.moduleRequests.add(argument.value);
				break;
			}
			case "CallExpression": {
				const callee = record.callee;
				const callArguments = record.arguments;
				if (this.isRequireCall(callee, context.moduleScope) && callArguments.length === 1 && typeof callArguments[0]?.value === "string") this.moduleRequests.add(callArguments[0].value);
				if (callee.type === "MemberExpression") {
					const object = callee.object;
					const property = callee.property;
					if (object.type === "MetaProperty" && object.meta.name === "import" && property.type === "Identifier" && property.name === "resolve" && typeof callArguments[0]?.value === "string") this.metaResolveRequests.add(callArguments[0].value);
				}
				break;
			}
			case "MetaProperty":
				if (record.meta.name === "import") {
					this.moduleSyntax = true;
					this.replace(record.start, record.end, "__dsh$meta");
				}
				break;
			case "AwaitExpression":
				if (context.functionDepth === 0) this.fail("top-level await cannot run as CommonJS in the worker", record.start);
				this.awaitExpression(record);
				break;
			case "ForOfStatement":
				if (record.await === true) {
					if (context.functionDepth === 0) this.fail("a top-level for-await loop cannot run as CommonJS", record.start);
					this.forAwait(record);
				}
				next = {
					...next,
					moduleScope: false
				};
				break;
			case "LabeledStatement": {
				const body = record.body;
				if (body.type === "ForOfStatement" && body.await === true) this.fail("a labeled for-await loop is not supported", record.start);
				break;
			}
			case "YieldExpression":
				if (context.asyncGenerator) this.yieldExpression(record, context.statement);
				break;
			case "FunctionDeclaration":
			case "FunctionExpression":
			case "ArrowFunctionExpression":
				next = {
					asyncGenerator: record.async === true && record.generator === true,
					functionDepth: context.functionDepth + 1,
					moduleScope: false
				};
				break;
			case "BlockStatement":
			case "CatchClause":
			case "ClassBody":
			case "ForStatement":
			case "ForInStatement":
			case "SwitchStatement":
				next = {
					...next,
					moduleScope: false
				};
				break;
			default: break;
		}
		if (record.type === "ExpressionStatement") next = {
			...next,
			statement: record
		};
		for (const [key, value] of Object.entries(record)) {
			if (key === "type" || key === "start" || key === "end") continue;
			this.visit(value, next);
		}
	}
	isCreateRequireCall(node) {
		if (node.type !== "CallExpression") return false;
		const callee = node.callee;
		const args = node.arguments;
		if (callee.type !== "Identifier" || !this.createRequireBindings.has(nameOf(callee)) || args.length !== 1) return false;
		const base = args[0];
		if (base.type !== "MemberExpression" || base.computed === true) return false;
		const object = base.object;
		const property = base.property;
		return object.type === "MetaProperty" && object.meta.name === "import" && property.type === "Identifier" && property.name === "url";
	}
	isRequireCall(callee, moduleScope) {
		return callee.type === "Identifier" && callee.name === "require" || moduleScope && this.isCreateRequireCall(callee);
	}
	indexCreateRequireImports(program) {
		for (const statement of program.body) {
			if (statement.type !== "ImportDeclaration") continue;
			const source = statement.source;
			if (source.value !== "node:module" && source.value !== "module") continue;
			for (const specifier of statement.specifiers) {
				if (specifier.type !== "ImportSpecifier" || nameOf(specifier.imported) !== "createRequire") continue;
				this.createRequireBindings.add(nameOf(specifier.local));
			}
		}
	}
	run() {
		if (this.source.includes(`${ALS}.pause(`) || this.source.includes("__als$")) this.fail("the module is already lowered; check the image manifest wiring", 0);
		let program;
		try {
			program = parse(this.source, {
				ecmaVersion: "latest",
				sourceType: "module",
				allowAwaitOutsideFunction: true
			});
		} catch (reason) {
			this.fail(`parse failed: ${reason.message}`, 0);
		}
		this.indexCreateRequireImports(program);
		this.visit(program, {
			asyncGenerator: false,
			functionDepth: 0,
			moduleScope: true
		});
		if (this.edits.length === 0 && !this.moduleSyntax) return this.source;
		const prologue = [];
		if (this.moduleSyntax) prologue.push("\"use strict\";Object.defineProperty(exports,\"__esModule\",{value:true});");
		if (this.bindings.length > 0) this.helper("def");
		for (const [name, source] of Object.entries(HELPER_SOURCE)) if (this.helpers.has(name)) prologue.push(source);
		for (const { exported, local } of this.bindings) prologue.push(`__dsh$def(exports,${JSON.stringify(exported)},()=>${local});`);
		const sorted = [...this.edits].sort((left, right) => left.start - right.start || left.end - right.end);
		const render = (from, to) => {
			let cursor = from;
			let out = "";
			for (const edit of sorted) {
				if (edit.start < cursor || edit.end > to) continue;
				out += this.source.slice(cursor, edit.start) + edit.render(render);
				cursor = edit.end;
			}
			return out + this.source.slice(cursor, to);
		};
		const code = prologue.join("") + render(0, this.source.length);
		try {
			parse(code, {
				ecmaVersion: "latest",
				sourceType: "script",
				allowAwaitOutsideFunction: false
			});
		} catch (reason) {
			this.fail(`the transform produced code that does not parse: ${reason.message}`, 0);
		}
		return code;
	}
};
/** @returns The name a specifier or identifier node carries. */
function nameOf(node) {
	return node.type === "Identifier" ? node.name : String(node.value);
}
/** Every binding an exported declaration introduces, including patterns. */
function declaredBindings(declaration, fail) {
	if (declaration.type === "FunctionDeclaration" || declaration.type === "ClassDeclaration") {
		const id = declaration.id;
		if (id === null) fail("an exported declaration must be named");
		const name = id.name;
		return [{
			exported: name,
			local: name
		}];
	}
	if (declaration.type !== "VariableDeclaration") fail(`unsupported exported declaration ${declaration.type}`);
	const bindings = [];
	const collect = (pattern) => {
		switch (pattern.type) {
			case "Identifier":
				bindings.push({
					exported: pattern.name,
					local: pattern.name
				});
				return;
			case "ObjectPattern":
				for (const property of pattern.properties) collect(property.type === "RestElement" ? property.argument : property.value);
				return;
			case "ArrayPattern":
				for (const element of pattern.elements) if (element !== null) collect(element);
				return;
			case "AssignmentPattern":
				collect(pattern.left);
				return;
			case "RestElement":
				collect(pattern.argument);
				return;
			default: fail(`unsupported binding pattern ${pattern.type}`);
		}
	};
	for (const declarator of declaration.declarations) collect(declarator.id);
	return bindings;
}
const cache = /* @__PURE__ */ new Map();
/**
* Transform one module into a body for the worker wrapper.
*
* Results are cached by source text, so a module reached through two paths, or
* a repeated build, parses once.
* @param source - Module source, ESM or CommonJS.
* @param path - Path used in diagnostics.
* @returns The lowered body and the module requests found in it.
*/
function transformDetailed(source, path) {
	const cached = cache.get(source);
	if (cached !== void 0) return cached;
	const transformer = new Transformer(source, path);
	const transformed = {
		code: transformer.run(),
		moduleRequests: transformer.requests(),
		metaResolveRequests: transformer.metaRequests()
	};
	cache.set(source, transformed);
	return transformed;
}
/**
* Lower one module at image-pack time.
*
* The collector calls this for every JavaScript entry it packs and records
* `LOWERING_VERSION` in the image manifest; the loader then wraps those entries
* without parsing them. `lowered: false` reports that the transform would have
* returned the input verbatim (already CommonJS, no suspension point), so the
* entry may be packed as it is.
*
* Throwing is the intended failure mode: a module this transform cannot express
* must fail the build rather than ship an image that breaks at load.
* @param options - Virtual path inside the image and the module source.
* @returns The code to pack and whether it changed.
*/
function lowerModuleSource(options) {
	const { code, moduleRequests, metaResolveRequests } = transformDetailed(options.source, options.filename);
	return {
		code,
		lowered: code !== options.source,
		moduleRequests,
		metaResolveRequests
	};
}
//#endregion
//#region src/transport/tunnel.ts
/**
* Worker end of the postMessage tunnel. It owns the dispatch lanes and the queue
* that holds requests until the host tree is serving:
*
* - `GET /__boot__` answers from tunnel glue, never from the host API surface,
*   because the page needs the boot payload before its Cordis tree exists.
* - Privileged `/api` methods take that same direct entry. The method set is not
*   restated here: a 401 or 403 from the route lane is retried on the direct
*   lane because the page owns the worker and needs no network authentication.
* - Everything else is fed into the real webserver route table through the
*   request listener the app's fake `node:http` captured, keeping the trust
*   fences, byte limits, and status semantics intact.
*
* A boot failure rejects the whole queue with 503 rather than leaving the page
* waiting.
* @module @deepseek-ai/dsh-experimental-webworker-runtime/src/transport/tunnel
*/
/** Prefix owning the API methods. */
const API_PREFIX = "/api";
/** Host header the synthesized requests carry; the API trust fence requires one. */
const SYNTHETIC_HOST = "127.0.0.1";
const encoder$2 = new TextEncoder();
/**
* Render a failure with everything nested inside it.
*
* A boot failure is usually an `AggregateError` of per-entry failures, each
* wrapping the plugin's own error as `cause`; only the outermost message names
* "loader entries failed to apply", which says nothing about which row broke.
*
* The page logs the rendered text verbatim for refusals; keep it stable for
* anyone matching boot-failure output.
* @param reason - Thrown value.
* @returns One line per nested failure, indented by depth.
*/
function describeFailure(reason) {
	const seen = /* @__PURE__ */ new Set();
	const lines = [];
	const walk = (value, depth) => {
		if (value === null || value === void 0 || seen.has(value) || depth > 6) return;
		seen.add(value);
		const indent = "  ".repeat(depth);
		if (!(value instanceof Error)) {
			const rendered = typeof value === "string" ? value : JSON.stringify(value);
			lines.push(`${indent}${rendered ?? typeof value}`);
			return;
		}
		lines.push(`${indent}${value.name}: ${value.message}`);
		if (value instanceof AggregateError) for (const inner of value.errors) walk(inner, depth + 1);
		walk(value.cause, depth + 1);
	};
	walk(reason, 0);
	return lines.join("\n");
}
/**
* Copy bytes into an exact-size ArrayBuffer so it can be transferred.
*
* Sliced on the ArrayBuffer, not the view: `Uint8Array.prototype.slice` copies,
* but a Node-style Buffer overrides `slice()` with view semantics, and the fs
* bridge hands VFS reads over as Buffer views into the whole mounted image —
* `bytes.slice().buffer` would then post the entire image as the body.
*/
function toTransferable(bytes) {
	return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}
/** Recorded response frames, so a route-lane authentication refusal can be discarded. */
var BufferedSink = class {
	calls = [];
	target;
	settle;
	/** Resolves when the exchange either starts streaming or answers in one frame. */
	settled = new Promise((resolve) => {
		this.settle = resolve;
	});
	sink = {
		head: (status, headers) => {
			this.record(() => {
				this.target?.head(status, headers);
			});
			this.settle?.({
				streamed: true,
				status
			});
		},
		chunk: (bytes) => {
			this.record(() => {
				this.target?.chunk(bytes);
			});
		},
		end: (payload) => {
			this.record(() => {
				this.target?.end(payload);
			});
			this.settle?.({
				streamed: payload === void 0,
				status: payload?.status ?? 200
			});
		},
		fail: (message) => {
			this.record(() => {
				this.target?.fail(message);
			});
			this.settle?.({
				streamed: true,
				status: 500
			});
		}
	};
	record(call) {
		if (this.target === void 0) this.calls.push(call);
		else call();
	}
	/**
	* Send everything recorded so far to a real sink and pass later calls through.
	* @param target - Sink receiving the frames.
	*/
	flushTo(target) {
		this.target = target;
		for (const call of this.calls.splice(0)) call();
	}
};
/** One tunnel per worker; wire {@link TunnelServer.handleMessage} to `onmessage` first. */
var TunnelServer = class {
	port;
	requestListener;
	privilegedMethods;
	unaryApiLane;
	queue = [];
	inFlight = /* @__PURE__ */ new Map();
	seams;
	failure;
	listener;
	constructor(options) {
		this.port = options.port;
		this.requestListener = options.requestListener;
		this.privilegedMethods = options.privilegedMethods;
		this.unaryApiLane = options.unaryApiLane ?? "route";
	}
	/**
	* Accept one `postMessage` payload.
	* @param data - Message data from the page.
	*/
	handleMessage(data) {
		const frame = parseInboundFrame(data);
		if (frame.t === "init") throw new Error("webworker tunnel: duplicate init frame; the tunnel is already open");
		if (frame.t === "abort") {
			this.inFlight.get(frame.id)?.abort();
			this.inFlight.delete(frame.id);
			const queued = this.queue.findIndex((request) => request.id === frame.id);
			if (queued !== -1) this.queue.splice(queued, 1);
			return;
		}
		if (this.failure !== void 0) {
			this.refuse(frame, this.failure);
			return;
		}
		if (this.seams === void 0) {
			this.queue.push(frame);
			return;
		}
		this.dispatchFrame(frame);
	}
	/**
	* Start serving: drains everything queued during boot.
	* @param seams - Faces that exist only after the host tree is up.
	*/
	serve(seams) {
		this.seams = seams;
		console.info(`webworker tunnel: serving (unary /api lane=${this.unaryApiLane}${this.unaryApiLane === "route" ? " with 401/403 retry" : ""}, privileged set=${this.privilegedMethods === void 0 ? "none" : String(this.privilegedMethods.size)}, queued=${String(this.queue.length)})`);
		for (const frame of this.queue.splice(0)) this.dispatchFrame(frame);
	}
	/**
	* Refuse every queued and future request; the page renders this like a server
	* that failed to start.
	* @param reason - Boot failure to report.
	*/
	fail(reason) {
		const message = describeFailure(reason);
		this.failure = message;
		for (const frame of this.queue.splice(0)) this.refuse(frame, message);
	}
	send(frame, transfer) {
		this.port.postMessage(frame, transfer);
	}
	refuse(frame, message) {
		if (frame.t === "stream-open") {
			this.send({
				t: "stream-error",
				id: frame.id,
				failure: {
					kind: "carrier",
					message
				}
			});
			return;
		}
		const body = toTransferable(encoder$2.encode(message));
		this.send({
			t: "res",
			id: frame.id,
			status: 503,
			headers: { "content-type": "text/plain; charset=utf-8" },
			body,
			message
		}, [body]);
	}
	dispatchFrame(frame) {
		if (frame.t === "stream-open") this.serveStream(frame);
		else this.serveRequest(frame);
	}
	async serveStream(frame) {
		if (this.seams === void 0) {
			this.refuse(frame, "webworker tunnel: Remote stream requested before the host tree is serving");
			return;
		}
		const seams = this.seams;
		const controller = new AbortController();
		this.inFlight.set(frame.id, { abort: () => {
			controller.abort();
		} });
		try {
			const source = await seams.openStream(frame.endpoint, frame.payload, controller.signal);
			for await (const value of source) {
				if (controller.signal.aborted) return;
				this.send({
					t: "stream-item",
					id: frame.id,
					value
				});
			}
			if (!controller.signal.aborted) this.send({
				t: "stream-end",
				id: frame.id
			});
		} catch (error) {
			if (!controller.signal.aborted) {
				const failure = seams.streamFailure(error);
				this.send({
					t: "stream-error",
					id: frame.id,
					failure: {
						kind: "remote",
						...failure
					}
				});
			}
		} finally {
			this.inFlight.delete(frame.id);
		}
	}
	sinkFor(id) {
		const send = this.send.bind(this);
		const inFlight = this.inFlight;
		return {
			head(status, headers) {
				send({
					t: "res-head",
					id,
					status,
					headers
				});
			},
			chunk(bytes) {
				const buffer = toTransferable(bytes);
				send({
					t: "res-chunk",
					id,
					chunk: buffer
				}, [buffer]);
			},
			end(payload) {
				if (payload === void 0) send({
					t: "res-end",
					id
				});
				else {
					const body = payload.body === void 0 ? void 0 : toTransferable(payload.body);
					send({
						t: "res",
						id,
						status: payload.status,
						headers: payload.headers,
						body
					}, body === void 0 ? void 0 : [body]);
				}
				inFlight.delete(id);
			},
			fail(message) {
				send({
					t: "res-err",
					id,
					message
				});
				inFlight.delete(id);
			}
		};
	}
	/** The page sends an absolute URL; route handlers read `req.url` as a path. */
	pathFrame(frame) {
		const url = new URL(frame.url, `http://${SYNTHETIC_HOST}`);
		return {
			frame: {
				...frame,
				url: `${url.pathname}${url.search}`,
				headers: {
					...frame.headers,
					host: SYNTHETIC_HOST
				}
			},
			path: url.pathname
		};
	}
	async serveRequest(frame) {
		const sink = this.sinkFor(frame.id);
		try {
			const { frame: routed, path } = this.pathFrame(frame);
			if (path === "/__boot__") {
				this.serveBoot(frame, sink);
				return;
			}
			if (path.startsWith(`/api/`)) {
				await this.serveApi(frame, routed, path, sink);
				return;
			}
			this.dispatch(routed, sink);
		} catch (reason) {
			sink.fail(reason instanceof Error ? reason.message : String(reason));
		}
	}
	/**
	* The listener is captured once and reused, so only requests that arrive
	* before the web server binds pay an await.
	* @returns The webserver request listener.
	*/
	async whenListener() {
		this.listener ??= await this.requestListener();
		return this.listener;
	}
	/** Feed the real route table through the captured listener. */
	dispatch(frame, sink, into) {
		const exchange = createSyntheticExchange(frame, into ?? sink);
		this.inFlight.set(frame.id, exchange);
		const listener = this.listener;
		if (listener !== void 0) {
			listener(exchange.req, exchange.res);
			return exchange;
		}
		this.whenListener().then((resolved) => {
			if (!exchange.aborted) resolved(exchange.req, exchange.res);
		}, (reason) => {
			sink.fail(reason instanceof Error ? reason.message : String(reason));
		});
		return exchange;
	}
	/**
	* Unary `/api`: keep the route lane's fences, but fall back to the direct lane
	* when network authentication or trust rejects the worker-owning page.
	*/
	async serveApi(original, routed, path, sink) {
		const method = path.slice(5);
		if (this.unaryApiLane === "direct" || this.privilegedMethods?.has(method) === true) {
			await this.serveDirect(original, sink);
			return;
		}
		const buffered = new BufferedSink();
		const exchange = this.dispatch(routed, sink, buffered.sink);
		let settleAborted = () => {};
		const aborted = new Promise((resolve) => {
			settleAborted = () => {
				resolve("aborted");
			};
		});
		this.inFlight.set(routed.id, { abort: () => {
			exchange.abort();
			settleAborted();
		} });
		const outcome = await Promise.race([buffered.settled, aborted]);
		if (outcome === "aborted" || exchange.aborted) return;
		if (outcome.status === 401 || outcome.status === 403) {
			console.debug(`webworker tunnel: route lane refused ${method} with ${String(outcome.status)}; answering on the direct lane`);
			await this.serveDirect(original, sink);
			return;
		}
		buffered.flushTo(sink);
	}
	serveBoot(frame, sink) {
		if (this.seams === void 0) throw new Error("webworker tunnel: boot payload requested before the host tree is serving");
		if (frame.method !== "GET") {
			sink.end({
				status: 405,
				headers: { allow: "GET" }
			});
			return;
		}
		const body = encoder$2.encode(JSON.stringify(this.seams.bootPayload()));
		sink.end({
			status: 200,
			headers: {
				"content-type": "application/json; charset=utf-8",
				"cache-control": "no-store"
			},
			body
		});
	}
	async serveDirect(frame, sink) {
		if (this.seams === void 0) throw new Error("webworker tunnel: direct fetch requested before the host tree is serving");
		const controller = new AbortController();
		this.inFlight.set(frame.id, { abort: () => {
			controller.abort();
		} });
		const headers = new Headers();
		for (const [key, value] of Object.entries(frame.headers)) try {
			headers.set(key, value);
		} catch {}
		const request = new Request(new URL(frame.url, `http://${SYNTHETIC_HOST}`), {
			method: frame.method,
			headers,
			body: frame.body === void 0 || frame.method === "GET" || frame.method === "HEAD" ? null : frame.body,
			signal: controller.signal
		});
		const response = await this.seams.directFetch(request);
		const responseHeaders = {};
		response.headers.forEach((value, key) => {
			responseHeaders[key] = value;
		});
		if (!(response.body !== null && (responseHeaders["content-type"] ?? "").startsWith("text/event-stream"))) {
			const buffer = await response.arrayBuffer();
			sink.end({
				status: response.status,
				headers: responseHeaders,
				body: buffer.byteLength === 0 ? void 0 : new Uint8Array(buffer)
			});
			return;
		}
		sink.head(response.status, responseHeaders);
		const reader = response.body.getReader();
		this.inFlight.set(frame.id, { abort: () => {
			controller.abort();
			reader.cancel().catch(() => {});
		} });
		try {
			for (;;) {
				const { done, value } = await reader.read();
				if (done) break;
				sink.chunk(value);
			}
			sink.end();
		} catch (reason) {
			sink.fail(reason instanceof Error ? reason.message : String(reason));
		} finally {
			reader.releaseLock();
		}
	}
};
//#endregion
//#region src/node/process-table.ts
const entries = /* @__PURE__ */ new Map();
/**
* Whether a command with this pid is still running.
* @param pid - pid to look up; a negative value addresses the group, which here
* holds exactly the one process that leads it.
* @returns true while the entry is in the table.
*/
function processAlive(pid) {
	return entries.has(Math.abs(pid));
}
/**
* Deliver a signal to one running command.
*
* `SIGKILL` stops the command whatever it is doing; every other signal asks it
* to stop at its next command boundary. That distinction is real only for a
* worker-backed process — see {@link RunningProcess.destroy}.
* @param pid - pid or negative process-group id.
* @param signal - the signal name to record and deliver.
* @returns true when an entry received it, false when no such process exists.
*/
function signalProcess(pid, signal) {
	const entry = entries.get(Math.abs(pid));
	if (entry === void 0) return false;
	entry.signal ??= signal;
	if (signal === "SIGKILL") entry.process?.destroy();
	else entry.process?.interrupt();
	return true;
}
//#endregion
//#region src/node/globals/process.ts
/**
* The `process` global the worker needs before any VFS module runs. Cordis
* reads `process.env` and `process.versions.node` while the Loader is
* constructed, and `cordis.yml` keeps its `!!js process.*` expressions, so the
* configuration bytes stay identical to the Node deployment. Third-party Node
* packages use the presence of `process.title` to avoid browser-only globals.
* @module @deepseek-ai/dsh-experimental-webworker-runtime/src/node/globals/process
*/
/**
* Publish `globalThis.process`.
*
* `versions.node` is `0.0.0` on purpose: it makes Cordis's
* `ModuleLoader.fromInternal()` return undefined instead of reaching for Node
* internals, which is what lets the worker install its own module seam.
* @param options - Root, environment, and argument vector.
* @returns The published object, for the module proxy table.
*/
function installProcessGlobal(options) {
	const start = performance.now();
	const write = (target) => (chunk) => {
		console[target](chunk.replace(/\n$/, ""));
		return true;
	};
	const shim = {
		env: { ...options.env },
		argv: [...options.argv ?? ["node", "dsh-webworker"]],
		execArgv: [],
		title: "dsh-webworker",
		platform: "linux",
		arch: "x64",
		pid: 1,
		version: "v0.0.0",
		versions: { node: "0.0.0" },
		cwd: () => options.cwd,
		getBuiltinModule: (id) => {
			let resolution;
			try {
				resolution = requireActiveModuleLoader().resolve(id, "/");
			} catch {
				return;
			}
			return resolution.kind === "static" ? resolution.factory() : void 0;
		},
		kill: (pid, signal = "SIGTERM") => {
			if (signal === 0) {
				if (processAlive(pid)) return true;
				const error = /* @__PURE__ */ new Error("kill ESRCH");
				error.code = "ESRCH";
				error.syscall = "kill";
				throw error;
			}
			return signalProcess(pid, signal);
		},
		nextTick: (callback, ...args) => {
			queueMicrotask(() => {
				callback(...args);
			});
		},
		stdout: { write: write("log") },
		stderr: { write: write("error") },
		on: () => shim,
		off: () => shim,
		once: () => shim,
		prependListener: () => shim,
		prependOnceListener: () => shim,
		removeListener: () => shim,
		removeAllListeners: () => shim,
		listeners: () => [],
		listenerCount: () => 0,
		setMaxListeners: () => shim,
		emit: () => false,
		hrtime: { bigint: () => BigInt(Math.round((performance.now() - start) * 1e6)) },
		uptime: () => (performance.now() - start) / 1e3,
		exit: (code) => {
			console.warn(`webworker process: exit(${String(code ?? 0)}) requested; the worker keeps running`);
		}
	};
	globalThis.process = shim;
	return shim;
}
//#endregion
//#region src/storage/image-gzip.ts
/**
* The image byte envelope. The packer writes one gzip member holding the ustar
* archive, and the worker inflates it with the platform's own decompressor before
* the tar reader sees a byte — `storage/tar.ts` stays a pure ustar reader with no
* codec in it.
*
* Inflation runs on the fetch stream rather than on downloaded bytes: the
* decompressor consumes each chunk as it lands, so unpacking overlaps the
* download instead of following it, and the compressed copy never has to be held
* whole in memory beside the archive it produces.
*
* One format, no negotiation: a body that does not start a gzip member is refused
* by name, in the stream, before the decompressor sees it. Without that check a
* plain tar, a truncated download, or a proxy's HTML error page would reach
* `parseTar` and fail as a corrupt header field, which says nothing about what
* the deployment actually served.
* @module @deepseek-ai/dsh-experimental-webworker-runtime/src/storage/image-gzip
*/
/** gzip member identification bytes (RFC 1952 §2.3.1). */
const GZIP_MAGIC = [31, 139];
/** Bytes of a refused body quoted in the failure, enough to recognize text served in its place. */
const QUOTED_BYTES = 8;
const hex = (bytes) => [...bytes.slice(0, QUOTED_BYTES)].map((byte) => byte.toString(16).padStart(2, "0")).join(" ");
/**
* A pass-through that refuses a body which is not a gzip member.
*
* The check spans chunks: a transport may deliver the first byte alone, so the
* head is held until it can be judged and then forwarded intact. A body that ends
* before two bytes arrive is refused in `flush`, where "too short" is the only
* thing left to report.
* @param source - the image URL, or how the bytes arrived; named in a refusal.
* @returns The transform to pipe the body through before the decompressor.
*/
function requireGzipMember(source) {
	let head = new Uint8Array(0);
	let judged = false;
	const refuse = (read) => /* @__PURE__ */ new Error(`webworker image: ${source} is not the gzip-compressed tar this deployment serves as its image (expected a member starting 1f 8b, read ${read.byteLength === 0 ? "an empty body" : hex(read)}); a host that answered with a Content-Encoding the transport already decoded, or a build that wrote the archive uncompressed, arrives exactly this way`);
	return new TransformStream({
		transform: (chunk, controller) => {
			if (judged) {
				controller.enqueue(chunk);
				return;
			}
			const merged = new Uint8Array(head.byteLength + chunk.byteLength);
			merged.set(head);
			merged.set(chunk, head.byteLength);
			head = merged;
			if (head.byteLength < GZIP_MAGIC.length) return;
			if (GZIP_MAGIC.some((byte, at) => head[at] !== byte)) throw refuse(head);
			judged = true;
			controller.enqueue(head);
		},
		flush: () => {
			if (!judged) throw refuse(head);
		}
	});
}
/**
* Inflate a packed VFS image as it arrives.
* @param body - the image body, straight from `fetch` or wrapped around bytes.
* @param source - the image URL, or how the bytes arrived; named in a refusal.
* @returns the ustar archive the image carries.
* @throws When the body does not start a gzip member, or the member is corrupt.
*/
async function inflateImageStream(body, source) {
	const inflated = body.pipeThrough(requireGzipMember(source)).pipeThrough(new DecompressionStream("gzip"));
	return new Uint8Array(await new Response(inflated).arrayBuffer());
}
/**
* Inflate a packed VFS image held in memory.
*
* The bytes become a body so both entries run the same stream: one decompression
* path, one refusal, whether the image came off the network or out of a caller's
* buffer.
* @param bytes - the image bytes.
* @param source - how the bytes arrived; named in a refusal.
* @returns the ustar archive the image carries.
* @throws When the bytes do not start a gzip member, or the member is corrupt.
*/
async function inflateImage(bytes, source) {
	const body = new Response(bytes).body;
	if (body === null) throw new Error(`webworker image: ${source} produced no readable body`);
	return await inflateImageStream(body, source);
}
//#endregion
//#region src/storage/tar.ts
/**
* Uncompressed ustar archive: the VFS image format. One fetch delivers the
* whole tree, and the reader hands out subarray views into the fetched buffer,
* so mounting copies nothing and no inflate step runs inside the worker.
*
* Hand-rolled on purpose: both sides need synchronous in-memory operation and
* the reader ships inside the worker bundle, where the streaming tar packages
* would drag Node stream shims back in. The subset is plain ustar — regular
* files and directories, names up to 255 bytes via the name-prefix split — and
* anything outside it fails loud on either side.
* @module @deepseek-ai/dsh-experimental-webworker-runtime/src/storage/tar
*/
const encoder$1 = new TextEncoder();
const decoder$1 = new TextDecoder();
const BLOCK = 512;
/** Write an octal field: zero-padded digits with a terminating NUL. */
function writeOctal(header, offset, length, value) {
	header.set(encoder$1.encode(value.toString(8).padStart(length - 1, "0")), offset);
}
/**
* Split an entry name into the ustar name and prefix fields.
* @param name - Full entry name.
* @returns The two fields; the prefix is empty when the name fits directly.
* @throws When no slash yields name ≤ 100 and prefix ≤ 155 bytes: the entry
* cannot be archived and a silently truncated name would corrupt the image.
*/
function splitName(name) {
	if (encoder$1.encode(name).length <= 100) return {
		name,
		prefix: ""
	};
	for (let index = name.length - 1; index > 0; index -= 1) {
		if (name[index] !== "/") continue;
		const prefix = name.slice(0, index);
		const rest = name.slice(index + 1);
		if (encoder$1.encode(rest).length <= 100 && encoder$1.encode(prefix).length <= 155) return {
			name: rest,
			prefix
		};
	}
	throw new Error(`vfs tar: entry name does not fit the ustar name+prefix split: ${name}`);
}
/**
* Pack entries into one uncompressed ustar archive.
*
* Entries keep their given order; names ending in a slash become directory
* entries. Contents are written verbatim — compression belongs to the HTTP
* transport, not to the archive.
* @param files - Entry name to content bytes.
* @returns The archive bytes.
*/
function packTar(files) {
	const chunks = [];
	for (const [entryName, bytes] of Object.entries(files)) {
		const directory = entryName.endsWith("/");
		const size = directory ? 0 : bytes.length;
		const { name, prefix } = splitName(entryName);
		const header = new Uint8Array(BLOCK);
		header.set(encoder$1.encode(name), 0);
		writeOctal(header, 100, 8, directory ? 493 : 420);
		writeOctal(header, 108, 8, 0);
		writeOctal(header, 116, 8, 0);
		writeOctal(header, 124, 12, size);
		writeOctal(header, 136, 12, 0);
		header.fill(32, 148, 156);
		header[156] = directory ? 53 : 48;
		header.set(encoder$1.encode("ustar"), 257);
		header.set(encoder$1.encode("00"), 263);
		header.set(encoder$1.encode(prefix), 345);
		let checksum = 0;
		for (const byte of header) checksum += byte;
		header.set(encoder$1.encode(checksum.toString(8).padStart(6, "0")), 148);
		header[154] = 0;
		header[155] = 32;
		chunks.push(header);
		if (size > 0) {
			chunks.push(bytes);
			const padding = size % BLOCK;
			if (padding !== 0) chunks.push(new Uint8Array(BLOCK - padding));
		}
	}
	chunks.push(new Uint8Array(BLOCK * 2));
	const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
	const archive = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		archive.set(chunk, offset);
		offset += chunk.length;
	}
	return archive;
}
/** @returns The NUL-terminated string in one header field. */
function readField(header, offset, length) {
	let end = offset;
	while (end < offset + length && header[end] !== 0) end += 1;
	return decoder$1.decode(header.subarray(offset, end));
}
/**
* Parse an uncompressed ustar archive.
*
* File bytes are subarray views into `archive`, not copies; callers own the
* aliasing. Entry kinds outside the written subset (links, PAX extensions)
* fail loud instead of being skipped.
* @param archive - Archive bytes.
* @returns Entries in archive order.
*/
function parseTar(archive) {
	const entries = [];
	let offset = 0;
	while (offset + BLOCK <= archive.length) {
		const header = archive.subarray(offset, offset + BLOCK);
		if (header.every((byte) => byte === 0)) break;
		const short = readField(header, 0, 100);
		const prefix = readField(header, 345, 155);
		const name = prefix === "" ? short : `${prefix}/${short}`;
		const size = Number.parseInt(readField(header, 124, 12).trim() || "0", 8);
		const mode = Number.parseInt(readField(header, 100, 8).trim() || "0", 8) & 511;
		const typeflag = header[156];
		const directory = typeflag === 53 || name.endsWith("/");
		if (typeflag !== 48 && typeflag !== 0 && typeflag !== 53) throw new Error(`vfs tar: unsupported entry type ${String.fromCharCode(typeflag ?? 0)} for "${name}"`);
		const dataStart = offset + BLOCK;
		entries.push({
			name,
			bytes: archive.subarray(dataStart, dataStart + size),
			directory,
			mode
		});
		offset = dataStart + Math.ceil(size / BLOCK) * BLOCK;
	}
	return entries;
}
//#endregion
//#region src/storage/memory.ts
/**
* In-memory filesystem behind the worker's `node:fs` proxy. Contents come from
* the build-time image (see {@link loadVfsImage}); this remains the synchronous
* authority when an asynchronous durable sink mirrors selected subtrees.
* @module @deepseek-ai/dsh-experimental-webworker-runtime/src/storage/memory
*/
const decoder = new TextDecoder();
const encoder = new TextEncoder();
/** Creation default for files, Node's `0o666` under the classic `022` umask. */
const DEFAULT_FILE_MODE = 420;
/** Creation default for directories, Node's `0o777` under the classic `022` umask. */
const DEFAULT_DIRECTORY_MODE = 493;
function fail(code, syscall, path, detail) {
	const error = /* @__PURE__ */ new Error(`${code}: ${detail ?? syscall} failed, ${syscall} '${path}'`);
	error.code = code;
	error.path = path;
	error.syscall = syscall;
	throw error;
}
function encodingOf(options) {
	if (options === null || options === void 0) return void 0;
	if (typeof options === "string") return options;
	return options.encoding ?? void 0;
}
function statsOf(size, mtimeMs, directory, ino, mode) {
	return {
		size,
		ino: Number(ino),
		mtimeMs,
		ctimeMs: mtimeMs,
		atimeMs: mtimeMs,
		birthtimeMs: mtimeMs,
		mtime: new Date(mtimeMs),
		mode: (directory ? 16384 : 32768) | mode & 511,
		isFile: () => !directory,
		isDirectory: () => directory,
		isSymbolicLink: () => false,
		isFIFO: () => false,
		isSocket: () => false,
		isBlockDevice: () => false,
		isCharacterDevice: () => false
	};
}
/**
* The same entry as {@link statsOf}, in the BigInt shape.
*
* Timestamps carry millisecond resolution scaled to nanoseconds, which is what
* the underlying `mtimeMs` holds; the VFS keeps that value strictly increasing
* per entry so two writes inside one millisecond still differ.
* @param size - Byte length; zero for a directory.
* @param mtimeMs - Modification time the entry carries.
* @param directory - Whether the entry is a directory.
* @param ino - Identity of the entry at this path.
* @param mode - Stored permission bits of the entry.
* @returns Stats in the shape Node returns under `{ bigint: true }`.
*/
function bigIntStatsOf(size, mtimeMs, directory, ino, mode, nlink = 1) {
	const milliseconds = BigInt(Math.trunc(mtimeMs));
	const nanoseconds = milliseconds * 1000000n;
	const time = new Date(mtimeMs);
	return {
		size: BigInt(size),
		mode: BigInt((directory ? 16384 : 32768) | mode & 511),
		dev: 1n,
		ino,
		nlink: BigInt(nlink),
		mtimeMs: milliseconds,
		mtimeNs: nanoseconds,
		ctimeMs: milliseconds,
		ctimeNs: nanoseconds,
		atimeMs: milliseconds,
		atimeNs: nanoseconds,
		birthtimeMs: milliseconds,
		birthtimeNs: nanoseconds,
		mtime: time,
		ctime: time,
		atime: time,
		birthtime: time,
		isFile: () => !directory,
		isDirectory: () => directory,
		isSymbolicLink: () => false,
		isFIFO: () => false,
		isSocket: () => false,
		isBlockDevice: () => false,
		isCharacterDevice: () => false
	};
}
/** Parse the Node string flags supported by the compatibility filesystem. */
function openMode(flags) {
	const base = flags[0];
	const suffix = flags.slice(1).split("");
	const validSuffix = suffix.every((flag) => flag === "+" || flag === "x" || flag === "s");
	const uniqueSuffix = new Set(suffix).size === suffix.length;
	if (base !== "r" && base !== "w" && base !== "a" || !validSuffix || !uniqueSuffix || base === "r" && flags.includes("x")) {
		const error = /* @__PURE__ */ new TypeError(`The argument 'flags' is invalid. Received '${flags}'`);
		error.code = "ERR_INVALID_ARG_VALUE";
		throw error;
	}
	return {
		readable: base === "r" || flags.includes("+"),
		writable: base !== "r" || flags.includes("+"),
		append: base === "a",
		create: base === "w" || base === "a",
		truncate: base === "w",
		exclusive: flags.includes("x")
	};
}
/** Resize bytes exactly, preserving the prefix and zero-filling growth. */
function resize(bytes, length) {
	if (!Number.isSafeInteger(length) || length < 0) {
		const error = /* @__PURE__ */ new RangeError(`The value of "len" is out of range. It must be >= 0. Received ${String(length)}`);
		error.code = "ERR_OUT_OF_RANGE";
		throw error;
	}
	const resized = new Uint8Array(length);
	resized.set(bytes.subarray(0, length));
	return resized;
}
/**
* Filesystem held in two maps: one for file bytes, one for directories.
* Every path is normalized to an absolute POSIX path without a trailing
* separator, so callers may pass either form.
*/
var MemoryVfs = class {
	files = /* @__PURE__ */ new Map();
	directories = new Set(["/"]);
	/** Directory permission bits; absence means {@link DEFAULT_DIRECTORY_MODE}. */
	directoryModes = /* @__PURE__ */ new Map();
	/** Directory mtimes advance when their immediate entry set changes. */
	directoryMtimes = /* @__PURE__ */ new Map();
	mutationListeners = /* @__PURE__ */ new Set();
	sink;
	temporaries = 0;
	identities = /* @__PURE__ */ new Map();
	lastIdentity = 0n;
	/**
	* Build the synchronous filesystem authority.
	* @param options - Optional durable write-behind sink.
	*/
	constructor(options = {}) {
		this.sink = options.sink;
	}
	/**
	* Settle the durable sink without changing in-memory success.
	* @returns A promise that resolves when all recorded mutations are stored.
	*/
	async flush() {
		await this.sink?.flush();
	}
	/**
	* Observe committed runtime mutations. Image seeding is deliberately silent.
	* @param listener - Consumer called after each successful mutation.
	* @returns A disposer that prevents future calls.
	*/
	subscribe(listener) {
		this.mutationListeners.add(listener);
		return () => {
			this.mutationListeners.delete(listener);
		};
	}
	/** Publish after state changes; one faulty observer cannot roll back a write. */
	publish(mutation) {
		const observers = [...this.sink === void 0 ? [] : [(change) => {
			this.sink?.record(change);
		}], ...this.mutationListeners];
		for (const listener of observers) try {
			listener(mutation);
		} catch (error) {
			console.error("webworker vfs: mutation observer failed", error);
		}
	}
	/** Promise face mirroring `node:fs/promises` for the methods the roster uses. */
	promises = {
		readFile: async (path, options) => this.readFileSync(path, options),
		writeFile: async (path, data, options) => {
			this.writeFileSync(path, data, options);
		},
		appendFile: async (path, data) => {
			this.appendFileSync(path, data);
		},
		mkdir: async (path, options) => this.mkdirSync(path, options),
		readdir: async (path, options) => this.readdirSync(path, options),
		stat: async (path, options) => this.statSync(path, options),
		lstat: async (path, options) => this.statSync(path, options),
		realpath: async (path) => this.realpathSync(path),
		rename: async (from, to) => {
			this.renameSync(from, to);
		},
		unlink: async (path) => {
			this.unlinkSync(path);
		},
		rm: async (path, options) => {
			this.rmSync(path, options);
		},
		mkdtemp: async (prefix) => this.mkdtempSync(prefix),
		link: async (existing, next) => {
			this.linkSync(existing, next);
		},
		truncate: async (path, length) => {
			this.truncateSync(path, length);
		},
		chmod: async (path, mode) => {
			this.chmodSync(path, mode);
		},
		opendir: async (path) => this.opendir(path),
		open: async (path, flags, mode) => this.open(path, flags, mode),
		/** Resolves for any existing path: the VFS grants read and write to everything it holds. */
		access: async (path) => {
			const target = normalize(resolve(path));
			if (!this.files.has(target) && !this.directories.has(target)) fail("ENOENT", "access", target);
		}
	};
	/** @returns Absolute path with no trailing separator. */
	key(path) {
		const absolute = normalize(resolve(path));
		return absolute.length > 1 && absolute.endsWith("/") ? absolute.slice(0, -1) : absolute;
	}
	/**
	* Read a file.
	* @param path - File path.
	* @param options - `'utf8'` or `{encoding}` for text; omitted for bytes.
	* @returns Text or a copy-free view of the stored bytes.
	*/
	readFileSync(path, options) {
		const target = this.key(path);
		const node = this.files.get(target);
		if (node === void 0) {
			if (this.directories.has(target)) fail("EISDIR", "read", target);
			fail("ENOENT", "open", target);
		}
		return encodingOf(options) === void 0 ? node.bytes : decoder.decode(node.bytes);
	}
	/**
	* Report whether a path exists.
	* @param path - Path to test.
	* @returns True for files and directories.
	*/
	existsSync(path) {
		const target = this.key(path);
		return this.files.has(target) || this.directories.has(target);
	}
	/**
	* Stat a path.
	* @param path - Path to stat.
	* @param options - `bigint` selects the BigInt stats Node returns for it.
	* @returns Stats for the file or directory.
	*/
	statSync(path, options) {
		const target = this.key(path);
		const node = this.files.get(target);
		const [size, mtimeMs, directory, mode] = node !== void 0 ? [
			node.bytes.length,
			node.mtimeMs,
			false,
			node.mode
		] : this.directories.has(target) ? [
			0,
			this.directoryMtimes.get(target) ?? 0,
			true,
			this.directoryModes.get(target) ?? DEFAULT_DIRECTORY_MODE
		] : fail("ENOENT", "stat", target);
		const identity = node === void 0 ? this.identityOf(target) : this.identityOfFile(node);
		return options?.bigint === true ? bigIntStatsOf(size, mtimeMs, directory, identity, mode, node === void 0 ? 1 : this.fileLinkCount(node)) : statsOf(size, mtimeMs, directory, identity, mode);
	}
	/** @returns Stats in the plain shape, for internal callers that read `size`/`mtimeMs`. */
	plainStats(path) {
		return this.statSync(path);
	}
	/** @returns The stable identity of an existing path, assigning one on first observation. */
	identityOf(target) {
		const existing = this.identities.get(target);
		if (existing !== void 0) return existing;
		this.lastIdentity += 1n;
		this.identities.set(target, this.lastIdentity);
		return this.lastIdentity;
	}
	/** @returns The inode-like identity retained by a file node across names. */
	identityOfFile(node) {
		if (node.identity !== void 0) return node.identity;
		this.lastIdentity += 1n;
		node.identity = this.lastIdentity;
		return node.identity;
	}
	/** @returns The number of names currently linked to one file node. */
	fileLinkCount(node) {
		return typeof node.paths === "string" ? 1 : node.paths?.size ?? 0;
	}
	/** Add one map name, promoting the rare hard-link case to a Set. */
	addFilePath(node, path) {
		if (node.paths === void 0) node.paths = path;
		else if (typeof node.paths === "string") node.paths = new Set([node.paths, path]);
		else node.paths.add(path);
	}
	/** Remove one map name, collapsing a remaining single link back to a string. */
	removeFilePath(node, path) {
		if (typeof node.paths === "string") {
			node.paths = void 0;
			return;
		}
		if (node.paths === void 0) return;
		node.paths.delete(path);
		if (node.paths.size === 1) {
			const [remaining] = node.paths;
			node.paths = remaining;
		}
	}
	/** Set one file-map entry while maintaining both nodes' reverse path indexes. */
	setFile(path, node) {
		const previous = this.files.get(path);
		if (previous === node) return;
		if (previous !== void 0) this.removeFilePath(previous, path);
		this.files.set(path, node);
		this.addFilePath(node, path);
	}
	/** Delete one file-map entry while retaining an unlinked node held by a descriptor. */
	deleteFile(path) {
		const node = this.files.get(path);
		if (node === void 0) return void 0;
		this.files.delete(path);
		this.removeFilePath(node, path);
		return node;
	}
	/** Publish one linked name after a content or metadata write. */
	publishFilePath(node, path, appendedFrom) {
		this.publish({
			kind: "write",
			path,
			bytes: node.bytes,
			mode: node.mode,
			entryChanged: false,
			...appendedFrom === void 0 ? {} : { appendedFrom }
		});
	}
	/** Publish a content or metadata write for every hard link to one node. */
	publishFile(node, appendedFrom) {
		if (typeof node.paths === "string") {
			this.publishFilePath(node, node.paths, appendedFrom);
			return;
		}
		if (node.paths === void 0) return;
		for (const path of node.paths) this.publishFilePath(node, path, appendedFrom);
	}
	/** Replace bytes on one file identity and notify all linked paths. */
	replaceFile(node, bytes, appendedFrom) {
		node.bytes = bytes;
		node.mtimeMs = this.touchNode(node);
		this.publishFile(node, appendedFrom);
	}
	/** Write at one offset, zero-filling any gap. */
	writeFileNode(node, position, data) {
		const offset = Math.max(0, position);
		const previousLength = node.bytes.length;
		const bytes = new Uint8Array(Math.max(previousLength, offset + data.length));
		bytes.set(node.bytes);
		bytes.set(data, offset);
		this.replaceFile(node, bytes, offset === previousLength ? previousLength : void 0);
		return data.length;
	}
	/** Resize one file identity and notify all linked paths. */
	truncateFile(node, length) {
		this.replaceFile(node, resize(node.bytes, length));
	}
	/** @returns Plain stats for an open file, including after its last name is removed. */
	fileStats(node) {
		return statsOf(node.bytes.length, node.mtimeMs, false, this.identityOfFile(node), node.mode);
	}
	/** Forget removed directory identities, so recreated paths report new ones. */
	forgetIdentity(target) {
		this.identities.delete(target);
		const prefix = `${target}/`;
		for (const known of [...this.identities.keys()]) if (known.startsWith(prefix)) this.identities.delete(known);
	}
	/**
	* Modification time for a write, strictly after the entry's previous one.
	*
	* The clock has millisecond resolution and these writes are in memory, so two
	* revisions of one file routinely land in the same millisecond. The filesystem
	* service's stale-write guard compares timestamps, so an equal one would let a
	* stale overwrite through.
	* @param target - Normalized path being written.
	* @returns Now, or one millisecond past the entry's current time.
	*/
	touch(target) {
		return this.touchNode(this.files.get(target));
	}
	/** @returns A modification time strictly newer than one file node's current value. */
	touchNode(node) {
		const previous = node?.mtimeMs;
		const now = Date.now();
		return previous === void 0 ? now : Math.max(now, previous + 1);
	}
	/** Advance a directory's mtime after its immediate children change. */
	touchDirectory(target) {
		const previous = this.directoryMtimes.get(target);
		const now = Date.now();
		this.directoryMtimes.set(target, previous === void 0 ? now : Math.max(now, previous + 1));
	}
	/**
	* List a directory.
	* @param path - Directory path.
	* @param options - `withFileTypes` returns {@link VfsDirent} objects instead of names.
	* @returns Immediate entry names, or directory entries.
	*/
	readdirSync(path, options) {
		const target = this.key(path);
		if (!this.directories.has(target)) {
			if (this.files.has(target)) fail("ENOTDIR", "scandir", target);
			fail("ENOENT", "scandir", target);
		}
		const prefix = target === "/" ? "/" : `${target}/`;
		const names = /* @__PURE__ */ new Set();
		for (const candidate of [...this.files.keys(), ...this.directories]) {
			if (!candidate.startsWith(prefix) || candidate === target) continue;
			const rest = candidate.slice(prefix.length);
			if (rest === "") continue;
			const [head = rest] = rest.split("/");
			names.add(head);
		}
		const sorted = [...names].sort();
		if (options?.withFileTypes !== true) return sorted;
		return sorted.map((name) => this.direntOf(target, name));
	}
	/** @returns Directory entry for one child of `directory`. */
	direntOf(directory, name) {
		const stats = this.plainStats(join(directory, name));
		return {
			name,
			parentPath: directory,
			isFile: () => stats.isFile(),
			isDirectory: () => stats.isDirectory(),
			isSymbolicLink: () => false
		};
	}
	/**
	* Resolve a path; the VFS has no symlinks, so this only normalizes.
	* @param path - Path to resolve.
	* @returns Absolute path.
	*/
	realpathSync(path) {
		const target = this.key(path);
		if (!this.existsSync(target)) fail("ENOENT", "realpath", target);
		return target;
	}
	/**
	* Create a directory.
	* @param path - Directory path.
	* @param options - `recursive` creates missing parents.
	* @returns First created path when recursive, otherwise undefined.
	*/
	mkdirSync(path, options) {
		const target = this.key(path);
		if (this.files.has(target)) fail("EEXIST", "mkdir", target);
		if (this.directories.has(target)) {
			if (options?.recursive === true) return void 0;
			fail("EEXIST", "mkdir", target);
		}
		const parent = dirname(target);
		if (!this.directories.has(parent)) {
			if (options?.recursive !== true) fail("ENOENT", "mkdir", target);
			this.mkdirSync(parent, options);
		}
		this.directories.add(target);
		this.touchDirectory(target);
		this.touchDirectory(parent);
		const mode = (options?.mode ?? DEFAULT_DIRECTORY_MODE) & 511;
		if (mode !== DEFAULT_DIRECTORY_MODE) this.directoryModes.set(target, mode);
		this.publish({
			kind: "mkdir",
			path: target,
			mode
		});
		return target;
	}
	/**
	* Write a file, replacing existing contents.
	* @param path - File path; its parent directory must exist.
	* @param data - Text or bytes.
	* @param options - `flag` `wx` refuses an existing file, `a` appends.
	*/
	writeFileSync(path, data, options) {
		const target = this.key(path);
		if (this.directories.has(target)) fail("EISDIR", "open", target);
		if (!this.directories.has(dirname(target))) fail("ENOENT", "open", target);
		const flag = options?.flag ?? "w";
		if (flag.startsWith("wx") && this.files.has(target)) fail("EEXIST", "open", target);
		if (flag.startsWith("a")) {
			this.appendFileSync(target, data);
			return;
		}
		const previous = this.files.get(target);
		const mode = previous?.mode ?? (options?.mode !== void 0 ? options.mode & 511 : DEFAULT_FILE_MODE);
		const bytes = typeof data === "string" ? encoder.encode(data) : data;
		if (previous !== void 0) {
			this.replaceFile(previous, bytes);
			return;
		}
		const node = {
			bytes,
			mtimeMs: this.touch(target),
			mode,
			paths: void 0
		};
		this.setFile(target, node);
		this.touchDirectory(dirname(target));
		this.publish({
			kind: "write",
			path: target,
			bytes,
			mode,
			entryChanged: true
		});
	}
	/**
	* Open a directory; consumers enumerate entries or just prove it is one.
	* @param path - Directory path.
	* @returns Directory handle.
	*/
	opendir(path) {
		const target = this.key(path);
		const names = this.readdirSync(target);
		let cursor = 0;
		const direntOf = (name) => this.direntOf(target, name);
		return {
			path: target,
			close: async () => {},
			read: async () => {
				const name = names[cursor];
				cursor += 1;
				return name === void 0 ? null : direntOf(name);
			},
			async *[Symbol.asyncIterator]() {
				for (const name of names) yield direntOf(name);
			}
		};
	}
	/**
	* Open a file handle.
	* @param path - File path.
	* @param flags - Node open flags; `r` requires the file, `wx` refuses an existing one.
	* @param mode - Permission bits applied when the open creates the file.
	* @returns File handle.
	*/
	open(path, flags = "r", mode) {
		const target = this.key(path);
		if (this.directories.has(target)) {
			if (!flags.startsWith("r")) fail("EISDIR", "open", target);
			return {
				write: async () => fail("EISDIR", "write", target),
				writeFile: async () => fail("EISDIR", "write", target),
				readFile: async () => fail("EISDIR", "read", target),
				truncate: async () => fail("EISDIR", "ftruncate", target),
				...this.handleTail(target)
			};
		}
		const file = this.openFileSync(target, flags, mode);
		let position = 0;
		let closed = false;
		const current = (syscall) => {
			if (closed) fail("EBADF", syscall, target);
			return file;
		};
		return {
			write: async (data) => {
				const bytes = typeof data === "string" ? encoder.encode(data) : data;
				const descriptor = current("write");
				const offset = descriptor.append ? descriptor.stat().size : position;
				const bytesWritten = descriptor.write(offset, bytes);
				position = offset + bytesWritten;
				return { bytesWritten };
			},
			writeFile: async (data) => {
				const bytes = typeof data === "string" ? encoder.encode(data) : data;
				const descriptor = current("write");
				const offset = descriptor.append ? descriptor.stat().size : position;
				position = offset + descriptor.write(offset, bytes);
			},
			readFile: async (options) => {
				const descriptor = current("read");
				const bytes = descriptor.read(position, Math.max(0, descriptor.stat().size - position));
				position += bytes.length;
				return encodingOf(options) === void 0 ? bytes : decoder.decode(bytes);
			},
			truncate: async (length = 0) => {
				current("ftruncate").truncate(length);
			},
			stat: async () => current("fstat").stat(),
			sync: async () => {
				current("fsync");
				await this.flush();
			},
			datasync: async () => {
				current("fdatasync");
				await this.flush();
			},
			close: async () => {
				closed = true;
			}
		};
	}
	/**
	* Open one synchronous descriptor over a stable file identity.
	* @param path - File path.
	* @param flags - Node open flags.
	* @param mode - Permission bits applied only when a file is created.
	* @returns An open file that survives path rename, replacement, and unlink.
	*/
	openFileSync(path, flags = "r", mode) {
		const target = this.key(path);
		const access = openMode(flags);
		const existing = this.files.get(target);
		if (this.directories.has(target)) fail("EISDIR", "open", target);
		if (access.exclusive && existing !== void 0) fail("EEXIST", "open", target);
		if (!access.create && existing === void 0) fail("ENOENT", "open", target);
		if (access.create && existing === void 0) this.writeFileSync(target, new Uint8Array(), mode === void 0 ? void 0 : { mode });
		else if (access.truncate && existing !== void 0) this.truncateFile(existing, 0);
		const node = this.files.get(target);
		if (node === void 0) fail("ENOENT", "open", target);
		return {
			readable: access.readable,
			writable: access.writable,
			append: access.append,
			read: (position, length) => {
				if (!access.readable) fail("EBADF", "read", target);
				return node.bytes.subarray(position, position + length);
			},
			write: (position, data) => {
				if (!access.writable) fail("EBADF", "write", target);
				return this.writeFileNode(node, access.append ? node.bytes.length : position, data);
			},
			truncate: (length) => {
				if (!access.writable) fail("EINVAL", "ftruncate", target);
				this.truncateFile(node, length);
			},
			stat: () => this.fileStats(node)
		};
	}
	/**
	* Directory-handle members for metadata, durability, and release.
	* `sync`/`datasync` settle an attached durable sink; an ephemeral filesystem
	* resolves immediately and `close` releases nothing.
	* @param target - Normalized path the handle was opened on.
	* @returns Metadata plus the no-op durability and release calls.
	*/
	handleTail(target) {
		return {
			stat: async () => this.plainStats(target),
			sync: async () => {
				await this.flush();
			},
			datasync: async () => {
				await this.flush();
			},
			close: async () => {}
		};
	}
	/**
	* Append to a file, creating it when absent.
	* @param path - File path.
	* @param data - Text or bytes.
	*/
	appendFileSync(path, data) {
		const target = this.key(path);
		const existing = this.files.get(target);
		const addition = typeof data === "string" ? encoder.encode(data) : data;
		if (existing === void 0) {
			this.writeFileSync(target, addition);
			return;
		}
		this.writeFileNode(existing, existing.bytes.length, addition);
	}
	/**
	* Move a file or directory subtree.
	* @param from - Source path.
	* @param to - Destination path.
	*/
	renameSync(from, to) {
		const source = this.key(from);
		const destination = this.key(to);
		if (source === destination) return;
		const node = this.files.get(source);
		if (node !== void 0) {
			if (this.directories.has(destination)) fail("EISDIR", "rename", destination);
			if (!this.directories.has(dirname(destination))) fail("ENOENT", "rename", destination);
			if (this.files.get(destination) === node) return;
			this.deleteFile(source);
			this.setFile(destination, node);
			this.forgetIdentity(source);
			this.forgetIdentity(destination);
			this.touchDirectory(dirname(source));
			this.touchDirectory(dirname(destination));
			this.publish({
				kind: "remove",
				path: source
			});
			this.publish({
				kind: "write",
				path: destination,
				bytes: node.bytes,
				mode: node.mode,
				entryChanged: true
			});
			return;
		}
		if (!this.directories.has(source)) fail("ENOENT", "rename", source);
		if (this.files.has(destination)) fail("ENOTDIR", "rename", destination);
		if (!this.directories.has(dirname(destination))) fail("ENOENT", "rename", destination);
		if (this.directories.has(destination)) {
			if (this.readdirSync(destination).length > 0) fail("ENOTEMPTY", "rename", destination);
			this.directories.delete(destination);
			this.directoryModes.delete(destination);
			this.directoryMtimes.delete(destination);
		}
		const prefix = `${source}/`;
		const movedFiles = [];
		for (const [candidate, value] of [...this.files]) {
			if (!candidate.startsWith(prefix)) continue;
			this.deleteFile(candidate);
			const target = join(destination, candidate.slice(prefix.length));
			this.setFile(target, value);
			movedFiles.push({
				path: target,
				bytes: value.bytes,
				mode: value.mode
			});
		}
		const movedDirectories = [];
		for (const candidate of [...this.directories]) {
			if (!candidate.startsWith(prefix) && candidate !== source) continue;
			const moved = candidate === source ? destination : join(destination, candidate.slice(prefix.length));
			this.directories.delete(candidate);
			this.directories.add(moved);
			const bits = this.directoryModes.get(candidate);
			this.directoryModes.delete(candidate);
			if (bits !== void 0) this.directoryModes.set(moved, bits);
			movedDirectories.push({
				path: moved,
				mode: bits ?? DEFAULT_DIRECTORY_MODE
			});
			const mtime = this.directoryMtimes.get(candidate);
			this.directoryMtimes.delete(candidate);
			if (mtime !== void 0) this.directoryMtimes.set(moved, mtime);
		}
		this.forgetIdentity(source);
		this.forgetIdentity(destination);
		this.touchDirectory(dirname(source));
		this.touchDirectory(dirname(destination));
		this.publish({
			kind: "remove",
			path: source
		});
		for (const directory of movedDirectories) this.publish({
			kind: "mkdir",
			path: directory.path,
			mode: directory.mode
		});
		for (const entry of movedFiles) this.publish({
			kind: "write",
			path: entry.path,
			bytes: entry.bytes,
			mode: entry.mode,
			entryChanged: true
		});
	}
	/**
	* Give existing bytes a second name.
	*
	* Both names retain one file identity, so writes and metadata changes through
	* either name remain visible through the other until that name is removed.
	* @param existing - Source file path.
	* @param next - Additional path; its parent must exist and it must be free.
	*/
	linkSync(existing, next) {
		const source = this.key(existing);
		const target = this.key(next);
		const node = this.files.get(source);
		if (node === void 0) fail("ENOENT", "link", source);
		if (this.files.has(target) || this.directories.has(target)) fail("EEXIST", "link", target);
		if (!this.directories.has(dirname(target))) fail("ENOENT", "link", target);
		this.setFile(target, node);
		this.touchDirectory(dirname(target));
		this.publish({
			kind: "write",
			path: target,
			bytes: node.bytes,
			mode: node.mode,
			entryChanged: true
		});
	}
	/**
	* Shorten a file.
	* @param path - File path.
	* @param length - Byte length to keep; defaults to zero.
	*/
	truncateSync(path, length = 0) {
		const target = this.key(path);
		const node = this.files.get(target);
		if (node === void 0) fail("ENOENT", "truncate", target);
		this.truncateFile(node, length);
	}
	/**
	* Change an entry's permission bits; stat reads back exactly what was set.
	* @param path - File or directory path.
	* @param mode - New permission bits (`0o777` mask).
	*/
	chmodSync(path, mode) {
		const target = this.key(path);
		const node = this.files.get(target);
		if (node !== void 0) {
			node.mode = mode & 511;
			if (typeof node.paths === "string") this.publish({
				kind: "chmod",
				path: node.paths,
				mode: node.mode
			});
			else if (node.paths !== void 0) for (const path of node.paths) this.publish({
				kind: "chmod",
				path,
				mode: node.mode
			});
			return;
		}
		if (this.directories.has(target)) {
			const bits = mode & 511;
			this.directoryModes.set(target, bits);
			this.publish({
				kind: "chmod",
				path: target,
				mode: bits
			});
			return;
		}
		fail("ENOENT", "chmod", target);
	}
	/**
	* Remove a file.
	* @param path - File path.
	*/
	unlinkSync(path) {
		const target = this.key(path);
		if (this.deleteFile(target) === void 0) fail("ENOENT", "unlink", target);
		this.forgetIdentity(target);
		this.touchDirectory(dirname(target));
		this.publish({
			kind: "remove",
			path: target
		});
	}
	/**
	* Remove a file or directory.
	* @param path - Path to remove.
	* @param options - `recursive` removes subtrees, `force` ignores absence.
	*/
	rmSync(path, options) {
		const target = this.key(path);
		if (this.deleteFile(target) !== void 0) {
			this.forgetIdentity(target);
			this.touchDirectory(dirname(target));
			this.publish({
				kind: "remove",
				path: target
			});
			return;
		}
		if (this.directories.has(target)) {
			if (options?.recursive !== true) fail("ERR_FS_EISDIR", "rm", target);
			const prefix = `${target}/`;
			for (const candidate of [...this.files.keys()]) if (candidate.startsWith(prefix)) this.deleteFile(candidate);
			for (const candidate of [...this.directories]) {
				if (!candidate.startsWith(prefix)) continue;
				this.directories.delete(candidate);
				this.directoryModes.delete(candidate);
				this.directoryMtimes.delete(candidate);
			}
			this.directories.delete(target);
			this.directoryModes.delete(target);
			this.directoryMtimes.delete(target);
			this.forgetIdentity(target);
			this.touchDirectory(dirname(target));
			this.publish({
				kind: "remove",
				path: target
			});
			return;
		}
		if (options?.force !== true) fail("ENOENT", "rm", target);
	}
	/**
	* Create a uniquely named directory beside `prefix`, as `fs.mkdtempSync` does.
	* @param prefix - Path prefix; the suffix is appended without a separator.
	* @returns The created directory path.
	*/
	mkdtempSync(prefix) {
		this.temporaries += 1;
		const target = `${prefix}${Date.now().toString(36)}${this.temporaries.toString(36)}`;
		this.mkdirSync(target, { recursive: true });
		return this.key(target);
	}
	/**
	* Seed a file and its parent directories, for image loading and tests.
	* @param path - File path.
	* @param data - Text or bytes.
	* @param options - Permission bits and modification time supplied by the image or durable store.
	*/
	seed(path, data, options = {}) {
		const target = this.key(path);
		this.seedDirectory(dirname(target));
		this.setFile(target, {
			bytes: typeof data === "string" ? encoder.encode(data) : data,
			mtimeMs: options.mtimeMs ?? this.touch(target),
			mode: (options.mode ?? DEFAULT_FILE_MODE) & 511,
			paths: void 0
		});
		this.touchDirectory(dirname(target));
	}
	/**
	* Create a directory and its parents.
	* @param path - Directory path.
	* @param options - Permission bits and modification time supplied by the image or durable store.
	*/
	seedDirectory(path, options = {}) {
		const target = this.key(path);
		if (!this.directories.has(target)) {
			const parent = dirname(target);
			if (parent !== target) this.seedDirectory(parent);
			if (this.files.has(target)) fail("EEXIST", "mkdir", target);
			this.directories.add(target);
			this.directoryMtimes.set(target, options.mtimeMs ?? Date.now());
			this.touchDirectory(parent);
		}
		if (options.mode !== void 0) this.directoryModes.set(target, options.mode & 511);
		if (options.mtimeMs !== void 0) this.directoryMtimes.set(target, options.mtimeMs);
	}
	/**
	* Report what this filesystem holds, for the host's boot diagnostics.
	* @returns File count, directory count, and total byte size.
	*/
	usage() {
		let bytes = 0;
		for (const node of this.files.values()) bytes += node.bytes.length;
		return {
			files: this.files.size,
			directories: this.directories.size,
			bytes
		};
	}
};
/**
* Mount a tar image produced by the build-time collector.
*
* Entry names are relative to `root` (`node_modules/...`, `config/cordis.yml`);
* an absolute entry name is a collector defect and fails loud. File contents
* stay views into `image` — nothing is copied at mount time.
* @param image - The ustar archive, as `inflateImage` produces it from the fetched image.
* @param root - Virtual root the entries mount under.
* @param vfs - Filesystem to fill; a fresh one by default.
* @returns The filled filesystem.
*/
function loadVfsImage(image, root = "/dsh", vfs = new MemoryVfs()) {
	vfs.seedDirectory(root);
	for (const entry of parseTar(image)) {
		const relativeName = entry.name.startsWith("./") ? entry.name.slice(2) : entry.name;
		if (relativeName.startsWith("/")) throw new Error(`webworker vfs: image entry must be relative to ${root}, received "${entry.name}"`);
		const target = join(root, relativeName);
		if (entry.directory) {
			vfs.seedDirectory(target, { mode: entry.mode });
			continue;
		}
		vfs.seed(target, entry.bytes, { mode: entry.mode });
	}
	return vfs;
}
/**
* Apply one ordered data overlay to an already mounted base image.
*
* Overlay entries may replace files only under the layout's data directories;
* module code, configuration, and the lowering manifest cannot be shadowed.
* Paths containing traversal segments are refused before normalization. Later
* overlays win for files, while file/directory type conflicts fail loud.
* @param image - Uncompressed ustar overlay archive.
* @param root - Virtual root shared with the base image.
* @param vfs - Mounted filesystem to update.
* @returns The same filesystem after applying the overlay.
*/
function loadVfsOverlay(image, root, vfs) {
	for (const entry of parseTar(image)) {
		const relativeName = entry.name.startsWith("./") ? entry.name.slice(2) : entry.name;
		const path = relativeName.endsWith("/") ? relativeName.slice(0, -1) : relativeName;
		const segments = path.split("/");
		if (path === "" || relativeName.startsWith("/") || segments.some((segment) => segment === "" || segment === "." || segment === "..") || !IMAGE_OVERLAY_DIRECTORIES.includes(segments[0] ?? "")) throw new Error(`webworker vfs: overlay entry must stay under ${IMAGE_OVERLAY_DIRECTORIES.join("/ or ")}, received "${entry.name}"`);
		const target = join(root, path);
		if (entry.directory) {
			vfs.seedDirectory(target, { mode: entry.mode });
			continue;
		}
		if (vfs.existsSync(target) && vfs.statSync(target).isDirectory()) throw new Error(`webworker vfs: overlay file cannot replace directory "${target}"`);
		vfs.seed(target, entry.bytes, { mode: entry.mode });
	}
	return vfs;
}
//#endregion
//#region src/storage/active.ts
let active;
/**
* Publish the filesystem the `node:fs` proxy reads.
* @param vfs - Filesystem mounted by the worker entry.
*/
function setActiveVfs(vfs) {
	active = vfs;
}
/**
* Read the mounted filesystem.
* @returns The active filesystem.
*/
function requireActiveVfs() {
	if (active === void 0) throw new Error("webworker vfs: no filesystem is mounted; the worker entry must call setActiveVfs before any node:fs access");
	return active;
}
function requireGlobalPort(channel) {
	if (channel !== void 0) return channel;
	const post = globalThis.postMessage;
	if (typeof post !== "function") throw new Error("webworker host: no channel; pass options.channel outside a dedicated worker");
	return { postMessage: (message, transfer) => {
		post(message, transfer);
	} };
}
async function readImage(image) {
	if (typeof image !== "string") return await inflateImage(image, "the image bytes given to createWorkerHost");
	const response = await fetch(image);
	if (!response.ok) throw new Error(`webworker host: image fetch failed with ${String(response.status)} for ${image}`);
	if (response.body === null) throw new Error(`webworker host: image response for ${image} carried no body`);
	return await inflateImageStream(response.body, image);
}
/**
* Build the worker host without touching the network or the image.
* @param options - Assembly inputs.
* @returns Handle whose `handleMessage` is ready immediately.
*/
function createWorkerHost(options) {
	const root = options.root ?? "/dsh";
	const configPath = options.configPath ?? join(root, "config/cordis.yml");
	const port = options.port ?? 3080;
	const tunnel = new TunnelServer({
		port: requireGlobalPort(options.channel),
		requestListener: options.requestListener,
		...options.privilegedMethods === void 0 ? {} : { privilegedMethods: options.privilegedMethods },
		...options.unaryApiLane === void 0 ? {} : { unaryApiLane: options.unaryApiLane }
	});
	let vfs;
	let modules;
	let context;
	const start = async () => {
		try {
			const home = join(root, IMAGE_HOME_DIRECTORY);
			installProcessGlobal({
				cwd: root,
				env: {
					DSH_HOME: home,
					HOME: home,
					...options.env
				}
			});
			const [bytes, overlays] = await Promise.all([readImage(options.image), Promise.all((options.overlays ?? []).map(readImage))]);
			const mounted = loadVfsImage(bytes, root);
			for (const overlay of overlays) loadVfsOverlay(overlay, root, mounted);
			for (const directory of IMAGE_EMPTY_DIRECTORIES) mounted.seedDirectory(join(root, directory.replace(/\/$/, "")));
			setActiveVfs(mounted);
			vfs = mounted;
			requireLoweredImage(mounted, options.manifestPath ?? join(root, "config/vfs-manifest.json"));
			const staticModules = { ...options.staticModules };
			for (const key of ["node:process", "process"]) staticModules[key] ??= () => globalThis.process;
			const loader = new WorkerModuleLoader({
				vfs: mounted,
				root,
				staticModules,
				...options.staticModulePrefixes === void 0 ? {} : { staticModulePrefixes: options.staticModulePrefixes },
				...options.alsCausality === void 0 ? {} : { alsCausality: options.alsCausality }
			});
			setActiveModuleLoader(loader);
			modules = loader;
			const require = loader.requireFrom(dirname(configPath));
			const appBoot = require("@deepseek-ai/dsh-app-boot");
			const cmdline = require("@deepseek-ai/dsh-cmdline");
			const { patches, presetOverlay } = bootPatches(loader, mounted, configPath, root);
			const ctx = await appBoot.boot("dsh-webworker", configPath, patches, (hostCtx) => {
				hostCtx.loader.internal = loader.internal;
				installLogSink(hostCtx, require);
				cmdline.provideCmdline(hostCtx, {
					args: [...options.cmdlineArgs ?? [
						"--host",
						"127.0.0.1",
						"--port",
						String(port),
						"--no-open"
					]],
					exit: (code) => {
						console.warn(`webworker host: tree requested exit(${String(code)})`);
					}
				});
			});
			context = ctx;
			const connection = ctx.get("connection");
			if (connection === void 0) throw new Error("webworker host: the tree activated without a Connection service");
			const typertGateway = ctx.get("typertGateway");
			if (typertGateway === void 0) throw new Error("webworker host: the tree activated without a typertGateway service");
			const handler = connection.createSharedFetchHandler("/api");
			const usage = loader.usage();
			console.info(`webworker host: tree active (modules=${String(usage.modules)}, data overlays=${String(overlays.length)}, preset root overlay=${presetOverlay ? "applied" : "already in roster"}, direct lane=connection.createSharedFetchHandler, als causality=${options.alsCausality === void 0 ? "inert" : "snapshot/restore"}, image lowering=${LOWERING_VERSION})`);
			tunnel.serve({
				directFetch: (request) => handler.fetch(request),
				bootPayload: () => readBootPayload(ctx),
				openStream: typertGateway.wireStream.open,
				streamFailure: typertGateway.wireStream.failure
			});
		} catch (reason) {
			tunnel.fail(reason);
			throw reason;
		}
	};
	return {
		handleMessage: (data) => {
			tunnel.handleMessage(data);
		},
		start,
		stop: async () => {
			tunnel.fail(/* @__PURE__ */ new Error("webworker host: the tree was disposed"));
			await context?.fiber.dispose();
		},
		get vfs() {
			return vfs;
		},
		get modules() {
			return modules;
		}
	};
}
/**
* Send the tree's own warnings and errors to the worker console.
*
* Cordis's `LoggerService` always exists and always accepts messages, but with
* no exporter mounted it only fills a ring buffer — and no profile in this
* repository mounts one, so `ctx.logger.warn(...)` reaches nothing. A provider
* that fails and is skipped (the skill registry logs exactly that) then looks
* identical to one that found nothing, which is how an empty skill catalog hid a
* filesystem fault twice.
*
* Warnings and errors only: `info`/`debug` from 131 plugin rows would bury the
* page console, and this exists to make failures visible rather than to trace.
* @param ctx - Host context, before any entry mounts.
* @param require - Image resolver, for cordis's own message renderer.
*/
function installLogSink(ctx, require) {
	const { Logger } = require("@deepseek-ai/cordis");
	const exporter = {
		colors: false,
		levels: { default: 2 },
		export: (message) => {
			if (message.type !== "warn" && message.type !== "error") return;
			const line = `${message.name}: ${Logger.format(exporter, message)}`;
			if (message.type === "error") console.error(line);
			else console.warn(line);
		}
	};
	ctx.logger.exporter(exporter);
}
/**
* Require the mounted image to carry bodies this build can wrap.
*
* The manifest the packer writes is the single source of truth: the worker holds
* no transform, so an image that was never lowered — or was lowered against
* different wrapper semantics — cannot be recovered at load and must be rebuilt.
* @param vfs - Mounted filesystem.
* @param path - Manifest path inside the image.
* @throws When the manifest is missing, unreadable, or names another contract.
*/
function requireLoweredImage(vfs, path) {
	if (!vfs.existsSync(path)) throw new Error(`webworker host: ${path} is missing, so the image records no lowering; rebuild the image`);
	const parsed = JSON.parse(vfs.readFileSync(path, "utf8"));
	if (typeof parsed !== "object" || parsed === null) throw new Error(`webworker host: ${path} does not hold an object`);
	const lowered = parsed.lowered;
	if (lowered !== "dsh-worker-transform/1") throw new Error(`webworker host: image was lowered by ${String(lowered)}, this build runs ${LOWERING_VERSION}; rebuild the image`);
}
/**
* The shipped preset root, as the application layer that owns the composition
* supplies it.
*
* A launcher appends this root itself rather than writing it into the roster —
* `apps/cli` does it in `composeProfile` (`profile-boot.ts:159-166`) because only
* the application knows where its own presets sit. The worker's presets travel
* in the image, so the same overlay names their virtual path. Patching replaces
* a row's whole `config`, so the current one is read and spread, and a roster
* that already names roots keeps them.
* @param loader - Module loader, for the image's YAML reader.
* @param vfs - Filesystem holding the composed configuration.
* @param configPath - Composed configuration path.
* @param root - Virtual root.
* @returns Boot patches (preset root overlay, frontend serving off) and
* whether the preset overlay was applied.
*/
function bootPatches(loader, vfs, configPath, root) {
	const text = vfs.readFileSync(configPath, "utf8");
	let rows;
	if (configPath.endsWith(".json")) rows = JSON.parse(text);
	else {
		const include = loader.load(loader.resolve("@deepseek-ai/cordis-plugin-include", root));
		rows = loader.load(loader.resolve("js-yaml", root)).load(text, { schema: include.entryListSchema });
	}
	const find = (entries, id) => {
		if (!Array.isArray(entries)) return void 0;
		for (const entry of entries) {
			if (entry.id === id) return entry;
			const nested = find(entry.config, id);
			if (nested !== void 0) return nested;
		}
	};
	const configOf = (row) => typeof row.config === "object" && row.config !== null && !Array.isArray(row.config) ? row.config : {};
	const patches = [];
	let presetOverlay = false;
	const presets = find(rows, "agent-presets");
	if (presets !== void 0 && configOf(presets).roots === void 0) {
		presetOverlay = true;
		patches.push({
			id: "agent-presets",
			config: {
				...configOf(presets),
				roots: [{
					path: join(root, "config/agent-presets"),
					trust: "system"
				}]
			}
		});
	}
	const jsonl = find(rows, "session-persistence-jsonl");
	if (jsonl !== void 0) patches.push({
		id: "session-persistence-jsonl",
		config: {
			...configOf(jsonl),
			compression: "none"
		}
	});
	return {
		patches,
		presetOverlay
	};
}
/**
* Assemble the payload the page's pre-Cordis bootstrap needs: the structured
* index injection table the served form renders into index.html. Collected
* from the in-process webserver service, never from the API surface, because
* the page has no Cordis tree yet.
* @param ctx - Booted host context.
* @returns Boot payload for `GET /__boot__`.
*/
function readBootPayload(ctx) {
	const webServer = ctx.get("webServer");
	if (webServer === void 0) throw new Error("webworker host: no webServer service, so the page cannot receive its boot injections");
	return { injections: webServer.collectIndexInjections() };
}
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
export { API_PREFIX, DEFAULT_CONDITIONS, DEFAULT_ROOT, IMAGE_CONFIG_PATH, IMAGE_EMPTY_DIRECTORIES, IMAGE_FILE_NAME, IMAGE_HOME_DIRECTORY, IMAGE_MANIFEST_PATH, IMAGE_OVERLAY_DIRECTORIES, LOWERING_VERSION, MemoryVfs, PREVIEW_FIXTURE_MANIFEST_FILE, PREVIEW_FIXTURE_MANIFEST_VERSION, SYNTHETIC_HOST, TunnelServer, WRAPPER_PARAMS, WorkerModuleLoader, createAlsRuntime, createSyntheticExchange, createWorkerHost, inflateImage, inflateImageStream, installProcessGlobal, loadVfsImage, loadVfsOverlay, lowerModuleSource, packTar, parseInboundFrame, parsePreviewFixtureManifest, parseTar, posix_path_exports as posixPath, requireActiveModuleLoader, requireActiveVfs, setActiveModuleLoader, setActiveVfs };
