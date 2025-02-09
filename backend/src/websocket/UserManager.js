import { User } from '../models/User.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('UserManager');

export class UserManager {
    constructor() {
      this.users = new Map();
    }

    addUser(socket, nickname) {
      const user = new User(socket, nickname);
      this.users.set(user.id, user);
      logger.info(`Пользователь добавлен: ${nickname}`);
      return user;
    }

    removeUser(userId) {
      const user = this.users.get(userId);
      if (user) {
        this.users.delete(userId);
        logger.info(`Пользователь удален: ${user.nickname}`);
      }
    }

    getUser(userId) {
      return this.users.get(userId);
    }

    getUserByNickname(nickname) {
      return Array.from(this.users.values()).find(user => user.nickname === nickname);
    }

    isNicknameExists(nickname) {
      return Boolean(this.getUserByNickname(nickname));
    }

    getAllUsers() {
      return Array.from(this.users.values());
    }

    broadcast(message, exceptUserId = null) {
      this.users.forEach(user => {
        if (user.id !== exceptUserId) {
          user.send(message);
        }
      });
    }
};