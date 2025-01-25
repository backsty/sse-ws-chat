import './css/style.css';
import Chat from './js/chat.js';

class ChatApp {
    constructor() {
        this.chat = null;
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
        window.addEventListener('beforeunload', this.cleanup.bind(this));
        window.addEventListener('unload', this.cleanup.bind(this));
    }

    cleanup() {
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
