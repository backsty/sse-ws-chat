const SETTINGS = {
  TIMEOUT: 10000,
  RECONNECT: {
    MAX_ATTEMPTS: 5,
    BASE_DELAY: 1000,
    MAX_DELAY: 30000
  },
  CLOSE_CODES: {
    NORMAL: 1000,
    GOING_AWAY: 1001
  }
};

export default class WebSocketClient {
  constructor() {
    this.ws = null;
    this.handlers = new Map();
    this.reconnectAttempts = 0;
    this.connected = false;
    this.connecting = false;
    this.permanentlyClosed = false;
  }

  // getWebSocketUrl() {
  //   const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  //   const host =
  //     process.env.NODE_ENV === 'development' ? 'localhost:7070' : 'sse-ws-chat.onrender.com';
  //   return `${protocol}//${host}/ws`;
  // }

  getWebSocketUrl() {
    return 'ws://localhost:7070/ws';
  }

  async connect() {
    if (this.connecting || this.isConnected() || this.permanentlyClosed) return;

    this.connecting = true;

    try {
      if (this.ws) {
        this.close();
      }

      this.ws = new WebSocket(this.getWebSocketUrl());
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.close();
          reject(new Error('Таймаут подключения'));
        }, SETTINGS.TIMEOUT);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.connected = true;
          this.connecting = false;
          this.reconnectAttempts = 0;
          this.bindEvents();
          resolve();
        };

        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          this.connected = false;
          this.connecting = false;
          console.error('WebSocket connection error:', error);
          reject(new Error('Ошибка подключения к серверу'));
        };
      });
    } catch (error) {
      this.connecting = false;
      throw error;
    }
  }

  waitForConnection() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.close();
        reject(new Error('Таймаут подключения'));
      }, 5000);

      this.ws.onopen = () => {
        clearTimeout(timeout);
        this.connected = true;
        this.bindEvents();
        resolve();
      };

      this.ws.onerror = (error) => {
        clearTimeout(timeout);
        this.connected = false;
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
      RECONNECT.MAX_DELAY,
    );

    await new Promise((resolve) => setTimeout(resolve, delay));
    return this.connect();
  }

  bindEvents() {
    if (!this.ws) return;
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

  handleClose(event) {
    this.connected = false;
    this.connecting = false;

    if (event.code === SETTINGS.CLOSE_CODES.NORMAL || 
        event.code === SETTINGS.CLOSE_CODES.GOING_AWAY) {
      console.log('WebSocket закрыт корректно');
      return;
    }

    if (!this.permanentlyClosed) {
      console.log(`WebSocket закрыт с кодом: ${event.code}`);
      this.reconnect();
    }
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
      // this.reconnect();
    }
  }

  login(nickname, sessionId) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('WebSocket не подключен'));
        return;
      }

      const loginHandler = (response) => {
        if (response.type === 'login') {
          this.handlers.delete('login');
          resolve(response);
        }
      };

      this.handlers.set('login', loginHandler);

      this.send({
        type: 'login',
        nickname,
        sessionId,
      });
    });
  }

  sendMessage(text) {
    this.send({
      type: 'message',
      text,
    });
  }

  async reconnect() {
    if (this.reconnectAttempts >= SETTINGS.RECONNECT.MAX_ATTEMPTS) {
      console.log('Достигнут лимит попыток переподключения');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      SETTINGS.RECONNECT.BASE_DELAY * Math.pow(2, this.reconnectAttempts),
      SETTINGS.RECONNECT.MAX_DELAY
    );

    await new Promise(resolve => setTimeout(resolve, delay));
    await this.connect();
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN && this.connected;
  }

  close() {
    if (this.ws) {
      this.connected = false;
      this.connecting = false;
      this.permanentlyClosed = true;

      try {
        this.ws.close(SETTINGS.CLOSE_CODES.NORMAL);
      } catch (error) {
        console.error('Ошибка закрытия WebSocket:', error);
      }
      this.ws = null;
    }
  }
}
