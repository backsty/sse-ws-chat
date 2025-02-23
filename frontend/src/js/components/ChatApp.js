import { WebSocketClient } from '../services/WebSocketClient.js';
import { ChatService } from '../services/ChatService.js';
import { LoginModal } from './LoginModal.js';
import { UserList } from './UserList.js';
import { ChatWindow } from './ChatWindow.js';
import { CookieManager } from '../utils/cookies.js';

export class ChatApp {
  constructor() {
    this.broadcastChannel = new BroadcastChannel('chat-sync');
    const wsUrl =
      process.env.NODE_ENV === 'production'
        ? 'wss://sse-ws-chat-4ur5.onrender.com/ws'
        : 'ws://localhost:3000/ws';

    console.log('🌐 WebSocket URL:', wsUrl);

    this.wsClient = new WebSocketClient(wsUrl);
    this.chatService = new ChatService(this.wsClient);
    this.init();
    this.bindBroadcastEvents();
  }

  bindBroadcastEvents() {
    // Обработка событий между вкладками
    this.broadcastChannel.onmessage = (event) => {
      switch (event.data.type) {
        case 'userLoggedIn':
          // Автоматически восстанавливаем сессию на других вкладках
          if (!this.currentUser) {
            this.chatService.login(event.data.nickname);
          }
          break;
        case 'userLoggedOut':
          this.handleLogout(true);
          break;
      }
    };
  }

  async init() {
    // Создаем основной контейнер
    this.container = document.createElement('div');
    this.container.className = 'chat-app hidden';

    // Инициализируем компоненты
    this.loginModal = new LoginModal(this.handleLogin.bind(this));
    this.userList = new UserList(this.handleUserSelect.bind(this));
    this.chatWindow = new ChatWindow(this.handleSendMessage.bind(this));
    this.chatWindow.onLogout = this.handleLogout.bind(this);

    this.chatWindow.setUserList(this.userList);

    // Добавляем компоненты в DOM
    document.body.appendChild(this.container);
    document.body.appendChild(this.loginModal.element);
    this.container.appendChild(this.userList.element);
    this.container.appendChild(this.chatWindow.element);

    this.bindEvents();
    await this.restoreSession();
    // const savedUser = CookieManager.get('chatUser');
    // if (!savedUser) {
    //   this.showLoginModal();
    // }
  }

  async restoreSession() {
    const savedUser = CookieManager.get('chatUser');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        console.log('🔄 Восстановление сессии:', userData);
        await this.chatService.login(userData.nickname);
        return true;
      } catch (error) {
        console.error('❌ Ошибка восстановления сессии:', error);
        CookieManager.delete('chatUser');
      }
    }
    this.showLoginModal();
    return false;
  }

  bindEvents() {
    this.wsClient.on('connect', () => {
      console.log('✅ WebSocket подключен');
    });

    this.chatService.on('loginSuccess', (user) => {
      console.log('✅ Успешный вход:', user);
      this.currentUser = user;
      this.loginModal.hide();
      this.container.classList.remove('hidden');
      this.userList.show();
      this.chatWindow.show();

      CookieManager.set('chatUser', JSON.stringify(user));

      this.broadcastChannel.postMessage({
        type: 'userLoggedIn',
        nickname: user.nickname,
      });
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

    this.chatService.on('chatCreated', ({ chat }) => {
      if (!chat) {
        console.error('❌ Получены некорректные данные чата');
        return;
      }

      console.log('✅ Создан новый чат:', chat);

      try {
        // Обновляем текущий чат
        this.currentChat = chat;
        this.chatWindow.setCurrentChat(chat, this.currentUser);
      } catch (error) {
        console.error('❌ Ошибка при установке чата:', error);
      }
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

  handleLogout(skipBroadcast = false) {
    this.chatService.logout();
    this.container.classList.add('hidden');
    this.userList.hide();
    this.chatWindow.hide();
    CookieManager.delete('chatUser');
    this.currentUser = null;

    if (!skipBroadcast) {
      this.broadcastChannel.postMessage({
        type: 'userLoggedOut',
      });
    }

    this.showLoginModal();
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
