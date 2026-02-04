import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet } from "../arcjet.js";

const sendJson = (socket, payload) => {

    if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
    }

    socket.send(JSON.stringify(payload));
};

const broadcastJson = (wss, payload) => {
    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) continue;

        client.send(JSON.stringify(payload));
    }
};

export const attachWebSocketServer = (server) => {
    const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 1024 * 1024 * 2 });

    wss.on('connection', async (socket, req) => {

        if (wsArcjet) {
            try {
                const decision = await wsArcjet.protect(req);
                if (decision.isDenied()) {
                    const code = decision.reason.isRateLimit() ? 1013 : 1008;
                    const reason = decision.reason.isRateLimit() ? 'Rate limit exceeded' : 'Access denied';
                    console.log("WS connection denied", decision.reason);
                    socket.close(code, reason);
                    return;
                }
            } catch (error) {
                console.log("WS connection error", error);
                socket.close(1011, 'Server Security Error');
                return;
            }
        }

        socket.isAlive = true;
        socket.on('pong', () => {
            socket.isAlive = true;
        });

        console.log('Client connected');
        sendJson(socket, { type: 'welcome' });

        socket.on('error', (error) => {
            console.error('WebSocket error:', error);
        });

        const interval = setInterval(() => {
            wss.clients.forEach((client) => {
                if (client.isAlive === false) {
                    return client.terminate();
                }
                client.isAlive = false;
                client.ping();
            });
        }, 30000);

        socket.on('close', () => {
            console.log('Client disconnected');
            clearInterval(interval);
        });
    });

    const broadcastMatchCreated = (match) => {
        broadcastJson(wss, { type: 'match_created', data: match });
    };

    return { broadcastMatchCreated };
};