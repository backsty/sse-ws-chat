import { Message } from './Message.js';
import { formatDate } from '../utils/date.js';

export class Chat {
  constructor({ id, participants, messages = [], unreadCount = 0 }) {
    this.id = id || crypto.randomUUID();
    this.participants = new Set(participants);
    this.messages = messages.map((m) => Message.fromJSON(m));
    this.unreadCount = Math.max(0, unreadCount);
    this.lastActivity = this.getLastActivity();
  }

  static fromJSON(data) {
    if (!data?.participants?.length) {
      throw new Error('Чат должен иметь участников');
    }
    return new Chat(data);
  }

  addMessage(message) {
    const msg = message instanceof Message ? message : Message.fromJSON(message);
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
