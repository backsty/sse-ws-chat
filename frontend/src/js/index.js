import { ChatApp } from './components/ChatApp.js';
import '../css/main.css';
import '../css/components/chat.css';
import '../css/components/users.css';
import '../css/components/modal.css';

// Ждем полной загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
  // Инициализация приложения
  const app = new ChatApp();

  // Обработка ошибок в глобальном скопе
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Необработанная ошибка:', event.reason);
  });

  // Обработка закрытия вкладки
  window.addEventListener('beforeunload', () => {
    if (app.chatService) {
      app.chatService.disconnect();
    }
  });
});