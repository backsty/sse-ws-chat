import { v4 as uuidv4 } from 'uuid';

export class Message {
  static TYPES = {
    MESSAGE: 'message',
    SYSTEM: 'system',
    STATUS: 'status'
  };

  static STATUSES = {
    SENT: 'sent',
    DELIVERED: 'delivered',
    READ: 'read',
    FAILED: 'failed'
  };

  static system(text) {
    return new Message('system', text, 'system');
  }

  static deserialize(data) {
    const message = new Message(data.from, data.text, data.type);
    Object.assign(message, data);
    return message;
  }

  constructor(from, text, type = Message.TYPES.MESSAGE) {
    if (!Object.values(Message.TYPES).includes(type)) {
      throw new Error('Неверный тип сообщения');
    }
    this.id = uuidv4();
    this.from = from;
    this.text = text;
    this.type = type;
    this.timestamp = Date.now();
    this.status = Message.STATUSES.SENT;
    this.isOffline = false;
  }

  setStatus(status) {
    if (!Object.values(Message.STATUSES).includes(status)) {
      throw new Error('Неверный статус сообщения');
    }
    this.status = status;
  }

  getFormattedTime() {
    const date = new Date(this.timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  toJSON() {
    return {
      id: this.id,
      from: this.from,
      text: this.text,
      type: this.type,
      timestamp: this.timestamp,
      status: this.status,
      isOffline: this.isOffline,
      formattedTime: this.getFormattedTime()
    };
  }

  serialize() {
    return this.toJSON();
  }
}