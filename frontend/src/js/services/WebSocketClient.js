import { EventEmitter } from '../utils/events.js';
import { CookieManager } from '../utils/cookies.js';

export class WebSocketClient extends EventEmitter {
  constructor(url) {
    super();
    // this.url = url.endsWith('/ws') ? url : `${url}/ws`;
    this.url = url;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = 1000;
    this.isConnected = false;
    this.isConnecting = false;
    this.pendingMessages = new Map();
    this.connect();
  }

  connect() {
    if (this.isConnecting) return;

    this.isConnecting = true;
    console.log('📡 Подключение к WebSocket...');

    try {
      this.ws = new WebSocket(this.url);
      this.bindEvents();
    } catch (error) {
      console.error('❌ Ошибка подключения:', error);
      this.reconnect();
    }
  }

  bindEvents() {
    this.ws.onopen = () => {
      console.log('✅ WebSocket подключен');
      this.isConnecting = false;
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connect');

      // Восстанавливаем сессию при переподключении
      const savedUser = CookieManager.get('chatUser');
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          this.send('login', { nickname: userData.nickname });
        } catch (error) {
          console.error('❌ Ошибка восстановления сессии:', error);
          CookieManager.delete('chatUser');
        }
      }

      this.resendPendingMessages();
    };

    this.ws.onclose = () => {
      console.log('❌ WebSocket отключен');
      this.isConnected = false;
      this.emit('disconnect');

      // При отключении проверяем наличие сохраненной сессии
      const savedUser = CookieManager.get('chatUser');
      if (savedUser) {
        this.reconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('🔴 WebSocket ошибка:', error);
      this.emit('error', error);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 Получено сообщение:', data);

        // Удаляем сообщение из ожидающих
        if (data.messageId) {
          this.pendingMessages.delete(data.messageId);
        }

        this.emit('message', data);
        if (data.type) {
          this.emit(data.type, data);
        }
      } catch (error) {
        console.error('❌ Ошибка обработки сообщения:', error);
        this.emit('error', error);
      }
    };
  }

  send(type, data = {}) {
    if (!this.isConnected) {
      console.warn('⚠️ Сообщение добавлено в очередь:', { type, data });
      this.addToPending(type, data);

      if (!this.isConnecting) {
        this.reconnect();
      }
      return;
    }

    const messageId = crypto.randomUUID();
    const message = { messageId, type, ...data };

    try {
      console.log('📤 Отправка сообщения:', message);
      this.ws.send(JSON.stringify(message));
      // this.addToPending(type, data, messageId);
      return messageId;
    } catch (error) {
      console.error('❌ Ошибка отправки сообщения:', error);
      this.emit('error', error);
      this.addToPending(type, data);
      return null;
    }
  }

  addToPending(type, data, messageId = crypto.randomUUID()) {
    this.pendingMessages.set(messageId, {
      type,
      data,
      timestamp: Date.now(),
      attempts: 0,
    });
  }

  resendPendingMessages() {
    console.log('🔄 Переотправка ожидающих сообщений...');
    for (const [messageId, message] of this.pendingMessages) {
      if (message.attempts < 3) {
        // Максимум 3 попытки
        message.attempts++;
        this.send(message.type, message.data);
      } else {
        this.pendingMessages.delete(messageId);
        console.warn('⚠️ Сообщение удалено после 3 попыток:', message);
      }
    }
  }

  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Превышено количество попыток подключения');
      this.emit('error', new Error('Превышено количество попыток подключения'));
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectTimeout * this.reconnectAttempts;
    console.log(`🔄 Попытка переподключения ${this.reconnectAttempts} через ${delay}ms`);

    setTimeout(() => this.connect(), delay);
  }

  disconnect() {
    if (this.ws && this.isConnected) {
      this.ws.close();
    }
  }
}
