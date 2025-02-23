import { Chat } from '../models/Chat.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import { EventEmitter } from '../utils/events.js';
import { CookieManager } from '../utils/cookies.js';

export class ChatService extends EventEmitter {
  constructor(wsClient) {
    super();
    this.ws = wsClient;
    this.chats = new Map();
    this.users = new Map();
    this.currentUser = null;
    this.pendingMessages = new Map();
    this.bindEvents();
  }

  bindEvents() {
    // Статус подключения
    this.ws.on('connect', async () => {
      if (this.currentUser) {
        const savedChats = JSON.parse(localStorage.getItem('chats') || '{}');
        Object.values(savedChats).forEach((chatData) => {
          if (chatData.participants.includes(this.currentUser.id)) {
            const chat = new Chat(chatData);
            this.chats.set(chat.id, chat);
            this.emit('chatCreated', { chat });
          }
        });
      }
    });

    this.ws.on('disconnect', () => {
      this.emit('disconnect');
    });

    this.ws.on('loginSuccess', (data) => {
      console.log('✅ Успешный вход:', data);
      this.currentUser = User.fromJSON(data.user);
      CookieManager.set('chatUser', JSON.stringify(this.currentUser.toJSON()));
      this.emit('loginSuccess', this.currentUser);

      // Запрашиваем списки после успешного входа
      this.ws.send('getUserList');
      this.ws.send('getChatList');
    });

    this.ws.on('loginError', (data) => {
      console.error('❌ Ошибка входа:', data);
      // Удаляем куки при ошибке
      CookieManager.delete('chatUser');
      this.emit('loginError', data.message);
    });

    this.ws.on('userList', (data) => {
      console.log('👥 Получен список пользователей:', data);
      this.users.clear();
      data.users.forEach((userData) => {
        const user = User.fromJSON(userData);
        this.users.set(user.id, user);
      });
      this.emit('userListUpdate', Array.from(this.users.values()));
    });

    this.ws.on('userJoined', (data) => {
      const user = new User(data.user);
      this.users.set(user.id, user);
      this.emit('userJoined', user);
      this.ws.send('getUserList');
    });

    this.ws.on('userLeft', (data) => {
      const user = this.users.get(data.userId);
      if (user) {
        user.isOnline = false;
        this.emit('userLeft', user);
      }
    });

    this.ws.on('chatCreated', (data) => {
      console.log('📨 Создан новый чат:', data);
      if (!data?.chat) {
        console.error('❌ Некорректные данные чата:', data);
        return;
      }

      try {
        // Убедимся, что у чата есть все необходимые данные
        const chatData = {
          id: data.chat.id,
          participants: Array.isArray(data.chat.participants) ? data.chat.participants : [],
          messages: Array.isArray(data.chat.messages) ? data.chat.messages : [],
          unreadCount: data.chat.unreadCount || 0,
        };

        const chat = new Chat(chatData);
        this.chats.set(chat.id, chat);

        // Сохраняем в localStorage
        const savedChats = JSON.parse(localStorage.getItem('chats') || '{}');
        savedChats[chat.id] = chat.toJSON();
        localStorage.setItem('chats', JSON.stringify(savedChats));

        console.log('✅ Чат успешно создан:', chat);
        this.emit('chatCreated', { chat });
      } catch (error) {
        console.error('❌ Ошибка при создании чата:', error);
      }
    });

    // this.ws.on('message', (data) => {
    //   console.log('📨 Получено сообщение:', data);
    //   const chat = this.chats.get(data.chatId);
    //   if (chat) {
    //     const message = new Message({
    //       id: data.messageId,
    //       from: data.from,
    //       text: data.text,
    //       timestamp: data.timestamp,
    //       status: Message.STATUSES.DELIVERED,
    //     });

    //     chat.addMessage(message);
    //     this.emit('newMessage', { chat, message });
    //   }
    // });

    this.ws.on('message', (data) => {
      console.log('📨 Получено сообщение:', data);
      const chat = this.chats.get(data.chatId);
      if (chat) {
        // Проверяем, нет ли уже такого сообщения
        if (chat.messages.some((m) => m.id === data.messageId)) {
          console.log('⚠️ Сообщение уже существует:', data.messageId);
          return;
        }

        const message = new Message({
          id: data.messageId,
          from: data.from,
          text: data.text,
          timestamp: data.timestamp,
          status: Message.STATUSES.DELIVERED,
        });

        chat.addMessage(message);
        this.emit('newMessage', { chat, message });
      }
    });

    this.ws.on('messageError', (data) => {
      console.error('❌ Ошибка отправки сообщения:', data);
      const pendingMessage = this.pendingMessages.get(data.message.messageId);
      if (pendingMessage) {
        pendingMessage.cleanup();
        pendingMessage.message.status = Message.STATUSES.ERROR;
        this.emit('messageUpdate', {
          chat: this.chats.get(pendingMessage.message.chatId),
          message: pendingMessage.message,
        });
      }
    });

    this.ws.on('error', (error) => {
      this.emit('error', error);
    });
  }

