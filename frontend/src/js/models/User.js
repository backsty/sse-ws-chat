export class User {
  constructor({ id, nickname, isOnline, lastActivity, avatar, status }) {
    this.id = id;
    this.nickname = nickname;
    this.isOnline = isOnline;
    this.lastActivity = lastActivity;
    this.avatar = avatar || this.getDefaultAvatar(nickname);
    this.status = status || 'active';
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
    return new Date(this.lastActivity).toLocaleString();
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