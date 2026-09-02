/** Per-CDP-connection routing and projection for every realm's Runtime objects. */
import { cdpStringId } from "../../ids.js";
/** Maps every realm's backend handles to object ids scoped to one CDP connection. */
export class RuntimeObjectTable {
    connectionId;
    routes = new Map();
    nextObjectId = 1;
    nextExceptionId = 1;
    observer;
    constructor(connectionId) {
        this.connectionId = connectionId;
    }
    /**
     * Install Cordis object recognition after Runtime and DOM sessions are assembled.
     * @param observer - Callback mapping a semantic reference to node presentation.
     */
    setObserver(observer) {
        this.observer = observer;
    }
    /**
     * Resolve one connection-local object id.
     * @param objectId - CDP object id allocated by this table.
     * @returns Its realm and backend handle when current.
     */
    resolve(objectId) {
        return this.routes.get(cdpStringId(objectId, 'objectId'));
    }
    /**
     * Convert a realm completion to CDP fields.
     * @param realm - Realm session that produced the value.
     * @param value - Engine-independent completion.
     * @param group - Object group inherited by exposed handles.
     * @returns CDP Runtime completion fields.
     */
    completion(realm, value, group) {
        return {
            result: this.remote(realm, value.result, group),
            ...(value.exceptionDetails === undefined
                ? {}
                : { exceptionDetails: this.exception(realm, value.exceptionDetails, group) }),
        };
    }
    /**
     * Convert realm property descriptors to CDP fields.
     * @param realm - Realm session that owns returned object references.
     * @param value - Engine-independent property result.
     * @param group - Object group inherited from the inspected object.
     * @returns CDP Runtime property result fields.
     */
    properties(realm, value, group) {
        return {
            result: value.properties.map(property => this.property(realm, property, group)),
            ...(value.internalProperties === undefined
                ? {}
                : { internalProperties: value.internalProperties.map(property => this.internalProperty(realm, property, group)) }),
            ...(value.privateProperties === undefined
                ? {}
                : { privateProperties: value.privateProperties.map(property => this.privateProperty(realm, property, group)) }),
            ...(value.exceptionDetails === undefined
                ? {}
                : { exceptionDetails: this.exception(realm, value.exceptionDetails, group) }),
        };
    }
    /**
     * Project one realm Console event to a CDP Runtime notification.
     * @param realm - Realm session that emitted the event.
     * @param value - Realm-neutral Console or exception event.
     * @returns CDP method and parameters.
     */
    consoleEvent(realm, value) {
        if (value.type === 'console-api') {
            const contextId = value.event.contextId
                ?? (realm.context.kind === 'synthetic' ? realm.context.id : undefined);
            return {
                method: 'Runtime.consoleAPICalled',
                params: {
                    type: value.event.type,
                    args: value.event.arguments.map(argument => this.remote(realm, argument, 'console')),
                    timestamp: value.event.timestamp,
                    ...(contextId === undefined ? {} : { executionContextId: contextId }),
                    ...(value.event.stackTrace === undefined ? {} : { stackTrace: cdpStackTrace(value.event.stackTrace) }),
                },
            };
        }
        const contextId = value.event.contextId
            ?? (realm.context.kind === 'synthetic' ? realm.context.id : undefined);
        return {
            method: 'Runtime.exceptionThrown',
            params: {
                timestamp: value.event.timestamp,
                exceptionDetails: {
                    ...this.exception(realm, value.event.details, 'console'),
                    ...(contextId === undefined ? {} : { executionContextId: contextId }),
                },
            },
        };
    }
    /**
     * List realm sessions retaining at least one object in a group.
     * @param group - DevTools object-group name.
     * @returns Distinct realm sessions that must receive the release.
     */
    realmsInGroup(group) {
        const realms = new Set();
        for (const route of this.routes.values()) {
            if (route.group === group)
                realms.add(route.realm);
        }
        return [...realms];
    }
    /**
     * Forget one externally visible object id.
     * @param objectId - Released CDP object id.
     */
    release(objectId) {
        this.routes.delete(cdpStringId(objectId, 'objectId'));
    }
    /**
     * Forget all ids retained under one object group.
     * @param group - Released object-group name.
     */
    releaseGroup(group) {
        for (const [objectId, route] of this.routes) {
            if (route.group === group)
                this.routes.delete(objectId);
        }
    }
    /**
     * Forget every object owned by one closed realm session.
     * @param realm - Closed realm session.
     */
    releaseRealm(realm) {
        for (const [objectId, route] of this.routes) {
            if (route.realm === realm)
                this.routes.delete(objectId);
        }
    }
    /** Forget every object exposed on this DevTools connection. */
    clear() {
        this.routes.clear();
    }
    /**
     * Project one common Runtime value and retain its backend handle for this connection.
     * @param realm - Realm session that owns the value.
     * @param value - Realm-neutral Runtime value.
     * @param group - Object group assigned to any exposed handle.
     * @returns CDP RemoteObject fields.
     */
    remote(realm, value, group) {
        const objectId = value.object === undefined
            ? undefined
            : this.expose(realm, value.object.handle, group);
        const presentation = objectId === undefined || value.semanticReference === undefined
            ? undefined
            : this.observer?.(objectId, realm.descriptor, value.semanticReference, group);
        const descriptor = value.descriptor;
        return {
            ...descriptor,
            ...(presentation?.subtype === undefined ? {} : { subtype: presentation.subtype }),
            ...(presentation?.className === undefined ? {} : { className: presentation.className }),
            ...(presentation?.description === undefined ? {} : { description: presentation.description }),
            ...(objectId === undefined ? {} : { objectId }),
        };
    }
    property(realm, property, group) {
        return {
            ...property,
            ...(property.value === undefined ? {} : { value: this.remote(realm, property.value, group) }),
            ...(property.get === undefined ? {} : { get: this.remote(realm, property.get, group) }),
            ...(property.set === undefined ? {} : { set: this.remote(realm, property.set, group) }),
            ...(property.symbol === undefined ? {} : { symbol: this.remote(realm, property.symbol, group) }),
        };
    }
    internalProperty(realm, property, group) {
        return {
            name: property.name,
            ...(property.value === undefined ? {} : { value: this.remote(realm, property.value, group) }),
        };
    }
    privateProperty(realm, property, group) {
        return {
            name: property.name,
            ...(property.value === undefined ? {} : { value: this.remote(realm, property.value, group) }),
            ...(property.get === undefined ? {} : { get: this.remote(realm, property.get, group) }),
            ...(property.set === undefined ? {} : { set: this.remote(realm, property.set, group) }),
        };
    }
    exception(realm, details, group) {
        return {
            ...details,
            exceptionId: this.nextExceptionId++,
            ...(realm.context.kind === 'synthetic' ? { executionContextId: realm.context.id } : {}),
            ...(details.stackTrace === undefined ? {} : { stackTrace: cdpStackTrace(details.stackTrace) }),
            ...(details.exception === undefined ? {} : { exception: this.remote(realm, details.exception, group) }),
        };
    }
    expose(realm, handle, group) {
        const objectId = cdpStringId(`runtime:${this.connectionId}:${String(this.nextObjectId++)}`, 'objectId');
        this.routes.set(objectId, { realm, handle, group });
        return objectId;
    }
}
function cdpStackTrace(stack) {
    return {
        ...(stack.description === undefined ? {} : { description: stack.description }),
        callFrames: stack.callFrames.map(frame => ({
            functionName: frame.functionName,
            scriptId: frame.scriptKey ?? '0',
            url: frame.url,
            lineNumber: frame.lineNumber,
            columnNumber: frame.columnNumber,
        })),
        ...(stack.parent === undefined ? {} : { parent: cdpStackTrace(stack.parent) }),
    };
}
//# sourceMappingURL=object-table.js.map