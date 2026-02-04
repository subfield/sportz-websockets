import { WebSocket, WebSocketServer } from "ws";

const sendJson = (socket, payload) => {

    if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
    }

    socket.send(JSON.stringify(payload));
};

const broadcastJson = (wss, payload) => {
    for( const client of wss.clients ) {
        if(client.readyState !== WebSocket.OPEN) return;

        client.send(JSON.stringify(payload));
    }
};

export const attackWebSocketServer = (server) => {
    const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 1024 * 1024 * 2});

    wss.on('connection', (socket) => {
        console.log('Client connected');
        sendJson(socket, { type: 'welcome'});

        socket.on('error', (error) => {
            console.error('WebSocket error:', error);
        });

        // socket.on('message', (message) => {
        //     console.log('Received message:', message);
        //     broadcastJson(wss, { type: 'commentary', data: message });
        // });

        // socket.on('close', () => {
        //     console.log('Client disconnected');
        // });
    });

    const broadcastMatchCreated = (match) => {
        broadcastJson(wss, { type: 'match_created', data: match });
    };

    return { broadcastMatchCreated };
};