  async checkSavedSession() {
    const savedUser = CookieManager.get('chatUser');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        console.log('🔄 Восстановление сессии:', userData);
        await this.login(userData.nickname);
        return true;
      } catch (error) {
        console.error('❌ Ошибка восстановления сессии:', error);
        CookieManager.delete('chatUser');
      }
    }
    return false;
  }

  async login(nickname) {
    if (!nickname?.trim()) {
      throw new Error('Никнейм обязателен');
    }
    console.log('🔑 Попытка входа:', nickname);
    await this.ws.send('login', { nickname: nickname.trim() });
  }

  logout() {
    if (this.currentUser) {
      this.ws.send('logout');
      CookieManager.delete('chatUser');
      this.currentUser = null;
      this.chats.clear();
      this.users.clear();
      this.emit('logout');
    }
  }

  // Методы для работы с чатами
  startChat(targetUserId) {
    if (!targetUserId || !this.currentUser) {
      console.warn('⚠️ Некорректные параметры для создания чата');
      return;
    }

    // Проверяем, существует ли уже чат с этим пользователем
    const chatId = [this.currentUser.id, targetUserId].sort().join(':');
    const existingChat = this.chats.get(chatId);

    if (existingChat) {
      console.log('📝 Используем существующий чат:', chatId);
      this.emit('chatSelected', { chat: existingChat });
      return;
    }

    console.log('🔄 Создаем новый чат с:', targetUserId);
    this.ws.send('startChat', { targetUserId });
  }

  sendMessage(chatId, text) {
    if (!chatId || !text?.trim()) {
      return Promise.reject(new Error('Некорректные параметры сообщения'));
    }

    const chat = this.chats.get(chatId);
    if (!chat) {
      return Promise.reject(new Error('Чат не найден'));
    }

    return new Promise((resolve, reject) => {
      const messageId = crypto.randomUUID();
      const message = new Message({
        id: messageId,
        from: this.currentUser.id,
        chatId, // Добавляем chatId в сообщение
        text: text.trim(),
        timestamp: Date.now(),
        status: Message.STATUSES.SENDING,
      });

      chat.addMessage(message);
      this.emit('newMessage', { chat, message });

      const cleanup = () => {
        clearTimeout(timeout);
        this.ws.off('messageSent', handleMessageSent);
        this.ws.off('messageError', handleMessageError);
        this.pendingMessages.delete(messageId);
      };

      const handleMessageSent = (response) => {
        if (response.messageId === messageId) {
          cleanup();
          message.status = Message.STATUSES.SENT;
          this.emit('messageUpdate', { chat, message });
          resolve(message);
        }
      };

      const handleMessageError = (error) => {
        if (error.message.messageId === messageId) {
          cleanup();
          message.status = Message.STATUSES.ERROR;
          this.emit('messageUpdate', { chat, message });
          reject(new Error(error.message.message || 'Ошибка отправки сообщения'));
        }
      };

      const timeout = setTimeout(() => {
        cleanup();
        message.status = Message.STATUSES.ERROR;
        this.emit('messageUpdate', { chat, message });
        reject(new Error('Таймаут отправки сообщения'));
      }, 15000);

      this.ws.on('messageSent', handleMessageSent);
      this.ws.on('messageError', handleMessageError);

      this.pendingMessages.set(messageId, {
        message,
        cleanup,
        timestamp: Date.now(),
      });

      this.ws.send('message', {
        chatId,
        text: message.text,
        messageId,
        from: this.currentUser.id,
      });
    });
  }

  // Вспомогательные методы
  markMessagesAsRead(chatId) {
    const chat = this.chats.get(chatId);
    if (chat) {
      chat.markAsRead(this.currentUser.id);
      this.ws.send('markAsRead', { chatId });
    }
  }

  disconnect() {
    if (this.currentUser) {
      this.logout();
    }
    this.ws.disconnect();
  }
}
