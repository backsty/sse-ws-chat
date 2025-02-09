import { User } from '../models/User.js';

export class UserList {
  constructor(onUserSelect) {
    this.onUserSelect = onUserSelect;
    this.users = new Map();
    this.element = this.createElements();
  }

  createElements() {
    const container = document.createElement('div');
    container.className = 'user-list hidden';

    container.innerHTML = `
      <h2 class="chat-header">Пользователи онлайн</h2>
      <div class="users-container"></div>
    `;

    this.usersContainer = container.querySelector('.users-container');
    return container;
  }

  updateUsers(usersData) {
    if (!Array.isArray(usersData)) {
      console.error('❌ Некорректный формат списка пользователей');
      return;
    }

    this.users.clear();
    this.usersContainer.innerHTML = '';

    if (usersData.length === 0) {
      this.usersContainer.innerHTML = `
        <div class="no-users">
          Нет доступных пользователей
        </div>
      `;
      return;
    }

    usersData.forEach((userData) => {
      const user = userData instanceof User ? userData : new User(userData);
      this.users.set(user.id, user);
      const userElement = document.createElement('div');
      userElement.className = `user-item ${user.isOnline ? 'online' : ''}`;
      userElement.innerHTML = `
        <img class="user-avatar" src="${user.avatar}" alt="${user.nickname}">
        <div class="user-info">
          <div class="user-nickname">${user.nickname}</div>
          <div class="user-status">
            <span class="status-indicator"></span>
            ${user.isOnline ? 'в сети' : 'не в сети'}
          </div>
        </div>
      `;
      userElement.addEventListener('click', () => this.onUserSelect(user.id));
      this.usersContainer.appendChild(userElement);
    });
  }

  show() {
    this.element.classList.remove('hidden');
  }

  hide() {
    this.element.classList.add('hidden');
  }
}
