import { v4 as uuidv4 } from "uuid";

export class User {
  static deserialize(data) {
    const user = new User(null, data.nickname);
    Object.assign(user, data);
    return user;
  }

  constructor(socket, nickname) {
    this.id = socket?.id || uuidv4();
    this.nickname = nickname;
    this.socket = socket;
    this.isOnline = Boolean(socket);
    this.lastActivity = Date.now();
    this.avatar = null;
    this.status = "active";
  }

  updateActivity() {
    this.lastActivity = Date.now();
  }

  setOnline(status) {
    this.isOnline = status;
    this.updateActivity();
  }

  setStatus(status) {
    if (!["active", "away", "offline"].includes(status)) {
      throw new Error("Неверный статус пользователя");
    }
    this.status = status;
    this.updateActivity();
  }

  send(message) {
    if (this.socket && this.socket.readyState === 1) {
      this.socket.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  isConnected() {
    return this.socket?.readyState === 1;
  }

  updateSocket(socket) {
    this.socket = socket;
    this.isOnline = Boolean(socket);
    this.updateActivity();
  }

  toJSON() {
    return {
      id: this.id,
      nickname: this.nickname,
      isOnline: this.isOnline,
      lastActivity: this.lastActivity,
      avatar: this.avatar,
      status: this.status,
    };
  }

  serialize() {
    const data = this.toJSON();
    delete data.socket;
    return data;
  }
}
