import { Chat } from '../models/Chat.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import { EventEmitter } from '../utils/events.js';

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
    this.ws.on('connect', () => {
      this.emit('connect');
      if (this.currentUser) {
        this.login(this.currentUser.nickname);
      }
    });

    this.ws.on('disconnect', () => {
      this.emit('disconnect');
    });

    // Авторизация
    this.ws.on('loginSuccess', (data) => {
      if (!data?.user) {
        console.error('❌ Некорректные данные пользователя:', data);
        return;
      }
      this.currentUser = new User(data.user);
      this.emit('loginSuccess', this.currentUser);
    });

    this.ws.on('loginError', (data) => {
      this.emit('loginError', data.message);
    });

    // Пользователи
    this.ws.on('userList', (data) => {
      this.users.clear();
      data.users.forEach((userData) => {
        this.users.set(userData.id, new User(userData));
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

    // Чаты и сообщения
    this.ws.on('chatCreated', (data) => {
      const chat = new Chat(data.chat);
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

  // Методы для работы с пользователями
  login(nickname) {
    if (!nickname?.trim()) {
      throw new Error('Никнейм не может быть пустым');
    }
    this.ws.send('login', { nickname: nickname.trim() });
  }

  logout() {
    this.ws.send('logout');
    this.currentUser = null;
    this.chats.clear();
    this.users.clear();
  }

  // Методы для работы с чатами
  startChat(targetUserId) {
    if (!targetUserId) {
      throw new Error('ID пользователя не указан');
    }
    this.ws.send('startChat', { targetUserId });
  }

  sendMessage(chatId, text) {
    if (!chatId || !text?.trim()) {
      throw new Error('Некорректные данные сообщения');
    }

    const messageId = crypto.randomUUID();
    const message = new Message({
      id: messageId,
      from: this.currentUser.id,
      chatId,
      text: text.trim(),
      timestamp: Date.now(),
      status: 'sending',
    });

    // Добавляем сообщение локально сразу
    const chat = this.chats.get(chatId);
    if (chat) {
      chat.addMessage(message);
      this.emit('newMessage', { chat, message });
    }

    // Отправляем на сервер
    this.pendingMessages.set(messageId, message);
    this.ws.send('message', {
      chatId,
      text: text.trim(),
      messageId,
      from: this.currentUser.id,
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
