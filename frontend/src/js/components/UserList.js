import { formatLastSeen } from '../utils/date.js';

export class UserList {
  constructor(onUserSelect) {
    this.onUserSelect = onUserSelect;
    this.users = new Map();
    this.init();
  }

  init() {
    this.container = document.createElement('div');
    this.container.className = 'user-list hidden';

    this.usersList = document.createElement('div');
    this.usersList.className = 'users';

    this.container.appendChild(this.usersList);
    document.body.appendChild(this.container);
  }

  updateUsers(users) {
    this.users = new Map(users.map(user => [user.id, user]));
    this.render();
  }

  render() {
    this.usersList.innerHTML = '';
    this.users.forEach(user => {
      const userEl = document.createElement('div');
      userEl.className = `user-item ${user.isOnline ? 'online' : ''}`;
      
      userEl.innerHTML = `
        <img src="${user.avatar}" alt="${user.nickname}" class="user-avatar">
        <div class="user-info">
          <div class="user-nickname">${user.nickname}</div>
          <div class="user-status">
            ${user.isOnline ? 'в сети' : `был(а) ${formatLastSeen(user.lastActivity)}`}
          </div>
        </div>
      `;

      userEl.addEventListener('click', () => {
        if (this.onUserSelect) this.onUserSelect(user.id);
      });

      this.usersList.appendChild(userEl);
    });
  }

  show() {
    this.container.classList.remove('hidden');
  }

  hide() {
    this.container.classList.add('hidden');
  }
}