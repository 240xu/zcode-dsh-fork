/** Lazy Client property enumeration for `Runtime.getProperties`. */
import { ClientRuntimeExecutionError } from "./errors.js";
/**
 * Read property descriptors without invoking getters.
 * @param objects - Object table that owns the requested handle.
 * @param command - Validated property request.
 * @param maxProperties - Maximum descriptors returned by this operation.
 * @param allocation - Current operation's object-allocation identity.
 * @returns Own or inherited descriptors and the immediate prototype.
 */
export function getClientProperties(objects, command, maxProperties, allocation) {
    const raw = objects.get(command.handle);
    if (!isObjectLike(raw))
        return { properties: [] };
    const value = typeof raw === 'symbol' ? Symbol.prototype : raw;
    const group = objects.group(command.handle);
    const properties = [];
    const seen = new Set();
    const visited = new Set();
    let owner = value;
    let own = true;
    while (owner !== null) {
        if (visited.has(owner) || visited.size >= maxProperties) {
            throw new ClientRuntimeExecutionError('result-too-large', 'Client prototype traversal exceeded its configured limit');
        }
        visited.add(owner);
        const keys = readKeys(owner);
        for (const key of keys) {
            if (seen.has(key))
                continue;
            seen.add(key);
            if (command.nonIndexedPropertiesOnly === true && typeof key === 'string' && isArrayIndex(key))
                continue;
            const descriptor = readDescriptor(owner, key);
            if (descriptor === undefined)
                continue;
            if (command.accessorPropertiesOnly === true && 'value' in descriptor)
                continue;
            if (properties.length >= maxProperties) {
                throw new ClientRuntimeExecutionError('result-too-large', `Client property result exceeds the configured ${String(maxProperties)}-property limit`);
            }
            properties.push(toRemoteDescriptor(objects, key, descriptor, group, own, command.generatePreview === true, allocation));
        }
        if (command.ownProperties === true)
            break;
        owner = readPrototype(owner);
        own = false;
    }
    if (command.accessorPropertiesOnly === true)
        return { properties };
    const prototype = readPrototype(value);
    const internalProperties = prototype === null
        ? []
        : [{
                name: '[[Prototype]]',
                value: objects.serialize(prototype, remoteOptions(group, command.generatePreview), allocation),
            }];
    return { properties, internalProperties };
}
function toRemoteDescriptor(objects, key, descriptor, group, own, generatePreview, allocation) {
    const common = {
        name: typeof key === 'symbol' ? key.description ?? String(key) : String(key),
        configurable: descriptor.configurable ?? false,
        enumerable: descriptor.enumerable ?? false,
        isOwn: own,
        ...(typeof key === 'symbol' ? { symbol: objects.serialize(key, remoteOptions(group), allocation) } : {}),
    };
    if ('value' in descriptor) {
        return {
            ...common,
            value: objects.serialize(descriptor.value, remoteOptions(group, generatePreview), allocation),
            writable: descriptor.writable ?? false,
        };
    }
    const getter = Reflect.get(descriptor, 'get');
    const setter = Reflect.get(descriptor, 'set');
    return {
        ...common,
        ...(getter === undefined ? {} : { get: objects.serialize(getter, remoteOptions(group), allocation) }),
        ...(setter === undefined ? {} : { set: objects.serialize(setter, remoteOptions(group), allocation) }),
    };
}
function readKeys(value) {
    try {
        return Reflect.ownKeys(value);
    }
    catch (error) {
        throw new ClientRuntimeExecutionError('internal-error', `Cannot enumerate Client object: ${renderError(error)}`);
    }
}
function readDescriptor(value, key) {
    try {
        return Reflect.getOwnPropertyDescriptor(value, key);
    }
    catch (error) {
        throw new ClientRuntimeExecutionError('internal-error', `Cannot read Client property ${String(key)}: ${renderError(error)}`);
    }
}
function readPrototype(value) {
    try {
        return Object.getPrototypeOf(value);
    }
    catch (error) {
        throw new ClientRuntimeExecutionError('internal-error', `Cannot read Client object prototype: ${renderError(error)}`);
    }
}
function isObjectLike(value) {
    return (typeof value === 'object' && value !== null) || typeof value === 'function' || typeof value === 'symbol';
}
function isArrayIndex(value) {
    const number = Number(value);
    return Number.isInteger(number) && number >= 0 && number < 4_294_967_295 && String(number) === value;
}
function renderError(error) {
    return error instanceof Error ? error.message : String(error);
}
function remoteOptions(group, generatePreview) {
    return {
        ...(group === undefined ? {} : { group }),
        ...(generatePreview === undefined ? {} : { generatePreview }),
    };
}
//# sourceMappingURL=properties.js.map