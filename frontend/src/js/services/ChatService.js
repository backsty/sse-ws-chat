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
      console.log('✅ WebSocket подключен');
      this.emit('connect');
      await this.checkSavedSession();
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
      console.log('💬 Создан новый чат:', data);
      const chat = Chat.fromJSON(data.chat);
      this.chats.set(chat.id, chat);
      this.emit('chatCreated', chat);
    });

    this.ws.on('message', (data) => {
      console.log('📨 Получено сообщение:', data);

      const chat = this.chats.get(data.chatId);
      if (chat) {
        const message = new Message({
          id: data.messageId,
          from: data.from,
          text: data.text,
          timestamp: data.timestamp,
          status: 'delivered',
        });

        chat.addMessage(message);
        this.emit('newMessage', { chat, message });
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
    if (!targetUserId) {
      throw new Error('ID пользователя не указан');
    }
    this.ws.send('startChat', { targetUserId });
  }

  // sendMessage(chatId, text) {
  //   if (!chatId || !text?.trim()) {
  //     console.warn('⚠️ Некорректные параметры сообщения');
  //     return;
  //   }

  //   const messageId = crypto.randomUUID();
  //   const message = new Message({
  //     id: messageId,
  //     from: this.currentUser.id,
  //     chatId,
  //     text: text.trim(),
  //     timestamp: Date.now(),
  //     status: 'sending',
  //   });

  //   // Добавляем сообщение локально сразу
  //   const chat = this.chats.get(chatId);
  //   if (chat) {
  //     chat.addMessage(message);
  //     this.emit('newMessage', { chat, message });
  //   }

  //   // Отправляем на сервер
  //   this.pendingMessages.set(messageId, message);
  //   this.ws.send('message', {
  //     chatId,
  //     text: text.trim(),
  //     messageId,
  //     from: this.currentUser.id,
  //   });
  // }

  sendMessage(chatId, text) {
    // Валидация входных параметров
    if (!chatId || !text?.trim()) {
      console.warn('⚠️ Некорректные параметры сообщения');
      return Promise.reject(new Error('Некорректные параметры сообщения'));
    }

    if (!this.currentUser) {
      console.warn('⚠️ Пользователь не авторизован');
      return Promise.reject(new Error('Пользователь не авторизован'));
    }

    const chat = this.chats.get(chatId);
    if (!chat) {
      console.warn('⚠️ Чат не найден:', chatId);
      return Promise.reject(new Error('Чат не найден'));
    }

    return new Promise((resolve, reject) => {
      const messageId = crypto.randomUUID();
      const message = new Message({
        id: messageId,
        from: this.currentUser.id,
        chatId,
        text: text.trim(),
        timestamp: Date.now(),
        status: Message.STATUSES.SENDING,
      });

      // Добавляем сообщение локально
      chat.addMessage(message);
      this.emit('newMessage', { chat, message });

      // Таймаут для отправки
      const timeout = setTimeout(() => {
        this.pendingMessages.delete(messageId);
        message.status = Message.STATUSES.FAILED;
        this.emit('messageUpdate', { chat, message });
        reject(new Error('Таймаут отправки сообщения'));
      }, 10000);

      // Обработчик успешной отправки
      const onMessageSent = (response) => {
        if (response.messageId === messageId) {
          clearTimeout(timeout);
          this.ws.off('messageSent', onMessageSent);
          this.ws.off('messageError', onMessageError);

          this.pendingMessages.delete(messageId);
          message.status = Message.STATUSES.SENT;
          Object.assign(message, response.message);

          this.emit('messageUpdate', { chat, message });
          resolve(message);
        }
      };

      // Обработчик ошибки
      const onMessageError = (error) => {
        if (error.messageId === messageId) {
          clearTimeout(timeout);
          this.ws.off('messageSent', onMessageSent);
          this.ws.off('messageError', onMessageError);

          this.pendingMessages.delete(messageId);
          message.status = Message.STATUSES.FAILED;
          this.emit('messageUpdate', { chat, message });
          reject(new Error(error.message || 'Ошибка отправки сообщения'));
        }
      };

      // Подписываемся на события
      this.ws.on('messageSent', onMessageSent);
      this.ws.on('messageError', onMessageError);

      // Сохраняем сообщение в очереди ожидания
      this.pendingMessages.set(messageId, {
        message,
        timestamp: Date.now(),
        cleanup: () => {
          clearTimeout(timeout);
          this.ws.off('messageSent', onMessageSent);
          this.ws.off('messageError', onMessageError);
        },
      });

      // Отправляем на сервер
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
