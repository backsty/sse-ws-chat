import { WebSocket } from 'ws';

const MAX_NICKNAME_LENGTH = 20;
const INACTIVE_TIMEOUT = 35000;

export default class ChatUser {
  constructor(ws, nickname) {
    this.ws = ws;
    this.nickname = this.sanitizeNickname(nickname);
    this.sessionId = null;
    this.isAlive = true;
    this.lastActivity = Date.now();
    this.connected = true;
  }

  disconnect() {
    if (!this.connected) return;

    this.connected = false;
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }

  isConnected() {
    return this.connected && this.ws.readyState === WebSocket.OPEN && !this.isInactive();
  }

  isInactive() {
    return Date.now() - this.lastActivity > INACTIVE_TIMEOUT;
  }

  updateActivity() {
    this.lastActivity = Date.now();
  }

  send(message) {
    if (!this.isConnected()) return;

    try {
      const data = this.prepareMessage(message);
      this.ws.send(data);
      this.updateActivity();
    } catch (error) {
      console.error(`Ошибка отправки сообщения для ${this.nickname}:`, error);
      this.disconnect();
    }
  }

  prepareMessage(message) {
    return typeof message === 'string' ? message : JSON.stringify(message);
  }

  ping() {
    this.isAlive = false;
    this.ws.ping();
  }

  pong() {
    this.isAlive = true;
    this.updateActivity();
  }

  sanitizeNickname(nickname) {
    return nickname.trim().slice(0, MAX_NICKNAME_LENGTH);
  }
}
