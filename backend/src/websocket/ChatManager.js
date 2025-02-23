import { Chat } from "../models/Chat.js";
import { Message } from "../models/Message.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("ChatManager");

export class ChatManager {
  constructor(userManager) {
    this.chats = new Map();
    this.userManager = userManager;
  }

  createChat(user1Id, user2Id) {
    // Сортируем ID для консистентности
    const chatId = [user1Id, user2Id].sort().join(":");

    // Проверяем существующий чат
    let chat = this.chats.get(chatId);
    if (chat) {
      logger.info(`Найден существующий чат: ${chatId}`);
      return chat;
    }

    // Создаем новый чат
    chat = new Chat([user1Id, user2Id]);
    chat.id = chatId; // Важно! Устанавливаем тот же ID
    this.chats.set(chatId, chat);

    logger.info(`Создан новый чат: ${chatId}`, {
      participants: [user1Id, user2Id],
    });

    return chat;
  }

  getChat(chatId) {
    const chat = this.chats.get(chatId);
    if (!chat) {
      logger.warn(`Чат не найден: ${chatId}`);
    }
    return chat;
  }

  getChat(chatId) {
    return this.chats.get(chatId);
  }

  getChatByUsers(user1Id, user2Id) {
    const chatId = [user1Id, user2Id].sort().join(":");
    return this.getChat(chatId);
  }

  getUserChats(userId) {
    return Array.from(this.chats.values()).filter((chat) =>
      chat.hasParticipant(userId),
    );
  }

  addMessage(chatId, fromId, text) {
    const chat = this.chats.get(chatId);
    if (!chat) {
      logger.warn("Attempt to send message to unavailable chat", { chatId });
      return null;
    }

    if (!chat.hasParticipant(fromId)) {
      logger.warn("User not in chat participants", { chatId, userId: fromId });
      return null;
    }

    const message = new Message(fromId, text);
    chat.addMessage(message);
    logger.info("New message in chat", { chatId, messageId: message.id });
    return message;
  }

  chatExists(chatId) {
    return this.chats.has(chatId);
  }

  removeChat(chatId) {
    this.chats.delete(chatId);
    logger.info(`Чат удален: ${chatId}`);
  }
}
