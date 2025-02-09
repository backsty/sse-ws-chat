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
    this.bindEvents();
  }

  bindEvents() {
    // Авторизация
    this.ws.on('loginSuccess', (data) => {
      this.currentUser = new User(data.user);
      this.emit('loginSuccess', this.currentUser);
    });

    this.ws.on('loginError', (data) => {
      this.emit('loginError', data.message);
    });

    // Пользователи
    this.ws.on('userList', (data) => {
      data.users.forEach(userData => {
        this.users.set(userData.id, new User(userData));
      });
      this.emit('userListUpdate', Array.from(this.users.values()));
    });

    this.ws.on('userJoined', (data) => {
      const user = new User(data.user);
      this.users.set(user.id, user);
      this.emit('userJoined', user);
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
      const chat = this.chats.get(data.chatId);
      if (chat) {
        const message = new Message(data.message);
        chat.addMessage(message);
        this.emit('newMessage', { chat, message });
      }
    });
  }

  // Методы для работы с пользователями
  login(nickname) {
    this.ws.send('login', { nickname });
  }

  getUser(userId) {
    return this.users.get(userId);
  }

  // Методы для работы с чатами
  startChat(targetUserId) {
    this.ws.send('startChat', { targetUserId });
  }

  sendMessage(chatId, text) {
    this.ws.send('message', { chatId, text });
  }

  getChat(chatId) {
    return this.chats.get(chatId);
  }

  getAllChats() {
    return Array.from(this.chats.values());
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
    this.ws.disconnect();
  }
}