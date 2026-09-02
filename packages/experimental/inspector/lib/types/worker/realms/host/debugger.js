/** DebuggerBackend implementation over one native Node inspector session. */
import { isJsonValue } from "../../../shared/json.js";
import { optionalNativeField, requireNativeRecord } from "./values.js";
import { HostNotificationChannel } from "./bridge.js";
import { hostScriptKey } from "./scripts.js";
/** Native Host debugger adapted to common commands, Runtime values, and events. */
export class HostDebuggerBackend {
    target;
    runtime;
    events;
    constructor(target, runtime) {
        this.target = target;
        this.runtime = runtime;
        this.events = new HostNotificationChannel(target, message => message.method === 'Debugger.resumed'
            || message.method === 'Debugger.breakpointResolved'
            || message.method === 'Debugger.paused', async (message) => message.method === 'Debugger.resumed'
            ? { type: 'resumed' }
            : message.method === 'Debugger.breakpointResolved'
                ? breakpointResolved(message.params)
                : this.paused(message.params));
    }
    async enable(request) {
        return this.target.request('Debugger.enable', {
            ...optionalNativeField('maxScriptsCacheSize', request.maxScriptsCacheSize),
        });
    }
    async disable() {
        return this.target.request('Debugger.disable', {});
    }
    async pause() {
        return this.target.request('Debugger.pause', {});
    }
    async resume(request) {
        return this.target.request('Debugger.resume', {
            ...optionalNativeField('terminateOnResume', request.terminateOnResume),
        });
    }
    async evaluateOnCallFrame(request) {
        return this.runtime.completion(await this.target.request('Debugger.evaluateOnCallFrame', {
            callFrameId: request.callFrameId,
            expression: request.expression,
            ...optionalNativeField('objectGroup', request.objectGroup),
            ...optionalNativeField('includeCommandLineAPI', request.includeCommandLineAPI),
            ...optionalNativeField('silent', request.silent),
            ...optionalNativeField('returnByValue', request.returnByValue),
            ...optionalNativeField('generatePreview', request.generatePreview),
            ...optionalNativeField('throwOnSideEffect', request.throwOnSideEffect),
            ...optionalNativeField('timeout', request.timeoutMs),
        }));
    }
    subscribe(listener) {
        return this.events.subscribe(listener);
    }
    /** Release the native notification subscription. */
    close() {
        this.events.close();
    }
    async paused(params) {
        if (!Array.isArray(params?.callFrames) || typeof params.reason !== 'string')
            return undefined;
        const callFrames = await Promise.all(params.callFrames.map(async (frame) => this.callFrame(frame)));
        const data = params.data;
        const hitBreakpoints = params.hitBreakpoints;
        return {
            type: 'paused',
            callFrames,
            reason: params.reason,
            ...(data === undefined || !isJsonValue(data) ? {} : { data }),
            ...(isStringArray(hitBreakpoints)
                ? { hitBreakpoints: hitBreakpoints }
                : {}),
            ...(params.asyncStackTrace === undefined
                ? {}
                : { asyncStackTrace: this.runtime.stackTrace(params.asyncStackTrace) }),
        };
    }
    async callFrame(value) {
        const record = requireNativeRecord(value, 'Host Debugger call frame');
        if (typeof record.callFrameId !== 'string'
            || typeof record.functionName !== 'string'
            || typeof record.url !== 'string'
            || !Array.isArray(record.scopeChain)) {
            throw new Error('Host Debugger returned an invalid call frame');
        }
        return {
            callFrameId: record.callFrameId,
            functionName: record.functionName,
            ...(record.functionLocation === undefined ? {} : { functionLocation: location(record.functionLocation) }),
            location: location(record.location),
            url: record.url,
            scopeChain: await Promise.all(record.scopeChain.map(async (scope) => this.scope(scope))),
            thisObject: await this.runtime.remoteObject(record.this),
            ...(record.returnValue === undefined ? {} : { returnValue: await this.runtime.remoteObject(record.returnValue) }),
        };
    }
    async scope(value) {
        const record = requireNativeRecord(value, 'Host Debugger scope');
        if (typeof record.type !== 'string')
            throw new Error('Host Debugger returned an invalid scope');
        return {
            type: record.type,
            object: await this.runtime.remoteObject(record.object),
            ...(typeof record.name === 'string' ? { name: record.name } : {}),
            ...(record.startLocation === undefined ? {} : { startLocation: location(record.startLocation) }),
            ...(record.endLocation === undefined ? {} : { endLocation: location(record.endLocation) }),
        };
    }
}
function breakpointResolved(params) {
    if (typeof params?.breakpointId !== 'string' || params.location === undefined)
        return undefined;
    return {
        type: 'breakpoint-resolved',
        breakpointId: params.breakpointId,
        location: location(params.location),
    };
}
function location(value) {
    const record = requireNativeRecord(value, 'Host Debugger location');
    if (typeof record.scriptId !== 'string' || !Number.isSafeInteger(record.lineNumber)) {
        throw new Error('Host Debugger returned an invalid location');
    }
    if (record.columnNumber !== undefined && !Number.isSafeInteger(record.columnNumber)) {
        throw new Error('Host Debugger returned an invalid location column');
    }
    return {
        scriptKey: hostScriptKey(record.scriptId),
        lineNumber: record.lineNumber,
        ...(record.columnNumber === undefined ? {} : { columnNumber: record.columnNumber }),
    };
}
function isStringArray(value) {
    return Array.isArray(value) && value.every(item => typeof item === 'string');
}
//# sourceMappingURL=debugger.js.map