const WS_EVENTS = {
  OPEN: 'open',
  CLOSE: 'close',
  ERROR: 'error',
  MESSAGE: 'message'
};

const RECONNECT = {
  MAX_ATTEMPTS: 5,
  BASE_DELAY: 1000,
  MAX_DELAY: 30000
};

const MESSAGE_TYPES = {
  LOGIN: 'login',
  MESSAGE: 'message',
  USERS: 'users',
  ERROR: 'error'
};

const CLOSE_CODES = {
  NORMAL: 1000,
  GOING_AWAY: 1001,
  PROTOCOL_ERROR: 1002,
  INVALID_DATA: 1003
};

export default class WebSocketClient {
  constructor() {
    const backendUrl = process.env.NODE_ENV === 'production'
            ? 'wss://sse-ws-chat.onrender.com'
            : `ws://${window.location.hostname}:7070`;
    
    this.url = backendUrl;
    this.ws = null;
    this.handlers = new Map();
    this.reconnectAttempts = 0;
    this.connected = false;
    this.authorized = false;
  }

  getWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NODE_ENV === 'development' ? 
      'localhost:7070' : 
      'sse-ws-chat.onrender.com';
    return `${protocol}//${host}/ws`;
  }

  async connect() {
    if (this.ws) {
      this.close();
    }

    try {
        console.log(`Подключение к ${this.url}`);
        this.ws = new WebSocket(this.url);
        await this.waitForConnection();
        this.bindEvents();
        return true;
    } catch (error) {
        console.error('Ошибка подключения:', error);
        await this.handleReconnect();
        return false;
    }
  }

  async handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const timeout = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        await new Promise(resolve => setTimeout(resolve, timeout));
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

  async handleReconnect() {
    if (this.reconnectAttempts >= RECONNECT.MAX_ATTEMPTS) {
      throw new Error('Превышено количество попыток подключения');
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      RECONNECT.BASE_DELAY * Math.pow(2, this.reconnectAttempts),
      RECONNECT.MAX_DELAY
    );

    await new Promise(resolve => setTimeout(resolve, delay));
    return this.connect();
  }

  bindEvents() {
    this.ws.onclose = () => {
        console.log('WebSocket соединение закрыто');
        this.handleReconnect();
    };

    this.ws.onmessage = this.handleMessage.bind(this);
    this.ws.onclose = this.handleClose.bind(this);
    this.ws.onerror = this.handleError.bind(this);
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

  handleClose() {
    this.connected = false;
    this.handleReconnect().catch(console.error);
  }

  handleError(error) {
    console.error('WebSocket ошибка:', error);
    this.connected = false;
  }

  on(type, callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback должен быть функцией');
    }
    this.handlers.set(type, callback);
  }

  send(data) {
    if (!this.isConnected()) {
      console.error('Попытка отправки сообщения при неактивном соединении');
      return;
    }
    try {
      this.ws.send(JSON.stringify(data));
    } catch (error) {
      console.error('Ошибка отправки:', error);
      this.reconnect();
    }
  }

  login(nickname, sessionId) {
    if (!this.isConnected()) {
      throw new Error('WebSocket не подключен');
    }
    this.send({
      type: 'login',
      nickname,
      sessionId
    });
  }

  sendMessage(text) {
    this.send({
      type: 'message',
      text
    });
  }

  async reconnect() {
    this.close();
    await this.connect();
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN && this.connected;
  }

  close() {
    if (this.ws) {
      this.connected = false;
      this.ws.close();
      this.ws = null;
    }
  }
}