import { Chat } from '../models/Chat.js';
import { Message } from '../models/Message.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ChatManager');

export class ChatManager {
  constructor(userManager) {
    this.chats = new Map();
    this.userManager = userManager;
  }

  createChat(user1Id, user2Id) {
    const chatId = [user1Id, user2Id].sort().join(':');
    
    if (this.chats.has(chatId)) {
      return this.chats.get(chatId);
    }

    const chat = new Chat([user1Id, user2Id]);
    chat.userManager = this.userManager;
    this.chats.set(chatId, chat);
    logger.info(`Создан новый чат: ${chatId}`);
    return chat;
  }

  getChat(chatId) {
    return this.chats.get(chatId);
  }

  getChatByUsers(user1Id, user2Id) {
    const chatId = [user1Id, user2Id].sort().join(':');
    return this.getChat(chatId);
  }

  getUserChats(userId) {
    return Array.from(this.chats.values())
        .filter(chat => chat.hasParticipant(userId));
  }

  addMessage(chatId, fromId, text) {
    const chat = this.chats.get(chatId);
    if (!chat) {
      throw new Error('Чат не найден');
    }

    const message = new Message(fromId, text);
    chat.addMessage(message);

    // Отправляем сообщение всем участникам чата
    chat.participants.forEach(userId => {
      if (userId !== fromId) {
        const user = this.userManager.getUser(userId);
        user?.send({
          type: 'message',
          chatId,
          message: message.toJSON()
        });
      }
    });

    logger.info(`Новое сообщение в чате ${chatId}`);
    return message;
  }

  removeChat(chatId) {
    this.chats.delete(chatId);
    logger.info(`Чат удален: ${chatId}`);
  }
};