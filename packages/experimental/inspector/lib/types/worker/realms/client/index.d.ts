/** Client realm definition assembled from independent Runtime, Console, and Source backends. */
import type { ClientRuntimeRouter, ClientRuntimeTarget } from '../../bridge/runtime-rpc.ts';
import type { ClientSourceRouter } from '../../bridge/source-rpc.ts';
import type { InspectorRealm, InspectorRealmDescriptor, InspectorRealmSession } from '../../inspection/realm.ts';
/** Active Client realm exposed through the common Worker realm model. */
export declare class ClientInspectorRealm implements InspectorRealm {
    readonly descriptor: InspectorRealmDescriptor;
    readonly context: InspectorRealm['context'];
    readonly capabilities: InspectorRealm['capabilities'];
    private readonly scriptIds;
    private readonly bridge;
    constructor(target: ClientRuntimeTarget, runtimeRouter: ClientRuntimeRouter, sourceRouter: ClientSourceRouter);
    /** Active source generation represented by this realm. */
    get target(): ClientRuntimeTarget;
    /** Open one isolated set of Client backends for a DevTools connection. */
    openSession(): InspectorRealmSession;
}
//# sourceMappingURL=index.d.ts.map