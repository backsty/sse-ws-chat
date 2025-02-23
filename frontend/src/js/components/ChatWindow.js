import sendIcon from '../../assets/img/send.svg';
import { formatTime } from '../utils/date.js';
import { Message } from '../models/Message.js';

export class ChatWindow {
  constructor(onSendMessage) {
    this.onSendMessage = onSendMessage;
    this.currentChat = null;
    this.currentUser = null;
    this.userList = null;
    this.element = this.createElements();
    this.messages = new Map();
  }

  createElements() {
    const container = document.createElement('div');
    container.className = 'chat-window hidden';

    container.innerHTML = `
      <div class="chat-header">
        <h2>Выберите пользователя для начала чата</h2>
        <button class="logout-button">Выйти</button>
      </div>
      <div class="messages-list"></div>
      <div class="input-container">
        <input type="text" class="chat-input" placeholder="Введите сообщение...">
        <button class="send-button">
          <img src="${sendIcon}" alt="Отправить">
        </button>
      </div>
    `;

    const logoutButton = container.querySelector('.logout-button');
    logoutButton.addEventListener('click', () => {
      if (typeof this.onLogout === 'function') {
        this.onLogout();
      }
    });

    this.messagesList = container.querySelector('.messages-list');
    this.input = container.querySelector('.chat-input');
    this.sendButton = container.querySelector('.send-button');
    this.header = container.querySelector('.chat-header h2');

    this.sendButton.addEventListener('click', () => this.handleSend());
    this.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleSend();
    });

    return container;
  }

  handleSend() {
    const text = this.input.value.trim();
    if (text && this.onSendMessage) {
      this.onSendMessage(text);
      this.input.value = '';
    }
  }

  setUserList(userList) {
    this.userList = userList;
  }

  setCurrentChat(chat, currentUser) {
    if (!chat || !currentUser) {
      console.warn('⚠️ Некорректные параметры для установки чата');
      return;
    }

    this.currentChat = chat;
    this.currentUser = currentUser;

    // Очищаем список сообщений
    this.messagesList.innerHTML = '';
    this.messages.clear();

    // Обновляем заголовок
    const participants = Array.from(chat.participants);
    const otherUser = this.userList?.users.get(participants.find((id) => id !== currentUser.id));

    const header = this.element.querySelector('.chat-header h2');
    if (header) {
      header.textContent = otherUser ? otherUser.nickname : 'Чат';
    }

    // Добавляем существующие сообщения
    if (Array.isArray(chat.messages)) {
      chat.messages.forEach((msg) => this.addMessage(msg));
    }

    this.scrollToBottom();
  }

  addMessage(messageData) {
    const message = messageData instanceof Message ? messageData : new Message(messageData);

    if (this.messages.has(message.id)) {
      console.log('⚠️ Сообщение уже отображается:', message.id);
      return;
    }

    this.messages.set(message.id, message);

    const messageEl = document.createElement('div');
    messageEl.id = `message-${message.id}`;
    const isOwn = message.from === this.currentUser?.id;
    messageEl.className = `message ${isOwn ? 'outgoing' : 'incoming'}`;

    messageEl.innerHTML = `
    <div class="message-content">
      <div class="message-text">${message.text}</div>
      <div class="message-info">
        <span class="message-time">${formatTime(message.timestamp)}</span>
      </div>
    </div>
    `;

    this.messagesList.appendChild(messageEl);
    this.scrollToBottom();
  }

  updateMessage(message) {
    const messageEl = document.getElementById(`message-${message.id}`);
    if (messageEl) {
      const statusEl = messageEl.querySelector('.message-status');
      if (statusEl) {
        statusEl.textContent = message.status;

        // Добавляем визуальное отображение статуса
        messageEl.className = `message outgoing ${message.status.toLowerCase()}`;
      }
    }
  }

  scrollToBottom() {
    this.messagesList.scrollTop = this.messagesList.scrollHeight;
  }

  show() {
    this.element.classList.remove('hidden');
  }

  hide() {
    this.element.classList.add('hidden');
  }
}
