import './css/style.css';
import Chat from './js/chat.js';

window.addEventListener('error', (event) => {
  console.error('Resource loading error:', event.error);
});

class ChatApp {
  constructor() {
    this.chat = null;
    this.boundCleanup = this.cleanup.bind(this);
    this.init();
  }

  async init() {
    try {
      if (this.chat) {
        console.warn('Чат уже инициализирован');
        return;
      }

      this.chat = new Chat();
      await this.chat.init();

      if (process.env.NODE_ENV === 'development') {
        window.chat = this.chat;
      }

      this.bindEvents();
    } catch (error) {
      console.error('Ошибка инициализации чата:', error);
      alert('Не удалось подключиться к чату. Попробуйте перезагрузить страницу.');
    }
  }

  bindEvents() {
    window.addEventListener('beforeunload', this.boundCleanup);
    window.addEventListener('unload', this.boundCleanup);
  }

  cleanup() {
    window.removeEventListener('beforeunload', this.boundCleanup);
    window.removeEventListener('unload', this.boundCleanup);

    if (this.chat) {
      this.chat.destroy();
      this.chat = null;
    }
    if (window.chat) {
      delete window.chat;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ChatApp();
});
