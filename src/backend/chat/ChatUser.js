import { WebSocket } from 'ws';

export default class ChatUser {
    constructor(ws, nickname) {
        this.ws = ws;
        this.nickname = this.sanitizeNickname(nickname);
        this.isAlive = true;
        this.lastActivity = Date.now();
    }

    send(message) {
        if (this.ws.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify(message));
            } catch (error) {
                console.error(`Ошибка отправки сообщения для ${this.nickname}:`, error);
            }
        }
    }

    sanitizeNickname(nickname) {
        return nickname.trim().slice(0, 20);
    }

    ping() {
        this.isAlive = false;
        this.ws.ping();
    }

    pong() {
        this.isAlive = true;
        this.lastActivity = Date.now();
    }
};
