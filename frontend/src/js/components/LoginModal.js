export class LoginModal {
  constructor(onLogin) {
    this.onLogin = onLogin;
    this.element = this.createElements();
  }

  createElements() {
    const modal = document.createElement('div');
    modal.className = 'login-modal hidden';

    modal.innerHTML = `
      <div class="login-content">
        <h2>Введите имя</h2>
        <div class="error-message hidden"></div>
        <input type="text" placeholder="Ваше имя..." maxlength="50">
        <button>Войти</button>
      </div>
    `;

    const input = modal.querySelector('input');
    const button = modal.querySelector('button');
    this.errorElement = modal.querySelector('.error-message');

    button.addEventListener('click', () => this.handleLogin(input.value));
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleLogin(input.value);
    });

    return modal;
  }

  handleLogin(nickname) {
    nickname = nickname.trim();
    if (nickname.length < 2) {
      this.showError('Имя должно содержать минимум 2 символа');
      return;
    }
    this.onLogin(nickname);
  }

  showError(message) {
    this.errorElement.textContent = message;
    this.errorElement.classList.remove('hidden');
  }

  show() {
    this.element.classList.remove('hidden');
    this.element.querySelector('input').focus();
  }

  hide() {
    this.element.classList.add('hidden');
  }
}