import { Message } from './Message.js';
import { formatDate } from '../utils/date.js';

export class Chat {
  constructor({ id, participants = [], messages = [], unreadCount = 0 }) {
    if (!id && (!participants || !Array.isArray(participants))) {
      throw new Error('Для создания чата необходим id или массив участников');
    }

    this.id = id || [participants].sort().join(':');
    this.participants = new Set(participants);
    this.messages = Array.isArray(messages)
      ? messages.map((m) => (m instanceof Message ? m : Message.fromJSON(m)))
      : [];
    this.unreadCount = unreadCount;
    this.lastActivity = this.getLastActivity();
  }

  static fromJSON(data) {
    if (!data) {
      throw new Error('Отсутствуют данные для создания чата');
    }

    return new Chat({
      id: data.id,
      participants: Array.isArray(data.participants) ? data.participants : [],
      messages: Array.isArray(data.messages) ? data.messages : [],
      unreadCount: data.unreadCount || 0,
    });
  }

  addMessage(message) {
    const msg = message instanceof Message ? message : Message.fromJSON(message);

    if (this.messages.some((m) => m.id === msg.id)) {
      console.log('⚠️ Сообщение уже существует в чате:', msg.id);
      return msg;
    }

    this.messages.push(msg);
    this.lastActivity = Date.now();
    return msg;
  }

  getFormattedLastActivity() {
    return formatDate(this.lastActivity);
  }

  getLastMessage() {
    return this.messages[this.messages.length - 1] || null;
  }

  getLastActivity() {
    const lastMessage = this.getLastMessage();
    return lastMessage ? lastMessage.timestamp : Date.now();
  }

  getFormattedLastActivity() {
    const date = new Date(this.lastActivity);
    const now = new Date();
    const diff = now - date;

    if (diff < 86400000) {
      // менее 24 часов
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString();
  }

  markAsRead(userId) {
    this.messages.forEach((msg) => {
      if (msg.from !== userId && msg.status !== Message.STATUSES.READ) {
        msg.status = Message.STATUSES.READ;
      }
    });
    this.unreadCount = 0;
  }

  incrementUnread() {
    this.unreadCount++;
  }

  hasParticipant(userId) {
    return this.participants.has(userId);
  }

  toJSON() {
    return {
      id: this.id,
      participants: Array.from(this.participants),
      messages: this.messages.map((m) => m.toJSON()),
      unreadCount: this.unreadCount,
      lastActivity: this.lastActivity,
    };
  }
}
