import ChatUser from './ChatUser.js';

export default class Chat {
    constructor() {
        this.users = new Map();
        this.activeNicknames = new Set();
        this.initHeartbeat();
    }
    
    initHeartbeat() {
        setInterval(() => {
            this.users.forEach((user, ws) => {
                if (!user.isAlive) {
                    this.removeUser(ws);
                    return;
                }
                user.ping();
            });
        }, 30000);
    }

    addUser(ws, nickname) {
        nickname = nickname.trim();

        if (!this.isValidNickname(nickname)) {
            return { success: false, message: 'Invalid nickname' };
        }

        if (this.activeNicknames.has(nickname)) {
            return { success: false, message: 'Nickname already taken' };
        }

        const user = new ChatUser(ws, nickname);
        this.users.set(ws, user);
        this.activeNicknames.add(nickname);
        this.broadcastUsers();
        
        return { success: true };
    }

    isValidNickname(nickname) {
        return nickname.length >= 2 && 
               nickname.length <= 20 && 
               /^[a-zA-Z0-9_-]+$/.test(nickname);
    }

    removeUser(ws) {
        const user = this.users.get(ws);

        if (user) {
            this.activeNicknames.delete(user.nickname);
            this.users.delete(ws);
            this.broadcastUsers();
        }
    }

    broadcast(message) {
        const data = JSON.stringify(message);
        this.users.forEach(user => {
            user.ws.send(data);
        });
    }

    broadcastUsers() {
        this.broadcast({
            type: 'users',
            users: Array.from(this.activeNicknames)
        });
    }

    sendMessage(from, text) {
        if (!text.trim() || text.length > 500) return;

        this.broadcast({
            type: 'message',
            from,
            text: this.sanitizeMessage(text),
            timestamp: new Date()
        });
    }

    sanitizeMessage(text) {
        return text.trim().slice(0, 500);
    }
};