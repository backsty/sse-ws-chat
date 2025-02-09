export class LoginModal {
  constructor(onLogin) {
    this.onLogin = onLogin;
    this.init();
  }

  init() {
    this.container = document.createElement('div');
    this.container.className = 'login-modal hidden';

    this.modal = document.createElement('div');
    this.modal.className = 'modal-content';

    this.modal.innerHTML = `
      <h2>Вход в чат</h2>
      <input type="text" placeholder="Введите никнейм" class="nickname-input">
      <div class="error-message hidden"></div>
      <button class="login-button">Войти</button>
    `;

    this.container.appendChild(this.modal);
    document.body.appendChild(this.container);

    this.input = this.modal.querySelector('.nickname-input');
    this.errorMessage = this.modal.querySelector('.error-message');
    this.loginButton = this.modal.querySelector('.login-button');

    this.bindEvents();
  }

  bindEvents() {
    this.loginButton.addEventListener('click', () => this.handleLogin());
    this.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleLogin();
    });
  }

  handleLogin() {
    const nickname = this.input.value.trim();
    if (nickname && this.onLogin) {
      this.onLogin(nickname);
    }
  }

  showError(message) {
    this.errorMessage.textContent = message;
    this.errorMessage.classList.remove('hidden');
  }

  show() {
    this.container.classList.remove('hidden');
    this.input.focus();
  }

  hide() {
    this.container.classList.add('hidden');
    this.input.value = '';
    this.errorMessage.classList.add('hidden');
  }
}