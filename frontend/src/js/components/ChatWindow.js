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
    this.currentChat = chat;
    this.currentUser = currentUser;
    this.messagesList.innerHTML = '';

    // Получаем другого участника чата
    const otherUserId = Array.from(chat.participants).find((id) => id !== currentUser.id);
    const otherUser = this.userList?.users.get(otherUserId);

    // Обновляем заголовок
    this.header.textContent = otherUser ? `Чат с ${otherUser.nickname}` : 'Чат';

    // Показываем чат и активируем поле ввода
    this.show();
    this.input.disabled = false;
    this.sendButton.disabled = false;
    this.input.focus();

    // Отображаем существующие сообщения
    chat.messages.forEach((msg) => this.addMessage(msg));
  }

  addMessage(messageData) {
    console.log('📝 Добавление сообщения:', messageData);

    const message =
      messageData instanceof Message
        ? messageData
        : new Message({
            id: messageData.id,
            from: messageData.from || this.currentUser.id, // Добавляем отправителя
            text: messageData.text,
            timestamp: messageData.timestamp || Date.now(),
            status: messageData.status,
          });

    const messageEl = document.createElement('div');
    const isOwn = message.from === this.currentUser?.id;
    messageEl.className = `message ${isOwn ? 'outgoing' : 'incoming'}`;

    messageEl.innerHTML = `
      <div class="message-content">
        <div class="message-text">${message.text}</div>
        <div class="message-time">${formatTime(message.timestamp)}</div>
      </div>
    `;

    this.messagesList.appendChild(messageEl);
    this.scrollToBottom();
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
