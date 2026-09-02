//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
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
/**
* Collapse `.` and `..` segments.
* @param path - Path with any number of separators.
* @returns Normalized path; a relative input keeps leading `..` segments.
*/
function normalize$1(path) {
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
function join$1(...segments) {
	const joined = segments.filter((segment) => segment !== "").join("/");
	return joined === "" ? "." : normalize$1(joined);
}
/**
* Resolve segments right to left against a base directory.
* @param segments - Path segments; the first absolute one wins.
* @returns Absolute normalized path.
*/
function resolve$2(...segments) {
	let path = "";
	for (const segment of [...segments].reverse()) {
		if (segment === "") continue;
		path = path === "" ? segment : `${segment}/${path}`;
		if (segment.startsWith("/")) break;
	}
	return normalize$1(path.startsWith("/") ? path : `/${path}`);
}
/**
* Directory part of a path, after normalization (see the module note).
* @param path - Path to inspect.
* @returns Parent path; `/` for root children and `.` for bare names.
*/
function dirname$1(path) {
	const normalized = normalize$1(path).replace(/\/+$/, "");
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
function basename$1(path, suffix) {
	const normalized = normalize$1(path).replace(/\/+$/, "");
	const name = normalized.slice(normalized.lastIndexOf("/") + 1);
	if (suffix !== void 0 && suffix !== name && name.endsWith(suffix)) return name.slice(0, -suffix.length);
	return name;
}
/**
* Report whether a path starts at the root.
* @param path - Path to inspect.
* @returns True for absolute paths.
*/
function isAbsolute$1(path) {
	return path.startsWith("/");
}
/**
* Convert a VFS path into a `file:` URL string.
* @param path - Absolute VFS path.
* @returns URL text with each segment percent-encoded.
*/
function pathToFileUrl(path) {
	return `file://${resolve$2(path).split("/").map((segment) => encodeURIComponent(segment)).join("/")}`;
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
		if (path.endsWith("/")) return resolve$2(path);
		return this.vfs.existsSync(path) && this.vfs.statSync(path).isDirectory() ? resolve$2(path) : dirname$1(path);
	}
	manifestOf(directory) {
		const cached = this.manifests.get(directory);
		if (cached !== void 0) return cached;
		const path = join$1(directory, "package.json");
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
			if (this.vfs.existsSync(join$1(path, "package.json"))) {
				const main = this.manifestOf(path).main;
				if (main !== void 0) return this.probe(join$1(path, main), specifier);
			}
			return this.probe(join$1(path, "index"), specifier);
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
			path: this.probe(join$1(fromDirectory, specifier), specifier)
		};
		if (isAbsolute$1(specifier)) return {
			kind: "file",
			path: this.probe(specifier, specifier)
		};
		const segments = specifier.split("/");
		const packageName = specifier.startsWith("@") ? segments.slice(0, 2).join("/") : segments[0] ?? specifier;
		const rest = specifier.slice(packageName.length).replace(/^\//, "");
		const packageDirectory = join$1(this.root, "node_modules", packageName);
		if (!this.vfs.existsSync(join$1(packageDirectory, "package.json"))) return this.fail(`cannot resolve "${specifier}": ${packageDirectory}/package.json is not in the image`);
		const manifest = this.manifestOf(packageDirectory);
		const subpath = rest === "" ? "." : `./${rest}`;
		if (manifest.exports !== void 0) {
			const target = this.selectExport(manifest.exports, subpath, packageName);
			if (target === void 0) return this.fail(`"${packageName}" does not export "${subpath}" under conditions [${[...this.conditions].join(", ")}]`);
			return {
				kind: "file",
				path: this.probe(join$1(packageDirectory, target), specifier)
			};
		}
		const legacy = subpath === "." ? manifest.main ?? "index.js" : rest;
		return {
			kind: "file",
			path: this.probe(join$1(packageDirectory, legacy), specifier)
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
			const directory = dirname$1(path);
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
		const resolve = ((specifier) => {
			const resolution = this.resolve(specifier, fromDirectory);
			if (resolution.kind === "static") return this.fail(`"${specifier}" is a worker-provided module and has no VFS path`);
			return resolution.path;
		});
		resolve.paths = (specifier) => {
			if (this.staticModule(specifier) !== void 0 || specifier.startsWith("node:")) return null;
			if (specifier.startsWith(".")) return [resolve$2(fromDirectory, ".")];
			return [join$1(this.root, "node_modules")];
		};
		return Object.assign(require, { resolve });
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
//#region src/node/process-table.ts
const entries = /* @__PURE__ */ new Map();
let lastPid = 1;
/**
* Reserve one pid before its command starts, so a handle can report it
* synchronously.
* @returns the new table entry, still without its process.
*/
function registerProcess() {
	lastPid += 1;
	const entry = {
		pid: lastPid,
		signal: void 0,
		process: void 0
	};
	entries.set(entry.pid, entry);
	return entry;
}
/**
* Drop one entry once its command has settled.
* @param pid - the entry's pid.
*/
function releaseProcess(pid) {
	entries.delete(pid);
}
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
//#region src/transport/synthetic-http.ts
const encoder$4 = new TextEncoder();
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
			sink.chunk(typeof chunk === "string" ? encoder$4.encode(chunk) : chunk);
			return true;
		},
		end: (body) => {
			if (finished) return res;
			finished = true;
			const bytes = body === void 0 ? void 0 : typeof body === "string" ? encoder$4.encode(body) : body;
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
/** Host header the synthesized requests carry; the API trust fence requires one. */
const SYNTHETIC_HOST = "127.0.0.1";
const encoder$3 = new TextEncoder();
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
function describeFailure$1(reason) {
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
		const message = describeFailure$1(reason);
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
		const body = toTransferable(encoder$3.encode(message));
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
		const body = encoder$3.encode(JSON.stringify(this.seams.bootPayload()));
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
new TextEncoder();
const decoder$1 = new TextDecoder();
const BLOCK = 512;
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
const encoder$1 = new TextEncoder();
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
function encodingOf$1(options) {
	if (options === null || options === void 0) return void 0;
	if (typeof options === "string") return options;
	return options.encoding ?? void 0;
}
function statsOf$1(size, mtimeMs, directory, ino, mode) {
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
			const target = normalize$1(resolve$2(path));
			if (!this.files.has(target) && !this.directories.has(target)) fail("ENOENT", "access", target);
		}
	};
	/** @returns Absolute path with no trailing separator. */
	key(path) {
		const absolute = normalize$1(resolve$2(path));
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
		return encodingOf$1(options) === void 0 ? node.bytes : decoder.decode(node.bytes);
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
		return options?.bigint === true ? bigIntStatsOf(size, mtimeMs, directory, identity, mode, node === void 0 ? 1 : this.fileLinkCount(node)) : statsOf$1(size, mtimeMs, directory, identity, mode);
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
		return statsOf$1(node.bytes.length, node.mtimeMs, false, this.identityOfFile(node), node.mode);
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
		const stats = this.plainStats(join$1(directory, name));
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
		const parent = dirname$1(target);
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
		if (!this.directories.has(dirname$1(target))) fail("ENOENT", "open", target);
		const flag = options?.flag ?? "w";
		if (flag.startsWith("wx") && this.files.has(target)) fail("EEXIST", "open", target);
		if (flag.startsWith("a")) {
			this.appendFileSync(target, data);
			return;
		}
		const previous = this.files.get(target);
		const mode = previous?.mode ?? (options?.mode !== void 0 ? options.mode & 511 : DEFAULT_FILE_MODE);
		const bytes = typeof data === "string" ? encoder$1.encode(data) : data;
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
		this.touchDirectory(dirname$1(target));
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
				const bytes = typeof data === "string" ? encoder$1.encode(data) : data;
				const descriptor = current("write");
				const offset = descriptor.append ? descriptor.stat().size : position;
				const bytesWritten = descriptor.write(offset, bytes);
				position = offset + bytesWritten;
				return { bytesWritten };
			},
			writeFile: async (data) => {
				const bytes = typeof data === "string" ? encoder$1.encode(data) : data;
				const descriptor = current("write");
				const offset = descriptor.append ? descriptor.stat().size : position;
				position = offset + descriptor.write(offset, bytes);
			},
			readFile: async (options) => {
				const descriptor = current("read");
				const bytes = descriptor.read(position, Math.max(0, descriptor.stat().size - position));
				position += bytes.length;
				return encodingOf$1(options) === void 0 ? bytes : decoder.decode(bytes);
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
		const addition = typeof data === "string" ? encoder$1.encode(data) : data;
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
			if (!this.directories.has(dirname$1(destination))) fail("ENOENT", "rename", destination);
			if (this.files.get(destination) === node) return;
			this.deleteFile(source);
			this.setFile(destination, node);
			this.forgetIdentity(source);
			this.forgetIdentity(destination);
			this.touchDirectory(dirname$1(source));
			this.touchDirectory(dirname$1(destination));
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
		if (!this.directories.has(dirname$1(destination))) fail("ENOENT", "rename", destination);
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
			const target = join$1(destination, candidate.slice(prefix.length));
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
			const moved = candidate === source ? destination : join$1(destination, candidate.slice(prefix.length));
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
		this.touchDirectory(dirname$1(source));
		this.touchDirectory(dirname$1(destination));
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
		if (!this.directories.has(dirname$1(target))) fail("ENOENT", "link", target);
		this.setFile(target, node);
		this.touchDirectory(dirname$1(target));
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
		this.touchDirectory(dirname$1(target));
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
			this.touchDirectory(dirname$1(target));
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
			this.touchDirectory(dirname$1(target));
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
		this.seedDirectory(dirname$1(target));
		this.setFile(target, {
			bytes: typeof data === "string" ? encoder$1.encode(data) : data,
			mtimeMs: options.mtimeMs ?? this.touch(target),
			mode: (options.mode ?? DEFAULT_FILE_MODE) & 511,
			paths: void 0
		});
		this.touchDirectory(dirname$1(target));
	}
	/**
	* Create a directory and its parents.
	* @param path - Directory path.
	* @param options - Permission bits and modification time supplied by the image or durable store.
	*/
	seedDirectory(path, options = {}) {
		const target = this.key(path);
		if (!this.directories.has(target)) {
			const parent = dirname$1(target);
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
		const target = join$1(root, relativeName);
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
		const target = join$1(root, path);
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
	const configPath = options.configPath ?? join$1(root, "config/cordis.yml");
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
			const home = join$1(root, IMAGE_HOME_DIRECTORY);
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
			for (const directory of IMAGE_EMPTY_DIRECTORIES) mounted.seedDirectory(join$1(root, directory.replace(/\/$/, "")));
			setActiveVfs(mounted);
			vfs = mounted;
			requireLoweredImage(mounted, options.manifestPath ?? join$1(root, "config/vfs-manifest.json"));
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
			const require = loader.requireFrom(dirname$1(configPath));
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
					path: join$1(root, "config/agent-presets"),
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
//#region ../../../node_modules/.pnpm/base64-js@1.5.1/node_modules/base64-js/index.js
var require_base64_js = /* @__PURE__ */ __commonJSMin(((exports) => {
	exports.byteLength = byteLength;
	exports.toByteArray = toByteArray;
	exports.fromByteArray = fromByteArray;
	var lookup = [];
	var revLookup = [];
	var Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
	var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
	for (var i = 0, len = code.length; i < len; ++i) {
		lookup[i] = code[i];
		revLookup[code.charCodeAt(i)] = i;
	}
	revLookup["-".charCodeAt(0)] = 62;
	revLookup["_".charCodeAt(0)] = 63;
	function getLens(b64) {
		var len = b64.length;
		if (len % 4 > 0) throw new Error("Invalid string. Length must be a multiple of 4");
		var validLen = b64.indexOf("=");
		if (validLen === -1) validLen = len;
		var placeHoldersLen = validLen === len ? 0 : 4 - validLen % 4;
		return [validLen, placeHoldersLen];
	}
	function byteLength(b64) {
		var lens = getLens(b64);
		var validLen = lens[0];
		var placeHoldersLen = lens[1];
		return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
	}
	function _byteLength(b64, validLen, placeHoldersLen) {
		return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
	}
	function toByteArray(b64) {
		var tmp;
		var lens = getLens(b64);
		var validLen = lens[0];
		var placeHoldersLen = lens[1];
		var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));
		var curByte = 0;
		var len = placeHoldersLen > 0 ? validLen - 4 : validLen;
		var i;
		for (i = 0; i < len; i += 4) {
			tmp = revLookup[b64.charCodeAt(i)] << 18 | revLookup[b64.charCodeAt(i + 1)] << 12 | revLookup[b64.charCodeAt(i + 2)] << 6 | revLookup[b64.charCodeAt(i + 3)];
			arr[curByte++] = tmp >> 16 & 255;
			arr[curByte++] = tmp >> 8 & 255;
			arr[curByte++] = tmp & 255;
		}
		if (placeHoldersLen === 2) {
			tmp = revLookup[b64.charCodeAt(i)] << 2 | revLookup[b64.charCodeAt(i + 1)] >> 4;
			arr[curByte++] = tmp & 255;
		}
		if (placeHoldersLen === 1) {
			tmp = revLookup[b64.charCodeAt(i)] << 10 | revLookup[b64.charCodeAt(i + 1)] << 4 | revLookup[b64.charCodeAt(i + 2)] >> 2;
			arr[curByte++] = tmp >> 8 & 255;
			arr[curByte++] = tmp & 255;
		}
		return arr;
	}
	function tripletToBase64(num) {
		return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
	}
	function encodeChunk(uint8, start, end) {
		var tmp;
		var output = [];
		for (var i = start; i < end; i += 3) {
			tmp = (uint8[i] << 16 & 16711680) + (uint8[i + 1] << 8 & 65280) + (uint8[i + 2] & 255);
			output.push(tripletToBase64(tmp));
		}
		return output.join("");
	}
	function fromByteArray(uint8) {
		var tmp;
		var len = uint8.length;
		var extraBytes = len % 3;
		var parts = [];
		var maxChunkLength = 16383;
		for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) parts.push(encodeChunk(uint8, i, i + maxChunkLength > len2 ? len2 : i + maxChunkLength));
		if (extraBytes === 1) {
			tmp = uint8[len - 1];
			parts.push(lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "==");
		} else if (extraBytes === 2) {
			tmp = (uint8[len - 2] << 8) + uint8[len - 1];
			parts.push(lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "=");
		}
		return parts.join("");
	}
}));
//#endregion
//#region ../../../node_modules/.pnpm/ieee754@1.2.1/node_modules/ieee754/index.js
var require_ieee754 = /* @__PURE__ */ __commonJSMin(((exports) => {
	/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
	exports.read = function(buffer, offset, isLE, mLen, nBytes) {
		var e, m;
		var eLen = nBytes * 8 - mLen - 1;
		var eMax = (1 << eLen) - 1;
		var eBias = eMax >> 1;
		var nBits = -7;
		var i = isLE ? nBytes - 1 : 0;
		var d = isLE ? -1 : 1;
		var s = buffer[offset + i];
		i += d;
		e = s & (1 << -nBits) - 1;
		s >>= -nBits;
		nBits += eLen;
		for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);
		m = e & (1 << -nBits) - 1;
		e >>= -nBits;
		nBits += mLen;
		for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);
		if (e === 0) e = 1 - eBias;
		else if (e === eMax) return m ? NaN : (s ? -1 : 1) * Infinity;
		else {
			m = m + Math.pow(2, mLen);
			e = e - eBias;
		}
		return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
	};
	exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
		var e, m, c;
		var eLen = nBytes * 8 - mLen - 1;
		var eMax = (1 << eLen) - 1;
		var eBias = eMax >> 1;
		var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
		var i = isLE ? 0 : nBytes - 1;
		var d = isLE ? 1 : -1;
		var s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
		value = Math.abs(value);
		if (isNaN(value) || value === Infinity) {
			m = isNaN(value) ? 1 : 0;
			e = eMax;
		} else {
			e = Math.floor(Math.log(value) / Math.LN2);
			if (value * (c = Math.pow(2, -e)) < 1) {
				e--;
				c *= 2;
			}
			if (e + eBias >= 1) value += rt / c;
			else value += rt * Math.pow(2, 1 - eBias);
			if (value * c >= 2) {
				e++;
				c /= 2;
			}
			if (e + eBias >= eMax) {
				m = 0;
				e = eMax;
			} else if (e + eBias >= 1) {
				m = (value * c - 1) * Math.pow(2, mLen);
				e = e + eBias;
			} else {
				m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
				e = 0;
			}
		}
		for (; mLen >= 8; buffer[offset + i] = m & 255, i += d, m /= 256, mLen -= 8);
		e = e << mLen | m;
		eLen += mLen;
		for (; eLen > 0; buffer[offset + i] = e & 255, i += d, e /= 256, eLen -= 8);
		buffer[offset + i - d] |= s * 128;
	};
}));
//#endregion
//#region ../../../node_modules/.pnpm/buffer@6.0.3/node_modules/buffer/index.js
/*!
* The buffer module from node.js, for the browser.
*
* @author   Feross Aboukhadijeh <https://feross.org>
* @license  MIT
*/
var require_buffer = /* @__PURE__ */ __commonJSMin(((exports) => {
	const base64 = require_base64_js();
	const ieee754 = require_ieee754();
	const customInspectSymbol = typeof Symbol === "function" && typeof Symbol["for"] === "function" ? Symbol["for"]("nodejs.util.inspect.custom") : null;
	exports.Buffer = Buffer;
	exports.SlowBuffer = SlowBuffer;
	exports.INSPECT_MAX_BYTES = 50;
	const K_MAX_LENGTH = 2147483647;
	exports.kMaxLength = K_MAX_LENGTH;
	/**
	* If `Buffer.TYPED_ARRAY_SUPPORT`:
	*   === true    Use Uint8Array implementation (fastest)
	*   === false   Print warning and recommend using `buffer` v4.x which has an Object
	*               implementation (most compatible, even IE6)
	*
	* Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
	* Opera 11.6+, iOS 4.2+.
	*
	* We report that the browser does not support typed arrays if the are not subclassable
	* using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
	* (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
	* for __proto__ and has a buggy typed array implementation.
	*/
	Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport();
	if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== "undefined" && typeof console.error === "function") console.error("This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support.");
	function typedArraySupport() {
		try {
			const arr = new Uint8Array(1);
			const proto = { foo: function() {
				return 42;
			} };
			Object.setPrototypeOf(proto, Uint8Array.prototype);
			Object.setPrototypeOf(arr, proto);
			return arr.foo() === 42;
		} catch (e) {
			return false;
		}
	}
	Object.defineProperty(Buffer.prototype, "parent", {
		enumerable: true,
		get: function() {
			if (!Buffer.isBuffer(this)) return void 0;
			return this.buffer;
		}
	});
	Object.defineProperty(Buffer.prototype, "offset", {
		enumerable: true,
		get: function() {
			if (!Buffer.isBuffer(this)) return void 0;
			return this.byteOffset;
		}
	});
	function createBuffer(length) {
		if (length > K_MAX_LENGTH) throw new RangeError("The value \"" + length + "\" is invalid for option \"size\"");
		const buf = new Uint8Array(length);
		Object.setPrototypeOf(buf, Buffer.prototype);
		return buf;
	}
	/**
	* The Buffer constructor returns instances of `Uint8Array` that have their
	* prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
	* `Uint8Array`, so the returned instances will have all the node `Buffer` methods
	* and the `Uint8Array` methods. Square bracket notation works as expected -- it
	* returns a single octet.
	*
	* The `Uint8Array` prototype remains unmodified.
	*/
	function Buffer(arg, encodingOrOffset, length) {
		if (typeof arg === "number") {
			if (typeof encodingOrOffset === "string") throw new TypeError("The \"string\" argument must be of type string. Received type number");
			return allocUnsafe(arg);
		}
		return from(arg, encodingOrOffset, length);
	}
	Buffer.poolSize = 8192;
	function from(value, encodingOrOffset, length) {
		if (typeof value === "string") return fromString(value, encodingOrOffset);
		if (ArrayBuffer.isView(value)) return fromArrayView(value);
		if (value == null) throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value);
		if (isInstance(value, ArrayBuffer) || value && isInstance(value.buffer, ArrayBuffer)) return fromArrayBuffer(value, encodingOrOffset, length);
		if (typeof SharedArrayBuffer !== "undefined" && (isInstance(value, SharedArrayBuffer) || value && isInstance(value.buffer, SharedArrayBuffer))) return fromArrayBuffer(value, encodingOrOffset, length);
		if (typeof value === "number") throw new TypeError("The \"value\" argument must not be of type number. Received type number");
		const valueOf = value.valueOf && value.valueOf();
		if (valueOf != null && valueOf !== value) return Buffer.from(valueOf, encodingOrOffset, length);
		const b = fromObject(value);
		if (b) return b;
		if (typeof Symbol !== "undefined" && Symbol.toPrimitive != null && typeof value[Symbol.toPrimitive] === "function") return Buffer.from(value[Symbol.toPrimitive]("string"), encodingOrOffset, length);
		throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value);
	}
	/**
	* Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
	* if value is a number.
	* Buffer.from(str[, encoding])
	* Buffer.from(array)
	* Buffer.from(buffer)
	* Buffer.from(arrayBuffer[, byteOffset[, length]])
	**/
	Buffer.from = function(value, encodingOrOffset, length) {
		return from(value, encodingOrOffset, length);
	};
	Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype);
	Object.setPrototypeOf(Buffer, Uint8Array);
	function assertSize(size) {
		if (typeof size !== "number") throw new TypeError("\"size\" argument must be of type number");
		else if (size < 0) throw new RangeError("The value \"" + size + "\" is invalid for option \"size\"");
	}
	function alloc(size, fill, encoding) {
		assertSize(size);
		if (size <= 0) return createBuffer(size);
		if (fill !== void 0) return typeof encoding === "string" ? createBuffer(size).fill(fill, encoding) : createBuffer(size).fill(fill);
		return createBuffer(size);
	}
	/**
	* Creates a new filled Buffer instance.
	* alloc(size[, fill[, encoding]])
	**/
	Buffer.alloc = function(size, fill, encoding) {
		return alloc(size, fill, encoding);
	};
	function allocUnsafe(size) {
		assertSize(size);
		return createBuffer(size < 0 ? 0 : checked(size) | 0);
	}
	/**
	* Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
	* */
	Buffer.allocUnsafe = function(size) {
		return allocUnsafe(size);
	};
	/**
	* Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
	*/
	Buffer.allocUnsafeSlow = function(size) {
		return allocUnsafe(size);
	};
	function fromString(string, encoding) {
		if (typeof encoding !== "string" || encoding === "") encoding = "utf8";
		if (!Buffer.isEncoding(encoding)) throw new TypeError("Unknown encoding: " + encoding);
		const length = byteLength(string, encoding) | 0;
		let buf = createBuffer(length);
		const actual = buf.write(string, encoding);
		if (actual !== length) buf = buf.slice(0, actual);
		return buf;
	}
	function fromArrayLike(array) {
		const length = array.length < 0 ? 0 : checked(array.length) | 0;
		const buf = createBuffer(length);
		for (let i = 0; i < length; i += 1) buf[i] = array[i] & 255;
		return buf;
	}
	function fromArrayView(arrayView) {
		if (isInstance(arrayView, Uint8Array)) {
			const copy = new Uint8Array(arrayView);
			return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength);
		}
		return fromArrayLike(arrayView);
	}
	function fromArrayBuffer(array, byteOffset, length) {
		if (byteOffset < 0 || array.byteLength < byteOffset) throw new RangeError("\"offset\" is outside of buffer bounds");
		if (array.byteLength < byteOffset + (length || 0)) throw new RangeError("\"length\" is outside of buffer bounds");
		let buf;
		if (byteOffset === void 0 && length === void 0) buf = new Uint8Array(array);
		else if (length === void 0) buf = new Uint8Array(array, byteOffset);
		else buf = new Uint8Array(array, byteOffset, length);
		Object.setPrototypeOf(buf, Buffer.prototype);
		return buf;
	}
	function fromObject(obj) {
		if (Buffer.isBuffer(obj)) {
			const len = checked(obj.length) | 0;
			const buf = createBuffer(len);
			if (buf.length === 0) return buf;
			obj.copy(buf, 0, 0, len);
			return buf;
		}
		if (obj.length !== void 0) {
			if (typeof obj.length !== "number" || numberIsNaN(obj.length)) return createBuffer(0);
			return fromArrayLike(obj);
		}
		if (obj.type === "Buffer" && Array.isArray(obj.data)) return fromArrayLike(obj.data);
	}
	function checked(length) {
		if (length >= K_MAX_LENGTH) throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + K_MAX_LENGTH.toString(16) + " bytes");
		return length | 0;
	}
	function SlowBuffer(length) {
		if (+length != length) length = 0;
		return Buffer.alloc(+length);
	}
	Buffer.isBuffer = function isBuffer(b) {
		return b != null && b._isBuffer === true && b !== Buffer.prototype;
	};
	Buffer.compare = function compare(a, b) {
		if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength);
		if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength);
		if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) throw new TypeError("The \"buf1\", \"buf2\" arguments must be one of type Buffer or Uint8Array");
		if (a === b) return 0;
		let x = a.length;
		let y = b.length;
		for (let i = 0, len = Math.min(x, y); i < len; ++i) if (a[i] !== b[i]) {
			x = a[i];
			y = b[i];
			break;
		}
		if (x < y) return -1;
		if (y < x) return 1;
		return 0;
	};
	Buffer.isEncoding = function isEncoding(encoding) {
		switch (String(encoding).toLowerCase()) {
			case "hex":
			case "utf8":
			case "utf-8":
			case "ascii":
			case "latin1":
			case "binary":
			case "base64":
			case "ucs2":
			case "ucs-2":
			case "utf16le":
			case "utf-16le": return true;
			default: return false;
		}
	};
	Buffer.concat = function concat(list, length) {
		if (!Array.isArray(list)) throw new TypeError("\"list\" argument must be an Array of Buffers");
		if (list.length === 0) return Buffer.alloc(0);
		let i;
		if (length === void 0) {
			length = 0;
			for (i = 0; i < list.length; ++i) length += list[i].length;
		}
		const buffer = Buffer.allocUnsafe(length);
		let pos = 0;
		for (i = 0; i < list.length; ++i) {
			let buf = list[i];
			if (isInstance(buf, Uint8Array)) if (pos + buf.length > buffer.length) {
				if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);
				buf.copy(buffer, pos);
			} else Uint8Array.prototype.set.call(buffer, buf, pos);
			else if (!Buffer.isBuffer(buf)) throw new TypeError("\"list\" argument must be an Array of Buffers");
			else buf.copy(buffer, pos);
			pos += buf.length;
		}
		return buffer;
	};
	function byteLength(string, encoding) {
		if (Buffer.isBuffer(string)) return string.length;
		if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) return string.byteLength;
		if (typeof string !== "string") throw new TypeError("The \"string\" argument must be one of type string, Buffer, or ArrayBuffer. Received type " + typeof string);
		const len = string.length;
		const mustMatch = arguments.length > 2 && arguments[2] === true;
		if (!mustMatch && len === 0) return 0;
		let loweredCase = false;
		for (;;) switch (encoding) {
			case "ascii":
			case "latin1":
			case "binary": return len;
			case "utf8":
			case "utf-8": return utf8ToBytes(string).length;
			case "ucs2":
			case "ucs-2":
			case "utf16le":
			case "utf-16le": return len * 2;
			case "hex": return len >>> 1;
			case "base64": return base64ToBytes(string).length;
			default:
				if (loweredCase) return mustMatch ? -1 : utf8ToBytes(string).length;
				encoding = ("" + encoding).toLowerCase();
				loweredCase = true;
		}
	}
	Buffer.byteLength = byteLength;
	function slowToString(encoding, start, end) {
		let loweredCase = false;
		if (start === void 0 || start < 0) start = 0;
		if (start > this.length) return "";
		if (end === void 0 || end > this.length) end = this.length;
		if (end <= 0) return "";
		end >>>= 0;
		start >>>= 0;
		if (end <= start) return "";
		if (!encoding) encoding = "utf8";
		while (true) switch (encoding) {
			case "hex": return hexSlice(this, start, end);
			case "utf8":
			case "utf-8": return utf8Slice(this, start, end);
			case "ascii": return asciiSlice(this, start, end);
			case "latin1":
			case "binary": return latin1Slice(this, start, end);
			case "base64": return base64Slice(this, start, end);
			case "ucs2":
			case "ucs-2":
			case "utf16le":
			case "utf-16le": return utf16leSlice(this, start, end);
			default:
				if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
				encoding = (encoding + "").toLowerCase();
				loweredCase = true;
		}
	}
	Buffer.prototype._isBuffer = true;
	function swap(b, n, m) {
		const i = b[n];
		b[n] = b[m];
		b[m] = i;
	}
	Buffer.prototype.swap16 = function swap16() {
		const len = this.length;
		if (len % 2 !== 0) throw new RangeError("Buffer size must be a multiple of 16-bits");
		for (let i = 0; i < len; i += 2) swap(this, i, i + 1);
		return this;
	};
	Buffer.prototype.swap32 = function swap32() {
		const len = this.length;
		if (len % 4 !== 0) throw new RangeError("Buffer size must be a multiple of 32-bits");
		for (let i = 0; i < len; i += 4) {
			swap(this, i, i + 3);
			swap(this, i + 1, i + 2);
		}
		return this;
	};
	Buffer.prototype.swap64 = function swap64() {
		const len = this.length;
		if (len % 8 !== 0) throw new RangeError("Buffer size must be a multiple of 64-bits");
		for (let i = 0; i < len; i += 8) {
			swap(this, i, i + 7);
			swap(this, i + 1, i + 6);
			swap(this, i + 2, i + 5);
			swap(this, i + 3, i + 4);
		}
		return this;
	};
	Buffer.prototype.toString = function toString() {
		const length = this.length;
		if (length === 0) return "";
		if (arguments.length === 0) return utf8Slice(this, 0, length);
		return slowToString.apply(this, arguments);
	};
	Buffer.prototype.toLocaleString = Buffer.prototype.toString;
	Buffer.prototype.equals = function equals(b) {
		if (!Buffer.isBuffer(b)) throw new TypeError("Argument must be a Buffer");
		if (this === b) return true;
		return Buffer.compare(this, b) === 0;
	};
	Buffer.prototype.inspect = function inspect() {
		let str = "";
		const max = exports.INSPECT_MAX_BYTES;
		str = this.toString("hex", 0, max).replace(/(.{2})/g, "$1 ").trim();
		if (this.length > max) str += " ... ";
		return "<Buffer " + str + ">";
	};
	if (customInspectSymbol) Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect;
	Buffer.prototype.compare = function compare(target, start, end, thisStart, thisEnd) {
		if (isInstance(target, Uint8Array)) target = Buffer.from(target, target.offset, target.byteLength);
		if (!Buffer.isBuffer(target)) throw new TypeError("The \"target\" argument must be one of type Buffer or Uint8Array. Received type " + typeof target);
		if (start === void 0) start = 0;
		if (end === void 0) end = target ? target.length : 0;
		if (thisStart === void 0) thisStart = 0;
		if (thisEnd === void 0) thisEnd = this.length;
		if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) throw new RangeError("out of range index");
		if (thisStart >= thisEnd && start >= end) return 0;
		if (thisStart >= thisEnd) return -1;
		if (start >= end) return 1;
		start >>>= 0;
		end >>>= 0;
		thisStart >>>= 0;
		thisEnd >>>= 0;
		if (this === target) return 0;
		let x = thisEnd - thisStart;
		let y = end - start;
		const len = Math.min(x, y);
		const thisCopy = this.slice(thisStart, thisEnd);
		const targetCopy = target.slice(start, end);
		for (let i = 0; i < len; ++i) if (thisCopy[i] !== targetCopy[i]) {
			x = thisCopy[i];
			y = targetCopy[i];
			break;
		}
		if (x < y) return -1;
		if (y < x) return 1;
		return 0;
	};
	function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
		if (buffer.length === 0) return -1;
		if (typeof byteOffset === "string") {
			encoding = byteOffset;
			byteOffset = 0;
		} else if (byteOffset > 2147483647) byteOffset = 2147483647;
		else if (byteOffset < -2147483648) byteOffset = -2147483648;
		byteOffset = +byteOffset;
		if (numberIsNaN(byteOffset)) byteOffset = dir ? 0 : buffer.length - 1;
		if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
		if (byteOffset >= buffer.length) if (dir) return -1;
		else byteOffset = buffer.length - 1;
		else if (byteOffset < 0) if (dir) byteOffset = 0;
		else return -1;
		if (typeof val === "string") val = Buffer.from(val, encoding);
		if (Buffer.isBuffer(val)) {
			if (val.length === 0) return -1;
			return arrayIndexOf(buffer, val, byteOffset, encoding, dir);
		} else if (typeof val === "number") {
			val = val & 255;
			if (typeof Uint8Array.prototype.indexOf === "function") if (dir) return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset);
			else return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset);
			return arrayIndexOf(buffer, [val], byteOffset, encoding, dir);
		}
		throw new TypeError("val must be string, number or Buffer");
	}
	function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
		let indexSize = 1;
		let arrLength = arr.length;
		let valLength = val.length;
		if (encoding !== void 0) {
			encoding = String(encoding).toLowerCase();
			if (encoding === "ucs2" || encoding === "ucs-2" || encoding === "utf16le" || encoding === "utf-16le") {
				if (arr.length < 2 || val.length < 2) return -1;
				indexSize = 2;
				arrLength /= 2;
				valLength /= 2;
				byteOffset /= 2;
			}
		}
		function read(buf, i) {
			if (indexSize === 1) return buf[i];
			else return buf.readUInt16BE(i * indexSize);
		}
		let i;
		if (dir) {
			let foundIndex = -1;
			for (i = byteOffset; i < arrLength; i++) if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
				if (foundIndex === -1) foundIndex = i;
				if (i - foundIndex + 1 === valLength) return foundIndex * indexSize;
			} else {
				if (foundIndex !== -1) i -= i - foundIndex;
				foundIndex = -1;
			}
		} else {
			if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
			for (i = byteOffset; i >= 0; i--) {
				let found = true;
				for (let j = 0; j < valLength; j++) if (read(arr, i + j) !== read(val, j)) {
					found = false;
					break;
				}
				if (found) return i;
			}
		}
		return -1;
	}
	Buffer.prototype.includes = function includes(val, byteOffset, encoding) {
		return this.indexOf(val, byteOffset, encoding) !== -1;
	};
	Buffer.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
		return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
	};
	Buffer.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
		return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
	};
	function hexWrite(buf, string, offset, length) {
		offset = Number(offset) || 0;
		const remaining = buf.length - offset;
		if (!length) length = remaining;
		else {
			length = Number(length);
			if (length > remaining) length = remaining;
		}
		const strLen = string.length;
		if (length > strLen / 2) length = strLen / 2;
		let i;
		for (i = 0; i < length; ++i) {
			const parsed = parseInt(string.substr(i * 2, 2), 16);
			if (numberIsNaN(parsed)) return i;
			buf[offset + i] = parsed;
		}
		return i;
	}
	function utf8Write(buf, string, offset, length) {
		return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length);
	}
	function asciiWrite(buf, string, offset, length) {
		return blitBuffer(asciiToBytes(string), buf, offset, length);
	}
	function base64Write(buf, string, offset, length) {
		return blitBuffer(base64ToBytes(string), buf, offset, length);
	}
	function ucs2Write(buf, string, offset, length) {
		return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length);
	}
	Buffer.prototype.write = function write(string, offset, length, encoding) {
		if (offset === void 0) {
			encoding = "utf8";
			length = this.length;
			offset = 0;
		} else if (length === void 0 && typeof offset === "string") {
			encoding = offset;
			length = this.length;
			offset = 0;
		} else if (isFinite(offset)) {
			offset = offset >>> 0;
			if (isFinite(length)) {
				length = length >>> 0;
				if (encoding === void 0) encoding = "utf8";
			} else {
				encoding = length;
				length = void 0;
			}
		} else throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
		const remaining = this.length - offset;
		if (length === void 0 || length > remaining) length = remaining;
		if (string.length > 0 && (length < 0 || offset < 0) || offset > this.length) throw new RangeError("Attempt to write outside buffer bounds");
		if (!encoding) encoding = "utf8";
		let loweredCase = false;
		for (;;) switch (encoding) {
			case "hex": return hexWrite(this, string, offset, length);
			case "utf8":
			case "utf-8": return utf8Write(this, string, offset, length);
			case "ascii":
			case "latin1":
			case "binary": return asciiWrite(this, string, offset, length);
			case "base64": return base64Write(this, string, offset, length);
			case "ucs2":
			case "ucs-2":
			case "utf16le":
			case "utf-16le": return ucs2Write(this, string, offset, length);
			default:
				if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
				encoding = ("" + encoding).toLowerCase();
				loweredCase = true;
		}
	};
	Buffer.prototype.toJSON = function toJSON() {
		return {
			type: "Buffer",
			data: Array.prototype.slice.call(this._arr || this, 0)
		};
	};
	function base64Slice(buf, start, end) {
		if (start === 0 && end === buf.length) return base64.fromByteArray(buf);
		else return base64.fromByteArray(buf.slice(start, end));
	}
	function utf8Slice(buf, start, end) {
		end = Math.min(buf.length, end);
		const res = [];
		let i = start;
		while (i < end) {
			const firstByte = buf[i];
			let codePoint = null;
			let bytesPerSequence = firstByte > 239 ? 4 : firstByte > 223 ? 3 : firstByte > 191 ? 2 : 1;
			if (i + bytesPerSequence <= end) {
				let secondByte, thirdByte, fourthByte, tempCodePoint;
				switch (bytesPerSequence) {
					case 1:
						if (firstByte < 128) codePoint = firstByte;
						break;
					case 2:
						secondByte = buf[i + 1];
						if ((secondByte & 192) === 128) {
							tempCodePoint = (firstByte & 31) << 6 | secondByte & 63;
							if (tempCodePoint > 127) codePoint = tempCodePoint;
						}
						break;
					case 3:
						secondByte = buf[i + 1];
						thirdByte = buf[i + 2];
						if ((secondByte & 192) === 128 && (thirdByte & 192) === 128) {
							tempCodePoint = (firstByte & 15) << 12 | (secondByte & 63) << 6 | thirdByte & 63;
							if (tempCodePoint > 2047 && (tempCodePoint < 55296 || tempCodePoint > 57343)) codePoint = tempCodePoint;
						}
						break;
					case 4:
						secondByte = buf[i + 1];
						thirdByte = buf[i + 2];
						fourthByte = buf[i + 3];
						if ((secondByte & 192) === 128 && (thirdByte & 192) === 128 && (fourthByte & 192) === 128) {
							tempCodePoint = (firstByte & 15) << 18 | (secondByte & 63) << 12 | (thirdByte & 63) << 6 | fourthByte & 63;
							if (tempCodePoint > 65535 && tempCodePoint < 1114112) codePoint = tempCodePoint;
						}
				}
			}
			if (codePoint === null) {
				codePoint = 65533;
				bytesPerSequence = 1;
			} else if (codePoint > 65535) {
				codePoint -= 65536;
				res.push(codePoint >>> 10 & 1023 | 55296);
				codePoint = 56320 | codePoint & 1023;
			}
			res.push(codePoint);
			i += bytesPerSequence;
		}
		return decodeCodePointsArray(res);
	}
	const MAX_ARGUMENTS_LENGTH = 4096;
	function decodeCodePointsArray(codePoints) {
		const len = codePoints.length;
		if (len <= MAX_ARGUMENTS_LENGTH) return String.fromCharCode.apply(String, codePoints);
		let res = "";
		let i = 0;
		while (i < len) res += String.fromCharCode.apply(String, codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH));
		return res;
	}
	function asciiSlice(buf, start, end) {
		let ret = "";
		end = Math.min(buf.length, end);
		for (let i = start; i < end; ++i) ret += String.fromCharCode(buf[i] & 127);
		return ret;
	}
	function latin1Slice(buf, start, end) {
		let ret = "";
		end = Math.min(buf.length, end);
		for (let i = start; i < end; ++i) ret += String.fromCharCode(buf[i]);
		return ret;
	}
	function hexSlice(buf, start, end) {
		const len = buf.length;
		if (!start || start < 0) start = 0;
		if (!end || end < 0 || end > len) end = len;
		let out = "";
		for (let i = start; i < end; ++i) out += hexSliceLookupTable[buf[i]];
		return out;
	}
	function utf16leSlice(buf, start, end) {
		const bytes = buf.slice(start, end);
		let res = "";
		for (let i = 0; i < bytes.length - 1; i += 2) res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
		return res;
	}
	Buffer.prototype.slice = function slice(start, end) {
		const len = this.length;
		start = ~~start;
		end = end === void 0 ? len : ~~end;
		if (start < 0) {
			start += len;
			if (start < 0) start = 0;
		} else if (start > len) start = len;
		if (end < 0) {
			end += len;
			if (end < 0) end = 0;
		} else if (end > len) end = len;
		if (end < start) end = start;
		const newBuf = this.subarray(start, end);
		Object.setPrototypeOf(newBuf, Buffer.prototype);
		return newBuf;
	};
	function checkOffset(offset, ext, length) {
		if (offset % 1 !== 0 || offset < 0) throw new RangeError("offset is not uint");
		if (offset + ext > length) throw new RangeError("Trying to access beyond buffer length");
	}
	Buffer.prototype.readUintLE = Buffer.prototype.readUIntLE = function readUIntLE(offset, byteLength, noAssert) {
		offset = offset >>> 0;
		byteLength = byteLength >>> 0;
		if (!noAssert) checkOffset(offset, byteLength, this.length);
		let val = this[offset];
		let mul = 1;
		let i = 0;
		while (++i < byteLength && (mul *= 256)) val += this[offset + i] * mul;
		return val;
	};
	Buffer.prototype.readUintBE = Buffer.prototype.readUIntBE = function readUIntBE(offset, byteLength, noAssert) {
		offset = offset >>> 0;
		byteLength = byteLength >>> 0;
		if (!noAssert) checkOffset(offset, byteLength, this.length);
		let val = this[offset + --byteLength];
		let mul = 1;
		while (byteLength > 0 && (mul *= 256)) val += this[offset + --byteLength] * mul;
		return val;
	};
	Buffer.prototype.readUint8 = Buffer.prototype.readUInt8 = function readUInt8(offset, noAssert) {
		offset = offset >>> 0;
		if (!noAssert) checkOffset(offset, 1, this.length);
		return this[offset];
	};
	Buffer.prototype.readUint16LE = Buffer.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
		offset = offset >>> 0;
		if (!noAssert) checkOffset(offset, 2, this.length);
		return this[offset] | this[offset + 1] << 8;
	};
	Buffer.prototype.readUint16BE = Buffer.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
		offset = offset >>> 0;
		if (!noAssert) checkOffset(offset, 2, this.length);
		return this[offset] << 8 | this[offset + 1];
	};
	Buffer.prototype.readUint32LE = Buffer.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
		offset = offset >>> 0;
		if (!noAssert) checkOffset(offset, 4, this.length);
		return (this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16) + this[offset + 3] * 16777216;
	};
	Buffer.prototype.readUint32BE = Buffer.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
		offset = offset >>> 0;
		if (!noAssert) checkOffset(offset, 4, this.length);
		return this[offset] * 16777216 + (this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]);
	};
	Buffer.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE(offset) {
		offset = offset >>> 0;
		validateNumber(offset, "offset");
		const first = this[offset];
		const last = this[offset + 7];
		if (first === void 0 || last === void 0) boundsError(offset, this.length - 8);
		const lo = first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24;
		const hi = this[++offset] + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + last * 2 ** 24;
		return BigInt(lo) + (BigInt(hi) << BigInt(32));
	});
	Buffer.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE(offset) {
		offset = offset >>> 0;
		validateNumber(offset, "offset");
		const first = this[offset];
		const last = this[offset + 7];
		if (first === void 0 || last === void 0) boundsError(offset, this.length - 8);
		const hi = first * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
		const lo = this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last;
		return (BigInt(hi) << BigInt(32)) + BigInt(lo);
	});
	Buffer.prototype.readIntLE = function readIntLE(offset, byteLength, noAssert) {
		offset = offset >>> 0;
		byteLength = byteLength >>> 0;
		if (!noAssert) checkOffset(offset, byteLength, this.length);
		let val = this[offset];
		let mul = 1;
		let i = 0;
		while (++i < byteLength && (mul *= 256)) val += this[offset + i] * mul;
		mul *= 128;
		if (val >= mul) val -= Math.pow(2, 8 * byteLength);
		return val;
	};
	Buffer.prototype.readIntBE = function readIntBE(offset, byteLength, noAssert) {
		offset = offset >>> 0;
		byteLength = byteLength >>> 0;
		if (!noAssert) checkOffset(offset, byteLength, this.length);
		let i = byteLength;
		let mul = 1;
		let val = this[offset + --i];
		while (i > 0 && (mul *= 256)) val += this[offset + --i] * mul;
		mul *= 128;
		if (val >= mul) val -= Math.pow(2, 8 * byteLength);
		return val;
	};
	Buffer.prototype.readInt8 = function readInt8(offset, noAssert) {
		offset = offset >>> 0;
		if (!noAssert) checkOffset(offset, 1, this.length);
		if (!(this[offset] & 128)) return this[offset];
		return (255 - this[offset] + 1) * -1;
	};
	Buffer.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
		offset = offset >>> 0;
		if (!noAssert) checkOffset(offset, 2, this.length);
		const val = this[offset] | this[offset + 1] << 8;
		return val & 32768 ? val | 4294901760 : val;
	};
	Buffer.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
		offset = offset >>> 0;
		if (!noAssert) checkOffset(offset, 2, this.length);
		const val = this[offset + 1] | this[offset] << 8;
		return val & 32768 ? val | 4294901760 : val;
	};
	Buffer.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
		offset = offset >>> 0;
		if (!noAssert) checkOffset(offset, 4, this.length);
		return this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16 | this[offset + 3] << 24;
	};
	Buffer.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
		offset = offset >>> 0;
		if (!noAssert) checkOffset(offset, 4, this.length);
		return this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3];
	};
	Buffer.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE(offset) {
		offset = offset >>> 0;
		validateNumber(offset, "offset");
		const first = this[offset];
		const last = this[offset + 7];
		if (first === void 0 || last === void 0) boundsError(offset, this.length - 8);
		const val = this[offset + 4] + this[offset + 5] * 2 ** 8 + this[offset + 6] * 2 ** 16 + (last << 24);
		return (BigInt(val) << BigInt(32)) + BigInt(first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24);
	});
	Buffer.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE(offset) {
		offset = offset >>> 0;
		validateNumber(offset, "offset");
		const first = this[offset];
		const last = this[offset + 7];
		if (first === void 0 || last === void 0) boundsError(offset, this.length - 8);
		const val = (first << 24) + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
		return (BigInt(val) << BigInt(32)) + BigInt(this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last);
	});
	Buffer.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
		offset = offset >>> 0;
		if (!noAssert) checkOffset(offset, 4, this.length);
		return ieee754.read(this, offset, true, 23, 4);
	};
	Buffer.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
		offset = offset >>> 0;
		if (!noAssert) checkOffset(offset, 4, this.length);
		return ieee754.read(this, offset, false, 23, 4);
	};
	Buffer.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
		offset = offset >>> 0;
		if (!noAssert) checkOffset(offset, 8, this.length);
		return ieee754.read(this, offset, true, 52, 8);
	};
	Buffer.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
		offset = offset >>> 0;
		if (!noAssert) checkOffset(offset, 8, this.length);
		return ieee754.read(this, offset, false, 52, 8);
	};
	function checkInt(buf, value, offset, ext, max, min) {
		if (!Buffer.isBuffer(buf)) throw new TypeError("\"buffer\" argument must be a Buffer instance");
		if (value > max || value < min) throw new RangeError("\"value\" argument is out of bounds");
		if (offset + ext > buf.length) throw new RangeError("Index out of range");
	}
	Buffer.prototype.writeUintLE = Buffer.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength, noAssert) {
		value = +value;
		offset = offset >>> 0;
		byteLength = byteLength >>> 0;
		if (!noAssert) {
			const maxBytes = Math.pow(2, 8 * byteLength) - 1;
			checkInt(this, value, offset, byteLength, maxBytes, 0);
		}
		let mul = 1;
		let i = 0;
		this[offset] = value & 255;
		while (++i < byteLength && (mul *= 256)) this[offset + i] = value / mul & 255;
		return offset + byteLength;
	};
	Buffer.prototype.writeUintBE = Buffer.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength, noAssert) {
		value = +value;
		offset = offset >>> 0;
		byteLength = byteLength >>> 0;
		if (!noAssert) {
			const maxBytes = Math.pow(2, 8 * byteLength) - 1;
			checkInt(this, value, offset, byteLength, maxBytes, 0);
		}
		let i = byteLength - 1;
		let mul = 1;
		this[offset + i] = value & 255;
		while (--i >= 0 && (mul *= 256)) this[offset + i] = value / mul & 255;
		return offset + byteLength;
	};
	Buffer.prototype.writeUint8 = Buffer.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
		value = +value;
		offset = offset >>> 0;
		if (!noAssert) checkInt(this, value, offset, 1, 255, 0);
		this[offset] = value & 255;
		return offset + 1;
	};
	Buffer.prototype.writeUint16LE = Buffer.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
		value = +value;
		offset = offset >>> 0;
		if (!noAssert) checkInt(this, value, offset, 2, 65535, 0);
		this[offset] = value & 255;
		this[offset + 1] = value >>> 8;
		return offset + 2;
	};
	Buffer.prototype.writeUint16BE = Buffer.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
		value = +value;
		offset = offset >>> 0;
		if (!noAssert) checkInt(this, value, offset, 2, 65535, 0);
		this[offset] = value >>> 8;
		this[offset + 1] = value & 255;
		return offset + 2;
	};
	Buffer.prototype.writeUint32LE = Buffer.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
		value = +value;
		offset = offset >>> 0;
		if (!noAssert) checkInt(this, value, offset, 4, 4294967295, 0);
		this[offset + 3] = value >>> 24;
		this[offset + 2] = value >>> 16;
		this[offset + 1] = value >>> 8;
		this[offset] = value & 255;
		return offset + 4;
	};
	Buffer.prototype.writeUint32BE = Buffer.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
		value = +value;
		offset = offset >>> 0;
		if (!noAssert) checkInt(this, value, offset, 4, 4294967295, 0);
		this[offset] = value >>> 24;
		this[offset + 1] = value >>> 16;
		this[offset + 2] = value >>> 8;
		this[offset + 3] = value & 255;
		return offset + 4;
	};
	function wrtBigUInt64LE(buf, value, offset, min, max) {
		checkIntBI(value, min, max, buf, offset, 7);
		let lo = Number(value & BigInt(4294967295));
		buf[offset++] = lo;
		lo = lo >> 8;
		buf[offset++] = lo;
		lo = lo >> 8;
		buf[offset++] = lo;
		lo = lo >> 8;
		buf[offset++] = lo;
		let hi = Number(value >> BigInt(32) & BigInt(4294967295));
		buf[offset++] = hi;
		hi = hi >> 8;
		buf[offset++] = hi;
		hi = hi >> 8;
		buf[offset++] = hi;
		hi = hi >> 8;
		buf[offset++] = hi;
		return offset;
	}
	function wrtBigUInt64BE(buf, value, offset, min, max) {
		checkIntBI(value, min, max, buf, offset, 7);
		let lo = Number(value & BigInt(4294967295));
		buf[offset + 7] = lo;
		lo = lo >> 8;
		buf[offset + 6] = lo;
		lo = lo >> 8;
		buf[offset + 5] = lo;
		lo = lo >> 8;
		buf[offset + 4] = lo;
		let hi = Number(value >> BigInt(32) & BigInt(4294967295));
		buf[offset + 3] = hi;
		hi = hi >> 8;
		buf[offset + 2] = hi;
		hi = hi >> 8;
		buf[offset + 1] = hi;
		hi = hi >> 8;
		buf[offset] = hi;
		return offset + 8;
	}
	Buffer.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE(value, offset = 0) {
		return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
	});
	Buffer.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE(value, offset = 0) {
		return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
	});
	Buffer.prototype.writeIntLE = function writeIntLE(value, offset, byteLength, noAssert) {
		value = +value;
		offset = offset >>> 0;
		if (!noAssert) {
			const limit = Math.pow(2, 8 * byteLength - 1);
			checkInt(this, value, offset, byteLength, limit - 1, -limit);
		}
		let i = 0;
		let mul = 1;
		let sub = 0;
		this[offset] = value & 255;
		while (++i < byteLength && (mul *= 256)) {
			if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) sub = 1;
			this[offset + i] = (value / mul >> 0) - sub & 255;
		}
		return offset + byteLength;
	};
	Buffer.prototype.writeIntBE = function writeIntBE(value, offset, byteLength, noAssert) {
		value = +value;
		offset = offset >>> 0;
		if (!noAssert) {
			const limit = Math.pow(2, 8 * byteLength - 1);
			checkInt(this, value, offset, byteLength, limit - 1, -limit);
		}
		let i = byteLength - 1;
		let mul = 1;
		let sub = 0;
		this[offset + i] = value & 255;
		while (--i >= 0 && (mul *= 256)) {
			if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) sub = 1;
			this[offset + i] = (value / mul >> 0) - sub & 255;
		}
		return offset + byteLength;
	};
	Buffer.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
		value = +value;
		offset = offset >>> 0;
		if (!noAssert) checkInt(this, value, offset, 1, 127, -128);
		if (value < 0) value = 255 + value + 1;
		this[offset] = value & 255;
		return offset + 1;
	};
	Buffer.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
		value = +value;
		offset = offset >>> 0;
		if (!noAssert) checkInt(this, value, offset, 2, 32767, -32768);
		this[offset] = value & 255;
		this[offset + 1] = value >>> 8;
		return offset + 2;
	};
	Buffer.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
		value = +value;
		offset = offset >>> 0;
		if (!noAssert) checkInt(this, value, offset, 2, 32767, -32768);
		this[offset] = value >>> 8;
		this[offset + 1] = value & 255;
		return offset + 2;
	};
	Buffer.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
		value = +value;
		offset = offset >>> 0;
		if (!noAssert) checkInt(this, value, offset, 4, 2147483647, -2147483648);
		this[offset] = value & 255;
		this[offset + 1] = value >>> 8;
		this[offset + 2] = value >>> 16;
		this[offset + 3] = value >>> 24;
		return offset + 4;
	};
	Buffer.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
		value = +value;
		offset = offset >>> 0;
		if (!noAssert) checkInt(this, value, offset, 4, 2147483647, -2147483648);
		if (value < 0) value = 4294967295 + value + 1;
		this[offset] = value >>> 24;
		this[offset + 1] = value >>> 16;
		this[offset + 2] = value >>> 8;
		this[offset + 3] = value & 255;
		return offset + 4;
	};
	Buffer.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE(value, offset = 0) {
		return wrtBigUInt64LE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
	});
	Buffer.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE(value, offset = 0) {
		return wrtBigUInt64BE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
	});
	function checkIEEE754(buf, value, offset, ext, max, min) {
		if (offset + ext > buf.length) throw new RangeError("Index out of range");
		if (offset < 0) throw new RangeError("Index out of range");
	}
	function writeFloat(buf, value, offset, littleEndian, noAssert) {
		value = +value;
		offset = offset >>> 0;
		if (!noAssert) checkIEEE754(buf, value, offset, 4, 34028234663852886e22, -34028234663852886e22);
		ieee754.write(buf, value, offset, littleEndian, 23, 4);
		return offset + 4;
	}
	Buffer.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
		return writeFloat(this, value, offset, true, noAssert);
	};
	Buffer.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
		return writeFloat(this, value, offset, false, noAssert);
	};
	function writeDouble(buf, value, offset, littleEndian, noAssert) {
		value = +value;
		offset = offset >>> 0;
		if (!noAssert) checkIEEE754(buf, value, offset, 8, 17976931348623157e292, -17976931348623157e292);
		ieee754.write(buf, value, offset, littleEndian, 52, 8);
		return offset + 8;
	}
	Buffer.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
		return writeDouble(this, value, offset, true, noAssert);
	};
	Buffer.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
		return writeDouble(this, value, offset, false, noAssert);
	};
	Buffer.prototype.copy = function copy(target, targetStart, start, end) {
		if (!Buffer.isBuffer(target)) throw new TypeError("argument should be a Buffer");
		if (!start) start = 0;
		if (!end && end !== 0) end = this.length;
		if (targetStart >= target.length) targetStart = target.length;
		if (!targetStart) targetStart = 0;
		if (end > 0 && end < start) end = start;
		if (end === start) return 0;
		if (target.length === 0 || this.length === 0) return 0;
		if (targetStart < 0) throw new RangeError("targetStart out of bounds");
		if (start < 0 || start >= this.length) throw new RangeError("Index out of range");
		if (end < 0) throw new RangeError("sourceEnd out of bounds");
		if (end > this.length) end = this.length;
		if (target.length - targetStart < end - start) end = target.length - targetStart + start;
		const len = end - start;
		if (this === target && typeof Uint8Array.prototype.copyWithin === "function") this.copyWithin(targetStart, start, end);
		else Uint8Array.prototype.set.call(target, this.subarray(start, end), targetStart);
		return len;
	};
	Buffer.prototype.fill = function fill(val, start, end, encoding) {
		if (typeof val === "string") {
			if (typeof start === "string") {
				encoding = start;
				start = 0;
				end = this.length;
			} else if (typeof end === "string") {
				encoding = end;
				end = this.length;
			}
			if (encoding !== void 0 && typeof encoding !== "string") throw new TypeError("encoding must be a string");
			if (typeof encoding === "string" && !Buffer.isEncoding(encoding)) throw new TypeError("Unknown encoding: " + encoding);
			if (val.length === 1) {
				const code = val.charCodeAt(0);
				if (encoding === "utf8" && code < 128 || encoding === "latin1") val = code;
			}
		} else if (typeof val === "number") val = val & 255;
		else if (typeof val === "boolean") val = Number(val);
		if (start < 0 || this.length < start || this.length < end) throw new RangeError("Out of range index");
		if (end <= start) return this;
		start = start >>> 0;
		end = end === void 0 ? this.length : end >>> 0;
		if (!val) val = 0;
		let i;
		if (typeof val === "number") for (i = start; i < end; ++i) this[i] = val;
		else {
			const bytes = Buffer.isBuffer(val) ? val : Buffer.from(val, encoding);
			const len = bytes.length;
			if (len === 0) throw new TypeError("The value \"" + val + "\" is invalid for argument \"value\"");
			for (i = 0; i < end - start; ++i) this[i + start] = bytes[i % len];
		}
		return this;
	};
	const errors = {};
	function E(sym, getMessage, Base) {
		errors[sym] = class NodeError extends Base {
			constructor() {
				super();
				Object.defineProperty(this, "message", {
					value: getMessage.apply(this, arguments),
					writable: true,
					configurable: true
				});
				this.name = `${this.name} [${sym}]`;
				this.stack;
				delete this.name;
			}
			get code() {
				return sym;
			}
			set code(value) {
				Object.defineProperty(this, "code", {
					configurable: true,
					enumerable: true,
					value,
					writable: true
				});
			}
			toString() {
				return `${this.name} [${sym}]: ${this.message}`;
			}
		};
	}
	E("ERR_BUFFER_OUT_OF_BOUNDS", function(name) {
		if (name) return `${name} is outside of buffer bounds`;
		return "Attempt to access memory outside buffer bounds";
	}, RangeError);
	E("ERR_INVALID_ARG_TYPE", function(name, actual) {
		return `The "${name}" argument must be of type number. Received type ${typeof actual}`;
	}, TypeError);
	E("ERR_OUT_OF_RANGE", function(str, range, input) {
		let msg = `The value of "${str}" is out of range.`;
		let received = input;
		if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) received = addNumericalSeparator(String(input));
		else if (typeof input === "bigint") {
			received = String(input);
			if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) received = addNumericalSeparator(received);
			received += "n";
		}
		msg += ` It must be ${range}. Received ${received}`;
		return msg;
	}, RangeError);
	function addNumericalSeparator(val) {
		let res = "";
		let i = val.length;
		const start = val[0] === "-" ? 1 : 0;
		for (; i >= start + 4; i -= 3) res = `_${val.slice(i - 3, i)}${res}`;
		return `${val.slice(0, i)}${res}`;
	}
	function checkBounds(buf, offset, byteLength) {
		validateNumber(offset, "offset");
		if (buf[offset] === void 0 || buf[offset + byteLength] === void 0) boundsError(offset, buf.length - (byteLength + 1));
	}
	function checkIntBI(value, min, max, buf, offset, byteLength) {
		if (value > max || value < min) {
			const n = typeof min === "bigint" ? "n" : "";
			let range;
			if (byteLength > 3) if (min === 0 || min === BigInt(0)) range = `>= 0${n} and < 2${n} ** ${(byteLength + 1) * 8}${n}`;
			else range = `>= -(2${n} ** ${(byteLength + 1) * 8 - 1}${n}) and < 2 ** ${(byteLength + 1) * 8 - 1}${n}`;
			else range = `>= ${min}${n} and <= ${max}${n}`;
			throw new errors.ERR_OUT_OF_RANGE("value", range, value);
		}
		checkBounds(buf, offset, byteLength);
	}
	function validateNumber(value, name) {
		if (typeof value !== "number") throw new errors.ERR_INVALID_ARG_TYPE(name, "number", value);
	}
	function boundsError(value, length, type) {
		if (Math.floor(value) !== value) {
			validateNumber(value, type);
			throw new errors.ERR_OUT_OF_RANGE(type || "offset", "an integer", value);
		}
		if (length < 0) throw new errors.ERR_BUFFER_OUT_OF_BOUNDS();
		throw new errors.ERR_OUT_OF_RANGE(type || "offset", `>= ${type ? 1 : 0} and <= ${length}`, value);
	}
	const INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;
	function base64clean(str) {
		str = str.split("=")[0];
		str = str.trim().replace(INVALID_BASE64_RE, "");
		if (str.length < 2) return "";
		while (str.length % 4 !== 0) str = str + "=";
		return str;
	}
	function utf8ToBytes(string, units) {
		units = units || Infinity;
		let codePoint;
		const length = string.length;
		let leadSurrogate = null;
		const bytes = [];
		for (let i = 0; i < length; ++i) {
			codePoint = string.charCodeAt(i);
			if (codePoint > 55295 && codePoint < 57344) {
				if (!leadSurrogate) {
					if (codePoint > 56319) {
						if ((units -= 3) > -1) bytes.push(239, 191, 189);
						continue;
					} else if (i + 1 === length) {
						if ((units -= 3) > -1) bytes.push(239, 191, 189);
						continue;
					}
					leadSurrogate = codePoint;
					continue;
				}
				if (codePoint < 56320) {
					if ((units -= 3) > -1) bytes.push(239, 191, 189);
					leadSurrogate = codePoint;
					continue;
				}
				codePoint = (leadSurrogate - 55296 << 10 | codePoint - 56320) + 65536;
			} else if (leadSurrogate) {
				if ((units -= 3) > -1) bytes.push(239, 191, 189);
			}
			leadSurrogate = null;
			if (codePoint < 128) {
				if ((units -= 1) < 0) break;
				bytes.push(codePoint);
			} else if (codePoint < 2048) {
				if ((units -= 2) < 0) break;
				bytes.push(codePoint >> 6 | 192, codePoint & 63 | 128);
			} else if (codePoint < 65536) {
				if ((units -= 3) < 0) break;
				bytes.push(codePoint >> 12 | 224, codePoint >> 6 & 63 | 128, codePoint & 63 | 128);
			} else if (codePoint < 1114112) {
				if ((units -= 4) < 0) break;
				bytes.push(codePoint >> 18 | 240, codePoint >> 12 & 63 | 128, codePoint >> 6 & 63 | 128, codePoint & 63 | 128);
			} else throw new Error("Invalid code point");
		}
		return bytes;
	}
	function asciiToBytes(str) {
		const byteArray = [];
		for (let i = 0; i < str.length; ++i) byteArray.push(str.charCodeAt(i) & 255);
		return byteArray;
	}
	function utf16leToBytes(str, units) {
		let c, hi, lo;
		const byteArray = [];
		for (let i = 0; i < str.length; ++i) {
			if ((units -= 2) < 0) break;
			c = str.charCodeAt(i);
			hi = c >> 8;
			lo = c % 256;
			byteArray.push(lo);
			byteArray.push(hi);
		}
		return byteArray;
	}
	function base64ToBytes(str) {
		return base64.toByteArray(base64clean(str));
	}
	function blitBuffer(src, dst, offset, length) {
		let i;
		for (i = 0; i < length; ++i) {
			if (i + offset >= dst.length || i >= src.length) break;
			dst[i + offset] = src[i];
		}
		return i;
	}
	function isInstance(obj, type) {
		return obj instanceof type || obj != null && obj.constructor != null && obj.constructor.name != null && obj.constructor.name === type.name;
	}
	function numberIsNaN(obj) {
		return obj !== obj;
	}
	const hexSliceLookupTable = (function() {
		const alphabet = "0123456789abcdef";
		const table = new Array(256);
		for (let i = 0; i < 16; ++i) {
			const i16 = i * 16;
			for (let j = 0; j < 16; ++j) table[i16 + j] = alphabet[i] + alphabet[j];
		}
		return table;
	})();
	function defineBigIntMethod(fn) {
		return typeof BigInt === "undefined" ? BufferBigIntNotDefined : fn;
	}
	function BufferBigIntNotDefined() {
		throw new Error("BigInt not supported");
	}
}));
//#endregion
//#region src/node/builtin_modules/implemented/buffer.ts
var buffer_exports = /* @__PURE__ */ __exportAll({
	Buffer: () => import_buffer.Buffer,
	__esModule: () => true,
	constants: () => constants$4,
	default: () => buffer_default,
	kMaxLength: () => import_buffer.kMaxLength
});
var import_buffer = require_buffer();
Object.defineProperty(globalThis, "Buffer", {
	value: import_buffer.Buffer,
	writable: true,
	configurable: true
});
/**
* Size limits, as `node:buffer` publishes them. The npm package exposes only
* `kMaxLength`, so the string bound is Node's own value for a 64-bit build.
*/
const constants$4 = {
	MAX_LENGTH: import_buffer.kMaxLength,
	MAX_STRING_LENGTH: 536870888
};
/** CommonJS default export: the members `require()` hands a caller of this module. */
var buffer_default = {
	Buffer: import_buffer.Buffer,
	constants: constants$4,
	kMaxLength: import_buffer.kMaxLength
};
//#endregion
//#region src/node/notImplementedFail.ts
/**
* Structural not-implemented stubs: a replaced module must expose every symbol
* its importers name (a missing CommonJS symbol degrades to `undefined` at call
* time instead of failing at link time), and every one of those symbols must
* report exactly what is unavailable when it is finally called.
*/
/**
* Build a function that throws naming its module and symbol. The refusal is
* also written to the console before it propagates: callers routinely swallow
* these errors far from their cause, and the console line is what places the
* failure while debugging a worker session.
*
* `Face` is the Node declaration this stub stands in for, so the replaced module
* publishes the type its importers compile against. The value is one throwing
* function whatever that declaration says: a caller reaches the throw before any
* declared parameter, return value, or `new` result exists, so the assertion
* below cannot be observed as a lie. It is a function expression rather than an
* arrow because a stub standing in for a class must refuse under `new` too, and
* an arrow has no construct behavior to reach.
* @param module - module specifier being stubbed.
* @param symbol - exported symbol name.
* @returns the throwing stand-in, typed as the member it replaces.
*/
function notImplementedFail(module, symbol) {
	return (function refuse() {
		throw notAvailableError(module, symbol);
	});
}
/**
* Build the refusal error and write it to the console first, for stubs that
* cannot be a plain throwing function (constructors, methods on structural
* fakes).
* @param module - module specifier being stubbed.
* @param symbol - unavailable member, named as the importer sees it.
* @returns the error to throw.
*/
function notAvailableError(module, symbol) {
	const message = `web-preview: ${module}.${symbol} is not available in the worker host`;
	console.error(message);
	return new Error(message);
}
//#endregion
//#region src/node/builtin_modules/implemented/async_hooks.ts
/**
* `node:async_hooks` for the worker: `AsyncLocalStorage` over an EXPLICIT-SWITCH
* model with two fallbacks. A browser has no async-context tracking, so the store
* a read answers is decided by three slots, in this order:
*
* 1. HOOK OVERLAY — set for the duration of one callback by the hook layer
*    (`./async-context-hooks.ts`), which captures the context where a callback was
*    REGISTERED (`.then`, `queueMicrotask`, timers, `fetch`) and restores it where
*    the callback RUNS.
* 2. RESUMED CONTEXT — the explicit-switch slot. {@link __snapshotAll} copies every
*    live instance's effective store and {@link __restoreAll} publishes a copy; the
*    module loader's `await` rewriting pauses with the first and resumes with the
*    second, which is what makes attribution causally correct across an `await`
*    even while another chain interleaves. The rewriter's `restore` returns nothing,
*    so this slot holds ONE value per instance and a resume REPLACES it rather than
*    stacking: a frame that resumes again at its next await re-publishes its own
*    context anyway, and a new `run()` boundary shadows the slot for its extent.
*    (Callers that want scoping get a disposer back from {@link __restoreAll}.)
* 2b. BOUNDARY AMBIENT — `run()` also publishes its own store here, so rewritten and
*    un-rewritten code agree on what the innermost boundary is.
* 3. FOLDING STACK — the fallback for code the rewriter has not touched: `run()`
*    pushes an entry that is removed synchronously for a synchronous operation, or
*    when the returned promise settles for an asynchronous one, so a store stays
*    visible across `await` inside that operation.
*
* Every slot is removed by IDENTITY, never blindly: boundaries settle and frames
* resume out of order, so a blind pop would drop somebody else's context — and a
* slot that is released while shadowed must leave the chain without promoting
* itself back over whoever came after it. The three slots are separate for the same reason — a restored
* copy pushed onto the folding stack could unwind another boundary's entry.
*
* A snapshot with no stores at all is `undefined`, and the hook layer then wraps
* nothing: a callback registered outside every boundary keeps inheriting the
* enclosing boundary rather than being masked to `undefined`. `__snapshotAll` is
* the transformer-facing counterpart and always captures every instance, including
* the ones reading `undefined`, because a resumed frame must see exactly what it
* saw at its pause point.
*
* BOUNDARY (structural, documented rather than worked around): native
* `async`/`await` resumption inside code the rewriter has NOT transformed is
* invisible to user code. Such a frame falls back to the folding stack, which is
* ordered by nesting rather than by causal chain, so two boundaries overlapping
* there can attribute to the wrong one. Nothing crashes, the stacks still unwind by
* identity, and everything the hook layer or the rewriter covers is exact.
*/
var async_hooks_exports = /* @__PURE__ */ __exportAll({
	AsyncLocalStorage: () => AsyncLocalStorage,
	AsyncResource: () => AsyncResource,
	__esModule: () => true,
	__restoreAll: () => __restoreAll,
	__snapshotAll: () => __snapshotAll,
	alsCausality: () => alsCausality,
	bindAsyncContext: () => bindAsyncContext,
	captureAsyncContext: () => captureAsyncContext,
	createHook: () => createHook,
	default: () => async_hooks_default,
	executionAsyncId: () => executionAsyncId,
	runAtAsyncContextRoot: () => runAtAsyncContextRoot,
	runWithAsyncContext: () => runWithAsyncContext,
	triggerAsyncId: () => triggerAsyncId
});
/** Pristine `then`, so this module's own bookkeeping never re-enters the hook layer. */
const nativeThen = Promise.prototype.then;
/** Every live instance, so one snapshot can capture all of their stores at once. */
const instances = /* @__PURE__ */ new Set();
function isThenable(value) {
	if (value === null || typeof value !== "object" && typeof value !== "function") return false;
	return typeof value.then === "function";
}
/** Node's AsyncLocalStorage face, restricted to the members the host tree uses. */
var AsyncLocalStorage = class AsyncLocalStorage {
	entries = [];
	overlay;
	ambients = [];
	resumed;
	constructor() {
		instances.add(this);
	}
	/**
	* Run a callback with the store visible for the operation's whole lifetime:
	* until it returns, or until the promise it returned settles.
	* @param store - value {@link getStore} answers inside the boundary.
	* @param callback - the operation.
	* @param args - callback arguments.
	* @returns the exact value the callback returned.
	*/
	run(store, callback, ...args) {
		const entry = { store };
		this.entries.push(entry);
		const remove = () => {
			const at = this.entries.lastIndexOf(entry);
			if (at !== -1) this.entries.splice(at, 1);
		};
		const ambient = { store };
		this.ambients.push(ambient);
		const removeBoundary = () => {
			const at = this.ambients.lastIndexOf(ambient);
			if (at !== -1) this.ambients.splice(at, 1);
			if (this.resumed === void 0) this.resumed = restoreResumed;
			remove();
		};
		const restoreOverlay = this.overlay;
		const restoreResumed = this.resumed;
		this.overlay = void 0;
		this.resumed = void 0;
		let result;
		try {
			result = callback(...args);
		} catch (error) {
			this.overlay = restoreOverlay;
			removeBoundary();
			throw error;
		}
		this.overlay = restoreOverlay;
		if (!isThenable(result)) {
			removeBoundary();
			return result;
		}
		try {
			nativeThen.call(result, removeBoundary, removeBoundary);
		} catch {
			removeBoundary();
		}
		return result;
	}
	/**
	* Current store, resolved through the slot order this module documents: the
	* hook-restored overlay, then the ambient context a resume installed (or a
	* boundary owns), then the folding stack's innermost entry.
	* @returns the store, or undefined outside every boundary.
	*/
	getStore() {
		if (this.overlay !== void 0) return this.overlay.store;
		if (this.resumed !== void 0) return this.resumed.store;
		const ambient = this.ambients.at(-1);
		if (ambient !== void 0) return ambient.store;
		return this.entries.at(-1)?.store;
	}
	/**
	* Run a callback with no store, folding over its lifetime like {@link run}.
	* @param callback - the operation.
	* @param args - callback arguments.
	* @returns the exact value the callback returned.
	*/
	exit(callback, ...args) {
		return this.run(void 0, callback, ...args);
	}
	/**
	* Enter a boundary that lasts until {@link disable}, as Node's `enterWith` does
	* for the remainder of the current chain.
	* @param store - value {@link getStore} answers from now on.
	*/
	enterWith(store) {
		this.entries.push({ store });
	}
	/** Drop every slot; teardown calls this unconditionally. */
	disable() {
		this.entries.length = 0;
		this.overlay = void 0;
		this.ambients.length = 0;
		this.resumed = void 0;
	}
	/**
	* Copy every live instance's effective store, including the instances reading
	* `undefined`: a resumed frame must see exactly what its pause point saw.
	* @returns the ambient snapshot.
	*/
	static snapshotAll() {
		return [...instances].map((instance) => ({
			instance,
			store: instance.getStore()
		}));
	}
	/**
	* Install a snapshot as the ambient context of every instance it names.
	* @param snapshot - a copy from {@link snapshotAll}.
	* @returns a disposer that restores the previous ambients, identity-checked.
	*/
	static restoreAll(snapshot) {
		const installed = snapshot.map(({ instance, store }) => {
			const slot = { store };
			const before = instance.resumed;
			instance.resumed = slot;
			return {
				instance,
				slot,
				before
			};
		});
		return () => {
			for (const { instance, slot, before } of installed) if (instance.resumed === slot) instance.resumed = before;
		};
	}
	/**
	* Copy every live instance's current store. Not part of the Node face: this is
	* the shim's own mechanism, kept in the class so the overlay stays private.
	* @returns the snapshot, or undefined when no instance has a store.
	*/
	static captureContext() {
		let captured;
		for (const instance of instances) {
			const store = instance.getStore();
			if (store === void 0) continue;
			captured ??= [];
			captured.push({
				instance,
				store
			});
		}
		return captured;
	}
	/**
	* Run a callback with a captured context restored into the overlay slots.
	* @param snapshot - context copy, or undefined to run unchanged.
	* @param callback - the callback.
	* @returns the callback's return value.
	*/
	static runWithContext(snapshot, callback) {
		if (snapshot === void 0) return callback();
		const previous = snapshot.map(({ instance, store }) => {
			const before = instance.overlay;
			instance.overlay = { store };
			return {
				instance,
				before
			};
		});
		try {
			return callback();
		} finally {
			for (const { instance, before } of previous) instance.overlay = before;
		}
	}
	/**
	* Every live instance, for {@link runAtAsyncContextRoot}.
	* @returns The stores a snapshot must capture.
	*/
	static liveInstances() {
		return [...instances];
	}
	/**
	* Bind a callback to the current context.
	* @param callback - the callback to bind.
	* @returns a callback that restores this context when invoked.
	*/
	static bind(callback) {
		return bindAsyncContext(callback);
	}
	/**
	* Snapshot helper matching Node's static: run a callback in the context
	* captured now.
	* @returns a function that runs its argument in the captured context.
	*/
	static snapshot() {
		const snapshot = AsyncLocalStorage.captureContext();
		return (callback) => AsyncLocalStorage.runWithContext(snapshot, callback);
	}
};
/**
* Copy every live instance's current store.
* @returns the snapshot, or undefined when no instance has a store (the hook
* layer then wraps nothing and callbacks inherit the stack top).
*/
function captureAsyncContext() {
	return AsyncLocalStorage.captureContext();
}
/**
* Run a callback with a captured context restored into the overlay slots.
* @param snapshot - context copy, or undefined to run unchanged.
* @param callback - the callback.
* @returns the callback's return value.
*/
function runWithAsyncContext(snapshot, callback) {
	return AsyncLocalStorage.runWithContext(snapshot, callback);
}
/**
* Capture the current context now and restore it around every later invocation.
* @param callback - the callback to bind.
* @returns the bound callback, or the original when no context is active.
*/
function bindAsyncContext(callback) {
	const snapshot = captureAsyncContext();
	if (snapshot === void 0) return callback;
	const bound = (...args) => runWithAsyncContext(snapshot, () => callback(...args));
	return bound;
}
/**
* Run a callback at the root: every instance reads `undefined`, whatever was open
* before. The tunnel's message entry uses this so a queued request never inherits
* a boundary from unrelated work that happened to run first.
* @param callback - the callback.
* @returns the callback's return value.
*/
function runAtAsyncContextRoot(callback) {
	return runWithAsyncContext(AsyncLocalStorage.liveInstances().map((instance) => ({
		instance,
		store: void 0
	})), callback);
}
/**
* Pause point of the loader's `await` rewriting: copy the context every live
* instance currently reads.
*
* The transformed module reaches this through the module proxy table
* (`require('node:async_hooks').__snapshotAll()`), so the rewriter needs no
* additional plumbing.
* @returns the ambient snapshot to hand to {@link __restoreAll} after the await.
*/
function __snapshotAll() {
	return AsyncLocalStorage.snapshotAll();
}
/**
* Resume point of the loader's `await` rewriting: publish a paused context as the
* ambient one, so reads after the await answer what the frame saw before it —
* even while another chain interleaves.
* @param snapshot - the copy {@link __snapshotAll} produced at the pause point.
* @returns a disposer that restores the previous ambient context, identity-checked;
* a rewriter that wraps a whole function body calls it in that body's `finally`.
*/
function __restoreAll(snapshot) {
	return AsyncLocalStorage.restoreAll(snapshot);
}
/**
* Snapshot face the module loader's `await` rewriting consumes (its `AlsCausality`):
* the same pair as {@link __snapshotAll}/{@link __restoreAll}, with `restore`
* narrowed to void because the rewritten code has no place to keep a disposer.
*/
const alsCausality = {
	snapshot: () => __snapshotAll(),
	restore: (snapshot) => {
		__restoreAll(snapshot);
	}
};
/**
* Async ids are not tracked; a stable id keeps callers that log it working.
* @returns Always 1.
*/
function executionAsyncId() {
	return 1;
}
/**
* Trigger ids are not tracked either.
* @returns Always 0.
*/
function triggerAsyncId() {
	return 0;
}
/**
* Async hooks cannot be created: no async resource tracking exists in the worker.
* @returns Never — it throws naming the unavailable member.
*/
function createHook() {
	throw new Error("web-preview: node:async_hooks.createHook is not available in the worker host");
}
/** Resource construction is likewise unavailable. */
const AsyncResource = notImplementedFail("node:async_hooks", "AsyncResource");
/** CommonJS default export: the members `require()` hands a caller of this module. */
var async_hooks_default = {
	AsyncLocalStorage,
	AsyncResource,
	executionAsyncId,
	triggerAsyncId,
	createHook
};
//#endregion
//#region src/polyfill/async-context/async-context-hooks.ts
/**
* Global hook layer for the ALS shim: capture the async context where a callback
* is REGISTERED and restore it where the callback RUNS. Together with the folding
* stack in `./async-hooks.ts` this gives the worker two kinds of coverage —
* `await` inside a boundary keeps its store because the boundary's stack entry is
* still open, and work handed to the platform (`.then`, `queueMicrotask`, timers,
* `fetch`) keeps its store because it was captured at registration.
*
* Patched here: `Promise.prototype.then` and `queueMicrotask` and `fetch`. Node's
* `catch`/`finally` are specified to invoke `then` on the receiver, so they inherit
* the patch instead of needing their own (`als-check.ts` proves it). The worker's
* `setTimeout`/`setInterval`/`setImmediate` are bound in `./timers-global.ts`, and
* the host's `process.nextTick` shim is built on `queueMicrotask`, so both arrive
* here too.
*
* Two properties the patches keep:
* - the values stay native promises — a handler is wrapped, never the chain, so
*   `then` still returns what the original returned;
* - an empty handler slot stays empty (`.then(undefined, onRejected)` must not
*   grow a fulfilled handler, or a rejection would be swallowed).
*
* Not covered (structural): native `async`/`await` resumption is invisible to user
* code, so the folding stack remains what carries a store across an `await`.
*/
let installed = false;
/** Wrap one handler slot, leaving a non-function slot exactly as it was. */
const bindSlot = (handler, snapshot) => {
	if (typeof handler !== "function") return handler;
	return (value) => runWithAsyncContext(snapshot, () => handler(value));
};
/**
* Patch the platform registration points. Idempotent; call once from the worker
* entry before the host tree boots.
*/
function installAsyncContextHooks() {
	if (installed) return;
	installed = true;
	const nativeThen = Promise.prototype.then;
	Promise.prototype.then = function patchedThen(onFulfilled, onRejected) {
		const snapshot = captureAsyncContext();
		if (snapshot === void 0) return nativeThen.call(this, onFulfilled, onRejected);
		return nativeThen.call(this, bindSlot(onFulfilled, snapshot), bindSlot(onRejected, snapshot));
	};
	const nativeQueueMicrotask = globalThis.queueMicrotask.bind(globalThis);
	globalThis.queueMicrotask = (callback) => {
		nativeQueueMicrotask(bindAsyncContext(callback));
	};
	const nativeFetch = globalThis.fetch.bind(globalThis);
	globalThis.fetch = ((input, init) => {
		const snapshot = captureAsyncContext();
		if (snapshot === void 0) return nativeFetch(input, init);
		return nativeThen.call(nativeFetch(input, init), (response) => runWithAsyncContext(snapshot, () => response), (reason) => runWithAsyncContext(snapshot, () => {
			throw reason;
		}));
	});
}
//#endregion
//#region ../../../node_modules/.pnpm/@noble+hashes@2.3.0/node_modules/@noble/hashes/_u64.js
const U32_MASK64 = /* @__PURE__ */ (() => BigInt(2 ** 32 - 1))();
const _32n = /* @__PURE__ */ BigInt(32);
function fromBig(n, le = false) {
	if (le) return {
		h: Number(n & U32_MASK64),
		l: Number(n >> _32n & U32_MASK64)
	};
	return {
		h: Number(n >> _32n & U32_MASK64) | 0,
		l: Number(n & U32_MASK64) | 0
	};
}
function split(lst, le = false) {
	const len = lst.length;
	let Ah = new Uint32Array(len);
	let Al = new Uint32Array(len);
	for (let i = 0; i < len; i++) {
		const { h, l } = fromBig(lst[i], le);
		[Ah[i], Al[i]] = [h, l];
	}
	return [Ah, Al];
}
const fromNumH = (n) => n / 2 ** 32 | 0;
const fromNumL = (n) => n >>> 0;
function setU64FromNum(view, byteOffset, n, isLE) {
	const h = fromNumH(n);
	const l = fromNumL(n);
	view.setUint32(byteOffset, isLE ? l : h, isLE);
	view.setUint32(byteOffset + 4, isLE ? h : l, isLE);
}
const shrSH = (h, _l, s) => h >>> s;
const shrSL = (h, l, s) => h << 32 - s | l >>> s;
const rotrSH = (h, l, s) => h >>> s | l << 32 - s;
const rotrSL = (h, l, s) => h << 32 - s | l >>> s;
const rotrBH = (h, l, s) => h << 64 - s | l >>> s - 32;
const rotrBL = (h, l, s) => h >>> s - 32 | l << 64 - s;
function add(Ah, Al, Bh, Bl) {
	const l = (Al >>> 0) + (Bl >>> 0);
	return {
		h: Ah + Bh + (l / 2 ** 32 | 0) | 0,
		l: l | 0
	};
}
const add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
const add3H = (low, Ah, Bh, Ch) => Ah + Bh + Ch + (low / 2 ** 32 | 0) | 0;
const add4L = (Al, Bl, Cl, Dl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
const add4H = (low, Ah, Bh, Ch, Dh) => Ah + Bh + Ch + Dh + (low / 2 ** 32 | 0) | 0;
const add5L = (Al, Bl, Cl, Dl, El) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
const add5H = (low, Ah, Bh, Ch, Dh, Eh) => Ah + Bh + Ch + Dh + Eh + (low / 2 ** 32 | 0) | 0;
//#endregion
//#region ../../../node_modules/.pnpm/@noble+hashes@2.3.0/node_modules/@noble/hashes/utils.js
/**
* Checks if something is Uint8Array. Be careful: nodejs Buffer will return true.
* @param a - value to test
* @returns `true` when the value is a Uint8Array-compatible view.
* @example
* Check whether a value is a Uint8Array-compatible view.
* ```ts
* isBytes(new Uint8Array([1, 2, 3]));
* ```
*/
function isBytes(a) {
	return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in a && a.BYTES_PER_ELEMENT === 1;
}
const atitle = (title) => title ? `"${title}" ` : "";
/**
* Asserts something is a non-negative integer.
* @param n - number to validate
* @param title - label included in thrown errors
* @returns The validated number.
* @throws On wrong argument types. {@link TypeError}
* @throws On wrong argument ranges or values. {@link RangeError}
* @example
* Validate a non-negative integer option.
* ```ts
* anumber(32, 'length');
* ```
*/
function anumber(n, title = "") {
	if (typeof n !== "number") throw new TypeError(atitle(title) + "expected number, got " + typeof n);
	if (!Number.isSafeInteger(n) || n < 0) throw new RangeError(atitle(title) + "expected integer >= 0, got " + n);
	return n;
}
/**
* Asserts something is Uint8Array.
* @param value - value to validate
* @param length - optional exact length constraint
* @param title - label included in thrown errors
* @returns The validated byte array.
* @throws On wrong argument types. {@link TypeError}
* @throws On wrong argument ranges or values. {@link RangeError}
* @example
* Validate that a value is a byte array.
* ```ts
* abytes(new Uint8Array([1, 2, 3]));
* ```
*/
function abytes(value, length, title = "") {
	if (isBytes(value) && (length === void 0 || value.length === length)) return value;
	if (length !== void 0) anumber(length, "length");
	const bytes = isBytes(value);
	const ofLen = length !== void 0 ? ` of length ${length}` : "";
	const got = bytes ? `length=${value.length}` : `type=${typeof value}`;
	const message = atitle(title) + "expected Uint8Array" + ofLen + ", got " + got;
	if (!bytes) throw new TypeError(message);
	throw new RangeError(message);
}
const aobject = (value, label) => {
	if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError((label === "object" ? "" : `"${label}" `) + "expected object, got type=" + typeof value);
};
/**
* Asserts a hash instance has not been destroyed or finished.
* @param instance - hash instance to validate
* @param checkFinished - whether to reject finalized instances
* @throws If the hash instance has already been destroyed or finalized. {@link Error}
* @example
* Validate that a hash instance is still usable.
* ```ts
* import { aexists } from '@noble/hashes/utils.js';
* import { sha256 } from '@noble/hashes/sha2.js';
* const hash = sha256.create();
* aexists(hash);
* ```
*/
function aexists(instance, checkFinished = true) {
	if (instance.destroyed) throw new Error("hash was destroyed");
	if (checkFinished && instance.finished) throw new Error("digest() was already called");
}
/**
* Asserts output is a sufficiently-sized byte array.
* @param out - destination buffer
* @param instance - hash instance providing output length
* Oversized buffers are allowed; downstream code only promises to fill the first `outputLen` bytes.
* @throws On wrong argument types. {@link TypeError}
* @throws On wrong argument ranges or values. {@link RangeError}
* @example
* Validate a caller-provided digest buffer.
* ```ts
* import { aoutput } from '@noble/hashes/utils.js';
* import { sha256 } from '@noble/hashes/sha2.js';
* const hash = sha256.create();
* aoutput(new Uint8Array(hash.outputLen), hash);
* ```
*/
function aoutput(out, instance) {
	abytes(out, void 0, "output");
	const min = instance.outputLen;
	if (!(out.length >= min)) throw new RangeError("\"output\" expected length >= " + min);
}
/**
* Zeroizes typed arrays in place. Warning: JS provides no guarantees.
* @param arrays - arrays to overwrite with zeros
* @example
* Zeroize sensitive buffers in place.
* ```ts
* clean(new Uint8Array([1, 2, 3]));
* ```
*/
function clean(...arrays) {
	for (let i = 0; i < arrays.length; i++) arrays[i].fill(0);
}
/**
* Creates a DataView for byte-level manipulation.
* @param arr - source typed array
* @returns DataView over the same buffer region.
* @example
* Create a DataView over an existing buffer.
* ```ts
* createView(new Uint8Array(4));
* ```
*/
function createView(arr) {
	return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
/**
* Rotate-right operation for uint32 values.
* @param word - source word
* @param shift - shift amount in bits
* @returns Rotated word.
* @example
* Rotate a 32-bit word to the right.
* ```ts
* rotr(0x12345678, 8);
* ```
*/
function rotr(word, shift) {
	return word << 32 - shift | word >>> shift;
}
/**
* Rotate-left operation for uint32 values.
* @param word - source word
* @param shift - shift amount in bits
* @returns Rotated word.
* @example
* Rotate a 32-bit word to the left.
* ```ts
* rotl(0x12345678, 8);
* ```
*/
function rotl(word, shift) {
	return word << shift | word >>> 32 - shift >>> 0;
}
/**
* Merges default options and passed options.
* @param defaults - base option object
* @param opts - user overrides
* @param title - label included in thrown override errors
* @returns Merged option object. The merge mutates `defaults` in place.
* @throws On wrong argument types. {@link TypeError}
* @example
* Merge user overrides onto default options.
* ```ts
* checkOpts({ dkLen: 32 }, { asyncTick: 10 });
* ```
*/
function checkOpts(defaults, opts, title = "opts") {
	aobject(defaults, "defaults");
	if (opts !== void 0) aobject(opts, title);
	return Object.assign(defaults, opts);
}
/**
* Creates a callable hash function from a stateful class constructor.
* @param hashCons - hash constructor or factory
* @param info - optional metadata such as DER OID
* @returns Frozen callable hash wrapper with `.create()`.
*   Wrapper construction eagerly calls `hashCons(undefined)` once to read
*   `outputLen` / `blockLen`, so constructor side effects happen at module
*   init time.
* @throws On wrong argument types. {@link TypeError}
* @example
* Wrap a stateful hash constructor into a callable helper.
* ```ts
* import { createHasher } from '@noble/hashes/utils.js';
* import { sha256 } from '@noble/hashes/sha2.js';
* const wrapped = createHasher(sha256.create, { oid: sha256.oid });
* wrapped(new Uint8Array([1]));
* ```
*/
function createHasher(hashCons, info = {}) {
	if (typeof hashCons !== "function") throw new TypeError("\"hashCons\" expected function, got type=" + typeof hashCons);
	info = checkOpts({}, info, "info");
	const hashC = (msg, opts) => hashCons(opts).update(msg).digest();
	const tmp = hashCons(void 0);
	hashC.outputLen = tmp.outputLen;
	hashC.blockLen = tmp.blockLen;
	hashC.canXOF = tmp.canXOF;
	hashC.create = (opts) => hashCons(opts);
	Object.assign(hashC, info);
	return Object.freeze(hashC);
}
/**
* Creates OID metadata for NIST hashes with prefix `06 09 60 86 48 01 65 03 04 02`.
* @param suffix - final OID byte for the selected hash.
*   The helper accepts any byte even though only the documented NIST hash
*   suffixes are meaningful downstream.
* @returns Object containing the DER-encoded OID.
* @example
* Build OID metadata for a NIST hash.
* ```ts
* oidNist(0x01);
* ```
*/
const oidNist = (suffix) => ({ oid: Uint8Array.from([
	6,
	9,
	96,
	134,
	72,
	1,
	101,
	3,
	4,
	2,
	suffix
]) });
//#endregion
//#region ../../../node_modules/.pnpm/@noble+hashes@2.3.0/node_modules/@noble/hashes/_md.js
/**
* Internal Merkle-Damgard hash utils.
* @module
*/
/**
* Shared 32-bit conditional boolean primitive reused by SHA-256, SHA-1, and MD5 `F`.
* Returns bits from `b` when `a` is set, otherwise from `c`.
* The XOR form is equivalent to MD5's `F(X,Y,Z) = XY v not(X)Z` because the masked terms never
* set the same bit.
* @param a - selector word
* @param b - word chosen when selector bit is set
* @param c - word chosen when selector bit is clear
* @returns Mixed 32-bit word.
* @example
* Combine three words with the shared 32-bit choice primitive.
* ```ts
* Chi(0xffffffff, 0x12345678, 0x87654321);
* ```
*/
function Chi(a, b, c) {
	return a & b ^ ~a & c;
}
/**
* Shared 32-bit majority primitive reused by SHA-256 and SHA-1.
* Returns bits shared by at least two inputs.
* @param a - first input word
* @param b - second input word
* @param c - third input word
* @returns Mixed 32-bit word.
* @example
* Combine three words with the shared 32-bit majority primitive.
* ```ts
* Maj(0xffffffff, 0x12345678, 0x87654321);
* ```
*/
function Maj(a, b, c) {
	return a & b ^ a & c ^ b & c;
}
/**
* Merkle-Damgard hash construction base class.
* Could be used to create MD5, RIPEMD, SHA1, SHA2.
* Accepts only byte-aligned `Uint8Array` input, even when the underlying spec describes bit
* strings with partial-byte tails.
* @param blockLen - internal block size in bytes
* @param outputLen - digest size in bytes
* @param padOffset - trailing length field size in bytes
* @param isLE - whether length and state words are encoded in little-endian
* @example
* Use a concrete subclass to get the shared Merkle-Damgard update/digest flow.
* ```ts
* import { _SHA1 } from '@noble/hashes/legacy.js';
* const hash = new _SHA1();
* hash.update(new Uint8Array([97, 98, 99]));
* hash.digest();
* ```
*/
var HashMD = class {
	blockLen;
	outputLen;
	canXOF = false;
	padOffset;
	isLE;
	buffer;
	view;
	finished = false;
	length = 0;
	pos = 0;
	destroyed = false;
	constructor(blockLen, outputLen, padOffset, isLE) {
		this.blockLen = blockLen;
		this.outputLen = outputLen;
		this.padOffset = padOffset;
		this.isLE = isLE;
		this.buffer = new Uint8Array(blockLen);
		this.view = createView(this.buffer);
	}
	update(data) {
		aexists(this);
		abytes(data);
		const { view, buffer, blockLen } = this;
		const len = data.length;
		let processed = false;
		for (let pos = 0; pos < len;) {
			const take = Math.min(blockLen - this.pos, len - pos);
			if (take === blockLen) {
				const dataView = createView(data);
				for (; blockLen <= len - pos; pos += blockLen) this.process(dataView, pos);
				processed = true;
				continue;
			}
			buffer.set(pos === 0 && take === len ? data : data.subarray(pos, pos + take), this.pos);
			this.pos += take;
			pos += take;
			if (this.pos === blockLen) {
				this.process(view, 0);
				this.pos = 0;
				processed = true;
			}
		}
		this.length += data.length;
		if (processed) this.roundClean();
		return this;
	}
	digestInto(out) {
		aexists(this);
		aoutput(out, this);
		this.finished = true;
		const { buffer, view, blockLen, isLE } = this;
		let { pos } = this;
		buffer[pos++] = 128;
		buffer.fill(0, pos);
		if (this.padOffset > blockLen - pos) {
			this.process(view, 0);
			buffer.fill(0);
		}
		setU64FromNum(view, blockLen - 8, this.length * 8, isLE);
		this.process(view, 0);
		this.roundClean();
		const oview = out === buffer ? view : createView(out);
		const len = this.outputLen;
		const outLen = len / 4;
		const state = this.get();
		if (len % 4 || outLen > state.length) throw new Error("invalid outputLen");
		for (let i = 0; i < outLen; i++) oview.setUint32(4 * i, state[i], isLE);
	}
	digest() {
		const { buffer, outputLen } = this;
		this.digestInto(buffer);
		const res = buffer.slice(0, outputLen);
		this.destroy();
		return res;
	}
	_cloneIntoMeta(to) {
		const { buffer, length, finished, destroyed, pos } = this;
		to.destroyed = destroyed;
		to.finished = finished;
		to.length = length;
		to.pos = pos;
		if (pos) to.buffer.set(buffer);
		return to;
	}
	clone() {
		return this._cloneInto();
	}
};
/**
* Initial SHA-2 state: fractional parts of square roots of first 16 primes 2..53.
* Check out `test/misc/sha2-gen-iv.js` for recomputation guide.
*/
/** Initial SHA256 state from RFC 6234 §6.1: the first 32 bits of the fractional parts of the
* square roots of the first eight prime numbers. Exported as a shared table; callers must treat
* it as read-only because constructors copy words from it by index. */
const SHA256_IV = /* @__PURE__ */ Uint32Array.from([
	1779033703,
	3144134277,
	1013904242,
	2773480762,
	1359893119,
	2600822924,
	528734635,
	1541459225
]);
/** Initial SHA512 state from RFC 6234 §6.3: eight RFC 64-bit `H(0)` words stored as sixteen
* big-endian 32-bit halves. Derived from the fractional parts of the square roots of the first
* eight prime numbers. Exported as a shared table; callers must treat it as read-only because
* constructors copy halves from it by index. */
const SHA512_IV = /* @__PURE__ */ Uint32Array.from([
	1779033703,
	4089235720,
	3144134277,
	2227873595,
	1013904242,
	4271175723,
	2773480762,
	1595750129,
	1359893119,
	2917565137,
	2600822924,
	725511199,
	528734635,
	4215389547,
	1541459225,
	327033209
]);
//#endregion
//#region ../../../node_modules/.pnpm/@noble+hashes@2.3.0/node_modules/@noble/hashes/legacy.js
/**

SHA1 (RFC 3174), MD5 (RFC 1321), and RIPEMD160 legacy, weak hash functions.
RFC 2286 only covers HMAC-RIPEMD160 wrapper material and test vectors,
not the base RIPEMD-160 compression spec.
Don't use them in a new protocol. What "weak" means:

- Collisions can be made with 2^18 effort in MD5, 2^60 in SHA1, 2^80 in RIPEMD160.
- No practical pre-image attacks (only theoretical, 2^123.4)
- HMAC seems kinda ok: https://www.rfc-editor.org/rfc/rfc6151
* @module
*/
/** Initial SHA-1 state from RFC 3174 §6.1. */
const SHA1_IV = /* @__PURE__ */ Uint32Array.from([
	1732584193,
	4023233417,
	2562383102,
	271733878,
	3285377520
]);
const SHA1_W = /* @__PURE__ */ new Uint32Array(80);
/** Internal SHA1 legacy hash class. */
var _SHA1 = class extends HashMD {
	A = SHA1_IV[0] | 0;
	B = SHA1_IV[1] | 0;
	C = SHA1_IV[2] | 0;
	D = SHA1_IV[3] | 0;
	E = SHA1_IV[4] | 0;
	constructor() {
		super(64, 20, 8, false);
	}
	get() {
		const { A, B, C, D, E } = this;
		return [
			A,
			B,
			C,
			D,
			E
		];
	}
	set(A, B, C, D, E) {
		this.A = A | 0;
		this.B = B | 0;
		this.C = C | 0;
		this.D = D | 0;
		this.E = E | 0;
	}
	_cloneInto(to) {
		(to ||= new this.constructor()).set(...this.get());
		return this._cloneIntoMeta(to);
	}
	process(view, offset) {
		for (let i = 0; i < 16; i++, offset += 4) SHA1_W[i] = view.getUint32(offset, false);
		for (let i = 16; i < 80; i++) SHA1_W[i] = rotl(SHA1_W[i - 3] ^ SHA1_W[i - 8] ^ SHA1_W[i - 14] ^ SHA1_W[i - 16], 1);
		let { A, B, C, D, E } = this;
		for (let i = 0; i < 80; i++) {
			let F, K;
			if (i < 20) {
				F = Chi(B, C, D);
				K = 1518500249;
			} else if (i < 40) {
				F = B ^ C ^ D;
				K = 1859775393;
			} else if (i < 60) {
				F = Maj(B, C, D);
				K = 2400959708;
			} else {
				F = B ^ C ^ D;
				K = 3395469782;
			}
			const T = rotl(A, 5) + F + E + K + SHA1_W[i] | 0;
			E = D;
			D = C;
			C = rotl(B, 30);
			B = A;
			A = T;
		}
		A = A + this.A | 0;
		B = B + this.B | 0;
		C = C + this.C | 0;
		D = D + this.D | 0;
		E = E + this.E | 0;
		this.set(A, B, C, D, E);
	}
	roundClean() {
		clean(SHA1_W);
	}
	destroy() {
		this.destroyed = true;
		this.set(0, 0, 0, 0, 0);
		clean(this.buffer);
	}
};
/**
* SHA1 (RFC 3174) legacy hash function. It was cryptographically broken.
* @param msg - message bytes to hash
* @param opts - Reserved hash options.
* @returns Digest bytes.
* @example
* Hash a message with SHA1.
* ```ts
* sha1(new Uint8Array([97, 98, 99]));
* ```
*/
const sha1 = /* @__PURE__ */ createHasher(() => new _SHA1());
//#endregion
//#region ../../../node_modules/.pnpm/@noble+hashes@2.3.0/node_modules/@noble/hashes/sha2.js
/**
* SHA2 hash function. A.k.a. sha256, sha384, sha512, sha512_224, sha512_256.
* SHA256 is the fastest hash implementable in JS, even faster than Blake3.
* Check out {@link https://www.rfc-editor.org/rfc/rfc4634 | RFC 4634} and
* {@link https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf | FIPS 180-4}.
* @module
*/
/**
* SHA-224 / SHA-256 round constants from RFC 6234 §5.1: the first 32 bits
* of the cube roots of the first 64 primes (2..311).
*/
const SHA256_K = /* @__PURE__ */ Uint32Array.from([
	1116352408,
	1899447441,
	3049323471,
	3921009573,
	961987163,
	1508970993,
	2453635748,
	2870763221,
	3624381080,
	310598401,
	607225278,
	1426881987,
	1925078388,
	2162078206,
	2614888103,
	3248222580,
	3835390401,
	4022224774,
	264347078,
	604807628,
	770255983,
	1249150122,
	1555081692,
	1996064986,
	2554220882,
	2821834349,
	2952996808,
	3210313671,
	3336571891,
	3584528711,
	113926993,
	338241895,
	666307205,
	773529912,
	1294757372,
	1396182291,
	1695183700,
	1986661051,
	2177026350,
	2456956037,
	2730485921,
	2820302411,
	3259730800,
	3345764771,
	3516065817,
	3600352804,
	4094571909,
	275423344,
	430227734,
	506948616,
	659060556,
	883997877,
	958139571,
	1322822218,
	1537002063,
	1747873779,
	1955562222,
	2024104815,
	2227730452,
	2361852424,
	2428436474,
	2756734187,
	3204031479,
	3329325298
]);
/** Reusable SHA-224 / SHA-256 message schedule buffer `W_t` from RFC 6234 §6.2 step 1. */
const SHA256_W = /* @__PURE__ */ new Uint32Array(64);
/** Internal SHA-224 / SHA-256 compression engine from RFC 6234 §6.2. */
var SHA2_32B = class extends HashMD {
	A = 0;
	B = 0;
	C = 0;
	D = 0;
	E = 0;
	F = 0;
	G = 0;
	H = 0;
	constructor(outputLen, IV) {
		super(64, outputLen, 8, false);
		this.A = IV[0] | 0;
		this.B = IV[1] | 0;
		this.C = IV[2] | 0;
		this.D = IV[3] | 0;
		this.E = IV[4] | 0;
		this.F = IV[5] | 0;
		this.G = IV[6] | 0;
		this.H = IV[7] | 0;
	}
	get() {
		const { A, B, C, D, E, F, G, H } = this;
		return [
			A,
			B,
			C,
			D,
			E,
			F,
			G,
			H
		];
	}
	set(A, B, C, D, E, F, G, H) {
		this.A = A | 0;
		this.B = B | 0;
		this.C = C | 0;
		this.D = D | 0;
		this.E = E | 0;
		this.F = F | 0;
		this.G = G | 0;
		this.H = H | 0;
	}
	_cloneInto(to) {
		(to ||= new this.constructor()).set(...this.get());
		return this._cloneIntoMeta(to);
	}
	process(view, offset) {
		for (let i = 0; i < 16; i++, offset += 4) SHA256_W[i] = view.getUint32(offset, false);
		for (let i = 16; i < 64; i++) {
			const W15 = SHA256_W[i - 15];
			const W2 = SHA256_W[i - 2];
			const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
			SHA256_W[i] = (rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10) + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
		}
		let { A, B, C, D, E, F, G, H } = this;
		for (let i = 0; i < 64; i++) {
			const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
			const T1 = H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i] | 0;
			const T2 = (rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22)) + Maj(A, B, C) | 0;
			H = G;
			G = F;
			F = E;
			E = D + T1 | 0;
			D = C;
			C = B;
			B = A;
			A = T1 + T2 | 0;
		}
		A = A + this.A | 0;
		B = B + this.B | 0;
		C = C + this.C | 0;
		D = D + this.D | 0;
		E = E + this.E | 0;
		F = F + this.F | 0;
		G = G + this.G | 0;
		H = H + this.H | 0;
		this.set(A, B, C, D, E, F, G, H);
	}
	roundClean() {
		clean(SHA256_W);
	}
	destroy() {
		this.destroyed = true;
		this.set(0, 0, 0, 0, 0, 0, 0, 0);
		clean(this.buffer);
	}
};
/** Internal SHA-256 hash class grounded in RFC 6234 §6.2. */
var _SHA256 = class extends SHA2_32B {
	constructor() {
		super(32, SHA256_IV);
	}
};
const K512 = /* @__PURE__ */ (() => split([
	"0x428a2f98d728ae22",
	"0x7137449123ef65cd",
	"0xb5c0fbcfec4d3b2f",
	"0xe9b5dba58189dbbc",
	"0x3956c25bf348b538",
	"0x59f111f1b605d019",
	"0x923f82a4af194f9b",
	"0xab1c5ed5da6d8118",
	"0xd807aa98a3030242",
	"0x12835b0145706fbe",
	"0x243185be4ee4b28c",
	"0x550c7dc3d5ffb4e2",
	"0x72be5d74f27b896f",
	"0x80deb1fe3b1696b1",
	"0x9bdc06a725c71235",
	"0xc19bf174cf692694",
	"0xe49b69c19ef14ad2",
	"0xefbe4786384f25e3",
	"0x0fc19dc68b8cd5b5",
	"0x240ca1cc77ac9c65",
	"0x2de92c6f592b0275",
	"0x4a7484aa6ea6e483",
	"0x5cb0a9dcbd41fbd4",
	"0x76f988da831153b5",
	"0x983e5152ee66dfab",
	"0xa831c66d2db43210",
	"0xb00327c898fb213f",
	"0xbf597fc7beef0ee4",
	"0xc6e00bf33da88fc2",
	"0xd5a79147930aa725",
	"0x06ca6351e003826f",
	"0x142929670a0e6e70",
	"0x27b70a8546d22ffc",
	"0x2e1b21385c26c926",
	"0x4d2c6dfc5ac42aed",
	"0x53380d139d95b3df",
	"0x650a73548baf63de",
	"0x766a0abb3c77b2a8",
	"0x81c2c92e47edaee6",
	"0x92722c851482353b",
	"0xa2bfe8a14cf10364",
	"0xa81a664bbc423001",
	"0xc24b8b70d0f89791",
	"0xc76c51a30654be30",
	"0xd192e819d6ef5218",
	"0xd69906245565a910",
	"0xf40e35855771202a",
	"0x106aa07032bbd1b8",
	"0x19a4c116b8d2d0c8",
	"0x1e376c085141ab53",
	"0x2748774cdf8eeb99",
	"0x34b0bcb5e19b48a8",
	"0x391c0cb3c5c95a63",
	"0x4ed8aa4ae3418acb",
	"0x5b9cca4f7763e373",
	"0x682e6ff3d6b2b8a3",
	"0x748f82ee5defb2fc",
	"0x78a5636f43172f60",
	"0x84c87814a1f0ab72",
	"0x8cc702081a6439ec",
	"0x90befffa23631e28",
	"0xa4506cebde82bde9",
	"0xbef9a3f7b2c67915",
	"0xc67178f2e372532b",
	"0xca273eceea26619c",
	"0xd186b8c721c0c207",
	"0xeada7dd6cde0eb1e",
	"0xf57d4f7fee6ed178",
	"0x06f067aa72176fba",
	"0x0a637dc5a2c898a6",
	"0x113f9804bef90dae",
	"0x1b710b35131c471b",
	"0x28db77f523047d84",
	"0x32caab7b40c72493",
	"0x3c9ebe0a15c9bebc",
	"0x431d67c49c100d4c",
	"0x4cc5d4becb3e42b6",
	"0x597f299cfc657e2a",
	"0x5fcb6fab3ad6faec",
	"0x6c44198c4a475817"
].map((n) => BigInt(n))))();
const SHA512_Kh = /* @__PURE__ */ (() => K512[0])();
const SHA512_Kl = /* @__PURE__ */ (() => K512[1])();
const SHA512_W_H = /* @__PURE__ */ new Uint32Array(80);
const SHA512_W_L = /* @__PURE__ */ new Uint32Array(80);
/** Internal SHA-384 / SHA-512 compression engine from RFC 6234 §6.4. */
var SHA2_64B = class extends HashMD {
	Ah = 0;
	Al = 0;
	Bh = 0;
	Bl = 0;
	Ch = 0;
	Cl = 0;
	Dh = 0;
	Dl = 0;
	Eh = 0;
	El = 0;
	Fh = 0;
	Fl = 0;
	Gh = 0;
	Gl = 0;
	Hh = 0;
	Hl = 0;
	constructor(outputLen, IV) {
		super(128, outputLen, 16, false);
		this.Ah = IV[0] | 0;
		this.Al = IV[1] | 0;
		this.Bh = IV[2] | 0;
		this.Bl = IV[3] | 0;
		this.Ch = IV[4] | 0;
		this.Cl = IV[5] | 0;
		this.Dh = IV[6] | 0;
		this.Dl = IV[7] | 0;
		this.Eh = IV[8] | 0;
		this.El = IV[9] | 0;
		this.Fh = IV[10] | 0;
		this.Fl = IV[11] | 0;
		this.Gh = IV[12] | 0;
		this.Gl = IV[13] | 0;
		this.Hh = IV[14] | 0;
		this.Hl = IV[15] | 0;
	}
	get() {
		const { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
		return [
			Ah,
			Al,
			Bh,
			Bl,
			Ch,
			Cl,
			Dh,
			Dl,
			Eh,
			El,
			Fh,
			Fl,
			Gh,
			Gl,
			Hh,
			Hl
		];
	}
	set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
		this.Ah = Ah | 0;
		this.Al = Al | 0;
		this.Bh = Bh | 0;
		this.Bl = Bl | 0;
		this.Ch = Ch | 0;
		this.Cl = Cl | 0;
		this.Dh = Dh | 0;
		this.Dl = Dl | 0;
		this.Eh = Eh | 0;
		this.El = El | 0;
		this.Fh = Fh | 0;
		this.Fl = Fl | 0;
		this.Gh = Gh | 0;
		this.Gl = Gl | 0;
		this.Hh = Hh | 0;
		this.Hl = Hl | 0;
	}
	_cloneInto(to) {
		(to ||= new this.constructor()).set(...this.get());
		return this._cloneIntoMeta(to);
	}
	process(view, offset) {
		for (let i = 0; i < 16; i++, offset += 4) {
			SHA512_W_H[i] = view.getUint32(offset);
			SHA512_W_L[i] = view.getUint32(offset += 4);
		}
		for (let i = 16; i < 80; i++) {
			const W15h = SHA512_W_H[i - 15] | 0;
			const W15l = SHA512_W_L[i - 15] | 0;
			const s0h = rotrSH(W15h, W15l, 1) ^ rotrSH(W15h, W15l, 8) ^ shrSH(W15h, W15l, 7);
			const s0l = rotrSL(W15h, W15l, 1) ^ rotrSL(W15h, W15l, 8) ^ shrSL(W15h, W15l, 7);
			const W2h = SHA512_W_H[i - 2] | 0;
			const W2l = SHA512_W_L[i - 2] | 0;
			const s1h = rotrSH(W2h, W2l, 19) ^ rotrBH(W2h, W2l, 61) ^ shrSH(W2h, W2l, 6);
			const SUMl = add4L(s0l, rotrSL(W2h, W2l, 19) ^ rotrBL(W2h, W2l, 61) ^ shrSL(W2h, W2l, 6), SHA512_W_L[i - 7], SHA512_W_L[i - 16]);
			SHA512_W_H[i] = add4H(SUMl, s0h, s1h, SHA512_W_H[i - 7], SHA512_W_H[i - 16]) | 0;
			SHA512_W_L[i] = SUMl | 0;
		}
		let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
		for (let i = 0; i < 80; i++) {
			const sigma1h = rotrSH(Eh, El, 14) ^ rotrSH(Eh, El, 18) ^ rotrBH(Eh, El, 41);
			const sigma1l = rotrSL(Eh, El, 14) ^ rotrSL(Eh, El, 18) ^ rotrBL(Eh, El, 41);
			const CHIh = Eh & Fh ^ ~Eh & Gh;
			const CHIl = El & Fl ^ ~El & Gl;
			const T1ll = add5L(Hl, sigma1l, CHIl, SHA512_Kl[i], SHA512_W_L[i]);
			const T1h = add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[i], SHA512_W_H[i]);
			const T1l = T1ll | 0;
			const sigma0h = rotrSH(Ah, Al, 28) ^ rotrBH(Ah, Al, 34) ^ rotrBH(Ah, Al, 39);
			const sigma0l = rotrSL(Ah, Al, 28) ^ rotrBL(Ah, Al, 34) ^ rotrBL(Ah, Al, 39);
			const MAJh = Ah & Bh ^ Ah & Ch ^ Bh & Ch;
			const MAJl = Al & Bl ^ Al & Cl ^ Bl & Cl;
			Hh = Gh | 0;
			Hl = Gl | 0;
			Gh = Fh | 0;
			Gl = Fl | 0;
			Fh = Eh | 0;
			Fl = El | 0;
			({h: Eh, l: El} = add(Dh | 0, Dl | 0, T1h | 0, T1l | 0));
			Dh = Ch | 0;
			Dl = Cl | 0;
			Ch = Bh | 0;
			Cl = Bl | 0;
			Bh = Ah | 0;
			Bl = Al | 0;
			const All = add3L(T1l, sigma0l, MAJl);
			Ah = add3H(All, T1h, sigma0h, MAJh);
			Al = All | 0;
		}
		({h: Ah, l: Al} = add(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
		({h: Bh, l: Bl} = add(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
		({h: Ch, l: Cl} = add(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
		({h: Dh, l: Dl} = add(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
		({h: Eh, l: El} = add(this.Eh | 0, this.El | 0, Eh | 0, El | 0));
		({h: Fh, l: Fl} = add(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
		({h: Gh, l: Gl} = add(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
		({h: Hh, l: Hl} = add(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
		this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
	}
	roundClean() {
		clean(SHA512_W_H, SHA512_W_L);
	}
	destroy() {
		this.destroyed = true;
		clean(this.buffer);
		this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
	}
};
/** Internal SHA-512 hash class grounded in RFC 6234 §6.3 and §6.4. */
var _SHA512 = class extends SHA2_64B {
	constructor() {
		super(64, SHA512_IV);
	}
};
/**
* SHA2-256 hash function from RFC 4634. In JS it's the fastest: even faster than Blake3. Some info:
*
* - Trying 2^128 hashes would get 50% chance of collision, using birthday attack.
* - BTC network is doing 2^70 hashes/sec (2^95 hashes/year) as per 2025.
* - Each sha256 hash is executing 2^18 bit operations.
* - Good 2024 ASICs can do 200Th/sec with 3500 watts of power, corresponding to 2^36 hashes/joule.
* @param msg - message bytes to hash
* @param opts - Reserved hash options.
* @returns Digest bytes.
* @example
* Hash a message with SHA2-256.
* ```ts
* sha256(new Uint8Array([97, 98, 99]));
* ```
*/
const sha256 = /* @__PURE__ */ createHasher(() => new _SHA256(), /* @__PURE__ */ oidNist(1));
/**
* SHA2-512 hash function from RFC 4634.
* @param msg - message bytes to hash
* @param opts - Reserved hash options.
* @returns Digest bytes.
* @example
* Hash a message with SHA2-512.
* ```ts
* sha512(new Uint8Array([97, 98, 99]));
* ```
*/
const sha512 = /* @__PURE__ */ createHasher(() => new _SHA512(), /* @__PURE__ */ oidNist(3));
//#endregion
//#region ../../util/crypto/src/index.ts
/**
* Random v4 UUID, minted from `crypto.getRandomValues`.
* @returns the UUID string.
*/
function randomUUID$1() {
	const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
	const hex = Array.from(bytes, (byte, index) => {
		return (index === 6 ? byte & 15 | 64 : index === 8 ? byte & 63 | 128 : byte).toString(16).padStart(2, "0");
	}).join("");
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
//#endregion
//#region src/node/builtin_modules/implemented/crypto.ts
/**
* `node:crypto` for the worker: WebCrypto for randomness, `@noble/hashes` for the
* synchronous digests Node's streaming Hash object provides (SubtleCrypto is
* async, and every caller here hashes synchronously).
*/
var crypto_exports = /* @__PURE__ */ __exportAll({
	__esModule: () => true,
	createHash: () => createHash,
	default: () => crypto_default,
	getRandomValues: () => getRandomValues,
	randomBytes: () => randomBytes,
	randomInt: () => randomInt,
	randomUUID: () => randomUUID,
	webcrypto: () => webcrypto
});
const HASHERS = {
	sha1,
	sha256,
	sha512
};
const encoder = new TextEncoder();
const toBytes = (data) => {
	if (typeof data === "string") return encoder.encode(data);
	if (data instanceof ArrayBuffer) return new Uint8Array(data);
	return data;
};
/**
* Create a synchronous hash object.
* @param algorithm - digest name; only the algorithms the host tree uses exist.
* @returns the streaming hash face.
*/
function createHash(algorithm) {
	const hasher = HASHERS[algorithm.toLowerCase().replace("-", "")];
	if (hasher === void 0) throw new Error(`web-preview: node:crypto.createHash("${algorithm}") is not available in the worker host`);
	const chunks = [];
	const hash = {
		update(data) {
			chunks.push(toBytes(data));
			return hash;
		},
		digest(encoding) {
			const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
			const joined = new Uint8Array(total);
			let at = 0;
			for (const chunk of chunks) {
				joined.set(chunk, at);
				at += chunk.byteLength;
			}
			const digest = import_buffer.Buffer.from(hasher(joined));
			return encoding === void 0 ? digest : digest.toString(encoding);
		}
	};
	return hash;
}
/**
* Random bytes.
* @param size - byte count.
* @returns a Buffer of cryptographically strong random bytes.
*/
function randomBytes(size) {
	const bytes = new Uint8Array(size);
	globalThis.crypto.getRandomValues(bytes);
	return import_buffer.Buffer.from(bytes);
}
/**
* Random v4 UUID. Delegated to the repository's own mint rather than to
* `crypto.randomUUID`, which browsers expose only in secure contexts — a
* preview served over plain HTTP on a LAN address has no `randomUUID`.
* @returns the UUID string.
*/
function randomUUID() {
	return randomUUID$1();
}
/**
* Fill a typed array with random bytes.
* @param target - the array to fill.
* @returns the same array.
*/
function getRandomValues(target) {
	return globalThis.crypto.getRandomValues(target);
}
/**
* Random integer in `[0, max)`.
* @param max - exclusive upper bound.
* @returns the integer.
*/
function randomInt(max) {
	const sample = globalThis.crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
	return Math.floor(sample / 2 ** 32 * max);
}
/** WebCrypto instance, as Node exposes it. */
const webcrypto = globalThis.crypto;
/** CommonJS default export: the members `require()` hands a caller of this module. */
var crypto_default = {
	createHash,
	randomBytes,
	randomUUID,
	getRandomValues,
	randomInt,
	webcrypto
};
//#endregion
//#region src/node/builtin_modules/mock/dns/promises.ts
/**
* `node:dns/promises` stub. The static WebWorker preview has no DNS resolver;
* reaching public-address preflight must fail loud instead of inventing an
* address or bypassing the native HTTP provider's SSRF policy.
*/
var promises_exports$2 = /* @__PURE__ */ __exportAll({
	__esModule: () => true,
	default: () => promises_default$2,
	lookup: () => lookup
});
/** DNS lookup (unavailable in the worker host). */
const lookup = notImplementedFail("node:dns/promises", "lookup");
/** CommonJS default export: the members `require()` hands a caller of this module. */
var promises_default$2 = { lookup };
//#endregion
//#region src/node/builtin_modules/implemented/events.ts
var events_exports = /* @__PURE__ */ __exportAll({
	EventEmitter: () => EventEmitter,
	__esModule: () => true,
	default: () => events_default
});
/** The `node:events` subset the harness registers on: add, remove, and emit. */
var EventEmitter = class {
	registry = /* @__PURE__ */ new Map();
	/**
	* Register a listener.
	* @param event - event name.
	* @param listener - the listener.
	* @returns this emitter.
	*/
	on(event, listener) {
		const list = this.registry.get(event) ?? [];
		list.push(listener);
		this.registry.set(event, list);
		return this;
	}
	/**
	* Register a listener removed after its first call.
	* @param event - event name.
	* @param listener - the listener.
	* @returns this emitter.
	*/
	once(event, listener) {
		const wrapper = ((...args) => {
			this.off(event, wrapper);
			listener(...args);
		});
		wrapper.listener = listener;
		return this.on(event, wrapper);
	}
	/**
	* Register a listener ahead of the existing ones.
	* @param event - event name.
	* @param listener - the listener.
	* @returns this emitter.
	*/
	prependListener(event, listener) {
		const list = this.registry.get(event) ?? [];
		list.unshift(listener);
		this.registry.set(event, list);
		return this;
	}
	/**
	* Remove a listener, by the function that was registered or by the one a
	* `once` wrapper stands for.
	* @param event - event name.
	* @param listener - the listener.
	* @returns this emitter.
	*/
	off(event, listener) {
		const list = this.registry.get(event);
		if (list !== void 0) for (let at = list.length - 1; at >= 0; at--) {
			const registered = list[at];
			if (registered === listener || registered?.listener === listener) {
				list.splice(at, 1);
				break;
			}
		}
		return this;
	}
	/**
	* Alias of {@link off}.
	* @param event - event name.
	* @param listener - the listener.
	* @returns this emitter.
	*/
	removeListener(event, listener) {
		return this.off(event, listener);
	}
	/**
	* Drop listeners for one event, or all of them.
	* @param event - event name; omitted clears every event.
	* @returns this emitter.
	*/
	removeAllListeners(event) {
		if (event === void 0) this.registry.clear();
		else this.registry.delete(event);
		return this;
	}
	/**
	* Emit an event.
	* @param event - event name.
	* @param args - listener arguments.
	* @returns whether any listener ran.
	*/
	emit(event, ...args) {
		const list = this.registry.get(event);
		if (list === void 0 || list.length === 0) return false;
		for (const listener of [...list]) listener(...args);
		return true;
	}
	/**
	* Listeners of one event.
	* @param event - event name.
	* @returns a copy of the listener list.
	*/
	listeners(event) {
		return [...this.registry.get(event) ?? []];
	}
	/**
	* Listener count of one event.
	* @param event - event name.
	* @returns the count.
	*/
	listenerCount(event) {
		return this.registry.get(event)?.length ?? 0;
	}
	/**
	* Node's max-listener knob has no effect here.
	* @returns This emitter, for chaining.
	*/
	setMaxListeners() {
		return this;
	}
};
/** CommonJS default export: the members `require()` hands a caller of this module. */
var events_default = { EventEmitter };
//#endregion
//#region ../../../node_modules/.pnpm/readable-stream@4.7.0/node_modules/readable-stream/lib/ours/primordials.js
var require_primordials = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var AggregateError = class extends Error {
		constructor(errors) {
			if (!Array.isArray(errors)) throw new TypeError(`Expected input to be an Array, got ${typeof errors}`);
			let message = "";
			for (let i = 0; i < errors.length; i++) message += `    ${errors[i].stack}\n`;
			super(message);
			this.name = "AggregateError";
			this.errors = errors;
		}
	};
	module.exports = {
		AggregateError,
		ArrayIsArray(self) {
			return Array.isArray(self);
		},
		ArrayPrototypeIncludes(self, el) {
			return self.includes(el);
		},
		ArrayPrototypeIndexOf(self, el) {
			return self.indexOf(el);
		},
		ArrayPrototypeJoin(self, sep) {
			return self.join(sep);
		},
		ArrayPrototypeMap(self, fn) {
			return self.map(fn);
		},
		ArrayPrototypePop(self, el) {
			return self.pop(el);
		},
		ArrayPrototypePush(self, el) {
			return self.push(el);
		},
		ArrayPrototypeSlice(self, start, end) {
			return self.slice(start, end);
		},
		Error,
		FunctionPrototypeCall(fn, thisArgs, ...args) {
			return fn.call(thisArgs, ...args);
		},
		FunctionPrototypeSymbolHasInstance(self, instance) {
			return Function.prototype[Symbol.hasInstance].call(self, instance);
		},
		MathFloor: Math.floor,
		Number,
		NumberIsInteger: Number.isInteger,
		NumberIsNaN: Number.isNaN,
		NumberMAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER,
		NumberMIN_SAFE_INTEGER: Number.MIN_SAFE_INTEGER,
		NumberParseInt: Number.parseInt,
		ObjectDefineProperties(self, props) {
			return Object.defineProperties(self, props);
		},
		ObjectDefineProperty(self, name, prop) {
			return Object.defineProperty(self, name, prop);
		},
		ObjectGetOwnPropertyDescriptor(self, name) {
			return Object.getOwnPropertyDescriptor(self, name);
		},
		ObjectKeys(obj) {
			return Object.keys(obj);
		},
		ObjectSetPrototypeOf(target, proto) {
			return Object.setPrototypeOf(target, proto);
		},
		Promise,
		PromisePrototypeCatch(self, fn) {
			return self.catch(fn);
		},
		PromisePrototypeThen(self, thenFn, catchFn) {
			return self.then(thenFn, catchFn);
		},
		PromiseReject(err) {
			return Promise.reject(err);
		},
		PromiseResolve(val) {
			return Promise.resolve(val);
		},
		ReflectApply: Reflect.apply,
		RegExpPrototypeTest(self, value) {
			return self.test(value);
		},
		SafeSet: Set,
		String,
		StringPrototypeSlice(self, start, end) {
			return self.slice(start, end);
		},
		StringPrototypeToLowerCase(self) {
			return self.toLowerCase();
		},
		StringPrototypeToUpperCase(self) {
			return self.toUpperCase();
		},
		StringPrototypeTrim(self) {
			return self.trim();
		},
		Symbol,
		SymbolFor: Symbol.for,
		SymbolAsyncIterator: Symbol.asyncIterator,
		SymbolHasInstance: Symbol.hasInstance,
		SymbolIterator: Symbol.iterator,
		SymbolDispose: Symbol.dispose || Symbol("Symbol.dispose"),
		SymbolAsyncDispose: Symbol.asyncDispose || Symbol("Symbol.asyncDispose"),
		TypedArrayPrototypeSet(self, buf, len) {
			return self.set(buf, len);
		},
		Boolean,
		Uint8Array
	};
}));
//#endregion
//#region ../../../node_modules/.pnpm/readable-stream@4.7.0/node_modules/readable-stream/lib/ours/util/inspect.js
var require_inspect = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = {
		format(format, ...args) {
			return format.replace(/%([sdifj])/g, function(...[_unused, type]) {
				const replacement = args.shift();
				if (type === "f") return replacement.toFixed(6);
				else if (type === "j") return JSON.stringify(replacement);
				else if (type === "s" && typeof replacement === "object") return `${replacement.constructor !== Object ? replacement.constructor.name : ""} {}`.trim();
				else return replacement.toString();
			});
		},
		inspect(value) {
			switch (typeof value) {
				case "string":
					if (value.includes("'")) {
						if (!value.includes("\"")) return `"${value}"`;
						else if (!value.includes("`") && !value.includes("${")) return `\`${value}\``;
					}
					return `'${value}'`;
				case "number":
					if (isNaN(value)) return "NaN";
					else if (Object.is(value, -0)) return String(value);
					return value;
				case "bigint": return `${String(value)}n`;
				case "boolean":
				case "undefined": return String(value);
				case "object": return "{}";
			}
		}
	};
}));
//#endregion
//#region ../../../node_modules/.pnpm/readable-stream@4.7.0/node_modules/readable-stream/lib/ours/errors.js
var require_errors = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const { format, inspect } = require_inspect();
	const { AggregateError: CustomAggregateError } = require_primordials();
	const AggregateError = globalThis.AggregateError || CustomAggregateError;
	const kIsNodeError = Symbol("kIsNodeError");
	const kTypes = [
		"string",
		"function",
		"number",
		"object",
		"Function",
		"Object",
		"boolean",
		"bigint",
		"symbol"
	];
	const classRegExp = /^([A-Z][a-z0-9]*)+$/;
	const nodeInternalPrefix = "__node_internal_";
	const codes = {};
	function assert(value, message) {
		if (!value) throw new codes.ERR_INTERNAL_ASSERTION(message);
	}
	function addNumericalSeparator(val) {
		let res = "";
		let i = val.length;
		const start = val[0] === "-" ? 1 : 0;
		for (; i >= start + 4; i -= 3) res = `_${val.slice(i - 3, i)}${res}`;
		return `${val.slice(0, i)}${res}`;
	}
	function getMessage(key, msg, args) {
		if (typeof msg === "function") {
			assert(msg.length <= args.length, `Code: ${key}; The provided arguments length (${args.length}) does not match the required ones (${msg.length}).`);
			return msg(...args);
		}
		const expectedLength = (msg.match(/%[dfijoOs]/g) || []).length;
		assert(expectedLength === args.length, `Code: ${key}; The provided arguments length (${args.length}) does not match the required ones (${expectedLength}).`);
		if (args.length === 0) return msg;
		return format(msg, ...args);
	}
	function E(code, message, Base) {
		if (!Base) Base = Error;
		class NodeError extends Base {
			constructor(...args) {
				super(getMessage(code, message, args));
			}
			toString() {
				return `${this.name} [${code}]: ${this.message}`;
			}
		}
		Object.defineProperties(NodeError.prototype, {
			name: {
				value: Base.name,
				writable: true,
				enumerable: false,
				configurable: true
			},
			toString: {
				value() {
					return `${this.name} [${code}]: ${this.message}`;
				},
				writable: true,
				enumerable: false,
				configurable: true
			}
		});
		NodeError.prototype.code = code;
		NodeError.prototype[kIsNodeError] = true;
		codes[code] = NodeError;
	}
	function hideStackFrames(fn) {
		const hidden = nodeInternalPrefix + fn.name;
		Object.defineProperty(fn, "name", { value: hidden });
		return fn;
	}
	function aggregateTwoErrors(innerError, outerError) {
		if (innerError && outerError && innerError !== outerError) {
			if (Array.isArray(outerError.errors)) {
				outerError.errors.push(innerError);
				return outerError;
			}
			const err = new AggregateError([outerError, innerError], outerError.message);
			err.code = outerError.code;
			return err;
		}
		return innerError || outerError;
	}
	var AbortError = class extends Error {
		constructor(message = "The operation was aborted", options = void 0) {
			if (options !== void 0 && typeof options !== "object") throw new codes.ERR_INVALID_ARG_TYPE("options", "Object", options);
			super(message, options);
			this.code = "ABORT_ERR";
			this.name = "AbortError";
		}
	};
	E("ERR_ASSERTION", "%s", Error);
	E("ERR_INVALID_ARG_TYPE", (name, expected, actual) => {
		assert(typeof name === "string", "'name' must be a string");
		if (!Array.isArray(expected)) expected = [expected];
		let msg = "The ";
		if (name.endsWith(" argument")) msg += `${name} `;
		else msg += `"${name}" ${name.includes(".") ? "property" : "argument"} `;
		msg += "must be ";
		const types = [];
		const instances = [];
		const other = [];
		for (const value of expected) {
			assert(typeof value === "string", "All expected entries have to be of type string");
			if (kTypes.includes(value)) types.push(value.toLowerCase());
			else if (classRegExp.test(value)) instances.push(value);
			else {
				assert(value !== "object", "The value \"object\" should be written as \"Object\"");
				other.push(value);
			}
		}
		if (instances.length > 0) {
			const pos = types.indexOf("object");
			if (pos !== -1) {
				types.splice(types, pos, 1);
				instances.push("Object");
			}
		}
		if (types.length > 0) {
			switch (types.length) {
				case 1:
					msg += `of type ${types[0]}`;
					break;
				case 2:
					msg += `one of type ${types[0]} or ${types[1]}`;
					break;
				default: {
					const last = types.pop();
					msg += `one of type ${types.join(", ")}, or ${last}`;
				}
			}
			if (instances.length > 0 || other.length > 0) msg += " or ";
		}
		if (instances.length > 0) {
			switch (instances.length) {
				case 1:
					msg += `an instance of ${instances[0]}`;
					break;
				case 2:
					msg += `an instance of ${instances[0]} or ${instances[1]}`;
					break;
				default: {
					const last = instances.pop();
					msg += `an instance of ${instances.join(", ")}, or ${last}`;
				}
			}
			if (other.length > 0) msg += " or ";
		}
		switch (other.length) {
			case 0: break;
			case 1:
				if (other[0].toLowerCase() !== other[0]) msg += "an ";
				msg += `${other[0]}`;
				break;
			case 2:
				msg += `one of ${other[0]} or ${other[1]}`;
				break;
			default: {
				const last = other.pop();
				msg += `one of ${other.join(", ")}, or ${last}`;
			}
		}
		if (actual == null) msg += `. Received ${actual}`;
		else if (typeof actual === "function" && actual.name) msg += `. Received function ${actual.name}`;
		else if (typeof actual === "object") {
			var _actual$constructor;
			if ((_actual$constructor = actual.constructor) !== null && _actual$constructor !== void 0 && _actual$constructor.name) msg += `. Received an instance of ${actual.constructor.name}`;
			else {
				const inspected = inspect(actual, { depth: -1 });
				msg += `. Received ${inspected}`;
			}
		} else {
			let inspected = inspect(actual, { colors: false });
			if (inspected.length > 25) inspected = `${inspected.slice(0, 25)}...`;
			msg += `. Received type ${typeof actual} (${inspected})`;
		}
		return msg;
	}, TypeError);
	E("ERR_INVALID_ARG_VALUE", (name, value, reason = "is invalid") => {
		let inspected = inspect(value);
		if (inspected.length > 128) inspected = inspected.slice(0, 128) + "...";
		return `The ${name.includes(".") ? "property" : "argument"} '${name}' ${reason}. Received ${inspected}`;
	}, TypeError);
	E("ERR_INVALID_RETURN_VALUE", (input, name, value) => {
		var _value$constructor;
		return `Expected ${input} to be returned from the "${name}" function but got ${value !== null && value !== void 0 && (_value$constructor = value.constructor) !== null && _value$constructor !== void 0 && _value$constructor.name ? `instance of ${value.constructor.name}` : `type ${typeof value}`}.`;
	}, TypeError);
	E("ERR_MISSING_ARGS", (...args) => {
		assert(args.length > 0, "At least one arg needs to be specified");
		let msg;
		const len = args.length;
		args = (Array.isArray(args) ? args : [args]).map((a) => `"${a}"`).join(" or ");
		switch (len) {
			case 1:
				msg += `The ${args[0]} argument`;
				break;
			case 2:
				msg += `The ${args[0]} and ${args[1]} arguments`;
				break;
			default:
				{
					const last = args.pop();
					msg += `The ${args.join(", ")}, and ${last} arguments`;
				}
				break;
		}
		return `${msg} must be specified`;
	}, TypeError);
	E("ERR_OUT_OF_RANGE", (str, range, input) => {
		assert(range, "Missing \"range\" argument");
		let received;
		if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) received = addNumericalSeparator(String(input));
		else if (typeof input === "bigint") {
			received = String(input);
			const limit = BigInt(2) ** BigInt(32);
			if (input > limit || input < -limit) received = addNumericalSeparator(received);
			received += "n";
		} else received = inspect(input);
		return `The value of "${str}" is out of range. It must be ${range}. Received ${received}`;
	}, RangeError);
	E("ERR_MULTIPLE_CALLBACK", "Callback called multiple times", Error);
	E("ERR_METHOD_NOT_IMPLEMENTED", "The %s method is not implemented", Error);
	E("ERR_STREAM_ALREADY_FINISHED", "Cannot call %s after a stream was finished", Error);
	E("ERR_STREAM_CANNOT_PIPE", "Cannot pipe, not readable", Error);
	E("ERR_STREAM_DESTROYED", "Cannot call %s after a stream was destroyed", Error);
	E("ERR_STREAM_NULL_VALUES", "May not write null values to stream", TypeError);
	E("ERR_STREAM_PREMATURE_CLOSE", "Premature close", Error);
	E("ERR_STREAM_PUSH_AFTER_EOF", "stream.push() after EOF", Error);
	E("ERR_STREAM_UNSHIFT_AFTER_END_EVENT", "stream.unshift() after end event", Error);
	E("ERR_STREAM_WRITE_AFTER_END", "write after end", Error);
	E("ERR_UNKNOWN_ENCODING", "Unknown encoding: %s", TypeError);
	module.exports = {
		AbortError,
		aggregateTwoErrors: hideStackFrames(aggregateTwoErrors),
		hideStackFrames,
		codes
	};
}));
//#endregion
//#region ../../../node_modules/.pnpm/abort-controller@3.0.0/node_modules/abort-controller/browser.js
var require_browser$2 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const { AbortController, AbortSignal } = typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : void 0;
	module.exports = AbortController;
	module.exports.AbortSignal = AbortSignal;
	module.exports.default = AbortController;
}));
//#endregion
//#region ../../../node_modules/.pnpm/events@3.3.0/node_modules/events/events.js
var require_events = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var R = typeof Reflect === "object" ? Reflect : null;
	var ReflectApply = R && typeof R.apply === "function" ? R.apply : function ReflectApply(target, receiver, args) {
		return Function.prototype.apply.call(target, receiver, args);
	};
	var ReflectOwnKeys;
	if (R && typeof R.ownKeys === "function") ReflectOwnKeys = R.ownKeys;
	else if (Object.getOwnPropertySymbols) ReflectOwnKeys = function ReflectOwnKeys(target) {
		return Object.getOwnPropertyNames(target).concat(Object.getOwnPropertySymbols(target));
	};
	else ReflectOwnKeys = function ReflectOwnKeys(target) {
		return Object.getOwnPropertyNames(target);
	};
	function ProcessEmitWarning(warning) {
		if (console && console.warn) console.warn(warning);
	}
	var NumberIsNaN = Number.isNaN || function NumberIsNaN(value) {
		return value !== value;
	};
	function EventEmitter() {
		EventEmitter.init.call(this);
	}
	module.exports = EventEmitter;
	module.exports.once = once;
	EventEmitter.EventEmitter = EventEmitter;
	EventEmitter.prototype._events = void 0;
	EventEmitter.prototype._eventsCount = 0;
	EventEmitter.prototype._maxListeners = void 0;
	var defaultMaxListeners = 10;
	function checkListener(listener) {
		if (typeof listener !== "function") throw new TypeError("The \"listener\" argument must be of type Function. Received type " + typeof listener);
	}
	Object.defineProperty(EventEmitter, "defaultMaxListeners", {
		enumerable: true,
		get: function() {
			return defaultMaxListeners;
		},
		set: function(arg) {
			if (typeof arg !== "number" || arg < 0 || NumberIsNaN(arg)) throw new RangeError("The value of \"defaultMaxListeners\" is out of range. It must be a non-negative number. Received " + arg + ".");
			defaultMaxListeners = arg;
		}
	});
	EventEmitter.init = function() {
		if (this._events === void 0 || this._events === Object.getPrototypeOf(this)._events) {
			this._events = Object.create(null);
			this._eventsCount = 0;
		}
		this._maxListeners = this._maxListeners || void 0;
	};
	EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
		if (typeof n !== "number" || n < 0 || NumberIsNaN(n)) throw new RangeError("The value of \"n\" is out of range. It must be a non-negative number. Received " + n + ".");
		this._maxListeners = n;
		return this;
	};
	function _getMaxListeners(that) {
		if (that._maxListeners === void 0) return EventEmitter.defaultMaxListeners;
		return that._maxListeners;
	}
	EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
		return _getMaxListeners(this);
	};
	EventEmitter.prototype.emit = function emit(type) {
		var args = [];
		for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
		var doError = type === "error";
		var events = this._events;
		if (events !== void 0) doError = doError && events.error === void 0;
		else if (!doError) return false;
		if (doError) {
			var er;
			if (args.length > 0) er = args[0];
			if (er instanceof Error) throw er;
			var err = /* @__PURE__ */ new Error("Unhandled error." + (er ? " (" + er.message + ")" : ""));
			err.context = er;
			throw err;
		}
		var handler = events[type];
		if (handler === void 0) return false;
		if (typeof handler === "function") ReflectApply(handler, this, args);
		else {
			var len = handler.length;
			var listeners = arrayClone(handler, len);
			for (var i = 0; i < len; ++i) ReflectApply(listeners[i], this, args);
		}
		return true;
	};
	function _addListener(target, type, listener, prepend) {
		var m;
		var events;
		var existing;
		checkListener(listener);
		events = target._events;
		if (events === void 0) {
			events = target._events = Object.create(null);
			target._eventsCount = 0;
		} else {
			if (events.newListener !== void 0) {
				target.emit("newListener", type, listener.listener ? listener.listener : listener);
				events = target._events;
			}
			existing = events[type];
		}
		if (existing === void 0) {
			existing = events[type] = listener;
			++target._eventsCount;
		} else {
			if (typeof existing === "function") existing = events[type] = prepend ? [listener, existing] : [existing, listener];
			else if (prepend) existing.unshift(listener);
			else existing.push(listener);
			m = _getMaxListeners(target);
			if (m > 0 && existing.length > m && !existing.warned) {
				existing.warned = true;
				var w = /* @__PURE__ */ new Error("Possible EventEmitter memory leak detected. " + existing.length + " " + String(type) + " listeners added. Use emitter.setMaxListeners() to increase limit");
				w.name = "MaxListenersExceededWarning";
				w.emitter = target;
				w.type = type;
				w.count = existing.length;
				ProcessEmitWarning(w);
			}
		}
		return target;
	}
	EventEmitter.prototype.addListener = function addListener(type, listener) {
		return _addListener(this, type, listener, false);
	};
	EventEmitter.prototype.on = EventEmitter.prototype.addListener;
	EventEmitter.prototype.prependListener = function prependListener(type, listener) {
		return _addListener(this, type, listener, true);
	};
	function onceWrapper() {
		if (!this.fired) {
			this.target.removeListener(this.type, this.wrapFn);
			this.fired = true;
			if (arguments.length === 0) return this.listener.call(this.target);
			return this.listener.apply(this.target, arguments);
		}
	}
	function _onceWrap(target, type, listener) {
		var state = {
			fired: false,
			wrapFn: void 0,
			target,
			type,
			listener
		};
		var wrapped = onceWrapper.bind(state);
		wrapped.listener = listener;
		state.wrapFn = wrapped;
		return wrapped;
	}
	EventEmitter.prototype.once = function once(type, listener) {
		checkListener(listener);
		this.on(type, _onceWrap(this, type, listener));
		return this;
	};
	EventEmitter.prototype.prependOnceListener = function prependOnceListener(type, listener) {
		checkListener(listener);
		this.prependListener(type, _onceWrap(this, type, listener));
		return this;
	};
	EventEmitter.prototype.removeListener = function removeListener(type, listener) {
		var list, events, position, i, originalListener;
		checkListener(listener);
		events = this._events;
		if (events === void 0) return this;
		list = events[type];
		if (list === void 0) return this;
		if (list === listener || list.listener === listener) if (--this._eventsCount === 0) this._events = Object.create(null);
		else {
			delete events[type];
			if (events.removeListener) this.emit("removeListener", type, list.listener || listener);
		}
		else if (typeof list !== "function") {
			position = -1;
			for (i = list.length - 1; i >= 0; i--) if (list[i] === listener || list[i].listener === listener) {
				originalListener = list[i].listener;
				position = i;
				break;
			}
			if (position < 0) return this;
			if (position === 0) list.shift();
			else spliceOne(list, position);
			if (list.length === 1) events[type] = list[0];
			if (events.removeListener !== void 0) this.emit("removeListener", type, originalListener || listener);
		}
		return this;
	};
	EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
	EventEmitter.prototype.removeAllListeners = function removeAllListeners(type) {
		var listeners, events = this._events, i;
		if (events === void 0) return this;
		if (events.removeListener === void 0) {
			if (arguments.length === 0) {
				this._events = Object.create(null);
				this._eventsCount = 0;
			} else if (events[type] !== void 0) if (--this._eventsCount === 0) this._events = Object.create(null);
			else delete events[type];
			return this;
		}
		if (arguments.length === 0) {
			var keys = Object.keys(events);
			var key;
			for (i = 0; i < keys.length; ++i) {
				key = keys[i];
				if (key === "removeListener") continue;
				this.removeAllListeners(key);
			}
			this.removeAllListeners("removeListener");
			this._events = Object.create(null);
			this._eventsCount = 0;
			return this;
		}
		listeners = events[type];
		if (typeof listeners === "function") this.removeListener(type, listeners);
		else if (listeners !== void 0) for (i = listeners.length - 1; i >= 0; i--) this.removeListener(type, listeners[i]);
		return this;
	};
	function _listeners(target, type, unwrap) {
		var events = target._events;
		if (events === void 0) return [];
		var evlistener = events[type];
		if (evlistener === void 0) return [];
		if (typeof evlistener === "function") return unwrap ? [evlistener.listener || evlistener] : [evlistener];
		return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
	}
	EventEmitter.prototype.listeners = function listeners(type) {
		return _listeners(this, type, true);
	};
	EventEmitter.prototype.rawListeners = function rawListeners(type) {
		return _listeners(this, type, false);
	};
	EventEmitter.listenerCount = function(emitter, type) {
		if (typeof emitter.listenerCount === "function") return emitter.listenerCount(type);
		else return listenerCount.call(emitter, type);
	};
	EventEmitter.prototype.listenerCount = listenerCount;
	function listenerCount(type) {
		var events = this._events;
		if (events !== void 0) {
			var evlistener = events[type];
			if (typeof evlistener === "function") return 1;
			else if (evlistener !== void 0) return evlistener.length;
		}
		return 0;
	}
	EventEmitter.prototype.eventNames = function eventNames() {
		return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
	};
	function arrayClone(arr, n) {
		var copy = new Array(n);
		for (var i = 0; i < n; ++i) copy[i] = arr[i];
		return copy;
	}
	function spliceOne(list, index) {
		for (; index + 1 < list.length; index++) list[index] = list[index + 1];
		list.pop();
	}
	function unwrapListeners(arr) {
		var ret = new Array(arr.length);
		for (var i = 0; i < ret.length; ++i) ret[i] = arr[i].listener || arr[i];
		return ret;
	}
	function once(emitter, name) {
		return new Promise(function(resolve, reject) {
			function errorListener(err) {
				emitter.removeListener(name, resolver);
				reject(err);
			}
			function resolver() {
				if (typeof emitter.removeListener === "function") emitter.removeListener("error", errorListener);
				resolve([].slice.call(arguments));
			}
			eventTargetAgnosticAddListener(emitter, name, resolver, { once: true });
			if (name !== "error") addErrorHandlerIfEventEmitter(emitter, errorListener, { once: true });
		});
	}
	function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
		if (typeof emitter.on === "function") eventTargetAgnosticAddListener(emitter, "error", handler, flags);
	}
	function eventTargetAgnosticAddListener(emitter, name, listener, flags) {
		if (typeof emitter.on === "function") if (flags.once) emitter.once(name, listener);
		else emitter.on(name, listener);
		else if (typeof emitter.addEventListener === "function") emitter.addEventListener(name, function wrapListener(arg) {
			if (flags.once) emitter.removeEventListener(name, wrapListener);
			listener(arg);
		});
		else throw new TypeError("The \"emitter\" argument must be of type EventEmitter. Received type " + typeof emitter);
	}
}));
//#endregion
//#region ../../../node_modules/.pnpm/readable-stream@4.7.0/node_modules/readable-stream/lib/ours/util.js
var require_util = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const bufferModule = require_buffer();
	const { format, inspect } = require_inspect();
	const { codes: { ERR_INVALID_ARG_TYPE } } = require_errors();
	const { kResistStopPropagation, AggregateError, SymbolDispose } = require_primordials();
	const AbortSignal = globalThis.AbortSignal || require_browser$2().AbortSignal;
	const AbortController = globalThis.AbortController || require_browser$2().AbortController;
	const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
	const Blob = globalThis.Blob || bufferModule.Blob;
	const isBlob = typeof Blob !== "undefined" ? function isBlob(b) {
		return b instanceof Blob;
	} : function isBlob(b) {
		return false;
	};
	const validateAbortSignal = (signal, name) => {
		if (signal !== void 0 && (signal === null || typeof signal !== "object" || !("aborted" in signal))) throw new ERR_INVALID_ARG_TYPE(name, "AbortSignal", signal);
	};
	const validateFunction = (value, name) => {
		if (typeof value !== "function") throw new ERR_INVALID_ARG_TYPE(name, "Function", value);
	};
	module.exports = {
		AggregateError,
		kEmptyObject: Object.freeze({}),
		once(callback) {
			let called = false;
			return function(...args) {
				if (called) return;
				called = true;
				callback.apply(this, args);
			};
		},
		createDeferredPromise: function() {
			let resolve;
			let reject;
			return {
				promise: new Promise((res, rej) => {
					resolve = res;
					reject = rej;
				}),
				resolve,
				reject
			};
		},
		promisify(fn) {
			return new Promise((resolve, reject) => {
				fn((err, ...args) => {
					if (err) return reject(err);
					return resolve(...args);
				});
			});
		},
		debuglog() {
			return function() {};
		},
		format,
		inspect,
		types: {
			isAsyncFunction(fn) {
				return fn instanceof AsyncFunction;
			},
			isArrayBufferView(arr) {
				return ArrayBuffer.isView(arr);
			}
		},
		isBlob,
		deprecate(fn, message) {
			return fn;
		},
		addAbortListener: require_events().addAbortListener || function addAbortListener(signal, listener) {
			if (signal === void 0) throw new ERR_INVALID_ARG_TYPE("signal", "AbortSignal", signal);
			validateAbortSignal(signal, "signal");
			validateFunction(listener, "listener");
			let removeEventListener;
			if (signal.aborted) queueMicrotask(() => listener());
			else {
				signal.addEventListener("abort", listener, {
					__proto__: null,
					once: true,
					[kResistStopPropagation]: true
				});
				removeEventListener = () => {
					signal.removeEventListener("abort", listener);
				};
			}
			return {
				__proto__: null,
				[SymbolDispose]() {
					var _removeEventListener;
					(_removeEventListener = removeEventListener) === null || _removeEventListener === void 0 || _removeEventListener();
				}
			};
		},
		AbortSignalAny: AbortSignal.any || function AbortSignalAny(signals) {
			if (signals.length === 1) return signals[0];
			const ac = new AbortController();
			const abort = () => ac.abort();
			signals.forEach((signal) => {
				validateAbortSignal(signal, "signals");
				signal.addEventListener("abort", abort, { once: true });
			});
			ac.signal.addEventListener("abort", () => {
				signals.forEach((signal) => signal.removeEventListener("abort", abort));
			}, { once: true });
			return ac.signal;
		}
	};
	module.exports.promisify.custom = Symbol.for("nodejs.util.promisify.custom");
}));
//#endregion
//#region ../../../node_modules/.pnpm/readable-stream@4.7.0/node_modules/readable-stream/lib/internal/validators.js
var require_validators = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const { ArrayIsArray, ArrayPrototypeIncludes, ArrayPrototypeJoin, ArrayPrototypeMap, NumberIsInteger, NumberIsNaN, NumberMAX_SAFE_INTEGER, NumberMIN_SAFE_INTEGER, NumberParseInt, ObjectPrototypeHasOwnProperty, RegExpPrototypeExec, String, StringPrototypeToUpperCase, StringPrototypeTrim } = require_primordials();
	const { hideStackFrames, codes: { ERR_SOCKET_BAD_PORT, ERR_INVALID_ARG_TYPE, ERR_INVALID_ARG_VALUE, ERR_OUT_OF_RANGE, ERR_UNKNOWN_SIGNAL } } = require_errors();
	const { normalizeEncoding } = require_util();
	const { isAsyncFunction, isArrayBufferView } = require_util().types;
	const signals = {};
	/**
	* @param {*} value
	* @returns {boolean}
	*/
	function isInt32(value) {
		return value === (value | 0);
	}
	/**
	* @param {*} value
	* @returns {boolean}
	*/
	function isUint32(value) {
		return value === value >>> 0;
	}
	const octalReg = /^[0-7]+$/;
	const modeDesc = "must be a 32-bit unsigned integer or an octal string";
	/**
	* Parse and validate values that will be converted into mode_t (the S_*
	* constants). Only valid numbers and octal strings are allowed. They could be
	* converted to 32-bit unsigned integers or non-negative signed integers in the
	* C++ land, but any value higher than 0o777 will result in platform-specific
	* behaviors.
	* @param {*} value Values to be validated
	* @param {string} name Name of the argument
	* @param {number} [def] If specified, will be returned for invalid values
	* @returns {number}
	*/
	function parseFileMode(value, name, def) {
		if (typeof value === "undefined") value = def;
		if (typeof value === "string") {
			if (RegExpPrototypeExec(octalReg, value) === null) throw new ERR_INVALID_ARG_VALUE(name, value, modeDesc);
			value = NumberParseInt(value, 8);
		}
		validateUint32(value, name);
		return value;
	}
	/**
	* @callback validateInteger
	* @param {*} value
	* @param {string} name
	* @param {number} [min]
	* @param {number} [max]
	* @returns {asserts value is number}
	*/
	/** @type {validateInteger} */
	const validateInteger = hideStackFrames((value, name, min = NumberMIN_SAFE_INTEGER, max = NumberMAX_SAFE_INTEGER) => {
		if (typeof value !== "number") throw new ERR_INVALID_ARG_TYPE(name, "number", value);
		if (!NumberIsInteger(value)) throw new ERR_OUT_OF_RANGE(name, "an integer", value);
		if (value < min || value > max) throw new ERR_OUT_OF_RANGE(name, `>= ${min} && <= ${max}`, value);
	});
	/**
	* @callback validateInt32
	* @param {*} value
	* @param {string} name
	* @param {number} [min]
	* @param {number} [max]
	* @returns {asserts value is number}
	*/
	/** @type {validateInt32} */
	const validateInt32 = hideStackFrames((value, name, min = -2147483648, max = 2147483647) => {
		if (typeof value !== "number") throw new ERR_INVALID_ARG_TYPE(name, "number", value);
		if (!NumberIsInteger(value)) throw new ERR_OUT_OF_RANGE(name, "an integer", value);
		if (value < min || value > max) throw new ERR_OUT_OF_RANGE(name, `>= ${min} && <= ${max}`, value);
	});
	/**
	* @callback validateUint32
	* @param {*} value
	* @param {string} name
	* @param {number|boolean} [positive=false]
	* @returns {asserts value is number}
	*/
	/** @type {validateUint32} */
	const validateUint32 = hideStackFrames((value, name, positive = false) => {
		if (typeof value !== "number") throw new ERR_INVALID_ARG_TYPE(name, "number", value);
		if (!NumberIsInteger(value)) throw new ERR_OUT_OF_RANGE(name, "an integer", value);
		const min = positive ? 1 : 0;
		const max = 4294967295;
		if (value < min || value > max) throw new ERR_OUT_OF_RANGE(name, `>= ${min} && <= ${max}`, value);
	});
	/**
	* @callback validateString
	* @param {*} value
	* @param {string} name
	* @returns {asserts value is string}
	*/
	/** @type {validateString} */
	function validateString(value, name) {
		if (typeof value !== "string") throw new ERR_INVALID_ARG_TYPE(name, "string", value);
	}
	/**
	* @callback validateNumber
	* @param {*} value
	* @param {string} name
	* @param {number} [min]
	* @param {number} [max]
	* @returns {asserts value is number}
	*/
	/** @type {validateNumber} */
	function validateNumber(value, name, min = void 0, max) {
		if (typeof value !== "number") throw new ERR_INVALID_ARG_TYPE(name, "number", value);
		if (min != null && value < min || max != null && value > max || (min != null || max != null) && NumberIsNaN(value)) throw new ERR_OUT_OF_RANGE(name, `${min != null ? `>= ${min}` : ""}${min != null && max != null ? " && " : ""}${max != null ? `<= ${max}` : ""}`, value);
	}
	/**
	* @callback validateOneOf
	* @template T
	* @param {T} value
	* @param {string} name
	* @param {T[]} oneOf
	*/
	/** @type {validateOneOf} */
	const validateOneOf = hideStackFrames((value, name, oneOf) => {
		if (!ArrayPrototypeIncludes(oneOf, value)) throw new ERR_INVALID_ARG_VALUE(name, value, "must be one of: " + ArrayPrototypeJoin(ArrayPrototypeMap(oneOf, (v) => typeof v === "string" ? `'${v}'` : String(v)), ", "));
	});
	/**
	* @callback validateBoolean
	* @param {*} value
	* @param {string} name
	* @returns {asserts value is boolean}
	*/
	/** @type {validateBoolean} */
	function validateBoolean(value, name) {
		if (typeof value !== "boolean") throw new ERR_INVALID_ARG_TYPE(name, "boolean", value);
	}
	/**
	* @param {any} options
	* @param {string} key
	* @param {boolean} defaultValue
	* @returns {boolean}
	*/
	function getOwnPropertyValueOrDefault(options, key, defaultValue) {
		return options == null || !ObjectPrototypeHasOwnProperty(options, key) ? defaultValue : options[key];
	}
	/**
	* @callback validateObject
	* @param {*} value
	* @param {string} name
	* @param {{
	*   allowArray?: boolean,
	*   allowFunction?: boolean,
	*   nullable?: boolean
	* }} [options]
	*/
	/** @type {validateObject} */
	const validateObject = hideStackFrames((value, name, options = null) => {
		const allowArray = getOwnPropertyValueOrDefault(options, "allowArray", false);
		const allowFunction = getOwnPropertyValueOrDefault(options, "allowFunction", false);
		if (!getOwnPropertyValueOrDefault(options, "nullable", false) && value === null || !allowArray && ArrayIsArray(value) || typeof value !== "object" && (!allowFunction || typeof value !== "function")) throw new ERR_INVALID_ARG_TYPE(name, "Object", value);
	});
	/**
	* @callback validateDictionary - We are using the Web IDL Standard definition
	*                                of "dictionary" here, which means any value
	*                                whose Type is either Undefined, Null, or
	*                                Object (which includes functions).
	* @param {*} value
	* @param {string} name
	* @see https://webidl.spec.whatwg.org/#es-dictionary
	* @see https://tc39.es/ecma262/#table-typeof-operator-results
	*/
	/** @type {validateDictionary} */
	const validateDictionary = hideStackFrames((value, name) => {
		if (value != null && typeof value !== "object" && typeof value !== "function") throw new ERR_INVALID_ARG_TYPE(name, "a dictionary", value);
	});
	/**
	* @callback validateArray
	* @param {*} value
	* @param {string} name
	* @param {number} [minLength]
	* @returns {asserts value is any[]}
	*/
	/** @type {validateArray} */
	const validateArray = hideStackFrames((value, name, minLength = 0) => {
		if (!ArrayIsArray(value)) throw new ERR_INVALID_ARG_TYPE(name, "Array", value);
		if (value.length < minLength) throw new ERR_INVALID_ARG_VALUE(name, value, `must be longer than ${minLength}`);
	});
	/**
	* @callback validateStringArray
	* @param {*} value
	* @param {string} name
	* @returns {asserts value is string[]}
	*/
	/** @type {validateStringArray} */
	function validateStringArray(value, name) {
		validateArray(value, name);
		for (let i = 0; i < value.length; i++) validateString(value[i], `${name}[${i}]`);
	}
	/**
	* @callback validateBooleanArray
	* @param {*} value
	* @param {string} name
	* @returns {asserts value is boolean[]}
	*/
	/** @type {validateBooleanArray} */
	function validateBooleanArray(value, name) {
		validateArray(value, name);
		for (let i = 0; i < value.length; i++) validateBoolean(value[i], `${name}[${i}]`);
	}
	/**
	* @callback validateAbortSignalArray
	* @param {*} value
	* @param {string} name
	* @returns {asserts value is AbortSignal[]}
	*/
	/** @type {validateAbortSignalArray} */
	function validateAbortSignalArray(value, name) {
		validateArray(value, name);
		for (let i = 0; i < value.length; i++) {
			const signal = value[i];
			const indexedName = `${name}[${i}]`;
			if (signal == null) throw new ERR_INVALID_ARG_TYPE(indexedName, "AbortSignal", signal);
			validateAbortSignal(signal, indexedName);
		}
	}
	/**
	* @param {*} signal
	* @param {string} [name='signal']
	* @returns {asserts signal is keyof signals}
	*/
	function validateSignalName(signal, name = "signal") {
		validateString(signal, name);
		if (signals[signal] === void 0) {
			if (signals[StringPrototypeToUpperCase(signal)] !== void 0) throw new ERR_UNKNOWN_SIGNAL(signal + " (signals must use all capital letters)");
			throw new ERR_UNKNOWN_SIGNAL(signal);
		}
	}
	/**
	* @callback validateBuffer
	* @param {*} buffer
	* @param {string} [name='buffer']
	* @returns {asserts buffer is ArrayBufferView}
	*/
	/** @type {validateBuffer} */
	const validateBuffer = hideStackFrames((buffer, name = "buffer") => {
		if (!isArrayBufferView(buffer)) throw new ERR_INVALID_ARG_TYPE(name, [
			"Buffer",
			"TypedArray",
			"DataView"
		], buffer);
	});
	/**
	* @param {string} data
	* @param {string} encoding
	*/
	function validateEncoding(data, encoding) {
		const normalizedEncoding = normalizeEncoding(encoding);
		const length = data.length;
		if (normalizedEncoding === "hex" && length % 2 !== 0) throw new ERR_INVALID_ARG_VALUE("encoding", encoding, `is invalid for data of length ${length}`);
	}
	/**
	* Check that the port number is not NaN when coerced to a number,
	* is an integer and that it falls within the legal range of port numbers.
	* @param {*} port
	* @param {string} [name='Port']
	* @param {boolean} [allowZero=true]
	* @returns {number}
	*/
	function validatePort(port, name = "Port", allowZero = true) {
		if (typeof port !== "number" && typeof port !== "string" || typeof port === "string" && StringPrototypeTrim(port).length === 0 || +port !== +port >>> 0 || port > 65535 || port === 0 && !allowZero) throw new ERR_SOCKET_BAD_PORT(name, port, allowZero);
		return port | 0;
	}
	/**
	* @callback validateAbortSignal
	* @param {*} signal
	* @param {string} name
	*/
	/** @type {validateAbortSignal} */
	const validateAbortSignal = hideStackFrames((signal, name) => {
		if (signal !== void 0 && (signal === null || typeof signal !== "object" || !("aborted" in signal))) throw new ERR_INVALID_ARG_TYPE(name, "AbortSignal", signal);
	});
	/**
	* @callback validateFunction
	* @param {*} value
	* @param {string} name
	* @returns {asserts value is Function}
	*/
	/** @type {validateFunction} */
	const validateFunction = hideStackFrames((value, name) => {
		if (typeof value !== "function") throw new ERR_INVALID_ARG_TYPE(name, "Function", value);
	});
	/**
	* @callback validatePlainFunction
	* @param {*} value
	* @param {string} name
	* @returns {asserts value is Function}
	*/
	/** @type {validatePlainFunction} */
	const validatePlainFunction = hideStackFrames((value, name) => {
		if (typeof value !== "function" || isAsyncFunction(value)) throw new ERR_INVALID_ARG_TYPE(name, "Function", value);
	});
	/**
	* @callback validateUndefined
	* @param {*} value
	* @param {string} name
	* @returns {asserts value is undefined}
	*/
	/** @type {validateUndefined} */
	const validateUndefined = hideStackFrames((value, name) => {
		if (value !== void 0) throw new ERR_INVALID_ARG_TYPE(name, "undefined", value);
	});
	/**
	* @template T
	* @param {T} value
	* @param {string} name
	* @param {T[]} union
	*/
	function validateUnion(value, name, union) {
		if (!ArrayPrototypeIncludes(union, value)) throw new ERR_INVALID_ARG_TYPE(name, `('${ArrayPrototypeJoin(union, "|")}')`, value);
	}
	const linkValueRegExp = /^(?:<[^>]*>)(?:\s*;\s*[^;"\s]+(?:=(")?[^;"\s]*\1)?)*$/;
	/**
	* @param {any} value
	* @param {string} name
	*/
	function validateLinkHeaderFormat(value, name) {
		if (typeof value === "undefined" || !RegExpPrototypeExec(linkValueRegExp, value)) throw new ERR_INVALID_ARG_VALUE(name, value, "must be an array or string of format \"</styles.css>; rel=preload; as=style\"");
	}
	/**
	* @param {any} hints
	* @return {string}
	*/
	function validateLinkHeaderValue(hints) {
		if (typeof hints === "string") {
			validateLinkHeaderFormat(hints, "hints");
			return hints;
		} else if (ArrayIsArray(hints)) {
			const hintsLength = hints.length;
			let result = "";
			if (hintsLength === 0) return result;
			for (let i = 0; i < hintsLength; i++) {
				const link = hints[i];
				validateLinkHeaderFormat(link, "hints");
				result += link;
				if (i !== hintsLength - 1) result += ", ";
			}
			return result;
		}
		throw new ERR_INVALID_ARG_VALUE("hints", hints, "must be an array or string of format \"</styles.css>; rel=preload; as=style\"");
	}
	module.exports = {
		isInt32,
		isUint32,
		parseFileMode,
		validateArray,
		validateStringArray,
		validateBooleanArray,
		validateAbortSignalArray,
		validateBoolean,
		validateBuffer,
		validateDictionary,
		validateEncoding,
		validateFunction,
		validateInt32,
		validateInteger,
		validateNumber,
		validateObject,
		validateOneOf,
		validatePlainFunction,
		validatePort,
		validateSignalName,
		validateString,
		validateUint32,
		validateUndefined,
		validateUnion,
		validateAbortSignal,
		validateLinkHeaderValue
	};
}));
//#endregion
//#region ../../../node_modules/.pnpm/process@0.11.10/node_modules/process/browser.js
var require_browser$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var process = module.exports = {};
	var cachedSetTimeout;
	var cachedClearTimeout;
	function defaultSetTimout() {
		throw new Error("setTimeout has not been defined");
	}
	function defaultClearTimeout() {
		throw new Error("clearTimeout has not been defined");
	}
	(function() {
		try {
			if (typeof setTimeout === "function") cachedSetTimeout = setTimeout;
			else cachedSetTimeout = defaultSetTimout;
		} catch (e) {
			cachedSetTimeout = defaultSetTimout;
		}
		try {
			if (typeof clearTimeout === "function") cachedClearTimeout = clearTimeout;
			else cachedClearTimeout = defaultClearTimeout;
		} catch (e) {
			cachedClearTimeout = defaultClearTimeout;
		}
	})();
	function runTimeout(fun) {
		if (cachedSetTimeout === setTimeout) return setTimeout(fun, 0);
		if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
			cachedSetTimeout = setTimeout;
			return setTimeout(fun, 0);
		}
		try {
			return cachedSetTimeout(fun, 0);
		} catch (e) {
			try {
				return cachedSetTimeout.call(null, fun, 0);
			} catch (e) {
				return cachedSetTimeout.call(this, fun, 0);
			}
		}
	}
	function runClearTimeout(marker) {
		if (cachedClearTimeout === clearTimeout) return clearTimeout(marker);
		if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
			cachedClearTimeout = clearTimeout;
			return clearTimeout(marker);
		}
		try {
			return cachedClearTimeout(marker);
		} catch (e) {
			try {
				return cachedClearTimeout.call(null, marker);
			} catch (e) {
				return cachedClearTimeout.call(this, marker);
			}
		}
	}
	var queue = [];
	var draining = false;
	var currentQueue;
	var queueIndex = -1;
	function cleanUpNextTick() {
		if (!draining || !currentQueue) return;
		draining = false;
		if (currentQueue.length) queue = currentQueue.concat(queue);
		else queueIndex = -1;
		if (queue.length) drainQueue();
	}
	function drainQueue() {
		if (draining) return;
		var timeout = runTimeout(cleanUpNextTick);
		draining = true;
		var len = queue.length;
		while (len) {
			currentQueue = queue;
			queue = [];
			while (++queueIndex < len) if (currentQueue) currentQueue[queueIndex].run();
			queueIndex = -1;
			len = queue.length;
		}
		currentQueue = null;
		draining = false;
		runClearTimeout(timeout);
	}
	process.nextTick = function(fun) {
		var args = new Array(arguments.length - 1);
		if (arguments.length > 1) for (var i = 1; i < arguments.length; i++) args[i - 1] = arguments[i];
		queue.push(new Item(fun, args));
		if (queue.length === 1 && !draining) runTimeout(drainQueue);
	};
	function Item(fun, array) {
		this.fun = fun;
		this.array = array;
	}
	Item.prototype.run = function() {
		this.fun.apply(null, this.array);
	};
	process.title = "browser";
	process.browser = true;
	process.env = {};
	process.argv = [];
	process.version = "";
	process.versions = {};
	function noop() {}
	process.on = noop;
	process.addListener = noop;
	process.once = noop;
	process.off = noop;
	process.removeListener = noop;
	process.removeAllListeners = noop;
	process.emit = noop;
	process.prependListener = noop;
	process.prependOnceListener = noop;
	process.listeners = function(name) {
		return [];
	};
	process.binding = function(name) {
		throw new Error("process.binding is not supported");
	};
	process.cwd = function() {
		return "/";
	};
	process.chdir = function(dir) {
		throw new Error("process.chdir is not supported");
	};
	process.umask = function() {
		return 0;
	};
}));
//#endregion
//#region ../../../node_modules/.pnpm/readable-stream@4.7.0/node_modules/readable-stream/lib/internal/streams/utils.js
var require_utils$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const { SymbolAsyncIterator, SymbolIterator, SymbolFor } = require_primordials();
	const kIsDestroyed = SymbolFor("nodejs.stream.destroyed");
	const kIsErrored = SymbolFor("nodejs.stream.errored");
	const kIsReadable = SymbolFor("nodejs.stream.readable");
	const kIsWritable = SymbolFor("nodejs.stream.writable");
	const kIsDisturbed = SymbolFor("nodejs.stream.disturbed");
	const kIsClosedPromise = SymbolFor("nodejs.webstream.isClosedPromise");
	const kControllerErrorFunction = SymbolFor("nodejs.webstream.controllerErrorFunction");
	function isReadableNodeStream(obj, strict = false) {
		var _obj$_readableState;
		return !!(obj && typeof obj.pipe === "function" && typeof obj.on === "function" && (!strict || typeof obj.pause === "function" && typeof obj.resume === "function") && (!obj._writableState || ((_obj$_readableState = obj._readableState) === null || _obj$_readableState === void 0 ? void 0 : _obj$_readableState.readable) !== false) && (!obj._writableState || obj._readableState));
	}
	function isWritableNodeStream(obj) {
		var _obj$_writableState;
		return !!(obj && typeof obj.write === "function" && typeof obj.on === "function" && (!obj._readableState || ((_obj$_writableState = obj._writableState) === null || _obj$_writableState === void 0 ? void 0 : _obj$_writableState.writable) !== false));
	}
	function isDuplexNodeStream(obj) {
		return !!(obj && typeof obj.pipe === "function" && obj._readableState && typeof obj.on === "function" && typeof obj.write === "function");
	}
	function isNodeStream(obj) {
		return obj && (obj._readableState || obj._writableState || typeof obj.write === "function" && typeof obj.on === "function" || typeof obj.pipe === "function" && typeof obj.on === "function");
	}
	function isReadableStream(obj) {
		return !!(obj && !isNodeStream(obj) && typeof obj.pipeThrough === "function" && typeof obj.getReader === "function" && typeof obj.cancel === "function");
	}
	function isWritableStream(obj) {
		return !!(obj && !isNodeStream(obj) && typeof obj.getWriter === "function" && typeof obj.abort === "function");
	}
	function isTransformStream(obj) {
		return !!(obj && !isNodeStream(obj) && typeof obj.readable === "object" && typeof obj.writable === "object");
	}
	function isWebStream(obj) {
		return isReadableStream(obj) || isWritableStream(obj) || isTransformStream(obj);
	}
	function isIterable(obj, isAsync) {
		if (obj == null) return false;
		if (isAsync === true) return typeof obj[SymbolAsyncIterator] === "function";
		if (isAsync === false) return typeof obj[SymbolIterator] === "function";
		return typeof obj[SymbolAsyncIterator] === "function" || typeof obj[SymbolIterator] === "function";
	}
	function isDestroyed(stream) {
		if (!isNodeStream(stream)) return null;
		const wState = stream._writableState;
		const rState = stream._readableState;
		const state = wState || rState;
		return !!(stream.destroyed || stream[kIsDestroyed] || state !== null && state !== void 0 && state.destroyed);
	}
	function isWritableEnded(stream) {
		if (!isWritableNodeStream(stream)) return null;
		if (stream.writableEnded === true) return true;
		const wState = stream._writableState;
		if (wState !== null && wState !== void 0 && wState.errored) return false;
		if (typeof (wState === null || wState === void 0 ? void 0 : wState.ended) !== "boolean") return null;
		return wState.ended;
	}
	function isWritableFinished(stream, strict) {
		if (!isWritableNodeStream(stream)) return null;
		if (stream.writableFinished === true) return true;
		const wState = stream._writableState;
		if (wState !== null && wState !== void 0 && wState.errored) return false;
		if (typeof (wState === null || wState === void 0 ? void 0 : wState.finished) !== "boolean") return null;
		return !!(wState.finished || strict === false && wState.ended === true && wState.length === 0);
	}
	function isReadableEnded(stream) {
		if (!isReadableNodeStream(stream)) return null;
		if (stream.readableEnded === true) return true;
		const rState = stream._readableState;
		if (!rState || rState.errored) return false;
		if (typeof (rState === null || rState === void 0 ? void 0 : rState.ended) !== "boolean") return null;
		return rState.ended;
	}
	function isReadableFinished(stream, strict) {
		if (!isReadableNodeStream(stream)) return null;
		const rState = stream._readableState;
		if (rState !== null && rState !== void 0 && rState.errored) return false;
		if (typeof (rState === null || rState === void 0 ? void 0 : rState.endEmitted) !== "boolean") return null;
		return !!(rState.endEmitted || strict === false && rState.ended === true && rState.length === 0);
	}
	function isReadable(stream) {
		if (stream && stream[kIsReadable] != null) return stream[kIsReadable];
		if (typeof (stream === null || stream === void 0 ? void 0 : stream.readable) !== "boolean") return null;
		if (isDestroyed(stream)) return false;
		return isReadableNodeStream(stream) && stream.readable && !isReadableFinished(stream);
	}
	function isWritable(stream) {
		if (stream && stream[kIsWritable] != null) return stream[kIsWritable];
		if (typeof (stream === null || stream === void 0 ? void 0 : stream.writable) !== "boolean") return null;
		if (isDestroyed(stream)) return false;
		return isWritableNodeStream(stream) && stream.writable && !isWritableEnded(stream);
	}
	function isFinished(stream, opts) {
		if (!isNodeStream(stream)) return null;
		if (isDestroyed(stream)) return true;
		if ((opts === null || opts === void 0 ? void 0 : opts.readable) !== false && isReadable(stream)) return false;
		if ((opts === null || opts === void 0 ? void 0 : opts.writable) !== false && isWritable(stream)) return false;
		return true;
	}
	function isWritableErrored(stream) {
		var _stream$_writableStat, _stream$_writableStat2;
		if (!isNodeStream(stream)) return null;
		if (stream.writableErrored) return stream.writableErrored;
		return (_stream$_writableStat = (_stream$_writableStat2 = stream._writableState) === null || _stream$_writableStat2 === void 0 ? void 0 : _stream$_writableStat2.errored) !== null && _stream$_writableStat !== void 0 ? _stream$_writableStat : null;
	}
	function isReadableErrored(stream) {
		var _stream$_readableStat, _stream$_readableStat2;
		if (!isNodeStream(stream)) return null;
		if (stream.readableErrored) return stream.readableErrored;
		return (_stream$_readableStat = (_stream$_readableStat2 = stream._readableState) === null || _stream$_readableStat2 === void 0 ? void 0 : _stream$_readableStat2.errored) !== null && _stream$_readableStat !== void 0 ? _stream$_readableStat : null;
	}
	function isClosed(stream) {
		if (!isNodeStream(stream)) return null;
		if (typeof stream.closed === "boolean") return stream.closed;
		const wState = stream._writableState;
		const rState = stream._readableState;
		if (typeof (wState === null || wState === void 0 ? void 0 : wState.closed) === "boolean" || typeof (rState === null || rState === void 0 ? void 0 : rState.closed) === "boolean") return (wState === null || wState === void 0 ? void 0 : wState.closed) || (rState === null || rState === void 0 ? void 0 : rState.closed);
		if (typeof stream._closed === "boolean" && isOutgoingMessage(stream)) return stream._closed;
		return null;
	}
	function isOutgoingMessage(stream) {
		return typeof stream._closed === "boolean" && typeof stream._defaultKeepAlive === "boolean" && typeof stream._removedConnection === "boolean" && typeof stream._removedContLen === "boolean";
	}
	function isServerResponse(stream) {
		return typeof stream._sent100 === "boolean" && isOutgoingMessage(stream);
	}
	function isServerRequest(stream) {
		var _stream$req;
		return typeof stream._consuming === "boolean" && typeof stream._dumped === "boolean" && ((_stream$req = stream.req) === null || _stream$req === void 0 ? void 0 : _stream$req.upgradeOrConnect) === void 0;
	}
	function willEmitClose(stream) {
		if (!isNodeStream(stream)) return null;
		const wState = stream._writableState;
		const rState = stream._readableState;
		const state = wState || rState;
		return !state && isServerResponse(stream) || !!(state && state.autoDestroy && state.emitClose && state.closed === false);
	}
	function isDisturbed(stream) {
		var _stream$kIsDisturbed;
		return !!(stream && ((_stream$kIsDisturbed = stream[kIsDisturbed]) !== null && _stream$kIsDisturbed !== void 0 ? _stream$kIsDisturbed : stream.readableDidRead || stream.readableAborted));
	}
	function isErrored(stream) {
		var _ref, _ref2, _ref3, _ref4, _ref5, _stream$kIsErrored, _stream$_readableStat3, _stream$_writableStat3, _stream$_readableStat4, _stream$_writableStat4;
		return !!(stream && ((_ref = (_ref2 = (_ref3 = (_ref4 = (_ref5 = (_stream$kIsErrored = stream[kIsErrored]) !== null && _stream$kIsErrored !== void 0 ? _stream$kIsErrored : stream.readableErrored) !== null && _ref5 !== void 0 ? _ref5 : stream.writableErrored) !== null && _ref4 !== void 0 ? _ref4 : (_stream$_readableStat3 = stream._readableState) === null || _stream$_readableStat3 === void 0 ? void 0 : _stream$_readableStat3.errorEmitted) !== null && _ref3 !== void 0 ? _ref3 : (_stream$_writableStat3 = stream._writableState) === null || _stream$_writableStat3 === void 0 ? void 0 : _stream$_writableStat3.errorEmitted) !== null && _ref2 !== void 0 ? _ref2 : (_stream$_readableStat4 = stream._readableState) === null || _stream$_readableStat4 === void 0 ? void 0 : _stream$_readableStat4.errored) !== null && _ref !== void 0 ? _ref : (_stream$_writableStat4 = stream._writableState) === null || _stream$_writableStat4 === void 0 ? void 0 : _stream$_writableStat4.errored));
	}
	module.exports = {
		isDestroyed,
		kIsDestroyed,
		isDisturbed,
		kIsDisturbed,
		isErrored,
		kIsErrored,
		isReadable,
		kIsReadable,
		kIsClosedPromise,
		kControllerErrorFunction,
		kIsWritable,
		isClosed,
		isDuplexNodeStream,
		isFinished,
		isIterable,
		isReadableNodeStream,
		isReadableStream,
		isReadableEnded,
		isReadableFinished,
		isReadableErrored,
		isNodeStream,
		isWebStream,
		isWritable,
		isWritableNodeStream,
		isWritableStream,
		isWritableEnded,
		isWritableFinished,
		isWritableErrored,
		isServerRequest,
		isServerResponse,
		willEmitClose,
		isTransformStream
	};
}));
//#endregion
//#region ../../../node_modules/.pnpm/readable-stream@4.7.0/node_modules/readable-stream/lib/internal/streams/end-of-stream.js
var require_end_of_stream = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const process = require_browser$1();
	const { AbortError, codes } = require_errors();
	const { ERR_INVALID_ARG_TYPE, ERR_STREAM_PREMATURE_CLOSE } = codes;
	const { kEmptyObject, once } = require_util();
	const { validateAbortSignal, validateFunction, validateObject, validateBoolean } = require_validators();
	const { Promise, PromisePrototypeThen, SymbolDispose } = require_primordials();
	const { isClosed, isReadable, isReadableNodeStream, isReadableStream, isReadableFinished, isReadableErrored, isWritable, isWritableNodeStream, isWritableStream, isWritableFinished, isWritableErrored, isNodeStream, willEmitClose: _willEmitClose, kIsClosedPromise } = require_utils$1();
	let addAbortListener;
	function isRequest(stream) {
		return stream.setHeader && typeof stream.abort === "function";
	}
	const nop = () => {};
	function eos(stream, options, callback) {
		var _options$readable, _options$writable;
		if (arguments.length === 2) {
			callback = options;
			options = kEmptyObject;
		} else if (options == null) options = kEmptyObject;
		else validateObject(options, "options");
		validateFunction(callback, "callback");
		validateAbortSignal(options.signal, "options.signal");
		callback = once(callback);
		if (isReadableStream(stream) || isWritableStream(stream)) return eosWeb(stream, options, callback);
		if (!isNodeStream(stream)) throw new ERR_INVALID_ARG_TYPE("stream", [
			"ReadableStream",
			"WritableStream",
			"Stream"
		], stream);
		const readable = (_options$readable = options.readable) !== null && _options$readable !== void 0 ? _options$readable : isReadableNodeStream(stream);
		const writable = (_options$writable = options.writable) !== null && _options$writable !== void 0 ? _options$writable : isWritableNodeStream(stream);
		const wState = stream._writableState;
		const rState = stream._readableState;
		const onlegacyfinish = () => {
			if (!stream.writable) onfinish();
		};
		let willEmitClose = _willEmitClose(stream) && isReadableNodeStream(stream) === readable && isWritableNodeStream(stream) === writable;
		let writableFinished = isWritableFinished(stream, false);
		const onfinish = () => {
			writableFinished = true;
			if (stream.destroyed) willEmitClose = false;
			if (willEmitClose && (!stream.readable || readable)) return;
			if (!readable || readableFinished) callback.call(stream);
		};
		let readableFinished = isReadableFinished(stream, false);
		const onend = () => {
			readableFinished = true;
			if (stream.destroyed) willEmitClose = false;
			if (willEmitClose && (!stream.writable || writable)) return;
			if (!writable || writableFinished) callback.call(stream);
		};
		const onerror = (err) => {
			callback.call(stream, err);
		};
		let closed = isClosed(stream);
		const onclose = () => {
			closed = true;
			const errored = isWritableErrored(stream) || isReadableErrored(stream);
			if (errored && typeof errored !== "boolean") return callback.call(stream, errored);
			if (readable && !readableFinished && isReadableNodeStream(stream, true)) {
				if (!isReadableFinished(stream, false)) return callback.call(stream, new ERR_STREAM_PREMATURE_CLOSE());
			}
			if (writable && !writableFinished) {
				if (!isWritableFinished(stream, false)) return callback.call(stream, new ERR_STREAM_PREMATURE_CLOSE());
			}
			callback.call(stream);
		};
		const onclosed = () => {
			closed = true;
			const errored = isWritableErrored(stream) || isReadableErrored(stream);
			if (errored && typeof errored !== "boolean") return callback.call(stream, errored);
			callback.call(stream);
		};
		const onrequest = () => {
			stream.req.on("finish", onfinish);
		};
		if (isRequest(stream)) {
			stream.on("complete", onfinish);
			if (!willEmitClose) stream.on("abort", onclose);
			if (stream.req) onrequest();
			else stream.on("request", onrequest);
		} else if (writable && !wState) {
			stream.on("end", onlegacyfinish);
			stream.on("close", onlegacyfinish);
		}
		if (!willEmitClose && typeof stream.aborted === "boolean") stream.on("aborted", onclose);
		stream.on("end", onend);
		stream.on("finish", onfinish);
		if (options.error !== false) stream.on("error", onerror);
		stream.on("close", onclose);
		if (closed) process.nextTick(onclose);
		else if (wState !== null && wState !== void 0 && wState.errorEmitted || rState !== null && rState !== void 0 && rState.errorEmitted) {
			if (!willEmitClose) process.nextTick(onclosed);
		} else if (!readable && (!willEmitClose || isReadable(stream)) && (writableFinished || isWritable(stream) === false)) process.nextTick(onclosed);
		else if (!writable && (!willEmitClose || isWritable(stream)) && (readableFinished || isReadable(stream) === false)) process.nextTick(onclosed);
		else if (rState && stream.req && stream.aborted) process.nextTick(onclosed);
		const cleanup = () => {
			callback = nop;
			stream.removeListener("aborted", onclose);
			stream.removeListener("complete", onfinish);
			stream.removeListener("abort", onclose);
			stream.removeListener("request", onrequest);
			if (stream.req) stream.req.removeListener("finish", onfinish);
			stream.removeListener("end", onlegacyfinish);
			stream.removeListener("close", onlegacyfinish);
			stream.removeListener("finish", onfinish);
			stream.removeListener("end", onend);
			stream.removeListener("error", onerror);
			stream.removeListener("close", onclose);
		};
		if (options.signal && !closed) {
			const abort = () => {
				const endCallback = callback;
				cleanup();
				endCallback.call(stream, new AbortError(void 0, { cause: options.signal.reason }));
			};
			if (options.signal.aborted) process.nextTick(abort);
			else {
				addAbortListener = addAbortListener || require_util().addAbortListener;
				const disposable = addAbortListener(options.signal, abort);
				const originalCallback = callback;
				callback = once((...args) => {
					disposable[SymbolDispose]();
					originalCallback.apply(stream, args);
				});
			}
		}
		return cleanup;
	}
	function eosWeb(stream, options, callback) {
		let isAborted = false;
		let abort = nop;
		if (options.signal) {
			abort = () => {
				isAborted = true;
				callback.call(stream, new AbortError(void 0, { cause: options.signal.reason }));
			};
			if (options.signal.aborted) process.nextTick(abort);
			else {
				addAbortListener = addAbortListener || require_util().addAbortListener;
				const disposable = addAbortListener(options.signal, abort);
				const originalCallback = callback;
				callback = once((...args) => {
					disposable[SymbolDispose]();
					originalCallback.apply(stream, args);
				});
			}
		}
		const resolverFn = (...args) => {
			if (!isAborted) process.nextTick(() => callback.apply(stream, args));
		};
		PromisePrototypeThen(stream[kIsClosedPromise].promise, resolverFn, resolverFn);
		return nop;
	}
	function finished(stream, opts) {
		var _opts;
		let autoCleanup = false;
		if (opts === null) opts = kEmptyObject;
		if ((_opts = opts) !== null && _opts !== void 0 && _opts.cleanup) {
			validateBoolean(opts.cleanup, "cleanup");
			autoCleanup = opts.cleanup;
		}
		return new Promise((resolve, reject) => {
			const cleanup = eos(stream, opts, (err) => {
				if (autoCleanup) cleanup();
				if (err) reject(err);
				else resolve();
			});
		});
	}
	module.exports = eos;
	module.exports.finished = finished;
}));
//#endregion
//#region ../../../node_modules/.pnpm/readable-stream@4.7.0/node_modules/readable-stream/lib/internal/streams/destroy.js
var require_destroy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const process = require_browser$1();
	const { aggregateTwoErrors, codes: { ERR_MULTIPLE_CALLBACK }, AbortError } = require_errors();
	const { Symbol } = require_primordials();
	const { kIsDestroyed, isDestroyed, isFinished, isServerRequest } = require_utils$1();
	const kDestroy = Symbol("kDestroy");
	const kConstruct = Symbol("kConstruct");
	function checkError(err, w, r) {
		if (err) {
			err.stack;
			if (w && !w.errored) w.errored = err;
			if (r && !r.errored) r.errored = err;
		}
	}
	function destroy(err, cb) {
		const r = this._readableState;
		const w = this._writableState;
		const s = w || r;
		if (w !== null && w !== void 0 && w.destroyed || r !== null && r !== void 0 && r.destroyed) {
			if (typeof cb === "function") cb();
			return this;
		}
		checkError(err, w, r);
		if (w) w.destroyed = true;
		if (r) r.destroyed = true;
		if (!s.constructed) this.once(kDestroy, function(er) {
			_destroy(this, aggregateTwoErrors(er, err), cb);
		});
		else _destroy(this, err, cb);
		return this;
	}
	function _destroy(self, err, cb) {
		let called = false;
		function onDestroy(err) {
			if (called) return;
			called = true;
			const r = self._readableState;
			const w = self._writableState;
			checkError(err, w, r);
			if (w) w.closed = true;
			if (r) r.closed = true;
			if (typeof cb === "function") cb(err);
			if (err) process.nextTick(emitErrorCloseNT, self, err);
			else process.nextTick(emitCloseNT, self);
		}
		try {
			self._destroy(err || null, onDestroy);
		} catch (err) {
			onDestroy(err);
		}
	}
	function emitErrorCloseNT(self, err) {
		emitErrorNT(self, err);
		emitCloseNT(self);
	}
	function emitCloseNT(self) {
		const r = self._readableState;
		const w = self._writableState;
		if (w) w.closeEmitted = true;
		if (r) r.closeEmitted = true;
		if (w !== null && w !== void 0 && w.emitClose || r !== null && r !== void 0 && r.emitClose) self.emit("close");
	}
	function emitErrorNT(self, err) {
		const r = self._readableState;
		const w = self._writableState;
		if (w !== null && w !== void 0 && w.errorEmitted || r !== null && r !== void 0 && r.errorEmitted) return;
		if (w) w.errorEmitted = true;
		if (r) r.errorEmitted = true;
		self.emit("error", err);
	}
	function undestroy() {
		const r = this._readableState;
		const w = this._writableState;
		if (r) {
			r.constructed = true;
			r.closed = false;
			r.closeEmitted = false;
			r.destroyed = false;
			r.errored = null;
			r.errorEmitted = false;
			r.reading = false;
			r.ended = r.readable === false;
			r.endEmitted = r.readable === false;
		}
		if (w) {
			w.constructed = true;
			w.destroyed = false;
			w.closed = false;
			w.closeEmitted = false;
			w.errored = null;
			w.errorEmitted = false;
			w.finalCalled = false;
			w.prefinished = false;
			w.ended = w.writable === false;
			w.ending = w.writable === false;
			w.finished = w.writable === false;
		}
	}
	function errorOrDestroy(stream, err, sync) {
		const r = stream._readableState;
		const w = stream._writableState;
		if (w !== null && w !== void 0 && w.destroyed || r !== null && r !== void 0 && r.destroyed) return this;
		if (r !== null && r !== void 0 && r.autoDestroy || w !== null && w !== void 0 && w.autoDestroy) stream.destroy(err);
		else if (err) {
			err.stack;
			if (w && !w.errored) w.errored = err;
			if (r && !r.errored) r.errored = err;
			if (sync) process.nextTick(emitErrorNT, stream, err);
			else emitErrorNT(stream, err);
		}
	}
	function construct(stream, cb) {
		if (typeof stream._construct !== "function") return;
		const r = stream._readableState;
		const w = stream._writableState;
		if (r) r.constructed = false;
		if (w) w.constructed = false;
		stream.once(kConstruct, cb);
		if (stream.listenerCount(kConstruct) > 1) return;
		process.nextTick(constructNT, stream);
	}
	function constructNT(stream) {
		let called = false;
		function onConstruct(err) {
			if (called) {
				errorOrDestroy(stream, err !== null && err !== void 0 ? err : new ERR_MULTIPLE_CALLBACK());
				return;
			}
			called = true;
			const r = stream._readableState;
			const w = stream._writableState;
			const s = w || r;
			if (r) r.constructed = true;
			if (w) w.constructed = true;
			if (s.destroyed) stream.emit(kDestroy, err);
			else if (err) errorOrDestroy(stream, err, true);
			else process.nextTick(emitConstructNT, stream);
		}
		try {
			stream._construct((err) => {
				process.nextTick(onConstruct, err);
			});
		} catch (err) {
			process.nextTick(onConstruct, err);
		}
	}
	function emitConstructNT(stream) {
		stream.emit(kConstruct);
	}
	function isRequest(stream) {
		return (stream === null || stream === void 0 ? void 0 : stream.setHeader) && typeof stream.abort === "function";
	}
	function emitCloseLegacy(stream) {
		stream.emit("close");
	}
	function emitErrorCloseLegacy(stream, err) {
		stream.emit("error", err);
		process.nextTick(emitCloseLegacy, stream);
	}
	function destroyer(stream, err) {
		if (!stream || isDestroyed(stream)) return;
		if (!err && !isFinished(stream)) err = new AbortError();
		if (isServerRequest(stream)) {
			stream.socket = null;
			stream.destroy(err);
		} else if (isRequest(stream)) stream.abort();
		else if (isRequest(stream.req)) stream.req.abort();
		else if (typeof stream.destroy === "function") stream.destroy(err);
		else if (typeof stream.close === "function") stream.close();
		else if (err) process.nextTick(emitErrorCloseLegacy, stream, err);
		else process.nextTick(emitCloseLegacy, stream);
		if (!stream.destroyed) stream[kIsDestroyed] = true;
	}
	module.exports = {
		construct,
		destroyer,
		destroy,
		undestroy,
		errorOrDestroy
	};
}));
//#endregion
//#region ../../../node_modules/.pnpm/readable-stream@4.7.0/node_modules/readable-stream/lib/internal/streams/legacy.js
var require_legacy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const { ArrayIsArray, ObjectSetPrototypeOf } = require_primordials();
	const { EventEmitter: EE } = require_events();
	function Stream(opts) {
		EE.call(this, opts);
	}
	ObjectSetPrototypeOf(Stream.prototype, EE.prototype);
	ObjectSetPrototypeOf(Stream, EE);
	Stream.prototype.pipe = function(dest, options) {
		const source = this;
		function ondata(chunk) {
			if (dest.writable && dest.write(chunk) === false && source.pause) source.pause();
		}
		source.on("data", ondata);
		function ondrain() {
			if (source.readable && source.resume) source.resume();
		}
		dest.on("drain", ondrain);
		if (!dest._isStdio && (!options || options.end !== false)) {
			source.on("end", onend);
			source.on("close", onclose);
		}
		let didOnEnd = false;
		function onend() {
			if (didOnEnd) return;
			didOnEnd = true;
			dest.end();
		}
		function onclose() {
			if (didOnEnd) return;
			didOnEnd = true;
			if (typeof dest.destroy === "function") dest.destroy();
		}
		function onerror(er) {
			cleanup();
			if (EE.listenerCount(this, "error") === 0) this.emit("error", er);
		}
		prependListener(source, "error", onerror);
		prependListener(dest, "error", onerror);
		function cleanup() {
			source.removeListener("data", ondata);
			dest.removeListener("drain", ondrain);
			source.removeListener("end", onend);
			source.removeListener("close", onclose);
			source.removeListener("error", onerror);
			dest.removeListener("error", onerror);
			source.removeListener("end", cleanup);
			source.removeListener("close", cleanup);
			dest.removeListener("close", cleanup);
		}
		source.on("end", cleanup);
		source.on("close", cleanup);
		dest.on("close", cleanup);
		dest.emit("pipe", source);
		return dest;
	};
	function prependListener(emitter, event, fn) {
		if (typeof emitter.prependListener === "function") return emitter.prependListener(event, fn);
		if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);
		else if (ArrayIsArray(emitter._events[event])) emitter._events[event].unshift(fn);
		else emitter._events[event] = [fn, emitter._events[event]];
	}
	module.exports = {
		Stream,
		prependListener
	};
}));
//#endregion
//#region ../../../node_modules/.pnpm/readable-stream@4.7.0/node_modules/readable-stream/lib/internal/streams/add-abort-signal.js
var require_add_abort_signal = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const { SymbolDispose } = require_primordials();
	const { AbortError, codes } = require_errors();
	const { isNodeStream, isWebStream, kControllerErrorFunction } = require_utils$1();
	const eos = require_end_of_stream();
	const { ERR_INVALID_ARG_TYPE } = codes;
	let addAbortListener;
	const validateAbortSignal = (signal, name) => {
		if (typeof signal !== "object" || !("aborted" in signal)) throw new ERR_INVALID_ARG_TYPE(name, "AbortSignal", signal);
	};
	module.exports.addAbortSignal = function addAbortSignal(signal, stream) {
		validateAbortSignal(signal, "signal");
		if (!isNodeStream(stream) && !isWebStream(stream)) throw new ERR_INVALID_ARG_TYPE("stream", [
			"ReadableStream",
			"WritableStream",
			"Stream"
		], stream);
		return module.exports.addAbortSignalNoValidate(signal, stream);
	};
	module.exports.addAbortSignalNoValidate = function(signal, stream) {
		if (typeof signal !== "object" || !("aborted" in signal)) return stream;
		const onAbort = isNodeStream(stream) ? () => {
			stream.destroy(new AbortError(void 0, { cause: signal.reason }));
		} : () => {
			stream[kControllerErrorFunction](new AbortError(void 0, { cause: signal.reason }));
		};
		if (signal.aborted) onAbort();
		else {
			addAbortListener = addAbortListener || require_util().addAbortListener;
			eos(stream, addAbortListener(signal, onAbort)[SymbolDispose]);
		}
		return stream;
	};
}));
//#endregion
//#region ../../../node_modules/.pnpm/readable-stream@4.7.0/node_modules/readable-stream/lib/internal/streams/buffer_list.js
var require_buffer_list = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const { StringPrototypeSlice, SymbolIterator, TypedArrayPrototypeSet, Uint8Array } = require_primordials();
	const { Buffer } = require_buffer();
	const { inspect } = require_util();
	module.exports = class BufferList {
		constructor() {
			this.head = null;
			this.tail = null;
			this.length = 0;
		}
		push(v) {
			const entry = {
				data: v,
				next: null
			};
			if (this.length > 0) this.tail.next = entry;
			else this.head = entry;
			this.tail = entry;
			++this.length;
		}
		unshift(v) {
			const entry = {
				data: v,
				next: this.head
			};
			if (this.length === 0) this.tail = entry;
			this.head = entry;
			++this.length;
		}
		shift() {
			if (this.length === 0) return;
			const ret = this.head.data;
			if (this.length === 1) this.head = this.tail = null;
			else this.head = this.head.next;
			--this.length;
			return ret;
		}
		clear() {
			this.head = this.tail = null;
			this.length = 0;
		}
		join(s) {
			if (this.length === 0) return "";
			let p = this.head;
			let ret = "" + p.data;
			while ((p = p.next) !== null) ret += s + p.data;
			return ret;
		}
		concat(n) {
			if (this.length === 0) return Buffer.alloc(0);
			const ret = Buffer.allocUnsafe(n >>> 0);
			let p = this.head;
			let i = 0;
			while (p) {
				TypedArrayPrototypeSet(ret, p.data, i);
				i += p.data.length;
				p = p.next;
			}
			return ret;
		}
		consume(n, hasStrings) {
			const data = this.head.data;
			if (n < data.length) {
				const slice = data.slice(0, n);
				this.head.data = data.slice(n);
				return slice;
			}
			if (n === data.length) return this.shift();
			return hasStrings ? this._getString(n) : this._getBuffer(n);
		}
		first() {
			return this.head.data;
		}
		*[SymbolIterator]() {
			for (let p = this.head; p; p = p.next) yield p.data;
		}
		_getString(n) {
			let ret = "";
			let p = this.head;
			let c = 0;
			do {
				const str = p.data;
				if (n > str.length) {
					ret += str;
					n -= str.length;
				} else {
					if (n === str.length) {
						ret += str;
						++c;
						if (p.next) this.head = p.next;
						else this.head = this.tail = null;
					} else {
						ret += StringPrototypeSlice(str, 0, n);
						this.head = p;
						p.data = StringPrototypeSlice(str, n);
					}
					break;
				}
				++c;
			} while ((p = p.next) !== null);
			this.length -= c;
			return ret;
		}
		_getBuffer(n) {
			const ret = Buffer.allocUnsafe(n);
			const retLen = n;
			let p = this.head;
			let c = 0;
			do {
				const buf = p.data;
				if (n > buf.length) {
					TypedArrayPrototypeSet(ret, buf, retLen - n);
					n -= buf.length;
				} else {
					if (n === buf.length) {
						TypedArrayPrototypeSet(ret, buf, retLen - n);
						++c;
						if (p.next) this.head = p.next;
						else this.head = this.tail = null;
					} else {
						TypedArrayPrototypeSet(ret, new Uint8Array(buf.buffer, buf.byteOffset, n), retLen - n);
						this.head = p;
						p.data = buf.slice(n);
					}
					break;
				}
				++c;
			} while ((p = p.next) !== null);
			this.length -= c;
			return ret;
		}
		[Symbol.for("nodejs.util.inspect.custom")](_, options) {
			return inspect(this, {
				...options,
				depth: 0,
				customInspect: false
			});
		}
	};
}));
//#endregion
//#region ../../../node_modules/.pnpm/readable-stream@4.7.0/node_modules/readable-stream/lib/internal/streams/state.js
var require_state = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const { MathFloor, NumberIsInteger } = require_primordials();
	const { validateInteger } = require_validators();
	const { ERR_INVALID_ARG_VALUE } = require_errors().codes;
	let defaultHighWaterMarkBytes = 16 * 1024;
	let defaultHighWaterMarkObjectMode = 16;
	function highWaterMarkFrom(options, isDuplex, duplexKey) {
		return options.highWaterMark != null ? options.highWaterMark : isDuplex ? options[duplexKey] : null;
	}
	function getDefaultHighWaterMark(objectMode) {
		return objectMode ? defaultHighWaterMarkObjectMode : defaultHighWaterMarkBytes;
	}
	function setDefaultHighWaterMark(objectMode, value) {
		validateInteger(value, "value", 0);
		if (objectMode) defaultHighWaterMarkObjectMode = value;
		else defaultHighWaterMarkBytes = value;
	}
	function getHighWaterMark(state, options, duplexKey, isDuplex) {
		const hwm = highWaterMarkFrom(options, isDuplex, duplexKey);
		if (hwm != null) {
			if (!NumberIsInteger(hwm) || hwm < 0) throw new ERR_INVALID_ARG_VALUE(isDuplex ? `options.${duplexKey}` : "options.highWaterMark", hwm);
			return MathFloor(hwm);
		}
		return getDefaultHighWaterMark(state.objectMode);
	}
	module.exports = {
		getHighWaterMark,
		getDefaultHighWaterMark,
		setDefaultHighWaterMark
	};
}));
//#endregion
//#region ../../../node_modules/.pnpm/safe-buffer@5.2.1/node_modules/safe-buffer/index.js
var require_safe_buffer = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
	var buffer = require_buffer();
	var Buffer = buffer.Buffer;
	function copyProps(src, dst) {
		for (var key in src) dst[key] = src[key];
	}
	if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) module.exports = buffer;
	else {
		copyProps(buffer, exports);
		exports.Buffer = SafeBuffer;
	}
	function SafeBuffer(arg, encodingOrOffset, length) {
		return Buffer(arg, encodingOrOffset, length);
	}
	SafeBuffer.prototype = Object.create(Buffer.prototype);
	copyProps(Buffer, SafeBuffer);
	SafeBuffer.from = function(arg, encodingOrOffset, length) {
		if (typeof arg === "number") throw new TypeError("Argument must not be a number");
		return Buffer(arg, encodingOrOffset, length);
	};
	SafeBuffer.alloc = function(size, fill, encoding) {
		if (typeof size !== "number") throw new TypeError("Argument must be a number");
		var buf = Buffer(size);
		if (fill !== void 0) if (typeof encoding === "string") buf.fill(fill, encoding);
		else buf.fill(fill);
		else buf.fill(0);
		return buf;
	};
	SafeBuffer.allocUnsafe = function(size) {
		if (typeof size !== "number") throw new TypeError("Argument must be a number");
		return Buffer(size);
	};
	SafeBuffer.allocUnsafeSlow = function(size) {
		if (typeof size !== "number") throw new TypeError("Argument must be a number");
		return buffer.SlowBuffer(size);
	};
}));
//#endregion
//#region ../../../node_modules/.pnpm/string_decoder@1.3.0/node_modules/string_decoder/lib/string_decoder.js
var require_string_decoder = /* @__PURE__ */ __commonJSMin(((exports) => {
	var Buffer = require_safe_buffer().Buffer;
	var isEncoding = Buffer.isEncoding || function(encoding) {
		encoding = "" + encoding;
		switch (encoding && encoding.toLowerCase()) {
			case "hex":
			case "utf8":
			case "utf-8":
			case "ascii":
			case "binary":
			case "base64":
			case "ucs2":
			case "ucs-2":
			case "utf16le":
			case "utf-16le":
			case "raw": return true;
			default: return false;
		}
	};
	function _normalizeEncoding(enc) {
		if (!enc) return "utf8";
		var retried;
		while (true) switch (enc) {
			case "utf8":
			case "utf-8": return "utf8";
			case "ucs2":
			case "ucs-2":
			case "utf16le":
			case "utf-16le": return "utf16le";
			case "latin1":
			case "binary": return "latin1";
			case "base64":
			case "ascii":
			case "hex": return enc;
			default:
				if (retried) return;
				enc = ("" + enc).toLowerCase();
				retried = true;
		}
	}
	function normalizeEncoding(enc) {
		var nenc = _normalizeEncoding(enc);
		if (typeof nenc !== "string" && (Buffer.isEncoding === isEncoding || !isEncoding(enc))) throw new Error("Unknown encoding: " + enc);
		return nenc || enc;
	}
	exports.StringDecoder = StringDecoder;
	function StringDecoder(encoding) {
		this.encoding = normalizeEncoding(encoding);
		var nb;
		switch (this.encoding) {
			case "utf16le":
				this.text = utf16Text;
				this.end = utf16End;
				nb = 4;
				break;
			case "utf8":
				this.fillLast = utf8FillLast;
				nb = 4;
				break;
			case "base64":
				this.text = base64Text;
				this.end = base64End;
				nb = 3;
				break;
			default:
				this.write = simpleWrite;
				this.end = simpleEnd;
				return;
		}
		this.lastNeed = 0;
		this.lastTotal = 0;
		this.lastChar = Buffer.allocUnsafe(nb);
	}
	StringDecoder.prototype.write = function(buf) {
		if (buf.length === 0) return "";
		var r;
		var i;
		if (this.lastNeed) {
			r = this.fillLast(buf);
			if (r === void 0) return "";
			i = this.lastNeed;
			this.lastNeed = 0;
		} else i = 0;
		if (i < buf.length) return r ? r + this.text(buf, i) : this.text(buf, i);
		return r || "";
	};
	StringDecoder.prototype.end = utf8End;
	StringDecoder.prototype.text = utf8Text;
	StringDecoder.prototype.fillLast = function(buf) {
		if (this.lastNeed <= buf.length) {
			buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
			return this.lastChar.toString(this.encoding, 0, this.lastTotal);
		}
		buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
		this.lastNeed -= buf.length;
	};
	function utf8CheckByte(byte) {
		if (byte <= 127) return 0;
		else if (byte >> 5 === 6) return 2;
		else if (byte >> 4 === 14) return 3;
		else if (byte >> 3 === 30) return 4;
		return byte >> 6 === 2 ? -1 : -2;
	}
	function utf8CheckIncomplete(self, buf, i) {
		var j = buf.length - 1;
		if (j < i) return 0;
		var nb = utf8CheckByte(buf[j]);
		if (nb >= 0) {
			if (nb > 0) self.lastNeed = nb - 1;
			return nb;
		}
		if (--j < i || nb === -2) return 0;
		nb = utf8CheckByte(buf[j]);
		if (nb >= 0) {
			if (nb > 0) self.lastNeed = nb - 2;
			return nb;
		}
		if (--j < i || nb === -2) return 0;
		nb = utf8CheckByte(buf[j]);
		if (nb >= 0) {
			if (nb > 0) if (nb === 2) nb = 0;
			else self.lastNeed = nb - 3;
			return nb;
		}
		return 0;
	}
	function utf8CheckExtraBytes(self, buf, p) {
		if ((buf[0] & 192) !== 128) {
			self.lastNeed = 0;
			return "�";
		}
		if (self.lastNeed > 1 && buf.length > 1) {
			if ((buf[1] & 192) !== 128) {
				self.lastNeed = 1;
				return "�";
			}
			if (self.lastNeed > 2 && buf.length > 2) {
				if ((buf[2] & 192) !== 128) {
					self.lastNeed = 2;
					return "�";
				}
			}
		}
	}
	function utf8FillLast(buf) {
		var p = this.lastTotal - this.lastNeed;
		var r = utf8CheckExtraBytes(this, buf, p);
		if (r !== void 0) return r;
		if (this.lastNeed <= buf.length) {
			buf.copy(this.lastChar, p, 0, this.lastNeed);
			return this.lastChar.toString(this.encoding, 0, this.lastTotal);
		}
		buf.copy(this.lastChar, p, 0, buf.length);
		this.lastNeed -= buf.length;
	}
	function utf8Text(buf, i) {
		var total = utf8CheckIncomplete(this, buf, i);
		if (!this.lastNeed) return buf.toString("utf8", i);
		this.lastTotal = total;
		var end = buf.length - (total - this.lastNeed);
		buf.copy(this.lastChar, 0, end);
		return buf.toString("utf8", i, end);
	}
	function utf8End(buf) {
		var r = buf && buf.length ? this.write(buf) : "";
		if (this.lastNeed) return r + "�";
		return r;
	}
	function utf16Text(buf, i) {
		if ((buf.length - i) % 2 === 0) {
			var r = buf.toString("utf16le", i);
			if (r) {
				var c = r.charCodeAt(r.length - 1);
				if (c >= 55296 && c <= 56319) {
					this.lastNeed = 2;
					this.lastTotal = 4;
					this.lastChar[0] = buf[buf.length - 2];
					this.lastChar[1] = buf[buf.length - 1];
					return r.slice(0, -1);
				}
			}
			return r;
		}
		this.lastNeed = 1;
		this.lastTotal = 2;
		this.lastChar[0] = buf[buf.length - 1];
		return buf.toString("utf16le", i, buf.length - 1);
	}
	function utf16End(buf) {
		var r = buf && buf.length ? this.write(buf) : "";
		if (this.lastNeed) {
			var end = this.lastTotal - this.lastNeed;
			return r + this.lastChar.toString("utf16le", 0, end);
		}
		return r;
	}
	function base64Text(buf, i) {
		var n = (buf.length - i) % 3;
		if (n === 0) return buf.toString("base64", i);
		this.lastNeed = 3 - n;
		this.lastTotal = 3;
		if (n === 1) this.lastChar[0] = buf[buf.length - 1];
		else {
			this.lastChar[0] = buf[buf.length - 2];
			this.lastChar[1] = buf[buf.length - 1];
		}
		return buf.toString("base64", i, buf.length - n);
	}
	function base64End(buf) {
		var r = buf && buf.length ? this.write(buf) : "";
		if (this.lastNeed) return r + this.lastChar.toString("base64", 0, 3 - this.lastNeed);
		return r;
	}
	function simpleWrite(buf) {
		return buf.toString(this.encoding);
	}
	function simpleEnd(buf) {
		return buf && buf.length ? this.write(buf) : "";
	}
}));
//#endregion
//#region ../../../node_modules/.pnpm/readable-stream@4.7.0/node_modules/readable-stream/lib/internal/streams/from.js
var require_from = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const process = require_browser$1();
	const { PromisePrototypeThen, SymbolAsyncIterator, SymbolIterator } = require_primordials();
	const { Buffer } = require_buffer();
	const { ERR_INVALID_ARG_TYPE, ERR_STREAM_NULL_VALUES } = require_errors().codes;
	function from(Readable, iterable, opts) {
		let iterator;
		if (typeof iterable === "string" || iterable instanceof Buffer) return new Readable({
			objectMode: true,
			...opts,
			read() {
				this.push(iterable);
				this.push(null);
			}
		});
		let isAsync;
		if (iterable && iterable[SymbolAsyncIterator]) {
			isAsync = true;
			iterator = iterable[SymbolAsyncIterator]();
		} else if (iterable && iterable[SymbolIterator]) {
			isAsync = false;
			iterator = iterable[SymbolIterator]();
		} else throw new ERR_INVALID_ARG_TYPE("iterable", ["Iterable"], iterable);
		const readable = new Readable({
			objectMode: true,
			highWaterMark: 1,
			...opts
		});
		let reading = false;
		readable._read = function() {
			if (!reading) {
				reading = true;
				next();
			}
		};
		readable._destroy = function(error, cb) {
			PromisePrototypeThen(close(error), () => process.nextTick(cb, error), (e) => process.nextTick(cb, e || error));
		};
		async function close(error) {
			const hadError = error !== void 0 && error !== null;
			const hasThrow = typeof iterator.throw === "function";
			if (hadError && hasThrow) {
				const { value, done } = await iterator.throw(error);
				await value;
				if (done) return;
			}
			if (typeof iterator.return === "function") {
				const { value } = await iterator.return();
				await value;
			}
		}
		async function next() {
			for (;;) {
				try {
					const { value, done } = isAsync ? await iterator.next() : iterator.next();
					if (done) readable.push(null);
					else {
						const res = value && typeof value.then === "function" ? await value : value;
						if (res === null) {
							reading = false;
							throw new ERR_STREAM_NULL_VALUES();
						} else if (readable.push(res)) continue;
						else reading = false;
					}
				} catch (err) {
					readable.destroy(err);
				}
				break;
			}
		}
		return readable;
	}
	module.exports = from;
}));
//#endregion
//#region ../../../node_modules/.pnpm/readable-stream@4.7.0/node_modules/readable-stream/lib/internal/streams/readable.js
var require_readable = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const process = require_browser$1();
	const { ArrayPrototypeIndexOf, NumberIsInteger, NumberIsNaN, NumberParseInt, ObjectDefineProperties, ObjectKeys, ObjectSetPrototypeOf, Promise, SafeSet, SymbolAsyncDispose, SymbolAsyncIterator, Symbol } = require_primordials();
	module.exports = Readable;
	Readable.ReadableState = ReadableState;
	const { EventEmitter: EE } = require_events();
	const { Stream, prependListener } = require_legacy();
	const { Buffer } = require_buffer();
	const { addAbortSignal } = require_add_abort_signal();
	const eos = require_end_of_stream();
	let debug = require_util().debuglog("stream", (fn) => {
		debug = fn;
	});
	const BufferList = require_buffer_list();
	const destroyImpl = require_destroy();
	const { getHighWaterMark, getDefaultHighWaterMark } = require_state();
	const { aggregateTwoErrors, codes: { ERR_INVALID_ARG_TYPE, ERR_METHOD_NOT_IMPLEMENTED, ERR_OUT_OF_RANGE, ERR_STREAM_PUSH_AFTER_EOF, ERR_STREAM_UNSHIFT_AFTER_END_EVENT }, AbortError } = require_errors();
	const { validateObject } = require_validators();
	const kPaused = Symbol("kPaused");
	const { StringDecoder } = require_string_decoder();
	const from = require_from();
	ObjectSetPrototypeOf(Readable.prototype, Stream.prototype);
	ObjectSetPrototypeOf(Readable, Stream);
	const nop = () => {};
	const { errorOrDestroy } = destroyImpl;
	const kObjectMode = 1;
	const kEnded = 2;
	const kEndEmitted = 4;
	const kReading = 8;
	const kConstructed = 16;
	const kSync = 32;
	const kNeedReadable = 64;
	const kEmittedReadable = 128;
	const kReadableListening = 256;
	const kResumeScheduled = 512;
	const kErrorEmitted = 1024;
	const kEmitClose = 2048;
	const kAutoDestroy = 4096;
	const kDestroyed = 8192;
	const kClosed = 16384;
	const kCloseEmitted = 32768;
	const kMultiAwaitDrain = 65536;
	const kReadingMore = 1 << 17;
	const kDataEmitted = 1 << 18;
	function makeBitMapDescriptor(bit) {
		return {
			enumerable: false,
			get() {
				return (this.state & bit) !== 0;
			},
			set(value) {
				if (value) this.state |= bit;
				else this.state &= ~bit;
			}
		};
	}
	ObjectDefineProperties(ReadableState.prototype, {
		objectMode: makeBitMapDescriptor(kObjectMode),
		ended: makeBitMapDescriptor(kEnded),
		endEmitted: makeBitMapDescriptor(kEndEmitted),
		reading: makeBitMapDescriptor(kReading),
		constructed: makeBitMapDescriptor(kConstructed),
		sync: makeBitMapDescriptor(kSync),
		needReadable: makeBitMapDescriptor(kNeedReadable),
		emittedReadable: makeBitMapDescriptor(kEmittedReadable),
		readableListening: makeBitMapDescriptor(kReadableListening),
		resumeScheduled: makeBitMapDescriptor(kResumeScheduled),
		errorEmitted: makeBitMapDescriptor(kErrorEmitted),
		emitClose: makeBitMapDescriptor(kEmitClose),
		autoDestroy: makeBitMapDescriptor(kAutoDestroy),
		destroyed: makeBitMapDescriptor(kDestroyed),
		closed: makeBitMapDescriptor(kClosed),
		closeEmitted: makeBitMapDescriptor(kCloseEmitted),
		multiAwaitDrain: makeBitMapDescriptor(kMultiAwaitDrain),
		readingMore: makeBitMapDescriptor(kReadingMore),
		dataEmitted: makeBitMapDescriptor(kDataEmitted)
	});
	function ReadableState(options, stream, isDuplex) {
		if (typeof isDuplex !== "boolean") isDuplex = stream instanceof require_duplex();
		this.state = 6192;
		if (options && options.objectMode) this.state |= kObjectMode;
		if (isDuplex && options && options.readableObjectMode) this.state |= kObjectMode;
		this.highWaterMark = options ? getHighWaterMark(this, options, "readableHighWaterMark", isDuplex) : getDefaultHighWaterMark(false);
		this.buffer = new BufferList();
		this.length = 0;
		this.pipes = [];
		this.flowing = null;
		this[kPaused] = null;
		if (options && options.emitClose === false) this.state &= -2049;
		if (options && options.autoDestroy === false) this.state &= -4097;
		this.errored = null;
		this.defaultEncoding = options && options.defaultEncoding || "utf8";
		this.awaitDrainWriters = null;
		this.decoder = null;
		this.encoding = null;
		if (options && options.encoding) {
			this.decoder = new StringDecoder(options.encoding);
			this.encoding = options.encoding;
		}
	}
	function Readable(options) {
		if (!(this instanceof Readable)) return new Readable(options);
		const isDuplex = this instanceof require_duplex();
		this._readableState = new ReadableState(options, this, isDuplex);
		if (options) {
			if (typeof options.read === "function") this._read = options.read;
			if (typeof options.destroy === "function") this._destroy = options.destroy;
			if (typeof options.construct === "function") this._construct = options.construct;
			if (options.signal && !isDuplex) addAbortSignal(options.signal, this);
		}
		Stream.call(this, options);
		destroyImpl.construct(this, () => {
			if (this._readableState.needReadable) maybeReadMore(this, this._readableState);
		});
	}
	Readable.prototype.destroy = destroyImpl.destroy;
	Readable.prototype._undestroy = destroyImpl.undestroy;
	Readable.prototype._destroy = function(err, cb) {
		cb(err);
	};
	Readable.prototype[EE.captureRejectionSymbol] = function(err) {
		this.destroy(err);
	};
	Readable.prototype[SymbolAsyncDispose] = function() {
		let error;
		if (!this.destroyed) {
			error = this.readableEnded ? null : new AbortError();
			this.destroy(error);
		}
		return new Promise((resolve, reject) => eos(this, (err) => err && err !== error ? reject(err) : resolve(null)));
	};
	Readable.prototype.push = function(chunk, encoding) {
		return readableAddChunk(this, chunk, encoding, false);
	};
	Readable.prototype.unshift = function(chunk, encoding) {
		return readableAddChunk(this, chunk, encoding, true);
	};
	function readableAddChunk(stream, chunk, encoding, addToFront) {
		debug("readableAddChunk", chunk);
		const state = stream._readableState;
		let err;
		if ((state.state & kObjectMode) === 0) {
			if (typeof chunk === "string") {
				encoding = encoding || state.defaultEncoding;
				if (state.encoding !== encoding) if (addToFront && state.encoding) chunk = Buffer.from(chunk, encoding).toString(state.encoding);
				else {
					chunk = Buffer.from(chunk, encoding);
					encoding = "";
				}
			} else if (chunk instanceof Buffer) encoding = "";
			else if (Stream._isUint8Array(chunk)) {
				chunk = Stream._uint8ArrayToBuffer(chunk);
				encoding = "";
			} else if (chunk != null) err = new ERR_INVALID_ARG_TYPE("chunk", [
				"string",
				"Buffer",
				"Uint8Array"
			], chunk);
		}
		if (err) errorOrDestroy(stream, err);
		else if (chunk === null) {
			state.state &= -9;
			onEofChunk(stream, state);
		} else if ((state.state & kObjectMode) !== 0 || chunk && chunk.length > 0) if (addToFront) if ((state.state & kEndEmitted) !== 0) errorOrDestroy(stream, new ERR_STREAM_UNSHIFT_AFTER_END_EVENT());
		else if (state.destroyed || state.errored) return false;
		else addChunk(stream, state, chunk, true);
		else if (state.ended) errorOrDestroy(stream, new ERR_STREAM_PUSH_AFTER_EOF());
		else if (state.destroyed || state.errored) return false;
		else {
			state.state &= -9;
			if (state.decoder && !encoding) {
				chunk = state.decoder.write(chunk);
				if (state.objectMode || chunk.length !== 0) addChunk(stream, state, chunk, false);
				else maybeReadMore(stream, state);
			} else addChunk(stream, state, chunk, false);
		}
		else if (!addToFront) {
			state.state &= -9;
			maybeReadMore(stream, state);
		}
		return !state.ended && (state.length < state.highWaterMark || state.length === 0);
	}
	function addChunk(stream, state, chunk, addToFront) {
		if (state.flowing && state.length === 0 && !state.sync && stream.listenerCount("data") > 0) {
			if ((state.state & kMultiAwaitDrain) !== 0) state.awaitDrainWriters.clear();
			else state.awaitDrainWriters = null;
			state.dataEmitted = true;
			stream.emit("data", chunk);
		} else {
			state.length += state.objectMode ? 1 : chunk.length;
			if (addToFront) state.buffer.unshift(chunk);
			else state.buffer.push(chunk);
			if ((state.state & kNeedReadable) !== 0) emitReadable(stream);
		}
		maybeReadMore(stream, state);
	}
	Readable.prototype.isPaused = function() {
		const state = this._readableState;
		return state[kPaused] === true || state.flowing === false;
	};
	Readable.prototype.setEncoding = function(enc) {
		const decoder = new StringDecoder(enc);
		this._readableState.decoder = decoder;
		this._readableState.encoding = this._readableState.decoder.encoding;
		const buffer = this._readableState.buffer;
		let content = "";
		for (const data of buffer) content += decoder.write(data);
		buffer.clear();
		if (content !== "") buffer.push(content);
		this._readableState.length = content.length;
		return this;
	};
	const MAX_HWM = 1073741824;
	function computeNewHighWaterMark(n) {
		if (n > MAX_HWM) throw new ERR_OUT_OF_RANGE("size", "<= 1GiB", n);
		else {
			n--;
			n |= n >>> 1;
			n |= n >>> 2;
			n |= n >>> 4;
			n |= n >>> 8;
			n |= n >>> 16;
			n++;
		}
		return n;
	}
	function howMuchToRead(n, state) {
		if (n <= 0 || state.length === 0 && state.ended) return 0;
		if ((state.state & kObjectMode) !== 0) return 1;
		if (NumberIsNaN(n)) {
			if (state.flowing && state.length) return state.buffer.first().length;
			return state.length;
		}
		if (n <= state.length) return n;
		return state.ended ? state.length : 0;
	}
	Readable.prototype.read = function(n) {
		debug("read", n);
		if (n === void 0) n = NaN;
		else if (!NumberIsInteger(n)) n = NumberParseInt(n, 10);
		const state = this._readableState;
		const nOrig = n;
		if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
		if (n !== 0) state.state &= -129;
		if (n === 0 && state.needReadable && ((state.highWaterMark !== 0 ? state.length >= state.highWaterMark : state.length > 0) || state.ended)) {
			debug("read: emitReadable", state.length, state.ended);
			if (state.length === 0 && state.ended) endReadable(this);
			else emitReadable(this);
			return null;
		}
		n = howMuchToRead(n, state);
		if (n === 0 && state.ended) {
			if (state.length === 0) endReadable(this);
			return null;
		}
		let doRead = (state.state & kNeedReadable) !== 0;
		debug("need readable", doRead);
		if (state.length === 0 || state.length - n < state.highWaterMark) {
			doRead = true;
			debug("length less than watermark", doRead);
		}
		if (state.ended || state.reading || state.destroyed || state.errored || !state.constructed) {
			doRead = false;
			debug("reading, ended or constructing", doRead);
		} else if (doRead) {
			debug("do read");
			state.state |= 40;
			if (state.length === 0) state.state |= kNeedReadable;
			try {
				this._read(state.highWaterMark);
			} catch (err) {
				errorOrDestroy(this, err);
			}
			state.state &= -33;
			if (!state.reading) n = howMuchToRead(nOrig, state);
		}
		let ret;
		if (n > 0) ret = fromList(n, state);
		else ret = null;
		if (ret === null) {
			state.needReadable = state.length <= state.highWaterMark;
			n = 0;
		} else {
			state.length -= n;
			if (state.multiAwaitDrain) state.awaitDrainWriters.clear();
			else state.awaitDrainWriters = null;
		}
		if (state.length === 0) {
			if (!state.ended) state.needReadable = true;
			if (nOrig !== n && state.ended) endReadable(this);
		}
		if (ret !== null && !state.errorEmitted && !state.closeEmitted) {
			state.dataEmitted = true;
			this.emit("data", ret);
		}
		return ret;
	};
	function onEofChunk(stream, state) {
		debug("onEofChunk");
		if (state.ended) return;
		if (state.decoder) {
			const chunk = state.decoder.end();
			if (chunk && chunk.length) {
				state.buffer.push(chunk);
				state.length += state.objectMode ? 1 : chunk.length;
			}
		}
		state.ended = true;
		if (state.sync) emitReadable(stream);
		else {
			state.needReadable = false;
			state.emittedReadable = true;
			emitReadable_(stream);
		}
	}
	function emitReadable(stream) {
		const state = stream._readableState;
		debug("emitReadable", state.needReadable, state.emittedReadable);
		state.needReadable = false;
		if (!state.emittedReadable) {
			debug("emitReadable", state.flowing);
			state.emittedReadable = true;
			process.nextTick(emitReadable_, stream);
		}
	}
	function emitReadable_(stream) {
		const state = stream._readableState;
		debug("emitReadable_", state.destroyed, state.length, state.ended);
		if (!state.destroyed && !state.errored && (state.length || state.ended)) {
			stream.emit("readable");
			state.emittedReadable = false;
		}
		state.needReadable = !state.flowing && !state.ended && state.length <= state.highWaterMark;
		flow(stream);
	}
	function maybeReadMore(stream, state) {
		if (!state.readingMore && state.constructed) {
			state.readingMore = true;
			process.nextTick(maybeReadMore_, stream, state);
		}
	}
	function maybeReadMore_(stream, state) {
		while (!state.reading && !state.ended && (state.length < state.highWaterMark || state.flowing && state.length === 0)) {
			const len = state.length;
			debug("maybeReadMore read 0");
			stream.read(0);
			if (len === state.length) break;
		}
		state.readingMore = false;
	}
	Readable.prototype._read = function(n) {
		throw new ERR_METHOD_NOT_IMPLEMENTED("_read()");
	};
	Readable.prototype.pipe = function(dest, pipeOpts) {
		const src = this;
		const state = this._readableState;
		if (state.pipes.length === 1) {
			if (!state.multiAwaitDrain) {
				state.multiAwaitDrain = true;
				state.awaitDrainWriters = new SafeSet(state.awaitDrainWriters ? [state.awaitDrainWriters] : []);
			}
		}
		state.pipes.push(dest);
		debug("pipe count=%d opts=%j", state.pipes.length, pipeOpts);
		const endFn = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr ? onend : unpipe;
		if (state.endEmitted) process.nextTick(endFn);
		else src.once("end", endFn);
		dest.on("unpipe", onunpipe);
		function onunpipe(readable, unpipeInfo) {
			debug("onunpipe");
			if (readable === src) {
				if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
					unpipeInfo.hasUnpiped = true;
					cleanup();
				}
			}
		}
		function onend() {
			debug("onend");
			dest.end();
		}
		let ondrain;
		let cleanedUp = false;
		function cleanup() {
			debug("cleanup");
			dest.removeListener("close", onclose);
			dest.removeListener("finish", onfinish);
			if (ondrain) dest.removeListener("drain", ondrain);
			dest.removeListener("error", onerror);
			dest.removeListener("unpipe", onunpipe);
			src.removeListener("end", onend);
			src.removeListener("end", unpipe);
			src.removeListener("data", ondata);
			cleanedUp = true;
			if (ondrain && state.awaitDrainWriters && (!dest._writableState || dest._writableState.needDrain)) ondrain();
		}
		function pause() {
			if (!cleanedUp) {
				if (state.pipes.length === 1 && state.pipes[0] === dest) {
					debug("false write response, pause", 0);
					state.awaitDrainWriters = dest;
					state.multiAwaitDrain = false;
				} else if (state.pipes.length > 1 && state.pipes.includes(dest)) {
					debug("false write response, pause", state.awaitDrainWriters.size);
					state.awaitDrainWriters.add(dest);
				}
				src.pause();
			}
			if (!ondrain) {
				ondrain = pipeOnDrain(src, dest);
				dest.on("drain", ondrain);
			}
		}
		src.on("data", ondata);
		function ondata(chunk) {
			debug("ondata");
			const ret = dest.write(chunk);
			debug("dest.write", ret);
			if (ret === false) pause();
		}
		function onerror(er) {
			debug("onerror", er);
			unpipe();
			dest.removeListener("error", onerror);
			if (dest.listenerCount("error") === 0) {
				const s = dest._writableState || dest._readableState;
				if (s && !s.errorEmitted) errorOrDestroy(dest, er);
				else dest.emit("error", er);
			}
		}
		prependListener(dest, "error", onerror);
		function onclose() {
			dest.removeListener("finish", onfinish);
			unpipe();
		}
		dest.once("close", onclose);
		function onfinish() {
			debug("onfinish");
			dest.removeListener("close", onclose);
			unpipe();
		}
		dest.once("finish", onfinish);
		function unpipe() {
			debug("unpipe");
			src.unpipe(dest);
		}
		dest.emit("pipe", src);
		if (dest.writableNeedDrain === true) pause();
		else if (!state.flowing) {
			debug("pipe resume");
			src.resume();
		}
		return dest;
	};
	function pipeOnDrain(src, dest) {
		return function pipeOnDrainFunctionResult() {
			const state = src._readableState;
			if (state.awaitDrainWriters === dest) {
				debug("pipeOnDrain", 1);
				state.awaitDrainWriters = null;
			} else if (state.multiAwaitDrain) {
				debug("pipeOnDrain", state.awaitDrainWriters.size);
				state.awaitDrainWriters.delete(dest);
			}
			if ((!state.awaitDrainWriters || state.awaitDrainWriters.size === 0) && src.listenerCount("data")) src.resume();
		};
	}
	Readable.prototype.unpipe = function(dest) {
		const state = this._readableState;
		const unpipeInfo = { hasUnpiped: false };
		if (state.pipes.length === 0) return this;
		if (!dest) {
			const dests = state.pipes;
			state.pipes = [];
			this.pause();
			for (let i = 0; i < dests.length; i++) dests[i].emit("unpipe", this, { hasUnpiped: false });
			return this;
		}
		const index = ArrayPrototypeIndexOf(state.pipes, dest);
		if (index === -1) return this;
		state.pipes.splice(index, 1);
		if (state.pipes.length === 0) this.pause();
		dest.emit("unpipe", this, unpipeInfo);
		return this;
	};
	Readable.prototype.on = function(ev, fn) {
		const res = Stream.prototype.on.call(this, ev, fn);
		const state = this._readableState;
		if (ev === "data") {
			state.readableListening = this.listenerCount("readable") > 0;
			if (state.flowing !== false) this.resume();
		} else if (ev === "readable") {
			if (!state.endEmitted && !state.readableListening) {
				state.readableListening = state.needReadable = true;
				state.flowing = false;
				state.emittedReadable = false;
				debug("on readable", state.length, state.reading);
				if (state.length) emitReadable(this);
				else if (!state.reading) process.nextTick(nReadingNextTick, this);
			}
		}
		return res;
	};
	Readable.prototype.addListener = Readable.prototype.on;
	Readable.prototype.removeListener = function(ev, fn) {
		const res = Stream.prototype.removeListener.call(this, ev, fn);
		if (ev === "readable") process.nextTick(updateReadableListening, this);
		return res;
	};
	Readable.prototype.off = Readable.prototype.removeListener;
	Readable.prototype.removeAllListeners = function(ev) {
		const res = Stream.prototype.removeAllListeners.apply(this, arguments);
		if (ev === "readable" || ev === void 0) process.nextTick(updateReadableListening, this);
		return res;
	};
	function updateReadableListening(self) {
		const state = self._readableState;
		state.readableListening = self.listenerCount("readable") > 0;
		if (state.resumeScheduled && state[kPaused] === false) state.flowing = true;
		else if (self.listenerCount("data") > 0) self.resume();
		else if (!state.readableListening) state.flowing = null;
	}
	function nReadingNextTick(self) {
		debug("readable nexttick read 0");
		self.read(0);
	}
	Readable.prototype.resume = function() {
		const state = this._readableState;
		if (!state.flowing) {
			debug("resume");
			state.flowing = !state.readableListening;
			resume(this, state);
		}
		state[kPaused] = false;
		return this;
	};
	function resume(stream, state) {
		if (!state.resumeScheduled) {
			state.resumeScheduled = true;
			process.nextTick(resume_, stream, state);
		}
	}
	function resume_(stream, state) {
		debug("resume", state.reading);
		if (!state.reading) stream.read(0);
		state.resumeScheduled = false;
		stream.emit("resume");
		flow(stream);
		if (state.flowing && !state.reading) stream.read(0);
	}
	Readable.prototype.pause = function() {
		debug("call pause flowing=%j", this._readableState.flowing);
		if (this._readableState.flowing !== false) {
			debug("pause");
			this._readableState.flowing = false;
			this.emit("pause");
		}
		this._readableState[kPaused] = true;
		return this;
	};
	function flow(stream) {
		const state = stream._readableState;
		debug("flow", state.flowing);
		while (state.flowing && stream.read() !== null);
	}
	Readable.prototype.wrap = function(stream) {
		let paused = false;
		stream.on("data", (chunk) => {
			if (!this.push(chunk) && stream.pause) {
				paused = true;
				stream.pause();
			}
		});
		stream.on("end", () => {
			this.push(null);
		});
		stream.on("error", (err) => {
			errorOrDestroy(this, err);
		});
		stream.on("close", () => {
			this.destroy();
		});
		stream.on("destroy", () => {
			this.destroy();
		});
		this._read = () => {
			if (paused && stream.resume) {
				paused = false;
				stream.resume();
			}
		};
		const streamKeys = ObjectKeys(stream);
		for (let j = 1; j < streamKeys.length; j++) {
			const i = streamKeys[j];
			if (this[i] === void 0 && typeof stream[i] === "function") this[i] = stream[i].bind(stream);
		}
		return this;
	};
	Readable.prototype[SymbolAsyncIterator] = function() {
		return streamToAsyncIterator(this);
	};
	Readable.prototype.iterator = function(options) {
		if (options !== void 0) validateObject(options, "options");
		return streamToAsyncIterator(this, options);
	};
	function streamToAsyncIterator(stream, options) {
		if (typeof stream.read !== "function") stream = Readable.wrap(stream, { objectMode: true });
		const iter = createAsyncIterator(stream, options);
		iter.stream = stream;
		return iter;
	}
	async function* createAsyncIterator(stream, options) {
		let callback = nop;
		function next(resolve) {
			if (this === stream) {
				callback();
				callback = nop;
			} else callback = resolve;
		}
		stream.on("readable", next);
		let error;
		const cleanup = eos(stream, { writable: false }, (err) => {
			error = err ? aggregateTwoErrors(error, err) : null;
			callback();
			callback = nop;
		});
		try {
			while (true) {
				const chunk = stream.destroyed ? null : stream.read();
				if (chunk !== null) yield chunk;
				else if (error) throw error;
				else if (error === null) return;
				else await new Promise(next);
			}
		} catch (err) {
			error = aggregateTwoErrors(error, err);
			throw error;
		} finally {
			if ((error || (options === null || options === void 0 ? void 0 : options.destroyOnReturn) !== false) && (error === void 0 || stream._readableState.autoDestroy)) destroyImpl.destroyer(stream, null);
			else {
				stream.off("readable", next);
				cleanup();
			}
		}
	}
	ObjectDefineProperties(Readable.prototype, {
		readable: {
			__proto__: null,
			get() {
				const r = this._readableState;
				return !!r && r.readable !== false && !r.destroyed && !r.errorEmitted && !r.endEmitted;
			},
			set(val) {
				if (this._readableState) this._readableState.readable = !!val;
			}
		},
		readableDidRead: {
			__proto__: null,
			enumerable: false,
			get: function() {
				return this._readableState.dataEmitted;
			}
		},
		readableAborted: {
			__proto__: null,
			enumerable: false,
			get: function() {
				return !!(this._readableState.readable !== false && (this._readableState.destroyed || this._readableState.errored) && !this._readableState.endEmitted);
			}
		},
		readableHighWaterMark: {
			__proto__: null,
			enumerable: false,
			get: function() {
				return this._readableState.highWaterMark;
			}
		},
		readableBuffer: {
			__proto__: null,
			enumerable: false,
			get: function() {
				return this._readableState && this._readableState.buffer;
			}
		},
		readableFlowing: {
			__proto__: null,
			enumerable: false,
			get: function() {
				return this._readableState.flowing;
			},
			set: function(state) {
				if (this._readableState) this._readableState.flowing = state;
			}
		},
		readableLength: {
			__proto__: null,
			enumerable: false,
			get() {
				return this._readableState.length;
			}
		},
		readableObjectMode: {
			__proto__: null,
			enumerable: false,
			get() {
				return this._readableState ? this._readableState.objectMode : false;
			}
		},
		readableEncoding: {
			__proto__: null,
			enumerable: false,
			get() {
				return this._readableState ? this._readableState.encoding : null;
			}
		},
		errored: {
			__proto__: null,
			enumerable: false,
			get() {
				return this._readableState ? this._readableState.errored : null;
			}
		},
		closed: {
			__proto__: null,
			get() {
				return this._readableState ? this._readableState.closed : false;
			}
		},
		destroyed: {
			__proto__: null,
			enumerable: false,
			get() {
				return this._readableState ? this._readableState.destroyed : false;
			},
			set(value) {
				if (!this._readableState) return;
				this._readableState.destroyed = value;
			}
		},
		readableEnded: {
			__proto__: null,
			enumerable: false,
			get() {
				return this._readableState ? this._readableState.endEmitted : false;
			}
		}
	});
	ObjectDefineProperties(ReadableState.prototype, {
		pipesCount: {
			__proto__: null,
			get() {
				return this.pipes.length;
			}
		},
		paused: {
			__proto__: null,
			get() {
				return this[kPaused] !== false;
			},
			set(value) {
				this[kPaused] = !!value;
			}
		}
	});
	Readable._fromList = fromList;
	function fromList(n, state) {
		if (state.length === 0) return null;
		let ret;
		if (state.objectMode) ret = state.buffer.shift();
		else if (!n || n >= state.length) {
			if (state.decoder) ret = state.buffer.join("");
			else if (state.buffer.length === 1) ret = state.buffer.first();
			else ret = state.buffer.concat(state.length);
			state.buffer.clear();
		} else ret = state.buffer.consume(n, state.decoder);
		return ret;
	}
	function endReadable(stream) {
		const state = stream._readableState;
		debug("endReadable", state.endEmitted);
		if (!state.endEmitted) {
			state.ended = true;
			process.nextTick(endReadableNT, state, stream);
		}
	}
	function endReadableNT(state, stream) {
		debug("endReadableNT", state.endEmitted, state.length);
		if (!state.errored && !state.closeEmitted && !state.endEmitted && state.length === 0) {
			state.endEmitted = true;
			stream.emit("end");
			if (stream.writable && stream.allowHalfOpen === false) process.nextTick(endWritableNT, stream);
			else if (state.autoDestroy) {
				const wState = stream._writableState;
				if (!wState || wState.autoDestroy && (wState.finished || wState.writable === false)) stream.destroy();
			}
		}
	}
	function endWritableNT(stream) {
		if (stream.writable && !stream.writableEnded && !stream.destroyed) stream.end();
	}
	Readable.from = function(iterable, opts) {
		return from(Readable, iterable, opts);
	};
	let webStreamsAdapters;
	function lazyWebStreams() {
		if (webStreamsAdapters === void 0) webStreamsAdapters = {};
		return webStreamsAdapters;
	}
	Readable.fromWeb = function(readableStream, options) {
		return lazyWebStreams().newStreamReadableFromReadableStream(readableStream, options);
	};
	Readable.toWeb = function(streamReadable, options) {
		return lazyWebStreams().newReadableStreamFromStreamReadable(streamReadable, options);
	};
	Readable.wrap = function(src, options) {
		var _ref, _src$readableObjectMo;
		return new Readable({
			objectMode: (_ref = (_src$readableObjectMo = src.readableObjectMode) !== null && _src$readableObjectMo !== void 0 ? _src$readableObjectMo : src.objectMode) !== null && _ref !== void 0 ? _ref : true,
			...options,
			destroy(err, callback) {
				destroyImpl.destroyer(src, err);
				callback(err);
			}
		}).wrap(src);
	};
}));
//#endregion
//#region ../../../node_modules/.pnpm/readable-stream@4.7.0/node_modules/readable-stream/lib/internal/streams/writable.js
var require_writable = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const process = require_browser$1();
	const { ArrayPrototypeSlice, Error, FunctionPrototypeSymbolHasInstance, ObjectDefineProperty, ObjectDefineProperties, ObjectSetPrototypeOf, StringPrototypeToLowerCase, Symbol, SymbolHasInstance } = require_primordials();
	module.exports = Writable;
	Writable.WritableState = WritableState;
	const { EventEmitter: EE } = require_events();
	const Stream = require_legacy().Stream;
	const { Buffer } = require_buffer();
	const destroyImpl = require_destroy();
	const { addAbortSignal } = require_add_abort_signal();
	const { getHighWaterMark, getDefaultHighWaterMark } = require_state();
	const { ERR_INVALID_ARG_TYPE, ERR_METHOD_NOT_IMPLEMENTED, ERR_MULTIPLE_CALLBACK, ERR_STREAM_CANNOT_PIPE, ERR_STREAM_DESTROYED, ERR_STREAM_ALREADY_FINISHED, ERR_STREAM_NULL_VALUES, ERR_STREAM_WRITE_AFTER_END, ERR_UNKNOWN_ENCODING } = require_errors().codes;
	const { errorOrDestroy } = destroyImpl;
	ObjectSetPrototypeOf(Writable.prototype, Stream.prototype);
	ObjectSetPrototypeOf(Writable, Stream);
	function nop() {}
	const kOnFinished = Symbol("kOnFinished");
	function WritableState(options, stream, isDuplex) {
		if (typeof isDuplex !== "boolean") isDuplex = stream instanceof require_duplex();
		this.objectMode = !!(options && options.objectMode);
		if (isDuplex) this.objectMode = this.objectMode || !!(options && options.writableObjectMode);
		this.highWaterMark = options ? getHighWaterMark(this, options, "writableHighWaterMark", isDuplex) : getDefaultHighWaterMark(false);
		this.finalCalled = false;
		this.needDrain = false;
		this.ending = false;
		this.ended = false;
		this.finished = false;
		this.destroyed = false;
		const noDecode = !!(options && options.decodeStrings === false);
		this.decodeStrings = !noDecode;
		this.defaultEncoding = options && options.defaultEncoding || "utf8";
		this.length = 0;
		this.writing = false;
		this.corked = 0;
		this.sync = true;
		this.bufferProcessing = false;
		this.onwrite = onwrite.bind(void 0, stream);
		this.writecb = null;
		this.writelen = 0;
		this.afterWriteTickInfo = null;
		resetBuffer(this);
		this.pendingcb = 0;
		this.constructed = true;
		this.prefinished = false;
		this.errorEmitted = false;
		this.emitClose = !options || options.emitClose !== false;
		this.autoDestroy = !options || options.autoDestroy !== false;
		this.errored = null;
		this.closed = false;
		this.closeEmitted = false;
		this[kOnFinished] = [];
	}
	function resetBuffer(state) {
		state.buffered = [];
		state.bufferedIndex = 0;
		state.allBuffers = true;
		state.allNoop = true;
	}
	WritableState.prototype.getBuffer = function getBuffer() {
		return ArrayPrototypeSlice(this.buffered, this.bufferedIndex);
	};
	ObjectDefineProperty(WritableState.prototype, "bufferedRequestCount", {
		__proto__: null,
		get() {
			return this.buffered.length - this.bufferedIndex;
		}
	});
	function Writable(options) {
		const isDuplex = this instanceof require_duplex();
		if (!isDuplex && !FunctionPrototypeSymbolHasInstance(Writable, this)) return new Writable(options);
		this._writableState = new WritableState(options, this, isDuplex);
		if (options) {
			if (typeof options.write === "function") this._write = options.write;
			if (typeof options.writev === "function") this._writev = options.writev;
			if (typeof options.destroy === "function") this._destroy = options.destroy;
			if (typeof options.final === "function") this._final = options.final;
			if (typeof options.construct === "function") this._construct = options.construct;
			if (options.signal) addAbortSignal(options.signal, this);
		}
		Stream.call(this, options);
		destroyImpl.construct(this, () => {
			const state = this._writableState;
			if (!state.writing) clearBuffer(this, state);
			finishMaybe(this, state);
		});
	}
	ObjectDefineProperty(Writable, SymbolHasInstance, {
		__proto__: null,
		value: function(object) {
			if (FunctionPrototypeSymbolHasInstance(this, object)) return true;
			if (this !== Writable) return false;
			return object && object._writableState instanceof WritableState;
		}
	});
	Writable.prototype.pipe = function() {
		errorOrDestroy(this, new ERR_STREAM_CANNOT_PIPE());
	};
	function _write(stream, chunk, encoding, cb) {
		const state = stream._writableState;
		if (typeof encoding === "function") {
			cb = encoding;
			encoding = state.defaultEncoding;
		} else {
			if (!encoding) encoding = state.defaultEncoding;
			else if (encoding !== "buffer" && !Buffer.isEncoding(encoding)) throw new ERR_UNKNOWN_ENCODING(encoding);
			if (typeof cb !== "function") cb = nop;
		}
		if (chunk === null) throw new ERR_STREAM_NULL_VALUES();
		else if (!state.objectMode) if (typeof chunk === "string") {
			if (state.decodeStrings !== false) {
				chunk = Buffer.from(chunk, encoding);
				encoding = "buffer";
			}
		} else if (chunk instanceof Buffer) encoding = "buffer";
		else if (Stream._isUint8Array(chunk)) {
			chunk = Stream._uint8ArrayToBuffer(chunk);
			encoding = "buffer";
		} else throw new ERR_INVALID_ARG_TYPE("chunk", [
			"string",
			"Buffer",
			"Uint8Array"
		], chunk);
		let err;
		if (state.ending) err = new ERR_STREAM_WRITE_AFTER_END();
		else if (state.destroyed) err = new ERR_STREAM_DESTROYED("write");
		if (err) {
			process.nextTick(cb, err);
			errorOrDestroy(stream, err, true);
			return err;
		}
		state.pendingcb++;
		return writeOrBuffer(stream, state, chunk, encoding, cb);
	}
	Writable.prototype.write = function(chunk, encoding, cb) {
		return _write(this, chunk, encoding, cb) === true;
	};
	Writable.prototype.cork = function() {
		this._writableState.corked++;
	};
	Writable.prototype.uncork = function() {
		const state = this._writableState;
		if (state.corked) {
			state.corked--;
			if (!state.writing) clearBuffer(this, state);
		}
	};
	Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
		if (typeof encoding === "string") encoding = StringPrototypeToLowerCase(encoding);
		if (!Buffer.isEncoding(encoding)) throw new ERR_UNKNOWN_ENCODING(encoding);
		this._writableState.defaultEncoding = encoding;
		return this;
	};
	function writeOrBuffer(stream, state, chunk, encoding, callback) {
		const len = state.objectMode ? 1 : chunk.length;
		state.length += len;
		const ret = state.length < state.highWaterMark;
		if (!ret) state.needDrain = true;
		if (state.writing || state.corked || state.errored || !state.constructed) {
			state.buffered.push({
				chunk,
				encoding,
				callback
			});
			if (state.allBuffers && encoding !== "buffer") state.allBuffers = false;
			if (state.allNoop && callback !== nop) state.allNoop = false;
		} else {
			state.writelen = len;
			state.writecb = callback;
			state.writing = true;
			state.sync = true;
			stream._write(chunk, encoding, state.onwrite);
			state.sync = false;
		}
		return ret && !state.errored && !state.destroyed;
	}
	function doWrite(stream, state, writev, len, chunk, encoding, cb) {
		state.writelen = len;
		state.writecb = cb;
		state.writing = true;
		state.sync = true;
		if (state.destroyed) state.onwrite(new ERR_STREAM_DESTROYED("write"));
		else if (writev) stream._writev(chunk, state.onwrite);
		else stream._write(chunk, encoding, state.onwrite);
		state.sync = false;
	}
	function onwriteError(stream, state, er, cb) {
		--state.pendingcb;
		cb(er);
		errorBuffer(state);
		errorOrDestroy(stream, er);
	}
	function onwrite(stream, er) {
		const state = stream._writableState;
		const sync = state.sync;
		const cb = state.writecb;
		if (typeof cb !== "function") {
			errorOrDestroy(stream, new ERR_MULTIPLE_CALLBACK());
			return;
		}
		state.writing = false;
		state.writecb = null;
		state.length -= state.writelen;
		state.writelen = 0;
		if (er) {
			er.stack;
			if (!state.errored) state.errored = er;
			if (stream._readableState && !stream._readableState.errored) stream._readableState.errored = er;
			if (sync) process.nextTick(onwriteError, stream, state, er, cb);
			else onwriteError(stream, state, er, cb);
		} else {
			if (state.buffered.length > state.bufferedIndex) clearBuffer(stream, state);
			if (sync) if (state.afterWriteTickInfo !== null && state.afterWriteTickInfo.cb === cb) state.afterWriteTickInfo.count++;
			else {
				state.afterWriteTickInfo = {
					count: 1,
					cb,
					stream,
					state
				};
				process.nextTick(afterWriteTick, state.afterWriteTickInfo);
			}
			else afterWrite(stream, state, 1, cb);
		}
	}
	function afterWriteTick({ stream, state, count, cb }) {
		state.afterWriteTickInfo = null;
		return afterWrite(stream, state, count, cb);
	}
	function afterWrite(stream, state, count, cb) {
		if (!state.ending && !stream.destroyed && state.length === 0 && state.needDrain) {
			state.needDrain = false;
			stream.emit("drain");
		}
		while (count-- > 0) {
			state.pendingcb--;
			cb();
		}
		if (state.destroyed) errorBuffer(state);
		finishMaybe(stream, state);
	}
	function errorBuffer(state) {
		if (state.writing) return;
		for (let n = state.bufferedIndex; n < state.buffered.length; ++n) {
			var _state$errored;
			const { chunk, callback } = state.buffered[n];
			const len = state.objectMode ? 1 : chunk.length;
			state.length -= len;
			callback((_state$errored = state.errored) !== null && _state$errored !== void 0 ? _state$errored : new ERR_STREAM_DESTROYED("write"));
		}
		const onfinishCallbacks = state[kOnFinished].splice(0);
		for (let i = 0; i < onfinishCallbacks.length; i++) {
			var _state$errored2;
			onfinishCallbacks[i]((_state$errored2 = state.errored) !== null && _state$errored2 !== void 0 ? _state$errored2 : new ERR_STREAM_DESTROYED("end"));
		}
		resetBuffer(state);
	}
	function clearBuffer(stream, state) {
		if (state.corked || state.bufferProcessing || state.destroyed || !state.constructed) return;
		const { buffered, bufferedIndex, objectMode } = state;
		const bufferedLength = buffered.length - bufferedIndex;
		if (!bufferedLength) return;
		let i = bufferedIndex;
		state.bufferProcessing = true;
		if (bufferedLength > 1 && stream._writev) {
			state.pendingcb -= bufferedLength - 1;
			const callback = state.allNoop ? nop : (err) => {
				for (let n = i; n < buffered.length; ++n) buffered[n].callback(err);
			};
			const chunks = state.allNoop && i === 0 ? buffered : ArrayPrototypeSlice(buffered, i);
			chunks.allBuffers = state.allBuffers;
			doWrite(stream, state, true, state.length, chunks, "", callback);
			resetBuffer(state);
		} else {
			do {
				const { chunk, encoding, callback } = buffered[i];
				buffered[i++] = null;
				doWrite(stream, state, false, objectMode ? 1 : chunk.length, chunk, encoding, callback);
			} while (i < buffered.length && !state.writing);
			if (i === buffered.length) resetBuffer(state);
			else if (i > 256) {
				buffered.splice(0, i);
				state.bufferedIndex = 0;
			} else state.bufferedIndex = i;
		}
		state.bufferProcessing = false;
	}
	Writable.prototype._write = function(chunk, encoding, cb) {
		if (this._writev) this._writev([{
			chunk,
			encoding
		}], cb);
		else throw new ERR_METHOD_NOT_IMPLEMENTED("_write()");
	};
	Writable.prototype._writev = null;
	Writable.prototype.end = function(chunk, encoding, cb) {
		const state = this._writableState;
		if (typeof chunk === "function") {
			cb = chunk;
			chunk = null;
			encoding = null;
		} else if (typeof encoding === "function") {
			cb = encoding;
			encoding = null;
		}
		let err;
		if (chunk !== null && chunk !== void 0) {
			const ret = _write(this, chunk, encoding);
			if (ret instanceof Error) err = ret;
		}
		if (state.corked) {
			state.corked = 1;
			this.uncork();
		}
		if (err) {} else if (!state.errored && !state.ending) {
			state.ending = true;
			finishMaybe(this, state, true);
			state.ended = true;
		} else if (state.finished) err = new ERR_STREAM_ALREADY_FINISHED("end");
		else if (state.destroyed) err = new ERR_STREAM_DESTROYED("end");
		if (typeof cb === "function") if (err || state.finished) process.nextTick(cb, err);
		else state[kOnFinished].push(cb);
		return this;
	};
	function needFinish(state) {
		return state.ending && !state.destroyed && state.constructed && state.length === 0 && !state.errored && state.buffered.length === 0 && !state.finished && !state.writing && !state.errorEmitted && !state.closeEmitted;
	}
	function callFinal(stream, state) {
		let called = false;
		function onFinish(err) {
			if (called) {
				errorOrDestroy(stream, err !== null && err !== void 0 ? err : ERR_MULTIPLE_CALLBACK());
				return;
			}
			called = true;
			state.pendingcb--;
			if (err) {
				const onfinishCallbacks = state[kOnFinished].splice(0);
				for (let i = 0; i < onfinishCallbacks.length; i++) onfinishCallbacks[i](err);
				errorOrDestroy(stream, err, state.sync);
			} else if (needFinish(state)) {
				state.prefinished = true;
				stream.emit("prefinish");
				state.pendingcb++;
				process.nextTick(finish, stream, state);
			}
		}
		state.sync = true;
		state.pendingcb++;
		try {
			stream._final(onFinish);
		} catch (err) {
			onFinish(err);
		}
		state.sync = false;
	}
	function prefinish(stream, state) {
		if (!state.prefinished && !state.finalCalled) if (typeof stream._final === "function" && !state.destroyed) {
			state.finalCalled = true;
			callFinal(stream, state);
		} else {
			state.prefinished = true;
			stream.emit("prefinish");
		}
	}
	function finishMaybe(stream, state, sync) {
		if (needFinish(state)) {
			prefinish(stream, state);
			if (state.pendingcb === 0) {
				if (sync) {
					state.pendingcb++;
					process.nextTick((stream, state) => {
						if (needFinish(state)) finish(stream, state);
						else state.pendingcb--;
					}, stream, state);
				} else if (needFinish(state)) {
					state.pendingcb++;
					finish(stream, state);
				}
			}
		}
	}
	function finish(stream, state) {
		state.pendingcb--;
		state.finished = true;
		const onfinishCallbacks = state[kOnFinished].splice(0);
		for (let i = 0; i < onfinishCallbacks.length; i++) onfinishCallbacks[i]();
		stream.emit("finish");
		if (state.autoDestroy) {
			const rState = stream._readableState;
			if (!rState || rState.autoDestroy && (rState.endEmitted || rState.readable === false)) stream.destroy();
		}
	}
	ObjectDefineProperties(Writable.prototype, {
		closed: {
			__proto__: null,
			get() {
				return this._writableState ? this._writableState.closed : false;
			}
		},
		destroyed: {
			__proto__: null,
			get() {
				return this._writableState ? this._writableState.destroyed : false;
			},
			set(value) {
				if (this._writableState) this._writableState.destroyed = value;
			}
		},
		writable: {
			__proto__: null,
			get() {
				const w = this._writableState;
				return !!w && w.writable !== false && !w.destroyed && !w.errored && !w.ending && !w.ended;
			},
			set(val) {
				if (this._writableState) this._writableState.writable = !!val;
			}
		},
		writableFinished: {
			__proto__: null,
			get() {
				return this._writableState ? this._writableState.finished : false;
			}
		},
		writableObjectMode: {
			__proto__: null,
			get() {
				return this._writableState ? this._writableState.objectMode : false;
			}
		},
		writableBuffer: {
			__proto__: null,
			get() {
				return this._writableState && this._writableState.getBuffer();
			}
		},
		writableEnded: {
			__proto__: null,
			get() {
				return this._writableState ? this._writableState.ending : false;
			}
		},
		writableNeedDrain: {
			__proto__: null,
			get() {
				const wState = this._writableState;
				if (!wState) return false;
				return !wState.destroyed && !wState.ending && wState.needDrain;
			}
		},
		writableHighWaterMark: {
			__proto__: null,
			get() {
				return this._writableState && this._writableState.highWaterMark;
			}
		},
		writableCorked: {
			__proto__: null,
			get() {
				return this._writableState ? this._writableState.corked : 0;
			}
		},
		writableLength: {
			__proto__: null,
			get() {
				return this._writableState && this._writableState.length;
			}
		},
		errored: {
			__proto__: null,
			enumerable: false,
			get() {
				return this._writableState ? this._writableState.errored : null;
			}
		},
		writableAborted: {
			__proto__: null,
			enumerable: false,
			get: function() {
				return !!(this._writableState.writable !== false && (this._writableState.destroyed || this._writableState.errored) && !this._writableState.finished);
			}
		}
	});
	const destroy = destroyImpl.destroy;
	Writable.prototype.destroy = function(err, cb) {
		const state = this._writableState;
		if (!state.destroyed && (state.bufferedIndex < state.buffered.length || state[kOnFinished].length)) process.nextTick(errorBuffer, state);
		destroy.call(this, err, cb);
		return this;
	};
	Writable.prototype._undestroy = destroyImpl.undestroy;
	Writable.prototype._destroy = function(err, cb) {
		cb(err);
	};
	Writable.prototype[EE.captureRejectionSymbol] = function(err) {
		this.destroy(err);
	};
	let webStreamsAdapters;
	function lazyWebStreams() {
		if (webStreamsAdapters === void 0) webStreamsAdapters = {};
		return webStreamsAdapters;
	}
	Writable.fromWeb = function(writableStream, options) {
		return lazyWebStreams().newStreamWritableFromWritableStream(writableStream, options);
	};
	Writable.toWeb = function(streamWritable) {
		return lazyWebStreams().newWritableStreamFromStreamWritable(streamWritable);
	};
}));
//#endregion
//#region ../../../node_modules/.pnpm/readable-stream@4.7.0/node_modules/readable-stream/lib/internal/streams/duplexify.js
var require_duplexify = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const process = require_browser$1();
	const bufferModule = require_buffer();
	const { isReadable, isWritable, isIterable, isNodeStream, isReadableNodeStream, isWritableNodeStream, isDuplexNodeStream, isReadableStream, isWritableStream } = require_utils$1();
	const eos = require_end_of_stream();
	const { AbortError, codes: { ERR_INVALID_ARG_TYPE, ERR_INVALID_RETURN_VALUE } } = require_errors();
	const { destroyer } = require_destroy();
	const Duplex = require_duplex();
	const Readable = require_readable();
	const Writable = require_writable();
	const { createDeferredPromise } = require_util();
	const from = require_from();
	const Blob = globalThis.Blob || bufferModule.Blob;
	const isBlob = typeof Blob !== "undefined" ? function isBlob(b) {
		return b instanceof Blob;
	} : function isBlob(b) {
		return false;
	};
	const AbortController = globalThis.AbortController || require_browser$2().AbortController;
	const { FunctionPrototypeCall } = require_primordials();
	var Duplexify = class extends Duplex {
		constructor(options) {
			super(options);
			if ((options === null || options === void 0 ? void 0 : options.readable) === false) {
				this._readableState.readable = false;
				this._readableState.ended = true;
				this._readableState.endEmitted = true;
			}
			if ((options === null || options === void 0 ? void 0 : options.writable) === false) {
				this._writableState.writable = false;
				this._writableState.ending = true;
				this._writableState.ended = true;
				this._writableState.finished = true;
			}
		}
	};
	module.exports = function duplexify(body, name) {
		if (isDuplexNodeStream(body)) return body;
		if (isReadableNodeStream(body)) return _duplexify({ readable: body });
		if (isWritableNodeStream(body)) return _duplexify({ writable: body });
		if (isNodeStream(body)) return _duplexify({
			writable: false,
			readable: false
		});
		if (isReadableStream(body)) return _duplexify({ readable: Readable.fromWeb(body) });
		if (isWritableStream(body)) return _duplexify({ writable: Writable.fromWeb(body) });
		if (typeof body === "function") {
			const { value, write, final, destroy } = fromAsyncGen(body);
			if (isIterable(value)) return from(Duplexify, value, {
				objectMode: true,
				write,
				final,
				destroy
			});
			const then = value === null || value === void 0 ? void 0 : value.then;
			if (typeof then === "function") {
				let d;
				const promise = FunctionPrototypeCall(then, value, (val) => {
					if (val != null) throw new ERR_INVALID_RETURN_VALUE("nully", "body", val);
				}, (err) => {
					destroyer(d, err);
				});
				return d = new Duplexify({
					objectMode: true,
					readable: false,
					write,
					final(cb) {
						final(async () => {
							try {
								await promise;
								process.nextTick(cb, null);
							} catch (err) {
								process.nextTick(cb, err);
							}
						});
					},
					destroy
				});
			}
			throw new ERR_INVALID_RETURN_VALUE("Iterable, AsyncIterable or AsyncFunction", name, value);
		}
		if (isBlob(body)) return duplexify(body.arrayBuffer());
		if (isIterable(body)) return from(Duplexify, body, {
			objectMode: true,
			writable: false
		});
		if (isReadableStream(body === null || body === void 0 ? void 0 : body.readable) && isWritableStream(body === null || body === void 0 ? void 0 : body.writable)) return Duplexify.fromWeb(body);
		if (typeof (body === null || body === void 0 ? void 0 : body.writable) === "object" || typeof (body === null || body === void 0 ? void 0 : body.readable) === "object") return _duplexify({
			readable: body !== null && body !== void 0 && body.readable ? isReadableNodeStream(body === null || body === void 0 ? void 0 : body.readable) ? body === null || body === void 0 ? void 0 : body.readable : duplexify(body.readable) : void 0,
			writable: body !== null && body !== void 0 && body.writable ? isWritableNodeStream(body === null || body === void 0 ? void 0 : body.writable) ? body === null || body === void 0 ? void 0 : body.writable : duplexify(body.writable) : void 0
		});
		const then = body === null || body === void 0 ? void 0 : body.then;
		if (typeof then === "function") {
			let d;
			FunctionPrototypeCall(then, body, (val) => {
				if (val != null) d.push(val);
				d.push(null);
			}, (err) => {
				destroyer(d, err);
			});
			return d = new Duplexify({
				objectMode: true,
				writable: false,
				read() {}
			});
		}
		throw new ERR_INVALID_ARG_TYPE(name, [
			"Blob",
			"ReadableStream",
			"WritableStream",
			"Stream",
			"Iterable",
			"AsyncIterable",
			"Function",
			"{ readable, writable } pair",
			"Promise"
		], body);
	};
	function fromAsyncGen(fn) {
		let { promise, resolve } = createDeferredPromise();
		const ac = new AbortController();
		const signal = ac.signal;
		return {
			value: fn((async function* () {
				while (true) {
					const _promise = promise;
					promise = null;
					const { chunk, done, cb } = await _promise;
					process.nextTick(cb);
					if (done) return;
					if (signal.aborted) throw new AbortError(void 0, { cause: signal.reason });
					({promise, resolve} = createDeferredPromise());
					yield chunk;
				}
			})(), { signal }),
			write(chunk, encoding, cb) {
				const _resolve = resolve;
				resolve = null;
				_resolve({
					chunk,
					done: false,
					cb
				});
			},
			final(cb) {
				const _resolve = resolve;
				resolve = null;
				_resolve({
					done: true,
					cb
				});
			},
			destroy(err, cb) {
				ac.abort();
				cb(err);
			}
		};
	}
	function _duplexify(pair) {
		const r = pair.readable && typeof pair.readable.read !== "function" ? Readable.wrap(pair.readable) : pair.readable;
		const w = pair.writable;
		let readable = !!isReadable(r);
		let writable = !!isWritable(w);
		let ondrain;
		let onfinish;
		let onreadable;
		let onclose;
		let d;
		function onfinished(err) {
			const cb = onclose;
			onclose = null;
			if (cb) cb(err);
			else if (err) d.destroy(err);
		}
		d = new Duplexify({
			readableObjectMode: !!(r !== null && r !== void 0 && r.readableObjectMode),
			writableObjectMode: !!(w !== null && w !== void 0 && w.writableObjectMode),
			readable,
			writable
		});
		if (writable) {
			eos(w, (err) => {
				writable = false;
				if (err) destroyer(r, err);
				onfinished(err);
			});
			d._write = function(chunk, encoding, callback) {
				if (w.write(chunk, encoding)) callback();
				else ondrain = callback;
			};
			d._final = function(callback) {
				w.end();
				onfinish = callback;
			};
			w.on("drain", function() {
				if (ondrain) {
					const cb = ondrain;
					ondrain = null;
					cb();
				}
			});
			w.on("finish", function() {
				if (onfinish) {
					const cb = onfinish;
					onfinish = null;
					cb();
				}
			});
		}
		if (readable) {
			eos(r, (err) => {
				readable = false;
				if (err) destroyer(r, err);
				onfinished(err);
			});
			r.on("readable", function() {
				if (onreadable) {
					const cb = onreadable;
					onreadable = null;
					cb();
				}
			});
			r.on("end", function() {
				d.push(null);
			});
			d._read = function() {
				while (true) {
					const buf = r.read();
					if (buf === null) {
						onreadable = d._read;
						return;
					}
					if (!d.push(buf)) return;
				}
			};
		}
		d._destroy = function(err, callback) {
			if (!err && onclose !== null) err = new AbortError();
			onreadable = null;
			ondrain = null;
			onfinish = null;
			if (onclose === null) callback(err);
			else {
				onclose = callback;
				destroyer(w, err);
				destroyer(r, err);
			}
		};
		return d;
	}
}));
//#endregion
//#region ../../../node_modules/.pnpm/readable-stream@4.7.0/node_modules/readable-stream/lib/internal/streams/duplex.js
var require_duplex = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const { ObjectDefineProperties, ObjectGetOwnPropertyDescriptor, ObjectKeys, ObjectSetPrototypeOf } = require_primordials();
	module.exports = Duplex;
	const Readable = require_readable();
	const Writable = require_writable();
	ObjectSetPrototypeOf(Duplex.prototype, Readable.prototype);
	ObjectSetPrototypeOf(Duplex, Readable);
	{
		const keys = ObjectKeys(Writable.prototype);
		for (let i = 0; i < keys.length; i++) {
			const method = keys[i];
			if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
		}
	}
	function Duplex(options) {
		if (!(this instanceof Duplex)) return new Duplex(options);
		Readable.call(this, options);
		Writable.call(this, options);
		if (options) {
			this.allowHalfOpen = options.allowHalfOpen !== false;
			if (options.readable === false) {
				this._readableState.readable = false;
				this._readableState.ended = true;
				this._readableState.endEmitted = true;
			}
			if (options.writable === false) {
				this._writableState.writable = false;
				this._writableState.ending = true;
				this._writableState.ended = true;
				this._writableState.finished = true;
			}
		} else this.allowHalfOpen = true;
	}
	ObjectDefineProperties(Duplex.prototype, {
		writable: {
			__proto__: null,
			...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writable")
		},
		writableHighWaterMark: {
			__proto__: null,
			...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableHighWaterMark")
		},
		writableObjectMode: {
			__proto__: null,
			...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableObjectMode")
		},
		writableBuffer: {
			__proto__: null,
			...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableBuffer")
		},
		writableLength: {
			__proto__: null,
			...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableLength")
		},
		writableFinished: {
			__proto__: null,
			...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableFinished")
		},
		writableCorked: {
			__proto__: null,
			...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableCorked")
		},
		writableEnded: {
			__proto__: null,
			...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableEnded")
		},
		writableNeedDrain: {
			__proto__: null,
			...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableNeedDrain")
		},
		destroyed: {
			__proto__: null,
			get() {
				if (this._readableState === void 0 || this._writableState === void 0) return false;
				return this._readableState.destroyed && this._writableState.destroyed;
			},
			set(value) {
				if (this._readableState && this._writableState) {
					this._readableState.destroyed = value;
					this._writableState.destroyed = value;
				}
			}
		}
	});
	let webStreamsAdapters;
	function lazyWebStreams() {
		if (webStreamsAdapters === void 0) webStreamsAdapters = {};
		return webStreamsAdapters;
	}
	Duplex.fromWeb = function(pair, options) {
		return lazyWebStreams().newStreamDuplexFromReadableWritablePair(pair, options);
	};
	Duplex.toWeb = function(duplex) {
		return lazyWebStreams().newReadableWritablePairFromDuplex(duplex);
	};
	let duplexify;
	Duplex.from = function(body) {
		if (!duplexify) duplexify = require_duplexify();
		return duplexify(body, "body");
	};
}));
//#endregion
//#region ../../../node_modules/.pnpm/readable-stream@4.7.0/node_modules/readable-stream/lib/internal/streams/transform.js
var require_transform = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const { ObjectSetPrototypeOf, Symbol } = require_primordials();
	module.exports = Transform;
	const { ERR_METHOD_NOT_IMPLEMENTED } = require_errors().codes;
	const Duplex = require_duplex();
	const { getHighWaterMark } = require_state();
	ObjectSetPrototypeOf(Transform.prototype, Duplex.prototype);
	ObjectSetPrototypeOf(Transform, Duplex);
	const kCallback = Symbol("kCallback");
	function Transform(options) {
		if (!(this instanceof Transform)) return new Transform(options);
		const readableHighWaterMark = options ? getHighWaterMark(this, options, "readableHighWaterMark", true) : null;
		if (readableHighWaterMark === 0) options = {
			...options,
			highWaterMark: null,
			readableHighWaterMark,
			writableHighWaterMark: options.writableHighWaterMark || 0
		};
		Duplex.call(this, options);
		this._readableState.sync = false;
		this[kCallback] = null;
		if (options) {
			if (typeof options.transform === "function") this._transform = options.transform;
			if (typeof options.flush === "function") this._flush = options.flush;
		}
		this.on("prefinish", prefinish);
	}
	function final(cb) {
		if (typeof this._flush === "function" && !this.destroyed) this._flush((er, data) => {
			if (er) {
				if (cb) cb(er);
				else this.destroy(er);
				return;
			}
			if (data != null) this.push(data);
			this.push(null);
			if (cb) cb();
		});
		else {
			this.push(null);
			if (cb) cb();
		}
	}
	function prefinish() {
		if (this._final !== final) final.call(this);
	}
	Transform.prototype._final = final;
	Transform.prototype._transform = function(chunk, encoding, callback) {
		throw new ERR_METHOD_NOT_IMPLEMENTED("_transform()");
	};
	Transform.prototype._write = function(chunk, encoding, callback) {
		const rState = this._readableState;
		const wState = this._writableState;
		const length = rState.length;
		this._transform(chunk, encoding, (err, val) => {
			if (err) {
				callback(err);
				return;
			}
			if (val != null) this.push(val);
			if (wState.ended || length === rState.length || rState.length < rState.highWaterMark) callback();
			else this[kCallback] = callback;
		});
	};
	Transform.prototype._read = function() {
		if (this[kCallback]) {
			const callback = this[kCallback];
			this[kCallback] = null;
			callback();
		}
	};
}));
//#endregion
//#region ../../../node_modules/.pnpm/readable-stream@4.7.0/node_modules/readable-stream/lib/internal/streams/passthrough.js
var require_passthrough = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const { ObjectSetPrototypeOf } = require_primordials();
	module.exports = PassThrough;
	const Transform = require_transform();
	ObjectSetPrototypeOf(PassThrough.prototype, Transform.prototype);
	ObjectSetPrototypeOf(PassThrough, Transform);
	function PassThrough(options) {
		if (!(this instanceof PassThrough)) return new PassThrough(options);
		Transform.call(this, options);
	}
	PassThrough.prototype._transform = function(chunk, encoding, cb) {
		cb(null, chunk);
	};
}));
//#endregion
//#region ../../../node_modules/.pnpm/readable-stream@4.7.0/node_modules/readable-stream/lib/internal/streams/pipeline.js
var require_pipeline = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const process = require_browser$1();
	const { ArrayIsArray, Promise, SymbolAsyncIterator, SymbolDispose } = require_primordials();
	const eos = require_end_of_stream();
	const { once } = require_util();
	const destroyImpl = require_destroy();
	const Duplex = require_duplex();
	const { aggregateTwoErrors, codes: { ERR_INVALID_ARG_TYPE, ERR_INVALID_RETURN_VALUE, ERR_MISSING_ARGS, ERR_STREAM_DESTROYED, ERR_STREAM_PREMATURE_CLOSE }, AbortError } = require_errors();
	const { validateFunction, validateAbortSignal } = require_validators();
	const { isIterable, isReadable, isReadableNodeStream, isNodeStream, isTransformStream, isWebStream, isReadableStream, isReadableFinished } = require_utils$1();
	const AbortController = globalThis.AbortController || require_browser$2().AbortController;
	let PassThrough;
	let Readable;
	let addAbortListener;
	function destroyer(stream, reading, writing) {
		let finished = false;
		stream.on("close", () => {
			finished = true;
		});
		return {
			destroy: (err) => {
				if (finished) return;
				finished = true;
				destroyImpl.destroyer(stream, err || new ERR_STREAM_DESTROYED("pipe"));
			},
			cleanup: eos(stream, {
				readable: reading,
				writable: writing
			}, (err) => {
				finished = !err;
			})
		};
	}
	function popCallback(streams) {
		validateFunction(streams[streams.length - 1], "streams[stream.length - 1]");
		return streams.pop();
	}
	function makeAsyncIterable(val) {
		if (isIterable(val)) return val;
		else if (isReadableNodeStream(val)) return fromReadable(val);
		throw new ERR_INVALID_ARG_TYPE("val", [
			"Readable",
			"Iterable",
			"AsyncIterable"
		], val);
	}
	async function* fromReadable(val) {
		if (!Readable) Readable = require_readable();
		yield* Readable.prototype[SymbolAsyncIterator].call(val);
	}
	async function pumpToNode(iterable, writable, finish, { end }) {
		let error;
		let onresolve = null;
		const resume = (err) => {
			if (err) error = err;
			if (onresolve) {
				const callback = onresolve;
				onresolve = null;
				callback();
			}
		};
		const wait = () => new Promise((resolve, reject) => {
			if (error) reject(error);
			else onresolve = () => {
				if (error) reject(error);
				else resolve();
			};
		});
		writable.on("drain", resume);
		const cleanup = eos(writable, { readable: false }, resume);
		try {
			if (writable.writableNeedDrain) await wait();
			for await (const chunk of iterable) if (!writable.write(chunk)) await wait();
			if (end) {
				writable.end();
				await wait();
			}
			finish();
		} catch (err) {
			finish(error !== err ? aggregateTwoErrors(error, err) : err);
		} finally {
			cleanup();
			writable.off("drain", resume);
		}
	}
	async function pumpToWeb(readable, writable, finish, { end }) {
		if (isTransformStream(writable)) writable = writable.writable;
		const writer = writable.getWriter();
		try {
			for await (const chunk of readable) {
				await writer.ready;
				writer.write(chunk).catch(() => {});
			}
			await writer.ready;
			if (end) await writer.close();
			finish();
		} catch (err) {
			try {
				await writer.abort(err);
				finish(err);
			} catch (err) {
				finish(err);
			}
		}
	}
	function pipeline(...streams) {
		return pipelineImpl(streams, once(popCallback(streams)));
	}
	function pipelineImpl(streams, callback, opts) {
		if (streams.length === 1 && ArrayIsArray(streams[0])) streams = streams[0];
		if (streams.length < 2) throw new ERR_MISSING_ARGS("streams");
		const ac = new AbortController();
		const signal = ac.signal;
		const outerSignal = opts === null || opts === void 0 ? void 0 : opts.signal;
		const lastStreamCleanup = [];
		validateAbortSignal(outerSignal, "options.signal");
		function abort() {
			finishImpl(new AbortError());
		}
		addAbortListener = addAbortListener || require_util().addAbortListener;
		let disposable;
		if (outerSignal) disposable = addAbortListener(outerSignal, abort);
		let error;
		let value;
		const destroys = [];
		let finishCount = 0;
		function finish(err) {
			finishImpl(err, --finishCount === 0);
		}
		function finishImpl(err, final) {
			var _disposable;
			if (err && (!error || error.code === "ERR_STREAM_PREMATURE_CLOSE")) error = err;
			if (!error && !final) return;
			while (destroys.length) destroys.shift()(error);
			(_disposable = disposable) === null || _disposable === void 0 || _disposable[SymbolDispose]();
			ac.abort();
			if (final) {
				if (!error) lastStreamCleanup.forEach((fn) => fn());
				process.nextTick(callback, error, value);
			}
		}
		let ret;
		for (let i = 0; i < streams.length; i++) {
			const stream = streams[i];
			const reading = i < streams.length - 1;
			const writing = i > 0;
			const end = reading || (opts === null || opts === void 0 ? void 0 : opts.end) !== false;
			const isLastStream = i === streams.length - 1;
			if (isNodeStream(stream)) {
				if (end) {
					const { destroy, cleanup } = destroyer(stream, reading, writing);
					destroys.push(destroy);
					if (isReadable(stream) && isLastStream) lastStreamCleanup.push(cleanup);
				}
				function onError(err) {
					if (err && err.name !== "AbortError" && err.code !== "ERR_STREAM_PREMATURE_CLOSE") finish(err);
				}
				stream.on("error", onError);
				if (isReadable(stream) && isLastStream) lastStreamCleanup.push(() => {
					stream.removeListener("error", onError);
				});
			}
			if (i === 0) if (typeof stream === "function") {
				ret = stream({ signal });
				if (!isIterable(ret)) throw new ERR_INVALID_RETURN_VALUE("Iterable, AsyncIterable or Stream", "source", ret);
			} else if (isIterable(stream) || isReadableNodeStream(stream) || isTransformStream(stream)) ret = stream;
			else ret = Duplex.from(stream);
			else if (typeof stream === "function") {
				if (isTransformStream(ret)) {
					var _ret;
					ret = makeAsyncIterable((_ret = ret) === null || _ret === void 0 ? void 0 : _ret.readable);
				} else ret = makeAsyncIterable(ret);
				ret = stream(ret, { signal });
				if (reading) {
					if (!isIterable(ret, true)) throw new ERR_INVALID_RETURN_VALUE("AsyncIterable", `transform[${i - 1}]`, ret);
				} else {
					var _ret2;
					if (!PassThrough) PassThrough = require_passthrough();
					const pt = new PassThrough({ objectMode: true });
					const then = (_ret2 = ret) === null || _ret2 === void 0 ? void 0 : _ret2.then;
					if (typeof then === "function") {
						finishCount++;
						then.call(ret, (val) => {
							value = val;
							if (val != null) pt.write(val);
							if (end) pt.end();
							process.nextTick(finish);
						}, (err) => {
							pt.destroy(err);
							process.nextTick(finish, err);
						});
					} else if (isIterable(ret, true)) {
						finishCount++;
						pumpToNode(ret, pt, finish, { end });
					} else if (isReadableStream(ret) || isTransformStream(ret)) {
						const toRead = ret.readable || ret;
						finishCount++;
						pumpToNode(toRead, pt, finish, { end });
					} else throw new ERR_INVALID_RETURN_VALUE("AsyncIterable or Promise", "destination", ret);
					ret = pt;
					const { destroy, cleanup } = destroyer(ret, false, true);
					destroys.push(destroy);
					if (isLastStream) lastStreamCleanup.push(cleanup);
				}
			} else if (isNodeStream(stream)) {
				if (isReadableNodeStream(ret)) {
					finishCount += 2;
					const cleanup = pipe(ret, stream, finish, { end });
					if (isReadable(stream) && isLastStream) lastStreamCleanup.push(cleanup);
				} else if (isTransformStream(ret) || isReadableStream(ret)) {
					const toRead = ret.readable || ret;
					finishCount++;
					pumpToNode(toRead, stream, finish, { end });
				} else if (isIterable(ret)) {
					finishCount++;
					pumpToNode(ret, stream, finish, { end });
				} else throw new ERR_INVALID_ARG_TYPE("val", [
					"Readable",
					"Iterable",
					"AsyncIterable",
					"ReadableStream",
					"TransformStream"
				], ret);
				ret = stream;
			} else if (isWebStream(stream)) {
				if (isReadableNodeStream(ret)) {
					finishCount++;
					pumpToWeb(makeAsyncIterable(ret), stream, finish, { end });
				} else if (isReadableStream(ret) || isIterable(ret)) {
					finishCount++;
					pumpToWeb(ret, stream, finish, { end });
				} else if (isTransformStream(ret)) {
					finishCount++;
					pumpToWeb(ret.readable, stream, finish, { end });
				} else throw new ERR_INVALID_ARG_TYPE("val", [
					"Readable",
					"Iterable",
					"AsyncIterable",
					"ReadableStream",
					"TransformStream"
				], ret);
				ret = stream;
			} else ret = Duplex.from(stream);
		}
		if (signal !== null && signal !== void 0 && signal.aborted || outerSignal !== null && outerSignal !== void 0 && outerSignal.aborted) process.nextTick(abort);
		return ret;
	}
	function pipe(src, dst, finish, { end }) {
		let ended = false;
		dst.on("close", () => {
			if (!ended) finish(new ERR_STREAM_PREMATURE_CLOSE());
		});
		src.pipe(dst, { end: false });
		if (end) {
			function endFn() {
				ended = true;
				dst.end();
			}
			if (isReadableFinished(src)) process.nextTick(endFn);
			else src.once("end", endFn);
		} else finish();
		eos(src, {
			readable: true,
			writable: false
		}, (err) => {
			const rState = src._readableState;
			if (err && err.code === "ERR_STREAM_PREMATURE_CLOSE" && rState && rState.ended && !rState.errored && !rState.errorEmitted) src.once("end", finish).once("error", finish);
			else finish(err);
		});
		return eos(dst, {
			readable: false,
			writable: true
		}, finish);
	}
	module.exports = {
		pipelineImpl,
		pipeline
	};
}));
//#endregion
//#region ../../../node_modules/.pnpm/readable-stream@4.7.0/node_modules/readable-stream/lib/internal/streams/compose.js
var require_compose = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const { pipeline } = require_pipeline();
	const Duplex = require_duplex();
	const { destroyer } = require_destroy();
	const { isNodeStream, isReadable, isWritable, isWebStream, isTransformStream, isWritableStream, isReadableStream } = require_utils$1();
	const { AbortError, codes: { ERR_INVALID_ARG_VALUE, ERR_MISSING_ARGS } } = require_errors();
	const eos = require_end_of_stream();
	module.exports = function compose(...streams) {
		if (streams.length === 0) throw new ERR_MISSING_ARGS("streams");
		if (streams.length === 1) return Duplex.from(streams[0]);
		const orgStreams = [...streams];
		if (typeof streams[0] === "function") streams[0] = Duplex.from(streams[0]);
		if (typeof streams[streams.length - 1] === "function") {
			const idx = streams.length - 1;
			streams[idx] = Duplex.from(streams[idx]);
		}
		for (let n = 0; n < streams.length; ++n) {
			if (!isNodeStream(streams[n]) && !isWebStream(streams[n])) continue;
			if (n < streams.length - 1 && !(isReadable(streams[n]) || isReadableStream(streams[n]) || isTransformStream(streams[n]))) throw new ERR_INVALID_ARG_VALUE(`streams[${n}]`, orgStreams[n], "must be readable");
			if (n > 0 && !(isWritable(streams[n]) || isWritableStream(streams[n]) || isTransformStream(streams[n]))) throw new ERR_INVALID_ARG_VALUE(`streams[${n}]`, orgStreams[n], "must be writable");
		}
		let ondrain;
		let onfinish;
		let onreadable;
		let onclose;
		let d;
		function onfinished(err) {
			const cb = onclose;
			onclose = null;
			if (cb) cb(err);
			else if (err) d.destroy(err);
			else if (!readable && !writable) d.destroy();
		}
		const head = streams[0];
		const tail = pipeline(streams, onfinished);
		const writable = !!(isWritable(head) || isWritableStream(head) || isTransformStream(head));
		const readable = !!(isReadable(tail) || isReadableStream(tail) || isTransformStream(tail));
		d = new Duplex({
			writableObjectMode: !!(head !== null && head !== void 0 && head.writableObjectMode),
			readableObjectMode: !!(tail !== null && tail !== void 0 && tail.readableObjectMode),
			writable,
			readable
		});
		if (writable) {
			if (isNodeStream(head)) {
				d._write = function(chunk, encoding, callback) {
					if (head.write(chunk, encoding)) callback();
					else ondrain = callback;
				};
				d._final = function(callback) {
					head.end();
					onfinish = callback;
				};
				head.on("drain", function() {
					if (ondrain) {
						const cb = ondrain;
						ondrain = null;
						cb();
					}
				});
			} else if (isWebStream(head)) {
				const writer = (isTransformStream(head) ? head.writable : head).getWriter();
				d._write = async function(chunk, encoding, callback) {
					try {
						await writer.ready;
						writer.write(chunk).catch(() => {});
						callback();
					} catch (err) {
						callback(err);
					}
				};
				d._final = async function(callback) {
					try {
						await writer.ready;
						writer.close().catch(() => {});
						onfinish = callback;
					} catch (err) {
						callback(err);
					}
				};
			}
			eos(isTransformStream(tail) ? tail.readable : tail, () => {
				if (onfinish) {
					const cb = onfinish;
					onfinish = null;
					cb();
				}
			});
		}
		if (readable) {
			if (isNodeStream(tail)) {
				tail.on("readable", function() {
					if (onreadable) {
						const cb = onreadable;
						onreadable = null;
						cb();
					}
				});
				tail.on("end", function() {
					d.push(null);
				});
				d._read = function() {
					while (true) {
						const buf = tail.read();
						if (buf === null) {
							onreadable = d._read;
							return;
						}
						if (!d.push(buf)) return;
					}
				};
			} else if (isWebStream(tail)) {
				const reader = (isTransformStream(tail) ? tail.readable : tail).getReader();
				d._read = async function() {
					while (true) try {
						const { value, done } = await reader.read();
						if (!d.push(value)) return;
						if (done) {
							d.push(null);
							return;
						}
					} catch {
						return;
					}
				};
			}
		}
		d._destroy = function(err, callback) {
			if (!err && onclose !== null) err = new AbortError();
			onreadable = null;
			ondrain = null;
			onfinish = null;
			if (onclose === null) callback(err);
			else {
				onclose = callback;
				if (isNodeStream(tail)) destroyer(tail, err);
			}
		};
		return d;
	};
}));
//#endregion
//#region ../../../node_modules/.pnpm/readable-stream@4.7.0/node_modules/readable-stream/lib/internal/streams/operators.js
var require_operators = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const AbortController = globalThis.AbortController || require_browser$2().AbortController;
	const { codes: { ERR_INVALID_ARG_VALUE, ERR_INVALID_ARG_TYPE, ERR_MISSING_ARGS, ERR_OUT_OF_RANGE }, AbortError } = require_errors();
	const { validateAbortSignal, validateInteger, validateObject } = require_validators();
	const kWeakHandler = require_primordials().Symbol("kWeak");
	const kResistStopPropagation = require_primordials().Symbol("kResistStopPropagation");
	const { finished } = require_end_of_stream();
	const staticCompose = require_compose();
	const { addAbortSignalNoValidate } = require_add_abort_signal();
	const { isWritable, isNodeStream } = require_utils$1();
	const { deprecate } = require_util();
	const { ArrayPrototypePush, Boolean, MathFloor, Number, NumberIsNaN, Promise, PromiseReject, PromiseResolve, PromisePrototypeThen, Symbol } = require_primordials();
	const kEmpty = Symbol("kEmpty");
	const kEof = Symbol("kEof");
	function compose(stream, options) {
		if (options != null) validateObject(options, "options");
		if ((options === null || options === void 0 ? void 0 : options.signal) != null) validateAbortSignal(options.signal, "options.signal");
		if (isNodeStream(stream) && !isWritable(stream)) throw new ERR_INVALID_ARG_VALUE("stream", stream, "must be writable");
		const composedStream = staticCompose(this, stream);
		if (options !== null && options !== void 0 && options.signal) addAbortSignalNoValidate(options.signal, composedStream);
		return composedStream;
	}
	function map(fn, options) {
		if (typeof fn !== "function") throw new ERR_INVALID_ARG_TYPE("fn", ["Function", "AsyncFunction"], fn);
		if (options != null) validateObject(options, "options");
		if ((options === null || options === void 0 ? void 0 : options.signal) != null) validateAbortSignal(options.signal, "options.signal");
		let concurrency = 1;
		if ((options === null || options === void 0 ? void 0 : options.concurrency) != null) concurrency = MathFloor(options.concurrency);
		let highWaterMark = concurrency - 1;
		if ((options === null || options === void 0 ? void 0 : options.highWaterMark) != null) highWaterMark = MathFloor(options.highWaterMark);
		validateInteger(concurrency, "options.concurrency", 1);
		validateInteger(highWaterMark, "options.highWaterMark", 0);
		highWaterMark += concurrency;
		return async function* map() {
			const signal = require_util().AbortSignalAny([options === null || options === void 0 ? void 0 : options.signal].filter(Boolean));
			const stream = this;
			const queue = [];
			const signalOpt = { signal };
			let next;
			let resume;
			let done = false;
			let cnt = 0;
			function onCatch() {
				done = true;
				afterItemProcessed();
			}
			function afterItemProcessed() {
				cnt -= 1;
				maybeResume();
			}
			function maybeResume() {
				if (resume && !done && cnt < concurrency && queue.length < highWaterMark) {
					resume();
					resume = null;
				}
			}
			async function pump() {
				try {
					for await (let val of stream) {
						if (done) return;
						if (signal.aborted) throw new AbortError();
						try {
							val = fn(val, signalOpt);
							if (val === kEmpty) continue;
							val = PromiseResolve(val);
						} catch (err) {
							val = PromiseReject(err);
						}
						cnt += 1;
						PromisePrototypeThen(val, afterItemProcessed, onCatch);
						queue.push(val);
						if (next) {
							next();
							next = null;
						}
						if (!done && (queue.length >= highWaterMark || cnt >= concurrency)) await new Promise((resolve) => {
							resume = resolve;
						});
					}
					queue.push(kEof);
				} catch (err) {
					const val = PromiseReject(err);
					PromisePrototypeThen(val, afterItemProcessed, onCatch);
					queue.push(val);
				} finally {
					done = true;
					if (next) {
						next();
						next = null;
					}
				}
			}
			pump();
			try {
				while (true) {
					while (queue.length > 0) {
						const val = await queue[0];
						if (val === kEof) return;
						if (signal.aborted) throw new AbortError();
						if (val !== kEmpty) yield val;
						queue.shift();
						maybeResume();
					}
					await new Promise((resolve) => {
						next = resolve;
					});
				}
			} finally {
				done = true;
				if (resume) {
					resume();
					resume = null;
				}
			}
		}.call(this);
	}
	function asIndexedPairs(options = void 0) {
		if (options != null) validateObject(options, "options");
		if ((options === null || options === void 0 ? void 0 : options.signal) != null) validateAbortSignal(options.signal, "options.signal");
		return async function* asIndexedPairs() {
			let index = 0;
			for await (const val of this) {
				var _options$signal;
				if (options !== null && options !== void 0 && (_options$signal = options.signal) !== null && _options$signal !== void 0 && _options$signal.aborted) throw new AbortError({ cause: options.signal.reason });
				yield [index++, val];
			}
		}.call(this);
	}
	async function some(fn, options = void 0) {
		for await (const unused of filter.call(this, fn, options)) return true;
		return false;
	}
	async function every(fn, options = void 0) {
		if (typeof fn !== "function") throw new ERR_INVALID_ARG_TYPE("fn", ["Function", "AsyncFunction"], fn);
		return !await some.call(this, async (...args) => {
			return !await fn(...args);
		}, options);
	}
	async function find(fn, options) {
		for await (const result of filter.call(this, fn, options)) return result;
	}
	async function forEach(fn, options) {
		if (typeof fn !== "function") throw new ERR_INVALID_ARG_TYPE("fn", ["Function", "AsyncFunction"], fn);
		async function forEachFn(value, options) {
			await fn(value, options);
			return kEmpty;
		}
		for await (const unused of map.call(this, forEachFn, options));
	}
	function filter(fn, options) {
		if (typeof fn !== "function") throw new ERR_INVALID_ARG_TYPE("fn", ["Function", "AsyncFunction"], fn);
		async function filterFn(value, options) {
			if (await fn(value, options)) return value;
			return kEmpty;
		}
		return map.call(this, filterFn, options);
	}
	var ReduceAwareErrMissingArgs = class extends ERR_MISSING_ARGS {
		constructor() {
			super("reduce");
			this.message = "Reduce of an empty stream requires an initial value";
		}
	};
	async function reduce(reducer, initialValue, options) {
		var _options$signal2;
		if (typeof reducer !== "function") throw new ERR_INVALID_ARG_TYPE("reducer", ["Function", "AsyncFunction"], reducer);
		if (options != null) validateObject(options, "options");
		if ((options === null || options === void 0 ? void 0 : options.signal) != null) validateAbortSignal(options.signal, "options.signal");
		let hasInitialValue = arguments.length > 1;
		if (options !== null && options !== void 0 && (_options$signal2 = options.signal) !== null && _options$signal2 !== void 0 && _options$signal2.aborted) {
			const err = new AbortError(void 0, { cause: options.signal.reason });
			this.once("error", () => {});
			await finished(this.destroy(err));
			throw err;
		}
		const ac = new AbortController();
		const signal = ac.signal;
		if (options !== null && options !== void 0 && options.signal) {
			const opts = {
				once: true,
				[kWeakHandler]: this,
				[kResistStopPropagation]: true
			};
			options.signal.addEventListener("abort", () => ac.abort(), opts);
		}
		let gotAnyItemFromStream = false;
		try {
			for await (const value of this) {
				var _options$signal3;
				gotAnyItemFromStream = true;
				if (options !== null && options !== void 0 && (_options$signal3 = options.signal) !== null && _options$signal3 !== void 0 && _options$signal3.aborted) throw new AbortError();
				if (!hasInitialValue) {
					initialValue = value;
					hasInitialValue = true;
				} else initialValue = await reducer(initialValue, value, { signal });
			}
			if (!gotAnyItemFromStream && !hasInitialValue) throw new ReduceAwareErrMissingArgs();
		} finally {
			ac.abort();
		}
		return initialValue;
	}
	async function toArray(options) {
		if (options != null) validateObject(options, "options");
		if ((options === null || options === void 0 ? void 0 : options.signal) != null) validateAbortSignal(options.signal, "options.signal");
		const result = [];
		for await (const val of this) {
			var _options$signal4;
			if (options !== null && options !== void 0 && (_options$signal4 = options.signal) !== null && _options$signal4 !== void 0 && _options$signal4.aborted) throw new AbortError(void 0, { cause: options.signal.reason });
			ArrayPrototypePush(result, val);
		}
		return result;
	}
	function flatMap(fn, options) {
		const values = map.call(this, fn, options);
		return async function* flatMap() {
			for await (const val of values) yield* val;
		}.call(this);
	}
	function toIntegerOrInfinity(number) {
		number = Number(number);
		if (NumberIsNaN(number)) return 0;
		if (number < 0) throw new ERR_OUT_OF_RANGE("number", ">= 0", number);
		return number;
	}
	function drop(number, options = void 0) {
		if (options != null) validateObject(options, "options");
		if ((options === null || options === void 0 ? void 0 : options.signal) != null) validateAbortSignal(options.signal, "options.signal");
		number = toIntegerOrInfinity(number);
		return async function* drop() {
			var _options$signal5;
			if (options !== null && options !== void 0 && (_options$signal5 = options.signal) !== null && _options$signal5 !== void 0 && _options$signal5.aborted) throw new AbortError();
			for await (const val of this) {
				var _options$signal6;
				if (options !== null && options !== void 0 && (_options$signal6 = options.signal) !== null && _options$signal6 !== void 0 && _options$signal6.aborted) throw new AbortError();
				if (number-- <= 0) yield val;
			}
		}.call(this);
	}
	function take(number, options = void 0) {
		if (options != null) validateObject(options, "options");
		if ((options === null || options === void 0 ? void 0 : options.signal) != null) validateAbortSignal(options.signal, "options.signal");
		number = toIntegerOrInfinity(number);
		return async function* take() {
			var _options$signal7;
			if (options !== null && options !== void 0 && (_options$signal7 = options.signal) !== null && _options$signal7 !== void 0 && _options$signal7.aborted) throw new AbortError();
			for await (const val of this) {
				var _options$signal8;
				if (options !== null && options !== void 0 && (_options$signal8 = options.signal) !== null && _options$signal8 !== void 0 && _options$signal8.aborted) throw new AbortError();
				if (number-- > 0) yield val;
				if (number <= 0) return;
			}
		}.call(this);
	}
	module.exports.streamReturningOperators = {
		asIndexedPairs: deprecate(asIndexedPairs, "readable.asIndexedPairs will be removed in a future version."),
		drop,
		filter,
		flatMap,
		map,
		take,
		compose
	};
	module.exports.promiseReturningOperators = {
		every,
		forEach,
		reduce,
		toArray,
		some,
		find
	};
}));
//#endregion
//#region ../../../node_modules/.pnpm/readable-stream@4.7.0/node_modules/readable-stream/lib/stream/promises.js
var require_promises = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const { ArrayPrototypePop, Promise } = require_primordials();
	const { isIterable, isNodeStream, isWebStream } = require_utils$1();
	const { pipelineImpl: pl } = require_pipeline();
	const { finished } = require_end_of_stream();
	require_stream();
	function pipeline(...streams) {
		return new Promise((resolve, reject) => {
			let signal;
			let end;
			const lastArg = streams[streams.length - 1];
			if (lastArg && typeof lastArg === "object" && !isNodeStream(lastArg) && !isIterable(lastArg) && !isWebStream(lastArg)) {
				const options = ArrayPrototypePop(streams);
				signal = options.signal;
				end = options.end;
			}
			pl(streams, (err, value) => {
				if (err) reject(err);
				else resolve(value);
			}, {
				signal,
				end
			});
		});
	}
	module.exports = {
		finished,
		pipeline
	};
}));
//#endregion
//#region ../../../node_modules/.pnpm/readable-stream@4.7.0/node_modules/readable-stream/lib/stream.js
var require_stream = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const { Buffer } = require_buffer();
	const { ObjectDefineProperty, ObjectKeys, ReflectApply } = require_primordials();
	const { promisify: { custom: customPromisify } } = require_util();
	const { streamReturningOperators, promiseReturningOperators } = require_operators();
	const { codes: { ERR_ILLEGAL_CONSTRUCTOR } } = require_errors();
	const compose = require_compose();
	const { setDefaultHighWaterMark, getDefaultHighWaterMark } = require_state();
	const { pipeline } = require_pipeline();
	const { destroyer } = require_destroy();
	const eos = require_end_of_stream();
	const promises = require_promises();
	const utils = require_utils$1();
	const Stream = module.exports = require_legacy().Stream;
	Stream.isDestroyed = utils.isDestroyed;
	Stream.isDisturbed = utils.isDisturbed;
	Stream.isErrored = utils.isErrored;
	Stream.isReadable = utils.isReadable;
	Stream.isWritable = utils.isWritable;
	Stream.Readable = require_readable();
	for (const key of ObjectKeys(streamReturningOperators)) {
		const op = streamReturningOperators[key];
		function fn(...args) {
			if (new.target) throw ERR_ILLEGAL_CONSTRUCTOR();
			return Stream.Readable.from(ReflectApply(op, this, args));
		}
		ObjectDefineProperty(fn, "name", {
			__proto__: null,
			value: op.name
		});
		ObjectDefineProperty(fn, "length", {
			__proto__: null,
			value: op.length
		});
		ObjectDefineProperty(Stream.Readable.prototype, key, {
			__proto__: null,
			value: fn,
			enumerable: false,
			configurable: true,
			writable: true
		});
	}
	for (const key of ObjectKeys(promiseReturningOperators)) {
		const op = promiseReturningOperators[key];
		function fn(...args) {
			if (new.target) throw ERR_ILLEGAL_CONSTRUCTOR();
			return ReflectApply(op, this, args);
		}
		ObjectDefineProperty(fn, "name", {
			__proto__: null,
			value: op.name
		});
		ObjectDefineProperty(fn, "length", {
			__proto__: null,
			value: op.length
		});
		ObjectDefineProperty(Stream.Readable.prototype, key, {
			__proto__: null,
			value: fn,
			enumerable: false,
			configurable: true,
			writable: true
		});
	}
	Stream.Writable = require_writable();
	Stream.Duplex = require_duplex();
	Stream.Transform = require_transform();
	Stream.PassThrough = require_passthrough();
	Stream.pipeline = pipeline;
	const { addAbortSignal } = require_add_abort_signal();
	Stream.addAbortSignal = addAbortSignal;
	Stream.finished = eos;
	Stream.destroy = destroyer;
	Stream.compose = compose;
	Stream.setDefaultHighWaterMark = setDefaultHighWaterMark;
	Stream.getDefaultHighWaterMark = getDefaultHighWaterMark;
	ObjectDefineProperty(Stream, "promises", {
		__proto__: null,
		configurable: true,
		enumerable: true,
		get() {
			return promises;
		}
	});
	ObjectDefineProperty(pipeline, customPromisify, {
		__proto__: null,
		enumerable: true,
		get() {
			return promises.pipeline;
		}
	});
	ObjectDefineProperty(eos, customPromisify, {
		__proto__: null,
		enumerable: true,
		get() {
			return promises.finished;
		}
	});
	Stream.Stream = Stream;
	Stream._isUint8Array = function isUint8Array(value) {
		return value instanceof Uint8Array;
	};
	Stream._uint8ArrayToBuffer = function _uint8ArrayToBuffer(chunk) {
		return Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
	};
}));
//#endregion
//#region ../../../node_modules/.pnpm/readable-stream@4.7.0/node_modules/readable-stream/lib/ours/browser.js
var require_browser = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const CustomStream = require_stream();
	const promises = require_promises();
	const originalDestroy = CustomStream.Readable.destroy;
	module.exports = CustomStream.Readable;
	module.exports._uint8ArrayToBuffer = CustomStream._uint8ArrayToBuffer;
	module.exports._isUint8Array = CustomStream._isUint8Array;
	module.exports.isDisturbed = CustomStream.isDisturbed;
	module.exports.isErrored = CustomStream.isErrored;
	module.exports.isReadable = CustomStream.isReadable;
	module.exports.Readable = CustomStream.Readable;
	module.exports.Writable = CustomStream.Writable;
	module.exports.Duplex = CustomStream.Duplex;
	module.exports.Transform = CustomStream.Transform;
	module.exports.PassThrough = CustomStream.PassThrough;
	module.exports.addAbortSignal = CustomStream.addAbortSignal;
	module.exports.finished = CustomStream.finished;
	module.exports.destroy = CustomStream.destroy;
	module.exports.destroy = originalDestroy;
	module.exports.pipeline = CustomStream.pipeline;
	module.exports.compose = CustomStream.compose;
	Object.defineProperty(CustomStream, "promises", {
		configurable: true,
		enumerable: true,
		get() {
			return promises;
		}
	});
	module.exports.Stream = CustomStream.Stream;
	module.exports.default = module.exports;
}));
//#endregion
//#region src/node/builtin_modules/implemented/stream.ts
var stream_exports = /* @__PURE__ */ __exportAll({
	Duplex: () => Duplex,
	PassThrough: () => PassThrough,
	Readable: () => Readable,
	Stream: () => StreamBase,
	Transform: () => Transform,
	Writable: () => Writable,
	__esModule: () => true,
	_isArrayBufferView: () => _isArrayBufferView,
	addAbortSignal: () => addAbortSignal,
	compose: () => compose,
	default: () => streamDefault,
	destroy: () => destroy,
	finished: () => finished,
	getDefaultHighWaterMark: () => getDefaultHighWaterMark,
	isDestroyed: () => isDestroyed,
	isDisturbed: () => isDisturbed,
	isErrored: () => isErrored,
	isReadable: () => isReadable,
	isWritable: () => isWritable,
	pipeline: () => pipeline,
	promises: () => promises$1,
	setDefaultHighWaterMark: () => setDefaultHighWaterMark
});
const { Duplex, PassThrough, Readable, Stream: StreamBase, Transform, Writable, addAbortSignal, compose, destroy, finished, isDisturbed, isErrored, isReadable, pipeline, promises: promises$1 } = (/* @__PURE__ */ __toESM(require_browser(), 1)).default;
const { getDefaultHighWaterMark, isDestroyed, isWritable, setDefaultHighWaterMark } = StreamBase;
if (getDefaultHighWaterMark(false) !== 64 * 1024) setDefaultHighWaterMark(false, 64 * 1024);
/**
* Test whether a value is an ArrayBuffer view.
* @param value - Candidate value.
* @returns Whether the value is a typed-array or DataView instance.
*/
const _isArrayBufferView = (value) => ArrayBuffer.isView(value);
/** Default-import namespace carrying Node's stream class and static helpers. */
const streamDefault = Object.assign(StreamBase, {
	_isArrayBufferView,
	getDefaultHighWaterMark,
	isDestroyed,
	isWritable,
	setDefaultHighWaterMark
});
//#endregion
//#region src/storage/paths.ts
/**
* Virtual root of the worker host's in-memory filesystem. Kept
* in one module so the process shim, the path/os shims, and the VFS image
* collector cannot drift apart.
*/
/** Virtual filesystem root; `process.cwd()` and every absolute path start here. */
const DSH_ROOT = "/dsh";
/** `$DSH_HOME`: durable-state directory inside the image. */
const DSH_HOME = `${DSH_ROOT}/home`;
/** Temporary directory reported by `os.tmpdir()`. */
const DSH_TMP = `${DSH_ROOT}/tmp`;
//#endregion
//#region src/node/builtin_modules/implemented/path.ts
/**
* `node:path` for the worker: the POSIX algorithm, transliterated from Node's
* implementation. It is NOT a face over the worker host's `posixPath`: that helper
* normalizes before splitting, so `dirname('/a/b/..')` answers `/` where Node
* answers `/a/b` (measured: 45 cases diverge between the normalizing helper and
* Node). `../../../../tests/node/path-diff.spec.ts` pins the port below to
* Node's answers.
* A `node:` proxy has to answer what Node answers, since VFS paths were built with
* Node semantics. `win32` members throw: the worker host reports
* `process.platform === 'linux'`, so a Windows branch means a bug.
*/
var path_exports = /* @__PURE__ */ __exportAll({
	__esModule: () => true,
	basename: () => basename,
	default: () => posix,
	delimiter: () => ":",
	dirname: () => dirname,
	extname: () => extname,
	format: () => format$1,
	isAbsolute: () => isAbsolute,
	join: () => join,
	normalize: () => normalize,
	parse: () => parse,
	posix: () => posix,
	relative: () => relative,
	resolve: () => resolve$1,
	sep: () => "/",
	toNamespacedPath: () => toNamespacedPath,
	win32: () => win32
});
const CHAR_DOT = 46;
const CHAR_FORWARD_SLASH = 47;
const cwd = () => {
	return globalThis.process?.cwd?.() ?? "/dsh";
};
function assertPath(path) {
	if (typeof path !== "string") throw new TypeError(`Path must be a string. Received ${JSON.stringify(path)}`);
}
/** Resolve `.` and `..` segments; `allowAboveRoot` keeps leading `..` for relative inputs. */
function normalizeString(path, allowAboveRoot) {
	let res = "";
	let lastSegmentLength = 0;
	let lastSlash = -1;
	let dots = 0;
	let code = 0;
	for (let i = 0; i <= path.length; ++i) {
		if (i < path.length) code = path.charCodeAt(i);
		else if (code === CHAR_FORWARD_SLASH) break;
		else code = CHAR_FORWARD_SLASH;
		if (code === CHAR_FORWARD_SLASH) {
			if (lastSlash === i - 1 || dots === 1) {} else if (dots === 2) {
				if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== CHAR_DOT || res.charCodeAt(res.length - 2) !== CHAR_DOT) {
					if (res.length > 2) {
						const lastSlashIndex = res.lastIndexOf("/");
						if (lastSlashIndex === -1) {
							res = "";
							lastSegmentLength = 0;
						} else {
							res = res.slice(0, lastSlashIndex);
							lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
						}
						lastSlash = i;
						dots = 0;
						continue;
					} else if (res.length !== 0) {
						res = "";
						lastSegmentLength = 0;
						lastSlash = i;
						dots = 0;
						continue;
					}
				}
				if (allowAboveRoot) {
					res += res.length > 0 ? "/.." : "..";
					lastSegmentLength = 2;
				}
			} else {
				if (res.length > 0) res += `/${path.slice(lastSlash + 1, i)}`;
				else res = path.slice(lastSlash + 1, i);
				lastSegmentLength = i - lastSlash - 1;
			}
			lastSlash = i;
			dots = 0;
		} else if (code === CHAR_DOT && dots !== -1) ++dots;
		else dots = -1;
	}
	return res;
}
/**
* Resolve a sequence of paths into an absolute path.
* @param paths - path segments, right to left until an absolute one is found.
* @returns the absolute, normalized path.
*/
function resolve$1(...paths) {
	let resolved = "";
	let absolute = false;
	for (let i = paths.length - 1; i >= 0 && !absolute; i--) {
		const path = paths[i];
		assertPath(path);
		if (path.length === 0) continue;
		resolved = resolved.length === 0 ? path : `${path}/${resolved}`;
		absolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
	}
	if (!absolute) {
		const base = cwd();
		resolved = resolved.length === 0 ? base : `${base}/${resolved}`;
		absolute = base.charCodeAt(0) === CHAR_FORWARD_SLASH;
	}
	const normalized = normalizeString(resolved, !absolute);
	if (absolute) return `/${normalized}`;
	return normalized.length > 0 ? normalized : ".";
}
/**
* Normalize a path, resolving `.`, `..`, and duplicate separators.
* @param path - the path.
* @returns the normalized path.
*/
function normalize(path) {
	assertPath(path);
	if (path.length === 0) return ".";
	const isAbsolutePath = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
	const trailingSeparator = path.charCodeAt(path.length - 1) === CHAR_FORWARD_SLASH;
	let normalized = normalizeString(path, !isAbsolutePath);
	if (normalized.length === 0) {
		if (isAbsolutePath) return "/";
		return trailingSeparator ? "./" : ".";
	}
	if (trailingSeparator) normalized += "/";
	return isAbsolutePath ? `/${normalized}` : normalized;
}
/**
* Whether the path is absolute.
* @param path - the path.
* @returns true when it starts at the root.
*/
function isAbsolute(path) {
	assertPath(path);
	return path.length > 0 && path.charCodeAt(0) === CHAR_FORWARD_SLASH;
}
/**
* Join path segments with the separator, then normalize.
* @param paths - the segments.
* @returns the joined path.
*/
function join(...paths) {
	if (paths.length === 0) return ".";
	let joined;
	for (const path of paths) {
		assertPath(path);
		if (path.length === 0) continue;
		joined = joined === void 0 ? path : `${joined}/${path}`;
	}
	return joined === void 0 ? "." : normalize(joined);
}
/**
* Relative path from one location to another.
* @param from - source path.
* @param to - target path.
* @returns the relative path, or '' when both resolve identically.
*/
function relative(from, to) {
	assertPath(from);
	assertPath(to);
	if (from === to) return "";
	const fromResolved = resolve$1(from);
	const toResolved = resolve$1(to);
	if (fromResolved === toResolved) return "";
	const fromParts = fromResolved.split("/").filter((part) => part.length > 0);
	const toParts = toResolved.split("/").filter((part) => part.length > 0);
	let shared = 0;
	while (shared < fromParts.length && shared < toParts.length && fromParts[shared] === toParts[shared]) shared++;
	return [...Array.from({ length: fromParts.length - shared }, () => ".."), ...toParts.slice(shared)].join("/");
}
/**
* Directory portion of a path (lexical, as Node defines it: no normalization).
* @param path - the path.
* @returns the parent directory.
*/
function dirname(path) {
	assertPath(path);
	if (path.length === 0) return ".";
	const hasRoot = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
	let end = -1;
	let matchedSlash = true;
	for (let i = path.length - 1; i >= 1; --i) if (path.charCodeAt(i) === CHAR_FORWARD_SLASH) {
		if (!matchedSlash) {
			end = i;
			break;
		}
	} else matchedSlash = false;
	if (end === -1) return hasRoot ? "/" : ".";
	if (hasRoot && end === 1) return "//";
	return path.slice(0, end);
}
/**
* Last portion of a path, optionally without a suffix (lexical, as in Node).
* @param path - the path.
* @param suffix - extension to strip when the base ends with it.
* @returns the base name.
*/
function basename(path, suffix) {
	assertPath(path);
	let start = 0;
	let end = -1;
	let matchedSlash = true;
	if (suffix !== void 0 && suffix.length > 0 && suffix.length <= path.length) {
		if (suffix === path) return "";
		let extIdx = suffix.length - 1;
		let firstNonSlashEnd = -1;
		for (let i = path.length - 1; i >= 0; --i) {
			const code = path.charCodeAt(i);
			if (code === CHAR_FORWARD_SLASH) {
				if (!matchedSlash) {
					start = i + 1;
					break;
				}
				continue;
			}
			if (firstNonSlashEnd === -1) {
				matchedSlash = false;
				firstNonSlashEnd = i + 1;
			}
			if (extIdx >= 0) if (code === suffix.charCodeAt(extIdx)) {
				if (--extIdx === -1) end = i;
			} else {
				extIdx = -1;
				end = firstNonSlashEnd;
			}
		}
		if (start === end) end = firstNonSlashEnd;
		else if (end === -1) end = path.length;
		return path.slice(start, end);
	}
	for (let i = path.length - 1; i >= 0; --i) if (path.charCodeAt(i) === CHAR_FORWARD_SLASH) {
		if (!matchedSlash) {
			start = i + 1;
			break;
		}
	} else if (end === -1) {
		matchedSlash = false;
		end = i + 1;
	}
	return end === -1 ? "" : path.slice(start, end);
}
/**
* Extension of the last path segment, including the leading dot.
* @param path - the path.
* @returns the extension, or '' when there is none.
*/
function extname(path) {
	assertPath(path);
	let startDot = -1;
	let startPart = 0;
	let end = -1;
	let matchedSlash = true;
	let preDotState = 0;
	for (let i = path.length - 1; i >= 0; --i) {
		const code = path.charCodeAt(i);
		if (code === CHAR_FORWARD_SLASH) {
			if (!matchedSlash) {
				startPart = i + 1;
				break;
			}
			continue;
		}
		if (end === -1) {
			matchedSlash = false;
			end = i + 1;
		}
		if (code === CHAR_DOT) {
			if (startDot === -1) startDot = i;
			else if (preDotState !== 1) preDotState = 1;
		} else if (startDot !== -1) preDotState = -1;
	}
	if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) return "";
	return path.slice(startDot, end);
}
/**
* Build a path from its parsed parts.
* @param pathObject - dir/root/base/name/ext parts.
* @returns the assembled path.
*/
function format$1(pathObject) {
	const dir = pathObject.dir ?? pathObject.root ?? "";
	const base = pathObject.base ?? `${pathObject.name ?? ""}${pathObject.ext ?? ""}`;
	if (dir === "") return base;
	return dir === pathObject.root ? `${dir}${base}` : `${dir}/${base}`;
}
/**
* Split a path into root/dir/base/ext/name (lexical, as in Node).
* @param path - the path.
* @returns the parsed parts.
*/
function parse(path) {
	assertPath(path);
	const base = basename(path);
	const ext = extname(path);
	const trimmed = path.length > 1 ? path.replace(/\/+$/, "") : path;
	const lastSlash = trimmed.lastIndexOf("/");
	const root = isAbsolute(path) ? "/" : "";
	return {
		root,
		dir: trimmed === "" ? root : lastSlash === -1 ? "" : lastSlash === 0 ? "/" : trimmed.slice(0, lastSlash),
		base,
		ext,
		name: ext.length > 0 ? base.slice(0, base.length - ext.length) : base
	};
}
/**
* Windows namespace prefixes do not exist here.
* @param path - the path.
* @returns the path unchanged.
*/
function toNamespacedPath(path) {
	return path;
}
/** POSIX member set: the module face, plus Node's self-referential namespaces. */
const posix = {
	resolve: resolve$1,
	normalize,
	isAbsolute,
	join,
	relative,
	dirname,
	basename,
	extname,
	format: format$1,
	parse,
	sep: "/",
	delimiter: ":",
	toNamespacedPath,
	get posix() {
		return posix;
	},
	get win32() {
		return win32;
	}
};
const win32Member = (name) => () => {
	throw new Error(`web-preview: node:path.win32.${name} is unreachable — the worker host reports platform "linux"`);
};
/** Windows member set: reaching it means a platform branch went the wrong way. */
const win32 = {
	resolve: win32Member("resolve"),
	normalize: win32Member("normalize"),
	isAbsolute: win32Member("isAbsolute"),
	join: win32Member("join"),
	relative: win32Member("relative"),
	dirname: win32Member("dirname"),
	basename: win32Member("basename"),
	extname: win32Member("extname"),
	format: win32Member("format"),
	parse: win32Member("parse"),
	toNamespacedPath: win32Member("toNamespacedPath"),
	sep: "\\",
	delimiter: ";"
};
//#endregion
//#region src/node/builtin_modules/implemented/abort-error.ts
/** Build the Node-style cancellation error shared by abortable builtin APIs. */
/**
* Create an `AbortError` carrying Node's stable error code.
* @param reason - Optional AbortSignal reason exposed as the error cause.
* @returns A Node-compatible abort error.
*/
function abortError$1(reason) {
	const error = /* @__PURE__ */ new Error("The operation was aborted");
	error.name = "AbortError";
	error.code = "ABORT_ERR";
	if (reason !== void 0) error.cause = reason;
	return error;
}
//#endregion
//#region src/node/builtin_modules/implemented/fs-watch.ts
/** Node filesystem watching over the active in-memory VFS. */
const asPath$1 = (path) => {
	if (typeof path === "string") return resolve$1(path);
	if (path instanceof URL) return resolve$1(decodeURIComponent(path.pathname));
	return resolve$1(new TextDecoder().decode(path));
};
const missingStats = (bigint) => ({
	size: bigint ? 0n : 0,
	ino: bigint ? 0n : 0,
	mtimeMs: bigint ? 0n : 0,
	ctimeMs: bigint ? 0n : 0,
	atimeMs: bigint ? 0n : 0,
	birthtimeMs: bigint ? 0n : 0,
	mtime: /* @__PURE__ */ new Date(0),
	mode: bigint ? 0n : 0,
	...bigint ? {
		dev: 0n,
		nlink: 0n,
		mtimeNs: 0n,
		ctimeNs: 0n,
		atimeNs: 0n,
		birthtimeNs: 0n,
		ctime: /* @__PURE__ */ new Date(0),
		atime: /* @__PURE__ */ new Date(0),
		birthtime: /* @__PURE__ */ new Date(0)
	} : {},
	isFile: () => false,
	isDirectory: () => false,
	isSymbolicLink: () => false,
	isFIFO: () => false,
	isSocket: () => false,
	isBlockDevice: () => false,
	isCharacterDevice: () => false
});
const statOrMissing = (path, bigint) => {
	try {
		return requireActiveVfs().statSync(path, { bigint });
	} catch (error) {
		if (error.code === "ENOENT") return missingStats(bigint);
		throw error;
	}
};
const statsChanged = (left, right) => left.size !== right.size || left.mtimeMs !== right.mtimeMs || left.mode !== right.mode || left.ino !== right.ino || left.isFile() !== right.isFile() || left.isDirectory() !== right.isDirectory();
const contains$1 = (parent, child) => parent === "/" || child === parent || child.startsWith(`${parent}/`);
const overlaps = (left, right) => contains$1(left, right) || contains$1(right, left);
/** `fs.FSWatcher` over VFS mutations. */
var FSWatcher = class extends EventEmitter {
	target;
	directory;
	options;
	disposeMutation;
	signal;
	onAbort;
	closed = false;
	referenced;
	constructor(target, directory, options, listener) {
		super();
		this.target = target;
		this.directory = directory;
		this.options = options;
		this.referenced = options.persistent ?? true;
		const context = captureAsyncContext();
		if (listener !== void 0) this.on("change", listener);
		this.disposeMutation = requireActiveVfs().subscribe((mutation) => {
			if (!this.matches(mutation)) return;
			const eventType = mutation.kind === "write" && !mutation.entryChanged || mutation.kind === "chmod" ? "change" : "rename";
			const filename = this.filename(mutation.path);
			queueMicrotask(() => {
				if (this.closed) return;
				runWithAsyncContext(context, () => {
					this.emit("change", eventType, filename);
				});
			});
		});
		this.signal = options.signal;
		this.onAbort = options.signal === void 0 ? void 0 : () => {
			this.close();
		};
		if (options.signal?.aborted === true) {
			this.close();
			return;
		}
		options.signal?.addEventListener("abort", this.onAbort, { once: true });
	}
	matches(mutation) {
		if (mutation.path === this.target) return true;
		if (mutation.kind === "remove" && contains$1(mutation.path, this.target)) return true;
		if (!this.directory || !contains$1(this.target, mutation.path)) return false;
		if (this.options.recursive === true) return true;
		const child = relative(this.target, mutation.path);
		return child !== "" && !child.startsWith("..") && !child.includes("/");
	}
	filename(path) {
		const relativePath = relative(this.target, path);
		const value = this.directory && contains$1(this.target, path) ? this.options.recursive === true ? relativePath : relativePath.split("/")[0] ?? "" : basename(this.target);
		return this.options.encoding === "buffer" ? import_buffer.Buffer.from(value) : value;
	}
	/** Stop observing and publish `close` once. */
	close() {
		if (this.closed) return;
		this.closed = true;
		this.disposeMutation();
		if (this.onAbort !== void 0) this.signal?.removeEventListener("abort", this.onAbort);
		queueMicrotask(() => {
			this.emit("close");
		});
	}
	/**
	* Mark this watcher as process-liveness-bearing.
	* @returns This watcher.
	*/
	ref() {
		this.referenced = true;
		return this;
	}
	/**
	* Clear the process-liveness flag; dedicated Workers have no ref-counted event loop.
	* @returns This watcher.
	*/
	unref() {
		this.referenced = false;
		return this;
	}
	/**
	* Read the retained process-liveness flag.
	* @returns Whether this watcher is marked as keeping its owner alive.
	*/
	hasRef() {
		return this.referenced;
	}
};
/**
* Watch one path through the active VFS.
* @param path - File or directory path.
* @param optionsOrListener - Watch options, encoding, or the change listener.
* @param maybeListener - Change listener when the second argument carries options.
* @returns The closeable watcher.
*/
function watch$1(path, optionsOrListener, maybeListener) {
	const options = typeof optionsOrListener === "object" ? optionsOrListener : typeof optionsOrListener === "string" ? { encoding: optionsOrListener } : {};
	const listener = typeof optionsOrListener === "function" ? optionsOrListener : maybeListener;
	const target = asPath$1(path);
	return new FSWatcher(target, requireActiveVfs().statSync(target).isDirectory(), options, listener);
}
/** `fs.StatWatcher` returned from `watchFile`. */
var StatWatcher = class extends EventEmitter {
	path;
	disposeMutation;
	timer;
	previous;
	stopped = false;
	referenced;
	context;
	interval;
	bigint;
	constructor(path, options) {
		super();
		this.path = path;
		this.referenced = options.persistent ?? true;
		this.interval = options.interval ?? 5007;
		this.bigint = options.bigint ?? false;
		this.previous = statOrMissing(path, this.bigint);
		this.context = captureAsyncContext();
		this.disposeMutation = requireActiveVfs().subscribe((mutation) => {
			if (overlaps(path, mutation.path)) this.schedule();
		});
		if (!this.previous.isFile() && !this.previous.isDirectory()) this.schedule(true);
	}
	schedule(initialMissing = false) {
		if (this.stopped || this.timer !== void 0) return;
		this.timer = setTimeout(() => {
			this.timer = void 0;
			if (this.stopped) return;
			const current = statOrMissing(this.path, this.bigint);
			const previous = this.previous;
			this.previous = current;
			if (initialMissing || statsChanged(current, previous)) runWithAsyncContext(this.context, () => {
				this.emit("change", current, previous);
			});
		}, this.interval);
		if (!this.referenced) timerUnref(this.timer);
	}
	/** Stop polling and release the VFS subscription. */
	stop() {
		if (this.stopped) return;
		this.stopped = true;
		this.disposeMutation();
		if (this.timer !== void 0) clearTimeout(this.timer);
		this.timer = void 0;
		this.emit("stop");
	}
	/** Alias used by callers treating the watcher as a closeable handle. */
	close() {
		this.stop();
	}
	/**
	* Mark this watcher as process-liveness-bearing.
	* @returns This watcher.
	*/
	ref() {
		this.referenced = true;
		if (this.timer !== void 0) timerRef(this.timer);
		return this;
	}
	/**
	* Mark this watcher as not keeping its owner alive.
	* @returns This watcher.
	*/
	unref() {
		this.referenced = false;
		if (this.timer !== void 0) timerUnref(this.timer);
		return this;
	}
	/**
	* Read the retained process-liveness flag.
	* @returns Whether this watcher is marked as keeping its owner alive.
	*/
	hasRef() {
		return this.referenced;
	}
};
/** Browser timers are numeric; Node timers expose optional liveness methods. */
const timerRef = (timer) => {
	timer.ref?.();
};
/** Browser timers are numeric; Node timers expose optional liveness methods. */
const timerUnref = (timer) => {
	timer.unref?.();
};
const statWatchers = /* @__PURE__ */ new Map();
/**
* Register a stat-poll watcher for one path.
* @param path - File or directory path, including a currently missing path.
* @param optionsOrListener - Polling options or the change listener.
* @param maybeListener - Change listener when the second argument carries options.
* @returns The path's shared stat watcher.
*/
function watchFile(path, optionsOrListener, maybeListener) {
	const options = typeof optionsOrListener === "function" ? {} : optionsOrListener;
	const listener = typeof optionsOrListener === "function" ? optionsOrListener : maybeListener;
	if (listener === void 0) throw new TypeError("The \"listener\" argument must be of type function");
	const target = asPath$1(path);
	let watcher = statWatchers.get(target);
	if (watcher === void 0) {
		watcher = new StatWatcher(target, options);
		statWatchers.set(target, watcher);
		watcher.once("stop", () => {
			statWatchers.delete(target);
		});
	}
	watcher.on("change", listener);
	return watcher;
}
/**
* Remove one listener or every listener for a path.
* @param path - Watched path.
* @param listener - Specific registration to remove; omission removes all registrations.
*/
function unwatchFile(path, listener) {
	const target = asPath$1(path);
	const watcher = statWatchers.get(target);
	if (watcher === void 0) return;
	if (listener === void 0) watcher.removeAllListeners("change");
	else watcher.removeListener("change", listener);
	if (watcher.listenerCount("change") === 0) watcher.stop();
}
/**
* Create the promise-based watch iterator over the callback watcher.
* @param path - File or directory path.
* @param options - Watch options and cancellation signal.
* @returns An iterator of change records that closes its watcher on return or failure.
*/
function watchAsync(path, options = {}) {
	const queued = [];
	const waiting = [];
	let watcher;
	let failure;
	let closed = false;
	const stopWatcher = () => {
		options.signal?.removeEventListener("abort", onAbort);
		watcher?.close();
	};
	const settleFailure = (reason) => {
		if (closed) return;
		const error = reason instanceof Error ? reason : new Error(String(reason));
		closed = true;
		queued.length = 0;
		stopWatcher();
		const failed = waiting.shift();
		if (failed === void 0) failure = error;
		else failed.reject(error);
		for (const pending of waiting.splice(0)) pending.resolve({
			done: true,
			value: void 0
		});
	};
	const onAbort = () => {
		settleFailure(abortError$1(options.signal?.reason));
	};
	const start = () => {
		if (watcher !== void 0 || closed || failure !== void 0) return;
		if (options.signal?.aborted === true) {
			settleFailure(abortError$1(options.signal.reason));
			return;
		}
		try {
			watcher = watch$1(path, options, (eventType, filename) => {
				const event = {
					eventType,
					filename
				};
				const pending = waiting.shift();
				if (pending === void 0) queued.push(event);
				else pending.resolve({
					done: false,
					value: event
				});
			});
			watcher.on("error", settleFailure);
			options.signal?.addEventListener("abort", onAbort, { once: true });
		} catch (error) {
			settleFailure(error);
		}
	};
	const close = () => {
		const alreadyClosed = closed;
		closed = true;
		queued.length = 0;
		failure = void 0;
		if (!alreadyClosed) stopWatcher();
		for (const pending of waiting.splice(0)) pending.resolve({
			done: true,
			value: void 0
		});
	};
	return {
		[Symbol.asyncIterator]() {
			return this;
		},
		next() {
			start();
			if (failure !== void 0) {
				const reason = failure;
				failure = void 0;
				return Promise.reject(reason);
			}
			const event = queued.shift();
			if (event !== void 0) return Promise.resolve({
				done: false,
				value: event
			});
			if (closed) return Promise.resolve({
				done: true,
				value: void 0
			});
			return new Promise((resolve, reject) => {
				waiting.push({
					resolve,
					reject
				});
			});
		},
		return() {
			close();
			return Promise.resolve({
				done: true,
				value: void 0
			});
		},
		throw(reason) {
			close();
			return Promise.reject(reason);
		}
	};
}
//#endregion
//#region src/node/builtin_modules/implemented/fs.ts
/**
* `node:fs` bridge over the worker's in-memory VFS. `MemoryVfs` owns paths,
* bytes, the directory tree, and Node's error codes; this module adds only what
* is Node-API-shaped and not VFS business: Buffer results, `Dirent` objects,
* file descriptors, `mkdtemp`, access checks, watchers, streams, and the promise face.
*/
var fs_exports = /* @__PURE__ */ __exportAll({
	Dirent: () => Dirent,
	FSWatcher: () => FSWatcher,
	ReadStream: () => ReadStream,
	StatWatcher: () => StatWatcher,
	WriteStream: () => WriteStream,
	__esModule: () => true,
	accessSync: () => accessSync,
	appendFileSync: () => appendFileSync,
	chmodSync: () => chmodSync,
	closeSync: () => closeSync,
	constants: () => constants$3,
	createReadStream: () => createReadStream,
	createWriteStream: () => createWriteStream,
	default: () => fs_default,
	existsSync: () => existsSync,
	linkSync: () => linkSync,
	lstat: () => lstat$1,
	lstatSync: () => lstatSync,
	mkdirSync: () => mkdirSync,
	mkdtempSync: () => mkdtempSync,
	openHandleSync: () => openHandleSync,
	openSync: () => openSync,
	opendirSync: () => opendirSync,
	promises: () => promises,
	readFileSync: () => readFileSync,
	readSync: () => readSync,
	readdirSync: () => readdirSync,
	realpathSync: () => realpathSync,
	renameSync: () => renameSync,
	rmSync: () => rmSync,
	stat: () => stat$2,
	statSync: () => statSync,
	unlinkSync: () => unlinkSync,
	unwatchFile: () => unwatchFile,
	watch: () => watch$1,
	watchFile: () => watchFile,
	writeFileSync: () => writeFileSync,
	writeSync: () => writeSync
});
const vfs = () => requireActiveVfs();
const asPath = (path) => {
	if (typeof path === "string") return path;
	if (path instanceof URL) return decodeURIComponent(path.pathname);
	return new TextDecoder().decode(path);
};
const encodingOf = (options) => {
	if (options === void 0 || options === null) return void 0;
	if (typeof options === "string") return options;
	return options.encoding ?? void 0;
};
const bytesOf = (path) => vfs().readFileSync(path);
/** Share the VFS bytes rather than copying them. */
const asBuffer = (bytes) => import_buffer.Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
/** Node `Dirent` subset returned by `readdirSync(dir, { withFileTypes: true })`. */
var Dirent = class {
	/** Entry name, without its directory. */
	name;
	/** Directory this entry was listed from. */
	parentPath;
	file;
	/**
	* Build one directory entry.
	* @param name - entry name.
	* @param parentPath - directory holding it.
	* @param file - whether the entry is a regular file.
	*/
	constructor(name, parentPath, file) {
		this.name = name;
		this.parentPath = parentPath;
		this.file = file;
	}
	/**
	* Entry kind, as `readdirSync` observed it.
	* @returns Whether the entry is a regular file.
	*/
	isFile() {
		return this.file;
	}
	/**
	* Entry kind, as `readdirSync` observed it.
	* @returns Whether the entry is a directory.
	*/
	isDirectory() {
		return !this.file;
	}
	/**
	* Symlink test, answered from the image's own shape.
	* @returns False — the image is materialized without symlinks.
	*/
	isSymbolicLink() {
		return false;
	}
};
/** Access-mode constants; the VFS has no permission model, so all bits pass. */
const constants$3 = {
	F_OK: 0,
	R_OK: 4,
	W_OK: 2,
	X_OK: 1,
	COPYFILE_EXCL: 1,
	O_RDONLY: 0,
	O_WRONLY: 1,
	O_RDWR: 2,
	O_CREAT: 64,
	O_TRUNC: 512,
	O_APPEND: 1024
};
/**
* Read a file.
* @param path - file path.
* @param options - encoding, or an options object carrying one.
* @returns bytes, or text when an encoding is given.
*/
function readFileSync(path, options) {
	const encoding = encodingOf(options);
	const bytes = bytesOf(asPath(path));
	return encoding === void 0 || encoding === "utf8" || encoding === "utf-8" ? encoding === void 0 ? asBuffer(bytes) : new TextDecoder().decode(bytes) : asBuffer(bytes).toString(encoding);
}
/**
* Write a file.
* @param path - file path.
* @param data - bytes or text.
* @param options - write flag and creation mode, forwarded to the VFS.
*/
function writeFileSync(path, data, options) {
	vfs().writeFileSync(asPath(path), data, options);
}
/**
* Append to a file, creating it when absent.
* @param path - file path.
* @param data - bytes or text.
*/
function appendFileSync(path, data) {
	vfs().appendFileSync(asPath(path), data);
}
/**
* Whether a path exists.
* @param path - the path.
* @returns true when present.
*/
function existsSync(path) {
	return vfs().existsSync(asPath(path));
}
/**
* Stat a path.
* @param path - the path.
* @param options - `bigint` selects the BigInt stats the filesystem service reads.
* @returns the stats, in the plain or BigInt shape.
*/
function statSync(path, options) {
	return vfs().statSync(asPath(path), options);
}
/**
* Read stats through Node's callback form.
* @param path - Path to stat.
* @param optionsOrCallback - Stat options or the completion callback.
* @param maybeCallback - Completion callback when options are present.
*/
function stat$2(path, optionsOrCallback, maybeCallback) {
	const options = typeof optionsOrCallback === "function" ? void 0 : optionsOrCallback;
	const callback = typeof optionsOrCallback === "function" ? optionsOrCallback : maybeCallback;
	if (callback === void 0) throw new TypeError("The \"callback\" argument must be of type function");
	queueMicrotask(() => {
		let result;
		try {
			result = statSync(path, options);
		} catch (error) {
			callback(error);
			return;
		}
		callback(null, result);
	});
}
/**
* Change an entry's permission bits; stat reads back exactly what was set.
* @param path - the path.
* @param mode - new permission bits (`0o777` mask), numeric or Node's octal string form.
*/
function chmodSync(path, mode) {
	vfs().chmodSync(asPath(path), typeof mode === "string" ? Number.parseInt(mode, 8) : mode);
}
/**
* Stat a path without following symlinks (the image has none).
* @param path - the path.
* @param options - `bigint` selects the BigInt stats the filesystem service reads.
* @returns the stats, in the plain or BigInt shape.
*/
function lstatSync(path, options) {
	return statSync(path, options);
}
/**
* Read link stats through Node's callback form; this symlink-free VFS delegates to stat.
* @param path - Path to stat.
* @param optionsOrCallback - Stat options or the completion callback.
* @param maybeCallback - Completion callback when options are present.
*/
function lstat$1(path, optionsOrCallback, maybeCallback) {
	stat$2(path, optionsOrCallback, maybeCallback);
}
/**
* Canonical path (normalization only: the image is symlink-free).
* @param path - the path.
* @returns the resolved path.
*/
function realpathSync(path) {
	return vfs().realpathSync(asPath(path));
}
/**
* List a directory.
* @param path - directory path.
* @param options - `withFileTypes` selects Dirent objects.
* @returns names, or Dirent objects.
*/
function readdirSync(path, options) {
	const target = asPath(path);
	const names = vfs().readdirSync(target);
	if (typeof options !== "object" || options === null || options.withFileTypes !== true) return names;
	return names.map((name) => new Dirent(name, target, vfs().statSync(`${target}/${name}`).isFile()));
}
/**
* Create a directory.
* @param path - directory path.
* @param options - `recursive` creates parents.
* @returns the first created path when recursive, else undefined.
*/
function mkdirSync(path, options) {
	return vfs().mkdirSync(asPath(path), options);
}
/**
* Create a uniquely named directory.
* @param prefix - path prefix; six random characters are appended.
* @returns the created directory path.
*/
function mkdtempSync(prefix) {
	const target = `${prefix}${Array.from(globalThis.crypto.getRandomValues(new Uint8Array(3)), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
	vfs().mkdirSync(target, { recursive: true });
	return target;
}
/**
* Remove a file or directory.
* @param path - the path.
* @param options - `recursive`/`force`, as in Node.
*/
function rmSync(path, options) {
	vfs().rmSync(asPath(path), options);
}
/**
* Remove a file.
* @param path - the path.
*/
function unlinkSync(path) {
	vfs().rmSync(asPath(path));
}
/**
* Rename a path.
* @param from - source path.
* @param to - target path.
*/
function renameSync(from, to) {
	vfs().renameSync(asPath(from), asPath(to));
}
/**
* Access check: existence only.
* @param path - the path.
*/
function accessSync(path) {
	vfs().realpathSync(asPath(path));
}
const openFiles = /* @__PURE__ */ new Map();
let nextFd = 3;
/**
* Open a file descriptor.
* @param path - file path.
* @param flags - Node flag string: 'r', 'w', 'a', with optional '+' and the
* exclusive 'x' (create-only) modifier.
* @param mode - creation permission bits.
* @returns the descriptor.
*/
function openSync(path, flags = "r", mode) {
	const target = asPath(path);
	const file = vfs().openFileSync(target, flags, mode);
	const fd = nextFd++;
	openFiles.set(fd, {
		file,
		position: 0
	});
	return fd;
}
const badFileDescriptor = (syscall) => {
	const error = /* @__PURE__ */ new Error(`EBADF: bad file descriptor, ${syscall}`);
	error.code = "EBADF";
	error.syscall = syscall;
	throw error;
};
const fileOf = (fd, syscall) => {
	const file = openFiles.get(fd);
	if (file === void 0) return badFileDescriptor(syscall);
	return file;
};
/**
* Read from a descriptor.
* @param fd - descriptor.
* @param buffer - destination.
* @param offset - destination offset.
* @param length - byte count.
* @param position - file position, or null to continue from the cursor.
* @returns bytes read.
*/
function readSync(fd, buffer, offset = 0, length = buffer.byteLength, position = null) {
	const file = fileOf(fd, "read");
	const from = position ?? file.position;
	const slice = file.file.read(from, length);
	buffer.set(slice, offset);
	if (position === null) file.position = from + slice.byteLength;
	return slice.byteLength;
}
/**
* Write through a descriptor.
* @param fd - descriptor.
* @param data - bytes or text.
* @returns bytes written.
*/
function writeSync(fd, data) {
	const file = fileOf(fd, "write");
	const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
	const position = file.file.append ? file.file.stat().size : file.position;
	const bytesWritten = file.file.write(position, bytes);
	file.position = position + bytesWritten;
	return bytesWritten;
}
/**
* Close a descriptor.
* @param fd - descriptor.
*/
function closeSync(fd) {
	if (!openFiles.delete(fd)) fileOf(fd, "close");
}
/**
* Create a second name for one file identity.
* @param from - existing path.
* @param to - new path.
*/
function linkSync(from, to) {
	vfs().linkSync(asPath(from), asPath(to));
}
/**
* Open a file handle. Directories open read-only, which is what the durability
* helpers do before an fsync.
* @param path - file or directory path.
* @param flags - Node flag string.
* @param mode - creation permission bits.
* @returns the handle.
*/
function openHandleSync(path, flags = "r", mode) {
	const target = asPath(path);
	const directory = vfs().existsSync(target) && vfs().statSync(target).isDirectory();
	const fd = directory ? -1 : openSync(target, flags, mode);
	let closed = false;
	const descriptor = (syscall) => fileOf(fd, syscall);
	return {
		fd,
		readFile: async (options) => {
			if (directory) return readFileSync(target, options);
			const open = descriptor("read");
			const bytes = open.file.read(open.position, Math.max(0, open.file.stat().size - open.position));
			open.position += bytes.length;
			const encoding = encodingOf(options);
			return encoding === void 0 || encoding === "utf8" || encoding === "utf-8" ? encoding === void 0 ? asBuffer(bytes) : new TextDecoder().decode(bytes) : asBuffer(bytes).toString(encoding);
		},
		writeFile: async (data) => {
			if (directory) writeFileSync(target, data);
			else writeSync(fd, data);
		},
		write: async (data) => ({ bytesWritten: writeSync(fd, data) }),
		read: async (buffer, offset = 0, length = buffer.byteLength, position = null) => ({
			bytesRead: readSync(fd, buffer, offset, length, position),
			buffer
		}),
		stat: async () => directory ? statSync(target) : descriptor("fstat").file.stat(),
		truncate: async (length = 0) => {
			if (directory) writeFileSync(target, new Uint8Array(length));
			else descriptor("ftruncate").file.truncate(length);
		},
		sync: async () => {
			await vfs().flush();
		},
		datasync: async () => {
			await vfs().flush();
		},
		close: async () => {
			if (closed) return;
			closed = true;
			if (fd !== -1) closeSync(fd);
		}
	};
}
/** Node implements file-stream `autoClose` through the stream's `autoDestroy` state. */
const streamAutoDestroy = (autoClose) => autoClose ?? true;
/** Release the descriptor and abort listener shared by both file-stream directions. */
function destroyFileStream(stream, signal, onAbort, error, callback) {
	signal?.removeEventListener("abort", onAbort);
	if (stream.fd !== null) closeSync(stream.fd);
	stream.fd = null;
	stream.pending = false;
	callback(error);
}
/** Register an optional completion callback and explicitly destroy a file stream. */
function closeFileStream(stream, callback) {
	if (callback !== void 0) stream.once("close", () => {
		callback(null);
	});
	stream.destroy();
}
/** Read stream over one VFS file. */
var ReadStream = class extends Readable {
	/** Resolved path opened by this stream. */
	path;
	/** Open descriptor, or null before open and after close. */
	fd = null;
	/** Whether the descriptor is still waiting to open. */
	pending = true;
	/** Bytes delivered by this stream. */
	bytesRead = 0;
	start;
	end;
	flags;
	signal;
	onAbort;
	position;
	constructor(path, options = {}) {
		super({
			autoDestroy: streamAutoDestroy(options.autoClose),
			emitClose: options.emitClose ?? true,
			highWaterMark: options.highWaterMark ?? 64 * 1024
		});
		this.path = asPath(path);
		this.start = options.start ?? 0;
		this.end = options.end ?? Number.POSITIVE_INFINITY;
		this.flags = options.flags ?? "r";
		this.position = this.start;
		this.signal = options.signal;
		this.onAbort = options.signal === void 0 ? void 0 : () => {
			this.destroy(abortError$1(options.signal?.reason));
		};
		if (options.encoding !== void 0 && options.encoding !== null) this.setEncoding(options.encoding);
		options.signal?.addEventListener("abort", this.onAbort, { once: true });
	}
	_construct(callback) {
		if (this.start < 0 || this.end < this.start) {
			callback(/* @__PURE__ */ new RangeError("The value of \"start\" is out of range"));
			return;
		}
		if (this.signal?.aborted === true) {
			callback(abortError$1(this.signal.reason));
			return;
		}
		let fd;
		try {
			fd = openSync(this.path, this.flags);
		} catch (error) {
			callback(error);
			return;
		}
		this.fd = fd;
		this.pending = false;
		callback();
		this.emit("open", fd);
		this.emit("ready");
	}
	_read(size) {
		if (this.fd === null) return;
		const remaining = this.end === Number.POSITIVE_INFINITY ? size : Math.min(size, this.end - this.position + 1);
		if (remaining <= 0) {
			this.push(null);
			return;
		}
		const buffer = import_buffer.Buffer.allocUnsafe(remaining);
		let count;
		try {
			count = readSync(this.fd, buffer, 0, remaining, this.position);
		} catch (error) {
			this.destroy(error);
			return;
		}
		if (count === 0) {
			this.push(null);
			return;
		}
		this.position += count;
		this.bytesRead += count;
		this.push(buffer.subarray(0, count));
	}
	_destroy(error, callback) {
		destroyFileStream(this, this.signal, this.onAbort, error, callback);
	}
	/**
	* Close the stream and release its descriptor.
	* @param callback - Optional completion callback after `close`.
	*/
	close(callback) {
		closeFileStream(this, callback);
	}
};
/** Writable stream committing chunks through the VFS file-descriptor face. */
var WriteStream = class extends Writable {
	/** Resolved path opened by this stream. */
	path;
	/** Open descriptor, or null before open and after close. */
	fd = null;
	/** Whether the descriptor is still waiting to open. */
	pending = true;
	/** Bytes committed by this stream. */
	bytesWritten = 0;
	flags;
	mode;
	start;
	signal;
	onAbort;
	constructor(path, options = {}) {
		super({
			autoDestroy: streamAutoDestroy(options.autoClose),
			decodeStrings: true,
			defaultEncoding: options.encoding ?? "utf8",
			emitClose: options.emitClose ?? true,
			highWaterMark: options.highWaterMark ?? 64 * 1024
		});
		this.path = asPath(path);
		this.flags = options.flags ?? "w";
		this.mode = options.mode;
		this.start = options.start;
		this.signal = options.signal;
		this.onAbort = options.signal === void 0 ? void 0 : () => {
			this.destroy(abortError$1(options.signal?.reason));
		};
		options.signal?.addEventListener("abort", this.onAbort, { once: true });
	}
	_construct(callback) {
		if (this.start !== void 0 && this.start < 0) {
			callback(/* @__PURE__ */ new RangeError("The value of \"start\" is out of range"));
			return;
		}
		if (this.signal?.aborted === true) {
			callback(abortError$1(this.signal.reason));
			return;
		}
		let fd;
		try {
			fd = openSync(this.path, this.flags, this.mode);
		} catch (error) {
			callback(error);
			return;
		}
		this.fd = fd;
		if (this.start !== void 0) fileOf(fd, "write").position = this.start;
		this.pending = false;
		callback();
		this.emit("open", fd);
		this.emit("ready");
	}
	_write(chunk, encoding, callback) {
		try {
			const fd = this.fd;
			if (fd === null) return badFileDescriptor("write");
			const data = typeof chunk === "string" ? import_buffer.Buffer.from(chunk, encoding) : chunk;
			this.bytesWritten += writeSync(fd, data);
			callback();
		} catch (error) {
			callback(error);
		}
	}
	_destroy(error, callback) {
		destroyFileStream(this, this.signal, this.onAbort, error, callback);
	}
	/**
	* Close the stream and release its descriptor.
	* @param callback - Optional completion callback after `close`.
	*/
	close(callback) {
		closeFileStream(this, callback);
	}
};
/**
* Create a Node-compatible readable file stream over the VFS.
* @param path - File path.
* @param options - Encoding, range, open, buffer, and abort options.
* @returns The readable file stream.
*/
function createReadStream(path, options) {
	return new ReadStream(path, typeof options === "string" ? { encoding: options } : options);
}
/**
* Create a Node-compatible writable file stream over the VFS.
* @param path - File path.
* @param options - Encoding, open, buffer, and abort options.
* @returns The writable file stream.
*/
function createWriteStream(path, options) {
	return new WriteStream(path, typeof options === "string" ? { encoding: options } : options);
}
/**
* Open a directory handle. Callers use it to assert "this path is a directory"
* and to walk entries; the listing is taken once, since the VFS has no external
* writer to race with.
* @param path - directory path.
* @returns the handle.
*/
function opendirSync(path) {
	const target = asPath(path);
	const entries = readdirSync(target, { withFileTypes: true });
	let index = 0;
	const next = () => entries[index++] ?? null;
	return {
		path: target,
		read: async () => next(),
		close: async () => {
			index = entries.length;
		},
		closeSync: () => {
			index = entries.length;
		},
		async *[Symbol.asyncIterator]() {
			for (let entry = next(); entry !== null; entry = next()) yield entry;
		}
	};
}
/**
* Promise face (`node:fs/promises`) over the same VFS. Each member answers the
* union the VFS produces rather than Node's encoding-dependent overloads, so the
* check here is that every name is a real `node:fs/promises` export.
*/
const promises = {
	readFile: async (path, options) => readFileSync(path, options),
	writeFile: async (path, data, options) => {
		const flag = typeof options === "object" && options !== null ? options.flag : void 0;
		const mode = typeof options === "object" && options !== null ? options.mode : void 0;
		if (flag !== void 0 && flag.includes("x") && existsSync(path)) {
			const error = /* @__PURE__ */ new Error(`EEXIST: file already exists, open '${asPath(path)}'`);
			error.code = "EEXIST";
			throw error;
		}
		if (flag !== void 0 && flag.startsWith("a")) appendFileSync(path, data);
		else writeFileSync(path, data, {
			...flag === void 0 ? {} : { flag },
			...mode === void 0 ? {} : { mode }
		});
	},
	appendFile: async (path, data) => {
		appendFileSync(path, data);
	},
	mkdir: async (path, options) => mkdirSync(path, options),
	mkdtemp: async (prefix) => mkdtempSync(prefix),
	readdir: async (path, options) => readdirSync(path, options),
	stat: async (path, options) => statSync(path, options),
	lstat: async (path, options) => lstatSync(path, options),
	realpath: async (path) => realpathSync(path),
	rm: async (path, options) => {
		rmSync(path, options);
	},
	unlink: async (path) => {
		unlinkSync(path);
	},
	rename: async (from, to) => {
		renameSync(from, to);
	},
	access: async (path) => {
		accessSync(path);
	},
	chmod: async (path, mode) => {
		chmodSync(path, mode);
	},
	cp: async (from, to) => {
		const source = asPath(from);
		const target = asPath(to);
		if (statSync(source).isDirectory()) {
			mkdirSync(target, { recursive: true });
			for (const name of vfs().readdirSync(source)) await promises.cp(`${source}/${name}`, `${target}/${name}`);
			return;
		}
		mkdirSync(dirname(target), { recursive: true });
		writeFileSync(target, bytesOf(source));
	},
	link: async (from, to) => {
		linkSync(from, to);
	},
	open: async (path, flags, mode) => openHandleSync(path, flags, mode),
	opendir: async (path) => opendirSync(path),
	truncate: async (path, length = 0) => {
		vfs().truncateSync(asPath(path), length);
	},
	watch: watchAsync,
	constants: constants$3
};
/** CommonJS default export: the members `require()` hands a caller of this module. */
var fs_default = {
	constants: constants$3,
	promises,
	Dirent,
	FSWatcher,
	StatWatcher,
	ReadStream,
	WriteStream,
	readFileSync,
	writeFileSync,
	appendFileSync,
	existsSync,
	statSync,
	stat: stat$2,
	lstatSync,
	lstat: lstat$1,
	realpathSync,
	chmodSync,
	readdirSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	unlinkSync,
	renameSync,
	accessSync,
	opendirSync,
	openHandleSync,
	linkSync,
	openSync,
	readSync,
	writeSync,
	closeSync,
	watch: watch$1,
	watchFile,
	unwatchFile,
	createReadStream,
	createWriteStream
};
//#endregion
//#region src/node/builtin_modules/implemented/fs/promises.ts
/**
* `node:fs/promises` face: the promise members of the VFS bridge, re-exported as
* named bindings so `import { readFile } from 'node:fs/promises'` resolves. The
* member set is checked against Node where it is built, on `promises` in
* `../fs.ts`.
*/
var promises_exports$1 = /* @__PURE__ */ __exportAll({
	Dirent: () => Dirent,
	__esModule: () => true,
	access: () => access,
	appendFile: () => appendFile,
	chmod: () => chmod,
	constants: () => constants$2,
	cp: () => cp$1,
	default: () => promises_default$1,
	link: () => link,
	lstat: () => lstat,
	mkdir: () => mkdir$1,
	mkdtemp: () => mkdtemp,
	open: () => open$1,
	opendir: () => opendir,
	readFile: () => readFile,
	readdir: () => readdir,
	realpath: () => realpath,
	rename: () => rename,
	rm: () => rm$1,
	stat: () => stat$1,
	truncate: () => truncate,
	unlink: () => unlink,
	watch: () => watch,
	writeFile: () => writeFile
});
/** The promise members of the VFS bridge, as `node:fs/promises` names them. */
const { readFile, writeFile, appendFile, mkdir: mkdir$1, mkdtemp, readdir, stat: stat$1, lstat, realpath, rm: rm$1, unlink, rename, access, chmod, cp: cp$1, link, open: open$1, opendir, truncate, watch, constants: constants$2 } = promises;
var promises_default$1 = promises;
//#endregion
//#region src/node/builtin_modules/implemented/http.ts
var http_exports = /* @__PURE__ */ __exportAll({
	STATUS_CODES: () => STATUS_CODES,
	Server: () => FakeServer,
	ServerResponse: () => ServerResponse,
	__esModule: () => true,
	createServer: () => createServer$1,
	default: () => http_default,
	get: () => get,
	request: () => request,
	requestListener: () => requestListener,
	whenRequestListener: () => whenRequestListener
});
/** Port reported by `address()`; it becomes `webServer.port`. */
const VIRTUAL_PORT = 3080;
let captured;
const waiting = /* @__PURE__ */ new Set();
/**
* The webserver's request listener, once `[Service.init]` has installed it.
* @returns the listener, or undefined before the webserver row activates.
*/
function requestListener() {
	return captured;
}
/**
* Await the request listener.
* @returns a promise resolved with the listener as soon as it is captured.
*/
async function whenRequestListener() {
	if (captured !== void 0) return captured;
	return await new Promise((resolve) => waiting.add(resolve));
}
/** Fake Server: event registrations are stored and never emitted. */
var FakeServer = class {
	listeners = /* @__PURE__ */ new Map();
	/**
	* Register an event listener (`upgrade`, `error`); never emitted.
	* @param event - event name.
	* @param listener - the listener.
	* @returns this server.
	*/
	on(event, listener) {
		const set = this.listeners.get(event) ?? /* @__PURE__ */ new Set();
		set.add(listener);
		this.listeners.set(event, set);
		return this;
	}
	/**
	* One-shot registration counterpart of {@link on}.
	* @param event - event name.
	* @param listener - the listener.
	* @returns this server.
	*/
	once(event, listener) {
		return this.on(event, listener);
	}
	/**
	* Remove a listener.
	* @param event - event name.
	* @param listener - the listener.
	* @returns this server.
	*/
	off(event, listener) {
		this.listeners.get(event)?.delete(listener);
		return this;
	}
	/**
	* Bind: succeeds immediately. The callback must run or the webserver fiber
	* stays in LOADING forever.
	* @param args - Node's listen arguments; only a trailing callback matters.
	* @returns this server.
	*/
	listen(...args) {
		const callback = args.at(-1);
		if (typeof callback === "function") queueMicrotask(() => {
			callback();
		});
		return this;
	}
	/**
	* Bound address.
	* @returns the loopback authority the tunnel synthesizes.
	*/
	address() {
		return {
			address: "127.0.0.1",
			family: "IPv4",
			port: VIRTUAL_PORT
		};
	}
	/**
	* Close: no socket to release.
	* @param callback - completion callback, invoked immediately.
	* @returns this server.
	*/
	close(callback) {
		if (callback !== void 0) queueMicrotask(() => {
			callback();
		});
		return this;
	}
	/** No connection was ever accepted. */
	closeAllConnections() {}
	/** No idle connection exists either. */
	closeIdleConnections() {}
};
/**
* Constructor marker read by middleware during feature detection. Tunnel
* responses are synthesized objects and are never instances of this class.
*/
var ServerResponse = class {};
/**
* Create the fake server and retain its request listener for the tunnel.
* @param listener - the request listener the webserver installs.
* @returns the fake Server.
*/
function createServer$1(listener) {
	if (listener !== void 0) {
		captured = listener;
		for (const resolve of waiting) resolve(listener);
		waiting.clear();
	}
	return new FakeServer();
}
/**
* Outbound HTTP has one carrier in the worker: `fetch`.
* @returns Never — it throws naming the unavailable member.
*/
function request() {
	throw new Error("web-preview: node:http.request is not available in the worker host — use fetch");
}
/**
* Same as {@link request}.
* @returns Never — it throws naming the unavailable member.
*/
function get() {
	throw new Error("web-preview: node:http.get is not available in the worker host — use fetch");
}
/** Status text table Node exposes; a few handlers write status lines by hand. */
const STATUS_CODES = {
	200: "OK",
	204: "No Content",
	304: "Not Modified",
	400: "Bad Request",
	403: "Forbidden",
	404: "Not Found",
	405: "Method Not Allowed",
	413: "Payload Too Large",
	415: "Unsupported Media Type",
	426: "Upgrade Required",
	500: "Internal Server Error",
	503: "Service Unavailable"
};
/** CommonJS default export: the members `require()` hands a caller of this module. */
var http_default = {
	createServer: createServer$1,
	request,
	get,
	STATUS_CODES,
	Server: FakeServer,
	ServerResponse
};
//#endregion
//#region src/node/builtin_modules/implemented/module.ts
/**
* `node:module` for the worker: `createRequire` hands out the worker module
* loader's synchronous require. Typert can resolve package exports, and package
* inventory can discover manifests through `require.resolve.paths()` without
* either consumer changing for the Worker.
*/
var module_exports = /* @__PURE__ */ __exportAll({
	__esModule: () => true,
	builtinModules: () => builtinModules,
	createRequire: () => createRequire,
	default: () => module_default,
	isBuiltin: () => isBuiltin,
	register: () => register,
	stripTypeScriptTypes: () => stripTypeScriptTypes,
	syncBuiltinESMExports: () => syncBuiltinESMExports
});
/**
* Build a `require` bound to a base path or file URL.
* @param base - directory, file path, or file URL the resolution starts from.
* @returns the synchronous require face, including `resolve()` and `resolve.paths()`.
*/
function createRequire(base) {
	return requireActiveModuleLoader().createRequire(base);
}
/** Builtin specifiers the module proxy table answers (without the `node:` prefix). */
const builtinModules = [
	"assert",
	"async_hooks",
	"buffer",
	"child_process",
	"crypto",
	"events",
	"fs",
	"http",
	"module",
	"net",
	"os",
	"path",
	"process",
	"stream",
	"tty",
	"url",
	"util",
	"worker_threads"
];
/**
* Whether a specifier names a Node builtin.
* @param specifier - the module specifier.
* @returns true for builtin names, with or without the `node:` prefix.
*/
function isBuiltin(specifier) {
	return builtinModules.includes(specifier.replace(/^node:/, ""));
}
/**
* TypeScript stripping is a Node 22+ loader feature with no worker counterpart.
* @returns Never — it throws naming the unavailable member.
*/
function stripTypeScriptTypes() {
	throw new Error("web-preview: node:module.stripTypeScriptTypes is not available in the worker host");
}
/**
* Loader hooks have no meaning here: the worker loader owns resolution.
* @returns Never — it throws naming the unavailable member.
*/
function register() {
	throw new Error("web-preview: node:module.register is not available in the worker host");
}
/** ESM/CJS export syncing is a no-op: the worker loader materializes CommonJS only. */
function syncBuiltinESMExports() {}
/** CommonJS default export: the members `require()` hands a caller of this module. */
var module_default = {
	createRequire,
	builtinModules,
	isBuiltin,
	register,
	syncBuiltinESMExports,
	stripTypeScriptTypes
};
//#endregion
//#region src/node/builtin_modules/implemented/os.ts
/**
* `node:os` for the worker: every value points into the VFS or reports the fixed
* platform identity the host tree is built for (`linux`, one CPU). Values are
* real rather than throwing because several `[Service.init]` bodies read them
* during construction.
*/
var os_exports = /* @__PURE__ */ __exportAll({
	EOL: () => "\n",
	__esModule: () => true,
	arch: () => arch,
	availableParallelism: () => availableParallelism,
	constants: () => constants$1,
	cpus: () => cpus,
	default: () => os_default,
	homedir: () => homedir,
	hostname: () => hostname,
	networkInterfaces: () => networkInterfaces,
	platform: () => platform,
	release: () => release,
	tmpdir: () => tmpdir,
	type: () => type
});
/**
* Temporary directory.
* @returns the VFS temp path.
*/
function tmpdir() {
	return DSH_TMP;
}
/**
* Home directory.
* @returns `$DSH_HOME` inside the VFS.
*/
function homedir() {
	return DSH_HOME;
}
/**
* Platform identity.
* @returns always 'linux'.
*/
function platform() {
	return "linux";
}
/**
* Operating-system type.
* @returns always 'Linux'.
*/
function type() {
	return "Linux";
}
/**
* CPU architecture.
* @returns always 'x64'.
*/
function arch() {
	return "x64";
}
/**
* Kernel release.
* @returns a synthetic release string.
*/
function release() {
	return "0.0.0-dsh-worker";
}
/**
* Host name.
* @returns a synthetic name.
*/
function hostname() {
	return "dsh-worker";
}
/**
* Usable parallelism.
* @returns the browser's hardware concurrency, at least 1.
*/
function availableParallelism() {
	return Math.max(1, navigator.hardwareConcurrency);
}
/**
* CPU inventory.
* @returns an empty list (no per-core facts inside a worker).
*/
function cpus() {
	return [];
}
/**
* Network interfaces.
* @returns an empty record — the worker webserver binds the loopback literal, so
* no LAN address is ever derived.
*/
function networkInterfaces() {
	return {};
}
/** OS constants: only the signal table is read (terminal signal name mapping). */
const constants$1 = {
	signals: {
		SIGHUP: 1,
		SIGINT: 2,
		SIGQUIT: 3,
		SIGILL: 4,
		SIGTRAP: 5,
		SIGABRT: 6,
		SIGBUS: 7,
		SIGFPE: 8,
		SIGKILL: 9,
		SIGUSR1: 10,
		SIGSEGV: 11,
		SIGUSR2: 12,
		SIGPIPE: 13,
		SIGALRM: 14,
		SIGTERM: 15
	},
	errno: {},
	priority: {}
};
/** CommonJS default export: the members `require()` hands a caller of this module. */
var os_default = {
	EOL: "\n",
	tmpdir,
	homedir,
	platform,
	type,
	arch,
	release,
	hostname,
	availableParallelism,
	cpus,
	networkInterfaces,
	constants: constants$1
};
//#endregion
//#region src/node/builtin_modules/implemented/perf_hooks.ts
/**
* `node:perf_hooks`: the worker's own high-resolution clock.
*/
var perf_hooks_exports = /* @__PURE__ */ __exportAll({
	PerformanceObserver: () => PerformanceObserver,
	__esModule: () => true,
	default: () => perf_hooks_default,
	performance: () => performance$1
});
const MODULE$9 = "node:perf_hooks";
/** Same clock object the worker global exposes. */
const performance$1 = globalThis.performance;
/** Observation of performance entries has no consumer here. */
const PerformanceObserver = notImplementedFail(MODULE$9, "PerformanceObserver");
/** CommonJS default export: the members `require()` hands a caller of this module. */
var perf_hooks_default = {
	performance: performance$1,
	PerformanceObserver
};
//#endregion
//#region src/node/builtin_modules/implemented/timers/promises.ts
var promises_exports = /* @__PURE__ */ __exportAll({
	__esModule: () => true,
	default: () => promises_default,
	scheduler: () => scheduler,
	setImmediate: () => setImmediate,
	setTimeout: () => setTimeout$1
});
/** The rejection an aborted wait reports, as Node and the DOM both spell it. */
const abortError = () => new DOMException("The operation was aborted.", "AbortError");
/**
* Resolve after a delay.
* @param delayMs - milliseconds to wait.
* @param value - value to resolve with; Node resolves undefined when none is handed in.
* @param options - abort support, as Node provides.
* @returns the value after the delay, or a rejection when the signal aborts.
*/
function setTimeout$1(delayMs, value, options) {
	return new Promise((resolve, reject) => {
		if (options?.signal?.aborted === true) {
			reject(abortError());
			return;
		}
		const timer = globalThis.setTimeout(() => {
			resolve(value);
		}, delayMs);
		options?.signal?.addEventListener("abort", () => {
			globalThis.clearTimeout(timer);
			reject(abortError());
		}, { once: true });
	});
}
/**
* Resolve on the next macrotask.
* @param value - resolution value handed back after the timer.
* @returns a promise resolved after a zero-delay timer.
*/
function setImmediate(value) {
	return setTimeout$1(0, value);
}
/** Cooperative scheduling helpers Node exposes on this module. */
const scheduler = {
	wait: async (delayMs, options) => {
		await setTimeout$1(delayMs, void 0, options);
	},
	yield: async () => {
		await setTimeout$1(0);
	}
};
/** CommonJS default export: the members `require()` hands a caller of this module. */
var promises_default = {
	setTimeout: setTimeout$1,
	setImmediate,
	scheduler
};
//#endregion
//#region src/node/builtin_modules/implemented/tty.ts
var tty_exports = /* @__PURE__ */ __exportAll({
	__esModule: () => true,
	default: () => tty_default,
	isatty: () => isatty
});
/**
* `node:tty` for the browser worker. The host has no terminal-backed file
* descriptors, so terminal detection is always false.
*/
/**
* Test whether a numeric file descriptor refers to a terminal.
* @param _fd - File descriptor to inspect.
* @returns Always false in the browser worker.
*/
function isatty(_fd) {
	return false;
}
/** CommonJS default export: the members `require()` hands a caller of this module. */
var tty_default = { isatty };
//#endregion
//#region src/node/builtin_modules/implemented/url.ts
var url_exports = /* @__PURE__ */ __exportAll({
	URL: () => UrlClass,
	URLSearchParams: () => UrlSearchParamsClass,
	__esModule: () => true,
	default: () => url_default,
	fileURLToPath: () => fileURLToPath,
	pathToFileURL: () => pathToFileURL,
	resolve: () => resolve
});
/**
* `node:url` for the worker: the two conversions the host tree uses, plus the
* WHATWG classes the browser already provides. VFS paths are POSIX, so the
* file-URL mapping is the simple percent-encoding pair.
*/
/**
* Filesystem path of a `file:` URL.
* @param url - file URL or its string form.
* @returns the decoded POSIX path.
*/
function fileURLToPath(url) {
	const parsed = typeof url === "string" ? new URL(url) : url;
	if (parsed.protocol !== "file:") throw new TypeError(`The URL must be of scheme file (received ${parsed.protocol})`);
	return decodeURIComponent(parsed.pathname);
}
/**
* `file:` URL of a filesystem path.
* @param path - absolute or relative POSIX path.
* @returns the URL.
*/
function pathToFileURL(path) {
	const escaped = path.replaceAll("%", "%25").replaceAll("\\", "%5C").replaceAll("\n", "%0A").replaceAll("\r", "%0D").replaceAll("	", "%09");
	const url = new globalThis.URL("file:///");
	url.pathname = escaped.startsWith("/") ? escaped : `/${escaped}`;
	return url;
}
/**
* Absolute URL from a specifier and its base.
* @param specifier - relative or absolute specifier.
* @param base - base URL.
* @returns the resolved URL string.
*/
function resolve(specifier, base) {
	return new URL(specifier, base).toString();
}
/** WHATWG URL class, as `node:url` re-exports it. */
const UrlClass = globalThis.URL;
/** WHATWG URLSearchParams class, as `node:url` re-exports it. */
const UrlSearchParamsClass = globalThis.URLSearchParams;
/** CommonJS default export: the members `require()` hands a caller of this module. */
var url_default = {
	fileURLToPath,
	pathToFileURL,
	resolve,
	URL: UrlClass,
	URLSearchParams: UrlSearchParamsClass
};
//#endregion
//#region src/node/builtin_modules/implemented/util.ts
var util_exports = /* @__PURE__ */ __exportAll({
	TextDecoder: () => TextDecoderClass,
	TextEncoder: () => TextEncoderClass,
	__esModule: () => true,
	callbackify: () => callbackify,
	default: () => util_default,
	deprecate: () => deprecate,
	format: () => format,
	inspect: () => inspect,
	isDeepStrictEqual: () => isDeepStrictEqual,
	parseArgs: () => parseArgs,
	promisify: () => promisify,
	types: () => types$1
});
/**
* `node:util` for the worker: the members harness code actually imports. Node's
* inspect output is only used in diagnostics, so a JSON-shaped rendering is
* enough; `promisify` follows Node's error-first callback convention exactly
* because zlib-style APIs are wrapped with it at module scope.
*/
/**
* Wrap an error-first callback function as a promise-returning one.
* @param fn - callback-style function.
* @returns the promise-returning wrapper.
*/
function promisify(fn) {
	return (...args) => new Promise((resolve, reject) => {
		fn(...args, (error, value) => {
			if (error !== null && error !== void 0) reject(error instanceof Error ? error : new Error(inspect(error)));
			else resolve(value);
		});
	});
}
/**
* Wrap a promise-returning function as an error-first callback one.
* @param fn - promise-returning function.
* @returns the callback-style wrapper.
*/
function callbackify(fn) {
	return (...args) => {
		const callback = args.at(-1);
		fn(...args.slice(0, -1)).then((value) => {
			callback(null, value);
		}, (error) => {
			callback(error);
		});
	};
}
/**
* Diagnostic rendering of a value.
* @param value - the value.
* @returns a readable one-line rendering.
*/
function inspect(value) {
	if (typeof value === "string") return `'${value}'`;
	if (value instanceof Error) return value.stack ?? `${value.name}: ${value.message}`;
	try {
		return JSON.stringify(value, (_key, item) => typeof item === "bigint" ? item.toString() : item) ?? String(value);
	} catch {
		return String(value);
	}
}
/**
* printf-style formatting for the `%s`/`%d`/`%j`/`%o` placeholders Node supports.
* @param template - format string, or any value when used without placeholders.
* @param args - substitution values.
* @returns the formatted string.
*/
function format(template, ...args) {
	if (typeof template !== "string") return [template, ...args].map((value) => inspect(value)).join(" ");
	let index = 0;
	const substituted = template.replaceAll(/%[sdifjoO%]/g, (token) => {
		if (token === "%%") return "%";
		if (index >= args.length) return token;
		const value = args[index++];
		if (token === "%d" || token === "%i") return String(Number(value));
		if (token === "%f") return String(Number(value));
		if (token === "%s") return typeof value === "string" ? value : inspect(value);
		return inspect(value);
	});
	const rest = args.slice(index);
	return rest.length === 0 ? substituted : `${substituted} ${rest.map((value) => inspect(value)).join(" ")}`;
}
/**
* Structural deep equality, as `isDeepStrictEqual` defines it for plain data.
* @param left - first value.
* @param right - second value.
* @returns true when both sides are structurally identical.
*/
function isDeepStrictEqual(left, right) {
	if (Object.is(left, right)) return true;
	if (typeof left !== "object" || typeof right !== "object" || left === null || right === null) return false;
	if (Array.isArray(left) !== Array.isArray(right)) return false;
	const leftKeys = Object.keys(left);
	const rightKeys = Object.keys(right);
	if (leftKeys.length !== rightKeys.length) return false;
	return leftKeys.every((key) => key in right && isDeepStrictEqual(left[key], right[key]));
}
/** Runtime type predicates (`node:util/types`), checked against the Node module of that name. */
const types$1 = {
	isPromise: (value) => value instanceof Promise || typeof value === "object" && value !== null && typeof value.then === "function",
	isDate: (value) => value instanceof Date,
	isRegExp: (value) => value instanceof RegExp,
	isTypedArray: (value) => ArrayBuffer.isView(value) && !(value instanceof DataView)
};
/**
* CLI argument parsing has no caller inside the worker host.
* @returns Never — it throws naming the unavailable member.
*/
function parseArgs() {
	throw new Error("web-preview: node:util.parseArgs is not available in the worker host");
}
/**
* Deprecation wrappers pass the function through unchanged.
* @param fn - the function a caller wanted wrapped.
* @returns The same function, unwrapped.
*/
function deprecate(fn) {
	return fn;
}
/** Text decoder class, as `node:util` re-exports it. */
const TextDecoderClass = globalThis.TextDecoder;
/** Text encoder class, as `node:util` re-exports it. */
const TextEncoderClass = globalThis.TextEncoder;
/** CommonJS default export: the members `require()` hands a caller of this module. */
var util_default = {
	promisify,
	callbackify,
	inspect,
	format,
	isDeepStrictEqual,
	types: types$1,
	parseArgs,
	deprecate,
	TextDecoder: TextDecoderClass,
	TextEncoder: TextEncoderClass
};
//#endregion
//#region src/node/builtin_modules/implemented/util/types.ts
/**
* `node:util/types` face: the predicate subset, re-exported from the util shim so
* both specifiers share one implementation. The predicates are checked against
* Node where they are built, on `types` in `../util.ts`.
*/
var types_exports = /* @__PURE__ */ __exportAll({
	__esModule: () => true,
	default: () => types_default,
	isDate: () => isDate,
	isPromise: () => isPromise,
	isRegExp: () => isRegExp,
	isTypedArray: () => isTypedArray
});
/** The `node:util/types` predicates the harness reads, shared with the util shim. */
const { isPromise, isDate, isRegExp, isTypedArray } = types$1;
var types_default = types$1;
//#endregion
//#region src/node/builtin_modules/implemented/zlib.ts
/**
* `node:zlib` for the worker. The worker composition carries no compression
* codec: the boot patch forces the JSONL session backend onto its plaintext
* path (`compression: 'none'`), because the VFS is in-memory and compressing
* it buys nothing. The Zstandard surface keeps its module-scope shape — the
* backend reads `constants` and `promisify`s the callback forms while
* loading — and every codec call fails loud, naming the missing capability.
*
* `createZstdDecompress` returns a handle-less object on purpose: the backend
* probes for Node's private stream shape and falls back to its public one-shot
* decoder when the probe declines.
*/
var zlib_exports = /* @__PURE__ */ __exportAll({
	__esModule: () => true,
	constants: () => constants,
	createZstdCompress: () => createZstdCompress,
	createZstdDecompress: () => createZstdDecompress,
	default: () => zlib_default,
	gunzip: () => gunzip,
	gunzipSync: () => gunzipSync,
	gzip: () => gzip,
	gzipSync: () => gzipSync,
	zstdCompress: () => zstdCompress,
	zstdCompressSync: () => zstdCompressSync,
	zstdDecompress: () => zstdDecompress,
	zstdDecompressSync: () => zstdDecompressSync
});
const MODULE$8 = "node:zlib";
/** Zstandard parameter/flush constants read at module scope by the JSONL backend. */
const constants = {
	ZSTD_c_compressionLevel: 100,
	ZSTD_c_checksumFlag: 201,
	ZSTD_e_continue: 0,
	ZSTD_e_flush: 1,
	ZSTD_e_end: 2,
	ZSTD_CLEVEL_DEFAULT: 3,
	Z_NO_FLUSH: 0,
	Z_SYNC_FLUSH: 2,
	Z_FINISH: 4
};
/** One-shot Zstandard compression (unavailable; the composition writes plaintext logs). */
const zstdCompressSync = notImplementedFail(MODULE$8, "zstdCompressSync");
/** One-shot Zstandard decompression (unavailable; the worker never reads compressed logs). */
const zstdDecompressSync = notImplementedFail(MODULE$8, "zstdDecompressSync");
/** Callback form of {@link zstdCompressSync} (`promisify`'d at module scope by the backend). */
const zstdCompress = notImplementedFail(MODULE$8, "zstdCompress");
/** Callback form of {@link zstdDecompressSync}. */
const zstdDecompress = notImplementedFail(MODULE$8, "zstdDecompress");
/**
* Streaming Zstandard decoder placeholder: the returned object deliberately
* lacks Node's private `_handle`/`_writeState` members, which is the signal the
* backend's private-shape probe checks before choosing that path.
* @returns the incompatible placeholder stream.
*/
function createZstdDecompress() {
	return { close: () => {} };
}
/** Streaming Zstandard encoder (unavailable; the backend only needs one-shot). */
const createZstdCompress = notImplementedFail(MODULE$8, "createZstdCompress");
/** gzip family (unavailable; no consumer in the reachable tree). */
const gzip = notImplementedFail(MODULE$8, "gzip");
/** gzip sync counterpart. */
const gzipSync = notImplementedFail(MODULE$8, "gzipSync");
/** gunzip counterpart. */
const gunzip = notImplementedFail(MODULE$8, "gunzip");
/** gunzip sync counterpart. */
const gunzipSync = notImplementedFail(MODULE$8, "gunzipSync");
/** CommonJS default export: the members `require()` hands a caller of this module. */
var zlib_default = {
	constants,
	zstdCompress,
	zstdCompressSync,
	zstdDecompress,
	zstdDecompressSync,
	createZstdCompress,
	createZstdDecompress,
	gzip,
	gzipSync,
	gunzip,
	gunzipSync
};
//#endregion
//#region ../../../node_modules/.pnpm/@yarnpkg+parsers@3.1.0/node_modules/@yarnpkg/parsers/lib/grammars/shell.js
var require_shell$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	function peg$subclass(child, parent) {
		function ctor() {
			this.constructor = child;
		}
		ctor.prototype = parent.prototype;
		child.prototype = new ctor();
	}
	function peg$SyntaxError(message, expected, found, location) {
		this.message = message;
		this.expected = expected;
		this.found = found;
		this.location = location;
		this.name = "SyntaxError";
		if (typeof Error.captureStackTrace === "function") Error.captureStackTrace(this, peg$SyntaxError);
	}
	peg$subclass(peg$SyntaxError, Error);
	peg$SyntaxError.buildMessage = function(expected, found) {
		var DESCRIBE_EXPECTATION_FNS = {
			literal: function(expectation) {
				return "\"" + literalEscape(expectation.text) + "\"";
			},
			"class": function(expectation) {
				var escapedParts = "", i;
				for (i = 0; i < expectation.parts.length; i++) escapedParts += expectation.parts[i] instanceof Array ? classEscape(expectation.parts[i][0]) + "-" + classEscape(expectation.parts[i][1]) : classEscape(expectation.parts[i]);
				return "[" + (expectation.inverted ? "^" : "") + escapedParts + "]";
			},
			any: function(expectation) {
				return "any character";
			},
			end: function(expectation) {
				return "end of input";
			},
			other: function(expectation) {
				return expectation.description;
			}
		};
		function hex(ch) {
			return ch.charCodeAt(0).toString(16).toUpperCase();
		}
		function literalEscape(s) {
			return s.replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
				return "\\x0" + hex(ch);
			}).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
				return "\\x" + hex(ch);
			});
		}
		function classEscape(s) {
			return s.replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\^/g, "\\^").replace(/-/g, "\\-").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
				return "\\x0" + hex(ch);
			}).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
				return "\\x" + hex(ch);
			});
		}
		function describeExpectation(expectation) {
			return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
		}
		function describeExpected(expected) {
			var descriptions = new Array(expected.length), i, j;
			for (i = 0; i < expected.length; i++) descriptions[i] = describeExpectation(expected[i]);
			descriptions.sort();
			if (descriptions.length > 0) {
				for (i = 1, j = 1; i < descriptions.length; i++) if (descriptions[i - 1] !== descriptions[i]) {
					descriptions[j] = descriptions[i];
					j++;
				}
				descriptions.length = j;
			}
			switch (descriptions.length) {
				case 1: return descriptions[0];
				case 2: return descriptions[0] + " or " + descriptions[1];
				default: return descriptions.slice(0, -1).join(", ") + ", or " + descriptions[descriptions.length - 1];
			}
		}
		function describeFound(found) {
			return found ? "\"" + literalEscape(found) + "\"" : "end of input";
		}
		return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
	};
	function peg$parse(input, options) {
		options = options !== void 0 ? options : {};
		var peg$FAILED = {}, peg$startRuleFunctions = { Start: peg$parseStart }, peg$startRuleFunction = peg$parseStart, peg$c0 = function(line) {
			return line ? line : [];
		}, peg$c1 = function(command, type, then) {
			return [{
				command,
				type
			}].concat(then || []);
		}, peg$c2 = function(command, type) {
			return [{
				command,
				type: type || ";"
			}];
		}, peg$c3 = function(then) {
			return then;
		}, peg$c4 = ";", peg$c5 = peg$literalExpectation(";", false), peg$c6 = "&", peg$c7 = peg$literalExpectation("&", false), peg$c8 = function(chain, then) {
			return then ? {
				chain,
				then
			} : { chain };
		}, peg$c9 = function(type, then) {
			return {
				type,
				line: then
			};
		}, peg$c10 = "&&", peg$c11 = peg$literalExpectation("&&", false), peg$c12 = "||", peg$c13 = peg$literalExpectation("||", false), peg$c14 = function(main, then) {
			return then ? {
				...main,
				then
			} : main;
		}, peg$c15 = function(type, then) {
			return {
				type,
				chain: then
			};
		}, peg$c16 = "|&", peg$c17 = peg$literalExpectation("|&", false), peg$c18 = "|", peg$c19 = peg$literalExpectation("|", false), peg$c20 = "=", peg$c21 = peg$literalExpectation("=", false), peg$c22 = function(name, arg) {
			return {
				name,
				args: [arg]
			};
		}, peg$c23 = function(name) {
			return {
				name,
				args: []
			};
		}, peg$c24 = "(", peg$c25 = peg$literalExpectation("(", false), peg$c26 = ")", peg$c27 = peg$literalExpectation(")", false), peg$c28 = function(subshell, args) {
			return {
				type: `subshell`,
				subshell,
				args
			};
		}, peg$c29 = "{", peg$c30 = peg$literalExpectation("{", false), peg$c31 = "}", peg$c32 = peg$literalExpectation("}", false), peg$c33 = function(group, args) {
			return {
				type: `group`,
				group,
				args
			};
		}, peg$c34 = function(envs, args) {
			return {
				type: `command`,
				args,
				envs
			};
		}, peg$c35 = function(envs) {
			return {
				type: `envs`,
				envs
			};
		}, peg$c36 = function(args) {
			return args;
		}, peg$c37 = function(arg) {
			return arg;
		}, peg$c38 = /^[0-9]/, peg$c39 = peg$classExpectation([["0", "9"]], false, false), peg$c40 = function(fd, redirect, arg) {
			return {
				type: `redirection`,
				subtype: redirect,
				fd: fd !== null ? parseInt(fd) : null,
				args: [arg]
			};
		}, peg$c41 = ">>", peg$c42 = peg$literalExpectation(">>", false), peg$c43 = ">&", peg$c44 = peg$literalExpectation(">&", false), peg$c45 = ">", peg$c46 = peg$literalExpectation(">", false), peg$c47 = "<<<", peg$c48 = peg$literalExpectation("<<<", false), peg$c49 = "<&", peg$c50 = peg$literalExpectation("<&", false), peg$c51 = "<", peg$c52 = peg$literalExpectation("<", false), peg$c53 = function(segments) {
			return {
				type: `argument`,
				segments: [].concat(...segments)
			};
		}, peg$c54 = function(string) {
			return string;
		}, peg$c55 = "$'", peg$c56 = peg$literalExpectation("$'", false), peg$c57 = "'", peg$c58 = peg$literalExpectation("'", false), peg$c59 = function(text) {
			return [{
				type: `text`,
				text
			}];
		}, peg$c60 = "\"\"", peg$c61 = peg$literalExpectation("\"\"", false), peg$c62 = function() {
			return {
				type: `text`,
				text: ``
			};
		}, peg$c63 = "\"", peg$c64 = peg$literalExpectation("\"", false), peg$c65 = function(segments) {
			return segments;
		}, peg$c66 = function(arithmetic) {
			return {
				type: `arithmetic`,
				arithmetic,
				quoted: true
			};
		}, peg$c67 = function(shell) {
			return {
				type: `shell`,
				shell,
				quoted: true
			};
		}, peg$c68 = function(variable) {
			return {
				type: `variable`,
				...variable,
				quoted: true
			};
		}, peg$c69 = function(text) {
			return {
				type: `text`,
				text
			};
		}, peg$c70 = function(arithmetic) {
			return {
				type: `arithmetic`,
				arithmetic,
				quoted: false
			};
		}, peg$c71 = function(shell) {
			return {
				type: `shell`,
				shell,
				quoted: false
			};
		}, peg$c72 = function(variable) {
			return {
				type: `variable`,
				...variable,
				quoted: false
			};
		}, peg$c73 = function(pattern) {
			return {
				type: `glob`,
				pattern
			};
		}, peg$c74 = /^[^']/, peg$c75 = peg$classExpectation(["'"], true, false), peg$c76 = function(chars) {
			return chars.join(``);
		}, peg$c77 = /^[^$"]/, peg$c78 = peg$classExpectation(["$", "\""], true, false), peg$c79 = "\\\n", peg$c80 = peg$literalExpectation("\\\n", false), peg$c81 = function() {
			return ``;
		}, peg$c82 = "\\", peg$c83 = peg$literalExpectation("\\", false), peg$c84 = /^[\\$"`]/, peg$c85 = peg$classExpectation([
			"\\",
			"$",
			"\"",
			"`"
		], false, false), peg$c86 = function(c) {
			return c;
		}, peg$c87 = "\\a", peg$c88 = peg$literalExpectation("\\a", false), peg$c89 = function() {
			return "a";
		}, peg$c90 = "\\b", peg$c91 = peg$literalExpectation("\\b", false), peg$c92 = function() {
			return "\b";
		}, peg$c93 = /^[Ee]/, peg$c94 = peg$classExpectation(["E", "e"], false, false), peg$c95 = function() {
			return "\x1B";
		}, peg$c96 = "\\f", peg$c97 = peg$literalExpectation("\\f", false), peg$c98 = function() {
			return "\f";
		}, peg$c99 = "\\n", peg$c100 = peg$literalExpectation("\\n", false), peg$c101 = function() {
			return "\n";
		}, peg$c102 = "\\r", peg$c103 = peg$literalExpectation("\\r", false), peg$c104 = function() {
			return "\r";
		}, peg$c105 = "\\t", peg$c106 = peg$literalExpectation("\\t", false), peg$c107 = function() {
			return "	";
		}, peg$c108 = "\\v", peg$c109 = peg$literalExpectation("\\v", false), peg$c110 = function() {
			return "\v";
		}, peg$c111 = /^[\\'"?]/, peg$c112 = peg$classExpectation([
			"\\",
			"'",
			"\"",
			"?"
		], false, false), peg$c113 = function(c) {
			return String.fromCharCode(parseInt(c, 16));
		}, peg$c114 = "\\x", peg$c115 = peg$literalExpectation("\\x", false), peg$c116 = "\\u", peg$c117 = peg$literalExpectation("\\u", false), peg$c118 = "\\U", peg$c119 = peg$literalExpectation("\\U", false), peg$c120 = function(c) {
			return String.fromCodePoint(parseInt(c, 16));
		}, peg$c121 = /^[0-7]/, peg$c122 = peg$classExpectation([["0", "7"]], false, false), peg$c123 = /^[0-9a-fA-f]/, peg$c124 = peg$classExpectation([
			["0", "9"],
			["a", "f"],
			["A", "f"]
		], false, false), peg$c125 = peg$anyExpectation(), peg$c126 = "{}", peg$c127 = peg$literalExpectation("{}", false), peg$c128 = function() {
			return "{}";
		}, peg$c129 = "-", peg$c130 = peg$literalExpectation("-", false), peg$c131 = "+", peg$c132 = peg$literalExpectation("+", false), peg$c133 = ".", peg$c134 = peg$literalExpectation(".", false), peg$c135 = function(sign, left, right) {
			return {
				type: `number`,
				value: (sign === "-" ? -1 : 1) * parseFloat(left.join(``) + `.` + right.join(``))
			};
		}, peg$c136 = function(sign, value) {
			return {
				type: `number`,
				value: (sign === "-" ? -1 : 1) * parseInt(value.join(``))
			};
		}, peg$c137 = function(variable) {
			return {
				type: `variable`,
				...variable
			};
		}, peg$c138 = function(name) {
			return {
				type: `variable`,
				name
			};
		}, peg$c139 = function(value) {
			return value;
		}, peg$c140 = "*", peg$c141 = peg$literalExpectation("*", false), peg$c142 = "/", peg$c143 = peg$literalExpectation("/", false), peg$c144 = function(left, op, right) {
			return {
				type: op === `*` ? `multiplication` : `division`,
				right
			};
		}, peg$c145 = function(left, rest) {
			return rest.reduce((left, right) => ({
				left,
				...right
			}), left);
		}, peg$c146 = function(left, op, right) {
			return {
				type: op === `+` ? `addition` : `subtraction`,
				right
			};
		}, peg$c147 = "$((", peg$c148 = peg$literalExpectation("$((", false), peg$c149 = "))", peg$c150 = peg$literalExpectation("))", false), peg$c151 = function(arithmetic) {
			return arithmetic;
		}, peg$c152 = "$(", peg$c153 = peg$literalExpectation("$(", false), peg$c154 = function(command) {
			return command;
		}, peg$c155 = "${", peg$c156 = peg$literalExpectation("${", false), peg$c157 = ":-", peg$c158 = peg$literalExpectation(":-", false), peg$c159 = function(name, arg) {
			return {
				name,
				defaultValue: arg
			};
		}, peg$c160 = ":-}", peg$c161 = peg$literalExpectation(":-}", false), peg$c162 = function(name) {
			return {
				name,
				defaultValue: []
			};
		}, peg$c163 = ":+", peg$c164 = peg$literalExpectation(":+", false), peg$c165 = function(name, arg) {
			return {
				name,
				alternativeValue: arg
			};
		}, peg$c166 = ":+}", peg$c167 = peg$literalExpectation(":+}", false), peg$c168 = function(name) {
			return {
				name,
				alternativeValue: []
			};
		}, peg$c169 = function(name) {
			return { name };
		}, peg$c170 = "$", peg$c171 = peg$literalExpectation("$", false), peg$c172 = function(pattern) {
			return options.isGlobPattern(pattern);
		}, peg$c173 = function(pattern) {
			return pattern;
		}, peg$c174 = /^[a-zA-Z0-9_]/, peg$c175 = peg$classExpectation([
			["a", "z"],
			["A", "Z"],
			["0", "9"],
			"_"
		], false, false), peg$c176 = function() {
			return text();
		}, peg$c177 = /^[$@*?#a-zA-Z0-9_\-]/, peg$c178 = peg$classExpectation([
			"$",
			"@",
			"*",
			"?",
			"#",
			["a", "z"],
			["A", "Z"],
			["0", "9"],
			"_",
			"-"
		], false, false), peg$c179 = /^[()}<>$|&; \t"']/, peg$c180 = peg$classExpectation([
			"(",
			")",
			"}",
			"<",
			">",
			"$",
			"|",
			"&",
			";",
			" ",
			"	",
			"\"",
			"'"
		], false, false), peg$c181 = /^[<>&; \t"']/, peg$c182 = peg$classExpectation([
			"<",
			">",
			"&",
			";",
			" ",
			"	",
			"\"",
			"'"
		], false, false), peg$c183 = /^[ \t]/, peg$c184 = peg$classExpectation([" ", "	"], false, false), peg$currPos = 0, peg$savedPos = 0, peg$posDetailsCache = [{
			line: 1,
			column: 1
		}], peg$maxFailPos = 0, peg$maxFailExpected = [], peg$silentFails = 0, peg$result;
		if ("startRule" in options) {
			if (!(options.startRule in peg$startRuleFunctions)) throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
			peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
		}
		function text() {
			return input.substring(peg$savedPos, peg$currPos);
		}
		function peg$literalExpectation(text, ignoreCase) {
			return {
				type: "literal",
				text,
				ignoreCase
			};
		}
		function peg$classExpectation(parts, inverted, ignoreCase) {
			return {
				type: "class",
				parts,
				inverted,
				ignoreCase
			};
		}
		function peg$anyExpectation() {
			return { type: "any" };
		}
		function peg$endExpectation() {
			return { type: "end" };
		}
		function peg$computePosDetails(pos) {
			var details = peg$posDetailsCache[pos], p;
			if (details) return details;
			else {
				p = pos - 1;
				while (!peg$posDetailsCache[p]) p--;
				details = peg$posDetailsCache[p];
				details = {
					line: details.line,
					column: details.column
				};
				while (p < pos) {
					if (input.charCodeAt(p) === 10) {
						details.line++;
						details.column = 1;
					} else details.column++;
					p++;
				}
				peg$posDetailsCache[pos] = details;
				return details;
			}
		}
		function peg$computeLocation(startPos, endPos) {
			var startPosDetails = peg$computePosDetails(startPos), endPosDetails = peg$computePosDetails(endPos);
			return {
				start: {
					offset: startPos,
					line: startPosDetails.line,
					column: startPosDetails.column
				},
				end: {
					offset: endPos,
					line: endPosDetails.line,
					column: endPosDetails.column
				}
			};
		}
		function peg$fail(expected) {
			if (peg$currPos < peg$maxFailPos) return;
			if (peg$currPos > peg$maxFailPos) {
				peg$maxFailPos = peg$currPos;
				peg$maxFailExpected = [];
			}
			peg$maxFailExpected.push(expected);
		}
		function peg$buildStructuredError(expected, found, location) {
			return new peg$SyntaxError(peg$SyntaxError.buildMessage(expected, found), expected, found, location);
		}
		function peg$parseStart() {
			var s0 = peg$currPos, s1 = [], s2 = peg$parseS();
			while (s2 !== peg$FAILED) {
				s1.push(s2);
				s2 = peg$parseS();
			}
			if (s1 !== peg$FAILED) {
				s2 = peg$parseShellLine();
				if (s2 === peg$FAILED) s2 = null;
				if (s2 !== peg$FAILED) {
					peg$savedPos = s0;
					s1 = peg$c0(s2);
					s0 = s1;
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			return s0;
		}
		function peg$parseShellLine() {
			var s0 = peg$currPos, s1 = peg$parseCommandLine(), s2, s3, s4;
			if (s1 !== peg$FAILED) {
				s2 = [];
				s3 = peg$parseS();
				while (s3 !== peg$FAILED) {
					s2.push(s3);
					s3 = peg$parseS();
				}
				if (s2 !== peg$FAILED) {
					s3 = peg$parseShellLineType();
					if (s3 !== peg$FAILED) {
						s4 = peg$parseShellLineThen();
						if (s4 === peg$FAILED) s4 = null;
						if (s4 !== peg$FAILED) {
							peg$savedPos = s0;
							s1 = peg$c1(s1, s3, s4);
							s0 = s1;
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			if (s0 === peg$FAILED) {
				s0 = peg$currPos;
				s1 = peg$parseCommandLine();
				if (s1 !== peg$FAILED) {
					s2 = [];
					s3 = peg$parseS();
					while (s3 !== peg$FAILED) {
						s2.push(s3);
						s3 = peg$parseS();
					}
					if (s2 !== peg$FAILED) {
						s3 = peg$parseShellLineType();
						if (s3 === peg$FAILED) s3 = null;
						if (s3 !== peg$FAILED) {
							peg$savedPos = s0;
							s1 = peg$c2(s1, s3);
							s0 = s1;
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			}
			return s0;
		}
		function peg$parseShellLineThen() {
			var s0 = peg$currPos, s1 = [], s2 = peg$parseS(), s3, s4;
			while (s2 !== peg$FAILED) {
				s1.push(s2);
				s2 = peg$parseS();
			}
			if (s1 !== peg$FAILED) {
				s2 = peg$parseShellLine();
				if (s2 !== peg$FAILED) {
					s3 = [];
					s4 = peg$parseS();
					while (s4 !== peg$FAILED) {
						s3.push(s4);
						s4 = peg$parseS();
					}
					if (s3 !== peg$FAILED) {
						peg$savedPos = s0;
						s1 = peg$c3(s2);
						s0 = s1;
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			return s0;
		}
		function peg$parseShellLineType() {
			var s0;
			if (input.charCodeAt(peg$currPos) === 59) {
				s0 = peg$c4;
				peg$currPos++;
			} else {
				s0 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c5);
			}
			if (s0 === peg$FAILED) if (input.charCodeAt(peg$currPos) === 38) {
				s0 = peg$c6;
				peg$currPos++;
			} else {
				s0 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c7);
			}
			return s0;
		}
		function peg$parseCommandLine() {
			var s0 = peg$currPos, s1 = peg$parseCommandChain(), s2;
			if (s1 !== peg$FAILED) {
				s2 = peg$parseCommandLineThen();
				if (s2 === peg$FAILED) s2 = null;
				if (s2 !== peg$FAILED) {
					peg$savedPos = s0;
					s1 = peg$c8(s1, s2);
					s0 = s1;
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			return s0;
		}
		function peg$parseCommandLineThen() {
			var s0 = peg$currPos, s1 = [], s2 = peg$parseS(), s3, s4, s5, s6;
			while (s2 !== peg$FAILED) {
				s1.push(s2);
				s2 = peg$parseS();
			}
			if (s1 !== peg$FAILED) {
				s2 = peg$parseCommandLineType();
				if (s2 !== peg$FAILED) {
					s3 = [];
					s4 = peg$parseS();
					while (s4 !== peg$FAILED) {
						s3.push(s4);
						s4 = peg$parseS();
					}
					if (s3 !== peg$FAILED) {
						s4 = peg$parseCommandLine();
						if (s4 !== peg$FAILED) {
							s5 = [];
							s6 = peg$parseS();
							while (s6 !== peg$FAILED) {
								s5.push(s6);
								s6 = peg$parseS();
							}
							if (s5 !== peg$FAILED) {
								peg$savedPos = s0;
								s1 = peg$c9(s2, s4);
								s0 = s1;
							} else {
								peg$currPos = s0;
								s0 = peg$FAILED;
							}
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			return s0;
		}
		function peg$parseCommandLineType() {
			var s0;
			if (input.substr(peg$currPos, 2) === peg$c10) {
				s0 = peg$c10;
				peg$currPos += 2;
			} else {
				s0 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c11);
			}
			if (s0 === peg$FAILED) if (input.substr(peg$currPos, 2) === peg$c12) {
				s0 = peg$c12;
				peg$currPos += 2;
			} else {
				s0 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c13);
			}
			return s0;
		}
		function peg$parseCommandChain() {
			var s0 = peg$currPos, s1 = peg$parseCommand(), s2;
			if (s1 !== peg$FAILED) {
				s2 = peg$parseCommandChainThen();
				if (s2 === peg$FAILED) s2 = null;
				if (s2 !== peg$FAILED) {
					peg$savedPos = s0;
					s1 = peg$c14(s1, s2);
					s0 = s1;
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			return s0;
		}
		function peg$parseCommandChainThen() {
			var s0 = peg$currPos, s1 = [], s2 = peg$parseS(), s3, s4, s5, s6;
			while (s2 !== peg$FAILED) {
				s1.push(s2);
				s2 = peg$parseS();
			}
			if (s1 !== peg$FAILED) {
				s2 = peg$parseCommandChainType();
				if (s2 !== peg$FAILED) {
					s3 = [];
					s4 = peg$parseS();
					while (s4 !== peg$FAILED) {
						s3.push(s4);
						s4 = peg$parseS();
					}
					if (s3 !== peg$FAILED) {
						s4 = peg$parseCommandChain();
						if (s4 !== peg$FAILED) {
							s5 = [];
							s6 = peg$parseS();
							while (s6 !== peg$FAILED) {
								s5.push(s6);
								s6 = peg$parseS();
							}
							if (s5 !== peg$FAILED) {
								peg$savedPos = s0;
								s1 = peg$c15(s2, s4);
								s0 = s1;
							} else {
								peg$currPos = s0;
								s0 = peg$FAILED;
							}
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			return s0;
		}
		function peg$parseCommandChainType() {
			var s0;
			if (input.substr(peg$currPos, 2) === peg$c16) {
				s0 = peg$c16;
				peg$currPos += 2;
			} else {
				s0 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c17);
			}
			if (s0 === peg$FAILED) if (input.charCodeAt(peg$currPos) === 124) {
				s0 = peg$c18;
				peg$currPos++;
			} else {
				s0 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c19);
			}
			return s0;
		}
		function peg$parseVariableAssignment() {
			var s0 = peg$currPos, s1 = peg$parseEnvVariable(), s2, s3, s4, s5;
			if (s1 !== peg$FAILED) {
				if (input.charCodeAt(peg$currPos) === 61) {
					s2 = peg$c20;
					peg$currPos++;
				} else {
					s2 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c21);
				}
				if (s2 !== peg$FAILED) {
					s3 = peg$parseStrictValueArgument();
					if (s3 !== peg$FAILED) {
						s4 = [];
						s5 = peg$parseS();
						while (s5 !== peg$FAILED) {
							s4.push(s5);
							s5 = peg$parseS();
						}
						if (s4 !== peg$FAILED) {
							peg$savedPos = s0;
							s1 = peg$c22(s1, s3);
							s0 = s1;
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			if (s0 === peg$FAILED) {
				s0 = peg$currPos;
				s1 = peg$parseEnvVariable();
				if (s1 !== peg$FAILED) {
					if (input.charCodeAt(peg$currPos) === 61) {
						s2 = peg$c20;
						peg$currPos++;
					} else {
						s2 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c21);
					}
					if (s2 !== peg$FAILED) {
						s3 = [];
						s4 = peg$parseS();
						while (s4 !== peg$FAILED) {
							s3.push(s4);
							s4 = peg$parseS();
						}
						if (s3 !== peg$FAILED) {
							peg$savedPos = s0;
							s1 = peg$c23(s1);
							s0 = s1;
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			}
			return s0;
		}
		function peg$parseCommand() {
			var s0 = peg$currPos, s1 = [], s2 = peg$parseS(), s3, s4, s5, s6, s7, s8, s9, s10;
			while (s2 !== peg$FAILED) {
				s1.push(s2);
				s2 = peg$parseS();
			}
			if (s1 !== peg$FAILED) {
				if (input.charCodeAt(peg$currPos) === 40) {
					s2 = peg$c24;
					peg$currPos++;
				} else {
					s2 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c25);
				}
				if (s2 !== peg$FAILED) {
					s3 = [];
					s4 = peg$parseS();
					while (s4 !== peg$FAILED) {
						s3.push(s4);
						s4 = peg$parseS();
					}
					if (s3 !== peg$FAILED) {
						s4 = peg$parseShellLine();
						if (s4 !== peg$FAILED) {
							s5 = [];
							s6 = peg$parseS();
							while (s6 !== peg$FAILED) {
								s5.push(s6);
								s6 = peg$parseS();
							}
							if (s5 !== peg$FAILED) {
								if (input.charCodeAt(peg$currPos) === 41) {
									s6 = peg$c26;
									peg$currPos++;
								} else {
									s6 = peg$FAILED;
									if (peg$silentFails === 0) peg$fail(peg$c27);
								}
								if (s6 !== peg$FAILED) {
									s7 = [];
									s8 = peg$parseS();
									while (s8 !== peg$FAILED) {
										s7.push(s8);
										s8 = peg$parseS();
									}
									if (s7 !== peg$FAILED) {
										s8 = [];
										s9 = peg$parseRedirectArgument();
										while (s9 !== peg$FAILED) {
											s8.push(s9);
											s9 = peg$parseRedirectArgument();
										}
										if (s8 !== peg$FAILED) {
											s9 = [];
											s10 = peg$parseS();
											while (s10 !== peg$FAILED) {
												s9.push(s10);
												s10 = peg$parseS();
											}
											if (s9 !== peg$FAILED) {
												peg$savedPos = s0;
												s1 = peg$c28(s4, s8);
												s0 = s1;
											} else {
												peg$currPos = s0;
												s0 = peg$FAILED;
											}
										} else {
											peg$currPos = s0;
											s0 = peg$FAILED;
										}
									} else {
										peg$currPos = s0;
										s0 = peg$FAILED;
									}
								} else {
									peg$currPos = s0;
									s0 = peg$FAILED;
								}
							} else {
								peg$currPos = s0;
								s0 = peg$FAILED;
							}
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			if (s0 === peg$FAILED) {
				s0 = peg$currPos;
				s1 = [];
				s2 = peg$parseS();
				while (s2 !== peg$FAILED) {
					s1.push(s2);
					s2 = peg$parseS();
				}
				if (s1 !== peg$FAILED) {
					if (input.charCodeAt(peg$currPos) === 123) {
						s2 = peg$c29;
						peg$currPos++;
					} else {
						s2 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c30);
					}
					if (s2 !== peg$FAILED) {
						s3 = [];
						s4 = peg$parseS();
						while (s4 !== peg$FAILED) {
							s3.push(s4);
							s4 = peg$parseS();
						}
						if (s3 !== peg$FAILED) {
							s4 = peg$parseShellLine();
							if (s4 !== peg$FAILED) {
								s5 = [];
								s6 = peg$parseS();
								while (s6 !== peg$FAILED) {
									s5.push(s6);
									s6 = peg$parseS();
								}
								if (s5 !== peg$FAILED) {
									if (input.charCodeAt(peg$currPos) === 125) {
										s6 = peg$c31;
										peg$currPos++;
									} else {
										s6 = peg$FAILED;
										if (peg$silentFails === 0) peg$fail(peg$c32);
									}
									if (s6 !== peg$FAILED) {
										s7 = [];
										s8 = peg$parseS();
										while (s8 !== peg$FAILED) {
											s7.push(s8);
											s8 = peg$parseS();
										}
										if (s7 !== peg$FAILED) {
											s8 = [];
											s9 = peg$parseRedirectArgument();
											while (s9 !== peg$FAILED) {
												s8.push(s9);
												s9 = peg$parseRedirectArgument();
											}
											if (s8 !== peg$FAILED) {
												s9 = [];
												s10 = peg$parseS();
												while (s10 !== peg$FAILED) {
													s9.push(s10);
													s10 = peg$parseS();
												}
												if (s9 !== peg$FAILED) {
													peg$savedPos = s0;
													s1 = peg$c33(s4, s8);
													s0 = s1;
												} else {
													peg$currPos = s0;
													s0 = peg$FAILED;
												}
											} else {
												peg$currPos = s0;
												s0 = peg$FAILED;
											}
										} else {
											peg$currPos = s0;
											s0 = peg$FAILED;
										}
									} else {
										peg$currPos = s0;
										s0 = peg$FAILED;
									}
								} else {
									peg$currPos = s0;
									s0 = peg$FAILED;
								}
							} else {
								peg$currPos = s0;
								s0 = peg$FAILED;
							}
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				if (s0 === peg$FAILED) {
					s0 = peg$currPos;
					s1 = [];
					s2 = peg$parseS();
					while (s2 !== peg$FAILED) {
						s1.push(s2);
						s2 = peg$parseS();
					}
					if (s1 !== peg$FAILED) {
						s2 = [];
						s3 = peg$parseVariableAssignment();
						while (s3 !== peg$FAILED) {
							s2.push(s3);
							s3 = peg$parseVariableAssignment();
						}
						if (s2 !== peg$FAILED) {
							s3 = [];
							s4 = peg$parseS();
							while (s4 !== peg$FAILED) {
								s3.push(s4);
								s4 = peg$parseS();
							}
							if (s3 !== peg$FAILED) {
								s4 = [];
								s5 = peg$parseArgument();
								if (s5 !== peg$FAILED) while (s5 !== peg$FAILED) {
									s4.push(s5);
									s5 = peg$parseArgument();
								}
								else s4 = peg$FAILED;
								if (s4 !== peg$FAILED) {
									s5 = [];
									s6 = peg$parseS();
									while (s6 !== peg$FAILED) {
										s5.push(s6);
										s6 = peg$parseS();
									}
									if (s5 !== peg$FAILED) {
										peg$savedPos = s0;
										s1 = peg$c34(s2, s4);
										s0 = s1;
									} else {
										peg$currPos = s0;
										s0 = peg$FAILED;
									}
								} else {
									peg$currPos = s0;
									s0 = peg$FAILED;
								}
							} else {
								peg$currPos = s0;
								s0 = peg$FAILED;
							}
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
					if (s0 === peg$FAILED) {
						s0 = peg$currPos;
						s1 = [];
						s2 = peg$parseS();
						while (s2 !== peg$FAILED) {
							s1.push(s2);
							s2 = peg$parseS();
						}
						if (s1 !== peg$FAILED) {
							s2 = [];
							s3 = peg$parseVariableAssignment();
							if (s3 !== peg$FAILED) while (s3 !== peg$FAILED) {
								s2.push(s3);
								s3 = peg$parseVariableAssignment();
							}
							else s2 = peg$FAILED;
							if (s2 !== peg$FAILED) {
								s3 = [];
								s4 = peg$parseS();
								while (s4 !== peg$FAILED) {
									s3.push(s4);
									s4 = peg$parseS();
								}
								if (s3 !== peg$FAILED) {
									peg$savedPos = s0;
									s1 = peg$c35(s2);
									s0 = s1;
								} else {
									peg$currPos = s0;
									s0 = peg$FAILED;
								}
							} else {
								peg$currPos = s0;
								s0 = peg$FAILED;
							}
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					}
				}
			}
			return s0;
		}
		function peg$parseCommandString() {
			var s0 = peg$currPos, s1 = [], s2 = peg$parseS(), s3, s4;
			while (s2 !== peg$FAILED) {
				s1.push(s2);
				s2 = peg$parseS();
			}
			if (s1 !== peg$FAILED) {
				s2 = [];
				s3 = peg$parseValueArgument();
				if (s3 !== peg$FAILED) while (s3 !== peg$FAILED) {
					s2.push(s3);
					s3 = peg$parseValueArgument();
				}
				else s2 = peg$FAILED;
				if (s2 !== peg$FAILED) {
					s3 = [];
					s4 = peg$parseS();
					while (s4 !== peg$FAILED) {
						s3.push(s4);
						s4 = peg$parseS();
					}
					if (s3 !== peg$FAILED) {
						peg$savedPos = s0;
						s1 = peg$c36(s2);
						s0 = s1;
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			return s0;
		}
		function peg$parseArgument() {
			var s0 = peg$currPos, s1 = [], s2 = peg$parseS();
			while (s2 !== peg$FAILED) {
				s1.push(s2);
				s2 = peg$parseS();
			}
			if (s1 !== peg$FAILED) {
				s2 = peg$parseRedirectArgument();
				if (s2 !== peg$FAILED) {
					peg$savedPos = s0;
					s1 = peg$c37(s2);
					s0 = s1;
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			if (s0 === peg$FAILED) {
				s0 = peg$currPos;
				s1 = [];
				s2 = peg$parseS();
				while (s2 !== peg$FAILED) {
					s1.push(s2);
					s2 = peg$parseS();
				}
				if (s1 !== peg$FAILED) {
					s2 = peg$parseValueArgument();
					if (s2 !== peg$FAILED) {
						peg$savedPos = s0;
						s1 = peg$c37(s2);
						s0 = s1;
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			}
			return s0;
		}
		function peg$parseRedirectArgument() {
			var s0 = peg$currPos, s1 = [], s2 = peg$parseS(), s3, s4;
			while (s2 !== peg$FAILED) {
				s1.push(s2);
				s2 = peg$parseS();
			}
			if (s1 !== peg$FAILED) {
				if (peg$c38.test(input.charAt(peg$currPos))) {
					s2 = input.charAt(peg$currPos);
					peg$currPos++;
				} else {
					s2 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c39);
				}
				if (s2 === peg$FAILED) s2 = null;
				if (s2 !== peg$FAILED) {
					s3 = peg$parseRedirectType();
					if (s3 !== peg$FAILED) {
						s4 = peg$parseValueArgument();
						if (s4 !== peg$FAILED) {
							peg$savedPos = s0;
							s1 = peg$c40(s2, s3, s4);
							s0 = s1;
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			return s0;
		}
		function peg$parseRedirectType() {
			var s0;
			if (input.substr(peg$currPos, 2) === peg$c41) {
				s0 = peg$c41;
				peg$currPos += 2;
			} else {
				s0 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c42);
			}
			if (s0 === peg$FAILED) {
				if (input.substr(peg$currPos, 2) === peg$c43) {
					s0 = peg$c43;
					peg$currPos += 2;
				} else {
					s0 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c44);
				}
				if (s0 === peg$FAILED) {
					if (input.charCodeAt(peg$currPos) === 62) {
						s0 = peg$c45;
						peg$currPos++;
					} else {
						s0 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c46);
					}
					if (s0 === peg$FAILED) {
						if (input.substr(peg$currPos, 3) === peg$c47) {
							s0 = peg$c47;
							peg$currPos += 3;
						} else {
							s0 = peg$FAILED;
							if (peg$silentFails === 0) peg$fail(peg$c48);
						}
						if (s0 === peg$FAILED) {
							if (input.substr(peg$currPos, 2) === peg$c49) {
								s0 = peg$c49;
								peg$currPos += 2;
							} else {
								s0 = peg$FAILED;
								if (peg$silentFails === 0) peg$fail(peg$c50);
							}
							if (s0 === peg$FAILED) if (input.charCodeAt(peg$currPos) === 60) {
								s0 = peg$c51;
								peg$currPos++;
							} else {
								s0 = peg$FAILED;
								if (peg$silentFails === 0) peg$fail(peg$c52);
							}
						}
					}
				}
			}
			return s0;
		}
		function peg$parseValueArgument() {
			var s0 = peg$currPos, s1 = [], s2 = peg$parseS();
			while (s2 !== peg$FAILED) {
				s1.push(s2);
				s2 = peg$parseS();
			}
			if (s1 !== peg$FAILED) {
				s2 = peg$parseStrictValueArgument();
				if (s2 !== peg$FAILED) {
					peg$savedPos = s0;
					s1 = peg$c37(s2);
					s0 = s1;
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			return s0;
		}
		function peg$parseStrictValueArgument() {
			var s0 = peg$currPos, s1 = [], s2 = peg$parseArgumentSegment();
			if (s2 !== peg$FAILED) while (s2 !== peg$FAILED) {
				s1.push(s2);
				s2 = peg$parseArgumentSegment();
			}
			else s1 = peg$FAILED;
			if (s1 !== peg$FAILED) {
				peg$savedPos = s0;
				s1 = peg$c53(s1);
			}
			s0 = s1;
			return s0;
		}
		function peg$parseArgumentSegment() {
			var s0 = peg$currPos, s1 = peg$parseCQuoteString();
			if (s1 !== peg$FAILED) {
				peg$savedPos = s0;
				s1 = peg$c54(s1);
			}
			s0 = s1;
			if (s0 === peg$FAILED) {
				s0 = peg$currPos;
				s1 = peg$parseSglQuoteString();
				if (s1 !== peg$FAILED) {
					peg$savedPos = s0;
					s1 = peg$c54(s1);
				}
				s0 = s1;
				if (s0 === peg$FAILED) {
					s0 = peg$currPos;
					s1 = peg$parseDblQuoteString();
					if (s1 !== peg$FAILED) {
						peg$savedPos = s0;
						s1 = peg$c54(s1);
					}
					s0 = s1;
					if (s0 === peg$FAILED) {
						s0 = peg$currPos;
						s1 = peg$parsePlainString();
						if (s1 !== peg$FAILED) {
							peg$savedPos = s0;
							s1 = peg$c54(s1);
						}
						s0 = s1;
					}
				}
			}
			return s0;
		}
		function peg$parseCQuoteString() {
			var s0 = peg$currPos, s1, s2, s3;
			if (input.substr(peg$currPos, 2) === peg$c55) {
				s1 = peg$c55;
				peg$currPos += 2;
			} else {
				s1 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c56);
			}
			if (s1 !== peg$FAILED) {
				s2 = peg$parseCQuoteStringText();
				if (s2 !== peg$FAILED) {
					if (input.charCodeAt(peg$currPos) === 39) {
						s3 = peg$c57;
						peg$currPos++;
					} else {
						s3 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c58);
					}
					if (s3 !== peg$FAILED) {
						peg$savedPos = s0;
						s1 = peg$c59(s2);
						s0 = s1;
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			return s0;
		}
		function peg$parseSglQuoteString() {
			var s0 = peg$currPos, s1, s2, s3;
			if (input.charCodeAt(peg$currPos) === 39) {
				s1 = peg$c57;
				peg$currPos++;
			} else {
				s1 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c58);
			}
			if (s1 !== peg$FAILED) {
				s2 = peg$parseSglQuoteStringText();
				if (s2 !== peg$FAILED) {
					if (input.charCodeAt(peg$currPos) === 39) {
						s3 = peg$c57;
						peg$currPos++;
					} else {
						s3 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c58);
					}
					if (s3 !== peg$FAILED) {
						peg$savedPos = s0;
						s1 = peg$c59(s2);
						s0 = s1;
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			return s0;
		}
		function peg$parseDblQuoteString() {
			var s0 = peg$currPos, s1, s2, s3;
			if (input.substr(peg$currPos, 2) === peg$c60) {
				s1 = peg$c60;
				peg$currPos += 2;
			} else {
				s1 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c61);
			}
			if (s1 !== peg$FAILED) {
				peg$savedPos = s0;
				s1 = peg$c62();
			}
			s0 = s1;
			if (s0 === peg$FAILED) {
				s0 = peg$currPos;
				if (input.charCodeAt(peg$currPos) === 34) {
					s1 = peg$c63;
					peg$currPos++;
				} else {
					s1 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c64);
				}
				if (s1 !== peg$FAILED) {
					s2 = [];
					s3 = peg$parseDblQuoteStringSegment();
					while (s3 !== peg$FAILED) {
						s2.push(s3);
						s3 = peg$parseDblQuoteStringSegment();
					}
					if (s2 !== peg$FAILED) {
						if (input.charCodeAt(peg$currPos) === 34) {
							s3 = peg$c63;
							peg$currPos++;
						} else {
							s3 = peg$FAILED;
							if (peg$silentFails === 0) peg$fail(peg$c64);
						}
						if (s3 !== peg$FAILED) {
							peg$savedPos = s0;
							s1 = peg$c65(s2);
							s0 = s1;
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			}
			return s0;
		}
		function peg$parsePlainString() {
			var s0 = peg$currPos, s1 = [], s2 = peg$parsePlainStringSegment();
			if (s2 !== peg$FAILED) while (s2 !== peg$FAILED) {
				s1.push(s2);
				s2 = peg$parsePlainStringSegment();
			}
			else s1 = peg$FAILED;
			if (s1 !== peg$FAILED) {
				peg$savedPos = s0;
				s1 = peg$c65(s1);
			}
			s0 = s1;
			return s0;
		}
		function peg$parseDblQuoteStringSegment() {
			var s0 = peg$currPos, s1 = peg$parseArithmetic();
			if (s1 !== peg$FAILED) {
				peg$savedPos = s0;
				s1 = peg$c66(s1);
			}
			s0 = s1;
			if (s0 === peg$FAILED) {
				s0 = peg$currPos;
				s1 = peg$parseSubshell();
				if (s1 !== peg$FAILED) {
					peg$savedPos = s0;
					s1 = peg$c67(s1);
				}
				s0 = s1;
				if (s0 === peg$FAILED) {
					s0 = peg$currPos;
					s1 = peg$parseVariable();
					if (s1 !== peg$FAILED) {
						peg$savedPos = s0;
						s1 = peg$c68(s1);
					}
					s0 = s1;
					if (s0 === peg$FAILED) {
						s0 = peg$currPos;
						s1 = peg$parseDblQuoteStringText();
						if (s1 !== peg$FAILED) {
							peg$savedPos = s0;
							s1 = peg$c69(s1);
						}
						s0 = s1;
					}
				}
			}
			return s0;
		}
		function peg$parsePlainStringSegment() {
			var s0 = peg$currPos, s1 = peg$parseArithmetic();
			if (s1 !== peg$FAILED) {
				peg$savedPos = s0;
				s1 = peg$c70(s1);
			}
			s0 = s1;
			if (s0 === peg$FAILED) {
				s0 = peg$currPos;
				s1 = peg$parseSubshell();
				if (s1 !== peg$FAILED) {
					peg$savedPos = s0;
					s1 = peg$c71(s1);
				}
				s0 = s1;
				if (s0 === peg$FAILED) {
					s0 = peg$currPos;
					s1 = peg$parseVariable();
					if (s1 !== peg$FAILED) {
						peg$savedPos = s0;
						s1 = peg$c72(s1);
					}
					s0 = s1;
					if (s0 === peg$FAILED) {
						s0 = peg$currPos;
						s1 = peg$parseGlob();
						if (s1 !== peg$FAILED) {
							peg$savedPos = s0;
							s1 = peg$c73(s1);
						}
						s0 = s1;
						if (s0 === peg$FAILED) {
							s0 = peg$currPos;
							s1 = peg$parsePlainStringText();
							if (s1 !== peg$FAILED) {
								peg$savedPos = s0;
								s1 = peg$c69(s1);
							}
							s0 = s1;
						}
					}
				}
			}
			return s0;
		}
		function peg$parseSglQuoteStringText() {
			var s0 = peg$currPos, s1 = [], s2;
			if (peg$c74.test(input.charAt(peg$currPos))) {
				s2 = input.charAt(peg$currPos);
				peg$currPos++;
			} else {
				s2 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c75);
			}
			while (s2 !== peg$FAILED) {
				s1.push(s2);
				if (peg$c74.test(input.charAt(peg$currPos))) {
					s2 = input.charAt(peg$currPos);
					peg$currPos++;
				} else {
					s2 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c75);
				}
			}
			if (s1 !== peg$FAILED) {
				peg$savedPos = s0;
				s1 = peg$c76(s1);
			}
			s0 = s1;
			return s0;
		}
		function peg$parseDblQuoteStringText() {
			var s0 = peg$currPos, s1 = [], s2 = peg$parseDblQuoteEscapedChar();
			if (s2 === peg$FAILED) if (peg$c77.test(input.charAt(peg$currPos))) {
				s2 = input.charAt(peg$currPos);
				peg$currPos++;
			} else {
				s2 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c78);
			}
			if (s2 !== peg$FAILED) while (s2 !== peg$FAILED) {
				s1.push(s2);
				s2 = peg$parseDblQuoteEscapedChar();
				if (s2 === peg$FAILED) if (peg$c77.test(input.charAt(peg$currPos))) {
					s2 = input.charAt(peg$currPos);
					peg$currPos++;
				} else {
					s2 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c78);
				}
			}
			else s1 = peg$FAILED;
			if (s1 !== peg$FAILED) {
				peg$savedPos = s0;
				s1 = peg$c76(s1);
			}
			s0 = s1;
			return s0;
		}
		function peg$parseDblQuoteEscapedChar() {
			var s0 = peg$currPos, s1, s2;
			if (input.substr(peg$currPos, 2) === peg$c79) {
				s1 = peg$c79;
				peg$currPos += 2;
			} else {
				s1 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c80);
			}
			if (s1 !== peg$FAILED) {
				peg$savedPos = s0;
				s1 = peg$c81();
			}
			s0 = s1;
			if (s0 === peg$FAILED) {
				s0 = peg$currPos;
				if (input.charCodeAt(peg$currPos) === 92) {
					s1 = peg$c82;
					peg$currPos++;
				} else {
					s1 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c83);
				}
				if (s1 !== peg$FAILED) {
					if (peg$c84.test(input.charAt(peg$currPos))) {
						s2 = input.charAt(peg$currPos);
						peg$currPos++;
					} else {
						s2 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c85);
					}
					if (s2 !== peg$FAILED) {
						peg$savedPos = s0;
						s1 = peg$c86(s2);
						s0 = s1;
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			}
			return s0;
		}
		function peg$parseCQuoteStringText() {
			var s0 = peg$currPos, s1 = [], s2 = peg$parseCQuoteEscapedChar();
			if (s2 === peg$FAILED) if (peg$c74.test(input.charAt(peg$currPos))) {
				s2 = input.charAt(peg$currPos);
				peg$currPos++;
			} else {
				s2 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c75);
			}
			while (s2 !== peg$FAILED) {
				s1.push(s2);
				s2 = peg$parseCQuoteEscapedChar();
				if (s2 === peg$FAILED) if (peg$c74.test(input.charAt(peg$currPos))) {
					s2 = input.charAt(peg$currPos);
					peg$currPos++;
				} else {
					s2 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c75);
				}
			}
			if (s1 !== peg$FAILED) {
				peg$savedPos = s0;
				s1 = peg$c76(s1);
			}
			s0 = s1;
			return s0;
		}
		function peg$parseCQuoteEscapedChar() {
			var s0 = peg$currPos, s1, s2;
			if (input.substr(peg$currPos, 2) === peg$c87) {
				s1 = peg$c87;
				peg$currPos += 2;
			} else {
				s1 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c88);
			}
			if (s1 !== peg$FAILED) {
				peg$savedPos = s0;
				s1 = peg$c89();
			}
			s0 = s1;
			if (s0 === peg$FAILED) {
				s0 = peg$currPos;
				if (input.substr(peg$currPos, 2) === peg$c90) {
					s1 = peg$c90;
					peg$currPos += 2;
				} else {
					s1 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c91);
				}
				if (s1 !== peg$FAILED) {
					peg$savedPos = s0;
					s1 = peg$c92();
				}
				s0 = s1;
				if (s0 === peg$FAILED) {
					s0 = peg$currPos;
					if (input.charCodeAt(peg$currPos) === 92) {
						s1 = peg$c82;
						peg$currPos++;
					} else {
						s1 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c83);
					}
					if (s1 !== peg$FAILED) {
						if (peg$c93.test(input.charAt(peg$currPos))) {
							s2 = input.charAt(peg$currPos);
							peg$currPos++;
						} else {
							s2 = peg$FAILED;
							if (peg$silentFails === 0) peg$fail(peg$c94);
						}
						if (s2 !== peg$FAILED) {
							peg$savedPos = s0;
							s1 = peg$c95();
							s0 = s1;
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
					if (s0 === peg$FAILED) {
						s0 = peg$currPos;
						if (input.substr(peg$currPos, 2) === peg$c96) {
							s1 = peg$c96;
							peg$currPos += 2;
						} else {
							s1 = peg$FAILED;
							if (peg$silentFails === 0) peg$fail(peg$c97);
						}
						if (s1 !== peg$FAILED) {
							peg$savedPos = s0;
							s1 = peg$c98();
						}
						s0 = s1;
						if (s0 === peg$FAILED) {
							s0 = peg$currPos;
							if (input.substr(peg$currPos, 2) === peg$c99) {
								s1 = peg$c99;
								peg$currPos += 2;
							} else {
								s1 = peg$FAILED;
								if (peg$silentFails === 0) peg$fail(peg$c100);
							}
							if (s1 !== peg$FAILED) {
								peg$savedPos = s0;
								s1 = peg$c101();
							}
							s0 = s1;
							if (s0 === peg$FAILED) {
								s0 = peg$currPos;
								if (input.substr(peg$currPos, 2) === peg$c102) {
									s1 = peg$c102;
									peg$currPos += 2;
								} else {
									s1 = peg$FAILED;
									if (peg$silentFails === 0) peg$fail(peg$c103);
								}
								if (s1 !== peg$FAILED) {
									peg$savedPos = s0;
									s1 = peg$c104();
								}
								s0 = s1;
								if (s0 === peg$FAILED) {
									s0 = peg$currPos;
									if (input.substr(peg$currPos, 2) === peg$c105) {
										s1 = peg$c105;
										peg$currPos += 2;
									} else {
										s1 = peg$FAILED;
										if (peg$silentFails === 0) peg$fail(peg$c106);
									}
									if (s1 !== peg$FAILED) {
										peg$savedPos = s0;
										s1 = peg$c107();
									}
									s0 = s1;
									if (s0 === peg$FAILED) {
										s0 = peg$currPos;
										if (input.substr(peg$currPos, 2) === peg$c108) {
											s1 = peg$c108;
											peg$currPos += 2;
										} else {
											s1 = peg$FAILED;
											if (peg$silentFails === 0) peg$fail(peg$c109);
										}
										if (s1 !== peg$FAILED) {
											peg$savedPos = s0;
											s1 = peg$c110();
										}
										s0 = s1;
										if (s0 === peg$FAILED) {
											s0 = peg$currPos;
											if (input.charCodeAt(peg$currPos) === 92) {
												s1 = peg$c82;
												peg$currPos++;
											} else {
												s1 = peg$FAILED;
												if (peg$silentFails === 0) peg$fail(peg$c83);
											}
											if (s1 !== peg$FAILED) {
												if (peg$c111.test(input.charAt(peg$currPos))) {
													s2 = input.charAt(peg$currPos);
													peg$currPos++;
												} else {
													s2 = peg$FAILED;
													if (peg$silentFails === 0) peg$fail(peg$c112);
												}
												if (s2 !== peg$FAILED) {
													peg$savedPos = s0;
													s1 = peg$c86(s2);
													s0 = s1;
												} else {
													peg$currPos = s0;
													s0 = peg$FAILED;
												}
											} else {
												peg$currPos = s0;
												s0 = peg$FAILED;
											}
											if (s0 === peg$FAILED) s0 = peg$parseHexCodeString();
										}
									}
								}
							}
						}
					}
				}
			}
			return s0;
		}
		function peg$parseHexCodeString() {
			var s0 = peg$currPos, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11;
			if (input.charCodeAt(peg$currPos) === 92) {
				s1 = peg$c82;
				peg$currPos++;
			} else {
				s1 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c83);
			}
			if (s1 !== peg$FAILED) {
				s2 = peg$parseHexCodeChar0();
				if (s2 !== peg$FAILED) {
					peg$savedPos = s0;
					s1 = peg$c113(s2);
					s0 = s1;
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			if (s0 === peg$FAILED) {
				s0 = peg$currPos;
				if (input.substr(peg$currPos, 2) === peg$c114) {
					s1 = peg$c114;
					peg$currPos += 2;
				} else {
					s1 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c115);
				}
				if (s1 !== peg$FAILED) {
					s2 = peg$currPos;
					s3 = peg$currPos;
					s4 = peg$parseHexCodeChar0();
					if (s4 !== peg$FAILED) {
						s5 = peg$parseHexCodeChar();
						if (s5 !== peg$FAILED) {
							s4 = [s4, s5];
							s3 = s4;
						} else {
							peg$currPos = s3;
							s3 = peg$FAILED;
						}
					} else {
						peg$currPos = s3;
						s3 = peg$FAILED;
					}
					if (s3 === peg$FAILED) s3 = peg$parseHexCodeChar0();
					if (s3 !== peg$FAILED) s2 = input.substring(s2, peg$currPos);
					else s2 = s3;
					if (s2 !== peg$FAILED) {
						peg$savedPos = s0;
						s1 = peg$c113(s2);
						s0 = s1;
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				if (s0 === peg$FAILED) {
					s0 = peg$currPos;
					if (input.substr(peg$currPos, 2) === peg$c116) {
						s1 = peg$c116;
						peg$currPos += 2;
					} else {
						s1 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c117);
					}
					if (s1 !== peg$FAILED) {
						s2 = peg$currPos;
						s3 = peg$currPos;
						s4 = peg$parseHexCodeChar();
						if (s4 !== peg$FAILED) {
							s5 = peg$parseHexCodeChar();
							if (s5 !== peg$FAILED) {
								s6 = peg$parseHexCodeChar();
								if (s6 !== peg$FAILED) {
									s7 = peg$parseHexCodeChar();
									if (s7 !== peg$FAILED) {
										s4 = [
											s4,
											s5,
											s6,
											s7
										];
										s3 = s4;
									} else {
										peg$currPos = s3;
										s3 = peg$FAILED;
									}
								} else {
									peg$currPos = s3;
									s3 = peg$FAILED;
								}
							} else {
								peg$currPos = s3;
								s3 = peg$FAILED;
							}
						} else {
							peg$currPos = s3;
							s3 = peg$FAILED;
						}
						if (s3 !== peg$FAILED) s2 = input.substring(s2, peg$currPos);
						else s2 = s3;
						if (s2 !== peg$FAILED) {
							peg$savedPos = s0;
							s1 = peg$c113(s2);
							s0 = s1;
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
					if (s0 === peg$FAILED) {
						s0 = peg$currPos;
						if (input.substr(peg$currPos, 2) === peg$c118) {
							s1 = peg$c118;
							peg$currPos += 2;
						} else {
							s1 = peg$FAILED;
							if (peg$silentFails === 0) peg$fail(peg$c119);
						}
						if (s1 !== peg$FAILED) {
							s2 = peg$currPos;
							s3 = peg$currPos;
							s4 = peg$parseHexCodeChar();
							if (s4 !== peg$FAILED) {
								s5 = peg$parseHexCodeChar();
								if (s5 !== peg$FAILED) {
									s6 = peg$parseHexCodeChar();
									if (s6 !== peg$FAILED) {
										s7 = peg$parseHexCodeChar();
										if (s7 !== peg$FAILED) {
											s8 = peg$parseHexCodeChar();
											if (s8 !== peg$FAILED) {
												s9 = peg$parseHexCodeChar();
												if (s9 !== peg$FAILED) {
													s10 = peg$parseHexCodeChar();
													if (s10 !== peg$FAILED) {
														s11 = peg$parseHexCodeChar();
														if (s11 !== peg$FAILED) {
															s4 = [
																s4,
																s5,
																s6,
																s7,
																s8,
																s9,
																s10,
																s11
															];
															s3 = s4;
														} else {
															peg$currPos = s3;
															s3 = peg$FAILED;
														}
													} else {
														peg$currPos = s3;
														s3 = peg$FAILED;
													}
												} else {
													peg$currPos = s3;
													s3 = peg$FAILED;
												}
											} else {
												peg$currPos = s3;
												s3 = peg$FAILED;
											}
										} else {
											peg$currPos = s3;
											s3 = peg$FAILED;
										}
									} else {
										peg$currPos = s3;
										s3 = peg$FAILED;
									}
								} else {
									peg$currPos = s3;
									s3 = peg$FAILED;
								}
							} else {
								peg$currPos = s3;
								s3 = peg$FAILED;
							}
							if (s3 !== peg$FAILED) s2 = input.substring(s2, peg$currPos);
							else s2 = s3;
							if (s2 !== peg$FAILED) {
								peg$savedPos = s0;
								s1 = peg$c120(s2);
								s0 = s1;
							} else {
								peg$currPos = s0;
								s0 = peg$FAILED;
							}
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					}
				}
			}
			return s0;
		}
		function peg$parseHexCodeChar0() {
			var s0;
			if (peg$c121.test(input.charAt(peg$currPos))) {
				s0 = input.charAt(peg$currPos);
				peg$currPos++;
			} else {
				s0 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c122);
			}
			return s0;
		}
		function peg$parseHexCodeChar() {
			var s0;
			if (peg$c123.test(input.charAt(peg$currPos))) {
				s0 = input.charAt(peg$currPos);
				peg$currPos++;
			} else {
				s0 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c124);
			}
			return s0;
		}
		function peg$parsePlainStringText() {
			var s0 = peg$currPos, s1 = [], s2 = peg$currPos, s3, s4;
			if (input.charCodeAt(peg$currPos) === 92) {
				s3 = peg$c82;
				peg$currPos++;
			} else {
				s3 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c83);
			}
			if (s3 !== peg$FAILED) {
				if (input.length > peg$currPos) {
					s4 = input.charAt(peg$currPos);
					peg$currPos++;
				} else {
					s4 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c125);
				}
				if (s4 !== peg$FAILED) {
					peg$savedPos = s2;
					s3 = peg$c86(s4);
					s2 = s3;
				} else {
					peg$currPos = s2;
					s2 = peg$FAILED;
				}
			} else {
				peg$currPos = s2;
				s2 = peg$FAILED;
			}
			if (s2 === peg$FAILED) {
				s2 = peg$currPos;
				if (input.substr(peg$currPos, 2) === peg$c126) {
					s3 = peg$c126;
					peg$currPos += 2;
				} else {
					s3 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c127);
				}
				if (s3 !== peg$FAILED) {
					peg$savedPos = s2;
					s3 = peg$c128();
				}
				s2 = s3;
				if (s2 === peg$FAILED) {
					s2 = peg$currPos;
					s3 = peg$currPos;
					peg$silentFails++;
					s4 = peg$parseSpecialShellChars();
					peg$silentFails--;
					if (s4 === peg$FAILED) s3 = void 0;
					else {
						peg$currPos = s3;
						s3 = peg$FAILED;
					}
					if (s3 !== peg$FAILED) {
						if (input.length > peg$currPos) {
							s4 = input.charAt(peg$currPos);
							peg$currPos++;
						} else {
							s4 = peg$FAILED;
							if (peg$silentFails === 0) peg$fail(peg$c125);
						}
						if (s4 !== peg$FAILED) {
							peg$savedPos = s2;
							s3 = peg$c86(s4);
							s2 = s3;
						} else {
							peg$currPos = s2;
							s2 = peg$FAILED;
						}
					} else {
						peg$currPos = s2;
						s2 = peg$FAILED;
					}
				}
			}
			if (s2 !== peg$FAILED) while (s2 !== peg$FAILED) {
				s1.push(s2);
				s2 = peg$currPos;
				if (input.charCodeAt(peg$currPos) === 92) {
					s3 = peg$c82;
					peg$currPos++;
				} else {
					s3 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c83);
				}
				if (s3 !== peg$FAILED) {
					if (input.length > peg$currPos) {
						s4 = input.charAt(peg$currPos);
						peg$currPos++;
					} else {
						s4 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c125);
					}
					if (s4 !== peg$FAILED) {
						peg$savedPos = s2;
						s3 = peg$c86(s4);
						s2 = s3;
					} else {
						peg$currPos = s2;
						s2 = peg$FAILED;
					}
				} else {
					peg$currPos = s2;
					s2 = peg$FAILED;
				}
				if (s2 === peg$FAILED) {
					s2 = peg$currPos;
					if (input.substr(peg$currPos, 2) === peg$c126) {
						s3 = peg$c126;
						peg$currPos += 2;
					} else {
						s3 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c127);
					}
					if (s3 !== peg$FAILED) {
						peg$savedPos = s2;
						s3 = peg$c128();
					}
					s2 = s3;
					if (s2 === peg$FAILED) {
						s2 = peg$currPos;
						s3 = peg$currPos;
						peg$silentFails++;
						s4 = peg$parseSpecialShellChars();
						peg$silentFails--;
						if (s4 === peg$FAILED) s3 = void 0;
						else {
							peg$currPos = s3;
							s3 = peg$FAILED;
						}
						if (s3 !== peg$FAILED) {
							if (input.length > peg$currPos) {
								s4 = input.charAt(peg$currPos);
								peg$currPos++;
							} else {
								s4 = peg$FAILED;
								if (peg$silentFails === 0) peg$fail(peg$c125);
							}
							if (s4 !== peg$FAILED) {
								peg$savedPos = s2;
								s3 = peg$c86(s4);
								s2 = s3;
							} else {
								peg$currPos = s2;
								s2 = peg$FAILED;
							}
						} else {
							peg$currPos = s2;
							s2 = peg$FAILED;
						}
					}
				}
			}
			else s1 = peg$FAILED;
			if (s1 !== peg$FAILED) {
				peg$savedPos = s0;
				s1 = peg$c76(s1);
			}
			s0 = s1;
			return s0;
		}
		function peg$parseArithmeticPrimary() {
			var s0 = peg$currPos, s1, s2, s3, s4, s5;
			if (input.charCodeAt(peg$currPos) === 45) {
				s1 = peg$c129;
				peg$currPos++;
			} else {
				s1 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c130);
			}
			if (s1 === peg$FAILED) if (input.charCodeAt(peg$currPos) === 43) {
				s1 = peg$c131;
				peg$currPos++;
			} else {
				s1 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c132);
			}
			if (s1 === peg$FAILED) s1 = null;
			if (s1 !== peg$FAILED) {
				s2 = [];
				if (peg$c38.test(input.charAt(peg$currPos))) {
					s3 = input.charAt(peg$currPos);
					peg$currPos++;
				} else {
					s3 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c39);
				}
				if (s3 !== peg$FAILED) while (s3 !== peg$FAILED) {
					s2.push(s3);
					if (peg$c38.test(input.charAt(peg$currPos))) {
						s3 = input.charAt(peg$currPos);
						peg$currPos++;
					} else {
						s3 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c39);
					}
				}
				else s2 = peg$FAILED;
				if (s2 !== peg$FAILED) {
					if (input.charCodeAt(peg$currPos) === 46) {
						s3 = peg$c133;
						peg$currPos++;
					} else {
						s3 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c134);
					}
					if (s3 !== peg$FAILED) {
						s4 = [];
						if (peg$c38.test(input.charAt(peg$currPos))) {
							s5 = input.charAt(peg$currPos);
							peg$currPos++;
						} else {
							s5 = peg$FAILED;
							if (peg$silentFails === 0) peg$fail(peg$c39);
						}
						if (s5 !== peg$FAILED) while (s5 !== peg$FAILED) {
							s4.push(s5);
							if (peg$c38.test(input.charAt(peg$currPos))) {
								s5 = input.charAt(peg$currPos);
								peg$currPos++;
							} else {
								s5 = peg$FAILED;
								if (peg$silentFails === 0) peg$fail(peg$c39);
							}
						}
						else s4 = peg$FAILED;
						if (s4 !== peg$FAILED) {
							peg$savedPos = s0;
							s1 = peg$c135(s1, s2, s4);
							s0 = s1;
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			if (s0 === peg$FAILED) {
				s0 = peg$currPos;
				if (input.charCodeAt(peg$currPos) === 45) {
					s1 = peg$c129;
					peg$currPos++;
				} else {
					s1 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c130);
				}
				if (s1 === peg$FAILED) if (input.charCodeAt(peg$currPos) === 43) {
					s1 = peg$c131;
					peg$currPos++;
				} else {
					s1 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c132);
				}
				if (s1 === peg$FAILED) s1 = null;
				if (s1 !== peg$FAILED) {
					s2 = [];
					if (peg$c38.test(input.charAt(peg$currPos))) {
						s3 = input.charAt(peg$currPos);
						peg$currPos++;
					} else {
						s3 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c39);
					}
					if (s3 !== peg$FAILED) while (s3 !== peg$FAILED) {
						s2.push(s3);
						if (peg$c38.test(input.charAt(peg$currPos))) {
							s3 = input.charAt(peg$currPos);
							peg$currPos++;
						} else {
							s3 = peg$FAILED;
							if (peg$silentFails === 0) peg$fail(peg$c39);
						}
					}
					else s2 = peg$FAILED;
					if (s2 !== peg$FAILED) {
						peg$savedPos = s0;
						s1 = peg$c136(s1, s2);
						s0 = s1;
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				if (s0 === peg$FAILED) {
					s0 = peg$currPos;
					s1 = peg$parseVariable();
					if (s1 !== peg$FAILED) {
						peg$savedPos = s0;
						s1 = peg$c137(s1);
					}
					s0 = s1;
					if (s0 === peg$FAILED) {
						s0 = peg$currPos;
						s1 = peg$parseIdentifier();
						if (s1 !== peg$FAILED) {
							peg$savedPos = s0;
							s1 = peg$c138(s1);
						}
						s0 = s1;
						if (s0 === peg$FAILED) {
							s0 = peg$currPos;
							if (input.charCodeAt(peg$currPos) === 40) {
								s1 = peg$c24;
								peg$currPos++;
							} else {
								s1 = peg$FAILED;
								if (peg$silentFails === 0) peg$fail(peg$c25);
							}
							if (s1 !== peg$FAILED) {
								s2 = [];
								s3 = peg$parseS();
								while (s3 !== peg$FAILED) {
									s2.push(s3);
									s3 = peg$parseS();
								}
								if (s2 !== peg$FAILED) {
									s3 = peg$parseArithmeticExpression();
									if (s3 !== peg$FAILED) {
										s4 = [];
										s5 = peg$parseS();
										while (s5 !== peg$FAILED) {
											s4.push(s5);
											s5 = peg$parseS();
										}
										if (s4 !== peg$FAILED) {
											if (input.charCodeAt(peg$currPos) === 41) {
												s5 = peg$c26;
												peg$currPos++;
											} else {
												s5 = peg$FAILED;
												if (peg$silentFails === 0) peg$fail(peg$c27);
											}
											if (s5 !== peg$FAILED) {
												peg$savedPos = s0;
												s1 = peg$c139(s3);
												s0 = s1;
											} else {
												peg$currPos = s0;
												s0 = peg$FAILED;
											}
										} else {
											peg$currPos = s0;
											s0 = peg$FAILED;
										}
									} else {
										peg$currPos = s0;
										s0 = peg$FAILED;
									}
								} else {
									peg$currPos = s0;
									s0 = peg$FAILED;
								}
							} else {
								peg$currPos = s0;
								s0 = peg$FAILED;
							}
						}
					}
				}
			}
			return s0;
		}
		function peg$parseArithmeticTimesExpression() {
			var s0 = peg$currPos, s1 = peg$parseArithmeticPrimary(), s2, s3, s4, s5, s6, s7;
			if (s1 !== peg$FAILED) {
				s2 = [];
				s3 = peg$currPos;
				s4 = [];
				s5 = peg$parseS();
				while (s5 !== peg$FAILED) {
					s4.push(s5);
					s5 = peg$parseS();
				}
				if (s4 !== peg$FAILED) {
					if (input.charCodeAt(peg$currPos) === 42) {
						s5 = peg$c140;
						peg$currPos++;
					} else {
						s5 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c141);
					}
					if (s5 === peg$FAILED) if (input.charCodeAt(peg$currPos) === 47) {
						s5 = peg$c142;
						peg$currPos++;
					} else {
						s5 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c143);
					}
					if (s5 !== peg$FAILED) {
						s6 = [];
						s7 = peg$parseS();
						while (s7 !== peg$FAILED) {
							s6.push(s7);
							s7 = peg$parseS();
						}
						if (s6 !== peg$FAILED) {
							s7 = peg$parseArithmeticPrimary();
							if (s7 !== peg$FAILED) {
								peg$savedPos = s3;
								s4 = peg$c144(s1, s5, s7);
								s3 = s4;
							} else {
								peg$currPos = s3;
								s3 = peg$FAILED;
							}
						} else {
							peg$currPos = s3;
							s3 = peg$FAILED;
						}
					} else {
						peg$currPos = s3;
						s3 = peg$FAILED;
					}
				} else {
					peg$currPos = s3;
					s3 = peg$FAILED;
				}
				while (s3 !== peg$FAILED) {
					s2.push(s3);
					s3 = peg$currPos;
					s4 = [];
					s5 = peg$parseS();
					while (s5 !== peg$FAILED) {
						s4.push(s5);
						s5 = peg$parseS();
					}
					if (s4 !== peg$FAILED) {
						if (input.charCodeAt(peg$currPos) === 42) {
							s5 = peg$c140;
							peg$currPos++;
						} else {
							s5 = peg$FAILED;
							if (peg$silentFails === 0) peg$fail(peg$c141);
						}
						if (s5 === peg$FAILED) if (input.charCodeAt(peg$currPos) === 47) {
							s5 = peg$c142;
							peg$currPos++;
						} else {
							s5 = peg$FAILED;
							if (peg$silentFails === 0) peg$fail(peg$c143);
						}
						if (s5 !== peg$FAILED) {
							s6 = [];
							s7 = peg$parseS();
							while (s7 !== peg$FAILED) {
								s6.push(s7);
								s7 = peg$parseS();
							}
							if (s6 !== peg$FAILED) {
								s7 = peg$parseArithmeticPrimary();
								if (s7 !== peg$FAILED) {
									peg$savedPos = s3;
									s4 = peg$c144(s1, s5, s7);
									s3 = s4;
								} else {
									peg$currPos = s3;
									s3 = peg$FAILED;
								}
							} else {
								peg$currPos = s3;
								s3 = peg$FAILED;
							}
						} else {
							peg$currPos = s3;
							s3 = peg$FAILED;
						}
					} else {
						peg$currPos = s3;
						s3 = peg$FAILED;
					}
				}
				if (s2 !== peg$FAILED) {
					peg$savedPos = s0;
					s1 = peg$c145(s1, s2);
					s0 = s1;
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			return s0;
		}
		function peg$parseArithmeticExpression() {
			var s0 = peg$currPos, s1 = peg$parseArithmeticTimesExpression(), s2, s3, s4, s5, s6, s7;
			if (s1 !== peg$FAILED) {
				s2 = [];
				s3 = peg$currPos;
				s4 = [];
				s5 = peg$parseS();
				while (s5 !== peg$FAILED) {
					s4.push(s5);
					s5 = peg$parseS();
				}
				if (s4 !== peg$FAILED) {
					if (input.charCodeAt(peg$currPos) === 43) {
						s5 = peg$c131;
						peg$currPos++;
					} else {
						s5 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c132);
					}
					if (s5 === peg$FAILED) if (input.charCodeAt(peg$currPos) === 45) {
						s5 = peg$c129;
						peg$currPos++;
					} else {
						s5 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c130);
					}
					if (s5 !== peg$FAILED) {
						s6 = [];
						s7 = peg$parseS();
						while (s7 !== peg$FAILED) {
							s6.push(s7);
							s7 = peg$parseS();
						}
						if (s6 !== peg$FAILED) {
							s7 = peg$parseArithmeticTimesExpression();
							if (s7 !== peg$FAILED) {
								peg$savedPos = s3;
								s4 = peg$c146(s1, s5, s7);
								s3 = s4;
							} else {
								peg$currPos = s3;
								s3 = peg$FAILED;
							}
						} else {
							peg$currPos = s3;
							s3 = peg$FAILED;
						}
					} else {
						peg$currPos = s3;
						s3 = peg$FAILED;
					}
				} else {
					peg$currPos = s3;
					s3 = peg$FAILED;
				}
				while (s3 !== peg$FAILED) {
					s2.push(s3);
					s3 = peg$currPos;
					s4 = [];
					s5 = peg$parseS();
					while (s5 !== peg$FAILED) {
						s4.push(s5);
						s5 = peg$parseS();
					}
					if (s4 !== peg$FAILED) {
						if (input.charCodeAt(peg$currPos) === 43) {
							s5 = peg$c131;
							peg$currPos++;
						} else {
							s5 = peg$FAILED;
							if (peg$silentFails === 0) peg$fail(peg$c132);
						}
						if (s5 === peg$FAILED) if (input.charCodeAt(peg$currPos) === 45) {
							s5 = peg$c129;
							peg$currPos++;
						} else {
							s5 = peg$FAILED;
							if (peg$silentFails === 0) peg$fail(peg$c130);
						}
						if (s5 !== peg$FAILED) {
							s6 = [];
							s7 = peg$parseS();
							while (s7 !== peg$FAILED) {
								s6.push(s7);
								s7 = peg$parseS();
							}
							if (s6 !== peg$FAILED) {
								s7 = peg$parseArithmeticTimesExpression();
								if (s7 !== peg$FAILED) {
									peg$savedPos = s3;
									s4 = peg$c146(s1, s5, s7);
									s3 = s4;
								} else {
									peg$currPos = s3;
									s3 = peg$FAILED;
								}
							} else {
								peg$currPos = s3;
								s3 = peg$FAILED;
							}
						} else {
							peg$currPos = s3;
							s3 = peg$FAILED;
						}
					} else {
						peg$currPos = s3;
						s3 = peg$FAILED;
					}
				}
				if (s2 !== peg$FAILED) {
					peg$savedPos = s0;
					s1 = peg$c145(s1, s2);
					s0 = s1;
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			return s0;
		}
		function peg$parseArithmetic() {
			var s0 = peg$currPos, s1, s2, s3, s4, s5;
			if (input.substr(peg$currPos, 3) === peg$c147) {
				s1 = peg$c147;
				peg$currPos += 3;
			} else {
				s1 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c148);
			}
			if (s1 !== peg$FAILED) {
				s2 = [];
				s3 = peg$parseS();
				while (s3 !== peg$FAILED) {
					s2.push(s3);
					s3 = peg$parseS();
				}
				if (s2 !== peg$FAILED) {
					s3 = peg$parseArithmeticExpression();
					if (s3 !== peg$FAILED) {
						s4 = [];
						s5 = peg$parseS();
						while (s5 !== peg$FAILED) {
							s4.push(s5);
							s5 = peg$parseS();
						}
						if (s4 !== peg$FAILED) {
							if (input.substr(peg$currPos, 2) === peg$c149) {
								s5 = peg$c149;
								peg$currPos += 2;
							} else {
								s5 = peg$FAILED;
								if (peg$silentFails === 0) peg$fail(peg$c150);
							}
							if (s5 !== peg$FAILED) {
								peg$savedPos = s0;
								s1 = peg$c151(s3);
								s0 = s1;
							} else {
								peg$currPos = s0;
								s0 = peg$FAILED;
							}
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			return s0;
		}
		function peg$parseSubshell() {
			var s0 = peg$currPos, s1, s2, s3;
			if (input.substr(peg$currPos, 2) === peg$c152) {
				s1 = peg$c152;
				peg$currPos += 2;
			} else {
				s1 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c153);
			}
			if (s1 !== peg$FAILED) {
				s2 = peg$parseShellLine();
				if (s2 !== peg$FAILED) {
					if (input.charCodeAt(peg$currPos) === 41) {
						s3 = peg$c26;
						peg$currPos++;
					} else {
						s3 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c27);
					}
					if (s3 !== peg$FAILED) {
						peg$savedPos = s0;
						s1 = peg$c154(s2);
						s0 = s1;
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			return s0;
		}
		function peg$parseVariable() {
			var s0 = peg$currPos, s1, s2, s3, s4, s5;
			if (input.substr(peg$currPos, 2) === peg$c155) {
				s1 = peg$c155;
				peg$currPos += 2;
			} else {
				s1 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c156);
			}
			if (s1 !== peg$FAILED) {
				s2 = peg$parseIdentifier();
				if (s2 !== peg$FAILED) {
					if (input.substr(peg$currPos, 2) === peg$c157) {
						s3 = peg$c157;
						peg$currPos += 2;
					} else {
						s3 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c158);
					}
					if (s3 !== peg$FAILED) {
						s4 = peg$parseCommandString();
						if (s4 !== peg$FAILED) {
							if (input.charCodeAt(peg$currPos) === 125) {
								s5 = peg$c31;
								peg$currPos++;
							} else {
								s5 = peg$FAILED;
								if (peg$silentFails === 0) peg$fail(peg$c32);
							}
							if (s5 !== peg$FAILED) {
								peg$savedPos = s0;
								s1 = peg$c159(s2, s4);
								s0 = s1;
							} else {
								peg$currPos = s0;
								s0 = peg$FAILED;
							}
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			if (s0 === peg$FAILED) {
				s0 = peg$currPos;
				if (input.substr(peg$currPos, 2) === peg$c155) {
					s1 = peg$c155;
					peg$currPos += 2;
				} else {
					s1 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c156);
				}
				if (s1 !== peg$FAILED) {
					s2 = peg$parseIdentifier();
					if (s2 !== peg$FAILED) {
						if (input.substr(peg$currPos, 3) === peg$c160) {
							s3 = peg$c160;
							peg$currPos += 3;
						} else {
							s3 = peg$FAILED;
							if (peg$silentFails === 0) peg$fail(peg$c161);
						}
						if (s3 !== peg$FAILED) {
							peg$savedPos = s0;
							s1 = peg$c162(s2);
							s0 = s1;
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				if (s0 === peg$FAILED) {
					s0 = peg$currPos;
					if (input.substr(peg$currPos, 2) === peg$c155) {
						s1 = peg$c155;
						peg$currPos += 2;
					} else {
						s1 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c156);
					}
					if (s1 !== peg$FAILED) {
						s2 = peg$parseIdentifier();
						if (s2 !== peg$FAILED) {
							if (input.substr(peg$currPos, 2) === peg$c163) {
								s3 = peg$c163;
								peg$currPos += 2;
							} else {
								s3 = peg$FAILED;
								if (peg$silentFails === 0) peg$fail(peg$c164);
							}
							if (s3 !== peg$FAILED) {
								s4 = peg$parseCommandString();
								if (s4 !== peg$FAILED) {
									if (input.charCodeAt(peg$currPos) === 125) {
										s5 = peg$c31;
										peg$currPos++;
									} else {
										s5 = peg$FAILED;
										if (peg$silentFails === 0) peg$fail(peg$c32);
									}
									if (s5 !== peg$FAILED) {
										peg$savedPos = s0;
										s1 = peg$c165(s2, s4);
										s0 = s1;
									} else {
										peg$currPos = s0;
										s0 = peg$FAILED;
									}
								} else {
									peg$currPos = s0;
									s0 = peg$FAILED;
								}
							} else {
								peg$currPos = s0;
								s0 = peg$FAILED;
							}
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
					if (s0 === peg$FAILED) {
						s0 = peg$currPos;
						if (input.substr(peg$currPos, 2) === peg$c155) {
							s1 = peg$c155;
							peg$currPos += 2;
						} else {
							s1 = peg$FAILED;
							if (peg$silentFails === 0) peg$fail(peg$c156);
						}
						if (s1 !== peg$FAILED) {
							s2 = peg$parseIdentifier();
							if (s2 !== peg$FAILED) {
								if (input.substr(peg$currPos, 3) === peg$c166) {
									s3 = peg$c166;
									peg$currPos += 3;
								} else {
									s3 = peg$FAILED;
									if (peg$silentFails === 0) peg$fail(peg$c167);
								}
								if (s3 !== peg$FAILED) {
									peg$savedPos = s0;
									s1 = peg$c168(s2);
									s0 = s1;
								} else {
									peg$currPos = s0;
									s0 = peg$FAILED;
								}
							} else {
								peg$currPos = s0;
								s0 = peg$FAILED;
							}
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
						if (s0 === peg$FAILED) {
							s0 = peg$currPos;
							if (input.substr(peg$currPos, 2) === peg$c155) {
								s1 = peg$c155;
								peg$currPos += 2;
							} else {
								s1 = peg$FAILED;
								if (peg$silentFails === 0) peg$fail(peg$c156);
							}
							if (s1 !== peg$FAILED) {
								s2 = peg$parseIdentifier();
								if (s2 !== peg$FAILED) {
									if (input.charCodeAt(peg$currPos) === 125) {
										s3 = peg$c31;
										peg$currPos++;
									} else {
										s3 = peg$FAILED;
										if (peg$silentFails === 0) peg$fail(peg$c32);
									}
									if (s3 !== peg$FAILED) {
										peg$savedPos = s0;
										s1 = peg$c169(s2);
										s0 = s1;
									} else {
										peg$currPos = s0;
										s0 = peg$FAILED;
									}
								} else {
									peg$currPos = s0;
									s0 = peg$FAILED;
								}
							} else {
								peg$currPos = s0;
								s0 = peg$FAILED;
							}
							if (s0 === peg$FAILED) {
								s0 = peg$currPos;
								if (input.charCodeAt(peg$currPos) === 36) {
									s1 = peg$c170;
									peg$currPos++;
								} else {
									s1 = peg$FAILED;
									if (peg$silentFails === 0) peg$fail(peg$c171);
								}
								if (s1 !== peg$FAILED) {
									s2 = peg$parseIdentifier();
									if (s2 !== peg$FAILED) {
										peg$savedPos = s0;
										s1 = peg$c169(s2);
										s0 = s1;
									} else {
										peg$currPos = s0;
										s0 = peg$FAILED;
									}
								} else {
									peg$currPos = s0;
									s0 = peg$FAILED;
								}
							}
						}
					}
				}
			}
			return s0;
		}
		function peg$parseGlob() {
			var s0 = peg$currPos, s1 = peg$parseGlobText(), s2;
			if (s1 !== peg$FAILED) {
				peg$savedPos = peg$currPos;
				s2 = peg$c172(s1);
				if (s2) s2 = void 0;
				else s2 = peg$FAILED;
				if (s2 !== peg$FAILED) {
					peg$savedPos = s0;
					s1 = peg$c173(s1);
					s0 = s1;
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			return s0;
		}
		function peg$parseGlobText() {
			var s0 = peg$currPos, s1 = [], s2 = peg$currPos, s3 = peg$currPos, s4;
			peg$silentFails++;
			s4 = peg$parseGlobSpecialShellChars();
			peg$silentFails--;
			if (s4 === peg$FAILED) s3 = void 0;
			else {
				peg$currPos = s3;
				s3 = peg$FAILED;
			}
			if (s3 !== peg$FAILED) {
				if (input.length > peg$currPos) {
					s4 = input.charAt(peg$currPos);
					peg$currPos++;
				} else {
					s4 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c125);
				}
				if (s4 !== peg$FAILED) {
					peg$savedPos = s2;
					s3 = peg$c86(s4);
					s2 = s3;
				} else {
					peg$currPos = s2;
					s2 = peg$FAILED;
				}
			} else {
				peg$currPos = s2;
				s2 = peg$FAILED;
			}
			if (s2 !== peg$FAILED) while (s2 !== peg$FAILED) {
				s1.push(s2);
				s2 = peg$currPos;
				s3 = peg$currPos;
				peg$silentFails++;
				s4 = peg$parseGlobSpecialShellChars();
				peg$silentFails--;
				if (s4 === peg$FAILED) s3 = void 0;
				else {
					peg$currPos = s3;
					s3 = peg$FAILED;
				}
				if (s3 !== peg$FAILED) {
					if (input.length > peg$currPos) {
						s4 = input.charAt(peg$currPos);
						peg$currPos++;
					} else {
						s4 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c125);
					}
					if (s4 !== peg$FAILED) {
						peg$savedPos = s2;
						s3 = peg$c86(s4);
						s2 = s3;
					} else {
						peg$currPos = s2;
						s2 = peg$FAILED;
					}
				} else {
					peg$currPos = s2;
					s2 = peg$FAILED;
				}
			}
			else s1 = peg$FAILED;
			if (s1 !== peg$FAILED) {
				peg$savedPos = s0;
				s1 = peg$c76(s1);
			}
			s0 = s1;
			return s0;
		}
		function peg$parseEnvVariable() {
			var s0 = peg$currPos, s1 = [], s2;
			if (peg$c174.test(input.charAt(peg$currPos))) {
				s2 = input.charAt(peg$currPos);
				peg$currPos++;
			} else {
				s2 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c175);
			}
			if (s2 !== peg$FAILED) while (s2 !== peg$FAILED) {
				s1.push(s2);
				if (peg$c174.test(input.charAt(peg$currPos))) {
					s2 = input.charAt(peg$currPos);
					peg$currPos++;
				} else {
					s2 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c175);
				}
			}
			else s1 = peg$FAILED;
			if (s1 !== peg$FAILED) {
				peg$savedPos = s0;
				s1 = peg$c176();
			}
			s0 = s1;
			return s0;
		}
		function peg$parseIdentifier() {
			var s0 = peg$currPos, s1 = [], s2;
			if (peg$c177.test(input.charAt(peg$currPos))) {
				s2 = input.charAt(peg$currPos);
				peg$currPos++;
			} else {
				s2 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c178);
			}
			if (s2 !== peg$FAILED) while (s2 !== peg$FAILED) {
				s1.push(s2);
				if (peg$c177.test(input.charAt(peg$currPos))) {
					s2 = input.charAt(peg$currPos);
					peg$currPos++;
				} else {
					s2 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c178);
				}
			}
			else s1 = peg$FAILED;
			if (s1 !== peg$FAILED) {
				peg$savedPos = s0;
				s1 = peg$c176();
			}
			s0 = s1;
			return s0;
		}
		function peg$parseSpecialShellChars() {
			var s0;
			if (peg$c179.test(input.charAt(peg$currPos))) {
				s0 = input.charAt(peg$currPos);
				peg$currPos++;
			} else {
				s0 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c180);
			}
			return s0;
		}
		function peg$parseGlobSpecialShellChars() {
			var s0;
			if (peg$c181.test(input.charAt(peg$currPos))) {
				s0 = input.charAt(peg$currPos);
				peg$currPos++;
			} else {
				s0 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c182);
			}
			return s0;
		}
		function peg$parseS() {
			var s0 = [], s1;
			if (peg$c183.test(input.charAt(peg$currPos))) {
				s1 = input.charAt(peg$currPos);
				peg$currPos++;
			} else {
				s1 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c184);
			}
			if (s1 !== peg$FAILED) while (s1 !== peg$FAILED) {
				s0.push(s1);
				if (peg$c183.test(input.charAt(peg$currPos))) {
					s1 = input.charAt(peg$currPos);
					peg$currPos++;
				} else {
					s1 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c184);
				}
			}
			else s0 = peg$FAILED;
			return s0;
		}
		peg$result = peg$startRuleFunction();
		if (peg$result !== peg$FAILED && peg$currPos === input.length) return peg$result;
		else {
			if (peg$result !== peg$FAILED && peg$currPos < input.length) peg$fail(peg$endExpectation());
			throw peg$buildStructuredError(peg$maxFailExpected, peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null, peg$maxFailPos < input.length ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1) : peg$computeLocation(peg$maxFailPos, peg$maxFailPos));
		}
	}
	module.exports = {
		SyntaxError: peg$SyntaxError,
		parse: peg$parse
	};
}));
//#endregion
//#region ../../../node_modules/.pnpm/@yarnpkg+parsers@3.1.0/node_modules/@yarnpkg/parsers/lib/shell.js
var require_shell = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.parseShell = parseShell;
	const shell_1 = require_shell$1();
	function parseShell(source, options = { isGlobPattern: () => false }) {
		try {
			return (0, shell_1.parse)(source, options);
		} catch (error) {
			if (error.location) error.message = error.message.replace(/(\.)?$/, ` (line ${error.location.start.line}, column ${error.location.start.column})$1`);
			throw error;
		}
	}
	const ESCAPED_CONTROL_CHARS = new Map([
		[`\f`, `\\f`],
		[`\n`, `\\n`],
		[`\r`, `\\r`],
		[`\t`, `\\t`],
		[`\v`, `\\v`],
		[`\0`, `\\0`]
	]);
	new Map([
		[`\\`, `\\\\`],
		[`$`, `\\$`],
		[`"`, `\\"`],
		...Array.from(ESCAPED_CONTROL_CHARS, ([c, replacement]) => {
			return [c, `"$'${replacement}'"`];
		})
	]);
}));
//#endregion
//#region ../../../node_modules/.pnpm/picomatch@4.0.4/node_modules/picomatch/lib/constants.js
var require_constants = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const WIN_SLASH = "\\\\/";
	const WIN_NO_SLASH = `[^${WIN_SLASH}]`;
	const DEFAULT_MAX_EXTGLOB_RECURSION = 0;
	/**
	* Posix glob regex
	*/
	const DOT_LITERAL = "\\.";
	const PLUS_LITERAL = "\\+";
	const QMARK_LITERAL = "\\?";
	const SLASH_LITERAL = "\\/";
	const ONE_CHAR = "(?=.)";
	const QMARK = "[^/]";
	const END_ANCHOR = `(?:${SLASH_LITERAL}|$)`;
	const START_ANCHOR = `(?:^|${SLASH_LITERAL})`;
	const DOTS_SLASH = `${DOT_LITERAL}{1,2}${END_ANCHOR}`;
	const POSIX_CHARS = {
		DOT_LITERAL,
		PLUS_LITERAL,
		QMARK_LITERAL,
		SLASH_LITERAL,
		ONE_CHAR,
		QMARK,
		END_ANCHOR,
		DOTS_SLASH,
		NO_DOT: `(?!${DOT_LITERAL})`,
		NO_DOTS: `(?!${START_ANCHOR}${DOTS_SLASH})`,
		NO_DOT_SLASH: `(?!${DOT_LITERAL}{0,1}${END_ANCHOR})`,
		NO_DOTS_SLASH: `(?!${DOTS_SLASH})`,
		QMARK_NO_DOT: `[^.${SLASH_LITERAL}]`,
		STAR: `${QMARK}*?`,
		START_ANCHOR,
		SEP: "/"
	};
	/**
	* Windows glob regex
	*/
	const WINDOWS_CHARS = {
		...POSIX_CHARS,
		SLASH_LITERAL: `[${WIN_SLASH}]`,
		QMARK: WIN_NO_SLASH,
		STAR: `${WIN_NO_SLASH}*?`,
		DOTS_SLASH: `${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$)`,
		NO_DOT: `(?!${DOT_LITERAL})`,
		NO_DOTS: `(?!(?:^|[${WIN_SLASH}])${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
		NO_DOT_SLASH: `(?!${DOT_LITERAL}{0,1}(?:[${WIN_SLASH}]|$))`,
		NO_DOTS_SLASH: `(?!${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
		QMARK_NO_DOT: `[^.${WIN_SLASH}]`,
		START_ANCHOR: `(?:^|[${WIN_SLASH}])`,
		END_ANCHOR: `(?:[${WIN_SLASH}]|$)`,
		SEP: "\\"
	};
	module.exports = {
		DEFAULT_MAX_EXTGLOB_RECURSION,
		MAX_LENGTH: 1024 * 64,
		POSIX_REGEX_SOURCE: {
			__proto__: null,
			alnum: "a-zA-Z0-9",
			alpha: "a-zA-Z",
			ascii: "\\x00-\\x7F",
			blank: " \\t",
			cntrl: "\\x00-\\x1F\\x7F",
			digit: "0-9",
			graph: "\\x21-\\x7E",
			lower: "a-z",
			print: "\\x20-\\x7E ",
			punct: "\\-!\"#$%&'()\\*+,./:;<=>?@[\\]^_`{|}~",
			space: " \\t\\r\\n\\v\\f",
			upper: "A-Z",
			word: "A-Za-z0-9_",
			xdigit: "A-Fa-f0-9"
		},
		REGEX_BACKSLASH: /\\(?![*+?^${}(|)[\]])/g,
		REGEX_NON_SPECIAL_CHARS: /^[^@![\].,$*+?^{}()|\\/]+/,
		REGEX_SPECIAL_CHARS: /[-*+?.^${}(|)[\]]/,
		REGEX_SPECIAL_CHARS_BACKREF: /(\\?)((\W)(\3*))/g,
		REGEX_SPECIAL_CHARS_GLOBAL: /([-*+?.^${}(|)[\]])/g,
		REGEX_REMOVE_BACKSLASH: /(?:\[.*?[^\\]\]|\\(?=.))/g,
		REPLACEMENTS: {
			__proto__: null,
			"***": "*",
			"**/**": "**",
			"**/**/**": "**"
		},
		CHAR_0: 48,
		CHAR_9: 57,
		CHAR_UPPERCASE_A: 65,
		CHAR_LOWERCASE_A: 97,
		CHAR_UPPERCASE_Z: 90,
		CHAR_LOWERCASE_Z: 122,
		CHAR_LEFT_PARENTHESES: 40,
		CHAR_RIGHT_PARENTHESES: 41,
		CHAR_ASTERISK: 42,
		CHAR_AMPERSAND: 38,
		CHAR_AT: 64,
		CHAR_BACKWARD_SLASH: 92,
		CHAR_CARRIAGE_RETURN: 13,
		CHAR_CIRCUMFLEX_ACCENT: 94,
		CHAR_COLON: 58,
		CHAR_COMMA: 44,
		CHAR_DOT: 46,
		CHAR_DOUBLE_QUOTE: 34,
		CHAR_EQUAL: 61,
		CHAR_EXCLAMATION_MARK: 33,
		CHAR_FORM_FEED: 12,
		CHAR_FORWARD_SLASH: 47,
		CHAR_GRAVE_ACCENT: 96,
		CHAR_HASH: 35,
		CHAR_HYPHEN_MINUS: 45,
		CHAR_LEFT_ANGLE_BRACKET: 60,
		CHAR_LEFT_CURLY_BRACE: 123,
		CHAR_LEFT_SQUARE_BRACKET: 91,
		CHAR_LINE_FEED: 10,
		CHAR_NO_BREAK_SPACE: 160,
		CHAR_PERCENT: 37,
		CHAR_PLUS: 43,
		CHAR_QUESTION_MARK: 63,
		CHAR_RIGHT_ANGLE_BRACKET: 62,
		CHAR_RIGHT_CURLY_BRACE: 125,
		CHAR_RIGHT_SQUARE_BRACKET: 93,
		CHAR_SEMICOLON: 59,
		CHAR_SINGLE_QUOTE: 39,
		CHAR_SPACE: 32,
		CHAR_TAB: 9,
		CHAR_UNDERSCORE: 95,
		CHAR_VERTICAL_LINE: 124,
		CHAR_ZERO_WIDTH_NOBREAK_SPACE: 65279,
		/**
		* Create EXTGLOB_CHARS
		*/
		extglobChars(chars) {
			return {
				"!": {
					type: "negate",
					open: "(?:(?!(?:",
					close: `))${chars.STAR})`
				},
				"?": {
					type: "qmark",
					open: "(?:",
					close: ")?"
				},
				"+": {
					type: "plus",
					open: "(?:",
					close: ")+"
				},
				"*": {
					type: "star",
					open: "(?:",
					close: ")*"
				},
				"@": {
					type: "at",
					open: "(?:",
					close: ")"
				}
			};
		},
		/**
		* Create GLOB_CHARS
		*/
		globChars(win32) {
			return win32 === true ? WINDOWS_CHARS : POSIX_CHARS;
		}
	};
}));
//#endregion
//#region ../../../node_modules/.pnpm/picomatch@4.0.4/node_modules/picomatch/lib/utils.js
var require_utils = /* @__PURE__ */ __commonJSMin(((exports) => {
	const { REGEX_BACKSLASH, REGEX_REMOVE_BACKSLASH, REGEX_SPECIAL_CHARS, REGEX_SPECIAL_CHARS_GLOBAL } = require_constants();
	exports.isObject = (val) => val !== null && typeof val === "object" && !Array.isArray(val);
	exports.hasRegexChars = (str) => REGEX_SPECIAL_CHARS.test(str);
	exports.isRegexChar = (str) => str.length === 1 && exports.hasRegexChars(str);
	exports.escapeRegex = (str) => str.replace(REGEX_SPECIAL_CHARS_GLOBAL, "\\$1");
	exports.toPosixSlashes = (str) => str.replace(REGEX_BACKSLASH, "/");
	exports.isWindows = () => {
		if (typeof navigator !== "undefined" && navigator.platform) {
			const platform = navigator.platform.toLowerCase();
			return platform === "win32" || platform === "windows";
		}
		if (typeof process !== "undefined" && process.platform) return process.platform === "win32";
		return false;
	};
	exports.removeBackslashes = (str) => {
		return str.replace(REGEX_REMOVE_BACKSLASH, (match) => {
			return match === "\\" ? "" : match;
		});
	};
	exports.escapeLast = (input, char, lastIdx) => {
		const idx = input.lastIndexOf(char, lastIdx);
		if (idx === -1) return input;
		if (input[idx - 1] === "\\") return exports.escapeLast(input, char, idx - 1);
		return `${input.slice(0, idx)}\\${input.slice(idx)}`;
	};
	exports.removePrefix = (input, state = {}) => {
		let output = input;
		if (output.startsWith("./")) {
			output = output.slice(2);
			state.prefix = "./";
		}
		return output;
	};
	exports.wrapOutput = (input, state = {}, options = {}) => {
		let output = `${options.contains ? "" : "^"}(?:${input})${options.contains ? "" : "$"}`;
		if (state.negated === true) output = `(?:^(?!${output}).*$)`;
		return output;
	};
	exports.basename = (path, { windows } = {}) => {
		const segs = path.split(windows ? /[\\/]/ : "/");
		const last = segs[segs.length - 1];
		if (last === "") return segs[segs.length - 2];
		return last;
	};
}));
//#endregion
//#region ../../../node_modules/.pnpm/picomatch@4.0.4/node_modules/picomatch/lib/scan.js
var require_scan = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const utils = require_utils();
	const { CHAR_ASTERISK, CHAR_AT, CHAR_BACKWARD_SLASH, CHAR_COMMA, CHAR_DOT, CHAR_EXCLAMATION_MARK, CHAR_FORWARD_SLASH, CHAR_LEFT_CURLY_BRACE, CHAR_LEFT_PARENTHESES, CHAR_LEFT_SQUARE_BRACKET, CHAR_PLUS, CHAR_QUESTION_MARK, CHAR_RIGHT_CURLY_BRACE, CHAR_RIGHT_PARENTHESES, CHAR_RIGHT_SQUARE_BRACKET } = require_constants();
	const isPathSeparator = (code) => {
		return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
	};
	const depth = (token) => {
		if (token.isPrefix !== true) token.depth = token.isGlobstar ? Infinity : 1;
	};
	/**
	* Quickly scans a glob pattern and returns an object with a handful of
	* useful properties, like `isGlob`, `path` (the leading non-glob, if it exists),
	* `glob` (the actual pattern), `negated` (true if the path starts with `!` but not
	* with `!(`) and `negatedExtglob` (true if the path starts with `!(`).
	*
	* ```js
	* const pm = require('picomatch');
	* console.log(pm.scan('foo/bar/*.js'));
	* { isGlob: true, input: 'foo/bar/*.js', base: 'foo/bar', glob: '*.js' }
	* ```
	* @param {String} `str`
	* @param {Object} `options`
	* @return {Object} Returns an object with tokens and regex source string.
	* @api public
	*/
	const scan = (input, options) => {
		const opts = options || {};
		const length = input.length - 1;
		const scanToEnd = opts.parts === true || opts.scanToEnd === true;
		const slashes = [];
		const tokens = [];
		const parts = [];
		let str = input;
		let index = -1;
		let start = 0;
		let lastIndex = 0;
		let isBrace = false;
		let isBracket = false;
		let isGlob = false;
		let isExtglob = false;
		let isGlobstar = false;
		let braceEscaped = false;
		let backslashes = false;
		let negated = false;
		let negatedExtglob = false;
		let finished = false;
		let braces = 0;
		let prev;
		let code;
		let token = {
			value: "",
			depth: 0,
			isGlob: false
		};
		const eos = () => index >= length;
		const peek = () => str.charCodeAt(index + 1);
		const advance = () => {
			prev = code;
			return str.charCodeAt(++index);
		};
		while (index < length) {
			code = advance();
			let next;
			if (code === CHAR_BACKWARD_SLASH) {
				backslashes = token.backslashes = true;
				code = advance();
				if (code === CHAR_LEFT_CURLY_BRACE) braceEscaped = true;
				continue;
			}
			if (braceEscaped === true || code === CHAR_LEFT_CURLY_BRACE) {
				braces++;
				while (eos() !== true && (code = advance())) {
					if (code === CHAR_BACKWARD_SLASH) {
						backslashes = token.backslashes = true;
						advance();
						continue;
					}
					if (code === CHAR_LEFT_CURLY_BRACE) {
						braces++;
						continue;
					}
					if (braceEscaped !== true && code === CHAR_DOT && (code = advance()) === CHAR_DOT) {
						isBrace = token.isBrace = true;
						isGlob = token.isGlob = true;
						finished = true;
						if (scanToEnd === true) continue;
						break;
					}
					if (braceEscaped !== true && code === CHAR_COMMA) {
						isBrace = token.isBrace = true;
						isGlob = token.isGlob = true;
						finished = true;
						if (scanToEnd === true) continue;
						break;
					}
					if (code === CHAR_RIGHT_CURLY_BRACE) {
						braces--;
						if (braces === 0) {
							braceEscaped = false;
							isBrace = token.isBrace = true;
							finished = true;
							break;
						}
					}
				}
				if (scanToEnd === true) continue;
				break;
			}
			if (code === CHAR_FORWARD_SLASH) {
				slashes.push(index);
				tokens.push(token);
				token = {
					value: "",
					depth: 0,
					isGlob: false
				};
				if (finished === true) continue;
				if (prev === CHAR_DOT && index === start + 1) {
					start += 2;
					continue;
				}
				lastIndex = index + 1;
				continue;
			}
			if (opts.noext !== true) {
				if ((code === CHAR_PLUS || code === CHAR_AT || code === CHAR_ASTERISK || code === CHAR_QUESTION_MARK || code === CHAR_EXCLAMATION_MARK) === true && peek() === CHAR_LEFT_PARENTHESES) {
					isGlob = token.isGlob = true;
					isExtglob = token.isExtglob = true;
					finished = true;
					if (code === CHAR_EXCLAMATION_MARK && index === start) negatedExtglob = true;
					if (scanToEnd === true) {
						while (eos() !== true && (code = advance())) {
							if (code === CHAR_BACKWARD_SLASH) {
								backslashes = token.backslashes = true;
								code = advance();
								continue;
							}
							if (code === CHAR_RIGHT_PARENTHESES) {
								isGlob = token.isGlob = true;
								finished = true;
								break;
							}
						}
						continue;
					}
					break;
				}
			}
			if (code === CHAR_ASTERISK) {
				if (prev === CHAR_ASTERISK) isGlobstar = token.isGlobstar = true;
				isGlob = token.isGlob = true;
				finished = true;
				if (scanToEnd === true) continue;
				break;
			}
			if (code === CHAR_QUESTION_MARK) {
				isGlob = token.isGlob = true;
				finished = true;
				if (scanToEnd === true) continue;
				break;
			}
			if (code === CHAR_LEFT_SQUARE_BRACKET) {
				while (eos() !== true && (next = advance())) {
					if (next === CHAR_BACKWARD_SLASH) {
						backslashes = token.backslashes = true;
						advance();
						continue;
					}
					if (next === CHAR_RIGHT_SQUARE_BRACKET) {
						isBracket = token.isBracket = true;
						isGlob = token.isGlob = true;
						finished = true;
						break;
					}
				}
				if (scanToEnd === true) continue;
				break;
			}
			if (opts.nonegate !== true && code === CHAR_EXCLAMATION_MARK && index === start) {
				negated = token.negated = true;
				start++;
				continue;
			}
			if (opts.noparen !== true && code === CHAR_LEFT_PARENTHESES) {
				isGlob = token.isGlob = true;
				if (scanToEnd === true) {
					while (eos() !== true && (code = advance())) {
						if (code === CHAR_LEFT_PARENTHESES) {
							backslashes = token.backslashes = true;
							code = advance();
							continue;
						}
						if (code === CHAR_RIGHT_PARENTHESES) {
							finished = true;
							break;
						}
					}
					continue;
				}
				break;
			}
			if (isGlob === true) {
				finished = true;
				if (scanToEnd === true) continue;
				break;
			}
		}
		if (opts.noext === true) {
			isExtglob = false;
			isGlob = false;
		}
		let base = str;
		let prefix = "";
		let glob = "";
		if (start > 0) {
			prefix = str.slice(0, start);
			str = str.slice(start);
			lastIndex -= start;
		}
		if (base && isGlob === true && lastIndex > 0) {
			base = str.slice(0, lastIndex);
			glob = str.slice(lastIndex);
		} else if (isGlob === true) {
			base = "";
			glob = str;
		} else base = str;
		if (base && base !== "" && base !== "/" && base !== str) {
			if (isPathSeparator(base.charCodeAt(base.length - 1))) base = base.slice(0, -1);
		}
		if (opts.unescape === true) {
			if (glob) glob = utils.removeBackslashes(glob);
			if (base && backslashes === true) base = utils.removeBackslashes(base);
		}
		const state = {
			prefix,
			input,
			start,
			base,
			glob,
			isBrace,
			isBracket,
			isGlob,
			isExtglob,
			isGlobstar,
			negated,
			negatedExtglob
		};
		if (opts.tokens === true) {
			state.maxDepth = 0;
			if (!isPathSeparator(code)) tokens.push(token);
			state.tokens = tokens;
		}
		if (opts.parts === true || opts.tokens === true) {
			let prevIndex;
			for (let idx = 0; idx < slashes.length; idx++) {
				const n = prevIndex ? prevIndex + 1 : start;
				const i = slashes[idx];
				const value = input.slice(n, i);
				if (opts.tokens) {
					if (idx === 0 && start !== 0) {
						tokens[idx].isPrefix = true;
						tokens[idx].value = prefix;
					} else tokens[idx].value = value;
					depth(tokens[idx]);
					state.maxDepth += tokens[idx].depth;
				}
				if (idx !== 0 || value !== "") parts.push(value);
				prevIndex = i;
			}
			if (prevIndex && prevIndex + 1 < input.length) {
				const value = input.slice(prevIndex + 1);
				parts.push(value);
				if (opts.tokens) {
					tokens[tokens.length - 1].value = value;
					depth(tokens[tokens.length - 1]);
					state.maxDepth += tokens[tokens.length - 1].depth;
				}
			}
			state.slashes = slashes;
			state.parts = parts;
		}
		return state;
	};
	module.exports = scan;
}));
//#endregion
//#region ../../../node_modules/.pnpm/picomatch@4.0.4/node_modules/picomatch/lib/parse.js
var require_parse = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const constants = require_constants();
	const utils = require_utils();
	/**
	* Constants
	*/
	const { MAX_LENGTH, POSIX_REGEX_SOURCE, REGEX_NON_SPECIAL_CHARS, REGEX_SPECIAL_CHARS_BACKREF, REPLACEMENTS } = constants;
	/**
	* Helpers
	*/
	const expandRange = (args, options) => {
		if (typeof options.expandRange === "function") return options.expandRange(...args, options);
		args.sort();
		const value = `[${args.join("-")}]`;
		try {
			new RegExp(value);
		} catch (ex) {
			return args.map((v) => utils.escapeRegex(v)).join("..");
		}
		return value;
	};
	/**
	* Create the message for a syntax error
	*/
	const syntaxError = (type, char) => {
		return `Missing ${type}: "${char}" - use "\\\\${char}" to match literal characters`;
	};
	const splitTopLevel = (input) => {
		const parts = [];
		let bracket = 0;
		let paren = 0;
		let quote = 0;
		let value = "";
		let escaped = false;
		for (const ch of input) {
			if (escaped === true) {
				value += ch;
				escaped = false;
				continue;
			}
			if (ch === "\\") {
				value += ch;
				escaped = true;
				continue;
			}
			if (ch === "\"") {
				quote = quote === 1 ? 0 : 1;
				value += ch;
				continue;
			}
			if (quote === 0) {
				if (ch === "[") bracket++;
				else if (ch === "]" && bracket > 0) bracket--;
				else if (bracket === 0) {
					if (ch === "(") paren++;
					else if (ch === ")" && paren > 0) paren--;
					else if (ch === "|" && paren === 0) {
						parts.push(value);
						value = "";
						continue;
					}
				}
			}
			value += ch;
		}
		parts.push(value);
		return parts;
	};
	const isPlainBranch = (branch) => {
		let escaped = false;
		for (const ch of branch) {
			if (escaped === true) {
				escaped = false;
				continue;
			}
			if (ch === "\\") {
				escaped = true;
				continue;
			}
			if (/[?*+@!()[\]{}]/.test(ch)) return false;
		}
		return true;
	};
	const normalizeSimpleBranch = (branch) => {
		let value = branch.trim();
		let changed = true;
		while (changed === true) {
			changed = false;
			if (/^@\([^\\()[\]{}|]+\)$/.test(value)) {
				value = value.slice(2, -1);
				changed = true;
			}
		}
		if (!isPlainBranch(value)) return;
		return value.replace(/\\(.)/g, "$1");
	};
	const hasRepeatedCharPrefixOverlap = (branches) => {
		const values = branches.map(normalizeSimpleBranch).filter(Boolean);
		for (let i = 0; i < values.length; i++) for (let j = i + 1; j < values.length; j++) {
			const a = values[i];
			const b = values[j];
			const char = a[0];
			if (!char || a !== char.repeat(a.length) || b !== char.repeat(b.length)) continue;
			if (a === b || a.startsWith(b) || b.startsWith(a)) return true;
		}
		return false;
	};
	const parseRepeatedExtglob = (pattern, requireEnd = true) => {
		if (pattern[0] !== "+" && pattern[0] !== "*" || pattern[1] !== "(") return;
		let bracket = 0;
		let paren = 0;
		let quote = 0;
		let escaped = false;
		for (let i = 1; i < pattern.length; i++) {
			const ch = pattern[i];
			if (escaped === true) {
				escaped = false;
				continue;
			}
			if (ch === "\\") {
				escaped = true;
				continue;
			}
			if (ch === "\"") {
				quote = quote === 1 ? 0 : 1;
				continue;
			}
			if (quote === 1) continue;
			if (ch === "[") {
				bracket++;
				continue;
			}
			if (ch === "]" && bracket > 0) {
				bracket--;
				continue;
			}
			if (bracket > 0) continue;
			if (ch === "(") {
				paren++;
				continue;
			}
			if (ch === ")") {
				paren--;
				if (paren === 0) {
					if (requireEnd === true && i !== pattern.length - 1) return;
					return {
						type: pattern[0],
						body: pattern.slice(2, i),
						end: i
					};
				}
			}
		}
	};
	const getStarExtglobSequenceOutput = (pattern) => {
		let index = 0;
		const chars = [];
		while (index < pattern.length) {
			const match = parseRepeatedExtglob(pattern.slice(index), false);
			if (!match || match.type !== "*") return;
			const branches = splitTopLevel(match.body).map((branch) => branch.trim());
			if (branches.length !== 1) return;
			const branch = normalizeSimpleBranch(branches[0]);
			if (!branch || branch.length !== 1) return;
			chars.push(branch);
			index += match.end + 1;
		}
		if (chars.length < 1) return;
		return `${chars.length === 1 ? utils.escapeRegex(chars[0]) : `[${chars.map((ch) => utils.escapeRegex(ch)).join("")}]`}*`;
	};
	const repeatedExtglobRecursion = (pattern) => {
		let depth = 0;
		let value = pattern.trim();
		let match = parseRepeatedExtglob(value);
		while (match) {
			depth++;
			value = match.body.trim();
			match = parseRepeatedExtglob(value);
		}
		return depth;
	};
	const analyzeRepeatedExtglob = (body, options) => {
		if (options.maxExtglobRecursion === false) return { risky: false };
		const max = typeof options.maxExtglobRecursion === "number" ? options.maxExtglobRecursion : constants.DEFAULT_MAX_EXTGLOB_RECURSION;
		const branches = splitTopLevel(body).map((branch) => branch.trim());
		if (branches.length > 1) {
			if (branches.some((branch) => branch === "") || branches.some((branch) => /^[*?]+$/.test(branch)) || hasRepeatedCharPrefixOverlap(branches)) return { risky: true };
		}
		for (const branch of branches) {
			const safeOutput = getStarExtglobSequenceOutput(branch);
			if (safeOutput) return {
				risky: true,
				safeOutput
			};
			if (repeatedExtglobRecursion(branch) > max) return { risky: true };
		}
		return { risky: false };
	};
	/**
	* Parse the given input string.
	* @param {String} input
	* @param {Object} options
	* @return {Object}
	*/
	const parse = (input, options) => {
		if (typeof input !== "string") throw new TypeError("Expected a string");
		input = REPLACEMENTS[input] || input;
		const opts = { ...options };
		const max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
		let len = input.length;
		if (len > max) throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
		const bos = {
			type: "bos",
			value: "",
			output: opts.prepend || ""
		};
		const tokens = [bos];
		const capture = opts.capture ? "" : "?:";
		const PLATFORM_CHARS = constants.globChars(opts.windows);
		const EXTGLOB_CHARS = constants.extglobChars(PLATFORM_CHARS);
		const { DOT_LITERAL, PLUS_LITERAL, SLASH_LITERAL, ONE_CHAR, DOTS_SLASH, NO_DOT, NO_DOT_SLASH, NO_DOTS_SLASH, QMARK, QMARK_NO_DOT, STAR, START_ANCHOR } = PLATFORM_CHARS;
		const globstar = (opts) => {
			return `(${capture}(?:(?!${START_ANCHOR}${opts.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
		};
		const nodot = opts.dot ? "" : NO_DOT;
		const qmarkNoDot = opts.dot ? QMARK : QMARK_NO_DOT;
		let star = opts.bash === true ? globstar(opts) : STAR;
		if (opts.capture) star = `(${star})`;
		if (typeof opts.noext === "boolean") opts.noextglob = opts.noext;
		const state = {
			input,
			index: -1,
			start: 0,
			dot: opts.dot === true,
			consumed: "",
			output: "",
			prefix: "",
			backtrack: false,
			negated: false,
			brackets: 0,
			braces: 0,
			parens: 0,
			quotes: 0,
			globstar: false,
			tokens
		};
		input = utils.removePrefix(input, state);
		len = input.length;
		const extglobs = [];
		const braces = [];
		const stack = [];
		let prev = bos;
		let value;
		/**
		* Tokenizing helpers
		*/
		const eos = () => state.index === len - 1;
		const peek = state.peek = (n = 1) => input[state.index + n];
		const advance = state.advance = () => input[++state.index] || "";
		const remaining = () => input.slice(state.index + 1);
		const consume = (value = "", num = 0) => {
			state.consumed += value;
			state.index += num;
		};
		const append = (token) => {
			state.output += token.output != null ? token.output : token.value;
			consume(token.value);
		};
		const negate = () => {
			let count = 1;
			while (peek() === "!" && (peek(2) !== "(" || peek(3) === "?")) {
				advance();
				state.start++;
				count++;
			}
			if (count % 2 === 0) return false;
			state.negated = true;
			state.start++;
			return true;
		};
		const increment = (type) => {
			state[type]++;
			stack.push(type);
		};
		const decrement = (type) => {
			state[type]--;
			stack.pop();
		};
		/**
		* Push tokens onto the tokens array. This helper speeds up
		* tokenizing by 1) helping us avoid backtracking as much as possible,
		* and 2) helping us avoid creating extra tokens when consecutive
		* characters are plain text. This improves performance and simplifies
		* lookbehinds.
		*/
		const push = (tok) => {
			if (prev.type === "globstar") {
				const isBrace = state.braces > 0 && (tok.type === "comma" || tok.type === "brace");
				const isExtglob = tok.extglob === true || extglobs.length && (tok.type === "pipe" || tok.type === "paren");
				if (tok.type !== "slash" && tok.type !== "paren" && !isBrace && !isExtglob) {
					state.output = state.output.slice(0, -prev.output.length);
					prev.type = "star";
					prev.value = "*";
					prev.output = star;
					state.output += prev.output;
				}
			}
			if (extglobs.length && tok.type !== "paren") extglobs[extglobs.length - 1].inner += tok.value;
			if (tok.value || tok.output) append(tok);
			if (prev && prev.type === "text" && tok.type === "text") {
				prev.output = (prev.output || prev.value) + tok.value;
				prev.value += tok.value;
				return;
			}
			tok.prev = prev;
			tokens.push(tok);
			prev = tok;
		};
		const extglobOpen = (type, value) => {
			const token = {
				...EXTGLOB_CHARS[value],
				conditions: 1,
				inner: ""
			};
			token.prev = prev;
			token.parens = state.parens;
			token.output = state.output;
			token.startIndex = state.index;
			token.tokensIndex = tokens.length;
			const output = (opts.capture ? "(" : "") + token.open;
			increment("parens");
			push({
				type,
				value,
				output: state.output ? "" : ONE_CHAR
			});
			push({
				type: "paren",
				extglob: true,
				value: advance(),
				output
			});
			extglobs.push(token);
		};
		const extglobClose = (token) => {
			const literal = input.slice(token.startIndex, state.index + 1);
			const analysis = analyzeRepeatedExtglob(input.slice(token.startIndex + 2, state.index), opts);
			if ((token.type === "plus" || token.type === "star") && analysis.risky) {
				const safeOutput = analysis.safeOutput ? (token.output ? "" : ONE_CHAR) + (opts.capture ? `(${analysis.safeOutput})` : analysis.safeOutput) : void 0;
				const open = tokens[token.tokensIndex];
				open.type = "text";
				open.value = literal;
				open.output = safeOutput || utils.escapeRegex(literal);
				for (let i = token.tokensIndex + 1; i < tokens.length; i++) {
					tokens[i].value = "";
					tokens[i].output = "";
					delete tokens[i].suffix;
				}
				state.output = token.output + open.output;
				state.backtrack = true;
				push({
					type: "paren",
					extglob: true,
					value,
					output: ""
				});
				decrement("parens");
				return;
			}
			let output = token.close + (opts.capture ? ")" : "");
			let rest;
			if (token.type === "negate") {
				let extglobStar = star;
				if (token.inner && token.inner.length > 1 && token.inner.includes("/")) extglobStar = globstar(opts);
				if (extglobStar !== star || eos() || /^\)+$/.test(remaining())) output = token.close = `)$))${extglobStar}`;
				if (token.inner.includes("*") && (rest = remaining()) && /^\.[^\\/.]+$/.test(rest)) output = token.close = `)${parse(rest, {
					...options,
					fastpaths: false
				}).output})${extglobStar})`;
				if (token.prev.type === "bos") state.negatedExtglob = true;
			}
			push({
				type: "paren",
				extglob: true,
				value,
				output
			});
			decrement("parens");
		};
		/**
		* Fast paths
		*/
		if (opts.fastpaths !== false && !/(^[*!]|[/()[\]{}"])/.test(input)) {
			let backslashes = false;
			let output = input.replace(REGEX_SPECIAL_CHARS_BACKREF, (m, esc, chars, first, rest, index) => {
				if (first === "\\") {
					backslashes = true;
					return m;
				}
				if (first === "?") {
					if (esc) return esc + first + (rest ? QMARK.repeat(rest.length) : "");
					if (index === 0) return qmarkNoDot + (rest ? QMARK.repeat(rest.length) : "");
					return QMARK.repeat(chars.length);
				}
				if (first === ".") return DOT_LITERAL.repeat(chars.length);
				if (first === "*") {
					if (esc) return esc + first + (rest ? star : "");
					return star;
				}
				return esc ? m : `\\${m}`;
			});
			if (backslashes === true) if (opts.unescape === true) output = output.replace(/\\/g, "");
			else output = output.replace(/\\+/g, (m) => {
				return m.length % 2 === 0 ? "\\\\" : m ? "\\" : "";
			});
			if (output === input && opts.contains === true) {
				state.output = input;
				return state;
			}
			state.output = utils.wrapOutput(output, state, options);
			return state;
		}
		/**
		* Tokenize input until we reach end-of-string
		*/
		while (!eos()) {
			value = advance();
			if (value === "\0") continue;
			/**
			* Escaped characters
			*/
			if (value === "\\") {
				const next = peek();
				if (next === "/" && opts.bash !== true) continue;
				if (next === "." || next === ";") continue;
				if (!next) {
					value += "\\";
					push({
						type: "text",
						value
					});
					continue;
				}
				const match = /^\\+/.exec(remaining());
				let slashes = 0;
				if (match && match[0].length > 2) {
					slashes = match[0].length;
					state.index += slashes;
					if (slashes % 2 !== 0) value += "\\";
				}
				if (opts.unescape === true) value = advance();
				else value += advance();
				if (state.brackets === 0) {
					push({
						type: "text",
						value
					});
					continue;
				}
			}
			/**
			* If we're inside a regex character class, continue
			* until we reach the closing bracket.
			*/
			if (state.brackets > 0 && (value !== "]" || prev.value === "[" || prev.value === "[^")) {
				if (opts.posix !== false && value === ":") {
					const inner = prev.value.slice(1);
					if (inner.includes("[")) {
						prev.posix = true;
						if (inner.includes(":")) {
							const idx = prev.value.lastIndexOf("[");
							const pre = prev.value.slice(0, idx);
							const posix = POSIX_REGEX_SOURCE[prev.value.slice(idx + 2)];
							if (posix) {
								prev.value = pre + posix;
								state.backtrack = true;
								advance();
								if (!bos.output && tokens.indexOf(prev) === 1) bos.output = ONE_CHAR;
								continue;
							}
						}
					}
				}
				if (value === "[" && peek() !== ":" || value === "-" && peek() === "]") value = `\\${value}`;
				if (value === "]" && (prev.value === "[" || prev.value === "[^")) value = `\\${value}`;
				if (opts.posix === true && value === "!" && prev.value === "[") value = "^";
				prev.value += value;
				append({ value });
				continue;
			}
			/**
			* If we're inside a quoted string, continue
			* until we reach the closing double quote.
			*/
			if (state.quotes === 1 && value !== "\"") {
				value = utils.escapeRegex(value);
				prev.value += value;
				append({ value });
				continue;
			}
			/**
			* Double quotes
			*/
			if (value === "\"") {
				state.quotes = state.quotes === 1 ? 0 : 1;
				if (opts.keepQuotes === true) push({
					type: "text",
					value
				});
				continue;
			}
			/**
			* Parentheses
			*/
			if (value === "(") {
				increment("parens");
				push({
					type: "paren",
					value
				});
				continue;
			}
			if (value === ")") {
				if (state.parens === 0 && opts.strictBrackets === true) throw new SyntaxError(syntaxError("opening", "("));
				const extglob = extglobs[extglobs.length - 1];
				if (extglob && state.parens === extglob.parens + 1) {
					extglobClose(extglobs.pop());
					continue;
				}
				push({
					type: "paren",
					value,
					output: state.parens ? ")" : "\\)"
				});
				decrement("parens");
				continue;
			}
			/**
			* Square brackets
			*/
			if (value === "[") {
				if (opts.nobracket === true || !remaining().includes("]")) {
					if (opts.nobracket !== true && opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", "]"));
					value = `\\${value}`;
				} else increment("brackets");
				push({
					type: "bracket",
					value
				});
				continue;
			}
			if (value === "]") {
				if (opts.nobracket === true || prev && prev.type === "bracket" && prev.value.length === 1) {
					push({
						type: "text",
						value,
						output: `\\${value}`
					});
					continue;
				}
				if (state.brackets === 0) {
					if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("opening", "["));
					push({
						type: "text",
						value,
						output: `\\${value}`
					});
					continue;
				}
				decrement("brackets");
				const prevValue = prev.value.slice(1);
				if (prev.posix !== true && prevValue[0] === "^" && !prevValue.includes("/")) value = `/${value}`;
				prev.value += value;
				append({ value });
				if (opts.literalBrackets === false || utils.hasRegexChars(prevValue)) continue;
				const escaped = utils.escapeRegex(prev.value);
				state.output = state.output.slice(0, -prev.value.length);
				if (opts.literalBrackets === true) {
					state.output += escaped;
					prev.value = escaped;
					continue;
				}
				prev.value = `(${capture}${escaped}|${prev.value})`;
				state.output += prev.value;
				continue;
			}
			/**
			* Braces
			*/
			if (value === "{" && opts.nobrace !== true) {
				increment("braces");
				const open = {
					type: "brace",
					value,
					output: "(",
					outputIndex: state.output.length,
					tokensIndex: state.tokens.length
				};
				braces.push(open);
				push(open);
				continue;
			}
			if (value === "}") {
				const brace = braces[braces.length - 1];
				if (opts.nobrace === true || !brace) {
					push({
						type: "text",
						value,
						output: value
					});
					continue;
				}
				let output = ")";
				if (brace.dots === true) {
					const arr = tokens.slice();
					const range = [];
					for (let i = arr.length - 1; i >= 0; i--) {
						tokens.pop();
						if (arr[i].type === "brace") break;
						if (arr[i].type !== "dots") range.unshift(arr[i].value);
					}
					output = expandRange(range, opts);
					state.backtrack = true;
				}
				if (brace.comma !== true && brace.dots !== true) {
					const out = state.output.slice(0, brace.outputIndex);
					const toks = state.tokens.slice(brace.tokensIndex);
					brace.value = brace.output = "\\{";
					value = output = "\\}";
					state.output = out;
					for (const t of toks) state.output += t.output || t.value;
				}
				push({
					type: "brace",
					value,
					output
				});
				decrement("braces");
				braces.pop();
				continue;
			}
			/**
			* Pipes
			*/
			if (value === "|") {
				if (extglobs.length > 0) extglobs[extglobs.length - 1].conditions++;
				push({
					type: "text",
					value
				});
				continue;
			}
			/**
			* Commas
			*/
			if (value === ",") {
				let output = value;
				const brace = braces[braces.length - 1];
				if (brace && stack[stack.length - 1] === "braces") {
					brace.comma = true;
					output = "|";
				}
				push({
					type: "comma",
					value,
					output
				});
				continue;
			}
			/**
			* Slashes
			*/
			if (value === "/") {
				if (prev.type === "dot" && state.index === state.start + 1) {
					state.start = state.index + 1;
					state.consumed = "";
					state.output = "";
					tokens.pop();
					prev = bos;
					continue;
				}
				push({
					type: "slash",
					value,
					output: SLASH_LITERAL
				});
				continue;
			}
			/**
			* Dots
			*/
			if (value === ".") {
				if (state.braces > 0 && prev.type === "dot") {
					if (prev.value === ".") prev.output = DOT_LITERAL;
					const brace = braces[braces.length - 1];
					prev.type = "dots";
					prev.output += value;
					prev.value += value;
					brace.dots = true;
					continue;
				}
				if (state.braces + state.parens === 0 && prev.type !== "bos" && prev.type !== "slash") {
					push({
						type: "text",
						value,
						output: DOT_LITERAL
					});
					continue;
				}
				push({
					type: "dot",
					value,
					output: DOT_LITERAL
				});
				continue;
			}
			/**
			* Question marks
			*/
			if (value === "?") {
				if (!(prev && prev.value === "(") && opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
					extglobOpen("qmark", value);
					continue;
				}
				if (prev && prev.type === "paren") {
					const next = peek();
					let output = value;
					if (prev.value === "(" && !/[!=<:]/.test(next) || next === "<" && !/<([!=]|\w+>)/.test(remaining())) output = `\\${value}`;
					push({
						type: "text",
						value,
						output
					});
					continue;
				}
				if (opts.dot !== true && (prev.type === "slash" || prev.type === "bos")) {
					push({
						type: "qmark",
						value,
						output: QMARK_NO_DOT
					});
					continue;
				}
				push({
					type: "qmark",
					value,
					output: QMARK
				});
				continue;
			}
			/**
			* Exclamation
			*/
			if (value === "!") {
				if (opts.noextglob !== true && peek() === "(") {
					if (peek(2) !== "?" || !/[!=<:]/.test(peek(3))) {
						extglobOpen("negate", value);
						continue;
					}
				}
				if (opts.nonegate !== true && state.index === 0) {
					negate();
					continue;
				}
			}
			/**
			* Plus
			*/
			if (value === "+") {
				if (opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
					extglobOpen("plus", value);
					continue;
				}
				if (prev && prev.value === "(" || opts.regex === false) {
					push({
						type: "plus",
						value,
						output: PLUS_LITERAL
					});
					continue;
				}
				if (prev && (prev.type === "bracket" || prev.type === "paren" || prev.type === "brace") || state.parens > 0) {
					push({
						type: "plus",
						value
					});
					continue;
				}
				push({
					type: "plus",
					value: PLUS_LITERAL
				});
				continue;
			}
			/**
			* Plain text
			*/
			if (value === "@") {
				if (opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
					push({
						type: "at",
						extglob: true,
						value,
						output: ""
					});
					continue;
				}
				push({
					type: "text",
					value
				});
				continue;
			}
			/**
			* Plain text
			*/
			if (value !== "*") {
				if (value === "$" || value === "^") value = `\\${value}`;
				const match = REGEX_NON_SPECIAL_CHARS.exec(remaining());
				if (match) {
					value += match[0];
					state.index += match[0].length;
				}
				push({
					type: "text",
					value
				});
				continue;
			}
			/**
			* Stars
			*/
			if (prev && (prev.type === "globstar" || prev.star === true)) {
				prev.type = "star";
				prev.star = true;
				prev.value += value;
				prev.output = star;
				state.backtrack = true;
				state.globstar = true;
				consume(value);
				continue;
			}
			let rest = remaining();
			if (opts.noextglob !== true && /^\([^?]/.test(rest)) {
				extglobOpen("star", value);
				continue;
			}
			if (prev.type === "star") {
				if (opts.noglobstar === true) {
					consume(value);
					continue;
				}
				const prior = prev.prev;
				const before = prior.prev;
				const isStart = prior.type === "slash" || prior.type === "bos";
				const afterStar = before && (before.type === "star" || before.type === "globstar");
				if (opts.bash === true && (!isStart || rest[0] && rest[0] !== "/")) {
					push({
						type: "star",
						value,
						output: ""
					});
					continue;
				}
				const isBrace = state.braces > 0 && (prior.type === "comma" || prior.type === "brace");
				const isExtglob = extglobs.length && (prior.type === "pipe" || prior.type === "paren");
				if (!isStart && prior.type !== "paren" && !isBrace && !isExtglob) {
					push({
						type: "star",
						value,
						output: ""
					});
					continue;
				}
				while (rest.slice(0, 3) === "/**") {
					const after = input[state.index + 4];
					if (after && after !== "/") break;
					rest = rest.slice(3);
					consume("/**", 3);
				}
				if (prior.type === "bos" && eos()) {
					prev.type = "globstar";
					prev.value += value;
					prev.output = globstar(opts);
					state.output = prev.output;
					state.globstar = true;
					consume(value);
					continue;
				}
				if (prior.type === "slash" && prior.prev.type !== "bos" && !afterStar && eos()) {
					state.output = state.output.slice(0, -(prior.output + prev.output).length);
					prior.output = `(?:${prior.output}`;
					prev.type = "globstar";
					prev.output = globstar(opts) + (opts.strictSlashes ? ")" : "|$)");
					prev.value += value;
					state.globstar = true;
					state.output += prior.output + prev.output;
					consume(value);
					continue;
				}
				if (prior.type === "slash" && prior.prev.type !== "bos" && rest[0] === "/") {
					const end = rest[1] !== void 0 ? "|$" : "";
					state.output = state.output.slice(0, -(prior.output + prev.output).length);
					prior.output = `(?:${prior.output}`;
					prev.type = "globstar";
					prev.output = `${globstar(opts)}${SLASH_LITERAL}|${SLASH_LITERAL}${end})`;
					prev.value += value;
					state.output += prior.output + prev.output;
					state.globstar = true;
					consume(value + advance());
					push({
						type: "slash",
						value: "/",
						output: ""
					});
					continue;
				}
				if (prior.type === "bos" && rest[0] === "/") {
					prev.type = "globstar";
					prev.value += value;
					prev.output = `(?:^|${SLASH_LITERAL}|${globstar(opts)}${SLASH_LITERAL})`;
					state.output = prev.output;
					state.globstar = true;
					consume(value + advance());
					push({
						type: "slash",
						value: "/",
						output: ""
					});
					continue;
				}
				state.output = state.output.slice(0, -prev.output.length);
				prev.type = "globstar";
				prev.output = globstar(opts);
				prev.value += value;
				state.output += prev.output;
				state.globstar = true;
				consume(value);
				continue;
			}
			const token = {
				type: "star",
				value,
				output: star
			};
			if (opts.bash === true) {
				token.output = ".*?";
				if (prev.type === "bos" || prev.type === "slash") token.output = nodot + token.output;
				push(token);
				continue;
			}
			if (prev && (prev.type === "bracket" || prev.type === "paren") && opts.regex === true) {
				token.output = value;
				push(token);
				continue;
			}
			if (state.index === state.start || prev.type === "slash" || prev.type === "dot") {
				if (prev.type === "dot") {
					state.output += NO_DOT_SLASH;
					prev.output += NO_DOT_SLASH;
				} else if (opts.dot === true) {
					state.output += NO_DOTS_SLASH;
					prev.output += NO_DOTS_SLASH;
				} else {
					state.output += nodot;
					prev.output += nodot;
				}
				if (peek() !== "*") {
					state.output += ONE_CHAR;
					prev.output += ONE_CHAR;
				}
			}
			push(token);
		}
		while (state.brackets > 0) {
			if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", "]"));
			state.output = utils.escapeLast(state.output, "[");
			decrement("brackets");
		}
		while (state.parens > 0) {
			if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", ")"));
			state.output = utils.escapeLast(state.output, "(");
			decrement("parens");
		}
		while (state.braces > 0) {
			if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", "}"));
			state.output = utils.escapeLast(state.output, "{");
			decrement("braces");
		}
		if (opts.strictSlashes !== true && (prev.type === "star" || prev.type === "bracket")) push({
			type: "maybe_slash",
			value: "",
			output: `${SLASH_LITERAL}?`
		});
		if (state.backtrack === true) {
			state.output = "";
			for (const token of state.tokens) {
				state.output += token.output != null ? token.output : token.value;
				if (token.suffix) state.output += token.suffix;
			}
		}
		return state;
	};
	/**
	* Fast paths for creating regular expressions for common glob patterns.
	* This can significantly speed up processing and has very little downside
	* impact when none of the fast paths match.
	*/
	parse.fastpaths = (input, options) => {
		const opts = { ...options };
		const max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
		const len = input.length;
		if (len > max) throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
		input = REPLACEMENTS[input] || input;
		const { DOT_LITERAL, SLASH_LITERAL, ONE_CHAR, DOTS_SLASH, NO_DOT, NO_DOTS, NO_DOTS_SLASH, STAR, START_ANCHOR } = constants.globChars(opts.windows);
		const nodot = opts.dot ? NO_DOTS : NO_DOT;
		const slashDot = opts.dot ? NO_DOTS_SLASH : NO_DOT;
		const capture = opts.capture ? "" : "?:";
		const state = {
			negated: false,
			prefix: ""
		};
		let star = opts.bash === true ? ".*?" : STAR;
		if (opts.capture) star = `(${star})`;
		const globstar = (opts) => {
			if (opts.noglobstar === true) return star;
			return `(${capture}(?:(?!${START_ANCHOR}${opts.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
		};
		const create = (str) => {
			switch (str) {
				case "*": return `${nodot}${ONE_CHAR}${star}`;
				case ".*": return `${DOT_LITERAL}${ONE_CHAR}${star}`;
				case "*.*": return `${nodot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;
				case "*/*": return `${nodot}${star}${SLASH_LITERAL}${ONE_CHAR}${slashDot}${star}`;
				case "**": return nodot + globstar(opts);
				case "**/*": return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${ONE_CHAR}${star}`;
				case "**/*.*": return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;
				case "**/.*": return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${DOT_LITERAL}${ONE_CHAR}${star}`;
				default: {
					const match = /^(.*?)\.(\w+)$/.exec(str);
					if (!match) return;
					const source = create(match[1]);
					if (!source) return;
					return source + DOT_LITERAL + match[2];
				}
			}
		};
		let source = create(utils.removePrefix(input, state));
		if (source && opts.strictSlashes !== true) source += `${SLASH_LITERAL}?`;
		return source;
	};
	module.exports = parse;
}));
//#endregion
//#region ../../../node_modules/.pnpm/picomatch@4.0.4/node_modules/picomatch/lib/picomatch.js
var require_picomatch$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const scan = require_scan();
	const parse = require_parse();
	const utils = require_utils();
	const constants = require_constants();
	const isObject = (val) => val && typeof val === "object" && !Array.isArray(val);
	/**
	* Creates a matcher function from one or more glob patterns. The
	* returned function takes a string to match as its first argument,
	* and returns true if the string is a match. The returned matcher
	* function also takes a boolean as the second argument that, when true,
	* returns an object with additional information.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch(glob[, options]);
	*
	* const isMatch = picomatch('*.!(*a)');
	* console.log(isMatch('a.a')); //=> false
	* console.log(isMatch('a.b')); //=> true
	* ```
	* @name picomatch
	* @param {String|Array} `globs` One or more glob patterns.
	* @param {Object=} `options`
	* @return {Function=} Returns a matcher function.
	* @api public
	*/
	const picomatch = (glob, options, returnState = false) => {
		if (Array.isArray(glob)) {
			const fns = glob.map((input) => picomatch(input, options, returnState));
			const arrayMatcher = (str) => {
				for (const isMatch of fns) {
					const state = isMatch(str);
					if (state) return state;
				}
				return false;
			};
			return arrayMatcher;
		}
		const isState = isObject(glob) && glob.tokens && glob.input;
		if (glob === "" || typeof glob !== "string" && !isState) throw new TypeError("Expected pattern to be a non-empty string");
		const opts = options || {};
		const posix = opts.windows;
		const regex = isState ? picomatch.compileRe(glob, options) : picomatch.makeRe(glob, options, false, true);
		const state = regex.state;
		delete regex.state;
		let isIgnored = () => false;
		if (opts.ignore) {
			const ignoreOpts = {
				...options,
				ignore: null,
				onMatch: null,
				onResult: null
			};
			isIgnored = picomatch(opts.ignore, ignoreOpts, returnState);
		}
		const matcher = (input, returnObject = false) => {
			const { isMatch, match, output } = picomatch.test(input, regex, options, {
				glob,
				posix
			});
			const result = {
				glob,
				state,
				regex,
				posix,
				input,
				output,
				match,
				isMatch
			};
			if (typeof opts.onResult === "function") opts.onResult(result);
			if (isMatch === false) {
				result.isMatch = false;
				return returnObject ? result : false;
			}
			if (isIgnored(input)) {
				if (typeof opts.onIgnore === "function") opts.onIgnore(result);
				result.isMatch = false;
				return returnObject ? result : false;
			}
			if (typeof opts.onMatch === "function") opts.onMatch(result);
			return returnObject ? result : true;
		};
		if (returnState) matcher.state = state;
		return matcher;
	};
	/**
	* Test `input` with the given `regex`. This is used by the main
	* `picomatch()` function to test the input string.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch.test(input, regex[, options]);
	*
	* console.log(picomatch.test('foo/bar', /^(?:([^/]*?)\/([^/]*?))$/));
	* // { isMatch: true, match: [ 'foo/', 'foo', 'bar' ], output: 'foo/bar' }
	* ```
	* @param {String} `input` String to test.
	* @param {RegExp} `regex`
	* @return {Object} Returns an object with matching info.
	* @api public
	*/
	picomatch.test = (input, regex, options, { glob, posix } = {}) => {
		if (typeof input !== "string") throw new TypeError("Expected input to be a string");
		if (input === "") return {
			isMatch: false,
			output: ""
		};
		const opts = options || {};
		const format = opts.format || (posix ? utils.toPosixSlashes : null);
		let match = input === glob;
		let output = match && format ? format(input) : input;
		if (match === false) {
			output = format ? format(input) : input;
			match = output === glob;
		}
		if (match === false || opts.capture === true) if (opts.matchBase === true || opts.basename === true) match = picomatch.matchBase(input, regex, options, posix);
		else match = regex.exec(output);
		return {
			isMatch: Boolean(match),
			match,
			output
		};
	};
	/**
	* Match the basename of a filepath.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch.matchBase(input, glob[, options]);
	* console.log(picomatch.matchBase('foo/bar.js', '*.js'); // true
	* ```
	* @param {String} `input` String to test.
	* @param {RegExp|String} `glob` Glob pattern or regex created by [.makeRe](#makeRe).
	* @return {Boolean}
	* @api public
	*/
	picomatch.matchBase = (input, glob, options) => {
		return (glob instanceof RegExp ? glob : picomatch.makeRe(glob, options)).test(utils.basename(input));
	};
	/**
	* Returns true if **any** of the given glob `patterns` match the specified `string`.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch.isMatch(string, patterns[, options]);
	*
	* console.log(picomatch.isMatch('a.a', ['b.*', '*.a'])); //=> true
	* console.log(picomatch.isMatch('a.a', 'b.*')); //=> false
	* ```
	* @param {String|Array} str The string to test.
	* @param {String|Array} patterns One or more glob patterns to use for matching.
	* @param {Object} [options] See available [options](#options).
	* @return {Boolean} Returns true if any patterns match `str`
	* @api public
	*/
	picomatch.isMatch = (str, patterns, options) => picomatch(patterns, options)(str);
	/**
	* Parse a glob pattern to create the source string for a regular
	* expression.
	*
	* ```js
	* const picomatch = require('picomatch');
	* const result = picomatch.parse(pattern[, options]);
	* ```
	* @param {String} `pattern`
	* @param {Object} `options`
	* @return {Object} Returns an object with useful properties and output to be used as a regex source string.
	* @api public
	*/
	picomatch.parse = (pattern, options) => {
		if (Array.isArray(pattern)) return pattern.map((p) => picomatch.parse(p, options));
		return parse(pattern, {
			...options,
			fastpaths: false
		});
	};
	/**
	* Scan a glob pattern to separate the pattern into segments.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch.scan(input[, options]);
	*
	* const result = picomatch.scan('!./foo/*.js');
	* console.log(result);
	* { prefix: '!./',
	*   input: '!./foo/*.js',
	*   start: 3,
	*   base: 'foo',
	*   glob: '*.js',
	*   isBrace: false,
	*   isBracket: false,
	*   isGlob: true,
	*   isExtglob: false,
	*   isGlobstar: false,
	*   negated: true }
	* ```
	* @param {String} `input` Glob pattern to scan.
	* @param {Object} `options`
	* @return {Object} Returns an object with
	* @api public
	*/
	picomatch.scan = (input, options) => scan(input, options);
	/**
	* Compile a regular expression from the `state` object returned by the
	* [parse()](#parse) method.
	*
	* ```js
	* const picomatch = require('picomatch');
	* const state = picomatch.parse('*.js');
	* // picomatch.compileRe(state[, options]);
	*
	* console.log(picomatch.compileRe(state));
	* //=> /^(?:(?!\.)(?=.)[^/]*?\.js)$/
	* ```
	* @param {Object} `state`
	* @param {Object} `options`
	* @param {Boolean} `returnOutput` Intended for implementors, this argument allows you to return the raw output from the parser.
	* @param {Boolean} `returnState` Adds the state to a `state` property on the returned regex. Useful for implementors and debugging.
	* @return {RegExp}
	* @api public
	*/
	picomatch.compileRe = (state, options, returnOutput = false, returnState = false) => {
		if (returnOutput === true) return state.output;
		const opts = options || {};
		const prepend = opts.contains ? "" : "^";
		const append = opts.contains ? "" : "$";
		let source = `${prepend}(?:${state.output})${append}`;
		if (state && state.negated === true) source = `^(?!${source}).*$`;
		const regex = picomatch.toRegex(source, options);
		if (returnState === true) regex.state = state;
		return regex;
	};
	/**
	* Create a regular expression from a parsed glob pattern.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch.makeRe(state[, options]);
	*
	* const result = picomatch.makeRe('*.js');
	* console.log(result);
	* //=> /^(?:(?!\.)(?=.)[^/]*?\.js)$/
	* ```
	* @param {String} `state` The object returned from the `.parse` method.
	* @param {Object} `options`
	* @param {Boolean} `returnOutput` Implementors may use this argument to return the compiled output, instead of a regular expression. This is not exposed on the options to prevent end-users from mutating the result.
	* @param {Boolean} `returnState` Implementors may use this argument to return the state from the parsed glob with the returned regular expression.
	* @return {RegExp} Returns a regex created from the given pattern.
	* @api public
	*/
	picomatch.makeRe = (input, options = {}, returnOutput = false, returnState = false) => {
		if (!input || typeof input !== "string") throw new TypeError("Expected a non-empty string");
		let parsed = {
			negated: false,
			fastpaths: true
		};
		if (options.fastpaths !== false && (input[0] === "." || input[0] === "*")) parsed.output = parse.fastpaths(input, options);
		if (!parsed.output) parsed = parse(input, options);
		return picomatch.compileRe(parsed, options, returnOutput, returnState);
	};
	/**
	* Create a regular expression from the given regex source string.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch.toRegex(source[, options]);
	*
	* const { output } = picomatch.parse('*.js');
	* console.log(picomatch.toRegex(output));
	* //=> /^(?:(?!\.)(?=.)[^/]*?\.js)$/
	* ```
	* @param {String} `source` Regular expression source string.
	* @param {Object} `options`
	* @return {RegExp}
	* @api public
	*/
	picomatch.toRegex = (source, options) => {
		try {
			const opts = options || {};
			return new RegExp(source, opts.flags || (opts.nocase ? "i" : ""));
		} catch (err) {
			if (options && options.debug === true) throw err;
			return /$^/;
		}
	};
	/**
	* Picomatch constants.
	* @return {Object}
	*/
	picomatch.constants = constants;
	/**
	* Expose "picomatch"
	*/
	module.exports = picomatch;
}));
//#endregion
//#region ../../../node_modules/.pnpm/picomatch@4.0.4/node_modules/picomatch/index.js
var require_picomatch = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const pico = require_picomatch$1();
	const utils = require_utils();
	function picomatch(glob, options, returnState = false) {
		if (options && (options.windows === null || options.windows === void 0)) options = {
			...options,
			windows: utils.isWindows()
		};
		return pico(glob, options, returnState);
	}
	Object.assign(picomatch, pico);
	module.exports = picomatch;
}));
//#endregion
//#region src/shell/expand.ts
var import_shell = require_shell();
var import_picomatch = /* @__PURE__ */ __toESM(require_picomatch(), 1);
/** Characters that make the grammar treat a whole word as a glob pattern. */
const GLOB_PATTERN = /[*?]|\[[^\]]*\]/;
/**
* Whether one word is a glob the shell should match against the filesystem.
* Handed to `parseShell`, which decides between a `text` and a `glob` segment.
* @param word - the word exactly as it was written.
* @returns true when the word contains a wildcard.
*/
function isGlobPattern(word) {
	return GLOB_PATTERN.test(word);
}
/**
* Read one variable the way `$name` does.
*
* Shell variables shadow the environment (an assignment without `export` is
* only visible to this shell), and the specials report what a shell without
* job control or positional parameters can honestly report.
* @param state - the shell state to read.
* @param name - variable name, or one of `?`, `$`, `#`, `@`, `*`, `0`.
* @returns the value, or undefined when the variable is unset.
*/
function readVariable(state, name) {
	switch (name) {
		case "?": return String(state.lastStatus);
		case "$": return "1";
		case "0": return "bash";
		case "#": return "0";
		case "@":
		case "*": return "";
		default: return state.variables[name] ?? state.environment[name];
	}
}
/** Evaluate `$(( … ))`. */
function arithmetic(expression, state) {
	switch (expression.type) {
		case "number": return expression.value;
		case "variable": return Number.parseInt(readVariable(state, expression.name) ?? "0", 10) || 0;
		case "addition": return arithmetic(expression.left, state) + arithmetic(expression.right, state);
		case "subtraction": return arithmetic(expression.left, state) - arithmetic(expression.right, state);
		case "multiplication": return arithmetic(expression.left, state) * arithmetic(expression.right, state);
		case "division": return Math.trunc(arithmetic(expression.left, state) / arithmetic(expression.right, state));
	}
}
/**
* Expand one glob against the filesystem, one path segment at a time.
*
* Matches keep the pattern's own spelling: a relative pattern yields relative
* paths, so `ls *.ts` prints what the model typed.
* @param pattern - the glob as written.
* @param cwd - directory a relative pattern starts from.
* @param fs - the filesystem to match against.
* @returns sorted matches, or an empty array when nothing matches.
*/
async function expandGlob(pattern, cwd, fs) {
	const absolute = pattern.startsWith("/");
	const segments = pattern.split("/").filter((segment) => segment !== "");
	const safeList = async (path) => {
		try {
			return await fs.list(path);
		} catch {
			return [];
		}
	};
	let frontier = [{
		path: absolute ? "/" : cwd,
		display: absolute ? "/" : ""
	}];
	for (const [index, segment] of segments.entries()) {
		const last = index === segments.length - 1;
		const next = [];
		for (const entry of frontier) {
			if (segment === "**") {
				const stack = [entry];
				while (stack.length > 0) {
					const current = stack.pop();
					next.push(current);
					for (const child of await safeList(current.path)) if (child.directory) stack.push({
						path: resolve$2(current.path, child.name),
						display: `${current.display}${child.name}/`
					});
				}
				continue;
			}
			if (!isGlobPattern(segment)) {
				const path = resolve$2(entry.path, segment);
				if (await fs.stat(path) === void 0) continue;
				next.push({
					path,
					display: `${entry.display}${segment}${last ? "" : "/"}`
				});
				continue;
			}
			const matches = (0, import_picomatch.default)(segment, { dot: segment.startsWith(".") });
			for (const child of await safeList(entry.path)) {
				if (!matches(child.name)) continue;
				if (!last && !child.directory) continue;
				next.push({
					path: resolve$2(entry.path, child.name),
					display: `${entry.display}${child.name}${last ? "" : "/"}`
				});
			}
		}
		frontier = next;
	}
	return [...new Set(frontier.map((entry) => entry.display.replace(/\/$/, "")))].filter((match) => match !== "").sort();
}
/**
* Expand one argument into fields.
*
* Unquoted expansions split on whitespace the way a shell does, so
* `cat $FILES` with two names runs `cat` with two arguments while
* `cat "$FILES"` runs it with one.
* @param argument - the parsed argument.
* @param context - substitution hook and shell state.
* @returns the fields this argument contributes to argv.
*/
async function expandArgument(argument, context) {
	const fields = [];
	let current;
	const append = (text) => {
		current = (current ?? "") + text;
	};
	const appendSplit = (text) => {
		const parts = text.split(/\s+/);
		for (const [index, part] of parts.entries()) {
			if (index > 0) {
				if (current !== void 0) fields.push(current);
				current = void 0;
			}
			if (part !== "") append(part);
		}
	};
	for (const segment of argument.segments) switch (segment.type) {
		case "text":
			append(segment.text);
			break;
		case "arithmetic":
			append(String(arithmetic(segment.arithmetic, context.state)));
			break;
		case "variable": {
			const value = await expandVariable(segment, context);
			if (segment.quoted) append(value);
			else appendSplit(value);
			break;
		}
		case "shell": {
			const output = await context.substitute(segment.shell);
			if (segment.quoted) append(output);
			else appendSplit(output);
			break;
		}
		case "glob": {
			const matches = await expandGlob(segment.pattern, context.state.cwd, context.fs);
			if (matches.length === 0) {
				append(segment.pattern);
				break;
			}
			for (const [index, match] of matches.entries()) {
				if (index > 0) {
					fields.push(current);
					current = void 0;
				}
				append(match);
			}
			break;
		}
	}
	if (current !== void 0) fields.push(current);
	return fields;
}
/** Resolve one `${name}` segment, including its `:-` and `:+` alternatives. */
async function expandVariable(segment, context) {
	const value = readVariable(context.state, segment.name);
	const set = value !== void 0 && value !== "";
	if (!set && segment.defaultValue !== void 0) return await joinArguments(segment.defaultValue, context);
	if (set && segment.alternativeValue !== void 0) return await joinArguments(segment.alternativeValue, context);
	return value ?? "";
}
/** Expand a `:-` / `:+` operand, which is itself a list of arguments. */
async function joinArguments(operand, context) {
	const parts = [];
	for (const argument of operand) parts.push(...await expandArgument(argument, context));
	return parts.join(" ");
}
//#endregion
//#region src/shell/fs-access.ts
/**
* The in-host filesystem for shell runs: {@link ShellFileSystem} straight over
* the mounted VFS, plus the path and diagnostic helpers every program shares.
*
* This implementation answers from memory. A command running in its own
* worker uses the message-backed one (`./process/child.ts`), which this one
* serves from the host side.
* @module @deepseek-ai/dsh-experimental-webworker-runtime/src/shell/fs-access
*/
/**
* Resolve one shell word into an absolute VFS path.
* @param cwd - the shell's working directory.
* @param path - absolute or relative path as the command line spelled it.
* @returns the absolute normalized path.
*/
function resolveIn(cwd, path) {
	return resolve$2(cwd, path);
}
/**
* Restate a filesystem failure the way a shell utility reports it, so the model
* reads `cat: /dsh/none: No such file or directory` instead of a Node error
* string.
* @param program - the utility's name, used as the message prefix.
* @param path - the path the utility was working on.
* @param error - the failure the filesystem raised.
* @returns the single-line diagnostic, without a trailing newline.
*/
function describeFailure(program, path, error) {
	const code = error.code;
	return `${program}: ${path}: ${code === "ENOENT" ? "No such file or directory" : code === "ENOTDIR" ? "Not a directory" : code === "EISDIR" ? "Is a directory" : code === "ENOTEMPTY" ? "Directory not empty" : code === "EEXIST" ? "File exists" : error instanceof Error ? error.message : String(error)}`;
}
/**
* Build a Node-shaped filesystem error, for the conditions this layer detects
* itself and for the worker transport, which can carry a code but not a class.
* @param code - the Node error code (`ENOENT`, `EISDIR`, …).
* @param syscall - the operation that failed.
* @param path - the path it failed on.
* @returns the error to throw.
*/
function filesystemError(code, syscall, path) {
	const reason = code === "EACCES" ? "permission denied" : `${syscall} failed`;
	const error = /* @__PURE__ */ new Error(`${code}: ${reason}, ${syscall} '${path}'`);
	error.code = code;
	error.path = path;
	error.syscall = syscall;
	return error;
}
/** Project VFS stats onto the facts a program reads. */
function statsOf(stats) {
	return {
		directory: stats.isDirectory(),
		size: stats.size,
		mtimeMs: stats.mtimeMs
	};
}
/**
* The filesystem backed by the VFS mounted in this thread.
* @returns the in-host {@link ShellFileSystem}.
*/
function hostFileSystem() {
	const vfs = () => requireActiveVfs();
	const stat = (path) => {
		try {
			return Promise.resolve(statsOf(vfs().statSync(path)));
		} catch {
			return Promise.resolve(void 0);
		}
	};
	return {
		stat,
		list: async (path) => {
			const names = [...vfs().readdirSync(path)].sort();
			const entries = [];
			for (const name of names) entries.push({
				name,
				directory: (await stat(resolve$2(path, name)))?.directory ?? false
			});
			return entries;
		},
		readText: async (path) => {
			if ((await stat(path))?.directory === true) throw filesystemError("EISDIR", "read", path);
			return vfs().readFileSync(path, "utf8");
		},
		writeText: (path, text, append = false) => {
			if (append) vfs().appendFileSync(path, text);
			else vfs().writeFileSync(path, text);
			return Promise.resolve();
		},
		mkdir: (path, recursive) => {
			vfs().mkdirSync(path, { recursive });
			return Promise.resolve();
		},
		remove: (path, options) => {
			vfs().rmSync(path, options);
			return Promise.resolve();
		},
		rename: (from, to) => {
			vfs().renameSync(from, to);
			return Promise.resolve();
		}
	};
}
//#endregion
//#region src/shell/programs/options.ts
/**
* Split one program's arguments.
*
* A short letter listed in `valued` consumes the rest of its token (`-n5`) or
* the next argument (`-n 5`); every other letter is a plain flag, so `-rn`
* sets both `r` and `n`.
* @param argv - the program's argv, including its name at index 0.
* @param valued - short letters that take a value.
* @returns the flags, their values, and the operands.
*/
function parseOptions(argv, valued = /* @__PURE__ */ new Set()) {
	const flags = /* @__PURE__ */ new Set();
	const values = /* @__PURE__ */ new Map();
	const operands = [];
	const rest = argv.slice(1);
	let literal = false;
	for (let index = 0; index < rest.length; index += 1) {
		const argument = rest[index];
		if (literal || argument === "-" || !argument.startsWith("-")) {
			operands.push(argument);
			continue;
		}
		if (argument === "--") {
			literal = true;
			continue;
		}
		if (argument.startsWith("--")) {
			const [name, value] = splitLong(argument.slice(2));
			flags.add(name);
			if (value !== void 0) values.set(name, value);
			continue;
		}
		for (let cursor = 1; cursor < argument.length; cursor += 1) {
			const letter = argument[cursor];
			flags.add(letter);
			if (!valued.has(letter)) continue;
			const inline = argument.slice(cursor + 1);
			if (inline !== "") values.set(letter, inline);
			else {
				index += 1;
				values.set(letter, rest[index] ?? "");
			}
			break;
		}
	}
	return {
		flags,
		values,
		operands
	};
}
/** Split `name=value`; a long flag without `=` has no value. */
function splitLong(text) {
	const separator = text.indexOf("=");
	return separator < 0 ? [text, void 0] : [text.slice(0, separator), text.slice(separator + 1)];
}
/**
* Read a numeric flag value.
* @param options - the parsed options.
* @param flag - the short letter to read.
* @param fallback - value to use when the flag is absent or unparsable.
* @returns the number the caller should use.
*/
function numberOption(options, flag, fallback) {
	const raw = options.values.get(flag);
	if (raw === void 0) return fallback;
	const parsed = Number.parseInt(raw, 10);
	return Number.isFinite(parsed) ? parsed : fallback;
}
/**
* Split text into lines for the line-oriented utilities.
* @param text - the text to split.
* @returns its lines, without the trailing empty line a final newline creates.
*/
function toLines(text) {
	if (text === "") return [];
	const lines = text.split("\n");
	if (lines[lines.length - 1] === "") lines.pop();
	return lines;
}
//#endregion
//#region src/shell/programs/builtins.ts
/**
* Shell builtins: the programs that read or change the shell's own state
* (directory, environment, exit status) rather than the filesystem.
* @module @deepseek-ai/dsh-experimental-webworker-runtime/src/shell/programs/builtins
*/
/** Status a command reports when a signal ended it, as a shell renders `128 + SIGINT`. */
const SIGNAL_EXIT_STATUS = 130;
const cd = async (argv, io, state, fs) => {
	const target = argv[1] ?? state.environment["HOME"] ?? "/";
	const path = target === "-" ? state.variables["OLDPWD"] ?? state.cwd : resolveIn(state.cwd, target);
	const stats = await fs.stat(path);
	if (stats === void 0) {
		io.err(`cd: ${target}: No such file or directory\n`);
		return 1;
	}
	if (!stats.directory) {
		io.err(`cd: ${target}: Not a directory\n`);
		return 1;
	}
	state.variables["OLDPWD"] = state.cwd;
	state.cwd = path;
	if ("PWD" in state.environment) state.environment["PWD"] = path;
	return 0;
};
const pwd = (_argv, io, state) => {
	io.out(`${state.cwd}\n`);
	return 0;
};
const exportProgram = (argv, io, state) => {
	const options = parseOptions(argv);
	if (options.operands.length === 0) {
		for (const [name, value] of Object.entries(state.environment).sort()) io.out(`declare -x ${name}="${value}"\n`);
		return 0;
	}
	for (const operand of options.operands) {
		const separator = operand.indexOf("=");
		if (separator < 0) {
			state.environment[operand] = state.variables[operand] ?? state.environment[operand] ?? "";
			continue;
		}
		state.environment[operand.slice(0, separator)] = operand.slice(separator + 1);
	}
	return 0;
};
const unset = (argv, _io, state) => {
	const removed = new Set(argv.slice(1));
	const without = (source) => Object.fromEntries(Object.entries(source).filter(([name]) => !removed.has(name)));
	state.environment = without(state.environment);
	state.variables = without(state.variables);
	return 0;
};
const env = (_argv, io, state) => {
	for (const [name, value] of Object.entries(state.environment).sort()) io.out(`${name}=${value}\n`);
	return 0;
};
const exitProgram = (argv, _io, state) => {
	const status = argv[1] === void 0 ? state.lastStatus : Number.parseInt(argv[1], 10) || 0;
	state.exitRequested = status;
	return status;
};
/** `test` / `[`: the file and string predicates a generated command line uses. */
const test = async (argv, io, state, fs) => {
	const words = argv[0] === "[" ? argv.slice(1, argv[argv.length - 1] === "]" ? -1 : void 0) : argv.slice(1);
	const status = (value) => value ? 0 : 1;
	const statOf = async (operand) => await fs.stat(resolveIn(state.cwd, operand));
	if (words.length === 1) return status(words[0] !== "");
	if (words.length === 2) {
		const operator = words[0];
		const operand = words[1] ?? "";
		switch (operator) {
			case "-e": return status(await statOf(operand) !== void 0);
			case "-f": return status((await statOf(operand))?.directory === false);
			case "-d": return status((await statOf(operand))?.directory === true);
			case "-s": return status(((await statOf(operand))?.size ?? 0) > 0);
			case "-r":
			case "-w": return status(await statOf(operand) !== void 0);
			case "-z": return status(operand === "");
			case "-n": return status(operand !== "");
			case "!": return status(operand === "");
			default:
				io.err(`test: ${operator}: unsupported unary operator\n`);
				return 2;
		}
	}
	if (words.length === 3) {
		const [left, operator, right] = words;
		switch (operator) {
			case "=":
			case "==": return status(left === right);
			case "!=": return status(left !== right);
			case "-eq": return status(Number(left) === Number(right));
			case "-ne": return status(Number(left) !== Number(right));
			case "-lt": return status(Number(left) < Number(right));
			case "-le": return status(Number(left) <= Number(right));
			case "-gt": return status(Number(left) > Number(right));
			case "-ge": return status(Number(left) >= Number(right));
			default:
				io.err(`test: ${operator}: unsupported binary operator\n`);
				return 2;
		}
	}
	io.err("test: unsupported expression\n");
	return 2;
};
const sleep = async (argv, io, state) => {
	const seconds = Number.parseFloat(argv[1] ?? "");
	if (!Number.isFinite(seconds) || seconds < 0) {
		io.err(`sleep: invalid time interval '${argv[1] ?? ""}'\n`);
		return 2;
	}
	return await new Promise((settle) => {
		const timer = setTimeout(() => {
			state.signal?.removeEventListener("abort", onAbort);
			settle(false);
		}, seconds * 1e3);
		function onAbort() {
			clearTimeout(timer);
			settle(true);
		}
		if (state.signal?.aborted === true) onAbort();
		else state.signal?.addEventListener("abort", onAbort, { once: true });
	}) ? SIGNAL_EXIT_STATUS : 0;
};
const date = (_argv, io) => {
	io.out(`${(/* @__PURE__ */ new Date()).toISOString()}\n`);
	return 0;
};
const seq = (argv, io) => {
	const numbers = argv.slice(1).map((value) => Number.parseInt(value, 10));
	const [first, second, third] = numbers;
	const from = numbers.length > 1 ? first : 1;
	const step = numbers.length > 2 ? second : 1;
	const to = numbers.length > 2 ? third : numbers.length > 1 ? second : first;
	if (to === void 0 || !Number.isFinite(to) || step === 0) {
		io.err("seq: expected numeric bounds\n");
		return 2;
	}
	for (let value = from; step > 0 ? value <= to : value >= to; value += step) io.out(`${String(value)}\n`);
	return 0;
};
/** `printenv NAME`, which scripts prefer over `echo $NAME` when the name is computed. */
const printenv = (argv, io, state) => {
	const name = argv[1];
	if (name === void 0) {
		for (const [key, value] of Object.entries(state.environment).sort()) io.out(`${key}=${value}\n`);
		return 0;
	}
	const value = readVariable(state, name);
	if (value === void 0) return 1;
	io.out(`${value}\n`);
	return 0;
};
/** The state builtins, keyed by the name a command line uses. */
const BUILTIN_PROGRAMS = {
	cd,
	pwd,
	export: exportProgram,
	unset,
	env,
	printenv,
	exit: exitProgram,
	test,
	"[": test,
	sleep,
	date,
	seq,
	"true": () => 0,
	"false": () => 1,
	":": () => 0
};
//#endregion
//#region src/shell/programs/files.ts
/**
* File and directory utilities of the command table, all of them over the
* shell's filesystem. Listings print one entry per line: nothing here is ever
* a terminal, so the column layout a real `ls` picks for a tty would only be
* noise in a tool result.
* @module @deepseek-ai/dsh-experimental-webworker-runtime/src/shell/programs/files
*/
/** Format one entry the way `ls -l` does, with the facts the VFS actually holds. */
function longEntry(stats, name) {
	const size = String(stats?.size ?? 0).padStart(8);
	const modified = new Date(stats?.mtimeMs ?? 0).toISOString().replace("T", " ").slice(0, 16);
	return `${stats?.directory === true ? "drwxr-xr-x" : "-rw-r--r--"} ${size} ${modified} ${name}`;
}
const ls = async (argv, io, state, fs) => {
	const options = parseOptions(argv);
	const operands = options.operands.length > 0 ? options.operands : ["."];
	let status = 0;
	for (const [index, operand] of operands.entries()) {
		const path = resolveIn(state.cwd, operand);
		const stats = await fs.stat(path);
		if (stats === void 0) {
			io.err(`ls: ${operand}: No such file or directory\n`);
			status = 2;
			continue;
		}
		if (operands.length > 1) io.out(`${index > 0 ? "\n" : ""}${operand}:\n`);
		if (!stats.directory) {
			io.out(`${options.flags.has("l") ? longEntry(stats, operand) : operand}\n`);
			continue;
		}
		const entries = (await fs.list(path)).filter((entry) => options.flags.has("a") || !entry.name.startsWith("."));
		for (const entry of entries) {
			const shown = options.flags.has("l") ? longEntry(await fs.stat(resolve$2(path, entry.name)), entry.name) : entry.name;
			io.out(`${shown}\n`);
		}
	}
	return status;
};
const find = async (argv, io, state, fs) => {
	const roots = [];
	let namePattern;
	let kind;
	let maxDepth = Number.POSITIVE_INFINITY;
	const words = argv.slice(1);
	for (let index = 0; index < words.length; index += 1) {
		const word = words[index];
		if (word === "-name") {
			index += 1;
			namePattern = words[index];
			continue;
		}
		if (word === "-type") {
			index += 1;
			kind = words[index];
			continue;
		}
		if (word === "-maxdepth") {
			index += 1;
			maxDepth = Number.parseInt(words[index] ?? "", 10);
			continue;
		}
		if (word.startsWith("-")) {
			io.err(`find: unsupported predicate ${word}\n`);
			return 2;
		}
		roots.push(word);
	}
	const matches = namePattern === void 0 ? void 0 : (0, import_picomatch.default)(namePattern, { dot: true });
	let status = 0;
	const visit = async (path, display, depth) => {
		const stats = await fs.stat(path);
		if (stats === void 0) {
			io.err(`find: ${display}: No such file or directory\n`);
			status = 1;
			return;
		}
		if ((matches === void 0 || matches(basename$1(display))) && (kind === void 0 || kind === "d" === stats.directory)) io.out(`${display}\n`);
		if (!stats.directory || depth >= maxDepth) return;
		for (const entry of await fs.list(path)) await visit(resolve$2(path, entry.name), `${display === "/" ? "" : display}/${entry.name}`, depth + 1);
	};
	for (const root of roots.length > 0 ? roots : ["."]) await visit(resolveIn(state.cwd, root), root, 0);
	return status;
};
const mkdir = async (argv, io, state, fs) => {
	const options = parseOptions(argv);
	let status = 0;
	for (const operand of options.operands) try {
		await fs.mkdir(resolveIn(state.cwd, operand), options.flags.has("p"));
	} catch (error) {
		io.err(`${describeFailure("mkdir", operand, error)}\n`);
		status = 1;
	}
	return status;
};
const rmdir = async (argv, io, state, fs) => {
	const options = parseOptions(argv);
	let status = 0;
	for (const operand of options.operands) {
		const path = resolveIn(state.cwd, operand);
		if ((await fs.list(path)).length > 0) {
			io.err(`rmdir: ${operand}: Directory not empty\n`);
			status = 1;
			continue;
		}
		try {
			await fs.remove(path, {
				recursive: true,
				force: false
			});
		} catch (error) {
			io.err(`${describeFailure("rmdir", operand, error)}\n`);
			status = 1;
		}
	}
	return status;
};
const rm = async (argv, io, state, fs) => {
	const options = parseOptions(argv);
	const recursive = options.flags.has("r") || options.flags.has("R");
	const force = options.flags.has("f");
	let status = 0;
	for (const operand of options.operands) {
		const path = resolveIn(state.cwd, operand);
		const stats = await fs.stat(path);
		if (stats === void 0) {
			if (force) continue;
			io.err(`rm: ${operand}: No such file or directory\n`);
			status = 1;
			continue;
		}
		if (stats.directory && !recursive) {
			io.err(`rm: ${operand}: Is a directory\n`);
			status = 1;
			continue;
		}
		try {
			await fs.remove(path, {
				recursive,
				force
			});
		} catch (error) {
			io.err(`${describeFailure("rm", operand, error)}\n`);
			status = 1;
		}
	}
	return status;
};
/** Copy one file or one whole subtree. */
async function copyTree(from, to, fs) {
	if ((await fs.stat(from))?.directory !== true) {
		await fs.writeText(to, await fs.readText(from));
		return;
	}
	await fs.mkdir(to, true);
	for (const entry of await fs.list(from)) await copyTree(resolve$2(from, entry.name), resolve$2(to, entry.name), fs);
}
/** Resolve the real destination of a copy or move: into a directory, or onto a path. */
async function destinationFor(target, source, fs) {
	return (await fs.stat(target))?.directory === true ? resolve$2(target, basename$1(source)) : target;
}
const cp = async (argv, io, state, fs) => {
	const options = parseOptions(argv);
	const sources = options.operands.slice(0, -1);
	const target = options.operands[options.operands.length - 1];
	if (target === void 0 || sources.length === 0) {
		io.err("cp: expected a source and a destination\n");
		return 2;
	}
	const targetPath = resolveIn(state.cwd, target);
	let status = 0;
	for (const source of sources) {
		const sourcePath = resolveIn(state.cwd, source);
		const stats = await fs.stat(sourcePath);
		if (stats === void 0) {
			io.err(`cp: ${source}: No such file or directory\n`);
			status = 1;
			continue;
		}
		if (stats.directory && !(options.flags.has("r") || options.flags.has("R"))) {
			io.err(`cp: ${source}: Is a directory\n`);
			status = 1;
			continue;
		}
		try {
			await copyTree(sourcePath, await destinationFor(targetPath, source, fs), fs);
		} catch (error) {
			io.err(`${describeFailure("cp", source, error)}\n`);
			status = 1;
		}
	}
	return status;
};
const mv = async (argv, io, state, fs) => {
	const options = parseOptions(argv);
	const sources = options.operands.slice(0, -1);
	const target = options.operands[options.operands.length - 1];
	if (target === void 0 || sources.length === 0) {
		io.err("mv: expected a source and a destination\n");
		return 2;
	}
	const targetPath = resolveIn(state.cwd, target);
	let status = 0;
	for (const source of sources) try {
		await fs.rename(resolveIn(state.cwd, source), await destinationFor(targetPath, source, fs));
	} catch (error) {
		io.err(`${describeFailure("mv", source, error)}\n`);
		status = 1;
	}
	return status;
};
const touch = async (argv, io, state, fs) => {
	const options = parseOptions(argv);
	let status = 0;
	for (const operand of options.operands) {
		const path = resolveIn(state.cwd, operand);
		try {
			await fs.writeText(path, await fs.stat(path) === void 0 ? "" : await fs.readText(path));
		} catch (error) {
			io.err(`${describeFailure("touch", operand, error)}\n`);
			status = 1;
		}
	}
	return status;
};
const stat = async (argv, io, state, fs) => {
	const options = parseOptions(argv);
	let status = 0;
	for (const operand of options.operands) {
		const path = resolveIn(state.cwd, operand);
		const stats = await fs.stat(path);
		if (stats === void 0) {
			io.err(`stat: ${operand}: No such file or directory\n`);
			status = 1;
			continue;
		}
		io.out(`${path} ${stats.directory ? "directory" : "file"} ${String(stats.size)} ${new Date(stats.mtimeMs).toISOString()}\n`);
	}
	return status;
};
const dirnameProgram = (argv, io) => {
	for (const operand of argv.slice(1)) io.out(`${dirname$1(operand)}\n`);
	return argv.length > 1 ? 0 : 2;
};
const basenameProgram = (argv, io) => {
	const [, path, suffix] = argv;
	if (path === void 0) {
		io.err("basename: expected a path\n");
		return 2;
	}
	io.out(`${basename$1(path, suffix)}\n`);
	return 0;
};
/** Refuse a utility whose effect the VFS cannot represent at all. */
const unavailable = (name) => (_argv, io) => {
	io.err(`${name}: not available in the worker host\n`);
	return 127;
};
/** The file utilities, keyed by the name a command line uses. */
const FILE_PROGRAMS = {
	ls,
	find,
	mkdir,
	rmdir,
	rm,
	cp,
	mv,
	touch,
	stat,
	dirname: dirnameProgram,
	basename: basenameProgram,
	ln: unavailable("ln"),
	readlink: unavailable("readlink")
};
//#endregion
//#region src/shell/programs/text.ts
/**
* Text utilities of the command table. Each one reads its operands as files
* and falls back to standard input, the way its POSIX counterpart does.
* @module @deepseek-ai/dsh-experimental-webworker-runtime/src/shell/programs/text
*/
/**
* Read every operand as a file, reporting the ones that fail.
* @param program - name used in diagnostics.
* @param operands - paths to read; empty means standard input.
* @param io - source of standard input and sink for diagnostics.
* @param state - shell state supplying the working directory.
* @param fs - the filesystem to read from.
* @returns one entry per readable source and the status the program should report.
*/
async function readInputs(program, operands, io, state, fs) {
	if (operands.length === 0) return {
		sources: [{
			name: "-",
			text: io.stdin
		}],
		status: 0
	};
	const sources = [];
	let status = 0;
	for (const operand of operands) {
		if (operand === "-") {
			sources.push({
				name: "-",
				text: io.stdin
			});
			continue;
		}
		const path = resolveIn(state.cwd, operand);
		try {
			sources.push({
				name: operand,
				text: await fs.readText(path)
			});
		} catch (error) {
			io.err(`${describeFailure(program, operand, error)}\n`);
			status = 1;
		}
	}
	return {
		sources,
		status
	};
}
/** Append a trailing newline unless the text already ends with one. */
function terminated(text) {
	return text === "" || text.endsWith("\n") ? text : `${text}\n`;
}
const echo = (argv, io) => {
	const suppressNewline = argv[1] === "-n";
	const words = argv.slice(suppressNewline ? 2 : 1);
	io.out(`${words.join(" ")}${suppressNewline ? "" : "\n"}`);
	return 0;
};
const printf = (argv, io) => {
	const format = argv[1] ?? "";
	const operands = argv.slice(2);
	let cursor = 0;
	const rendered = format.replace(/%[sdi%]/g, (match) => {
		if (match === "%%") return "%";
		const value = operands[cursor] ?? "";
		cursor += 1;
		if (match === "%s") return value;
		const parsed = Number.parseInt(value, 10);
		return String(Number.isFinite(parsed) ? parsed : 0);
	});
	io.out(rendered.replace(/\\n/g, "\n").replace(/\\t/g, "	"));
	return 0;
};
const cat = async (argv, io, state, fs) => {
	const options = parseOptions(argv);
	const { sources, status } = await readInputs("cat", options.operands, io, state, fs);
	let line = 1;
	for (const source of sources) {
		if (!options.flags.has("n")) {
			io.out(source.text);
			continue;
		}
		for (const content of toLines(source.text)) {
			io.out(`${String(line).padStart(6)}\t${content}\n`);
			line += 1;
		}
	}
	return status;
};
const head = async (argv, io, state, fs) => {
	const options = parseOptions(argv, new Set(["n"]));
	const count = numberOption(options, "n", 10);
	const { sources, status } = await readInputs("head", options.operands, io, state, fs);
	for (const [index, source] of sources.entries()) {
		if (sources.length > 1) io.out(`${index > 0 ? "\n" : ""}==> ${source.name} <==\n`);
		io.out(terminated(toLines(source.text).slice(0, count).join("\n")));
	}
	return status;
};
const tail = async (argv, io, state, fs) => {
	const options = parseOptions(argv, new Set(["n"]));
	const count = numberOption(options, "n", 10);
	const { sources, status } = await readInputs("tail", options.operands, io, state, fs);
	for (const [index, source] of sources.entries()) {
		if (sources.length > 1) io.out(`${index > 0 ? "\n" : ""}==> ${source.name} <==\n`);
		io.out(terminated(toLines(source.text).slice(-count).join("\n")));
	}
	return status;
};
const wc = async (argv, io, state, fs) => {
	const options = parseOptions(argv);
	const { sources, status } = await readInputs("wc", options.operands, io, state, fs);
	const selected = [
		"l",
		"w",
		"c"
	].filter((flag) => options.flags.has(flag));
	const columns = selected.length > 0 ? selected : [
		"l",
		"w",
		"c"
	];
	for (const source of sources) {
		const counts = {
			l: toLines(source.text).length,
			w: source.text.split(/\s+/).filter((word) => word !== "").length,
			c: source.text.length
		};
		const cells = columns.map((column) => String(counts[column] ?? 0).padStart(columns.length > 1 ? 8 : 1));
		io.out(`${cells.join(" ")}${source.name === "-" ? "" : ` ${source.name}`}\n`);
	}
	return status;
};
/** Collect every file under one directory, for `grep -r`. */
async function walkFiles(path, display, into, fs) {
	for (const entry of await fs.list(path)) {
		const child = `${path.endsWith("/") ? path : `${path}/`}${entry.name}`;
		const shown = `${display.endsWith("/") ? display : `${display}/`}${entry.name}`;
		if (entry.directory) await walkFiles(child, shown, into, fs);
		else into.push({
			path: child,
			display: shown
		});
	}
}
const grep = async (argv, io, state, fs) => {
	const options = parseOptions(argv, new Set(["e"]));
	const pattern = options.values.get("e") ?? options.operands[0];
	const targets = options.values.get("e") === void 0 ? options.operands.slice(1) : options.operands;
	if (pattern === void 0) {
		io.err("grep: no pattern given\n");
		return 2;
	}
	const source = options.flags.has("F") ? pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : pattern;
	let matcher;
	try {
		matcher = new RegExp(source, options.flags.has("i") ? "i" : "");
	} catch (error) {
		io.err(`grep: invalid pattern: ${error instanceof Error ? error.message : String(error)}\n`);
		return 2;
	}
	const sources = [];
	let status = 0;
	if (targets.length === 0) sources.push({
		name: "",
		text: io.stdin
	});
	else for (const target of targets) {
		const path = resolveIn(state.cwd, target);
		if ((await fs.stat(path))?.directory === true) {
			if (!options.flags.has("r") && !options.flags.has("R")) {
				io.err(`grep: ${target}: Is a directory\n`);
				status = Math.max(status, 2);
				continue;
			}
			const files = [];
			await walkFiles(path, target, files, fs);
			for (const file of files) sources.push({
				name: file.display,
				text: await fs.readText(file.path)
			});
			continue;
		}
		try {
			sources.push({
				name: target,
				text: await fs.readText(path)
			});
		} catch (error) {
			io.err(`${describeFailure("grep", target, error)}\n`);
			status = Math.max(status, 2);
		}
	}
	const label = sources.length > 1 || options.flags.has("H");
	let matched = false;
	for (const entry of sources) {
		const hits = toLines(entry.text).map((text, index) => ({
			text,
			number: index + 1
		})).filter((line) => matcher.test(line.text) !== options.flags.has("v"));
		if (hits.length > 0) matched = true;
		if (options.flags.has("l")) {
			if (hits.length > 0) io.out(`${entry.name}\n`);
			continue;
		}
		if (options.flags.has("c")) {
			io.out(`${label && entry.name !== "" ? `${entry.name}:` : ""}${String(hits.length)}\n`);
			continue;
		}
		for (const hit of hits) {
			const prefix = `${label && entry.name !== "" ? `${entry.name}:` : ""}${options.flags.has("n") ? `${String(hit.number)}:` : ""}`;
			io.out(`${prefix}${hit.text}\n`);
		}
	}
	return status !== 0 ? status : matched ? 0 : 1;
};
const sort = async (argv, io, state, fs) => {
	const options = parseOptions(argv);
	const { sources, status } = await readInputs("sort", options.operands, io, state, fs);
	let lines = sources.flatMap((source) => toLines(source.text));
	lines = options.flags.has("n") ? [...lines].sort((left, right) => (Number.parseFloat(left) || 0) - (Number.parseFloat(right) || 0)) : [...lines].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
	if (options.flags.has("r")) lines.reverse();
	if (options.flags.has("u")) lines = [...new Set(lines)];
	io.out(terminated(lines.join("\n")));
	return status;
};
const uniq = async (argv, io, state, fs) => {
	const options = parseOptions(argv);
	const { sources, status } = await readInputs("uniq", options.operands, io, state, fs);
	const lines = sources.flatMap((source) => toLines(source.text));
	const groups = [];
	for (const line of lines) {
		const previous = groups[groups.length - 1];
		if (previous !== void 0 && previous.text === line) previous.count += 1;
		else groups.push({
			text: line,
			count: 1
		});
	}
	const selected = options.flags.has("d") ? groups.filter((group) => group.count > 1) : options.flags.has("u") ? groups.filter((group) => group.count === 1) : groups;
	for (const group of selected) io.out(`${options.flags.has("c") ? `${String(group.count).padStart(7)} ` : ""}${group.text}\n`);
	return status;
};
const cut = async (argv, io, state, fs) => {
	const options = parseOptions(argv, new Set([
		"d",
		"f",
		"c"
	]));
	const delimiter = options.values.get("d") ?? "	";
	const fields = (options.values.get("f") ?? "").split(",").map((field) => Number.parseInt(field, 10)).filter(Number.isFinite);
	const characters = options.values.get("c");
	const { sources, status } = await readInputs("cut", options.operands, io, state, fs);
	if (fields.length === 0 && characters === void 0) {
		io.err("cut: expected -f or -c\n");
		return 2;
	}
	for (const source of sources) for (const line of toLines(source.text)) {
		if (characters !== void 0) {
			const [from, to] = characters.split("-");
			const start = Number.parseInt(from ?? "1", 10) || 1;
			const end = to === void 0 || to === "" ? start : Number.parseInt(to, 10);
			io.out(`${line.slice(start - 1, end)}\n`);
			continue;
		}
		const parts = line.split(delimiter);
		io.out(`${fields.map((field) => parts[field - 1] ?? "").join(delimiter)}\n`);
	}
	return status;
};
/** Expand one `tr` set: `a-z` becomes every character in that range. */
function characterSet(set) {
	const characters = [...set];
	const expanded = [];
	for (let index = 0; index < characters.length; index += 1) {
		const start = characters[index];
		const end = characters[index + 2];
		if (characters[index + 1] === "-" && end !== void 0) {
			for (let code = start.codePointAt(0); code <= end.codePointAt(0); code += 1) expanded.push(String.fromCodePoint(code));
			index += 2;
			continue;
		}
		expanded.push(start);
	}
	return expanded;
}
const tr = (argv, io) => {
	const options = parseOptions(argv);
	const [fromSet, toSet] = options.operands;
	const from = fromSet === void 0 ? void 0 : characterSet(fromSet).join("");
	const to = toSet === void 0 ? void 0 : characterSet(toSet).join("");
	if (from === void 0) {
		io.err("tr: expected a source set\n");
		return 2;
	}
	if (options.flags.has("d")) {
		io.out([...io.stdin].filter((character) => !from.includes(character)).join(""));
		return 0;
	}
	if (to === void 0) {
		io.err("tr: expected a replacement set\n");
		return 2;
	}
	io.out([...io.stdin].map((character) => {
		const index = from.indexOf(character);
		return index < 0 ? character : to[Math.min(index, to.length - 1)];
	}).join(""));
	return 0;
};
/** `sed` accepts only the substitute command; anything else is reported, not guessed at. */
const sed = async (argv, io, state, fs) => {
	const options = parseOptions(argv, new Set(["e"]));
	const script = options.values.get("e") ?? options.operands[0];
	const targets = options.values.get("e") === void 0 ? options.operands.slice(1) : options.operands;
	const parsed = /^s(.)(.*?[^\\])?\1(.*?)\1([gi]*)$/.exec(script ?? "");
	if (parsed === null) {
		io.err("sed: only substitution scripts (s/pattern/replacement/) run in the worker host\n");
		return 2;
	}
	const [, , pattern = "", replacement = "", modifiers = ""] = parsed;
	let matcher;
	try {
		matcher = new RegExp(pattern, modifiers.includes("g") ? `g${modifiers.replace("g", "")}` : modifiers);
	} catch (error) {
		io.err(`sed: invalid pattern: ${error instanceof Error ? error.message : String(error)}\n`);
		return 2;
	}
	const { sources, status } = await readInputs("sed", targets, io, state, fs);
	for (const source of sources) for (const line of toLines(source.text)) io.out(`${line.replace(matcher, replacement.replace(/\\(\d)/g, "$$$1"))}\n`);
	return status;
};
const tee = async (argv, io, state, fs) => {
	const options = parseOptions(argv);
	io.out(io.stdin);
	for (const operand of options.operands) try {
		await fs.writeText(resolveIn(state.cwd, operand), io.stdin, options.flags.has("a"));
	} catch (error) {
		io.err(`${describeFailure("tee", operand, error)}\n`);
		return 1;
	}
	return 0;
};
/** The text utilities, keyed by the name a command line uses. */
const TEXT_PROGRAMS = {
	echo,
	printf,
	cat,
	head,
	tail,
	wc,
	grep,
	sort,
	uniq,
	cut,
	tr,
	sed,
	tee
};
//#endregion
//#region src/shell/programs/index.ts
let table;
/**
* The standard command table, built once and shared by every command line.
* @returns the program table, keyed by command name.
*/
function standardPrograms() {
	table ??= new Map([
		...Object.entries(BUILTIN_PROGRAMS),
		...Object.entries(FILE_PROGRAMS),
		...Object.entries(TEXT_PROGRAMS),
		["which", which]
	]);
	return table;
}
/** Reports which of the requested names this shell can run. */
const which = (argv, io) => {
	const known = standardPrograms();
	let status = 0;
	for (const name of argv.slice(1)) {
		if (known.has(name)) {
			io.out(`${name}: shell built-in command\n`);
			continue;
		}
		io.err(`which: no ${name} in the worker host command table\n`);
		status = 1;
	}
	return status;
};
//#endregion
//#region src/shell/interpret.ts
/**
* The interpreter: it walks the parsed command line and runs the command table
* against the VFS. Structure (`;` `&` `|` `|&` `&&` `||`, subshells, groups,
* redirections, prefix assignments) is honored here; what a command *does*
* belongs to its program in `./programs/`.
*
* Output is text, not streams: every program is a JavaScript function that
* returns before the next one runs, so a pipeline hands a string along instead
* of plumbing byte streams a browser worker has no way to schedule between.
* @module @deepseek-ai/dsh-experimental-webworker-runtime/src/shell/interpret
*/
/** Status a command line reports once the caller's abort signal has fired. */
const ABORTED_STATUS = 130;
/** Status of a command name the table does not hold, as POSIX shells report it. */
const NOT_FOUND_STATUS = 127;
/** Nesting limit for `$( … )`; a deeper line is a runaway, not a command. */
const MAX_SUBSTITUTION_DEPTH = 16;
/** A sink over a string buffer, for pipelines and command substitution. */
function buffer() {
	const chunks = [];
	return {
		write: (text) => {
			chunks.push(text);
		},
		text: () => chunks.join("")
	};
}
/**
* Run one shell command line to completion.
* @param source - the command source, exactly as `bash -c` would receive it.
* @param options - starting directory, environment, standard input, cancellation, filesystem, output callback.
* @returns the exit status and the complete standard output and standard error.
*/
async function runShellCommand(source, options) {
	const run = startRun(options);
	let line;
	try {
		line = (0, import_shell.parseShell)(source, { isGlobPattern });
	} catch (error) {
		run.io.err(`bash: syntax error: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}\n`);
		return run.settle(2);
	}
	const interpreter = new Interpreter(standardPrograms(), options.fs ?? hostFileSystem(), options.signal);
	return run.settle(await interpreter.line(line, run.state, run.io));
}
/**
* Run one program directly, without a command line to parse.
*
* This is the path for an argv the caller already has in pieces — a spawn that
* names a program instead of handing `bash` a script — so nothing re-quotes
* words that were never quoted in the first place.
* @param argv - the program name at index 0, then its arguments.
* @param options - starting directory, environment, standard input, cancellation, filesystem, output callback.
* @returns the exit status and the complete standard output and standard error.
*/
async function runShellProgram(argv, options) {
	const run = startRun(options);
	const name = argv[0];
	const program = name === void 0 ? void 0 : standardPrograms().get(name);
	if (name === void 0 || program === void 0) {
		run.io.err(`bash: ${name ?? ""}: command not found\n`);
		return run.settle(NOT_FOUND_STATUS);
	}
	if (options.signal?.aborted === true) return run.settle(ABORTED_STATUS);
	try {
		return run.settle(await program(argv, run.io, run.state, options.fs ?? hostFileSystem()));
	} catch (error) {
		run.io.err(`bash: ${name}: ${error instanceof Error ? error.message : String(error)}\n`);
		return run.settle(1);
	}
}
/** Build the state, the sinks, and the settlement one run reports through. */
function startRun(options) {
	const stdout = buffer();
	const stderr = buffer();
	const report = options.onOutput;
	return {
		state: {
			cwd: options.cwd,
			environment: { ...options.env },
			variables: {},
			lastStatus: 0,
			exitRequested: void 0,
			signal: options.signal
		},
		io: {
			stdin: options.stdin ?? "",
			out: (text) => {
				stdout.write(text);
				report?.("stdout", text);
			},
			err: (text) => {
				stderr.write(text);
				report?.("stderr", text);
			}
		},
		settle: (exitCode) => ({
			exitCode,
			stdout: stdout.text(),
			stderr: stderr.text()
		})
	};
}
/** One interpretation pass; holds what every nested command shares. */
var Interpreter = class Interpreter {
	programs;
	fs;
	signal;
	depth;
	constructor(programs, fs, signal, depth = 0) {
		this.programs = programs;
		this.fs = fs;
		this.signal = signal;
		this.depth = depth;
	}
	/**
	* Run every command of one line, left to right.
	* @param line - the parsed line.
	* @param state - shell state the line reads and mutates.
	* @param io - standard input and the output sinks.
	* @returns the status of the last command that ran.
	*/
	async line(line, state, io) {
		let status = state.lastStatus;
		for (const entry of line) {
			if (this.signal?.aborted === true) return ABORTED_STATUS;
			status = await this.commandLine(entry.command, state, io);
			state.lastStatus = status;
			if (state.exitRequested !== void 0) return state.exitRequested;
		}
		return status;
	}
	/**
	* Run one `&&` / `||` chain.
	*
	* The grammar nests these to the right, while a shell evaluates them left to
	* right: `false && a || b` runs `b`. Flattening first is what makes the
	* skipped `&&` hand its status to the following `||` instead of taking the
	* whole remainder of the line with it.
	*/
	async commandLine(commandLine, state, io) {
		const links = [];
		for (let current = commandLine.then; current !== void 0; current = current.line.then) links.push({
			type: current.type,
			chain: current.line.chain
		});
		let status = await this.pipeline(commandLine.chain, state, io);
		state.lastStatus = status;
		for (const link of links) {
			if (state.exitRequested !== void 0) return status;
			if (link.type === "&&" ? status !== 0 : status === 0) continue;
			status = await this.pipeline(link.chain, state, io);
			state.lastStatus = status;
		}
		return status;
	}
	/** Run one `|` / `|&` pipeline; its status is the last stage's. */
	async pipeline(chain, state, io) {
		const stages = [];
		for (let current = chain; current !== void 0;) {
			const link = current.then;
			stages.push({
				command: current,
				mergesStderr: link?.type === "|&"
			});
			current = link?.chain;
		}
		let input = io.stdin;
		let status = 0;
		for (const [index, stage] of stages.entries()) {
			if (this.signal?.aborted === true) return ABORTED_STATUS;
			const last = index === stages.length - 1;
			const piped = buffer();
			const stageIo = last ? {
				stdin: input,
				out: io.out,
				err: io.err
			} : {
				stdin: input,
				out: piped.write,
				err: stage.mergesStderr ? piped.write : io.err
			};
			status = await this.command(stage.command, state, stageIo);
			if (!last) input = piped.text();
			if (state.exitRequested !== void 0) return status;
		}
		return status;
	}
	/** Run one command node: a program call, a subshell, a group, or bare assignments. */
	async command(command, state, io) {
		switch (command.type) {
			case "envs":
				for (const env of command.envs) assign(state, env.name, await this.assignedValue(env.args[0], state));
				return 0;
			case "subshell": {
				const nested = {
					...state,
					environment: { ...state.environment },
					variables: { ...state.variables }
				};
				return await this.redirected(command.args, state, io, async (inner) => await this.line(command.subshell, nested, inner));
			}
			case "group": return await this.redirected(command.args, state, io, async (inner) => await this.line(command.group, state, inner));
			case "command": return await this.program(command, state, io);
		}
	}
	/** Expand a command's words and run the program they name. */
	async program(command, state, io) {
		const argv = [];
		const redirections = [];
		for (const argument of command.args) {
			if (argument.type === "redirection") {
				redirections.push(argument);
				continue;
			}
			argv.push(...await expandArgument(argument, this.context(state)));
		}
		const prefix = {};
		for (const env of command.envs) prefix[env.name] = await this.assignedValue(env.args[0], state);
		if (argv.length === 0) {
			for (const [name, value] of Object.entries(prefix)) assign(state, name, value);
			return 0;
		}
		const scope = Object.keys(prefix).length === 0 ? state : {
			...state,
			environment: {
				...state.environment,
				...prefix
			}
		};
		const name = argv[0];
		const program = this.programs.get(name);
		if (program === void 0) {
			io.err(`bash: ${name}: command not found\n`);
			return NOT_FOUND_STATUS;
		}
		return await this.redirected(redirections, state, io, async (inner) => {
			try {
				return await program(argv, inner, scope, this.fs);
			} catch (error) {
				inner.err(`bash: ${name}: ${error instanceof Error ? error.message : String(error)}\n`);
				return 1;
			}
		});
	}
	/**
	* Apply redirections around one body, then restore nothing: every sink is a
	* value, so the caller's own `io` is untouched by construction.
	*/
	async redirected(redirections, state, io, body) {
		let stdin = io.stdin;
		let out = io.out;
		let err = io.err;
		const writes = [];
		for (const redirection of redirections) {
			const targets = [];
			for (const argument of redirection.args) targets.push(...await expandArgument(argument, this.context(state)));
			const target = targets[0];
			if (target === void 0 || targets.length > 1) {
				io.err("bash: ambiguous redirect\n");
				return 1;
			}
			try {
				switch (redirection.subtype) {
					case "<":
						stdin = await this.fs.readText(resolveIn(state.cwd, target));
						break;
					case "<<<":
						stdin = `${target}\n`;
						break;
					case ">":
					case ">>": {
						const path = resolveIn(state.cwd, target);
						if (redirection.subtype === ">") await this.fs.writeText(path, "");
						let pending = Promise.resolve();
						const sink = (text) => {
							pending = pending.then(async () => {
								await this.fs.writeText(path, text, true);
							});
							writes.push(pending);
						};
						if (redirection.fd === 2) err = sink;
						else out = sink;
						break;
					}
					case ">&":
						if (redirection.fd === 2 && target === "1") err = out;
						else if ((redirection.fd === null || redirection.fd === 1) && target === "2") out = err;
						else {
							io.err(`bash: ${String(redirection.fd ?? 1)}>&${target}: unsupported descriptor redirection\n`);
							return 1;
						}
						break;
					case "<&":
						io.err(`bash: <&${target}: unsupported descriptor redirection\n`);
						return 1;
				}
			} catch (error) {
				io.err(`${describeFailure("bash", resolveIn(state.cwd, target), error)}\n`);
				return 1;
			}
		}
		const status = await body({
			stdin,
			out,
			err
		});
		await Promise.all(writes);
		return status;
	}
	/** The expansion hook: `$( … )` runs on a nested interpreter of the same table. */
	context(state) {
		return {
			state,
			fs: this.fs,
			substitute: async (shell) => {
				if (this.depth >= MAX_SUBSTITUTION_DEPTH) throw new Error(`command substitution nested deeper than ${String(MAX_SUBSTITUTION_DEPTH)} levels`);
				const captured = buffer();
				const nested = {
					...state,
					environment: { ...state.environment },
					variables: { ...state.variables }
				};
				await new Interpreter(this.programs, this.fs, this.signal, this.depth + 1).line(shell, nested, {
					stdin: "",
					out: captured.write,
					err: () => {}
				});
				return captured.text().replace(/\n+$/, "");
			}
		};
	}
	/** Expand the right-hand side of one `NAME=value` assignment. */
	async assignedValue(argument, state) {
		if (argument === void 0) return "";
		return (await expandArgument(argument, this.context(state))).join(" ");
	}
};
/**
* Record one assignment. An exported name keeps its export (the environment
* copy is what programs read); anything else stays a shell variable.
*/
function assign(state, name, value) {
	if (name in state.environment) state.environment[name] = value;
	else state.variables[name] = value;
}
//#endregion
//#region src/shell/process/child.ts
/**
* The process worker's own half: a fresh worker that received a
* {@link ShellStartFrame} runs one command here and then closes.
*
* It mounts no VFS image, boots no Cordis tree, and loads no plugins — the
* only thing it shares with the host worker is the bundle it was started from.
* Its filesystem is the host's, reached by message.
* @module @deepseek-ai/dsh-experimental-webworker-runtime/src/shell/process/child
*/
/**
* Run one command as this worker's whole purpose, then close.
*
* Output is forwarded as it is written, so a caller reading a background job
* sees progress before the command settles.
* @param start - the frame that named the command, its directory, and its input.
* @param scope - the worker scope to message through (`self`).
*/
function runShellProcess(start, scope) {
	const pending = /* @__PURE__ */ new Map();
	const stopping = new AbortController();
	let nextCall = 0;
	scope.addEventListener("message", (event) => {
		const frame = event.data;
		if (frame.t === "shell-signal") {
			stopping.abort(/* @__PURE__ */ new Error("killed by signal"));
			return;
		}
		if (frame.t !== "fs-reply") return;
		const waiting = pending.get(frame.id);
		if (waiting === void 0) return;
		pending.delete(frame.id);
		if (frame.failure === void 0) waiting.settle(frame.value);
		else waiting.fail(filesystemError(frame.failure.code ?? "EIO", "fs", frame.failure.message));
	});
	const call = async (op, args) => {
		nextCall += 1;
		const id = nextCall;
		const reply = new Promise((settle, fail) => {
			pending.set(id, {
				settle,
				fail
			});
		});
		scope.postMessage({
			t: "fs-call",
			id,
			op,
			args
		});
		return await reply;
	};
	const options = {
		cwd: start.cwd,
		env: start.env,
		stdin: start.stdin,
		signal: stopping.signal,
		fs: {
			stat: async (path) => await call("stat", [path]),
			list: async (path) => await call("list", [path]),
			readText: async (path) => await call("readText", [path]),
			writeText: async (path, text, append = false) => {
				await call("writeText", [
					path,
					text,
					append
				]);
			},
			mkdir: async (path, recursive) => {
				await call("mkdir", [path, recursive]);
			},
			remove: async (path, options) => {
				await call("remove", [path, options]);
			},
			rename: async (from, to) => {
				await call("rename", [from, to]);
			}
		},
		onOutput: (stream, text) => {
			scope.postMessage({
				t: "shell-out",
				stream,
				text
			});
		}
	};
	(start.script === void 0 ? runShellProgram(start.argv, options) : runShellCommand(start.script, options)).then((outcome) => {
		scope.postMessage({
			t: "shell-exit",
			code: outcome.exitCode
		});
		scope.close();
	}, (error) => {
		scope.postMessage({
			t: "shell-out",
			stream: "stderr",
			text: `bash: ${String(error)}\n`
		});
		scope.postMessage({
			t: "shell-exit",
			code: 1
		});
		scope.close();
	});
}
//#endregion
//#region src/shell/process/host.ts
/**
* Starting and supervising shell processes from the host worker.
*
* A process is a Web Worker started from this same bundle, told by its first
* frame to be a shell process rather than a host. That is what buys real
* process semantics in a browser: the command runs off the host's thread, and
* `terminate()` stops it even mid-loop — the one thing a cooperative in-thread
* interpreter can never do.
*
* Where no `Worker` constructor exists (a Node test host), the same command
* runs inline on this thread. Everything except preemption behaves the same,
* and the difference is named rather than hidden: {@link RunningProcess.destroy}
* can only ask an inline command to stop.
* @module @deepseek-ai/dsh-experimental-webworker-runtime/src/shell/process/host
*/
/** Whether this thread can start a real process worker. */
function canSpawnWorker() {
	return typeof Worker === "function" && typeof self !== "undefined" && typeof self.location.href === "string";
}
/**
* Start one command.
* @param options - the command, its environment, and the sinks for its output and status.
* @returns the handle the process table signals through.
*/
function startProcess(options) {
	return canSpawnWorker() ? startWorkerProcess(options) : startInlineProcess(options);
}
/** Serve one filesystem call for a process worker. */
async function serveFilesystemCall(fs, op, args) {
	switch (op) {
		case "stat": return await fs.stat(args[0]);
		case "list": return await fs.list(args[0]);
		case "readText": return await fs.readText(args[0]);
		case "writeText":
			await fs.writeText(args[0], args[1], args[2]);
			return;
		case "mkdir":
			await fs.mkdir(args[0], args[1]);
			return;
		case "remove":
			await fs.remove(args[0], args[1]);
			return;
		case "rename":
			await fs.rename(args[0], args[1]);
			return;
		default: throw new Error(`webworker shell: unknown filesystem op ${String(op)}`);
	}
}
/** The worker-backed process: a second copy of this bundle, running one command. */
function startWorkerProcess(options) {
	const fs = options.fs ?? hostFileSystem();
	const worker = new Worker(self.location.href, { type: "module" });
	let settled = false;
	const settle = (code) => {
		if (settled) return;
		settled = true;
		worker.terminate();
		options.onExit(code);
	};
	worker.addEventListener("message", (event) => {
		const frame = event.data;
		if (frame.t === "shell-out") {
			options.onOutput(frame.stream, frame.text);
			return;
		}
		if (frame.t === "shell-exit") {
			settle(frame.code);
			return;
		}
		serveFilesystemCall(fs, frame.op, frame.args).then((value) => {
			worker.postMessage({
				t: "fs-reply",
				id: frame.id,
				value
			});
		}, (error) => {
			const failure = {
				code: error.code,
				message: error instanceof Error ? error.message : String(error)
			};
			worker.postMessage({
				t: "fs-reply",
				id: frame.id,
				failure
			});
		});
	});
	worker.addEventListener("error", (event) => {
		options.onOutput("stderr", `bash: process worker failed: ${event.message}\n`);
		settle(1);
	});
	const start = {
		t: "shell-start",
		script: options.script,
		argv: options.argv,
		cwd: options.cwd,
		env: options.env,
		stdin: options.stdin
	};
	worker.postMessage(start);
	return {
		interrupt: () => {
			if (!settled) worker.postMessage({ t: "shell-signal" });
		},
		destroy: () => {
			settle(130);
		}
	};
}
/** The inline process: the same command on this thread, stoppable only by asking. */
function startInlineProcess(options) {
	const stopping = new AbortController();
	const runOptions = {
		cwd: options.cwd,
		env: options.env,
		stdin: options.stdin,
		signal: stopping.signal,
		fs: options.fs ?? hostFileSystem(),
		onOutput: options.onOutput
	};
	(options.script === void 0 ? runShellProgram(options.argv, runOptions) : runShellCommand(options.script, runOptions)).then((outcome) => {
		options.onExit(outcome.exitCode);
	}, (error) => {
		options.onOutput("stderr", `bash: ${String(error)}\n`);
		options.onExit(1);
	});
	const stop = () => {
		stopping.abort(/* @__PURE__ */ new Error("killed by signal"));
	};
	return {
		interrupt: stop,
		destroy: stop
	};
}
//#endregion
//#region src/shell/process/landlock.ts
/** Landlock launcher parsing and per-process VFS enforcement for the worker shell. */
/** Launcher-owned failure; callers print its message with the `landlock-run:` prefix. */
var LandlockLauncherError = class extends Error {};
/**
* Parse the native launcher's argv grammar.
* @param args - Arguments after the launcher executable.
* @returns A probe or confined-run request.
*/
function parseLandlockArguments(args) {
	const readOnly = [];
	const readWrite = [];
	for (let index = 0; index < args.length;) {
		const argument = args[index];
		if (argument === "--probe") {
			if (args.length !== 1) throw new LandlockLauncherError("usage error: --probe takes no other arguments");
			return { kind: "probe" };
		}
		if (argument === "--ro" || argument === "--rw") {
			const path = args[index + 1];
			if (path === void 0) throw new LandlockLauncherError(`usage error: ${argument} requires a path`);
			(argument === "--ro" ? readOnly : readWrite).push(path);
			index += 2;
			continue;
		}
		if (argument === "--") {
			const argv = args.slice(index + 1);
			if (argv.length === 0) throw new LandlockLauncherError("usage error: missing `-- <argv>...` command");
			return {
				kind: "run",
				readOnly,
				readWrite,
				argv
			};
		}
		throw new LandlockLauncherError(`usage error: unknown argument: ${argument}`);
	}
	throw new LandlockLauncherError("usage error: missing `-- <argv>...` command");
}
/** Map the host launcher's temp path into the Worker VFS. */
function vfsPath(path, cwd) {
	const resolved = resolve$2(cwd, path);
	const absolute = resolved.length > 1 ? resolved.replace(/\/+$/u, "") : resolved;
	if (absolute === "/tmp") return DSH_TMP;
	if (absolute.startsWith("/tmp/")) return `${DSH_TMP}${absolute.slice(4)}`;
	return absolute;
}
/** Whether a normalized path is the root itself or one of its descendants. */
function contains(root, path) {
	return root === "/" || path === root || path.startsWith(`${root}/`);
}
/** Throw the denial dialect consumed by `dsh-bash-sandbox`. */
function deny(syscall, path) {
	throw filesystemError("EACCES", syscall, path);
}
/** Stats for the virtual `/dev/null` file. */
const NULL_STATS = {
	directory: false,
	size: 0,
	mtimeMs: 0
};
const DEV_ROOT = "/dev";
const NULL_PATH = "/dev/null";
/** Build one launcher-owned terminal result. */
function launcherExit(exitCode, stdout = "", stderr = "") {
	return {
		kind: "exit",
		exitCode,
		stdout,
		stderr
	};
}
/** Convert a parser or grant failure into the native launcher's fatal dialect. */
function launcherFailure(error) {
	return launcherExit(125, "", `landlock-run: ${error instanceof LandlockLauncherError ? error.message : String(error)}\n`);
}
/**
* Validate grant roots and create one process-local filesystem guard.
* @param base - Host-side VFS adapter all permitted calls delegate to.
* @param invocation - Parsed confined-run request.
* @param cwd - Launcher's working directory for relative grant paths.
* @returns A filesystem enforcing only this invocation's grants.
*/
async function landlockFileSystem(base, invocation, cwd) {
	const normalizeGrant = async (path) => {
		if (path === "") throw new LandlockLauncherError("cannot open rule path: : No such file or directory");
		const target = vfsPath(path, cwd);
		if (target !== DEV_ROOT && target !== NULL_PATH && await base.stat(target) === void 0) throw new LandlockLauncherError(`cannot open rule path: ${path}: No such file or directory`);
		return target;
	};
	const readOnly = await Promise.all(invocation.readOnly.map(normalizeGrant));
	const readWrite = await Promise.all(invocation.readWrite.map(normalizeGrant));
	const readable = [...readOnly, ...readWrite];
	const checkedPath = (path, syscall) => {
		const target = vfsPath(path, cwd);
		if (target.startsWith(`${NULL_PATH}/`)) throw filesystemError("ENOTDIR", syscall, path);
		return target;
	};
	const readPath = (path, syscall) => {
		const target = checkedPath(path, syscall);
		if (!readable.some((root) => contains(root, target))) deny(syscall, path);
		return target;
	};
	const writePath = (path, syscall) => {
		const target = checkedPath(path, syscall);
		if (!readWrite.some((root) => contains(root, target))) deny(syscall, path);
		return target;
	};
	return {
		stat: async (path) => {
			const target = readPath(path, "stat");
			if (target === NULL_PATH) return NULL_STATS;
			if (target === DEV_ROOT && !await base.stat(target)) return {
				directory: true,
				size: 0,
				mtimeMs: 0
			};
			return await base.stat(target);
		},
		list: async (path) => {
			const target = readPath(path, "scandir");
			if (target === DEV_ROOT) return [{
				name: "null",
				directory: false
			}];
			if (target === NULL_PATH) throw filesystemError("ENOTDIR", "scandir", path);
			return await base.list(target);
		},
		readText: async (path) => {
			const target = readPath(path, "open");
			return target === NULL_PATH ? "" : await base.readText(target);
		},
		writeText: async (path, text, append = false) => {
			const target = writePath(path, "open");
			if (target !== NULL_PATH) await base.writeText(target, text, append);
		},
		mkdir: async (path, recursive) => {
			const target = writePath(path, "mkdir");
			if (target === NULL_PATH) throw filesystemError("EEXIST", "mkdir", path);
			await base.mkdir(target, recursive);
		},
		remove: async (path, options) => {
			const target = writePath(path, "rm");
			if (target === NULL_PATH) deny("rm", path);
			await base.remove(target, options);
		},
		rename: async (from, to) => {
			const source = writePath(from, "rename");
			const destination = writePath(to, "rename");
			if (source === NULL_PATH || destination === NULL_PATH) deny("rename", source === NULL_PATH ? from : to);
			await base.rename(source, destination);
		}
	};
}
/** Virtual executable implementing the native launcher's CLI over VFS grants. */
const LANDLOCK_EXECUTABLE = {
	name: "landlock-run",
	async prepare(args, context) {
		try {
			const invocation = parseLandlockArguments(args);
			if (invocation.kind === "probe") return launcherExit(0, "landlock: fully enforced\n");
			return {
				kind: "delegate",
				argv: invocation.argv,
				filesystem: await landlockFileSystem(context.filesystem, invocation, context.cwd),
				missingExecutable: launcherExit(125, "", "landlock-run: exec failed: No such file or directory\n")
			};
		} catch (error) {
			return launcherFailure(error);
		}
	},
	runSync(args) {
		try {
			return parseLandlockArguments(args).kind === "probe" ? launcherExit(0, "landlock: fully enforced\n") : { kind: "asynchronous" };
		} catch (error) {
			return launcherFailure(error);
		}
	}
};
//#endregion
//#region src/shell/process/virtual-executables.ts
/** Virtual executable registry used by the Worker process launcher. */
const EXECUTABLES = new Map([[LANDLOCK_EXECUTABLE.name, LANDLOCK_EXECUTABLE]]);
/**
* Resolve a Worker platform executable by logical name.
* @param path - Bare name or executable path passed to `spawn`.
* @returns Its implementation, or undefined for the normal command table.
*/
function virtualExecutable(path) {
	return EXECUTABLES.get(basename$1(path));
}
//#endregion
//#region src/node/builtin_modules/implemented/child_process.ts
/**
* `node:child_process` over the worker's own shell.
*
* A browser worker cannot fork, so this module IS the machine's process layer:
* `spawn` starts the argv as a shell process (`src/shell/process/`) — its own
* Web Worker, off this thread — and reports it through the `ChildProcess`
* surface the subprocess service consumes: pipes, `exit`/`close`, pid, and
* signals, with `SIGKILL` terminating the worker for real. Worker-owned
* executable wrappers resolve before the shell's command table; anything in
* neither set fails with `ENOENT`, exactly as a missing binary does on a real
* host.
*
* What stays impossible is what needs a real process: synchronous execution
* (`execSync`, and `spawnSync` for a known program) and `fork`.
* @module @deepseek-ai/dsh-experimental-webworker-runtime/src/node/builtin_modules/implemented/child_process
*/
var child_process_exports = /* @__PURE__ */ __exportAll({
	WorkerChildProcess: () => WorkerChildProcess,
	__esModule: () => true,
	default: () => child_process_default,
	exec: () => exec,
	execFile: () => execFile,
	execFileSync: () => execFileSync,
	execSync: () => execSync,
	fork: () => fork,
	spawn: () => spawn$1,
	spawnSync: () => spawnSync
});
const MODULE$7 = "node:child_process";
/**
* The readable half of a pipe: `data` events carrying Buffers, `end`, and a
* `destroy` that stops delivery.
*
* The stream-shaping members below are no-ops rather than omissions. A caller
* that configures the pipe before reading it (the browser launcher calls
* `setEncoding`) would otherwise die of a TypeError on the configuration line,
* hiding the real outcome — which for an unknown program is the `ENOENT` this
* shim is about to emit.
*/
var WorkerReadable = class extends EventEmitter {
	destroyed = false;
	/**
	* Accept an encoding (chunks are always UTF-8 text carried as Buffers).
	* @returns this stream.
	*/
	setEncoding() {
		return this;
	}
	/**
	* Accept a flow-control request; delivery is driven by the command, which
	* has already produced whatever it produced.
	* @returns this stream.
	*/
	pause() {
		return this;
	}
	/** @returns this stream; see {@link pause}. */
	resume() {
		return this;
	}
	/**
	* Deliver one chunk to the `data` listeners.
	* @param text - the text written by the command.
	*/
	push(text) {
		if (this.destroyed || text === "") return;
		this.emit("data", import_buffer.Buffer.from(text, "utf8"));
	}
	/** Signal end of stream. */
	finish() {
		if (this.destroyed) return;
		this.emit("end");
	}
	/** Stop delivering; the collector calls this once the process settles. */
	destroy() {
		this.destroyed = true;
		this.emit("close");
	}
};
/** The writable half of stdin: the batch write the subprocess service performs. */
var WorkerWritable = class extends EventEmitter {
	text = "";
	/**
	* Buffer one write.
	* @param chunk - text or bytes to add to standard input.
	* @returns true, since nothing here applies backpressure.
	*/
	write(chunk) {
		this.text += typeof chunk === "string" ? chunk : import_buffer.Buffer.from(chunk).toString("utf8");
		return true;
	}
	/**
	* Finish standard input.
	* @param chunk - optional final write.
	*/
	end(chunk) {
		if (chunk !== void 0) this.write(chunk);
		this.emit("finish");
	}
	/** @returns everything written so far. */
	contents() {
		return this.text;
	}
};
/**
* One running command, wearing the parts of `ChildProcess` its consumers read.
*/
var WorkerChildProcess = class extends EventEmitter {
	/** The worker's own process id for this command, from the process table. */
	pid;
	/** Standard input, when the caller asked for a pipe; null otherwise. */
	stdin;
	/** Standard output, when the caller asked for a pipe; null otherwise. */
	stdout;
	/** Standard error, when the caller asked for a pipe; null otherwise. */
	stderr;
	/** Exit status once settled; null while running and after a signal. */
	exitCode = null;
	/** The signal that ended the command, or null when it exited on its own. */
	signalCode = null;
	constructor(pid, stdio) {
		super();
		this.pid = pid;
		this.stdin = stdio[0] === "pipe" ? new WorkerWritable() : null;
		this.stdout = stdio[1] === "pipe" ? new WorkerReadable() : null;
		this.stderr = stdio[2] === "pipe" ? new WorkerReadable() : null;
	}
	/**
	* Deliver a signal to this command.
	* @param signal - signal name; every one of them terminates.
	* @returns true when the command was still running.
	*/
	kill(signal = "SIGTERM") {
		return signalProcess(this.pid, signal);
	}
};
/** Normalize the `stdio` option into the three-entry form the shim reads. */
function stdioOf(option) {
	if (typeof option === "string") return [
		option,
		option,
		option
	];
	if (option === void 0) return [
		"pipe",
		"pipe",
		"pipe"
	];
	return [
		option[0] ?? "pipe",
		option[1] ?? "pipe",
		option[2] ?? "pipe"
	];
}
/** The environment a command runs with: the caller's map, minus the removals Node allows. */
function environmentOf(option) {
	const inherited = globalThis.process?.env ?? {};
	return Object.fromEntries(Object.entries(option ?? inherited).filter(([, value]) => value !== void 0));
}
/**
* A missing program fails the way Node fails a missing binary, so consumers
* that classify spawn errors by `code`, `path`, and `syscall` keep working.
*/
function spawnEnoent(program) {
	const error = /* @__PURE__ */ new Error(`spawn ${program} ENOENT`);
	error.code = "ENOENT";
	error.errno = -2;
	error.path = program;
	error.syscall = `spawn ${program}`;
	return error;
}
/** Whether this argv is a shell invocation whose script the interpreter should parse. */
function shellScriptOf(argv) {
	const [program, flag, script] = argv;
	if (program !== "bash" && program !== "sh" || flag !== "-c") return void 0;
	return script ?? "";
}
/**
* Run one command in the worker.
*
* The call returns immediately with a handle; the command runs in its own
* worker (or inline where no `Worker` exists) and reports back through the
* handle's pipes and events.
* @param program - the program name, as argv[0].
* @param args - its arguments.
* @param options - working directory, environment, and stdio dispositions.
* @returns the running command's handle.
*/
function spawn$1(program, args = [], options = {}) {
	if (typeof program !== "string" || program === "") {
		const invalid = /* @__PURE__ */ new TypeError(`The "file" argument must be a non-empty string. Received ${program}`);
		invalid.code = "ERR_INVALID_ARG_TYPE";
		throw invalid;
	}
	const argv = [program, ...args];
	const stdio = stdioOf(options.stdio);
	const entry = registerProcess();
	const child = new WorkerChildProcess(entry.pid, stdio);
	const emit = (stream, text) => {
		if (text === "") return;
		const pipe = stream === "stdout" ? child.stdout : child.stderr;
		if (pipe !== null) {
			pipe.push(text);
			return;
		}
		if (stdio[stream === "stdout" ? 1 : 2] === "inherit") (stream === "stdout" ? console.log : console.error)(text.replace(/\n$/, ""));
	};
	let settled = false;
	const settle = (exitCode) => {
		if (settled) return;
		settled = true;
		releaseProcess(entry.pid);
		const signal = entry.signal ?? null;
		child.exitCode = signal === null ? exitCode : null;
		child.signalCode = signal;
		child.stdout?.finish();
		child.stderr?.finish();
		child.emit("exit", child.exitCode, signal);
		child.emit("close", child.exitCode, signal);
	};
	const failSpawn = (error) => {
		if (settled) return;
		settled = true;
		releaseProcess(entry.pid);
		child.emit("error", error);
	};
	queueMicrotask(() => {
		(async () => {
			const cwd = options.cwd ?? "/dsh";
			let commandArgv = argv;
			let filesystem;
			let missingExecutable;
			const executable = virtualExecutable(program);
			if (executable !== void 0) {
				const prepared = await executable.prepare(args, {
					cwd,
					filesystem: hostFileSystem()
				});
				if (prepared.kind === "exit") {
					emit("stdout", prepared.stdout);
					emit("stderr", prepared.stderr);
					settle(prepared.exitCode);
					return;
				}
				commandArgv = prepared.argv;
				filesystem = prepared.filesystem;
				missingExecutable = prepared.missingExecutable;
			}
			const command = commandArgv[0];
			const script = shellScriptOf(commandArgv);
			if (!(script !== void 0 || standardPrograms().has(command))) {
				if (missingExecutable !== void 0) {
					emit("stdout", missingExecutable.stdout);
					emit("stderr", missingExecutable.stderr);
					settle(missingExecutable.exitCode);
				} else failSpawn(spawnEnoent(program));
				return;
			}
			entry.process = startProcess({
				script,
				argv: commandArgv,
				cwd,
				env: environmentOf(options.env),
				stdin: child.stdin?.contents() ?? "",
				onOutput: emit,
				onExit: settle,
				...filesystem === void 0 ? {} : { fs: filesystem }
			});
			if (entry.signal !== void 0) if (entry.signal === "SIGKILL") entry.process.destroy();
			else entry.process.interrupt();
		})().catch((error) => {
			failSpawn(error instanceof Error ? error : new Error(String(error)));
		});
	});
	return child;
}
/**
* Report that a command cannot run synchronously.
*
* Callers use `spawnSync` to probe for a binary (the sandbox runner probes do)
* and Node answers a missing one with an `error` rather than a throw, so this
* answers in the same shape: absent programs report `ENOENT`, and a program
* this shell *does* have reports that only the asynchronous path can run it.
* @param program - the program name.
* @param args - arguments passed to the virtual launcher probe.
* @returns the Node-shaped synchronous result carrying the failure.
*/
function spawnSync(program, args = []) {
	const empty = import_buffer.Buffer.alloc(0);
	const executable = virtualExecutable(program);
	if (executable !== void 0) {
		const result = executable.runSync(args);
		if (result.kind === "asynchronous") {
			const error = /* @__PURE__ */ new Error(`${MODULE$7}.spawnSync cannot run ${program} in the worker host: commands run asynchronously`);
			return {
				pid: -1,
				status: null,
				signal: null,
				stdout: empty,
				stderr: empty,
				output: [
					null,
					empty,
					empty
				],
				error
			};
		}
		const stdout = import_buffer.Buffer.from(result.stdout);
		const stderr = import_buffer.Buffer.from(result.stderr);
		return {
			pid: -1,
			status: result.exitCode,
			signal: null,
			stdout,
			stderr,
			output: [
				null,
				stdout,
				stderr
			]
		};
	}
	const error = standardPrograms().has(program) ? /* @__PURE__ */ new Error(`${MODULE$7}.spawnSync cannot run ${program} in the worker host: commands run asynchronously`) : spawnEnoent(program);
	return {
		pid: -1,
		status: null,
		signal: null,
		stdout: empty,
		stderr: empty,
		output: [
			null,
			empty,
			empty
		],
		error
	};
}
/** Split the optional options argument from the callback Node allows in either position. */
function execArguments(options, callback) {
	if (typeof options === "function") return {
		options: {},
		callback: options
	};
	return {
		options: options ?? {},
		callback
	};
}
/**
* Run a command line and report its output through a callback.
* @param command - the shell source to run.
* @param options - working directory and environment, or the callback.
* @param callback - receives the failure (nonzero status included), stdout, and stderr.
* @returns the running command's handle.
*/
function exec(command, options, callback) {
	const settled = execArguments(options, callback);
	return execute([
		"bash",
		"-c",
		command
	], settled.options, settled.callback);
}
/**
* Run one program with an explicit argv and report its output through a callback.
* @param program - the program name.
* @param args - its arguments, or the options, or the callback.
* @param options - working directory and environment, or the callback.
* @param callback - receives the failure (nonzero status included), stdout, and stderr.
* @returns the running command's handle.
*/
function execFile(program, args, options, callback) {
	const argv = Array.isArray(args) ? [program, ...args] : [program];
	const settled = execArguments(Array.isArray(args) ? options : args, typeof options === "function" ? options : callback);
	return execute(argv, settled.options, settled.callback);
}
/** Shared body of `exec` and `execFile`: spawn, collect both streams, then report. */
function execute(argv, options, callback) {
	const child = spawn$1(argv[0], argv.slice(1), {
		...options,
		stdio: "pipe"
	});
	let stdout = "";
	let stderr = "";
	child.stdout?.on("data", (chunk) => {
		stdout += String(chunk);
	});
	child.stderr?.on("data", (chunk) => {
		stderr += String(chunk);
	});
	child.on("error", (error) => {
		callback?.(error instanceof Error ? error : new Error(String(error)), stdout, stderr);
	});
	child.on("close", (code) => {
		callback?.((typeof code === "number" ? code : 1) === 0 ? null : /* @__PURE__ */ new Error(`Command failed: ${argv.join(" ")}`), stdout, stderr);
	});
	return child;
}
/** Run a command line synchronously (unavailable: the interpreter is asynchronous). */
const execSync = notImplementedFail(MODULE$7, "execSync");
/** Run one program synchronously (unavailable: the interpreter is asynchronous). */
const execFileSync = notImplementedFail(MODULE$7, "execFileSync");
/** Start a Node child (unavailable: the worker cannot create another Node runtime). */
const fork = notImplementedFail(MODULE$7, "fork");
/** CommonJS default export: the members `require()` hands a caller of this module. */
var child_process_default = {
	spawn: spawn$1,
	spawnSync,
	exec,
	execFile,
	execFileSync,
	execSync,
	fork
};
//#endregion
//#region src/node/builtin_modules/mock/net.ts
var net_exports = /* @__PURE__ */ __exportAll({
	Socket: () => Socket,
	__esModule: () => true,
	connect: () => connect,
	createServer: () => createServer,
	default: () => net_default,
	isIP: () => isIP,
	isIPv4: () => isIPv4,
	isIPv6: () => isIPv6
});
/**
* `node:net` for the worker. Nothing accepts or dials a socket here: the fake
* HTTP server never emits `upgrade`, so only the address predicates and a
* constructible-but-loud Socket are reachable.
*/
const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6 = /^[0-9a-f:]+$/i;
/** Constructible placeholder: the WebSocket upgrade path never runs in the worker. */
var Socket = class {
	/**
	* Sockets are never written to; reaching this means an upgrade path activated.
	* @returns Never — it throws naming the unavailable member.
	*/
	write() {
		throw new Error("web-preview: node:net Socket.write is not available in the worker host");
	}
	/**
	* Counterpart of {@link write}.
	* @returns Never — it throws naming the unavailable member.
	*/
	end() {
		throw new Error("web-preview: node:net Socket.end is not available in the worker host");
	}
	/** Teardown is accepted so disposal paths stay quiet. */
	destroy() {}
};
/**
* Whether a string is an IPv4 literal.
* @param value - candidate.
* @returns true for dotted-quad literals.
*/
function isIPv4(value) {
	return IPV4.test(value) && value.split(".").every((part) => Number(part) <= 255);
}
/**
* Whether a string is an IPv6 literal.
* @param value - candidate.
* @returns true for colon-hex literals.
*/
function isIPv6(value) {
	return value.includes(":") && IPV6.test(value);
}
/**
* IP family of a literal.
* @param value - candidate.
* @returns 4, 6, or 0 when it is not an IP literal.
*/
function isIP(value) {
	if (isIPv4(value)) return 4;
	if (isIPv6(value)) return 6;
	return 0;
}
/**
* TCP listening is the fake HTTP server's business; a bare net server is unreachable.
* @returns Never — it throws naming the unavailable member.
*/
function createServer() {
	throw new Error("web-preview: node:net.createServer is not available in the worker host");
}
/**
* Outbound connections have no carrier in a worker.
* @returns Never — it throws naming the unavailable member.
*/
function connect() {
	throw new Error("web-preview: node:net.connect is not available in the worker host");
}
/** CommonJS default export: the members `require()` hands a caller of this module. */
var net_default = {
	Socket,
	isIP,
	isIPv4,
	isIPv6,
	createServer,
	connect
};
//#endregion
//#region src/node/builtin_modules/mock/sqlite.ts
/**
* `node:sqlite` stub. The web profile configures session-query-sqlite with
* `:memory:` and `openAt: never`, so no database is opened during the acceptance
* chain; reaching the constructor means that configuration changed.
*/
var sqlite_exports = /* @__PURE__ */ __exportAll({
	DatabaseSync: () => DatabaseSync,
	StatementSync: () => StatementSync,
	__esModule: () => true,
	backup: () => backup,
	default: () => sqlite_default
});
const MODULE$6 = "node:sqlite";
/** Synchronous database handle (unavailable). */
const DatabaseSync = notImplementedFail(MODULE$6, "DatabaseSync");
/** Prepared statement handle (unavailable). */
const StatementSync = notImplementedFail(MODULE$6, "StatementSync");
/**
* Backup helper (unavailable).
* @returns Never — it throws naming the unavailable member.
*/
function backup() {
	throw notAvailableError(MODULE$6, "backup");
}
/** CommonJS default export: the members `require()` hands a caller of this module. */
var sqlite_default = {
	DatabaseSync,
	StatementSync,
	backup
};
//#endregion
//#region src/node/builtin_modules/mock/vm.ts
/**
* `node:vm` stub. Script compilation in a separate realm has no browser
* counterpart; the self-modification and workflow rows mount and report the gap
* when they try to compile.
*/
var vm_exports = /* @__PURE__ */ __exportAll({
	Script: () => Script,
	__esModule: () => true,
	createContext: () => createContext,
	default: () => vm_default,
	isContext: () => isContext,
	runInContext: () => runInContext,
	runInNewContext: () => runInNewContext,
	runInThisContext: () => runInThisContext
});
const MODULE$5 = "node:vm";
/** Compiled script (unavailable). */
const Script = notImplementedFail(MODULE$5, "Script");
/** Context creation (unavailable). */
const createContext = notImplementedFail(MODULE$5, "createContext");
/** In-context evaluation (unavailable). */
const runInContext = notImplementedFail(MODULE$5, "runInContext");
/** New-context evaluation (unavailable). */
const runInNewContext = notImplementedFail(MODULE$5, "runInNewContext");
/** This-context evaluation (unavailable). */
const runInThisContext = notImplementedFail(MODULE$5, "runInThisContext");
/** Context predicate (unavailable). */
const isContext = notImplementedFail(MODULE$5, "isContext");
/** CommonJS default export: the members `require()` hands a caller of this module. */
var vm_default = {
	Script,
	createContext,
	runInContext,
	runInNewContext,
	runInThisContext,
	isContext
};
//#endregion
//#region src/node/builtin_modules/mock/worker_threads.ts
/**
* `node:worker_threads` stub. Nested workers are unsupported, so the workflow
* and code-runtime plugin bodies mount and fail on use. The
* thread-identity values are real: they say "this is the main thread", which is
* what the worker host is from the tree's point of view.
*/
var worker_threads_exports = /* @__PURE__ */ __exportAll({
	MessageChannel: () => MessageChannel,
	MessagePort: () => MessagePort,
	Worker: () => Worker$1,
	__esModule: () => true,
	default: () => worker_threads_default,
	isMainThread: () => true,
	markAsUntransferable: () => markAsUntransferable,
	parentPort: () => null,
	receiveMessageOnPort: () => receiveMessageOnPort,
	threadId: () => 0,
	workerData: () => void 0
});
const MODULE$4 = "node:worker_threads";
/** Worker-thread construction (unavailable). */
const Worker$1 = notImplementedFail(MODULE$4, "Worker");
/** Channel construction (unavailable). */
const MessageChannel = notImplementedFail(MODULE$4, "MessageChannel");
/** Port construction (unavailable). */
const MessagePort = notImplementedFail(MODULE$4, "MessagePort");
/** Object transfer marking (unavailable). */
const markAsUntransferable = notImplementedFail(MODULE$4, "markAsUntransferable");
/** Port receiving on a message channel (unavailable). */
const receiveMessageOnPort = notImplementedFail(MODULE$4, "receiveMessageOnPort");
/** CommonJS default export: the members `require()` hands a caller of this module. */
var worker_threads_default = {
	Worker: Worker$1,
	isMainThread: true,
	threadId: 0,
	parentPort: null,
	workerData: void 0,
	MessageChannel,
	MessagePort,
	markAsUntransferable,
	receiveMessageOnPort
};
//#endregion
//#region src/node/external_packages/koffi.ts
/**
* `koffi` stub: the FFI bridge the Windows ACL layer and the Landlock launcher
* use. Type constructors return opaque tokens because the ACL module builds its
* pointer and struct descriptors at module scope — the plugin must mount. Every
* entry that would actually cross into native code is loud; on this platform
* none of it is reachable (`process.platform === 'linux'`, no sandbox).
*/
var koffi_exports = /* @__PURE__ */ __exportAll({
	__esModule: () => true,
	array: () => array,
	default: () => koffi,
	opaque: () => opaque,
	pointer: () => pointer,
	struct: () => struct,
	types: () => types
});
const MODULE$3 = "koffi";
/** Primitive sizes koffi's own x64 ABI reports. */
const PRIMITIVES = {
	void: 0,
	bool: 1,
	char: 1,
	uchar: 1,
	int8: 1,
	uint8: 1,
	short: 2,
	ushort: 2,
	int16: 2,
	uint16: 2,
	int: 4,
	uint: 4,
	int32: 4,
	uint32: 4,
	float: 4,
	float32: 4,
	long: 8,
	ulong: 8,
	longlong: 8,
	ulonglong: 8,
	int64: 8,
	uint64: 8,
	double: 8,
	float64: 8,
	str: 8,
	str16: 8
};
const token = (label, size, alignment = Math.min(size, 8) || 1) => ({
	__dshKoffiType: label,
	size,
	alignment
});
const typeOf = (target) => {
	if (typeof target === "string") {
		const size = PRIMITIVES[target];
		if (size === void 0) throw new Error(`web-preview: koffi type "${target}" is unknown to the stub`);
		return token(target, size);
	}
	const descriptor = target;
	if (descriptor?.__dshKoffiType === void 0) throw new Error(`web-preview: koffi type ${JSON.stringify(target)} is not a stub descriptor`);
	return descriptor;
};
const describe = (target) => typeof target === "string" ? target : target?.__dshKoffiType ?? "anonymous";
/**
* Pointer type descriptor.
* @param target - pointee type name or descriptor.
* @returns the descriptor token.
*/
function pointer(target) {
	return token(`pointer(${describe(target)})`, 8);
}
/**
* Struct type descriptor. The size and alignment are computed with the same
* padding rules koffi uses on x64, because the Windows ACL layer compares them
* against its own header probe at module scope.
* @param name - struct name, or the field record when the name is omitted.
* @param fields - field name → type record.
* @returns the descriptor token.
*/
function struct(name, fields) {
	const members = (typeof name === "string" ? fields : name) ?? {};
	let offset = 0;
	let alignment = 1;
	for (const member of Object.values(members)) {
		const type = typeOf(member);
		alignment = Math.max(alignment, type.alignment);
		offset = Math.ceil(offset / type.alignment) * type.alignment + type.size;
	}
	const size = Math.ceil(offset / alignment) * alignment;
	return token(`struct(${typeof name === "string" ? name : "anonymous"})`, size, alignment);
}
/**
* Array type descriptor.
* @param target - element type.
* @param length - element count.
* @returns the descriptor token.
*/
function array(target, length) {
	const element = typeOf(target);
	return token(`array(${element.__dshKoffiType}, ${String(length)})`, element.size * length, element.alignment);
}
/**
* Opaque type descriptor.
* @param name - type name.
* @returns the descriptor token.
*/
function opaque(name) {
	return token(`opaque(${name ?? "anonymous"})`, 0, 1);
}
/** Primitive type table; members carry their x64 sizes. */
const types = new Proxy({}, {
	get: (_target, property) => typeOf(String(property)),
	has: (property) => typeof property === "string" && property in PRIMITIVES
});
/** The koffi face its consumers read; every call refuses. */
const koffi = {
	pointer,
	struct,
	array,
	opaque,
	types,
	alias: (name, target) => {
		const type = typeOf(target);
		return token(`alias(${name})`, type.size, type.alignment);
	},
	sizeof: (target) => typeOf(target).size,
	alignof: (target) => typeOf(target).alignment,
	load: notImplementedFail(MODULE$3, "load"),
	alloc: notImplementedFail(MODULE$3, "alloc"),
	free: notImplementedFail(MODULE$3, "free"),
	decode: notImplementedFail(MODULE$3, "decode"),
	encode: notImplementedFail(MODULE$3, "encode"),
	address: notImplementedFail(MODULE$3, "address"),
	register: notImplementedFail(MODULE$3, "register"),
	unregister: notImplementedFail(MODULE$3, "unregister"),
	call: notImplementedFail(MODULE$3, "call")
};
//#endregion
//#region src/node/external_packages/node-pty.ts
/**
* `node-pty` stub: pseudo-terminals belong to the excluded surface. Terminal
* plugins mount so their tools stay visible; spawning reports the gap.
*/
var node_pty_exports = /* @__PURE__ */ __exportAll({
	__esModule: () => true,
	default: () => node_pty_default,
	open: () => open,
	spawn: () => spawn
});
const MODULE$2 = "node-pty";
/** Spawn a pseudo-terminal (unavailable). */
const spawn = notImplementedFail(MODULE$2, "spawn");
/** Open a pseudo-terminal pair (unavailable). */
const open = notImplementedFail(MODULE$2, "open");
/** CommonJS default export: the members `require()` hands a caller of this module. */
var node_pty_default = {
	spawn,
	open
};
//#endregion
//#region src/node/external_packages/pi-ai.ts
/**
* `@earendil-works/pi-ai` stub, including its `/providers/all` and `/api/*.lazy`
* subpaths. The package is Node-only (no `require`/`browser` conditions, Node
* builtins plus five cloud SDKs in its transport layer) and `llm-pi-ai` imports it
* statically at module scope, so the row cannot mount without it.
*
* Every symbol `llm-pi-ai` imports by name is present: a missing CommonJS symbol
* would surface as `undefined` at call time instead of a link error. The three catalog readers
* return empty collections rather than throwing — the row reads them while it
* activates, and "this deployment ships no pi-ai provider" is the truth here.
* Everything on a request path is loud.
*/
var pi_ai_exports = /* @__PURE__ */ __exportAll({
	__esModule: () => true,
	anthropicMessagesApi: () => anthropicMessagesApi,
	builtinProviders: () => builtinProviders,
	createModels: () => createModels,
	createProvider: () => createProvider,
	default: () => pi_ai_default,
	getBuiltinModels: () => getBuiltinModels,
	getBuiltinProviders: () => getBuiltinProviders,
	getSupportedThinkingLevels: () => getSupportedThinkingLevels,
	isContextOverflow: () => isContextOverflow,
	openAICompletionsApi: () => openAICompletionsApi,
	openAIResponsesApi: () => openAIResponsesApi
});
const MODULE$1 = "@earendil-works/pi-ai";
/** Provider factory (unavailable). */
const createProvider = notImplementedFail(MODULE$1, "createProvider");
/** Model-list factory (unavailable). */
const createModels = notImplementedFail(MODULE$1, "createModels");
/** Thinking-level catalog (unavailable). */
const getSupportedThinkingLevels = notImplementedFail(MODULE$1, "getSupportedThinkingLevels");
/** Context-overflow predicate (unavailable). */
const isContextOverflow = notImplementedFail(MODULE$1, "isContextOverflow");
/** Builtin provider ids of pi-ai 0.84.2, in catalog order. */
const BUILTIN_PROVIDER_IDS = [
	"amazon-bedrock",
	"ant-ling",
	"anthropic",
	"azure-openai-responses",
	"baseten",
	"cerebras",
	"cloudflare-ai-gateway",
	"cloudflare-workers-ai",
	"deepseek",
	"fireworks",
	"github-copilot",
	"google",
	"google-vertex",
	"groq",
	"huggingface",
	"kimi-coding",
	"minimax",
	"minimax-cn",
	"mistral",
	"moonshotai",
	"moonshotai-cn",
	"nvidia",
	"openai",
	"openai-codex",
	"opencode",
	"opencode-go",
	"openrouter",
	"qwen-token-plan",
	"qwen-token-plan-cn",
	"qwen-token-plan-individual",
	"together",
	"vercel-ai-gateway",
	"xai",
	"xiaomi",
	"xiaomi-token-plan-ams",
	"xiaomi-token-plan-cn",
	"xiaomi-token-plan-sgp",
	"zai",
	"zai-coding-cn"
];
/**
* Installed catalog providers, read while `llm-pi-ai` activates. Each carries the
* api-key auth marker the adapter filters on, and no models: the provider
* directory therefore matches the served deployment while every request path
* lands on a loud symbol above.
* @returns one entry per builtin provider.
*/
function builtinProviders() {
	return BUILTIN_PROVIDER_IDS.map((id) => ({
		id,
		name: id,
		auth: { apiKey: { type: "api-key" } },
		models: []
	}));
}
/**
* Provider route ids of the installed catalog. `llm-pi-ai` registers the whole
* catalog as configurable the moment it mounts and rejects an empty
* registration, so these are pi-ai's real ids rather than an empty list.
* @returns the builtin provider ids.
*/
function getBuiltinProviders() {
	return [...BUILTIN_PROVIDER_IDS];
}
/**
* Models of one installed catalog provider.
* @returns no models.
*/
function getBuiltinModels() {
	return [];
}
/** Anthropic messages API binding (unavailable). */
const anthropicMessagesApi = notImplementedFail(MODULE$1, "anthropicMessagesApi");
/** OpenAI completions API binding (unavailable). */
const openAICompletionsApi = notImplementedFail(MODULE$1, "openAICompletionsApi");
/** OpenAI responses API binding (unavailable). */
const openAIResponsesApi = notImplementedFail(MODULE$1, "openAIResponsesApi");
/** CommonJS default export: the members `require()` hands a caller of this module. */
var pi_ai_default = {
	createProvider,
	createModels,
	getSupportedThinkingLevels,
	isContextOverflow,
	builtinProviders,
	getBuiltinModels,
	getBuiltinProviders,
	anthropicMessagesApi,
	openAICompletionsApi,
	openAIResponsesApi
};
//#endregion
//#region src/node/external_packages/ripgrep.ts
var ripgrep_exports = /* @__PURE__ */ __exportAll({
	__esModule: () => true,
	default: () => ripgrep_default,
	rgPath: () => rgPath
});
/**
* `@vscode/ripgrep` stub. The package's only export is the binary path, read at
* module scope by search plugins; the path stays a plain string so construction
* succeeds, and the loud failure comes from the child_process stub when something
* tries to run it.
*/
/** Path the search plugins would spawn; nothing can execute it in a browser. */
const rgPath = "/dsh/bin/rg";
/** CommonJS default export: the members `require()` hands a caller of this module. */
var ripgrep_default = { rgPath };
//#endregion
//#region src/node/external_packages/sharp.ts
/**
* `sharp` stub: native image transcoding has no browser counterpart in this
* layer. Attachment plugins mount; a resize attempt reports the gap.
*/
var sharp_exports = /* @__PURE__ */ __exportAll({
	__esModule: () => true,
	default: () => sharp
});
/** Image processing has no worker counterpart; the call refuses. */
const sharp = notImplementedFail("sharp", "default");
//#endregion
//#region src/node/external_packages/ws.ts
/**
* `ws` stub. `WebSocketDownlinks` constructs a `WebSocketServer` in a field
* initializer as soon as Connection is present, so the class must be constructible;
* no method is ever reached because the fake HTTP server never emits `upgrade`
* (the tunnel carries downstream events over the SSE branch instead).
*/
var ws_exports = /* @__PURE__ */ __exportAll({
	Server: () => Server,
	WebSocket: () => WebSocket,
	WebSocketServer: () => WebSocketServer,
	__esModule: () => true,
	default: () => WebSocket
});
const MODULE = "ws";
/** Client socket (unavailable; the page side uses the tunnel, not WebSocket). */
var WebSocket = class {
	/** Node's `CONNECTING` ready state, read by consumers that never connect. */
	static CONNECTING = 0;
	/** Node's `OPEN` ready state. */
	static OPEN = 1;
	/** Node's `CLOSING` ready state. */
	static CLOSING = 2;
	/** Node's `CLOSED` ready state. */
	static CLOSED = 3;
	constructor() {
		throw new Error(`web-preview: ${MODULE} client sockets are not available in the worker host`);
	}
};
/** Server whose construction must succeed and whose methods are unreachable. */
var WebSocketServer = class {
	/** Connected clients: always empty, since no upgrade ever completes. */
	clients = /* @__PURE__ */ new Set();
	/** Upgrade handling (unreachable: no upgrade event is ever emitted). */
	handleUpgrade = notImplementedFail(MODULE, "WebSocketServer.handleUpgrade");
	/** Broadcast helper (unreachable). */
	emit = notImplementedFail(MODULE, "WebSocketServer.emit");
	/**
	* Register a listener; nothing is ever emitted.
	* @returns this server.
	*/
	on() {
		return this;
	}
	/**
	* Close the server.
	* @param callback - completion callback, invoked immediately.
	*/
	close(callback) {
		callback?.();
	}
};
/** Alias Node consumers sometimes import. */
const Server = WebSocketServer;
//#endregion
//#region src/node/external_packages/replaced-externals.ts
/**
* Names of external npm packages the worker replaces wholesale. Kept in a module
* with no imports so both consumers can read it: the runtime builtin table
* (`./builtins.ts`) and the build-time VFS image collector, which must leave
* these packages out of the image entirely — the loader answers them from the
* bundle before it ever reaches `node_modules`.
*/
/** External packages served from the worker bundle instead of the VFS. */
const REPLACED_EXTERNAL_PACKAGES = [
	"@earendil-works/pi-ai",
	"@vscode/ripgrep",
	"koffi",
	"node-pty",
	"sharp",
	"ws"
];
//#endregion
//#region src/node/builtins.ts
/**
* The Node-compatibility table, in one place. Two consumers share it, and they
* must resolve to the same module instances:
*   - the worker vite build aliases these specifiers for code bundled statically
*     into the worker (vendored loader, Connection, …);
*   - the worker module loader answers `require('node:fs')` from VFS-loaded
*     modules out of this table, before bare-name resolution.
* Anything absent here fails loudly at resolution instead of resolving to an
* empty module. `process` is deliberately absent: the worker host installs that
* global itself and fills it into this table at assembly time.
*
* Import paths carry the classification: `./implemented/<module>.ts` backs the
* module's real semantics over a worker data source, while `./mock/<module>.ts`
* is a structural placeholder whose calls report the missing capability. File
* names match their Node module specifiers exactly, nesting included.
*
* Every value is a {@link StaticModuleFactory}, so the loader reads a table
* entry only when a `require` names that specifier. What a factory defers is the
* table read, not module evaluation: each one answers a namespace object of the
* static ESM graph below, which the worker bundle evaluates at load like any
* other import. Deferring a shim's own start-up cost therefore belongs inside
* that shim, on the path that first needs it.
*/
/** Builtin modules, keyed with and without the `node:` prefix. */
const BUILTINS = {
	async_hooks: () => async_hooks_exports,
	buffer: () => buffer_exports,
	child_process: () => child_process_exports,
	crypto: () => crypto_exports,
	"dns/promises": () => promises_exports$2,
	events: () => events_exports,
	fs: () => fs_exports,
	"fs/promises": () => promises_exports$1,
	http: () => http_exports,
	module: () => module_exports,
	net: () => net_exports,
	os: () => os_exports,
	path: () => path_exports,
	"path/posix": () => path_exports,
	perf_hooks: () => perf_hooks_exports,
	sqlite: () => sqlite_exports,
	stream: () => stream_exports,
	"timers/promises": () => promises_exports,
	tty: () => tty_exports,
	url: () => url_exports,
	util: () => util_exports,
	"util/types": () => types_exports,
	vm: () => vm_exports,
	worker_threads: () => worker_threads_exports,
	zlib: () => zlib_exports
};
/** External npm packages replaced wholesale (structural not-implemented stubs and fakes). */
const EXTERNALS = {
	"koffi": () => koffi_exports,
	"sharp": () => sharp_exports,
	"node-pty": () => node_pty_exports,
	"ws": () => ws_exports,
	"@vscode/ripgrep": () => ripgrep_exports,
	"@earendil-works/pi-ai": () => pi_ai_exports
};
/**
* Prefixes whose every subpath resolves to one replacement module. The loader
* matches the longest prefix after its exact table misses, so pi-ai's
* `/providers/*` and `/api/*.lazy` entries need no enumeration.
*/
const REPLACED_PREFIXES = { "@earendil-works/pi-ai/": () => pi_ai_exports };
const declared = [...REPLACED_EXTERNAL_PACKAGES].sort().join(",");
const wired = Object.keys(EXTERNALS).sort().join(",");
if (declared !== wired) throw new Error(`web-preview: replaced-external lists diverge — declared [${declared}] vs wired [${wired}]`);
/**
* Build the specifier → factory table the worker module loader consults first.
* @returns every replaced specifier, including its `node:`-prefixed alias.
*/
function createNodeBuiltins() {
	const table = { ...EXTERNALS };
	for (const [name, factory] of Object.entries(BUILTINS)) {
		table[name] = factory;
		table[`node:${name}`] = factory;
	}
	return table;
}
//#endregion
//#region src/node/globals/timers.ts
/**
* Node-shaped timer handles. The browser's `setTimeout`/`setInterval` return
* numeric ids, while harness and vendored code calls `.unref()` on the handle
* (`client-hmr`'s poll interval, cordis's timer plugin). The wrappers return a
* handle object with Node's `ref`/`unref`/`hasRef`, and `clear*` accepts either
* form — the object also converts to its numeric id, so any code that stores it
* as a number keeps working.
*
* Handlers are also bound to the async context where the timer was registered
* (`./async-context-hooks.ts`), so a callback scheduled inside an initiator
* boundary is attributed to that boundary when it fires.
*/
const handleOf = (id) => {
	const handle = {
		ref: () => handle,
		unref: () => handle,
		hasRef: () => true,
		[Symbol.toPrimitive]: () => id
	};
	return handle;
};
const idOf = (handle) => {
	if (typeof handle === "number") return handle;
	if (typeof handle === "object" && handle !== null && Symbol.toPrimitive in handle) return Number(handle);
};
const wrapScheduler = (schedule) => (handler, timeout, ...args) => handleOf(schedule(bindHandler(handler), timeout, ...args));
/** Bind a timer handler to its registration context; string handlers have none to bind. */
const bindHandler = (handler) => typeof handler === "function" ? bindAsyncContext(handler) : handler;
const wrapClear = (clear) => (handle) => {
	clear(idOf(handle));
};
/** Replace the worker's timer globals with the Node-shaped wrappers. */
function installTimerGlobals() {
	const scope = globalThis;
	const setTimeoutRaw = globalThis.setTimeout.bind(globalThis);
	const setIntervalRaw = globalThis.setInterval.bind(globalThis);
	const clearTimeoutRaw = globalThis.clearTimeout.bind(globalThis);
	const clearIntervalRaw = globalThis.clearInterval.bind(globalThis);
	scope.setTimeout = wrapScheduler(setTimeoutRaw);
	scope.setInterval = wrapScheduler(setIntervalRaw);
	scope.clearTimeout = wrapClear(clearTimeoutRaw);
	scope.clearInterval = wrapClear(clearIntervalRaw);
	scope.setImmediate = (handler, ...args) => handleOf(setTimeoutRaw(bindHandler(handler), 0, ...args));
	scope.clearImmediate = wrapClear(clearTimeoutRaw);
}
//#endregion
//#region src/node/globals/crypto.ts
/**
* Fill the `crypto.randomUUID` gap on insecure origins. Browsers expose
* `randomUUID` only in secure contexts, and a preview served over plain HTTP
* on a LAN address is not one — while product code (bundled and VFS-loaded
* alike) reaches the global directly, Node-style. The worker patches the one
* `crypto` instance instead of teaching every caller.
*/
/** Install `crypto.randomUUID` when the context withholds it. */
function installCryptoGlobals() {
	if (typeof globalThis.crypto.randomUUID === "function") return;
	Object.defineProperty(globalThis.crypto, "randomUUID", {
		value: randomUUID$1,
		configurable: true,
		writable: true
	});
}
//#endregion
//#region src/shell/process/protocol.ts
/**
* Whether a message is the frame that turns a fresh worker into a shell
* process. The host worker's entry reads this to pick its role.
* @param data - the raw message payload.
* @returns true when the payload starts a shell process.
*/
function isShellStartFrame(data) {
	return typeof data === "object" && data !== null && data.t === "shell-start";
}
//#endregion
//#region src/worker.ts
/**
* Dedicated Web Worker entry. The Node-compatibility layer this app owns is
* handed to the host assembly as the module table plus the captured request
* listener; the assembly owns everything else (process global, VFS image,
* Cordis tree, tunnel server).
*
* The assembly needs the base image and selected overlays before it can exist;
* they arrive in the tunnel's opening `init` frame. This bundle reads nothing
* from its own URL, so the deployment decides where every archive lives.
* Messages before `init` queue here; requests during boot queue inside the
* host, which attaches its handler before its first await.
*/
installAsyncContextHooks();
installTimerGlobals();
installCryptoGlobals();
let host;
let shellRole = false;
const pending = [];
self.addEventListener("message", (event) => {
	const data = event.data;
	if (host === void 0 && isShellStartFrame(data)) {
		shellRole = true;
		installProcessGlobal({
			cwd: data.cwd,
			env: data.env
		});
		runShellProcess(data, self);
		return;
	}
	if (host === void 0 && data !== null && typeof data === "object" && data.t === "init") {
		if (typeof data.image !== "string") throw new Error("webworker: init frame needs a string image url");
		if (!Array.isArray(data.overlays) || data.overlays.some((overlay) => typeof overlay !== "string")) throw new Error("webworker: init frame needs an array of string overlay urls");
		const created = createWorkerHost({
			staticModules: createNodeBuiltins(),
			staticModulePrefixes: REPLACED_PREFIXES,
			requestListener: whenRequestListener,
			alsCausality,
			image: data.image,
			overlays: data.overlays
		});
		host = created;
		for (const queued of pending) runAtAsyncContextRoot(() => {
			created.handleMessage(queued);
		});
		pending.length = 0;
		created.start().catch(() => {});
		return;
	}
	if (host === void 0) {
		if (shellRole) return;
		pending.push(event.data);
		return;
	}
	const ready = host;
	runAtAsyncContextRoot(() => {
		ready.handleMessage(event.data);
	});
});
//#endregion

//# sourceMappingURL=worker.js.map