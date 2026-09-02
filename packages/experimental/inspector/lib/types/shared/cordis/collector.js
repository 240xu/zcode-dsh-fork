/** Shared Host/Client projection from live Cordis objects to a bounded semantic tree. */
import { Context } from '@deepseek-ai/cordis';
import { jsonByteLength } from "../json.js";
import { CORDIS_TREE_SCHEMA_VERSION, } from "./snapshot.js";
import { RealmObjectRegistry } from "./object-registry.js";
const SHADOW = Symbol.for('cordis.shadow');
/** Realm-local collector with a current live-object table. */
export class CordisTreeCollector {
    root;
    limits;
    /** Live-object table replaced atomically with each emitted snapshot. */
    objects = new RealmObjectRegistry();
    revision = 0;
    constructor(root, limits) {
        this.root = root;
        this.limits = limits;
    }
    /**
     * Capture the current reachable Context/Fiber tree.
     * @returns A detached JSON snapshot whose retained objects replace the prior generation atomically.
     */
    snapshot() {
        const collected = collectContexts(this.root);
        const tree = collected.root;
        const objects = this.objects.begin();
        let nodeCount = 0;
        let truncated = collected.truncated;
        const contextNode = (info) => {
            if (nodeCount >= this.limits.maxNodes) {
                truncated = true;
                return undefined;
            }
            nodeCount++;
            const node = {
                kind: 'context',
                objectHandle: objects.retain(info.value).handle,
                children: [],
            };
            for (const child of info.children) {
                if (child.fiber !== undefined && child.fiber.ctx === child.value) {
                    const projected = fiberNode(child.fiber, child);
                    if (projected !== undefined)
                        node.children.push(projected);
                }
                else {
                    const projected = contextNode(child);
                    if (projected !== undefined)
                        node.children.push(projected);
                }
            }
            return node;
        };
        const fiberNode = (fiber, owned) => {
            if (fiber.uid === null)
                return undefined;
            if (nodeCount + 2 > this.limits.maxNodes) {
                truncated = true;
                return undefined;
            }
            nodeCount++;
            const context = contextNode(owned);
            return {
                kind: 'fiber',
                objectHandle: objects.retain(fiber).handle,
                uid: fiber.uid,
                children: [context],
            };
        };
        const root = contextNode(tree);
        if (root === undefined)
            throw new Error('inspector: maxNodes cannot retain the root Context');
        let snapshot = {
            schemaVersion: CORDIS_TREE_SCHEMA_VERSION,
            revision: ++this.revision,
            objectRegistryId: this.objects.id,
            root,
            truncated,
        };
        while (jsonByteLength(snapshot) > this.limits.maxBytes) {
            const removed = pruneLast(root);
            if (removed.length === 0)
                break;
            for (const handle of removed)
                objects.release(handle);
            snapshot = { ...snapshot, truncated: true };
        }
        if (jsonByteLength(snapshot) > this.limits.maxBytes) {
            throw new Error('inspector: Cordis root exceeds the source-frame byte limit');
        }
        objects.commit();
        return snapshot;
    }
    /** Release the realm-global resolver and every retained object. */
    close() {
        this.objects.close();
    }
}
function collectContexts(root) {
    const contexts = new Map();
    let truncated = false;
    const ensure = (candidate, depth = 0) => {
        if (depth > 100) {
            truncated = true;
            return undefined;
        }
        const value = unwrapContext(candidate);
        if (!Context.is(value))
            return undefined;
        const existing = contexts.get(value);
        if (existing !== undefined)
            return existing;
        if (value === root) {
            const info = describeContext(value);
            contexts.set(value, info);
            return info;
        }
        const prototype = unwrapContext(Object.getPrototypeOf(value));
        const parent = ensure(prototype, depth + 1);
        if (parent === undefined)
            return undefined;
        const info = describeContext(value);
        contexts.set(value, info);
        parent.children.push(info);
        return info;
    };
    const rootInfo = ensure(root);
    for (const runtime of root.registry.values()) {
        for (const fiber of runtime.fibers) {
            if (fiber.uid === null)
                continue;
            ensure(fiber.parent);
            ensure(fiber.ctx);
        }
    }
    for (const key of Reflect.ownKeys(root.events._hooks)) {
        for (const hook of root.events._hooks[key] ?? [])
            ensure(hook.ctx);
    }
    const order = (info) => info.fiber?.uid ?? Number.MAX_SAFE_INTEGER;
    for (const info of contexts.values()) {
        info.children.sort((left, right) => order(left) - order(right));
    }
    return { root: rootInfo, truncated };
}
function describeContext(value) {
    const fiber = ownValue(value, 'fiber');
    return { value, children: [], fiber };
}
function ownValue(value, key) {
    return Reflect.getOwnPropertyDescriptor(value, key)?.value;
}
function unwrapContext(value) {
    let current = value;
    while (typeof current === 'object' && current !== null && Object.hasOwn(current, SHADOW)) {
        current = Object.getPrototypeOf(current);
    }
    return current;
}
function pruneLast(context) {
    const child = context.children.at(-1);
    if (child === undefined)
        return [];
    if (child.kind === 'context') {
        const nested = pruneLast(child);
        if (nested.length > 0)
            return nested;
        context.children.pop();
        return [child.objectHandle];
    }
    const owned = child.children[0];
    const nested = pruneLast(owned);
    if (nested.length > 0)
        return nested;
    context.children.pop();
    return [child.objectHandle, owned.objectHandle];
}
//# sourceMappingURL=collector.js.map