import ChatUser from './ChatUser.js';

const MAX_MESSAGE_LENGTH = 500;
const HEARTBEAT_INTERVAL = 30000;
const NICKNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

export default class Chat {
  constructor() {
    this.users = new Map();
    this.activeNicknames = new Set();
    this.initHeartbeat();
  }

  initHeartbeat() {
    setInterval(() => {
      this.users.forEach((user, ws) => {
        if (!user.isAlive || user.isInactive()) {
          this.removeUser(ws);
          return;
        }
        user.ping();
      });
    }, HEARTBEAT_INTERVAL);
  }

  addUser(ws, nickname, sessionId) {
    try {
      const validationResult = this.validateNewUser(nickname);
      if (!validationResult.success) {
        return validationResult;
      }

      const existingUser = this.handleExistingUser(nickname, sessionId);
      if (existingUser && !existingUser.success) {
        return existingUser;
      }

      return this.createNewUser(ws, nickname, sessionId);
    } catch (error) {
      console.error('Ошибка при добавлении пользователя:', error);
      return { success: false, error: 'Внутренняя ошибка сервера' };
    }
  }

  validateNewUser(nickname) {
    nickname = this.sanitizeNickname(nickname);
    if (!this.isValidNickname(nickname)) {
      return { success: false, error: 'Некорректный никнейм' };
    }
    return { success: true, nickname };
  }

  handleExistingUser(nickname, sessionId) {
    const existingUser = Array.from(this.users.values()).find((user) => user.nickname === nickname);

    if (existingUser) {
      if (existingUser.sessionId === sessionId) {
        existingUser.disconnect();
        this.removeUser(existingUser.ws);
      } else {
        return { success: false, error: 'Никнейм уже занят' };
      }
    }
  }

  createNewUser(ws, nickname, sessionId) {
    const user = new ChatUser(ws, nickname);
    user.sessionId = sessionId;
    this.users.set(ws, user);
    this.activeNicknames.add(nickname);

    this.sendWelcomeMessage(user);
    this.broadcastUsers();

    return { success: true, user };
  }

  removeUser(ws) {
    const user = this.users.get(ws);
    if (!user) return;

    user.disconnect();
    this.activeNicknames.delete(user.nickname);
    this.users.delete(ws);
    this.broadcastUsers();
    this.broadcastSystemMessage(`${user.nickname} покинул чат`);
  }

  sendWelcomeMessage(user) {
    user.send({
      type: 'message',
      from: 'system',
      text: `Добро пожаловать в чат, ${user.nickname}!`,
      timestamp: new Date(),
    });
  }

  broadcast(message) {
    const data = JSON.stringify(message);
    this.users.forEach((user) => {
      if (user.isConnected()) {
        user.send(data);
      }
    });
  }

  broadcastUsers() {
    this.broadcast({
      type: 'users',
      users: Array.from(this.activeNicknames),
    });
  }

  broadcastSystemMessage(text) {
    this.broadcast({
      type: 'message',
      from: 'system',
      text,
      timestamp: new Date(),
    });
  }

  sendMessage(from, text) {
    if (!this.isValidMessage(text)) return;

    this.broadcast({
      type: 'message',
      from,
      text: this.sanitizeMessage(text),
      timestamp: new Date(),
    });
  }

  isValidNickname(nickname) {
    return nickname.length >= 2 && nickname.length <= 20 && NICKNAME_REGEX.test(nickname);
  }

  isValidMessage(text) {
    return text.trim().length > 0 && text.length <= MAX_MESSAGE_LENGTH;
  }

  sanitizeMessage(text) {
    return text.trim().slice(0, MAX_MESSAGE_LENGTH);
  }

  sanitizeNickname(nickname) {
    return nickname.trim();
  }
}
