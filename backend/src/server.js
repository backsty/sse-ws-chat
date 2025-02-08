import Koa from 'koa';
import serve from 'koa-static';
import cors from '@koa/cors';
import path from 'path';
import { WebSocketServer } from 'ws';
import { nanoid } from 'nanoid';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import Chat from './chat/Chat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const isDev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3000;
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:9000';
const PING_INTERVAL = 30000;
const PING_TIMEOUT = 5000;

const app = new Koa();
if (isDev) {
  app.use(cors({
    origin: corsOrigin,
    credentials: true
  }));
}

const chat = new Chat();

app.use(async (ctx, next) => {
  if (ctx.path === '/') {
    ctx.body = 'WebSocket Server Running';
    return;
  }
  await next();
});

app.use(serve(path.join(__dirname, '../../dist')));

const server = app.listen(port, () => {
  console.log(`Server started on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
});

server.on('error', (error) => {
  console.error('Server error:', error);
});

const wsServer = new WebSocketServer({
  server,
  path: '/ws',
  clientTracking: true,
  perMessageDeflate: false,
  ...(isDev ? {} : {
    maxPayload: 65536,
    backlog: 100,
    handleProtocols: () => 'chat'
  })
});

const messageHandlers = {
  login: handleLogin,
  message: handleChatMessage,
};

const CLOSE_CODES = {
  NORMAL: 1000,
  GOING_AWAY: 1001,
  PROTOCOL_ERROR: 1002,
  INVALID_DATA: 1003,
  NO_STATUS: 1005,
  ABNORMAL: 1006,
  POLICY_VIOLATION: 1008,
  MESSAGE_TOO_BIG: 1009,
  INTERNAL_ERROR: 1011
};

const heartbeat = (ws) => {
  ws.isAlive = true;
};

const pingClients = () => {
  wsServer.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      chat.removeUser(ws);
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping('', false, (err) => {
      if (err) {
        chat.removeUser(ws);
        ws.terminate();
      }
    });

    // Добавляем таймаут с четкой очисткой
    const pingTimeout = setTimeout(() => {
      if (!ws.isAlive) {
        chat.removeUser(ws);
        ws.terminate();
      }
    }, PING_TIMEOUT);

    // Сохраняем ссылку на таймаут для очистки при закрытии
    ws.pingTimeout = pingTimeout;
  });
};

const interval = setInterval(pingClients, PING_INTERVAL);

wsServer.on('connection', (ws, req) => {
  const userId = nanoid();
  const clientIp = req.socket.remoteAddress;

  ws.isAlive = true;
  console.log(`Новое подключение: ${clientIp} (${userId})`);

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      await handleMessage(ws, message, userId);
    } catch (error) {
      console.error(`Ошибка обработки сообщения от ${userId}:`, error);
      sendError(ws, 'Некорректный формат сообщения');
    }
  });

  ws.on('pong', () => {
    heartbeat(ws);
    const user = chat.users.get(ws);
    if (user) {
      user.pong();
    }
  });

  ws.on('close', (code, reason) => {
    clearTimeout(ws.pingTimeout);
    chat.removeUser(ws);
    console.log(`Отключение: ${clientIp} (${userId}), код: ${code}`);
  });

  ws.on('error', (error) => {
    if (error.code === 'ECONNRESET') {
      console.log(`Соединение сброшено: ${clientIp} (${userId})`);
      ws.close(CLOSE_CODES.GOING_AWAY);
    } else {
      console.error(`WebSocket ошибка (${userId}):`, error);
      ws.close(CLOSE_CODES.INTERNAL_ERROR);
    }
    chat.removeUser(ws);
  });
});

async function handleMessage(ws, message, userId) {
  if (!isValidMessage(message)) {
    console.warn(`Неверный формат сообщения от ${userId}`);
    return sendError(ws, 'Неверный формат сообщения');
  }

  const handler = messageHandlers[message.type];
  if (!handler) {
    console.warn(`Неизвестный тип сообщения ${message.type} от ${userId}`);
    return sendError(ws, 'Неизвестный тип сообщения');
  }

  try {
    await handler(ws, message, userId);
  } catch (error) {
    console.error(`Ошибка обработки ${message.type} от ${userId}:`, error);
    sendError(ws, 'Внутренняя ошибка сервера');
  }
}

async function handleLogin(ws, message, userId) {
  if (!message.nickname || !message.sessionId) {
    return sendError(ws, 'Отсутствуют обязательные параметры');
  }

  const result = chat.addUser(ws, message.nickname, message.sessionId);

  ws.send(
    JSON.stringify({
      type: 'login',
      success: result.success,
      message: result.success ? null : result.error,
    }),
  );
}

async function handleChatMessage(ws, message, userId) {
  const user = chat.users.get(ws);
  if (!user) return sendError(ws, 'Пользователь не авторизован');

  chat.sendMessage(user.nickname, message.text);
}

function isValidMessage(message) {
  return message && typeof message === 'object' && typeof message.type === 'string';
}

function sendError(ws, error) {
  ws.send(
    JSON.stringify({
      type: 'error',
      message: error,
    }),
  );
}

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`${signal} signal received`);
  clearInterval(interval);
  
  wsServer.clients.forEach((ws) => {
    ws.close(CLOSE_CODES.GOING_AWAY, 'Server shutting down');
  });

  wsServer.close(() => {
    server.close(() => {
      console.log('Server shutdown completed');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
