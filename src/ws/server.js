import { WebSocket, WebSocketServer } from "ws";

const sendJson = (socket, payload) => {

    if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
    }

    socket.send(JSON.stringify(payload));
};

const broadcastJson = (wss, payload) => {
    for( const client of wss.clients ) {
        if(client.readyState !== WebSocket.OPEN) continue;

        client.send(JSON.stringify(payload));
    }
};

export const attachWebSocketServer = (server) => {
    const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 1024 * 1024 * 2});

    wss.on('connection', (socket) => {
        socket.isAlive = true;
        socket.on('pong', () => {
            socket.isAlive = true;
        });

        console.log('Client connected');
        sendJson(socket, { type: 'welcome'});

        socket.on('error', (error) => {
            console.error('WebSocket error:', error);
        });

        const interval = setInterval(() => {
            wss.clients.forEach((client) => {
                if(client.isAlive === false) {
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