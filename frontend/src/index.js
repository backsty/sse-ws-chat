import './css/main.css';
import './js/index.js';

// Проверяем поддержку WebSocket
if (!window.WebSocket) {
    document.body.innerHTML = `
        <div class="error-message">
        Ваш браузер не поддерживает WebSocket. Пожалуйста, обновите браузер.
        </div>
    `;
}