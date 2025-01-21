import WebSocketClient from './websocket.js';
import { createMessageElement, createUserElement } from './templates.js';

export default class Chat {
  constructor() {
    this.client = null;
    this.nickname = localStorage.getItem('nickname');
    this.messagesList = document.getElementById('messages');
    this.usersList = document.getElementById('usersList');
    this.messageForm = document.getElementById('messageForm');
    this.messageInput = document.getElementById('messageInput');

    this.init();
  }

  async init() {
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
    return nickname.trim();
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
    this.client.on('login', this.handleLogin.bind(this));
    this.client.on('users', this.updateUserList.bind(this));
    this.client.on('message', this.addMessage.bind(this));
  }

  bindEvents() {
    this.messageForm.addEventListener('submit', this.handleSubmit.bind(this));
  }

  handleSubmit(event) {
    event.preventDefault();
    const text = this.messageInput.value.trim();
    if (text) {
      this.client.sendMessage(text);
      this.messageInput.value = '';
    }
  }

  handleLogin(message) {
    if (!message.success) {
      localStorage.removeItem('nickname');
      alert(message.message);
      this.init();
      return;
    }
    console.log('Успешная авторизация');
  }

  updateUserList(users) {
    this.usersList.innerHTML = users
      .map((user) => createUserElement(user, user === this.nickname))
      .join('');
  }

  addMessage({ from, text, timestamp }) {
    this.messagesList.insertAdjacentHTML(
      'beforeend',
      createMessageElement(from, text, timestamp, from === this.nickname),
    );
    this.messagesList.scrollTop = this.messagesList.scrollHeight;
  }
}
