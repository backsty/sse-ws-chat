import Koa from "koa";
import staticServe from 'koa-static';
import cors from "@koa/cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { nanoid } from "nanoid";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import dotenv from "dotenv";
import Chat from "./chat/Chat.js";

const CONFIG = {
  PING_INTERVAL: 30000,
  PING_TIMEOUT: 5000,
  DEFAULT_PORT: 3000,
  DEFAULT_CORS_ORIGIN: "http://localhost:9000",
  PRODUCTION_ORIGIN: "https://backsty.github.io",
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 1000,
  SHUTDOWN_TIMEOUT: 10000
};

// Инициализация путей и переменных окружения
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config();

const isDev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || CONFIG.DEFAULT_PORT;
const corsOrigin = process.env.CORS_ORIGIN || CONFIG.DEFAULT_CORS_ORIGIN;

// Инициализация приложения
const app = new Koa();
const httpServer = createServer(app.callback());

// Настройка CORS для разработки
if (isDev) {
  app.use(cors({ 
    origin: corsOrigin, 
    credentials: true,
    allowMethods: ['GET', 'POST'],
    allowHeaders: ['Content-Type', 'Authorization']
  }));
}

// Статические файлы
app.use(staticServe(path.join(__dirname, "../../dist")));

// Основной роут с информацией о статусе
app.use(async (ctx, next) => {
  if (ctx.path === "/") {
    ctx.body = {
      status: "running",
      mode: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version
    };
    return;
  }
  await next();
});

const io = new Server(httpServer, {
  cors: {
    origin: isDev ? corsOrigin : CONFIG.PRODUCTION_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 5000,
  pingInterval: 10000
});

// Инициализация чата
const chat = new Chat(io);

io.on("connection", (socket) => {
  const userId = nanoid();
  console.log(`Новое подключение: ${socket.id}`);

  socket.on("login", ({ nickname }) => {
    try {
      const result = chat.addUser(socket, nickname);
      socket.emit("login", { success: result.success });
    } catch (error) {
      console.error("Ошибка входа:", error);
      socket.emit("error", "Ошибка входа");
    }
  });

  socket.on("message", (message) => {
    try {
      const user = chat.users.get(socket);
      if (!user) return;

      if (message && message.text) {
        chat.broadcastMessage(message.text, socket);
      }
    } catch (error) {
      console.error("Ошибка отправки:", error);
    }
  });

  socket.on("disconnect", () => {
    chat.removeUser(socket);
    console.log(`Отключение: ${socket.id}`);
  });
});

// Запуск сервера
httpServer.listen(port, () => {
  console.log(
    `Сервер запущен на порту ${port} в режиме ${process.env.NODE_ENV || "development"}`
  );
});

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`\n${signal} получен. Начинаем корректное завершение...`);

  const shutdownTimeout = setTimeout(() => {
    console.error("Принудительное завершение по таймауту");
    process.exit(1);
  }, CONFIG.SHUTDOWN_TIMEOUT);

  try {
    await new Promise((resolve) => io.close(resolve));
    console.log("Socket.IO сервер закрыт");

    await new Promise((resolve) => httpServer.close(resolve));
    console.log("HTTP сервер закрыт");

    clearTimeout(shutdownTimeout);
    console.log("Корректное завершение выполнено");
    process.exit(0);
  } catch (error) {
    console.error("Ошибка при завершении:", error);
    process.exit(1);
  }
};

// Обработчики сигналов завершения
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Обработка необработанных ошибок
process.on("uncaughtException", (error) => {
  console.error("Необработанное исключение:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Необработанный reject:", promise, "причина:", reason);
});