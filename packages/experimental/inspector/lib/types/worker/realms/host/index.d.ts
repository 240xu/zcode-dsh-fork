/** Host realm adapter backed by a connection-local Node inspector session. */
import type { InspectorRealm, InspectorRealmDescriptor, InspectorRealmSession } from '../../inspection/realm.ts';
/** Host realm definition that opens one native V8 session per DevTools connection. */
export declare class HostInspectorRealm implements InspectorRealm {
    private readonly label;
    readonly descriptor: InspectorRealmDescriptor;
    readonly context: InspectorRealm['context'];
    readonly capabilities: InspectorRealm['capabilities'];
    constructor(label: string);
    /** Open a native Host inspector session for one DevTools connection. */
    openSession(): InspectorRealmSession;
}
//# sourceMappingURL=index.d.ts.map