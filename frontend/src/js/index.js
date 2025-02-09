import { ChatApp } from './components/ChatApp.js';
import '../css/main.css';
import '../css/components/chat.css';
import '../css/components/users.css';
import '../css/components/modal.css';

let app = null;

const startApp = () => {
  const loader = document.getElementById('loader');
  try {
    app = new ChatApp();
    loader.classList.add('hidden');
  } catch (error) {
    console.error('Ошибка инициализации приложения:', error);
    loader.innerHTML = `
      <div class="error-message">
        Произошла ошибка при загрузке приложения. Попробуйте обновить страницу.
      </div>
    `;
  }
};

// Инициализация приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', startApp);

// Обработка необработанных ошибок
window.addEventListener('unhandledrejection', (event) => {
  console.error('Необработанная ошибка:', event.reason);
});

// Обработка закрытия вкладки
window.addEventListener('beforeunload', () => {
  if (app?.chatService) {
    app.chatService.disconnect();
  }
});