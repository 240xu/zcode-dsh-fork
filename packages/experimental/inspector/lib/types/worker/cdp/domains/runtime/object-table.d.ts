/** Per-CDP-connection routing and projection for every realm's Runtime objects. */
import type { RuntimeCompletion, RuntimeConsoleBackendEvent, RuntimeProperties, RuntimeRemoteObject } from '../../../../shared/cdp/index.ts';
import type { InspectorObjectReference } from '../../../../shared/cordis/object-reference.ts';
import type { RuntimeBackendObjectHandle } from '../../../../shared/cdp/ids.ts';
import type { InspectorRealmDescriptor, InspectorRealmSession } from '../../../inspection/realm.ts';
import { type CdpRemoteObjectId, type InspectorConnectionId } from '../../ids.ts';
/** Object retained behind one connection-local CDP object id. */
export interface RuntimeObjectRoute {
    readonly realm: InspectorRealmSession;
    readonly handle: RuntimeBackendObjectHandle;
    readonly group: string | undefined;
}
/** Semantic presentation applied when an object belongs to a projected node. */
export interface RuntimeObjectPresentation {
    readonly subtype: 'node';
    readonly className: string;
    readonly description: string;
}
/** Observer of newly exposed Runtime object ids. */
export type RuntimeObjectObserver = (objectId: CdpRemoteObjectId, realm: InspectorRealmDescriptor, reference: InspectorObjectReference, group: string | undefined) => RuntimeObjectPresentation | undefined;
/** CDP Runtime payload derived from one realm completion. */
export interface CdpRuntimeCompletion {
    readonly result: Readonly<Record<string, unknown>>;
    readonly exceptionDetails?: Readonly<Record<string, unknown>>;
}
/** CDP Runtime payload derived from one realm's property descriptors. */
export interface CdpGetPropertiesResult {
    readonly result: readonly Readonly<Record<string, unknown>>[];
    readonly internalProperties?: readonly Readonly<Record<string, unknown>>[];
    readonly privateProperties?: readonly Readonly<Record<string, unknown>>[];
    readonly exceptionDetails?: Readonly<Record<string, unknown>>;
}
/** One CDP notification projected from a realm Console event. */
export interface CdpRuntimeEvent {
    readonly method: 'Runtime.consoleAPICalled' | 'Runtime.exceptionThrown';
    readonly params: Readonly<Record<string, unknown>>;
}
/** Maps every realm's backend handles to object ids scoped to one CDP connection. */
export declare class RuntimeObjectTable {
    private readonly connectionId;
    private readonly routes;
    private nextObjectId;
    private nextExceptionId;
    private observer;
    constructor(connectionId: InspectorConnectionId);
    /**
     * Install Cordis object recognition after Runtime and DOM sessions are assembled.
     * @param observer - Callback mapping a semantic reference to node presentation.
     */
    setObserver(observer: RuntimeObjectObserver): void;
    /**
     * Resolve one connection-local object id.
     * @param objectId - CDP object id allocated by this table.
     * @returns Its realm and backend handle when current.
     */
    resolve(objectId: string): RuntimeObjectRoute | undefined;
    /**
     * Convert a realm completion to CDP fields.
     * @param realm - Realm session that produced the value.
     * @param value - Engine-independent completion.
     * @param group - Object group inherited by exposed handles.
     * @returns CDP Runtime completion fields.
     */
    completion(realm: InspectorRealmSession, value: RuntimeCompletion<RuntimeBackendObjectHandle>, group: string | undefined): CdpRuntimeCompletion;
    /**
     * Convert realm property descriptors to CDP fields.
     * @param realm - Realm session that owns returned object references.
     * @param value - Engine-independent property result.
     * @param group - Object group inherited from the inspected object.
     * @returns CDP Runtime property result fields.
     */
    properties(realm: InspectorRealmSession, value: RuntimeProperties<RuntimeBackendObjectHandle>, group: string | undefined): CdpGetPropertiesResult;
    /**
     * Project one realm Console event to a CDP Runtime notification.
     * @param realm - Realm session that emitted the event.
     * @param value - Realm-neutral Console or exception event.
     * @returns CDP method and parameters.
     */
    consoleEvent(realm: InspectorRealmSession, value: RuntimeConsoleBackendEvent<RuntimeBackendObjectHandle>): CdpRuntimeEvent;
    /**
     * List realm sessions retaining at least one object in a group.
     * @param group - DevTools object-group name.
     * @returns Distinct realm sessions that must receive the release.
     */
    realmsInGroup(group: string): InspectorRealmSession[];
    /**
     * Forget one externally visible object id.
     * @param objectId - Released CDP object id.
     */
    release(objectId: string): void;
    /**
     * Forget all ids retained under one object group.
     * @param group - Released object-group name.
     */
    releaseGroup(group: string): void;
    /**
     * Forget every object owned by one closed realm session.
     * @param realm - Closed realm session.
     */
    releaseRealm(realm: InspectorRealmSession): void;
    /** Forget every object exposed on this DevTools connection. */
    clear(): void;
    /**
     * Project one common Runtime value and retain its backend handle for this connection.
     * @param realm - Realm session that owns the value.
     * @param value - Realm-neutral Runtime value.
     * @param group - Object group assigned to any exposed handle.
     * @returns CDP RemoteObject fields.
     */
    remote(realm: InspectorRealmSession, value: RuntimeRemoteObject<RuntimeBackendObjectHandle>, group: string | undefined): Readonly<Record<string, unknown>>;
    private property;
    private internalProperty;
    private privateProperty;
    private exception;
    private expose;
}
//# sourceMappingURL=object-table.d.ts.map