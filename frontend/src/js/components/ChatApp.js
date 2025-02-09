import { WebSocketClient } from '../services/WebSocketClient.js';
import { ChatService } from '../services/ChatService.js';
import { LoginModal } from './LoginModal.js';
import { UserList } from './UserList.js';
import { ChatWindow } from './ChatWindow.js';

export class ChatApp {
  constructor() {
    const wsUrl =
      process.env.NODE_ENV === 'production'
        ? 'wss://sse-ws-chat-4ur5.onrender.com/ws'
        : 'ws://localhost:3000/ws';

    console.log('🌐 WebSocket URL:', wsUrl);

    this.wsClient = new WebSocketClient(wsUrl);
    this.chatService = new ChatService(this.wsClient);
    this.init();
  }

  init() {
    // Создаем основной контейнер
    this.container = document.createElement('div');
    this.container.className = 'chat-app hidden';

    // Инициализируем компоненты
    this.loginModal = new LoginModal(this.handleLogin.bind(this));
    this.userList = new UserList(this.handleUserSelect.bind(this));
    this.chatWindow = new ChatWindow(this.handleSendMessage.bind(this));

    this.chatWindow.setUserList(this.userList);

    // Добавляем компоненты в DOM
    document.body.appendChild(this.container);
    document.body.appendChild(this.loginModal.element);
    this.container.appendChild(this.userList.element);
    this.container.appendChild(this.chatWindow.element);

    this.bindEvents();
    this.showLoginModal();
  }

  bindEvents() {
    this.chatService.on('loginSuccess', (user) => {
      console.log('✅ Успешный вход:', user);
      this.currentUser = user;
      this.loginModal.hide();
      this.container.classList.remove('hidden');
      this.userList.show();
      this.chatWindow.show();

      this.chatService.ws.send('getUserList');
    });

    this.chatService.on('loginError', (error) => {
      console.error('❌ Ошибка входа:', error);
      this.loginModal.showError(error);
    });

    this.chatService.on('userListUpdate', (users) => {
      console.log('👥 Обновление списка пользователей:', users);
      if (this.currentUser) {
        // Фильтруем текущего пользователя из списка
        const filteredUsers = users.filter((u) => u.id !== this.currentUser.id);
        this.userList.updateUsers(filteredUsers);
      }
    });

    this.chatService.on('chatCreated', (chat) => {
      console.log('💬 Чат создан:', chat);
      this.chatWindow.setCurrentChat(chat, this.currentUser);
    });

    this.chatService.on('newMessage', (data) => {
      console.log('📨 Новое сообщение:', data);
      if (data.chat.id === this.chatWindow.currentChat?.id) {
        this.chatWindow.addMessage(data.message);
      }
    });

    this.chatService.on('error', (error) => {
      console.error('❌ Ошибка:', error);
    });
  }

  showLoginModal() {
    this.loginModal.show();
  }

  handleLogin(nickname) {
    console.log('🔑 Попытка входа:', nickname);
    this.chatService.login(nickname);
  }

  handleUserSelect(userId) {
    console.log('👤 Выбран пользователь:', userId);
    this.chatService.startChat(userId);
  }

  handleSendMessage(text) {
    if (this.chatWindow.currentChat) {
      console.log('📤 Отправка сообщения:', text);
      try {
        this.chatService.sendMessage(this.chatWindow.currentChat.id, text);
      } catch (error) {
        console.error('❌ Ошибка отправки:', error);
      }
    }
  }
}
