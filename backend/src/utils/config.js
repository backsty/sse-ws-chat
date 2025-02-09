import { config as dotenvConfig } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenvConfig({
  path: path.join(
    __dirname,
    "../..",
    process.env.NODE_ENV === "production" ? ".env.production" : ".env",
  ),
});

const isProd = process.env.NODE_ENV === "production";
const port = parseInt(process.env.PORT, 10) || 3000;

export default {
  port,
  host: process.env.HOST || "localhost",

  cors: {
    origin: isProd ? "https://backsty.github.io" : `http://localhost:9000`,
    credentials: false,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },

  ws: {
    path: "/ws",
    maxClients: 100,
    url: isProd
      ? "wss://sse-ws-chat-4ur5.onrender.com"
      : `ws://localhost:${port}`,
  },

  render: {
    apiKey: process.env.RENDER_API_KEY,
    serviceId: process.env.RENDER_SERVICE_ID,
  },

  chat: {
    maxMessageLength: 1000,
    minMessageLength: 1,
    maxNicknameLength: 50,
    minNicknameLength: 2,
  },

  isProd,
};
