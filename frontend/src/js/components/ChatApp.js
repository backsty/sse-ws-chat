import { WebSocketClient } from '../services/WebSocketClient.js';
import { ChatService } from '../services/ChatService.js';
import { LoginModal } from './LoginModal.js';
import { UserList } from './UserList.js';
import { ChatWindow } from './ChatWindow.js';

export class ChatApp {
  constructor() {
    this.wsClient = new WebSocketClient(process.env.WS_URL);
    this.chatService = new ChatService(this.wsClient);
    this.init();
  }

  init() {
    this.container = document.createElement('div');
    this.container.className = 'chat-app';
    document.body.appendChild(this.container);

    this.loginModal = new LoginModal(this.handleLogin.bind(this));
    this.userList = new UserList(this.handleUserSelect.bind(this));
    this.chatWindow = new ChatWindow(this.handleSendMessage.bind(this));

    this.bindEvents();
    this.showLoginModal();
  }

  bindEvents() {
    this.chatService.on('loginSuccess', (user) => {
      this.loginModal.hide();
      this.userList.show();
      this.chatWindow.show();
    });

    this.chatService.on('loginError', (error) => {
      this.loginModal.showError(error);
    });

    this.chatService.on('userListUpdate', (users) => {
      this.userList.updateUsers(users);
    });

    this.chatService.on('newMessage', ({ chat, message }) => {
      this.chatWindow.addMessage(message);
    });
  }

  showLoginModal() {
    this.loginModal.show();
  }

  handleLogin(nickname) {
    this.chatService.login(nickname);
  }

  handleUserSelect(userId) {
    this.chatService.startChat(userId);
  }

  handleSendMessage(text) {
    if (this.chatWindow.currentChat) {
      this.chatService.sendMessage(this.chatWindow.currentChat.id, text);
    }
  }
}