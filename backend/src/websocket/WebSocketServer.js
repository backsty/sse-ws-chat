import { WebSocketServer } from "ws";
import { createLogger } from "../utils/logger.js";
import config from "../utils/config.js";
import { UserManager } from "./UserManager.js";
import { ChatManager } from "./ChatManager.js";

const logger = createLogger("WebSocketServer");

export class ChatWebSocketServer {
  constructor(server) {
    this.wss = new WebSocketServer({
      server,
      path: config.ws.path,
      maxPayload: 1024 * 1024,
    });
    this.userManager = new UserManager();
    this.chatManager = new ChatManager(this.userManager);

    this.startHeartbeat();

    this.wss.on("connection", this.handleConnection.bind(this));

    logger.info("WebSocket сервер запущен");
  }

  startHeartbeat() {
    setInterval(() => {
      this.wss.clients.forEach((client) => {
        if (client.isAlive === false) {
          return client.terminate();
        }
        client.isAlive = false;
        client.ping();
      });
    }, 30000);
  }

  handleConnection(socket) {
    socket.isAlive = true;

    socket.on("pong", () => {
      socket.isAlive = true;
    });

    socket.on("message", (data) => {
      try {
        const message = JSON.parse(data);
        this.handleMessage(socket, message);
      } catch (error) {
        logger.error("Failed to process message", { error: error.message });
      }
    });

    socket.on("close", () => {
      const user = this.getUserBySocket(socket);
      if (user) {
        this.handleDisconnect(user);
      }
    });

    socket.on("error", (error) => {
      logger.error("WebSocket error", { error: error.message });
    });
  }

  handleMessage(socket, message) {
    switch (message.type) {
      case "login":
        this.handleLogin(socket, message);
        break;
      case "message":
        this.handleChatMessage(socket, message);
        break;
      case "startChat":
        this.handleStartChat(socket, message);
        break;
      case "getUserList":
        const user = this.getUserBySocket(socket);
        if (user) {
          this.sendToSocket(socket, "userList", {
            users: this.userManager.getAllUsers().map((u) => u.toJSON()),
          });
        }
        break;
      case "syncChats":
        const user1 = this.getUserBySocket(socket);
        if (user1) {
          const userChats = this.chatManager.getUserChats(user1.id);
          this.sendToSocket(socket, "chatList", {
            chats: userChats.map((chat) => chat.toJSON()),
          });
        }
        break;
      default:
        logger.warn("Unknown message type", { type: message.type });
    }
  }

  handleLogin(socket, { nickname }) {
    try {
      if (this.userManager.isNicknameExists(nickname)) {
        this.sendError(socket, "loginError", "Никнейм уже занят");
        return;
      }

      const user = this.userManager.addUser(socket, nickname);
      socket.userId = user.id;

      // Отправляем успешный ответ с данными пользователя
      this.sendToSocket(socket, "loginSuccess", { user: user.toJSON() });

      // Отправляем текущий список пользователей
      this.sendToSocket(socket, "userList", {
        users: this.userManager.getAllUsers().map((u) => u.toJSON()),
      });

      // Отправляем существующие чаты пользователя
      const userChats = this.chatManager.getUserChats(user.id);
      if (userChats.length > 0) {
        this.sendToSocket(socket, "chatList", {
          chats: userChats.map((chat) => chat.toJSON()),
        });
      }

      // Оповещаем других пользователей
      this.broadcast("userJoined", { user: user.toJSON() }, user.id);

      console.log(`✅ Пользователь вошел: ${nickname}`);
    } catch (error) {
      console.error("❌ Ошибка при входе:", error);
      this.sendError(socket, "loginError", "Ошибка при входе");
    }
  }

  handleChatMessage(socket, { chatId, text, messageId }) {
    const user = this.getUserBySocket(socket);
    if (!user) {
      return this.sendError(socket, "messageError", {
        messageId, // Возвращаем messageId в случае ошибки
        message: "Пользователь не авторизован",
      });
    }

    const chat = this.chatManager.getChat(chatId);
    if (!chat || !chat.hasParticipant(user.id)) {
      return this.sendError(socket, "messageError", {
        messageId, // Возвращаем messageId в случае ошибки
        message: "Чат недоступен",
      });
    }

    const message = this.chatManager.addMessage(chatId, user.id, text);
    if (message) {
      // Отправляем подтверждение отправителю
      this.sendToSocket(socket, "messageSent", {
        messageId, // Используем полученный messageId
        message: message.toJSON(),
      });

      // Отправляем сообщение другим участникам чата
      chat.participants.forEach((participantId) => {
        if (participantId !== user.id) {
          const participant = this.userManager.getUser(participantId);
          if (participant && participant.isConnected()) {
            this.sendToSocket(participant.socket, "message", {
              chatId,
              messageId: message.id, // Используем ID созданного сообщения
              from: user.id,
              text,
              timestamp: message.timestamp,
            });
          }
        }
      });
    }
  }

  handleStartChat(socket, { targetUserId }) {
    const user = this.getUserBySocket(socket);
    if (!user) {
      return this.sendError(
        socket,
        "startChatError",
        "Пользователь не авторизован",
      );
    }

    const targetUser = this.userManager.getUser(targetUserId);
    if (!targetUser) {
      return this.sendError(
        socket,
        "startChatError",
        "Целевой пользователь не найден",
      );
    }

    const chat = this.chatManager.createChat(user.id, targetUserId);

    // Отправляем информацию о чате обоим участникам
    this.sendToSocket(socket, "chatCreated", { chat: chat.toJSON() });
    this.sendToSocket(targetUser.socket, "chatCreated", {
      chat: chat.toJSON(),
    });

    logger.info(
      `Создан новый чат между ${user.nickname} и ${targetUser.nickname}`,
    );
    return chat;
  }

  handleDisconnect(user) {
    this.userManager.removeUser(user.id);
    this.broadcast("userLeft", { userId: user.id });
    logger.info(`User disconnected: ${user.nickname}`);
  }

  getUserBySocket(socket) {
    return this.userManager.getUser(socket.userId);
  }

  sendToSocket(socket, type, data) {
    socket.send(JSON.stringify({ type, ...data }));
  }

  sendError(socket, type, message) {
    this.sendToSocket(socket, type, { message });
  }

  broadcast(type, data, excludeUserId = null) {
    this.userManager.broadcast({ type, ...data }, excludeUserId);
  }
}
