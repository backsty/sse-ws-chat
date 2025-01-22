export default class WebSocketClient {
  constructor() {
    this.url = process.env.NODE_ENV === 'production'
      ? 'wss://sse-ws-chat.onrender.com'
      : 'ws://localhost:7070';
    this.ws = null;
    this.handlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  async connect() {
    try {
      console.log(`Подключение к ${this.url}`);
      this.ws = new WebSocket(this.url);
      await this.waitForConnection();
      this.bindEvents();
      return true;
    } catch (error) {
      console.error('Ошибка подключения:', error);
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        await this.handleReconnect();
        return false;
      }
      throw new Error('Превышено количество попыток подключения');
    }
  }

  async handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const timeout = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      await new Promise((resolve) => setTimeout(resolve, timeout));
      return this.connect();
    }
  }

  waitForConnection() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Таймаут подключения'));
      }, 5000);

      this.ws.onopen = () => {
        clearTimeout(timeout);
        this.reconnectAttempts = 0;
        console.log('WebSocket соединение установлено');
        resolve();
      };

      this.ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });
  }

  bindEvents() {
    this.ws.onclose = () => {
      console.log('WebSocket соединение закрыто');
      this.handleReconnect();
    };

    this.ws.onmessage = this.handleMessage.bind(this);
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
