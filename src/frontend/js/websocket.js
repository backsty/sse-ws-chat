export default class WebSocketClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.handlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        this.bindEvents(resolve, reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  bindEvents(resolve, reject) {
    this.ws.onopen = () => {
      console.log('WebSocket соединение установлено');
      this.reconnectAttempts = 0;
      resolve();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket ошибка:', error);
      reject(error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket соединение закрыто');
      this.reconnect();
    };

    this.ws.onmessage = this.handleMessage.bind(this);
  }

  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      const handler = this.handlers.get(message.type);
      if (handler) handler(message);
    } catch (error) {
      console.error('Ошибка обработки сообщения:', error);
    }
  }

  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const timeout = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      setTimeout(() => this.connect(), timeout);
    }
  }

  on(type, callback) {
    this.handlers.set(type, callback);
  }

  send(message) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  login(nickname) {
    this.send({ type: 'login', nickname });
  }

  sendMessage(text) {
    this.send({ type: 'message', text });
  }

  close() {
    this.ws?.close();
  }
}
