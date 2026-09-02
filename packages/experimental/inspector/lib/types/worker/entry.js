/** Node Worker bootstrap for the experimental Inspector. */
import { MessagePort, parentPort, workerData } from 'node:worker_threads';
import { parseInspectorHostControl, parseInspectorWorkerConfig } from "../shared/bridge/control-codec.js";
import { isPlainObject } from "../shared/json.js";
import { startInspectorWorker } from "./server.js";
if (parentPort === null)
    throw new Error('experimental inspector: Worker entry loaded on the main thread');
const controlPort = parentPort;
const bootData = workerData;
if (!isPlainObject(bootData)
    || !(bootData.hostSourcePort instanceof MessagePort)) {
    throw new Error('experimental inspector: invalid Worker boot data');
}
const boot = {
    hostSourcePort: bootData.hostSourcePort,
    config: parseInspectorWorkerConfig(bootData.config),
};
let runtime;
let stopping;
const stop = () => {
    stopping ??= (async () => {
        await runtime?.close();
        controlPort.postMessage({ type: 'stopped' });
        controlPort.close();
    })();
    return stopping;
};
controlPort.on('message', (message) => {
    try {
        parseInspectorHostControl(message);
        void stop();
    }
    catch (error) {
        controlPort.postMessage({
            type: 'failure',
            message: error instanceof Error ? error.message : String(error),
        });
    }
});
try {
    runtime = await startInspectorWorker(boot);
    controlPort.postMessage({ type: 'ready', ...runtime.endpoint });
}
catch (error) {
    controlPort.postMessage({
        type: 'failure',
        message: error instanceof Error ? error.message : String(error),
    });
    await stop();
}
//# sourceMappingURL=entry.js.map