import WebSocketClient from './websocket.js';
import { createMessageElement, createUserElement } from './templates.js';

export default class Chat {
  constructor() {
    this.webSocket = null;
    this.nickname = null;
    this.sessionId = crypto.randomUUID();
    this.messagesList = document.getElementById('messages');
    this.usersList = document.getElementById('usersList');
    this.messageForm = document.getElementById('messageForm');
    this.messageInput = document.getElementById('messageInput');
    this.initialized = false;
    this.authorized = false;
  }

  async init() {
    if (this.initialized) return;
    
    try {
        if (!this.nickname) {
            const nickname = await this.promptNickname();
            if (!nickname) return;
            
            this.nickname = nickname;
            localStorage.setItem('nickname', nickname);
        }

        await this.initWebSocket(this.nickname);
        this.bindEvents();
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        localStorage.removeItem('nickname');
        setTimeout(() => this.init(), 3000);
    }
  }

  async promptNickname() {
    const nickname = prompt('Введите ваш никнейм:');
    if (!nickname?.trim()) {
        return null;
    }
  }

  validateNickname(nickname) {
    if (nickname.length < 2 || nickname.length > 20) {
      return { valid: false, message: 'Длина никнейма должна быть от 2 до 20 символов' };
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(nickname)) {
      return { valid: false, message: 'Используйте только буквы, цифры, дефис и подчеркивание' };
    }
    return { valid: true };
  }

  async initWebSocket(nickname) {
    this.client = new WebSocketClient();
    this.setupWebSocketHandlers();
    const connected = await this.client.connect();
    
    if (connected) {
      this.client.login(nickname);
    } else {
      throw new Error('Не удалось подключиться к серверу');
    }
  }

  setupWebSocketHandlers() {
    this.webSocket.on('login', this.handleLogin.bind(this));
    this.webSocket.on('users', this.updateUserList.bind(this));
    this.webSocket.on('message', this.addMessage.bind(this));
    this.webSocket.on('error', this.handleError.bind(this));
  }

  bindEvents() {
    this.messageForm.addEventListener('submit', this.handleSubmit.bind(this));
    window.addEventListener('beforeunload', () => {
      if (this.webSocket) {
        this.webSocket.close();
      }
    });
  }

  handleSubmit(event) {
    event.preventDefault();
    const text = this.messageInput.value.trim();
    
    if (!text) return;
    
    if (this.webSocket && this.webSocket.isConnected()) {
      this.webSocket.sendMessage(text);
      this.messageInput.value = '';
    } else {
      console.error('Чат не подключен');
      this.reconnect();
    }
  }

  async handleLogin(message) {
    if (!message.success) {
        localStorage.removeItem('nickname');
        alert(message.message);
        this.init();
        return;
    }
    
    this.authorized = true;
    console.log('Успешная авторизация');
  }

  handleError(error) {
    console.error('Ошибка чата:', error);
    alert(error.message || 'Произошла ошибка');
    if (error.type === 'auth') {
      this.reconnect();
    }
  }

  async reconnect() {
    this.initialized = false;
    if (this.webSocket) {
      this.webSocket.close();
      this.webSocket = null;
    }
    await this.initWebSocket();
    if (this.webSocket && this.webSocket.isConnected()) {
      this.webSocket.login(this.nickname, this.sessionId);
    }
  }

  updateUserList(users) {
    if (!Array.isArray(users)) return;

    this.usersList.innerHTML = users
      .map((user) => createUserElement(user, user === this.nickname))
      .join('');
  }

  addMessage({ from, text, timestamp }) {
    if (!from || !text || !timestamp) return;

    const messageHTML = createMessageElement(from, text, timestamp, from === this.nickname);
    this.messagesList.insertAdjacentHTML('beforeend', messageHTML);
    this.messagesList.scrollTop = this.messagesList.scrollHeight;
  }

  destroy() {
    if (this.webSocket) {
      this.webSocket.close();
      this.webSocket = null;
    }
    this.initialized = false;
    this.messagesList.innerHTML = '';
    this.usersList.innerHTML = '';
  }
}
