import { formatTime } from '../utils/date.js';
import sendIcon from '../../assets/img/send.svg';

export class ChatWindow {
  constructor(onSendMessage) {
    this.onSendMessage = onSendMessage;
    this.currentChat = null;
    this.init();
  }

  init() {
    this.container = document.createElement('div');
    this.container.className = 'chat-window hidden';

    this.messagesList = document.createElement('div');
    this.messagesList.className = 'messages-list';

    this.inputContainer = document.createElement('div');
    this.inputContainer.className = 'input-container';

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.placeholder = 'Введите сообщение...';

    this.sendButton = document.createElement('button');
    this.sendButton.className = 'send-button';
    this.sendButton.innerHTML = `<img src="${sendIcon}" alt="Отправить">`;

    this.inputContainer.appendChild(this.input);
    this.inputContainer.appendChild(this.sendButton);
    this.container.appendChild(this.messagesList);
    this.container.appendChild(this.inputContainer);

    this.bindEvents();
  }

  bindEvents() {
    this.sendButton.addEventListener('click', () => this.handleSend());
    this.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleSend();
    });
  }

  handleSend() {
    const text = this.input.value.trim();
    if (text && this.onSendMessage) {
      this.onSendMessage(text);
      this.input.value = '';
    }
  }

  addMessage(message) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${message.from === this.currentChat?.currentUser?.id ? 'outgoing' : 'incoming'}`;
    
    messageEl.innerHTML = `
      <div class="message-content">
        <div class="message-text">${message.text}</div>
        <div class="message-time">${formatTime(message.timestamp)}</div>
        ${message.status ? `<div class="message-status">${message.status}</div>` : ''}
      </div>
    `;

    this.messagesList.appendChild(messageEl);
    this.scrollToBottom();
  }

  scrollToBottom() {
    this.messagesList.scrollTop = this.messagesList.scrollHeight;
  }

  show() {
    this.container.classList.remove('hidden');
  }

  hide() {
    this.container.classList.add('hidden');
  }
}