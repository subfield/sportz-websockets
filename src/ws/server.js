import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet } from "../arcjet.js";

const matchSubscribers = new Map();

const subscribeToMatch = (socket, matchId) => {
    if (!matchSubscribers.has(matchId)) {
        matchSubscribers.set(matchId, new Set());
    }
    matchSubscribers.get(matchId).add(socket);
};

const unsubscribeFromMatch = (socket, matchId) => {
    const subscribers = matchSubscribers.get(matchId);
    if(!subscribers) return;

    subscribers.delete(socket);

    if (subscribers.size === 0) {
        matchSubscribers.delete(matchId);
    }
};

const cleanUpSubscribers = (socket) => {
    for (const matchId of socket.subscriptions) {
        unsubscribeFromMatch(socket, matchId);
    }
};

const broadcastToMatch = (matchId, payload) => {
    const subscribers = matchSubscribers.get(matchId);
    if(!subscribers || subscribers.size === 0) return;

    const message = JSON.stringify(payload);

    for (const socket of subscribers) {
        if(socket.readyState === WebSocket.OPEN) {
            socket.send(message);
        };
    }
};

const handleMessage = (socket, data) => {
    let message;
    try {
        message = JSON.parse(data.toString());
    } catch (e) {
       sendJson(socket, { type: 'error', message: 'Invalid JSON' });
       return;
    }

    switch (message.type) {
        case 'subscribe':
            if(Number.isInteger(message.matchId)) {
                subscribeToMatch(socket, message.matchId);
                socket.subscriptions.add(message.matchId);
                sendJson(socket, { type: 'subscribed', matchId: message.matchId });
            } else {
                sendJson(socket, { type: 'error', message: 'Invalid match ID' });
            }
            break;
        case 'unsubscribe':
            if(Number.isInteger(message.matchId)) {
                unsubscribeFromMatch(socket, message.matchId);
                socket.subscriptions.delete(message.matchId);
                sendJson(socket, { type: 'unsubscribed', matchId: message.matchId });
            } else {
                sendJson(socket, { type: 'error', message: 'Invalid match ID' });
            }
            break;
        default:
            break;
    }
};

const sendJson = (socket, payload) => {

    if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
    }

    socket.send(JSON.stringify(payload));
};

const broadcastToAll = (wss, payload) => {
    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) continue;

        client.send(JSON.stringify(payload));
    }
};

export const attachWebSocketServer = (server) => {
    const wss = new WebSocketServer({ noServer: true, path: '/ws', maxPayload: 1024 * 1024 });

    server.on('upgrade', async (req, socket, head) => {
        const { pathname } = new URL(req.url, `http://${req.headers.host}`);

        if (pathname !== '/ws') {
            return;
        }

        if (wsArcjet) {
            try {
                const decision = await wsArcjet.protect(req);

                if (decision.isDenied()) {
                    if (decision.reason.isRateLimit()) {
                        socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
                    } else {
                        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
                    }
                    socket.destroy();
                    return;
                }
            } catch (e) {
                console.error('WS upgrade protection error', e);
                socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
                socket.destroy();
                return;
            }
        }

        wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, req);
        });
    });

    wss.on('connection', async (socket, req) => {
        socket.isAlive = true;
        socket.on('pong', () => {
            socket.isAlive = true;
        });

        console.log('Client connected');
        socket.subscriptions = new Set();
        sendJson(socket, { type: 'welcome' });

        socket.on('message', (data) => {
            handleMessage(socket, data);
        });

        socket.on('close', () => {
            cleanUpSubscribers(socket);
        });

        socket.on('error', () => {
            socket.terminate();
            console.error('WebSocket error');
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
        broadcastToAll(wss, { type: 'match_created', data: match });
    };

    const broadcastCommentary = (matchId, commentary) => {
        broadcastToMatch(matchId, { type: 'commentary', data: commentary });
    };

    return { broadcastMatchCreated, broadcastCommentary };
};