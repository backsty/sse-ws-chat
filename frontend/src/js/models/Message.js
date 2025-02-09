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
    this.id = id;
    this.from = from;
    this.text = text;
    this.type = type;
    this.timestamp = timestamp || Date.now();
    this.status = status;
  }

  static fromJSON(data) {
    return new Message(data);
  }

  static system(text) {
    return new Message({
      id: Date.now().toString(),
      from: 'system',
      text,
      type: Message.TYPES.SYSTEM
    });
  }

  getFormattedTime() {
    const date = new Date(this.timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getFormattedDate() {
    const date = new Date(this.timestamp);
    return date.toLocaleDateString();
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