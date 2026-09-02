/** Worker-owned HTTP discovery, DevTools CDP, and Client-ingest endpoints. */
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { CdpSession } from "../cdp/session.js";
/** Worker-owned network endpoint. */
export class InspectorEndpoint {
    config;
    sources;
    network;
    realms;
    cordisDom;
    cordisTrees;
    queries;
    server;
    cdpServer;
    ingestServer;
    cdpSessions = new Map();
    ingestConnections = new Map();
    constructor(config, sources, network, realms, cordisDom, cordisTrees, queries) {
        this.config = config;
        this.sources = sources;
        this.network = network;
        this.realms = realms;
        this.cordisDom = cordisDom;
        this.cordisTrees = cordisTrees;
        this.queries = queries;
        this.cdpServer = new WebSocketServer({ noServer: true, maxPayload: config.maxSourceFrameBytes });
        this.ingestServer = new WebSocketServer({ noServer: true, maxPayload: config.maxSourceFrameBytes });
    }
    /**
     * Bind the loopback endpoint.
     * @returns The actual bound address and target id.
     */
    async start() {
        let candidate = this.config.startPort;
        while (true) {
            const server = this.createServer();
            this.server = server;
            try {
                const address = await listen(server, candidate, this.config.host);
                server.on('error', () => {
                    // An established server error is connection-local or reported by
                    // the operating system; active sockets retain their own handlers.
                });
                return { host: this.config.host, port: address.port, targetId: this.config.targetId };
            }
            catch (error) {
                this.server = undefined;
                if (!isAddressInUse(error) || candidate === 0)
                    throw error;
                if (candidate === 65_535) {
                    throw new Error(`inspector: no available port from ${String(this.config.startPort)} through 65535`, {
                        cause: error,
                    });
                }
                candidate += 1;
            }
        }
    }
    /** Stop admission, dispose CDP sessions, terminate sockets, and await server close. */
    async close() {
        const server = this.requireServer();
        for (const [socket, session] of this.cdpSessions) {
            session.close();
            socket.terminate();
        }
        this.cdpSessions.clear();
        for (const [socket, connection] of this.ingestConnections) {
            this.sources.disconnect(connection, 'Client ingest endpoint stopped');
            socket.terminate();
        }
        this.ingestConnections.clear();
        await Promise.all([
            closeWebSocketServer(this.cdpServer),
            closeWebSocketServer(this.ingestServer),
            new Promise((resolve) => {
                server.close(() => { resolve(); });
                server.closeAllConnections();
            }),
        ]);
    }
    handleHttp(request, response) {
        const pathname = new URL(request.url ?? '/', 'http://inspector.invalid').pathname;
        if (pathname === '/json' || pathname === '/json/list') {
            this.json(response, [this.target()]);
            return;
        }
        if (pathname === '/json/version') {
            this.json(response, {
                Browser: 'dsh-experimental-inspector/0',
                'Protocol-Version': '1.3',
                webSocketDebuggerUrl: this.cdpUrl(),
            });
            return;
        }
        response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        response.end('not found');
    }
    handleUpgrade(request, socket, head) {
        let pathname;
        try {
            pathname = new URL(request.url ?? '/', 'http://inspector.invalid').pathname;
        }
        catch {
            socket.destroy();
            return;
        }
        if (pathname === `/devtools/page/${this.config.targetId}`) {
            this.cdpServer.handleUpgrade(request, socket, head, (ws) => { this.acceptCdp(ws); });
            return;
        }
        if (pathname === '/ingest') {
            if (!this.authorizedClient(request)) {
                socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
                return;
            }
            this.ingestServer.handleUpgrade(request, socket, head, (ws) => { this.acceptIngest(ws); });
            return;
        }
        socket.destroy();
    }
    acceptCdp(socket) {
        const transport = {
            send: (payload) => {
                if (socket.readyState === socket.OPEN)
                    socket.send(JSON.stringify(payload));
            },
            close: () => { socket.close(1008, 'invalid CDP request'); },
        };
        const session = new CdpSession(transport, { targetId: this.config.targetId, title: 'DeepSeek Harness Host' }, this.sources, this.network, this.realms, this.cordisDom, this.cordisTrees);
        this.cdpSessions.set(socket, session);
        socket.on('message', (data) => {
            try {
                session.receive(JSON.parse(rawText(data)));
            }
            catch {
                socket.close(1008, 'CDP frame must be JSON');
            }
        });
        socket.once('close', () => {
            this.cdpSessions.delete(socket);
            session.close();
        });
        socket.on('error', () => {
            // The close event performs connection-owned cleanup.
        });
    }
    acceptIngest(socket) {
        const queryPeer = this.queries.open({
            send: (frame) => {
                if (socket.readyState === socket.OPEN)
                    socket.send(JSON.stringify(frame));
            },
            close: (code, reason) => { socket.close(code, reason); },
        });
        const connection = {
            kind: 'client',
            send: (frame) => {
                if (socket.readyState !== socket.OPEN)
                    return;
                socket.send(JSON.stringify(frame));
                if (frame.t === 'source/accepted')
                    queryPeer.accept(frame.sourceId, frame.generation);
            },
            close: (code, reason) => { socket.close(code, reason.slice(0, 123)); },
        };
        this.ingestConnections.set(socket, connection);
        socket.on('message', (data) => {
            try {
                const value = JSON.parse(rawText(data));
                if (!queryPeer.receive(value))
                    this.sources.receive(connection, value);
            }
            catch {
                connection.close(1008, 'source frame must be JSON');
            }
        });
        socket.once('close', () => {
            this.ingestConnections.delete(socket);
            queryPeer.close();
            this.sources.disconnect(connection, 'Client source disconnected');
        });
        socket.on('error', () => {
            // The close event performs connection-owned cleanup.
        });
    }
    authorizedClient(request) {
        const protocols = (request.headers['sec-websocket-protocol'] ?? '')
            .split(',')
            .map(value => value.trim());
        if (!protocols.includes(this.config.clientToken))
            return false;
        const origin = request.headers.origin;
        if (origin === undefined)
            return true;
        if (this.config.clientOrigins.includes(origin))
            return true;
        try {
            const hostname = new URL(origin).hostname;
            return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';
        }
        catch {
            return false;
        }
    }
    target() {
        return {
            id: this.config.targetId,
            type: 'page',
            title: 'DeepSeek Harness Host',
            description: 'Experimental cross-realm Inspector target',
            url: 'dsh://host',
            webSocketDebuggerUrl: this.cdpUrl(),
            devtoolsFrontendUrl: `devtools://devtools/bundled/devtools_app.html?ws=${this.config.host}:${this.boundPort()}/devtools/page/${this.config.targetId}&panel=elements&noJavaScriptCompletion=true`,
        };
    }
    cdpUrl() {
        return `ws://${this.config.host}:${String(this.boundPort())}/devtools/page/${this.config.targetId}`;
    }
    boundPort() {
        const address = this.requireServer().address();
        if (address === null || typeof address === 'string') {
            throw new Error('inspector: endpoint is not bound to a TCP port');
        }
        return address.port;
    }
    createServer() {
        const server = createServer((request, response) => { this.handleHttp(request, response); });
        server.on('upgrade', (request, socket, head) => { this.handleUpgrade(request, socket, head); });
        return server;
    }
    requireServer() {
        if (this.server === undefined)
            throw new Error('inspector: endpoint is not started');
        return this.server;
    }
    json(response, value) {
        response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify(value));
    }
}
function listen(server, port, host) {
    return new Promise((resolve, reject) => {
        const finish = () => {
            server.off('error', onError);
            server.off('listening', onListening);
        };
        const onError = (error) => {
            finish();
            reject(error);
        };
        const onListening = () => {
            finish();
            const address = server.address();
            if (address === null || typeof address === 'string') {
                reject(new Error('inspector: endpoint did not bind a TCP port'));
                return;
            }
            resolve(address);
        };
        server.once('error', onError);
        server.once('listening', onListening);
        server.listen(port, host);
    });
}
function isAddressInUse(error) {
    return error instanceof Error && error.code === 'EADDRINUSE';
}
function rawText(data) {
    const bytes = data instanceof ArrayBuffer
        ? Buffer.from(new Uint8Array(data))
        : Array.isArray(data) ? Buffer.concat(data) : data;
    return bytes.toString('utf8');
}
function closeWebSocketServer(server) {
    return new Promise((resolve) => {
        server.close(() => { resolve(); });
    });
}
//# sourceMappingURL=endpoint.js.map