import Koa from "koa";
import http from "http";
import cors from "@koa/cors";
import { koaBody } from "koa-body";

import { ChatWebSocketServer } from "./websocket/WebSocketServer.js";
import config from "./utils/config.js";
import { logger } from "./utils/logger.js";

const app = new Koa();

app.use(cors(config.cors));
app.use(
  koaBody({
    jsonLimit: "1mb",
  }),
);

app.use(async (ctx) => {
  if (ctx.path === "/") {
    ctx.body = {
      status: "ok",
      mode: config.isProd ? "production" : "development",
      timestamp: new Date().toISOString(),
    };
  }
});

app.on("error", (err, ctx) => {
  logger.error("Ошибка сервера", {
    error: err.message,
    url: ctx.url,
    method: ctx.method,
    ip: ctx.ip,
  });
});

const server = http.createServer(app.callback());
const wsServer = new ChatWebSocketServer(server);

server.listen(config.port, config.host, () => {
  logger.info("Сервер запущен", {
    mode: config.isProd ? "production" : "development",
    port: config.port,
    host: config.host,
  });
});

const shutdown = async () => {
  logger.info("Завершение работы...");

  wsServer?.wss?.clients?.forEach((client) => client.terminate());

  server.close(() => {
    logger.info("Сервер остановлен");
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export { app, server, wsServer };
