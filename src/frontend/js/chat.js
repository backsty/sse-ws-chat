import WebSocketClient from './websocket.js';
import { createMessageElement, createUserElement } from './templates.js';

export default class Chat {
    constructor() {
        this.client = null;
        this.nickname = null;
        this.messagesList = document.getElementById('messages');
        this.usersList = document.getElementById('usersList');
        this.messageForm = document.getElementById('messageForm');
        this.messageInput = document.getElementById('messageInput');
        
        this.init();
    }

    async init() {
        try {
            const nickname = await this.promptNickname();
            if (!nickname) return;

            await this.initWebSocket(nickname);
            this.bindEvents();
        } catch (error) {
            console.error('Ошибка инициализации чата:', error);
            setTimeout(() => this.init(), 3000);
        }
    }

    async promptNickname() {
        const nickname = prompt('Введите ваш никнейм:');
        if (!nickname?.trim()) return null;
        return nickname.trim();
    }

    async initWebSocket(nickname) {
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = location.hostname === 'localhost' ? 'localhost:7070' : location.host;
        
        this.client = new WebSocketClient(`${protocol}//${host}`);
        
        this.setupWebSocketHandlers();
        await this.client.connect();
        this.client.login(nickname);
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
            alert(message.message);
            this.init();
            return;
        }
        this.nickname = message.nickname;
    }

    updateUserList(users) {
        this.usersList.innerHTML = users
            .map(user => createUserElement(user, user === this.nickname))
            .join('');
    }

    addMessage({ from, text, timestamp }) {
        this.messagesList.insertAdjacentHTML(
            'beforeend',
            createMessageElement(from, text, timestamp, from === this.nickname)
        );
        this.messagesList.scrollTop = this.messagesList.scrollHeight;
    }
};