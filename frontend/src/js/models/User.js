import { formatDate } from '../utils/date.js';

export class User {
  static STATUSES = {
    ACTIVE: 'active',
    AWAY: 'away',
    OFFLINE: 'offline'
  };

  constructor({ id, nickname, isOnline = false, lastActivity = Date.now(), avatar, status }) {
    if (!nickname) {
      throw new Error('Никнейм обязателен');
    }

    this.id = id || crypto.randomUUID();
    this.nickname = nickname.trim();
    this.isOnline = Boolean(isOnline);
    this.lastActivity = lastActivity;
    this.avatar = avatar || this.getDefaultAvatar(this.nickname);
    this.status = Object.values(User.STATUSES).includes(status) ? status : User.STATUSES.ACTIVE;
  }

  getDefaultAvatar(nickname) {
    if (nickname) {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${nickname}`;
    }
    return new URL('../../assets/img/user-default-avatar.png', import.meta.url).href;
  }

  static fromJSON(data) {
    return new User(data);
  }

  getLastActivityTime() {
    return formatDate(this.lastActivity);
  }

  isActive() {
    return this.status === User.STATUSES.ACTIVE;
  }

  toJSON() {
    return {
      id: this.id,
      nickname: this.nickname,
      isOnline: this.isOnline,
      lastActivity: this.lastActivity,
      avatar: this.avatar,
      status: this.status
    };
  }
}