import { formatTime } from '../utils/date.js';

export class Message {
  static TYPES = {
    TEXT: 'message',
    SYSTEM: 'system',
    STATUS: 'status'
  };

  static STATUSES = {
    SENDING: 'sending',
    SENT: 'sent',
    DELIVERED: 'delivered',
    READ: 'read',
    ERROR: 'error'
  };

  constructor({ id, from, text, type = Message.TYPES.TEXT, timestamp, status = Message.STATUSES.SENDING }) {
    if (!text) {
      throw new Error('Текст сообщения обязателен');
    }
    
    this.id = id || crypto.randomUUID();
    this.from = from; // ID отправителя
    this.text = text;
    this.type = Object.values(Message.TYPES).includes(type) ? type : Message.TYPES.TEXT;
    this.timestamp = timestamp || Date.now();
    this.status = Object.values(Message.STATUSES).includes(status) ? status : Message.STATUSES.SENDING;
  }

  static fromJSON(data) {
    if (!data?.text) {
      throw new Error('Некорректные данные сообщения');
    }
    return new Message(data);
  }

  static system(text) {
    return new Message({
      id: crypto.randomUUID(),
      from: 'system',
      text,
      type: Message.TYPES.SYSTEM,
      status: Message.STATUSES.SENT
    });
  }

  getFormattedTime() {
    return formatTime(this.timestamp);
  }

  isSystem() {
    return this.type === Message.TYPES.SYSTEM;
  }

  isError() {
    return this.status === Message.STATUSES.ERROR;
  }

  toJSON() {
    return {
      id: this.id,
      from: this.from,
      text: this.text,
      type: this.type,
      timestamp: this.timestamp,
      status: this.status
    };
  }
}