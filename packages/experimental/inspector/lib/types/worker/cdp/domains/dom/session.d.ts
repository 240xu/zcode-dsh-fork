/** Per-DevTools-session read-only DOM projection over Cordis tree snapshots. */
import type { InspectorObjectReference } from '../../../../shared/cordis/object-reference.ts';
import { type CdpRequest, type CdpTransport } from '../../protocol.ts';
import type { InspectorRealmDescriptor } from '../../../inspection/realm.ts';
import type { RuntimeDomainSession } from '../runtime/index.ts';
import type { RuntimeObjectPresentation } from '../runtime/object-table.ts';
import type { CordisDomBackend } from './model.ts';
import { type CdpRemoteObjectId } from '../../ids.ts';
/**
 * Connection-local NodeId, search, and RemoteObject mapping owner. Node payloads are depth-limited;
 * withheld levels are fetched through `DOM.requestChildNodes` or pushed with the ancestor chain
 * when a NodeId leaves through search or object lookup.
 */
export declare class CordisDomSession {
    private readonly transport;
    private readonly backend;
    private readonly runtime;
    private readonly nodeIdByBackend;
    private readonly backendByNodeId;
    private readonly childrenSent;
    private readonly backendByObjectId;
    private readonly objectIdsByGroup;
    private readonly searches;
    private readonly unsubscribe;
    private nextNodeId;
    private nextSearchId;
    private enabled;
    constructor(transport: CdpTransport, backend: CordisDomBackend, runtime: RuntimeDomainSession);
    /**
     * Handle one DOM command.
     * @param request - Parsed CDP request.
     * @returns Whether this adapter owns the method.
     */
    handle(request: CdpRequest): boolean;
    /**
     * Forget a Runtime object mapping before its owner releases the object.
     * @param objectId - Connection-local Runtime object id.
     */
    releaseObject(objectId: unknown): void;
    /**
     * Recognize a Runtime object from any realm as one current Cordis node.
     * @param objectId - Connection-local CDP object id.
     * @param realm - Realm that exposed the object.
     * @param reference - Realm-local semantic object identity.
     * @param group - Runtime object group retaining the id.
     * @returns Node presentation fields, when the object remains in the current tree.
     */
    bindObject(objectId: CdpRemoteObjectId, realm: InspectorRealmDescriptor, reference: InspectorObjectReference, group: string | undefined): RuntimeObjectPresentation | undefined;
    /**
     * Forget every DOM mapping retained under one Runtime object group.
     * @param group - Runtime object-group name.
     */
    releaseObjectGroup(group: unknown): void;
    /** Release connection-owned ids and subscriptions. */
    close(): void;
    private execute;
    private resolveNode;
    private bindObjectId;
    private selectNode;
    private fromNodeId;
    private serialize;
    /** Deliver the not-yet-sent ancestor levels of one node so its NodeId attaches to the frontend tree. */
    private pushNodePath;
    private forgetSubtree;
    private nodeId;
    private parentNodeId;
    private resetDocument;
    private updateDocument;
    private sendMutation;
    private pruneDocumentState;
    private releaseSourceObjects;
    private respond;
}
//# sourceMappingURL=session.d.ts.map