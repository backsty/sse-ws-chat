import Koa from 'koa';
import serve from 'koa-static';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { WebSocketServer } from 'ws';
import { nanoid } from 'nanoid';
import Chat from './chat/Chat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = new Koa();
const chat = new Chat();
const port = process.env.PORT || 7070;

app.use(serve(path.join(__dirname, '../../dist')));

const server = app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

const wsServer = new WebSocketServer({
  server,
  clientTracking: true,
  pingInterval: 30000,
  pingTimeout: 5000,
});

wsServer.on('connection', (ws, req) => {
  const userId = nanoid();
  const clientIp = req.socket.remoteAddress;

  console.log(`Новое соединение: ${clientIp} (${userId})`);

  ws.on('pong', () => {
    const user = chat.users.get(ws);
    if (user) user.pong();
  });

  ws.on('message', (messageData) => {
    try {
      const message = JSON.parse(messageData);

      if (message.type === 'login') {
        const success = chat.addUser(ws, message.nickname);
        ws.send(
          JSON.stringify({
            type: 'login',
            success,
            message: success ? null : 'Никнейм уже занят',
          }),
        );
        return;
      }

      handleMessage(ws, message, userId);
    } catch (error) {
      console.error('Ошибка обработки сообщения:', error);
    }
  });

  ws.on('close', () => chat.removeUser(ws));
  ws.on('error', (error) => console.error('WebSocket error:', error));
});

function handleMessage(ws, message, userId) {
  if (!message || !message.type) {
    console.warn('Неверный формат сообщения');
    return;
  }

  const handlers = {
    login: () => handleLogin(ws, message, userId),
    message: () => handleChatMessage(ws, userId, message),
  };

  const handler = handlers[message.type];
  if (handler) {
    handler();
  } else {
    console.warn(`Неизвестный тип сообщения: ${message.type}`);
  }
}

function handleLogin(ws, message, userId) {
  const success = chat.addUser(ws, message.nickname);

  ws.send(
    JSON.stringify({
      type: 'login',
      success,
      message: success ? null : 'Nickname already taken',
    }),
  );
}

function handleChatMessage(ws, userId, message) {
  const user = chat.users.get(ws);
  if (user) {
    chat.sendMessage(user.nickname, message.text);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  wsServer.close(() => {
    console.log('WebSocket server closed');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
});
