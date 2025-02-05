import WebSocketClient from './websocket.js';
import { createMessageElement, createUserElement } from './templates.js';
import { setCookie, getCookie, deleteCookie, hasCookie } from './utils/cookies.js';

const COOKIE_SETTINGS = {
  nickname: 'nickname',
  sessionId: 'sessionId',
};

export default class Chat {
  constructor() {
    this.webSocket = null;
    this.nickname = getCookie(COOKIE_SETTINGS.nickname);
    this.sessionId = getCookie(COOKIE_SETTINGS.sessionId) || crypto.randomUUID();
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
      if (!this.nickname || !this.validateNickname(this.nickname).valid) {
        this.nickname = await this.promptNickname();
        if (!this.nickname) return;

        setCookie('nickname', this.nickname);
        setCookie('sessionId', this.sessionId);
      }

      await this.initWebSocket();
      this.bindEvents();
      this.initialized = true;
    } catch (error) {
      console.error('Ошибка инициализации:', error);
      this.cleanup();
      alert('Ошибка подключения к чату. Попробуйте позже.');
    }
  }

  async promptNickname() {
    while (true) {
      const nickname = prompt('Введите никнейм (2-20 символов):');
      if (!nickname) return null;

      const isValid = this.validateNickname(nickname);
      if (isValid.valid) return nickname;

      alert(isValid.message);
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

  async initWebSocket() {
    try {
      this.webSocket = new WebSocketClient();
      await this.webSocket.connect();
      this.setupWebSocketHandlers();

      const loginResult = await this.webSocket.login(this.nickname, this.sessionId);
      if (!loginResult.success) {
        throw new Error(loginResult.message || 'Ошибка авторизации');
      }

      return true;
    } catch (error) {
      console.error('Ошибка подключения:', error);
      this.cleanup();
      throw error;
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
    try {
      if (!message.success) {
        console.error('Ошибка авторизации:', message.message);
        this.authorized = false;
        this.cleanup();
        await this.reconnect();
        return;
      }

      this.authorized = true;
      console.log('Успешная авторизация');
    } catch (error) {
      console.error('Ошибка обработки авторизации:', error);
      this.cleanup();
    }
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

  cleanup() {
    try {
      deleteCookie(COOKIE_SETTINGS.nickname);
      deleteCookie(COOKIE_SETTINGS.sessionId);
      this.nickname = null;
      this.sessionId = crypto.randomUUID();
      this.initialized = false;
      this.authorized = false;
    } catch (error) {
      console.error('Ошибка очистки состояния:', error);
    }
  }

  destroy() {
    if (this.webSocket) {
      this.webSocket.close();
      this.webSocket = null;
    }
    this.cleanup();
    this.initialized = false;
    this.authorized = false;
    this.messagesList.innerHTML = '';
    this.usersList.innerHTML = '';
  }
}
