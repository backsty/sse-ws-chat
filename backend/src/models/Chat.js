import { v4 as uuidv4 } from "uuid";
import { Message } from "./Message.js";

export class Chat {
  static SYNC_STATUSES = {
    SYNCED: "synced",
    PENDING: "pending",
    FAILED: "failed",
  };

  static deserialize(data) {
    const chat = new Chat(data.participants);
    Object.assign(chat, {
      ...data,
      messages: data.messages.map((m) => Message.deserialize(m)),
      participants: new Set(data.participants),
    });
    return chat;
  }

  constructor(users = []) {
    this.id = uuidv4();
    this.participants = new Set(users);
    this.messages = [];
    this.created = Date.now();
    this.lastActivity = Date.now();
    this.unreadCount = 0;
    this.type = "private"; // private | group
    this.syncStatus = Chat.SYNC_STATUSES.SYNCED;
    this.lastSyncTime = Date.now();
  }

  // Методы участников
  addParticipant(userId) {
    this.participants.add(userId);
    this.lastActivity = Date.now();
  }

  removeParticipant(userId) {
    this.participants.delete(userId);
    this.lastActivity = Date.now();
  }

  hasParticipant(userId) {
    return this.participants.has(userId);
  }

  getParticipantsCount() {
    return this.participants.size;
  }

  isPrivate() {
    return this.participants.size === 2;
  }

  cleanInactiveUsers() {
    const now = Date.now();
    this.users.forEach((user, userId) => {
      if (!user.isConnected() && now - user.lastActivity > 60000) {
        this.removeUser(userId);
      }
    });
  }

  // Методы сообщений
  addMessage(message) {
    if (!this.participants.has(message.from) && message.type !== "system") {
      throw new Error("Отправитель не является участником чата");
    }

    this.messages.push(message);
    this.lastActivity = Date.now();
    return message;
  }

  addOfflineMessage(message) {
    message.isOffline = true;
    return this.addMessage(message);
  }

  getHistory(limit = 50) {
    return this.messages.slice(-limit);
  }

  // Методы статусов
  markAsRead(userId) {
    this.messages.forEach((msg) => {
      if (msg.from !== userId && msg.status !== "read") {
        msg.status = "read";
      }
    });
    this.unreadCount = 0;
  }

  incrementUnreadCount() {
    this.unreadCount++;
  }

  setSyncStatus(status) {
    if (!Object.values(Chat.SYNC_STATUSES).includes(status)) {
      throw new Error("Неверный статус синхронизации");
    }
    this.syncStatus = status;
    this.lastSyncTime = Date.now();
  }

  // Методы коммуникации
  broadcast(message, exceptUserId = null) {
    this.participants.forEach((userId) => {
      if (userId !== exceptUserId) {
        // Этот метод должен быть реализован в UserManager
        this.userManager?.sendToUser(userId, message);
      }
    });
  }

  // Методы сериализации
  toJSON() {
    return {
      id: this.id,
      participants: Array.from(this.participants),
      messages: this.messages.map((m) => m.toJSON()),
      created: this.created,
      lastActivity: this.lastActivity,
      unreadCount: this.unreadCount,
      syncStatus: this.syncStatus,
      lastSyncTime: this.lastSyncTime,
    };
  }

  serialize() {
    return this.toJSON();
  }
}
