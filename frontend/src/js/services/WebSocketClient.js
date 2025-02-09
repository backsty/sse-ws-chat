import { EventEmitter } from '../utils/events.js';

export class WebSocketClient extends EventEmitter {
  constructor(url) {
    super();
    this.url = url;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = 1000;
    console.log('🔌 Инициализация WebSocket:', this.url);
    this.connect();
  }

  connect() {
    try {
      console.log('📡 Попытка подключения к:', this.url);
      this.ws = new WebSocket(this.url);
      this.bindEvents();
    } catch (error) {
      console.error('❌ Ошибка подключения:', error);
      this.emit('error', error);
    }
  }

  bindEvents() {
    this.ws.onopen = () => {
      console.log('✅ WebSocket подключен');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connect');
    };

    this.ws.onclose = () => {
      console.log('❌ WebSocket отключен');
      this.isConnected = false;
      this.emit('disconnect');
      this.reconnect();
    };

    this.ws.onerror = (error) => {
      console.error('🔴 WebSocket ошибка:', error);
      this.emit('error', error);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 Получено сообщение:', data);
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
      console.error('❌ Попытка отправки без подключения');
      throw new Error('WebSocket не подключен');
    }
    console.log('📤 Отправка сообщения:', { type, ...data });
    this.ws.send(JSON.stringify({ type, ...data }));
  }

  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('error', new Error('Превышено количество попыток подключения'));
      return;
    }

    this.reconnectAttempts++;
    setTimeout(() => {
      this.connect();
    }, this.reconnectTimeout * this.reconnectAttempts);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}