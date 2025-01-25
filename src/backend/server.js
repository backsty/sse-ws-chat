import Koa from 'koa';
import serve from 'koa-static';
import cors from '@koa/cors';
import path from 'path';
import { WebSocketServer } from 'ws';
import { nanoid } from 'nanoid';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Chat from './chat/Chat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = new Koa();
app.use(cors());
const chat = new Chat();
const port = process.env.PORT || 7070;

app.use(serve(path.join(__dirname, '../../dist')));

const server = app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

const wsServer = new WebSocketServer({
  server,
  path: '/ws',
  clientTracking: true,
  perMessageDeflate: false
});

const messageHandlers = {
  login: handleLogin,
  message: handleChatMessage
};

wsServer.on('connection', (ws, req) => {
  const userId = nanoid();
  const clientIp = req.socket.remoteAddress;
  
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
    const user = chat.users.get(ws);
    if (user) {
      user.pong();
    }
  });

  ws.on('close', () => {
    chat.removeUser(ws);
    console.log(`Отключение: ${clientIp} (${userId})`);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket ошибка (${userId}):`, error);
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
  const result = chat.addUser(ws, message.nickname, message.sessionId);
  
  ws.send(JSON.stringify({
    type: 'login',
    success: result.success,
    message: result.success ? null : result.error
  }));
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
  ws.send(JSON.stringify({
    type: 'error',
    message: error
  }));
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  wsServer.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
});
