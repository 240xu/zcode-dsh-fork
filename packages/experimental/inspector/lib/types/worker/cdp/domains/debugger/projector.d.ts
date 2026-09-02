/** CDP projection for realm-neutral scripts and debugger events. */
import type { RuntimeDebuggerEvent, RuntimeScript } from '../../../../shared/cdp/index.ts';
import type { RuntimeBackendObjectHandle } from '../../../../shared/cdp/ids.ts';
import type { CdpNotification } from '../../protocol.ts';
import type { InspectorRealmSession } from '../../../inspection/realm.ts';
import type { RuntimeDomainSession } from '../runtime/index.ts';
/**
 * Project one common script descriptor to Debugger.scriptParsed.
 * @param realm - Realm session that owns the script.
 * @param script - Realm-neutral script descriptor.
 * @returns A CDP scriptParsed notification.
 */
export declare function scriptParsedEvent(realm: InspectorRealmSession, script: RuntimeScript): CdpNotification;
/**
 * Project one common debugger event and all nested Runtime objects to CDP.
 * @param realm - Realm session that emitted the event.
 * @param event - Realm-neutral debugger event.
 * @param runtime - Connection-local Runtime object projector.
 * @returns The corresponding CDP notification.
 */
export declare function debuggerEvent(realm: InspectorRealmSession, event: RuntimeDebuggerEvent<RuntimeBackendObjectHandle>, runtime: RuntimeDomainSession): CdpNotification;
//# sourceMappingURL=projector.d.ts.map